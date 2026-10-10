import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAutoRefresh } from '../../lib/useAutoRefresh';
import { Page, Loading, ErrorBox, Empty, Pill } from '../../components/ui.jsx';
import { Tabs, Period, num, ago, dt, dayLabel } from '../../components/hq/kit.jsx';

/*
 * FAMILIES (admin revamp, 2026-10-05) — QuizPe's version of GaadiPe's
 * Customers pages: who to talk to today (hot leads), one family's whole story
 * (journey), and how each child is doing day by day. Read-only.
 * WhatsApp is gone (2026-10-10): leads show their last app visit and how they can be
 * reached (email, phone notifications); the journey shows app sign-ins, not chats.
 */

/* ────────────────────────────── Hot leads ────────────────────────────── */

const LEAD_TABS = [
  ['ending', '⏳ Trial ending', 'Free trial ends within 2 days, never paid — the best moment to offer a plan.'],
  ['ended', '⌛ Trial ended', 'Trial ended in the last 14 days, never paid.'],
  ['was_paying', '↩ Was paying', 'A paid plan ended in the last 30 days and was not renewed.'],
  ['no_child', '🧒 Signed in, no child yet', 'Signed in on the app in the last 14 days but never added a child — the trial form was not finished.'],
];

export function HotLeads() {
  const [tab, setTab] = useState('ending');
  const [d, setD] = useState(null);
  const [error, setError] = useState(null);
  const load = useCallback(() => api.hq.hotLeads().then((x) => { setD(x); setError(null); }).catch(setError), []);
  useEffect(() => { load(); }, [load]);
  useAutoRefresh(load, 60000);
  const [picked, setPicked] = useState(false);
  useEffect(() => {
    if (!d || picked) return;
    const first = LEAD_TABS.find(([k]) => d.counts[k]);
    if (first) setTab(first[0]);
    setPicked(true);
  }, [d, picked]);
  const rows = (d?.tabs?.[tab] || []).slice().sort((a, b) => new Date(b.last_app_visit || 0) - new Date(a.last_app_visit || 0));
  return (
    <Page title="Hot leads 🔥" subtitle="Families worth a word today — with their last visit to the app and how they can be reached.">

      {error && !d ? <ErrorBox error={error} onRetry={load} /> : !d ? <Loading /> : (
        <>
          <Tabs tabs={LEAD_TABS.map(([k, l]) => [k, l, d.counts[k]])} value={tab} onChange={setTab} />
          <p className="mb-3 text-sm text-muted">{LEAD_TABS.find(([k]) => k === tab)[2]}</p>
          {!rows.length ? <Empty>Nobody here right now.</Empty> : (
            <div className="grid gap-3 lg:grid-cols-2">
              {rows.map((r) => (
                <div key={`${r.parent_id || r.mobile}`} className="card p-4">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <b className="text-ink">{r.name || 'Unknown'}</b>
                    <span className="text-[11px] tabular-nums text-muted">{r.masked}</span>
                    {r.reach?.length ? <Pill tone="green">{r.reach.join(' + ')}</Pill> : <Pill tone="grey">no email, no notifications</Pill>}
                    {r.parent_id && <Link className="ml-auto text-xs font-semibold text-brand-accent hover:underline" to={`/journey/${r.parent_id}`}>Journey →</Link>}
                  </div>
                  {r.children && <div className="mt-1 text-xs text-ink">Children: {r.children} · {num(r.quizzes_done)} quiz(zes) finished</div>}
                  <div className="mt-1 text-[11px] text-muted">
                    {tab === 'no_child' ? `First signed in ${ago(r.at)}` : `${tab === 'was_paying' ? 'Plan ended' : tab === 'ended' ? 'Trial ended' : 'Trial ends'} ${String(r.at).slice(0, 10)}`}
                    {` · ${r.last_app_visit ? `last on the app ${ago(r.last_app_visit)}` : 'never opened the app'}`}
                  </div>
                  {r.parent_id && <div className="mt-3"><Link className="btn-sec !py-1.5 text-xs" to={`/parents/${r.parent_id}`}>Parent details →</Link></div>}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Page>
  );
}

/* ────────────────────────────── Journey ────────────────────────────── */

const KIND = {
  joined: ['👋', 'text-brand'], trial: ['🎁', 'text-sky-700'], plan: ['⭐', 'text-emerald-700'], paid: ['₹', 'text-emerald-700'],
  feedback: ['💬', 'text-violet-700'], support: ['🛟', 'text-amber-700'], app: ['📱', 'text-muted'], stopped: ['🛑', 'text-red-700'],
};

export function Journey() {
  const { parentId } = useParams();
  const [d, setD] = useState(null);
  const [error, setError] = useState(null);
  const [onlyKey, setOnlyKey] = useState(false);
  const load = useCallback(() => api.hq.journey(parentId).then((x) => { setD(x); setError(null); }).catch(setError), [parentId]);
  useEffect(() => { load(); }, [load]);
  if (error && !d) return <Page title="Family journey"><ErrorBox error={error} onRetry={load} /></Page>;
  if (!d) return <Page title="Family journey"><Loading /></Page>;
  const events = onlyKey ? d.events.filter((e) => e.kind !== 'app' && !/quiz_(scheduled|delivered)/.test(e.kind)) : d.events;
  const a = d.app || {};
  return (
    <Page title={`${d.parent.name || 'Family'} — journey`}
      subtitle={`${d.parent.masked} · joined ${dt(d.parent.created_at)} · ${num(a.signins)} app sign-in(s)${a.last_visit ? `, last ${ago(a.last_visit)}` : ''} · reached by ${[a.email ? 'email' : null, a.push_devices ? 'notifications' : null].filter(Boolean).join(' + ') || 'nothing yet'}`}
      actions={<Link className="btn-sec" to={`/parents/${d.parent.id}`}>Parent details</Link>}>
      <label className="mb-3 flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" checked={onlyKey} onChange={(e) => setOnlyKey(e.target.checked)} /> Only the key moments (hide app sign-ins and scheduled quizzes)
      </label>
      <div className="card p-4">
        <ol className="relative ml-3 border-l-2 border-line">
          {events.map((e, i) => {
            const [icon, tone] = KIND[e.kind] || (e.kind.startsWith('quiz_') ? [e.kind === 'quiz_completed' ? '✅' : '📝', e.kind === 'quiz_completed' ? 'text-emerald-700' : 'text-ink'] : ['•', 'text-muted']);
            return (
              <li key={i} className="mb-3 ml-4">
                <span className="absolute -left-[11px] flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs">{icon}</span>
                <div className={`text-sm ${tone}`}>{e.tracker_id ? <Link className="hover:underline" to={`/quizzes/${e.tracker_id}`}>{e.text}</Link> : e.text}</div>
                <div className="text-[11px] text-muted">{dt(e.at)}</div>
              </li>
            );
          })}
        </ol>
        {!events.length && <p className="text-sm text-muted">Nothing recorded yet.</p>}
      </div>
    </Page>
  );
}

/* ────────────────────────── Quizzes per child ────────────────────────── */

export function QuizzesPerChild() {
  const [days, setDays] = useState(1);
  const [missed, setMissed] = useState(0);
  const [q, setQ] = useState('');
  const [d, setD] = useState(null);
  const [error, setError] = useState(null);
  const load = useCallback(() => api.hq.perChild(days, missed).then((x) => { setD(x); setError(null); }).catch(setError), [days, missed]);
  useEffect(() => { setD(null); load(); }, [load]);
  useAutoRefresh(load, 60000);
  const term = q.trim().toLowerCase();
  const rows = (d?.rows || []).filter((r) => !term || `${r.child} ${r.parent} ${r.grade}`.toLowerCase().includes(term));
  const t = d?.totals || {};
  return (
    <Page title="Quizzes per child" subtitle="For each child and day: quizzes sent, finished, missed, and the score"
      actions={<>
        <Period value={days} onChange={setDays} options={[1, 7, 30]} />
        <select className="input !w-auto !py-2" value={missed} onChange={(e) => setMissed(Number(e.target.value))}>
          <option value={0}>Every child</option><option value={1}>Missed 1+</option><option value={2}>Missed 2+</option>
        </select>
        <input className="input !w-48 !py-2" placeholder="Child, parent or grade" value={q} onChange={(e) => setQ(e.target.value)} />
      </>}>
      {d && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[['Children', t.children], ['Quizzes sent', t.sent], ['Finished', t.completed], ['Missed', t.missed]].map(([l, n]) => (
            <div key={l} className="card p-3"><div className="text-[11px] font-bold uppercase text-muted">{l}</div><div className="text-xl font-extrabold text-ink">{num(n)}</div></div>
          ))}
        </div>
      )}
      {error && !d ? <ErrorBox error={error} onRetry={load} /> : !d ? <Loading /> : !rows.length ? <Empty>No quizzes in this period.</Empty> : (
        <div className="card overflow-x-auto">
          <table className="w-full border-collapse">
            <thead><tr>{['Day', 'Child', 'Grade', 'Sent', 'Finished', 'Missed', 'Open', 'Avg score', 'Subjects', ''].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={`${r.student_id}:${r.day}`}>
                <td className="td whitespace-nowrap text-xs text-muted">{dayLabel(r.day)}</td>
                <td className="td"><div className="font-semibold text-ink">{r.child}</div><div className="text-[11px] text-muted">{r.parent}</div></td>
                <td className="td text-xs">{r.grade || '—'}</td>
                <td className="td tabular-nums">{r.sent}</td>
                <td className="td tabular-nums font-semibold text-emerald-700">{r.completed}</td>
                <td className={`td tabular-nums ${r.missed ? 'font-semibold text-amber-700' : 'text-muted'}`}>{r.missed}</td>
                <td className="td tabular-nums text-muted">{r.open || '—'}</td>
                <td className="td tabular-nums">{r.avg_score == null ? '—' : `${r.avg_score}%`}</td>
                <td className="td text-xs">{r.subjects || '—'}</td>
                <td className="td"><Link className="text-xs text-brand-accent hover:underline" to={`/journey/${r.parent_id}`}>Journey →</Link></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </Page>
  );
}
