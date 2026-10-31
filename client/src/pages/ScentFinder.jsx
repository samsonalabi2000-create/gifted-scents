import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Sparkles, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/api/endpoints.js';
import { Seo } from '@/components/Seo.jsx';
import { Button, Input, Spinner } from '@/components/ui/index.jsx';
import { ProductCard } from '@/components/shop/ProductCard.jsx';
import { track } from '@/utils/analytics.js';
import { formatNaira } from '@/utils/money.js';
import { cn } from '@/utils/cn.js';

const OCC = ['Everyday', 'Office', 'Date Night', 'Wedding', 'Evening', 'Party', 'Vacation', 'Formal', 'Gift'];
const BUDGETS = [['Under ₦50,000', { budgetMax: 50000 }], ['₦50,000 – ₦100,000', { budgetMin: 50000, budgetMax: 100000 }], ['₦100,000 – ₦200,000', { budgetMin: 100000, budgetMax: 200000 }], ['₦200,000+', { budgetMin: 200000 }], ['No limit', {}]];

const Chip = ({ on, children, onClick, multi }) => (
  <button type="button" onClick={onClick} role={multi ? 'checkbox' : 'radio'} aria-checked={on} className={cn('min-h-11 rounded-full border px-5 text-sm font-medium transition', on ? 'border-cta bg-cta text-cta-fg' : 'border-line hover:border-accent')}>{children}</button>
);

export default function ScentFinder() {
  const facets = useQuery({ queryKey: ['facets'], queryFn: api.facets, staleTime: 5 * 60_000 });
  const [step, setStep] = useState(0); const [a, setA] = useState({ occasions: [], families: [], likedNotes: [], avoidNotes: [], likedFragrances: [] }); const [fav, setFav] = useState('');
  const [res, setRes] = useState(null); const [busy, setBusy] = useState(false);
  const set = (k, v) => setA((x) => ({ ...x, [k]: v }));
  const tog = (k, v) => set(k, a[k].includes(v) ? a[k].filter((x) => x !== v) : [...a[k], v]);
  const notes = facets.data?.notes || [];

  const steps = [
    ['Who is the fragrance for?', <div key="g" className="flex flex-wrap gap-3" role="radiogroup">{[['men', 'Him'], ['women', 'Her'], ['unisex', 'Unisex'], ['any', 'Any']].map(([v, l]) => <Chip key={v} on={a.gender === v} onClick={() => set('gender', v)}>{l}</Chip>)}</div>],
    ['What is the occasion?', <div key="o" className="flex flex-wrap gap-3">{OCC.map((o) => <Chip multi key={o} on={a.occasions.includes(o)} onClick={() => tog('occasions', o)}>{o}</Chip>)}</div>],
    ['Which fragrance families do you prefer?', <div key="f" className="flex flex-wrap gap-3">{(facets.data?.families || []).map((f) => <Chip multi key={f.slug} on={a.families.includes(f.slug)} onClick={() => tog('families', f.slug)}>{f.name}</Chip>)}</div>],
    ['Which notes do you love?', <div key="n" className="flex max-h-72 flex-wrap gap-2 overflow-y-auto">{notes.map((n) => <Chip multi key={n.slug} on={a.likedNotes.includes(n.slug)} onClick={() => tog('likedNotes', n.slug)}>{n.name}</Chip>)}</div>],
    ['Any notes to avoid?', <div key="x" className="flex max-h-72 flex-wrap gap-2 overflow-y-auto">{notes.map((n) => <Chip multi key={n.slug} on={a.avoidNotes.includes(n.slug)} onClick={() => tog('avoidNotes', n.slug)}>{n.name}</Chip>)}</div>],
    ['Which fragrances do you already enjoy?', <div key="l" className="max-w-md space-y-2"><Input value={fav} onChange={(e) => setFav(e.target.value)} placeholder="e.g. Sauvage, Good Girl (comma separated)" aria-label="Fragrances you enjoy" /><p className="text-xs text-muted">Optional. We look for similar styles in our own collection.</p></div>],
    ['How long should it last?', <div key="lg" className="flex flex-wrap gap-3" role="radiogroup">{[['moderate', 'A few hours'], ['long', 'All day'], ['very_long', 'Beast mode (10h+)']].map(([v, l]) => <Chip key={v} on={a.longevity === v} onClick={() => set('longevity', v)}>{l}</Chip>)}</div>],
    ['How noticeable should it be?', <div key="s" className="flex flex-wrap gap-3" role="radiogroup">{[['moderate', 'Subtle'], ['strong', 'Strong'], ['enormous', 'Turn heads']].map(([v, l]) => <Chip key={v} on={a.sillage === v} onClick={() => set('sillage', v)}>{l}</Chip>)}</div>],
    ['What is your budget?', <div key="b" className="flex flex-wrap gap-3" role="radiogroup">{BUDGETS.map(([l, v]) => <Chip key={l} on={a.budgetLabel === l} onClick={() => setA((x) => ({ ...x, budgetLabel: l, budgetMin: undefined, budgetMax: undefined, ...v }))}>{l}</Chip>)}</div>],
    ['Designer, Arabic or any?', <div key="or" className="flex flex-wrap gap-3" role="radiogroup">{[['designer', 'Designer'], ['arabic', 'Arabic'], ['any', 'Surprise me']].map(([v, l]) => <Chip key={v} on={a.origin === v} onClick={() => set('origin', v)}>{l}</Chip>)}</div>],
  ];
  const last = step === steps.length - 1;

  const run = async () => {
    setBusy(true);
    try { const payload = { ...a, likedFragrances: fav.split(',').map((x) => x.trim()).filter(Boolean) }; delete payload.budgetLabel; const r = await api.scentFinder(payload); setRes(r); track('scent_finder_complete', { results: r.results.length }); }
    catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="container-x py-10">
      <Seo title="Scent Finder | Find your perfect fragrance | Gifted Scents" description="Answer a few questions and get fragrance recommendations from the Gifted Scents collection." path="/scent-finder" />
      <header className="scent-finder-hero">
        <div className="scent-finder-intro">
          <p className="eyebrow">Your personal fragrance edit</p>
          <h1 className="mt-3 text-4xl sm:text-5xl lg:text-6xl">Find your <span className="script text-5xl text-cta sm:text-6xl lg:text-7xl">signature</span></h1>
          <p className="mt-4 max-w-xl text-muted">A fragrance should feel like you. Tell us what you love, where you are going, and your budget — we’ll help you discover a scent from our collection.</p>
          <div className="scent-finder-points" aria-label="How the scent finder works">
            <span><Sparkles className="size-4" aria-hidden /> Personalised matches</span>
            <span><RotateCcw className="size-4" aria-hidden /> Easy to retake</span>
          </div>
        </div>
        <div className="scent-finder-visual">
          <img src="/images/scent-finder-hero.jpg" alt="A fragrance being applied to the wrist" width="493" height="493" fetchPriority="high" decoding="async" />
          <div className="scent-finder-visual-note"><span className="eyebrow">The art of scent</span><span>Find the one that feels like you.</span></div>
        </div>
      </header>

      {!res ? (
        <section className="mx-auto mt-10 max-w-3xl rounded-3xl border border-line bg-surface p-6 sm:p-10" aria-live="polite">
          <div className="mb-6 flex items-center gap-3"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={step + 1}><div className="h-full bg-gradient-to-r from-gold-300 to-cta transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div><span className="text-xs text-muted">{step + 1} / {steps.length}</span></div>
          <h2 className="text-3xl">{steps[step][0]}</h2>
          <div className="mt-6 min-h-40">{steps[step][1]}</div>
          <div className="mt-8 flex items-center justify-between">
            <Button variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}><ArrowLeft className="size-4" />Back</Button>
            <div className="flex gap-2">
              {!last && <Button variant="outline" onClick={() => setStep(step + 1)}>Skip</Button>}
              {last ? <Button onClick={run} loading={busy}><Sparkles className="size-4" />Show my matches</Button> : <Button onClick={() => setStep(step + 1)}>Next<ArrowRight className="size-4" /></Button>}
            </div>
          </div>
        </section>
      ) : (
        <section className="mt-10" aria-live="polite">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-3"><h2 className="text-3xl">{res.results.length ? 'Your matches' : 'No exact matches'}</h2><Button variant="outline" onClick={() => { setRes(null); setStep(0); }}><RotateCcw className="size-4" />Start again</Button></div>
          {res.results.length === 0 ? <div className="rounded-3xl border border-dashed border-line p-10 text-center"><p className="text-lg">We could not find an in-stock match for those answers. Try relaxing the budget, notes to avoid, or family.</p><Button className="mt-4" onClick={() => { setRes(null); setStep(0); }}>Adjust answers</Button></div> : (
            <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{res.results.map((r) => (
              <li key={r.product.id} className="flex flex-col rounded-3xl border border-line bg-surface p-4">
                <ProductCard product={r.product} />
                {r.notes.length > 0 && <p className="mt-3 text-xs text-muted"><span className="font-semibold text-fg">Notes:</span> {r.notes.join(', ')}</p>}
                <ul className="mt-3 space-y-1 text-sm">{r.reasons.map((x) => <li key={x} className="flex gap-2"><Sparkles className="mt-1 size-3.5 shrink-0 text-accent" aria-hidden />{x}</li>)}</ul>
                <p className="mt-3 text-sm font-semibold">{r.product.inStock ? 'Available now' : 'Currently sold out'} · from {formatNaira(r.product.priceKobo)}</p>
                <Button as={Link} to={`/product/${r.product.slug}`} className="mt-3" variant="gold">View product</Button>
              </li>))}</ul>)}
        </section>
      )}
    </div>
  );
}
