import { useState } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, Users, Star, LifeBuoy, BarChart3, Settings, Menu, LogOut, ExternalLink } from 'lucide-react';
import { Sheet } from '@/components/ui/index.jsx';
import { ThemeToggle } from '@/components/layout/ThemeToggle.jsx';
import { Wordmark } from '@/components/layout/Brand.jsx';
import { useAuth } from '@/store/authStore.js';
import { Seo } from '@/components/Seo.jsx';

const ITEMS = [['/admin', 'Dashboard', LayoutDashboard, true, 'all'], ['/admin/products', 'Products', Package, false, 'all'], ['/admin/orders', 'Orders', ShoppingCart, false, 'all'], ['/admin/customers', 'Customers', Users, false, 'all'], ['/admin/reviews', 'Reviews', Star, false, 'admin'], ['/admin/support', 'Support', LifeBuoy, false, 'all'], ['/admin/analytics', 'Analytics', BarChart3, false, 'admin'], ['/admin/settings', 'Settings', Settings, false, 'admin']];

function Nav({ onNavigate }) {
  const user = useAuth((s) => s.user);
  return <nav aria-label="Admin" className="flex flex-col gap-1 p-3">{ITEMS.filter((i) => i[4] === 'all' || user.role === 'ADMIN').map(([to, l, I, end]) => (
    <NavLink key={to} to={to} end={end} onClick={onNavigate} className={({ isActive }) => `flex h-11 items-center gap-3 rounded-xl px-3.5 text-sm font-medium ${isActive ? 'bg-cta text-cta-fg' : 'hover:bg-surface-2'}`}><I className="size-[1.1rem]" aria-hidden />{l}</NavLink>))}</nav>;
}

export default function AdminLayout() {
  const [open, setOpen] = useState(false); const { user, logout } = useAuth(); const go = useNavigate();
  return (
    <div className="min-h-dvh bg-bg lg:grid lg:grid-cols-[15rem_1fr]">
      <Seo title="Admin | Gifted Scents" noindex />
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-surface lg:flex"><div className="border-b border-line p-5"><Wordmark /><p className="mt-1 text-[0.65rem] uppercase tracking-widest text-muted">Store admin</p></div><div className="flex-1 overflow-y-auto"><Nav /></div>
        <div className="space-y-2 border-t border-line p-4 text-sm"><p className="truncate font-medium">{user.firstName} {user.lastName}</p><p className="text-xs text-muted">{user.role}</p><ThemeToggle /></div></aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-[var(--z-sticky)] flex h-14 items-center justify-between gap-3 border-b border-line bg-bg/90 px-4 backdrop-blur lg:px-8">
          <button className="grid size-11 place-items-center rounded-full hover:bg-surface-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Open admin menu"><Menu /></button>
          <span className="lg:hidden"><Wordmark /></span><span className="hidden text-sm text-muted lg:block">Gifted Scents admin</span>
          <div className="flex items-center gap-1"><Link to="/" target="_blank" className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm hover:bg-surface-2"><ExternalLink className="size-4" />View store</Link>
            <button onClick={async () => { await logout(); go('/login'); }} className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm hover:bg-surface-2"><LogOut className="size-4" />Sign out</button></div>
        </header>
        <Sheet open={open} onOpenChange={setOpen} title="Admin menu" side="left"><Nav onNavigate={() => setOpen(false)} /><div className="p-4"><ThemeToggle /></div></Sheet>
        <main className="p-4 pb-16 sm:p-6 lg:p-8"><Outlet /></main>
      </div>
    </div>
  );
}
