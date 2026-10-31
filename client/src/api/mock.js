// DEV-ONLY mock for public browse endpoints so the UI can be styled without a server. Never used in production builds.
const brand = (name) => ({ name, slug: name.toLowerCase().replace(/\W+/g, '-') });
const mk = (i, name, b, price, o = {}) => ({ id: `mock-${i}`, name, slug: `${b.toLowerCase().replace(/\W+/g, '-')}-${name.toLowerCase().replace(/\W+/g, '-')}`, brand: brand(b), family: { name: 'Woody', slug: 'woody' }, image: null, priceKobo: price * 100, compareAtKobo: null, inStock: true, lowStock: false, isBestseller: i % 3 === 0, isNewArrival: i % 4 === 0, onSale: false, ratingAvg: 4.5, ratingCount: 12, hasMultipleSizes: true, defaultVariantId: `mock-v-${i}`, variants: [{ id: `mock-v-${i}`, label: '100ml', priceKobo: price * 100, stock: 5 }], ...o });
const items = [mk(1, 'Bleu de Chanel', 'Chanel', 195000), mk(2, 'Sauvage EDT', 'Dior', 150000), mk(3, "Miss Dior EDP", 'Dior', 205000), mk(4, 'Khamrah', 'Lattafa', 45000), mk(5, 'Dylan Blue', 'Versace', 105000), mk(6, 'Club de Nuit Intense', 'Armaf', 55000, { inStock: false }), mk(7, 'Good Girl', 'Carolina Herrera', 160000), mk(8, '1 Million', 'Paco Rabanne', 120000)];
export const mockGet = (url) => {
  const ok = (data) => ({ data: { success: true, data } });
  if (url.startsWith('/products/facets')) return ok({ brands: [], categories: [], families: [], notes: [], sizes: [], price: { minKobo: 0, maxKobo: 0 } });
  if (url.startsWith('/products')) return ok({ items, meta: { total: items.length, page: 1, limit: 24, pages: 1 } });
  if (url.startsWith('/settings/public')) return ok({});
  if (url.startsWith('/reviews')) return ok([]);
  return ok([]);
};
