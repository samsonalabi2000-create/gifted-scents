import { useState } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Check, X, EyeOff, Trash2, Home } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/api/endpoints.js';
import { formatNaira } from '@/utils/money.js';
import { Button, Badge, Input, Select, Textarea, ConfirmDialog, ErrorState, Skeleton } from '@/components/ui/index.jsx';
import { DataTable, PageHead, Pager } from '@/components/admin/kit.jsx';
import { RatingStars } from '@/components/shop/bits.jsx';
import { StatusBadge } from '@/pages/account/Account.jsx';
import { SalesChart } from '@/components/admin/Charts.jsx';
import { StatCard } from '@/components/admin/kit.jsx';

const useList = (key, fn) => { const [p, setP] = useSearchParams(); const params = Object.fromEntries(p.entries()); const q = useQuery({ queryKey: [key, params], queryFn: () => fn(params) }); const set = (k, v) => { const n = new URLSearchParams(p); v ? n.set(k, v) : n.delete(k); if (k !== 'page') n.delete('page'); setP(n, { replace: true }); }; return { p, q, set }; };

export function AdminCustomers() {
  const { p, q, set } = useList('admin-customers', api.admin.customers); const nav = useNavigate();
  return <div><PageHead title="Customers" sub={q.data ? `${q.data.meta.total} customers` : ''} />
    <div className="mb-5"><label className="sr-only" htmlFor="cq">Search customers</label><Input id="cq" defaultValue={p.get('q') || ''} onChange={(e) => set('q', e.target.value)} placeholder="Search name or email" /></div>
    {q.isError ? <ErrorState error={q.error} onRetry={q.refetch} /> : <DataTable loading={q.isLoading} rows={q.data?.items} onRowClick={(c) => nav(`/admin/customers/${c.id}`)} columns={[{ key: 'n', label: 'Name', render: (c) => `${c.firstName} ${c.lastName}${c.isDemo ? ' (demo)' : ''}` }, { key: 'email', label: 'Email' }, { key: 'o', label: 'Orders', render: (c) => c._count.orders }, { key: 'createdAt', label: 'Joined', render: (c) => new Date(c.createdAt).toLocaleDateString('en-NG') }]} />}
    <Pager meta={q.data?.meta} onPage={(n) => set('page', n)} /></div>;
}
export function AdminCustomerDetail() {
  const { id } = useParams(); const q = useQuery({ queryKey: ['admin-customer', id], queryFn: () => api.admin.customer(id) });
  if (q.isLoading) return <Skeleton className="h-64" />; if (q.isError) return <ErrorState error={q.error} onRetry={q.refetch} />; const c = q.data;
  return <div className="mx-auto max-w-3xl space-y-6"><Link to="/admin/customers" className="inline-flex items-center gap-1 text-sm text-muted"><ChevronLeft className="size-4" />All customers</Link><PageHead title={`${c.firstName} ${c.lastName}`} sub={c.email} />
    <section className="rounded-2xl border border-line bg-surface p-5 text-sm"><p>Phone: {c.phone || '—'}</p><p>Joined: {new Date(c.createdAt).toLocaleDateString('en-NG')}</p></section>
    <section><h2 className="mb-3 text-2xl">Orders</h2><DataTable rows={c.orders} empty="No orders." columns={[{ key: 'orderNumber', label: 'Order', render: (o) => <Link className="font-semibold text-accent" to={`/admin/orders/${o.id}`}>{o.orderNumber}</Link> }, { key: 'totalKobo', label: 'Total', render: (o) => formatNaira(o.totalKobo) }, { key: 'status', label: 'Status', render: (o) => <StatusBadge status={o.status} /> }]} /></section></div>;
}

export function AdminReviews() {
  const { p, q, set } = useList('admin-reviews', api.admin.reviews); const qc = useQueryClient(); const [del, setDel] = useState(null);
  const act = async (id, body, msg) => { try { await api.admin.reviewModerate(id, body); toast.success(msg); qc.invalidateQueries({ queryKey: ['admin-reviews'] }); } catch (e) { toast.error(e.message); } };
  return <div><PageHead title="Reviews" sub="Approve what appears on your store" />
    <div className="mb-5"><Select aria-label="Status" value={p.get('status') || ''} onChange={(e) => set('status', e.target.value)} className="w-auto"><option value="">All</option>{['PENDING', 'APPROVED', 'REJECTED', 'HIDDEN'].map((s) => <option key={s} value={s}>{s[0] + s.slice(1).toLowerCase()}</option>)}</Select></div>
    {q.isError ? <ErrorState error={q.error} onRetry={q.refetch} /> : q.isLoading ? <Skeleton className="h-48" /> : q.data.items.length === 0 ? <p className="rounded-2xl border border-dashed border-line p-10 text-center text-muted">No reviews here.</p> : (
      <ul className="space-y-3">{q.data.items.map((r) => (
        <li key={r.id} className="rounded-2xl border border-line bg-surface p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-3"><RatingStars value={r.rating} showCount={false} /><span className="text-sm font-semibold">{r.authorName}</span><Badge tone={r.status === 'APPROVED' ? 'success' : r.status === 'PENDING' ? 'warn' : 'neutral'}>{r.status}</Badge></div><Link to={`/product/${r.product.slug}`} className="text-xs text-accent">{r.product.name}</Link></div>
          {r.title && <p className="mt-2 font-semibold">{r.title}</p>}<p className="mt-1 text-sm">{r.comment}</p>
          <div className="mt-3 flex flex-wrap gap-2"><Button size="sm" onClick={() => act(r.id, { status: 'APPROVED' }, 'Approved')}><Check className="size-4" />Approve</Button><Button size="sm" variant="outline" onClick={() => act(r.id, { status: 'REJECTED' }, 'Rejected')}><X className="size-4" />Reject</Button><Button size="sm" variant="outline" onClick={() => act(r.id, { status: 'HIDDEN' }, 'Hidden')}><EyeOff className="size-4" />Hide</Button>
            <Button size="sm" variant={r.showOnHomepage ? 'gold' : 'outline'} onClick={() => act(r.id, { showOnHomepage: !r.showOnHomepage }, r.showOnHomepage ? 'Removed from Orbit of Notes' : 'Added to Orbit of Notes')}><Home className="size-4" />{r.showOnHomepage ? 'On homepage' : 'Show on homepage'}</Button>
            <Button size="sm" variant="ghost" className="text-[var(--danger)]" onClick={() => setDel(r)}><Trash2 className="size-4" />Delete</Button></div></li>))}</ul>)}
    <Pager meta={q.data?.meta} onPage={(n) => set('page', n)} />
    <ConfirmDialog open={Boolean(del)} onOpenChange={() => setDel(null)} danger title="Delete this review?" description="This cannot be undone." confirmLabel="Delete" onConfirm={async () => { try { await api.admin.reviewDelete(del.id); setDel(null); toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['admin-reviews'] }); } catch (e) { toast.error(e.message); } }} /></div>;
}

export function AdminSupport() {
  const { p, q, set } = useList('admin-tickets', api.admin.tickets); const nav = useNavigate();
  return <div><PageHead title="Support" sub="Customer requests" />
    <div className="mb-5 flex flex-wrap gap-3"><Input aria-label="Search tickets" defaultValue={p.get('q') || ''} onChange={(e) => set('q', e.target.value)} placeholder="Ticket, name, email or order" className="min-w-52 flex-1" /><Select aria-label="Status" value={p.get('status') || ''} onChange={(e) => set('status', e.target.value)} className="w-auto"><option value="">All</option>{['NEW', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}</Select></div>
    {q.isError ? <ErrorState error={q.error} onRetry={q.refetch} /> : <DataTable loading={q.isLoading} rows={q.data?.items} onRowClick={(t) => nav(`/admin/support/${t.id}`)} empty="No requests." columns={[{ key: 'ticketNumber', label: 'Ticket', render: (t) => <span className="font-semibold">{t.ticketNumber}</span> }, { key: 'name', label: 'Customer' }, { key: 'subject', label: 'Topic' }, { key: 'orderNumber', label: 'Order', render: (t) => t.orderNumber || '—' }, { key: 'createdAt', label: 'Date', render: (t) => new Date(t.createdAt).toLocaleDateString('en-NG') }, { key: 'status', label: 'Status', render: (t) => <Badge tone={t.status === 'NEW' ? 'rose' : t.status === 'RESOLVED' || t.status === 'CLOSED' ? 'success' : 'gold'}>{t.status.replace('_', ' ')}</Badge> }]} />}
    <Pager meta={q.data?.meta} onPage={(n) => set('page', n)} /></div>;
}
export function AdminTicket() {
  const { id } = useParams(); const qc = useQueryClient(); const q = useQuery({ queryKey: ['admin-ticket', id], queryFn: () => api.admin.ticket(id) });
  const [reply, setReply] = useState(''); const [note, setNote] = useState(''); const [busy, setBusy] = useState(false);
  const run = async (fn, msg, done) => { setBusy(true); try { await fn(); toast.success(msg); done?.(); qc.invalidateQueries({ queryKey: ['admin-ticket', id] }); qc.invalidateQueries({ queryKey: ['admin-tickets'] }); } catch (e) { toast.error(e.message); } finally { setBusy(false); } };
  if (q.isLoading) return <Skeleton className="h-80" />; if (q.isError) return <ErrorState error={q.error} onRetry={q.refetch} />; const t = q.data;
  return <div className="mx-auto max-w-4xl space-y-6"><Link to="/admin/support" className="inline-flex items-center gap-1 text-sm text-muted"><ChevronLeft className="size-4" />All requests</Link>
    <PageHead title={t.ticketNumber} sub={`${t.name} · ${t.email}${t.phone ? ' · ' + t.phone : ''}${t.orderNumber ? ' · Order ' + t.orderNumber : ''}`}><Select aria-label="Status" value={t.status} onChange={(e) => run(() => api.admin.ticketStatus(id, e.target.value), 'Status updated')} className="w-auto">{['NEW', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}</Select></PageHead>
    <section className="space-y-3">{t.messages.map((m) => <div key={m.id} className={`max-w-[85%] rounded-2xl p-4 text-sm ${m.sender === 'STAFF' ? 'ml-auto bg-cta text-cta-fg' : 'bg-surface-2'}`}><p className="whitespace-pre-line">{m.body}</p><p className="mt-1 text-xs opacity-70">{m.sender === 'STAFF' ? 'You' : t.name} · {new Date(m.createdAt).toLocaleString('en-NG')}</p></div>)}</section>
    <section className="space-y-2"><label htmlFor="reply" className="font-semibold">Reply to customer (sent by email)</label><Textarea id="reply" value={reply} onChange={(e) => setReply(e.target.value)} /><Button loading={busy} disabled={!reply.trim()} onClick={() => run(() => api.admin.ticketReply(id, reply), 'Reply sent', () => setReply(''))}>Send reply</Button></section>
    <section className="space-y-2 rounded-2xl border border-line bg-surface p-4"><h2 className="text-xl">Internal notes</h2>{t.notes.map((n) => <p key={n.id} className="rounded-xl bg-surface-2 p-3 text-sm">{n.body}<span className="block text-xs text-muted">{new Date(n.createdAt).toLocaleString('en-NG')}</span></p>)}
      <Textarea aria-label="Internal note" className="min-h-20" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Only staff can see this" /><Button variant="outline" disabled={!note.trim()} onClick={() => run(() => api.admin.ticketNote(id, note), 'Note added', () => setNote(''))}>Add note</Button></section></div>;
}

export function AdminAnalytics() {
  const [days, setDays] = useState(30); const q = useQuery({ queryKey: ['admin-analytics', days], queryFn: () => api.admin.analytics(days) });
  return <div className="space-y-6"><PageHead title="Analytics"><Select aria-label="Period" value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-auto">{[7, 30, 90, 365].map((d) => <option key={d} value={d}>Last {d} days</option>)}</Select></PageHead>
    {q.isError ? <ErrorState error={q.error} onRetry={q.refetch} /> : q.isLoading ? <Skeleton className="h-80" /> : <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3"><StatCard label="Revenue" value={formatNaira(q.data.totals.revenueKobo)} /><StatCard label="Paid orders" value={q.data.totals.orders} /><StatCard label="Average order" value={formatNaira(q.data.totals.aovKobo)} /></div>
      <section className="rounded-2xl border border-line bg-surface p-5"><h2 className="mb-3 text-2xl">Revenue</h2><SalesChart data={q.data.series} height={300} /></section>
      <div className="grid gap-6 lg:grid-cols-2"><section><h2 className="mb-3 text-2xl">Best sellers</h2><DataTable rowKey={(r) => r.name} rows={q.data.topProducts} columns={[{ key: 'name', label: 'Product' }, { key: 'units', label: 'Units' }, { key: 'r', label: 'Revenue', render: (r) => formatNaira(r.revenueKobo) }]} /></section>
        <section><h2 className="mb-3 text-2xl">Revenue by product line</h2><DataTable rowKey={(r) => r.type} rows={q.data.revenueByType} columns={[{ key: 'type', label: 'Line', render: (r) => r.type.replace(/_/g, ' ').toLowerCase() }, { key: 'r', label: 'Revenue', render: (r) => formatNaira(r.revenueKobo) }]} /></section></div></>}</div>;
}
