import rateLimit from 'express-rate-limit';

const make = (windowMs, limit, message) =>
  rateLimit({
    windowMs, limit, standardHeaders: true, legacyHeaders: false,
    message: { success: false, error: { code: 'RATE_LIMITED', message } },
  });

export const apiLimiter = make(15 * 60 * 1000, 600, 'Too many requests. Please slow down.');
export const authLimiter = make(15 * 60 * 1000, 30, 'Too many attempts. Please try again later.');
export const resetLimiter = make(60 * 60 * 1000, 8, 'Too many reset requests. Please try again later.');
export const reviewLimiter = make(60 * 60 * 1000, 10, 'Too many reviews submitted. Please try again later.');
export const supportLimiter = make(60 * 60 * 1000, 10, 'Too many messages. Please try again later or use WhatsApp.');
export const aiLimiter = make(10 * 60 * 1000, 40, 'You are sending messages very quickly. Please wait a moment.');
export const newsletterLimiter = make(60 * 60 * 1000, 10, 'Too many attempts. Please try again later.');
export const uploadLimiter = make(10 * 60 * 1000, 120, 'Too many uploads. Please wait a moment.');
