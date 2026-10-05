import { useEffect, useState } from 'react';

/*
 * Small shared pieces for the revamp's pages (2026-10-05), in QuizPe's own
 * look (card, btn-pri, btn-sec, pill). The chart colours are the validated
 * palette the GaadiPe panel uses; the status colours stay reserved for status.
 */
export const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'];

export const inr = (n, d = 0) => {
  const v = Number(n || 0);
  return `${v < 0 ? '−' : ''}₹${Math.abs(v).toLocaleString('en-IN', { maximumFractionDigits: d, minimumFractionDigits: d })}`;
};
export const num = (n) => Number(n || 0).toLocaleString('en-IN');
export const mask = (m) => (m ? `••••••${String(m).slice(-4)}` : '—');
export const ago = (v) => {
  if (!v) return '—';
  const s = (Date.now() - new Date(v).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
};
export const dt = (v) => (v ? new Date(v).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—');
export const dayLabel = (d) => new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

/** A dialog. Escape and the backdrop close it unless `locked`. */
export function Modal({ title, subtitle, onClose, children, wide = false, locked = false }) {
  useEffect(() => {
    if (locked) return undefined;
    const k = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose, locked]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={locked ? undefined : onClose} role="dialog" aria-modal="true">
      <div className={`card max-h-[90vh] w-full overflow-y-auto p-5 ${wide ? 'max-w-4xl' : 'max-w-lg'}`} onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-brand">{title}</h2>
            {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
          </div>
          {!locked && <button type="button" className="btn-sec !px-3 !py-1.5 text-xs" onClick={onClose}>Close</button>}
        </div>
        {children}
      </div>
    </div>
  );
}

/** Today / 7 / 30 / 90 days. */
export function Period({ value, onChange, options = [7, 30, 90] }) {
  return (
    <div className="inline-flex rounded-xl border border-line bg-white p-0.5">
      {options.map((d) => (
        <button key={d} type="button" onClick={() => onChange(d)}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${value === d ? 'bg-brand-accent text-white' : 'text-muted hover:text-ink'}`}>
          {d === 1 ? 'Today' : `${d} days`}
        </button>
      ))}
    </div>
  );
}

/** Tabs along the top of a page. */
export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="mb-4 flex flex-wrap gap-1 border-b border-line" role="tablist">
      {tabs.map(([k, label, n]) => (
        <button key={k} type="button" role="tab" aria-selected={value === k} onClick={() => onChange(k)}
          className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold ${value === k ? 'border-brand-accent text-ink' : 'border-transparent text-muted hover:text-ink'}`}>
          {label}{n != null && <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${value === k ? 'bg-brand-accent text-white' : 'bg-line/60 text-muted'}`}>{n}</span>}
        </button>
      ))}
    </div>
  );
}

/** A chart card with a "Table" switch, so every chart can be read as numbers too. */
export function ChartCard({ title, note, rows, columns, children, height = 260, tableOnly = false }) {
  const [shown, setTable] = useState(tableOnly);
  const table = tableOnly || shown;
  return (
    <div className="card p-4">
      <div className="mb-2 flex flex-wrap items-baseline gap-2">
        <h3 className="text-sm font-bold text-ink">{title}</h3>
        {note && <span className="text-[11px] text-muted">{note}</span>}
        {rows && columns && !tableOnly && (
          <button type="button" className="ml-auto text-[11px] font-semibold text-brand-accent hover:underline" onClick={() => setTable(!table)}>
            {table ? 'Chart' : 'Table'}
          </button>
        )}
      </div>
      {table && rows && columns ? (
        <div className="max-h-80 overflow-auto">
          <table className="w-full border-collapse text-sm">
            <thead><tr>{columns.map(([, label]) => <th key={label} className="th">{label}</th>)}</tr></thead>
            <tbody>{rows.map((r, i) => (
              <tr key={i}>{columns.map(([k, label, f]) => <td key={label} className="td tabular-nums">{f ? f(r[k], r) : (r[k] ?? '—')}</td>)}</tr>
            ))}</tbody>
          </table>
        </div>
      ) : <div style={{ height }}>{children}</div>}
    </div>
  );
}

/** A tooltip in the panel's style for Recharts. */
export function Tip({ active, payload, label, money = [] }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2 text-xs shadow-card">
      <div className="mb-1 font-bold text-ink">{/^\d{4}-\d{2}-\d{2}$/.test(String(label)) ? dayLabel(label) : label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted">{p.name}</span>
          <b className="ml-auto tabular-nums text-ink">{money.includes(p.dataKey) ? inr(p.value) : num(p.value)}</b>
        </div>
      ))}
      <div className="mt-1 text-[10px] text-muted">Tap a day for details</div>
    </div>
  );
}
