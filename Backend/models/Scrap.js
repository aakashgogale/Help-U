const mongoose = require('mongoose');

const scrapSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    trim: true,
    default: 'General'
  },
  quantity: {
    type: String,
    trim: true,
    default: '1'
  },
  expectedPrice: {
    type: Number,
    default: 0
  },
  // What the customer is selling, when it was picked from the scrap types. The rate is copied
  // at request time so a later rate change never alters an existing request. Requests made
  // before scrap types existed have no items and just use title/description.
  items: [new mongoose.Schema({
    scrapTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'ScrapType' },
    name: { type: String, required: true },
    group: { type: String, default: '' },
    pricingMode: { type: String, enum: ['per_unit', 'quote'], default: 'per_unit' },
    unit: { type: String, enum: ['kg', 'piece'], default: 'kg' },
    rate: { type: Number, default: 0 },          // rate per unit when the request was made
    quantity: { type: Number, default: 0 },      // the customer's estimate
    estimatedAmount: { type: Number, default: 0 },
    details: {
      type: [new mongoose.Schema({
        key: { type: String, required: true },
        label: { type: String, default: '' },
        value: { type: String, default: '' }
      }, { _id: false })],
      default: []
    }
  }, { _id: true })],
  // Sum of the priced items; quote items add nothing until the admin quotes
  estimatedTotal: { type: Number, default: 0 },
  hasQuoteItems: { type: Boolean, default: false },
  preferredDate: { type: Date, default: null },
  preferredSlot: { type: String, trim: true, default: '' },
  images: [{
    type: String
  }],
  address: {
    addressLine1: String,
    city: String,
    state: String,
    pincode: String,
    lat: Number,
    lng: Number
  },
  status: {
    type: String,
    enum: ['pending', 'offered', 'accepted', 'completed', 'cancelled', 'rejected'],
    default: 'pending',
    index: true
  },
  offeredPrice: {
    type: Number,
    default: null
  },
  adminNote: {
    type: String,
    default: ''
  },
  offeredAt: {
    type: Date,
    default: null
  },
  userResponseDate: {
    type: Date,
    default: null
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker',
    default: null
  },
  pickupDate: {
    type: Date
  },
  finalPrice: {
    type: Number,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Scrap', scrapSchema);
