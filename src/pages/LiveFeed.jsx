/**
 * The watch view: one live stream of everything happening — quizzes being
 * answered and finished, trial and paid enrolments, feedback ratings and
 * support tickets.
 *
 * Polls every 12 seconds and flashes anything that arrived since the last
 * poll, so you can leave it open on a second screen and see the evening
 * happen.
 */

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';
import { Page, Loading, ErrorBox, inr } from '../components/ui.jsx';

const KINDS = {
  quiz_started:   { icon: '✏️', label: 'Answering',  tone: 'bg-sky-50 text-sky-700 border-sky-200' },
  quiz_completed: { icon: '✅', label: 'Completed',  tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  trial:          { icon: '🎁', label: 'Trial',      tone: 'bg-amber-50 text-amber-800 border-amber-200' },
  paid:           { icon: '💳', label: 'Paid',       tone: 'bg-violet-50 text-violet-700 border-violet-200' },
  feedback:       { icon: '⭐', label: 'Feedback',   tone: 'bg-yellow-50 text-yellow-800 border-yellow-200' },
  support:        { icon: '💬', label: 'Support',    tone: 'bg-rose-50 text-rose-700 border-rose-200' },
};
const FILTERS = ['all', ...Object.keys(KINDS)];

export default function LiveFeed() {
  const [rows, setRows] = useState(null);
  const [counts, setCounts] = useState({});
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');
  const [fresh, setFresh] = useState(new Set());
  const seen = useRef(new Set());

  const load = () => api.activity({ limit: 120, kinds: filter === 'all' ? null : [filter] })
    .then((d) => {
      const key = (r) => `${r.kind}:${r.ref_id}:${r.at}`;
      const incoming = new Set(d.rows.map(key));
      const firstLoad = seen.current.size === 0;
      const added = firstLoad ? new Set() : new Set([...incoming].filter((k) => !seen.current.has(k)));
      seen.current = incoming;
      setRows(d.rows); setCounts(d.counts);
      if (added.size) { setFresh(added); setTimeout(() => setFresh(new Set()), 6000); }
    })
    .catch((e) => setError(e.message));

  useEffect(() => {
    seen.current = new Set();          // switching filter shouldn't flash everything
    load();
    const t = setInterval(load, 12000);
    return () => clearInterval(t);
  }, [filter]);

  if (error) return <ErrorBox error={error} onRetry={load} />;
  if (!rows) return <Loading label="Loading activity…" />;

  const tiles = [
    ['Quizzes done', counts.quizzes_completed, '✅'],
    ['In progress', counts.quizzes_in_progress, '✏️'],
    ['Trials', counts.trials, '🎁'],
    ['Paid', counts.paid, '💳'],
    ['Feedback', counts.feedback, '⭐'],
    ['Support', counts.support, '💬'],
  ];

  return (
    <Page
      title="Live activity"
      subtitle="Everything as it happens — refreshes every 12 seconds"
      actions={<span className="pill bg-emerald-50 text-emerald-700">● live</span>}
    >
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        {tiles.map(([label, n, icon], i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }} className="card p-3 text-center">
            <div className="text-lg">{icon}</div>
            <div className="text-2xl font-extrabold text-brand">{n ?? 0}</div>
            <div className="text-[10px] uppercase font-bold text-muted">{label}</div>
          </motion.div>
        ))}
      </div>

      <div className="flex gap-1 flex-wrap mb-4">
        {FILTERS.map((k) => (
          <button key={k} onClick={() => setFilter(k)}
                  className={`btn text-xs px-3 py-1.5 ${filter === k ? 'bg-brand text-white' : 'bg-white border border-line'}`}>
            {k === 'all' ? 'Everything' : `${KINDS[k].icon} ${KINDS[k].label}`}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {rows.map((r) => {
            const k = KINDS[r.kind] || { icon: '•', label: r.kind, tone: 'bg-line/40 text-muted border-line' };
            const isNew = fresh.has(`${r.kind}:${r.ref_id}:${r.at}`);
            return (
              <motion.div
                key={`${r.kind}-${r.ref_id}-${r.at}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0, boxShadow: isNew ? '0 0 0 3px rgba(16,185,129,.35)' : '0 0 0 0 rgba(0,0,0,0)' }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className={`card p-3 flex items-center gap-3 border-l-4 ${k.tone}`}
              >
                <span className="text-lg">{k.icon}</span>
                <span className="text-[11px] font-bold uppercase w-20 shrink-0">{k.label}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm truncate">
                    {r.who}
                    {r.parent && r.parent !== r.who && (
                      <span className="text-muted font-normal"> · {r.parent}</span>
                    )}
                  </div>
                  <div className="text-xs text-muted truncate">{r.detail}</div>
                </div>
                {r.amount != null && <span className="font-bold text-sm">{inr(r.amount)}</span>}
                <span className="text-[11px] text-muted whitespace-nowrap">{r.at_ist}</span>
                {r.parent_id && (
                  <Link to={`/parents/${r.parent_id}`} className="text-xs text-brand-accent font-semibold">
                    view →
                  </Link>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
        {!rows.length && (
          <div className="card p-10 text-center text-muted text-sm">
            Nothing yet for this filter.
          </div>
        )}
      </div>
    </Page>
  );
}
