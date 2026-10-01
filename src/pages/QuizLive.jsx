import { useEffect, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { api } from '../lib/api';
import { useAutoRefresh } from '../lib/useAutoRefresh';
import { chartsAnimate } from '../lib/motion.jsx';
import { Page, Loading, ErrorBox, Empty, Pill } from '../components/ui.jsx';
import Gauge, { StatTile } from '../components/Gauge.jsx';

/**
 * src/pages/QuizLive.jsx
 * ---------------------------------------------------------------------------
 * Tonight's quiz as it happens — the Live Quiz Monitor.
 *
 * Everything here is read-only at the database level: the server runs each
 * query inside a READ ONLY transaction with a two-second timeout, so watching
 * this screen cannot slow down or disturb a child mid-quiz. A query that is
 * too slow is killed and its panel shows nothing, which is the right trade.
 *
 * FORM FOLLOWS THE QUESTION. Bounded percentages get dials. Counts get tiles,
 * because a count has no ceiling and a dial would invent one. The minute
 * series is a line because it is change over time, and the slot funnel is
 * plain bars in one colour — the stages are labelled, so colour would only be
 * decoration.
 */

/* The one validated pair for the two series: CVD ΔE 12.5 (protan), 29.2
   normal — checked with the palette validator, not chosen by eye. */
const C_ANSWERS = '#0d9488';
const C_CORRECT = '#f97316';
const C_BAR = '#0d9488';

const nf = (n) => (n === null || n === undefined ? '—' : Number(n).toLocaleString('en-IN'));

const STATUS_TONE = {
  answering: 'green',
  completed: 'blue',
  stalled: 'amber',
  'waiting for first answer': 'grey',
  'not sent': 'red',
};

/* ── who is mid-quiz, right now ───────────────────────────────────────────── */
function LiveTable({ rows, onPick, picked }) {
  if (!rows?.length) return <Empty>No quizzes have been built for today yet.</Empty>;
  return (
    <div className="card overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            <th className="th">Child</th>
            <th className="th">Grade</th>
            <th className="th">Progress</th>
            <th className="th text-right">Correct</th>
            <th className="th text-right">Avg time</th>
            <th className="th">Started</th>
            <th className="th">Last answer</th>
            <th className="th">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.tracker_id}
              onClick={() => onPick(r)}
              className={`cursor-pointer hover:bg-line/30 ${picked === r.tracker_id ? 'bg-brand-accent/5' : ''}`}
            >
              <td className="td">
                <div className="font-semibold">{r.student_name}</div>
                <div className="text-[11px] text-muted tabular-nums">{r.mobile}</div>
              </td>
              <td className="td text-[11px] text-muted">
                {r.grade_name}{r.subject_code ? ` · ${r.subject_code}` : ''}
                {r.slot > 1 ? ` · slot ${r.slot}` : ''}
              </td>
              <td className="td w-44">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-line/60 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${r.progress_pct || 0}%`,
                        background: C_BAR,
                        transition: chartsAnimate() ? 'width .4s ease-out' : undefined,
                      }}
                    />
                  </div>
                  <span className="text-xs font-bold tabular-nums w-12 text-right">
                    {r.answered}/{r.total_questions}
                  </span>
                </div>
              </td>
              <td className="td text-right tabular-nums">{r.correct}</td>
              <td className="td text-right tabular-nums">
                {r.avg_response_seconds ? `${r.avg_response_seconds}s` : '—'}
              </td>
              <td className="td text-muted tabular-nums">{r.started_at || '—'}</td>
              <td className="td text-muted tabular-nums">{r.last_activity || '—'}</td>
              <td className="td"><Pill tone={STATUS_TONE[r.status] || 'grey'}>{r.status}</Pill></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── one child's quiz, question by question ───────────────────────────────── */
function Timeline({ child, rows, onClose }) {
  return (
    <div className="card p-5 mb-6 border-l-4 border-l-brand-accent">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h2 className="text-sm font-bold text-ink">{child.student_name}</h2>
          <p className="text-[11px] text-muted">
            {child.grade_name} · {child.answered} of {child.total_questions} answered · {child.status}
          </p>
        </div>
        <button onClick={onClose} className="btn-sec text-xs py-1.5 px-3">Close</button>
      </div>

      {!rows ? <Loading label="Reading the quiz…" /> : !rows.length ? (
        <Empty>Nothing recorded for this quiz yet.</Empty>
      ) : (
        <ol className="grid gap-2">
          {rows.map((q) => {
            const live = q.status === 'waiting';
            return (
              <li
                key={q.n}
                className={`rounded-xl border p-3 ${live ? 'border-brand-accent bg-brand-accent/5' : 'border-line/70'}`}
              >
                <div className="flex items-baseline gap-2">
                  <span className="text-[11px] font-bold text-muted w-6">Q{q.n}</span>
                  <span className="text-sm flex-1 leading-snug">
                    {q.question_text || <span className="text-muted">(no text)</span>}
                  </span>
                  {q.status === 'answered' ? (
                    <Pill tone={q.is_correct ? 'green' : 'red'}>
                      {q.answered_option} {q.is_correct ? 'correct' : `— key ${q.correct_option}`}
                    </Pill>
                  ) : <Pill tone={live ? 'amber' : 'grey'}>{q.status}</Pill>}
                </div>
                <div className="text-[11px] text-muted mt-1 pl-8 tabular-nums">
                  {q.sent_at && `sent ${q.sent_at}`}
                  {q.answered_at && ` · answered ${q.answered_at}`}
                  {q.response_seconds !== null && q.response_seconds !== undefined && ` · ${q.response_seconds}s`}
                  {q.chapter ? ` · ${q.chapter}` : ''}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

/* ── the slot funnel: one quantity falling through four stages ────────────── */
function SlotFunnel({ rows }) {
  if (!rows?.length) return <Empty>No quizzes have been built for today yet.</Empty>;
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((s) => {
        const stages = [['Built', s.built], ['Sent', s.sent], ['Started', s.started], ['Completed', s.completed]];
        const top = Math.max(1, ...stages.map(([, v]) => Number(v) || 0));
        return (
          <div key={s.slot} className="card p-4">
            <div className="flex items-baseline justify-between mb-3">
              <div className="text-sm font-bold text-ink">Slot {s.slot}</div>
              <div className="text-[11px] text-muted">
                {s.built ? `${Math.round((s.completed / s.built) * 100)}% finished` : '—'}
              </div>
            </div>
            <div className="grid gap-2">
              {stages.map(([name, v]) => (
                <div key={name} className="flex items-center gap-2">
                  <div className="w-20 shrink-0 text-[11px] font-semibold text-muted">{name}</div>
                  <div className="flex-1 h-5 rounded-md bg-line/50 overflow-hidden">
                    <div
                      className="h-full rounded-md"
                      style={{
                        width: `${((Number(v) || 0) / top) * 100}%`,
                        background: C_BAR,
                        transition: chartsAnimate() ? 'width .5s cubic-bezier(.22,.9,.28,1)' : undefined,
                      }}
                    />
                  </div>
                  <div className="w-10 text-right text-sm font-bold text-ink tabular-nums">{nf(v)}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── answers per minute ───────────────────────────────────────────────────── */
function MinuteChart({ rows }) {
  const total = rows.reduce((n, r) => n + Number(r.answers), 0);
  if (!total) return <Empty>No answers in the last two hours.</Empty>;
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="#e3eae8" strokeDasharray="2 4" vertical={false} />
          <XAxis dataKey="at" tick={{ fontSize: 11, fill: '#667781' }}
                 tickLine={false} axisLine={{ stroke: '#e3eae8' }} minTickGap={48} />
          <YAxis tick={{ fontSize: 11, fill: '#667781' }} tickLine={false} axisLine={false}
                 allowDecimals={false} width={38} />
          <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e3eae8', fontSize: 12 }}
                   labelStyle={{ fontWeight: 700, color: '#111b21' }} />
          <Legend wrapperStyle={{ fontSize: 12 }} iconType="plainline" />
          <Line type="monotone" dataKey="answers" name="Answers" stroke={C_ANSWERS}
                strokeWidth={2} dot={false} isAnimationActive={chartsAnimate()} />
          <Line type="monotone" dataKey="correct" name="Correct" stroke={C_CORRECT}
                strokeWidth={2} dot={false} isAnimationActive={chartsAnimate()} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function QuizLive() {
  const [pulse, setPulse] = useState(null);
  const [series, setSeries] = useState(null);
  const [slots, setSlots] = useState(null);
  const [flight, setFlight] = useState(null);
  const [picked, setPicked] = useState(null);     // the child whose timeline is open
  const [timeline, setTimeline] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    setError('');
    return Promise.all([api.quizPulse(), api.quizSeries(120), api.quizSlots(), api.quizInFlight()])
      .then(([p, s, f, l]) => { setPulse(p.pulse); setSeries(s.rows); setSlots(f.rows); setFlight(l.rows); })
      .catch((e) => setError(e.message));
  };

  useEffect(() => { load(); }, []);
  useAutoRefresh(load, 10000);

  // The open timeline follows the same pace as everything else.
  useEffect(() => {
    if (!picked) { setTimeline(null); return; }
    api.quizTimeline(picked.tracker_id).then((d) => setTimeline(d.rows)).catch(() => setTimeline([]));
  }, [picked, flight]);

  if (error) return <ErrorBox error={error} onRetry={load} />;
  if (!pulse && !flight) return <Loading label="Reading tonight's quiz…" />;

  const p = pulse || {};

  return (
    <Page title="Quiz pulse" subtitle="Tonight, as it happens — read-only, and it cannot slow a quiz down">
      <div className="card p-5 mb-5">
        <div className="flex flex-wrap justify-around gap-6">
          <Gauge value={p.completion_pct} label="Completed"
                 sub={`${nf(p.completed)} of ${nf(p.quizzes_today)}`}
                 thresholds={{ good: 60, warning: 30 }} />
          <Gauge value={p.accuracy_pct} label="Accuracy"
                 sub={`${nf(p.questions_correct)} of ${nf(p.questions_answered)}`}
                 thresholds={{ good: 65, warning: 45 }} />
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
        <StatTile label="In progress" value={p.in_progress} sub="answered in the last 30 min" />
        <StatTile label="Stalled" value={p.stalled} sub="no answer for over 30 min"
                  tone={Number(p.stalled) > 0 ? 'warn' : 'ink'} />
        <StatTile label="Answers" value={p.questions_answered} sub={`${nf(p.questions_sent)} questions sent`} />
        <StatTile label="Avg response" value={p.avg_response_seconds} sub="seconds per question" />
      </div>

      {picked && <Timeline child={picked} rows={timeline} onClose={() => setPicked(null)} />}

      <section className="mb-6">
        <h2 className="text-sm font-bold text-ink mb-1">Who is taking a quiz right now</h2>
        <p className="text-[11px] text-muted mb-3">Tap a row to see that child&apos;s quiz question by question.</p>
        <LiveTable rows={flight} onPick={setPicked} picked={picked?.tracker_id} />
      </section>

      <section className="card p-5 mb-6">
        <h2 className="text-sm font-bold text-ink mb-1">Answers per minute</h2>
        <p className="text-[11px] text-muted mb-3">The last two hours. Correct answers are the second line.</p>
        <MinuteChart rows={series || []} />
      </section>

      <section>
        <h2 className="text-sm font-bold text-ink mb-1">Where each slot stands</h2>
        <p className="text-[11px] text-muted mb-3">Built → sent → started → completed, for every quiz slot today.</p>
        <SlotFunnel rows={slots} />
      </section>
    </Page>
  );
}
