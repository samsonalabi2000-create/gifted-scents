import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Lock, Store, Truck, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/api/endpoints.js';
import { Seo } from '@/components/Seo.jsx';
import { Button, Field, Input, Select, Textarea, EmptyState } from '@/components/ui/index.jsx';
import { SmartImage } from '@/components/shop/bits.jsx';
import { useCart } from '@/store/cartStore.js';
import { useAuth } from '@/store/authStore.js';
import { useSettings } from '@/hooks/useSettings.js';
import { formatNaira } from '@/utils/money.js';
import { NG_STATES } from '@/utils/states.js';
import { track } from '@/utils/analytics.js';

const schema = z.object({
  name: z.string().min(2, 'Enter your full name').max(100), email: z.string().email('Enter a valid email'),
  phone: z.string().regex(/^[+\d][\d\s-]{6,19}$/, 'Enter a valid phone number'), method: z.enum(['DELIVERY', 'PICKUP']),
  state: z.string().min(2, 'Select your state'), lga: z.string().min(2, 'Enter your LGA / area').max(80),
  address: z.string().min(5, 'Enter your delivery address').max(250), instructions: z.string().max(250).optional(), couponCode: z.string().max(40).optional(),
});

export default function Checkout() {
  const nav = useNavigate(); const user = useAuth((s) => s.user); const { cart, load } = useCart(); const { s } = useSettings();
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { method: 'DELIVERY', state: 'Lagos', name: '', email: '', phone: '', lga: '', address: '', instructions: '', couponCode: '' } });
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = form;
  const [coupon, setCoupon] = useState(''); const [err, setErr] = useState(null);
  const method = watch('method'); const state = watch('state');
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (user) { setValue('name', `${user.firstName} ${user.lastName}`.trim()); setValue('email', user.email); if (user.phone) setValue('phone', user.phone); } }, [user, setValue]);
  const addrs = useQuery({ queryKey: ['addresses'], queryFn: api.auth.addresses, enabled: Boolean(user) });
  useEffect(() => { const d = addrs.data?.find((a) => a.isDefault) || addrs.data?.[0]; if (d) { setValue('state', d.state); setValue('lga', d.lga); setValue('address', d.addressLine); } }, [addrs.data, setValue]);

  const quote = useQuery({ queryKey: ['quote', method, state, coupon, cart.subtotalKobo, cart.itemCount], queryFn: () => api.quote({ method, state, coupon: coupon || undefined }), enabled: cart.items.length > 0 });
  useEffect(() => { if (cart.items.length) track('begin_checkout', { value: cart.subtotalKobo / 100, currency: 'NGN' }); }, [cart.items.length]);

  if (!cart.items.length) return <div className="container-x py-16"><EmptyState icon={Store} title="Nothing to check out" text="Your cart is empty." action={<Button as={Link} to="/shop">Shop fragrances</Button>} /></div>;
  const t = quote.data?.totals; const shipErr = quote.data?.shipping?.error; const blocked = cart.issues.length > 0 || Boolean(shipErr);
  if (s['payments.enabled'] === false) { /* still allow placing the order; server will report if payment is unavailable */ }

  const submit = async (v) => {
    setErr(null);
    try {
      const r = await api.checkout({ ...v, couponCode: coupon || undefined });
      sessionStorage.setItem('gs-last-order', JSON.stringify({ orderNumber: r.order.orderNumber, token: r.order.publicToken }));
      window.location.assign(r.payment.authorizationUrl); // hosted Paystack checkout
    } catch (e) {
      if (e.code === 'CART_CHANGED') { await load(); setErr(e.details?.join(' ') || e.message); }
      else if (e.code === 'PAYMENTS_NOT_CONFIGURED' || e.status === 503) setErr('Online payment is not available right now. Please contact us on WhatsApp to complete your order.');
      else setErr(e.message);
      toast.error('We could not start your payment.');
    }
  };

  return (
    <div className="container-x py-8 lg:py-12">
      <Seo title="Checkout | Gifted Scents" path="/checkout" noindex />
      <h1 className="text-4xl sm:text-5xl">Checkout</h1>
      {!user && <p className="mt-2 text-sm text-muted">Checking out as a guest. <Link to="/login?next=/checkout" className="text-accent underline">Sign in</Link> to use saved addresses.</p>}
      <form onSubmit={handleSubmit(submit)} noValidate className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-8">
          <section className="space-y-4"><h2 className="text-2xl">Contact</h2>
            <Field label="Full name" error={errors.name?.message}>{(id, d) => <Input id={id} autoComplete="name" aria-describedby={d} error={errors.name} {...register('name')} />}</Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email" error={errors.email?.message}>{(id, d) => <Input id={id} type="email" autoComplete="email" inputMode="email" aria-describedby={d} error={errors.email} {...register('email')} />}</Field>
              <Field label="Phone / WhatsApp" error={errors.phone?.message}>{(id, d) => <Input id={id} type="tel" autoComplete="tel" inputMode="tel" aria-describedby={d} error={errors.phone} {...register('phone')} />}</Field></div></section>
          <section className="space-y-4"><h2 className="text-2xl">Delivery</h2>
            <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Delivery method">{[['DELIVERY', Truck, 'Home delivery'], ['PICKUP', Store, 'Pickup']].map(([v, I, l]) => (
              <label key={v} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border px-4 ${method === v ? 'border-accent bg-gold-300/10' : 'border-line'}`}><input type="radio" value={v} {...register('method')} className="accent-[var(--color-rose-500)]" /><I className="size-5 text-accent" />{l}</label>))}</div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="State" error={errors.state?.message}>{(id) => <Select id={id} autoComplete="address-level1" {...register('state')}>{NG_STATES.map((x) => <option key={x}>{x}</option>)}</Select>}</Field>
              <Field label="LGA / area" error={errors.lga?.message}>{(id, d) => <Input id={id} aria-describedby={d} error={errors.lga} {...register('lga')} />}</Field></div>
            <Field label={method === 'PICKUP' ? 'Your address (for records)' : 'Delivery address'} error={errors.address?.message}>{(id, d) => <Input id={id} autoComplete="street-address" aria-describedby={d} error={errors.address} {...register('address')} />}</Field>
            <Field label="Delivery instructions (optional)">{(id) => <Textarea id={id} className="min-h-20" {...register('instructions')} />}</Field>
            {shipErr && <p role="alert" className="rounded-xl bg-[var(--danger)]/10 p-3 text-sm text-[var(--danger)]">{shipErr}</p>}</section>
        </div>

        <aside className="h-fit space-y-5 rounded-3xl border border-line bg-surface p-5 lg:sticky lg:top-24 sm:p-6" aria-labelledby="sum-h">
          <h2 id="sum-h" className="text-2xl">Order summary</h2>
          <ul className="divide-y divide-line">{cart.items.map((i) => (
            <li key={i.id} className="flex gap-3 py-3"><div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-line"><SmartImage image={i.imageUrl ? { url: i.imageUrl } : null} alt="" label={i.brand} sizes="64px" /><span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-cta text-[0.65rem] font-bold text-cta-fg">{i.quantity}</span></div>
              <div className="min-w-0 flex-1 text-sm"><p className="truncate font-medium">{i.name}</p><p className="text-xs text-muted">{i.variantLabel}</p></div><p className="text-sm font-semibold tabular-nums">{formatNaira(i.lineTotalKobo)}</p></li>))}</ul>
          <div className="flex gap-2"><label className="sr-only" htmlFor="coupon">Coupon code</label><Input id="coupon" placeholder="Coupon code" className="h-11" onBlur={(e) => setCoupon(e.target.value.trim())} defaultValue={coupon} /><Button type="button" variant="outline" onClick={() => document.getElementById('coupon')?.blur()}><Tag className="size-4" />Apply</Button></div>
          {quote.data?.couponError && <p role="alert" className="text-xs text-[var(--danger)]">{quote.data.couponError}</p>}
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd className="tabular-nums">{formatNaira(t?.subtotalKobo ?? cart.subtotalKobo)}</dd></div>
            {t?.discountKobo > 0 && <div className="flex justify-between text-[var(--success)]"><dt>Discount</dt><dd className="tabular-nums">-{formatNaira(t.discountKobo)}</dd></div>}
            <div className="flex justify-between"><dt>{method === 'PICKUP' ? 'Pickup' : 'Delivery'}{quote.data?.shipping?.zone ? ` (${quote.data.shipping.zone})` : ''}</dt><dd className="tabular-nums">{t ? (t.shippingKobo === 0 ? 'Free' : formatNaira(t.shippingKobo)) : '—'}</dd></div>
            {quote.data?.shipping?.estimatedDays && <p className="text-xs text-muted">Estimated: {quote.data.shipping.estimatedDays}</p>}
            <div className="flex justify-between border-t border-line pt-3 text-lg font-semibold"><dt>Total</dt><dd className="tabular-nums">{t ? formatNaira(t.totalKobo) : '—'}</dd></div>
          </dl>
          {err && <p role="alert" className="rounded-xl bg-[var(--danger)]/10 p-3 text-sm text-[var(--danger)]">{err}</p>}
          {cart.issues.length > 0 && <ul role="alert" className="text-xs text-[var(--danger)]">{cart.issues.map((i) => <li key={i.itemId}>{i.message}</li>)}</ul>}
          <Button type="submit" size="lg" className="w-full" loading={isSubmitting} disabled={blocked || quote.isLoading}><Lock className="size-4" />Pay {t ? formatNaira(t.totalKobo) : ''} securely</Button>
          <p className="text-center text-xs text-muted">You will be redirected to Paystack to pay by card, bank transfer or USSD. By paying you agree to our <Link to="/terms" className="underline">terms</Link>.</p>
        </aside>
      </form>
    </div>
  );
}
