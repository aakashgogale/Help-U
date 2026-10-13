const mongoose = require('mongoose');

/**
 * UserReferral Model
 * Tracks customer-to-customer referrals, their status, and credited rewards.
 *
 * Mirrors WorkerReferral so both programmes behave the same way, with one
 * difference: a customer referral is normally earned by completing a first
 * booking rather than by admin approval, so completedBookingId records which
 * booking triggered the reward.
 */
const userReferralSchema = new mongoose.Schema({
  referrerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // Unique: a customer can only ever be referred once.
  referredUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  referralCode: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rewarded', 'rejected'],
    default: 'pending',
    index: true
  },
  rewardAmount: {
    type: Number,
    default: 0
  },
  // Reward given to the new customer, if the admin configured a joining bonus.
  refereeRewardAmount: {
    type: Number,
    default: 0
  },
  rewardedAt: {
    type: Date,
    default: null
  },
  // The booking that satisfied the criteria, when it is FIRST_BOOKING.
  completedBookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    default: null
  },
  rejectionReason: {
    type: String,
    default: ''
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

userReferralSchema.index({ referrerId: 1, status: 1 });
userReferralSchema.index({ createdAt: -1 });

module.exports = mongoose.model('UserReferral', userReferralSchema);
