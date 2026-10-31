import { NavLink } from 'react-router-dom';
import { Home, LayoutGrid, Search, ShoppingBag, User } from 'lucide-react';
import { useUI } from '@/store/uiStore.js';
import { useCart } from '@/store/cartStore.js';

const base = 'flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[0.68rem] font-medium';
export function MobileBottomNav() {
  const open = useUI((s) => s.open); const count = useCart((s) => s.cart.itemCount);
  const a = ({ isActive }) => `${base} ${isActive ? 'text-accent' : 'text-muted'}`;
  return (
    <nav aria-label="Quick navigation" className="fixed inset-x-0 bottom-0 z-[var(--z-sticky)] flex border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
      <NavLink to="/" end className={a}><Home className="size-5" aria-hidden />Home</NavLink>
      <NavLink to="/shop" className={a}><LayoutGrid className="size-5" aria-hidden />Shop</NavLink>
      <button type="button" className={`${base} text-muted`} onClick={() => open('searchOpen')}><Search className="size-5" aria-hidden />Search</button>
      <button type="button" className={`${base} text-muted relative`} onClick={() => open('cartOpen')}>
        <span className="relative"><ShoppingBag className="size-5" aria-hidden />{count > 0 && <span className="absolute -right-2 -top-1.5 grid min-w-4 place-items-center rounded-full bg-cta px-1 text-[0.6rem] font-bold text-cta-fg">{count}</span>}</span>Cart
      </button>
      <NavLink to="/account" className={a}><User className="size-5" aria-hidden />Account</NavLink>
    </nav>
  );
}
