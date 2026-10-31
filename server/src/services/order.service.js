import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { ORDER_TRANSITIONS } from '../config/constants.js';
import { randomCode, randomToken } from '../utils/crypto.js';
import { effectivePrice } from '../utils/money.js';
import { findCart } from './cart.service.js';
import { quoteShipping } from './shipping.service.js';
import { calcTotals, couponDiscount, findCoupon } from './pricing.service.js';
import { audit } from './audit.service.js';
import { notify } from './notification.service.js';
import { recomputeDerived } from './productDerived.js';

const orderNumber = () => {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `GS-${ymd}-${randomCode(4)}`;
};

export const orderInclude = { items: true, payments: { orderBy: { createdAt: 'desc' } }, history: { orderBy: { createdAt: 'asc' } }, zone: true };

/**
 * Builds an order from the SERVER-side cart. The client only supplies delivery details and a coupon code;
 * prices, shipping and totals are always recomputed here.
 */
export const createOrder = async ({ ctx, user, input }) => {
  const cart = await findCart(ctx);
  if (!cart || !cart.items.length) throw new AppError('Your cart is empty.', 422, 'EMPTY_CART');

  const lines = [];
  const problems = [];
  for (const it of cart.items) {
    const v = it.variant; const p = v.product;
    if (!v.isActive || !p.isActive || p.deletedAt) problems.push(`${p.name} is no longer available.`);
    else if (v.stock < it.quantity) problems.push(v.stock === 0 ? `${p.name} (${v.label}) is sold out.` : `Only ${v.stock} of ${p.name} (${v.label}) left.`);
    lines.push({ variant: v, product: p, quantity: it.quantity, unitPriceKobo: effectivePrice(v) });
  }
  if (problems.length) throw new AppError('Some items in your cart changed. Please review your cart.', 409, 'CART_CHANGED', problems);

  const subtotal = lines.reduce((n, l) => n + l.unitPriceKobo * l.quantity, 0);
  const method = input.method === 'PICKUP' ? 'PICKUP' : 'DELIVERY';
  const { zone, feeKobo } = await quoteShipping({ state: input.state, method, subtotalKobo: subtotal });
  const coupon = input.couponCode ? await findCoupon(input.couponCode) : null;
  const discountKobo = input.couponCode ? couponDiscount(coupon, subtotal) : 0;
  const totals = calcTotals({ lines, shippingKobo: feeKobo, discountKobo });

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const order = await prisma.order.create({
        data: {
          orderNumber: orderNumber(), publicToken: randomToken(24), userId: user?.id ?? null, cartId: cart.id,
          email: input.email.toLowerCase(), customerName: input.name, phone: input.phone,
          state: input.state, lga: input.lga, addressLine: input.address, instructions: input.instructions || null,
          zoneId: zone.id, couponId: discountKobo > 0 ? coupon.id : null,
          subtotalKobo: totals.subtotalKobo, shippingKobo: totals.shippingKobo, discountKobo: totals.discountKobo, totalKobo: totals.totalKobo,
          items: { create: lines.map((l) => ({
            variantId: l.variant.id, productName: l.product.name, brandName: l.product.brand?.name ?? '', variantLabel: l.variant.label,
            sku: l.variant.sku, imageUrl: null, unitPriceKobo: l.unitPriceKobo, quantity: l.quantity, lineTotalKobo: l.unitPriceKobo * l.quantity,
          })) },
          history: { create: { toStatus: 'PENDING', note: 'Order placed' } },
        },
        include: orderInclude,
      });
      return order;
    } catch (e) {
      if (e.code === 'P2002' && String(e.meta?.target).includes('orderNumber')) continue;
      throw e;
    }
  }
  throw new AppError('Could not create your order. Please try again.', 500, 'ORDER_FAILED');
};

export const getOrderForUser = async (id, user) => {
  const order = await prisma.order.findUnique({ where: { id }, include: orderInclude });
  if (!order || order.userId !== user.id) throw new AppError('Order not found.', 404, 'NOT_FOUND'); // 404, not 403: don't leak existence
  return order;
};

export const lookupGuestOrder = async (orderNumberValue, token) => {
  const order = await prisma.order.findUnique({ where: { orderNumber: orderNumberValue }, include: orderInclude });
  if (!order || !order.publicToken || order.publicToken !== token) throw new AppError('Order not found.', 404, 'NOT_FOUND');
  return order;
};

export const listUserOrders = (userId) =>
  prisma.order.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, include: { items: true }, take: 100 });

/** Staff/admin status change with transition rules, stock restore on cancel, history and notifications. */
export const updateOrderStatus = async ({ id, toStatus, note, trackingNote, actor, req }) => {
  const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
  if (!order) throw new AppError('Order not found.', 404, 'NOT_FOUND');
  if (toStatus === 'PAID') throw new AppError('Orders become Paid only through a verified payment or the "Confirm payment" action.', 422, 'USE_PAYMENT_FLOW');
  if (!ORDER_TRANSITIONS[order.status]?.includes(toStatus))
    throw new AppError(`An order that is ${order.status.replace(/_/g, ' ').toLowerCase()} cannot be changed to ${toStatus.replace(/_/g, ' ').toLowerCase()}.`, 422, 'BAD_TRANSITION');

  const updated = await prisma.$transaction(async (tx) => {
    const res = await tx.order.updateMany({ where: { id, status: order.status }, data: { status: toStatus, ...(trackingNote !== undefined ? { trackingNote } : {}) } });
    if (res.count !== 1) throw new AppError('This order was just changed by someone else. Refresh and try again.', 409, 'CONFLICT');
    await tx.orderStatusHistory.create({ data: { orderId: id, fromStatus: order.status, toStatus, note: note || null, actorId: actor?.id } });

    if (toStatus === 'CANCELLED' && order.stockDeducted) {
      for (const it of order.items) {
        if (!it.variantId) continue;
        const v = await tx.productVariant.update({ where: { id: it.variantId }, data: { stock: { increment: it.quantity } } });
        await tx.stockMovement.create({ data: { variantId: it.variantId, delta: it.quantity, balanceAfter: v.stock, reason: 'order_cancelled', orderId: id, actorId: actor?.id } });
        await recomputeDerived(tx, v.productId);
      }
      await tx.order.update({ where: { id }, data: { stockDeducted: false } });
    }
    if (toStatus === 'CANCELLED' && order.paymentStatus === 'PENDING') await tx.payment.updateMany({ where: { orderId: id, status: 'PENDING' }, data: { status: 'ABANDONED' } });
    if (toStatus === 'REFUNDED') {
      await tx.order.update({ where: { id }, data: { paymentStatus: 'REFUNDED' } });
      await tx.payment.updateMany({ where: { orderId: id, status: 'SUCCESS' }, data: { status: 'REFUNDED' } });
    }
    return tx.order.findUnique({ where: { id }, include: orderInclude });
  });

  await audit({ actor, action: 'order.status', entity: 'Order', entityId: id, diff: { from: order.status, to: toStatus, note }, req });
  if (toStatus === 'SHIPPED') notify({ template: 'order.shipped', recipient: updated.email, userId: updated.userId, payload: { order: updated } });
  if (toStatus === 'DELIVERED') notify({ template: 'order.delivered', recipient: updated.email, userId: updated.userId, payload: { order: updated } });
  return updated;
};
