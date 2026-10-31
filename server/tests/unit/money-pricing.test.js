import test from 'node:test';
import assert from 'node:assert/strict';
import { nairaToKobo, koboToNaira, formatNaira, effectivePrice } from '../../src/utils/money.js';
import { calcTotals, couponDiscount } from '../../src/services/pricing.service.js';
import { pickZone, zoneFee } from '../../src/services/shipping.service.js';
import { ORDER_TRANSITIONS } from '../../src/config/constants.js';

test('money helpers use integer kobo and format NGN', () => {
  assert.equal(nairaToKobo(125000), 12_500_000);
  assert.equal(koboToNaira(12_500_000), 125000);
  assert.match(formatNaira(12_500_000), /125,000/);
  assert.match(formatNaira(12_500_000), /₦|NGN/);
});
test('effectivePrice only applies a genuinely lower sale price', () => {
  assert.equal(effectivePrice({ priceKobo: 1000, salePriceKobo: 800 }), 800);
  assert.equal(effectivePrice({ priceKobo: 1000, salePriceKobo: 1200 }), 1000);
  assert.equal(effectivePrice({ priceKobo: 1000, salePriceKobo: null }), 1000);
});
test('calcTotals: subtotal - discount + shipping, discount capped at subtotal', () => {
  const lines = [{ unitPriceKobo: 10_000, quantity: 2 }, { unitPriceKobo: 5_000, quantity: 1 }];
  assert.deepEqual(calcTotals({ lines, shippingKobo: 3000, discountKobo: 1000 }), { subtotalKobo: 25_000, discountKobo: 1000, shippingKobo: 3000, totalKobo: 27_000 });
  assert.equal(calcTotals({ lines, discountKobo: 10_000_000 }).totalKobo, 0);
});
test('couponDiscount: percent, fixed, expiry, minimum, exhausted', () => {
  const base = { isActive: true, type: 'PERCENT', value: 10, minSubtotalKobo: 0, maxUses: null, usedCount: 0, startsAt: null, expiresAt: null };
  assert.equal(couponDiscount(base, 100_000), 10_000);
  assert.equal(couponDiscount({ ...base, type: 'FIXED', value: 500_000 }, 100_000), 100_000);
  assert.throws(() => couponDiscount({ ...base, expiresAt: new Date(Date.now() - 1000) }, 100_000), /expired/);
  assert.throws(() => couponDiscount({ ...base, minSubtotalKobo: 200_000 }, 100_000), /minimum/);
  assert.throws(() => couponDiscount({ ...base, maxUses: 5, usedCount: 5 }, 100_000), /fully used/);
  assert.throws(() => couponDiscount(null, 100), /not valid/);
});
test('shipping zones: state match, fallback, pickup, free threshold', () => {
  const zones = [
    { id: 1, method: 'DELIVERY', states: ['Lagos'], isFallback: false, feeKobo: 300_000, freeAboveKobo: 5_000_000 },
    { id: 2, method: 'DELIVERY', states: [], isFallback: true, feeKobo: 550_000, freeAboveKobo: null },
    { id: 3, method: 'PICKUP', states: [], isFallback: false, feeKobo: 0, freeAboveKobo: null },
  ];
  assert.equal(pickZone(zones, { state: 'lagos' }).id, 1);
  assert.equal(pickZone(zones, { state: 'Kano' }).id, 2);
  assert.equal(pickZone(zones, { method: 'PICKUP' }).id, 3);
  assert.equal(pickZone(zones.slice(0, 1), { state: 'Kano' }), null);
  assert.equal(zoneFee(zones[0], 5_000_000), 0);
  assert.equal(zoneFee(zones[0], 4_999_999), 300_000);
});
test('order transitions never allow leaving terminal states or jumping to PAID', () => {
  assert.deepEqual(ORDER_TRANSITIONS.CANCELLED, []);
  assert.deepEqual(ORDER_TRANSITIONS.REFUNDED, []);
  for (const to of Object.values(ORDER_TRANSITIONS).flat()) assert.notEqual(to, 'PAID');
  assert.ok(ORDER_TRANSITIONS.SHIPPED.includes('DELIVERED'));
});
