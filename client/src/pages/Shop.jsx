import { useMemo } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { SearchX } from 'lucide-react';
import { api } from '@/api/endpoints.js';
import { Seo, breadcrumbLd } from '@/components/Seo.jsx';
import { Breadcrumbs } from '@/components/shop/Sections.jsx';
import { ProductGrid } from '@/components/shop/ProductCard.jsx';
import { FilterPanel, FilterButton } from '@/components/shop/FilterPanel.jsx';
import { EmptyState, ErrorState, Button, Select } from '@/components/ui/index.jsx';
import { lineByType } from '@/utils/productLines.js';

const SORTS = [['featured', 'Featured'], ['newest', 'Newest'], ['popular', 'Best selling'], ['price_asc', 'Price: low to high'], ['price_desc', 'Price: high to low'], ['rating', 'Top rated']];
const GENDER = { men: 'men', women: 'women', unisex: 'unisex' };

/** One component powers /shop, /shop/:category, /brands/:slug and /fragrance-families/:slug */
export default function Shop({ mode = 'shop' }) {
  const { category, slug } = useParams(); const [params, setParams] = useSearchParams();
  const gender = mode === 'shop' && GENDER[category] ? category : null; // /shop/men, /shop/women, /shop/unisex
  const facets = useQuery({ queryKey: ['facets'], queryFn: api.facets, staleTime: 5 * 60_000 });
  const page = Number(params.get('page') || 1);

  const scope = useMemo(() => {
    if (mode === 'brand') return { brand: slug };
    if (mode === 'family') return { family: slug };
    if (gender) return { gender };
    if (category) return { category };
    return {};
  }, [mode, slug, category, gender]);

  const meta = useQuery({
    queryKey: ['scope-meta', mode, slug || category], staleTime: 5 * 60_000, retry: false,
    queryFn: () => (mode === 'brand' ? api.brand(slug) : mode === 'family' ? api.family(slug) : category && !gender ? api.category(category) : null),
    enabled: mode !== 'shop' || Boolean(category && !gender),
  });

  const query = { ...Object.fromEntries(params.entries()), ...scope, limit: 24 };
  const list = useQuery({ queryKey: ['shop', query], queryFn: () => api.products(query), placeholderData: keepPreviousData });

  const set = (k, v) => { const p = new URLSearchParams(params); v ? p.set(k, v) : p.delete(k); p.delete('page'); setParams(p, { replace: true }); };
  const clear = () => setParams({}, { replace: true });
  const go = (n) => { const p = new URLSearchParams(params); p.set('page', n); setParams(p); window.scrollTo({ top: 0 }); };

  const typeLine = !category && mode === 'shop' && params.get('type') && !params.get('type').includes(',') ? lineByType[params.get('type')] : null;
  const title = meta.data?.name || typeLine?.name || (gender ? `${gender[0].toUpperCase() + gender.slice(1)}'s Fragrances` : 'Shop all fragrances');
  const desc = meta.data?.seoDescription || meta.data?.description || (typeLine && `Shop ${typeLine.name.toLowerCase()} at Gifted Scents. ${typeLine.blurb}. Delivery across Nigeria.`) || `Browse ${title.toLowerCase()} at Gifted Scents. Delivery across Nigeria.`;
  const path = mode === 'brand' ? `/brands/${slug}` : mode === 'family' ? `/fragrance-families/${slug}` : category ? `/shop/${category}` : '/shop';
  const crumbs = [{ name: 'Home', to: '/' }, ...(mode === 'brand' ? [{ name: 'Brands', to: '/brands' }] : mode === 'family' ? [{ name: 'Fragrance families', to: '/shop' }] : [{ name: 'Shop', to: '/shop' }]), { name: title }];
  const hasFilters = [...params.keys()].some((k) => k !== 'page' && k !== 'sort');
  const data = list.data; const pages = data?.meta.pages || 1;

  if (meta.isError && meta.error?.status === 404) return <div className="container-x py-20"><EmptyState icon={SearchX} title="We couldn't find that page" action={<Button as={Link} to="/shop">Browse all</Button>} /></div>;

  return (
    <>
      <Seo title={`${title} | Gifted Scents`} description={desc} path={path} noindex={page > 1 || (hasFilters && !typeLine)} jsonLd={breadcrumbLd(crumbs.map((c, i) => ({ name: c.name, path: c.to || path })))} />
      <Breadcrumbs items={crumbs} />
      <header className="container-x py-8"><h1 className="text-4xl sm:text-5xl">{title}</h1>{meta.data?.description && <p className="mt-2 max-w-2xl text-muted">{meta.data.description}</p>}</header>
      <div className="container-x grid gap-8 lg:grid-cols-[16rem_1fr]">
        <FilterPanel facets={facets.data} params={params} set={set} clear={clear} />
        <section aria-label="Products" aria-busy={list.isFetching}>
          <div className="mb-5 flex items-center justify-between gap-3">
            <p className="text-sm text-muted" aria-live="polite">{data ? `${data.meta.total} product${data.meta.total === 1 ? '' : 's'}` : ' '}</p>
            <div className="flex items-center gap-2"><FilterButton />
              <label className="sr-only" htmlFor="sort">Sort by</label>
              <Select id="sort" value={params.get('sort') || 'featured'} onChange={(e) => set('sort', e.target.value)} className="h-11 w-auto min-w-40 rounded-full py-0 text-sm">{SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></div>
          </div>
          {list.isError ? <ErrorState error={list.error} onRetry={list.refetch} /> :
            !list.isLoading && data?.items.length === 0 ? <EmptyState icon={SearchX} title="No products match" text="Try removing a filter or two." action={<Button onClick={clear}>Clear filters</Button>} /> :
            <ProductGrid items={data?.items || []} loading={list.isLoading} count={8} cols="grid-cols-2 xl:grid-cols-3" />}
          {pages > 1 && (
            <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-3">
              <Button variant="outline" disabled={page <= 1} onClick={() => go(page - 1)}>Previous</Button>
              <span className="text-sm text-muted">Page {page} of {pages}</span>
              <Button variant="outline" disabled={page >= pages} onClick={() => go(page + 1)}>Next</Button>
            </nav>)}
        </section>
      </div>
    </>
  );
}
