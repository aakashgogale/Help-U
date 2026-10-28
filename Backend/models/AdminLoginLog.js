const mongoose = require('mongoose');

const adminLoginLogSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null,
    index: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  name: {
    type: String,
    default: 'Unknown'
  },
  role: {
    type: String,
    default: 'unknown'
  },
  ip: {
    type: String,
    default: ''
  },
  userAgent: {
    type: String,
    default: ''
  },
  device: {
    type: String,
    default: 'Desktop'
  },
  browser: {
    type: String,
    default: 'Unknown'
  },
  os: {
    type: String,
    default: 'Unknown'
  },
  status: {
    type: String,
    enum: ['success', 'failed'],
    required: true,
    index: true
  },
  failureReason: {
    type: String,
    default: ''
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

adminLoginLogSchema.index({ createdAt: -1 });
adminLoginLogSchema.index({ adminId: 1, createdAt: -1 });
adminLoginLogSchema.index({ email: 1, createdAt: -1 });

module.exports = mongoose.model('AdminLoginLog', adminLoginLogSchema);
