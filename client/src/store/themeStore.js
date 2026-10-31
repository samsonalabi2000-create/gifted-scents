import { create } from 'zustand';

const apply = (pref) => {
  const dark = pref === 'dark' || (pref === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#090706' : '#fdfaf5');
};
const initial = () => { try { return localStorage.getItem('gs-theme') || 'system'; } catch { return 'system'; } };

export const useTheme = create((set) => ({
  pref: initial(),
  setPref: (pref) => { try { localStorage.setItem('gs-theme', pref); } catch { /* private mode */ } apply(pref); set({ pref }); },
}));
// follow OS changes while on "system"
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => { if (useTheme.getState().pref === 'system') apply('system'); });
apply(initial());
