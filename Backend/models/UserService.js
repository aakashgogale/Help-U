const mongoose = require('mongoose');
const { SERVICE_STATUS } = require('../utils/constants');

/**
 * User Service Model
 * Represents individual services strictly under a Brand
 * separate from internal services or global services
 */
const userServiceSchema = new mongoose.Schema({
  brandId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand',
    required: [true, 'Please provide a brand ID'],
    index: true
  },
  // Added based on user request "category -> brand -> service", 
  // ensuring we can link if needed, though brand already links to category.
  // Making it optional for now to avoid breaking existing flows if not sent.
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    index: true
  },
  // Cities where this service is available (inherits from category if blank)
  cityIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'City',
    index: true
  }],
  title: {
    type: String,
    required: [true, 'Please provide a service title'],
    trim: true,
    index: true
  },
  // Removed slug as it is not needed for internal modal-based services
  iconUrl: {
    type: String,
    default: null
  },
  basePrice: {
    type: Number,
    required: [true, 'Base price is required'],
    min: [0, 'Price cannot be negative']
  },
  // ==========================================
  // PRICING MODEL
  // Controls how basePrice is shown and charged at checkout:
  //   fixed           — basePrice is the final service price.
  //   hourly          — basePrice is charged per hour; checkout multiplies by
  //                      the hours the customer selects (1..maxHours).
  //   starting_from   — basePrice is shown as "Starting from ₹X"; the actual
  //                      bill (often higher) is set by the worker at
  //                      completion, same as today's worker-added services.
  //   inspection_fee  — the customer pays only inspectionFee to book; the
  //                      worker inspects on site and raises the real quote
  //                      via the advance-payment/billing flow.
  //   quote_required   — no online payment at booking; the service is hidden
  //                      from the price-sorted catalog and must be inquired
  //                      about (quoteContactNote shown instead of an Add button).
  // ==========================================
  pricingType: {
    type: String,
    enum: ['fixed', 'hourly', 'starting_from', 'inspection_fee', 'quote_required'],
    default: 'fixed',
    index: true
  },
  // hourly only: rupees per hour (basePrice doubles as the 1-hour price when
  // this is unset, for backward compatibility with services saved before
  // pricing types existed).
  hourlyRate: {
    type: Number,
    min: 0,
    default: null
  },
  minHours: {
    type: Number,
    min: 1,
    default: 1
  },
  maxHours: {
    type: Number,
    min: 1,
    default: 8
  },
  // inspection_fee only: amount charged to book the visit itself.
  inspectionFee: {
    type: Number,
    min: 0,
    default: null
  },
  // quote_required only: shown on the service card instead of a price/Add
  // button, e.g. "Call us for a custom quote".
  quoteContactNote: {
    type: String,
    trim: true,
    default: ''
  },
  gstPercentage: {
    type: Number,
    required: [true, 'GST percentage is required'],
    min: 0,
    default: 18
  },
  status: {
    type: String,
    enum: Object.values(SERVICE_STATUS),
    default: SERVICE_STATUS.ACTIVE,
    index: true
  },
  description: {
    type: String,
    trim: true
  },

  // ==========================================
  // SERVICE DETAIL CONTENT
  // All optional. A service saved before these existed simply has empty
  // values, and the detail page hides any section that has no content.
  // ==========================================

  // Free text, e.g. "30 days on labour, 6 months on parts".
  warranty: {
    type: String,
    trim: true,
    default: ''
  },

  cancellationPolicy: {
    type: String,
    trim: true,
    default: ''
  },

  // What the price covers.
  inclusions: {
    type: [String],
    default: []
  },

  // What it does not cover, so the customer is not surprised on site.
  exclusions: {
    type: [String],
    default: []
  },

  faqs: {
    type: [
      {
        question: { type: String, trim: true, required: true },
        answer: { type: String, trim: true, required: true }
      }
    ],
    default: []
  },

  // Draft/published lifecycle (Phase-2b). publishStatus=draft keeps the row
  // out of public listings even while status='active'. Default 'published'
  // so existing rows keep behaving as today.
  publishStatus: {
    type: String,
    enum: ['draft', 'published'],
    default: 'published',
    index: true
  },
  // Admin-chosen custom sort order within a brand/section. Independent of
  // Brand.displayOrder. Default 0.
  sortOrder: {
    type: Number,
    default: 0,
    index: true
  },
  // Snapshot of the previous status before archive, so restore returns to the
  // original state. Set by the archive endpoint, cleared by restore.
  previousStatus: {
    type: String,
    default: null
  },

  // ==========================================
  // DISPLAY (Urban-Company-style catalog)
  // All optional. Omitting them falls back to current behaviour: the modal
  // keeps using basePrice, the single iconUrl and no struck-through price.
  // ==========================================
  originalPrice: {
    type: Number,
    min: 0,
    default: null
  },
  discountLabel: {
    type: String,
    default: ''
  },
  durationMinutes: {
    type: Number,
    min: 0,
    default: null
  },
  displayRating: {
    type: String,
    default: ''
  },
  reviewsLabel: {
    type: String,
    default: ''
  },
  isPackage: {
    type: Boolean,
    default: false
  },
  // Additional gallery images beyond the single `iconUrl`. The catalog modal
  // prefers images[0] when present and falls back to iconUrl.
  images: {
    type: [String],
    default: []
  },

  // Rating & Reviews
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalReviews: {
    type: Number,
    default: 0
  },

  // ==========================================
  // VARIANTS / PACKAGES (approved sub-document approach)
  // Services without variants keep working: an empty array means pricing
  // follows basePrice/pricingType above. Each variant's pricingType enum is
  // intentionally identical to the parent service's pricingType enum so a
  // variant can be fixed, hourly, starting_from, inspection_fee or
  // quote_required. If this parent enum ever changes, update it here too.
  // ==========================================
  variants: {
    type: [
      new mongoose.Schema({
        title: { type: String, trim: true, required: true },
        price: { type: Number, min: 0, required: true },
        originalPrice: { type: Number, min: 0, default: null },
        durationMinutes: { type: Number, min: 0, default: null },
        pricingType: {
          type: String,
          enum: ['fixed', 'hourly', 'starting_from', 'inspection_fee', 'quote_required'],
          default: 'fixed'
        },
        inclusions: { type: [String], default: [] },
        imageUrl: { type: String, default: '' },
        isActive: { type: Boolean, default: true },
        order: { type: Number, default: 0 }
      }, { _id: true, timestamps: false })
    ],
    default: []
  }
}, {
  timestamps: true
});

// Compound index to ensure slug is unique PER BRAND
// Index for faster queries
userServiceSchema.index({ brandId: 1, categoryId: 1 });

module.exports = mongoose.model('UserService', userServiceSchema);
