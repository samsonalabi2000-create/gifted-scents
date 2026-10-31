import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { MessageCircle, Send, X, Minus, Headset, Sparkles } from 'lucide-react';
import { api } from '@/api/endpoints.js';
import { useUI } from '@/store/uiStore.js';
import { SmartImage, PriceDisplay } from '@/components/shop/bits.jsx';
import { track } from '@/utils/analytics.js';
import { waLink, WA } from '@/utils/whatsapp.js';
import { cn } from '@/utils/cn.js';

const sid = () => { try { let v = localStorage.getItem('gs-chat-sid'); if (!v) { v = crypto.randomUUID(); localStorage.setItem('gs-chat-sid', v); } return v; } catch { return crypto.randomUUID(); } };
const SUGGEST = ['Recommend a scent for the office', 'Gift ideas under ₦50,000', 'What is your delivery like?'];

export function AIChatWidget() {
  const open = useUI((s) => s.chatOpen); const { open: openUI, close } = useUI.getState(); const loc = useLocation();
  const cfg = useQuery({ queryKey: ['ai-config'], queryFn: api.aiConfig, staleTime: 5 * 60_000 });
  const [msgs, setMsgs] = useState([]); const [text, setText] = useState(''); const [busy, setBusy] = useState(false);
  const [convo, setConvo] = useState(null); const [handoff, setHandoff] = useState(null);
  const end = useRef(null); const input = useRef(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }, [msgs, busy, open]);
  useEffect(() => { if (open) input.current?.focus(); }, [open]);
  useEffect(() => { const h = (e) => e.key === 'Escape' && useUI.getState().chatOpen && useUI.getState().close('chatOpen'); addEventListener('keydown', h); return () => removeEventListener('keydown', h); }, []);

  // Never cover checkout controls / admin
  if (cfg.data && cfg.data.enabled === false) return <WhatsAppOnly channels={cfg.data.channels} />;
  if (loc.pathname.startsWith('/admin') || loc.pathname.startsWith('/checkout')) return null;
  const name = cfg.data?.name || 'Gifted Scents Assistant';

  const send = async (t) => {
    const content = (t ?? text).trim(); if (!content || busy) return;
    setText(''); const history = msgs.slice(-8).map((m) => ({ role: m.role, content: m.text }));
    setMsgs((m) => [...m, { role: 'user', text: content }]); setBusy(true);
    try {
      const r = await api.aiChat({ message: content, sessionId: sid(), conversationId: convo || undefined, history });
      setConvo(r.conversationId); if (r.handoff) setHandoff(r.handoff);
      setMsgs((m) => [...m, { role: 'assistant', text: r.reply, products: r.products, suggestTicket: r.suggestTicket }]);
    } catch (e) { setMsgs((m) => [...m, { role: 'assistant', text: e.message, error: true }]); } finally { setBusy(false); }
  };
  const human = async () => { try { const r = await api.handoff({}); setHandoff(r.channels); } catch { setHandoff(cfg.data?.channels || {}); } };
  const wa = (handoff || cfg.data?.channels)?.whatsappUrl;

  return (
    <>
      {!open && (
        <button type="button" onClick={() => openUI('chatOpen')} aria-label={`Open ${name}`}
          className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-3 z-[var(--z-chat)] grid size-14 place-items-center rounded-full bg-cta text-cta-fg shadow-xl glow-rose transition hover:scale-105 md:bottom-6 md:right-6">
          <MessageCircle className="size-6" aria-hidden />
        </button>
      )}
      {open && (
        <section role="dialog" aria-label={name} aria-modal="false"
          className="fixed inset-x-2 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-[var(--z-chat)] flex max-h-[min(34rem,calc(100dvh-7rem))] flex-col overflow-hidden rounded-3xl border border-line bg-bg shadow-2xl md:inset-x-auto md:bottom-6 md:right-6 md:w-[24rem]">
          <header className="flex items-center gap-3 border-b border-line bg-ink-950 px-4 py-3 text-gold-300">
            <Sparkles className="size-5" aria-hidden /><div className="min-w-0 flex-1"><p className="truncate font-[var(--font-display)] text-lg leading-none text-gold-200">{name}</p><p className="text-[0.7rem] text-gold-300/70">Answers use our live catalogue</p></div>
            <button onClick={() => close('chatOpen')} aria-label="Minimise chat" className="grid size-9 place-items-center rounded-full hover:bg-white/10"><Minus className="size-4" /></button>
            <button onClick={() => { close('chatOpen'); setMsgs([]); setConvo(null); setHandoff(null); }} aria-label="End chat" className="grid size-9 place-items-center rounded-full hover:bg-white/10"><X className="size-4" /></button>
          </header>
          <div className="flex-1 space-y-3 overflow-y-auto p-4" role="log" aria-live="polite" aria-label="Conversation">
            <Bubble role="assistant">{cfg.data?.greeting || 'Hi! How can I help you find your scent?'}</Bubble>
            {msgs.length === 0 && <div className="flex flex-wrap gap-2">{SUGGEST.map((s) => <button key={s} onClick={() => send(s)} className="rounded-full border border-line px-3 py-1.5 text-xs hover:border-accent hover:text-accent">{s}</button>)}</div>}
            {msgs.map((m, i) => (
              <div key={i} className="space-y-2">
                <Bubble role={m.role} error={m.error}>{m.text}</Bubble>
                {m.products?.length > 0 && <div className="space-y-2">{m.products.map((p) => (
                  <Link key={p.id} to={`/product/${p.slug}`} onClick={() => { track('ai_recommendation_click', { item_id: p.id }); close('chatOpen'); }} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-2 hover:border-accent">
                    <div className="size-14 shrink-0 overflow-hidden rounded-xl"><SmartImage image={p.image} alt={p.name} label={p.brand.name} sizes="56px" /></div>
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{p.name}</p><p className="text-xs text-muted">{p.brand.name}{!p.inStock ? ' · Sold out' : ''}</p><PriceDisplay priceKobo={p.priceKobo} compareAtKobo={p.compareAtKobo} from={p.hasMultipleSizes} /></div></Link>))}</div>}
                {m.suggestTicket && <Link to="/contact" onClick={() => close('chatOpen')} className="inline-block text-xs text-accent underline">Leave your details and we'll follow up</Link>}
              </div>
            ))}
            {busy && <Bubble role="assistant"><span className="inline-flex gap-1" aria-label="Typing"><i className="size-1.5 animate-bounce rounded-full bg-muted" /><i className="size-1.5 animate-bounce rounded-full bg-muted [animation-delay:120ms]" /><i className="size-1.5 animate-bounce rounded-full bg-muted [animation-delay:240ms]" /></span></Bubble>}
            {handoff && (
              <div className="rounded-2xl border border-gold-400/40 bg-gold-300/10 p-3 text-sm">
                <p className="mb-2 font-semibold">Talk to a human</p>
                <div className="flex flex-wrap gap-2">
                  {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="rounded-full bg-cta px-4 py-2 text-xs font-semibold text-cta-fg">WhatsApp us</a>}
                  <Link to="/contact" onClick={() => close('chatOpen')} className="rounded-full border border-line px-4 py-2 text-xs font-semibold">Send a message</Link>
                  {handoff.phone && <a href={`tel:${handoff.phone}`} className="rounded-full border border-line px-4 py-2 text-xs font-semibold">Call {handoff.phone}</a>}
                </div>
                {handoff.availability && <p className="mt-2 text-xs text-muted">{handoff.availability}</p>}
              </div>
            )}
            <div ref={end} />
          </div>
          <footer className="space-y-2 border-t border-line p-3">
            <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-center gap-2">
              <label htmlFor="chat-input" className="sr-only">Message</label>
              <input id="chat-input" ref={input} value={text} onChange={(e) => setText(e.target.value)} maxLength={800} placeholder="Ask about a scent…" autoComplete="off" className="h-11 flex-1 rounded-full border border-line bg-surface px-4 text-base focus:border-accent focus:outline-none" />
              <button type="submit" disabled={busy || !text.trim()} aria-label="Send" className="grid size-11 place-items-center rounded-full bg-cta text-cta-fg disabled:opacity-40"><Send className="size-4" /></button>
            </form>
            <button onClick={human} className="flex w-full items-center justify-center gap-2 text-xs font-semibold text-muted hover:text-accent"><Headset className="size-4" />Talk to a human</button>
          </footer>
        </section>
      )}
    </>
  );
}

const Bubble = ({ role, error, children }) => (
  <div className={cn('max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed', role === 'user' ? 'ml-auto rounded-br-md bg-cta text-cta-fg' : 'rounded-bl-md bg-surface-2', error && 'text-[var(--danger)]')}>{children}</div>
);

function WhatsAppOnly({ channels }) {
  if (!channels?.whatsappUrl) return null;
  return <a href={channels.whatsappUrl} target="_blank" rel="noopener noreferrer" aria-label="Chat with Gifted Scents on WhatsApp" className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-3 z-[var(--z-chat)] grid size-14 place-items-center rounded-full bg-cta text-cta-fg shadow-xl md:bottom-6 md:right-6"><MessageCircle className="size-6" /></a>;
}
export { WA };
