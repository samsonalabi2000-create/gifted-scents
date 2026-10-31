import { prisma } from '../../config/prisma.js';
import { cardSelect, withCards } from '../catalog.service.js';
import { searchIds } from '../search.service.js';
import { getAllSettings } from '../settings.service.js';
import { listActiveZones } from '../shipping.service.js';
import { formatNaira } from '../../utils/money.js';

/** "under ₦50,000", "N80000", "NGN 120k", "50k" -> kobo. Plain words like "in 2025" are NOT treated as prices. */
export const parseBudgetKobo = (text) => {
  const t = String(text).toLowerCase();
  const m = t.match(/(?:₦|\bngn\s?|\bn(?=\d))\s?(\d[\d,]*)\s?(k|m)?\b/) || t.match(/\b(\d[\d,]*)\s?(k|m)\b/);
  if (!m) return null;
  let n = Number(String(m[1]).replace(/,/g, ''));
  if (m[2] === 'k') n *= 1000;
  if (m[2] === 'm') n *= 1_000_000;
  return n >= 1000 ? n * 100 : null;
};

/** Retrieves ONLY what this question needs: matching products + store facts. The model never sees the whole database. */
export const retrieveContext = async (message, history = []) => {
  const text = `${history.filter((h) => h.role === 'user').slice(-2).map((h) => h.content).join(' ')} ${message}`;
  const lower = text.toLowerCase();
  const [families, notes, brands] = await Promise.all([
    prisma.fragranceFamily.findMany({ select: { id: true, name: true } }),
    prisma.fragranceNote.findMany({ select: { id: true, name: true } }),
    prisma.brand.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
  ]);
  const hit = (list) => list.filter((x) => lower.includes(x.name.toLowerCase()));
  const famHits = hit(families); const noteHits = hit(notes); const brandHits = hit(brands);
  const budget = parseBudgetKobo(text);
  const gender = /\b(women|woman|her|ladies|female|girlfriend|wife|mum|mother)\b/.test(lower) ? 'WOMEN' : /\b(men|man|him|male|boyfriend|husband|dad|father)\b/.test(lower) ? 'MEN' : null;

  const idSet = new Set();
  const { ids: textIds } = await searchIds(message, { limit: 6 });
  textIds.forEach((i) => idSet.add(i));

  const where = {
    isActive: true, deletedAt: null,
    ...(gender ? { gender: { in: [gender, 'UNISEX'] } } : {}),
    ...(budget ? { minPriceKobo: { lte: budget } } : {}),
    OR: [
      ...(famHits.length ? [{ familyId: { in: famHits.map((f) => f.id) } }] : []),
      ...(noteHits.length ? [{ notes: { some: { noteId: { in: noteHits.map((n) => n.id) } } } }] : []),
      ...(brandHits.length ? [{ brandId: { in: brandHits.map((b) => b.id) } }] : []),
      ...(!famHits.length && !noteHits.length && !brandHits.length ? [{ isBestseller: true }, { isFeatured: true }] : []),
    ],
  };
  const extra = await prisma.product.findMany({ where, select: { id: true }, orderBy: [{ isBestseller: 'desc' }, { soldCount: 'desc' }], take: 8 });
  extra.forEach((e) => idSet.add(e.id));

  const rows = await prisma.product.findMany({
    where: { id: { in: [...idSet] }, isActive: true, deletedAt: null },
    select: { ...cardSelect, shortDescription: true, longevity: true, sillage: true, occasions: true, notes: { select: { layer: true, note: { select: { name: true } } } } },
  });
  const cards = await withCards(rows);
  const products = cards.slice(0, 8).map((c) => {
    const r = rows.find((x) => x.id === c.id);
    const layer = (L) => r.notes.filter((n) => n.layer === L).map((n) => n.note.name);
    return {
      id: c.id, name: c.name, brand: c.brand.name, type: c.type, gender: c.gender, family: c.family?.name || null,
      priceFrom: formatNaira(c.priceKobo), priceFromKobo: c.priceKobo, inStock: c.inStock,
      sizes: c.variants.map((v) => ({ label: v.label, price: formatNaira(v.priceKobo), priceKobo: v.priceKobo, inStock: v.stock > 0 })),
      notes: { top: layer('TOP'), heart: layer('HEART'), base: layer('BASE') }, longevity: r.longevity, sillage: r.sillage, occasions: r.occasions,
      summary: r.shortDescription,
    };
  });

  const s = await getAllSettings(); const zones = await listActiveZones();
  const facts = {
    storeName: s['store.name'], phone: s['store.phone'], whatsapp: s['support.whatsapp'], email: s['support.email'] || s['store.email'],
    address: s['store.address'], hours: s['store.hours'], supportAvailability: s['support.availability'],
    delivery: zones.map((z) => ({ zone: z.name, method: z.method, fee: z.feeKobo === 0 ? 'Free' : formatNaira(z.feeKobo), freeAbove: z.freeAboveKobo ? formatNaira(z.freeAboveKobo) : null, estimate: z.estimatedDays })),
    payment: 'Secure online payment through Paystack (NGN).',
    returnsPolicy: String(s['legal.returns']).startsWith('[PLACEHOLDER]') ? null : s['legal.returns'],
  };
  return { products, facts, allowedAmountsKobo: [...products.flatMap((p) => [p.priceFromKobo, ...p.sizes.map((x) => x.priceKobo)]), ...zones.flatMap((z) => [z.feeKobo, z.freeAboveKobo].filter((x) => x != null))], budgetKobo: budget };
};
