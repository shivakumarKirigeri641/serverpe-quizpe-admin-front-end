import { useEffect, useRef, useState } from 'react';
import { usePrefs, savePrefs } from '../lib/motion.jsx';
import { CogIcon } from './Icons.jsx';

/**
 * src/components/Preferences.jsx
 * ---------------------------------------------------------------------------
 * How much this panel is allowed to move, and how often it refetches.
 *
 * It lives in the top bar rather than on the Settings screen because it
 * changes how every screen behaves, and because someone who wants the motion
 * to stop wants it to stop now, not after finding a settings page.
 */

const MOTION = [
  { v: 'full', label: 'Full', hint: 'Everything animates' },
  { v: 'reduced', label: 'Reduced', hint: 'Brief, no sweeping' },
  { v: 'minimal', label: 'Still', hint: 'Nothing moves' },
];

const REALTIME = [
  { v: 'live', label: 'Live', hint: 'About every 10 seconds' },
  { v: '30s', label: '30 sec', hint: 'Lighter on the database' },
  { v: '60s', label: '1 min', hint: 'Lightest' },
  { v: 'manual', label: 'Manual', hint: 'Only when you press Refresh' },
];

function Choice({ options, value, onPick }) {
  return (
    <div className="grid gap-1">
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onPick(o.v)}
          className={`flex items-baseline gap-2 text-left rounded-lg px-2.5 py-1.5 text-sm transition ${
            value === o.v ? 'bg-brand-accent/10 text-brand font-semibold' : 'hover:bg-line/50 text-ink'}`}
        >
          <span className="w-16 shrink-0">{o.label}</span>
          <span className="text-[11px] text-muted truncate">{o.hint}</span>
        </button>
      ))}
    </div>
  );
}

export default function Preferences() {
  const prefs = usePrefs();
  const [open, setOpen] = useState(false);
  const box = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    const onClick = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  return (
    <div className="relative" ref={box}>
      <button
        onClick={() => setOpen((o) => !o)}
        title="Motion and refresh"
        aria-label="Motion and refresh preferences"
        aria-expanded={open}
        className="grid place-items-center w-8 h-8 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition"
      >
        <CogIcon size={17} />
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-64 card p-3 text-ink">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted px-1 pb-1.5">Motion</div>
          <Choice options={MOTION} value={prefs.motion} onPick={(v) => savePrefs({ motion: v })} />

          <div className="text-[10px] font-bold uppercase tracking-wider text-muted px-1 pt-3 pb-1.5">Refresh</div>
          <Choice options={REALTIME} value={prefs.realtime} onPick={(v) => savePrefs({ realtime: v })} />

          <label className="flex items-center gap-2 mt-3 px-2.5 py-1.5 rounded-lg hover:bg-line/50 cursor-pointer">
            <input
              type="checkbox" checked={prefs.charts}
              onChange={(e) => savePrefs({ charts: e.target.checked })}
              className="accent-brand-accent"
            />
            <span className="text-sm">Charts draw in</span>
          </label>

          <p className="text-[11px] text-muted px-1 pt-2 leading-snug">
            Between 7:00 and 11:45 PM the panel never refreshes faster than every
            5 seconds, whatever is chosen here — children are answering.
          </p>
        </div>
      )}
    </div>
  );
}
