import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import routes from './routes/index.js';
import { apiLimiter } from './middleware/rateLimiters.js';
import { csrfGuard } from './middleware/csrf.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import { paystackWebhook, robots, sitemap } from './controllers/commerce.controller.js';
import { root as uploadRoot } from './services/storage/local.js';

export const app = express();
app.set('trust proxy', 1); // Render/Railway/Fly sit behind a proxy
app.disable('x-powered-by');

app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/api/health' } }));
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } })); // images from /uploads load on the client origin
app.use(cors({
  origin(origin, cb) { (!origin || env.corsOrigins.includes(origin)) ? cb(null, true) : cb(new Error('Origin not allowed by CORS')); },
  credentials: true,
}));

// Paystack webhook: RAW body required for signature verification, so it is mounted before express.json().
app.post('/api/payments/webhook', express.raw({ type: '*/*', limit: '1mb' }), paystackWebhook);

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

if (env.storage.provider === 'local') app.use('/uploads', express.static(uploadRoot, { maxAge: '30d', immutable: true }));
app.get('/robots.txt', robots);
app.get('/sitemap.xml', sitemap);

app.use('/api', apiLimiter, csrfGuard, routes);
app.use(notFound);
app.use(errorHandler);
