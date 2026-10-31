import { SlidersHorizontal } from 'lucide-react';
import { Button, Sheet } from '@/components/ui/index.jsx';
import { useUI } from '@/store/uiStore.js';
import { useMedia } from '@/hooks/useMedia.js';
import { PRODUCT_LINES } from '@/utils/productLines.js';

const csv = (v) => (v ? v.split(',').filter(Boolean) : []);
const toggleIn = (v, x) => { const a = csv(v); return (a.includes(x) ? a.filter((y) => y !== x) : [...a, x]).join(','); };

const Group = ({ title, children, defaultOpen = true }) => (
  <details open={defaultOpen} className="group border-b border-line py-4"><summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold">{title}<span className="text-muted transition group-open:rotate-45" aria-hidden>+</span></summary><div className="mt-3 space-y-1">{children}</div></details>
);
const Check = ({ checked, onChange, label }) => (
  <label className="flex min-h-9 cursor-pointer items-center gap-3 rounded-lg px-1 text-sm hover:bg-surface-2"><input type="checkbox" checked={checked} onChange={onChange} className="size-4 accent-[var(--color-rose-500)]" />{label}</label>
);

function Body({ facets, params, set, clear }) {
  const f = facets || { brands: [], categories: [], families: [], notes: [], sizes: [] };
  const multi = (key, items, label = (i) => i.name, val = (i) => i.slug) => items.map((i) => <Check key={val(i)} label={label(i)} checked={csv(params.get(key)).includes(val(i))} onChange={() => set(key, toggleIn(params.get(key), val(i)))} />);
  const flag = (key, label) => <Check label={label} checked={params.get(key) === 'true'} onChange={(e) => set(key, e.target.checked ? 'true' : '')} />;
  return (
    <div>
      <Group title="Availability">{flag('inStock', 'In stock only')}{flag('sale', 'On sale')}{flag('bestseller', 'Best sellers')}{flag('new', 'New arrivals')}</Group>
      <Group title="Product type"><Check label="Perfumes" checked={csv(params.get('type')).includes('FRAGRANCE')} onChange={() => set('type', toggleIn(params.get('type'), 'FRAGRANCE'))} />{PRODUCT_LINES.map((l) => <Check key={l.type} label={l.name} checked={csv(params.get('type')).includes(l.type)} onChange={() => set('type', toggleIn(params.get('type'), l.type))} />)}</Group>
      <Group title="For">{['men', 'women', 'unisex'].map((g) => <Check key={g} label={g[0].toUpperCase() + g.slice(1)} checked={csv(params.get('gender')).includes(g)} onChange={() => set('gender', toggleIn(params.get('gender'), g))} />)}</Group>
      <Group title="Brand">{multi('brand', f.brands)}</Group>
      <Group title="Fragrance family">{multi('family', f.families)}</Group>
      <Group title="Price (₦)">
        <div className="flex items-center gap-2">
          <input aria-label="Minimum price in naira" inputMode="numeric" placeholder="Min" defaultValue={params.get('minPrice') || ''} onBlur={(e) => set('minPrice', e.target.value.replace(/\D/g, ''))} className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-base" />
          <span aria-hidden>–</span>
          <input aria-label="Maximum price in naira" inputMode="numeric" placeholder="Max" defaultValue={params.get('maxPrice') || ''} onBlur={(e) => set('maxPrice', e.target.value.replace(/\D/g, ''))} className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-base" />
        </div>
      </Group>
      <Group title="Longevity" defaultOpen={false}>{[['moderate', 'Moderate'], ['long', 'Long lasting'], ['very_long', 'Very long lasting']].map(([v, l]) => <Check key={v} label={l} checked={csv(params.get('longevity')).includes(v)} onChange={() => set('longevity', toggleIn(params.get('longevity'), v))} />)}</Group>
      <Group title="Projection" defaultOpen={false}>{[['moderate', 'Moderate'], ['strong', 'Strong'], ['enormous', 'Enormous']].map(([v, l]) => <Check key={v} label={l} checked={csv(params.get('sillage')).includes(v)} onChange={() => set('sillage', toggleIn(params.get('sillage'), v))} />)}</Group>
      {f.sizes?.length > 0 && <Group title="Size" defaultOpen={false}>{f.sizes.map((s) => <Check key={s} label={s} checked={csv(params.get('size')).includes(s)} onChange={() => set('size', toggleIn(params.get('size'), s))} />)}</Group>}
      {f.notes?.length > 0 && <Group title="Notes" defaultOpen={false}><div className="max-h-56 overflow-y-auto">{multi('note', f.notes)}</div></Group>}
      <Button variant="ghost" className="mt-3 w-full" onClick={clear}>Clear all filters</Button>
    </div>
  );
}

export function FilterPanel(props) {
  const desktop = useMedia('(min-width: 1024px)');
  const open = useUI((s) => s.filtersOpen); const { close } = useUI.getState();
  if (desktop) return <aside aria-label="Filters" className="sticky top-24 hidden max-h-[calc(100dvh-7rem)] self-start overflow-y-auto pr-3 lg:block"><Body {...props} /></aside>;
  return (
    <Sheet open={open} onOpenChange={(v) => !v && close('filtersOpen')} title="Filters" side="bottom">
      <div className="px-5 pb-4"><Body {...props} /></div>
      <div className="sticky bottom-0 border-t border-line bg-bg p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"><Button className="w-full" size="lg" onClick={() => close('filtersOpen')}>Show results</Button></div>
    </Sheet>
  );
}
export const FilterButton = () => <button type="button" onClick={() => useUI.getState().open('filtersOpen')} className="inline-flex h-11 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold lg:hidden"><SlidersHorizontal className="size-4" />Filters</button>;
