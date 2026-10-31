import { AppError } from '../utils/AppError.js';

// Cookie auth + state-changing requests => require a custom header. Browsers cannot attach custom headers
// cross-site without a CORS preflight, which our strict CORS allow-list refuses for foreign origins.
// Combined with SameSite cookies this blocks CSRF. The Paystack webhook is exempt (signature-verified).
const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);
export const csrfGuard = (req, _res, next) => {
  if (SAFE.has(req.method)) return next();
  if (req.originalUrl.startsWith('/api/payments/webhook')) return next();
  if (req.get('x-gs-csrf') === '1') return next();
  next(new AppError('Invalid request origin.', 403, 'CSRF'));
};
