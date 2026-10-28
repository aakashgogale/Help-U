const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker',
    default: null
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    default: null
  },
  type: {
    type: String,
    enum: [
      'credit', 'debit', 'refund', 'withdrawal', 'commission', 'cash_collected',
      'settlement', 'earnings_credit', 'tds_deduction', 'payment', 'advance_payment',
      'platform_fee', 'convenience_fee', 'gst', 'penalty', 'referral_bonus',
      'cashback', 'promo_credit', 'scrap_payout', 'scrap_reimbursement'
    ],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: [
      'wallet', 'razorpay', 'cash', 'bank_transfer', 'system', 'other',
      'hand_to_hand', 'online', 'cash collected', 'Qr online', 'pay_at_home',
      'plan_benefit', 'upi', 'card'
    ],
    default: 'wallet'
  },
  description: {
    type: String,
    required: true
  },
  // Set only where the same payment must never be applied twice (wallet top-ups). A unique, sparse
  // index on it makes "claim the payment, then credit" atomic even when the app's verify call and
  // Razorpay's webhook arrive at the same moment.
  idempotencyKey: {
    type: String,
    default: undefined
  },
  referenceId: {
    type: String,  // Payment gateway reference
    default: null
  },
  balanceBefore: {
    type: Number,
    default: 0
  },
  balanceAfter: {
    type: Number,
    default: 0
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes for faster queries
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ vendorId: 1, createdAt: -1 });
transactionSchema.index({ bookingId: 1 });
transactionSchema.index({ type: 1, status: 1 });
// A wallet top-up is applied once per payment: the unique idempotencyKey below makes that atomic
transactionSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Transaction', transactionSchema);
