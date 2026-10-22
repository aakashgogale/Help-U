const mongoose = require('mongoose');

const zoneSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Zone name is required'],
    trim: true,
    index: true
  },
  cityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'City',
    required: [true, 'City is required'],
    index: true
  },
  coordinates: {
    type: {
      type: String,
      enum: ['Polygon'],
      required: true,
      default: 'Polygon'
    },
    coordinates: {
      type: [[[Number]]],
      required: true,
      validate: {
        validator: function (coords) {
          if (!coords || !coords[0] || coords[0].length < 4) return false;
          const ring = coords[0];
          const first = ring[0];
          const last = ring[ring.length - 1];
          return first[0] === last[0] && first[1] === last[1];
        },
        message: 'Polygon must have at least 3 vertices and be a closed ring'
      }
    }
  },
  allowedCategories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    index: true
  }],
  surgePricing: {
    enabled: { type: Boolean, default: false },
    multiplier: { type: Number, default: 1, min: 1, max: 10 }
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  }
}, {
  timestamps: true
});

zoneSchema.index({ coordinates: '2dsphere' });
zoneSchema.index({ cityId: 1, status: 1 });

zoneSchema.statics.findZoneByCoordinates = async function (lng, lat, cityId = null) {
  const query = {
    status: 'active',
    coordinates: {
      $geoIntersects: {
        $geometry: { type: 'Point', coordinates: [lng, lat] }
      }
    }
  };
  if (cityId) query.cityId = cityId;
  return this.findOne(query)
    .populate('cityId', 'name slug')
    .populate('allowedCategories', 'title slug icon')
    .lean();
};

module.exports = mongoose.model('Zone', zoneSchema);
