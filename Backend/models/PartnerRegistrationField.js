const mongoose = require('mongoose');

const partnerRegistrationFieldSchema = new mongoose.Schema({
  fieldKey: {
    type: String,
    required: [true, 'Field key is required'],
    unique: true,
    trim: true,
    lowercase: true
  },
  label: {
    type: String,
    required: [true, 'Field label is required'],
    trim: true
  },
  type: {
    type: String,
    enum: ['text', 'number', 'textarea', 'select', 'document'],
    required: [true, 'Field type is required'],
    default: 'text'
  },
  section: {
    type: String,
    enum: ['profile', 'documents'],
    required: true,
    default: function () {
      return this.type === 'document' ? 'documents' : 'profile';
    }
  },
  placeholder: {
    type: String,
    trim: true,
    default: ''
  },
  helpText: {
    type: String,
    trim: true,
    default: ''
  },
  options: {
    type: [String],
    default: []
  },
  isRequired: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  },
  isSystemDefault: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Compound index for fast active queries
partnerRegistrationFieldSchema.index({ isActive: 1, section: 1, order: 1 });

module.exports = mongoose.model('PartnerRegistrationField', partnerRegistrationFieldSchema);
