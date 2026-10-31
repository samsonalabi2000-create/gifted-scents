import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/store/themeStore.js';

const OPTS = [['light', Sun, 'Light'], ['dark', Moon, 'Dark'], ['system', Monitor, 'System']];
export function ThemeToggle({ className = '' }) {
  const { pref, setPref } = useTheme();
  return (
    <div role="radiogroup" aria-label="Colour theme" className={`inline-flex rounded-full border border-line p-0.5 ${className}`}>
      {OPTS.map(([v, Icon, label]) => (
        <button key={v} type="button" role="radio" aria-checked={pref === v} aria-label={`${label} mode`} onClick={() => setPref(v)}
          className={`grid size-9 place-items-center rounded-full transition ${pref === v ? 'bg-cta text-cta-fg' : 'text-muted hover:text-fg'}`}><Icon className="size-4" aria-hidden /></button>
      ))}
    </div>
  );
}
