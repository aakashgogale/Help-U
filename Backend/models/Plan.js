const mongoose = require('mongoose');

const PlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Plan name is required'],
    trim: true
  },
  tagline: {
    type: String,
    default: '',
    trim: true
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'Plan price is required'],
    min: [0, 'Price cannot be negative']
  },
  validityMonths: {
    type: Number,
    default: 1,
    min: [1, 'Validity must be at least 1 month']
  },
  validityDays: {
    type: Number,
    default: 30
  },
  duration: {
    type: String,
    default: '1 Month',
    trim: true
  },
  highlights: [{
    type: String,
    trim: true
  }],
  freeCategories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  freeServices: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserService'
  }],
  bonusServices: [{
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category'
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserService'
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isPopular: {
    type: Boolean,
    default: false
  },
  sortOrder: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// Virtual or pre-save to guarantee validityDays and duration consistency
PlanSchema.pre('save', function (next) {
  if (this.validityMonths && (!this.validityDays || this.isModified('validityMonths'))) {
    this.validityDays = this.validityMonths * 30;
  }
  if (!this.duration || this.duration.trim() === '') {
    this.duration = `${this.validityMonths || 1} ${this.validityMonths === 1 ? 'Month' : 'Months'}`;
  }
  next();
});

module.exports = mongoose.model('Plan', PlanSchema);

