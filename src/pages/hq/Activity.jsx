import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAutoRefresh } from '../../lib/useAutoRefresh';
import { Page, Loading, ErrorBox, Empty, Pill, Table, Row } from '../../components/ui.jsx';
import { Tabs, num, ago, dt } from '../../components/hq/kit.jsx';

/*
 * THE EVENT LOG AND LIVE NOW (user, 2026-10-21: "continue with QuizPe" — like GaadiPe's web admin, which has
 * a Log of every event in words and Live users). Read from the tables that already record what happens
 * (hq/events.js): sign-in codes, sign-ins, trials, plans, payments, quizzes, reports, reminders, support,
 * ratings — and page visits on request. Families shown are only those who agreed (hq/agreed.js).
 */

const KIND_TABS = [
  ['all', 'Everything'], ['signin', '✅ Sign-ins'], ['code', '🔑 Codes'], ['trial', '🎁 Trials'], ['plan', '📘 Plans'],
  ['paid', '💰 Payments'], ['payment_failed', '❌ Failed payments'], ['quiz', '📝 Quizzes'], ['report', '📊 Reports'],
  ['reminder', '🔔 Reminders'], ['support', '🆘 Support'], ['feedback', '⭐ Ratings'], ['visit', '🌐 Page visits'],
];
const HOURS = [[1, '1 hour'], [6, '6 hours'], [24, '24 hours'], [72, '3 days'], [168, '7 days'], [720, '30 days']];

export function EventLog() {
  const [kind, setKind] = useState('all');
  const [hours, setHours] = useState(24);
  const [visits, setVisits] = useState(false);
  // ?q= opens one family's events (from the parent page, 2026-10-21).
  const [q, setQ] = useState(() => new URLSearchParams(window.location.search).get('q') || '');
  const [term, setTerm] = useState('');
  const [d, setD] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => { const t = setTimeout(() => setTerm(q.trim()), 350); return () => clearTimeout(t); }, [q]);
  const load = useCallback(() => api.hq.events(hours, kind, term, visits || kind === 'visit')
    .then((x) => { setD(x); setError(null); }).catch(setError), [hours, kind, term, visits]);
  useEffect(() => { load(); }, [load]);
  useAutoRefresh(load, 20000);
  return (
    <Page title="Event log" subtitle="Everything families do, in words, newest first — sign-in codes, sign-ins, trials, plans, payments, quizzes, reports, reminders, support and ratings. Red when something went wrong. Refreshes every 20 seconds."
      actions={<>
        <input className="input !w-56 !py-1.5 text-sm" placeholder="Mobile, name or words" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input !w-auto !py-1.5 text-sm" value={hours} onChange={(e) => setHours(Number(e.target.value))}>
          {HOURS.map(([h, l]) => <option key={h} value={h}>Last {l}</option>)}
        </select>
      </>}>
      <Tabs tabs={KIND_TABS} value={kind} onChange={setKind} />
      {kind === 'all' ? (
        <label className="mb-3 inline-flex items-center gap-2 text-[11px] text-muted">
          <input type="checkbox" checked={visits} onChange={(e) => setVisits(e.target.checked)} /> Include page visits on quizpe.in
        </label>
      ) : null}
      {error && !d ? <ErrorBox error={error} onRetry={load} /> : !d ? <Loading /> : !d.rows.length ? <Empty>Nothing in this period.</Empty> : (
        <Table head={['When', 'What happened', 'Family', 'Details']}>
          {d.rows.map((r, i) => (
            <Row key={`${r.kind}-${r.ref}-${i}`} index={i}>
              <td className="td whitespace-nowrap text-xs" title={dt(r.at)}>{ago(r.at)}</td>
              <td className={`td ${r.bad ? 'font-semibold text-rose-700' : ''}`}>{r.icon} {r.text}</td>
              <td className="td text-xs">{r.name || (r.mobile ? '' : <span className="text-muted">visitor</span>)}
                {r.mobile ? <div className="tabular-nums text-[11px] text-muted">{r.mobile}</div> : null}</td>
              <td className="td text-xs text-muted">{r.detail || '—'}</td>
            </Row>
          ))}
        </Table>
      )}
    </Page>
  );
}

export function LiveNow() {
  const [d, setD] = useState(null);
  const [error, setError] = useState(null);
  const load = useCallback(() => api.hq.liveNow().then((x) => { setD(x); setError(null); }).catch(setError), []);
  useEffect(() => { load(); }, [load]);
  useAutoRefresh(load, 15000);
  return (
    <Page title="Live now" subtitle="Who is on quizpe.in in the last 15 minutes, and which families are on the app right now. Refreshes every 15 seconds.">
      {error && !d ? <ErrorBox error={error} onRetry={load} /> : !d ? <Loading /> : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="card p-4"><div className="text-[11px] font-semibold uppercase tracking-wide text-muted">On the app now</div>
              <div className="mt-1 text-2xl font-bold tabular-nums text-ink">{num(d.app.length)}</div><div className="text-[11px] text-muted">families seen in 15 minutes</div></div>
            <div className="card p-4"><div className="text-[11px] font-semibold uppercase tracking-wide text-muted">On quizpe.in</div>
              <div className="mt-1 text-2xl font-bold tabular-nums text-ink">{num(d.site.length)}</div><div className="text-[11px] text-muted">visitors in 15 minutes</div></div>
          </div>
          <h2 className="mb-2 text-sm font-bold text-ink">Families on the app</h2>
          {!d.app.length ? <Empty>No family on the app right now.</Empty> : (
            <Table head={['Family', 'Last seen', 'Device']}>
              {d.app.map((r, i) => (
                <Row key={r.mobile} index={i}>
                  <td className="td">{r.name || <span className="text-muted">not enrolled yet</span>}<div className="tabular-nums text-[11px] text-muted">{r.mobile}</div></td>
                  <td className="td whitespace-nowrap text-xs"><Pill tone="green">{ago(r.last_seen)}</Pill></td>
                  <td className="td text-xs">{r.device || '—'}</td>
                </Row>
              ))}
            </Table>
          )}
          <h2 className="mb-2 mt-5 text-sm font-bold text-ink">Visitors on quizpe.in</h2>
          {!d.site.length ? <Empty>No visitors in the last 15 minutes.</Empty> : (
            <Table head={['Now on', 'Pages', 'Where', 'Device', 'Came from', 'Here since']}>
              {d.site.map((r, i) => (
                <Row key={r.session} index={i}>
                  <td className="td font-mono text-xs">{r.page || '/'}</td>
                  <td className="td tabular-nums">{num(r.pages)}</td>
                  <td className="td text-xs">{r.place || '—'}</td>
                  <td className="td text-xs">{r.device || '—'}</td>
                  <td className="td max-w-[220px] truncate text-xs text-muted" title={r.came_from || ''}>{r.came_from || 'typed / direct'}</td>
                  <td className="td whitespace-nowrap text-xs">{ago(r.first_at)}</td>
                </Row>
              ))}
            </Table>
          )}
        </>
      )}
    </Page>
  );
}

