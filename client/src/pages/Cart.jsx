import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Lock } from 'lucide-react';
import { Seo } from '@/components/Seo.jsx';
import { Button, EmptyState } from '@/components/ui/index.jsx';
import { CartLines } from '@/components/layout/CartDrawer.jsx';
import { useCart } from '@/store/cartStore.js';
import { formatNaira } from '@/utils/money.js';

export default function CartPage() {
  const { cart, load } = useCart(); useEffect(() => { load(); }, [load]);
  const blocked = cart.issues.length > 0;
  return (
    <div className="container-x py-10">
      <Seo title="Your cart | Gifted Scents" path="/cart" noindex /><h1 className="text-4xl sm:text-5xl">Your cart</h1>
      {cart.items.length === 0 ? <div className="mt-8"><EmptyState icon={ShoppingBag} title="Your cart is empty" text="Find a scent that tells your story." action={<Button as={Link} to="/shop">Shop fragrances</Button>} /></div> : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          <div>{blocked && <ul role="alert" className="mb-4 rounded-2xl border border-[var(--danger)]/40 bg-[var(--danger)]/10 p-4 text-sm">{cart.issues.map((i) => <li key={i.itemId}>{i.message}</li>)}</ul>}<CartLines /></div>
          <aside className="h-fit space-y-4 rounded-3xl border border-line bg-surface p-6 lg:sticky lg:top-24">
            <h2 className="text-2xl">Summary</h2>
            <div className="flex justify-between"><span>Subtotal</span><span className="font-semibold tabular-nums">{formatNaira(cart.subtotalKobo)}</span></div>
            <p className="text-xs text-muted">Delivery fee and coupons are calculated at checkout based on your state.</p>
            <Button as={Link} to="/checkout" size="lg" className="w-full" aria-disabled={blocked}>Proceed to checkout</Button>
            <p className="flex items-center justify-center gap-1.5 text-xs text-muted"><Lock className="size-3.5" />Secure checkout with Paystack</p>
          </aside>
        </div>)}
    </div>
  );
}
