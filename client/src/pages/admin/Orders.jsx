import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, MessageCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/api/endpoints.js';
import { formatNaira } from '@/utils/money.js';
import { waLink } from '@/utils/whatsapp.js';
import { useSettings } from '@/hooks/useSettings.js';
import { useAuth } from '@/store/authStore.js';
import { Button, Input, Select, Textarea, ConfirmDialog, ErrorState, Skeleton } from '@/components/ui/index.jsx';
import { DataTable, PageHead, Pager } from '@/components/admin/kit.jsx';
import { StatusBadge } from '@/pages/account/Account.jsx';

const STATUSES = ['PENDING', 'PAID', 'PROCESSING', 'READY_FOR_DISPATCH', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];
const NEXT = { PENDING: ['CANCELLED'], PAID: ['PROCESSING', 'CANCELLED', 'REFUNDED'], PROCESSING: ['READY_FOR_DISPATCH', 'CANCELLED', 'REFUNDED'], READY_FOR_DISPATCH: ['SHIPPED', 'CANCELLED'], SHIPPED: ['DELIVERED', 'REFUNDED'], DELIVERED: ['REFUNDED'], CANCELLED: [], REFUNDED: [] };
const label = (s) => s.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

export function AdminOrders() {
  const [p, setP] = useSearchParams(); const nav = useNavigate(); const [q, setQ] = useState(p.get('q') || '');
  const params = { q: p.get('q') || undefined, status: p.get('status') || undefined, attention: p.get('attention') || undefined, page: p.get('page') || 1 };
  const list = useQuery({ queryKey: ['admin-orders', params], queryFn: () => api.admin.orders(params) });
  const set = (k, v) => { const n = new URLSearchParams(p); v ? n.set(k, v) : n.delete(k); n.delete('page'); setP(n, { replace: true }); };
  return (
    <div><PageHead title="Orders" sub={list.data ? `${list.data.meta.total} orders` : ''} />
      <form onSubmit={(e) => { e.preventDefault(); set('q', q.trim()); }} className="mb-5 flex flex-wrap gap-3" role="search">
        <label className="sr-only" htmlFor="oq">Search orders</label><Input id="oq" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Order no., name, email or phone" className="min-w-52 flex-1" />
        <Select aria-label="Status" value={p.get('status') || ''} onChange={(e) => set('status', e.target.value)} className="w-auto"><option value="">All statuses</option>{STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}</Select>
        <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={p.get('attention') === 'true'} onChange={(e) => set('attention', e.target.checked ? 'true' : '')} className="accent-[var(--color-rose-500)]" />Needs attention</label></form>
      {list.isError ? <ErrorState error={list.error} onRetry={list.refetch} /> : <DataTable loading={list.isLoading} rows={list.data?.items} onRowClick={(o) => nav(`/admin/orders/${o.id}`)} empty="No orders found." columns={[
        { key: 'orderNumber', label: 'Order', render: (o) => <span className="font-semibold">{o.needsAttention && <AlertTriangle className="mr-1 inline size-4 text-[var(--danger)]" aria-label="Needs attention" />}{o.orderNumber}</span> },
        { key: 'customerName', label: 'Customer' }, { key: 'createdAt', label: 'Date', render: (o) => new Date(o.createdAt).toLocaleDateString('en-NG', { dateStyle: 'medium' }) },
        { key: 'totalKobo', label: 'Total', render: (o) => formatNaira(o.totalKobo) }, { key: 'paymentStatus', label: 'Payment', render: (o) => o.paymentStatus }, { key: 'status', label: 'Status', render: (o) => <StatusBadge status={o.status} /> }]} />}
      <Pager meta={list.data?.meta} onPage={(n) => { const x = new URLSearchParams(p); x.set('page', n); setP(x); }} /></div>
  );
}

export function AdminOrderDetail() {
  const { id } = useParams(); const qc = useQueryClient(); const { s } = useSettings(); const isAdmin = useAuth((x) => x.user.role === 'ADMIN');
  const q = useQuery({ queryKey: ['admin-order', id], queryFn: () => api.admin.order(id) });
  const [next, setNext] = useState(''); const [note, setNote] = useState(''); const [track, setTrack] = useState(''); const [busy, setBusy] = useState(false); const [confirm, setConfirm] = useState(null);
  const refresh = () => { qc.invalidateQueries({ queryKey: ['admin-order', id] }); qc.invalidateQueries({ queryKey: ['admin-orders'] }); qc.invalidateQueries({ queryKey: ['admin-dash'] }); };
  const run = async (fn, ok) => { setBusy(true); try { await fn(); toast.success(ok); setNext(''); setNote(''); setConfirm(null); refresh(); } catch (e) { toast.error(e.message); } finally { setBusy(false); } };

  if (q.isLoading) return <Skeleton className="h-96" />; if (q.isError) return <ErrorState error={q.error} onRetry={q.refetch} />;
  const o = q.data; const wa = waLink(o.phone.replace(/^\+/, ''), `Hello ${o.customerName}, this is Gifted Scents about your order ${o.orderNumber}.`);
  const options = NEXT[o.status] || [];
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link to="/admin/orders" className="inline-flex items-center gap-1 text-sm text-muted hover:text-accent"><ChevronLeft className="size-4" />All orders</Link>
      <PageHead title={o.orderNumber} sub={new Date(o.createdAt).toLocaleString('en-NG')}><StatusBadge status={o.status} /><span className="rounded-full border border-line px-3 py-0.5 text-xs">Payment: {o.paymentStatus}</span></PageHead>
      {o.needsAttention && <p role="alert" className="rounded-2xl border border-[var(--danger)]/50 bg-[var(--danger)]/10 p-4 text-sm">This order was paid but stock could not be deducted automatically (or it was paid after being closed). Contact the customer or refund.</p>}
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-line bg-surface p-5"><h2 className="mb-3 text-2xl">Items</h2>
            <ul className="divide-y divide-line">{o.items.map((i) => <li key={i.id} className="flex justify-between gap-3 py-3 text-sm"><span>{i.productName} <span className="text-muted">({i.variantLabel}) · SKU {i.sku} × {i.quantity}</span></span><span className="tabular-nums">{formatNaira(i.lineTotalKobo)}</span></li>)}</ul>
            <dl className="mt-3 space-y-1 border-t border-line pt-3 text-sm"><div className="flex justify-between"><dt>Subtotal</dt><dd>{formatNaira(o.subtotalKobo)}</dd></div>{o.discountKobo > 0 && <div className="flex justify-between"><dt>Discount</dt><dd>-{formatNaira(o.discountKobo)}</dd></div>}<div className="flex justify-between"><dt>Shipping ({o.zone?.name || '—'})</dt><dd>{formatNaira(o.shippingKobo)}</dd></div><div className="flex justify-between text-lg font-semibold"><dt>Total</dt><dd>{formatNaira(o.totalKobo)}</dd></div></dl></section>
          <section className="rounded-2xl border border-line bg-surface p-5"><h2 className="mb-3 text-2xl">History</h2><ol className="space-y-3 text-sm">{o.history.map((h) => <li key={h.id} className="flex gap-3"><span className="mt-1.5 size-2 shrink-0 rounded-full bg-cta" /><div><p><b>{label(h.toStatus)}</b> <span className="text-muted">· {new Date(h.createdAt).toLocaleString('en-NG')}</span></p>{h.note && <p className="text-muted">{h.note}</p>}</div></li>)}</ol></section>
        </div>
        <div className="space-y-6">
          <section className="space-y-3 rounded-2xl border border-line bg-surface p-5"><h2 className="text-2xl">Update order</h2>
            {o.paymentStatus !== 'SUCCESS' && o.status === 'PENDING' && <Button variant="gold" className="w-full" onClick={() => setConfirm('pay')}>Confirm payment received</Button>}
            {options.length > 0 ? (<><Select aria-label="New status" value={next} onChange={(e) => setNext(e.target.value)}><option value="">Move to…</option>{options.map((s) => <option key={s} value={s}>{label(s)}</option>)}</Select>
              {next === 'SHIPPED' && <Input value={track} onChange={(e) => setTrack(e.target.value)} placeholder="Tracking / rider details (shown to customer)" aria-label="Tracking note" />}
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} className="min-h-20" placeholder="Internal note (optional)" aria-label="Note" />
              <Button className="w-full" disabled={!next} loading={busy} onClick={() => (['CANCELLED', 'REFUNDED'].includes(next) ? setConfirm('status') : run(() => api.admin.orderStatus(id, { status: next, note, trackingNote: track || undefined }), 'Order updated'))}>Update status</Button></>) : <p className="text-sm text-muted">This order is {label(o.status).toLowerCase()} and can&apos;t be changed.</p>}
            {isAdmin && o.paymentStatus === 'SUCCESS' && o.payments.some((p) => p.gateway === 'paystack' && p.status === 'SUCCESS') && <Button variant="outline" className="w-full" onClick={() => setConfirm('refund')}>Request Paystack refund</Button>}</section>
          <section className="space-y-1 rounded-2xl border border-line bg-surface p-5 text-sm"><h2 className="mb-2 text-2xl">Customer</h2><p className="font-semibold">{o.customerName}</p><p>{o.email}</p><p>{o.phone}</p><p className="pt-2">{o.addressLine}, {o.lga}, {o.state}</p>{o.instructions && <p className="text-muted">“{o.instructions}”</p>}
            {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 font-semibold text-accent"><MessageCircle className="size-4" />WhatsApp customer</a>}</section>
          <section className="rounded-2xl border border-line bg-surface p-5 text-sm"><h2 className="mb-2 text-2xl">Payments</h2>{o.payments.length === 0 ? <p className="text-muted">No payment attempts yet.</p> : <ul className="space-y-2">{o.payments.map((p) => <li key={p.id}><p className="font-medium">{p.gateway} · {p.status} · {formatNaira(p.amountKobo)}</p><p className="break-all text-xs text-muted">{p.reference}</p></li>)}</ul>}</section>
        </div>
      </div>
      <ConfirmDialog open={confirm === 'pay'} onOpenChange={() => setConfirm(null)} loading={busy} title="Confirm payment received?" description="Use this only for bank transfers or payments you have verified yourself. It deducts stock and marks the order paid. This action is logged." confirmLabel="Mark as paid" onConfirm={() => run(() => api.admin.confirmPayment(id, note), 'Payment confirmed')} />
      <ConfirmDialog open={confirm === 'status'} onOpenChange={() => setConfirm(null)} danger loading={busy} title={`Mark as ${label(next || '').toLowerCase()}?`} description={next === 'CANCELLED' ? 'Reserved stock is returned to inventory.' : 'This records a refund. Money must be returned to the customer separately unless you use Request Paystack refund.'} confirmLabel="Yes, continue" onConfirm={() => run(() => api.admin.orderStatus(id, { status: next, note }), 'Order updated')} />
      <ConfirmDialog open={confirm === 'refund'} onOpenChange={() => setConfirm(null)} danger loading={busy} title="Request a Paystack refund?" description="Sends a full refund request to Paystack for this payment. Also set the order to Refunded afterwards." confirmLabel="Request refund" onConfirm={() => run(() => api.admin.refund(id), 'Refund requested')} />
    </div>
  );
}
