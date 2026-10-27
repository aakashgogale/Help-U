const mongoose = require('mongoose');
const { detailFieldSchema } = require('../utils/detailFields');

/**
 * A kind of scrap customers can sell (Iron, Aluminium, Old AC...), managed by the admin.
 *   per_unit  priced by a posted rate: ratePerUnit x quantity (per kg or per piece)
 *   quote     no fixed rate; the admin quotes a price after looking at the item (appliances)
 * `detailFields` are the questions the customer answers for this type (same shape as the
 * per-category booking details), e.g. "Clean or mixed?" for metal or "Brand" for an AC.
 */
const scrapTypeSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
  // Heading the type is listed under in the app, e.g. "Metals"
  group: { type: String, trim: true, default: 'Other', maxlength: 60 },
  image: { type: String, default: '' },
  info: { type: String, trim: true, default: '', maxlength: 500 }, // what is accepted / not accepted

  pricingMode: { type: String, enum: ['per_unit', 'quote'], default: 'per_unit' },
  unit: { type: String, enum: ['kg', 'piece'], default: 'kg' },
  ratePerUnit: { type: Number, default: 0, min: 0 },
  minQuantity: { type: Number, default: 1, min: 0 },
  rateUpdatedAt: { type: Date, default: null },

  detailFields: { type: [detailFieldSchema], default: [] },
  requiresPhoto: { type: Boolean, default: false },

  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 }
}, { timestamps: true });

scrapTypeSchema.index({ isActive: 1, group: 1, order: 1 });

module.exports = mongoose.model('ScrapType', scrapTypeSchema);
