import { useEffect, useRef, useState } from 'react';
import { chartsAnimate } from '../lib/motion.jsx';

/**
 * src/components/Gauge.jsx
 * ---------------------------------------------------------------------------
 * A dial for one bounded percentage — completion, accuracy, delivery. Nothing
 * else.
 *
 * A gauge is only honest when the value has a real floor and ceiling. A count
 * ("14 children answering") has no ceiling, so it gets a stat tile instead;
 * drawing it as a dial invents a maximum that does not exist.
 *
 * COLOUR NEVER CARRIES THE MEANING ALONE. The arc takes a status colour, but
 * the number and a word are always drawn too, in ordinary ink — so the dial
 * reads the same to someone who cannot separate the hues.
 */

const SIZE = 148;
const R = 58;                 // radius of the arc's centre line
const STROKE = 11;
const START = 135;            // 135 -> 405 leaves the gap at the bottom
const SWEEP = 270;

const pt = (deg) => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [SIZE / 2 + R * Math.cos(rad), SIZE / 2 + R * Math.sin(rad)];
};

const arc = (fromDeg, toDeg) => {
  const [x1, y1] = pt(fromDeg);
  const [x2, y2] = pt(toDeg);
  return `M ${x1} ${y1} A ${R} ${R} 0 ${toDeg - fromDeg > 180 ? 1 : 0} 1 ${x2} ${y2}`;
};

/* Reserved status colours. Never reused as a series colour, always with words. */
const TONES = {
  good: { stroke: '#0d9488', word: 'Healthy' },
  warning: { stroke: '#f59e0b', word: 'Watch' },
  critical: { stroke: '#dc2626', word: 'Poor' },
  neutral: { stroke: '#64748b', word: '' },
};

/** Count a number up to its value, unless stillness was asked for. */
function useCountUp(target, enabled) {
  const [n, setN] = useState(enabled ? 0 : target);
  const raf = useRef(0);
  useEffect(() => {
    if (!enabled) { setN(target); return undefined; }
    const t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / 700);
      setN(target * (1 - (1 - k) ** 3));
      if (k < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [target, enabled]);
  return n;
}

export default function Gauge({ value, label, sub, tone = 'neutral', thresholds }) {
  const animate = chartsAnimate();
  const has = value !== null && value !== undefined && !Number.isNaN(Number(value));
  const v = has ? Math.max(0, Math.min(100, Number(value))) : 0;

  let key = tone;
  if (has && thresholds) {
    key = v >= thresholds.good ? 'good' : v >= thresholds.warning ? 'warning' : 'critical';
  }
  const { stroke, word } = TONES[key] || TONES.neutral;

  const shown = useCountUp(v, animate && has);
  const end = START + (SWEEP * shown) / 100;

  return (
    <figure className="flex flex-col items-center m-0">
      <svg
        width={SIZE} height={SIZE - 18} viewBox={`0 0 ${SIZE} ${SIZE - 10}`} role="img"
        aria-label={`${label}: ${has ? `${Math.round(v)} percent` : 'no data'}`}
      >
        {/* the track — recessive, never competing with the value */}
        <path d={arc(START, START + SWEEP)} fill="none" stroke="#e3eae8"
              strokeWidth={STROKE} strokeLinecap="round" />
        {has && shown > 0.4 && (
          <path d={arc(START, end)} fill="none" stroke={stroke}
                strokeWidth={STROKE} strokeLinecap="round" />
        )}
        <text x={SIZE / 2} y={SIZE / 2 + 6} textAnchor="middle" className="fill-ink"
              style={{ fontSize: 30, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
          {has ? Math.round(shown) : '—'}
        </text>
        {has && (
          <text x={SIZE / 2} y={SIZE / 2 + 24} textAnchor="middle" className="fill-muted"
                style={{ fontSize: 12, fontWeight: 700 }}>%</text>
        )}
      </svg>

      <figcaption className="text-center -mt-1">
        <div className="text-sm font-bold text-ink">{label}</div>
        {/* the word is the point: status is never the colour alone */}
        <div className="text-[11px] text-muted">
          {sub}{has && word ? `${sub ? ' · ' : ''}${word}` : ''}
        </div>
      </figcaption>
    </figure>
  );
}

/** A count has no ceiling, so it is a tile and not a dial. */
export function StatTile({ label, value, sub, tone = 'ink' }) {
  const colour = { ink: 'text-ink', warn: 'text-amber-600', bad: 'text-red-600' }[tone] || 'text-ink';
  const shown = useCountUp(Number(value) || 0, chartsAnimate());
  return (
    <div className="card p-4">
      <div className="text-[11px] font-bold uppercase tracking-wide text-muted">{label}</div>
      <div className={`text-3xl font-extrabold ${colour}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
        {Math.round(shown)}
      </div>
      {sub && <div className="text-[11px] text-muted mt-0.5">{sub}</div>}
    </div>
  );
}
