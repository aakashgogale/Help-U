const mongoose = require('mongoose');
const { SERVICE_STATUS } = require('../utils/constants');

/**
 * Brand Model (Previously Service)
 * Represents Brands (e.g., specific service providers or types under a category)
 */
const brandSchema = new mongoose.Schema({
  // Frontend matching fields
  title: {
    type: String,
    required: [true, 'Please provide a brand title'],
    trim: true,
    index: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    index: true
  },
  categoryIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Please provide at least one category'],
    index: true
  }],
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    index: true
  },
  // Cities where this brand is available
  cityIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'City',
    index: true
  }],
  iconUrl: {
    type: String,
    default: null
  },
  badge: {
    type: String,
    default: null,
    trim: true
  },
  routePath: {
    type: String,
    default: null
  },
  // Status
  status: {
    type: String,
    enum: Object.values(SERVICE_STATUS),
    default: SERVICE_STATUS.ACTIVE,
    index: true
  },
  // Additional Info
  isPopular: {
    type: Boolean,
    default: false,
    index: true
  },
  isFeatured: {
    type: Boolean,
    default: false,
    index: true
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalBookings: {
    type: Number,
    default: 0
  },
  // Controls the order a brand appears as a section inside the service
  // catalog modal under its category. Rows left at 0 (today's default) fall
  // through to the current createdAt ordering, so untouched brands keep
  // showing in the same order they did before this field existed.
  displayOrder: {
    type: Number,
    default: 0,
    index: true
  },
  // Promotional banner shown above a brand's services inside the catalog
  // modal (e.g. "Spatula waxing starting at ₹1,039"). All fields optional;
  // the UI skips the banner when title/imageUrl are both empty.
  bannerPromo: {
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    originalPrice: { type: Number, default: null, min: 0 },
    imageUrl: { type: String, default: '' }
  },
  // Snapshot of the previous status before archive, so restore returns to the
  // original state. Set by the archive endpoint, cleared by restore.
  previousStatus: {
    type: String,
    default: null
  },

  // Admin tracking
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  }
}, {
  timestamps: true
});

// Generate slug from title before validation so the `required` check passes
brandSchema.pre('validate', function (next) {
  if (this.isModified('title') && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

brandSchema.pre('save', async function (next) {
  // Auto-generate routePath from slug
  if (this.isModified('slug') && !this.routePath) {
    this.routePath = `/user/brand/${this.slug}`;
  }
  // Sync categoryId and categoryIds
  if (this.isModified('categoryId') && this.categoryId && !this.categoryIds.includes(this.categoryId)) {
    if (!this.categoryIds.includes(this.categoryId)) {
      this.categoryIds.push(this.categoryId);
    }
  }

  if (this.isModified('categoryIds') && this.categoryIds.length > 0) {
    this.categoryId = this.categoryIds[0];
  }

  next();
});

// Indexes for faster queries
brandSchema.index({ categoryIds: 1, status: 1 });
brandSchema.index({ status: 1, isPopular: 1, isFeatured: 1 });

module.exports = mongoose.model('Brand', brandSchema);
