// The ONLY place prices are formatted. Inputs are integer kobo from the API.
const fmt = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 });
export const formatNaira = (kobo) => fmt.format(Number(kobo || 0) / 100);
export const nairaToKobo = (n) => Math.round(Number(n || 0) * 100);
export const koboToNaira = (k) => Number(k || 0) / 100;
export const discountPercent = (price, compareAt) => (compareAt && compareAt > price ? Math.round(((compareAt - price) / compareAt) * 100) : 0);
