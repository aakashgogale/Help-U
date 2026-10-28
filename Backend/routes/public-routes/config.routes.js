const express = require('express');
const router = express.Router();
const axios = require('axios');
const { getPublicSettings } = require('../../controllers/adminControllers/settingsController');
const { getBookingOptions } = require('../../controllers/addOnController');
const { getPublicLegalPage } = require('../../controllers/publicControllers/legalPageController');
const { detectLanguageFromLocation, reverseGeocode } = require('../../services/locationService');
const { getPublicPartnerFields } = require('../../controllers/adminControllers/partnerFieldController');

router.get('/config', getPublicSettings);
router.get('/booking-options', getBookingOptions);
router.get('/legal-pages/:slug', getPublicLegalPage);
router.get('/partner-registration-fields', getPublicPartnerFields);

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
    let clientIp = String(rawIp).split(',')[0].trim();
    if (clientIp.startsWith('::ffff:')) {
      clientIp = clientIp.replace('::ffff:', '');
    }

    const isPrivate = !clientIp ||
      clientIp === '::1' ||
      clientIp === '127.0.0.1' ||
      clientIp === 'localhost' ||
      clientIp.startsWith('10.') ||
      clientIp.startsWith('192.168.') ||
      clientIp.startsWith('127.') ||
      clientIp.startsWith('169.254.') ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(clientIp);

    const queryParam = isPrivate ? '' : encodeURIComponent(clientIp);

    // Provider 1: ipwho.is (fast HTTPS, generous rate limits, highly accurate in India)
    try {
      const targetUrl = `https://ipwho.is/${queryParam}`;
      const response = await axios.get(targetUrl, { timeout: 3500 });
      if (response.data && response.data.success && response.data.latitude && response.data.longitude) {
        return res.json({
          success: true,
          latitude: Number(response.data.latitude),
          longitude: Number(response.data.longitude),
          city: response.data.city || '',
          region: response.data.region || '',
          country: response.data.country || 'India',
          pincode: response.data.postal || '',
          ip: response.data.ip || clientIp,
          provider: 'ipwhois'
        });
      }
    } catch (err1) {
      // Continue to next provider
    }

    // Provider 2: freeipapi.com (HTTPS fallback)
    try {
      const targetUrl = `https://freeipapi.com/api/json/${queryParam}`;
      const response = await axios.get(targetUrl, { timeout: 3500, maxRedirects: 3 });
      if (response.data && response.data.latitude && response.data.longitude) {
        return res.json({
          success: true,
          latitude: Number(response.data.latitude),
          longitude: Number(response.data.longitude),
          city: response.data.cityName || '',
          region: response.data.regionName || '',
          country: response.data.countryName || 'India',
          pincode: response.data.zipCode || '',
          ip: response.data.ipAddress || clientIp,
          provider: 'freeipapi'
        });
      }
    } catch (err2) {
      // Continue to next provider
    }

    // Provider 3: ip-api.com
    try {
      const targetUrl = `http://ip-api.com/json/${queryParam}`;
      const response = await axios.get(targetUrl, { timeout: 3500 });
      if (response.data && response.data.status === 'success' && response.data.lat && response.data.lon) {
        return res.json({
          success: true,
          latitude: Number(response.data.lat),
          longitude: Number(response.data.lon),
          city: response.data.city || '',
          region: response.data.regionName || response.data.region || '',
          country: response.data.country || 'India',
          pincode: response.data.zip || '',
          ip: response.data.query || clientIp,
          provider: 'ipapi'
        });
      }
    } catch (err3) {
      // Continue
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
