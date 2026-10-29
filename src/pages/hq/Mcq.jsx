import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { api } from '../../lib/api';
import { useAutoRefresh } from '../../lib/useAutoRefresh';
import { Page, Loading, ErrorBox, Empty, Pill, Table, Row } from '../../components/ui.jsx';
import { Period, ChartCard, Tip, SERIES, num, inr, dt, dayLabel } from '../../components/hq/kit.jsx';

/**
 * PAY AS YOU ANSWER (user, 2026-10-28: "recharge concepts, how many users, how much, history, total, analytics,
 * vs inc/dec % and more", as in GaadiPe's admin). The period against the one before it, what is outstanding
 * right now, the packs, per day, every recharge, and the families practising most. hq/mcq.js.
 */

/* ↑ 12% / ↓ 5% against the previous period; "new" when there was nothing before. */
function Change({ v, prev, invert = false }) {
  if (v == null) return prev === 0 ? <span className="text-[11px] font-semibold text-sky-700">new</span> : null;
  if (v === 0) return <span className="text-[11px] text-muted">± 0%</span>;
  const good = invert ? v < 0 : v > 0;
  return <span className={`text-[11px] font-bold ${good ? 'text-emerald-700' : 'text-red-600'}`}>{v > 0 ? '↑' : '↓'} {Math.abs(v)}%</span>;
}

function Tile({ label, value, sub, change, prev, to, tone }) {
  const body = (
    <div className={`card h-full p-4 transition hover:shadow-lg ${tone === 'warn' ? 'border-amber-200 bg-amber-50/50' : ''}`}>
      <div className="text-[11px] font-bold uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-extrabold text-ink">{value}</span>
        {change !== undefined ? <Change v={change} prev={prev} /> : null}
      </div>
      {sub ? <div className="mt-0.5 text-[11px] text-muted">{sub}</div> : null}
    </div>
  );
  return to ? <Link to={to} className="block">{body}</Link> : body;
}

const SRC = { recharge: ['Recharge', 'green'], admin: ['Admin top-up', 'blue'], referral: ['Invite bonus', 'amber'] };

export default function Mcq() {
  const [days, setDays] = useState(30);
  const [d, setD] = useState(null);
  const [error, setError] = useState(null);
  const load = useCallback(() => api.hq.mcqStats(days).then((x) => { setD(x); setError(null); }).catch(setError), [days]);
  useEffect(() => { load(); }, [load]);
  useAutoRefresh(load, 60000);

  const c = d?.cur || {};
  const p = d?.prev || {};
  const ch = d?.change || {};
  const was = (k, f = num) => `previous ${days} days: ${f(p[k])}`;

  return (
    <Page title="Pay as you answer"
      subtitle="MCQ recharges, the free 50, MCQs answered — this period against the one before. Recharges ₹50 / ₹100 / ₹200 + GST; every balance ends on 31 March."
      actions={<Period value={days} onChange={setDays} options={[7, 30, 90, 365]} />}>
      {error && !d ? <ErrorBox error={error} onRetry={load} /> : !d ? <Loading /> : (<>
        <h3 className="mb-2 text-sm font-extrabold text-brand">Money — last {days} days</h3>
        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Tile label="Recharge revenue (ex-GST)" value={inr(c.rupees)} change={ch.rupees} prev={p.rupees} sub={was('rupees', inr)} />
          <Tile label="Collected (incl. GST)" value={inr(c.collected)} change={ch.collected} prev={p.collected} sub={was('collected', inr)} />
          <Tile label="Recharges" value={num(c.recharges)} change={ch.recharges} prev={p.recharges} sub={`avg ${inr(c.avg_recharge)} · ${was('recharges')}`} />
          <Tile label="Paying families" value={num(c.paying_families)} change={ch.paying_families} prev={p.paying_families}
            sub={`${num(c.new_payers)} new · ${num(c.repeat_payers)} repeat · ${inr(c.per_family)} per family`} />
        </div>

        <h3 className="mb-2 text-sm font-extrabold text-brand">Practice — last {days} days</h3>
        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Tile label="MCQs answered" value={num(c.mcqs_answered)} change={ch.mcqs_answered} prev={p.mcqs_answered}
            sub={`${num(c.paid_answered)} paid · ${num(c.free_answered)} free · ${num(c.admin_answered)} top-up`} />
          <Tile label="MCQs sold" value={num(c.mcqs_sold)} change={ch.mcqs_sold} prev={p.mcqs_sold} sub={was('mcqs_sold')} />
          <Tile label="Students practising" value={num(c.students_practising)} change={ch.students_practising} prev={p.students_practising}
            sub={`${num(c.families_practising)} families`} />
          <Tile label="Free 50 → paid" value={c.free_conversion_pct != null ? `${c.free_conversion_pct}%` : '—'}
            sub={`${num(c.free_given)} free starts · ${num(c.free_then_paid)} recharged since`} change={ch.free_given} prev={p.free_given} />
        </div>

        <h3 className="mb-2 text-sm font-extrabold text-brand">Right now</h3>
        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Tile label="MCQs outstanding" value={num(d.now.outstanding)}
            sub={`${num(d.now.outstanding_paid)} paid · ${num(d.now.outstanding_free)} free · end ${dt(d.now.year_end).split(',')[0]}`} />
          <Tile label="Families with a balance" value={num(d.now.families_with_balance)} to="/web/families" />
          <Tile label="Low balance (1–20 left)" value={num(d.now.low_families)} tone={d.now.low_families ? 'warn' : undefined}
            sub="they get a low-balance alert at 6 PM" />
          <Tile label="Since launch" value={inr(d.ever.rupees_ever)}
            sub={`${num(d.ever.recharges_ever)} recharges · ${num(d.ever.paying_ever)} families · ${num(d.ever.free_ever)} free starts`} />
        </div>

        <h3 className="mb-2 text-sm font-extrabold text-brand">Refer &amp; earn — last {days} days</h3>
        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Tile label="Friends joined by invite" value={num(c.referred_joined)} change={ch.referred_joined} prev={p.referred_joined}
            sub="each started with 50 + 25 free" />
          <Tile label="Invite bonuses paid" value={num(c.referral_rewards)} change={ch.referral_rewards} prev={p.referral_rewards}
            sub={`${num(c.referral_mcqs)} MCQs to referrers · after the friend's first 10 answers`} />
        </div>

        {c.topups ? <p className="mb-4 text-[11px] text-muted">Admin top-ups in this period: {num(c.topups)} · {num(c.topup_mcqs)} MCQs.</p> : null}

        <ChartCard title={`Per day — last ${days} days`} note="Recharge ₹ (ex-GST) and MCQs answered, per day (IST)."
          rows={d.daily.map((x) => ({ ...x, label: dayLabel(x.day) }))}
          columns={[['label', 'Day'], ['recharges', 'Recharges'], ['rupees', '₹ (ex-GST)'], ['answered', 'MCQs answered'], ['free_answered', 'of them free'], ['free_given', 'Free starts']]}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={d.daily.map((x) => ({ ...x, label: dayLabel(x.day) }))} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip content={<Tip money={['rupees']} />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="rupees" name="₹ recharged" fill={SERIES[2]} radius={[4, 4, 0, 0]} />
              <Bar dataKey="answered" name="MCQs answered" fill={SERIES[0]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <h3 className="mb-2 mt-6 text-sm font-extrabold text-brand">Packs — last {days} days</h3>
        {!d.packs.length ? <Empty>No recharges in this period yet.</Empty> : (
          <Table head={['Pack', 'Recharges', 'Families', '₹ (ex-GST)', 'Share']}>
            {d.packs.map((x, i) => (
              <Row key={x.rupees} index={i}>
                <td className="td font-semibold">₹{x.rupees} · {num(x.mcqs)} MCQs</td>
                <td className="td tabular-nums">{num(x.recharges)}</td>
                <td className="td tabular-nums">{num(x.families)}</td>
                <td className="td tabular-nums">{inr(x.rupees * x.recharges)}</td>
                <td className="td tabular-nums">{c.recharges ? `${Math.round((x.recharges / c.recharges) * 100)}%` : '—'}</td>
              </Row>
            ))}
          </Table>
        )}

        <h3 className="mb-2 mt-6 text-sm font-extrabold text-brand">Families practising most — last {days} days</h3>
        {!d.top.length ? <Empty>No MCQs answered from a balance yet.</Empty> : (
          <Table head={['Family', 'MCQs answered', 'Left', 'Spent so far']}>
            {d.top.map((x, i) => (
              <Row key={x.parent_id} index={i}>
                <td className="td"><Link className="font-semibold text-brand-accent hover:underline" to={`/parents/${x.parent_id}`}>{x.parent_name || '—'}</Link>
                  <div className="text-[11px] tabular-nums text-muted">{x.mobile}</div></td>
                <td className="td tabular-nums">{num(x.answered)}</td>
                <td className="td tabular-nums">{num(x.left)}</td>
                <td className="td tabular-nums">{inr(x.spent)}</td>
              </Row>
            ))}
          </Table>
        )}

        <h3 className="mb-2 mt-6 text-sm font-extrabold text-brand">History — the last 100 recharges and top-ups</h3>
        {!d.history.length ? <Empty>Nothing yet.</Empty> : (
          <Table head={['When', 'Family', 'What', 'Paid', 'Used', 'Valid till', 'Invoice']}>
            {d.history.map((x, i) => (
              <Row key={x.id} index={i}>
                <td className="td whitespace-nowrap text-xs">{dt(x.created_at)}</td>
                <td className="td"><Link className="font-semibold text-brand-accent hover:underline" to={`/parents/${x.parent_id}`}>{x.parent_name || '—'}</Link>
                  <div className="text-[11px] tabular-nums text-muted">{x.mobile}</div></td>
                <td className="td"><Pill tone={(SRC[x.source] || SRC.recharge)[1]}>{(SRC[x.source] || SRC.recharge)[0]}</Pill>
                  <div className="mt-0.5 text-[11px] text-muted">{num(x.mcqs)} MCQs{x.source === 'admin' && x.note ? ` · ${x.note}` : ''}</div></td>
                <td className="td tabular-nums">{x.collected != null ? inr(x.collected, 2) : x.rupees ? inr(x.rupees) : '—'}</td>
                <td className="td tabular-nums">{num(x.used)} / {num(x.mcqs)}</td>
                <td className="td whitespace-nowrap text-xs">{dt(x.expires_at).split(',')[0]}</td>
                <td className="td text-xs">{x.invoice_id || '—'}</td>
              </Row>
            ))}
          </Table>
        )}
      </>)}
    </Page>
  );
}
