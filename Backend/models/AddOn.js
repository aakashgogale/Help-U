const mongoose = require('mongoose');

/**
 * AddOn Model
 *
 * An optional extra a customer can add to a booking at checkout, e.g.
 * "Extra AC unit", "Deep cleaning of filters", "Wall mounting".
 *
 * An add-on is offered on a service when that service is listed in
 * serviceIds, or the service's category is listed in categoryIds. An add-on
 * with neither list set is offered on every service (appliesToAll).
 */
const addOnSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Add-on title is required'],
    trim: true,
    maxlength: 120
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
    default: ''
  },
  // Base price excluding GST; GST is added at checkout like the service price.
  price: {
    type: Number,
    required: [true, 'Add-on price is required'],
    min: [0, 'Price cannot be negative']
  },
  imageUrl: {
    type: String,
    default: null
  },
  // Highest quantity a customer can pick. 1 makes it a simple yes/no extra.
  maxQuantity: {
    type: Number,
    default: 1,
    min: 1,
    max: 20
  },
  appliesToAll: {
    type: Boolean,
    default: false
  },
  categoryIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  serviceIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserService'
  }],
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  }
}, { timestamps: true });

addOnSchema.index({ isActive: 1, categoryIds: 1 });
addOnSchema.index({ isActive: 1, serviceIds: 1 });

/**
 * Active add-ons offered for a service, sorted for display.
 */
addOnSchema.statics.findApplicable = function ({ serviceId, categoryId }) {
  const or = [{ appliesToAll: true }];
  if (serviceId) or.push({ serviceIds: serviceId });
  if (categoryId) or.push({ categoryIds: categoryId });

  return this.find({ isActive: true, $or: or })
    .sort({ sortOrder: 1, createdAt: 1 })
    .lean();
};

module.exports = mongoose.model('AddOn', addOnSchema);
