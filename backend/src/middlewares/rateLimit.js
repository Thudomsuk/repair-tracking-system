// ===== backend/src/middleware/rateLimit.js =====
const rateLimit = require('express-rate-limit');

// General API rate limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'คำขอมากเกินไป กรุณารอสักครู่แล้วลองใหม่'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limit for job creation (prevent spam)
const createJobLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // limit each IP to 5 job creation requests per minute
  message: {
    success: false,
    message: 'สร้างงานมากเกินไป กรุณารอ 1 นาทีแล้วลองใหม่'
  },
  skipSuccessfulRequests: false,
});

// Auth related endpoints rate limit
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 auth requests per windowMs
  message: {
    success: false,
    message: 'พยายามล็อกอินมากเกินไป กรุณารอ 15 นาทีแล้วลองใหม่'
  },
  skipSuccessfulRequests: true,
});

// Heavy operations rate limit (analytics, reports)
const heavyLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // limit each IP to 10 heavy requests per 5 minutes
  message: {
    success: false,
    message: 'คำขอรายงานมากเกินไป กรุณารอสักครู่'
  }
});

module.exports = {
  apiLimiter,
  createJobLimiter,
  authLimiter,
  heavyLimiter
};