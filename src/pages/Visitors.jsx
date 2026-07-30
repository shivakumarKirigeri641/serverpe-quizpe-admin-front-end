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
        <Stat index={1} label="Visitors today" value={td.uniques} sub="unique browsers" />
        <Stat index={2} label="WhatsApp clicks today" value={td.wa_clicks} tone="ink" />
        <Stat index={3} label="Views this week" value={wk.views}
              delta={wk.change_pct} sub="vs previous week" />
        <Stat index={4} label="Total views" value={t.views}
              sub={`${t.uniques} unique · since launch`} />
        <Stat index={5} label="WhatsApp clicks" value={t.wa_clicks} tone="ink"
              sub={`${t.conversion_pct}% of views`} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mt-4">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-brand">Daily views</h2>
            <span className="text-xs text-muted">green = WhatsApp clicks</span>
          </div>
          <DailyChart daily={a.daily} />
        </div>

        <div className="card p-5">
          <h2 className="font-bold text-brand mb-3">Where they come from</h2>
          {!a.referrers.length ? (
            <p className="text-sm text-muted">No traffic yet.</p>
          ) : (
            <ul className="space-y-2">
              {a.referrers.map((r) => (
                <li key={r.source} className="flex items-center justify-between text-sm">
                  <span className="truncate text-ink">{prettyRef(r.source)}</span>
                  <span className="font-bold text-brand ml-3">{r.n}</span>
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
      <h2 className="font-bold text-brand mt-6 mb-3">Recent visitors</h2>
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

/** A compact SVG bar chart: views as bars, WhatsApp clicks stacked on top. */
function DailyChart({ daily }) {
  if (!daily?.length) return <p className="text-sm text-muted py-8 text-center">No visits recorded yet.</p>;
  const max = Math.max(1, ...daily.map((d) => d.views));
  const H = 160, barW = Math.min(46, Math.max(14, Math.floor(760 / daily.length) - 8));
  return (
    <div className="overflow-x-auto">
      <div className="flex items-end gap-2" style={{ minHeight: H + 28 }}>
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
                {waH > 0 && <div className="w-full bg-emerald-500" style={{ height: waH }} title={`${d.wa} WhatsApp clicks`} />}
              </div>
              <span className="text-[10px] text-muted mt-1 whitespace-nowrap">{fmtDay(d.day)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
