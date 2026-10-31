import { useSettings } from '@/hooks/useSettings.js';
export function AnnouncementBar() {
  const { s } = useSettings();
  if (s['website.announcementEnabled'] === false || !s['website.announcement']) return null;
  return <div className="bg-ink-950 px-4 py-2 text-center text-xs tracking-wide text-gold-300 sm:text-sm" role="note">{s['website.announcement']}</div>;
}
