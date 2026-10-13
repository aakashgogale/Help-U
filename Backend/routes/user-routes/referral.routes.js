const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { isUser } = require('../../middleware/roleMiddleware');
const {
  getMyReferralStats,
  getMyReferralHistory,
  validateReferralCode
} = require('../../controllers/userControllers/userReferralController');

// Public: the signup screen checks a code before the account exists.
router.post('/validate', validateReferralCode);

router.get('/stats', authenticate, isUser, getMyReferralStats);
router.get('/history', authenticate, isUser, getMyReferralHistory);

module.exports = router;
