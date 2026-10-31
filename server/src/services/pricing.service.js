import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { effectivePrice } from '../utils/money.js';

/** Pure: validates a coupon row against a subtotal. Returns the discount in kobo or throws. */
export const couponDiscount = (coupon, subtotalKobo, now = new Date()) => {
  if (!coupon || !coupon.isActive) throw new AppError('That coupon code is not valid.', 422, 'COUPON_INVALID');
  if (coupon.startsAt && coupon.startsAt > now) throw new AppError('That coupon is not active yet.', 422, 'COUPON_INVALID');
  if (coupon.expiresAt && coupon.expiresAt < now) throw new AppError('That coupon has expired.', 422, 'COUPON_EXPIRED');
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) throw new AppError('That coupon has been fully used.', 422, 'COUPON_EXHAUSTED');
  if (subtotalKobo < coupon.minSubtotalKobo) throw new AppError('Your order is below the minimum for this coupon.', 422, 'COUPON_MIN');
  const raw = coupon.type === 'PERCENT' ? Math.floor((subtotalKobo * coupon.value) / 100) : coupon.value;
  return Math.min(raw, subtotalKobo);
};

/** Pure: the single source of truth for order maths. Always integers (kobo). */
export const calcTotals = ({ lines, shippingKobo = 0, discountKobo = 0 }) => {
  const subtotalKobo = lines.reduce((sum, l) => sum + l.unitPriceKobo * l.quantity, 0);
  const discount = Math.min(discountKobo, subtotalKobo);
  return { subtotalKobo, discountKobo: discount, shippingKobo, totalKobo: subtotalKobo - discount + shippingKobo };
};

export const findCoupon = (code) =>
  code ? prisma.coupon.findUnique({ where: { code: String(code).trim().toUpperCase() } }) : null;

export const priceLine = (variant, quantity) => ({ unitPriceKobo: effectivePrice(variant), quantity });
