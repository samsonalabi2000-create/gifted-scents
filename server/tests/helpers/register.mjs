// Test-only: replaces @prisma/client with an in-memory stub so route wiring can be tested with no database.
import { register } from 'node:module';
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ||= 'postgresql://stub:stub@localhost:5432/stub';
process.env.PAYSTACK_SECRET_KEY ||= 'test-secret-key-not-real';
register('./stub-loader.mjs', import.meta.url);
