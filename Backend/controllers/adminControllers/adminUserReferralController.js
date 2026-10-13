/**
 * Customer Referral Programme (admin)
 *
 *   GET /api/admin/user-referrals                list + stats
 *   PUT /api/admin/user-referrals/:id/approve    pay out a pending referral
 *   PUT /api/admin/user-referrals/:id/reject
 *   GET /api/admin/user-referrals/settings
 *   PUT /api/admin/user-referrals/settings
 *
 * Payouts go through userReferralService.creditReward so the conditional
 * status update there prevents double payment.
 */

const mongoose = require('mongoose');
const UserReferral = require('../../models/UserReferral');
const User = require('../../models/User');
const Settings = require('../../models/Settings');
const { creditReward, getReferralSettings } = require('../../services/userReferralService');

const CRITERIA = ['ON_SIGNUP', 'FIRST_BOOKING', 'MANUAL_ADMIN_APPROVAL'];

exports.listUserReferrals = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const query = {};
    if (['pending', 'approved', 'rewarded', 'rejected'].includes(req.query.status)) query.status = req.query.status;

    if (req.query.search) {
      const escaped = String(req.query.search).trim().slice(0, 50).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const users = await User.find({
        $or: [
          { name: { $regex: escaped, $options: 'i' } },
          { phone: { $regex: escaped, $options: 'i' } }
        ]
      }).select('_id').limit(100).lean();
      const ids = users.map((u) => u._id);
      query.$or = [
        { referrerId: { $in: ids } },
        { referredUserId: { $in: ids } },
        { referralCode: { $regex: escaped, $options: 'i' } }
      ];
    }

    const [items, total, statusCounts, rewardTotals] = await Promise.all([
      UserReferral.find(query)
        .populate('referrerId', 'name phone referralCode')
        .populate('referredUserId', 'name phone createdAt')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      UserReferral.countDocuments(query),
      UserReferral.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      UserReferral.aggregate([
        { $match: { status: 'rewarded' } },
        { $group: { _id: null, referrer: { $sum: '$rewardAmount' }, referee: { $sum: '$refereeRewardAmount' } } }
      ])
    ]);

    const stats = { pending: 0, approved: 0, rewarded: 0, rejected: 0 };
    statusCounts.forEach((s) => { stats[s._id] = s.count; });
    stats.totalPaid = (rewardTotals[0]?.referrer || 0) + (rewardTotals[0]?.referee || 0);

    res.status(200).json({
      success: true,
      data: items,
      stats,
      settings: await getReferralSettings(),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('List user referrals error:', error);
    res.status(500).json({ success: false, message: 'Failed to load customer referrals' });
  }
};

exports.approveUserReferral = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Referral not found' });
    }
    const referral = await creditReward(req.params.id);
    if (!referral) {
      return res.status(400).json({ success: false, message: 'This referral was already paid out or rejected' });
    }
    res.status(200).json({ success: true, message: 'Referral approved and reward credited', data: referral });
  } catch (error) {
    console.error('Approve user referral error:', error);
    res.status(500).json({ success: false, message: 'Failed to approve referral' });
  }
};

exports.rejectUserReferral = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Referral not found' });
    }
    const referral = await UserReferral.findOneAndUpdate(
      { _id: req.params.id, status: { $in: ['pending', 'approved'] } },
      { $set: { status: 'rejected' } },
      { new: true }
    );
    if (!referral) {
      return res.status(400).json({ success: false, message: 'Only a pending referral can be rejected' });
    }
    res.status(200).json({ success: true, message: 'Referral rejected', data: referral });
  } catch (error) {
    console.error('Reject user referral error:', error);
    res.status(500).json({ success: false, message: 'Failed to reject referral' });
  }
};

exports.getUserReferralSettings = async (req, res) => {
  try {
    res.status(200).json({ success: true, settings: await getReferralSettings() });
  } catch (error) {
    console.error('Get user referral settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to load referral settings' });
  }
};

exports.updateUserReferralSettings = async (req, res) => {
  try {
    const { userReferralEnabled, userReferralReward, userRefereeReward, userReferralCriteria, userReferralMaxPerUser } = req.body;
    const updates = {};

    if (userReferralEnabled !== undefined) updates.userReferralEnabled = Boolean(userReferralEnabled);
    for (const [key, value] of Object.entries({ userReferralReward, userRefereeReward, userReferralMaxPerUser })) {
      if (value === undefined) continue;
      const n = Number(value);
      if (!Number.isFinite(n) || n < 0) {
        return res.status(400).json({ success: false, message: `${key} must be zero or more` });
      }
      updates[key] = key === 'userReferralMaxPerUser' ? Math.floor(n) : n;
    }
    if (userReferralCriteria !== undefined) {
      if (!CRITERIA.includes(userReferralCriteria)) {
        return res.status(400).json({ success: false, message: 'Invalid reward criteria' });
      }
      updates.userReferralCriteria = userReferralCriteria;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid settings were provided' });
    }

    await Settings.findOneAndUpdate({ type: 'global' }, { $set: updates }, { upsert: true });
    res.status(200).json({ success: true, message: 'Customer referral settings saved', settings: await getReferralSettings() });
  } catch (error) {
    console.error('Update user referral settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to save referral settings' });
  }
};
