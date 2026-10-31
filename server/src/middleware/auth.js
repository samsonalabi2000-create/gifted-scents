import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { COOKIES, ROLES, STAFF_PERMISSIONS } from '../config/constants.js';
import { AppError } from '../utils/AppError.js';

const loadUser = async (req) => {
  const token = req.cookies?.[COOKIES.access];
  if (!token) return null;
  try {
    const payload = jwt.verify(token, env.jwt.accessSecret, { algorithms: ['HS256'] });
    // Always re-read the user: role changes and deactivation must apply immediately.
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, isActive: true, deletedAt: true, firstName: true, lastName: true },
    });
    return user && user.isActive && !user.deletedAt ? user : null;
  } catch {
    return null;
  }
};

/** Attaches req.user when a valid session exists; never rejects. */
export const optionalAuth = async (req, _res, next) => {
  try { req.user = await loadUser(req); next(); } catch (e) { next(e); }
};

/** Rejects with 401 unless a valid session exists. */
export const requireAuth = async (req, _res, next) => {
  try {
    req.user = await loadUser(req);
    if (!req.user) throw new AppError('Please sign in to continue.', 401, 'UNAUTHORIZED');
    next();
  } catch (e) { next(e); }
};

export const can = (user, permission) =>
  user?.role === ROLES.ADMIN || (user?.role === ROLES.STAFF && STAFF_PERMISSIONS.includes(permission));

/** Use after requireAuth. Enforced on the server for every admin route. */
export const requirePermission = (permission) => (req, _res, next) => {
  if (!req.user) return next(new AppError('Please sign in to continue.', 401, 'UNAUTHORIZED'));
  if (!can(req.user, permission)) return next(new AppError('You do not have permission to do that.', 403, 'FORBIDDEN'));
  next();
};

export const requireAdmin = (req, _res, next) =>
  req.user?.role === ROLES.ADMIN ? next() : next(new AppError('Administrator access required.', 403, 'FORBIDDEN'));
