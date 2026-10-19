const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { isAdmin } = require('../../middleware/roleMiddleware');
const { getAuditLogs } = require('../../controllers/adminControllers/auditLogController');

// GET /api/admin/audit-log
router.get('/audit-log', authenticate, isAdmin, getAuditLogs);

module.exports = router;
