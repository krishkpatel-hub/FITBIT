import rateLimit from 'express-rate-limit';

const buildAuthRateLimit = (message) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message,
    },
  });

export const registerLimiter = buildAuthRateLimit('Too many registration attempts. Please try again later.');
export const loginLimiter = buildAuthRateLimit('Too many login attempts. Please try again later.');
export const passwordResetLimiter = buildAuthRateLimit('Too many password reset attempts. Please try again later.');
