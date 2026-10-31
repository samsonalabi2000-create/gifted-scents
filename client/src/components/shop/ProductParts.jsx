import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ZoomIn, Leaf, Flower2, TreePine, Star } from 'lucide-react';
import { SmartImage, RatingStars } from './bits.jsx';
import { Button, Modal, Badge } from '@/components/ui/index.jsx';
import { cn } from '@/utils/cn.js';

export function ProductGallery({ images, name, brand }) {
  const [i, setI] = useState(0); const [zoom, setZoom] = useState(false);
  const cur = images[i];
  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-line bg-surface-2">
        <SmartImage image={cur} alt={`${brand} ${name}`} label={brand} priority sizes="(min-width:1024px) 50vw, 100vw" />
        {cur && <button type="button" onClick={() => setZoom(true)} aria-label="Zoom image" className="absolute bottom-3 right-3 grid size-11 place-items-center rounded-full bg-bg/85 backdrop-blur hover:scale-105"><ZoomIn className="size-5" /></button>}
      </div>
      {images.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto pb-1" aria-label="Product images">{images.map((im, n) => (
          <li key={im.id || n}><button type="button" onClick={() => setI(n)} aria-label={`Show image ${n + 1}`} aria-current={n === i} className={cn('size-16 overflow-hidden rounded-xl border-2 sm:size-20', n === i ? 'border-accent' : 'border-line opacity-70 hover:opacity-100')}><SmartImage image={im} alt="" sizes="80px" /></button></li>))}</ul>)}
      <Modal open={zoom} onOpenChange={setZoom} title={`${brand} ${name}`} className="max-w-3xl p-3">
        {cur && <img src={cur.url} alt={cur.alt || name} className="max-h-[78dvh] w-full rounded-2xl object-contain" />}
      </Modal>
    </div>
  );
}

const LAYERS = [['top', 'Top notes', 'First impression, 0–15 min', Leaf], ['heart', 'Heart notes', 'The character, 15 min – 3 h', Flower2], ['base', 'Base notes', 'The lasting trail, 3 h+', TreePine]];
export function NotesPyramid({ notes }) {
  const has = LAYERS.some(([k]) => notes[k]?.length);
  if (!has) return null;
  return (
    <section aria-labelledby="notes-h" className="rounded-3xl border border-line bg-surface p-5 sm:p-7">
      <h2 id="notes-h" className="text-2xl">Fragrance notes</h2>
      <p className="mt-1 text-sm text-muted">How this scent unfolds on skin, from first spray to dry-down.</p>
      <ol className="mt-5 space-y-4">{LAYERS.filter(([k]) => notes[k]?.length).map(([k, t, d, I], idx) => (
        <li key={k} className="flex gap-4"><span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-full border border-gold-400/50 bg-gold-300/10 text-accent"><I className="size-5" aria-hidden /></span>
          <div><p className="font-semibold">{t} <span className="font-normal text-muted">· {d}</span></p>
            <ul className="mt-2 flex flex-wrap gap-2">{notes[k].map((n) => <li key={n.slug}><Link to={`/shop?note=${n.slug}`} className="inline-flex rounded-full border border-line bg-bg px-3 py-1 text-sm hover:border-accent hover:text-accent">{n.name}</Link></li>)}</ul></div></li>))}</ol>
    </section>
  );
}

const SCALE = { longevity: { LOW: [1, '2–4 hours'], MODERATE: [2, '4–6 hours'], LONG: [3, '6–10 hours'], VERY_LONG: [4, '10+ hours'] }, sillage: { INTIMATE: [1, 'Intimate'], MODERATE: [2, 'Moderate'], STRONG: [3, 'Strong'], ENORMOUS: [4, 'Enormous'] } };
export function Performance({ longevity, sillage }) {
  const rows = [['Longevity', 'longevity', longevity], ['Projection', 'sillage', sillage]].filter((r) => r[2]);
  if (!rows.length) return null;
  return (
    <dl className="grid gap-4 sm:grid-cols-2">{rows.map(([l, k, v]) => { const [n, txt] = SCALE[k][v] || [0, '']; return (
      <div key={k} className="rounded-2xl border border-line p-4"><dt className="text-sm text-muted">{l}</dt><dd className="mt-1 font-semibold">{txt}</dd>
        <div className="mt-2 flex gap-1" role="img" aria-label={`${l}: ${n} out of 4`}>{[1, 2, 3, 4].map((x) => <span key={x} className={cn('h-1.5 flex-1 rounded-full', x <= n ? 'bg-gradient-to-r from-gold-300 to-gold-500' : 'bg-surface-2')} />)}</div></div>); })}</dl>
  );
}

export function ReviewList({ data, loading }) {
  if (loading) return <div className="skeleton h-32" />;
  if (!data?.items.length) return <p className="text-muted">No reviews yet. Buy this product and be the first to share your experience.</p>;
  return <ul className="divide-y divide-line">{data.items.map((r) => (
    <li key={r.id} className="py-5"><div className="flex flex-wrap items-center gap-x-3 gap-y-1"><RatingStars value={r.rating} showCount={false} />{r.verifiedPurchase && <Badge tone="gold">Verified purchase</Badge>}<span className="text-sm text-muted">{r.authorName} · {new Date(r.createdAt).toLocaleDateString('en-NG', { dateStyle: 'medium' })}</span></div>
      {r.title && <h3 className="mt-2 text-xl">{r.title}</h3>}<p className="mt-1 whitespace-pre-line text-[0.95rem]">{r.comment}</p></li>))}</ul>;
}
export { Button, Star };
