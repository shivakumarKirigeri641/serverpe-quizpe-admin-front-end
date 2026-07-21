/**
 * src/components/ui.jsx
 * ---------------------------------------------------------------------------
 * Small shared pieces so every page looks and behaves the same: loading and
 * error states, stat tiles with comparison deltas, and a scrollable table.
 *
 * Tables scroll inside their own container rather than pushing the page wide —
 * this panel has some genuinely wide data (question text, invoice lines).
 */

import { motion } from 'framer-motion';

export const inr = (n) =>
  '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

export const Page = ({ title, subtitle, actions, children }) => (
  <>
    <div className="flex items-start justify-between gap-4 mb-5">
      <div>
        <h1 className="text-2xl font-bold text-brand">{title}</h1>
        {subtitle && <p className="text-sm text-muted mt-0.5">{subtitle}</p>}
      </div>
      {actions}
    </div>
    {children}
  </>
);

export const Loading = ({ label = 'Loading…' }) => (
  <div className="card p-10 grid place-items-center text-muted text-sm">
    <div className="w-6 h-6 rounded-full border-2 border-line border-t-brand-accent animate-spin mb-3" />
    {label}
  </div>
);

export const ErrorBox = ({ error, onRetry }) => (
  <div className="card p-6 border-red-200 bg-red-50/60">
    <p className="text-sm text-red-700 font-semibold mb-1">Something went wrong</p>
    <p className="text-sm text-red-600">{String(error)}</p>
    {onRetry && <button className="btn-sec mt-3" onClick={onRetry}>Try again</button>}
  </div>
);

export const Empty = ({ children }) => (
  <div className="card p-10 text-center text-muted text-sm">{children}</div>
);

/** A headline number with its change against the previous period. */
export function Stat({ label, value, delta, sub, tone = 'brand', index = 0 }) {
  const up = delta > 0, flat = delta === 0 || delta === undefined || delta === null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35 }}
      className="card p-4"
    >
      <div className="text-[11px] font-bold uppercase tracking-wide text-muted">{label}</div>
      <div className={`text-3xl font-extrabold mt-1 ${tone === 'brand' ? 'text-brand' : 'text-ink'}`}>
        {value}
      </div>
      <div className="flex items-center gap-2 mt-1.5">
        {!flat && (
          <span className={`pill ${up ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            {up ? '▲' : '▼'} {Math.abs(delta)}%
          </span>
        )}
        {sub && <span className="text-[11px] text-muted">{sub}</span>}
      </div>
    </motion.div>
  );
}

export const Pill = ({ tone = 'grey', children }) => {
  const tones = {
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
    blue: 'bg-sky-50 text-sky-700',
    grey: 'bg-line/60 text-muted',
  };
  return <span className={`pill ${tones[tone] || tones.grey}`}>{children}</span>;
};

/** Wide data scrolls inside the card, never widening the page. */
export const Table = ({ head, children, empty }) => (
  <div className="card overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead><tr>{head.map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
    {empty && <div className="p-8 text-center text-sm text-muted">{empty}</div>}
  </div>
);

export const Row = ({ children, onClick, index = 0 }) => (
  <motion.tr
    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
    transition={{ delay: Math.min(index * 0.02, 0.3) }}
    onClick={onClick}
    className={onClick ? 'cursor-pointer hover:bg-line/30 transition' : ''}
  >{children}</motion.tr>
);
