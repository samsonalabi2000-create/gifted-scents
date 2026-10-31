// Usage (Git Bash):  ADMIN_EMAIL=owner@example.com ADMIN_PASSWORD='a-strong-password' ADMIN_NAME="First Last" npm run admin:create
import argon2 from 'argon2';
import { prisma } from '../src/config/prisma.js';

const email = process.env.ADMIN_EMAIL?.toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const role = process.env.ADMIN_ROLE === 'STAFF' ? 'STAFF' : 'ADMIN';
if (!email || !password || password.length < 10) { console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD (10+ chars).'); process.exit(1); }
const [firstName, ...rest] = (process.env.ADMIN_NAME || 'Store Admin').split(' ');
const passwordHash = await argon2.hash(password, { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 1 });
const user = await prisma.user.upsert({ where: { email }, update: { passwordHash, role, isActive: true, deletedAt: null }, create: { email, passwordHash, role, firstName, lastName: rest.join(' ') || '-' } });
console.log(`${role} ready: ${user.email}`);
await prisma.$disconnect();
