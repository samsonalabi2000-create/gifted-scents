import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MessageCircle, Truck, ShieldCheck, Lock, PackageSearch } from 'lucide-react';
import { api } from '@/api/endpoints.js';
import { Seo, breadcrumbLd, productLd } from '@/components/Seo.jsx';
import { Breadcrumbs } from '@/components/shop/Sections.jsx';
import { PriceDisplay, RatingStars, WishlistButton, QuantitySelector } from '@/components/shop/bits.jsx';
import { ProductGallery, NotesPyramid, Performance, ReviewList } from '@/components/shop/ProductParts.jsx';
import { ReviewForm } from '@/components/shop/ReviewForm.jsx';
import { ProductGrid } from '@/components/shop/ProductCard.jsx';
import { Button, Badge, EmptyState, ErrorState, Skeleton } from '@/components/ui/index.jsx';
import { useCart } from '@/store/cartStore.js';
import { useSettings } from '@/hooks/useSettings.js';
import { waLink, WA } from '@/utils/whatsapp.js';
import { formatNaira } from '@/utils/money.js';
import { track } from '@/utils/analytics.js';
import { lineByType } from '@/utils/productLines.js';

const GENDER = { MEN: "Men's", WOMEN: "Women's", UNISEX: 'Unisex' };
const CONC = { PARFUM: 'Parfum', EDP: 'Eau de Parfum', EDT: 'Eau de Toilette', EDC: 'Eau de Cologne', COLOGNE: 'Cologne', OIL: 'Perfume oil', BODY_MIST: 'Body mist', OTHER: null };

export default function Product() {
  const { slug } = useParams(); const nav = useNavigate(); const add = useCart((s) => s.add); const { s } = useSettings();
  const q = useQuery({ queryKey: ['product', slug], queryFn: () => api.product(slug), retry: (n, e) => e.status !== 404 && n < 1 });
  const recs = useQuery({ queryKey: ['recs', slug], queryFn: () => api.recommendations(slug), enabled: q.isSuccess, staleTime: 5 * 60_000 });
  const p = q.data;
  const rev = useQuery({ queryKey: ['reviews', p?.id], queryFn: () => api.reviews.forProduct(p.id), enabled: Boolean(p) });
  const zones = useQuery({ queryKey: ['zones'], queryFn: api.zones, staleTime: 5 * 60_000 });
  const [vid, setVid] = useState(null); const [qty, setQty] = useState(1); const [busy, setBusy] = useState(false);

  useEffect(() => { if (p) { setVid((p.variants.find((v) => v.isDefault && v.stock > 0) || p.variants.find((v) => v.stock > 0) || p.variants[0])?.id); setQty(1); track('view_item', { items: [{ item_name: p.name, item_brand: p.brand.name }] }); } }, [p?.id]);
  const v = useMemo(() => p?.variants.find((x) => x.id === vid), [p, vid]);

  if (q.isLoading) return <div className="container-x grid gap-8 py-10 lg:grid-cols-2"><Skeleton className="aspect-[4/5]" /><div className="space-y-4"><Skeleton className="h-6 w-1/3" /><Skeleton className="h-12 w-4/5" /><Skeleton className="h-8 w-1/4" /><Skeleton className="h-40" /></div></div>;
  if (q.isError) return <div className="container-x py-16">{q.error.status === 404 ? <EmptyState icon={PackageSearch} title="This product is unavailable" text="It may have been removed or renamed." action={<Button as={Link} to="/shop">Browse the shop</Button>} /> : <ErrorState error={q.error} onRetry={q.refetch} />}</div>;

  const inStock = v && v.stock > 0; const wa = waLink(s['support.whatsapp'], WA.product({ name: p.name, brand: p.brand.name }));
  const crumbs = [{ name: 'Home', to: '/' }, { name: 'Shop', to: '/shop' }, ...(p.category ? [{ name: p.category.name, to: `/shop/${p.category.slug}` }] : []), { name: p.name }];
  const line = lineByType[p.type]; const conc = CONC[p.concentration];
  const buy = async (now) => { setBusy(true); const ok = await add(v.id, qty, { priceKobo: v.effectiveKobo, silent: now }); setBusy(false); if (ok && now) nav('/checkout'); };
  const title = p.seo.title || `${p.brand.name} ${p.name}${conc ? ' ' + conc : ''} | Buy in Nigeria | Gifted Scents`;
  const desc = p.seo.description || p.shortDescription || `Buy ${p.brand.name} ${p.name} at Gifted Scents. Delivery across Nigeria.`;
  const zone = zones.data?.[0];

  return (
    <>
      <Seo title={title} description={desc} path={`/product/${p.slug}`} image={p.images[0]?.url} type="product"
        jsonLd={[productLd(p, rev.data?.items), breadcrumbLd(crumbs.map((c, i) => ({ name: c.name, path: c.to || `/product/${p.slug}` })))]} />
      <Breadcrumbs items={crumbs} />
      <div className="container-x grid gap-8 py-6 lg:grid-cols-2 lg:gap-14 lg:py-10">
        <ProductGallery images={p.images} name={p.name} brand={p.brand.name} />
        <div className="space-y-6">
          <div>
            <Link to={`/brands/${p.brand.slug}`} className="eyebrow hover:underline">{p.brand.name}</Link>
            <h1 className="mt-2 text-4xl sm:text-5xl">{p.name}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {p.ratingCount > 0 && <RatingStars value={p.ratingAvg} count={p.ratingCount} size={16} />}
              {p.isNewArrival && <Badge tone="gold">New</Badge>}{p.isBestseller && <Badge tone="gold">Bestseller</Badge>}{p.isDemo && <Badge>Demo item</Badge>}
              <Badge>{[GENDER[p.gender], conc, line && !conc ? line.name.replace(/s$/, '') : null].filter(Boolean).join(' · ')}</Badge>
            </div>
          </div>
          {v && <PriceDisplay size="lg" priceKobo={v.effectiveKobo} compareAtKobo={v.salePriceKobo != null && v.salePriceKobo < v.priceKobo ? v.priceKobo : null} />}
          {p.shortDescription && <p className="text-muted">{p.shortDescription}</p>}

          <fieldset>
            <legend className="mb-2 text-sm font-semibold">Size / option: <span className="font-normal text-muted">{v?.label}</span></legend>
            <div className="flex flex-wrap gap-2">{p.variants.map((x) => (
              <label key={x.id} className={`relative cursor-pointer rounded-xl border px-4 py-2.5 text-sm transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--ring)] ${x.id === vid ? 'border-accent bg-gold-300/10 font-semibold' : 'border-line hover:border-accent'} ${x.stock === 0 ? 'opacity-50' : ''}`}>
                <input type="radio" name="variant" value={x.id} checked={x.id === vid} onChange={() => { setVid(x.id); setQty(1); }} className="sr-only" />
                {x.label}<span className="ml-2 text-muted">{formatNaira(x.effectiveKobo)}</span>{x.stock === 0 && <span className="ml-1 text-xs">· Sold out</span>}</label>))}</div>
          </fieldset>

          <p role="status" className={`text-sm font-medium ${inStock ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
            {!v ? '' : v.stock === 0 ? 'Sold out' : v.lowStock ? `Only ${v.stock} left` : 'In stock'}</p>

          <div className="flex flex-wrap items-center gap-3">
            <QuantitySelector value={qty} onChange={(n) => setQty(Math.max(1, Math.min(n, v?.stock || 1, 10)))} max={Math.min(10, v?.stock || 1)} />
            <Button size="lg" className="flex-1 min-w-40" disabled={!inStock} loading={busy} onClick={() => buy(false)}>{inStock ? 'Add to cart' : 'Sold out'}</Button>
            <WishlistButton productId={p.id} className="border border-line" />
          </div>
          <Button size="lg" variant="outline" className="w-full" disabled={!inStock} onClick={() => buy(true)}>Buy now</Button>
          {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-accent hover:underline"><MessageCircle className="size-4" />Ask about this {line ? line.name.toLowerCase().replace(/s$/, '') : 'fragrance'} on WhatsApp</a>}

          <ul className="grid gap-3 rounded-2xl border border-line bg-surface p-4 text-sm">
            <li className="flex gap-3"><Truck className="mt-0.5 size-5 shrink-0 text-accent" /><span>{zone ? <>Delivery from {zone.feeKobo === 0 ? 'free' : formatNaira(zone.feeKobo)}{zone.estimatedDays ? `, ${zone.estimatedDays}` : ''}. <Link to="/shipping" className="text-accent underline">Delivery info</Link></> : <Link to="/shipping" className="text-accent underline">Delivery information</Link>}</span></li>
            <li className="flex gap-3"><Lock className="mt-0.5 size-5 shrink-0 text-accent" /><span>Secure payment with Paystack.</span></li>
            <li className="flex gap-3"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-accent" /><span>Questions about authenticity or returns? See our <Link to="/returns" className="text-accent underline">returns policy</Link> or chat with us.</span></li>
          </ul>
          {p.brand.name !== 'Gifted Scents Selection' && <p className="text-xs text-muted">{p.brand.name} is a trademark of its owner. Gifted Scents is an independent retailer and is not affiliated with the brand.</p>}
        </div>
      </div>

      <div className="container-x space-y-8 pb-6">
        {p.description && <section aria-labelledby="desc-h"><h2 id="desc-h" className="text-2xl">About this {line ? line.name.toLowerCase().replace(/s$/, '') : 'fragrance'}</h2><p className="mt-2 max-w-3xl whitespace-pre-line text-muted">{p.description}</p></section>}
        <Performance longevity={p.longevity} sillage={p.sillage} />
        <NotesPyramid notes={p.notes} />
        <dl className="grid max-w-3xl grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
          {p.family && <><dt className="text-muted">Fragrance family</dt><dd className="sm:col-span-2"><Link to={`/fragrance-families/${p.family.slug}`} className="text-accent underline">{p.family.name}</Link></dd></>}
          {p.occasions?.length > 0 && <><dt className="text-muted">Occasions</dt><dd className="sm:col-span-2">{p.occasions.join(', ')}</dd></>}
          {v && <><dt className="text-muted">SKU</dt><dd className="sm:col-span-2">{v.sku}</dd></>}
        </dl>
        <section aria-labelledby="rev-h" className="grid gap-8 lg:grid-cols-[1.4fr_1fr]"><div><h2 id="rev-h" className="mb-2 text-2xl">Customer reviews</h2><ReviewList data={rev.data} loading={rev.isLoading} /></div><ReviewForm productId={p.id} /></section>
        {recs.data?.map((sec) => <section key={sec.type + sec.title} aria-label={sec.title}><h2 className="mb-1 text-2xl">{sec.title}</h2>{sec.note && <p className="mb-4 text-xs text-muted">{sec.note}</p>}<div className="mt-4"><ProductGrid items={sec.items.slice(0, 4)} /></div></section>)}
      </div>

      {/* sticky mobile purchase bar */}
      <div className="fixed inset-x-0 bottom-14 z-[var(--z-sticky)] flex items-center gap-3 border-t border-line bg-bg/95 px-4 py-2.5 backdrop-blur md:hidden">
        <div className="min-w-0 flex-1"><p className="truncate text-xs text-muted">{p.name} · {v?.label}</p>{v && <p className="font-semibold">{formatNaira(v.effectiveKobo)}</p>}</div>
        <Button disabled={!inStock} loading={busy} onClick={() => buy(false)} className="shrink-0">{inStock ? 'Add to cart' : 'Sold out'}</Button>
      </div>
    </>
  );
}
