const express = require('express');
const router = express.Router();
const {
  getPublicCategories,
  getPublicBrands,
  getPublicBrandBySlug,
  getPublicServices,
  advancedCatalogSearch,
  getPublicHomeContent,
  getPublicHomeData
} = require('../../controllers/publicControllers/catalogController');

// Public routes - no authentication required
router.get('/categories', getPublicCategories);
router.get('/brands', getPublicBrands); // Formerly services
router.get('/brands/slug/:slug', getPublicBrandBySlug);
router.get('/services', getPublicServices); // New services
router.get('/search/advanced', advancedCatalogSearch);
router.get('/home-content', getPublicHomeContent);
router.get('/home-data', getPublicHomeData);

module.exports = router;
