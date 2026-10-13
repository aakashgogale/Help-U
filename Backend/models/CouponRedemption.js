const mongoose = require('mongoose');

/**
 * Coupon Redemption
 *
 * One row per successful use. Kept separate from Coupon.usedCount so the
 * per-customer limit can be enforced and so redemptions are auditable.
 *
 * The unique index on (couponId, bookingId) makes redemption idempotent: a
 * retried booking request cannot record the same use twice.
 */
const couponRedemptionSchema = new mongoose.Schema({
  couponId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coupon',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  code: {
    type: String,
    required: true,
    uppercase: true
  },
  discountAmount: {
    type: Number,
    required: true,
    min: 0
  },
  orderAmount: {
    type: Number,
    required: true,
    min: 0
  }
}, { timestamps: true });

couponRedemptionSchema.index({ couponId: 1, bookingId: 1 }, { unique: true });
couponRedemptionSchema.index({ couponId: 1, userId: 1 });

module.exports = mongoose.model('CouponRedemption', couponRedemptionSchema);
