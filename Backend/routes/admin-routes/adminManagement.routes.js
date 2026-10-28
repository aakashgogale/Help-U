const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getAllAdmins,
  getAvailablePermissions,
  createAdmin,
  deleteAdmin,
  updateAdminRole,
  updateAdmin,
  toggleAdminStatus,
  getLoginHistory,
  getAdminAuditLogs
} = require('../../controllers/adminControllers/adminManagementController');
const { ADMIN_ROLES } = require('../../utils/constants');
const { authenticate } = require('../../middleware/authMiddleware');
const { isSuperAdmin } = require('../../middleware/roleMiddleware');

// Validation rules
const createAdminValidation = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(Object.values(ADMIN_ROLES)).withMessage('Invalid role')
];

// All routes require Super Admin
router.use(authenticate, isSuperAdmin);

// Routes
router.get('/', getAllAdmins);
router.get('/permissions', getAvailablePermissions);
router.get('/login-history', getLoginHistory);
router.get('/audit-logs', getAdminAuditLogs);
router.post('/', createAdminValidation, createAdmin);
router.delete('/:id', deleteAdmin);
router.put('/:id/role', updateAdminRole);
router.put('/:id', updateAdmin);
router.patch('/:id/status', toggleAdminStatus);

module.exports = router;
