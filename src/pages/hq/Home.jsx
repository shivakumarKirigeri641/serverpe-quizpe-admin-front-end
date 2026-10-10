import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAutoRefresh } from '../../lib/useAutoRefresh';
import { Page, Loading, ErrorBox } from '../../components/ui.jsx';
import PressureGauge from '../../components/hq/PressureGauge.jsx';
import { inr, num } from '../../components/hq/kit.jsx';
import { WHATSAPP_ADMIN } from '../../lib/flags';

/*
 * BUSINESS HEALTH (admin revamp, 2026-10-05) — QuizPe's home, in the spirit
 * of GaadiPe's: the day at a glance as workshop pressure gauges, then the
 * numbers that say whether QuizPe is growing, and links to act on them.
 * The older dashboard is still there as "Overview".
 */
export default function Home() {
  const [d, setD] = useState(null);
  const [error, setError] = useState(null);
  // The website's figures too (2026-10-10): they stand in for the WhatsApp ones while WhatsApp is gone.
  const [w, setW] = useState(null);
  const load = useCallback(() => {
    api.hq.webOverview().then(setW).catch(() => {});
    return api.hq.home().then((x) => { setD(x); setError(null); }).catch(setError);
  }, []);
  useEffect(() => { load(); }, [load]);
  useAutoRefresh(load, 30000);
  if (error && !d) return <Page title="Business health"><ErrorBox error={error} onRetry={load} /></Page>;
  if (!d) return <Page title="Business health"><Loading /></Page>;

  const lim = d.limit || {};
  const reachPct = w && w.web_families ? Math.round((100 * (w.web_families - w.unreachable)) / w.web_families) : null;
  const tile = (label, value, sub, to) => {
    const body = (
      <div className="card h-full p-4 transition hover:shadow-lg">
        <div className="text-[11px] font-bold uppercase tracking-wide text-muted">{label}</div>
        <div className="mt-1 text-2xl font-extrabold text-ink">{value}</div>
        {sub && <div className="mt-0.5 text-[11px] text-muted">{sub}</div>}
      </div>
    );
    return to ? <Link to={to} className="block">{body}</Link> : body;
  };

  return (
    <Page title="Business health" subtitle="Today at a glance — refreshes every 30 seconds">
      <div className="card mb-4 grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 lg:grid-cols-5">
        <PressureGauge label="Quizzes finished today" danger="low" max={100}
          value={d.completion_today} text={d.completion_today == null ? undefined : `${d.completion_today}%`}
          caption={`${num(d.completed_today)} of ${num(d.quizzes_today)}${d.completion_yesterday != null ? ` · yesterday ${d.completion_yesterday}%` : ''}`} />
        <PressureGauge label="Families paying" danger="low" max={100} bands={[0.3, 0.1]}
          value={d.paying_share} text={d.paying_share == null ? undefined : `${d.paying_share}%`}
          caption={`${num(d.paying)} paying · ${num(d.on_trial)} on trial`} />
        {WHATSAPP_ADMIN ? (
          <PressureGauge label="WhatsApp limit used" max={lim.limit || 250}
            value={lim.used} text={`${num(lim.used)}`}
            caption={lim.linked ? `QuizPe ${lim.quizpe} + GaadiPe ${lim.gaadipe} of ${lim.limit}` : `QuizPe only · of ${lim.limit}`} />
        ) : (
          // How many families on the app reminders can reach (email or phone notifications).
          <PressureGauge label="Families reachable" danger="low" max={100} bands={[0.8, 0.5]}
            value={reachPct} text={reachPct == null ? undefined : `${reachPct}%`}
            caption={w ? `${num(w.web_families - w.unreachable)} of ${num(w.web_families)} on the app` : 'loading…'} />
        )}
        <PressureGauge label="Average score today" danger="low" max={100} bands={[0.6, 0.4]}
          value={d.avg_score_today} text={d.avg_score_today == null ? undefined : `${d.avg_score_today}%`} caption="of finished quizzes" />
        <PressureGauge label="Rating (30 days)" danger="low" max={5} bands={[0.8, 0.6]}
          value={d.rating_30d} text={d.rating_30d == null ? undefined : `${d.rating_30d}★`} caption="from parents' feedback" />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {tile('Families', num(d.families), `+${num(d.families_today)} today · ${num(d.children)} children`, '/parents')}
        {tile('Paying now', num(d.paying), `${num(d.on_trial)} on free trial · ${num(d.lapsed)} lapsed`, '/hot-leads')}
        {tile('Revenue today', inr(d.revenue_today), `This month ${inr(d.revenue_month)}`, '/profit')}
        {WHATSAPP_ADMIN ? tile('Chats today', num(d.chats_today), `${num(d.open_tickets)} open support ticket(s)`, '/whatsapp')
          : tile('Sign-ins today', num(w?.signins_today), `${num(w?.online_now)} on the app now · ${num(d.open_tickets)} open support ticket(s)`, '/web/sign-ins')}
        {tile('Quizzes today', num(d.quizzes_today), `${num(d.completed_today)} finished`, '/quizzes-per-child')}
        {WHATSAPP_ADMIN ? tile('Stopped messages', num(d.stopped), 'replied STOP', '/stopped')
          : tile('Visitors today', num(w?.visitors_today), `${num(w?.visits_today)} page visits`, '/visitors')}
        {WHATSAPP_ADMIN ? tile('Meta quality', d.meta?.ok ? (d.meta.quality || '—') : '—', d.meta?.ok ? `Limit ${d.meta.tier || '?'} · name ${String(d.meta.name_status || '').replace(/_/g, ' ').toLowerCase()}` : 'Meta could not be read')
          : tile('Families on the app', num(w?.web_families), `${num(w?.active_30d)} signed in this month`, '/web/families')}
        {WHATSAPP_ADMIN ? tile('Left to message today', num(lim.remaining), `${num(lim.free_for_broadcast)} free for broadcasts (keeping ${lim.reserve})`, '/broadcast')
          : tile('Cannot be reached', num(w?.unreachable), 'on the app, no email and no notifications', '/web/families?filter=unreachable')}
      </div>
      {WHATSAPP_ADMIN && (d.meta?.notes || []).length > 0 && (
        <div className="card mb-4 border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-800">
          <b>Meta says:</b> {d.meta.notes.join(' · ')}
        </div>
      )}
      <p className="text-[11px] text-muted">{WHATSAPP_ADMIN ? lim.note : 'QuizPe runs on quizpe.in/app; reminders reach families by email and phone notifications.'}</p>
    </Page>
  );
}
