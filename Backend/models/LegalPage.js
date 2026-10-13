const mongoose = require('mongoose');

/**
 * LegalPage Model
 *
 * Admin-editable static pages: Terms & Conditions, Privacy Policy, and a
 * site-wide FAQ. Kept as a small fixed set of slugs (not a free-form CMS
 * page builder) because these are the only such pages the apps need —
 * everything else content-related already has its own model (HomeContent for
 * the homepage, UserService for per-service FAQs/policies).
 *
 * content is stored as HTML, written by the admin rich-text editor and
 * rendered as-is (sanitized server-side) in the user/worker apps.
 */
const SLUGS = ['terms-and-conditions', 'privacy-policy', 'faq'];

const faqItemSchema = new mongoose.Schema({
  question: { type: String, trim: true, required: true },
  answer: { type: String, trim: true, required: true },
  order: { type: Number, default: 0 }
}, { _id: true });

const legalPageSchema = new mongoose.Schema({
  slug: {
    type: String,
    required: true,
    unique: true,
    enum: SLUGS,
    index: true
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  // HTML body for Terms/Privacy. Unused (empty) for the FAQ page, which uses
  // `faqs` instead so the apps can render it as an accordion rather than a
  // single text wall.
  content: {
    type: String,
    default: ''
  },
  faqs: {
    type: [faqItemSchema],
    default: []
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  }
}, { timestamps: true });

legalPageSchema.statics.SLUGS = SLUGS;

module.exports = mongoose.model('LegalPage', legalPageSchema);
