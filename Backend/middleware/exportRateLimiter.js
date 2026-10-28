const rateLimit = require('express-rate-limit');

/**
 * Data exports are heavy and each one hands over personal data, so one admin can only take a few per
 * ten minutes. Counted per admin account (not per IP), and stricter than the general API limiter.
 */
const exportRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: parseInt(process.env.EXPORT_RATE_LIMIT_MAX, 10) || 6,
  keyGenerator: (req) => String(req.user?.id || req.user?._id || 'anonymous'),
  message: { success: false, message: 'You have exported data several times in a row. Please wait a few minutes and try again.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false }
});

module.exports = exportRateLimiter;
