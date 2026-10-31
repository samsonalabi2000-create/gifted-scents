// Integration tests use the REAL database named by TEST_DATABASE_URL (never your dev/prod DB).
process.env.NODE_ENV = 'test';
if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.PAYSTACK_SECRET_KEY ||= 'test-secret-key-not-real';
