import { prisma } from '../config/prisma.js';
import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../utils/AppError.js';
import { paginate, pageMeta } from '../utils/pagination.js';
import { slugify } from '../utils/slug.js';
import { audit } from '../services/audit.service.js';
import * as products from '../services/adminProduct.service.js';
import * as orders from '../services/order.service.js';
import * as payments from '../services/payment.service.js';
import * as reviews from '../services/review.service.js';
import * as support from '../services/support.service.js';
import * as analytics from '../services/analytics.service.js';
import * as settings from '../services/settings.service.js';

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });
const A = (req) => ({ actor: req.user, req });

// Dashboard
export const dashboard = catchAsync(async (_req, res) => ok(res, await analytics.dashboard()));
export const report = catchAsync(async (req, res) => ok(res, await analytics.analyticsReport(req.query.days)));

// Products & inventory
export const listProducts = catchAsync(async (req, res) => ok(res, await products.listAdminProducts(req.query)));
export const getProduct = catchAsync(async (req, res) => ok(res, await products.getAdminProduct(req.params.id)));
export const createProduct = catchAsync(async (req, res) => ok(res, await products.saveProduct(null, req.body, req.user, req), 201));
export const updateProduct = catchAsync(async (req, res) => ok(res, await products.saveProduct(req.params.id, req.body, req.user, req)));
export const publishProduct = catchAsync(async (req, res) => ok(res, await products.setPublished(req.params.id, Boolean(req.body.isActive), req.user, req)));
export const deleteProduct = catchAsync(async (req, res) => { await products.softDelete(req.params.id, req.user, req); ok(res, { deleted: true }); });
export const duplicateProduct = catchAsync(async (req, res) => ok(res, await products.duplicateProduct(req.params.id, req.user, req), 201));
export const adjustStock = catchAsync(async (req, res) => ok(res, await products.adjustStock({ ...req.body, actor: req.user, req })));
export const lowStock = catchAsync(async (_req, res) => ok(res, await products.lowStock(Number(await settings.getSetting('inventory.lowStockThreshold')) || 5)));
export const productOptions = catchAsync(async (req, res) => ok(res, await prisma.product.findMany({ where: { deletedAt: null, ...(req.query.q ? { name: { contains: req.query.q, mode: 'insensitive' } } : {}) }, select: { id: true, name: true, brand: { select: { name: true } } }, take: 20, orderBy: { name: 'asc' } })));

// Taxonomy (brands / categories / families)
const taxonomy = (model, extra = () => ({})) => ({
  list: catchAsync(async (_req, res) => ok(res, await prisma[model].findMany({ orderBy: { name: 'asc' } }))),
  create: catchAsync(async (req, res) => { const row = await prisma[model].create({ data: { name: req.body.name, slug: slugify(req.body.slug || req.body.name), ...extra(req.body) } }); await audit({ ...A(req), action: `${model}.created`, entity: model, entityId: row.id }); ok(res, row, 201); }),
  update: catchAsync(async (req, res) => { const row = await prisma[model].update({ where: { id: req.params.id }, data: { name: req.body.name, ...(req.body.slug ? { slug: slugify(req.body.slug) } : {}), ...extra(req.body) } }); await audit({ ...A(req), action: `${model}.updated`, entity: model, entityId: row.id }); ok(res, row); }),
  remove: catchAsync(async (req, res) => {
    const used = model === 'brand' ? await prisma.product.count({ where: { brandId: req.params.id, deletedAt: null } }) : model === 'category' ? await prisma.product.count({ where: { categoryId: req.params.id, deletedAt: null } }) : await prisma.product.count({ where: { familyId: req.params.id, deletedAt: null } });
    if (used) throw new AppError(`Cannot delete: ${used} product(s) still use this. Reassign them first.`, 409, 'IN_USE');
    await prisma[model].delete({ where: { id: req.params.id } }); await audit({ ...A(req), action: `${model}.deleted`, entity: model, entityId: req.params.id }); ok(res, { deleted: true });
  }),
});
const pick = (b, keys) => Object.fromEntries(keys.filter((k) => b[k] !== undefined).map((k) => [k, b[k]]));
export const brandsAdmin = taxonomy('brand', (b) => pick(b, ['description', 'logoUrl', 'isArabic', 'isFeatured', 'isActive', 'sortOrder', 'seoTitle', 'seoDescription']));
export const categoriesAdmin = taxonomy('category', (b) => pick(b, ['description', 'imageUrl', 'parentId', 'isActive', 'sortOrder']));
export const familiesAdmin = taxonomy('fragranceFamily', (b) => pick(b, ['description', 'imageUrl', 'sortOrder']));

// Orders
export const listOrders = catchAsync(async (req, res) => {
  const pg = paginate(req.query, { defaultLimit: 20, maxLimit: 100 });
  const where = {
    ...(req.query.status ? { status: req.query.status } : {}), ...(req.query.paymentStatus ? { paymentStatus: req.query.paymentStatus } : {}),
    ...(req.query.attention === 'true' ? { needsAttention: true } : {}),
    ...(req.query.q ? { OR: [{ orderNumber: { contains: req.query.q, mode: 'insensitive' } }, { customerName: { contains: req.query.q, mode: 'insensitive' } }, { email: { contains: req.query.q, mode: 'insensitive' } }, { phone: { contains: req.query.q } }] } : {}),
  };
  const [total, items] = await Promise.all([prisma.order.count({ where }), prisma.order.findMany({ where, orderBy: { createdAt: 'desc' }, skip: pg.skip, take: pg.take, include: { _count: { select: { items: true } } } })]);
  ok(res, { items, meta: pageMeta(total, pg) });
});
export const getOrder = catchAsync(async (req, res) => {
  const o = await prisma.order.findUnique({ where: { id: req.params.id }, include: { ...orders.orderInclude, user: { select: { id: true, email: true, firstName: true, lastName: true } } } });
  if (!o) throw new AppError('Order not found.', 404, 'NOT_FOUND');
  ok(res, o);
});
export const setOrderStatus = catchAsync(async (req, res) => ok(res, await orders.updateOrderStatus({ id: req.params.id, toStatus: req.body.status, note: req.body.note, trackingNote: req.body.trackingNote, actor: req.user, req })));
export const confirmPayment = catchAsync(async (req, res) => ok(res, await payments.confirmManually(req.params.id, req.user, req.body.reference)));
export const refundOrder = catchAsync(async (req, res) => ok(res, await payments.refundPayment({ orderId: req.params.id, actor: req.user, req })));

// Customers
export const listCustomers = catchAsync(async (req, res) => {
  const pg = paginate(req.query, { defaultLimit: 20, maxLimit: 100 });
  const where = { deletedAt: null, role: 'CUSTOMER', ...(req.query.q ? { OR: [{ email: { contains: req.query.q, mode: 'insensitive' } }, { firstName: { contains: req.query.q, mode: 'insensitive' } }, { lastName: { contains: req.query.q, mode: 'insensitive' } }] } : {}) };
  const [total, items] = await Promise.all([prisma.user.count({ where }), prisma.user.findMany({ where, orderBy: { createdAt: 'desc' }, skip: pg.skip, take: pg.take, select: { id: true, email: true, firstName: true, lastName: true, phone: true, isActive: true, createdAt: true, isDemo: true, _count: { select: { orders: true } } } })]);
  ok(res, { items, meta: pageMeta(total, pg) });
});
export const getCustomer = catchAsync(async (req, res) => {
  const u = await prisma.user.findFirst({ where: { id: req.params.id, deletedAt: null }, select: { id: true, email: true, firstName: true, lastName: true, phone: true, isActive: true, createdAt: true, addresses: true, orders: { orderBy: { createdAt: 'desc' }, take: 20, select: { id: true, orderNumber: true, totalKobo: true, status: true, createdAt: true } } } });
  if (!u) throw new AppError('Customer not found.', 404, 'NOT_FOUND');
  ok(res, u);
});
export const setCustomerActive = catchAsync(async (req, res) => {
  const u = await prisma.user.update({ where: { id: req.params.id, role: 'CUSTOMER' }, data: { isActive: Boolean(req.body.isActive) } });
  await audit({ ...A(req), action: 'customer.active', entity: 'User', entityId: u.id, diff: { isActive: u.isActive } }); ok(res, { id: u.id, isActive: u.isActive });
});

// Staff accounts (admin only)
export const listStaff = catchAsync(async (_req, res) => ok(res, await prisma.user.findMany({ where: { role: { in: ['ADMIN', 'STAFF'] }, deletedAt: null }, select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, lastLoginAt: true } })));
export const setRole = catchAsync(async (req, res) => {
  if (req.params.id === req.user.id) throw new AppError('You cannot change your own role.', 422, 'SELF_CHANGE');
  const u = await prisma.user.update({ where: { id: req.params.id }, data: { role: req.body.role } });
  await audit({ ...A(req), action: 'user.role', entity: 'User', entityId: u.id, diff: { role: u.role } }); ok(res, { id: u.id, role: u.role });
});

// Reviews
export const listReviews = catchAsync(async (req, res) => {
  const pg = paginate(req.query, { defaultLimit: 20, maxLimit: 100 });
  const where = req.query.status ? { status: req.query.status } : {};
  const [total, items] = await Promise.all([prisma.review.count({ where }), prisma.review.findMany({ where, orderBy: { createdAt: 'desc' }, skip: pg.skip, take: pg.take, include: { product: { select: { name: true, slug: true } } } })]);
  ok(res, { items, meta: pageMeta(total, pg) });
});
export const moderateReview = catchAsync(async (req, res) => { const r = await reviews.moderateReview(req.params.id, req.body); await audit({ ...A(req), action: 'review.moderated', entity: 'Review', entityId: r.id, diff: req.body }); ok(res, r); });
export const deleteReview = catchAsync(async (req, res) => { await reviews.deleteReview(req.params.id); await audit({ ...A(req), action: 'review.deleted', entity: 'Review', entityId: req.params.id }); ok(res, { deleted: true }); });

// Support
export const listTickets = catchAsync(async (req, res) => ok(res, await support.listTickets(req.query)));
export const getTicket = catchAsync(async (req, res) => ok(res, await support.getTicket(req.params.id)));
export const replyTicket = catchAsync(async (req, res) => ok(res, await support.replyToTicket(req.params.id, req.body.body, req.user, req)));
export const noteTicket = catchAsync(async (req, res) => ok(res, await support.addInternalNote(req.params.id, req.body.body, req.user)));
export const statusTicket = catchAsync(async (req, res) => ok(res, await support.setTicketStatus(req.params.id, req.body.status, req.user, req)));

// Settings, shipping, coupons, audit
export const getSettings = catchAsync(async (_req, res) => ok(res, { values: await settings.getAllSettings(), defs: Object.fromEntries(Object.entries(settings.SETTING_DEFS).map(([k, v]) => [k, v.group])) }));
export const saveSettings = catchAsync(async (req, res) => {
  const keys = await settings.setSettings(req.body || {});
  await audit({ ...A(req), action: 'settings.changed', entity: 'SiteSetting', diff: { keys } });
  ok(res, { updated: keys });
});
export const listZones = catchAsync(async (_req, res) => ok(res, await prisma.shippingZone.findMany({ orderBy: { sortOrder: 'asc' } })));
const zoneData = (b) => ({ name: b.name, method: b.method, feeKobo: b.feeKobo, freeAboveKobo: b.freeAboveKobo ?? null, states: (b.states || []).map(String), estimatedDays: b.estimatedDays || null, isActive: b.isActive !== false, isFallback: Boolean(b.isFallback), sortOrder: b.sortOrder ?? 0 });
export const createZone = catchAsync(async (req, res) => { const z = await prisma.shippingZone.create({ data: zoneData(req.body) }); await audit({ ...A(req), action: 'shipping.created', entity: 'ShippingZone', entityId: z.id }); ok(res, z, 201); });
export const updateZone = catchAsync(async (req, res) => { const z = await prisma.shippingZone.update({ where: { id: req.params.id }, data: zoneData(req.body) }); await audit({ ...A(req), action: 'shipping.updated', entity: 'ShippingZone', entityId: z.id, diff: { feeKobo: z.feeKobo } }); ok(res, z); });
export const deleteZone = catchAsync(async (req, res) => { await prisma.shippingZone.update({ where: { id: req.params.id }, data: { isActive: false } }); ok(res, { deactivated: true }); });
export const listCoupons = catchAsync(async (_req, res) => ok(res, await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } })));
export const createCoupon = catchAsync(async (req, res) => { const b = req.body; const c = await prisma.coupon.create({ data: { code: b.code.toUpperCase(), type: b.type, value: b.value, minSubtotalKobo: b.minSubtotalKobo || 0, maxUses: b.maxUses ?? null, expiresAt: b.expiresAt ? new Date(b.expiresAt) : null, isActive: b.isActive !== false } }); await audit({ ...A(req), action: 'coupon.created', entity: 'Coupon', entityId: c.id }); ok(res, c, 201); });
export const toggleCoupon = catchAsync(async (req, res) => ok(res, await prisma.coupon.update({ where: { id: req.params.id }, data: { isActive: Boolean(req.body.isActive) } })));
export const listAudit = catchAsync(async (req, res) => {
  const pg = paginate(req.query, { defaultLimit: 30, maxLimit: 100 });
  const [total, items] = await Promise.all([prisma.auditLog.count(), prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, skip: pg.skip, take: pg.take, include: { actor: { select: { email: true } } } })]);
  ok(res, { items, meta: pageMeta(total, pg) });
});
