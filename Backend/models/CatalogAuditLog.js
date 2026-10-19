const mongoose = require('mongoose');

/**
 * CatalogAuditLog
 *
 * Append-only record of every admin-side write to the catalog (Category,
 * Brand, UserService). Captures the before/after diff so an admin can see
 * who archived a service, who moved it to a different category, who edited
 * variant prices, etc.
 *
 * Writes are fire-and-forget: a failure to audit never fails the primary
 * write. The helper in utils/auditLog.js enforces that invariant.
 *
 * Indexes are additive, chosen for the admin dashboard queries:
 *   - (entityType, entityId, createdAt desc)  per-entity history
 *   - (createdAt desc)                        global timeline
 *   - (adminId, createdAt desc)               per-admin activity
 */
const catalogAuditLogSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
    index: true
  },
  action: {
    // Free-text so new verbs can be added without a migration. Known values:
    // create, update, delete, archive, restore, duplicate, move, bulk-status,
    // bulk-reorder.
    type: String,
    required: true
  },
  entityType: {
    type: String,
    enum: ['category', 'brand', 'service', 'variant'],
    required: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  // Pre-change snapshot; omitted on 'create'. Stored lean (plain object) so
  // the row is independent of future schema changes.
  before: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  // Post-change snapshot; omitted on 'delete'.
  after: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  // Short, admin-authored or helper-generated note (e.g. "bulk-status->inactive, 7 ids").
  note: {
    type: String,
    default: ''
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

catalogAuditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
catalogAuditLogSchema.index({ createdAt: -1 });
catalogAuditLogSchema.index({ adminId: 1, createdAt: -1 });

module.exports = mongoose.model('CatalogAuditLog', catalogAuditLogSchema);
