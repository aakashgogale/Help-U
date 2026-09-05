const rateLimit = require('express-rate-limit');

/**
 * Rate limiter middleware
 * Set higher limit for real-time app interactions (location sync, alerts, billing)
 */
const rateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX) || 2000, // Allow up to 2000 requests per minute
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    if (req.path === '/health' || req.path.startsWith('/public/')) return true;
    return false;
  }
});

module.exports = rateLimiter;

