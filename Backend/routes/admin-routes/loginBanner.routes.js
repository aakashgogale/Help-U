const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { isAdmin } = require('../../middleware/roleMiddleware');
const {
  getAllLoginBanners,
  createLoginBanner,
  updateLoginBanner,
  deleteLoginBanner,
  toggleBannerStatus,
  reorderBanners,
  seedDefaults,
  getLoginBannerConfig,
  updateLoginBannerConfig
} = require('../../controllers/adminControllers/loginBannerController');

// All routes here require admin authentication
router.use(authenticate, isAdmin);

/**
 * @route   GET /api/admin/login-banners
 * @desc    Get all login banners (user & partner)
 * @access  Admin
 */
router.get('/', getAllLoginBanners);

/**
 * @route   POST /api/admin/login-banners
 * @desc    Create a new login banner
 * @access  Admin
 */
router.post('/', createLoginBanner);

/**
 * @route   PUT /api/admin/login-banners/:id
 * @desc    Update an existing login banner
 * @access  Admin
 */
router.put('/:id', updateLoginBanner);

/**
 * @route   DELETE /api/admin/login-banners/:id
 * @desc    Delete a login banner
 * @access  Admin
 */
router.delete('/:id', deleteLoginBanner);

/**
 * @route   PATCH /api/admin/login-banners/:id/toggle
 * @desc    Toggle active status of a banner
 * @access  Admin
 */
router.patch('/:id/toggle', toggleBannerStatus);

/**
 * @route   POST /api/admin/login-banners/reorder
 * @desc    Reorder banners
 * @access  Admin
 */
router.post('/reorder', reorderBanners);

/**
 * @route   GET /api/admin/login-banners/config
 * @desc    Get master enable/disable flags for login banners
 * @access  Admin
 */
router.get('/config', getLoginBannerConfig);

/**
 * @route   PUT /api/admin/login-banners/config
 * @desc    Update master enable/disable flags for login banners
 * @access  Admin
 */
router.put('/config', updateLoginBannerConfig);

/**
 * @route   POST /api/admin/login-banners/seed-defaults
 * @desc    Seed recommended default banners
 * @access  Admin
 */
router.post('/seed-defaults', seedDefaults);

module.exports = router;

