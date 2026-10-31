import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { cardsByIds, cardSelect, withCards } from './catalog.service.js';
import { getSetting } from './settings.service.js';
import { paginate, pageMeta } from '../utils/pagination.js';

const clean = (q) => String(q || '').trim().replace(/\s+/g, ' ').slice(0, 80);

/** Ranked product ids using PostgreSQL pg_trgm (typo tolerance) + ILIKE across name, brand, SKU, family, notes, category. */
export const searchIds = async (raw, { limit = 24, offset = 0 } = {}) => {
  const q = clean(raw);
  if (q.length < 2) return { ids: [], total: 0 };
  const like = `%${q.replace(/[%_\\]/g, '\\$&')}%`;
  const rows = await prisma.$queryRaw(Prisma.sql`
    WITH scored AS (
      SELECT p.id,
        ( GREATEST(similarity(p.name, ${q}), word_similarity(${q}, p.name), similarity(b.name, ${q}) * 0.9)
          + CASE WHEN p.name ILIKE ${like} THEN 0.6 ELSE 0 END
          + CASE WHEN b.name ILIKE ${like} THEN 0.35 ELSE 0 END
          + CASE WHEN EXISTS (SELECT 1 FROM "ProductVariant" v WHERE v."productId" = p.id AND v.sku ILIKE ${like}) THEN 0.8 ELSE 0 END
          + CASE WHEN f.name ILIKE ${like} THEN 0.25 ELSE 0 END
          + CASE WHEN c.name ILIKE ${like} THEN 0.2 ELSE 0 END
          + CASE WHEN EXISTS (SELECT 1 FROM "ProductNote" pn JOIN "FragranceNote" n ON n.id = pn."noteId"
                              WHERE pn."productId" = p.id AND (n.name ILIKE ${like} OR word_similarity(${q}, n.name) > 0.6)) THEN 0.3 ELSE 0 END
        ) AS score
      FROM "Product" p
      JOIN "Brand" b ON b.id = p."brandId"
      LEFT JOIN "FragranceFamily" f ON f.id = p."familyId"
      LEFT JOIN "Category" c ON c.id = p."categoryId"
      WHERE p."isActive" = true AND p."deletedAt" IS NULL
    )
    SELECT id, score, COUNT(*) OVER() AS total FROM scored
    WHERE score >= 0.3
    ORDER BY score DESC, id
    LIMIT ${limit} OFFSET ${offset}`);
  return { ids: rows.map((r) => r.id), total: rows.length ? Number(rows[0].total) : 0 };
};

export const searchProducts = async (query) => {
  const pg = paginate(query, { defaultLimit: 24, maxLimit: 48 });
  const { ids, total } = await searchIds(query.q, { limit: pg.take, offset: pg.skip });
  const items = await cardsByIds(ids);
  const suggestions = items.length ? [] : await withCards(await prisma.product.findMany({
    where: { isActive: true, deletedAt: null, isBestseller: true }, select: cardSelect, take: 8, orderBy: { soldCount: 'desc' } }));
  return { items, meta: pageMeta(total, pg), suggestions };
};

export const suggest = async (raw) => {
  const q = clean(raw);
  if (q.length < 2) return { products: [], brands: [], categories: [], notes: [] };
  const like = { contains: q, mode: 'insensitive' };
  const [{ ids }, brands, categories, notes] = await Promise.all([
    searchIds(q, { limit: 6 }),
    prisma.brand.findMany({ where: { isActive: true, name: like }, select: { name: true, slug: true }, take: 4 }),
    prisma.category.findMany({ where: { isActive: true, name: like }, select: { name: true, slug: true }, take: 4 }),
    prisma.fragranceNote.findMany({ where: { name: like }, select: { name: true, slug: true }, take: 4 }),
  ]);
  const cards = await cardsByIds(ids);
  return {
    products: cards.map((c) => ({ id: c.id, name: c.name, slug: c.slug, brand: c.brand.name, priceKobo: c.priceKobo, inStock: c.inStock, image: c.image })),
    brands, categories, notes,
  };
};

export const popularSearches = async () => (await getSetting('search.popular')) || [];
