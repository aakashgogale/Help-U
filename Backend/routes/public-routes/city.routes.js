const express = require('express');
const router = express.Router();
const { getActiveCities, checkPincodeAvailability } = require('../../controllers/cityController');

/**
 * @route   GET /api/public/cities
 * @desc    Get all active cities for public use
 * @access  Public
 */
router.get('/', getActiveCities);
router.get('/check-pincode', checkPincodeAvailability);

module.exports = router;
