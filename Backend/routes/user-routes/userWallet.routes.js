const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticate } = require('../../middleware/authMiddleware');
const { isUser } = require('../../middleware/roleMiddleware');
const {
  getWalletBalance,
  addMoneyToWallet,
  verifyWalletTopup,
  getWalletTransactions
} = require('../../controllers/userControllers/userWalletController');

// Validation rules
const addMoneyValidation = [
  // The minimum and maximum are the admin's (Booking Configuration); the controller checks them
  body('amount').isFloat({ gt: 0 }).withMessage('Enter a valid amount')
];

const verifyTopupValidation = [
  body('razorpay_order_id').trim().notEmpty().withMessage('Order ID is required'),
  body('razorpay_payment_id').trim().notEmpty().withMessage('Payment ID is required'),
  body('razorpay_signature').trim().notEmpty().withMessage('Signature is required'),
  body('amount').isFloat({ gt: 0 }).withMessage('Enter a valid amount')
];

// Routes
router.get('/balance', authenticate, isUser, getWalletBalance);
router.post('/add-money', authenticate, isUser, addMoneyValidation, addMoneyToWallet);
router.post('/verify-topup', authenticate, isUser, verifyTopupValidation, verifyWalletTopup);
router.get('/transactions', authenticate, isUser, getWalletTransactions);

module.exports = router;

