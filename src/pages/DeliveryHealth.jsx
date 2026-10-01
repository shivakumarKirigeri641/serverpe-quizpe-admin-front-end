import { useEffect, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { api } from '../lib/api';
import { useAutoRefresh } from '../lib/useAutoRefresh';
import { chartsAnimate } from '../lib/motion.jsx';
import { Page, Loading, ErrorBox, Empty, Pill } from '../components/ui.jsx';
import Gauge, { StatTile } from '../components/Gauge.jsx';

/**
 * src/pages/DeliveryHealth.jsx
 * ---------------------------------------------------------------------------
 * Whether WhatsApp is landing — and which numbers are quietly costing us the
 * account's quality rating.
 *
 * The screen exists because of one measurement: 132 of 394 template sends
 * failed in a week, every one "Message undeliverable", across 55 distinct
 * numbers — 40% of everyone contacted. Those sends never become conversations,
 * so they count for nothing toward the messaging limit, while their failures
 * drag down the quality rating that governs it. Nothing showed them, so they
 * kept being sent to.
 *
 * The two tables at the bottom are the point of the page. Everything above
 * them is context.
 */

/* Validated pair: teal ΔE 13.1 from red under deuteranopia, 31.4 normal, both
   above 3:1 on white. Plain green would have failed — teal is what passes. */
const C_DELIVERED = '#0d9488';
const C_FAILED = '#dc2626';

const nf = (n) => (n === null || n === undefined ? '—' : Number(n).toLocaleString('en-IN'));

function Table({ head, rows, render, empty }) {
  if (!rows?.length) return <Empty>{empty}</Empty>;
  return (
    <div className="card overflow-x-auto">
      <table className="w-full">
        <thead><tr>{head.map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
        <tbody>{rows.map(render)}</tbody>
      </table>
    </div>
  );
}

export default function DeliveryHealth() {
  const [days, setDays] = useState(14);
  const [d, setD] = useState({});
  const [error, setError] = useState('');

  const load = () => {
    setError('');
    return Promise.all([
      api.deliverySummary(days),
      api.deliveryDaily(days),
      api.deliveryUndeliverable(),
      api.deliveryUnanswered(),
    ])
      .then(([s, day, dead, quiet]) => setD({
        summary: s.summary, daily: day.rows, dead: dead.rows, quiet: quiet.rows,
      }))
      .catch((e) => setError(e.message));
  };

  useEffect(() => { load(); }, [days]);
  useAutoRefresh(load, 60000);

  if (error) return <ErrorBox error={error} onRetry={load} />;
  if (!d.summary && !d.daily) return <Loading label="Reading delivery history…" />;

  const s = d.summary || {};

  return (
    <Page
      title="Delivery health"
      subtitle="Whether messages land — and which numbers are hurting the account"
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
      <div className="card p-5 mb-5">
        <div className="flex flex-wrap justify-around gap-6">
          <Gauge value={s.delivery_pct} label="Delivered"
                 sub={`${nf(s.delivered)} of ${nf(s.sent)} sent`}
                 thresholds={{ good: 85, warning: 65 }} />
          <Gauge value={s.reply_pct} label="Replied"
                 sub={`${nf(s.replied_numbers)} of ${nf(s.numbers)} people`}
                 thresholds={{ good: 25, warning: 10 }} />
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
        <StatTile label="Messages sent" value={s.sent} sub={`to ${nf(s.numbers)} numbers`} />
        <StatTile label="Failed" value={s.failed} sub={`${s.failure_pct ?? '—'}% of sends`}
                  tone={Number(s.failed) > 0 ? 'warn' : 'ink'} />
        <StatTile label="Dead numbers" value={s.dead_numbers} sub="cannot receive at all"
                  tone={Number(s.dead_numbers) > 0 ? 'bad' : 'ink'} />
        <StatTile label="Read" value={s.read} sub="messages opened" />
      </div>

      <section className="card p-5 mb-6">
        <h2 className="text-sm font-bold text-ink mb-1">Delivered and failed, by day</h2>
        <p className="text-[11px] text-muted mb-3">
          Failures are not neutral — they lower the quality rating that decides your messaging limit.
        </p>
        {!d.daily?.some((r) => r.sent) ? (
          <Empty>Nothing sent in this period.</Empty>
        ) : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.daily} margin={{ top: 8, right: 12, bottom: 0, left: -20 }}>
                <CartesianGrid stroke="#e3eae8" strokeDasharray="2 4" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#667781' }}
                       tickLine={false} axisLine={{ stroke: '#e3eae8' }} minTickGap={24} />
                <YAxis tick={{ fontSize: 11, fill: '#667781' }} tickLine={false}
                       axisLine={false} allowDecimals={false} width={38} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e3eae8', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="delivered" name="Delivered" stackId="a" fill={C_DELIVERED}
                     isAnimationActive={chartsAnimate()} />
                <Bar dataKey="failed" name="Failed" stackId="a" fill={C_FAILED}
                     radius={[4, 4, 0, 0]} isAnimationActive={chartsAnimate()} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="mb-6">
        <h2 className="text-sm font-bold text-ink mb-1">Dead numbers — stop sending to these</h2>
        <p className="text-[11px] text-muted mb-3">
          Every send returns “Message undeliverable”. They never become conversations, so they
          earn nothing toward your messaging limit and cost you quality.
        </p>
        <Table
          head={['Mobile', 'Name', 'Failures', 'First seen', 'Last tried', '']}
          rows={d.dead}
          empty="No undeliverable numbers. Good."
          render={(r) => (
            <tr key={r.mobile} className="hover:bg-line/20">
              <td className="td font-semibold tabular-nums">{r.mobile}</td>
              <td className="td">{r.parent_name || <span className="text-muted">—</span>}</td>
              <td className="td tabular-nums">{r.failures}</td>
              <td className="td text-muted">{r.first_try}</td>
              <td className="td text-muted">{r.last_try}</td>
              <td className="td">
                {r.ever_replied
                  ? <Pill tone="amber">Replied once — check the number</Pill>
                  : <Pill tone="red">Never reachable</Pill>}
              </td>
            </tr>
          )}
        />
      </section>

      <section>
        <h2 className="text-sm font-bold text-ink mb-1">Broadcast at, never replied</h2>
        <p className="text-[11px] text-muted mb-3">
          Meta caps marketing per recipient, not per sender — a delay between sends cannot fix it.
          The only remedy is to stop sending to people who never answer.
        </p>
        <Table
          head={['Mobile', 'Name', 'Broadcasts', 'Last sent']}
          rows={d.quiet}
          empty="Nobody is being broadcast at without replying."
          render={(r) => (
            <tr key={r.mobile} className="hover:bg-line/20">
              <td className="td font-semibold tabular-nums">{r.mobile}</td>
              <td className="td">{r.parent_name || <span className="text-muted">—</span>}</td>
              <td className="td tabular-nums font-bold">{r.sends}</td>
              <td className="td text-muted">{r.last_send}</td>
            </tr>
          )}
        />
      </section>
    </Page>
  );
}
