/**
 * Customer Referral Service
 *
 * Handles the customer-to-customer referral programme: recording a referral at
 * signup, and paying it out when the configured criteria is met.
 *
 * Every reward is written through creditReward(), which is the only place that
 * moves money. It is guarded two ways:
 *   - UserReferral.referredUserId is unique, so a customer can only be referred
 *     once no matter how many times signup is retried
 *   - the payout updates the referral row from 'pending' to 'rewarded'
 *     atomically, so two concurrent requests cannot both credit the wallet
 *
 * Failures here never block the caller. A signup or a booking completion must
 * still succeed even if the referral bookkeeping fails, so callers are expected
 * to await these inside their own try/catch or ignore the rejection.
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const UserReferral = require('../models/UserReferral');
const Settings = require('../models/Settings');
const Transaction = require('../models/Transaction');

const DEFAULTS = {
  userReferralEnabled: true,
  userReferralReward: 100,
  userRefereeReward: 0,
  userReferralCriteria: 'FIRST_BOOKING',
  userReferralMaxPerUser: 0
};

/**
 * Reads the referral settings, falling back to defaults when the document or
 * an individual field is missing.
 */
const getReferralSettings = async () => {
  try {
    const settings =
      (await Settings.findOne({ type: 'global' }).lean()) ||
      (await Settings.findOne().lean());

    if (!settings) return { ...DEFAULTS };

    return {
      userReferralEnabled: settings.userReferralEnabled !== false,
      userReferralReward:
        typeof settings.userReferralReward === 'number'
          ? settings.userReferralReward
          : DEFAULTS.userReferralReward,
      userRefereeReward:
        typeof settings.userRefereeReward === 'number'
          ? settings.userRefereeReward
          : DEFAULTS.userRefereeReward,
      userReferralCriteria:
        settings.userReferralCriteria || DEFAULTS.userReferralCriteria,
      userReferralMaxPerUser:
        typeof settings.userReferralMaxPerUser === 'number'
          ? settings.userReferralMaxPerUser
          : DEFAULTS.userReferralMaxPerUser
    };
  } catch (error) {
    console.error('[UserReferral] Failed to read settings:', error.message);
    return { ...DEFAULTS };
  }
};

/**
 * Credits a wallet and records the matching transaction.
 */
const creditWallet = async (userId, amount, description, metadata = {}) => {
  if (!amount || amount <= 0) return;

  // Returns the pre-update document, giving the balance before the credit for
  // the ledger entry without a second read.
  const before = await User.findByIdAndUpdate(userId, {
    $inc: { 'wallet.balance': amount, referralEarnings: amount }
  }).select('wallet.balance');

  const balanceBefore = before?.wallet?.balance ?? 0;

  try {
    await Transaction.create({
      userId,
      amount,
      type: 'referral_bonus',
      status: 'completed',
      description,
      balanceBefore,
      balanceAfter: balanceBefore + amount,
      metadata
    });
  } catch (txError) {
    // The wallet credit is the source of truth; a missing ledger row is logged
    // rather than rolled back, so the customer is never short-changed.
    console.error('[UserReferral] Transaction record failed:', txError.message);
  }
};

/**
 * Records a referral when a new customer signs up with a code.
 * Returns the created referral, or null when nothing was recorded.
 */
const recordReferral = async (newUserId, referralCode) => {
  const code = String(referralCode || '').trim().toUpperCase();
  if (!code) return null;

  const settings = await getReferralSettings();
  if (!settings.userReferralEnabled) return null;

  const referrer = await User.findOne({ referralCode: code }).select('_id isActive');
  if (!referrer) {
    console.log(`[UserReferral] Unknown code "${code}" at signup`);
    return null;
  }

  // Self-referral: a customer cannot use their own code.
  if (String(referrer._id) === String(newUserId)) return null;

  if (referrer.isActive === false) return null;

  // Cap on how many rewards one referrer may earn.
  if (settings.userReferralMaxPerUser > 0) {
    const earned = await UserReferral.countDocuments({
      referrerId: referrer._id,
      status: 'rewarded'
    });
    if (earned >= settings.userReferralMaxPerUser) {
      console.log(`[UserReferral] Referrer ${referrer._id} hit their reward cap`);
      return null;
    }
  }

  try {
    const referral = await UserReferral.create({
      referrerId: referrer._id,
      referredUserId: newUserId,
      referralCode: code,
      status: 'pending',
      rewardAmount: settings.userReferralReward,
      refereeRewardAmount: settings.userRefereeReward
    });

    await User.findByIdAndUpdate(newUserId, { referredBy: referrer._id });

    // ON_SIGNUP pays immediately; the other criteria wait for a later trigger.
    if (settings.userReferralCriteria === 'ON_SIGNUP') {
      await creditReward(referral._id);
    }

    return referral;
  } catch (error) {
    // Duplicate key means this customer was already referred — not an error.
    if (error.code === 11000) {
      console.log(`[UserReferral] User ${newUserId} is already referred`);
      return null;
    }
    throw error;
  }
};

/**
 * Pays out a pending referral.
 *
 * The status transition is a conditional update, so if two callers race only
 * one of them moves the row out of 'pending' and credits the wallet.
 */
const creditReward = async (referralId, completedBookingId = null) => {
  const referral = await UserReferral.findOneAndUpdate(
    { _id: referralId, status: { $in: ['pending', 'approved'] } },
    {
      $set: {
        status: 'rewarded',
        rewardedAt: new Date(),
        ...(completedBookingId ? { completedBookingId } : {})
      }
    },
    { new: true }
  );

  // Already rewarded, rejected, or gone: another caller got there first.
  if (!referral) return null;

  await creditWallet(
    referral.referrerId,
    referral.rewardAmount,
    'Referral reward',
    { referralId: referral._id, referredUserId: referral.referredUserId }
  );

  if (referral.refereeRewardAmount > 0) {
    await creditWallet(
      referral.referredUserId,
      referral.refereeRewardAmount,
      'Referral joining bonus',
      { referralId: referral._id }
    );
  }

  console.log(
    `[UserReferral] Rewarded ${referral.rewardAmount} to ${referral.referrerId}`
  );
  return referral;
};

/**
 * Called when a customer completes a booking. Pays out their referral if the
 * programme is set to FIRST_BOOKING and this is their first completion.
 */
const handleBookingCompleted = async (userId, bookingId) => {
  const settings = await getReferralSettings();
  if (!settings.userReferralEnabled) return null;
  if (settings.userReferralCriteria !== 'FIRST_BOOKING') return null;

  const referral = await UserReferral.findOne({
    referredUserId: userId,
    status: 'pending'
  });
  if (!referral) return null;

  return creditReward(referral._id, bookingId);
};

/**
 * Referral summary for the customer-facing "Refer and earn" screen.
 * Dynamically ensures the user has a unique referral code even if they signed up
 * before the referral feature was introduced or via a path that bypassed pre-save.
 */
const getReferralStats = async (userId) => {
  let [user, settings] = await Promise.all([
    User.findById(userId).select('referralCode referralEarnings').lean(),
    getReferralSettings()
  ]);

  // Dynamic self-healing: Ensure user has a referral code on the fly
  if (user && !user.referralCode) {
    let uniqueCode = null;
    let attempts = 0;
    while (!uniqueCode && attempts < 10) {
      const candidate = typeof User.generateReferralCode === 'function'
        ? User.generateReferralCode()
        : `HU${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const exists = await User.exists({ referralCode: candidate });
      if (!exists) {
        uniqueCode = candidate;
      }
      attempts++;
    }

    if (uniqueCode) {
      await User.findByIdAndUpdate(userId, { referralCode: uniqueCode });
      user.referralCode = uniqueCode;
    }
  }

  const [total, rewarded, pending] = await Promise.all([
    UserReferral.countDocuments({ referrerId: userId }),
    UserReferral.countDocuments({ referrerId: userId, status: 'rewarded' }),
    UserReferral.countDocuments({ referrerId: userId, status: 'pending' })
  ]);

  return {
    referralCode: user?.referralCode || null,
    totalEarnings: user?.referralEarnings || 0,
    totalReferrals: total,
    rewardedReferrals: rewarded,
    pendingReferrals: pending,
    rewardPerReferral: settings.userReferralReward,
    joiningBonus: settings.userRefereeReward,
    criteria: settings.userReferralCriteria,
    isEnabled: settings.userReferralEnabled
  };
};

/**
 * Paged referral history for the same screen.
 */
const getReferralHistory = async (userId, { page = 1, limit = 20 } = {}) => {
  const skip = (Math.max(1, page) - 1) * limit;

  const [items, total] = await Promise.all([
    UserReferral.find({ referrerId: userId })
      .populate('referredUserId', 'name phone createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    UserReferral.countDocuments({ referrerId: userId })
  ]);

  return {
    items: items.map((r) => ({
      id: r._id,
      name: r.referredUserId?.name || 'Customer',
      // Masked: the referrer should not get a full phone number out of this.
      phone: r.referredUserId?.phone
        ? `${r.referredUserId.phone.slice(0, 2)}xxxxx${r.referredUserId.phone.slice(-3)}`
        : null,
      status: r.status,
      rewardAmount: r.rewardAmount,
      joinedAt: r.createdAt,
      rewardedAt: r.rewardedAt
    })),
    total,
    page,
    pages: Math.ceil(total / limit) || 1
  };
};

module.exports = {
  getReferralSettings,
  recordReferral,
  creditReward,
  handleBookingCompleted,
  getReferralStats,
  getReferralHistory
};
