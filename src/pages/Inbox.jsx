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

          {tab === 'enquiries' && <Enquiries rows={data.rows} act={act} busy={busy} />}
          {tab === 'visits' && <Visitors data={data} reload={load} setError={setError} />}
          {tab === 'testimonials' && <Testimonials rows={data.rows} act={act} busy={busy} />}
          {tab === 'promotable' && <Promotable rows={data.rows} act={act} busy={busy} />}
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
            <span className="text-xs text-muted">{e.query_type.replace(/_/g, ' ')}</span>
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
            <button className="btn-pri text-xs py-1.5" disabled={busy === t.id}
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
  const on = data.inbox_on;
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

      {!on ? (
        <Empty>Visitor feed is off. Turn the switch on to see visits here — they’re still tracked under Visitors.</Empty>
      ) : !data.rows.length ? (
        <Empty>No visits yet. They appear here as people open quizpe.in.</Empty>
      ) : (
        <div className="space-y-2">
          {data.rows.map((v, i) => (
            <motion.div key={v.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.02, 0.3) }}
                        className="card p-3 flex items-center gap-3 text-sm">
              <span className={`w-2 h-2 rounded-full shrink-0 ${v.kind === 'wa_click' ? 'bg-emerald-500' : 'bg-sky-400'}`} />
              <span className="font-semibold shrink-0">
                {v.kind === 'wa_click' ? 'Tapped WhatsApp' : 'Viewed page'}
              </span>
              <span className="text-muted truncate">{v.path || '/'}</span>
              <span className="text-xs text-muted ml-auto whitespace-nowrap">
                {[v.city, v.country].filter(Boolean).join(', ') || '—'} · {v.at_ist}
              </span>
            </motion.div>
          ))}
        </div>
      )}
    </>
  );
}

const Empty = ({ children }) => (
  <div className="card p-12 text-center text-muted text-sm">{children}</div>
);
