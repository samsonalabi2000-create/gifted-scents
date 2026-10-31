import crypto from 'node:crypto';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { effectivePrice } from '../utils/money.js';
import { MAX_CART_QTY } from '../config/constants.js';

const include = {
  items: {
    orderBy: { createdAt: 'asc' },
    include: { variant: { include: { image: true, product: { include: { brand: true, images: { orderBy: { sortOrder: 'asc' }, take: 1 } } } } } },
  },
};

export const findCart = ({ userId, guestId }) => {
  if (userId) return prisma.cart.findFirst({ where: { userId }, include });
  if (guestId) return prisma.cart.findUnique({ where: { guestId }, include });
  return null;
};

const ensureCart = async ({ userId, guestId }) => {
  const existing = await findCart({ userId, guestId });
  if (existing) return { cart: existing, newGuestId: null };
  if (userId) return { cart: await prisma.cart.create({ data: { userId }, include }), newGuestId: null };
  const id = guestId || crypto.randomUUID();
  return { cart: await prisma.cart.create({ data: { guestId: id }, include }), newGuestId: guestId ? null : id };
};

/** Shapes a cart for the API, re-pricing every line from the database (never from the client). */
export const hydrateCart = (cart) => {
  const issues = [];
  const items = (cart?.items || []).map((it) => {
    const v = it.variant; const p = v.product;
    const unavailable = !v.isActive || !p.isActive || p.deletedAt;
    const stock = unavailable ? 0 : v.stock;
    if (unavailable) issues.push({ itemId: it.id, code: 'UNAVAILABLE', message: `${p.name} is no longer available.` });
    else if (it.quantity > stock) issues.push({ itemId: it.id, code: 'LOW_STOCK', message: stock === 0 ? `${p.name} is out of stock.` : `Only ${stock} of ${p.name} left.` });
    const unit = effectivePrice(v);
    return {
      id: it.id, variantId: v.id, productId: p.id, quantity: it.quantity,
      name: p.name, slug: p.slug, brand: p.brand.name, variantLabel: v.label, sku: v.sku,
      imageUrl: (v.image || p.images[0])?.url || null,
      unitPriceKobo: unit, listPriceKobo: v.priceKobo, lineTotalKobo: unit * it.quantity, stock, available: !unavailable && it.quantity <= stock,
    };
  });
  return {
    id: cart?.id || null, items, issues,
    itemCount: items.reduce((n, i) => n + i.quantity, 0),
    subtotalKobo: items.reduce((n, i) => n + i.lineTotalKobo, 0),
  };
};

const loadVariant = async (variantId) => {
  const v = await prisma.productVariant.findUnique({ where: { id: variantId }, include: { product: true } });
  if (!v || !v.isActive || !v.product.isActive || v.product.deletedAt) throw new AppError('This product is no longer available.', 404, 'UNAVAILABLE');
  return v;
};

export const getCart = async (ctx) => hydrateCart(await findCart(ctx));

export const addItem = async (ctx, variantId, quantity) => {
  const v = await loadVariant(variantId);
  const { cart, newGuestId } = await ensureCart(ctx);
  const current = cart.items.find((i) => i.variantId === variantId)?.quantity || 0;
  const wanted = Math.min(current + quantity, MAX_CART_QTY);
  if (v.stock <= 0) throw new AppError('Sorry, this size is sold out.', 409, 'OUT_OF_STOCK');
  if (wanted > v.stock) throw new AppError(`Only ${v.stock} left in stock.`, 409, 'LOW_STOCK', { available: v.stock });
  await prisma.cartItem.upsert({
    where: { cartId_variantId: { cartId: cart.id, variantId } },
    update: { quantity: wanted }, create: { cartId: cart.id, variantId, quantity: wanted },
  });
  return { cart: await getCart({ ...ctx, guestId: ctx.guestId || newGuestId }), newGuestId };
};

export const setQuantity = async (ctx, itemId, quantity) => {
  const cart = await findCart(ctx);
  const item = cart?.items.find((i) => i.id === itemId);
  if (!item) throw new AppError('Cart item not found.', 404, 'NOT_FOUND');
  if (quantity <= 0) await prisma.cartItem.delete({ where: { id: itemId } });
  else {
    const v = await loadVariant(item.variantId);
    if (quantity > v.stock) throw new AppError(`Only ${v.stock} left in stock.`, 409, 'LOW_STOCK', { available: v.stock });
    await prisma.cartItem.update({ where: { id: itemId }, data: { quantity: Math.min(quantity, MAX_CART_QTY) } });
  }
  return getCart(ctx);
};

export const clearCart = async (ctx) => {
  const cart = await findCart(ctx);
  if (cart) await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
};

/** After login: fold the guest cart into the account cart (quantities add, capped by stock). */
export const mergeGuestCart = async (guestId, userId) => {
  if (!guestId) return;
  const guest = await prisma.cart.findUnique({ where: { guestId }, include: { items: { include: { variant: true } } } });
  if (!guest || !guest.items.length) { if (guest) await prisma.cart.delete({ where: { id: guest.id } }); return; }
  const user = (await prisma.cart.findFirst({ where: { userId } })) || (await prisma.cart.create({ data: { userId } }));
  await prisma.$transaction(async (tx) => {
    for (const it of guest.items) {
      const existing = await tx.cartItem.findUnique({ where: { cartId_variantId: { cartId: user.id, variantId: it.variantId } } });
      const qty = Math.min((existing?.quantity || 0) + it.quantity, MAX_CART_QTY, Math.max(it.variant.stock, 1));
      await tx.cartItem.upsert({
        where: { cartId_variantId: { cartId: user.id, variantId: it.variantId } },
        update: { quantity: qty }, create: { cartId: user.id, variantId: it.variantId, quantity: qty },
      });
    }
    await tx.cart.delete({ where: { id: guest.id } });
  });
};
