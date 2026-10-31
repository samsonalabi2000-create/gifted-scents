import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getConsent, setConsent, initAnalytics } from '@/utils/analytics.js';
import { useSettings } from '@/hooks/useSettings.js';
import { Button } from '@/components/ui/index.jsx';

/** Only shown when analytics IDs are configured. Tracking scripts never load before the visitor accepts. */
export function ConsentBanner() {
  const { s } = useSettings(); const [answered, setAnswered] = useState(getConsent() !== null);
  const gaId = s['analytics.gaId']; const pixelId = s['analytics.metaPixelId'];
  if (answered || (!gaId && !pixelId)) return null;
  const choose = (yes) => { setConsent(yes); setAnswered(true); if (yes) initAnalytics({ gaId, pixelId }); };
  return (
    <div role="region" aria-label="Cookie preferences" className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[var(--z-toast)] mx-auto max-w-xl rounded-2xl border border-line bg-bg p-4 shadow-2xl md:bottom-6 md:left-6 md:right-auto">
      <p className="text-sm">We use cookies to understand how the site is used. See our <Link to="/privacy" className="text-accent underline">privacy policy</Link>.</p>
      <div className="mt-3 flex gap-2"><Button size="sm" onClick={() => choose(true)}>Accept</Button><Button size="sm" variant="outline" onClick={() => choose(false)}>Decline</Button></div>
    </div>
  );
}
