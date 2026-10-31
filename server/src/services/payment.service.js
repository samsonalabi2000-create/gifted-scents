import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { CURRENCY } from '../config/constants.js';
import { AppError } from '../utils/AppError.js';
import { randomCode } from '../utils/crypto.js';
import { paystack, verifyPaystackSignature } from './paystack.client.js';
import { notify } from './notification.service.js';
import { audit } from './audit.service.js';
import { logger } from '../config/logger.js';
import { orderInclude } from './order.service.js';
import { recomputeDerived } from './productDerived.js';

/** Step 1: create a Payment row and a Paystack transaction for an order. Amount comes from the DB order, never the client. */
export const initializePayment = async (order) => {
  if (order.paymentStatus === 'SUCCESS') throw new AppError('This order has already been paid.', 409, 'ALREADY_PAID');
  if (['CANCELLED', 'REFUNDED'].includes(order.status)) throw new AppError('This order can no longer be paid.', 409, 'ORDER_CLOSED');
  const reference = `${order.orderNumber}-${randomCode(6)}`;
  const tx = await paystack.initialize({
    email: order.email, amount: order.totalKobo, currency: CURRENCY, reference,
    callback_url: `${env.clientUrl}/checkout/callback`,
    metadata: { orderId: order.id, orderNumber: order.orderNumber },
  });
  await prisma.$transaction([
    prisma.payment.updateMany({ where: { orderId: order.id, status: 'PENDING' }, data: { status: 'ABANDONED' } }),
    prisma.payment.create({ data: { orderId: order.id, reference, amountKobo: order.totalKobo, currency: CURRENCY, status: 'PENDING', metadata: { accessCode: tx.access_code } } }),
  ]);
  return { reference, authorizationUrl: tx.authorization_url, accessCode: tx.access_code };
};

/**
 * Marks a payment successful exactly once. The compare-and-set on Payment.status means a second caller
 * (callback + webhook racing, or a replayed webhook) gets count === 0 and does nothing.
 * Stock is deducted in the same transaction; if stock ran out in the meantime the order is flagged for staff.
 */
const finalizeSuccess = async ({ paymentId, gatewayData, source, actorId }) => {
  const result = await prisma.$transaction(async (tx) => {
    const claimed = await tx.payment.updateMany({
      where: { id: paymentId, status: { in: ['PENDING', 'FAILED', 'ABANDONED'] } },
      data: { status: 'SUCCESS', paidAt: new Date(), channel: gatewayData?.channel ?? source, gatewayRef: gatewayData?.id ? String(gatewayData.id) : null, metadata: { source, paidAt: gatewayData?.paid_at ?? null } },
    });
    if (claimed.count !== 1) return { first: false };

    const payment = await tx.payment.findUnique({ where: { id: paymentId } });
    const order = await tx.order.findUnique({ where: { id: payment.orderId }, include: { items: true } });
    if (['CANCELLED', 'REFUNDED'].includes(order.status)) {
      await tx.order.update({ where: { id: order.id }, data: { paymentStatus: 'SUCCESS', needsAttention: true } });
      await tx.orderStatusHistory.create({ data: { orderId: order.id, fromStatus: order.status, toStatus: order.status, note: 'Payment arrived after the order was closed - refund or reopen manually.', actorId } });
      return { first: true, order, shortfall: true };
    }

    // Deduct stock atomically: the WHERE stock >= qty guard makes overselling impossible.
    let shortfall = false;
    if (!order.stockDeducted) {
      const done = [];
      for (const it of order.items) {
        if (!it.variantId) continue;
        const r = await tx.productVariant.updateMany({ where: { id: it.variantId, stock: { gte: it.quantity } }, data: { stock: { decrement: it.quantity } } });
        if (r.count !== 1) { shortfall = true; break; }
        done.push(it);
      }
      if (shortfall) {
        // Roll back partial deductions explicitly (we keep the payment/order update going in this same tx).
        for (const it of done) await tx.productVariant.update({ where: { id: it.variantId }, data: { stock: { increment: it.quantity } } });
      } else {
        for (const it of order.items) {
          if (!it.variantId) continue;
          const v = await tx.productVariant.findUnique({ where: { id: it.variantId }, select: { stock: true, productId: true } });
          await tx.stockMovement.create({ data: { variantId: it.variantId, delta: -it.quantity, balanceAfter: v.stock, reason: 'order_paid', orderId: order.id } });
          await tx.product.update({ where: { id: v.productId }, data: { soldCount: { increment: it.quantity } } });
          await recomputeDerived(tx, v.productId);
        }
      }
    }

    await tx.order.update({ where: { id: order.id }, data: { status: order.status === 'PENDING' ? 'PAID' : order.status, paymentStatus: 'SUCCESS', stockDeducted: !shortfall, needsAttention: shortfall } });
    await tx.orderStatusHistory.create({ data: { orderId: order.id, fromStatus: order.status, toStatus: 'PAID', note: shortfall ? `Payment verified (${source}). STOCK SHORTFALL - contact customer or refund.` : `Payment verified (${source}).`, actorId } });
    if (order.couponId) await tx.coupon.update({ where: { id: order.couponId }, data: { usedCount: { increment: 1 } } });
    if (order.cartId) await tx.cartItem.deleteMany({ where: { cartId: order.cartId } });
    return { first: true, orderId: order.id, shortfall };
  });

  if (result.first && result.orderId) {
    const full = await prisma.order.findUnique({ where: { id: result.orderId }, include: orderInclude });
    notify({ template: 'order.confirmed', recipient: full.email, userId: full.userId, payload: { order: full, items: full.items } });
    notify({ template: 'payment.received', recipient: full.email, userId: full.userId, payload: { order: full } });
    if (result.shortfall) logger.error({ orderId: full.id }, 'Paid order has a stock shortfall');
    await audit({ actor: actorId ? { id: actorId } : null, action: source === 'manual' ? 'payment.manual_confirm' : 'payment.success', entity: 'Order', entityId: full.id, diff: { source, shortfall: result.shortfall } });
  }
  return result;
};

/** Verifies with Paystack (server-to-server), validates reference/amount/currency, then finalises. Safe to call repeatedly. */
export const verifyAndFinalize = async (reference, source = 'callback') => {
  const payment = await prisma.payment.findUnique({ where: { reference }, include: { order: true } });
  if (!payment) throw new AppError('Payment not found.', 404, 'NOT_FOUND');
  if (payment.status === 'SUCCESS') return { status: 'SUCCESS', orderId: payment.orderId, already: true };

  const data = await paystack.verify(reference);
  if (data.reference !== reference) throw new AppError('Payment reference mismatch.', 422, 'REFERENCE_MISMATCH');

  if (data.status === 'success') {
    if (data.currency !== CURRENCY || Number(data.amount) !== payment.amountKobo) {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED', metadata: { reason: 'amount_or_currency_mismatch', paid: data.amount, currency: data.currency } } });
      await audit({ action: 'payment.mismatch', entity: 'Payment', entityId: payment.id, diff: { expected: payment.amountKobo, got: data.amount, currency: data.currency } });
      throw new AppError('We could not confirm this payment. Please contact support with your order number.', 422, 'AMOUNT_MISMATCH');
    }
    await finalizeSuccess({ paymentId: payment.id, gatewayData: data, source });
    return { status: 'SUCCESS', orderId: payment.orderId };
  }
  const map = { failed: 'FAILED', abandoned: 'ABANDONED', reversed: 'FAILED' };
  const next = map[data.status];
  if (next) await prisma.payment.updateMany({ where: { id: payment.id, status: 'PENDING' }, data: { status: next } });
  return { status: next || 'PENDING', orderId: payment.orderId };
};

/** Admin: confirm a bank-transfer / WhatsApp order. Goes through the same idempotent path and is audited. */
export const confirmManually = async (orderId, actor, reference) => {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new AppError('Order not found.', 404, 'NOT_FOUND');
  if (order.paymentStatus === 'SUCCESS') throw new AppError('This order is already marked as paid.', 409, 'ALREADY_PAID');
  const payment = await prisma.payment.create({ data: { orderId, gateway: 'manual', reference: `MAN-${order.orderNumber}-${randomCode(5)}`, amountKobo: order.totalKobo, currency: CURRENCY, status: 'PENDING', metadata: { note: reference || null, confirmedBy: actor.id } } });
  await finalizeSuccess({ paymentId: payment.id, gatewayData: { channel: 'manual' }, source: 'manual', actorId: actor.id });
  return prisma.order.findUnique({ where: { id: orderId }, include: orderInclude });
};

/**
 * Webhook entry. Order of operations matters:
 * signature -> persist event (unique gateway+eventKey) -> act. A replayed event hits the unique constraint and is a no-op.
 * If acting throws, we delete the event row so Paystack's retry can be processed.
 */
export const handleWebhook = async (rawBody, signature) => {
  if (!verifyPaystackSignature(rawBody, signature, env.paystack.webhookSecret)) throw new AppError('Invalid signature.', 401, 'BAD_SIGNATURE');
  const event = JSON.parse(rawBody.toString('utf8'));
  const reference = event?.data?.reference;
  const eventKey = `${event.event}:${reference || ''}:${event?.data?.id || ''}`;

  let row;
  try {
    row = await prisma.paymentEvent.create({ data: { gateway: 'paystack', eventType: event.event, eventKey, payload: event } });
  } catch (e) {
    if (e.code === 'P2002') return { duplicate: true };
    throw e;
  }
  try {
    if (event.event === 'charge.success' && reference) await verifyAndFinalize(reference, 'webhook'); // never trust the payload alone
    await prisma.paymentEvent.update({ where: { id: row.id }, data: { processedAt: new Date() } });
    return { processed: true };
  } catch (e) {
    await prisma.paymentEvent.delete({ where: { id: row.id } }).catch(() => {});
    throw e;
  }
};

export const refundPayment = async ({ orderId, actor, req }) => {
  const payment = await prisma.payment.findFirst({ where: { orderId, status: 'SUCCESS', gateway: 'paystack' } });
  if (!payment) throw new AppError('No online payment found to refund. Record manual refunds from the status menu.', 422, 'NOTHING_TO_REFUND');
  await paystack.refund({ transaction: payment.reference, amount: payment.amountKobo });
  await audit({ actor, action: 'payment.refund_requested', entity: 'Payment', entityId: payment.id, diff: { amountKobo: payment.amountKobo }, req });
  return { requested: true };
};
