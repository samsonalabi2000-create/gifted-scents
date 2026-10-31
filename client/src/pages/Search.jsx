import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SearchX } from 'lucide-react';
import { api } from '@/api/endpoints.js';
import { Seo } from '@/components/Seo.jsx';
import { ProductGrid } from '@/components/shop/ProductCard.jsx';
import { EmptyState, ErrorState, Button } from '@/components/ui/index.jsx';

export default function SearchPage() {
  const [params] = useSearchParams(); const q = (params.get('q') || '').trim();
  const r = useQuery({ queryKey: ['search', q], queryFn: () => api.search({ q, limit: 24 }), enabled: q.length >= 2 });
  return (
    <div className="container-x py-10">
      <Seo title={q ? `Search: ${q} | Gifted Scents` : 'Search | Gifted Scents'} path="/search" noindex />
      <h1 className="text-4xl">{q ? <>Results for &ldquo;{q}&rdquo;</> : 'Search'}</h1>
      <div className="mt-8">
        {q.length < 2 ? <EmptyState icon={SearchX} title="What are you looking for?" text="Search by perfume, brand, note, category or SKU." /> :
          r.isError ? <ErrorState error={r.error} onRetry={r.refetch} /> :
          r.isLoading ? <ProductGrid loading count={8} /> :
          r.data.items.length ? <><p className="mb-5 text-sm text-muted">{r.data.meta.total} result{r.data.meta.total === 1 ? '' : 's'}</p><ProductGrid items={r.data.items} /></> : (
            <div className="space-y-10">
              <EmptyState icon={SearchX} title={`Nothing found for "${q}"`} text="Check the spelling or try a brand or note. Here are some favourites instead." action={<Button as={Link} to="/scent-finder">Find my scent</Button>} />
              {r.data.suggestions?.length > 0 && <ProductGrid items={r.data.suggestions} />}
            </div>)}
      </div>
    </div>
  );
}
