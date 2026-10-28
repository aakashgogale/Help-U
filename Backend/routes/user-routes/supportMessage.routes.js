const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { authenticate } = require('../../middleware/authMiddleware');
const { isUser } = require('../../middleware/roleMiddleware');
const { submitSupportMessage } = require('../../controllers/supportMessageController');

// A signed-in customer's message from Help & Support (the sender is recorded on the message)
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  skipFailedRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.user?.id || req.ip),
  message: { success: false, message: 'Too many messages. Please try again later.' }
});

router.post('/', authenticate, isUser, limiter, submitSupportMessage('help_support'));

module.exports = router;
