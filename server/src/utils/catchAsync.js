// Wraps async route handlers so rejections reach the central error middleware.
export const catchAsync = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
