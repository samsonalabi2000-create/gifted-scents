import { env } from '../../config/env.js';

let mod; let s3;
const client = async () => {
  if (s3) return { s3, mod };
  try { mod = await import('@aws-sdk/client-s3'); }
  catch { throw new Error('S3 storage selected but "@aws-sdk/client-s3" is not installed.'); }
  const c = env.storage.s3;
  s3 = new mod.S3Client({ region: c.region, endpoint: c.endpoint || undefined, credentials: { accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey }, forcePathStyle: Boolean(c.endpoint) });
  return { s3, mod };
};

export const save = async ({ key, buffer, contentType }) => {
  const { s3: c, mod: m } = await client();
  await c.send(new m.PutObjectCommand({ Bucket: env.storage.s3.bucket, Key: key, Body: buffer, ContentType: contentType, CacheControl: 'public, max-age=31536000, immutable' }));
  return { key, url: `${env.storage.s3.publicBaseUrl}/${key}` };
};

export const remove = async (key) => {
  const { s3: c, mod: m } = await client();
  await c.send(new m.DeleteObjectCommand({ Bucket: env.storage.s3.bucket, Key: key }));
};
