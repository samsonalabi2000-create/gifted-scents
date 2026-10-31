import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/api/endpoints.js';
import { Button, Field, Input, Select, Textarea, Spinner, ErrorState } from '@/components/ui/index.jsx';
import { ImageUploader } from '@/components/admin/kit.jsx';
import { nairaToKobo, koboToNaira } from '@/utils/money.js';
import { PRODUCT_LINES } from '@/utils/productLines.js';

const TYPES = [['FRAGRANCE', 'Perfume'], ...PRODUCT_LINES.map((l) => [l.type, l.name]), ['GIFT_SET', 'Gift set'], ['DECANT', 'Decant'], ['SAMPLE', 'Sample']];
const NOTE_TYPES = new Set(['FRAGRANCE', 'OIL_PERFUME', 'GIFT_SET', 'BODY_MIST', 'ROLL_ON', 'DECANT', 'SAMPLE', 'POCKET_SCENT']); // others hide the fragrance-only sections
const OCC = ['Everyday', 'Office', 'Date Night', 'Wedding', 'Evening', 'Party', 'Vacation', 'Formal', 'Gift'];
const blank = { name: '', type: 'FRAGRANCE', brandId: '', categoryId: '', familyId: '', gender: 'UNISEX', shortDescription: '', description: '', concentration: '', longevity: '', sillage: '', occasions: [], isFeatured: false, isBestseller: false, isNewArrival: false, isActive: false, seoTitle: '', seoDescription: '', seoKeywords: '', variants: [{ label: '100ml', sizeMl: 100, sku: '', price: '', salePrice: '', stock: 0, isDefault: true, isActive: true }], images: [], notes: { TOP: '', HEART: '', BASE: '' }, relations: [] };

const toForm = (p) => ({
  ...blank, ...p, categoryId: p.categoryId || '', familyId: p.familyId || '', concentration: p.concentration || '', longevity: p.longevity || '', sillage: p.sillage || '',
  shortDescription: p.shortDescription || '', description: p.description || '', seoTitle: p.seoTitle || '', seoDescription: p.seoDescription || '', seoKeywords: p.seoKeywords || '',
  variants: p.variants.map((v) => ({ ...v, price: koboToNaira(v.priceKobo), salePrice: v.salePriceKobo ? koboToNaira(v.salePriceKobo) : '' })),
  images: p.images.map((i) => ({ id: i.id, url: i.url, storageKey: i.storageKey, alt: i.alt || '', width: i.width, height: i.height })),
  notes: ['TOP', 'HEART', 'BASE'].reduce((a, l) => ({ ...a, [l]: p.notes.filter((n) => n.layer === l).map((n) => n.name).join(', ') }), {}),
  relations: p.relations || [],
});

export default function ProductEditor() {
  const { id } = useParams(); const isNew = !id || id === 'new'; const nav = useNavigate(); const qc = useQueryClient();
  const opts = useQuery({ queryKey: ['editor-opts'], queryFn: async () => ({ brands: await api.admin.taxonomy('brands').list(), cats: await api.admin.taxonomy('categories').list(), fams: await api.admin.taxonomy('fragrance-families').list() }) });
  const existing = useQuery({ queryKey: ['admin-product', id], queryFn: () => api.admin.product(id), enabled: !isNew });
  const [f, setF] = useState(blank); const [busy, setBusy] = useState(false); const [rel, setRel] = useState('');
  useEffect(() => { if (existing.data) setF(toForm(existing.data)); }, [existing.data]);
  const relOpts = useQuery({ queryKey: ['rel-opts', rel], queryFn: () => api.admin.productOptions(rel), enabled: rel.length > 1 });
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const setVar = (i, k, v) => setF((x) => ({ ...x, variants: x.variants.map((r, n) => (n === i ? { ...r, [k]: v } : k === 'isDefault' && v ? { ...r, isDefault: false } : r)) }));
  const noteFields = NOTE_TYPES.has(f.type);

  const save = async (publish) => {
    if (!f.name.trim()) return toast.error('Give the product a name.');
    if (!f.brandId) return toast.error('Choose a brand.');
    for (const v of f.variants) { if (!v.label || !v.sku) return toast.error('Every size needs a label and a SKU.'); if (!(Number(v.price) >= 1)) return toast.error(`Set a price for ${v.label || 'each size'}.`); }
    const body = {
      ...f, isActive: publish ?? f.isActive, categoryId: f.categoryId || null, familyId: noteFields ? f.familyId || null : null, concentration: f.concentration || null, longevity: f.longevity || null, sillage: f.sillage || null,
      variants: f.variants.map((v) => ({ id: v.id, label: v.label, sizeMl: v.sizeMl || null, sku: v.sku, priceKobo: nairaToKobo(v.price), salePriceKobo: v.salePrice ? nairaToKobo(v.salePrice) : null, stock: Number(v.stock) || 0, lowStockAt: v.lowStockAt || null, isDefault: v.isDefault, isActive: v.isActive !== false })),
      notes: noteFields ? ['TOP', 'HEART', 'BASE'].flatMap((layer) => f.notes[layer].split(',').map((n) => n.trim()).filter(Boolean).map((name) => ({ name, layer }))) : [],
      images: f.images.map(({ url, storageKey, alt, width, height }) => ({ url, storageKey, alt, width, height })),
    };
    delete body.id; delete body.brand; delete body.category; delete body.family; delete body.relationsFrom; delete body.createdAt; delete body.updatedAt;
    setBusy(true);
    try {
      const saved = isNew ? await api.admin.productCreate(body) : await api.admin.productUpdate(id, body);
      toast.success(publish ? 'Published' : 'Saved'); qc.invalidateQueries({ queryKey: ['admin-products'] }); qc.invalidateQueries({ queryKey: ['admin-product', saved.id] });
      if (isNew) nav(`/admin/products/${saved.id}`, { replace: true }); else setF(toForm(saved));
    } catch (e) { toast.error(e.details?.[0]?.message || e.message); } finally { setBusy(false); }
  };

  if (!isNew && existing.isLoading) return <div className="grid place-items-center py-20"><Spinner className="size-8" /></div>;
  if (!isNew && existing.isError) return <ErrorState error={existing.error} onRetry={existing.refetch} />;
  const sect = 'space-y-4 rounded-2xl border border-line bg-surface p-5';
  const sel = (k, list, empty = '—') => <Select value={f[k]} onChange={(e) => set(k, e.target.value)}><option value="">{empty}</option>{list.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>;

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-28">
      <Link to="/admin/products" className="inline-flex items-center gap-1 text-sm text-muted hover:text-accent"><ChevronLeft className="size-4" />All products</Link>
      <h1 className="text-3xl sm:text-4xl">{isNew ? 'Add product' : f.name || 'Edit product'}</h1>

      <section className={sect}><h2 className="text-2xl">Basics</h2>
        <Field label="Product name">{(id) => <Input id={id} value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Sauvage Eau de Toilette" />}</Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Product type">{(id) => <Select id={id} value={f.type} onChange={(e) => set('type', e.target.value)}>{TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>}</Field>
          <Field label="Brand">{(id) => <Select id={id} value={f.brandId} onChange={(e) => set('brandId', e.target.value)}><option value="">Choose brand…</option>{opts.data?.brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select>}</Field>
          <Field label="Category">{(id) => <Select id={id} value={f.categoryId} onChange={(e) => set('categoryId', e.target.value)}><option value="">None</option>{opts.data?.cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>}</Field>
          <Field label="For">{(id) => <Select id={id} value={f.gender} onChange={(e) => set('gender', e.target.value)}><option value="MEN">Men</option><option value="WOMEN">Women</option><option value="UNISEX">Unisex</option></Select>}</Field></div>
        <Field label="Short description" hint="Shown on cards and in search results">{(id) => <Input id={id} value={f.shortDescription} maxLength={300} onChange={(e) => set('shortDescription', e.target.value)} />}</Field>
        <Field label="Full description">{(id) => <Textarea id={id} value={f.description} onChange={(e) => set('description', e.target.value)} className="min-h-40" />}</Field></section>

      <section className={sect}><h2 className="text-2xl">Sizes, prices & stock</h2><p className="text-sm text-muted">Each size has its own price, SKU and stock. Prices are in naira.</p>
        <div className="space-y-4">{f.variants.map((v, i) => (
          <div key={v.id || i} className="grid gap-3 rounded-xl border border-line p-3 sm:grid-cols-6">
            <Field label="Size / option" className="sm:col-span-2">{(id) => <Input id={id} value={v.label} onChange={(e) => setVar(i, 'label', e.target.value)} placeholder="100ml, Decant, Gift set…" />}</Field>
            <Field label="SKU" className="sm:col-span-2">{(id) => <Input id={id} value={v.sku} onChange={(e) => setVar(i, 'sku', e.target.value.toUpperCase())} />}</Field>
            <Field label="Stock">{(id) => <Input id={id} type="number" min="0" inputMode="numeric" value={v.stock} onChange={(e) => setVar(i, 'stock', e.target.value)} />}</Field>
            <Field label="Size (ml)">{(id) => <Input id={id} type="number" min="0" value={v.sizeMl || ''} onChange={(e) => setVar(i, 'sizeMl', e.target.value)} />}</Field>
            <Field label="Price (₦)" className="sm:col-span-2">{(id) => <Input id={id} type="number" min="1" inputMode="decimal" value={v.price} onChange={(e) => setVar(i, 'price', e.target.value)} />}</Field>
            <Field label="Sale price (₦)" className="sm:col-span-2">{(id) => <Input id={id} type="number" min="0" inputMode="decimal" value={v.salePrice} onChange={(e) => setVar(i, 'salePrice', e.target.value)} />}</Field>
            <div className="flex items-end justify-between gap-3 sm:col-span-2"><label className="flex items-center gap-2 text-sm"><input type="radio" name="def" checked={v.isDefault} onChange={() => setVar(i, 'isDefault', true)} className="accent-[var(--color-rose-500)]" />Default</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={v.isActive !== false} onChange={(e) => setVar(i, 'isActive', e.target.checked)} className="accent-[var(--color-rose-500)]" />Active</label>
              <button type="button" aria-label="Remove size" disabled={f.variants.length === 1} onClick={() => set('variants', f.variants.filter((_, n) => n !== i))} className="grid size-10 place-items-center rounded-full text-[var(--danger)] hover:bg-surface-2 disabled:opacity-30"><Trash2 className="size-4" /></button></div>
          </div>))}</div>
        <Button type="button" variant="outline" onClick={() => set('variants', [...f.variants, { label: '', sizeMl: '', sku: '', price: '', salePrice: '', stock: 0, isDefault: false, isActive: true }])}><Plus className="size-4" />Add another size</Button></section>

      <section className={sect}><h2 className="text-2xl">Photos</h2><ImageUploader images={f.images} onChange={(fn) => setF((x) => ({ ...x, images: typeof fn === 'function' ? fn(x.images) : fn }))} /></section>

      {noteFields && (
        <section className={sect}><h2 className="text-2xl">Fragrance details <span className="text-sm font-normal text-muted">(all optional)</span></h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Fragrance family">{(id) => <Select id={id} value={f.familyId} onChange={(e) => set('familyId', e.target.value)}><option value="">—</option>{opts.data?.fams.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select>}</Field>
            <Field label="Concentration">{(id) => <Select id={id} value={f.concentration} onChange={(e) => set('concentration', e.target.value)}><option value="">—</option>{[['PARFUM', 'Parfum'], ['EDP', 'Eau de Parfum'], ['EDT', 'Eau de Toilette'], ['EDC', 'Eau de Cologne'], ['OIL', 'Oil'], ['BODY_MIST', 'Body mist'], ['OTHER', 'Other']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>}</Field>
            <Field label="Longevity">{(id) => <Select id={id} value={f.longevity} onChange={(e) => set('longevity', e.target.value)}><option value="">—</option>{[['LOW', 'Short (2–4h)'], ['MODERATE', 'Moderate (4–6h)'], ['LONG', 'Long (6–10h)'], ['VERY_LONG', 'Very long (10h+)']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>}</Field>
            <Field label="Projection">{(id) => <Select id={id} value={f.sillage} onChange={(e) => set('sillage', e.target.value)}><option value="">—</option>{[['INTIMATE', 'Intimate'], ['MODERATE', 'Moderate'], ['STRONG', 'Strong'], ['ENORMOUS', 'Enormous']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>}</Field></div>
          {[['TOP', 'Top notes'], ['HEART', 'Heart notes'], ['BASE', 'Base notes']].map(([l, label]) => <Field key={l} label={label} hint="Separate notes with commas">{(id) => <Input id={id} value={f.notes[l]} onChange={(e) => set('notes', { ...f.notes, [l]: e.target.value })} placeholder="Bergamot, Pink Pepper" />}</Field>)}
          <fieldset><legend className="mb-2 text-sm font-medium">Occasions</legend><div className="flex flex-wrap gap-2">{OCC.map((o) => <label key={o} className={`cursor-pointer rounded-full border px-3.5 py-2 text-sm ${f.occasions.includes(o) ? 'border-cta bg-cta text-cta-fg' : 'border-line'}`}><input type="checkbox" className="sr-only" checked={f.occasions.includes(o)} onChange={() => set('occasions', f.occasions.includes(o) ? f.occasions.filter((x) => x !== o) : [...f.occasions, o])} />{o}</label>)}</div></fieldset></section>)}

      <section className={sect}><h2 className="text-2xl">Badges & visibility</h2><div className="grid gap-3 sm:grid-cols-3">{[['isFeatured', 'Featured'], ['isBestseller', 'Bestseller'], ['isNewArrival', 'New arrival']].map(([k, l]) => <label key={k} className="flex min-h-11 items-center gap-3 rounded-xl border border-line px-4"><input type="checkbox" checked={f[k]} onChange={(e) => set(k, e.target.checked)} className="size-4 accent-[var(--color-rose-500)]" />{l}</label>)}</div></section>

      <section className={sect}><h2 className="text-2xl">Related products</h2><p className="text-sm text-muted">Only link real alternatives. &ldquo;Inspired by&rdquo; items are shown as independent products, never as made by the designer.</p>
        <ul className="space-y-2">{f.relations.map((r, i) => <li key={`${r.toId}${r.type}`} className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2 text-sm"><span>{r.name || r.toId} <span className="text-muted">· {r.type.replace(/_/g, ' ').toLowerCase()}</span></span><button type="button" aria-label="Remove link" onClick={() => set('relations', f.relations.filter((_, n) => n !== i))}><Trash2 className="size-4 text-[var(--danger)]" /></button></li>)}</ul>
        <div className="flex flex-wrap gap-2"><Input placeholder="Search a product to link" value={rel} onChange={(e) => setRel(e.target.value)} className="min-w-52 flex-1" aria-label="Search product to link" /></div>
        {relOpts.data?.length > 0 && <ul className="divide-y divide-line rounded-xl border border-line">{relOpts.data.filter((o) => o.id !== id).map((o) => <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 p-2.5 text-sm"><span>{o.brand.name} {o.name}</span>
          <span className="flex gap-1.5">{[['SIMILAR_PROFILE', 'Similar'], ['ALTERNATIVE', 'Alternative'], ['INSPIRED_BY', 'Inspired by'], ['COMPLEMENTARY', 'Complements']].map(([t, l]) => <button key={t} type="button" className="rounded-full border border-line px-2.5 py-1 text-xs hover:border-accent" onClick={() => { set('relations', [...f.relations, { toId: o.id, type: t, name: `${o.brand.name} ${o.name}` }]); setRel(''); }}>{l}</button>)}</span></li>)}</ul>}</section>

      <section className={sect}><h2 className="text-2xl">Search engine listing</h2>
        <Field label="SEO title" hint={`${f.seoTitle.length}/70 · leave blank to auto-generate`}>{(id) => <Input id={id} value={f.seoTitle} maxLength={70} onChange={(e) => set('seoTitle', e.target.value)} />}</Field>
        <Field label="SEO description" hint={`${f.seoDescription.length}/170`}>{(id) => <Textarea id={id} className="min-h-20" value={f.seoDescription} maxLength={170} onChange={(e) => set('seoDescription', e.target.value)} />}</Field>
        <Field label="Keywords (optional)">{(id) => <Input id={id} value={f.seoKeywords} onChange={(e) => set('seoKeywords', e.target.value)} />}</Field></section>

      <div className="fixed inset-x-0 bottom-0 z-[var(--z-sticky)] border-t border-line bg-bg/95 p-3 backdrop-blur lg:left-60">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-end gap-2">
          <span className="mr-auto text-sm text-muted">{f.isActive ? 'Published' : 'Not published'}</span>
          <Button variant="outline" loading={busy} onClick={() => save()}>Save</Button>
          {f.isActive ? <Button variant="outline" loading={busy} onClick={() => save(false)}>Unpublish</Button> : <Button loading={busy} onClick={() => save(true)}>Save & publish</Button>}
        </div>
      </div>
    </div>
  );
}
