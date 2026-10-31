import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Search, Heart, ShoppingBag, User, Menu, Sparkles } from 'lucide-react';
import { Wordmark } from './Brand.jsx';
import { ThemeToggle } from './ThemeToggle.jsx';
import { Sheet } from '@/components/ui/index.jsx';
import { useUI } from '@/store/uiStore.js';
import { useCart } from '@/store/cartStore.js';
import { useAuth } from '@/store/authStore.js';
import { useWishlist } from '@/store/wishlistStore.js';

const LINKS = [['/shop', 'Shop'], ['/brands', 'Brands'], ['/shop/men', 'Men'], ['/shop/women', 'Women'], ['/shop?type=BODY_MIST,ROLL_ON,OIL_PERFUME,CANDLE,AIR_FRESHENER,POCKET_SCENT,DIFFUSER,BODY_CREAM,SOAP,SCRUB', 'Body & Home'], ['/scent-finder', 'Scent Finder'], ['/about', 'About'], ['/contact', 'Contact']];
const cls = ({ isActive }) => `rounded-full px-3 py-2 text-sm font-medium transition hover:text-accent ${isActive ? 'text-accent' : 'text-fg'}`;

const Icon = ({ label, onClick, to, children, badge }) => {
  const C = to ? Link : 'button';
  return (
    <C to={to} type={to ? undefined : 'button'} onClick={onClick} aria-label={label} className="relative grid size-11 place-items-center rounded-full transition hover:bg-surface-2">
      {children}{badge > 0 && <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-cta px-1 text-[0.62rem] font-bold leading-4 text-cta-fg" aria-hidden>{badge > 99 ? '99+' : badge}</span>}
    </C>
  );
};

export function Navbar() {
  const open = useUI((s) => s.open); const itemCount = useCart((s) => s.cart.itemCount);
  const user = useAuth((s) => s.user); const wish = useWishlist((s) => s.ids.length);
  const [menu, setMenu] = useState(false); const nav = useNavigate();
  return (
    <header className="sticky top-0 z-[var(--z-sticky)] border-b border-line bg-bg/85 backdrop-blur-xl">
      <a href="#main" className="sr-only-focusable absolute left-3 top-3 z-50 rounded-full bg-cta px-4 py-2 text-cta-fg">Skip to content</a>
      <div className="container-x flex h-16 items-center justify-between gap-2 lg:h-[4.5rem]">
        <div className="flex items-center gap-1">
          <button type="button" className="grid size-11 place-items-center rounded-full hover:bg-surface-2 lg:hidden" aria-label="Open menu" onClick={() => setMenu(true)}><Menu className="size-5" /></button>
          <Wordmark />
        </div>
        <nav aria-label="Main" className="hidden items-center gap-0.5 lg:flex">{LINKS.map(([to, t]) => <NavLink key={to} to={to} end={to === '/shop'} className={cls}>{t}</NavLink>)}</nav>
        <div className="flex items-center">
          <Icon label="Search" onClick={() => open('searchOpen')}><Search className="size-5" /></Icon>
          <span className="hidden sm:block"><Icon label="Wishlist" to={user ? '/account/wishlist' : '/account/wishlist'} badge={wish}><Heart className="size-5" /></Icon></span>
          <span className="hidden sm:block"><Icon label={user ? 'My account' : 'Sign in'} to={user ? '/account' : '/login'}><User className="size-5" /></Icon></span>
          <Icon label={`Cart, ${itemCount} items`} onClick={() => open('cartOpen')} badge={itemCount}><ShoppingBag className="size-5" /></Icon>
        </div>
      </div>
      <Sheet open={menu} onOpenChange={setMenu} title="Menu" side="left">
        <nav aria-label="Mobile" className="flex flex-col p-3">
          {LINKS.map(([to, t]) => <Link key={to} to={to} onClick={() => setMenu(false)} className="rounded-xl px-4 py-3.5 font-[var(--font-display)] text-2xl hover:bg-surface-2">{t}</Link>)}
          <Link to="/scent-finder" onClick={() => setMenu(false)} className="mt-3 flex items-center gap-2 rounded-xl bg-cta px-4 py-3.5 font-semibold text-cta-fg"><Sparkles className="size-4" /> Find your scent</Link>
          <div className="mt-6 flex items-center justify-between px-4"><span className="text-sm text-muted">Theme</span><ThemeToggle /></div>
          <Link to={user ? '/account' : '/login'} onClick={() => setMenu(false)} className="mt-4 rounded-xl px-4 py-3 text-sm font-semibold hover:bg-surface-2">{user ? 'My account' : 'Sign in / Create account'}</Link>
        </nav>
      </Sheet>
    </header>
  );
}
