import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Copy, Eye, EyeOff, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/api/endpoints.js';
import { formatNaira } from '@/utils/money.js';
import { Button, Badge, Input, Select, ConfirmDialog, ErrorState } from '@/components/ui/index.jsx';
import { DataTable, PageHead, Pager } from '@/components/admin/kit.jsx';
import { useDebounce } from '@/hooks/useDebounce.js';
import { useAuth } from '@/store/authStore.js';

export default function AdminProducts() {
  const [p, setP] = useSearchParams(); const nav = useNavigate(); const qc = useQueryClient(); const isAdmin = useAuth((s) => s.user.role === 'ADMIN');
  const [q, setQ] = useState(p.get('q') || ''); const dq = useDebounce(q, 300); const [del, setDel] = useState(null);
  const params = { q: dq || undefined, status: p.get('status') || undefined, sort: p.get('sort') || undefined, page: p.get('page') || 1, limit: 20 };
  const list = useQuery({ queryKey: ['admin-products', params], queryFn: () => api.admin.products(params) });
  const set = (k, v) => { const n = new URLSearchParams(p); v ? n.set(k, v) : n.delete(k); n.delete('page'); setP(n, { replace: true }); };
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-products'] });
  const act = (fn, msg) => async (e, r) => { e.stopPropagation(); try { await fn(r); toast.success(msg); refresh(); } catch (er) { toast.error(er.message); } };

  return (
    <div>
      <PageHead title="Products" sub={list.data ? `${list.data.meta.total} products` : ''}>{isAdmin && <Button as={Link} to="/admin/products/new"><Plus className="size-4" />Add product</Button>}</PageHead>
      <div className="mb-5 flex flex-wrap gap-3">
        <div className="relative min-w-52 flex-1"><Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden /><label className="sr-only" htmlFor="pq">Search products</label><Input id="pq" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, brand or SKU" className="pl-10" /></div>
        <Select aria-label="Status" value={p.get('status') || ''} onChange={(e) => set('status', e.target.value)} className="w-auto"><option value="">All statuses</option><option value="published">Published</option><option value="draft">Unpublished</option></Select>
        <Select aria-label="Sort" value={p.get('sort') || ''} onChange={(e) => set('sort', e.target.value)} className="w-auto"><option value="">Recently updated</option><option value="name">Name</option><option value="price">Price</option><option value="newest">Newest</option></Select>
      </div>
      {list.isError ? <ErrorState error={list.error} onRetry={list.refetch} /> : (
        <DataTable loading={list.isLoading} rows={list.data?.items} onRowClick={(r) => nav(`/admin/products/${r.id}`)} empty="No products match." columns={[
          { key: 'name', label: 'Product', render: (r) => <div className="flex items-center gap-3">{r.image ? <img src={r.image} alt="" className="size-11 rounded-lg object-cover" /> : <div className="grid size-11 place-items-center rounded-lg bg-surface-2 text-xs text-muted">—</div>}<div><p className="font-semibold">{r.name}</p><p className="text-xs text-muted">{r.brand} · {r.type.replace(/_/g, ' ').toLowerCase()}{r.isDemo ? ' · demo' : ''}</p></div></div> },
          { key: 'price', label: 'From', render: (r) => formatNaira(r.minPriceKobo) },
          { key: 'stock', label: 'Stock', render: (r) => <span className={r.stock === 0 ? 'text-[var(--danger)]' : ''}>{r.stock}{r.stock === 0 && ' (sold out)'}</span> },
          { key: 'isActive', label: 'Status', render: (r) => <Badge tone={r.isActive ? 'success' : 'neutral'}>{r.isActive ? 'Published' : 'Unpublished'}</Badge> },
          ...(isAdmin ? [{ key: 'a', label: 'Actions', render: (r) => (
            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
              <button className="grid size-9 place-items-center rounded-full hover:bg-surface-2" aria-label={r.isActive ? `Unpublish ${r.name}` : `Publish ${r.name}`} onClick={(e) => act((x) => api.admin.productPublish(x.id, !x.isActive), r.isActive ? 'Unpublished' : 'Published')(e, r)}>{r.isActive ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
              <button className="grid size-9 place-items-center rounded-full hover:bg-surface-2" aria-label={`Duplicate ${r.name}`} onClick={(e) => act((x) => api.admin.productDuplicate(x.id), 'Duplicated (as unpublished)')(e, r)}><Copy className="size-4" /></button>
              <button className="grid size-9 place-items-center rounded-full text-[var(--danger)] hover:bg-surface-2" aria-label={`Delete ${r.name}`} onClick={(e) => { e.stopPropagation(); setDel(r); }}><Trash2 className="size-4" /></button></div>) }] : []),
        ]} />)}
      <Pager meta={list.data?.meta} onPage={(n) => { const x = new URLSearchParams(p); x.set('page', n); setP(x); }} />
      <ConfirmDialog open={Boolean(del)} onOpenChange={() => setDel(null)} danger title={`Delete ${del?.name}?`} description="It will be removed from the store. Past orders keep their details." confirmLabel="Delete" onConfirm={async () => { try { await api.admin.productDelete(del.id); toast.success('Deleted'); setDel(null); refresh(); } catch (e) { toast.error(e.message); } }} />
    </div>
  );
}
