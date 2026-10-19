const mongoose = require('mongoose');

/**
 * Coupon Model
 *
 * Discount codes applied at checkout. Entirely additive — nothing else in the
 * booking flow changes unless a coupon is actually supplied.
 *
 * Scoping is by exception: an empty categories / cities / services array means
 * "applies everywhere", so a coupon created without restrictions is global.
 */
const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Coupon code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    index: true
  },
  title: {
    type: String,
    required: [true, 'Coupon title is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },

  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true
  },
  discountValue: {
    type: Number,
    required: true,
    min: 0
  },
  // Ceiling for percentage coupons, so "50% off" cannot cost more than
  // intended on a large booking. 0 means no ceiling.
  maxDiscountAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  minOrderAmount: {
    type: Number,
    default: 0,
    min: 0
  },

  validFrom: {
    type: Date,
    default: Date.now
  },
  validUntil: {
    type: Date,
    required: [true, 'Expiry date is required'],
    index: true
  },

  // 0 means unlimited.
  usageLimit: {
    type: Number,
    default: 0,
    min: 0
  },
  usageLimitPerUser: {
    type: Number,
    default: 1,
    min: 0
  },
  usedCount: {
    type: Number,
    default: 0,
    min: 0
  },

  // Empty array = no restriction on that dimension.
  categories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  services: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserService'
  }],
  cities: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'City'
  }],

  // Restricts the coupon to customers who have never completed a booking.
  firstBookingOnly: {
    type: Boolean,
    default: false
  },

  // When true, the UI advertises this coupon in the service catalog modal's
  // coupon card and auto-fills the code at checkout. Scoping to a specific
  // category uses the existing `categories: [ObjectId]` field above (empty
  // array = app-wide), so no duplicate scope field is introduced. The
  // discount is always computed server-side; this flag is advertise-only.
  isAutoApply: {
    type: Boolean,
    default: false
  },

  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  }
}, { timestamps: true });

// Lookup path for the checkout screen: active, in-date coupons.
couponSchema.index({ isActive: 1, validUntil: 1 });

/**
 * Whether the coupon is live right now, ignoring per-customer rules.
 */
couponSchema.methods.isCurrentlyValid = function () {
  const now = new Date();
  if (!this.isActive) return { valid: false, reason: 'This coupon is no longer active' };
  if (this.validFrom > now) return { valid: false, reason: 'This coupon is not active yet' };
  if (this.validUntil < now) return { valid: false, reason: 'This coupon has expired' };
  if (this.usageLimit > 0 && this.usedCount >= this.usageLimit) {
    return { valid: false, reason: 'This coupon has reached its usage limit' };
  }
  return { valid: true };
};

/**
 * Discount for a given order amount, rounded to whole rupees and never more
 * than the order itself.
 */
couponSchema.methods.calculateDiscount = function (orderAmount) {
  let discount =
    this.discountType === 'percentage'
      ? (orderAmount * this.discountValue) / 100
      : this.discountValue;

  if (this.maxDiscountAmount > 0) {
    discount = Math.min(discount, this.maxDiscountAmount);
  }

  // A discount can never exceed the order, which would imply a refund.
  discount = Math.min(discount, orderAmount);

  return Math.round(discount);
};

module.exports = mongoose.model('Coupon', couponSchema);
