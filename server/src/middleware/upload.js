import multer from 'multer';
import { AppError } from '../utils/AppError.js';

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (_req, file, cb) =>
    /^image\/(jpeg|png|webp|avif)$/.test(file.mimetype) ? cb(null, true) : cb(new AppError('Only JPG, PNG, WebP or AVIF images are allowed.', 415, 'BAD_FILE_TYPE')),
}).single('image');

// Turns multer errors into friendly AppErrors
export const handleUpload = (req, res, next) =>
  imageUpload(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') return next(new AppError('Image is too large (max 8 MB).', 413, 'FILE_TOO_LARGE'));
    next(err instanceof AppError ? err : new AppError('Upload failed. Please try another image.', 400, 'UPLOAD_FAILED'));
  });
