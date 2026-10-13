const express = require('express');
const router = express.Router();
const {
  getAllCities,
  getCity,
  createCity,
  updateCity,
  deleteCity,
  toggleCityStatus,
  getCityAreas,
  createArea,
  updateArea,
  deleteArea
} = require('../../controllers/cityController');
const { authenticate } = require('../../middleware/authMiddleware');
const { isAdmin, requirePermission } = require('../../middleware/roleMiddleware');

/**
 * @route   /api/admin/cities
 * @desc    Admin city management routes
 * @access  Private (roles granted the 'cities' permission; super_admin always passes)
 *
 * IMPORTANT: this router is mounted at the shared '/api/admin' prefix
 * alongside many other admin route files. A path-less router.use(middleware)
 * runs for every request that reaches this router, even ones whose path only
 * matches a route defined in a different file mounted at the same prefix —
 * so a blocking middleware here (e.g. the old isSuperAdmin) silently 403'd
 * EVERY /api/admin/* request for any non-super-admin, since this file loads
 * first in server.js. Only isAdmin (lets any admin role continue) belongs in
 * an unscoped router.use() here; the real restriction must be attached to
 * each route via requirePermission so it cannot leak onto unrelated routers.
 */
router.use(authenticate, isAdmin);

router.get('/cities', requirePermission('cities'), getAllCities);
router.get('/cities/:id', requirePermission('cities'), getCity);
router.post('/cities', requirePermission('cities'), createCity);
router.put('/cities/:id', requirePermission('cities'), updateCity);
router.delete('/cities/:id', requirePermission('cities'), deleteCity);
router.patch('/cities/:id/status', requirePermission('cities'), toggleCityStatus);

// Area hierarchy routes
router.get('/cities/:cityId/areas', requirePermission('cities'), getCityAreas);
router.post('/cities/:cityId/areas', requirePermission('cities'), createArea);
router.put('/cities/:cityId/areas/:areaId', requirePermission('cities'), updateArea);
router.delete('/cities/:cityId/areas/:areaId', requirePermission('cities'), deleteArea);

module.exports = router;
