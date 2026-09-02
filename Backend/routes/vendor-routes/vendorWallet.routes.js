const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticate } = require('../../middleware/authMiddleware');
const { isVendor } = require('../../middleware/roleMiddleware');
const {
  getWallet,
  getTransactions,
  recordCashCollection,
  requestSettlement,
  createSettlementOrder,
  verifySettlementPayment,
  getSettlements,
  getWalletSummary,
  payWorker,
  requestWithdrawal,
  getWithdrawals
} = require('../../controllers/vendorControllers/vendorWalletController');

// Validation rules
const payWorkerValidation = [
  body('bookingId').notEmpty().withMessage('Booking ID is required'),
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('notes').optional().trim()
];

// Validation rules
const cashCollectionValidation = [
  body('bookingId').notEmpty().withMessage('Booking ID is required'),
  body('amount').isFloat({ min: 1 }).withMessage('Valid amount is required')
];

const settlementValidation = [
  body('amount').isFloat({ min: 1 }).withMessage('Valid amount is required'),
  body('paymentMethod').optional().isIn(['upi', 'bank_transfer', 'cash', 'other'])
];

// Routes
// Get wallet with ledger balance
router.get('/wallet', authenticate, isVendor, getWallet);

// Get wallet summary for dashboard
router.get('/wallet/summary', authenticate, isVendor, getWalletSummary);

// Get transaction history/ledger
router.get('/wallet/transactions', authenticate, isVendor, getTransactions);

// Record cash collection (creates negative entry - vendor owes admin)
router.post('/wallet/cash-collection', authenticate, isVendor, cashCollectionValidation, recordCashCollection);

// Request settlement (vendor pays admin)
router.post('/wallet/settlement', authenticate, isVendor, settlementValidation, requestSettlement);
router.post('/wallet/settlement/create-order', authenticate, isVendor, settlementValidation, createSettlementOrder);
router.post('/wallet/settlement/verify', authenticate, isVendor, [
  body('amount').isFloat({ min: 1 }).withMessage('Valid amount is required'),
  body('razorpay_order_id').notEmpty().withMessage('Razorpay order id is required'),
  body('razorpay_payment_id').notEmpty().withMessage('Razorpay payment id is required'),
  body('razorpay_signature').notEmpty().withMessage('Razorpay signature is required'),
  body('notes').optional().trim()
], verifySettlementPayment);

// Pay worker for a booking
router.post('/wallet/pay-worker', authenticate, isVendor, payWorkerValidation, payWorker);

// Get settlement history
router.get('/wallet/settlements', authenticate, isVendor, getSettlements);

// Request withdrawal (vendor withdraws earnings)
router.post('/withdraw', authenticate, isVendor, [
  body('amount').isFloat({ min: 1 }).withMessage('Valid amount is required'),
  body('bankDetails').optional().isObject()
], requestWithdrawal);

// Get withdrawal history
router.get('/wallet/withdrawals', authenticate, isVendor, getWithdrawals);

module.exports = router;
