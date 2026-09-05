/**
 * Visitors — first-party analytics for the marketing site (quizpe.in).
 *
 * All numbers are windowed from the launch date (server-enforced), so the
 * charts show real growth and not pre-launch test traffic. Refreshes on a
 * timer like the other live views. GA4 (via GTM) still holds the deep
 * geography/funnel reports; this is the at-a-glance panel + WhatsApp-intent.
 */
import { useEffect, useState } from 'react';
import { Page, Loading, ErrorBox, Stat } from '../components/ui.jsx';
import VisitorGroups from '../components/VisitorGroups.jsx';
import IndiaHeat from '../components/IndiaHeat.jsx';
import { api } from '../lib/api';

const fmtDay = (d) => {
  const dt = new Date(d);
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

export default function Visitors() {
  const [a, setA] = useState(null);
  const [grouped, setGrouped] = useState(null);
  const [recent, setRecent] = useState(null);
  const [geo, setGeo] = useState(null);
  const [error, setError] = useState('');

  // Core analytics decides the page; the extra panels each fail on their own so
  // one bad query can never blank the whole page.
  const load = () => {
    api.visitors().then((an) => { setA(an.analytics); setError(''); }).catch((e) => setError(e.message));
    api.visitorsGrouped('all').then((d) => setGrouped(d.grouped)).catch(() => setGrouped(null));
    api.visitorsRecent(200).then((d) => setRecent(d.rows)).catch(() => setRecent([]));
    api.visitorsGeo().then((d) => setGeo(d.geo)).catch(() => setGeo(null));
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  if (error) return <ErrorBox error={error} onRetry={load} />;
  if (!a) return <Loading label="Loading visitor analytics…" />;

  const t = a.totals, td = a.today_stats, wk = a.week;
  const launch = new Date(a.launch_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <Page
      title="Visitors"
      subtitle={`Traffic to quizpe.in since launch (${launch}) · refreshes every 30 seconds`}
      actions={
        <span className="pill bg-emerald-50 text-emerald-700">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> live
        </span>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Stat index={0} label="Views today" value={td.views}
              delta={td.vs_yesterday_pct} sub="vs yesterday" />
        <Stat index={1} label="Visitors today" value={td.uniques}
              delta={td.uniques_vs_yesterday_pct} sub="vs yesterday" />
        <Stat index={2} label="WhatsApp clicks today" value={td.wa_clicks} tone="ink"
              delta={td.wa_vs_yesterday_pct} sub="vs yesterday" />
        <Stat index={3} label="Views this week" value={wk.views}
              delta={wk.change_pct} sub="vs previous week" />
        <Stat index={4} label="Total views" value={t.views}
              sub={`${t.uniques} unique · since launch`} />
        <Stat index={5} label="WhatsApp clicks" value={t.wa_clicks} tone="ink"
              sub={`${t.conversion_pct}% of views`} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mt-4">
        <div className="card p-5 lg:col-span-2">
          <h2 className="font-bold text-brand mb-3">Daily views</h2>
          <DailyChart daily={a.daily} />
        </div>

        <div className="card p-5">
          <h2 className="font-bold text-brand mb-3">Traffic sources</h2>
          {!(a.sources && a.sources.length) ? (
            <p className="text-sm text-muted">No traffic yet.</p>
          ) : (
            <ul className="space-y-2.5">
              {a.sources.map((s) => (
                <li key={s.source} className="text-sm">
                  <div className="flex items-center justify-between">
                    <span className="truncate text-ink">{s.source}</span>
                    <span className="font-bold text-brand ml-3 whitespace-nowrap">
                      {s.views}
                      {s.today ? <span className="text-muted font-normal"> · {s.today} today</span> : null}
                      {s.today_vs_yesterday_pct != null && (
                        <span className={`ml-1 font-semibold ${s.today_vs_yesterday_pct >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {s.today_vs_yesterday_pct >= 0 ? '▲' : '▼'}{Math.abs(s.today_vs_yesterday_pct)}%
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 rounded bg-line overflow-hidden">
                    <div className="h-full bg-brand" style={{ width: `${Math.max(3, s.pct)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 pt-4 border-t border-line grid grid-cols-2 gap-3 text-center">
            <div>
              <p className="text-2xl font-black text-brand">{t.india_pct}%</p>
              <p className="text-[11px] font-bold uppercase text-muted">from India</p>
            </div>
            <div>
              <p className="text-2xl font-black text-brand">{t.conversion_pct}%</p>
              <p className="text-[11px] font-bold uppercase text-muted">tap WhatsApp</p>
            </div>
          </div>
        </div>
      </div>

      {/* India heatmap — where visitors and families are */}
      <h2 className="font-bold text-brand mt-6 mb-3">India heatmap · by state / UT</h2>
      <IndiaHeat geo={geo} />

      {/* Grouped by time — device / state·UT / place / country breakdowns */}
      <h2 className="font-bold text-brand mt-6 mb-3">Visitors by period</h2>
      {grouped ? <VisitorGroups grouped={grouped} variant="table" /> : <div className="card p-6 text-sm text-muted">Loading…</div>}

      {/* Every recent visit with its full detail */}
      <div className="flex items-center justify-between mt-6 mb-3">
        <h2 className="font-bold text-brand">Recent visitors</h2>
        <span className="pill bg-emerald-50 text-emerald-700">
          {td.views + td.wa_clicks} today · {td.uniques} unique
        </span>
      </div>
      <VisitorTable rows={recent} />
    </Page>
  );
}

/** Detailed per-visit table with pagination: time, kind, device, place, state, IP. */
function VisitorTable({ rows }) {
  const PAGE = 15;
  const [page, setPage] = useState(0);
  if (!rows) return <div className="card p-6 text-sm text-muted">Loading…</div>;
  if (!rows.length) return <div className="card p-8 text-center text-sm text-muted">No visits recorded yet.</div>;

  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const cur = Math.min(page, pages - 1);       // clamp — never resets on refresh
  const start = cur * PAGE;
  const slice = rows.slice(start, start + PAGE);
  const head = ['When', 'Action', 'Device', 'Place', 'State / UT', 'Country', 'IP address', 'Came via'];

  return (
    <>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead><tr>{head.map((h, i) => <th key={i} className="th">{h}</th>)}</tr></thead>
            <tbody>
              {slice.map((v) => (
                <tr key={v.id} className="hover:bg-line/30 transition">
                  <td className="td text-xs whitespace-nowrap text-muted">{v.at_ist}</td>
                  <td className="td">
                    <span className={`pill ${v.kind === 'wa_click' ? 'bg-emerald-50 text-emerald-700' : 'bg-sky-50 text-sky-700'}`}>
                      {v.kind === 'wa_click' ? '💬 WhatsApp' : 'View'}
                    </span>
                  </td>
                  <td className="td text-xs">{v.device || '—'}</td>
                  <td className="td text-xs">{v.city || '—'}</td>
                  <td className="td text-xs">{v.state || '—'}</td>
                  <td className="td text-xs">{v.country || '—'}</td>
                  <td className="td text-xs font-mono">{v.ip || '—'}</td>
                  <td className="td text-xs text-muted max-w-[12rem] truncate">{prettyRef(v.referrer) || 'direct'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between mt-3 text-sm">
          <span className="text-muted">{start + 1}–{Math.min(start + PAGE, total)} of {total}</span>
          <div className="flex gap-2">
            <button className="btn-sec" disabled={cur === 0}
                    onClick={() => setPage(cur - 1)}>← Previous</button>
            <span className="text-muted self-center">Page {cur + 1} / {pages}</span>
            <button className="btn-sec" disabled={cur >= pages - 1}
                    onClick={() => setPage(cur + 1)}>Next →</button>
          </div>
        </div>
      )}
    </>
  );
}

function prettyRef(s) {
  if (!s || s === 'direct') return 'Direct / WhatsApp share';
  try { return new URL(s).hostname.replace(/^www\./, ''); } catch { return s; }
}

/** A compact bar chart: views as bars, WhatsApp taps stacked on top with a
 *  visible count under each day, plus a total. */
function DailyChart({ daily }) {
  if (!daily?.length) return <p className="text-sm text-muted py-8 text-center">No visits recorded yet.</p>;
  const max = Math.max(1, ...daily.map((d) => d.views));
  // A "05 Sep" label is ~34px wide at 10px, so a 16px column made the dates
  // overlap into an unreadable smear. The floor is now wide enough for a
  // 45°-rotated label, and the row scrolls sideways rather than compressing.
  const H = 160, barW = Math.min(46, Math.max(26, Math.floor(760 / daily.length) - 8));
  const waTotal = daily.reduce((s, d) => s + (d.wa || 0), 0);
  return (
    <div>
      {/* legend + total taps */}
      <div className="flex items-center gap-4 mb-3 text-[11px] text-muted">
        <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-brand-accent/85" /> Views</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-emerald-500" /> WhatsApp taps</span>
        <span className="ml-auto font-semibold text-emerald-600">💬 {waTotal} taps in this period</span>
      </div>
      <div className="overflow-x-auto">
        {/* pt-6 gives the value labels that sit above each bar room, so they
            never ride up into the legend or the card's top border */}
        <div className="flex items-end gap-2 pt-6" style={{ minHeight: H + 50 }}>
          {daily.map((d) => {
            const h = Math.round((d.views / max) * H);
            const waH = d.views ? Math.round((d.wa / max) * H) : 0;
            return (
              <div key={d.day} className="flex flex-col items-center shrink-0" style={{ width: barW }}>
                <div className="relative w-full flex flex-col justify-end" style={{ height: H }}>
                  {d.views > 0 && (
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-muted">
                      {d.views}
                    </span>
                  )}
                  <div className="w-full rounded-t bg-brand-accent/85" style={{ height: h || 2 }} />
                  {waH > 0 && <div className="w-full bg-emerald-500" style={{ height: waH }} title={`${d.wa} WhatsApp taps`} />}
                </div>
                {/* Rotated so a full date fits under a narrow bar. The fixed
                    height reserves room for the diagonal, so the tap count
                    below still lines up across every column. */}
                <span className="h-9 w-full flex justify-center items-start overflow-visible">
                  <span
                    className="text-[10px] text-muted whitespace-nowrap origin-top-right -rotate-45 mt-1"
                    style={{ transformOrigin: '100% 0' }}
                  >{fmtDay(d.day)}</span>
                </span>
                {/* visible WhatsApp tap count for the day */}
                <span className={`text-[10px] font-bold whitespace-nowrap ${d.wa > 0 ? 'text-emerald-600' : 'text-transparent'}`}>
                  💬 {d.wa || 0}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
