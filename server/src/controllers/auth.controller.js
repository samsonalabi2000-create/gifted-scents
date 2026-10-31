import { prisma } from '../config/prisma.js';
import { COOKIES } from '../config/constants.js';
import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../utils/AppError.js';
import * as auth from '../services/auth.service.js';
import * as tokens from '../services/tokens.service.js';
import { mergeGuestCart } from '../services/cart.service.js';

const meta = (req) => ({ userAgent: req.get('user-agent'), ip: req.ip });
const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });

const startSession = async (req, res, user) => {
  tokens.setAuthCookies(res, user, await tokens.issueRefreshToken(user.id, meta(req)));
  await mergeGuestCart(req.cookies?.[COOKIES.guest], user.id);
  res.clearCookie(COOKIES.guest, { path: '/' });
};

export const register = catchAsync(async (req, res) => {
  const user = await auth.register(req.body);
  await startSession(req, res, user);
  ok(res, { user: auth.publicUser(user) }, 201);
});

export const login = catchAsync(async (req, res) => {
  const user = await auth.login(req.body, req);
  await startSession(req, res, user);
  ok(res, { user: auth.publicUser(user) });
});

export const refresh = catchAsync(async (req, res) => {
  try {
    const { user, refreshToken } = await tokens.rotateRefreshToken(req.cookies?.[COOKIES.refresh], meta(req));
    tokens.setAuthCookies(res, user, refreshToken);
    ok(res, { user: auth.publicUser(user) });
  } catch (e) { tokens.clearAuthCookies(res); throw e; }
});

export const logout = catchAsync(async (req, res) => {
  await tokens.revokeRefreshFamily(req.cookies?.[COOKIES.refresh]);
  tokens.clearAuthCookies(res);
  ok(res, { loggedOut: true });
});

export const me = catchAsync(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  ok(res, { user: auth.publicUser(user) });
});

export const forgot = catchAsync(async (req, res) => {
  await auth.requestPasswordReset(req.body.email);
  ok(res, { message: 'If an account exists for that email, a reset link is on its way.' });
});
export const reset = catchAsync(async (req, res) => { await auth.resetPassword(req.body.token, req.body.password); ok(res, { message: 'Password updated. Please sign in.' }); });

export const updateMe = catchAsync(async (req, res) => ok(res, { user: auth.publicUser(await auth.updateProfile(req.user.id, req.body)) }));
export const changePassword = catchAsync(async (req, res) => {
  await auth.changePassword(req.user.id, req.body.current, req.body.next);
  tokens.clearAuthCookies(res);
  ok(res, { message: 'Password changed. Please sign in again.' });
});

export const listAddresses = catchAsync(async (req, res) => ok(res, await prisma.customerAddress.findMany({ where: { userId: req.user.id }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] })));
export const saveAddress = catchAsync(async (req, res) => {
  const { recipient, phone, state, lga, addressLine, label, instructions, isDefault } = req.body;
  const data = { recipient, phone, state, lga, addressLine, label: label || null, instructions: instructions || null, isDefault: Boolean(isDefault) };
  if (req.params.id) {
    const ex = await prisma.customerAddress.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!ex) throw new AppError('Address not found.', 404, 'NOT_FOUND');
  }
  if (data.isDefault) await prisma.customerAddress.updateMany({ where: { userId: req.user.id }, data: { isDefault: false } });
  const row = req.params.id ? await prisma.customerAddress.update({ where: { id: req.params.id }, data }) : await prisma.customerAddress.create({ data: { ...data, userId: req.user.id } });
  ok(res, row, req.params.id ? 200 : 201);
});
export const deleteAddress = catchAsync(async (req, res) => {
  const r = await prisma.customerAddress.deleteMany({ where: { id: req.params.id, userId: req.user.id } });
  if (!r.count) throw new AppError('Address not found.', 404, 'NOT_FOUND');
  ok(res, { deleted: true });
});
