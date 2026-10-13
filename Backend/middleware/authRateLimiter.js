const rateLimit = require('express-rate-limit');

/**
 * Tighter, IP-based limiter for credential-guessing endpoints (admin
 * password login, OTP verification) — the global rateLimiter.js allows
 * 2000 req/min, which is far too loose to slow down a brute-force attempt
 * against a password or a 6-digit OTP. This is defense-in-depth alongside
 * the per-phone OTP throttle in utils/redisOtp.util.js (which fails open if
 * Redis is down); this one does not depend on Redis.
 */
const authRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20, // 20 attempts per IP per window across a login/OTP endpoint
  message: {
    success: false,
    message: 'Too many attempts. Please wait a few minutes and try again.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false }
});

module.exports = authRateLimiter;
