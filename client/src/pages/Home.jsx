import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ShieldCheck, Truck, Lock, Headset, Sparkles, Gem } from 'lucide-react';
import { api } from '@/api/endpoints.js';
import { Button } from '@/components/ui/index.jsx';
import { useSettings } from '@/hooks/useSettings.js';
import { ProductRow, SectionHead } from '@/components/shop/Sections.jsx';
import { OrbitOfNotes } from '@/components/shop/OrbitOfNotes.jsx';
import { NewsletterForm } from '@/components/shop/Newsletter.jsx';
import logo from '@/assets/logo.webp';
import { PRODUCT_LINES, lineHref } from '@/utils/productLines.js';

const useProducts = (key, params) => useQuery({ queryKey: ['products', key], queryFn: () => api.products(params), staleTime: 60_000 });

const CATEGORY_ART = [
  ['women', 'womens-fragrances'], ['men', 'mens-fragrances'], ['unisex', 'unisex'],
  ['arabic', 'arabic-fragrances'], ['luxury', 'luxury-designer'], ['designer', 'luxury-designer'],
  ['gift', 'gift-sets'], ['decant', 'decants-samples'], ['sample', 'decants-samples'],
  ['roll', 'roll-ons'], ['mist', 'body-mists'], ['oil', 'oil-perfumes'],
  ['candle', 'scented-candles'], ['air fresh', 'air-fresheners'], ['home fragrance', 'air-fresheners'],
];

// The storefront should still have a complete, useful category section if the
// categories endpoint is temporarily empty or unavailable. When API data exists,
// that live catalogue remains the source of truth.
const FALLBACK_CATEGORIES = [
  { id: 'mens-fragrances', name: "Men's Fragrances", slug: 'men-s-fragrances' },
  { id: 'womens-fragrances', name: "Women's Fragrances", slug: 'women-s-fragrances' },
  { id: 'unisex', name: 'Unisex', slug: 'unisex' },
  { id: 'arabic-fragrances', name: 'Arabic Fragrances', slug: 'arabic-fragrances' },
  { id: 'luxury-designer', name: 'Luxury/Designer', slug: 'luxury-designer' },
  { id: 'gift-sets', name: 'Gift Sets', slug: 'gift-sets' },
  { id: 'decants-samples', name: 'Decants & Samples', slug: 'decants-and-samples' },
  { id: 'roll-ons', name: 'Roll-Ons', slug: 'roll-ons' },
  { id: 'body-mists', name: 'Body Mists', slug: 'body-mists' },
  { id: 'oil-perfumes', name: 'Oil Perfumes', slug: 'oil-perfumes' },
  { id: 'scented-candles', name: 'Scented Candles', slug: 'scented-candles' },
  { id: 'air-fresheners', name: 'Air Fresheners', slug: 'air-fresheners' },
];
const categoryImage = (category, index) => {
  const label = `${category?.name || ''} ${category?.slug || ''}`.toLowerCase().replaceAll('-', ' ');
  const match = CATEGORY_ART.find(([term]) => label.includes(term));
  const fallback = ['mens-fragrances', 'womens-fragrances', 'unisex', 'arabic-fragrances', 'luxury-designer', 'gift-sets', 'decants-samples', 'roll-ons', 'body-mists', 'oil-perfumes', 'scented-candles', 'air-fresheners'][index % 12];
  return `/images/home-categories/${match?.[1] || fallback}.jpg`;
};
const LINE_ART = {
  ROLL_ON: 'roll-ons', BODY_MIST: 'body-mists', OIL_PERFUME: 'oil-perfume',
  CANDLE: 'scented-candles', AIR_FRESHENER: 'air-fresheners', POCKET_SCENT: 'pocket-sized-scents',
  DIFFUSER: 'diffusers', BODY_CREAM: 'body-cream', SOAP: 'soaps', SCRUB: 'scrubs',
};

export default function Home() {
  const { s } = useSettings();
  const hero = s['website.hero'] || {};
  const best = useProducts('best', { bestseller: 'true', limit: 8, sort: 'popular' });
  const fresh = useProducts('new', { new: 'true', limit: 4, sort: 'newest' });
  const featured = useProducts('featured', { featured: 'true', limit: 2 });
  const brands = useQuery({ queryKey: ['brands'], queryFn: api.brands, staleTime: 5 * 60_000 });
  const cats = useQuery({ queryKey: ['categories'], queryFn: api.categories, staleTime: 5 * 60_000 });
  const liveCategories = Array.isArray(cats.data) ? cats.data : (Array.isArray(cats.data?.items) ? cats.data.items : []);
  const categoryItems = (liveCategories.length ? liveCategories : FALLBACK_CATEGORIES).slice(0, 12);
  const fams = useQuery({ queryKey: ['families'], queryFn: api.families, staleTime: 5 * 60_000 });
  const reviews = useQuery({ queryKey: ['home-reviews'], queryFn: api.reviews.home, staleTime: 5 * 60_000 });
  const claims = [[ShieldCheck, 'Authentic fragrances', s['store.name'] ? `Curated by ${s['store.name']}` : 'Carefully curated'], [Truck, 'Delivery across Nigeria', 'Fast and reliable'], [Lock, 'Secure payments', 'Powered by Paystack'], [Headset, 'Real people on WhatsApp', 'Always here to help']];

  return (
    <>
      {/* HERO */}
      <section className="relative isolate overflow-hidden bg-ink-950 text-[#f6efe6]">
        <div aria-hidden className="absolute inset-0 -z-10" style={{ background: 'radial-gradient(55% 60% at 78% 40%, rgba(242,61,150,.20), transparent 70%), radial-gradient(40% 40% at 10% 0%, rgba(201,153,58,.16), transparent 70%)' }} />
        <div className="container-x grid items-center gap-8 py-12 sm:py-16 lg:grid-cols-[1.05fr_.95fr] lg:py-24">
          <div className="reveal">
            <p className="eyebrow">{s['store.tagline2'] || 'Spray Happiness. Share Confidence.'}</p>
            <h1 className="mt-4 text-[clamp(2.6rem,7vw,5.2rem)] leading-[.98]"><span className="gold-text">{hero.headline || 'Your Scent. Your Story. Your Gift.'}</span></h1>
            <p className="mt-5 max-w-xl text-lg text-[#d9cdc0]">{hero.subhead}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button as={Link} to="/shop" size="lg">{hero.ctaPrimary || 'Shop Fragrances'}<ArrowRight className="size-4" /></Button>
              <Button as={Link} to="/scent-finder" size="lg" variant="outline" className="border-gold-400/50 text-gold-200"><Sparkles className="size-4" />{hero.ctaSecondary || 'Find Your Scent'}</Button>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-[28rem] lg:max-w-none">
            <div aria-hidden className="absolute -inset-6 rounded-full bg-[radial-gradient(closest-side,rgba(242,61,150,.28),transparent)] blur-2xl" />
            {hero.imageUrl ? (
              <img src={hero.imageUrl} alt="Gifted Scents - your scent, your story, your gift" width="900" height="900" fetchPriority="high" decoding="async" className="relative mx-auto aspect-square w-full rounded-[2rem] border border-gold-400/25 object-cover shadow-[0_30px_80px_-30px_rgba(0,0,0,.9)]" />
            ) : (
              <div className="home-logo-motion relative mx-auto aspect-square w-full overflow-hidden rounded-[2rem] border border-gold-400/25 bg-ink-950 shadow-[0_30px_80px_-30px_rgba(0,0,0,.9)]">
                <video className="home-logo-video h-full w-full object-cover" src="/videos/gifted-scents-logo.mp4" poster={logo} autoPlay muted loop playsInline preload="metadata" aria-label="Animated Gifted Scents brand logo" />
                <img className="home-logo-still hidden h-full w-full object-cover" src={logo} alt="Gifted Scents - your scent, your story, your gift" width="900" height="900" />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section aria-label="Why shop with us" className="border-b border-line bg-surface">
        <ul className="container-x grid grid-cols-2 gap-px py-2 lg:grid-cols-4">{claims.map(([I, t, d]) => (
          <li key={t} className="flex items-center gap-3 px-1 py-4 sm:px-3"><I className="size-6 shrink-0 text-accent" aria-hidden /><div><p className="text-sm font-semibold leading-tight">{t}</p><p className="text-xs text-muted">{d}</p></div></li>))}</ul>
      </section>

      {/* ANIMATED FRAGRANCE-HOUSE MARQUEE */}
      {brands.data?.filter((b) => b.name).length > 0 && (() => {
        const houses = brands.data.filter((b) => b.name);
        const lanes = [houses, [...houses].reverse()];
        return (
          <section className="brand-marquee" aria-label="Fragrance houses carried by Gifted Scents">
            {lanes.map((lane, laneIndex) => (
              <div className={`brand-marquee-lane ${laneIndex === 1 ? 'brand-marquee-lane-reverse' : ''}`} key={laneIndex}>
                <div className="brand-marquee-track" style={{ '--marquee-duration': `${Math.max(28, lane.length * 5)}s` }}>
                  {[0, 1, 2].map((copy) => (
                    <div className="brand-marquee-group" key={copy} aria-hidden={copy > 0 ? 'true' : undefined}>
                      {lane.map((brand, index) => {
                        const wordmark = <span className={`brand-marquee-word brand-marquee-word-${(index % 4) + 1}`}>{brand.name}</span>;
                        return copy === 0 && brand.slug
                          ? <Link key={`${brand.id || brand.slug}-${index}`} to={`/brands/${brand.slug}`} className="brand-marquee-link" tabIndex={0}>{wordmark}</Link>
                          : <span key={`${brand.id || brand.name}-${copy}-${index}`} className="brand-marquee-static">{wordmark}</span>;
                      })}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>
        );
      })()}

      {/* IMAGE-LED SHOPPING DISCOVERY CARDS */}
      <section className="container-x home-discovery" aria-label="Explore fragrance collections">
        <div className="home-discovery-grid">
          <Link to="/shop?bestseller=true" className="home-discovery-card" aria-label="Shop best sellers">
            <img src="/images/home-best-sellers.jpg" alt="Hands applying a fine fragrance — explore best sellers" width="409" height="613" loading="lazy" decoding="async" />
            <span className="home-discovery-sr">Best sellers</span>
          </Link>
          <Link to="/shop?type=POCKET_SCENT" className="home-discovery-card" aria-label="Explore travel and pocket sprays">
            <img src="/images/home-travel-sprays.jpg" alt="Travel-size fragrance sprays held ready to go" width="409" height="615" loading="lazy" decoding="async" />
            <span className="home-discovery-sr">Travel sprays</span>
          </Link>
          <Link to="/shop" className="home-discovery-card" aria-label="Explore fragrance gifts and gift sets">
            <img src="/images/home-gift-sets.jpg" alt="A couple sharing a beautifully wrapped gift" width="409" height="613" loading="lazy" decoding="async" />
            <span className="home-discovery-sr">Gift sets</span>
          </Link>
        </div>
      </section>

      {/* IMAGE-LED SHOP BY CATEGORY */}
      {categoryItems.length > 0 && (
        <section className="container-x home-category-section" aria-labelledby="home-categories-title">
          <div className="home-section-heading">
            <div>
              <p className="eyebrow">Discover our collections</p>
              <h2 id="home-categories-title">Shop by Category</h2>
              <p className="home-section-subtitle">Find your perfect scent, from timeless classics to modern favourites.</p>
            </div>
            <Link to="/shop" className="home-text-link">View all <ArrowRight className="size-4" aria-hidden /></Link>
          </div>
          <ul className="home-category-grid">{categoryItems.map((c, i) => (
            <li key={c.id}>
              <Link to={`/shop/${c.slug}`} className="home-category-card" aria-label={`Shop ${c.name}`}>
                <img src={categoryImage(c, i)} alt="" width="440" height="244" loading="lazy" decoding="async" />
                <span className="home-category-shade" aria-hidden />
                <span className="home-category-title">{c.name}</span>
                <ArrowRight className="home-category-arrow size-4" aria-hidden />
              </Link>
            </li>
          ))}</ul>
        </section>
      )}


      {/* BEYOND PERFUME — EDITORIAL PRODUCT-LINE SHOWCASE */}
      <section aria-labelledby="lines-title" className="container-x home-product-lines-section">
        <div className="home-product-lines-intro">
          <p className="eyebrow">Beyond perfume</p>
          <h2 id="lines-title">Shop by Product Line</h2>
          <p>Explore our complete range of fragrance and home scent essentials.</p>
          <Button as={Link} to="/shop" className="mt-5">Shop everything <ArrowRight className="size-4" /></Button>
        </div>
        <div className="home-product-lines-grid-wrap">
          <h2 className="sr-only">Product lines</h2>
          <ul className="home-product-lines-grid">
            {PRODUCT_LINES.map(({ type, name, blurb }) => (
              <li key={type}>
                <Link to={lineHref(type)} className="home-product-line-card">
                  <span className="home-product-line-image">
                    <img src={`/images/home-product-lines/${LINE_ART[type] || 'roll-ons'}.jpg`} alt="" width="388" height="130" loading="lazy" decoding="async" />
                  </span>
                  <span className="home-product-line-copy">
                    <span className="home-product-line-name">{name}</span>
                    <span className="home-product-line-blurb">{blurb}</span>
                    <span className="home-product-line-arrow" aria-hidden><ArrowRight className="size-4" /></span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <ProductRow eyebrow="Customer favourites" title="Best sellers" to="/shop?bestseller=true" loading={best.isLoading} items={best.data?.items?.slice(0, 8)} />

      {/* SCENT FINDER CTA */}
      <section className="container-x">
        <div className="relative overflow-hidden rounded-[2rem] bg-ink-950 px-6 py-12 text-center text-[#f6efe6] sm:px-12 sm:py-16">
          <div aria-hidden className="absolute inset-0" style={{ background: 'radial-gradient(50% 80% at 50% 120%, rgba(242,61,150,.35), transparent 70%)' }} />
          <Gem className="relative mx-auto size-8 text-gold-300" aria-hidden />
          <h2 className="relative mt-3 text-4xl sm:text-5xl">Not sure where to start?</h2>
          <p className="relative mx-auto mt-3 max-w-xl text-[#d9cdc0]">Answer a few quick questions and we will match you with scents from our collection that are actually in stock.</p>
          <Button as={Link} to="/scent-finder" size="lg" className="relative mt-7">Find my scent<ArrowRight className="size-4" /></Button>
        </div>
      </section>

      {/* FAMILIES */}
      {fams.data?.length > 0 && (
        <section className="container-x pt-16"><SectionHead eyebrow="Know your notes" title="Fragrance families" />
          <ul className="flex flex-wrap gap-2.5">{fams.data.map((f) => <li key={f.id}><Link to={`/fragrance-families/${f.slug}`} className="inline-flex h-11 items-center rounded-full border border-line px-5 font-medium transition hover:border-accent hover:bg-surface-2 hover:text-accent">{f.name}</Link></li>)}</ul></section>
      )}

      {/* FEATURED EDITORIAL */}
      {featured.data?.items?.length > 0 && (
        <section className="container-x pt-16"><SectionHead eyebrow="Editor's pick" title="Featured" />
          <div className="grid gap-5 md:grid-cols-2">{featured.data.items.map((p) => (
            <Link key={p.id} to={`/product/${p.slug}`} className="group relative flex min-h-72 flex-col justify-end overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-ink-800 to-ink-950 p-6 text-[#f6efe6]">
              {p.image && <img src={p.image.url} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-60 transition duration-700 group-hover:scale-105" />}
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/50 to-transparent" />
              <div className="relative"><p className="eyebrow">{p.brand.name}</p><h3 className="mt-1 text-3xl">{p.name}</h3><p className="mt-1 text-sm text-gold-200">Discover <ArrowRight className="inline size-4" /></p></div></Link>))}</div></section>
      )}

      <ProductRow eyebrow="Just in" title="New arrivals" to="/shop?new=true" loading={fresh.isLoading} items={fresh.data?.items} />

      <div className="mt-8"><OrbitOfNotes reviews={reviews.data || []} /></div>

      {/* SOCIAL + NEWSLETTER */}
      <section className="container-x grid gap-8 py-16 lg:grid-cols-2">
        <div className="rounded-3xl border border-line bg-surface p-8">
          <p className="eyebrow">Stay in touch</p><h2 className="mt-1 text-3xl">Follow Gifted Scents</h2>
          <p className="mt-2 text-muted">New arrivals, restocks and behind-the-scenes on our social channels.</p>
          <div className="mt-5 flex flex-wrap gap-3">{[['instagram', 'Instagram'], ['tiktok', 'TikTok'], ['facebook', 'Facebook'], ['youtube', 'YouTube'], ['x', 'X']].filter(([k]) => s[`social.${k}`]).map(([k, l]) => (
            <a key={k} href={s[`social.${k}`]} target="_blank" rel="noopener noreferrer" className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold hover:border-accent hover:text-accent">{l}</a>))}</div>
        </div>
        <div className="rounded-3xl border border-line bg-surface p-8">
          <p className="eyebrow">Offers</p><h2 className="mt-1 text-3xl">Join the list</h2>
          <p className="mb-5 mt-2 text-muted">Be first to hear about new scents and offers.</p><NewsletterForm />
        </div>
      </section>
    </>
  );
}
