const mongoose = require('mongoose');

/**
 * LoginBanner Schema
 * Manages floating / moving banners and offers displayed on the Login screens
 * of both the User App and the Partner (Worker) App.
 */
const loginBannerSchema = new mongoose.Schema(
  {
    // Target audience: 'user' for customer app, 'partner' for worker/partner app, 'both' for both
    app: {
      type: String,
      enum: ['user', 'partner', 'both'],
      required: true,
      default: 'user',
      index: true
    },
    // Main headline / offer text
    title: {
      type: String,
      required: [true, 'Banner title is required'],
      trim: true
    },
    // Sub-text or descriptive offer info
    subtitle: {
      type: String,
      default: '',
      trim: true
    },
    // Badge pill e.g. "SPECIAL OFFER", "HOT DEAL", "ZERO COMMISSION", "POPULAR"
    badge: {
      type: String,
      default: '',
      trim: true
    },
    // Optional banner image URL (Cloudinary or remote URL)
    imageUrl: {
      type: String,
      default: '',
      trim: true
    },
    // Optional banner short video URL (Cloudinary MP4/WebM or remote URL)
    videoUrl: {
      type: String,
      default: '',
      trim: true
    },
    // Media type: 'gradient' | 'image' | 'video'
    mediaType: {
      type: String,
      enum: ['gradient', 'image', 'video'],
      default: 'gradient'
    },
    // Icon name: 'sparkles' | 'gift' | 'zap' | 'percent' | 'shield' | 'star' | 'trending' | 'award' | 'clock' | 'check'
    icon: {
      type: String,
      default: 'sparkles',
      trim: true
    },
    // Gradient / color theme: 'navy' | 'emerald' | 'amber' | 'purple' | 'rose' | 'blue' | 'dark'
    gradient: {
      type: String,
      default: 'navy',
      trim: true
    },
    // Optional coupon or promo code to copy or display, e.g. "HELPU20"
    offerCode: {
      type: String,
      default: '',
      trim: true
    },
    // Optional link / route
    linkUrl: {
      type: String,
      default: '',
      trim: true
    },
    // Display order (ascending)
    order: {
      type: Number,
      default: 0,
      index: true
    },
    // Whether this banner is currently active and visible
    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

loginBannerSchema.index({ app: 1, isActive: 1, order: 1 });

module.exports = mongoose.model('LoginBanner', loginBannerSchema);

