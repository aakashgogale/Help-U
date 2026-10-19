/**
 * Audit-log helper. Fire-and-forget: a failure to persist the audit entry
 * never surfaces to the admin or fails the underlying write. Any error is
 * logged and swallowed.
 *
 * Keeps the primary write path dependency-light: callers pass plain data
 * and move on; the model lookup happens inside this helper so the admin
 * controllers do not grow another require().
 */

const log = (...args) => console.log('[AuditLog]', ...args);

/**
 * Strip Mongoose metadata and return a plain, JSON-serialisable snapshot of
 * a document. Caller passes either a Mongoose doc (`.toObject()` honoured)
 * or an already-lean plain object. Returns null on falsy input so the stored
 * before/after is explicit.
 */
const snapshot = (doc) => {
  if (!doc) return null;
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  // Drop fields that are either noisy or security-sensitive from the diff.
  delete plain.__v;
  return plain;
};

/**
 * Write one audit entry. Never throws.
 *
 * @param {Object}   p
 * @param {String}   p.adminId      Admin ObjectId (req.user.id in controllers)
 * @param {String}   p.action       Verb: 'create'|'update'|'delete'|'archive'|'restore'|'duplicate'|'move'|'bulk-status'|'bulk-reorder'
 * @param {String}   p.entityType   'category'|'brand'|'service'|'variant'
 * @param {String}   p.entityId     Primary id of the touched row (for bulk ops, pass the ANCHOR id or omit)
 * @param {Object=}  p.before       Pre-change snapshot (null on create / bulk)
 * @param {Object=}  p.after        Post-change snapshot (null on delete)
 * @param {String=}  p.note         Short free-text (e.g. 'bulk status->inactive, 7 ids')
 */
const writeAudit = async ({ adminId, action, entityType, entityId, before, after, note }) => {
  if (!adminId || !action || !entityType || !entityId) return;
  try {
    // Lazy require so a boot-time crash in the model doesn't take down any
    // controller that imports this helper at the top.
    const CatalogAuditLog = require('../models/CatalogAuditLog');
    await CatalogAuditLog.create({
      adminId,
      action,
      entityType,
      entityId,
      before: snapshot(before),
      after: snapshot(after),
      note: note || ''
    });
  } catch (err) {
    log('write failed (ignored):', err.message);
  }
};

module.exports = {
  snapshot,
  writeAudit
};
