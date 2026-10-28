const AdminLoginLog = require('../models/AdminLoginLog');
const AdminAuditLog = require('../models/AdminAuditLog');

/**
 * Extract real client IP
 */
const getClientIp = (req) => {
  if (!req) return '';
  const xForwarded = req.headers?.['x-forwarded-for'];
  if (xForwarded) {
    return xForwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || req.ip || '';
};

/**
 * Parse User Agent for browser, operating system, and device type
 */
const parseUserAgent = (uaString = '') => {
  const ua = uaString || '';

  // Determine Device
  let device = 'Desktop';
  if (/mobile/i.test(ua)) device = 'Mobile';
  else if (/tablet|ipad/i.test(ua)) device = 'Tablet';

  // Determine Browser
  let browser = 'Unknown Browser';
  if (/edg\//i.test(ua)) browser = 'Edge';
  else if (/opr\/|opera/i.test(ua)) browser = 'Opera';
  else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
  else if (/postman/i.test(ua)) browser = 'Postman API';

  // Determine OS
  let os = 'Unknown OS';
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/linux/i.test(ua)) os = 'Linux';

  return { device, browser, os };
};

/**
 * Fire-and-forget logger for Admin Login attempts
 */
const logAdminLogin = async ({ req, admin, email, status, failureReason = '' }) => {
  try {
    const rawUa = req?.headers?.['user-agent'] || '';
    const ip = getClientIp(req);
    const { device, browser, os } = parseUserAgent(rawUa);

    await AdminLoginLog.create({
      adminId: admin?._id || admin?.id || null,
      email: (email || admin?.email || '').toLowerCase().trim(),
      name: admin?.name || 'Unknown',
      role: admin?.role || 'unknown',
      ip,
      userAgent: rawUa,
      device,
      browser,
      os,
      status,
      failureReason
    });
  } catch (err) {
    console.error('[AdminLoginLog] Failed to record login log (swallowed):', err.message);
  }
};

/**
 * Fire-and-forget logger for Administrative Operations (Settings, Admins, Roles, etc.)
 */
const logAdminAudit = async ({
  req,
  module,
  action,
  entityType = '',
  entityId = null,
  description,
  before = null,
  after = null
}) => {
  try {
    const admin = req?.user || req?._admin || {};
    const rawUa = req?.headers?.['user-agent'] || '';
    const ip = getClientIp(req);

    const safeBefore = before && typeof before.toObject === 'function' ? before.toObject() : before;
    const safeAfter = after && typeof after.toObject === 'function' ? after.toObject() : after;

    if (safeBefore && safeBefore.password) delete safeBefore.password;
    if (safeAfter && safeAfter.password) delete safeAfter.password;

    await AdminAuditLog.create({
      adminId: admin._id || admin.id || null,
      adminName: admin.name || 'Admin',
      adminEmail: admin.email || '',
      adminRole: admin.role || 'super_admin',
      module,
      action,
      entityType,
      entityId,
      description,
      before: safeBefore || null,
      after: safeAfter || null,
      ip,
      userAgent: rawUa
    });
  } catch (err) {
    console.error('[AdminAuditLog] Failed to record audit log (swallowed):', err.message);
  }
};

module.exports = {
  getClientIp,
  parseUserAgent,
  logAdminLogin,
  logAdminAudit
};
