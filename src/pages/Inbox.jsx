/**
 * Inbox — the two things the public website collects.
 *
 *   Enquiries     contact-form messages, with a one-click status workflow
 *   Testimonials  every submission, held until a human approves it
 *   Ratings       real in-app 4★/5★ comments that can be promoted to the site
 *
 * The last one matters: a review written by a parent right after a quiz is far
 * more convincing than one solicited from a marketing page, and they have
 * already said it once — no need to ask twice.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import { Page, Loading, ErrorBox, Pill } from '../components/ui.jsx';
import VisitorGroups from '../components/VisitorGroups.jsx';

const TABS = [
  ['enquiries', '📥 Enquiries'],
  ['visits', '🌐 Visitors'],
  ['testimonials', '⭐ Testimonials'],
  ['promotable', '💬 Ratings to publish'],
];

export default function Inbox() {
  const [tab, setTab] = useState('enquiries');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);

  const load = () => {
    setError(''); setData(null);
    const fn = { enquiries: api.enquiries, testimonials: api.adminTestimonials,
                 promotable: api.promotable, visits: () => api.visitorsRecent(80) }[tab];
    fn().then(setData).catch((e) => setError(e.message));
  };
  useEffect(load, [tab]);

  const act = async (fn, id) => {
    setBusy(id);
    try { await fn(); load(); }
    catch (e) { setError(e.message); }
    finally { setBusy(null); }
  };

  return (
    <Page
      title="Inbox"
      subtitle="Everything the website collects — nothing here is published without you"
      actions={
        <div className="flex gap-1">
          {TABS.map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)}
                    className={`btn text-xs px-3 py-2 ${tab === k ? 'bg-brand text-white' : 'bg-white border border-line'}`}>
              {label}
            </button>
          ))}
        </div>
      }
    >
      {error && <div className="card p-3 mb-4 bg-red-50 border-red-200 text-sm text-red-700">{error}</div>}
      {!data ? <Loading label="Loading…" /> : (
        <>
          {data.counts && (
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.entries(data.counts).map(([k, v]) => (
                <span key={k} className="pill bg-line/60 text-ink">
                  <b>{v}</b> {k}
                </span>
              ))}
            </div>
          )}

          {tab === 'enquiries' && <><Enquiries rows={data.rows} act={act} busy={busy} /><EnquiriesTable rows={data.rows} /></>}
          {tab === 'visits' && <Visitors data={data} reload={load} setError={setError} />}
          {tab === 'testimonials' && <><Testimonials rows={data.rows} act={act} busy={busy} /><TestimonialsTable rows={data.rows} /></>}
          {tab === 'promotable' && <><Promotable rows={data.rows} act={act} busy={busy} /><AllRatingsTable /></>}
        </>
      )}
    </Page>
  );
}

function Enquiries({ rows, act, busy }) {
  if (!rows.length) return <Empty>No enquiries yet.</Empty>;
  return (
    <div className="space-y-3">
      {rows.map((e, i) => (
        <motion.div key={e.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.3) }} className="card p-5">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <span className="font-mono text-sm font-bold text-brand">{e.ref_no}</span>
            <Pill tone={e.status === 'open' ? 'red' : e.status === 'handled' ? 'amber' : 'grey'}>{e.status}</Pill>
            <span className="text-xs text-muted">{(e.query_type || 'enquiry').replace(/_/g, ' ')}</span>
            <span className="text-xs text-muted ml-auto">{e.at_ist}</span>
          </div>
          <p className="text-sm whitespace-pre-wrap mb-3">{e.message}</p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
            <span className="font-semibold text-ink">{e.user_name}</span>
            <a href={`https://wa.me/91${e.mobile_number}`} target="_blank" rel="noopener noreferrer"
               className="text-brand-accent font-semibold">💬 {e.mobile_number}</a>
            {e.email && <a href={`mailto:${e.email}`} className="text-brand-accent">{e.email}</a>}
            {e.parent_id
              ? <Link to={`/parents/${e.parent_id}`} className="text-brand-accent font-semibold">
                  existing parent: {e.existing_parent} →
                </Link>
              : <span className="text-muted">not enrolled yet</span>}
            <div className="ml-auto flex gap-1">
              {['open', 'handled', 'closed'].filter((s) => s !== e.status).map((s) => (
                <button key={s} className="btn-sec text-[11px] py-1 px-2.5" disabled={busy === e.id}
                        onClick={() => act(() => api.updateEnquiry(e.id, s), e.id)}>
                  Mark {s}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function Testimonials({ rows, act, busy }) {
  if (!rows.length) return <Empty>No testimonials submitted yet.</Empty>;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {rows.map((t, i) => (
        <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.3) }}
                    className={`card p-5 ${t.is_approved ? '' : 'border-amber-300 bg-amber-50/40'}`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-brand-accent">{'★'.repeat(t.rating || 0)}</span>
            <Pill tone={t.is_approved ? 'green' : 'amber'}>{t.is_approved ? 'published' : 'pending'}</Pill>
            <span className="text-[11px] text-muted ml-auto">{t.at_ist} · {t.source}</span>
          </div>
          <blockquote className="text-sm">“{t.message}”</blockquote>
          <p className="text-xs text-muted mt-2">
            <b className="text-ink">{t.author_name}</b>
            {t.author_role ? ` · ${t.author_role}` : ''}{t.location ? ` · ${t.location}` : ''}
          </p>
          <div className="flex gap-2 mt-3 pt-3 border-t border-line">
            <button
              className={`text-xs py-1.5 ${t.is_approved
                ? 'btn text-white bg-red-600 hover:bg-red-700 border-red-600'
                : 'btn-pri'}`}
              disabled={busy === t.id}
              onClick={() => act(() => api.updateTestimonial(t.id, { is_approved: !t.is_approved }), t.id)}>
              {t.is_approved ? 'Unpublish' : '✓ Approve & publish'}
            </button>
            <button className="btn-sec text-xs py-1.5 text-red-600 border-red-200" disabled={busy === t.id}
                    onClick={() => {
                      if (confirm('Hide this testimonial? It will not appear anywhere.')) {
                        act(() => api.updateTestimonial(t.id, { is_active: false }), t.id);
                      }
                    }}>
              Hide
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function Promotable({ rows, act, busy }) {
  if (!rows.length) {
    return <Empty>No 4★ or 5★ ratings with a written comment yet. They appear here as parents leave them.</Empty>;
  }
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {rows.map((f, i) => (
        <motion.div key={f.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.3) }} className="card p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-brand-accent">{'★'.repeat(f.rating)}</span>
            <span className="text-[11px] text-muted ml-auto">{f.at_ist}</span>
          </div>
          <blockquote className="text-sm">“{f.message}”</blockquote>
          <p className="text-xs text-muted mt-2">
            <b className="text-ink">{f.parent_name}</b>
            {f.student_name ? ` · parent of ${f.student_name}` : ''}{f.state_code ? ` · ${f.state_code}` : ''}
          </p>
          {f.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {f.tags.map((t) => <span key={t} className="pill bg-line/60 text-muted">{t}</span>)}
            </div>
          )}
          <button className="btn-pri text-xs py-1.5 mt-3 w-full" disabled={busy === f.id}
                  onClick={() => act(() => api.promoteFeedback(f.id), f.id)}>
            Use as a website testimonial
          </button>
          <p className="text-[10px] text-muted mt-2">
            Added as a draft — you still approve it before it appears.
          </p>
        </motion.div>
      ))}
    </div>
  );
}

/**
 * Website visitors. The switch decides whether visits fill this Inbox at all —
 * default on. Off keeps the Inbox quiet while the Visitors page keeps counting.
 */
function Visitors({ data, reload, setError }) {
  const [saving, setSaving] = useState(false);
  const [grouped, setGrouped] = useState(null);
  const [page, setPage] = useState(0);
  const on = data.inbox_on;

  useEffect(() => {
    if (on) api.visitorsGrouped('all').then((d) => setGrouped(d.grouped)).catch(() => {});
  }, [on]);

  // Client-side pagination — clamped so the 30s refresh never bumps the page.
  const PAGE = 15;
  const rows = data.rows || [];
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const cur = Math.min(page, pages - 1);
  const slice = rows.slice(cur * PAGE, cur * PAGE + PAGE);
  const toggle = async () => {
    setSaving(true);
    try { await api.setVisitorsInbox(!on); reload(); }
    catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };
  return (
    <>
      <div className="card p-4 mb-4 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-bold text-brand text-sm">Show website visits in this Inbox</p>
          <p className="text-xs text-muted mt-0.5">
            When on, every visit to quizpe.in appears below. Turn it off to keep the Inbox quiet —
            visits are still counted on the <Link to="/visitors" className="text-brand-accent font-semibold">Visitors</Link> page.
          </p>
        </div>
        <button onClick={toggle} disabled={saving} aria-pressed={on}
                className={`relative w-12 h-7 rounded-full shrink-0 transition ${on ? 'bg-brand-accent' : 'bg-line'}`}>
          <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : ''}`} />
        </button>
      </div>

      {on && grouped && (
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted mb-2">Grouped by period</p>
          <VisitorGroups grouped={grouped} variant="table" />
        </div>
      )}

      {!on ? (
        <Empty>Visitor feed is off. Turn the switch on to see visits here — they’re still tracked under Visitors.</Empty>
      ) : !rows.length ? (
        <Empty>No visits yet. They appear here as people open quizpe.in.</Empty>
      ) : (
        <div className="space-y-2">
          {slice.map((v, i) => (
            <motion.div key={v.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.02, 0.3) }}
                        className="card p-3">
              <div className="flex items-center gap-3 text-sm">
                <span className={`w-2 h-2 rounded-full shrink-0 ${v.kind === 'wa_click' ? 'bg-emerald-500' : 'bg-sky-400'}`} />
                <span className="font-semibold shrink-0">
                  {v.kind === 'wa_click' ? '💬 Tapped WhatsApp' : 'Viewed page'}
                </span>
                <span className="text-muted truncate">{v.path || '/'}</span>
                <span className="text-xs text-muted ml-auto whitespace-nowrap">{v.at_ist}</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 pl-5 text-[11px] text-muted">
                <span>🖥 {v.device || '—'}</span>
                <span>📍 {[v.city, v.state || v.region, v.country].filter(Boolean).join(', ') || 'unknown'}</span>
                <span>🌐 {v.ip || '—'}</span>
                {v.referrer && <span>↩ {prettyRef(v.referrer)}</span>}
                {v.session_id && <span className="font-mono">id: {v.session_id.slice(0, 8)}</span>}
              </div>
            </motion.div>
          ))}
          {pages > 1 && (
            <div className="flex items-center justify-between pt-2 text-sm">
              <span className="text-muted">{cur * PAGE + 1}–{Math.min((cur + 1) * PAGE, rows.length)} of {rows.length}</span>
              <div className="flex gap-2 items-center">
                <button className="btn-sec" disabled={cur === 0} onClick={() => setPage(cur - 1)}>← Previous</button>
                <span className="text-muted">Page {cur + 1} / {pages}</span>
                <button className="btn-sec" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}>Next →</button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

/* ---- "all items" grids shown under the action cards, with a Status column -- */
function StatusFilter({ options, value, onChange }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {options.map(([key, label, n]) => (
        <button key={key} onClick={() => onChange(key)}
          className={`text-[11px] px-2.5 py-1 rounded-full border transition ${
            value === key ? 'bg-brand text-white border-brand' : 'bg-white border-line text-muted hover:text-ink'}`}>
          {label}{n != null ? ` (${n})` : ''}
        </button>
      ))}
    </div>
  );
}

const hit = (q, ...vals) => !q || vals.some((v) => String(v ?? '').toLowerCase().includes(q.toLowerCase()));

function SearchBox({ value, onChange }) {
  return (
    <input className="input text-xs py-1 max-w-[11rem]" placeholder="🔍 Search…"
           value={value} onChange={(e) => onChange(e.target.value)} />
  );
}

function GridBlock({ title, head, children, right }) {
  return (
    <div className="mt-5">
      <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
        <p className="text-xs font-bold uppercase tracking-wide text-muted">{title}</p>
        {right}
      </div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead><tr>{head.map((h, i) => <th key={i} className="th">{h}</th>)}</tr></thead>
            <tbody>{children}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const Empty2 = (n) => <tr><td className="td text-center text-muted" colSpan={n}>Nothing with that status.</td></tr>;

function EnquiriesTable({ rows }) {
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  if (!rows?.length) return null;
  const tone = (s) => (s === 'open' ? 'red' : s === 'handled' ? 'amber' : 'grey');
  const n = (s) => rows.filter((r) => r.status === s).length;
  const opts = [['all', 'All', rows.length], ['open', 'Open', n('open')], ['handled', 'Handled', n('handled')], ['closed', 'Closed', n('closed')]];
  const shown = rows.filter((r) => (filter === 'all' || r.status === filter)
    && hit(q, r.ref_no, r.user_name, r.mobile_number, r.query_type, r.message, r.email));
  return (
    <GridBlock title="All enquiries" head={['Date', 'Ref', 'Name', 'Mobile', 'Type', 'Status']}
               right={<div className="flex gap-2 items-center flex-wrap"><SearchBox value={q} onChange={setQ} /><StatusFilter options={opts} value={filter} onChange={setFilter} /></div>}>
      {shown.map((e) => (
        <tr key={e.id} className="hover:bg-line/30 transition">
          <td className="td text-xs whitespace-nowrap text-muted">{e.at_ist}</td>
          <td className="td font-mono text-xs">{e.ref_no}</td>
          <td className="td text-xs font-semibold">{e.user_name}</td>
          <td className="td text-xs">{e.mobile_number}</td>
          <td className="td text-xs">{(e.query_type || 'enquiry').replace(/_/g, ' ')}</td>
          <td className="td"><Pill tone={tone(e.status)}>{e.status}</Pill></td>
        </tr>
      ))}
      {!shown.length && Empty2(6)}
    </GridBlock>
  );
}

function TestimonialsTable({ rows }) {
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  if (!rows?.length) return null;
  const st = (t) => (t.is_approved ? 'published' : 'pending');
  const n = (s) => rows.filter((r) => st(r) === s).length;
  const opts = [['all', 'All', rows.length], ['published', 'Published', n('published')], ['pending', 'Pending', n('pending')]];
  const shown = rows.filter((r) => (filter === 'all' || st(r) === filter)
    && hit(q, r.author_name, r.location, r.message, r.source));
  return (
    <GridBlock title="All testimonials" head={['Date', 'Author', 'Rating', 'Source', 'Status']}
               right={<div className="flex gap-2 items-center flex-wrap"><SearchBox value={q} onChange={setQ} /><StatusFilter options={opts} value={filter} onChange={setFilter} /></div>}>
      {shown.map((t) => (
        <tr key={t.id} className="hover:bg-line/30 transition">
          <td className="td text-xs whitespace-nowrap text-muted">{t.at_ist}</td>
          <td className="td text-xs font-semibold">
            {t.author_name}{t.location ? <span className="text-muted font-normal"> · {t.location}</span> : ''}
          </td>
          <td className="td text-brand-accent text-xs whitespace-nowrap">{'★'.repeat(t.rating || 0)}</td>
          <td className="td text-xs">{t.source || '—'}</td>
          <td className="td"><Pill tone={t.is_approved ? 'green' : 'amber'}>{t.is_approved ? 'published' : 'pending'}</Pill></td>
        </tr>
      ))}
      {!shown.length && Empty2(5)}
    </GridBlock>
  );
}

const RATING_STATUS = {
  published: ['green', 'Published'], pending: ['amber', 'Draft (pending)'],
  publishable: ['blue', 'Ready to publish'], not_eligible: ['grey', 'Not eligible'],
};
function AllRatingsTable() {
  const [rows, setRows] = useState(null);
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  useEffect(() => { api.feedbackAllRatings().then((d) => setRows(d.rows)).catch(() => setRows([])); }, []);
  if (!rows?.length) return null;
  const n = (s) => rows.filter((r) => r.status === s).length;
  const opts = [
    ['all', 'All', rows.length],
    ['publishable', 'Ready', n('publishable')],
    ['pending', 'Draft', n('pending')],
    ['published', 'Published', n('published')],
    ['not_eligible', 'Not eligible', n('not_eligible')],
  ];
  const shown = rows.filter((r) => (filter === 'all' || r.status === filter)
    && hit(q, r.parent_name, r.student_name, r.message, r.state_code));
  return (
    <GridBlock title="All ratings" head={['Date', 'Parent', 'Child', 'Rating', 'Comment', 'Status']}
               right={<div className="flex gap-2 items-center flex-wrap"><SearchBox value={q} onChange={setQ} /><StatusFilter options={opts} value={filter} onChange={setFilter} /></div>}>
      {shown.map((f) => {
        const [tone, label] = RATING_STATUS[f.status] || ['grey', f.status];
        return (
          <tr key={f.id} className="hover:bg-line/30 transition">
            <td className="td text-xs whitespace-nowrap text-muted">{f.at_ist}</td>
            <td className="td text-xs font-semibold">
              {f.parent_name}{f.state_code ? <span className="text-muted font-normal"> · {f.state_code}</span> : ''}
            </td>
            <td className="td text-xs">{f.student_name || '—'}</td>
            <td className="td text-brand-accent text-xs whitespace-nowrap">{'★'.repeat(f.rating || 0)}</td>
            <td className="td text-xs text-muted max-w-[16rem] truncate">{f.message || '—'}</td>
            <td className="td"><Pill tone={tone}>{label}</Pill></td>
          </tr>
        );
      })}
      {!shown.length && Empty2(6)}
    </GridBlock>
  );
}

const prettyRef = (s) => {
  if (!s) return '';
  try { return new URL(s).hostname.replace(/^www\./, ''); } catch { return s; }
};

const Empty = ({ children }) => (
  <div className="card p-12 text-center text-muted text-sm">{children}</div>
);
