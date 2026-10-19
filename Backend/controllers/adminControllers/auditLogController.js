const mongoose = require('mongoose');
const CatalogAuditLog = require('../../models/CatalogAuditLog');

/**
 * Get catalog audit logs with filters and pagination.
 * GET /api/admin/audit-log
 * Query params: entityType, entityId, adminId, from, to, page, limit
 */
const getAuditLogs = async (req, res) => {
  try {
    const { entityType, entityId, adminId, from, to } = req.query;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));

    const query = {};

    if (entityType) {
      query.entityType = String(entityType).trim();
    }

    if (entityId) {
      if (mongoose.Types.ObjectId.isValid(entityId)) {
        query.entityId = new mongoose.Types.ObjectId(entityId);
      } else {
        query.entityId = entityId;
      }
    }

    if (adminId) {
      if (mongoose.Types.ObjectId.isValid(adminId)) {
        query.adminId = new mongoose.Types.ObjectId(adminId);
      } else {
        query.adminId = adminId;
      }
    }

    if (from || to) {
      query.createdAt = {};
      if (from) {
        const fromDate = new Date(from);
        if (!isNaN(fromDate.getTime())) {
          query.createdAt.$gte = fromDate;
        }
      }
      if (to) {
        const toDate = new Date(to);
        if (!isNaN(toDate.getTime())) {
          query.createdAt.$lte = toDate;
        }
      }
      if (Object.keys(query.createdAt).length === 0) {
        delete query.createdAt;
      }
    }

    const [items, total] = await Promise.all([
      CatalogAuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      CatalogAuditLog.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      items
    });
  } catch (error) {
    console.error('Get catalog audit logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch catalog audit logs'
    });
  }
};

module.exports = {
  getAuditLogs
};
