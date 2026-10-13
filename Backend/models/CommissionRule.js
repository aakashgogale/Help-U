const mongoose = require('mongoose');

/**
 * CommissionRule Model
 *
 * Overrides the global commission (Settings) for a category, a worker, or a
 * worker within one category. When a bill is generated the most specific
 * active rule wins:
 *
 *   worker_category  >  worker  >  category  >  global default
 *
 * commissionType 'percentage': the platform keeps commissionValue % of the
 * service amount (excluding GST). 'fixed': the platform keeps commissionValue
 * rupees per booking from the service amount.
 *
 * partsPayoutPercentage optionally overrides the worker's share of parts; null
 * means "use the global setting".
 */
const commissionRuleSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    maxlength: 120,
    default: ''
  },
  scope: {
    type: String,
    enum: ['category', 'worker', 'worker_category'],
    required: true
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker',
    default: null
  },
  commissionType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true
  },
  commissionValue: {
    type: Number,
    required: true,
    min: 0
  },
  partsPayoutPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 500,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  }
}, { timestamps: true });

commissionRuleSchema.index({ scope: 1, categoryId: 1, workerId: 1, isActive: 1 });

commissionRuleSchema.pre('validate', function (next) {
  if (['category', 'worker_category'].includes(this.scope) && !this.categoryId) {
    return next(new Error('A category is required for this rule'));
  }
  if (['worker', 'worker_category'].includes(this.scope) && !this.workerId) {
    return next(new Error('A worker is required for this rule'));
  }
  if (this.scope === 'category') this.workerId = null;
  if (this.scope === 'worker') this.categoryId = null;
  if (this.commissionType === 'percentage' && this.commissionValue > 100) {
    return next(new Error('A percentage commission cannot exceed 100'));
  }
  next();
});

module.exports = mongoose.model('CommissionRule', commissionRuleSchema);
