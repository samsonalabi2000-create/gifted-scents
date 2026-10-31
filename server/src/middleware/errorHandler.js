import { AppError } from '../utils/AppError.js';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';

export const notFound = (req, _res, next) =>
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404, 'NOT_FOUND'));

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, _next) => {
  let error = err;

  if (err?.code === 'P2002') error = new AppError('A record with these details already exists.', 409, 'CONFLICT');
  if (err?.code === 'P2025') error = new AppError('Record not found.', 404, 'NOT_FOUND');
  if (err?.type === 'entity.parse.failed') error = new AppError('Invalid JSON body.', 400, 'BAD_JSON');

  if (err?.message === 'Origin not allowed by CORS') error = new AppError('Origin not allowed.', 403, 'CORS');

  const isOperational = error instanceof AppError;
  if (!isOperational) logger.error({ err, path: req.originalUrl }, 'Unhandled error');

  // Customers never see raw backend errors.
  res.status(isOperational ? error.statusCode : 500).json({
    success: false,
    error: {
      code: isOperational ? error.code : 'INTERNAL_ERROR',
      message: isOperational ? error.message : 'Something went wrong. Please try again.',
      ...(isOperational && error.details ? { details: error.details } : {}),
      ...(!env.isProd && !isOperational ? { stack: err.stack } : {}),
    },
  });
};
