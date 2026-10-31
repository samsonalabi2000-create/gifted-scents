import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { catchAsync } from '../utils/catchAsync.js';
import { optionalAuth, requireAuth, requirePermission, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { handleUpload } from '../middleware/upload.js';
import * as L from '../middleware/rateLimiters.js';
import * as V from '../validators/index.js';
import * as auth from '../controllers/auth.controller.js';
import * as shop from '../controllers/shop.controller.js';
import * as com from '../controllers/commerce.controller.js';
import * as adm from '../controllers/admin.controller.js';

const r = Router();
const v = (...rules) => [...rules, validate];

r.get('/health', catchAsync(async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ success: true, status: 'ok', service: 'gifted-scents-api', time: new Date().toISOString() });
}));

// ---------- Auth & account ----------
r.post('/auth/register', L.authLimiter, v(...V.registerRules), auth.register);
r.post('/auth/login', L.authLimiter, v(...V.loginRules), auth.login);
r.post('/auth/refresh', L.authLimiter, auth.refresh);
r.post('/auth/logout', auth.logout);
r.post('/auth/forgot-password', L.resetLimiter, v(...V.forgotRules), auth.forgot);
r.post('/auth/reset-password', L.resetLimiter, v(...V.resetRules), auth.reset);
r.get('/auth/me', requireAuth, auth.me);
r.get('/users/me', requireAuth, auth.me);
r.patch('/users/me', requireAuth, v(...V.profileRules), auth.updateMe);
r.post('/users/me/password', requireAuth, L.authLimiter, v(...V.changePasswordRules), auth.changePassword);
r.get('/users/me/addresses', requireAuth, auth.listAddresses);
r.post('/users/me/addresses', requireAuth, v(...V.addressRules), auth.saveAddress);
r.put('/users/me/addresses/:id', requireAuth, v(V.uuidParam(), ...V.addressRules), auth.saveAddress);
r.delete('/users/me/addresses/:id', requireAuth, v(V.uuidParam()), auth.deleteAddress);
r.get('/users/me/orders', requireAuth, com.listMyOrders);
r.get('/users/me/tickets', requireAuth, com.myTickets);

// ---------- Public catalog ----------
r.get('/products', shop.products);
r.get('/products/facets', shop.facets);
r.get('/products/:slug', shop.productBySlug);
r.get('/products/:slug/recommendations', shop.recommendations);
r.get('/products/:id/reviews', v(V.uuidParam()), shop.productReviews);
r.get('/brands', shop.brands);
r.get('/brands/:slug', shop.brand);
r.get('/categories', shop.categories);
r.get('/categories/:slug', shop.category);
r.get('/fragrance-families', shop.families);
r.get('/fragrance-families/:slug', shop.family);
r.get('/search', shop.searchAll);
r.get('/search/suggest', shop.searchSuggest);
r.get('/search/popular', shop.searchPopular);
r.get('/settings/public', shop.publicSettings);
r.get('/shipping/zones', shop.shippingZones);
r.post('/scent-finder/recommend', v(...V.scentRules), shop.scentFinder);
r.post('/newsletter', L.newsletterLimiter, v(...V.newsletterRules), shop.newsletter);
r.get('/reviews', shop.homeReviews);
r.post('/reviews', requireAuth, L.reviewLimiter, v(...V.reviewRules), shop.createReview);
r.get('/whatsapp-link', com.waLink);

// ---------- Cart & wishlist ----------
r.get('/cart', optionalAuth, shop.getCart);
r.get('/cart/quote', optionalAuth, v(...V.quoteRules), shop.quote);
r.post('/cart/items', optionalAuth, v(...V.cartAddRules), shop.addToCart);
r.patch('/cart/items/:itemId', optionalAuth, v(...V.cartQtyRules), shop.updateCartItem);
r.delete('/cart/items/:itemId', optionalAuth, v(V.uuidParam('itemId')), shop.removeCartItem);
r.get('/wishlist', requireAuth, shop.getWishlist);
r.post('/wishlist/merge', requireAuth, shop.mergeWishlist);
r.post('/wishlist/:productId/toggle', requireAuth, v(V.uuidParam('productId')), shop.toggleWishlist);

// ---------- Orders & payments ----------
r.post('/orders', optionalAuth, v(...V.checkoutRules), com.checkout); // validates, creates order, initialises Paystack
r.get('/orders', requireAuth, com.listMyOrders);
r.get('/orders/lookup', com.lookupOrder);
r.get('/orders/:id', requireAuth, v(V.uuidParam()), com.getMyOrder);
r.post('/payments/initialize/:id', optionalAuth, v(V.uuidParam()), com.retryPayment);
r.get('/payments/verify/:reference', optionalAuth, com.verifyPayment);
// POST /payments/webhook is mounted in app.js BEFORE the JSON parser (needs the raw body)

// ---------- Support & AI ----------
r.post('/support', optionalAuth, L.supportLimiter, v(...V.supportRules), com.createTicket);
r.post('/support/handoff', optionalAuth, L.supportLimiter, com.handoff);
r.get('/ai/config', com.aiConfig);
r.post('/ai/chat', optionalAuth, L.aiLimiter, v(...V.aiChatRules), com.aiChat);

// ---------- Upload ----------
r.post('/upload/image', requireAuth, requirePermission('products:write'), L.uploadLimiter, handleUpload, com.uploadImage);

// ---------- Admin / staff ----------
const a = Router();
a.use(requireAuth);
a.get('/dashboard', requirePermission('orders'), adm.dashboard);
a.get('/analytics', requirePermission('analytics'), adm.report);

a.get('/products', requirePermission('products:read'), adm.listProducts);
a.get('/products/options', requirePermission('products:read'), adm.productOptions);
a.get('/products/:id', requirePermission('products:read'), v(V.uuidParam()), adm.getProduct);
a.post('/products', requirePermission('products:write'), v(...V.productSaveRules), adm.createProduct);
a.put('/products/:id', requirePermission('products:write'), v(V.uuidParam(), ...V.productSaveRules), adm.updateProduct);
a.patch('/products/:id/publish', requirePermission('products:write'), v(V.uuidParam()), adm.publishProduct);
a.post('/products/:id/duplicate', requirePermission('products:write'), v(V.uuidParam()), adm.duplicateProduct);
a.delete('/products/:id', requirePermission('products:write'), v(V.uuidParam()), adm.deleteProduct);
a.get('/inventory/low', requirePermission('inventory'), adm.lowStock);
a.post('/inventory/adjust', requirePermission('inventory'), v(...V.stockRules), adm.adjustStock);

for (const [path, ctl] of [['brands', adm.brandsAdmin], ['categories', adm.categoriesAdmin], ['fragrance-families', adm.familiesAdmin]]) {
  a.get(`/${path}`, requirePermission('products:read'), ctl.list);
  a.post(`/${path}`, requirePermission('products:write'), v(...V.taxonomyRules), ctl.create);
  a.put(`/${path}/:id`, requirePermission('products:write'), v(V.uuidParam(), ...V.taxonomyRules), ctl.update);
  a.delete(`/${path}/:id`, requirePermission('products:write'), v(V.uuidParam()), ctl.remove);
}

a.get('/orders', requirePermission('orders'), adm.listOrders);
a.get('/orders/:id', requirePermission('orders'), v(V.uuidParam()), adm.getOrder);
a.patch('/orders/:id/status', requirePermission('orders'), v(...V.orderStatusRules), adm.setOrderStatus);
a.post('/orders/:id/confirm-payment', requirePermission('orders'), v(V.uuidParam()), adm.confirmPayment);
a.post('/orders/:id/refund', requireAdmin, v(V.uuidParam()), adm.refundOrder);

a.get('/customers', requirePermission('customers'), adm.listCustomers);
a.get('/customers/:id', requirePermission('customers'), v(V.uuidParam()), adm.getCustomer);
a.patch('/customers/:id/active', requireAdmin, v(V.uuidParam()), adm.setCustomerActive);
a.get('/staff', requireAdmin, adm.listStaff);
a.patch('/staff/:id/role', requireAdmin, v(V.uuidParam()), adm.setRole);

a.get('/reviews', requirePermission('reviews'), adm.listReviews);
a.patch('/reviews/:id', requirePermission('reviews'), v(...V.reviewModerateRules), adm.moderateReview);
a.delete('/reviews/:id', requirePermission('reviews'), v(V.uuidParam()), adm.deleteReview);

a.get('/support', requirePermission('support'), adm.listTickets);
a.get('/support/:id', requirePermission('support'), v(V.uuidParam()), adm.getTicket);
a.post('/support/:id/reply', requirePermission('support'), v(...V.ticketReplyRules), adm.replyTicket);
a.post('/support/:id/note', requirePermission('support'), v(...V.ticketReplyRules), adm.noteTicket);
a.patch('/support/:id/status', requirePermission('support'), v(...V.ticketStatusRules), adm.statusTicket);

a.get('/settings', requirePermission('settings'), adm.getSettings);
a.put('/settings', requirePermission('settings'), adm.saveSettings);
a.get('/shipping-zones', requirePermission('settings'), adm.listZones);
a.post('/shipping-zones', requirePermission('settings'), v(...V.zoneRules), adm.createZone);
a.put('/shipping-zones/:id', requirePermission('settings'), v(V.uuidParam(), ...V.zoneRules), adm.updateZone);
a.delete('/shipping-zones/:id', requirePermission('settings'), v(V.uuidParam()), adm.deleteZone);
a.get('/coupons', requirePermission('settings'), adm.listCoupons);
a.post('/coupons', requirePermission('settings'), v(...V.couponRules), adm.createCoupon);
a.patch('/coupons/:id', requirePermission('settings'), v(V.uuidParam()), adm.toggleCoupon);
a.get('/audit', requireAdmin, adm.listAudit);
r.use('/admin', a);

export default r;
