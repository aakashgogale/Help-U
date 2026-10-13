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
  }
}, {
  timestamps: true
});

// Compound index to ensure slug is unique PER BRAND
// Index for faster queries
userServiceSchema.index({ brandId: 1, categoryId: 1 });

module.exports = mongoose.model('UserService', userServiceSchema);
