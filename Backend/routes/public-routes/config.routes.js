const express = require('express');
const router = express.Router();
const { getPublicSettings } = require('../../controllers/adminControllers/settingsController');
const { getBookingOptions } = require('../../controllers/addOnController');
const { getPublicLegalPage } = require('../../controllers/publicControllers/legalPageController');
const { detectLanguageFromLocation, reverseGeocode } = require('../../services/locationService');

router.get('/config', getPublicSettings);
router.get('/booking-options', getBookingOptions);
router.get('/legal-pages/:slug', getPublicLegalPage);

/**
 * @route   GET /api/public/detect-language
 * @desc    Detect regional language from GPS coordinates using Google Maps API
 * @access  Public
 */
router.get('/detect-language', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: 'Latitude and Longitude are required' });
    }
    const detected = await detectLanguageFromLocation(Number(lat), Number(lng));
    if (detected) {
      return res.json({
        success: true,
        language: detected.language,
        state: detected.state
      });
    }
    return res.json({ success: false, language: 'en', message: 'Unable to detect regional language' });
  } catch (error) {
    console.error('Error detecting language via Google Maps API:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/public/reverse-geocode
 * @desc    Reverse geocode coordinates to formatted address and detect regional language
 * @access  Public
 */
router.get('/reverse-geocode', async (req, res) => {
  try {
    const { lat, lng, language } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: 'Latitude and Longitude are required' });
    }
    const result = await reverseGeocode(Number(lat), Number(lng), language || 'en');
    const detected = await detectLanguageFromLocation(Number(lat), Number(lng));
    return res.json({
      success: true,
      result,
      detectedLanguage: detected?.language || 'en',
      state: detected?.state || ''
    });
  } catch (error) {
    console.error('Error in reverse-geocode via Google Maps API:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
