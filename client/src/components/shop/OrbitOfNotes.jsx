import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Pause, Play, BadgeCheck } from 'lucide-react';
import { RatingStars } from './bits.jsx';
import { useMedia, useReducedMotion } from '@/hooks/useMedia.js';

/**
 * Orbit of Notes: real, admin-approved reviews drift along concentric gold rings around a rose-lit perfume bottle.
 * Desktop: CSS-only orbit (GPU transforms, no JS animation loop, no WebGL). Hover/focus or the Pause button stops it.
 * Mobile / reduced motion: an accessible swipeable deck with previous/next buttons.
 */
function ReviewCard({ r, className = '', style }) {
  return (
    <article className={`orbit-review rounded-2xl border border-gold-400/30 bg-ink-900/80 p-4 text-left text-[#f6efe6] shadow-[0_18px_50px_-24px_rgba(0,0,0,.9)] backdrop-blur-md ${className}`} style={style}>
      <RatingStars value={r.rating} showCount={false} />
      {r.title && <h3 className="mt-1.5 font-[var(--font-display)] text-lg leading-tight text-gold-200">{r.title}</h3>}
      <p className="mt-1 line-clamp-4 text-[0.82rem] leading-relaxed text-[#d9cdc0]">{r.comment}</p>
      <footer className="mt-3 flex items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-gold-300">{r.authorName}</span>
        {r.verifiedPurchase && <span className="inline-flex items-center gap-1 text-[#b9aa9b]"><BadgeCheck className="size-3.5 text-gold-400" aria-hidden />Verified</span>}
      </footer>
      {r.product && <Link to={`/product/${r.product.slug}`} className="mt-2 block truncate text-[0.72rem] text-rose-300 hover:underline">on {r.product.brand?.name} {r.product.name}</Link>}
    </article>
  );
}

function Bottle() {
  return (
    <svg viewBox="0 0 120 150" className="relative z-10 h-[46%] drop-shadow-[0_0_24px_rgba(242,61,150,.55)]" aria-hidden>
      <defs><linearGradient id="orb-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f6e3a8" /><stop offset="1" stopColor="#c9993a" /></linearGradient></defs>
      <rect x="46" y="6" width="28" height="16" rx="3" fill="url(#orb-g)" /><rect x="54" y="22" width="12" height="12" fill="#8f6a1f" />
      <rect x="18" y="34" width="84" height="108" rx="16" fill="rgba(255,111,181,.08)" stroke="url(#orb-g)" strokeWidth="2.5" />
      <path d="M38 96c14-18 30-18 44 0" fill="none" stroke="#ff6fb5" strokeWidth="2" strokeLinecap="round" opacity=".8" />
      <text x="60" y="84" textAnchor="middle" fontFamily="Great Vibes, cursive" fontSize="34" fill="#ff6fb5">GS</text>
    </svg>
  );
}

export function OrbitOfNotes({ reviews = [] }) {
  const wide = useMedia('(min-width: 1024px)'); const reduced = useReducedMotion();
  const [paused, setPaused] = useState(false); const deck = useRef(null);
  if (!reviews.length) return null;
  const avg = reviews.reduce((n, r) => n + r.rating, 0) / reviews.length;
  const outer = reviews.filter((_, i) => i % 2 === 0).slice(0, 4); const inner = reviews.filter((_, i) => i % 2 === 1).slice(0, 3);
  const scroll = (dir) => deck.current?.scrollBy({ left: dir * (deck.current.clientWidth * 0.8), behavior: reduced ? 'auto' : 'smooth' });

  return (
    <section aria-labelledby="orbit-title" className="relative overflow-hidden bg-ink-950 py-20 text-[#f6efe6]">
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(60% 50% at 50% 45%, rgba(242,61,150,.14), transparent 70%), radial-gradient(40% 30% at 15% 10%, rgba(201,153,58,.12), transparent 70%)' }} />
      <div className="container-x relative">
        <header className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">Orbit of Notes</p>
          <h2 id="orbit-title" className="mt-2 text-4xl sm:text-5xl">Words that <span className="script text-5xl text-rose-400 sm:text-6xl">linger</span></h2>
          <p className="mt-3 text-[#b9aa9b]">Real reviews from our customers.</p>
        </header>

        {wide && !reduced ? (
          <div className={`orbit-stage mt-8 w-full max-w-[46rem] ${paused ? 'orbit-paused' : ''}`}>
            <div className="orbit-ring" style={{ inset: '3%' }} /><div className="orbit-ring" style={{ inset: '25%' }} /><div className="orbit-ring opacity-50" style={{ inset: '44%' }} />
            <div className="orbit-core" />
            <div className="absolute inset-0 grid place-items-center">
              <div className="grid place-items-center gap-1 text-center"><Bottle /><p className="relative z-10 -mt-1 font-[var(--font-display)] text-3xl text-gold-200">{avg.toFixed(1)}</p><RatingStars value={avg} showCount={false} /></div>
            </div>
            {outer.map((r, i) => (
              <div key={r.id} className="orbit-arm" style={{ inset: '3%', '--orbit-time': '140s', '--orbit-delay': `${-(140 / outer.length) * i}s` }}>
                <div className="orbit-card" style={{ '--orbit-time': '140s', '--orbit-delay': `${-(140 / outer.length) * i}s`, '--card-w': '15rem' }}><ReviewCard r={r} /></div>
              </div>))}
            {inner.map((r, i) => (
              <div key={r.id} className="orbit-arm" style={{ inset: '25%', '--orbit-time': '100s', '--orbit-delay': `${-(100 / inner.length) * i}s`, animationDirection: 'reverse' }}>
                <div className="orbit-card" style={{ '--orbit-time': '100s', '--orbit-delay': `${-(100 / inner.length) * i}s`, '--card-w': '13rem', animationDirection: 'reverse' }}><ReviewCard r={r} className="scale-[.92] opacity-95" /></div>
              </div>))}
            <button type="button" onClick={() => setPaused((p) => !p)} aria-pressed={paused} className="absolute bottom-0 right-0 inline-flex items-center gap-2 rounded-full border border-gold-400/40 px-3.5 py-2 text-xs text-gold-300 hover:bg-white/5">
              {paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}{paused ? 'Resume motion' : 'Pause motion'}</button>
          </div>
        ) : (
          <div className="mt-10">
            <div ref={deck} className="deck-scroll -mx-4 flex gap-4 overflow-x-auto px-6 pb-4 sm:mx-0" role="region" aria-roledescription="carousel" aria-label="Customer reviews" tabIndex={0}>
              {reviews.map((r) => <ReviewCard key={r.id} r={r} className="w-[82%] max-w-sm shrink-0 sm:w-80" />)}
            </div>
            <div className="mt-4 flex items-center justify-center gap-3">
              <button onClick={() => scroll(-1)} aria-label="Previous reviews" className="grid size-11 place-items-center rounded-full border border-gold-400/40 text-gold-300 hover:bg-white/5"><ChevronLeft /></button>
              <div className="text-center"><p className="font-[var(--font-display)] text-2xl text-gold-200">{avg.toFixed(1)}</p><RatingStars value={avg} showCount={false} /></div>
              <button onClick={() => scroll(1)} aria-label="Next reviews" className="grid size-11 place-items-center rounded-full border border-gold-400/40 text-gold-300 hover:bg-white/5"><ChevronRight /></button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
