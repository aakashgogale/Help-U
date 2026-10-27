const mongoose = require('mongoose');

/**
 * PartnerLead Model
 * Stores partner registrations and onboarding leads submitted through the landing page.
 */
const partnerLeadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true
    },
    email: {
      type: String,
      trim: true,
      default: ''
    },
    trade: {
      type: String,
      required: [true, 'Primary trade or skill is required'],
      trim: true
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true
    },
    experience: {
      type: String,
      trim: true,
      default: '1-3 years'
    },
    message: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: ['new', 'contacted', 'onboarded', 'rejected'],
      default: 'new',
      index: true
    },
    adminNotes: {
      type: String,
      default: ''
    },
    contactedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

partnerLeadSchema.index({ createdAt: -1 });

module.exports = mongoose.model('PartnerLead', partnerLeadSchema);
