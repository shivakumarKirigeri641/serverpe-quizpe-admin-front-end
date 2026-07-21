/**
 * The watch view, split into three clearly separated sections so it can be
 * read at a glance rather than scanned as one mixed list:
 *
 *   1. Quiz activity      — who is answering now, who finished, with scores
 *   2. Subscriptions      — trials and paid enrolments, with value
 *   3. Feedback & Support — ratings and tickets that may need a reply
 *
 * Each section owns its header, its own today-count, and its own scroll area,
 * so a busy stream in one never pushes the others off screen. Polls every 12
 * seconds; anything new since the last poll flashes.
 */

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';
import { Page, Loading, ErrorBox, inr } from '../components/ui.jsx';

const KIND = {
  quiz_started:   { icon: '✏️', label: 'Answering', dot: 'bg-sky-500' },
  quiz_completed: { icon: '✅', label: 'Completed', dot: 'bg-emerald-500' },
  trial:          { icon: '🎁', label: 'Trial',     dot: 'bg-amber-500' },
  paid:           { icon: '💳', label: 'Paid',      dot: 'bg-violet-500' },
  feedback:       { icon: '⭐', label: 'Feedback',  dot: 'bg-yellow-500' },
  support:        { icon: '💬', label: 'Support',   dot: 'bg-rose-500' },
};

const SECTIONS = [
  {
    id: 'quiz',
    title: 'Quiz activity',
    blurb: 'Children answering right now, and today’s finished quizzes with scores',
    icon: '📝',
    accent: 'from-emerald-500 to-teal-500',
    kinds: ['quiz_started', 'quiz_completed'],
    stat: (c) => `${c.quizzes_completed ?? 0} done · ${c.quizzes_in_progress ?? 0} in progress`,
  },
  {
    id: 'subs',
    title: 'Subscriptions',
    blurb: 'New trials and paid enrolments as they happen',
    icon: '💳',
    accent: 'from-violet-500 to-fuchsia-500',
    kinds: ['trial', 'paid'],
    stat: (c) => `${c.trials ?? 0} trial · ${c.paid ?? 0} paid today`,
  },
  {
    id: 'voice',
    title: 'Feedback & Support',
    blurb: 'Ratings parents left, and tickets waiting for a reply',
    icon: '💬',
    accent: 'from-amber-500 to-rose-500',
    kinds: ['feedback', 'support'],
    stat: (c) => `${c.feedback ?? 0} rating · ${c.support ?? 0} ticket today`,
  },
];

export default function LiveFeed() {
  const [rows, setRows] = useState(null);
  const [counts, setCounts] = useState({});
  const [error, setError] = useState('');
  const [fresh, setFresh] = useState(new Set());
  const seen = useRef(new Set());

  const keyOf = (r) => `${r.kind}:${r.ref_id}:${r.at}`;

  const load = () => api.activity({ limit: 150 })
    .then((d) => {
      const incoming = new Set(d.rows.map(keyOf));
      const firstLoad = seen.current.size === 0;
      const added = firstLoad ? new Set() : new Set([...incoming].filter((k) => !seen.current.has(k)));
      seen.current = incoming;
      setRows(d.rows); setCounts(d.counts);
      if (added.size) { setFresh(added); setTimeout(() => setFresh(new Set()), 6000); }
    })
    .catch((e) => setError(e.message));

  useEffect(() => {
    load();
    const t = setInterval(load, 12000);
    return () => clearInterval(t);
  }, []);

  if (error) return <ErrorBox error={error} onRetry={load} />;
  if (!rows) return <Loading label="Loading activity…" />;

  return (
    <Page
      title="Live activity"
      subtitle="Three streams, refreshed every 12 seconds — new entries flash green"
      actions={
        <span className="pill bg-emerald-50 text-emerald-700">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> live
        </span>
      }
    >
      <div className="space-y-4">
        {SECTIONS.map((s, i) => (
          <Section
            key={s.id} section={s} counts={counts} index={i}
            rows={rows.filter((r) => s.kinds.includes(r.kind))}
            fresh={fresh} keyOf={keyOf}
          />
        ))}
      </div>
    </Page>
  );
}

function Section({ section, rows, counts, fresh, keyOf, index }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      className="card overflow-hidden flex flex-col"
    >
      <div className={`bg-gradient-to-r ${section.accent} px-5 py-4 text-white
                       flex flex-wrap items-center gap-x-4 gap-y-2`}>
        <span className="text-2xl">{section.icon}</span>
        <div className="min-w-0">
          <h2 className="font-bold text-base leading-tight">{section.title}</h2>
          <p className="text-[11px] text-white/85 leading-snug">{section.blurb}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="pill bg-white/15 text-white font-bold">Today: {section.stat(counts)}</span>
          <span className="pill bg-white/25 text-white">{rows.length} shown</span>
        </div>
      </div>

      <div className="divide-y divide-line/70 max-h-[26rem] overflow-y-auto">
        <AnimatePresence initial={false}>
          {rows.map((r) => {
            const k = KIND[r.kind] || { icon: '•', label: r.kind, dot: 'bg-slate-400' };
            const isNew = fresh.has(keyOf(r));
            return (
              <motion.div
                key={keyOf(r)}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0, backgroundColor: isNew ? 'rgba(209,250,229,1)' : 'rgba(255,255,255,0)' }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45 }}
                className="px-4 py-3 flex items-start gap-3"
              >
                <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${k.dot}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-sm truncate">{r.who}</span>
                    <span className="text-[10px] font-bold uppercase text-muted shrink-0">{k.label}</span>
                  </div>
                  <div className="text-xs text-muted break-words">{r.detail}</div>
                  {r.parent && r.parent !== r.who && (
                    <div className="text-[11px] text-muted mt-0.5">
                      {r.parent} · {r.mobile}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  {r.amount != null && <div className="font-bold text-sm">{inr(r.amount)}</div>}
                  <div className="text-[10px] text-muted whitespace-nowrap">{r.at_ist}</div>
                  {r.parent_id && (
                    <Link to={`/parents/${r.parent_id}`}
                          className="text-[11px] text-brand-accent font-semibold">view →</Link>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {!rows.length && (
          <p className="px-4 py-10 text-center text-sm text-muted">Nothing here yet today.</p>
        )}
      </div>
    </motion.section>
  );
}
