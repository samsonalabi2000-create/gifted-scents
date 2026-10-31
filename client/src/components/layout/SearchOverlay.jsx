import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Clock, TrendingUp, ArrowRight } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { api } from '@/api/endpoints.js';
import { useUI } from '@/store/uiStore.js';
import { useDebounce } from '@/hooks/useDebounce.js';
import { formatNaira } from '@/utils/money.js';
import { SmartImage } from '@/components/shop/bits.jsx';
import { track } from '@/utils/analytics.js';

const RK = 'gs-recent-searches';
const recent = () => { try { return JSON.parse(localStorage.getItem(RK) || '[]'); } catch { return []; } };
const remember = (q) => { try { localStorage.setItem(RK, JSON.stringify([q, ...recent().filter((x) => x !== q)].slice(0, 6))); } catch { /* ignore */ } };

export function SearchOverlay() {
  const open = useUI((s) => s.searchOpen); const close = useUI((s) => s.close);
  const [q, setQ] = useState(''); const dq = useDebounce(q.trim(), 220); const nav = useNavigate(); const ref = useRef(null);
  const sug = useQuery({ queryKey: ['suggest', dq], queryFn: () => api.suggest(dq), enabled: open && dq.length >= 2, staleTime: 30_000 });
  const pop = useQuery({ queryKey: ['popular'], queryFn: api.popular, enabled: open, staleTime: 5 * 60_000 });
  useEffect(() => { if (!open) setQ(''); }, [open]);

  const go = (term) => { const t = (term ?? q).trim(); if (!t) return; remember(t); track('search', { search_term: t }); close('searchOpen'); nav(`/search?q=${encodeURIComponent(t)}`); };
  const d = sug.data; const none = dq.length >= 2 && !sug.isFetching && d && !d.products.length && !d.brands.length && !d.categories.length && !d.notes.length;

  return (
    <Dialog.Root open={open} onOpenChange={(v) => (v ? null : close('searchOpen'))}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[var(--z-modal)] bg-[var(--scrim)] backdrop-blur-sm" />
        <Dialog.Content onOpenAutoFocus={(e) => { e.preventDefault(); ref.current?.focus(); }} className="fixed inset-x-0 top-0 z-[var(--z-modal)] mx-auto max-h-[100dvh] w-full max-w-2xl overflow-y-auto bg-bg p-4 shadow-2xl sm:top-16 sm:rounded-3xl sm:border sm:border-line">
          <Dialog.Title className="sr-only">Search products</Dialog.Title><Dialog.Description className="sr-only">Search by product, brand, note, category or SKU</Dialog.Description>
          <form role="search" onSubmit={(e) => { e.preventDefault(); go(); }} className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 focus-within:border-accent">
            <Search className="size-5 text-muted" aria-hidden />
            <input ref={ref} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search perfumes, brands, notes or SKU" aria-label="Search" autoComplete="off" enterKeyHint="search"
              className="h-14 w-full bg-transparent text-base outline-none placeholder:text-muted/70" />
            <button type="button" onClick={() => close('searchOpen')} className="shrink-0 text-sm text-muted hover:text-fg">Close</button>
          </form>

          <div className="mt-4 min-h-40" aria-live="polite">
            {dq.length < 2 && (
              <div className="grid gap-6 sm:grid-cols-2">
                {recent().length > 0 && <div><h3 className="eyebrow mb-2 flex items-center gap-1.5 !font-sans"><Clock className="size-3.5" />Recent</h3>{recent().map((t) => <button key={t} onClick={() => go(t)} className="block w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-surface-2">{t}</button>)}</div>}
                <div><h3 className="eyebrow mb-2 flex items-center gap-1.5 !font-sans"><TrendingUp className="size-3.5" />Popular</h3>{(pop.data || []).map((t) => <button key={t} onClick={() => go(t)} className="block w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-surface-2">{t}</button>)}</div>
              </div>
            )}
            {d && !none && (
              <div className="space-y-5">
                {d.products.length > 0 && <ul>{d.products.map((p) => (
                  <li key={p.id}><Link to={`/product/${p.slug}`} onClick={() => { remember(q); close('searchOpen'); }} className="flex items-center gap-3 rounded-xl p-2 hover:bg-surface-2">
                    <div className="size-14 shrink-0 overflow-hidden rounded-lg border border-line"><SmartImage image={p.image} alt={p.name} label={p.brand} sizes="56px" /></div>
                    <div className="min-w-0 flex-1"><p className="truncate font-medium">{p.name}</p><p className="text-xs text-muted">{p.brand}</p></div>
                    <div className="text-right text-sm"><p className="font-semibold">{formatNaira(p.priceKobo)}</p>{!p.inStock && <p className="text-xs text-muted">Sold out</p>}</div></Link></li>))}</ul>}
                <div className="flex flex-wrap gap-2">{[...d.brands.map((b) => [`/brands/${b.slug}`, b.name, 'Brand']), ...d.categories.map((c) => [`/shop/${c.slug}`, c.name, 'Category']), ...d.notes.map((n) => [`/shop?note=${n.slug}`, n.name, 'Note'])].map(([to, name, kind]) => (
                  <Link key={to} to={to} onClick={() => close('searchOpen')} className="rounded-full border border-line px-3 py-1.5 text-sm hover:border-accent hover:text-accent"><span className="text-muted">{kind}: </span>{name}</Link>))}</div>
                <button onClick={() => go()} className="flex w-full items-center justify-between rounded-xl bg-surface-2 px-4 py-3 text-sm font-semibold hover:text-accent">See all results for &ldquo;{dq}&rdquo;<ArrowRight className="size-4" /></button>
              </div>
            )}
            {none && (
              <div className="py-8 text-center"><p className="font-[var(--font-display)] text-2xl">No matches for &ldquo;{dq}&rdquo;</p>
                <p className="mx-auto mt-1 max-w-sm text-sm text-muted">Check the spelling, try a brand or a note, or let us suggest something.</p>
                <Link to="/scent-finder" onClick={() => close('searchOpen')} className="mt-4 inline-flex rounded-full bg-cta px-5 py-2.5 text-sm font-semibold text-cta-fg">Find my scent</Link></div>
            )}
            {sug.isFetching && !d && <p className="py-6 text-center text-sm text-muted">Searching&hellip;</p>}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
