const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticate } = require('../../middleware/authMiddleware');
const { isAdmin, requirePermission } = require('../../middleware/roleMiddleware');
const {
  getWorkerBalances,
  getWorkerLedger,
  getPendingSettlements,
  approveSettlement,
  rejectSettlement,
  getSettlementHistory,
  getSettlementDashboard,
  blockWorker,
  unblockWorker,
  updateCashLimit,
  // Withdrawals
  getWithdrawalRequests,
  approveWithdrawal,
  rejectWithdrawal
} = require('../../controllers/adminControllers/settlementController');

// Safe to leave unscoped: this router is mounted at the dedicated
// '/api/admin/settlements' prefix (see server.js), not shared '/api/admin'.
router.use(authenticate, isAdmin, requirePermission('settlements'));

// Dashboard summary
router.get('/dashboard', getSettlementDashboard);

// Get all workers with balances
router.get('/workers', getWorkerBalances);

// Get specific worker's ledger
router.get('/workers/:vendorId/ledger', getWorkerLedger);

// Worker management (blocking and limits)
router.post('/workers/:vendorId/block', blockWorker);
router.post('/workers/:vendorId/unblock', unblockWorker);
router.post('/workers/:vendorId/cash-limit', updateCashLimit);

// Get all pending settlements
router.get('/pending', getPendingSettlements);

// Get settlement history
router.get('/history', getSettlementHistory);

// Approve settlement
router.post(
  '/:settlementId/approve',
  [body('adminNotes').optional().isString()],
  approveSettlement
);

// Reject settlement
router.post(
  '/:settlementId/reject',
  [body('rejectionReason').notEmpty().withMessage('Rejection reason is required')],
  rejectSettlement
);

// Withdrawals — same 'settlements' permission; a role that can approve
// settlements can approve withdrawals too.
router.get('/withdrawals', getWithdrawalRequests);
router.post('/withdrawals/:withdrawalId/approve', approveWithdrawal);
router.post('/withdrawals/:withdrawalId/reject', rejectWithdrawal);

module.exports = router;
