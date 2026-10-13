const express = require('express');
const router = express.Router();
const { getActiveCities, checkPincodeAvailability, getCityAreas } = require('../../controllers/cityController');

/**
 * @route   GET /api/public/cities
 * @desc    Get all active cities for public use
 * @access  Public
 */
router.get('/', getActiveCities);
router.get('/check-pincode', checkPincodeAvailability);
router.get('/:cityId/areas', getCityAreas);

module.exports = router;
