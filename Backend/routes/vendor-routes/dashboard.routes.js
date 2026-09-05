const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { isVendor } = require('../../middleware/roleMiddleware');
const {
  getDashboardStats,
  getRevenueAnalytics,
  getServicePerformance
} = require('../../controllers/vendorControllers/vendorDashboardController');

// Routes
router.get('/dashboard/stats', authenticate, isVendor, getDashboardStats);
router.get('/dashboard/revenue', authenticate, isVendor, getRevenueAnalytics);
router.get('/dashboard/services', authenticate, isVendor, getServicePerformance);

module.exports = router;


