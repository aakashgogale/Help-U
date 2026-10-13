const mongoose = require('mongoose');

/**
 * Area Model
 * Hierarchy: Country -> State -> City -> Area -> Pincode
 * Manages service availability at locality and pincode levels.
 */
const areaSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide an area / locality name'],
    trim: true,
    index: true
  },
  cityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'City',
    required: [true, 'City ID is required'],
    index: true
  },
  pincode: {
    type: String,
    required: [true, 'Pincode is required'],
    trim: true,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  serviceAvailable: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true
});

areaSchema.index({ cityId: 1, pincode: 1 });
areaSchema.index({ pincode: 1, isActive: 1, serviceAvailable: 1 });

module.exports = mongoose.model('Area', areaSchema);
