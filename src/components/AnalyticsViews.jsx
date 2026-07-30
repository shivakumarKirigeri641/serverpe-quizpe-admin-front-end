/**
 * AnalyticsViews — three at-a-glance data views for the Analytics page:
 *   <Funnel/>            end-to-end conversion, stage by stage, with drop-offs
 *   <Retention/>         signup-week cohorts × day-1/3/7/14 retention (heat)
 *   <ActivityCalendar/>  GitHub-style daily-quiz heatmap
 * Each fetches its own data and fails quietly so it can never break the page.
 */
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

/* ------------------------------------------------------------ funnel ------- */
export function Funnel() {
  const [f, setF] = useState(null);
  useEffect(() => { api.funnel().then((d) => setF(d.funnel)).catch(() => setF(null)); }, []);
  if (!f) return null;
  const top = Math.max(1, ...f.map((s) => s.count));
  // the single biggest leak (most negative drop), for a plain-English caption
  const leak = f.filter((s) => s.drop_from_prev !== null)
    .reduce((w, s) => (w && w.drop_from_prev <= s.drop_from_prev ? w : s), null);

  return (
    <div className="card p-5">
      <h2 className="font-bold text-brand mb-1">Conversion funnel</h2>
      <p className="text-xs text-muted mb-4">Stage counts since launch — the drop between stages is what matters</p>
      <div className="space-y-2.5">
        {f.map((s) => {
          const w = Math.max(2, Math.round((s.count / top) * 100));
          return (
            <div key={s.key}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-semibold text-ink truncate mr-2">{s.label}</span>
                <span className="shrink-0 flex items-center gap-2">
                  <b className="text-ink">{s.count.toLocaleString('en-IN')}</b>
                  {s.drop_from_prev !== null && (
                    <span className={`pill ${s.drop_from_prev < 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'}`}>
                      {s.drop_from_prev > 0 ? '+' : ''}{s.drop_from_prev}%
                    </span>
                  )}
                </span>
              </div>
              <div className="h-6 rounded bg-line/40 overflow-hidden">
                <div className="h-full rounded transition-all" style={{ width: `${w}%`, background: '#0f766e' }} />
              </div>
            </div>
          );
        })}
      </div>
      {leak && leak.drop_from_prev < 0 && (
        <p className="text-xs text-muted mt-4">
          Biggest drop-off at <b className="text-red-600">{leak.label}</b> ({leak.drop_from_prev}%) — the best place to improve.
        </p>
      )}
    </div>
  );
}

/* --------------------------------------------------------- retention ------- */
const heat = (v) => ({ background: `rgba(15,118,110,${(0.14 + 0.76 * (v / 100)).toFixed(3)})`, color: v > 55 ? '#fff' : '#12233b' });
const fmtWeek = (d) => 'Wk of ' + new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

export function Retention() {
  const [rows, setRows] = useState(null);
  useEffect(() => { api.retention().then((d) => setRows(d.rows)).catch(() => setRows(null)); }, []);
  if (!rows) return null;
  const cell = (v, off, age) => (age < off
    ? <span className="text-muted">—</span>
    : <span className="pill font-semibold" style={heat(v)}>{v}%</span>);

  return (
    <div className="card p-5">
      <h2 className="font-bold text-brand mb-1">Retention by signup week</h2>
      <p className="text-xs text-muted mb-4">Share still doing quizzes N days after they started</p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead><tr>{['Cohort', 'Kids', 'D1', 'D3', 'D7', 'D14'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.cohort_start} className="hover:bg-line/30 transition">
                <td className="td text-xs whitespace-nowrap font-semibold">{fmtWeek(r.cohort_start)}</td>
                <td className="td font-semibold">{r.size}</td>
                <td className="td">{cell(r.d1, 1, r.age_days)}</td>
                <td className="td">{cell(r.d3, 3, r.age_days)}</td>
                <td className="td">{cell(r.d7, 7, r.age_days)}</td>
                <td className="td">{cell(r.d14, 14, r.age_days)}</td>
              </tr>
            ))}
            {!rows.length && <tr><td className="td text-center text-muted" colSpan={6}>No cohorts yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* --------------------------------------------------- activity calendar ----- */
const WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function ActivityCalendar() {
  const [rows, setRows] = useState(null);
  useEffect(() => { api.activity(12).then((d) => setRows(d.rows)).catch(() => setRows(null)); }, []);
  if (!rows || !rows.length) return null;

  const max = Math.max(1, ...rows.map((r) => r.n));
  const cells = [];
  const lead = (new Date(rows[0].day + 'T00:00:00').getDay() + 6) % 7;  // Mon=0
  for (let i = 0; i < lead; i++) cells.push(null);
  rows.forEach((r) => cells.push(r));
  while (cells.length % 7) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  const shade = (n) => (n === 0 ? '#eef2f0' : `rgba(15,118,110,${(0.2 + 0.8 * (n / max)).toFixed(3)})`);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-brand">Quiz activity — last 12 weeks</h2>
        <span className="text-xs text-muted">completed quizzes per day</span>
      </div>
      <div className="flex gap-2">
        <div className="flex flex-col gap-1 pt-0.5 text-[9px] text-muted">
          {WD.map((d, i) => <span key={d} className="h-3.5 leading-[14px]">{i % 2 === 0 ? d : ''}</span>)}
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1">
          {weeks.map((wk, ci) => (
            <div key={ci} className="flex flex-col gap-1">
              {wk.map((c, ri) => (c
                ? <div key={ri} title={`${c.day}: ${c.n} quiz${c.n === 1 ? '' : 'zes'}`}
                       className="w-3.5 h-3.5 rounded-sm" style={{ background: shade(c.n) }} />
                : <div key={ri} className="w-3.5 h-3.5" />))}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1 mt-3 text-[10px] text-muted">
        <span>less</span>
        {[0, 0.25, 0.5, 0.75, 1].map((f, i) => (
          <span key={i} className="w-3 h-3 rounded-sm" style={{ background: f === 0 ? '#eef2f0' : `rgba(15,118,110,${0.2 + 0.8 * f})` }} />
        ))}
        <span>more</span>
      </div>
    </div>
  );
}
