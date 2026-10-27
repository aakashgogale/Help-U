const express = require('express');
const router = express.Router();
const {
  getPublicLandingConfig,
  submitPartnerLead,
  submitContactInquiry
} = require('../../controllers/landingPageController');

// Public landing page config
router.get('/landing-config', getPublicLandingConfig);

// Public partner registration
router.post('/partner-lead', submitPartnerLead);

// Public contact inquiry
router.post('/contact-inquiry', submitContactInquiry);

module.exports = router;
