// Money is always integer kobo inside the system. Convert only at the edges.
export const nairaToKobo = (n) => Math.round(Number(n) * 100);
export const koboToNaira = (k) => Number(k) / 100;
export const formatNaira = (kobo) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(Number(kobo) / 100);
// effective unit price: the sale price only counts when it is genuinely lower
export const effectivePrice = (v) => (v.salePriceKobo != null && v.salePriceKobo < v.priceKobo ? v.salePriceKobo : v.priceKobo);
