import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { slugify } from '../utils/slug.js';
import { clip } from '../utils/sanitize.js';
import { paginate, pageMeta } from '../utils/pagination.js';
import { recomputeDerived } from './productDerived.js';
import { deleteImage } from './storage/index.js';
import { audit } from './audit.service.js';

const full = { brand: true, category: true, family: true, images: { orderBy: { sortOrder: 'asc' } }, variants: { orderBy: { sortOrder: 'asc' } }, notes: { include: { note: true } }, relationsFrom: { include: { to: { select: { id: true, name: true, slug: true } } } } };

const uniqueSlug = async (base, exceptId) => {
  let slug = base || 'product'; let n = 1;
  while (await prisma.product.findFirst({ where: { slug, ...(exceptId ? { id: { not: exceptId } } : {}) }, select: { id: true } })) slug = `${base}-${++n}`;
  return slug;
};

const noteId = async (tx, name) => {
  const slug = slugify(name);
  const n = await tx.fragranceNote.upsert({ where: { slug }, update: {}, create: { name: clip(name, 60), slug } });
  return n.id;
};

/** Whitelists and normalises editor input. Nothing from the client is spread into Prisma directly. */
const normalise = (b) => ({
  name: clip(b.name, 160), type: b.type || 'FRAGRANCE', brandId: b.brandId, categoryId: b.categoryId || null, familyId: b.familyId || null,
  gender: b.gender || 'UNISEX', shortDescription: b.shortDescription ? clip(b.shortDescription, 300) : null,
  description: b.description ? String(b.description).replace(/<[^>]*>/g, '').slice(0, 8000) : null,
  concentration: b.concentration || null, longevity: b.longevity || null, sillage: b.sillage || null,
  occasions: (b.occasions || []).map((o) => clip(o, 40)).filter(Boolean).slice(0, 12), videoUrl: b.videoUrl || null,
  isFeatured: Boolean(b.isFeatured), isBestseller: Boolean(b.isBestseller), isNewArrival: Boolean(b.isNewArrival), isActive: b.isActive !== false,
  seoTitle: b.seoTitle ? clip(b.seoTitle, 70) : null, seoDescription: b.seoDescription ? clip(b.seoDescription, 170) : null, seoKeywords: b.seoKeywords ? clip(b.seoKeywords, 200) : null,
});

export const listAdminProducts = async (q) => {
  const pg = paginate(q, { defaultLimit: 20, maxLimit: 100 });
  const where = {
    deletedAt: null,
    ...(q.q ? { OR: [{ name: { contains: q.q, mode: 'insensitive' } }, { brand: { name: { contains: q.q, mode: 'insensitive' } } }, { variants: { some: { sku: { contains: q.q, mode: 'insensitive' } } } }] } : {}),
    ...(q.brand ? { brandId: q.brand } : {}), ...(q.category ? { categoryId: q.category } : {}),
    ...(q.status === 'published' ? { isActive: true } : q.status === 'draft' ? { isActive: false } : {}),
    ...(q.stock === 'out' ? { inStock: false } : {}),
  };
  const order = { name: { name: 'asc' }, price: { minPriceKobo: 'desc' }, newest: { createdAt: 'desc' } }[q.sort] || { updatedAt: 'desc' };
  const [total, items] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({ where, orderBy: order, skip: pg.skip, take: pg.take, include: { brand: { select: { name: true } }, images: { take: 1, orderBy: { sortOrder: 'asc' } }, variants: { select: { stock: true, priceKobo: true, isActive: true } } } }),
  ]);
  return { items: items.map((p) => ({ id: p.id, name: p.name, slug: p.slug, brand: p.brand.name, type: p.type, isActive: p.isActive, isDemo: p.isDemo, image: p.images[0]?.url || null, minPriceKobo: p.minPriceKobo, stock: p.variants.reduce((n, v) => n + v.stock, 0), variantCount: p.variants.length, updatedAt: p.updatedAt })), meta: pageMeta(total, pg) };
};

export const getAdminProduct = async (id) => {
  const p = await prisma.product.findFirst({ where: { id, deletedAt: null }, include: full });
  if (!p) throw new AppError('Product not found.', 404, 'NOT_FOUND');
  return { ...p, ratingAvg: Number(p.ratingAvg), notes: p.notes.map((n) => ({ name: n.note.name, layer: n.layer })), relations: p.relationsFrom.map((r) => ({ toId: r.toId, type: r.type, name: r.to.name })) };
};

/** Create or update a whole product (variants, images, notes, relations) in ONE transaction. */
export const saveProduct = async (id, body, actor, req) => {
  const data = normalise(body);
  const before = id ? await prisma.product.findFirst({ where: { id, deletedAt: null }, include: { variants: true, images: true } }) : null;
  if (id && !before) throw new AppError('Product not found.', 404, 'NOT_FOUND');
  const brand = await prisma.brand.findUnique({ where: { id: data.brandId } });
  if (!brand) throw new AppError('Please choose a brand.', 422, 'VALIDATION_ERROR');
  if (!body.variants?.length) throw new AppError('Add at least one size/variant with a price.', 422, 'VALIDATION_ERROR');

  const skus = body.variants.map((v) => String(v.sku).trim().toUpperCase());
  if (new Set(skus).size !== skus.length) throw new AppError('Each variant needs a different SKU.', 422, 'VALIDATION_ERROR');
  const clash = await prisma.productVariant.findFirst({ where: { sku: { in: skus }, ...(id ? { productId: { not: id } } : {}) } });
  if (clash) throw new AppError(`SKU ${clash.sku} is already used by another product.`, 409, 'SKU_TAKEN');

  const slug = await uniqueSlug(slugify(body.slug || `${brand.name} ${data.name}`), id);

  const saved = await prisma.$transaction(async (tx) => {
    const product = id ? await tx.product.update({ where: { id }, data: { ...data, slug } }) : await tx.product.create({ data: { ...data, slug } });
    const pid = product.id;

    // Variants: upsert by id, then remove (or deactivate when they appear in past orders) the rest.
    const keep = [];
    for (const [i, v] of body.variants.entries()) {
      const row = {
        label: clip(v.label, 40), sizeMl: v.sizeMl ? Number(v.sizeMl) : null, sku: String(v.sku).trim().toUpperCase(),
        priceKobo: Number(v.priceKobo), salePriceKobo: v.salePriceKobo ? Number(v.salePriceKobo) : null, stock: Math.max(0, parseInt(v.stock, 10) || 0),
        lowStockAt: v.lowStockAt ? Number(v.lowStockAt) : null, isDefault: Boolean(v.isDefault), isActive: v.isActive !== false, sortOrder: i, imageId: null,
      };
      if (row.salePriceKobo != null && row.salePriceKobo >= row.priceKobo) row.salePriceKobo = null;
      if (v.id && before?.variants.some((x) => x.id === v.id)) {
        const old = before.variants.find((x) => x.id === v.id);
        await tx.productVariant.update({ where: { id: v.id }, data: row });
        if (old.stock !== row.stock) await tx.stockMovement.create({ data: { variantId: v.id, delta: row.stock - old.stock, balanceAfter: row.stock, reason: 'adjustment', actorId: actor.id, note: 'Edited in product editor' } });
        keep.push(v.id);
      } else {
        const c = await tx.productVariant.create({ data: { ...row, productId: pid } });
        if (row.stock > 0) await tx.stockMovement.create({ data: { variantId: c.id, delta: row.stock, balanceAfter: row.stock, reason: 'initial', actorId: actor.id } });
        keep.push(c.id);
      }
    }
    const stale = await tx.productVariant.findMany({ where: { productId: pid, id: { notIn: keep } }, include: { _count: { select: { orderItems: true } } } });
    for (const s of stale) {
      if (s._count.orderItems) await tx.productVariant.update({ where: { id: s.id }, data: { isActive: false } });
      else await tx.productVariant.delete({ where: { id: s.id } });
    }

    // Images: diff by storageKey so existing rows keep ids; delete files for removed images after commit.
    const incoming = body.images || [];
    const keepKeys = incoming.map((x) => x.storageKey);
    await tx.productImage.deleteMany({ where: { productId: pid, storageKey: { notIn: keepKeys } } });
    for (const [i, im] of incoming.entries()) {
      const row = { url: im.url, storageKey: im.storageKey, alt: im.alt ? clip(im.alt, 160) : `${brand.name} ${data.name}`, width: im.width || null, height: im.height || null, sortOrder: i, isPrimary: i === 0 };
      const ex = await tx.productImage.findFirst({ where: { productId: pid, storageKey: im.storageKey } });
      if (ex) await tx.productImage.update({ where: { id: ex.id }, data: row }); else await tx.productImage.create({ data: { ...row, productId: pid } });
    }
    // Variant -> image links (by index of image in the incoming list)
    const imgRows = await tx.productImage.findMany({ where: { productId: pid } });
    for (const [i, v] of body.variants.entries()) {
      if (v.imageKey) { const im = imgRows.find((r) => r.storageKey === v.imageKey); if (im) await tx.productVariant.updateMany({ where: { productId: pid, sku: String(v.sku).trim().toUpperCase() }, data: { imageId: im.id } }); }
    }

    // Notes + relations are replaced wholesale (small sets)
    await tx.productNote.deleteMany({ where: { productId: pid } });
    for (const n of (body.notes || []).filter((x) => x.name?.trim())) await tx.productNote.upsert({
      where: { productId_noteId_layer: { productId: pid, noteId: await noteId(tx, n.name), layer: n.layer } }, update: {},
      create: { productId: pid, noteId: await noteId(tx, n.name), layer: n.layer },
    });
    await tx.productRelation.deleteMany({ where: { fromId: pid } });
    for (const r of (body.relations || []).filter((x) => x.toId && x.toId !== pid)) await tx.productRelation.create({ data: { fromId: pid, toId: r.toId, type: r.type } });

    await recomputeDerived(tx, pid);
    return product;
  });

  if (before) {
    const priceChanged = body.variants.some((v) => { const o = before.variants.find((x) => x.id === v.id); return o && (o.priceKobo !== Number(v.priceKobo) || (o.salePriceKobo ?? null) !== (v.salePriceKobo ? Number(v.salePriceKobo) : null)); });
    await audit({ actor, action: priceChanged ? 'product.price_changed' : 'product.updated', entity: 'Product', entityId: saved.id, diff: { name: saved.name, priceChanged }, req });
    const removed = before.images.filter((i) => !(body.images || []).some((x) => x.storageKey === i.storageKey));
    removed.forEach((i) => deleteImage(i.storageKey));
  } else await audit({ actor, action: 'product.created', entity: 'Product', entityId: saved.id, diff: { name: saved.name }, req });
  return getAdminProduct(saved.id);
};

export const setPublished = async (id, isActive, actor, req) => {
  const p = await prisma.product.update({ where: { id }, data: { isActive } });
  await audit({ actor, action: isActive ? 'product.published' : 'product.unpublished', entity: 'Product', entityId: id, req });
  return p;
};

export const softDelete = async (id, actor, req) => {
  await prisma.product.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
  await audit({ actor, action: 'product.deleted', entity: 'Product', entityId: id, req });
};

export const duplicateProduct = async (id, actor, req) => {
  const p = await getAdminProduct(id);
  const copy = await saveProduct(null, {
    ...p, name: `${p.name} (Copy)`, slug: undefined, isActive: false, isFeatured: false, isBestseller: false, isNewArrival: false, images: [],
    variants: p.variants.map((v) => ({ ...v, id: undefined, sku: `${v.sku}-COPY${Math.floor(Math.random() * 90 + 10)}`, imageKey: undefined })),
    relations: p.relations,
  }, actor, req);
  return copy;
};

/** Inventory: set or change stock for one variant. Never goes negative; every change is ledgered. */
export const adjustStock = async ({ variantId, mode, value, reason, actor, req }) => {
  const result = await prisma.$transaction(async (tx) => {
    const v = await tx.productVariant.findUnique({ where: { id: variantId } });
    if (!v) throw new AppError('Variant not found.', 404, 'NOT_FOUND');
    const next = mode === 'set' ? Number(value) : v.stock + Number(value);
    if (!Number.isInteger(next) || next < 0) throw new AppError('Stock cannot go below zero.', 422, 'NEGATIVE_STOCK');
    // Guarded write: only applies if nobody changed stock since we read it
    const r = await tx.productVariant.updateMany({ where: { id: variantId, stock: v.stock }, data: { stock: next } });
    if (r.count !== 1) throw new AppError('Stock changed while you were editing. Please try again.', 409, 'CONFLICT');
    await tx.stockMovement.create({ data: { variantId, delta: next - v.stock, balanceAfter: next, reason: 'adjustment', note: reason || null, actorId: actor.id } });
    await recomputeDerived(tx, v.productId);
    return { variantId, from: v.stock, to: next };
  });
  await audit({ actor, action: 'inventory.adjusted', entity: 'ProductVariant', entityId: variantId, diff: result, req });
  return result;
};

export const lowStock = async (threshold) =>
  prisma.$queryRaw`SELECT v.id, v.label, v.sku, v.stock, p.id AS "productId", p.name AS "productName", b.name AS "brandName"
    FROM "ProductVariant" v JOIN "Product" p ON p.id = v."productId" JOIN "Brand" b ON b.id = p."brandId"
    WHERE v."isActive" AND p."deletedAt" IS NULL AND v.stock <= COALESCE(v."lowStockAt", ${threshold})
    ORDER BY v.stock ASC, p.name ASC LIMIT 200`;
