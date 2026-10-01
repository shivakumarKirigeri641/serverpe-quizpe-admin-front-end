import { useEffect, useState } from 'react';
import { onBusyChange, onHealthChange } from '../lib/api';
import { fireRefresh, motionLevel } from '../lib/motion.jsx';
import { RefreshIcon } from './Icons.jsx';

/**
 * src/components/HeaderStatus.jsx
 * ---------------------------------------------------------------------------
 * The three small truths the top bar tells: whether the panel is talking to
 * the server, whether it is busy doing so, and a way to make it ask again.
 *
 * None of this invents state. It listens to the API client, which already
 * knows — see the health and busy signals in lib/api.js.
 */

/* ── a slim bar across the very top while a request is in flight ─────────── */
export function BusyBar() {
  const [busy, setBusy] = useState(false);
  useEffect(() => onBusyChange(setBusy), []);
  if (!busy) return null;
  return (
    <div className="fixed inset-x-0 top-0 z-[60] h-0.5 bg-brand-accent/25" role="presentation">
      <div
        className="h-full w-1/3 bg-brand-accent"
        style={motionLevel() === 'full' ? { animation: 'qp-slide 1.1s ease-in-out infinite' } : undefined}
      />
    </div>
  );
}

/* ── a dot that goes amber when the last call could not reach the server ─── */
export function ConnectionStatus() {
  const [{ healthy, lastOkAt }, setState] = useState({ healthy: true, lastOkAt: null });
  const [, tick] = useState(0);

  useEffect(() => onHealthChange(setState), []);
  // Re-render every 20s so "2 min ago" does not quietly become a lie.
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 20000);
    return () => clearInterval(id);
  }, []);

  const ago = lastOkAt ? Math.round((Date.now() - lastOkAt) / 1000) : null;
  const when = ago === null ? '' : ago < 60 ? 'just now' : `${Math.round(ago / 60)} min ago`;

  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] font-semibold"
      title={healthy ? `Last reply ${when}` : 'The last request did not reach the server'}
    >
      <span
        className={`w-2 h-2 rounded-full ${healthy ? 'bg-emerald-400' : 'bg-amber-400'}`}
        style={healthy && motionLevel() === 'full'
          ? { animation: 'qp-breathe 2.4s ease-in-out infinite' } : undefined}
      />
      <span className={healthy ? 'text-white/55' : 'text-amber-200'}>
        {healthy ? when : 'Offline'}
      </span>
    </span>
  );
}

/* ── one button that reloads every listening screen at once ──────────────── */
export function RefreshButton() {
  const [spinning, setSpinning] = useState(false);

  const go = () => {
    fireRefresh();
    if (motionLevel() === 'minimal') return;
    setSpinning(true);
    setTimeout(() => setSpinning(false), 600);
  };

  return (
    <button
      onClick={go}
      title="Refresh every screen"
      aria-label="Refresh"
      className="grid place-items-center w-8 h-8 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition"
    >
      <span className="grid place-items-center" style={spinning ? { animation: 'qp-spin .6s linear' } : undefined}>
        <RefreshIcon size={17} />
      </span>
    </button>
  );
}
