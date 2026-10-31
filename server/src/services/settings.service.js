import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';

const PLACEHOLDER = (what) => `[PLACEHOLDER] ${what} - replace this text in Admin > Settings before launch.`;

/** Every editable setting, its group and its safe default. Anything the client must supply is a visible placeholder or null. */
export const SETTING_DEFS = {
  'store.name': { group: 'store', def: 'Gifted Scents' },
  'store.tagline': { group: 'store', def: 'Your Scent. Your Story. Your Gift.' },
  'store.tagline2': { group: 'store', def: 'Spray Happiness. Share Confidence.' },
  'store.logoUrl': { group: 'store', def: null },
  'store.phone': { group: 'store', def: '08055806394' },
  'store.email': { group: 'store', def: null },
  'store.address': { group: 'store', def: null },
  'store.hours': { group: 'store', def: null },
  'support.whatsapp': { group: 'support', def: '2348055806394' },
  'support.email': { group: 'support', def: null },
  'support.availability': { group: 'support', def: null },
  'social.instagram': { group: 'social', def: 'https://www.instagram.com/giftedscents23' },
  'social.facebook': { group: 'social', def: null },
  'social.tiktok': { group: 'social', def: 'https://www.tiktok.com/@giftedscents.ng' },
  'social.x': { group: 'social', def: null },
  'social.youtube': { group: 'social', def: null },
  'website.announcementEnabled': { group: 'website', def: true },
  'website.announcement': { group: 'website', def: 'Authentic luxury perfumes, delivered to your door.' },
  'website.hero': { group: 'website', def: {
    headline: 'Your Scent. Your Story. Your Gift.',
    subhead: 'Authentic designer and premium fragrances, curated for every mood and moment.',
    imageUrl: null, ctaPrimary: 'Shop Fragrances', ctaSecondary: 'Find Your Scent',
  } },
  'website.footerText': { group: 'website', def: 'Spray Happiness. Share Confidence.' },
  'website.seoTitle': { group: 'website', def: 'Gifted Scents | Authentic Luxury Perfumes in Nigeria' },
  'website.seoDescription': { group: 'website', def: 'Shop designer, premium and Arabic fragrances, body mists, candles and more from Gifted Scents. Delivery across Nigeria.' },
  'website.faq': { group: 'website', def: [
    { q: 'Are your perfumes original?', a: PLACEHOLDER('Authenticity statement supplied by the business') },
    { q: 'How long does delivery take?', a: PLACEHOLDER('Delivery times') },
    { q: 'Can I return a product?', a: PLACEHOLDER('Returns summary') },
  ] },
  'website.shippingInfo': { group: 'website', def: PLACEHOLDER('Shipping policy text') },
  'website.about': { group: 'website', def: PLACEHOLDER('About Gifted Scents story') },
  'legal.privacy': { group: 'legal', def: PLACEHOLDER('Privacy Policy') },
  'legal.terms': { group: 'legal', def: PLACEHOLDER('Terms & Conditions') },
  'legal.returns': { group: 'legal', def: PLACEHOLDER('Returns / Refund Policy') },
  'legal.cookies': { group: 'legal', def: PLACEHOLDER('Cookie / Tracking Notice') },
  'ai.enabled': { group: 'ai', def: true },
  'ai.name': { group: 'ai', def: 'Gifted Scents Assistant' },
  'ai.greeting': { group: 'ai', def: 'Hi! I can help you find a fragrance, compare scents or answer questions about delivery and payment.' },
  'inventory.lowStockThreshold': { group: 'store', def: 5 },
  'search.popular': { group: 'website', def: ['Sauvage', 'Bleu de Chanel', 'Body mist', 'Arabic oud'] },
  'analytics.gaId': { group: 'analytics', def: null },
  'analytics.metaPixelId': { group: 'analytics', def: null },
  'analytics.searchConsoleToken': { group: 'analytics', def: null },
};

let cache = null; let cacheAt = 0;
const TTL = 20_000;

export const invalidateSettings = () => { cache = null; };

export const getAllSettings = async () => {
  if (cache && Date.now() - cacheAt < TTL) return cache;
  const rows = await prisma.siteSetting.findMany();
  const out = {};
  for (const [k, d] of Object.entries(SETTING_DEFS)) out[k] = d.def;
  for (const r of rows) if (r.key in SETTING_DEFS || r.key.startsWith('custom.')) out[r.key] = r.value;
  // env fallback so the WhatsApp number can be supplied at deploy time too
  if (!out['support.whatsapp'] && env.whatsappNumber) out['support.whatsapp'] = env.whatsappNumber;
  cache = out; cacheAt = Date.now();
  return out;
};

export const getSetting = async (key) => (await getAllSettings())[key];

/** Settings are all non-secret (secrets live in env) so the whole map is safe to expose publicly. */
export const getPublicSettings = async () => {
  const all = await getAllSettings();
  return { ...all, 'payments.paystackPublicKey': env.paystack.publicKey || null, 'payments.enabled': Boolean(env.paystack.secretKey) };
};

export const setSettings = async (updates) => {
  const keys = Object.keys(updates).filter((k) => k in SETTING_DEFS);
  await prisma.$transaction(keys.map((key) => prisma.siteSetting.upsert({
    where: { key }, update: { value: updates[key] ?? null }, create: { key, value: updates[key] ?? null, group: SETTING_DEFS[key].group },
  })));
  invalidateSettings();
  return keys;
};
