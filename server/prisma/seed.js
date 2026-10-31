// Idempotent seed. Reference data always; demo data only when SEED_DEMO !== 'false'.
// Never truncates or resets anything. All demo rows are flagged isDemo so `npm run db:clear-demo` can remove them.
import crypto from 'node:crypto';
import argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const slug = (s) => String(s).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const kobo = (n) => n * 100;

const families = ['Woody', 'Floral', 'Citrus', 'Fresh', 'Oriental/Amber', 'Gourmand', 'Aromatic', 'Leather', 'Chypre', 'Aquatic'];
const brands = [
  ['Chanel'], ['Dior'], ['Tom Ford'], ['Yves Saint Laurent'], ['Versace'], ['Giorgio Armani'], ['Hugo Boss'], ['Jean Paul Gaultier'], ['Paco Rabanne'],
  ['Carolina Herrera'], ['Givenchy'], ['Lattafa', true], ['Maison Alhambra', true], ['Armaf', true], ['Afnan', true], ['Aramis'], ['Ralph Lauren'],
  ['Nivea'], ['Jergens'], ['Dove'], ['Gifted Scents Selection'],
];
const categories = ["Men's Fragrances", "Women's Fragrances", 'Unisex', 'Arabic Fragrances', 'Luxury/Designer', 'Gift Sets', 'Decants & Samples', 'Roll-Ons', 'Body Mists', 'Oil Perfumes', 'Scented Candles', 'Air Fresheners', 'Pocket-Sized Scents', 'Diffusers', 'Body Cream', 'Soaps', 'Scrubs'];

const zones = [
  { name: 'Lagos', states: ['Lagos'], feeKobo: kobo(3000), estimatedDays: '1-2 business days (DEMO)', method: 'DELIVERY', sortOrder: 1 },
  { name: 'Other Nigerian States', states: [], isFallback: true, feeKobo: kobo(5500), estimatedDays: '3-5 business days (DEMO)', method: 'DELIVERY', sortOrder: 2 },
  { name: 'Pickup', states: [], feeKobo: 0, estimatedDays: 'Ready when we confirm (DEMO)', method: 'PICKUP', sortOrder: 3 },
];

const D = 'DEMO listing - replace with the real product details before launch.';
// [brand, name, type, gender, family, concentration, notes[top,heart,base], longevity, sillage, occasions, sizes[[label,ml,priceNaira,stock]], flags]
const P = [
  ['Chanel', 'Bleu de Chanel', 'FRAGRANCE', 'MEN', 'Woody', 'EDP', [['Grapefruit', 'Lemon', 'Mint'], ['Ginger', 'Jasmine'], ['Cedar', 'Sandalwood', 'Incense']], 'LONG', 'STRONG', ['Office', 'Date Night', 'Formal'], [['50ml', 50, 135000, 8], ['100ml', 100, 195000, 5]], 'B'],
  ['Dior', 'Sauvage Eau de Toilette', 'FRAGRANCE', 'MEN', 'Aromatic', 'EDT', [['Bergamot', 'Pepper'], ['Lavender', 'Geranium'], ['Ambroxan', 'Cedar']], 'LONG', 'ENORMOUS', ['Everyday', 'Party', 'Date Night'], [['60ml', 60, 110000, 10], ['100ml', 100, 150000, 6], ['Decant 10ml', 10, 22000, 20]], 'BF'],
  ['Dior', "Miss Dior Eau de Parfum", 'FRAGRANCE', 'WOMEN', 'Floral', 'EDP', [['Mandarin', 'Bergamot'], ['Rose', 'Peony', 'Lily of the Valley'], ['Patchouli', 'Musk']], 'LONG', 'STRONG', ['Date Night', 'Wedding', 'Gift'], [['50ml', 50, 140000, 7], ['100ml', 100, 205000, 4]], 'BN'],
  ['Tom Ford', 'Tom Ford Noir', 'FRAGRANCE', 'MEN', 'Oriental/Amber', 'EDP', [['Bergamot', 'Pink Pepper'], ['Geranium', 'Rose'], ['Amber', 'Vanilla', 'Sandalwood']], 'VERY_LONG', 'STRONG', ['Evening', 'Date Night', 'Formal'], [['50ml', 50, 240000, 3], ['100ml', 100, 345000, 2]], 'F'],
  ['Yves Saint Laurent', 'YSL Y Eau de Parfum', 'FRAGRANCE', 'MEN', 'Aromatic', 'EDP', [['Apple', 'Ginger', 'Bergamot'], ['Sage', 'Geranium'], ['Cedar', 'Amberwood', 'Tonka']], 'LONG', 'STRONG', ['Office', 'Everyday', 'Party'], [['60ml', 60, 125000, 9], ['100ml', 100, 170000, 6]], ''],
  ['Paco Rabanne', '1 Million', 'FRAGRANCE', 'MEN', 'Oriental/Amber', 'EDT', [['Grapefruit', 'Blood Mandarin', 'Mint'], ['Cinnamon', 'Rose'], ['Leather', 'Amber', 'Patchouli']], 'LONG', 'ENORMOUS', ['Party', 'Evening'], [['50ml', 50, 85000, 12], ['100ml', 100, 120000, 8]], 'B'],
  ['Giorgio Armani', 'Acqua di Gio Profondo', 'FRAGRANCE', 'MEN', 'Aquatic', 'EDP', [['Sea Notes', 'Bergamot', 'Mandarin'], ['Rosemary', 'Lavender'], ['Musk', 'Patchouli']], 'LONG', 'MODERATE', ['Everyday', 'Office', 'Vacation'], [['75ml', 75, 115000, 7], ['125ml', 125, 160000, 5]], 'F'],
  ['Versace', 'Versace Dylan Blue', 'FRAGRANCE', 'MEN', 'Aromatic', 'EDT', [['Bergamot', 'Grapefruit', 'Fig Leaf'], ['Violet Leaf', 'Black Pepper'], ['Patchouli', 'Musk', 'Tonka']], 'LONG', 'STRONG', ['Everyday', 'Party'], [['50ml', 50, 75000, 11], ['100ml', 100, 105000, 7]], ''],
  ['Versace', 'Versace Bright Crystal', 'FRAGRANCE', 'WOMEN', 'Floral', 'EDT', [['Yuzu', 'Pomegranate', 'Frosted Accord'], ['Peony', 'Magnolia', 'Lotus'], ['Musk', 'Amber', 'Mahogany']], 'MODERATE', 'MODERATE', ['Everyday', 'Vacation', 'Gift'], [['50ml', 50, 70000, 9], ['90ml', 90, 95000, 6]], 'N'],
  ['Chanel', 'Chanel No. 5', 'FRAGRANCE', 'WOMEN', 'Floral', 'EDP', [['Aldehydes', 'Neroli', 'Ylang-Ylang'], ['Jasmine', 'Rose', 'Iris'], ['Vanilla', 'Sandalwood', 'Vetiver']], 'LONG', 'STRONG', ['Formal', 'Wedding', 'Gift'], [['50ml', 50, 175000, 4], ['100ml', 100, 260000, 3]], 'F'],
  ['Hugo Boss', 'Boss Bottled', 'FRAGRANCE', 'MEN', 'Woody', 'EDT', [['Apple', 'Bergamot', 'Plum'], ['Cinnamon', 'Geranium'], ['Sandalwood', 'Vetiver', 'Cedar']], 'MODERATE', 'MODERATE', ['Office', 'Everyday'], [['50ml', 50, 70000, 10], ['100ml', 100, 98000, 8]], ''],
  ['Jean Paul Gaultier', 'Le Male', 'FRAGRANCE', 'MEN', 'Oriental/Amber', 'EDT', [['Lavender', 'Mint', 'Bergamot'], ['Cinnamon', 'Orange Blossom'], ['Vanilla', 'Tonka', 'Sandalwood']], 'LONG', 'STRONG', ['Party', 'Date Night'], [['75ml', 75, 90000, 6], ['125ml', 125, 125000, 4]], ''],
  ['Carolina Herrera', 'Good Girl', 'FRAGRANCE', 'WOMEN', 'Gourmand', 'EDP', [['Almond', 'Coffee'], ['Jasmine', 'Tuberose'], ['Tonka', 'Cacao', 'Vanilla']], 'LONG', 'STRONG', ['Evening', 'Party', 'Date Night'], [['50ml', 50, 120000, 6], ['80ml', 80, 160000, 5]], 'B'],
  ['Givenchy', 'Givenchy Gentleman', 'FRAGRANCE', 'MEN', 'Woody', 'EDP', [['Pear', 'Pepper'], ['Iris', 'Lavender'], ['Vanilla', 'Patchouli', 'Leather']], 'LONG', 'MODERATE', ['Formal', 'Office'], [['60ml', 60, 98000, 5], ['100ml', 100, 135000, 4]], ''],
  ['Lattafa', 'Lattafa Khamrah', 'FRAGRANCE', 'UNISEX', 'Gourmand', 'EDP', [['Cinnamon', 'Nutmeg', 'Bergamot'], ['Dates', 'Praline'], ['Vanilla', 'Tonka', 'Amberwood']], 'VERY_LONG', 'STRONG', ['Evening', 'Gift', 'Party'], [['100ml', 100, 45000, 18], ['Decant 10ml', 10, 8000, 30]], 'BN'],
  ['Lattafa', 'Lattafa Asad', 'FRAGRANCE', 'MEN', 'Oriental/Amber', 'EDP', [['Black Pepper', 'Pineapple', 'Tobacco'], ['Coffee', 'Patchouli'], ['Vanilla', 'Amber', 'Dry Woods']], 'VERY_LONG', 'STRONG', ['Evening', 'Party'], [['100ml', 100, 40000, 14]], 'N'],
  ['Armaf', 'Club de Nuit Intense Man', 'FRAGRANCE', 'MEN', 'Citrus', 'EDT', [['Lemon', 'Pineapple', 'Bergamot'], ['Birch', 'Jasmine', 'Rose'], ['Musk', 'Ambergris', 'Vanilla']], 'VERY_LONG', 'ENORMOUS', ['Party', 'Evening', 'Everyday'], [['105ml', 105, 55000, 15]], 'BF'],
  ['Afnan', 'Afnan 9PM', 'FRAGRANCE', 'MEN', 'Gourmand', 'EDP', [['Apple', 'Cinnamon', 'Bergamot'], ['Lavender', 'Orange Blossom'], ['Vanilla', 'Tonka', 'Amber']], 'LONG', 'STRONG', ['Evening', 'Date Night'], [['100ml', 100, 48000, 10]], 'N'],
  ['Maison Alhambra', 'Maison Alhambra Oud Elixir', 'OIL_PERFUME', 'UNISEX', 'Oriental/Amber', 'OIL', [['Saffron'], ['Oud', 'Rose'], ['Amber', 'Musk']], 'VERY_LONG', 'MODERATE', ['Wedding', 'Gift', 'Formal'], [['12ml', 12, 18000, 20]], ''],
  ['Aramis', 'Aramis Classic', 'FRAGRANCE', 'MEN', 'Leather', 'EDT', [['Bergamot', 'Orange Blossom'], ['Jasmine', 'Patchouli'], ['Leather', 'Oakmoss', 'Vetiver']], 'LONG', 'MODERATE', ['Formal', 'Office'], [['60ml', 60, 65000, 5], ['110ml', 110, 90000, 3]], ''],
  ['Ralph Lauren', 'Polo Green', 'FRAGRANCE', 'MEN', 'Chypre', 'EDT', [['Pine', 'Mint', 'Basil'], ['Jasmine', 'Carnation'], ['Oakmoss', 'Leather', 'Amber']], 'LONG', 'STRONG', ['Everyday', 'Formal'], [['59ml', 59, 62000, 4], ['118ml', 118, 88000, 3]], ''],
  ['Gifted Scents Selection', 'Vanilla Cashmere Roll-On', 'ROLL_ON', 'WOMEN', 'Gourmand', 'OTHER', [[], [], []], 'MODERATE', 'INTIMATE', ['Everyday', 'Gift'], [['10ml', 10, 6500, 40]], 'N'],
  ['Gifted Scents Selection', 'Coconut Bloom Body Mist', 'BODY_MIST', 'WOMEN', 'Fresh', 'BODY_MIST', [[], [], []], 'LOW', 'MODERATE', ['Everyday', 'Vacation'], [['236ml', 236, 9500, 25]], 'B'],
  ['Gifted Scents Selection', 'Amber Glow Scented Candle', 'CANDLE', 'UNISEX', null, null, [[], [], []], null, null, ['Gift'], [['200g', 200, 14000, 18]], 'F'],
  ['Gifted Scents Selection', 'Fresh Linen Air Freshener', 'AIR_FRESHENER', 'UNISEX', null, null, [[], [], []], null, null, ['Everyday'], [['300ml', 300, 4500, 35]], ''],
  ['Gifted Scents Selection', 'Reed Diffuser - White Tea', 'DIFFUSER', 'UNISEX', null, null, [[], [], []], null, null, ['Gift'], [['100ml', 100, 12500, 15]], 'N'],
  ['Gifted Scents Selection', 'Pocket Scent Duo', 'POCKET_SCENT', 'UNISEX', 'Fresh', 'OTHER', [[], [], []], 'LOW', 'INTIMATE', ['Everyday', 'Vacation'], [['2 x 8ml', 16, 7500, 30]], ''],
  ['Nivea', 'Nivea Cherry Blossom Body Lotion', 'BODY_CREAM', 'WOMEN', null, null, [[], [], []], null, null, ['Everyday'], [['400ml', 400, 7800, 22]], ''],
  ['Jergens', 'Jergens Hydrating Body Lotion', 'BODY_CREAM', 'UNISEX', null, null, [[], [], []], null, null, ['Everyday'], [['496ml', 496, 9800, 3]], ''],
  ['Dove', 'Dove Beauty Bar', 'SOAP', 'UNISEX', null, null, [[], [], []], null, null, ['Everyday'], [['100g', 100, 1800, 60]], ''],
  ['Gifted Scents Selection', 'Brown Sugar Body Scrub', 'SCRUB', 'WOMEN', 'Gourmand', null, [[], [], []], null, null, ['Gift'], [['250g', 250, 8500, 0]], ''],
  ['Gifted Scents Selection', 'Signature Fragrance Gift Set', 'GIFT_SET', 'UNISEX', 'Floral', 'OTHER', [['Bergamot'], ['Rose'], ['Musk']], 'MODERATE', 'MODERATE', ['Gift', 'Wedding'], [['Set', null, 35000, 8]], 'F'],
];

const categoryFor = (p) => {
  const [brand, , type, gender] = p;
  const arabic = brands.find((b) => b[0] === brand)?.[1];
  const map = { ROLL_ON: 'Roll-Ons', BODY_MIST: 'Body Mists', OIL_PERFUME: 'Oil Perfumes', CANDLE: 'Scented Candles', AIR_FRESHENER: 'Air Fresheners', POCKET_SCENT: 'Pocket-Sized Scents', DIFFUSER: 'Diffusers', BODY_CREAM: 'Body Cream', SOAP: 'Soaps', SCRUB: 'Scrubs', GIFT_SET: 'Gift Sets', DECANT: 'Decants & Samples' };
  if (map[type]) return map[type];
  if (arabic) return 'Arabic Fragrances';
  return gender === 'MEN' ? "Men's Fragrances" : gender === 'WOMEN' ? "Women's Fragrances" : 'Unisex';
};

const DEMO_CUSTOMERS = [['Adaeze', 'Okafor', 'Lagos'], ['Tunde', 'Balogun', 'Lagos'], ['Zainab', 'Bello', 'Abuja (FCT)'], ['Chinedu', 'Eze', 'Rivers'], ['Folake', 'Adeyemi', 'Oyo']];
const DEMO_REVIEWS = [
  [0, 4, 'Compliments all day', 'Smells expensive and lasted from morning till night. Packaging was neat.'],
  [1, 5, 'My new signature', 'Strong projection, I get asked about it constantly.'],
  [2, 5, 'Lovely and feminine', 'Soft, elegant scent. Perfect for weddings and dinners.'],
  [14, 5, 'Unbelievable value', 'Sweet and cosy, lasts forever on clothes.'],
  [17, 4, 'Great for the price', 'Very long lasting. A bit loud in small rooms.'],
  [12, 4, 'Sweet and confident', 'Gourmand lovers will enjoy this. Got lots of compliments.'],
  [6, 4, 'Clean and fresh', 'Great for work and hot weather.'],
  [23, 5, 'Smells so good', 'Light, fruity, and I reapply through the day.'],
];

async function main() {
  for (const [i, name] of families.entries()) await prisma.fragranceFamily.upsert({ where: { slug: slug(name) }, update: {}, create: { name, slug: slug(name), sortOrder: i } });
  for (const [i, [name, isArabic]] of brands.entries()) await prisma.brand.upsert({ where: { slug: slug(name) }, update: {}, create: { name, slug: slug(name), isArabic: !!isArabic, sortOrder: i, isFeatured: i < 9 } });
  for (const [i, name] of categories.entries()) await prisma.category.upsert({ where: { slug: slug(name) }, update: {}, create: { name, slug: slug(name), sortOrder: i } });

  for (const z of zones) {
    const ex = await prisma.shippingZone.findFirst({ where: { name: z.name } });
    if (!ex) await prisma.shippingZone.create({ data: { ...z, isActive: true } });
    else if (!ex.isActive && ex.feeKobo === 0) await prisma.shippingZone.update({ where: { id: ex.id }, data: { ...z, isActive: true } }); // unconfigured -> demo defaults
  }

  const social = [['instagram', 'https://www.instagram.com/giftedscents23', 'giftedscents23'], ['tiktok', 'https://www.tiktok.com/@giftedscents.ng', 'giftedscents.ng']];
  for (const [i, [platform, url, handle]] of social.entries()) await prisma.socialLink.upsert({ where: { platform }, update: {}, create: { platform, url, handle, sortOrder: i } });
  await prisma.siteSetting.upsert({ where: { key: 'support.whatsapp' }, update: {}, create: { key: 'support.whatsapp', value: '2348055806394', group: 'support' } });
  await prisma.siteSetting.upsert({ where: { key: 'store.phone' }, update: {}, create: { key: 'store.phone', value: '08055806394', group: 'store' } });
  console.log('Reference data ready.');

  if (process.env.SEED_DEMO === 'false') return;

  const fam = Object.fromEntries((await prisma.fragranceFamily.findMany()).map((f) => [f.name, f.id]));
  const br = Object.fromEntries((await prisma.brand.findMany()).map((b) => [b.name, b.id]));
  const cat = Object.fromEntries((await prisma.category.findMany()).map((c) => [c.name, c.id]));
  const created = [];
  for (const [i, p] of P.entries()) {
    const [brand, name, type, gender, family, concentration, notes, longevity, sillage, occasions, sizes, flags] = p;
    const pslug = slug(`${brand} ${name}`);
    let row = await prisma.product.findUnique({ where: { slug: pslug }, include: { variants: true } });
    if (!row) {
      row = await prisma.product.create({
        data: {
          name, slug: pslug, type, brandId: br[brand], categoryId: cat[categoryFor(p)], familyId: family ? fam[family] : null, gender, concentration, longevity, sillage, occasions,
          shortDescription: `${brand} ${name}. ${D}`, description: `${D}\n\nThis sample entry shows how a product page looks with notes, sizes and stock. Replace it in Admin > Products.`,
          isFeatured: flags.includes('F'), isBestseller: flags.includes('B'), isNewArrival: flags.includes('N'), isDemo: true, soldCount: 40 - i,
          variants: { create: sizes.map(([label, ml, price, stock], j) => ({ label, sizeMl: ml, sku: `GS-${slug(brand).slice(0, 3).toUpperCase()}${String(i + 1).padStart(2, '0')}-${j + 1}`, priceKobo: kobo(price), salePriceKobo: flags.includes('N') && j === 0 ? Math.round(kobo(price) * 0.9) : null, stock, isDefault: j === 0, sortOrder: j })) },
        },
        include: { variants: true },
      });
      for (const [li, layer] of ['TOP', 'HEART', 'BASE'].entries()) for (const n of notes[li]) {
        const note = await prisma.fragranceNote.upsert({ where: { slug: slug(n) }, update: {}, create: { name: n, slug: slug(n) } });
        await prisma.productNote.create({ data: { productId: row.id, noteId: note.id, layer } }).catch(() => {});
      }
      const min = row.variants.filter((v) => v.stock > 0).map((v) => v.salePriceKobo ?? v.priceKobo);
      await prisma.product.update({ where: { id: row.id }, data: { minPriceKobo: min.length ? Math.min(...min) : Math.min(...row.variants.map((v) => v.priceKobo)), hasDiscount: row.variants.some((v) => v.salePriceKobo), inStock: min.length > 0 } });
    }
    created.push(row);
  }
  // product relationships (Armaf CDNIM is an independent product; the note makes that explicit in the UI)
  const bySlug = Object.fromEntries(created.map((c) => [c.slug, c]));
  const rel = async (a, b, type) => { if (bySlug[a] && bySlug[b]) await prisma.productRelation.upsert({ where: { fromId_toId_type: { fromId: bySlug[a].id, toId: bySlug[b].id, type } }, update: {}, create: { fromId: bySlug[a].id, toId: bySlug[b].id, type } }); };
  await rel('dior-sauvage-eau-de-toilette', 'versace-versace-dylan-blue', 'SIMILAR_PROFILE');
  await rel('chanel-bleu-de-chanel', 'givenchy-givenchy-gentleman', 'SIMILAR_PROFILE');
  await rel('tom-ford-tom-ford-noir', 'lattafa-lattafa-asad', 'ALTERNATIVE');
  await rel('chanel-bleu-de-chanel', 'gifted-scents-selection-amber-glow-scented-candle', 'COMPLEMENTARY');

  if ((await prisma.order.count({ where: { isDemo: true } })) > 0) { console.log('Demo orders already present - skipping demo customers/orders/reviews.'); return; }

  const customers = [];
  for (const [first, last] of DEMO_CUSTOMERS) {
    const email = `${first}.${last}@demo.giftedscents.invalid`.toLowerCase();
    customers.push(await prisma.user.upsert({ where: { email }, update: {}, create: { email, firstName: first, lastName: last, role: 'CUSTOMER', isDemo: true, passwordHash: await argon2.hash(crypto.randomBytes(24).toString('hex'), { type: argon2.argon2id }) } }));
  }
  const states = DEMO_CUSTOMERS.map((c) => c[2]);
  const statuses = ['DELIVERED', 'DELIVERED', 'SHIPPED', 'PROCESSING', 'PAID', 'DELIVERED', 'PAID', 'CANCELLED', 'DELIVERED', 'PENDING', 'DELIVERED', 'READY_FOR_DISPATCH'];
  for (let n = 0; n < statuses.length; n++) {
    const c = customers[n % customers.length]; const st = statuses[n];
    const picks = [created[(n * 3) % created.length], created[(n * 5 + 1) % created.length]];
    const items = picks.map((p) => ({ p, v: p.variants[0], qty: 1 + (n % 2) }));
    const subtotal = items.reduce((s, i) => s + (i.v.salePriceKobo ?? i.v.priceKobo) * i.qty, 0);
    const ship = kobo(3000); const paid = !['PENDING', 'CANCELLED'].includes(st);
    const createdAt = new Date(Date.now() - (30 - n * 2.4) * 86400_000);
    await prisma.order.create({
      data: {
        orderNumber: `GS-DEMO-${String(n + 1).padStart(3, '0')}`, userId: c.id, email: c.email, customerName: `${c.firstName} ${c.lastName}`, phone: '08000000000', state: states[n % states.length], lga: 'Demo LGA', addressLine: '12 Demo Street (sample data)',
        subtotalKobo: subtotal, shippingKobo: ship, totalKobo: subtotal + ship, status: st, paymentStatus: paid ? 'SUCCESS' : 'PENDING', stockDeducted: paid, isDemo: true, createdAt,
        items: { create: items.map((i) => ({ variantId: i.v.id, productName: i.p.name, brandName: Object.keys(br).find((k) => br[k] === i.p.brandId) || '', variantLabel: i.v.label, sku: i.v.sku, unitPriceKobo: i.v.salePriceKobo ?? i.v.priceKobo, quantity: i.qty, lineTotalKobo: (i.v.salePriceKobo ?? i.v.priceKobo) * i.qty })) },
        history: { create: [{ toStatus: 'PENDING', note: 'Demo order', createdAt }, ...(paid ? [{ fromStatus: 'PENDING', toStatus: st, note: 'Demo status', createdAt }] : [])] },
        ...(paid ? { payments: { create: { reference: `DEMO-REF-${n + 1}`, gateway: 'demo', amountKobo: subtotal + ship, status: 'SUCCESS', paidAt: createdAt } } } : {}),
      },
    });
  }
  for (const [pi, ci, title, comment] of [0, 1, 2, 3, 4, 5, 6, 7].map((i) => [DEMO_REVIEWS[i][0], i % customers.length, DEMO_REVIEWS[i][2], DEMO_REVIEWS[i][3]])) {
    const idx = DEMO_REVIEWS.findIndex((r) => r[2] === title); const rating = DEMO_REVIEWS[idx][1]; const c = customers[ci]; const prod = created[pi % created.length];
    await prisma.review.upsert({ where: { productId_userId: { productId: prod.id, userId: c.id } }, update: {}, create: { productId: prod.id, userId: c.id, authorName: `${c.firstName} ${c.lastName[0]}.`, rating, title, comment, verifiedPurchase: false, status: 'APPROVED', showOnHomepage: true } });
    const agg = await prisma.review.aggregate({ where: { productId: prod.id, status: 'APPROVED' }, _avg: { rating: true }, _count: true });
    await prisma.product.update({ where: { id: prod.id }, data: { ratingAvg: Number(agg._avg.rating.toFixed(2)), ratingCount: agg._count } });
  }
  console.log(`Demo data ready: ${created.length} products, ${customers.length} customers, ${statuses.length} orders.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
