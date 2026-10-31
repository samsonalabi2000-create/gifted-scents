import { prisma } from '../config/prisma.js';
import { COOKIES } from '../config/constants.js';
import { env } from '../config/env.js';
import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../utils/AppError.js';
import * as orders from '../services/order.service.js';
import * as payments from '../services/payment.service.js';
import * as support from '../services/support.service.js';
import * as ai from '../services/ai/ai.service.js';
import { storeImage } from '../services/storage/index.js';
import { clearCart } from '../services/cart.service.js';
import { toWhatsAppNumber } from '../utils/phone.js';
import { getAllSettings } from '../services/settings.service.js';
import { xmlEscape } from '../utils/xml.js';

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });
const ctx = (req) => ({ userId: req.user?.id, guestId: req.cookies?.[COOKIES.guest] });

const shapeOrder = (o, { includeToken = false } = {}) => ({
  id: o.id, orderNumber: o.orderNumber, status: o.status, paymentStatus: o.paymentStatus, createdAt: o.createdAt,
  customerName: o.customerName, email: o.email, phone: o.phone, state: o.state, lga: o.lga, addressLine: o.addressLine, instructions: o.instructions,
  subtotalKobo: o.subtotalKobo, shippingKobo: o.shippingKobo, discountKobo: o.discountKobo, totalKobo: o.totalKobo, currency: o.currency, trackingNote: o.trackingNote,
  zone: o.zone ? { name: o.zone.name, estimatedDays: o.zone.estimatedDays } : null,
  items: (o.items || []).map((i) => ({ id: i.id, productName: i.productName, brandName: i.brandName, variantLabel: i.variantLabel, sku: i.sku, unitPriceKobo: i.unitPriceKobo, quantity: i.quantity, lineTotalKobo: i.lineTotalKobo })),
  history: (o.history || []).map((h) => ({ toStatus: h.toStatus, note: h.note, createdAt: h.createdAt })),
  ...(includeToken ? { publicToken: o.publicToken } : {}),
});

// ---- Orders & payments ----
/** One call for checkout: validates, builds the order from the server cart, then initialises Paystack. */
export const checkout = catchAsync(async (req, res) => {
  const order = await orders.createOrder({ ctx: ctx(req), user: req.user, input: req.body });
  const payment = await payments.initializePayment(order);
  ok(res, { order: { id: order.id, orderNumber: order.orderNumber, totalKobo: order.totalKobo, publicToken: order.publicToken }, payment }, 201);
});

export const retryPayment = catchAsync(async (req, res) => {
  const order = req.user ? await orders.getOrderForUser(req.params.id, req.user) : await orders.lookupGuestOrder(req.query.orderNumber, req.query.token);
  ok(res, { payment: await payments.initializePayment(order) });
});

export const listMyOrders = catchAsync(async (req, res) => ok(res, (await orders.listUserOrders(req.user.id)).map((o) => shapeOrder(o))));
export const getMyOrder = catchAsync(async (req, res) => ok(res, shapeOrder(await orders.getOrderForUser(req.params.id, req.user))));
export const lookupOrder = catchAsync(async (req, res) => ok(res, shapeOrder(await orders.lookupGuestOrder(req.query.orderNumber, req.query.token))));

/** Browser lands on /checkout/callback?reference=... and calls this. Verification is always server-to-server. */
export const verifyPayment = catchAsync(async (req, res) => {
  const result = await payments.verifyAndFinalize(req.params.reference, 'callback');
  const order = await prisma.order.findUnique({ where: { id: result.orderId }, include: orders.orderInclude });
  if (result.status === 'SUCCESS') await clearCart(ctx(req)).catch(() => {});
  ok(res, { status: result.status, order: shapeOrder(order, { includeToken: false }), publicToken: order.publicToken });
});

export const paystackWebhook = catchAsync(async (req, res) => {
  const result = await payments.handleWebhook(req.body, req.get('x-paystack-signature')); // req.body is the RAW Buffer here
  res.status(200).json({ success: true, ...result });
});

// ---- Support ----
export const createTicket = catchAsync(async (req, res) => {
  const t = await support.createTicket(req.body, req.user);
  ok(res, { ticketNumber: t.ticketNumber }, 201);
});
export const myTickets = catchAsync(async (req, res) => ok(res, await support.listUserTickets(req.user.id)));

/** "Talk to a human": returns configured channels and (optionally) opens a ticket from the chat. */
export const handoff = catchAsync(async (req, res) => {
  const channels = await ai.supportChannels();
  let ticketNumber = null;
  if (req.body.email && req.body.message) ticketNumber = (await support.createTicket({ name: req.body.name || 'Chat visitor', email: req.body.email, message: req.body.message, category: 'Chat handoff', subject: 'Chat handoff request' }, req.user)).ticketNumber;
  ok(res, { channels, ticketNumber });
});

// ---- AI ----
export const aiChat = catchAsync(async (req, res) => ok(res, await ai.chat({ ...req.body, user: req.user })));
export const aiConfig = catchAsync(async (_req, res) => ok(res, await ai.assistantPublicConfig()));

// ---- Upload ----
export const uploadImage = catchAsync(async (req, res) => {
  if (!req.file) throw new AppError('Choose an image to upload.', 400, 'NO_FILE');
  ok(res, await storeImage(req.file.buffer, { folder: req.body.folder === 'site' ? 'site' : 'products' }), 201);
});

// ---- SEO (served by the API; the front-end host proxies /sitemap.xml and /robots.txt here, see README) ----
export const robots = (_req, res) => res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /account\nDisallow: /cart\nDisallow: /checkout\n\nSitemap: ${env.clientUrl}/sitemap.xml\n`);
export const sitemap = catchAsync(async (_req, res) => {
  const [products, brands, cats, fams] = await Promise.all([
    prisma.product.findMany({ where: { isActive: true, deletedAt: null }, select: { slug: true, updatedAt: true } }),
    prisma.brand.findMany({ where: { isActive: true }, select: { slug: true } }),
    prisma.category.findMany({ where: { isActive: true }, select: { slug: true } }),
    prisma.fragranceFamily.findMany({ select: { slug: true } }),
  ]);
  const u = (loc, lastmod) => `<url><loc>${xmlEscape(env.clientUrl + loc)}</loc>${lastmod ? `<lastmod>${lastmod.toISOString()}</lastmod>` : ''}</url>`;
  const staticPaths = ['/', '/shop', '/brands', '/scent-finder', '/about', '/contact', '/faq', '/shipping', '/returns', '/privacy', '/terms'];
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[
    ...staticPaths.map((p) => u(p)), ...products.map((p) => u(`/product/${p.slug}`, p.updatedAt)), ...brands.map((b) => u(`/brands/${b.slug}`)),
    ...cats.map((c) => u(`/shop/${c.slug}`)), ...fams.map((f) => u(`/fragrance-families/${f.slug}`)),
  ].join('')}</urlset>`);
});
export const waLink = catchAsync(async (req, res) => {
  const s = await getAllSettings(); const n = toWhatsAppNumber(s['support.whatsapp']);
  ok(res, { url: n ? `https://wa.me/${n}?text=${encodeURIComponent(String(req.query.text || 'Hello Gifted Scents'))}` : null });
});
