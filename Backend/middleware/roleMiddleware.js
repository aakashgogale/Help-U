const { USER_ROLES, ADMIN_ROLES, ADMIN_PERMISSIONS } = require('../utils/constants');

/**
 * Role-based authorization middleware
 */
const isUser = (req, res, next) => {
  if (req.userRole !== USER_ROLES.USER) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. User role required.'
    });
  }
  next();
};

const isWorker = (req, res, next) => {
  if (req.userRole !== USER_ROLES.WORKER) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Worker role required.'
    });
  }
  next();
};

// Accepts the generic ADMIN role as well as any specific admin role, so a
// scoped role such as finance_manager still reaches the panel. What that role
// may actually do is then narrowed per route by requirePermission().
const ADMIN_ROLE_VALUES = new Set([
  USER_ROLES.ADMIN,
  'ADMIN',
  ...Object.values(ADMIN_ROLES)
]);

const isAdmin = (req, res, next) => {
  if (!ADMIN_ROLE_VALUES.has(req.userRole)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin role required.'
    });
  }
  next();
};

const isAdminOrWorker = (req, res, next) => {
  if (req.userRole !== USER_ROLES.ADMIN && req.userRole !== 'super_admin' && req.userRole !== USER_ROLES.WORKER) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin or Worker role required.'
    });
  }
  next();
};

/**
 * Super Admin only middleware
 * Checks if admin user has super_admin role in database
 */
const isSuperAdmin = async (req, res, next) => {
  try {
    const admin = await loadAdmin(req);

    if (!admin || admin.role !== ADMIN_ROLES.SUPER_ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Super Admin role required.'
      });
    }

    next();
  } catch (error) {
    console.error('Super admin check error:', error);
    res.status(500).json({ success: false, message: 'Authorization check failed' });
  }
};

/**
 * Loads the signed-in admin, caching it on the request so a route using several
 * role middlewares only hits the database once.
 */
const loadAdmin = async (req) => {
  if (req._admin !== undefined) return req._admin;

  const Admin = require('../models/Admin');
  req._admin = await Admin.findById(req.user?.id).select('role permissions isActive cityId').lean();
  return req._admin;
};

/**
 * Restricts a route to admins whose role or custom permissions grant the given permission.
 *
 * super_admin passes everything.
 * Custom permissions assigned to sub-admin/admin are checked first.
 * Then ADMIN_PERMISSIONS for the role are checked.
 *
 *   router.get('/settlements', authenticate, isAdmin, requirePermission('settlements'), handler)
 */
const requirePermission = (permission) => async (req, res, next) => {
  try {
    const admin = await loadAdmin(req);

    if (!admin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin account not found.'
      });
    }

    if (admin.isActive === false) {
      return res.status(403).json({
        success: false,
        message: 'This admin account has been deactivated.'
      });
    }

    if (admin.role === ADMIN_ROLES.SUPER_ADMIN) return next();

    // Check custom granular permissions assigned to this admin/sub-admin
    if (Array.isArray(admin.permissions)) {
      const pAlt1 = permission.replace(/_/g, '-');
      const pAlt2 = permission.replace(/-/g, '_');
      if (admin.permissions.includes('*') || admin.permissions.includes(permission) || admin.permissions.includes(pAlt1) || admin.permissions.includes(pAlt2)) {
        return next();
      }
    }

    const granted = ADMIN_PERMISSIONS[admin.role] || [];
    if (granted.includes('*') || granted.includes(permission) || granted.includes(permission.replace(/_/g, '-')) || granted.includes(permission.replace(/-/g, '_'))) return next();

    return res.status(403).json({
      success: false,
      code: 'PERMISSION_DENIED',
      message: `Access denied. This action requires the "${permission}" permission.`
    });
  } catch (error) {
    console.error('Permission check error:', error);
    res.status(500).json({ success: false, message: 'Authorization check failed' });
  }
};

module.exports = {
  isUser,
  isWorker,
  isAdmin,
  isAdminOrWorker,
  isSuperAdmin,
  requirePermission
};

