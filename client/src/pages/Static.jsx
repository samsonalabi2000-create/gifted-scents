import { Link } from 'react-router-dom';
import { MessageCircle, Mail, Phone, MapPin, Clock } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { Seo } from '@/components/Seo.jsx';
import { Breadcrumbs } from '@/components/shop/Sections.jsx';
import { Button, Field, Input, Select, Textarea, EmptyState } from '@/components/ui/index.jsx';
import { useSettings } from '@/hooks/useSettings.js';
import { LogoImage } from '@/components/layout/Brand.jsx';
import { api } from '@/api/endpoints.js';
import { waLink, WA } from '@/utils/whatsapp.js';
import { formatNaira } from '@/utils/money.js';

const Page = ({ title, path, desc, children }) => (
  <><Seo title={`${title} | Gifted Scents`} description={desc} path={path} />
    <Breadcrumbs items={[{ name: 'Home', to: '/' }, { name: title }]} />
    <article className="container-x max-w-3xl py-8"><h1 className="text-4xl sm:text-5xl">{title}</h1><div className="prose-gs mt-6 space-y-4 leading-relaxed">{children}</div></article></>
);
const Text = ({ value }) => String(value || '').split(/\n{2,}/).map((para, i) => <p key={i} className="whitespace-pre-line">{para}</p>);
const Placeholder = ({ value }) => String(value).startsWith('[PLACEHOLDER]') ? <p role="note" className="rounded-xl border border-dashed border-[var(--warning)] bg-[var(--warning)]/10 p-3 text-sm">This section is waiting for the store owner&apos;s official wording.</p> : null;

const Legal = ({ title, path, k }) => () => { const { s } = useSettings(); const v = s[k] || ''; return <Page title={title} path={path}><Placeholder value={v} /><Text value={v} /></Page>; };
export const Privacy = Legal({ title: 'Privacy Policy', path: '/privacy', k: 'legal.privacy' });
export const Terms = Legal({ title: 'Terms & Conditions', path: '/terms', k: 'legal.terms' });
export const Returns = Legal({ title: 'Returns & Refunds', path: '/returns', k: 'legal.returns' });

export function About() {
  const { s } = useSettings(); const v = s['website.about'] || '';
  return <Page title="About Gifted Scents" path="/about" desc="Your Scent. Your Story. Your Gift."><LogoImage className="mb-4 size-40 rounded-3xl border border-line object-cover" /><p className="script text-4xl text-cta">{s['store.tagline2']}</p><Placeholder value={v} /><Text value={v} /></Page>;
}

export function Shipping() {
  const { s } = useSettings(); const zones = useQuery({ queryKey: ['zones'], queryFn: api.zones }); const v = s['website.shippingInfo'] || '';
  return <Page title="Delivery information" path="/shipping" desc="Delivery areas, fees and times."><Placeholder value={v} /><Text value={v} />
    {zones.data?.length > 0 && <div className="overflow-x-auto rounded-2xl border border-line"><table className="w-full min-w-[28rem] text-left text-sm"><thead className="bg-surface-2"><tr><th className="p-3">Area</th><th className="p-3">Fee</th><th className="p-3">Estimated time</th></tr></thead>
      <tbody>{zones.data.map((z) => <tr key={z.id} className="border-t border-line"><td className="p-3 font-medium">{z.name}</td><td className="p-3">{z.feeKobo === 0 ? 'Free' : formatNaira(z.feeKobo)}{z.freeAboveKobo ? <span className="text-muted"> (free above {formatNaira(z.freeAboveKobo)})</span> : null}</td><td className="p-3">{z.estimatedDays || '—'}</td></tr>)}</tbody></table></div>}</Page>;
}

export function Faq() {
  const { s } = useSettings(); const items = s['website.faq'] || [];
  return <Page title="Frequently asked questions" path="/faq" desc="Answers to common questions.">
    {items.length === 0 ? <p className="text-muted">No questions yet.</p> : items.map((f, i) => <details key={i} className="group rounded-2xl border border-line bg-surface p-4"><summary className="flex cursor-pointer list-none items-center justify-between font-semibold">{f.q}<span aria-hidden className="text-muted transition group-open:rotate-45">+</span></summary><div className="mt-2 text-muted"><Text value={f.a} /></div></details>)}</Page>;
}

const schema = z.object({ name: z.string().min(2, 'Enter your name'), email: z.string().email('Enter a valid email'), phone: z.string().optional(), orderNumber: z.string().optional(), category: z.string().min(1), message: z.string().min(10, 'Please write at least 10 characters') });
export function Contact() {
  const { s } = useSettings(); const [done, setDone] = useState(null); const wa = waLink(s['support.whatsapp'], WA.help);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema), defaultValues: { category: 'General question' } });
  const submit = async (v) => { try { const r = await api.support({ ...v, subject: v.category }); setDone(r.ticketNumber); toast.success('Message sent'); } catch (e) { toast.error(e.message); } };
  return (
    <Page title="Contact us" path="/contact" desc="Get in touch with Gifted Scents.">
      <div className="grid gap-8 md:grid-cols-[1fr_1.3fr]">
        <ul className="space-y-4 text-sm not-prose">
          {wa && <li><a href={wa} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-2xl bg-cta p-4 font-semibold text-cta-fg"><MessageCircle className="size-5" />Chat on WhatsApp</a></li>}
          {s['store.phone'] && <li className="flex gap-3"><Phone className="size-5 text-accent" /><a href={`tel:${s['store.phone']}`}>{s['store.phone']}</a></li>}
          {(s['support.email'] || s['store.email']) && <li className="flex gap-3"><Mail className="size-5 text-accent" /><a href={`mailto:${s['support.email'] || s['store.email']}`}>{s['support.email'] || s['store.email']}</a></li>}
          {s['store.address'] && <li className="flex gap-3"><MapPin className="size-5 text-accent" />{s['store.address']}</li>}
          {s['store.hours'] && <li className="flex gap-3"><Clock className="size-5 text-accent" />{s['store.hours']}</li>}
          {s['support.availability'] && <li className="text-muted">{s['support.availability']}</li>}
        </ul>
        {done ? <div role="status" className="rounded-3xl border border-line bg-surface p-8 text-center"><h2 className="text-3xl">Thank you!</h2><p className="mt-2 text-muted">Your request <b>{done}</b> has been received. We will reply by email.</p></div> : (
          <form onSubmit={handleSubmit(submit)} noValidate className="space-y-4 rounded-3xl border border-line bg-surface p-6">
            <Field label="Name" error={errors.name?.message}>{(id) => <Input id={id} autoComplete="name" {...register('name')} />}</Field>
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Email" error={errors.email?.message}>{(id) => <Input id={id} type="email" autoComplete="email" {...register('email')} />}</Field><Field label="Phone (optional)">{(id) => <Input id={id} type="tel" {...register('phone')} />}</Field></div>
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Order number (optional)">{(id) => <Input id={id} placeholder="GS-…" {...register('orderNumber')} />}</Field>
              <Field label="Topic">{(id) => <Select id={id} {...register('category')}>{['General question', 'Order problem', 'Payment issue', 'Delivery', 'Refund or return', 'Product question', 'Other'].map((o) => <option key={o}>{o}</option>)}</Select>}</Field></div>
            <Field label="Message" error={errors.message?.message}>{(id) => <Textarea id={id} {...register('message')} />}</Field>
            <Button type="submit" size="lg" loading={isSubmitting}>Send message</Button></form>)}
      </div>
    </Page>
  );
}

