import { http, unwrap } from './client.js';

const get = (url, params) => unwrap(http.get(url, { params }));
const post = (url, body) => unwrap(http.post(url, body));
const patch = (url, body) => unwrap(http.patch(url, body));
const put = (url, body) => unwrap(http.put(url, body));
const del = (url) => unwrap(http.delete(url));

export const api = {
  settings: () => get('/settings/public'),
  // catalog
  products: (p) => get('/products', p), facets: () => get('/products/facets'), product: (slug) => get(`/products/${slug}`),
  recommendations: (slug) => get(`/products/${slug}/recommendations`),
  brands: () => get('/brands'), brand: (s) => get(`/brands/${s}`), categories: () => get('/categories'), category: (s) => get(`/categories/${s}`),
  families: () => get('/fragrance-families'), family: (s) => get(`/fragrance-families/${s}`),
  search: (p) => get('/search', p), suggest: (q) => get('/search/suggest', { q }), popular: () => get('/search/popular'),
  scentFinder: (a) => post('/scent-finder/recommend', a),
  newsletter: (email) => post('/newsletter', { email }),
  reviews: { home: () => get('/reviews'), forProduct: (id, p) => get(`/products/${id}/reviews`, p), create: (b) => post('/reviews', b) },
  // cart
  cart: () => get('/cart'), cartAdd: (variantId, quantity = 1) => post('/cart/items', { variantId, quantity }),
  cartQty: (id, quantity) => patch(`/cart/items/${id}`, { quantity }), cartRemove: (id) => del(`/cart/items/${id}`),
  quote: (p) => get('/cart/quote', p), zones: () => get('/shipping/zones'),
  // wishlist
  wishlist: () => get('/wishlist'), wishlistToggle: (id) => post(`/wishlist/${id}/toggle`), wishlistMerge: (ids) => post('/wishlist/merge', { productIds: ids }),
  // checkout/orders
  checkout: (b) => post('/orders', b), retryPay: (id, q) => unwrap(http.post(`/payments/initialize/${id}`, null, { params: q })),
  verify: (ref) => get(`/payments/verify/${encodeURIComponent(ref)}`), myOrders: () => get('/users/me/orders'), myOrder: (id) => get(`/orders/${id}`),
  lookupOrder: (orderNumber, token) => get('/orders/lookup', { orderNumber, token }),
  // auth/account
  auth: {
    me: () => get('/auth/me'), login: (b) => post('/auth/login', b), register: (b) => post('/auth/register', b), logout: () => post('/auth/logout'),
    forgot: (email) => post('/auth/forgot-password', { email }), reset: (b) => post('/auth/reset-password', b),
    update: (b) => patch('/users/me', b), password: (b) => post('/users/me/password', b),
    addresses: () => get('/users/me/addresses'), addressSave: (id, b) => (id ? put(`/users/me/addresses/${id}`, b) : post('/users/me/addresses', b)), addressDelete: (id) => del(`/users/me/addresses/${id}`),
    tickets: () => get('/users/me/tickets'),
  },
  // support + AI
  support: (b) => post('/support', b), handoff: (b) => post('/support/handoff', b), aiConfig: () => get('/ai/config'), aiChat: (b) => post('/ai/chat', b),
  // admin
  admin: {
    dashboard: () => get('/admin/dashboard'), analytics: (days) => get('/admin/analytics', { days }),
    products: (p) => get('/admin/products', p), product: (id) => get(`/admin/products/${id}`), productOptions: (q) => get('/admin/products/options', { q }),
    productCreate: (b) => post('/admin/products', b), productUpdate: (id, b) => put(`/admin/products/${id}`, b),
    productPublish: (id, isActive) => patch(`/admin/products/${id}/publish`, { isActive }), productDuplicate: (id) => post(`/admin/products/${id}/duplicate`),
    productDelete: (id) => del(`/admin/products/${id}`),
    stockAdjust: (b) => post('/admin/inventory/adjust', b), lowStock: () => get('/admin/inventory/low'),
    taxonomy: (kind) => ({ list: () => get(`/admin/${kind}`), create: (b) => post(`/admin/${kind}`, b), update: (id, b) => put(`/admin/${kind}/${id}`, b), remove: (id) => del(`/admin/${kind}/${id}`) }),
    orders: (p) => get('/admin/orders', p), order: (id) => get(`/admin/orders/${id}`), orderStatus: (id, b) => patch(`/admin/orders/${id}/status`, b),
    confirmPayment: (id, reference) => post(`/admin/orders/${id}/confirm-payment`, { reference }), refund: (id) => post(`/admin/orders/${id}/refund`),
    customers: (p) => get('/admin/customers', p), customer: (id) => get(`/admin/customers/${id}`),
    reviews: (p) => get('/admin/reviews', p), reviewModerate: (id, b) => patch(`/admin/reviews/${id}`, b), reviewDelete: (id) => del(`/admin/reviews/${id}`),
    tickets: (p) => get('/admin/support', p), ticket: (id) => get(`/admin/support/${id}`), ticketReply: (id, body) => post(`/admin/support/${id}/reply`, { body }),
    ticketNote: (id, body) => post(`/admin/support/${id}/note`, { body }), ticketStatus: (id, status) => patch(`/admin/support/${id}/status`, { status }),
    settings: () => get('/admin/settings'), settingsSave: (b) => put('/admin/settings', b),
    zones: () => get('/admin/shipping-zones'), zoneSave: (id, b) => (id ? put(`/admin/shipping-zones/${id}`, b) : post('/admin/shipping-zones', b)), zoneDelete: (id) => del(`/admin/shipping-zones/${id}`),
    coupons: () => get('/admin/coupons'), couponCreate: (b) => post('/admin/coupons', b), couponToggle: (id, isActive) => patch(`/admin/coupons/${id}`, { isActive }),
    audit: (p) => get('/admin/audit', p),
  },
  upload: (file, folder = 'products') => { const fd = new FormData(); fd.append('image', file); fd.append('folder', folder); return unwrap(http.post('/upload/image', fd, { headers: { 'Content-Type': 'multipart/form-data' } })); },
};
