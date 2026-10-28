const express = require('express');
const router = express.Router();
const axios = require('axios');
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

/**
 * @route   GET /api/public/ip-location
 * @desc    Fallback city/coordinate detection via client IP (for devices without GPS or in WebViews)
 * @access  Public
 */
router.get('/ip-location', async (req, res) => {
  try {
    const rawIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
    const clientIp = String(rawIp).split(',')[0].trim();
    const isLocal = !clientIp || clientIp === '::1' || clientIp.startsWith('127.') || clientIp.startsWith('192.168.') || clientIp.startsWith('10.');
    
    const targetUrl = isLocal
      ? 'http://ip-api.com/json/'
      : `http://ip-api.com/json/${encodeURIComponent(clientIp)}`;

    const response = await axios.get(targetUrl, { timeout: 4000 });
    if (response.data && response.data.status === 'success') {
      return res.json({
        success: true,
        latitude: response.data.lat,
        longitude: response.data.lon,
        city: response.data.city || '',
        region: response.data.regionName || response.data.region || '',
        country: response.data.country || 'India',
        pincode: response.data.zip || '',
        ip: response.data.query || clientIp
      });
    }
  } catch (error) {
    console.warn('[ip-location] IP lookup failed:', error.message);
  }

  return res.json({
    success: false,
    message: 'Could not determine location from IP'
  });
});

module.exports = router;
