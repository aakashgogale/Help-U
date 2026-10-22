const express = require('express');
const router = express.Router();
const { findZoneByPoint } = require('../../controllers/adminControllers/zoneController');

/**
 * @route   GET /api/public/zones/lookup
 * @desc    Public point-in-polygon lookup for customer location
 * @access  Public
 */
router.get('/lookup', findZoneByPoint);

module.exports = router;
