const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { isAdmin, requirePermission } = require('../../middleware/roleMiddleware');
const {
  getSettings,
  updateSettings,
  testGoogleMapsApiKey,
  getCustomizationToggles,
  updateCustomizationToggles
} = require('../../controllers/adminControllers/settingsController');

// All routes are protected and for admin only. Scoped to each path prefix
// rather than a bare router.use(...): this router shares the '/api/admin'
// mount point with many other route files, and a path-less router.use
// middleware runs for every request reaching the router, not just the ones
// this file actually handles — see cityManagement.routes.js for the full story.
router.use('/settings', authenticate, isAdmin, requirePermission('settings'));
router.use('/customization', authenticate, isAdmin, requirePermission('customization'));

router.route('/settings')
  .get(getSettings)
  .put(updateSettings);

router.post('/settings/test-map-api', testGoogleMapsApiKey);

router.route('/customization')
  .get(getCustomizationToggles)
  .put(updateCustomizationToggles);

module.exports = router;
