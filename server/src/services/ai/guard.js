// Anti-hallucination guards. Pure functions so they are easy to test.

/** Pulls every naira amount out of free text, e.g. "₦120,000", "N85000", "NGN 50,000" -> kobo[] */
export const extractAmountsKobo = (text) => {
  const out = [];
  for (const m of String(text).matchAll(/(?:₦|NGN|N)\s?(\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?/gi)) out.push(Number(m[1].replace(/,/g, '')) * 100);
  return out;
};

/** Every amount the reply mentions must be a real price (or the shop's own numbers) from the retrieved context. */
export const amountsAreGrounded = (reply, allowedKobo) => {
  const allowed = new Set(allowedKobo);
  return extractAmountsKobo(reply).every((a) => allowed.has(a));
};

/** Keep only product ids that were actually retrieved from the database for this turn. */
export const filterProductIds = (ids, retrievedIds) => {
  const ok = new Set(retrievedIds);
  return [...new Set((Array.isArray(ids) ? ids : []).filter((id) => typeof id === 'string' && ok.has(id)))];
};

export const parseModelJson = (raw) => {
  const text = String(raw || '').replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const start = text.indexOf('{'); const end = text.lastIndexOf('}');
  if (start < 0 || end < 0) return null;
  try { return JSON.parse(text.slice(start, end + 1)); } catch { return null; }
};

const HANDOFF = /\b(refund|charge ?back|dispute|complain|complaint|scam|fraud|fake|damaged|wrong item|missing|not (yet )?(received|delivered|arrived)|where is my (order|package)|track(ing)? (my )?order|payment (failed|problem|issue)|debited|cancel(l)?(ed)? my order|account (problem|issue|locked)|human|agent|real person|speak to (someone|a person)|talk to (someone|a person))\b/i;
export const needsHuman = (message) => HANDOFF.test(String(message || ''));
