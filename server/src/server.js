import { app } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { prisma } from './config/prisma.js';

const server = app.listen(env.port, () => logger.info(`Gifted Scents API listening on :${env.port} (${env.nodeEnv})`));

// Housekeeping: abandon payment attempts that never completed (does not touch stock: stock is only deducted on payment).
const sweep = setInterval(async () => {
  try {
    const cutoff = new Date(Date.now() - 6 * 3600_000);
    await prisma.payment.updateMany({ where: { status: 'PENDING', createdAt: { lt: cutoff }, gateway: 'paystack' }, data: { status: 'ABANDONED' } });
    await prisma.refreshToken.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 7 * 86400_000) } } });
  } catch (err) { logger.warn({ err: err.message }, 'sweep failed'); }
}, 30 * 60 * 1000);
sweep.unref();

const shutdown = (signal) => {
  logger.info(`${signal} received, shutting down`);
  server.close(async () => { await prisma.$disconnect(); process.exit(0); });
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (err) => logger.error({ err }, 'unhandledRejection'));
