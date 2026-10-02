import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAutoRefresh } from '../lib/useAutoRefresh';
import { chartsAnimate } from '../lib/motion.jsx';
import { Page, Loading, ErrorBox, Empty, Pill, inr } from '../components/ui.jsx';

/**
 * src/pages/Curriculum.jsx
 * ---------------------------------------------------------------------------
 * The panel by grade and by subject — who is in each, how they are doing, and
 * whether there are questions left to ask them.
 *
 * POOL HEALTH IS THE PART THAT EARNS ITS PLACE. A thinning pool does not fail
 * loudly: the quiz simply starts repeating, and the first anyone hears is a
 * parent saying "we have seen this one". Days-left is measured from that
 * grade's own consumption, never assumed — unused questions divided by what it
 * actually gets through per active day.
 *
 * Revenue here is attributed through the child's subscription, so a two-child
 * family counts toward two grades. That is deliberately not an accounting
 * figure; it answers "which grade is worth serving". Finance is for money.
 */

const nf = (n) => (n === null || n === undefined ? '—' : Number(n).toLocaleString('en-IN'));

/** Reserved status colours, always with a word. */
function poolTone(daysLeft) {
  const d = Number(daysLeft);
  if (!Number.isFinite(d)) return { tone: 'grey', word: 'Not in use' };
  if (d < 14) return { tone: 'red', word: 'Running out' };
  if (d < 60) return { tone: 'amber', word: 'Getting thin' };
  return { tone: 'green', word: 'Plenty' };
}

function Bar({ pct, colour = '#0d9488' }) {
  return (
    <div className="flex-1 h-2 rounded-full bg-line/60 overflow-hidden min-w-[48px]">
      <div
        className="h-full rounded-full"
        style={{
          width: `${Math.max(0, Math.min(100, pct || 0))}%`,
          background: colour,
          transition: chartsAnimate() ? 'width .4s ease-out' : undefined,
        }}
      />
    </div>
  );
}

export default function Curriculum() {
  const [d, setD] = useState({});
  const [days, setDays] = useState(30);
  const [error, setError] = useState('');

  const load = () => {
    setError('');
    return Promise.all([
      api.curriculumGrades(days), api.curriculumSubjects(days), api.curriculumPool(180),
    ])
      .then(([g, s, p]) => setD({ grades: g.rows, subjects: s.rows, pool: p.rows }))
      .catch((e) => setError(e.message));
  };

  useEffect(() => { load(); }, [days]);
  useAutoRefresh(load, 60000);

  if (error) return <ErrorBox error={error} onRetry={load} />;
  if (!d.grades) return <Loading label="Reading grades and subjects…" />;

  const thin = (d.pool || []).filter((r) => Number(r.days_left) < 60).length;

  return (
    <Page
      title="Grades & subjects"
      subtitle="Who is in each, how they are doing, and whether questions remain"
      actions={
        <div className="flex gap-1">
          {[30, 90, 365].map((n) => (
            <button
              key={n} onClick={() => setDays(n)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                days === n ? 'bg-brand-accent text-white' : 'bg-white border border-line text-muted hover:bg-line/40'}`}
            >{n === 365 ? '1 year' : `${n} days`}</button>
          ))}
        </div>
      }
    >
      {thin > 0 && (
        <div className="card p-4 mb-5 border-l-4 border-l-amber-400">
          <div className="text-sm font-bold text-ink">
            {thin} question pool{thin === 1 ? '' : 's'} with under two months left
          </div>
          <p className="text-[11px] text-muted mt-0.5">
            At the current rate these will start repeating questions children have already seen.
          </p>
        </div>
      )}

      <section className="mb-6">
        <h2 className="text-sm font-bold text-ink mb-1">By grade</h2>
        <p className="text-[11px] text-muted mb-3">
          Revenue is attributed through the child&apos;s subscription, so a family with two
          children counts toward two grades. Finance is the place for exact money.
        </p>
        {!d.grades.length ? <Empty>No grades with students or questions yet.</Empty> : (
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">Grade</th>
                  <th className="th text-right">Children</th>
                  <th className="th">Paid / trial / lapsed</th>
                  <th className="th text-right">Quizzes</th>
                  <th className="th">Completion</th>
                  <th className="th">Accuracy</th>
                  <th className="th text-right">Revenue</th>
                  <th className="th text-right">Pool</th>
                </tr>
              </thead>
              <tbody>
                {d.grades.map((g) => (
                  <tr key={g.grade_id} className="hover:bg-line/20">
                    <td className="td">
                      <div className="font-semibold">{g.grade_name}</div>
                      <div className="text-[11px] text-muted">{g.grade_code}</div>
                    </td>
                    <td className="td text-right tabular-nums font-bold">{g.students}</td>
                    <td className="td text-[11px] tabular-nums">
                      <span className="text-emerald-700 font-bold">{g.paid_students}</span>
                      {' / '}
                      <span className="text-sky-700">{g.trial_students}</span>
                      {' / '}
                      <span className="text-muted">{g.lapsed_students}</span>
                    </td>
                    <td className="td text-right tabular-nums">{g.quizzes}</td>
                    <td className="td w-32">
                      {g.completion_pct === null ? <span className="text-muted">—</span> : (
                        <div className="flex items-center gap-2">
                          <Bar pct={g.completion_pct} />
                          <span className="text-xs font-bold tabular-nums w-10 text-right">{g.completion_pct}%</span>
                        </div>
                      )}
                    </td>
                    <td className="td w-32">
                      {g.accuracy_pct === null ? <span className="text-muted">—</span> : (
                        <div className="flex items-center gap-2">
                          <Bar pct={g.accuracy_pct} colour={g.accuracy_pct >= 65 ? '#0d9488' : g.accuracy_pct >= 40 ? '#f59e0b' : '#dc2626'} />
                          <span className="text-xs font-bold tabular-nums w-10 text-right">{g.accuracy_pct}%</span>
                        </div>
                      )}
                    </td>
                    <td className="td text-right tabular-nums">{Number(g.revenue) ? inr(g.revenue) : '—'}</td>
                    <td className="td text-right tabular-nums text-muted">{nf(g.pool_questions)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mb-6">
        <h2 className="text-sm font-bold text-ink mb-1">Question pool — before it starts repeating</h2>
        <p className="text-[11px] text-muted mb-3">
          Days left is measured from each grade&apos;s own consumption over the last six months,
          not estimated.
        </p>
        {!d.pool?.length ? <Empty>No pool has been drawn from yet in this period.</Empty> : (
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">Grade</th><th className="th">Subject</th>
                  <th className="th text-right">Pool</th><th className="th text-right">Used</th>
                  <th className="th text-right">Per day</th><th className="th text-right">Days left</th>
                  <th className="th" />
                </tr>
              </thead>
              <tbody>
                {d.pool.map((r, i) => {
                  const t = poolTone(r.days_left);
                  return (
                    <tr key={`${r.grade_code}-${r.subject_code}-${i}`} className="hover:bg-line/20">
                      <td className="td font-semibold">{r.grade_name}</td>
                      <td className="td text-muted">{r.subject_code}</td>
                      <td className="td text-right tabular-nums">{nf(r.pool)}</td>
                      <td className="td text-right tabular-nums">{nf(r.used)}</td>
                      <td className="td text-right tabular-nums">{r.per_day ?? '—'}</td>
                      <td className="td text-right tabular-nums font-bold">{nf(r.days_left)}</td>
                      <td className="td"><Pill tone={t.tone}>{t.word}</Pill></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-bold text-ink mb-1">By subject</h2>
        <p className="text-[11px] text-muted mb-3">Across all grades, for the selected period.</p>
        {!d.subjects?.length ? <Empty>No subjects in use.</Empty> : (
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">Subject</th><th className="th text-right">Children</th>
                  <th className="th text-right">Quizzes</th><th className="th text-right">Answered</th>
                  <th className="th">Accuracy</th><th className="th text-right">Avg time</th>
                  <th className="th text-right">Questions used</th>
                </tr>
              </thead>
              <tbody>
                {d.subjects.map((s) => (
                  <tr key={s.subject_id} className="hover:bg-line/20">
                    <td className="td">
                      <div className="font-semibold">{s.subject_name}</div>
                      <div className="text-[11px] text-muted">{s.subject_code}</div>
                    </td>
                    <td className="td text-right tabular-nums">{s.students}</td>
                    <td className="td text-right tabular-nums">{s.quizzes}</td>
                    <td className="td text-right tabular-nums">{nf(s.answered)}</td>
                    <td className="td w-32">
                      {s.accuracy_pct === null ? <span className="text-muted">—</span> : (
                        <div className="flex items-center gap-2">
                          <Bar pct={s.accuracy_pct} />
                          <span className="text-xs font-bold tabular-nums w-10 text-right">{s.accuracy_pct}%</span>
                        </div>
                      )}
                    </td>
                    <td className="td text-right tabular-nums">{s.avg_seconds ? `${s.avg_seconds}s` : '—'}</td>
                    <td className="td text-right tabular-nums text-muted">
                      {nf(s.questions_used)} of {nf(s.pool_questions)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </Page>
  );
}
