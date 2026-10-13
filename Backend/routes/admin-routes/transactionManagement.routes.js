const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { isAdmin, requirePermission } = require('../../middleware/roleMiddleware');
const {
  getAllTransactions,
  getTransactionStats
} = require('../../controllers/adminControllers/adminTransactionController');

// All routes are protected and admin only
// Scoped to '/transactions' — see cityManagement.routes.js for why a bare
// router.use(middleware) is unsafe when this router shares the '/api/admin'
// mount point with many other route files.
router.use('/transactions', authenticate, isAdmin, requirePermission('transactions'));

router.get('/transactions', getAllTransactions);
router.get('/transactions/stats', getTransactionStats);

module.exports = router;
