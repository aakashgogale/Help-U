const mongoose = require('mongoose');

/**
 * One row per admin data export (customers or professionals as Excel or PDF).
 * Bulk personal data leaves the system with every export, so who took it, when, with which filters
 * and how many rows is always recorded. Only the file's metadata is stored, never the data itself.
 */
const dataExportLogSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true, index: true },
  adminName: { type: String, default: '' },
  adminEmail: { type: String, default: '' },
  entityType: { type: String, enum: ['users', 'workers'], required: true },
  format: { type: String, enum: ['xlsx', 'pdf'], required: true },
  filters: { type: mongoose.Schema.Types.Mixed, default: {} },
  rowCount: { type: Number, default: 0 },
  totalMatching: { type: Number, default: 0 },
  truncated: { type: Boolean, default: false },
  status: { type: String, enum: ['completed', 'failed'], default: 'completed' },
  error: { type: String, default: '' },
  ip: { type: String, default: '' },
  userAgent: { type: String, default: '' }
}, { timestamps: true });

dataExportLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('DataExportLog', dataExportLogSchema);
