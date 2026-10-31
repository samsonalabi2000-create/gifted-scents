import argon2 from 'argon2';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { sha256, randomToken } from '../utils/crypto.js';
import { clip } from '../utils/sanitize.js';
import { notify } from './notification.service.js';
import { revokeAllForUser } from './tokens.service.js';
import { audit } from './audit.service.js';

const ARGON = { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 1 };
export const hashPassword = (pw) => argon2.hash(pw, ARGON);
const DUMMY = await hashPassword('timing-equaliser-not-a-real-password');

const MAX_FAILS = 5; const LOCK_MS = 15 * 60 * 1000;

export const publicUser = (u) => ({ id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName, phone: u.phone ?? null, role: u.role, preferences: u.preferences ?? null });

export const register = async ({ email, password, firstName, lastName, phone }) => {
  const exists = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (exists) throw new AppError('An account with this email already exists. Try signing in.', 409, 'EMAIL_TAKEN');
  return prisma.user.create({
    data: { email: email.toLowerCase(), passwordHash: await hashPassword(password), firstName: clip(firstName, 60), lastName: clip(lastName, 60), phone: phone ? clip(phone, 25) : null },
  });
};

export const login = async ({ email, password }, req) => {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  const generic = new AppError('Incorrect email or password.', 401, 'BAD_CREDENTIALS');
  if (!user || user.deletedAt || !user.isActive) { await argon2.verify(DUMMY, password).catch(() => {}); throw generic; }
  if (user.lockedUntil && user.lockedUntil > new Date()) throw new AppError('Too many failed attempts. Please try again in a few minutes.', 429, 'ACCOUNT_LOCKED');

  const ok = await argon2.verify(user.passwordHash, password).catch(() => false);
  if (!ok) {
    const fails = user.failedLogins + 1;
    await prisma.user.update({ where: { id: user.id }, data: { failedLogins: fails, lockedUntil: fails >= MAX_FAILS ? new Date(Date.now() + LOCK_MS) : null } });
    throw generic;
  }
  const updated = await prisma.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() } });
  if (user.role !== 'CUSTOMER') await audit({ actor: user, action: 'admin.login', entity: 'User', entityId: user.id, req });
  return updated;
};

export const requestPasswordReset = async (email) => {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !user.isActive || user.deletedAt) return; // same response either way: no account enumeration
  const raw = randomToken(32);
  await prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash: sha256(raw), expiresAt: new Date(Date.now() + 30 * 60 * 1000) } });
  notify({ template: 'auth.reset', recipient: user.email, userId: user.id, payload: { name: user.firstName, link: `${env.clientUrl}/reset-password?token=${raw}` } });
};

export const resetPassword = async (token, password) => {
  const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!row || row.usedAt || row.expiresAt < new Date()) throw new AppError('This reset link is invalid or has expired.', 400, 'BAD_RESET_TOKEN');
  await prisma.$transaction([
    prisma.user.update({ where: { id: row.userId }, data: { passwordHash: await hashPassword(password), failedLogins: 0, lockedUntil: null } }),
    prisma.passwordResetToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
  ]);
  await revokeAllForUser(row.userId); // sign out everywhere
};

export const changePassword = async (userId, current, next) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!(await argon2.verify(user.passwordHash, current).catch(() => false))) throw new AppError('Your current password is incorrect.', 400, 'BAD_CREDENTIALS');
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(next) } });
  await revokeAllForUser(userId);
};

export const updateProfile = (userId, { firstName, lastName, phone, preferences }) =>
  prisma.user.update({ where: { id: userId }, data: {
    ...(firstName !== undefined ? { firstName: clip(firstName, 60) } : {}), ...(lastName !== undefined ? { lastName: clip(lastName, 60) } : {}),
    ...(phone !== undefined ? { phone: phone ? clip(phone, 25) : null } : {}), ...(preferences !== undefined ? { preferences } : {}),
  } });
