import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { COOKIES } from '../config/constants.js';
import { sha256, randomToken } from '../utils/crypto.js';
import { AppError } from '../utils/AppError.js';

export const signAccessToken = (user) =>
  jwt.sign({ role: user.role }, env.jwt.accessSecret, { subject: user.id, expiresIn: env.jwt.accessTtl, algorithm: 'HS256' });

const refreshExpiry = () => new Date(Date.now() + env.jwt.refreshDays * 86400_000);

/** Creates a refresh token (opaque, stored hashed). `family` links a rotation chain. */
export const issueRefreshToken = async (userId, { family, userAgent, ip } = {}) => {
  const raw = randomToken(48);
  await prisma.refreshToken.create({
    data: { userId, tokenHash: sha256(raw), family: family || crypto.randomUUID(), expiresAt: refreshExpiry(), userAgent: userAgent?.slice(0, 250), ip },
  });
  return raw;
};

/**
 * Rotates a refresh token. Presenting an already-used token means it was stolen or replayed:
 * the whole family is revoked and the user must sign in again.
 */
export const rotateRefreshToken = async (raw, meta = {}) => {
  if (!raw) throw new AppError('Session expired. Please sign in again.', 401, 'UNAUTHORIZED');
  const row = await prisma.refreshToken.findUnique({ where: { tokenHash: sha256(raw) }, include: { user: true } });
  if (!row) throw new AppError('Session expired. Please sign in again.', 401, 'UNAUTHORIZED');
  if (row.revokedAt) {
    await prisma.refreshToken.updateMany({ where: { family: row.family, revokedAt: null }, data: { revokedAt: new Date() } });
    throw new AppError('Session expired. Please sign in again.', 401, 'TOKEN_REUSE');
  }
  if (row.expiresAt < new Date() || !row.user.isActive || row.user.deletedAt)
    throw new AppError('Session expired. Please sign in again.', 401, 'UNAUTHORIZED');

  // Atomic claim: only one concurrent request can revoke-and-replace this token.
  const claimed = await prisma.refreshToken.updateMany({ where: { id: row.id, revokedAt: null }, data: { revokedAt: new Date() } });
  if (claimed.count !== 1) throw new AppError('Session expired. Please sign in again.', 401, 'UNAUTHORIZED');

  const next = await issueRefreshToken(row.userId, { family: row.family, ...meta });
  return { user: row.user, refreshToken: next };
};

export const revokeRefreshFamily = async (raw) => {
  if (!raw) return;
  const row = await prisma.refreshToken.findUnique({ where: { tokenHash: sha256(raw) } });
  if (row) await prisma.refreshToken.updateMany({ where: { family: row.family, revokedAt: null }, data: { revokedAt: new Date() } });
};

export const revokeAllForUser = (userId) =>
  prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });

const base = () => ({ httpOnly: true, secure: env.cookie.secure, sameSite: env.cookie.sameSite, domain: env.cookie.domain });

export const setAuthCookies = (res, user, refreshToken) => {
  res.cookie(COOKIES.access, signAccessToken(user), { ...base(), path: '/', maxAge: 15 * 60 * 1000 });
  res.cookie(COOKIES.refresh, refreshToken, { ...base(), path: '/api/auth', maxAge: env.jwt.refreshDays * 86400_000 });
};
export const clearAuthCookies = (res) => {
  res.clearCookie(COOKIES.access, { ...base(), path: '/' });
  res.clearCookie(COOKIES.refresh, { ...base(), path: '/api/auth' });
};
export const setGuestCookie = (res, id) =>
  res.cookie(COOKIES.guest, id, { ...base(), path: '/', maxAge: 90 * 86400_000 });
