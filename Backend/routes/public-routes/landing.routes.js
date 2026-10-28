const express = require('express');
const router = express.Router();
const {
  getPublicLandingConfig,
  submitPartnerLead
} = require('../../controllers/landingPageController');
const { submitSupportMessage } = require('../../controllers/supportMessageController');
const rateLimit = require('express-rate-limit');

// A public form: a few messages an hour per address keeps it from being used to flood the admins
const inquiryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  skipFailedRequests: true, // a mistyped email does not use up the allowance
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many messages from this device. Please try again later.' }
});

// Public landing page config
router.get('/landing-config', getPublicLandingConfig);

// Public partner registration
router.post('/partner-lead', submitPartnerLead);

// Public contact form (landing page) and Help & Support for visitors who are not signed in
router.post('/contact-inquiry', inquiryLimiter, submitSupportMessage('landing'));
router.post('/support-message', inquiryLimiter, submitSupportMessage('help_support'));

module.exports = router;
