const mongoose = require('mongoose');

const adminAuditLogSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
    index: true
  },
  adminName: {
    type: String,
    default: 'Admin'
  },
  adminEmail: {
    type: String,
    default: ''
  },
  adminRole: {
    type: String,
    default: 'admin'
  },
  module: {
    type: String,
    required: true,
    enum: ['admin_management', 'settings', 'financial', 'system', 'catalog', 'auth', 'other'],
    index: true
  },
  action: {
    type: String,
    required: true, // 'create', 'update', 'delete', 'block', 'unblock', 'role_change', etc.
    index: true
  },
  entityType: {
    type: String,
    default: ''
  },
  entityId: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  description: {
    type: String,
    required: true
  },
  before: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  after: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  ip: {
    type: String,
    default: ''
  },
  userAgent: {
    type: String,
    default: ''
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

adminAuditLogSchema.index({ createdAt: -1 });
adminAuditLogSchema.index({ module: 1, createdAt: -1 });
adminAuditLogSchema.index({ adminId: 1, createdAt: -1 });

module.exports = mongoose.model('AdminAuditLog', adminAuditLogSchema);
