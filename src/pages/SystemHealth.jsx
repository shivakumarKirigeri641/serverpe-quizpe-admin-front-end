import { useEffect, useState } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { api } from '../lib/api';
import { useAutoRefresh } from '../lib/useAutoRefresh';
import { chartsAnimate } from '../lib/motion.jsx';
import { Page, Loading, ErrorBox, Empty, Pill } from '../components/ui.jsx';
import { StatTile } from '../components/Gauge.jsx';

/**
 * src/pages/SystemHealth.jsx
 * ---------------------------------------------------------------------------
 * Did the background jobs run, what is stuck, and what has been failing.
 *
 * Built from job_queue and job_queue_archive, which have always held this and
 * which the panel had never read — so until now a failed job was something you
 * found out about by noticing a quiz had not arrived.
 *
 * WhatsApp is gone (2026-10-10): its failed-sends tile and the webhook pulse chart
 * (inbound WhatsApp messages per day) are no longer shown.
 */

const C_WEBHOOK = '#0d9488';

const VERDICT = {
  healthy: { tone: 'green', word: 'Healthy' },
  warning: { tone: 'amber', word: 'Worth a look' },
  critical: { tone: 'red', word: 'Needs attention' },
};

const ago = (secs) => {
  const s = Number(secs);
  if (!Number.isFinite(s)) return '—';
  if (s < 90) return `${Math.round(s)}s ago`;
  if (s < 5400) return `${Math.round(s / 60)} min ago`;
  if (s < 172800) return `${Math.round(s / 3600)} hours ago`;
  return `${Math.round(s / 86400)} days ago`;
};

export default function SystemHealth() {
  const [d, setD] = useState({});
  const [days, setDays] = useState(7);
  const [error, setError] = useState('');

  const load = () => {
    setError('');
    return Promise.all([
      api.opsHealth(), api.opsJobs(30), api.opsStuck(), api.opsErrors(days), api.opsWebhook(days),
    ])
      .then(([h, j, s, e, w]) => setD({
        health: h.health, jobs: j.rows, stuck: s.rows, errors: e.rows, webhook: w.rows,
      }))
      .catch((err) => setError(err.message));
  };

  useEffect(() => { load(); }, [days]);
  useAutoRefresh(load, 30000);

  if (error) return <ErrorBox error={error} onRetry={load} />;
  if (!d.health && !d.jobs) return <Loading label="Reading system health…" />;

  const h = d.health || {};
  const v = VERDICT[h.verdict] || VERDICT.warning;

  return (
    <Page
      title="System health"
      subtitle="Background jobs, what is stuck, and what has been failing"
      actions={
        <div className="flex gap-1">
          {[7, 14, 30].map((n) => (
            <button
              key={n} onClick={() => setDays(n)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                days === n ? 'bg-brand-accent text-white' : 'bg-white border border-line text-muted hover:bg-line/40'}`}
            >{n} days</button>
          ))}
        </div>
      }
    >
      {/* the verdict is a word first, a colour second */}
      <div className="card p-4 mb-5 flex flex-wrap items-center gap-3">
        <Pill tone={v.tone}>{v.word}</Pill>
        <span className="text-[11px] text-muted">
          last job finished {ago(h.seconds_since_job)} · last family on the app {ago(h.seconds_since_app)}
          {Number(h.failed_sends_24h) ? ` · ${h.failed_sends_24h} reminder(s) not reached in 24 hours` : ''}
        </span>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 mb-6">
        <StatTile label="Failed jobs" value={h.failed_jobs}
                  sub="waiting in the queue" tone={Number(h.failed_jobs) > 0 ? 'bad' : 'ink'} />
        <StatTile label="Stuck jobs" value={h.stuck_jobs}
                  sub="locked over 15 min" tone={Number(h.stuck_jobs) > 0 ? 'bad' : 'ink'} />
        <StatTile label="Queued" value={h.queued_jobs} sub="waiting to run" />
      </div>

      {d.stuck?.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-bold text-ink mb-1">Stuck right now</h2>
          <p className="text-[11px] text-muted mb-3">
            A job locked by a worker that never released it, or one past its due time still
            waiting. From outside both look the same: nothing happened.
          </p>
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">Job</th><th className="th">Why</th>
                  <th className="th text-right">Waiting</th><th className="th">Since</th>
                  <th className="th">Last error</th>
                </tr>
              </thead>
              <tbody>
                {d.stuck.map((r) => (
                  <tr key={r.id} className="hover:bg-line/20">
                    <td className="td">
                      <div className="font-semibold">{r.kind}</div>
                      <div className="text-[11px] text-muted">
                        #{r.id} · attempt {r.attempts}/{r.max_attempts}
                        {r.locked_by ? ` · ${r.locked_by}` : ''}
                      </div>
                    </td>
                    <td className="td"><Pill tone="amber">{r.why}</Pill></td>
                    <td className="td text-right tabular-nums">{ago(r.waiting_seconds)}</td>
                    <td className="td text-muted tabular-nums">{r.locked_at || r.due_at}</td>
                    <td className="td text-[11px] text-muted max-w-[280px]">{r.last_error || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="mb-6">
        <h2 className="text-sm font-bold text-ink mb-1">Errors, grouped by what they are</h2>
        <p className="text-[11px] text-muted mb-3">
          Numbers and ids are collapsed, so one fault seen a hundred times is one row —
          not a hundred rows of the same thing.
        </p>
        {!d.errors?.length ? <Empty>No errors in this period. Good.</Empty> : (
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th text-right">Times</th><th className="th">Error</th>
                  <th className="th">Where</th><th className="th">First</th><th className="th">Last</th>
                </tr>
              </thead>
              <tbody>
                {d.errors.map((e, i) => (
                  <tr key={`${e.source}-${i}`} className="hover:bg-line/20">
                    <td className="td text-right tabular-nums font-bold">{e.occurrences}</td>
                    <td className="td max-w-[420px]">
                      <div className="text-sm leading-snug">{e.example}</div>
                      <div className="text-[11px] text-muted">{e.source}</div>
                    </td>
                    <td className="td text-[11px] text-muted">
                      {(e.where_seen || []).join(', ')}
                      {e.contexts > 4 ? ` +${e.contexts - 4} more` : ''}
                    </td>
                    <td className="td text-[11px] text-muted whitespace-nowrap">{e.first_seen}</td>
                    <td className="td text-[11px] text-muted whitespace-nowrap">{e.last_seen}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>


      <section>
        <h2 className="text-sm font-bold text-ink mb-1">Jobs, last 30 days</h2>
        <p className="text-[11px] text-muted mb-3">Most-failed first.</p>
        {!d.jobs?.length ? <Empty>No jobs have run in this period.</Empty> : (
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">Job</th><th className="th text-right">Run</th>
                  <th className="th text-right">Done</th><th className="th text-right">Failed</th>
                  <th className="th text-right">Waiting</th><th className="th text-right">Avg</th>
                  <th className="th">Last finished</th>
                </tr>
              </thead>
              <tbody>
                {d.jobs.map((j) => (
                  <tr key={j.kind} className="hover:bg-line/20">
                    <td className="td font-semibold">{j.kind}</td>
                    <td className="td text-right tabular-nums">{j.total}</td>
                    <td className="td text-right tabular-nums">{j.done}</td>
                    <td className="td text-right tabular-nums">
                      {j.failed > 0 ? <span className="font-bold text-red-600">{j.failed}</span> : j.failed}
                    </td>
                    <td className="td text-right tabular-nums">{j.queued + j.running}</td>
                    <td className="td text-right tabular-nums">{j.avg_seconds ? `${j.avg_seconds}s` : '—'}</td>
                    <td className="td text-[11px] text-muted whitespace-nowrap">
                      {j.last_finished || '—'}
                      <div>{ago(j.seconds_since_last)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </Page>
  );
}
