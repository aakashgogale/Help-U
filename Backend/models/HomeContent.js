const mongoose = require('mongoose');

/**
 * HomeContent Model
 * Manages homepage content: banners, promos, curated services, etc.
 */
const homeContentSchema = new mongoose.Schema({
  // City association - if null, considered default/fallback
  cityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'City',
    default: null,
    index: true
  },

  // Banners (main homepage banners)
  banners: [{
    imageUrl: {
      type: String,
      default: ''
    },
    text: {
      type: String,
      default: ''
    },
    targetCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null
    },
    slug: {
      type: String,
      default: ''
    },
    targetServiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserService',
      default: null
    },
    scrollToSection: {
      type: String,
      default: ''
    },
    order: {
      type: Number,
      default: 0
    },
    zoneId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Zone',
      default: null
    },
    zones: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Zone'
    }]
  }],

  // Promo Carousel
  promos: [{
    title: {
      type: String,
      required: false,
      default: ''
    },
    subtitle: {
      type: String,
      default: ''
    },
    buttonText: {
      type: String,
      default: 'Explore'
    },
    gradientClass: {
      type: String,
      default: 'from-blue-600 to-blue-800'
    },
    imageUrl: {
      type: String,
      default: ''
    },
    targetCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null
    },
    slug: {
      type: String,
      default: ''
    },
    targetServiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserService',
      default: null
    },
    scrollToSection: {
      type: String,
      default: ''
    },
    order: {
      type: Number,
      default: 0
    },
    zoneId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Zone',
      default: null
    },
    zones: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Zone'
    }]
  }],

  // Curated Services
  curated: [{
    title: {
      type: String,
      required: false,
      default: ''
    },
    gifUrl: {
      type: String,
      default: ''
    },
    youtubeUrl: {
      type: String,
      default: ''
    },
    order: {
      type: Number,
      default: 0
    }
  }],

  // New & Noteworthy
  noteworthy: [{
    title: {
      type: String,
      required: false,
      default: ''
    },
    subtitle: {
      type: String,
      default: ''
    },
    badge: {
      type: String,
      default: ''
    },
    rating: {
      type: String,
      default: ''
    },
    reviews: {
      type: String,
      default: ''
    },
    price: {
      type: String,
      default: ''
    },
    originalPrice: {
      type: String,
      default: ''
    },
    discount: {
      type: String,
      default: ''
    },
    duration: {
      type: String,
      default: ''
    },
    imageUrl: {
      type: String,
      default: ''
    },
    targetCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null
    },
    slug: {
      type: String,
      default: ''
    },
    targetServiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserService',
      default: null
    },
    order: {
      type: Number,
      default: 0
    }
  }],

  // Most Booked Services
  booked: [{
    title: {
      type: String,
      required: false,
      default: ''
    },
    rating: {
      type: String,
      default: ''
    },
    reviews: {
      type: String,
      default: ''
    },
    price: {
      type: String,
      default: ''
    },
    originalPrice: {
      type: String,
      default: ''
    },
    discount: {
      type: String,
      default: ''
    },
    imageUrl: {
      type: String,
      default: ''
    },
    targetCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null
    },
    slug: {
      type: String,
      default: ''
    },
    targetServiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserService',
      default: null
    },
    order: {
      type: Number,
      default: 0
    }
  }],

  // Category Sections
  categorySections: [{
    title: {
      type: String,
      required: true
    },
    subtitle: {
      type: String,
      default: ''
    },
    seeAllTargetCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null
    },
    seeAllSlug: {
      type: String,
      default: ''
    },
    seeAllTargetServiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserService',
      default: null
    },
    cards: [{
      title: String,
      imageUrl: String,
      badge: String,
      price: String,
      originalPrice: String,
      discount: String,
      rating: String,
      reviews: String,
      // Number of service variants behind the card; more than 1 shows "Starts at" + "N options"
      optionsCount: String,
      targetCategoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        default: null
      },
      slug: {
        type: String,
        default: ''
      },
      targetServiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserService',
        default: null
      }
    }],
    order: {
      type: Number,
      default: 0
    }
  }],

  // In the Spotlight carousel (Urban-Company-style hero banners)
  spotlight: [{
    badge: { type: String, default: '' },               // e.g. "New launch"
    title: { type: String, default: '' },               // e.g. "Japanese glow rituals"
    subtitle: { type: String, default: '' },            // e.g. "Starting"
    startingPrice: { type: String, default: '' },       // e.g. "1,399"
    buttonText: { type: String, default: 'Book now' },
    imageUrl: { type: String, default: '' },            // right-side portrait
    backgroundColor: { type: String, default: '#B4C2A8' }, // card bg
    textColor: { type: String, default: '#1A1A1A' },
    badgeColor: { type: String, default: '#7A2149' },
    targetCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    slug: { type: String, default: '' },
    targetServiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserService', default: null },
    order: { type: Number, default: 0 },
    zoneId: { type: mongoose.Schema.Types.ObjectId, ref: 'Zone', default: null },
    zones: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Zone' }]
  }],

  // Status
  isActive: {
    type: Boolean,
    default: true
  },

  // Section Visibility
  isBannersVisible: { type: Boolean, default: true },
  isPromosVisible: { type: Boolean, default: true },
  isCuratedVisible: { type: Boolean, default: true },
  isNoteworthyVisible: { type: Boolean, default: true },
  isBookedVisible: { type: Boolean, default: true },
  isCategorySectionsVisible: { type: Boolean, default: true },
  isCategoriesVisible: { type: Boolean, default: true },
  // Home category grid: how many top-level categories to show before "All services"
  homeCategoryLimit: { type: Number, default: 8, min: 1, max: 24 },
  showAllServicesTile: { type: Boolean, default: true },
  allServicesLabel: { type: String, default: 'All services', trim: true, maxlength: 30 },
  isScrapVisible: { type: Boolean, default: true },
  isSpotlightVisible: { type: Boolean, default: true }
}, {
  timestamps: true
});

// Ensure only one home content document exists per city
homeContentSchema.statics.getHomeContent = async function (cityId = null) {
  let query = { cityId: null };

  if (cityId) {
    query = { cityId };
  }

  let homeContent = await this.findOne(query);

  // A city that has no copy yet starts as a copy of the default one, so its customers never see a
  // blank home page. (Admin saves are applied to every copy, so they stay in step afterwards.)
  if (!homeContent && cityId) {
    const base = await this.findOne({ cityId: null });
    const seed = base ? base.toObject() : {};
    delete seed._id;
    delete seed.createdAt;
    delete seed.updatedAt;
    delete seed.__v;
    homeContent = await this.create({ ...seed, cityId });
  } else if (!homeContent && !cityId) {
    // Create default if it doesn't exist
    homeContent = await this.create({ cityId: null });
  }

  return homeContent;
};

module.exports = mongoose.model('HomeContent', homeContentSchema);

