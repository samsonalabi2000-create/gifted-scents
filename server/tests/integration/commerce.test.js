// REAL-database integration tests. They are skipped unless TEST_DATABASE_URL points at a throw-away database
// that already has the schema applied:   TEST_DATABASE_URL=postgresql://... npx prisma migrate deploy  (then run this).
// They exercise: auth + refresh-token reuse detection, RBAC, cart stock validation, checkout totals,
// webhook idempotency (duplicate event => one stock deduction), amount-mismatch protection, and overselling protection.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const enabled = Boolean(process.env.TEST_DATABASE_URL);
const skip = enabled ? false : 'TEST_DATABASE_URL not set';
let app; let prisma; let server; let base;
const jar = () => { const c = {}; return { c, hdr: () => Object.entries(c).map(([k, v]) => `${k}=${v}`).join('; '), eat: (r) => { for (const s of r.headers.getSetCookie?.() ?? []) { const [kv] = s.split(';'); const [k, ...v] = kv.split('='); c[k] = v.join('='); } } }; };
const api = async (path, { method = 'GET', body, j, headers = {} } = {}) => {
  const r = await fetch(base + path, { method, headers: { 'content-type': 'application/json', 'x-gs-csrf': '1', ...(j ? { cookie: j.hdr() } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
  j?.eat(r); return { status: r.status, json: await r.json().catch(() => null) };
};

before(async () => {
  if (!enabled) return;
  ({ app } = await import('../../src/app.js')); ({ prisma } = await import('../../src/config/prisma.js'));
  await new Promise((r) => { server = app.listen(0, r); }); base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { server?.close(); await prisma?.$disconnect(); });

const mkProduct = async (stock = 3) => {
  const tag = crypto.randomBytes(3).toString('hex');
  const brand = await prisma.brand.upsert({ where: { slug: 'it-brand' }, update: {}, create: { name: 'IT Brand', slug: 'it-brand' } });
  const p = await prisma.product.create({ data: { name: `IT ${tag}`, slug: `it-${tag}`, brandId: brand.id, minPriceKobo: 1_000_000, isDemo: true, variants: { create: { label: '50ml', sku: `IT-${tag}`, priceKobo: 1_000_000, stock, isDefault: true } } }, include: { variants: true } });
  return p;
};
const sign = (raw) => crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY).update(raw).digest('hex');

test('auth: register, login, refresh rotation, reuse detection revokes the family', { skip }, async () => {
  const email = `it-${Date.now()}@example.test`; const j = jar();
  assert.equal((await api('/api/auth/register', { method: 'POST', j, body: { email, password: 'Passw0rdOK', firstName: 'It', lastName: 'Test' } })).status, 201);
  assert.equal((await api('/api/auth/me', { j })).status, 200);
  const oldRefresh = j.c.gs_rt;
  assert.equal((await api('/api/auth/refresh', { method: 'POST', j })).status, 200);
  assert.notEqual(j.c.gs_rt, oldRefresh);
  const attacker = jar(); attacker.c.gs_rt = oldRefresh;
  assert.equal((await api('/api/auth/refresh', { method: 'POST', j: attacker })).status, 401); // replayed token
  assert.equal((await api('/api/auth/refresh', { method: 'POST', j })).status, 401); // whole family now revoked
});

test('rbac: a customer cannot reach admin or staff APIs', { skip }, async () => {
  const j = jar(); await api('/api/auth/register', { method: 'POST', j, body: { email: `c-${Date.now()}@example.test`, password: 'Passw0rdOK', firstName: 'C', lastName: 'U' } });
  for (const p of ['/api/admin/dashboard', '/api/admin/products', '/api/admin/orders', '/api/admin/settings']) assert.equal((await api(p, { j })).status, 403, p);
});

test('cart: stock validation; checkout totals are computed on the server', { skip }, async () => {
  const p = await mkProduct(2); const v = p.variants[0]; const j = jar();
  await prisma.shippingZone.upsert({ where: { id: '00000000-0000-0000-0000-0000000000a1' }, update: { isActive: true }, create: { id: '00000000-0000-0000-0000-0000000000a1', name: 'IT Fallback', method: 'DELIVERY', states: [], isFallback: true, feeKobo: 300_000, isActive: true } });
  assert.equal((await api('/api/cart/items', { method: 'POST', j, body: { variantId: v.id, quantity: 3 } })).status, 409);
  assert.equal((await api('/api/cart/items', { method: 'POST', j, body: { variantId: v.id, quantity: 2 } })).status, 200);
  const r = await api('/api/orders', { method: 'POST', j, body: { name: 'Buyer One', email: 'buyer@example.test', phone: '08012345678', state: 'Kano', lga: 'Nassarawa', address: '1 Test Road', totalKobo: 1 } }); // client "total" is ignored
  if (r.status === 201) assert.equal(r.json.data.order.totalKobo, 2_000_000 + (await prisma.shippingZone.findFirst({ where: { isFallback: true, isActive: true } })).feeKobo);
  else assert.equal(r.status, 503); // Paystack not reachable/configured in CI: the order is still created before initialisation
});

test('payments: duplicate webhook deducts stock once; wrong amount never marks paid', { skip }, async () => {
  const p = await mkProduct(5); const v = p.variants[0];
  const order = await prisma.order.create({ data: { orderNumber: `IT-${Date.now()}`, email: 'w@example.test', customerName: 'W', phone: '0', state: 'Lagos', lga: 'x', addressLine: 'x', subtotalKobo: 2_000_000, shippingKobo: 0, totalKobo: 2_000_000, isDemo: true,
    items: { create: { variantId: v.id, productName: p.name, brandName: 'IT', variantLabel: '50ml', sku: v.sku, unitPriceKobo: 1_000_000, quantity: 2, lineTotalKobo: 2_000_000 } } } });
  const pay = await prisma.payment.create({ data: { orderId: order.id, reference: `REF-${order.orderNumber}`, amountKobo: 2_000_000 } });
  // Stub Paystack verify (the real client needs the network + a live key)
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => String(url).includes('api.paystack.co/transaction/verify')
    ? new Response(JSON.stringify({ status: true, data: { status: 'success', reference: pay.reference, amount: globalThis.__amt ?? 2_000_000, currency: 'NGN', id: 777, channel: 'card' } }), { status: 200 })
    : realFetch(url, init);
  process.env.PAYSTACK_SECRET_KEY = 'x'; // env.paystack.secretKey is read at import; set above in register-none
  try {
    globalThis.__amt = 1_000_000; // underpaid
    const raw1 = JSON.stringify({ event: 'charge.success', data: { reference: pay.reference, id: 1 } });
    await realFetch(base + '/api/payments/webhook', { method: 'POST', headers: { 'content-type': 'application/json', 'x-paystack-signature': sign(raw1) }, body: raw1 });
    assert.notEqual((await prisma.order.findUnique({ where: { id: order.id } })).paymentStatus, 'SUCCESS');

    globalThis.__amt = 2_000_000; await prisma.payment.update({ where: { id: pay.id }, data: { status: 'PENDING' } });
    const raw2 = JSON.stringify({ event: 'charge.success', data: { reference: pay.reference, id: 2 } });
    const send = () => realFetch(base + '/api/payments/webhook', { method: 'POST', headers: { 'content-type': 'application/json', 'x-paystack-signature': sign(raw2) }, body: raw2 });
    const rs = await Promise.all([send(), send(), send()]); // concurrent duplicates
    assert.ok(rs.every((r) => r.status === 200));
    const after = await prisma.productVariant.findUnique({ where: { id: v.id } });
    assert.equal(after.stock, 3); // 5 - 2, exactly once
    const o = await prisma.order.findUnique({ where: { id: order.id } });
    assert.equal(o.status, 'PAID'); assert.equal(o.stockDeducted, true);
    assert.equal(await prisma.stockMovement.count({ where: { orderId: order.id, reason: 'order_paid' } }), 1);
  } finally { globalThis.fetch = realFetch; }
});
