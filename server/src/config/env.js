import 'dotenv/config';
import crypto from 'node:crypto';

const isProd = process.env.NODE_ENV === 'production';
const fail = (msg) => { console.error(`[config] ${msg}`); process.exit(1); };

const secret = (key) => {
  const v = process.env[key];
  if (v && v.length >= 32) return v;
  if (isProd) fail(`${key} must be set to a random string of 32+ characters.`);
  console.warn(`[config] ${key} not set - using an ephemeral dev secret (sessions reset on restart).`);
  return crypto.randomBytes(48).toString('hex');
};

if (!process.env.DATABASE_URL) fail('DATABASE_URL is required.');
if (isProd && !process.env.CLIENT_URL) fail('CLIENT_URL is required in production.');

const sameSite = (process.env.COOKIE_SAMESITE || 'lax').toLowerCase();

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd,
  port: Number(process.env.PORT) || 5000,
  clientUrl: (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, ''),
  serverUrl: (process.env.SERVER_URL || `http://localhost:${Number(process.env.PORT) || 5000}`).replace(/\/$/, ''),
  corsOrigins: (process.env.CORS_ORIGINS || process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean),
  databaseUrl: process.env.DATABASE_URL,
  jwt: { accessSecret: secret('JWT_ACCESS_SECRET'), refreshSecret: secret('JWT_REFRESH_SECRET'), accessTtl: '15m', refreshDays: 30 },
  cookie: { sameSite, secure: isProd || sameSite === 'none', domain: process.env.COOKIE_DOMAIN || undefined },
  paystack: {
    secretKey: process.env.PAYSTACK_SECRET_KEY || '',
    publicKey: process.env.PAYSTACK_PUBLIC_KEY || '',
    // Paystack signs webhooks with the secret key; this override exists only if you proxy/re-sign.
    webhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_SECRET_KEY || '',
  },
  ai: {
    provider: (process.env.AI_PROVIDER || 'anthropic').toLowerCase(), // anthropic | openai | none
    apiKey: process.env.AI_API_KEY || '',
    model: process.env.AI_MODEL || '',
    baseUrl: process.env.AI_BASE_URL || '',
  },
  storage: {
    provider: (process.env.STORAGE_PROVIDER || 'local').toLowerCase(), // local | cloudinary | s3
    localDir: process.env.LOCAL_UPLOAD_DIR || 'uploads',
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
      apiKey: process.env.CLOUDINARY_API_KEY || '',
      apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    },
    s3: {
      endpoint: process.env.S3_ENDPOINT || '',
      region: process.env.S3_REGION || 'auto',
      bucket: process.env.S3_BUCKET || '',
      accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
      publicBaseUrl: (process.env.S3_PUBLIC_BASE_URL || '').replace(/\/$/, ''),
    },
  },
  email: { provider: (process.env.EMAIL_PROVIDER || 'console').toLowerCase(), apiKey: process.env.EMAIL_API_KEY || '', from: process.env.EMAIL_FROM || 'Gifted Scents <no-reply@example.com>' },
  whatsappNumber: process.env.WHATSAPP_NUMBER || '',
};
