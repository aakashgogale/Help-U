const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    sparse: true // Allows multiple null values
  },
  phone: {
    type: String,
    required: [true, 'Please provide a phone number'],
    unique: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  password: {
    type: String,
    select: false
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  profilePhoto: {
    type: String,
    default: null
  },
  // ENFORCED POLICY: Only 1 address allowed. If user changes it, we replace.
  addresses: [{
    type: {
      type: String, // home, work, other
      default: 'home'
    },
    addressLine1: String,
    addressLine2: String,
    city: String,
    state: String,
    pincode: String,
    landmark: String,
    isDefault: {
      type: Boolean,
      default: false
    }
  }],
  wallet: {
    balance: {
      type: Number,
      default: 0
    },
    penalty: {
      type: Number,
      default: 0
    },
    promoBalance: {
      type: Number,
      default: 0
    },
    cashbackBalance: {
      type: Number,
      default: 0
    }
  },

  // ==========================================
  // CUSTOMER REFERRAL PROGRAMME
  // ==========================================

  // Sparse so the unique index tolerates existing users who have no code yet;
  // one is generated for them on their next save.
  referralCode: {
    type: String,
    unique: true,
    sparse: true,
    uppercase: true,
    trim: true,
    index: true
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  referralEarnings: {
    type: Number,
    default: 0
  },
  plans: {
    isActive: {
      type: Boolean,
      default: false
    },
    name: {
      type: String,
      default: null
    },
    expiry: {
      type: Date,
      default: null
    },
    price: {
      type: Number,
      default: 0
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Settings
  settings: {
    notifications: {
      type: Boolean,
      default: true
    },
    language: {
      type: String,
      default: 'en'
    }
  },
  // Statistics
  totalBookings: {
    type: Number,
    default: 0
  },
  completedBookings: {
    type: Number,
    default: 0
  },
  cancelledBookings: {
    type: Number,
    default: 0
  },

  // FCM Push Notification Tokens
  fcmTokens: {
    type: [String],
    default: []
  },
  fcmTokenMobile: {
    type: [String],
    default: []
  },
  loginSessionId: {
    type: String,
    default: null
  }

}, {
  timestamps: true
});

// Helper to generate a random referral code.
// The prefix differs from the worker code prefix (HOMV) so a customer code can
// never be mistaken for a worker code when one is entered at signup.
const generateReferralCode = () => {
  // Ambiguous characters (0/O, 1/I) are excluded so codes survive being read
  // aloud or retyped from a screenshot.
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'HU';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Hash password before saving
userSchema.pre('save', async function (next) {
  // Generate referral code if missing. Existing users get one the next time
  // their document is saved.
  if (!this.referralCode) {
    this.referralCode = generateReferralCode();
  }

  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);

