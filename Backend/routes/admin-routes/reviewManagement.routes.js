const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { isAdmin, requirePermission } = require('../../middleware/roleMiddleware');
const {
  getAllReviews,
  updateReviewStatus,
  getReviewStats
} = require('../../controllers/adminControllers/adminReviewController');

// All routes require authentication and admin role
// Scoped to '/reviews' — see cityManagement.routes.js for why a bare
// router.use(middleware) is unsafe when this router shares the '/api/admin'
// mount point with many other route files.
router.use('/reviews', authenticate, isAdmin, requirePermission('reviews'));

// Get all reviews
router.get('/reviews', getAllReviews);

// Get review statistics
router.get('/reviews/stats', getReviewStats);

// Update review status
router.patch('/reviews/:id/status', updateReviewStatus);

module.exports = router;
