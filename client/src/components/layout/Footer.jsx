import { Link } from 'react-router-dom';
import { Instagram, Facebook, Youtube, MessageCircle, Mail, Phone, MapPin } from 'lucide-react';
import { Wordmark } from './Brand.jsx';
import { NewsletterForm } from '@/components/shop/Newsletter.jsx';
import { useSettings } from '@/hooks/useSettings.js';
import { waLink, WA } from '@/utils/whatsapp.js';

const TikTok = (p) => <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}><path d="M16.6 3a5.6 5.6 0 0 0 4.4 4.9v3.1a8.6 8.6 0 0 1-4.3-1.2v6.3a6.3 6.3 0 1 1-6.3-6.3c.3 0 .6 0 .9.1v3.2a3.2 3.2 0 1 0 2.3 3V3h3Z" /></svg>;
const XIcon = (p) => <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}><path d="M18.2 2h3.3l-7.2 8.3L22.800 22h-6.600l-5.200-6.800L5 22H1.700l7.700-8.800L1.300 2h6.800l4.700 6.200L18.200 2Zm-1.200 18h1.800L7.100 3.900H5.200L17 20Z" /></svg>;

const SOCIALS = [['instagram', Instagram, 'Instagram'], ['facebook', Facebook, 'Facebook'], ['tiktok', TikTok, 'TikTok'], ['x', XIcon, 'X'], ['youtube', Youtube, 'YouTube']];

export function Footer() {
  const { s } = useSettings(); const wa = waLink(s['support.whatsapp'], WA.chat);
  return (
    <footer className="mt-24 border-t border-line bg-surface pb-24 md:pb-0">
      <div className="container-x grid gap-12 py-14 lg:grid-cols-[1.3fr_2fr]">
        <div className="space-y-5">
          <Wordmark />
          <p className="script text-3xl text-cta">{s['website.footerText'] || s['store.tagline2']}</p>
          <div className="max-w-sm"><p className="mb-2 text-sm font-semibold">Get offers and new arrivals</p><NewsletterForm /></div>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          <nav aria-label="Shop"><h2 className="eyebrow mb-4 !font-sans">Shop</h2><ul className="space-y-2.5 text-sm">
            {[['/shop', 'All products'], ['/shop/men', 'Men'], ['/shop/women', 'Women'], ['/shop/unisex', 'Unisex'], ['/brands', 'Brands'], ['/scent-finder', 'Scent Finder'], ['/shop?type=ROLL_ON', 'Roll-Ons'], ['/shop?type=BODY_MIST', 'Body Mists'], ['/shop?type=CANDLE', 'Candles & Diffusers']].map(([to, t]) => <li key={to}><Link className="hover:text-accent" to={to}>{t}</Link></li>)}</ul></nav>
          <nav aria-label="Customer service"><h2 className="eyebrow mb-4 !font-sans">Help</h2><ul className="space-y-2.5 text-sm">
            {[['/contact', 'Contact us'], ['/faq', 'FAQ'], ['/shipping', 'Delivery information'], ['/returns', 'Returns & refunds'], ['/privacy', 'Privacy policy'], ['/terms', 'Terms & conditions'], ['/account/orders', 'Track my order']].map(([to, t]) => <li key={to}><Link className="hover:text-accent" to={to}>{t}</Link></li>)}</ul></nav>
          <div className="col-span-2 sm:col-span-1"><h2 className="eyebrow mb-4 !font-sans">Contact</h2>
            <ul className="space-y-3 text-sm text-muted">
              {s['store.phone'] && <li className="flex gap-2"><Phone className="mt-0.5 size-4 shrink-0 text-accent" /><a className="hover:text-accent" href={`tel:${s['store.phone']}`}>{s['store.phone']}</a></li>}
              {wa && <li className="flex gap-2"><MessageCircle className="mt-0.5 size-4 shrink-0 text-accent" /><a className="hover:text-accent" href={wa} target="_blank" rel="noopener noreferrer">Chat on WhatsApp</a></li>}
              {(s['support.email'] || s['store.email']) && <li className="flex gap-2"><Mail className="mt-0.5 size-4 shrink-0 text-accent" /><a className="break-all hover:text-accent" href={`mailto:${s['support.email'] || s['store.email']}`}>{s['support.email'] || s['store.email']}</a></li>}
              {s['store.address'] && <li className="flex gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-accent" />{s['store.address']}</li>}
              {s['store.hours'] && <li>{s['store.hours']}</li>}
            </ul>
            <div className="mt-4 flex gap-1.5">{SOCIALS.filter(([k]) => s[`social.${k}`]).map(([k, I, l]) => (
              <a key={k} href={s[`social.${k}`]} target="_blank" rel="noopener noreferrer" aria-label={l} className="grid size-10 place-items-center rounded-full border border-line transition hover:border-accent hover:text-accent"><I className="size-4" /></a>))}</div>
          </div>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="container-x flex flex-col items-start justify-between gap-3 py-5 text-xs text-muted sm:flex-row sm:items-center">
          <p>&copy; {new Date().getFullYear()} {s['store.name'] || 'Gifted Scents'}. All rights reserved.</p>
          <p>Secure payments by Paystack &middot; Prices in Nigerian Naira (&#8358;)</p>
        </div>
      </div>
    </footer>
  );
}
