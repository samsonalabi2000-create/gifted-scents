import { PrismaClient } from '@prisma/client';
import { env } from './env.js';

// One shared client for the whole process.
export const prisma = new PrismaClient({
  log: env.isProd ? ['error'] : ['warn', 'error'],
});
