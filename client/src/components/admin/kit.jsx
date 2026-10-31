import { useRef, useState } from 'react';
import { ImagePlus, X, ArrowLeft, ArrowRight, Star } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/api/endpoints.js';
import { cn } from '@/utils/cn.js';
import { Button, Skeleton } from '@/components/ui/index.jsx';

export const StatCard = ({ label, value, sub, tone }) => (
  <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5"><p className="text-xs uppercase tracking-wider text-muted">{label}</p>
    <p className={cn('mt-1 font-[var(--font-display)] text-3xl tabular-nums sm:text-4xl', tone === 'warn' && 'text-[var(--warning)]', tone === 'danger' && 'text-[var(--danger)]')}>{value}</p>{sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}</div>
);

/** Responsive table: real table on desktop, stacked cards on phones (admins often use a phone). */
export function DataTable({ columns, rows, loading, empty = 'Nothing here yet.', onRowClick, rowKey = (r) => r.id }) {
  if (loading) return <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>;
  if (!rows?.length) return <p className="rounded-2xl border border-dashed border-line p-10 text-center text-muted">{empty}</p>;
  return (
    <>
      <div className="hidden overflow-x-auto rounded-2xl border border-line md:block">
        <table className="w-full text-left text-sm"><thead className="bg-surface-2 text-xs uppercase tracking-wider text-muted"><tr>{columns.map((c) => <th key={c.key} scope="col" className={cn('px-4 py-3 font-semibold', c.className)}>{c.label}</th>)}</tr></thead>
          <tbody>{rows.map((r) => <tr key={rowKey(r)} onClick={onRowClick ? () => onRowClick(r) : undefined} className={cn('border-t border-line', onRowClick && 'cursor-pointer hover:bg-surface-2')}>{columns.map((c) => <td key={c.key} className={cn('px-4 py-3 align-middle', c.className)}>{c.render ? c.render(r) : r[c.key]}</td>)}</tr>)}</tbody></table>
      </div>
      <ul className="space-y-3 md:hidden">{rows.map((r) => (
        <li key={rowKey(r)}><button type="button" onClick={onRowClick ? () => onRowClick(r) : undefined} className="w-full space-y-1.5 rounded-2xl border border-line bg-surface p-4 text-left">
          {columns.map((c, i) => <div key={c.key} className={cn('flex justify-between gap-3 text-sm', i === 0 && 'text-base font-semibold')}>{i > 0 && <span className="text-muted">{c.label}</span>}<span className={i > 0 ? 'text-right' : ''}>{c.render ? c.render(r) : r[c.key]}</span></div>)}</button></li>))}</ul>
    </>
  );
}

export const Pager = ({ meta, onPage }) => meta && meta.pages > 1 ? (
  <nav aria-label="Pagination" className="mt-5 flex items-center justify-center gap-3"><Button size="sm" variant="outline" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>Previous</Button><span className="text-sm text-muted">Page {meta.page} of {meta.pages}</span><Button size="sm" variant="outline" disabled={meta.page >= meta.pages} onClick={() => onPage(meta.page + 1)}>Next</Button></nav>) : null;

export const PageHead = ({ title, children, sub }) => <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-3xl sm:text-4xl">{title}</h1>{sub && <p className="text-sm text-muted">{sub}</p>}</div><div className="flex flex-wrap gap-2">{children}</div></div>;

/** Drag/drop + browse, client-side validation, preview, reorder, primary (first), remove. Uploads go through /upload/image. */
const OK = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']; const MAX = 8 * 1024 * 1024;
export function ImageUploader({ images, onChange, max = 8, folder = 'products' }) {
  const [busy, setBusy] = useState(0); const [over, setOver] = useState(false); const input = useRef(null);
  const upload = async (files) => {
    const list = [...files].slice(0, max - images.length);
    for (const f of list) {
      if (!OK.includes(f.type)) { toast.error(`${f.name}: use JPG, PNG, WebP or AVIF.`); continue; }
      if (f.size > MAX) { toast.error(`${f.name}: larger than 8 MB.`); continue; }
      setBusy((b) => b + 1);
      try { const r = await api.upload(f, folder); onChange((cur) => [...cur, { ...r, alt: '' }]); } catch (e) { toast.error(`${f.name}: ${e.message}`); } finally { setBusy((b) => b - 1); }
    }
  };
  const move = (i, d) => onChange((cur) => { const a = [...cur]; const j = i + d; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j], a[i]]; return a; });
  return (
    <div>
      <div onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); upload(e.dataTransfer.files); }}
        className={cn('grid place-items-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center transition', over ? 'border-accent bg-gold-300/10' : 'border-line')}>
        <ImagePlus className="size-7 text-accent" aria-hidden /><p className="text-sm">Drag photos here, or</p>
        <Button type="button" variant="outline" size="sm" onClick={() => input.current?.click()} disabled={images.length >= max}>Browse files</Button>
        <input ref={input} type="file" accept={OK.join(',')} multiple hidden onChange={(e) => { upload(e.target.files); e.target.value = ''; }} aria-label="Choose product images" />
        <p className="text-xs text-muted">JPG, PNG, WebP or AVIF · up to 8 MB · first image is the main photo</p>
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {images.map((im, i) => (
          <li key={im.storageKey} className="space-y-1.5"><div className="relative aspect-square overflow-hidden rounded-xl border border-line">
            <img src={im.url} alt={im.alt || `Product image ${i + 1}`} className="h-full w-full object-cover" />
            {i === 0 && <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-cta px-2 py-0.5 text-[0.65rem] font-bold text-cta-fg"><Star className="size-3" />Main</span>}
            <button type="button" onClick={() => onChange((c) => c.filter((_, n) => n !== i))} aria-label={`Remove image ${i + 1}`} className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-full bg-bg/90"><X className="size-4" /></button>
            <div className="absolute inset-x-1.5 bottom-1.5 flex justify-between"><button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move earlier" className="grid size-8 place-items-center rounded-full bg-bg/90 disabled:opacity-30"><ArrowLeft className="size-4" /></button><button type="button" disabled={i === images.length - 1} onClick={() => move(i, 1)} aria-label="Move later" className="grid size-8 place-items-center rounded-full bg-bg/90 disabled:opacity-30"><ArrowRight className="size-4" /></button></div></div>
            <input value={im.alt || ''} onChange={(e) => onChange((c) => c.map((x, n) => (n === i ? { ...x, alt: e.target.value } : x)))} placeholder="Alt text (describe the photo)" aria-label={`Alt text for image ${i + 1}`} className="h-9 w-full rounded-lg border border-line bg-surface px-2 text-xs" /></li>))}
        {busy > 0 && Array.from({ length: busy }).map((_, i) => <li key={`b${i}`} className="skeleton aspect-square" aria-label="Uploading" />)}
      </ul>
    </div>
  );
}
