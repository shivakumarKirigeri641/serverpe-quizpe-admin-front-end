import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ResponsiveContainer, ComposedChart, BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { api } from '../../lib/api';
import { useAutoRefresh } from '../../lib/useAutoRefresh';
import { chartsAnimate } from '../../lib/motion.jsx';
import { Page, Loading, ErrorBox } from '../../components/ui.jsx';
import { SERIES, ChartCard, Tip, Modal, Period, Tabs, inr, num, dayLabel, mask, dt } from '../../components/hq/kit.jsx';

/*
 * GRAPHS (admin revamp, 2026-10-05) — like GaadiPe's Graphs section, in
 * QuizPe's terms: seven pages, each chart readable as a table, live (every
 * minute), and a tap on a day opens who or what was behind that number.
 */
const PAGES = [
  ['overview', 'Overview'], ['funnel', 'Signup funnel'], ['money', 'Money'], ['families', 'Families'],
  ['quizzes', 'Quizzes'], ['whatsapp', 'WhatsApp'], ['services', 'Services'],
];
const DRILL = { overview: 'families', families: 'families', money: 'money', quizzes: 'quizzes', whatsapp: 'whatsapp' };
const DRILL_TITLE = { families: 'Families who joined', money: 'Payments', quizzes: 'Quizzes', whatsapp: 'Templates sent' };
const grid = <CartesianGrid strokeDasharray="3 3" stroke="#e3eae8" vertical={false} />;
const xAxis = <XAxis dataKey="d" tickFormatter={dayLabel} tick={{ fontSize: 11 }} minTickGap={16} />;

export default function Graphs() {
  const { page = 'overview' } = useParams();
  const go = useNavigate();
  const [days, setDays] = useState(30);
  const [d, setD] = useState(null);
  const [error, setError] = useState(null);
  const [drill, setDrill] = useState(null);
  const load = useCallback(() => api.hq.graph(page, days).then((x) => { setD(x); setError(null); }).catch(setError), [page, days]);
  useEffect(() => { setD(null); load(); }, [load]);
  useAutoRefresh(load, 60000);
  const anim = chartsAnimate();
  const open = (e) => {
    const day = e?.activeLabel || e?.activePayload?.[0]?.payload?.d;
    if (day && DRILL[page]) setDrill({ kind: DRILL[page], day });
  };

  return (
    <Page title="Graphs" subtitle="Live — refreshes every minute. Every chart has a Table view; tap a day to see who or what."
      actions={page !== 'funnel' && <Period value={days} onChange={setDays} />}>
      <Tabs tabs={PAGES} value={page} onChange={(p) => go(`/graphs/${p}`)} />
      {error && !d ? <ErrorBox error={error} onRetry={load} /> : !d ? <Loading /> : (
        <div className="grid gap-4">
          {page === 'overview' && (
            <>
              <ChartCard title="Families joining and quizzes finished" note="tap a day" rows={d.series}
                columns={[['d', 'Day', dayLabel], ['families', 'Families joined'], ['quizzes', 'Quizzes sent'], ['completed', 'Finished'], ['chats', 'Chats']]}>
                <ResponsiveContainer><ComposedChart data={d.series} onClick={open}>
                  {grid}{xAxis}<YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip content={<Tip />} /><Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="families" name="Families joined" fill={SERIES[0]} radius={[3, 3, 0, 0]} isAnimationActive={anim} />
                  <Line dataKey="completed" name="Quizzes finished" stroke={SERIES[2]} strokeWidth={2} dot={false} isAnimationActive={anim} />
                  <Line dataKey="chats" name="Chats" stroke={SERIES[1]} strokeWidth={2} dot={false} isAnimationActive={anim} />
                </ComposedChart></ResponsiveContainer>
              </ChartCard>
              <ChartCard title="Revenue by day" rows={d.series} columns={[['d', 'Day', dayLabel], ['revenue', 'Revenue', (v) => inr(v)]]}>
                <ResponsiveContainer><BarChart data={d.series}>
                  {grid}{xAxis}<YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v}`} /><Tooltip content={<Tip money={['revenue']} />} />
                  <Bar dataKey="revenue" name="Revenue" fill={SERIES[3]} radius={[3, 3, 0, 0]} isAnimationActive={anim} />
                </BarChart></ResponsiveContainer>
              </ChartCard>
            </>
          )}

          {page === 'funnel' && (
            <ChartCard title="From visiting quizpe.in to the first finished quiz" note="all time"
              rows={d.steps} columns={[['label', 'Step'], ['count', 'People', num], ['pct_of_top', '% of visitors', (v) => `${v}%`], ['drop_from_prev', 'Change from previous', (v) => (v == null ? '—' : `${v}%`)]]} height={Math.max(260, d.steps.length * 44)}>
              <ResponsiveContainer><BarChart data={d.steps} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e3eae8" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="label" width={210} tick={{ fontSize: 11 }} />
                <Tooltip content={<Tip />} />
                <Bar dataKey="count" name="People" fill={SERIES[0]} radius={[0, 3, 3, 0]} isAnimationActive={anim} />
              </BarChart></ResponsiveContainer>
            </ChartCard>
          )}

          {page === 'money' && (
            <>
              <ChartCard title="Paid by families, and the GST inside it" note="tap a day" rows={d.series}
                columns={[['d', 'Day', dayLabel], ['invoices', 'Invoices'], ['revenue', 'Paid', (v) => inr(v, 2)], ['taxable', 'Taxable', (v) => inr(v, 2)], ['gst', 'GST', (v) => inr(v, 2)]]}>
                <ResponsiveContainer><BarChart data={d.series} onClick={open}>
                  {grid}{xAxis}<YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v}`} /><Tooltip content={<Tip money={['taxable', 'gst']} />} /><Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="taxable" name="Taxable" stackId="m" fill={SERIES[0]} isAnimationActive={anim} />
                  <Bar dataKey="gst" name="GST" stackId="m" fill={SERIES[3]} radius={[3, 3, 0, 0]} isAnimationActive={anim} />
                </BarChart></ResponsiveContainer>
              </ChartCard>
              <ChartCard title="By plan" rows={d.by_plan} columns={[['plan', 'Plan'], ['invoices', 'Invoices'], ['revenue', 'Paid', (v) => inr(v)]]} height={220}>
                <ResponsiveContainer><BarChart data={d.by_plan}>
                  {grid}<XAxis dataKey="plan" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v}`} /><Tooltip content={<Tip money={['revenue']} />} />
                  <Bar dataKey="revenue" name="Paid" fill={SERIES[2]} radius={[3, 3, 0, 0]} isAnimationActive={anim} />
                </BarChart></ResponsiveContainer>
              </ChartCard>
              <p className="text-xs text-muted">Profit after Razorpay, WhatsApp, ads and fixed costs: <Link className="font-semibold text-brand-accent hover:underline" to="/profit">Profit &amp; loss →</Link></p>
            </>
          )}

          {page === 'families' && (
            <>
              <div className="grid gap-4 lg:grid-cols-2">
                <ChartCard title="Where families stand today" rows={Object.entries(d.standing).map(([k, v]) => ({ k, v }))}
                  columns={[['k', 'Standing', (k) => STANDING[k] || k], ['v', 'Families', num]]} height={240}>
                  <ResponsiveContainer><PieChart>
                    <Pie data={Object.entries(d.standing).map(([k, v]) => ({ name: STANDING[k] || k, value: v }))} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} isAnimationActive={anim}>
                      {Object.keys(d.standing).map((k, i) => <Cell key={k} fill={SERIES[i % SERIES.length]} />)}
                    </Pie>
                    <Tooltip content={<Tip />} /><Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart></ResponsiveContainer>
                </ChartCard>
                <ChartCard title="Families by state" rows={d.states} columns={[['state', 'State'], ['families', 'Families']]} height={240}>
                  <ResponsiveContainer><BarChart data={d.states.slice(0, 10)} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e3eae8" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} /><YAxis type="category" dataKey="state" width={120} tick={{ fontSize: 11 }} />
                    <Tooltip content={<Tip />} /><Bar dataKey="families" name="Families" fill={SERIES[0]} radius={[0, 3, 3, 0]} isAnimationActive={anim} />
                  </BarChart></ResponsiveContainer>
                </ChartCard>
              </div>
              <ChartCard title="Joined, paid and stopped — by day" note="tap a day" rows={d.series}
                columns={[['d', 'Day', dayLabel], ['joined', 'Joined'], ['paid_plans', 'Paid plans'], ['stopped', 'Replied STOP']]}>
                <ResponsiveContainer><ComposedChart data={d.series} onClick={open}>
                  {grid}{xAxis}<YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip content={<Tip />} /><Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="joined" name="Joined" fill={SERIES[0]} radius={[3, 3, 0, 0]} isAnimationActive={anim} />
                  <Bar dataKey="paid_plans" name="Paid plans" fill={SERIES[2]} radius={[3, 3, 0, 0]} isAnimationActive={anim} />
                  <Line dataKey="stopped" name="Replied STOP" stroke={SERIES[7]} strokeWidth={2} dot={false} isAnimationActive={anim} />
                </ComposedChart></ResponsiveContainer>
              </ChartCard>
              <ChartCard title="Children by board and grade" rows={d.boards} columns={[['board', 'Board'], ['grade', 'Grade'], ['children', 'Children']]} tableOnly />
            </>
          )}

          {page === 'quizzes' && (
            <>
              <ChartCard title="Quizzes sent, finished and missed" note="tap a day" rows={d.series}
                columns={[['d', 'Day', dayLabel], ['sent', 'Sent'], ['completed', 'Finished'], ['missed', 'Missed'], ['failed', 'Failed'], ['avg_score', 'Avg score', (v) => (v == null ? '—' : `${v}%`)]]}>
                <ResponsiveContainer><ComposedChart data={d.series} onClick={open}>
                  {grid}{xAxis}<YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip content={<Tip />} /><Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="completed" name="Finished" stackId="q" fill={SERIES[2]} isAnimationActive={anim} />
                  <Bar dataKey="missed" name="Missed" stackId="q" fill={SERIES[3]} isAnimationActive={anim} />
                  <Bar dataKey="failed" name="Failed" stackId="q" fill={SERIES[7]} radius={[3, 3, 0, 0]} isAnimationActive={anim} />
                </ComposedChart></ResponsiveContainer>
              </ChartCard>
              <div className="grid gap-4 lg:grid-cols-2">
                <ChartCard title="By grade" rows={d.by_grade} columns={[['grade', 'Grade'], ['sent', 'Sent'], ['completed', 'Finished'], ['avg_score', 'Avg score', (v) => (v == null ? '—' : `${v}%`)]]} height={240}>
                  <ResponsiveContainer><BarChart data={d.by_grade}>
                    {grid}<XAxis dataKey="grade" tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip content={<Tip />} /><Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="sent" name="Sent" fill={SERIES[0]} isAnimationActive={anim} /><Bar dataKey="completed" name="Finished" fill={SERIES[2]} isAnimationActive={anim} />
                  </BarChart></ResponsiveContainer>
                </ChartCard>
                <ChartCard title="By subject" rows={d.by_subject} columns={[['subject', 'Subject'], ['sent', 'Sent'], ['completed', 'Finished'], ['avg_score', 'Avg score', (v) => (v == null ? '—' : `${v}%`)]]} height={240}>
                  <ResponsiveContainer><BarChart data={d.by_subject}>
                    {grid}<XAxis dataKey="subject" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip content={<Tip />} /><Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="sent" name="Sent" fill={SERIES[0]} isAnimationActive={anim} /><Bar dataKey="completed" name="Finished" fill={SERIES[2]} isAnimationActive={anim} />
                  </BarChart></ResponsiveContainer>
                </ChartCard>
              </div>
            </>
          )}

          {page === 'whatsapp' && (
            <>
              <ChartCard title="Messages by day" note="tap a day for the templates sent" rows={d.series}
                columns={[['d', 'Day', dayLabel], ['received', 'Received'], ['replies', 'Replies'], ['templates', 'Templates'], ['failed', 'Failed'], ['people_messaged_first', 'People messaged first']]}>
                <ResponsiveContainer><ComposedChart data={d.series} onClick={open}>
                  {grid}{xAxis}<YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip content={<Tip />} /><Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="received" name="Received" fill={SERIES[0]} isAnimationActive={anim} />
                  <Bar dataKey="templates" name="Templates" fill={SERIES[1]} isAnimationActive={anim} />
                  <Line dataKey="people_messaged_first" name="People messaged first" stroke={SERIES[6]} strokeWidth={2} dot={false} isAnimationActive={anim} />
                  <Line dataKey="failed" name="Failed" stroke={SERIES[7]} strokeWidth={2} dot={false} isAnimationActive={anim} />
                </ComposedChart></ResponsiveContainer>
              </ChartCard>
              <ChartCard title="Templates" note={`marketing ₹${(d.rates.marketing_paise / 100).toFixed(2)} · utility ₹${(d.rates.utility_paise / 100).toFixed(2)} each, outside the 24-hour window`}
                rows={d.templates} columns={[['template', 'Template'], ['sent', 'Sent'], ['read', 'Read'], ['failed', 'Failed', (v) => (v ? <b className="text-red-700">{v}</b> : 0)]]} tableOnly />
              <p className="text-xs text-muted">Today: {num(d.limit.used)} of {num(d.limit.limit)} people messaged first in 24 hours. {d.limit.note}</p>
            </>
          )}

          {page === 'services' && (
            <>
              <div className="card p-4">
                <h3 className="mb-2 text-sm font-bold text-ink">Right now</h3>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {d.status.map((s) => (
                    <div key={s.key} className="rounded-xl border border-line p-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                        <span className={`h-2.5 w-2.5 rounded-full ${{ ok: 'bg-emerald-500', warn: 'bg-amber-400', down: 'bg-red-500' }[s.state] || 'bg-gray-300'}`} />{s.label}
                      </div>
                      <div className="mt-1 text-xs text-muted">{s.detail}</div>
                    </div>
                  ))}
                </div>
              </div>
              <ChartCard title="Background jobs and failed sends" rows={d.series}
                columns={[['d', 'Day', dayLabel], ['jobs_ok', 'Jobs done'], ['jobs_failed', 'Jobs failed'], ['scheduled_sends', 'Scheduled sends'], ['sends_failed', 'Sends failed']]}>
                <ResponsiveContainer><ComposedChart data={d.series}>
                  {grid}{xAxis}<YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip content={<Tip />} /><Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="jobs_ok" name="Jobs done" fill={SERIES[2]} isAnimationActive={anim} />
                  <Bar dataKey="jobs_failed" name="Jobs failed" fill={SERIES[7]} isAnimationActive={anim} />
                  <Line dataKey="sends_failed" name="Sends failed" stroke={SERIES[1]} strokeWidth={2} dot={false} isAnimationActive={anim} />
                </ComposedChart></ResponsiveContainer>
              </ChartCard>
            </>
          )}
        </div>
      )}
      {drill && <Drill {...drill} onClose={() => setDrill(null)} />}
    </Page>
  );
}

const STANDING = { paying: 'Paying', on_trial: 'On free trial', was_paying: 'Was paying', trial_ended: 'Trial ended, never paid', never_started: 'Never started' };

function Drill({ kind, day, onClose }) {
  const [rows, setRows] = useState(null);
  useEffect(() => { api.hq.drill(kind, day).then((x) => setRows(x.rows)).catch(() => setRows([])); }, [kind, day]);
  return (
    <Modal title={`${DRILL_TITLE[kind]} · ${dayLabel(day)}`} onClose={onClose} wide>
      {!rows ? <Loading /> : !rows.length ? <p className="text-sm text-muted">Nothing that day.</p> : (
        <div className="max-h-[60vh] overflow-auto">
          <table className="w-full border-collapse text-sm">
            {kind === 'families' && (<>
              <thead><tr>{['Parent', 'Children', 'Number', 'Joined', ''].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
              <tbody>{rows.map((r) => <tr key={r.id}><td className="td font-semibold">{r.name}</td><td className="td">{r.children || '—'}</td><td className="td">{r.masked}</td><td className="td">{dt(r.created_at)}</td>
                <td className="td"><Link className="text-brand-accent hover:underline" to={`/journey/${r.id}`}>Journey →</Link></td></tr>)}</tbody>
            </>)}
            {kind === 'quizzes' && (<>
              <thead><tr>{['Child', 'Parent', 'Subject', 'Status', 'Score', ''].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
              <tbody>{rows.map((r) => <tr key={r.id}><td className="td font-semibold">{r.child}</td><td className="td">{r.parent}</td><td className="td">{r.subject || '—'}</td>
                <td className="td">{String(r.status).replace(/_/g, ' ')}</td><td className="td">{r.score == null ? '—' : `${r.score}%`}</td>
                <td className="td"><Link className="text-brand-accent hover:underline" to={`/quizzes/${r.id}`}>Open →</Link></td></tr>)}</tbody>
            </>)}
            {kind === 'money' && (<>
              <thead><tr>{['Invoice', 'Parent', 'Plan', 'Paid', 'Time'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
              <tbody>{rows.map((r) => <tr key={r.id}><td className="td">{r.number}</td><td className="td">{r.parent_id ? <Link className="text-brand-accent hover:underline" to={`/journey/${r.parent_id}`}>{r.parent}</Link> : '—'}</td>
                <td className="td">{r.plan || '—'}</td><td className="td font-semibold">{inr(r.total, 2)}</td><td className="td">{dt(r.created_at)}</td></tr>)}</tbody>
            </>)}
            {kind === 'whatsapp' && (<>
              <thead><tr>{['To', 'Status', 'Message', 'Time'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
              <tbody>{rows.map((r) => <tr key={r.id}><td className="td">{r.masked || mask(r.mobile)}</td>
                <td className={`td ${r.status === 'failed' ? 'font-semibold text-red-700' : ''}`}>{r.status || '—'}{r.error ? <div className="text-[11px] font-normal">{r.error}</div> : null}</td>
                <td className="td text-xs">{r.body}</td><td className="td">{dt(r.created_at)}</td></tr>)}</tbody>
            </>)}
          </table>
        </div>
      )}
    </Modal>
  );
}
