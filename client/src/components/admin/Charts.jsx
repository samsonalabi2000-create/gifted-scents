import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Cell } from 'recharts';
import { formatNaira } from '@/utils/money.js';

const tick = { fill: 'var(--text-muted)', fontSize: 11 };
const short = (k) => (k >= 100_000_000 ? `${(k / 100_000_000).toFixed(1)}m` : k >= 100_000 ? `${Math.round(k / 100_000)}k` : String(k / 100));

export function SalesChart({ data, height = 260 }) {
  return (
    <div style={{ height }} role="img" aria-label="Daily sales chart">
      <ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{ left: -10, right: 8, top: 8 }}>
        <defs><linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--color-rose-500)" stopOpacity={0.45} /><stop offset="1" stopColor="var(--color-rose-500)" stopOpacity={0} /></linearGradient></defs>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="date" tick={tick} tickFormatter={(d) => d.slice(5)} interval="preserveStartEnd" minTickGap={24} stroke="var(--border)" />
        <YAxis tick={tick} tickFormatter={(v) => `₦${short(v)}`} stroke="var(--border)" width={56} />
        <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text)' }} formatter={(v, n) => (n === 'revenueKobo' ? [formatNaira(v), 'Revenue'] : [v, 'Orders'])} labelFormatter={(l) => new Date(l).toLocaleDateString('en-NG', { dateStyle: 'medium' })} />
        <Area type="monotone" dataKey="revenueKobo" stroke="var(--color-rose-500)" strokeWidth={2} fill="url(#salesFill)" />
      </AreaChart></ResponsiveContainer>
    </div>
  );
}

const ORDER = ['PENDING', 'PAID', 'PROCESSING', 'READY_FOR_DISPATCH', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];
export function StatusBars({ counts }) {
  const data = ORDER.map((k) => ({ k: k.replace(/_/g, ' ').toLowerCase(), v: counts[k] || 0 }));
  return (
    <div style={{ height: 260 }} role="img" aria-label="Orders by status">
      <ResponsiveContainer width="100%" height="100%"><BarChart data={data} layout="vertical" margin={{ left: 20, right: 12 }}>
        <XAxis type="number" tick={tick} allowDecimals={false} stroke="var(--border)" /><YAxis type="category" dataKey="k" tick={tick} width={110} stroke="var(--border)" />
        <Tooltip cursor={{ fill: 'var(--surface-2)' }} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 }} />
        <Bar dataKey="v" radius={[0, 6, 6, 0]}>{data.map((d, i) => <Cell key={i} fill={i === 5 ? 'var(--color-gold-400)' : i >= 6 ? 'var(--color-ink-700)' : 'var(--color-rose-500)'} />)}</Bar>
      </BarChart></ResponsiveContainer>
    </div>
  );
}
