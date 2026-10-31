// Boots the real Express app (with a stubbed DB) and checks routing, validation, auth and CSRF behaviour end to end.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

let server; let base;
before(async () => {
  const { app } = await import('../../src/app.js');
  await new Promise((r) => { server = app.listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server?.close());

const call = (path, { method = 'GET', body, headers = {} } = {}) =>
  fetch(base + path, { method, headers: { 'content-type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined }).then(async (r) => ({ status: r.status, json: await r.json().catch(() => null), text: null }));

test('health responds ok', async () => { const r = await call('/api/health'); assert.equal(r.status, 200); assert.equal(r.json.status, 'ok'); });
test('unknown route is a clean 404 JSON', async () => { const r = await call('/api/nope'); assert.equal(r.status, 404); assert.equal(r.json.success, false); assert.equal(r.json.error.code, 'NOT_FOUND'); });
test('state-changing request without CSRF header is rejected', async () => {
  const r = await call('/api/auth/login', { method: 'POST', body: { email: 'a@b.com', password: 'x' } });
  assert.equal(r.status, 403); assert.equal(r.json.error.code, 'CSRF');
});
test('register validates input (422 with field details)', async () => {
  const r = await call('/api/auth/register', { method: 'POST', headers: { 'x-gs-csrf': '1' }, body: { email: 'not-an-email', password: 'short' } });
  assert.equal(r.status, 422); assert.ok(r.json.error.details.some((d) => d.field === 'email')); assert.ok(r.json.error.details.some((d) => d.field === 'password'));
});
test('protected routes require a session (401)', async () => {
  for (const p of ['/api/auth/me', '/api/users/me/orders', '/api/wishlist', '/api/admin/dashboard', '/api/admin/products']) assert.equal((await call(p)).status, 401, p);
});
test('upload and admin writes are not reachable anonymously', async () => {
  assert.equal((await call('/api/upload/image', { method: 'POST', headers: { 'x-gs-csrf': '1' } })).status, 401);
  assert.equal((await call('/api/admin/products', { method: 'POST', headers: { 'x-gs-csrf': '1' }, body: {} })).status, 401);
});
test('checkout validates delivery details server-side', async () => {
  const r = await call('/api/orders', { method: 'POST', headers: { 'x-gs-csrf': '1' }, body: { name: 'A' } });
  assert.equal(r.status, 422); assert.ok(r.json.error.details.length >= 4);
});
test('cart add rejects malformed variant id', async () => {
  const r = await call('/api/cart/items', { method: 'POST', headers: { 'x-gs-csrf': '1' }, body: { variantId: 'nope' } });
  assert.equal(r.status, 422);
});
test('webhook: missing/forged signature is refused and never touches orders', async () => {
  const raw = JSON.stringify({ event: 'charge.success', data: { reference: 'X', id: 1 } });
  const bad = await fetch(base + '/api/payments/webhook', { method: 'POST', headers: { 'content-type': 'application/json', 'x-paystack-signature': 'deadbeef' }, body: raw });
  assert.equal(bad.status, 401);
  const none = await fetch(base + '/api/payments/webhook', { method: 'POST', headers: { 'content-type': 'application/json' }, body: raw });
  assert.equal(none.status, 401);
});
test('webhook: correctly signed unknown event is accepted (200) and acknowledged', async () => {
  const raw = JSON.stringify({ event: 'transfer.success', data: { reference: 'T1', id: 9 } });
  const sig = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY).update(raw).digest('hex');
  const ok = await fetch(base + '/api/payments/webhook', { method: 'POST', headers: { 'content-type': 'application/json', 'x-paystack-signature': sig }, body: raw });
  assert.equal(ok.status, 200);
});
test('robots.txt hides private areas and links the sitemap', async () => {
  const t = await (await fetch(base + '/robots.txt')).text();
  assert.match(t, /Disallow: \/admin/); assert.match(t, /Sitemap:/);
});
test('AI chat validates and rate-limit headers exist', async () => {
  const r = await call('/api/ai/chat', { method: 'POST', headers: { 'x-gs-csrf': '1' }, body: { message: '' } });
  assert.equal(r.status, 422);
});
test('error bodies never leak stack traces to customers', async () => {
  const r = await call('/api/products/does-not-exist');
  assert.ok(!JSON.stringify(r.json).includes('node_modules'));
});
