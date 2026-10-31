import { Link } from 'react-router-dom';
import { useSettings } from '@/hooks/useSettings.js';
import logo from '@/assets/logo.webp';

/** Header lockup. If the admin uploads a logo (Settings > Store) it is used; otherwise the brand name is set in the brand fonts. */
export function Wordmark({ className = '' }) {
  const { s } = useSettings();
  return (
    <Link to="/" aria-label={`${s['store.name'] || 'Gifted Scents'} home`} className={`inline-flex items-baseline gap-1.5 leading-none ${className}`}>
      {s['store.logoUrl'] ? <img src={s['store.logoUrl']} alt={s['store.name'] || 'Gifted Scents'} className="h-10 w-auto" width="160" height="40" /> : (
        <>
          <span className="gold-text font-[var(--font-display)] text-[1.7rem] font-semibold tracking-tight sm:text-3xl">Gifted</span>
          <span className="script text-[1.7rem] text-cta sm:text-3xl">Scents</span>
        </>
      )}
    </Link>
  );
}
export const LogoImage = ({ className = '', ...p }) => <img src={logo} alt="Gifted Scents logo" width="900" height="900" loading="lazy" className={className} {...p} />;
