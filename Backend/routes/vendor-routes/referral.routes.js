const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { isVendor } = require('../../middleware/roleMiddleware');
const { getVendorReferralDetails } = require('../../controllers/vendorControllers/vendorReferralController');

// GET /api/vendors/referrals - Get logged in vendor's referral dashboard details
router.get('/referrals', authenticate, isVendor, getVendorReferralDetails);

module.exports = router;
