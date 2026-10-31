import sharp from 'sharp';
import crypto from 'node:crypto';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';

const adapters = {
  local: () => import('./local.js'),
  cloudinary: () => import('./cloudinary.js'),
  s3: () => import('./s3.js'),
};
let adapterPromise;
const adapter = () => {
  if (!adapters[env.storage.provider]) throw new Error(`Unknown STORAGE_PROVIDER "${env.storage.provider}"`);
  return (adapterPromise ||= adapters[env.storage.provider]());
};

/**
 * Validates the REAL file type (magic bytes via sharp, not the client's mimetype), strips metadata,
 * resizes and re-encodes as WebP, then hands the bytes to the configured storage adapter.
 */
export const storeImage = async (buffer, { folder = 'products' } = {}) => {
  let img;
  try {
    img = sharp(buffer, { failOn: 'error' }).rotate(); // rotate() applies EXIF orientation, then metadata is dropped on output
    const meta = await img.metadata();
    if (!['jpeg', 'png', 'webp', 'avif'].includes(meta.format)) throw new Error('bad format');
    if ((meta.width || 0) < 200 || (meta.height || 0) < 200) throw new AppError('Image is too small (minimum 200x200px).', 422, 'IMAGE_TOO_SMALL');
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError('That file is not a valid image.', 415, 'BAD_FILE_TYPE');
  }
  const { data, info } = await img.resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
  const key = `${folder}/${Date.now()}-${crypto.randomBytes(6).toString('hex')}.webp`;
  const saved = await (await adapter()).save({ key, buffer: data, contentType: 'image/webp' });
  return { url: saved.url, storageKey: saved.key || key, width: info.width, height: info.height };
};

export const deleteImage = async (storageKey) => {
  if (!storageKey) return;
  try { await (await adapter()).remove(storageKey); } catch { /* best effort: a leftover file is harmless */ }
};
