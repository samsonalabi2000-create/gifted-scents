import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Heart, Package, User, MapPin, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/api/endpoints.js';
import { Seo } from '@/components/Seo.jsx';
import { Button, Field, Input, Select, EmptyState, Badge, ConfirmDialog, Skeleton } from '@/components/ui/index.jsx';
import { ProductGrid } from '@/components/shop/ProductCard.jsx';
import { useAuth } from '@/store/authStore.js';
import { useWishlist } from '@/store/wishlistStore.js';
import { formatNaira } from '@/utils/money.js';
import { NG_STATES } from '@/utils/states.js';
import { useState } from 'react';

const nav = [['/account', 'Overview', User, true], ['/account/orders', 'Orders', Package], ['/account/wishlist', 'Wishlist', Heart], ['/account/addresses', 'Addresses', MapPin], ['/account/profile', 'Profile', User]];

export function AccountLayout() {
  const user = useAuth((s) => s.user); const logout = useAuth((s) => s.logout); const go = useNavigate();
  return (
    <div className="container-x grid gap-8 py-10 lg:grid-cols-[14rem_1fr]">
      <Seo title="My account | Gifted Scents" noindex />
      <aside><p className="font-[var(--font-display)] text-3xl">Hi, {user?.firstName}</p>
        <nav aria-label="Account" className="mt-4 flex gap-1 overflow-x-auto lg:flex-col">{nav.map(([to, l, I, end]) => <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-medium ${isActive ? 'bg-cta text-cta-fg' : 'hover:bg-surface-2'}`}><I className="size-4" />{l}</NavLink>)}
          <button onClick={async () => { await logout(); useWishlist.getState().reset(); go('/'); }} className="flex h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-medium text-muted hover:bg-surface-2"><LogOut className="size-4" />Sign out</button></nav></aside>
      <div><Outlet /></div>
    </div>
  );
}

export function AccountHome() {
  const orders = useQuery({ queryKey: ['my-orders'], queryFn: api.myOrders });
  return <div className="space-y-6"><h1 className="text-4xl">Your account</h1>
    <div className="rounded-3xl border border-line bg-surface p-6"><h2 className="text-2xl">Recent orders</h2>{orders.isLoading ? <Skeleton className="mt-4 h-20" /> : orders.data?.length ? <OrderList orders={orders.data.slice(0, 3)} /> : <p className="mt-2 text-muted">No orders yet. <Link to="/shop" className="text-accent underline">Start shopping</Link></p>}</div></div>;
}

const TONE = { PAID: 'success', PROCESSING: 'gold', READY_FOR_DISPATCH: 'gold', SHIPPED: 'gold', DELIVERED: 'success', CANCELLED: 'danger', REFUNDED: 'warn', PENDING: 'warn' };
export const StatusBadge = ({ status }) => <Badge tone={TONE[status] || 'neutral'}>{String(status).replace(/_/g, ' ')}</Badge>;
const OrderList = ({ orders }) => <ul className="mt-4 divide-y divide-line">{orders.map((o) => (
  <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="font-semibold">{o.orderNumber}</p><p className="text-xs text-muted">{new Date(o.createdAt).toLocaleDateString('en-NG', { dateStyle: 'medium' })} · {o.items.map((i) => `${i.productName} ×${i.quantity}`).join(', ').slice(0, 70)}</p></div><div className="flex items-center gap-3"><StatusBadge status={o.status} /><span className="font-semibold tabular-nums">{formatNaira(o.totalKobo)}</span></div></li>))}</ul>;

export function AccountOrders() {
  const orders = useQuery({ queryKey: ['my-orders'], queryFn: api.myOrders });
  return <div><h1 className="text-4xl">Orders</h1>{orders.isLoading ? <Skeleton className="mt-6 h-40" /> : orders.data?.length ? <OrderList orders={orders.data} /> : <div className="mt-6"><EmptyState icon={Package} title="No orders yet" action={<Button as={Link} to="/shop">Shop now</Button>} /></div>}</div>;
}

export function AccountWishlist() {
  const user = useAuth((s) => s.user); const ids = useWishlist((s) => s.ids);
  const q = useQuery({ queryKey: ['wishlist', ids.length], queryFn: async () => (user ? (await api.wishlist()).items : (ids.length ? (await api.products({ ids: ids.join(',') })).items : [])), staleTime: 0 });
  return <div><h1 className="text-4xl">Wishlist</h1><div className="mt-6">{q.isLoading ? <ProductGrid loading count={4} cols="grid-cols-2 xl:grid-cols-3" /> : q.data?.length ? <ProductGrid items={q.data} cols="grid-cols-2 xl:grid-cols-3" /> : <EmptyState icon={Heart} title="Nothing saved yet" text="Tap the heart on any product to save it here." action={<Button as={Link} to="/shop">Browse</Button>} />}</div></div>;
}

const addrSchema = z.object({ recipient: z.string().min(2), phone: z.string().regex(/^[+\d][\d\s-]{6,19}$/, 'Enter a valid phone'), state: z.string().min(2), lga: z.string().min(2), addressLine: z.string().min(5), label: z.string().optional(), isDefault: z.boolean().optional() });
export function AccountAddresses() {
  const qc = useQueryClient(); const q = useQuery({ queryKey: ['addresses'], queryFn: api.auth.addresses }); const [del, setDel] = useState(null);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(addrSchema), defaultValues: { state: 'Lagos' } });
  const add = async (v) => { try { await api.auth.addressSave(null, v); toast.success('Address saved'); reset({ state: 'Lagos' }); qc.invalidateQueries({ queryKey: ['addresses'] }); } catch (e) { toast.error(e.message); } };
  return <div className="space-y-8"><h1 className="text-4xl">Addresses</h1>
    <ul className="grid gap-3 sm:grid-cols-2">{q.data?.map((a) => <li key={a.id} className="rounded-2xl border border-line bg-surface p-4 text-sm"><p className="font-semibold">{a.recipient} {a.isDefault && <Badge tone="gold">Default</Badge>}</p><p>{a.addressLine}, {a.lga}, {a.state}</p><p className="text-muted">{a.phone}</p><button className="mt-2 text-xs text-[var(--danger)] underline" onClick={() => setDel(a)}>Remove</button></li>)}</ul>
    <form onSubmit={handleSubmit(add)} className="grid gap-4 rounded-3xl border border-line bg-surface p-6 sm:grid-cols-2" noValidate><h2 className="text-2xl sm:col-span-2">Add an address</h2>
      <Field label="Recipient" error={errors.recipient?.message}>{(id) => <Input id={id} {...register('recipient')} />}</Field>
      <Field label="Phone" error={errors.phone?.message}>{(id) => <Input id={id} type="tel" {...register('phone')} />}</Field>
      <Field label="State">{(id) => <Select id={id} {...register('state')}>{NG_STATES.map((s) => <option key={s}>{s}</option>)}</Select>}</Field>
      <Field label="LGA / area" error={errors.lga?.message}>{(id) => <Input id={id} {...register('lga')} />}</Field>
      <Field label="Street address" className="sm:col-span-2" error={errors.addressLine?.message}>{(id) => <Input id={id} {...register('addressLine')} />}</Field>
      <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" {...register('isDefault')} className="size-4 accent-[var(--color-rose-500)]" />Make this my default address</label>
      <Button type="submit" loading={isSubmitting} className="sm:col-span-2 sm:w-fit">Save address</Button></form>
    <ConfirmDialog open={Boolean(del)} onOpenChange={() => setDel(null)} title="Remove this address?" danger confirmLabel="Remove" onConfirm={async () => { await api.auth.addressDelete(del.id); setDel(null); qc.invalidateQueries({ queryKey: ['addresses'] }); }} /></div>;
}

export function AccountProfile() {
  const { user, setUser } = useAuth();
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({ defaultValues: { firstName: user.firstName, lastName: user.lastName, phone: user.phone || '' } });
  const pwf = useForm(); 
  const save = async (v) => { try { setUser((await api.auth.update(v)).user); toast.success('Profile updated'); } catch (e) { toast.error(e.message); } };
  const change = async (v) => { try { await api.auth.password(v); toast.success('Password changed. Please sign in again.'); useAuth.setState({ user: null }); } catch (e) { toast.error(e.message); } };
  return <div className="max-w-xl space-y-10"><h1 className="text-4xl">Profile</h1>
    <form onSubmit={handleSubmit(save)} className="space-y-4"><div className="grid grid-cols-2 gap-3"><Field label="First name">{(id) => <Input id={id} {...register('firstName')} />}</Field><Field label="Last name">{(id) => <Input id={id} {...register('lastName')} />}</Field></div>
      <Field label="Email">{(id) => <Input id={id} value={user.email} disabled readOnly />}</Field><Field label="Phone">{(id) => <Input id={id} type="tel" {...register('phone')} />}</Field><Button type="submit" loading={isSubmitting}>Save changes</Button></form>
    <form onSubmit={pwf.handleSubmit(change)} className="space-y-4 border-t border-line pt-8"><h2 className="text-2xl">Change password</h2>
      <Field label="Current password">{(id) => <Input id={id} type="password" autoComplete="current-password" {...pwf.register('current', { required: true })} />}</Field>
      <Field label="New password" hint="8+ characters with a letter and a number">{(id) => <Input id={id} type="password" autoComplete="new-password" {...pwf.register('next', { required: true, minLength: 8 })} />}</Field><Button type="submit" variant="outline">Change password</Button></form></div>;
}
