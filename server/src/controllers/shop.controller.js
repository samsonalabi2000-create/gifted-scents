import { prisma } from '../config/prisma.js';
import { COOKIES } from '../config/constants.js';
import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../utils/AppError.js';
import * as catalog from '../services/catalog.service.js';
import * as search from '../services/search.service.js';
import * as cart from '../services/cart.service.js';
import * as reviews from '../services/review.service.js';
import * as settings from '../services/settings.service.js';
import * as scent from '../services/scentFinder.service.js';
import { quoteShipping, listActiveZones } from '../services/shipping.service.js';
import { calcTotals, couponDiscount, findCoupon } from '../services/pricing.service.js';
import { setGuestCookie } from '../services/tokens.service.js';

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });
const ctx = (req) => ({ userId: req.user?.id, guestId: req.cookies?.[COOKIES.guest] });

// Catalog
export const products = catchAsync(async (req, res) => ok(res, await catalog.listProducts(req.query)));
export const facets = catchAsync(async (_req, res) => { res.set('Cache-Control', 'public, max-age=60'); ok(res, await catalog.getFacets()); });
export const productBySlug = catchAsync(async (req, res) => ok(res, await catalog.getProductBySlug(req.params.slug)));
export const recommendations = catchAsync(async (req, res) => ok(res, await catalog.getRecommendations(req.params.slug)));
export const brands = catchAsync(async (_req, res) => ok(res, await catalog.listBrands()));
export const brand = catchAsync(async (req, res) => ok(res, await catalog.getBrand(req.params.slug)));
export const categories = catchAsync(async (_req, res) => ok(res, await catalog.listCategories()));
export const category = catchAsync(async (req, res) => ok(res, await catalog.getCategory(req.params.slug)));
export const families = catchAsync(async (_req, res) => ok(res, await catalog.listFamilies()));
export const family = catchAsync(async (req, res) => ok(res, await catalog.getFamily(req.params.slug)));

// Search
export const searchAll = catchAsync(async (req, res) => ok(res, await search.searchProducts(req.query)));
export const searchSuggest = catchAsync(async (req, res) => ok(res, await search.suggest(req.query.q)));
export const searchPopular = catchAsync(async (_req, res) => ok(res, await search.popularSearches()));

// Settings + misc
export const publicSettings = catchAsync(async (_req, res) => ok(res, await settings.getPublicSettings()));
export const scentFinder = catchAsync(async (req, res) => ok(res, await scent.recommend(req.body)));
export const newsletter = catchAsync(async (req, res) => {
  await prisma.newsletterSubscriber.upsert({ where: { email: req.body.email }, update: { isActive: true }, create: { email: req.body.email } });
  ok(res, { message: 'Thanks for subscribing!' });
});
export const shippingZones = catchAsync(async (_req, res) => ok(res, (await listActiveZones()).map((z) => ({ id: z.id, name: z.name, method: z.method, feeKobo: z.feeKobo, freeAboveKobo: z.freeAboveKobo, estimatedDays: z.estimatedDays, states: z.states, isFallback: z.isFallback }))));

// Reviews
export const productReviews = catchAsync(async (req, res) => ok(res, await reviews.listProductReviews(req.params.id, req.query)));
export const homeReviews = catchAsync(async (_req, res) => ok(res, await reviews.homepageReviews()));
export const createReview = catchAsync(async (req, res) => ok(res, await reviews.createReview(req.user, req.body), 201));

// Cart (guest + account)
const sendCart = (res, c) => ok(res, c);
export const getCart = catchAsync(async (req, res) => sendCart(res, await cart.getCart(ctx(req))));
export const addToCart = catchAsync(async (req, res) => {
  const { cart: c, newGuestId } = await cart.addItem(ctx(req), req.body.variantId, req.body.quantity || 1);
  if (newGuestId) setGuestCookie(res, newGuestId);
  sendCart(res, c);
});
export const updateCartItem = catchAsync(async (req, res) => sendCart(res, await cart.setQuantity(ctx(req), req.params.itemId, req.body.quantity)));
export const removeCartItem = catchAsync(async (req, res) => sendCart(res, await cart.setQuantity(ctx(req), req.params.itemId, 0)));

/** Totals preview used by cart + checkout: identical maths to order creation. */
export const quote = catchAsync(async (req, res) => {
  const c = await cart.getCart(ctx(req));
  const method = req.query.method === 'PICKUP' ? 'PICKUP' : 'DELIVERY';
  let shipping = null; let shippingKobo = 0;
  if (c.items.length && (req.query.state || method === 'PICKUP')) {
    try { const q = await quoteShipping({ state: req.query.state, method, subtotalKobo: c.subtotalKobo }); shipping = { zone: q.zone.name, estimatedDays: q.zone.estimatedDays }; shippingKobo = q.feeKobo; }
    catch (e) { shipping = { error: e.message }; }
  }
  let discountKobo = 0; let couponError = null;
  if (req.query.coupon) { try { discountKobo = couponDiscount(await findCoupon(req.query.coupon), c.subtotalKobo); } catch (e) { couponError = e.message; } }
  ok(res, { cart: c, shipping, couponError, totals: calcTotals({ lines: c.items.map((i) => ({ unitPriceKobo: i.unitPriceKobo, quantity: i.quantity })), shippingKobo, discountKobo }) });
});

// Wishlist (authenticated). Guests keep theirs in localStorage and POST it to /merge after login.
export const getWishlist = catchAsync(async (req, res) => {
  const rows = await prisma.wishlistItem.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' }, select: { productId: true } });
  ok(res, { ids: rows.map((r) => r.productId), items: await catalog.cardsByIds(rows.map((r) => r.productId)) });
});
export const toggleWishlist = catchAsync(async (req, res) => {
  const key = { userId_productId: { userId: req.user.id, productId: req.params.productId } };
  const ex = await prisma.wishlistItem.findUnique({ where: key });
  if (ex) await prisma.wishlistItem.delete({ where: key });
  else {
    const p = await prisma.product.findFirst({ where: { id: req.params.productId, deletedAt: null }, select: { id: true } });
    if (!p) throw new AppError('Product not found.', 404, 'NOT_FOUND');
    await prisma.wishlistItem.create({ data: { userId: req.user.id, productId: p.id } });
  }
  ok(res, { wishlisted: !ex });
});
export const mergeWishlist = catchAsync(async (req, res) => {
  const ids = (Array.isArray(req.body.productIds) ? req.body.productIds : []).filter((x) => typeof x === 'string').slice(0, 100);
  const valid = await prisma.product.findMany({ where: { id: { in: ids }, deletedAt: null }, select: { id: true } });
  await prisma.wishlistItem.createMany({ data: valid.map((p) => ({ userId: req.user.id, productId: p.id })), skipDuplicates: true });
  ok(res, { merged: valid.length });
});
