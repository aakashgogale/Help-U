const User = require('../../models/User');
const { validationResult } = require('express-validator');
const { createOrder } = require('../../services/razorpayService');
const { getBookingConfig } = require('../../utils/bookingConfig');

/**
 * Get wallet balance
 */
const getWalletBalance = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select('wallet');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const balance = user.wallet?.balance || 0;
    const penalty = user.wallet?.penalty || 0;
    const promoBalance = user.wallet?.promoBalance || 0;
    const cashbackBalance = user.wallet?.cashbackBalance || 0;
    const totalAvailable = Math.max(0, balance + promoBalance + cashbackBalance - penalty);

    res.status(200).json({
      success: true,
      data: {
        balance,
        penalty,
        promoBalance,
        cashbackBalance,
        totalAvailable
      }
    });
  } catch (error) {
    console.error('Get wallet balance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch wallet balance. Please try again.'
    });
  }
};

/**
 * Add money to wallet
 */
const addMoneyToWallet = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = req.user.id;
    const { amount } = req.body;

    // Validate amount against the admin's top-up limits
    const { walletMinTopup, walletMaxTopup } = await getBookingConfig();
    if (!(Number(amount) >= walletMinTopup)) {
      return res.status(400).json({ success: false, message: `Minimum amount to add is ₹${walletMinTopup}` });
    }
    if (Number(amount) > walletMaxTopup) {
      return res.status(400).json({ success: false, message: `Maximum amount to add at once is ₹${walletMaxTopup}` });
    }

    // Create Razorpay order for wallet top-up
    const orderResult = await createOrder(
      amount,
      'INR',
      `WALLET_${userId}_${Date.now()}`,
      {
        userId: userId.toString(),
        type: 'wallet_topup'
      }
    );

    if (!orderResult.success) {
      return res.status(500).json({
        success: false,
        message: orderResult.error || 'Failed to create payment order'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Payment order created successfully',
      data: {
        orderId: orderResult.orderId,
        amount: orderResult.amount / 100,
        currency: orderResult.currency,
        key: process.env.RAZORPAY_KEY_ID
      }
    });
  } catch (error) {
    console.error('Add money to wallet error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment order. Please try again.'
    });
  }
};

/**
 * Verify wallet top-up payment
 */
const verifyWalletTopup = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = req.user.id;
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amount
    } = req.body;

    // Verify signature
    const { verifyPayment } = require('../../services/razorpayService');
    const isValid = verifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
      });
    }

    const numAmount = parseFloat(amount);
    const { walletMinTopup } = await getBookingConfig();
    if (isNaN(numAmount) || numAmount < walletMinTopup) {
      return res.status(400).json({
        success: false,
        message: `Invalid amount. Minimum amount is ₹${walletMinTopup}`
      });
    }

    // The amount to credit is what the payment gateway actually captured, never what the app sent.
    // If the gateway cannot be asked right now, nothing is credited here: the money is safe and
    // Razorpay's webhook adds it as soon as the payment is confirmed.
    const { getPaymentDetails } = require('../../services/razorpayService');
    const pDetails = await getPaymentDetails(razorpay_payment_id);
    const gatewayPayment = pDetails && pDetails.success ? pDetails.payment : null;
    if (!gatewayPayment) {
      return res.status(503).json({
        success: false,
        message: 'We could not confirm your payment with the payment provider just yet. Your money is safe and will be added to your wallet automatically in a few minutes.'
      });
    }
    if (gatewayPayment.status === 'authorized') {
      return res.status(503).json({ success: false, message: 'Your payment is still being confirmed. It will be added to your wallet automatically in a few minutes.' });
    }
    if (gatewayPayment.status !== 'captured') {
      return res.status(400).json({ success: false, message: `The payment is ${gatewayPayment.status}, so nothing was added to your wallet.` });
    }
    // The order was created for one customer; a valid payment cannot be claimed by someone else
    if (gatewayPayment.notes?.userId && String(gatewayPayment.notes.userId) !== String(userId)) {
      return res.status(403).json({ success: false, message: 'This payment belongs to a different account.' });
    }
    const gatewayRupees = (gatewayPayment.amount || 0) / 100;
    if (gatewayRupees < numAmount) {
      return res.status(400).json({
        success: false,
        message: `Payment amount mismatch: captured ₹${gatewayRupees} but requested ₹${numAmount}`
      });
    }

    const { creditWalletTopup } = require('../../services/walletTopupService');
    const result = await creditWalletTopup({
      userId,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      amount: gatewayRupees,
      source: 'verify'
    });
    if (result.duplicate) {
      return res.status(200).json({ success: true, message: 'Payment already processed', data: { balance: result.balance } });
    }
    const newBalance = result.balance;

    res.status(200).json({
      success: true,
      message: 'Money added to wallet successfully',
      data: {
        balance: newBalance
      }
    });
  } catch (error) {
    console.error('Verify wallet topup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add money to wallet. Please try again.'
    });
  }
};

/**
 * Get wallet transaction history
 */
const getWalletTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const Transaction = require('../../models/Transaction');

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get transactions
    const transactions = await Transaction.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await Transaction.countDocuments({ userId });

    // Format transactions
    const formattedTransactions = transactions.map(txn => ({
      id: txn._id,
      type: txn.type, // 'credit', 'debit', 'refund', 'penalty' etc.
      amount: txn.amount,
      description: txn.description,
      date: txn.createdAt,
      status: txn.status,
      balanceAfter: txn.balanceAfter
    }));

    res.status(200).json({
      success: true,
      data: formattedTransactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get wallet transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction history. Please try again.'
    });
  }
};

module.exports = {
  getWalletBalance,
  addMoneyToWallet,
  verifyWalletTopup,
  getWalletTransactions
};
