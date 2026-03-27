const rateLimit = require('express-rate-limit');

const buildLimiter = (options) => rateLimit({
  standardHeaders: true,
  legacyHeaders: false,
  ...options,
});

const authRateLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  message: { message: 'Too many login attempts. Please try again later.' },
});

const passwordResetRateLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: 'Too many password reset requests. Please try again later.' },
});

const verificationRateLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: 'Too many verification requests. Please try again later.' },
});

const adminEmailActionRateLimiter = buildLimiter({
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: { message: 'Too many admin email actions. Please wait before sending more links.' },
});

module.exports = {
  adminEmailActionRateLimiter,
  authRateLimiter,
  passwordResetRateLimiter,
  verificationRateLimiter,
};