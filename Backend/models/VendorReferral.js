const mongoose = require('mongoose');

/**
 * VendorReferral Model
 * Tracks referrals between vendors, approval status, and credited rewards.
 */
const vendorReferralSchema = new mongoose.Schema({
  referrerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true,
    index: true
  },
  referredVendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
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
  rewardedAt: {
    type: Date,
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

vendorReferralSchema.index({ referrerId: 1, status: 1 });
vendorReferralSchema.index({ createdAt: -1 });

module.exports = mongoose.model('VendorReferral', vendorReferralSchema);
