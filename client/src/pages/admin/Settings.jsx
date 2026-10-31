import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/api/endpoints.js';
import { formatNaira, nairaToKobo, koboToNaira } from '@/utils/money.js';
import { Button, Field, Input, Textarea, Select, ErrorState, Skeleton, Badge } from '@/components/ui/index.jsx';
import { PageHead, ImageUploader } from '@/components/admin/kit.jsx';
import { NG_STATES } from '@/utils/states.js';

const TABS = ['Store', 'Support & WhatsApp', 'Social', 'Website', 'Policies', 'Shipping', 'Coupons', 'Assistant', 'Analytics'];
const T = (key, label, o = {}) => ({ key, label, ...o });
const FIELDS = {
  Store: [T('store.name', 'Store name'), T('store.tagline', 'Tagline'), T('store.tagline2', 'Second tagline'), T('store.phone', 'Phone'), T('store.email', 'Store email'), T('store.address', 'Address', { area: true }), T('store.hours', 'Business hours', { area: true, hint: 'e.g. Mon–Sat 9am–6pm' }), T('inventory.lowStockThreshold', 'Low-stock warning at (units)', { number: true })],
  'Support & WhatsApp': [T('support.whatsapp', 'WhatsApp number', { hint: 'Digits with country code, e.g. 2348055806394' }), T('support.email', 'Support email (new requests are sent here)'), T('support.availability', 'Support availability text', { area: true })],
  Social: ['instagram', 'facebook', 'tiktok', 'x', 'youtube'].map((k) => T(`social.${k}`, `${k[0].toUpperCase() + k.slice(1)} URL`, { hint: 'Leave empty to hide' })),
  Website: [T('website.announcement', 'Announcement bar text'), T('website.footerText', 'Footer text'), T('website.seoTitle', 'Default SEO title'), T('website.seoDescription', 'Default SEO description', { area: true }), T('website.about', 'About page', { area: true, tall: true }), T('website.shippingInfo', 'Shipping page text', { area: true, tall: true })],
  Policies: [T('legal.privacy', 'Privacy policy', { area: true, tall: true }), T('legal.terms', 'Terms & conditions', { area: true, tall: true }), T('legal.returns', 'Returns & refunds', { area: true, tall: true }), T('legal.cookies', 'Cookie / tracking notice', { area: true, tall: true })],
  Assistant: [T('ai.name', 'Assistant name'), T('ai.greeting', 'Greeting', { area: true })],
  Analytics: [T('analytics.gaId', 'Google Analytics measurement ID', { hint: 'G-XXXXXXXXXX' }), T('analytics.metaPixelId', 'Meta Pixel ID'), T('analytics.searchConsoleToken', 'Search Console verification token')],
};

function SettingsForm({ tab, values, onSaved }) {
  const [v, setV] = useState({}); const [busy, setBusy] = useState(false);
  useEffect(() => { setV({ ...values }); }, [values, tab]);
  const set = (k, x) => setV((s) => ({ ...s, [k]: x }));
  const save = async () => { setBusy(true); try { const keys = [...FIELDS[tab].map((f) => f.key), ...(tab === 'Website' ? ['website.announcementEnabled', 'website.hero', 'website.faq', 'store.logoUrl'] : []), ...(tab === 'Store' ? ['store.logoUrl'] : []), ...(tab === 'Assistant' ? ['ai.enabled'] : [])]; const body = {}; for (const k of keys) if (k in v) body[k] = v[k] === '' ? null : v[k]; await api.admin.settingsSave(body); toast.success('Settings saved'); onSaved(); } catch (e) { toast.error(e.message); } finally { setBusy(false); } };
  const hero = v['website.hero'] || {}; const faq = v['website.faq'] || [];
  return (
    <div className="space-y-5">
      {FIELDS[tab].map((f) => <Field key={f.key} label={f.label} hint={f.hint}>{(id) => f.area ? <Textarea id={id} className={f.tall ? 'min-h-56' : ''} value={v[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)} /> : <Input id={id} type={f.number ? 'number' : 'text'} value={v[f.key] ?? ''} onChange={(e) => set(f.key, f.number ? Number(e.target.value) : e.target.value)} />}</Field>)}
      {tab === 'Store' && <Field label="Logo (replaces the text wordmark in the header)">{() => <div><ImageUploader folder="site" max={1} images={v['store.logoUrl'] ? [{ url: v['store.logoUrl'], storageKey: 'logo' }] : []} onChange={(fn) => { const list = typeof fn === 'function' ? fn(v['store.logoUrl'] ? [{ url: v['store.logoUrl'], storageKey: 'logo' }] : []) : fn; set('store.logoUrl', list[list.length - 1]?.url || null); }} />{v['store.logoUrl'] && <Button variant="ghost" size="sm" onClick={() => set('store.logoUrl', null)}>Use the default wordmark</Button>}</div>}</Field>}
      {tab === 'Assistant' && <label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={v['ai.enabled'] !== false} onChange={(e) => set('ai.enabled', e.target.checked)} className="size-4 accent-[var(--color-rose-500)]" />Chat assistant enabled</label>}
      {tab === 'Website' && <>
        <label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={v['website.announcementEnabled'] !== false} onChange={(e) => set('website.announcementEnabled', e.target.checked)} className="size-4 accent-[var(--color-rose-500)]" />Show announcement bar</label>
        <fieldset className="space-y-3 rounded-2xl border border-line p-4"><legend className="px-1 font-semibold">Homepage hero</legend>
          {[['headline', 'Headline'], ['subhead', 'Supporting text'], ['ctaPrimary', 'Primary button'], ['ctaSecondary', 'Secondary button']].map(([k, l]) => <Field key={k} label={l}>{(id) => <Input id={id} value={hero[k] || ''} onChange={(e) => set('website.hero', { ...hero, [k]: e.target.value })} />}</Field>)}
          <Field label="Hero image (default: the Gifted Scents logo art)">{() => <ImageUploader folder="site" max={1} images={hero.imageUrl ? [{ url: hero.imageUrl, storageKey: 'hero' }] : []} onChange={(fn) => { const list = typeof fn === 'function' ? fn(hero.imageUrl ? [{ url: hero.imageUrl, storageKey: 'hero' }] : []) : fn; set('website.hero', { ...hero, imageUrl: list[list.length - 1]?.url || null }); }} />}</Field></fieldset>
        <fieldset className="space-y-3 rounded-2xl border border-line p-4"><legend className="px-1 font-semibold">FAQ</legend>
          {faq.map((f, i) => <div key={i} className="space-y-2 rounded-xl bg-surface-2 p-3"><Input aria-label={`Question ${i + 1}`} placeholder="Question" value={f.q} onChange={(e) => set('website.faq', faq.map((x, n) => (n === i ? { ...x, q: e.target.value } : x)))} /><Textarea aria-label={`Answer ${i + 1}`} className="min-h-20" placeholder="Answer" value={f.a} onChange={(e) => set('website.faq', faq.map((x, n) => (n === i ? { ...x, a: e.target.value } : x)))} /><Button type="button" size="sm" variant="ghost" onClick={() => set('website.faq', faq.filter((_, n) => n !== i))}><Trash2 className="size-4" />Remove</Button></div>)}
          <Button type="button" variant="outline" onClick={() => set('website.faq', [...faq, { q: '', a: '' }])}><Plus className="size-4" />Add question</Button></fieldset></>}
      <Button loading={busy} onClick={save}>Save changes</Button>
    </div>
  );
}

function Zones() {
  const qc = useQueryClient(); const q = useQuery({ queryKey: ['admin-zones'], queryFn: api.admin.zones }); const [edit, setEdit] = useState(null);
  const save = async () => { try { const z = edit; await api.admin.zoneSave(z.id, { name: z.name, method: z.method, feeKobo: nairaToKobo(z.fee), freeAboveKobo: z.freeAbove ? nairaToKobo(z.freeAbove) : null, states: z.method === 'DELIVERY' && !z.isFallback ? z.states : [], estimatedDays: z.estimatedDays || null, isActive: z.isActive, isFallback: Boolean(z.isFallback), sortOrder: z.sortOrder || 0 }); toast.success('Saved'); setEdit(null); qc.invalidateQueries({ queryKey: ['admin-zones'] }); } catch (e) { toast.error(e.message); } };
  if (q.isLoading) return <Skeleton className="h-40" />; if (q.isError) return <ErrorState error={q.error} onRetry={q.refetch} />;
  return <div className="space-y-4"><p className="text-sm text-muted">Fees and times are shown to customers at checkout. Mark one delivery zone as the catch-all for every other state.</p>
    <ul className="space-y-2">{q.data.map((z) => <li key={z.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4"><div><p className="font-semibold">{z.name} {!z.isActive && <Badge>Off</Badge>} {z.isFallback && <Badge tone="gold">All other states</Badge>}</p><p className="text-sm text-muted">{z.method === 'PICKUP' ? 'Pickup' : z.states.join(', ') || 'Fallback'} · {z.feeKobo === 0 ? 'Free' : formatNaira(z.feeKobo)}{z.freeAboveKobo ? ` · free above ${formatNaira(z.freeAboveKobo)}` : ''} · {z.estimatedDays || 'no estimate set'}</p></div>
      <Button size="sm" variant="outline" onClick={() => setEdit({ ...z, fee: koboToNaira(z.feeKobo), freeAbove: z.freeAboveKobo ? koboToNaira(z.freeAboveKobo) : '' })}>Edit</Button></li>)}</ul>
    <Button variant="outline" onClick={() => setEdit({ name: '', method: 'DELIVERY', fee: 0, freeAbove: '', states: [], estimatedDays: '', isActive: true })}><Plus className="size-4" />Add zone</Button>
    {edit && <div className="space-y-3 rounded-2xl border border-accent p-5"><h3 className="text-2xl">{edit.id ? 'Edit zone' : 'New zone'}</h3>
      <Field label="Name">{(id) => <Input id={id} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />}</Field>
      <div className="grid gap-3 sm:grid-cols-3"><Field label="Type">{(id) => <Select id={id} value={edit.method} onChange={(e) => setEdit({ ...edit, method: e.target.value })}><option value="DELIVERY">Delivery</option><option value="PICKUP">Pickup</option></Select>}</Field>
        <Field label="Fee (₦)">{(id) => <Input id={id} type="number" min="0" value={edit.fee} onChange={(e) => setEdit({ ...edit, fee: e.target.value })} />}</Field>
        <Field label="Free above (₦, optional)">{(id) => <Input id={id} type="number" min="0" value={edit.freeAbove} onChange={(e) => setEdit({ ...edit, freeAbove: e.target.value })} />}</Field></div>
      <Field label="Estimated time (shown to customers)">{(id) => <Input id={id} value={edit.estimatedDays || ''} onChange={(e) => setEdit({ ...edit, estimatedDays: e.target.value })} placeholder="1–2 business days" />}</Field>
      {edit.method === 'DELIVERY' && <><label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={Boolean(edit.isFallback)} onChange={(e) => setEdit({ ...edit, isFallback: e.target.checked })} className="size-4 accent-[var(--color-rose-500)]" />This zone covers every state not listed elsewhere</label>
        {!edit.isFallback && <fieldset><legend className="mb-2 text-sm font-medium">States in this zone</legend><div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto">{NG_STATES.map((s) => <label key={s} className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm ${edit.states.includes(s) ? 'border-cta bg-cta text-cta-fg' : 'border-line'}`}><input type="checkbox" className="sr-only" checked={edit.states.includes(s)} onChange={() => setEdit({ ...edit, states: edit.states.includes(s) ? edit.states.filter((x) => x !== s) : [...edit.states, s] })} />{s}</label>)}</div></fieldset>}</>}
      <label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={edit.isActive} onChange={(e) => setEdit({ ...edit, isActive: e.target.checked })} className="size-4 accent-[var(--color-rose-500)]" />Active</label>
      <div className="flex gap-2"><Button onClick={save}>Save zone</Button><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button></div></div>}</div>;
}

function Coupons() {
  const qc = useQueryClient(); const q = useQuery({ queryKey: ['admin-coupons'], queryFn: api.admin.coupons }); const [n, setN] = useState({ code: '', type: 'PERCENT', value: 10, minSubtotal: 0 });
  const add = async () => { try { await api.admin.couponCreate({ code: n.code, type: n.type, value: n.type === 'PERCENT' ? Number(n.value) : nairaToKobo(n.value), minSubtotalKobo: nairaToKobo(n.minSubtotal) }); toast.success('Coupon created'); setN({ code: '', type: 'PERCENT', value: 10, minSubtotal: 0 }); qc.invalidateQueries({ queryKey: ['admin-coupons'] }); } catch (e) { toast.error(e.details?.[0]?.message || e.message); } };
  return <div className="space-y-4"><ul className="space-y-2">{q.data?.map((c) => <li key={c.id} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-3 text-sm"><span><b>{c.code}</b> · {c.type === 'PERCENT' ? `${c.value}% off` : `${formatNaira(c.value)} off`} · used {c.usedCount}{c.maxUses ? `/${c.maxUses}` : ''}</span><Button size="sm" variant="outline" onClick={async () => { await api.admin.couponToggle(c.id, !c.isActive); qc.invalidateQueries({ queryKey: ['admin-coupons'] }); }}>{c.isActive ? 'Disable' : 'Enable'}</Button></li>)}</ul>
    <div className="grid gap-3 rounded-2xl border border-line p-4 sm:grid-cols-5"><Field label="Code" className="sm:col-span-2">{(id) => <Input id={id} value={n.code} onChange={(e) => setN({ ...n, code: e.target.value.toUpperCase() })} />}</Field><Field label="Type">{(id) => <Select id={id} value={n.type} onChange={(e) => setN({ ...n, type: e.target.value })}><option value="PERCENT">Percent</option><option value="FIXED">Fixed ₦</option></Select>}</Field><Field label={n.type === 'PERCENT' ? 'Percent' : 'Amount (₦)'}>{(id) => <Input id={id} type="number" min="1" value={n.value} onChange={(e) => setN({ ...n, value: e.target.value })} />}</Field><Field label="Min. order (₦)">{(id) => <Input id={id} type="number" min="0" value={n.minSubtotal} onChange={(e) => setN({ ...n, minSubtotal: e.target.value })} />}</Field><Button className="sm:col-span-5 sm:w-fit" onClick={add} disabled={n.code.length < 3}>Create coupon</Button></div></div>;
}

export default function AdminSettings() {
  const [tab, setTab] = useState(TABS[0]); const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin-settings'], queryFn: api.admin.settings });
  return (
    <div className="mx-auto max-w-3xl"><PageHead title="Settings" sub="Everything the store shows, without touching code" />
      <div role="tablist" aria-label="Settings sections" className="mb-6 flex gap-1 overflow-x-auto pb-1">{TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`h-11 shrink-0 rounded-full px-4 text-sm font-medium ${tab === t ? 'bg-cta text-cta-fg' : 'border border-line hover:bg-surface-2'}`}>{t}</button>)}</div>
      <div role="tabpanel">{tab === 'Shipping' ? <Zones /> : tab === 'Coupons' ? <Coupons /> : q.isError ? <ErrorState error={q.error} onRetry={q.refetch} /> : q.isLoading ? <Skeleton className="h-64" /> : <SettingsForm tab={tab} values={q.data.values} onSaved={() => { qc.invalidateQueries({ queryKey: ['admin-settings'] }); qc.invalidateQueries({ queryKey: ['settings'] }); }} />}</div>
    </div>
  );
}
