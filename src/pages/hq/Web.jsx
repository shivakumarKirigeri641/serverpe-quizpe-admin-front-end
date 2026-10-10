import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAutoRefresh } from '../../lib/useAutoRefresh';
import { Page, Loading, ErrorBox, Empty, Pill, Table, Row } from '../../components/ui.jsx';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Tabs, Period, ChartCard, Tip, SERIES, num, ago, dt, dayLabel } from '../../components/hq/kit.jsx';

/*
 * THE WEBSITE (user, 2026-10-10: "start QuizPe like GaadiPe, web based; in the admin
 * hide WhatsApp and start with the web activities"). Parents use quizpe.in/app:
 * they sign in with an SMS code, and reminders reach them by email and phone
 * notifications. These pages show that: who visits, who signs in, who is on the
 * app now, and which families can be reached — and which cannot.
 */

const tile = (label, value, sub, to, tone) => {
  const body = (
    <div className={`card h-full p-4 transition hover:shadow-lg ${tone === 'warn' ? 'border-amber-200 bg-amber-50/50' : ''}`}>
      <div className="text-[11px] font-bold uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-2xl font-extrabold text-ink">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-muted">{sub}</div>}
    </div>
  );
  return to ? <Link to={to} className="block">{body}</Link> : body;
};

/* ───────────────────────────── Website overview ───────────────────────────── */

export function WebOverview() {
  const [d, setD] = useState(null);
  const [error, setError] = useState(null);
  const load = useCallback(() => api.hq.webOverview().then((x) => { setD(x); setError(null); }).catch(setError), []);
  useEffect(() => { load(); }, [load]);
  useAutoRefresh(load, 30000);
  return (
    <Page title="Website" subtitle="quizpe.in/app — visits, sign-ins, who is on the app now, and how reminders reach families. Refreshes every 30 seconds.">
      {error && !d ? <ErrorBox error={error} onRetry={load} /> : !d ? <Loading /> : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {tile('Visitors today', num(d.visitors_today), `${num(d.visits_today)} page visits`, '/visitors')}
            {tile('Sign-ins today', num(d.signins_today), `${num(d.signins_7d)} in 7 days · ${num(d.codes_today)} code(s) sent today`, '/web/sign-ins')}
            {tile('On the app now', num(d.online_now), `seen in the last 15 minutes · ${num(d.open_sessions)} signed in`, '/web/sign-ins')}
            {tile('Families on the app', num(d.web_families), `${num(d.active_30d)} signed in this month`, '/web/families')}
            {tile('Reached by email', num(d.email_families), 'families with an email on file', '/web/families?filter=no_email')}
            {tile('Phone notifications on', num(d.push_families), 'families who allowed them', '/web/families?filter=push')}
            {tile('Cannot be reached', num(d.unreachable), 'on the app, but no email and no notifications', '/web/families?filter=unreachable', d.unreachable ? 'warn' : undefined)}
            {tile('Codes not used today', num(d.codes_unused_today), 'asked for a sign-in code, did not finish', '/web/sign-ins', d.codes_unused_today ? 'warn' : undefined)}
          </div>
          <ChartCard title="Last 14 days" note="Visitors to quizpe.in and sign-ins to the app, per day (IST)." rows={d.days.map((x) => ({ ...x, label: dayLabel(x.day) }))}
            columns={[['label', 'Day'], ['visitors', 'Visitors'], ['signins', 'Sign-ins']]}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.days.map((x) => ({ ...x, label: dayLabel(x.day) }))} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip content={<Tip />} />
                <Bar dataKey="visitors" name="Visitors" fill={SERIES[0]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="signins" name="Sign-ins" fill={SERIES[2]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <p className="mt-3 text-[11px] text-muted">WhatsApp is no longer used for QuizPe. Quizzes, trials, plans and reports run on quizpe.in/app; reminders go by email and phone notifications.</p>
        </>
      )}
    </Page>
  );
}

/* ───────────────────────────────── Sign-ins ───────────────────────────────── */

const STATE_TONE = { 'on the app now': 'green', 'signed in': 'blue', 'signed out': 'grey', expired: 'grey' };
const PLAN_TONE = { 'paid plan': 'green', 'free trial': 'blue', 'trial ended': 'amber', 'plan ended': 'amber', 'no plan': 'grey', 'not enrolled': 'grey' };

export function WebSignIns() {
  const [days, setDays] = useState(30);
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  const [d, setD] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => { const t = setTimeout(() => setTerm(q.trim()), 350); return () => clearTimeout(t); }, [q]);
  const load = useCallback(() => api.hq.webSignIns(days, term).then((x) => { setD(x); setError(null); }).catch(setError), [days, term]);
  useEffect(() => { load(); }, [load]);
  useAutoRefresh(load, 30000);
  return (
    <Page title="Sign-ins" subtitle="Every sign-in to quizpe.in/app: the family, the device, when, and whether they are still on it."
      actions={<><input className="input !w-56 !py-1.5 text-sm" placeholder="Mobile or name" value={q} onChange={(e) => setQ(e.target.value)} />
        <Period value={days} onChange={setDays} options={[1, 7, 30, 90]} /></>}>
      {error && !d ? <ErrorBox error={error} onRetry={load} /> : !d ? <Loading /> : !d.rows.length ? <Empty>No sign-ins in this period.</Empty> : (
        <Table head={['Signed in', 'Family', 'Plan', 'Device', 'IP', 'Last seen', 'State']}>
          {d.rows.map((r, i) => (
            <Row key={r.id} index={i}>
              <td className="td whitespace-nowrap">{dt(r.signed_in_at)}</td>
              <td className="td">{r.parent_id ? <Link className="font-semibold text-brand-accent hover:underline" to={`/parents/${r.parent_id}`}>{r.name || '—'}</Link> : <span className="text-muted">{r.name || 'not enrolled yet'}</span>}
                <div className="text-[11px] tabular-nums text-muted">{r.mobile}{r.children ? ` · ${r.children} child${r.children === 1 ? '' : 'ren'}` : ''}{r.email ? ` · ${r.email}` : ''}</div></td>
              <td className="td"><Pill tone={PLAN_TONE[r.plan]}>{r.plan}</Pill>{r.plan_name ? <div className="mt-0.5 text-[11px] text-muted">{r.plan_name}</div> : null}</td>
              <td className="td text-xs" title={r.user_agent || ''}>{r.device || '—'}</td>
              <td className="td font-mono text-[11px]">{r.ip || '—'}</td>
              <td className="td whitespace-nowrap text-xs">{ago(r.last_seen_at)}</td>
              <td className="td"><Pill tone={STATE_TONE[r.state]}>{r.state}</Pill>{r.ended_at ? <div className="mt-0.5 text-[11px] text-muted">{dt(r.ended_at)}</div> : null}</td>
            </Row>
          ))}
        </Table>
      )}
    </Page>
  );
}

/* ──────────────────────────── Families on the app ─────────────────────────── */

const FAMILY_TABS = [
  ['all', 'Everyone'], ['unreachable', '⚠️ Cannot be reached'], ['no_email', 'No email'], ['push', '🔔 Notifications on'],
  ['trial', 'Free trial'], ['paid', 'Paid plan'], ['not_enrolled', 'Not enrolled'],
];

export function WebFamilies() {
  const [filter, setFilter] = useState(() => new URLSearchParams(window.location.search).get('filter') || 'all');
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  const [d, setD] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => { const t = setTimeout(() => setTerm(q.trim()), 350); return () => clearTimeout(t); }, [q]);
  const load = useCallback(() => api.hq.webFamilies(filter, term).then((x) => { setD(x); setError(null); }).catch(setError), [filter, term]);
  useEffect(() => { load(); }, [load]);
  useAutoRefresh(load, 60000);
  return (
    <Page title="Families on the app" subtitle="Every family that has signed in to quizpe.in/app — their plan, and how reminders reach them (email, phone notifications)."
      actions={<input className="input !w-56 !py-1.5 text-sm" placeholder="Mobile or name" value={q} onChange={(e) => setQ(e.target.value)} />}>
      <Tabs tabs={FAMILY_TABS.map(([k, l]) => [k, l])} value={filter} onChange={setFilter} />
      {error && !d ? <ErrorBox error={error} onRetry={load} /> : !d ? <Loading /> : !d.rows.length ? <Empty>Nobody here.</Empty> : (
        <Table head={['Family', 'Plan', 'Children', 'Reminders reach them', 'Sign-ins', 'Last on the app', 'First sign-in']}>
          {d.rows.map((r, i) => (
            <Row key={r.mobile} index={i}>
              <td className="td">{r.parent_id ? <Link className="font-semibold text-brand-accent hover:underline" to={`/parents/${r.parent_id}`}>{r.name || '—'}</Link> : <span className="text-muted">{r.name || 'not enrolled yet'}</span>}
                <div className="text-[11px] tabular-nums text-muted">{r.mobile}</div></td>
              <td className="td"><Pill tone={PLAN_TONE[r.plan]}>{r.plan}</Pill>{r.plan_ends ? <div className="mt-0.5 text-[11px] text-muted">{r.plan_name} · ends {String(r.plan_ends).slice(0, 10)}</div> : null}</td>
              <td className="td tabular-nums">{num(r.children)}</td>
              <td className="td">
                <div className="flex flex-wrap gap-1">
                  {r.email ? <Pill tone="green">✉️ {r.email}</Pill> : <Pill tone="amber">✉️ no email</Pill>}
                  {r.push_devices ? <Pill tone="green">🔔 {r.push_devices}</Pill> : null}
                  {!r.reach.length ? <Pill tone="red">⚠️ cannot be reached</Pill> : null}
                </div>
              </td>
              <td className="td tabular-nums">{num(r.signins)}{r.signed_in ? <div className="text-[11px] text-emerald-700">signed in</div> : null}</td>
              <td className="td whitespace-nowrap text-xs">{ago(r.last_at)}</td>
              <td className="td whitespace-nowrap text-xs">{dt(r.first_at)}</td>
            </Row>
          ))}
        </Table>
      )}
    </Page>
  );
}
