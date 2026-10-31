import { Link } from 'react-router-dom';
import { Trash2, ShoppingBag, AlertTriangle } from 'lucide-react';
import { Sheet, Button, EmptyState } from '@/components/ui/index.jsx';
import { useUI } from '@/store/uiStore.js';
import { useCart } from '@/store/cartStore.js';
import { formatNaira } from '@/utils/money.js';
import { SmartImage, QuantitySelector } from '@/components/shop/bits.jsx';

export function CartLines({ compact }) {
  const { cart, setQty, remove } = useCart();
  return (
    <ul className="divide-y divide-line">
      {cart.items.map((it) => (
        <li key={it.id} className="flex gap-4 py-4">
          <Link to={`/product/${it.slug}`} className="block aspect-[4/5] w-20 shrink-0 overflow-hidden rounded-xl border border-line"><SmartImage image={it.imageUrl ? { url: it.imageUrl } : null} alt={it.name} label={it.brand} sizes="80px" /></Link>
          <div className="min-w-0 flex-1">
            <p className="eyebrow !text-[0.62rem]">{it.brand}</p>
            <Link to={`/product/${it.slug}`} className="line-clamp-2 font-[var(--font-display)] text-lg leading-tight">{it.name}</Link>
            <p className="text-xs text-muted">{it.variantLabel}</p>
            {!it.available && <p className="mt-1 flex items-center gap-1 text-xs text-[var(--danger)]"><AlertTriangle className="size-3.5" />{it.stock === 0 ? 'No longer available' : `Only ${it.stock} left`}</p>}
            <div className="mt-2 flex items-center justify-between gap-2">
              <QuantitySelector value={it.quantity} onChange={(q) => setQty(it.id, q)} min={1} max={Math.max(1, Math.min(10, it.stock || 1))} label={`Quantity for ${it.name}`} />
              <span className="font-semibold tabular-nums">{formatNaira(it.lineTotalKobo)}</span>
            </div>
          </div>
          <button type="button" onClick={() => remove(it.id)} aria-label={`Remove ${it.name}`} className="grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-[var(--danger)]"><Trash2 className="size-4" /></button>
        </li>
      ))}
    </ul>
  );
}

export function CartDrawer() {
  const open = useUI((s) => s.cartOpen); const close = useUI((s) => s.close); const cart = useCart((s) => s.cart);
  const blocked = cart.issues.length > 0;
  return (
    <Sheet open={open} onOpenChange={(v) => !v && close('cartOpen')} title="Your bag" description={cart.itemCount ? `${cart.itemCount} item${cart.itemCount > 1 ? 's' : ''}` : undefined}>
      {cart.items.length === 0 ? (
        <div className="p-5"><EmptyState icon={ShoppingBag} title="Your bag is empty" text="Discover a scent that tells your story." action={<Button as={Link} to="/shop" onClick={() => close('cartOpen')}>Shop fragrances</Button>} /></div>
      ) : (
        <div className="flex h-full flex-col">
          <div className="flex-1 overflow-y-auto px-5"><CartLines /></div>
          <div className="space-y-3 border-t border-line bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between text-base"><span>Subtotal</span><span className="font-semibold tabular-nums">{formatNaira(cart.subtotalKobo)}</span></div>
            <p className="text-xs text-muted">Delivery and any coupon are calculated at checkout.</p>
            {blocked && <p role="alert" className="text-xs text-[var(--danger)]">Some items need attention before you can check out.</p>}
            <Button as={Link} to="/checkout" size="lg" className="w-full" onClick={() => close('cartOpen')} aria-disabled={blocked}>Checkout</Button>
            <Button as={Link} to="/cart" variant="ghost" className="w-full" onClick={() => close('cartOpen')}>View full cart</Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
