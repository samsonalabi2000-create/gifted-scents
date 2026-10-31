import { prisma } from '../config/prisma.js';
import { cardSelect, withCards } from './catalog.service.js';
import { nairaToKobo } from '../utils/money.js';
import { searchIds } from './search.service.js';

const RANK = { LOW: 1, MODERATE: 2, LONG: 3, VERY_LONG: 4, INTIMATE: 1, STRONG: 3, ENORMOUS: 4 };

/**
 * Pure scoring: candidate = { gender, familySlug, noteSlugs[], occasions[], longevity, sillage, priceKobo, isArabic, inStock }.
 * Returns { score, reasons[], excluded }. Reasons are generated only from matches that really happened.
 */
export const scoreCandidate = (c, a) => {
  const reasons = []; let score = 0;
  if (!c.inStock) return { score: 0, reasons, excluded: true };
  if ((a.avoidNotes || []).some((n) => c.noteSlugs.includes(n))) return { score: 0, reasons, excluded: true };
  if (a.budgetMaxKobo && c.priceKobo > a.budgetMaxKobo * 1.1) return { score: 0, reasons, excluded: true };
  if (a.origin === 'arabic' && !c.isArabic) return { score: 0, reasons, excluded: true };
  if (a.origin === 'designer' && c.isArabic) return { score: 0, reasons, excluded: true };

  if (a.gender && a.gender !== 'any') {
    if (c.gender === a.gender) { score += 3; reasons.push(`Made for ${a.gender === 'men' ? 'men' : a.gender === 'women' ? 'women' : 'everyone'}`); }
    else if (c.gender === 'unisex') { score += 1.5; reasons.push('A unisex scent'); }
    else return { score: 0, reasons, excluded: true };
  }
  if (a.families?.includes(c.familySlug)) { score += 3; reasons.push(`Matches your preferred ${c.familyName} family`); }
  const liked = (a.likedNotes || []).filter((n) => c.noteSlugs.includes(n));
  if (liked.length) { score += Math.min(liked.length, 3) * 1.5; reasons.push(`Contains notes you love: ${liked.map((n) => c.noteNames[n]).join(', ')}`); }
  const occ = (a.occasions || []).filter((o) => c.occasions.map((x) => x.toLowerCase()).includes(o.toLowerCase()));
  if (occ.length) { score += 2; reasons.push(`Great for ${occ.join(' and ').toLowerCase()}`); }
  if (a.longevity && c.longevity && RANK[c.longevity] >= RANK[a.longevity.toUpperCase()]) { score += 1.5; reasons.push('Lasts as long as you want'); }
  if (a.sillage && c.sillage && RANK[c.sillage] >= RANK[a.sillage.toUpperCase()]) { score += 1.5; reasons.push('Projects the way you like'); }
  if (a.budgetMaxKobo && c.priceKobo <= a.budgetMaxKobo && c.priceKobo >= (a.budgetMinKobo || 0)) { score += 2; reasons.push('Within your budget'); }
  if (a.similarFamilies?.includes(c.familySlug)) { score += 1.5; reasons.push('Similar in style to fragrances you already enjoy'); }
  return { score, reasons, excluded: false };
};

export const recommend = async (raw) => {
  const answers = {
    gender: raw.gender || 'any', occasions: raw.occasions || [], families: raw.families || [], likedNotes: raw.likedNotes || [], avoidNotes: raw.avoidNotes || [],
    longevity: raw.longevity, sillage: raw.sillage, origin: raw.origin || 'any',
    budgetMinKobo: raw.budgetMin ? nairaToKobo(raw.budgetMin) : 0, budgetMaxKobo: raw.budgetMax ? nairaToKobo(raw.budgetMax) : 0,
  };
  // "Fragrances I already enjoy": find them in OUR catalog and borrow their families as a hint.
  const similarFamilies = new Set();
  for (const name of (raw.likedFragrances || []).slice(0, 5)) {
    const { ids } = await searchIds(name, { limit: 1 });
    if (ids[0]) { const p = await prisma.product.findUnique({ where: { id: ids[0] }, select: { family: { select: { slug: true } } } }); if (p?.family) similarFamilies.add(p.family.slug); }
  }
  answers.similarFamilies = [...similarFamilies];

  const rows = await prisma.product.findMany({
    where: { isActive: true, deletedAt: null, type: { in: ['FRAGRANCE', 'OIL_PERFUME', 'GIFT_SET'] }, inStock: true },
    select: { ...cardSelect, longevity: true, sillage: true, occasions: true, brand: { select: { name: true, slug: true, isArabic: true } }, notes: { select: { note: { select: { slug: true, name: true } } } } },
    take: 400,
  });
  const cards = await withCards(rows);
  const byId = new Map(cards.map((c) => [c.id, c]));
  const scored = rows.map((r) => {
    const noteNames = Object.fromEntries(r.notes.map((n) => [n.note.slug, n.note.name]));
    const res = scoreCandidate({
      gender: r.gender.toLowerCase(), familySlug: r.family?.slug, familyName: r.family?.name, noteSlugs: r.notes.map((n) => n.note.slug), noteNames,
      occasions: r.occasions, longevity: r.longevity, sillage: r.sillage, priceKobo: byId.get(r.id).priceKobo, isArabic: r.brand.isArabic, inStock: byId.get(r.id).inStock,
    }, answers);
    return { card: byId.get(r.id), ...res, notes: r.notes.map((n) => n.note.name).slice(0, 6) };
  }).filter((s) => !s.excluded).sort((a, b) => b.score - a.score || b.card.ratingAvg - a.card.ratingAvg);

  const top = scored.slice(0, 6);
  return { results: top.map((s) => ({ product: s.card, notes: s.notes, reasons: s.reasons.length ? s.reasons : ['A popular pick from our collection'], score: Number(s.score.toFixed(1)) })), matched: scored.length };
};
