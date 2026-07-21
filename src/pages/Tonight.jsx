/**
 * Tonight — a per-student status board for today's quiz.
 *
 * This is a STATE view, deliberately different from Live activity (which is an
 * event history). The question it answers is "where is every child right now":
 * who is mid-quiz, who finished, who was sent a quiz and hasn't touched it.
 *
 * States, and why they are distinct:
 *   waiting      quiz time hasn't arrived — normal, nothing to do
 *   ready        quiz built and waiting to be opened
 *   in_progress  answering now, with a live progress bar
 *   completed    finished, with score
 *   partial      ran out of time with some answered (closed at the cut-off)
 *   skipped      sent, never touched — the one worth chasing
 */

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import { AnimatePresence } from 'framer-motion';
import { Page, Loading, ErrorBox } from '../components/ui.jsx';
import ReportPreview from '../components/ReportPreview.jsx';

const STATE = {
  in_progress: { label: 'Answering now', tone: 'border-sky-300 bg-sky-50',      chip: 'bg-sky-500',     icon: '✏️', order: 0 },
  completed:   { label: 'Completed',     tone: 'border-emerald-300 bg-emerald-50', chip: 'bg-emerald-500', icon: '✅', order: 1 },
  partial:     { label: 'Partly done',   tone: 'border-orange-300 bg-orange-50', chip: 'bg-orange-500',  icon: '⏳', order: 2 },
  skipped:     { label: 'Skipped',       tone: 'border-red-300 bg-red-50',       chip: 'bg-red-500',     icon: '🚫', order: 3 },
  not_started: { label: 'Not started',   tone: 'border-amber-300 bg-amber-50',   chip: 'bg-amber-500',   icon: '⌛', order: 4 },
  ready:       { label: 'Ready',         tone: 'border-line bg-white',           chip: 'bg-slate-400',   icon: '📩', order: 5 },
  waiting:     { label: 'Waiting',       tone: 'border-line bg-white',           chip: 'bg-slate-300',   icon: '🕐', order: 6 },
};

export default function Tonight() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [changed, setChanged] = useState(new Set());
  const [preview, setPreview] = useState(null);
  const prev = useRef(new Map());

  const load = () => api.tonight()
    .then((d) => {
      // highlight anyone whose state moved since the last poll
      const moved = new Set();
      d.rows.forEach((r) => {
        const before = prev.current.get(r.student_id);
        if (before && before !== r.state) moved.add(r.student_id);
        prev.current.set(r.student_id, r.state);
      });
      setRows(d.rows);
      if (moved.size) { setChanged(moved); setTimeout(() => setChanged(new Set()), 8000); }
    })
    .catch((e) => setError(e.message));

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, []);

  if (error) return <ErrorBox error={error} onRetry={load} />;
  if (!rows) return <Loading label="Loading tonight…" />;

  const by = (s) => rows.filter((r) => r.state === s).length;
  const sorted = [...rows].sort((a, b) =>
    (STATE[a.state]?.order ?? 9) - (STATE[b.state]?.order ?? 9) ||
    a.student_name.localeCompare(b.student_name));

  const summary = [
    ['in_progress', 'Answering'], ['completed', 'Completed'], ['partial', 'Partly done'],
    ['skipped', 'Skipped'], ['not_started', 'Not started'], ['waiting', 'Waiting'],
  ].filter(([s]) => by(s) > 0);

  return (
    <Page
      title="Tonight"
      subtitle={`${rows.length} child${rows.length === 1 ? '' : 'ren'} on an active plan · refreshes every 10 seconds`}
      actions={
        <span className="pill bg-emerald-50 text-emerald-700">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> live
        </span>
      }
    >
      {/* one line telling you the shape of the evening */}
      <div className="card p-4 mb-4 flex flex-wrap gap-2">
        {summary.length ? summary.map(([s, label]) => (
          <span key={s} className="pill bg-line/50 text-ink">
            <span className={`w-2 h-2 rounded-full ${STATE[s].chip}`} />
            {by(s)} {label}
          </span>
        )) : <span className="text-sm text-muted">No children on an active plan.</span>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((r, i) => {
          const st = STATE[r.state] || STATE.waiting;
          const total = r.question_count || r.score_total || 10;
          const pct = r.state === 'in_progress' ? Math.round((r.answered / total) * 100) : null;
          return (
            <motion.div
              key={r.student_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{
                opacity: 1, y: 0,
                boxShadow: changed.has(r.student_id)
                  ? '0 0 0 3px rgba(16,185,129,.45)' : '0 1px 3px rgba(16,24,40,.06)',
              }}
              transition={{ delay: Math.min(i * 0.04, 0.4), duration: 0.35 }}
              className={`rounded-2xl border-2 p-4 ${st.tone}`}
            >
              <div className="flex items-start gap-2 mb-2">
                <span className="text-lg">{st.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-bold truncate">{r.student_name}</div>
                  <div className="text-[11px] text-muted truncate">
                    {r.board_code} · {r.grade_name}{r.school_name ? ` · ${r.school_name}` : ''}
                  </div>
                </div>
                <span className={`pill text-white ${st.chip}`}>{st.label}</span>
              </div>

              {r.state === 'in_progress' && (
                <>
                  <div className="h-2 rounded-full bg-white/70 overflow-hidden mb-1">
                    <motion.div className="h-full bg-sky-500"
                                animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} />
                  </div>
                  <p className="text-xs font-semibold text-sky-800">
                    {r.answered} of {total} answered
                  </p>
                </>
              )}

              {(r.state === 'completed' || r.state === 'partial') && r.score_total && (
                <p className="text-lg font-extrabold text-emerald-700">
                  {r.score_correct}/{r.score_total}
                  <span className="text-sm font-bold text-muted ml-1">({r.score_pct}%)</span>
                  {r.grade && <span className="ml-2 text-sm">Grade {r.grade}</span>}
                </p>
              )}

              {r.state === 'skipped' && (
                <p className="text-xs text-red-700 font-semibold">Sent but never opened</p>
              )}
              {(r.state === 'waiting' || r.state === 'ready') && (
                <p className="text-xs text-muted">Quiz opens at {r.quiz_time}</p>
              )}
              {r.state === 'not_started' && (
                <p className="text-xs text-amber-800 font-semibold">
                  Quiz was due at {r.quiz_time} — not opened yet
                </p>
              )}

              {r.report_id && (
                <button
                  className="btn-sec w-full mt-3 text-xs py-2"
                  onClick={() => setPreview({
                    id: r.report_id, file_name: r.file_name,
                    student_name: r.student_name, quiz_date: r.report_date,
                    score_correct: r.score_correct, score_total: r.score_total,
                    score_pct: r.score_pct, grade: r.grade,
                  })}
                >
                  📄 View report
                </button>
              )}

              <div className="flex items-center gap-2 mt-3 pt-2 border-t border-black/5 text-[11px] text-muted">
                <span className="truncate">{r.parent_name} · {r.parent_mobile_number}</span>
                <Link to={`/parents/${r.parent_id}`}
                      className="ml-auto text-brand-accent font-semibold shrink-0">view →</Link>
              </div>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {preview && <ReportPreview report={preview} onClose={() => setPreview(null)} />}
      </AnimatePresence>
    </Page>
  );
}
