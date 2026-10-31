import { env } from '../../config/env.js';

let cloudinary;
const client = async () => {
  if (cloudinary) return cloudinary;
  try { ({ v2: cloudinary } = await import('cloudinary')); }
  catch { throw new Error('Cloudinary storage selected but the "cloudinary" package is not installed (npm i cloudinary).'); }
  cloudinary.config({ cloud_name: env.storage.cloudinary.cloudName, api_key: env.storage.cloudinary.apiKey, api_secret: env.storage.cloudinary.apiSecret, secure: true });
  return cloudinary;
};

export const save = async ({ key, buffer }) => {
  const c = await client();
  const publicId = key.replace(/\.webp$/, '');
  const res = await new Promise((resolve, reject) =>
    c.uploader.upload_stream({ public_id: publicId, resource_type: 'image', overwrite: false }, (err, out) => (err ? reject(err) : resolve(out))).end(buffer));
  return { key: res.public_id, url: res.secure_url };
};

export const remove = async (key) => { await (await client()).uploader.destroy(key); };
