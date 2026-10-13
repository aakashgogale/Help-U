const express = require('express');
const router = express.Router();
const { getPublicSettings } = require('../../controllers/adminControllers/settingsController');
const { getBookingOptions } = require('../../controllers/addOnController');
const { getPublicLegalPage } = require('../../controllers/publicControllers/legalPageController');

router.get('/config', getPublicSettings);
router.get('/booking-options', getBookingOptions);
router.get('/legal-pages/:slug', getPublicLegalPage);

module.exports = router;
