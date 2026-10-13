/**
 * Customer Referral Controller
 *
 * Powers the "Refer and earn" screen in the user app.
 */

const {
  getReferralStats,
  getReferralHistory,
  getReferralSettings
} = require('../../services/userReferralService');
const User = require('../../models/User');

/**
 * GET /api/users/referrals/stats
 * Code, earnings and counts for the referral screen.
 */
exports.getMyReferralStats = async (req, res) => {
  try {
    const stats = await getReferralStats(req.user.id);
    res.status(200).json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching referral stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load referral details'
    });
  }
};

/**
 * GET /api/users/referrals/history
 */
exports.getMyReferralHistory = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));

    const history = await getReferralHistory(req.user.id, { page, limit });
    res.status(200).json({ success: true, ...history });
  } catch (error) {
    console.error('Error fetching referral history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load referral history'
    });
  }
};

/**
 * POST /api/users/referrals/validate
 * Checks a code before signup so the app can show the reward up front.
 *
 * Returns only whether the code is usable and the referrer's first name — not
 * the referrer's id, phone or full profile, since this endpoint is reachable
 * without authentication.
 */
exports.validateReferralCode = async (req, res) => {
  try {
    const code = String(req.body?.code || '').trim().toUpperCase();
    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Referral code is required'
      });
    }

    const settings = await getReferralSettings();
    if (!settings.userReferralEnabled) {
      return res.status(200).json({
        success: true,
        valid: false,
        message: 'The referral programme is currently unavailable'
      });
    }

    const referrer = await User.findOne({ referralCode: code })
      .select('name isActive')
      .lean();

    if (!referrer || referrer.isActive === false) {
      return res.status(200).json({
        success: true,
        valid: false,
        message: 'This referral code is not valid'
      });
    }

    res.status(200).json({
      success: true,
      valid: true,
      referrerName: String(referrer.name || '').split(' ')[0] || 'A friend',
      joiningBonus: settings.userRefereeReward,
      message: settings.userRefereeReward > 0
        ? `You will get ₹${settings.userRefereeReward} on joining`
        : 'Referral code applied'
    });
  } catch (error) {
    console.error('Error validating referral code:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate referral code'
    });
  }
};
