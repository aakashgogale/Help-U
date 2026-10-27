const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { isAdmin } = require('../../middleware/roleMiddleware');
const {
  getAdminLandingConfig,
  updateAdminLandingConfig,
  getAdminPartnerLeads,
  updatePartnerLeadStatus,
  deletePartnerLead
} = require('../../controllers/landingPageController');

// Landing page content config
router.get('/landing-config', authenticate, isAdmin, getAdminLandingConfig);
router.put('/landing-config', authenticate, isAdmin, updateAdminLandingConfig);

// Partner leads management
router.get('/partner-leads', authenticate, isAdmin, getAdminPartnerLeads);
router.put('/partner-leads/:id', authenticate, isAdmin, updatePartnerLeadStatus);
router.delete('/partner-leads/:id', authenticate, isAdmin, deletePartnerLead);

module.exports = router;
