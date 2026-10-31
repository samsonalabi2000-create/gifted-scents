import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { verifyPaystackSignature } from '../../src/services/paystack.client.js';
import { extractAmountsKobo, amountsAreGrounded, filterProductIds, needsHuman, parseModelJson } from '../../src/services/ai/guard.js';
import { scoreCandidate } from '../../src/services/scentFinder.service.js';
import { sha256, safeEqual, randomCode } from '../../src/utils/crypto.js';
import { toWhatsAppNumber } from '../../src/utils/phone.js';
import { slugify } from '../../src/utils/slug.js';
import { stripTags } from '../../src/utils/sanitize.js';

test('Paystack signature: valid, tampered body, wrong secret, missing', () => {
  const secret = 'unit-test-hmac-secret'; const body = Buffer.from(JSON.stringify({ event: 'charge.success', data: { reference: 'R1' } }));
  const sig = crypto.createHmac('sha512', secret).update(body).digest('hex');
  assert.equal(verifyPaystackSignature(body, sig, secret), true);
  assert.equal(verifyPaystackSignature(Buffer.from(body.toString() + ' '), sig, secret), false);
  assert.equal(verifyPaystackSignature(body, sig, 'other'), false);
  assert.equal(verifyPaystackSignature(body, undefined, secret), false);
  assert.equal(verifyPaystackSignature(body, 'short', secret), false);
});
test('AI guard: amounts must come from real prices', () => {
  assert.deepEqual(extractAmountsKobo('From ₦120,000 or N85000'), [12_000_000, 8_500_000]);
  assert.equal(amountsAreGrounded('It costs ₦120,000.', [12_000_000]), true);
  assert.equal(amountsAreGrounded('It costs ₦100,000.', [12_000_000]), false);
  assert.equal(amountsAreGrounded('No prices mentioned', []), true);
});
test('AI guard: only retrieved product ids survive', () => {
  assert.deepEqual(filterProductIds(['a', 'ghost', 'a', 5, null], ['a', 'b']), ['a']);
  assert.deepEqual(filterProductIds('nope', ['a']), []);
});
test('AI guard: human handoff detection and JSON parsing', () => {
  for (const m of ['I want a refund', 'where is my order?', 'my payment failed', 'let me talk to a human', 'item arrived damaged']) assert.equal(needsHuman(m), true, m);
  for (const m of ['recommend a woody scent for office', 'how much is Sauvage?']) assert.equal(needsHuman(m), false, m);
  assert.deepEqual(parseModelJson('```json\n{"reply":"hi","productIds":["a"]}\n```'), { reply: 'hi', productIds: ['a'] });
  assert.equal(parseModelJson('not json'), null);
});
const cand = (o = {}) => ({ gender: 'men', familySlug: 'woody', familyName: 'Woody', noteSlugs: ['cedar'], noteNames: { cedar: 'Cedar' }, occasions: ['Office'], longevity: 'LONG', sillage: 'STRONG', priceKobo: 10_000_000, isArabic: false, inStock: true, ...o });
test('Scent finder: excludes sold out, avoided notes, over budget, wrong origin/gender', () => {
  const a = { gender: 'men', families: ['woody'], likedNotes: ['cedar'], occasions: ['office'], longevity: 'long', sillage: 'strong', budgetMaxKobo: 12_000_000, origin: 'any' };
  assert.equal(scoreCandidate(cand({ inStock: false }), a).excluded, true);
  assert.equal(scoreCandidate(cand(), { ...a, avoidNotes: ['cedar'] }).excluded, true);
  assert.equal(scoreCandidate(cand({ priceKobo: 20_000_000 }), a).excluded, true);
  assert.equal(scoreCandidate(cand({ gender: 'women' }), a).excluded, true);
  assert.equal(scoreCandidate(cand({ isArabic: false }), { ...a, origin: 'arabic' }).excluded, true);
  const good = scoreCandidate(cand(), a);
  assert.equal(good.excluded, false);
  assert.ok(good.score > 8 && good.reasons.length >= 4);
  assert.ok(scoreCandidate(cand({ gender: 'unisex' }), a).score < good.score);
});
test('utilities: hashing, tokens, whatsapp, slug, sanitise', () => {
  assert.equal(sha256('a').length, 64); assert.ok(safeEqual('x', 'x')); assert.ok(!safeEqual('x', 'y')); assert.equal(randomCode(6).length, 6);
  assert.equal(toWhatsAppNumber('08055806394'), '2348055806394'); assert.equal(toWhatsAppNumber('+234 805 580 6394'), '2348055806394'); assert.equal(toWhatsAppNumber(''), '');
  assert.equal(slugify("Dior Sauvage Eau de Toilette"), 'dior-sauvage-eau-de-toilette'); assert.equal(slugify('Chanel Nº5 & more'), 'chanel-no5-and-more');
  assert.equal(stripTags('<script>alert(1)</script>Hi <b>there</b>'), 'alert(1)Hi there');
});

import { parseBudgetKobo } from '../../src/services/ai/retrieval.js';
test('AI budget parsing ignores years and plain numbers', () => {
  assert.equal(parseBudgetKobo('gift under ₦50,000'), 5_000_000);
  assert.equal(parseBudgetKobo('N80000 max'), 8_000_000);
  assert.equal(parseBudgetKobo('around 120k'), 12_000_000);
  assert.equal(parseBudgetKobo('anything in 2025 please'), null);
  assert.equal(parseBudgetKobo('a scent for my wife'), null);
});
