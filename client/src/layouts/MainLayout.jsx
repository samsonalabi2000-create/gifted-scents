import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { WifiOff } from 'lucide-react';
import { AnnouncementBar } from '@/components/layout/AnnouncementBar.jsx';
import { Navbar } from '@/components/layout/Navbar.jsx';
import { Footer } from '@/components/layout/Footer.jsx';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav.jsx';
import { SearchOverlay } from '@/components/layout/SearchOverlay.jsx';
import { CartDrawer } from '@/components/layout/CartDrawer.jsx';
import { AIChatWidget } from '@/components/layout/AIChatWidget.jsx';
import { ConsentBanner } from '@/components/layout/ConsentBanner.jsx';
import { useOnline } from '@/hooks/useOnline.js';
import { useSettings } from '@/hooks/useSettings.js';
import { initAnalytics } from '@/utils/analytics.js';
import { Seo, orgLd, websiteLd } from '@/components/Seo.jsx';

export default function MainLayout() {
  const { pathname } = useLocation(); const online = useOnline(); const { s } = useSettings();
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [pathname]);
  useEffect(() => { initAnalytics({ gaId: s['analytics.gaId'], pixelId: s['analytics.metaPixelId'] }); }, [s]);
  return (
    <div className="flex min-h-dvh flex-col">
      {pathname === '/' && <Seo title={s['website.seoTitle'] || 'Gifted Scents'} description={s['website.seoDescription']} path="/" jsonLd={[orgLd(s), websiteLd(s)]} />}
      {!online && <div role="status" className="flex items-center justify-center gap-2 bg-[var(--warning)] px-4 py-2 text-sm font-medium text-ink-950"><WifiOff className="size-4" />You are offline. Some features may not work.</div>}
      <AnnouncementBar /><Navbar />
      <main id="main" className="flex-1 outline-none" tabIndex={-1}><Outlet /></main>
      <Footer /><MobileBottomNav /><SearchOverlay /><CartDrawer /><AIChatWidget /><ConsentBanner />
    </div>
  );
}
