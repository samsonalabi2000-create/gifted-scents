// React 19 hoists <title>, <meta> and <link> into <head> automatically; no helmet dependency needed.
const SITE = (import.meta.env.VITE_SITE_URL || (typeof location !== 'undefined' ? location.origin : '')).replace(/\/$/, '');
export const absUrl = (p = '') => (p.startsWith('http') ? p : `${SITE}${p}`);

export function Seo({ title, description, path, image, type = 'website', noindex, jsonLd }) {
  const url = absUrl(path ?? (typeof location !== 'undefined' ? location.pathname : '/'));
  const img = image ? absUrl(image) : absUrl('/og-image.jpg');
  const ld = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];
  return (
    <>
      <title>{title}</title>
      {description && <meta name="description" content={description} />}
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}
      <meta property="og:type" content={type} /><meta property="og:title" content={title} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:url" content={url} /><meta property="og:image" content={img} /><meta property="og:locale" content="en_NG" />
      <meta name="twitter:card" content="summary_large_image" /><meta name="twitter:title" content={title} />
      {description && <meta name="twitter:description" content={description} />}<meta name="twitter:image" content={img} />
      {ld.map((o, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(o).replace(/</g, '\\u003c') }} />)}
    </>
  );
}

export const breadcrumbLd = (crumbs) => ({
  '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: absUrl(c.path) })),
});
export const orgLd = (s) => ({
  '@context': 'https://schema.org', '@type': 'Organization', name: s['store.name'] || 'Gifted Scents', url: SITE, logo: absUrl('/logo-512.png'),
  sameAs: ['instagram', 'facebook', 'tiktok', 'x', 'youtube'].map((k) => s[`social.${k}`]).filter(Boolean),
  ...(s['store.phone'] ? { telephone: s['store.phone'] } : {}),
});
export const websiteLd = (s) => ({
  '@context': 'https://schema.org', '@type': 'WebSite', name: s['store.name'] || 'Gifted Scents', url: SITE,
  potentialAction: { '@type': 'SearchAction', target: `${SITE}/search?q={search_term_string}`, 'query-input': 'required name=search_term_string' },
});
export const productLd = (p, reviews = []) => {
  const prices = p.variants.map((v) => v.effectiveKobo / 100);
  const img = p.images.map((i) => absUrl(i.url));
  return {
    '@context': 'https://schema.org', '@type': 'Product', name: p.name, brand: { '@type': 'Brand', name: p.brand.name }, sku: p.variants[0]?.sku,
    description: p.shortDescription || p.description?.slice(0, 300), ...(img.length ? { image: img } : {}), url: absUrl(`/product/${p.slug}`),
    offers: p.variants.length > 1 ? {
      '@type': 'AggregateOffer', priceCurrency: 'NGN', lowPrice: Math.min(...prices), highPrice: Math.max(...prices), offerCount: p.variants.length,
      availability: p.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    } : { '@type': 'Offer', priceCurrency: 'NGN', price: prices[0], url: absUrl(`/product/${p.slug}`), availability: p.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', itemCondition: 'https://schema.org/NewCondition' },
    // Only emitted when real approved reviews exist (never fabricated)
    ...(p.ratingCount > 0 ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: p.ratingAvg, reviewCount: p.ratingCount } } : {}),
    ...(reviews.length ? { review: reviews.slice(0, 5).map((r) => ({ '@type': 'Review', author: { '@type': 'Person', name: r.authorName }, reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5 }, reviewBody: r.comment, datePublished: r.createdAt })) } : {}),
  };
};
