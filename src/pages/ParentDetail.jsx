/**
 * One parent, everything nested underneath: children, their quiz history,
 * subscriptions, invoices, support tickets and feedback.
 *
 * Each child's quizzes load on expand rather than up front — a parent with
 * three children and months of history would otherwise pull hundreds of rows
 * nobody asked to see.
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';
import AddStudent from '../components/AddStudent.jsx';
import DangerZone from '../components/DangerZone.jsx';
import EditParent from '../components/EditParent.jsx';
import { Page, Loading, ErrorBox, Pill, inr } from '../components/ui.jsx';

export default function ParentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(null);            // expanded student id
  const [quizzes, setQuizzes] = useState({});        // studentId -> rows

  const load = () => {
    setError('');
    api.parent(id).then(setData).catch((e) => setError(e.message));
  };
  useEffect(load, [id]);

  const toggle = async (sid) => {
    if (open === sid) return setOpen(null);
    setOpen(sid);
    if (!quizzes[sid]) {
      try {
        const d = await api.studentQuizzes(sid);
        setQuizzes((q) => ({ ...q, [sid]: d.rows }));
      } catch (e) {
        setQuizzes((q) => ({ ...q, [sid]: [] }));
        setError(e.message);
      }
    }
  };

  if (error) return <ErrorBox error={error} onRetry={load} />;
  if (!data) return <Loading label="Loading parent…" />;

  const { parent, students, subscriptions, invoices, tickets, feedback } = data;
  // seats come from the plan currently in force, if any
  const current = subscriptions.find((s) => s.is_active);

  return (
    <Page
      title={parent.parent_name || 'Parent'}
      subtitle={`${parent.parent_mobile_number} · ${parent.state_code || 'state not set'}`}
      actions={
        <div className="flex gap-2">
          <EditParent parent={parent} onSaved={load} />
          <button className="btn-sec" onClick={() => navigate('/parents')}>← All parents</button>
        </div>
      }
    >
      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <div className="card p-5">
          <h3 className="font-bold text-brand mb-3">Subscriptions</h3>
          {subscriptions.length ? subscriptions.map((s) => (
            <div key={s.id} className="flex items-center justify-between border-b border-line/60 py-2 text-sm">
              <span className="flex items-center gap-2">
                <Pill tone={s.is_trial ? 'amber' : 'green'}>{s.plan_name}</Pill>
                {s.is_active && <Pill tone="blue">current</Pill>}
              </span>
              <span className="text-xs text-muted">
                {String(s.plan_start_date).slice(0, 10)} → {String(s.plan_end_date).slice(0, 10)}
              </span>
            </div>
          )) : <p className="text-sm text-muted">None yet.</p>}
        </div>

        <div className="card p-5">
          <h3 className="font-bold text-brand mb-3">Invoices</h3>
          {invoices.length ? invoices.map((i) => (
            <div key={i.id} className="flex items-center justify-between border-b border-line/60 py-2 text-sm">
              <span className="font-mono text-xs">{i.invoice_id}</span>
              <b>{inr(i.total)}</b>
            </div>
          )) : <p className="text-sm text-muted">No invoices — trial only.</p>}
        </div>

        <div className="card p-5">
          <h3 className="font-bold text-brand mb-3">Feedback & tickets</h3>
          <p className="text-sm mb-2">
            {feedback.filter((f) => f.rating).length} rating(s),
            {' '}{tickets.length} ticket(s)
          </p>
          {feedback.filter((f) => f.rating).slice(0, 3).map((f) => (
            <div key={f.id} className="text-sm border-b border-line/60 py-1.5">
              {'⭐'.repeat(f.rating)}
              {f.message && <div className="text-xs text-muted italic">"{f.message}"</div>}
            </div>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <h3 className="font-bold text-brand p-5 pb-3">
          Children <span className="text-muted font-normal text-sm">— click to see quiz history</span>
        </h3>
        <div className="divide-y divide-line/70">
          {students.map((s) => (
            <div key={s.id}>
              <button
                onClick={() => toggle(s.id)}
                className="w-full flex items-center gap-4 px-5 py-3 text-left hover:bg-line/20 transition"
              >
                <span className={`transition-transform ${open === s.id ? 'rotate-90' : ''}`}>▶</span>
                <span className="font-semibold flex-1">{s.student_name}</span>
                <span className="text-xs text-muted">{s.school_name || 'school not given'}</span>
                <Pill tone="blue">{s.board_code} · {s.grade_name}</Pill>
                <Pill tone="grey">{s.medium_code || '—'}</Pill>
              </button>

              <AnimatePresence>
                {open === s.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-line/10"
                  >
                    {!quizzes[s.id] ? (
                      <p className="px-5 py-4 text-sm text-muted">Loading quizzes…</p>
                    ) : !quizzes[s.id].length ? (
                      <p className="px-5 py-4 text-sm text-muted">No quizzes yet.</p>
                    ) : (
                      <table className="w-full border-collapse">
                        <thead><tr>{['Date', 'Subject', 'Type', 'Status', 'Score', 'Grade', '']
                          .map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
                        <tbody>
                          {quizzes[s.id].map((q) => (
                            <tr key={q.id}>
                              <td className="td whitespace-nowrap">{q.quiz_date}</td>
                              <td className="td">{q.subject_name}</td>
                              <td className="td text-xs">{q.quiz_type}</td>
                              <td className="td">
                                <Pill tone={q.status_code === 'completed' ? 'green'
                                  : q.status_code === 'skipped' ? 'red' : 'grey'}>{q.status_code}</Pill>
                              </td>
                              <td className="td font-semibold">
                                {q.score_total ? `${q.score_correct}/${q.score_total} (${q.score_pct}%)` : '—'}
                              </td>
                              <td className="td font-bold">{q.grade || '—'}</td>
                              <td className="td">
                                <Link className="text-brand-accent font-semibold text-xs" to={`/quizzes/${q.id}`}>
                                  View answers →
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    <div className="px-5 pb-4">
                      <DangerZone
                        kind="student" id={s.id} label={s.student_name}
                        onDone={() => { setOpen(null); load(); }}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
          {!students.length && <p className="px-5 py-6 text-sm text-muted">No children enrolled.</p>}
        </div>

        <AddStudent
          parentId={parent.id}
          seatsUsed={students.filter((s) => s.is_active).length}
          seatLimit={current?.student_count ?? null}
          planName={current?.plan_name}
          onAdded={load}
        />
      </div>

      <DangerZone
        kind="parent" id={parent.id} label={parent.parent_name || parent.parent_mobile_number}
        onDone={() => navigate('/parents')}
      />
    </Page>
  );
}
