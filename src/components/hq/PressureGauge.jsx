import { useEffect, useRef, useState } from 'react';
import { motionLevel } from '../../lib/motion.jsx';

/*
 * THE WORKSHOP PRESSURE GAUGE (admin revamp, 2026-10-05) — the same
 * instrument as GaadiPe's panel ("D", chosen 2026-10-03): a brass bezel, a
 * white face with green, yellow and red bands, bold ticks, a black arrow
 * needle drawn last, and the exact figure under the hub. The needle sweeps to
 * full on first show, then settles on the reading.
 *
 *   danger  'high' (default): red at the top end (limit used, failures)
 *           'low': red at the bottom end (completion, paying share)
 *   bands   [warn, bad] as fractions of max where yellow and red begin
 *   word    a status word under the label, so colour is never the only signal
 */

const ease = (k) => 1 - (1 - k) ** 3;
const backOut = (k) => { const c = 1.4; return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2; };
const short = (n) => (n >= 1000 ? `${Math.round(n / 100) / 10}k`.replace('.0k', 'k') : String(Math.round(n)));

function useNeedle(frac) {
  const full = motionLevel() === 'full';
  const [f, setF] = useState(full ? 0 : frac);
  const prev = useRef(full ? 0 : frac);
  const tested = useRef(!full);
  useEffect(() => {
    if (!full) { setF(frac); prev.current = frac; return undefined; }
    let raf; let stop = false;
    const run = (from, to, ms, easing) => new Promise((done) => {
      const t0 = performance.now();
      const step = (now) => {
        if (stop) return;
        const k = Math.max(0, Math.min(1, (now - t0) / ms));
        setF(from + (to - from) * easing(k));
        if (k < 1) raf = requestAnimationFrame(step); else done();
      };
      raf = requestAnimationFrame(step);
    });
    (async () => {
      if (!tested.current) { tested.current = true; await run(0, 1, 700, ease); if (stop) return; await run(1, frac, 1100, backOut); }
      else await run(prev.current, frac, 900, backOut);
      prev.current = frac;
    })();
    return () => { stop = true; cancelAnimationFrame(raf); };
  }, [frac]); // eslint-disable-line react-hooks/exhaustive-deps
  return f;
}

export default function PressureGauge({ value, max = 100, label, text, caption, size = 150, danger = 'high', bands, word }) {
  const has = value != null && Number.isFinite(Number(value)) && max > 0;
  const frac = has ? Math.max(0, Math.min(1, Number(value) / max)) : 0;
  const f = useNeedle(frac);
  const low = danger === 'low';
  const [warn, bad] = bands || (low ? [0.6, 0.35] : [0.7, 0.9]);
  const W = 300; const cx = 150; const cy = 150;
  const A0 = -135; const SPAN = 270;
  const ang = (x) => (A0 + SPAN * x) * (Math.PI / 180);
  const pt = (x, r) => [cx + r * Math.sin(ang(x)), cy - r * Math.cos(ang(x))];
  const arc = (a, b, r) => {
    const [x1, y1] = pt(a, r); const [x2, y2] = pt(b, r);
    return `M ${x1} ${y1} A ${r} ${r} 0 ${(b - a) * SPAN > 180 ? 1 : 0} 1 ${x2} ${y2}`;
  };
  const zones = low
    ? [[0, bad, '#d6342a'], [bad, warn, '#f2b705'], [warn, 1, '#1e9e4a']]
    : [[0, warn, '#1e9e4a'], [warn, bad, '#f2b705'], [bad, 1, '#d6342a']];
  const state = !has ? null : low
    ? (frac < bad ? 'Alert' : frac < warn ? 'Watch' : 'OK')
    : (frac >= bad ? 'Alert' : frac >= warn ? 'Watch' : 'OK');
  const shown = word ?? state;
  const wordColour = { OK: 'text-emerald-700', Watch: 'text-amber-700', Alert: 'text-red-700' }[shown] || 'text-muted';
  const moving = has && Math.abs(f - frac) > 0.0005;
  const shape = String(text ?? '').match(/^([^\d-]*)(-?[\d,]*\.?\d+)(.*)$/);
  const live = !moving ? text ?? Math.round(Number(value))
    : shape ? `${shape[1]}${Math.round(f * max).toLocaleString('en-IN')}${shape[3]}` : Math.round(f * max);
  const rot = A0 + SPAN * f;
  return (
    <div className="flex flex-col items-center" role="img"
      aria-label={`${label}: ${text ?? value ?? 'no data'}${shown ? `, ${shown}` : ''}${caption ? `, ${caption}` : ''}`}>
      <svg width={size} height={size} viewBox={`0 0 ${W} ${W}`} aria-hidden="true">
        <circle cx={cx} cy={cy} r={146} fill="#b8862d" />
        <circle cx={cx} cy={cy} r={139} fill="#e3c27a" />
        <circle cx={cx} cy={cy} r={130} fill="#fbfbf8" stroke="#333" strokeWidth="1.5" />
        {zones.map(([a, b, c]) => (b > a ? <path key={c} d={arc(a, b, 110)} fill="none" stroke={c} strokeWidth="16" /> : null))}
        {Array.from({ length: 51 }, (_, i) => {
          const x = i / 50; const major = i % 5 === 0;
          const [x1, y1] = pt(x, 121); const [x2, y2] = pt(x, 121 - (major ? 16 : 8));
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#1d1d1d" strokeWidth={major ? 3.2 : 1.4} strokeLinecap="round" />;
        })}
        {[0, 0.2, 0.4, 0.6, 0.8, 1].map((x) => {
          const [lx, ly] = pt(x, 84);
          return <text key={x} x={lx} y={ly + 6} textAnchor="middle" fontSize="18" fontWeight="700" fill="#1d1d1d" fontFamily="ui-sans-serif, system-ui">{short(max * x)}</text>;
        })}
        <text x={cx} y={cy + 80} textAnchor="middle" fontSize={has ? 26 : 16} fontWeight="700" fill={has ? '#111' : '#8a8a8a'}
          fontFamily="ui-monospace, 'Courier New', monospace">{has ? live : 'NO DATA'}</text>
        <g transform={`rotate(${rot} ${cx} ${cy})`} opacity={has ? 1 : 0.3}>
          <path d={`M${cx - 4.5} ${cy + 28} L${cx - 4.5} ${cy - 90} L${cx - 11} ${cy - 90} L${cx} ${cy - 122} L${cx + 11} ${cy - 90} L${cx + 4.5} ${cy - 90} L${cx + 4.5} ${cy + 28} Z`}
            fill="#111" stroke="#fbfbf8" strokeWidth="1.2" strokeLinejoin="round" />
        </g>
        <circle cx={cx} cy={cy} r={13} fill="#111" />
        <circle cx={cx} cy={cy} r={4.5} fill="#e3c27a" />
      </svg>
      <div className="mt-1 text-center">
        <div className="text-[11px] font-bold uppercase tracking-wide text-muted">{label}</div>
        {shown && has && <div className={`text-[10px] font-semibold ${wordColour}`}>{shown}</div>}
        {caption && <div className="text-[10px] text-muted">{caption}</div>}
      </div>
    </div>
  );
}
