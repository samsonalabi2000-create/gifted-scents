import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { api } from '@/api/endpoints.js';
import { formatNaira } from '@/utils/money.js';
import { StatCard, DataTable, PageHead } from '@/components/admin/kit.jsx';
import { StatusBadge } from '@/pages/account/Account.jsx';
import { ErrorState, Skeleton } from '@/components/ui/index.jsx';
import { SalesChart, StatusBars } from '@/components/admin/Charts.jsx';

export default function Dashboard() {
  const d = useQuery({ queryKey: ['admin-dash'], queryFn: api.admin.dashboard, refetchInterval: 60_000 });
  const series = useQuery({ queryKey: ['admin-series', 30], queryFn: () => api.admin.analytics(30), retry: false });
  if (d.isLoading) return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>;
  if (d.isError) return <ErrorState error={d.error} onRetry={d.refetch} />;
  const x = d.data;
  return (
    <div className="space-y-8">
      <PageHead title="Overview" sub="Live numbers for your store" />
      {x.needsAttention > 0 && <Link to="/admin/orders?attention=true" className="flex items-center gap-3 rounded-2xl border border-[var(--danger)]/50 bg-[var(--danger)]/10 p-4 text-sm font-medium"><AlertTriangle className="size-5 text-[var(--danger)]" />{x.needsAttention} paid order(s) need attention (stock shortfall). Open them now.</Link>}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Sales today" value={formatNaira(x.today.revenueKobo)} sub={`${x.today.orders} order(s)`} />
        <StatCard label="Sales this month" value={formatNaira(x.month.revenueKobo)} sub={`${x.month.orders} order(s)`} />
        <StatCard label="Total sales" value={formatNaira(x.all.revenueKobo)} sub={`${x.all.orders} paid order(s)`} />
        <StatCard label="Pending orders" value={x.pendingOrders} sub={`${x.completedOrders} completed`} tone={x.pendingOrders ? 'warn' : undefined} />
        <StatCard label="Low stock" value={x.lowStockCount} tone={x.lowStockCount ? 'warn' : undefined} sub="variants at or below threshold" />
        <StatCard label="Open support" value={x.openTickets} sub={`${x.newTickets} new`} tone={x.newTickets ? 'warn' : undefined} />
        <StatCard label="Reviews to approve" value={x.pendingReviews} />
        <StatCard label="Products · Customers" value={`${x.products} · ${x.customers}`} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <section className="rounded-2xl border border-line bg-surface p-5"><h2 className="mb-3 text-2xl">Sales, last 30 days</h2>{series.data ? <SalesChart data={series.data.series} /> : series.isError ? <p className="py-16 text-center text-sm text-muted">The sales chart is available to administrators.</p> : <Skeleton className="h-64" />}</section>
        <section className="rounded-2xl border border-line bg-surface p-5"><h2 className="mb-3 text-2xl">Orders by status</h2><StatusBars counts={x.statusCounts} /></section>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <section><h2 className="mb-3 text-2xl">Recent orders</h2><DataTable rows={x.recentOrders} columns={[{ key: 'orderNumber', label: 'Order', render: (o) => <Link to={`/admin/orders/${o.id}`} className="font-semibold text-accent">{o.orderNumber}</Link> }, { key: 'customerName', label: 'Customer' }, { key: 'totalKobo', label: 'Total', render: (o) => formatNaira(o.totalKobo) }, { key: 'status', label: 'Status', render: (o) => <StatusBadge status={o.status} /> }]} /></section>
        <section><h2 className="mb-3 text-2xl">Top sellers</h2><DataTable rows={x.topProducts} rowKey={(r) => r.name} empty="No paid orders yet." columns={[{ key: 'name', label: 'Product' }, { key: 'units', label: 'Units' }, { key: 'revenueKobo', label: 'Revenue', render: (r) => formatNaira(r.revenueKobo) }]} /></section>
        <section><h2 className="mb-3 text-2xl">Low stock</h2><DataTable rows={x.lowStock} empty="All stocked up." columns={[{ key: 'productName', label: 'Product', render: (r) => <Link to={`/admin/products/${r.productId}`} className="text-accent">{r.productName}</Link> }, { key: 'label', label: 'Size' }, { key: 'stock', label: 'Left' }]} /></section>
        <section><h2 className="mb-3 text-2xl">Newest customers</h2><DataTable rows={x.recentCustomers} columns={[{ key: 'firstName', label: 'Name', render: (c) => `${c.firstName} ${c.lastName}` }, { key: 'email', label: 'Email' }, { key: 'createdAt', label: 'Joined', render: (c) => new Date(c.createdAt).toLocaleDateString('en-NG') }]} /></section>
      </div>
      <section className="rounded-2xl border border-line bg-surface p-5"><h2 className="mb-3 text-2xl">Payments</h2><div className="flex flex-wrap gap-6 text-sm">{x.payments.map((p) => <div key={p.status}><p className="text-muted">{p.status}</p><p className="font-semibold">{p.count} · {formatNaira(p.amountKobo)}</p></div>)}</div></section>
    </div>
  );
}
