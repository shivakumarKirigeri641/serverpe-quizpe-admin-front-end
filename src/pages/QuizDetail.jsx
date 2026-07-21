/**
 * Every question in one quiz: the options shown, the correct answer, and what
 * the child actually chose — the view you use when a parent disputes a result.
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import { Page, Loading, ErrorBox, Pill } from '../components/ui.jsx';

const LETTERS = ['A', 'B', 'C', 'D'];

export default function QuizDetail() {
  const { trackerId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    setError('');
    api.quiz(trackerId).then(setData).catch((e) => setError(e.message));
  };
  useEffect(load, [trackerId]);

  if (error) return <ErrorBox error={error} onRetry={load} />;
  if (!data) return <Loading label="Loading answers…" />;

  const { head, questions } = data;

  return (
    <Page
      title={`${head.student_name} — ${head.subject_name}`}
      subtitle={`${head.quiz_date} · ${head.board_code} ${head.grade_name} · parent ${head.parent_name} (${head.parent_mobile_number})`}
      actions={<button className="btn-sec" onClick={() => navigate(-1)}>← Back</button>}
    >
      <div className="card p-5 mb-4 flex flex-wrap gap-6 items-center">
        <div>
          <div className="text-[11px] uppercase font-bold text-muted">Score</div>
          <div className="text-3xl font-extrabold text-brand">
            {head.score_total ? `${head.score_correct}/${head.score_total}` : '—'}
          </div>
        </div>
        <div>
          <div className="text-[11px] uppercase font-bold text-muted">Percentage</div>
          <div className="text-3xl font-extrabold text-brand-accent">{head.score_pct ?? '—'}%</div>
        </div>
        <div>
          <div className="text-[11px] uppercase font-bold text-muted">Grade</div>
          <div className="text-3xl font-extrabold">{head.grade || '—'}</div>
        </div>
        <div className="ml-auto flex gap-2">
          <Pill tone={head.status_code === 'completed' ? 'green' : 'grey'}>{head.status_code}</Pill>
          <Pill tone="blue">{head.quiz_type}</Pill>
          {head.school_name && <Pill tone="grey">{head.school_name}</Pill>}
        </div>
      </div>

      <div className="space-y-3">
        {questions.map((q, i) => {
          const opts = [q.option_a, q.option_b, q.option_c, q.option_d];
          const correct = String(q.answer || '').toUpperCase();
          const chosen = q.answered_option ? String(q.answered_option).toUpperCase() : null;
          const unanswered = !chosen;

          return (
            <motion.div
              key={q.serial_number}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.4) }}
              className="card p-5"
            >
              <div className="flex items-start gap-3 mb-3">
                <span className="shrink-0 w-8 h-8 rounded-full bg-line/60 grid place-items-center font-bold text-sm">
                  {q.serial_number}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] text-muted mb-1">{q.chapter}</div>
                  <p className="font-semibold">{q.question_pdf || q.question_whatsapp}</p>
                </div>
                <Pill tone={unanswered ? 'grey' : q.is_correct ? 'green' : 'red'}>
                  {unanswered ? 'not answered' : q.is_correct ? 'correct' : 'wrong'}
                </Pill>
              </div>

              <div className="grid sm:grid-cols-2 gap-2 mb-3">
                {opts.map((text, idx) => {
                  if (text == null || text === '') return null;
                  const letter = LETTERS[idx];
                  const isCorrect = letter === correct;
                  const isChosen = letter === chosen;
                  return (
                    <div
                      key={letter}
                      className={`rounded-xl border-2 px-3 py-2 text-sm flex items-center gap-2 ${
                        isCorrect ? 'border-emerald-400 bg-emerald-50'
                          : isChosen ? 'border-red-400 bg-red-50'
                            : 'border-line'}`}
                    >
                      <span className="font-bold w-5">{letter}</span>
                      <span className="flex-1">{text}</span>
                      {isCorrect && <span className="text-emerald-700 text-xs font-bold">correct</span>}
                      {isChosen && !isCorrect && <span className="text-red-700 text-xs font-bold">chose this</span>}
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-4 text-xs text-muted">
                {q.response_seconds != null && <span>⏱ answered in {q.response_seconds}s</span>}
                {q.explanation && <span className="flex-1 min-w-[200px]">💡 {q.explanation}</span>}
              </div>
            </motion.div>
          );
        })}
      </div>
    </Page>
  );
}
