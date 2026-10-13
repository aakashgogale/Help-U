const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { isAdmin, requirePermission } = require('../../middleware/roleMiddleware');
const {
  getAllReferrals,
  approveAndRewardReferral,
  rejectReferral,
  updateReferralSettings
} = require('../../controllers/adminControllers/adminReferralController');

// All Admin referral routes require admin auth. Scoped to each path prefix
// rather than a bare router.use(...): this router shares the '/api/admin'
// mount point with many other route files, and a path-less router.use
// middleware runs for every request reaching the router, not just the ones
// this file actually handles — see cityManagement.routes.js for the full story.
router.use('/referrals', authenticate, isAdmin, requirePermission('referrals'));
router.use('/user-referrals', authenticate, isAdmin, requirePermission('referrals'));

// GET /api/admin/referrals - Get all worker referrals & stats
router.get('/referrals', getAllReferrals);

// PUT /api/admin/referrals/:id/approve - Approve and credit reward to referrer wallet
router.put('/referrals/:id/approve', approveAndRewardReferral);

// PUT /api/admin/referrals/:id/reject - Reject referral
router.put('/referrals/:id/reject', rejectReferral);

// PUT /api/admin/referrals/settings - Update referral program configuration
router.put('/referrals/settings', updateReferralSettings);

// Customer (user-to-user) referral programme
const {
  listUserReferrals,
  approveUserReferral,
  rejectUserReferral,
  getUserReferralSettings,
  updateUserReferralSettings
} = require('../../controllers/adminControllers/adminUserReferralController');

router.get('/user-referrals', listUserReferrals);
router.get('/user-referrals/settings', getUserReferralSettings);
router.put('/user-referrals/settings', updateUserReferralSettings);
router.put('/user-referrals/:id/approve', approveUserReferral);
router.put('/user-referrals/:id/reject', rejectUserReferral);

module.exports = router;
