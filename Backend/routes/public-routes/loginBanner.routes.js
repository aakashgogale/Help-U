const express = require('express');
const router = express.Router();
const { getPublicLoginBanners } = require('../../controllers/publicControllers/loginBannerController');

/**
 * @route   GET /api/public/login-banners
 * @desc    Fetch active login banners for User App or Partner App
 * @access  Public
 */
router.get('/', getPublicLoginBanners);

module.exports = router;

