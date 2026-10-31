import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { api } from '@/api/endpoints.js';
import { Seo } from '@/components/Seo.jsx';
import { Button, Field, Input } from '@/components/ui/index.jsx';
import { useAuth } from '@/store/authStore.js';
import { useCart } from '@/store/cartStore.js';
import { useWishlist } from '@/store/wishlistStore.js';
import { LogoImage } from '@/components/layout/Brand.jsx';

const Shell = ({ title, sub, children, footer }) => (
  <div className="container-x grid min-h-[70dvh] place-items-center py-12">
    <Seo title={`${title} | Gifted Scents`} noindex />
    <div className="w-full max-w-md rounded-3xl border border-line bg-surface p-7 sm:p-9">
      <LogoImage className="mx-auto mb-4 size-20 rounded-2xl object-cover" /><h1 className="text-center text-4xl">{title}</h1>{sub && <p className="mt-1 text-center text-sm text-muted">{sub}</p>}
      <div className="mt-6">{children}</div><div className="mt-6 text-center text-sm text-muted">{footer}</div>
    </div>
  </div>
);
const pw = z.string().min(8, 'At least 8 characters').regex(/[A-Za-z]/, 'Include a letter').regex(/\d/, 'Include a number');
const safeNext = (n) => (n && n.startsWith('/') && !n.startsWith('//') ? n : '/account');

const afterLogin = async (user, nav, next) => {
  useAuth.getState().setUser(user);
  await Promise.all([useCart.getState().load(), useWishlist.getState().syncAfterLogin()]);
  nav(['ADMIN', 'STAFF'].includes(user.role) && next === '/account' ? '/admin' : next, { replace: true });
};

export function Login() {
  const nav = useNavigate(); const [p] = useSearchParams(); const next = safeNext(p.get('next'));
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(z.object({ email: z.string().email('Enter a valid email'), password: z.string().min(1, 'Enter your password') })) });
  const submit = async (v) => { try { const { user } = await api.auth.login(v); toast.success('Welcome back!'); await afterLogin(user, nav, next); } catch (e) { toast.error(e.message); } };
  return (
    <Shell title="Sign in" sub="Welcome back to Gifted Scents" footer={<>New here? <Link to={`/register?next=${encodeURIComponent(next)}`} className="text-accent underline">Create an account</Link></>}>
      <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
        <Field label="Email" error={errors.email?.message}>{(id, d) => <Input id={id} type="email" autoComplete="email" aria-describedby={d} error={errors.email} {...register('email')} />}</Field>
        <Field label="Password" error={errors.password?.message}>{(id, d) => <Input id={id} type="password" autoComplete="current-password" aria-describedby={d} error={errors.password} {...register('password')} />}</Field>
        <div className="text-right text-sm"><Link to="/forgot-password" className="text-accent underline">Forgot password?</Link></div>
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>Sign in</Button>
      </form>
    </Shell>
  );
}

export function Register() {
  const nav = useNavigate(); const [p] = useSearchParams(); const next = safeNext(p.get('next'));
  const schema = z.object({ firstName: z.string().min(1, 'Required').max(60), lastName: z.string().min(1, 'Required').max(60), email: z.string().email('Enter a valid email'), phone: z.string().regex(/^[+\d][\d\s-]{6,19}$/, 'Enter a valid phone number').optional().or(z.literal('')), password: pw });
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) });
  const submit = async (v) => { try { const { user } = await api.auth.register({ ...v, phone: v.phone || undefined }); toast.success('Account created'); await afterLogin(user, nav, next); } catch (e) { toast.error(e.message); } };
  return (
    <Shell title="Create account" sub="Optional: you can always check out as a guest" footer={<>Already have an account? <Link to="/login" className="text-accent underline">Sign in</Link></>}>
      <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" error={errors.firstName?.message}>{(id, d) => <Input id={id} autoComplete="given-name" aria-describedby={d} error={errors.firstName} {...register('firstName')} />}</Field>
          <Field label="Last name" error={errors.lastName?.message}>{(id, d) => <Input id={id} autoComplete="family-name" aria-describedby={d} error={errors.lastName} {...register('lastName')} />}</Field></div>
        <Field label="Email" error={errors.email?.message}>{(id, d) => <Input id={id} type="email" autoComplete="email" aria-describedby={d} error={errors.email} {...register('email')} />}</Field>
        <Field label="Phone (optional)" error={errors.phone?.message}>{(id, d) => <Input id={id} type="tel" autoComplete="tel" aria-describedby={d} error={errors.phone} {...register('phone')} />}</Field>
        <Field label="Password" hint="8+ characters with a letter and a number" error={errors.password?.message}>{(id, d) => <Input id={id} type="password" autoComplete="new-password" aria-describedby={d} error={errors.password} {...register('password')} />}</Field>
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>Create account</Button>
      </form>
    </Shell>
  );
}

export function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(z.object({ email: z.string().email('Enter a valid email') })) });
  const submit = async ({ email }) => { try { await api.auth.forgot(email); setSent(true); } catch (e) { toast.error(e.message); } };
  return (
    <Shell title="Reset password" sub="We'll email you a reset link" footer={<Link to="/login" className="text-accent underline">Back to sign in</Link>}>
      {sent ? <p role="status" className="rounded-2xl bg-surface-2 p-4 text-sm">If an account exists for that email, a reset link is on its way. It expires in 30 minutes.</p> : (
        <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
          <Field label="Email" error={errors.email?.message}>{(id, d) => <Input id={id} type="email" autoComplete="email" aria-describedby={d} error={errors.email} {...register('email')} />}</Field>
          <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>Send reset link</Button></form>)}
    </Shell>
  );
}

export function ResetPassword() {
  const [p] = useSearchParams(); const nav = useNavigate(); const token = p.get('token') || '';
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(z.object({ password: pw })) });
  const submit = async ({ password }) => { try { await api.auth.reset({ token, password }); toast.success('Password updated. Please sign in.'); nav('/login'); } catch (e) { toast.error(e.message); } };
  return (
    <Shell title="Choose a new password" footer={<Link to="/login" className="text-accent underline">Back to sign in</Link>}>
      {!token ? <p role="alert">This reset link is invalid.</p> : (
        <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
          <Field label="New password" error={errors.password?.message}>{(id, d) => <Input id={id} type="password" autoComplete="new-password" aria-describedby={d} error={errors.password} {...register('password')} />}</Field>
          <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>Update password</Button></form>)}
    </Shell>
  );
}
