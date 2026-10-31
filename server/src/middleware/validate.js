import { validationResult } from 'express-validator';
import { AppError } from '../utils/AppError.js';

// Place after an express-validator chain: [body('x').isString(), validate]
export const validate = (req, _res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  const details = result.array().map((e) => ({ field: e.path, message: e.msg }));
  next(new AppError('Please check the highlighted fields.', 422, 'VALIDATION_ERROR', details));
};
