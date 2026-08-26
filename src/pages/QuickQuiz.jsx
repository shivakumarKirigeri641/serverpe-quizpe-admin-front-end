/**
 * Quick Quiz — analytics for the Instant Quiz (₹9 pay-per-quiz) plan.
 *
 * Separate from the subscription/GST revenue: counts, revenue, day-vs-day and
 * week-vs-week comparison with up/down deltas, a 14-day trend, status split and
 * a recent list. Refreshes every 15s so it doubles as a live board.
 */
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Page, Loading, ErrorBox } from '../components/ui.jsx';

const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

// up/down delta between current and previous, as a coloured chip.
function Delta({ cur, prev, money = false }) {
  const c = Number(cur || 0), p = Number(prev || 0);
  const diff = c - p;
  const pct = p === 0 ? (c === 0 ? 0 : 100) : Math.round((diff / p) * 100);
  const up = diff > 0, flat = diff === 0;
  const tone = flat ? 'bg-slate-100 text-slate-500' : up ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700';
  const arrow = flat ? '→' : up ? '▲' : '▼';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${tone}`}>
      {arrow} {Math.abs(pct)}%
      <span className="font-medium opacity-70">({money ? inr(Math.abs(diff)) : Math.abs(diff)})</span>
    </span>
  );
}

function StatCard({ label, value, prev, prevLabel, money }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <div className="text-[11px] font-bold uppercase tracking-wider text-muted">{label}</div>
      <div className="mt-1 text-2xl font-extrabold text-ink">{money ? inr(value) : (value ?? 0)}</div>
      {prev != null && (
        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted">
          <Delta cur={value} prev={prev} money={money} /> vs {prevLabel}
        </div>
      )}
    </div>
  );
}

// simple twin-metric bar chart (quizzes) with a revenue sparkline underneath.
function Trend({ rows }) {
  const maxQ = Math.max(1, ...rows.map((r) => r.quizzes));
  const maxR = Math.max(1, ...rows.map((r) => Number(r.revenue)));
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <div className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted">Last 14 days</div>
      <div className="flex items-end gap-1.5" style={{ height: 120 }}>
        {rows.map((r) => (
          <div key={r.date} className="group flex flex-1 flex-col items-center justify-end" title={`${r.label}: ${r.quizzes} quizzes · ${inr(r.revenue)}`}>
            <div className="w-full rounded-t bg-violet-500/80 transition group-hover:bg-violet-600"
                 style={{ height: `${(r.quizzes / maxQ) * 100}%`, minHeight: r.quizzes ? 3 : 0 }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1.5">
        {rows.map((r) => (
          <div key={r.date} className="flex-1 text-center text-[8px] leading-tight text-muted">{r.label.split(' ')[0]}</div>
        ))}
      </div>
      {/* revenue sparkline */}
      <div className="mt-3 flex items-end gap-1.5" style={{ height: 44 }}>
        {rows.map((r) => (
          <div key={r.date} className="flex flex-1 flex-col items-center justify-end" title={`${r.label}: ${inr(r.revenue)}`}>
            <div className="w-full rounded-t bg-emerald-500/70"
                 style={{ height: `${(Number(r.revenue) / maxR) * 100}%`, minHeight: Number(r.revenue) ? 2 : 0 }} />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-muted">
        <span>🟪 Quizzes</span><span>🟩 Revenue (₹)</span>
      </div>
    </div>
  );
}

const STATUS_LABEL = { completed: '✅ Completed', in_progress: '✏️ In progress', closed: '⏳ Partly done', scheduled: '📩 Started', delivered: '📩 Sent' };

function ConfigCard() {
  const [cfg, setCfg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  useEffect(() => { api.instantConfig().then(setCfg).catch(() => setCfg({ price: 9, questions: 12 })); }, []);
  if (!cfg) return null;
  const save = async () => {
    setBusy(true); setMsg('');
    try {
      const r = await api.saveInstantConfig({ price: Number(cfg.price), questions: Number(cfg.questions) });
      setCfg(r); setMsg('Saved — live within a minute.');
      setTimeout(() => setMsg(''), 2500);
    } catch (e) { setMsg('✗ ' + e.message); } finally { setBusy(false); }
  };
  const gross = (Number(cfg.price || 0) * 1.18).toFixed(2);
  return (
    <div className="mb-4 rounded-2xl border border-violet-200 bg-violet-50/40 p-4">
      <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-violet-700">Instant Quiz settings</div>
      <div className="flex flex-wrap items-end gap-4">
        <label className="block">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted">Price ₹ (excl. GST)</span>
          <input type="number" min="1" step="1" className="w-32 rounded-lg border border-line px-3 py-2 text-sm"
                 value={cfg.price} onChange={(e) => setCfg({ ...cfg, price: e.target.value })} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted">Questions (4–50)</span>
          <input type="number" min="4" max="50" step="1" className="w-32 rounded-lg border border-line px-3 py-2 text-sm"
                 value={cfg.questions} onChange={(e) => setCfg({ ...cfg, questions: e.target.value })} />
        </label>
        <div className="text-xs text-muted">Parent pays <b className="text-violet-800">₹{gross}</b> (incl. 18% GST)</div>
        <button className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-60"
                disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
        {msg && <span className={`text-xs font-semibold ${msg.startsWith('✗') ? 'text-red-600' : 'text-emerald-700'}`}>{msg}</span>}
      </div>
    </div>
  );
}

export default function QuickQuiz() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');

  const load = () => api.quickQuiz().then(setD).catch((e) => setErr(e.message));
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, []);

  if (err) return <ErrorBox error={err} onRetry={load} />;
  if (!d) return <Loading label="Loading Quick Quiz…" />;

  return (
    <Page title="Quick Quiz" subtitle="Instant Quiz (₹9 pay-per-quiz) · refreshes every 15 seconds"
      actions={<span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-700">⚡ Instant</span>}>

      <ConfigCard />

      {/* today */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Quizzes today" value={d.today.quizzes} prev={d.yesterday.quizzes} prevLabel="yesterday" />
        <StatCard label="Revenue today" value={d.today.revenue} prev={d.yesterday.revenue} prevLabel="yesterday" money />
        <StatCard label="Quizzes this week" value={d.this_week.quizzes} prev={d.last_week.quizzes} prevLabel="last week" />
        <StatCard label="Revenue this week" value={d.this_week.revenue} prev={d.last_week.revenue} prevLabel="last week" money />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-4">
        <StatCard label="Completed today" value={d.today.completed} />
        <StatCard label="In progress" value={d.today.in_progress} />
        <StatCard label="All-time quizzes" value={d.totals.quizzes} />
        <StatCard label="All-time revenue" value={d.totals.revenue} money />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[2fr_1fr]">
        <Trend rows={d.trend} />
        <div className="rounded-2xl border border-line bg-white p-4">
          <div className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted">Status (last 30 days)</div>
          {d.status.length === 0 ? <p className="text-sm text-muted">No instant quizzes yet.</p> : (
            <div className="space-y-2">
              {d.status.map((s) => (
                <div key={s.status} className="flex items-center justify-between rounded-lg bg-line/30 px-3 py-1.5 text-sm">
                  <span className="font-semibold text-ink">{STATUS_LABEL[s.status] || s.status}</span>
                  <span className="font-bold text-muted">{s.n}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* recent */}
      <h3 className="mb-2 mt-6 text-xs font-bold uppercase tracking-wider text-muted">Recent instant quizzes</h3>
      <div className="rounded-2xl border border-line bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead><tr className="bg-line/30 text-left text-[11px] uppercase tracking-wider text-muted">
              {['Child', 'Parent', 'Mobile', 'Status', 'Score', 'When'].map((h) => <th key={h} className="px-3 py-2 whitespace-nowrap">{h}</th>)}
            </tr></thead>
            <tbody>
              {d.recent.map((r, i) => (
                <tr key={i} className="border-t border-line/60">
                  <td className="px-3 py-2 font-semibold text-ink whitespace-nowrap">{r.student_name}</td>
                  <td className="px-3 py-2 text-muted whitespace-nowrap">{r.parent_name || '—'}</td>
                  <td className="px-3 py-2 text-muted whitespace-nowrap">{r.mobile}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{STATUS_LABEL[r.status] || r.status}</td>
                  <td className="px-3 py-2 whitespace-nowrap font-semibold">{r.score_total ? `${r.score_correct}/${r.score_total} (${r.score_pct}%)` : '—'}</td>
                  <td className="px-3 py-2 text-muted whitespace-nowrap">{r.at}</td>
                </tr>
              ))}
              {d.recent.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-muted">No instant quizzes yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </Page>
  );
}
