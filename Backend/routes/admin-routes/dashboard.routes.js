const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { isAdmin, requirePermission } = require('../../middleware/roleMiddleware');
const {
  getDashboardStats,
  getRevenueAnalytics,
  getBookingTrends,
  getUserGrowthMetrics
} = require('../../controllers/adminControllers/adminDashboardController');

// Scoped to '/dashboard' specifically (not a bare router.use(...)): several
// unrelated route files share this same '/api/admin' mount point, and a
// path-less router.use(middleware) runs for every request that reaches the
// router regardless of which file's route actually matches it — so an
// unscoped version here would also gate /users, /reports, etc. from whichever
// file mounts after this one. See cityManagement.routes.js for the full story.
router.use('/dashboard', authenticate, isAdmin, requirePermission('dashboard'));

// Routes
router.get('/dashboard/stats', getDashboardStats);
router.get('/dashboard/revenue', getRevenueAnalytics);
router.get('/dashboard/bookings/trends', getBookingTrends);
router.get('/dashboard/users/growth', getUserGrowthMetrics);

module.exports = router;

