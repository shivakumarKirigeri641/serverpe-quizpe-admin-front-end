/**
 * Quick Quiz — analytics for the Instant Quiz (₹9 pay-per-quiz) plan.
 *
 * Separate from the subscription/GST revenue: counts, revenue, day-vs-day and
 * week-vs-week comparison with up/down deltas, a 14-day trend, status split and
 * a recent list. Refreshes every 15s so it doubles as a live board.
 */
import { useEffect, useState } from 'react';
import { api, download, viewPdf } from '../lib/api';
import { Page, Loading, ErrorBox } from '../components/ui.jsx';
import InvoiceActions from '../components/InvoiceActions.jsx';

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

/**
 * Live board: every quick quiz currently open, newest first. `nth` is the one
 * number that matters here — it says this is that child's 1st or 6th purchase,
 * which is what tells you whether pay-per-quiz repeats.
 */
function LivePanel({ rows }) {
  const mins = (s) => (s < 60 ? 'just now' : s < 3600 ? `${Math.floor(s / 60)}m ago` : `${Math.floor(s / 3600)}h ago`);
  const ord = (n) => {
    const v = Number(n) || 0, t = v % 100;
    if (t >= 11 && t <= 13) return `${v}th`;
    return `${v}${({ 1: 'st', 2: 'nd', 3: 'rd' })[v % 10] || 'th'}`;
  };
  return (
    <div className="mt-4 rounded-2xl border-2 border-violet-200 bg-violet-50/40 p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-violet-600" />
        </span>
        <span className="text-[11px] font-bold uppercase tracking-wider text-violet-800">
          Taking a quick quiz now ({rows.length})
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">Nobody is on a quick quiz right now.</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <div key={r.tracker_id} className="rounded-xl border border-violet-200 bg-white p-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-bold text-ink">{r.student_name}</span>
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-bold text-violet-700">
                  {ord(r.nth)} quiz
                </span>
              </div>
              <div className="mt-0.5 text-xs text-muted">
                {r.parent_name || '—'} · {r.mobile}
              </div>
              <div className="mt-0.5 text-xs text-muted">
                {r.board_code} · {r.grade_name} · started {mins(r.age_seconds)}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line/50">
                  <div className="h-full rounded-full bg-violet-500"
                       style={{ width: `${Math.round((r.answered / (r.question_count || 12)) * 100)}%` }} />
                </div>
                <span className="text-[11px] font-bold tabular-nums text-muted">
                  {r.answered}/{r.question_count || 12}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** When quick quizzes are bought, by hour of day — drives nudge timing. */
function HourChart({ rows }) {
  const byHour = Array.from({ length: 24 }, (_, h) => {
    const hit = rows.find((r) => Number(r.hour_of_day) === h);
    return { h, n: hit ? hit.n : 0 };
  });
  const max = Math.max(1, ...byHour.map((b) => b.n));
  const lbl = (h) => (h === 0 ? '12a' : h === 12 ? '12p' : h < 12 ? `${h}a` : `${h - 12}p`);
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <div className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted">Purchases by hour</div>
      <div className="flex h-28 items-end gap-[3px]">
        {byHour.map((b) => (
          <div key={b.h} className="group relative flex-1" title={`${lbl(b.h)} — ${b.n}`}>
            <div className="w-full rounded-t bg-violet-400 transition-colors group-hover:bg-violet-600"
                 style={{ height: `${Math.max(2, (b.n / max) * 100)}%` }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted">
        <span>12a</span><span>6a</span><span>12p</span><span>6p</span><span>11p</span>
      </div>
    </div>
  );
}

/** A simple ranked key/value card. */
function ListCard({ title, rows, empty }) {
  const max = Math.max(1, ...rows.map((r) => r.v));
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <div className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted">{title}</div>
      {rows.length === 0 ? <p className="text-sm text-muted">{empty}</p> : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.k}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-semibold text-ink">{r.k}</span>
                <span className="font-bold tabular-nums text-muted">{r.v}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line/40">
                <div className="h-full rounded-full bg-violet-400" style={{ width: `${(r.v / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Open / download the PDF report a parent received for one quiz. */
function ReportActions({ reportId }) {
  if (!reportId) return <span className="text-xs text-muted">—</span>;
  return (
    <span className="whitespace-nowrap">
      <button onClick={() => viewPdf(api.reportViewUrl(reportId))}
              className="text-brand-accent hover:underline text-xs font-semibold mr-3">View</button>
      <button onClick={() => download(api.reportDownloadUrl(reportId), `QuizPe-Report-${reportId}.pdf`)}
              className="text-brand hover:underline text-xs font-semibold">⬇ PDF</button>
    </span>
  );
}

/** A child's score history as a small bar run — oldest to newest, left to right. */
function ScoreTrend({ rows }) {
  const pts = rows.filter((r) => r.score_pct != null).slice().reverse();
  if (!pts.length) return <p className="text-sm text-muted">No completed quizzes yet.</p>;
  return (
    <div>
      <div className="flex h-24 items-end gap-1.5">
        {pts.map((r, i) => (
          <div key={i} className="group relative flex-1" title={`${r.started_at} — ${r.score_pct}%`}>
            <div className={`w-full rounded-t ${r.score_pct >= 70 ? 'bg-emerald-400' : r.score_pct >= 40 ? 'bg-amber-400' : 'bg-red-400'}`}
                 style={{ height: `${Math.max(4, r.score_pct)}%` }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted">
        <span>{pts[0]?.started_at}</span><span>{pts[pts.length - 1]?.started_at}</span>
      </div>
    </div>
  );
}

/** Drill-down: one child's complete instant-quiz history. */
function ChildPanel({ studentId, onClose }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    setD(null);
    api.quickQuizStudent(studentId).then(setD).catch((e) => setErr(e.message));
  }, [studentId]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto"
         onClick={onClose}>
      <div className="mt-10 w-full max-w-3xl rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        {err && <ErrorBox error={err} onRetry={onClose} />}
        {!d && !err && <Loading label="Loading history…" />}
        {d && (
          <>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-extrabold text-ink">{d.student.student_name}</h3>
                <p className="text-xs text-muted">
                  {d.student.board_code} · {d.student.grade_name} · {d.student.medium_code}
                  {d.student.school_name ? ` · ${d.student.school_name}` : ''}
                </p>
                <p className="text-xs text-muted">{d.student.parent_name} · {d.student.mobile}</p>
              </div>
              <button onClick={onClose} className="rounded-lg px-2 py-1 text-sm font-bold text-muted hover:bg-line/40">✕</button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {[['Quizzes', d.totals.quizzes], ['Completed', d.totals.completed],
                ['Avg score', `${d.totals.avg_score}%`], ['Best', `${d.totals.best_score}%`],
                ['Spent', `₹${Number(d.totals.spent || 0).toFixed(2)}`]].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-line/30 p-2.5 text-center">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted">{k}</div>
                  <div className="text-lg font-extrabold text-ink">{v}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-line p-3">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted">Score over time</div>
              <ScoreTrend rows={d.quizzes} />
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead><tr className="bg-line/30 text-left text-[11px] uppercase tracking-wider text-muted">
                  {['#', 'Started', 'Status', 'Answered', 'Score', 'Took', 'Report'].map((h) => (
                    <th key={h} className="px-2 py-2 whitespace-nowrap">{h}</th>))}
                </tr></thead>
                <tbody>
                  {d.quizzes.map((r, i) => (
                    <tr key={r.tracker_id} className="border-t border-line/60">
                      <td className="px-2 py-2 tabular-nums text-muted">{d.quizzes.length - i}</td>
                      <td className="px-2 py-2 whitespace-nowrap">{r.started_at}</td>
                      <td className="px-2 py-2 whitespace-nowrap">{STATUS_LABEL[r.status] || r.status}</td>
                      <td className="px-2 py-2 tabular-nums">{r.answered}/{r.question_count}</td>
                      <td className="px-2 py-2 tabular-nums font-bold">
                        {r.score_total ? `${r.score_correct}/${r.score_total} (${r.score_pct}%)` : '—'}
                      </td>
                      <td className="px-2 py-2 tabular-nums text-muted">
                        {r.status === 'completed' && r.seconds > 0
                          ? (r.seconds < 3600 ? `${Math.round(r.seconds / 60)}m` : `${(r.seconds / 3600).toFixed(1)}h`)
                          : '—'}
                      </td>
                      <td className="px-2 py-2"><ReportActions reportId={r.report_id} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function QuickQuiz() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  // The range drives every windowed block. Kept in the URL-free local state and
  // re-fetched on change, so the 15s live refresh always honours the filter.
  const [range, setRange] = useState('7d');
  const [child, setChild] = useState(null);   // drill-down: student_id

  const load = () => api.quickQuiz(range).then(setD).catch((e) => setErr(e.message));
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [range]);

  if (err) return <ErrorBox error={err} onRetry={load} />;
  if (!d) return <Loading label="Loading Quick Quiz…" />;

  return (
    <Page title="Quick Quiz" subtitle="Instant Quiz (₹9 pay-per-quiz) · refreshes every 15 seconds"
      actions={<span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-700">⚡ Instant</span>}>

      <ConfigCard />

      {/* LIVE — who is on a quick quiz right now, and which number it is for them */}
      <LivePanel rows={d.live || []} />

      {/* range filter — everything below the fixed today/week cards honours this */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Range</span>
        {(d.ranges || []).map((r) => (
          <button key={r.key} onClick={() => setRange(r.key)}
                  className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                    range === r.key ? 'bg-violet-600 text-white' : 'bg-line/40 text-muted hover:bg-line/70'}`}>
            {r.label}
          </button>
        ))}
      </div>

      {/* the selected window, against the same-length window before it */}
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={`Quizzes · ${d.range_label}`} value={d.rangeStats?.quizzes}
                  prev={d.rangeStats?.prev_quizzes} prevLabel="previous period" />
        <StatCard label={`Revenue · ${d.range_label}`} value={d.rangeStats?.revenue} money />
        <StatCard label="Completion rate" value={`${d.rangeStats?.completion_pct ?? 0}%`} />
        <StatCard label="Average score" value={`${d.rangeStats?.avg_score ?? 0}%`} />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Children who bought" value={d.repeat?.buyers} />
        <StatCard label="Repeat buyers" value={d.repeat?.repeat_buyers} />
        <StatCard label="Avg quizzes / child" value={d.repeat?.avg_per_child} />
        <StatCard label="Most by one child" value={d.repeat?.max_per_child} />
      </div>

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
          <div className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted">Status · {d.range_label}</div>
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
              {['Child', 'Parent', 'Mobile', 'Status', 'Score', 'When', 'Report'].map((h) => <th key={h} className="px-3 py-2 whitespace-nowrap">{h}</th>)}
            </tr></thead>
            <tbody>
              {d.recent.map((r, i) => (
                <tr key={i} className="border-t border-line/60">
                  <td className="px-3 py-2 whitespace-nowrap">
                    <button onClick={() => setChild(r.student_id)}
                            className="font-semibold text-ink hover:text-brand hover:underline">
                      {r.student_name}
                    </button>
                    <span className="ml-2 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-700">
                      #{r.nth}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-muted whitespace-nowrap">{r.parent_name || '—'}</td>
                  <td className="px-3 py-2 text-muted whitespace-nowrap">{r.mobile}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{STATUS_LABEL[r.status] || r.status}</td>
                  <td className="px-3 py-2 whitespace-nowrap font-semibold">{r.score_total ? `${r.score_correct}/${r.score_total} (${r.score_pct}%)` : '—'}</td>
                  <td className="px-3 py-2 text-muted whitespace-nowrap">{r.at}</td>
                  <td className="px-3 py-2"><ReportActions reportId={r.report_id} /></td>
                </tr>
              ))}
              {d.recent.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-muted">No instant quizzes yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* demand + timing + funnel */}
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <HourChart rows={d.byHour || []} />
        <ListCard title="Board / grade demand" rows={(d.byGrade || []).map((g) => ({
          k: `${g.board_code} · ${g.grade_name}`, v: g.n }))} empty="No quizzes in this range." />
        <div className="rounded-2xl border border-line bg-white p-4">
          <div className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted">Instant → plan funnel</div>
          <div className="text-3xl font-extrabold text-ink">
            {d.conversion?.now_subscribed ?? 0}
            <span className="text-base font-bold text-muted"> / {d.conversion?.instant_parents ?? 0}</span>
          </div>
          <p className="mt-1 text-xs text-muted">
            parents who bought a quick quiz in this range and now hold a paid plan
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-line/40">
            <div className="h-full rounded-full bg-violet-500"
                 style={{ width: `${d.conversion?.instant_parents
                   ? Math.round((d.conversion.now_subscribed / d.conversion.instant_parents) * 100) : 0}%` }} />
          </div>
        </div>
      </div>

      {/* who buys the most */}
      <h3 className="mb-2 mt-6 text-xs font-bold uppercase tracking-wider text-muted">Top families · {d.range_label}</h3>
      <div className="rounded-2xl border border-line bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead><tr className="bg-line/30 text-left text-[11px] uppercase tracking-wider text-muted">
              {['Child', 'Parent', 'Mobile', 'Quizzes', 'Avg score'].map((h) => (
                <th key={h} className="px-3 py-2 whitespace-nowrap">{h}</th>))}
            </tr></thead>
            <tbody>
              {(d.topBuyers || []).map((r, i) => (
                <tr key={i} className="border-t border-line/60">
                  <td className="px-3 py-2 font-semibold text-ink whitespace-nowrap">{r.student_name}</td>
                  <td className="px-3 py-2 text-muted whitespace-nowrap">{r.parent_name || '—'}</td>
                  <td className="px-3 py-2 text-muted whitespace-nowrap">{r.mobile}</td>
                  <td className="px-3 py-2 font-bold tabular-nums">{r.quizzes}</td>
                  <td className="px-3 py-2 tabular-nums">{r.avg_score ? `${r.avg_score}%` : '—'}</td>
                </tr>
              ))}
              {(!d.topBuyers || d.topBuyers.length === 0) && (
                <tr><td colSpan={5} className="px-3 py-8 text-center text-muted">No quizzes in this range.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Every child who has ever bought one — the index you drill into. */}
      <h3 className="mb-2 mt-6 text-xs font-bold uppercase tracking-wider text-muted">
        Children who take quick quizzes ({(d.children || []).length})
      </h3>
      <div className="rounded-2xl border border-line bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead><tr className="bg-line/30 text-left text-[11px] uppercase tracking-wider text-muted">
              {['Child', 'Class', 'Parent', 'Mobile', 'Quizzes', 'Done', 'Avg', 'Best', 'First', 'Last', ''].map((h) => (
                <th key={h} className="px-3 py-2 whitespace-nowrap">{h}</th>))}
            </tr></thead>
            <tbody>
              {(d.children || []).map((c) => (
                <tr key={c.student_id} className="border-t border-line/60 hover:bg-line/10">
                  <td className="px-3 py-2 font-semibold text-ink whitespace-nowrap">{c.student_name}</td>
                  <td className="px-3 py-2 text-muted whitespace-nowrap">{c.board_code} · {c.grade_name}</td>
                  <td className="px-3 py-2 text-muted whitespace-nowrap">{c.parent_name}</td>
                  <td className="px-3 py-2 text-muted whitespace-nowrap">{c.mobile}</td>
                  <td className="px-3 py-2 font-bold tabular-nums">{c.quizzes}</td>
                  <td className="px-3 py-2 tabular-nums text-muted">{c.completed}</td>
                  <td className="px-3 py-2 tabular-nums">{c.avg_score ? `${c.avg_score}%` : '—'}</td>
                  <td className="px-3 py-2 tabular-nums">{c.best_score ? `${c.best_score}%` : '—'}</td>
                  <td className="px-3 py-2 text-muted whitespace-nowrap">{c.first_at}</td>
                  <td className="px-3 py-2 text-muted whitespace-nowrap">{c.last_at}</td>
                  <td className="px-3 py-2">
                    <button onClick={() => setChild(c.student_id)}
                            className="text-xs font-semibold text-brand hover:underline whitespace-nowrap">
                      History →
                    </button>
                  </td>
                </tr>
              ))}
              {(!d.children || d.children.length === 0) && (
                <tr><td colSpan={11} className="px-3 py-8 text-center text-muted">No children yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {child && <ChildPanel studentId={child} onClose={() => setChild(null)} />}

      {/* Invoices. Listed separately from the quizzes above because the payment
          happens BEFORE the quiz exists, so there is no row that is both — and
          for GST these are the rows that matter. */}
      <h3 className="mb-2 mt-6 text-xs font-bold uppercase tracking-wider text-muted">Instant quiz invoices</h3>
      <div className="rounded-2xl border border-line bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead><tr className="bg-line/30 text-left text-[11px] uppercase tracking-wider text-muted">
              {['Invoice', 'Parent', 'Mobile', 'Base', 'GST', 'Total', 'When', 'PDF'].map((h) => (
                <th key={h} className="px-3 py-2 whitespace-nowrap">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {(d.invoices || []).map((v) => (
                <tr key={v.id} className="border-t border-line/60">
                  <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{v.invoice_id}</td>
                  <td className="px-3 py-2 text-muted whitespace-nowrap">{v.parent_name}</td>
                  <td className="px-3 py-2 text-muted whitespace-nowrap">{v.mobile}</td>
                  <td className="px-3 py-2 whitespace-nowrap tabular-nums">₹{Number(v.amount_base).toFixed(2)}</td>
                  <td className="px-3 py-2 whitespace-nowrap tabular-nums text-muted">
                    ₹{(Number(v.cgst) + Number(v.sgst) + Number(v.igst)).toFixed(2)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap font-bold tabular-nums">₹{Number(v.total).toFixed(2)}</td>
                  <td className="px-3 py-2 text-muted whitespace-nowrap">{v.at}</td>
                  <td className="px-3 py-2"><InvoiceActions id={v.id} invoiceId={v.invoice_id} /></td>
                </tr>
              ))}
              {(!d.invoices || d.invoices.length === 0) && (
                <tr><td colSpan={8} className="px-3 py-8 text-center text-muted">No instant quiz invoices yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Page>
  );
}
