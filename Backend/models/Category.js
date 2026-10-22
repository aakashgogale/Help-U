const mongoose = require('mongoose');
const { SERVICE_STATUS } = require('../utils/constants');

/**
 * Category Model
 * Represents service categories (e.g., Electrician, Plumber, Salon, etc.)
 */
const categorySchema = new mongoose.Schema({
  // Frontend matching fields
  title: {
    type: String,
    required: [true, 'Please provide a category title'],
    trim: true,
    index: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  // Self-reference for sub-categories. Top-level categories keep this as null
  // so getPublicCategories (which must filter parentId: null by default in
  // STEP 2) returns the same Home grid as before. The unique index on `slug`
  // means a sub-category still needs a unique slug — document owners should
  // namespace them (e.g. "womens-salon-waxing", "ac-repair-packages").
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null,
    index: true
  },
  // Display metadata for the Urban-Company-style service catalog modal.
  // All optional; a category saved before these existed reads with defaults
  // and the modal falls back to its current hard-coded CATALOG_DATA until the
  // seed script fills them.
  displayRating: {
    type: String,
    default: ''
  },
  bookingsLabel: {
    type: String,
    default: ''
  },
  etaDefaultMinutes: {
    type: Number,
    default: null,
    min: 0
  },
  // Hero banner shown at the top of the service catalog modal. When every
  // field is empty, the modal keeps its current layout with no hero.
  heroBanner: {
    tag: { type: String, default: '' },
    title: { type: String, default: '' },
    startingPrice: { type: String, default: '' },
    imageUrl: { type: String, default: '' }
  },
  // Pill-badge text for a sub-category tab (e.g. "Upto 20% OFF"). Top-level
  // categories can leave this empty.
  subCategoryBadge: {
    type: String,
    default: ''
  },
  // Whether this (top-level) category organises its services under a Brand
  // layer (e.g. appliances with LG/Samsung/Whirlpool brands) or presents
  // services flat under the category. The Phase-3 admin wizard reads this
  // to decide whether to show the Brand/Section step. Default false so new
  // categories flow straight through to services; the Phase-2 migration
  // sets this to true for every existing category that has at least one
  // Brand pointing to it, so the old appliance flow stays unchanged.
  hasBrands: {
    type: Boolean,
    default: false
  },
  // Draft/published lifecycle, independent of status. publishStatus=draft keeps
  // the row out of public listings even while status='active' (used for
  // in-progress work in the Phase-4 wizard). Default 'published' so existing
  // rows keep behaving as today.
  publishStatus: {
    type: String,
    enum: ['draft', 'published'],
    default: 'published',
    index: true
  },
  // Admin-chosen custom sort order for the admin list. Independent of
  // homeOrder (which drives the user Home grid). Default 0.
  sortOrder: {
    type: Number,
    default: 0,
    index: true
  },
  // Snapshot of the previous status before archive, so restore returns to the
  // original state (active/inactive) instead of forcing 'active'. Set by the
  // archive endpoint, cleared by restore.
  previousStatus: {
    type: String,
    default: null
  },
  homeIconUrl: {
    type: String,
    default: null
  },
  homeBadge: {
    type: String,
    default: null,
    trim: true
  },
  hasSaleBadge: {
    type: Boolean,
    default: false
  },
  showOnHome: {
    type: Boolean,
    default: true,
    index: true
  },
  homeOrder: {
    type: Number,
    default: 0,
    index: true
  },
  // Cities where this category is available
  cityIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'City',
    index: true
  }],
  // Additional backend fields
  description: {
    type: String,
    trim: true
  },
  imageUrl: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: Object.values(SERVICE_STATUS),
    default: SERVICE_STATUS.ACTIVE,
    index: true
  },
  isPopular: {
    type: Boolean,
    default: false,
    index: true
  },
  // Offers emergency booking for services in this category (when emergency
  // bookings are enabled in the booking configuration).
  isEmergencyAvailable: {
    type: Boolean,
    default: false
  },
  metaTitle: {
    type: String,
    trim: true
  },
  metaDescription: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  }
}, {
  timestamps: true
});

// Generate slug from title before validation
categorySchema.pre('validate', async function (next) {
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

// Index for faster queries
categorySchema.index({ status: 1, homeOrder: 1 });
categorySchema.index({ isPopular: 1, status: 1 });
categorySchema.index({ showOnHome: 1, homeOrder: 1 });
categorySchema.index({ parentId: 1, status: 1, homeOrder: 1 });
categorySchema.index({ parentId: 1, cityIds: 1 });

module.exports = mongoose.model('Category', categorySchema);

