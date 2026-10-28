const Admin = require('../../models/Admin');
const AdminLoginLog = require('../../models/AdminLoginLog');
const AdminAuditLog = require('../../models/AdminAuditLog');
const { validationResult } = require('express-validator');
const { ADMIN_ROLES, ADMIN_ROLE_LABELS, ADMIN_MODULE_PERMISSIONS } = require('../../utils/constants');
const { logAdminAudit } = require('../../utils/adminAuditLogger');

/**
 * Get all admins (Super Admin only)
 */
const getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find()
      .select('-password')
      .populate('cityId', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: admins
    });
  } catch (error) {
    console.error('Get all admins error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch admins' });
  }
};

/**
 * Get available roles and module permissions
 */
const getAvailablePermissions = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      roles: ADMIN_ROLES,
      roleLabels: ADMIN_ROLE_LABELS,
      permissions: ADMIN_MODULE_PERMISSIONS
    });
  } catch (error) {
    console.error('Get available permissions error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch permissions list' });
  }
};

/**
 * Create new admin / sub-admin (Super Admin only)
 */
const createAdmin = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, email, password, role, cityId, cityName, permissions } = req.body;

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Admin with this email already exists'
      });
    }

    // Default permissions based on role if none provided
    let assignedPermissions = Array.isArray(permissions) ? permissions : [];
    if (assignedPermissions.length === 0 && role === 'super_admin') {
      assignedPermissions = ['*'];
    }

    // Create new admin
    const admin = await Admin.create({
      name,
      email,
      password,
      role: role || ADMIN_ROLES.SUB_ADMIN,
      permissions: assignedPermissions,
      cityId: cityId || null,
      cityName: cityName || ''
    });

    logAdminAudit({
      req,
      module: 'admin_management',
      action: 'create',
      entityType: 'Admin',
      entityId: admin._id,
      description: `Created new admin account: ${name} (${email}) as ${role || ADMIN_ROLES.SUB_ADMIN}`,
      after: { name, email, role: role || ADMIN_ROLES.SUB_ADMIN, permissions: assignedPermissions }
    });

    res.status(201).json({
      success: true,
      message: 'Admin account created successfully',
      data: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions,
        cityId: admin.cityId,
        cityName: admin.cityName
      }
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ success: false, message: 'Failed to create admin' });
  }
};

/**
 * Delete admin (Super Admin only)
 * Note: Primary super admin (admin@admin.com) cannot be deleted
 */
const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent self-deletion
    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    // Protect primary super admin
    if (admin.email === 'admin@admin.com') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete the primary super admin account'
      });
    }

    await Admin.findByIdAndDelete(id);

    logAdminAudit({
      req,
      module: 'admin_management',
      action: 'delete',
      entityType: 'Admin',
      entityId: id,
      description: `Deleted admin account: ${admin.name} (${admin.email})`,
      before: { name: admin.name, email: admin.email, role: admin.role }
    });

    res.status(200).json({
      success: true,
      message: 'Admin deleted successfully'
    });
  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete admin' });
  }
};

/**
 * Update admin role (Super Admin only)
 */
const updateAdminRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!Object.values(ADMIN_ROLES).includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role provided'
      });
    }

    // Prevent self-demotion
    if (id === req.user.id && role !== 'super_admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot change your own role'
      });
    }

    const admin = await Admin.findByIdAndUpdate(
      id,
      { role },
      { new: true }
    ).select('-password');

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    logAdminAudit({
      req,
      module: 'admin_management',
      action: 'role_change',
      entityType: 'Admin',
      entityId: id,
      description: `Changed role of ${admin.name} (${admin.email}) to ${role}`,
      after: { role }
    });

    res.status(200).json({
      success: true,
      message: 'Admin role updated successfully',
      data: admin
    });
  } catch (error) {
    console.error('Update admin role error:', error);
    res.status(500).json({ success: false, message: 'Failed to update admin role' });
  }
};

module.exports = {
  getAllAdmins,
  getAvailablePermissions,
  createAdmin,
  deleteAdmin,
  updateAdminRole,

  /**
   * Update admin details (Super Admin only)
   */
  updateAdmin: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, email, password, role, cityId, cityName, permissions } = req.body;

      // Find admin
      let admin = await Admin.findById(id);
      if (!admin) {
        return res.status(404).json({ success: false, message: 'Admin not found' });
      }

      // Check email uniqueness if changed
      if (email && email !== admin.email) {
        const existing = await Admin.findOne({ email });
        if (existing) {
          return res.status(400).json({ success: false, message: 'Email already in use' });
        }
      }

      // Update fields
      if (name) admin.name = name;
      if (email) admin.email = email;
      if (password) admin.password = password; // Pre-save hook will hash it
      if (cityId !== undefined) admin.cityId = cityId || null; // Allow clearing city
      if (cityName !== undefined) admin.cityName = cityName || '';

      if (permissions !== undefined && Array.isArray(permissions)) {
        admin.permissions = permissions;
      }

      if (role && Object.values(ADMIN_ROLES).includes(role)) {
        // Prevent self-demotion
        if (id === req.user.id && role !== 'super_admin' && admin.role === 'super_admin') {
          return res.status(400).json({ success: false, message: 'Cannot demote yourself' });
        }
        admin.role = role;
      }

      await admin.save();

      logAdminAudit({
        req,
        module: 'admin_management',
        action: 'update',
        entityType: 'Admin',
        entityId: admin._id,
        description: `Updated administrator profile for ${admin.name} (${admin.email})`
      });

      // Populate city for response
      await admin.populate('cityId', 'name');

      res.status(200).json({
        success: true,
        message: 'Admin updated successfully',
        data: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          permissions: admin.permissions,
          cityId: admin.cityId,
          cityName: admin.cityName,
          isActive: admin.isActive
        }
      });
    } catch (error) {
      console.error('Update admin error:', error);
      res.status(500).json({ success: false, message: 'Failed to update admin' });
    }
  },

  /**
   * Toggle admin status (Block/Unblock)
   */
  toggleAdminStatus: async (req, res) => {
    try {
      const { id } = req.params;

      // Prevent self-blocking
      if (id === req.user.id) {
        return res.status(400).json({ success: false, message: 'Cannot block yourself' });
      }

      const admin = await Admin.findById(id);
      if (!admin) {
        return res.status(404).json({ success: false, message: 'Admin not found' });
      }

      // Protect primary super admin
      if (admin.email === 'admin@admin.com') {
        return res.status(400).json({ success: false, message: 'Cannot block primary super admin' });
      }

      admin.isActive = !admin.isActive;
      await admin.save();

      logAdminAudit({
        req,
        module: 'admin_management',
        action: admin.isActive ? 'unblock' : 'block',
        entityType: 'Admin',
        entityId: admin._id,
        description: `${admin.isActive ? 'Unblocked' : 'Blocked'} administrator: ${admin.name} (${admin.email})`
      });

      res.status(200).json({
        success: true,
        message: `Admin ${admin.isActive ? 'unblocked' : 'blocked'} successfully`,
        data: { isActive: admin.isActive }
      });
    } catch (error) {
      console.error('Toggle status error:', error);
      res.status(500).json({ success: false, message: 'Failed to update status' });
    }
  },

  /**
   * Get Login History (Super Admin only)
   * GET /api/admin/admins/login-history
   */
  getLoginHistory: async (req, res) => {
    try {
      const { adminId, status, search } = req.query;
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

      const query = {};

      if (adminId) {
        query.adminId = adminId;
      }

      if (status && ['success', 'failed'].includes(status)) {
        query.status = status;
      }

      if (search) {
        const regex = new RegExp(search.trim(), 'i');
        query.$or = [
          { email: regex },
          { name: regex },
          { ip: regex },
          { browser: regex },
          { os: regex }
        ];
      }

      const [items, total] = await Promise.all([
        AdminLoginLog.find(query)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        AdminLoginLog.countDocuments(query)
      ]);

      res.status(200).json({
        success: true,
        total,
        page,
        pages: Math.ceil(total / limit) || 1,
        items
      });
    } catch (error) {
      console.error('Get login history error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch login history' });
    }
  },

  /**
   * Get Administrative Audit Logs (Super Admin only)
   * GET /api/admin/admins/audit-logs
   */
  getAdminAuditLogs: async (req, res) => {
    try {
      const { module: mod, adminId, action, search } = req.query;
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));

      const query = {};

      if (mod) {
        query.module = mod;
      }

      if (adminId) {
        query.adminId = adminId;
      }

      if (action) {
        query.action = action;
      }

      if (search) {
        const regex = new RegExp(search.trim(), 'i');
        query.$or = [
          { adminName: regex },
          { adminEmail: regex },
          { description: regex },
          { ip: regex }
        ];
      }

      const [items, total] = await Promise.all([
        AdminAuditLog.find(query)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        AdminAuditLog.countDocuments(query)
      ]);

      res.status(200).json({
        success: true,
        total,
        page,
        pages: Math.ceil(total / limit) || 1,
        items
      });
    } catch (error) {
      console.error('Get admin audit logs error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch audit logs' });
    }
  }
};
