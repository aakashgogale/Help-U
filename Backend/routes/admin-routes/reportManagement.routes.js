const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { isAdmin, requirePermission } = require('../../middleware/roleMiddleware');
const {
  getBookingReport,
  getWorkerReport,
  getRevenueReport,
  getCustomerReport,
  getAdvancedAnalytics
} = require('../../controllers/adminControllers/adminReportController');

// All routes require authentication and admin role. Scoped to '/reports'
// rather than a bare router.use(...): this router shares the '/api/admin'
// mount point with many other route files, and a path-less router.use
// middleware runs for every request reaching the router, not just the ones
// this file actually handles — see cityManagement.routes.js for the full story.
router.use('/reports', authenticate, isAdmin, requirePermission('reports'));

// Report routes
router.get('/reports/advanced-analytics', getAdvancedAnalytics);
router.get('/reports/bookings', getBookingReport);
router.get('/reports/workers', getWorkerReport);
router.get('/reports/revenue', getRevenueReport);
router.get('/reports/customers', getCustomerReport);

module.exports = router;
