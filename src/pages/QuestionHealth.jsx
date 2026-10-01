import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAutoRefresh } from '../lib/useAutoRefresh';
import { chartsAnimate } from '../lib/motion.jsx';
import { Page, Loading, ErrorBox, Empty, Pill } from '../components/ui.jsx';

/**
 * src/pages/QuestionHealth.jsx
 * ---------------------------------------------------------------------------
 * Which questions are not working — and, more usefully, which are BROKEN.
 *
 * Low accuracy on its own proves nothing: a genuinely hard question also
 * scores low, and hard questions are the point. The tell is a single WRONG
 * option that most children converge on. That is almost never difficulty; it
 * is a mis-keyed answer, or a distractor that is defensibly also correct. So
 * the table is ordered by accuracy, but the column that earns its place is
 * "most picked".
 *
 * A ranked list to act on, not a chart. The inline bar is there so the eye can
 * find the cliff without reading every number.
 */

const RANGES = [7, 30, 90];

/* Reserved status colours, each shipped with a word — never colour alone. */
function health(pct) {
  if (pct >= 65) return { tone: 'green', word: 'Fine' };
  if (pct >= 40) return { tone: 'amber', word: 'Hard' };
  return { tone: 'red', word: 'Check' };
}

export default function QuestionHealth() {
  const [rows, setRows] = useState(null);
  const [days, setDays] = useState(30);
  const [error, setError] = useState('');

  const load = () => {
    setError('');
    return api.questionAnalytics(days, 60)
      .then((d) => setRows(d.rows))
      .catch((e) => setError(e.message));
  };

  useEffect(() => { load(); }, [days]);
  useAutoRefresh(load, 60000);            // slow — this is history, not live

  if (error) return <ErrorBox error={error} onRetry={load} />;
  if (!rows) return <Loading label="Reading question history…" />;

  const suspect = rows.filter((r) => Number(r.top_wrong_pct) >= 50).length;

  return (
    <Page
      title="Question health"
      subtitle="Weakest questions first — and the wrong option children actually pick"
      actions={
        <div className="flex gap-1">
          {RANGES.map((d) => (
            <button
              key={d} onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                days === d ? 'bg-brand-accent text-white' : 'bg-white border border-line text-muted hover:bg-line/40'}`}
            >{d} days</button>
          ))}
        </div>
      }
    >
      {suspect > 0 && (
        <div className="card p-4 mb-5 border-l-4 border-l-amber-400">
          <div className="text-sm font-bold text-ink">
            {suspect} question{suspect === 1 ? '' : 's'} worth checking
          </div>
          <p className="text-[11px] text-muted mt-0.5">
            Half or more of the children picked the same wrong option. That usually means
            the answer key is wrong or the distractor is also defensible — not that the
            question is hard.
          </p>
        </div>
      )}

      {!rows.length ? (
        <Empty>Not enough answers yet in this period.</Empty>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Question</th>
                <th className="th text-right">Seen</th>
                <th className="th">Accuracy</th>
                <th className="th">Most picked</th>
                <th className="th text-right">Avg time</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const pct = Number(r.accuracy_pct);
                const h = health(pct);
                const misleading = Number(r.top_wrong_pct) >= 50;
                return (
                  <tr key={r.question_id} className="hover:bg-line/20">
                    <td className="td max-w-[380px]">
                      <div className="text-[11px] text-muted">
                        #{r.question_id}
                        {r.chapter ? ` · ${r.chapter}` : ''}
                        {r.difficulty_level ? ` · level ${r.difficulty_level}` : ''}
                      </div>
                      <div className="text-sm leading-snug">
                        {r.question_text || <span className="text-muted">(no text)</span>}
                      </div>
                    </td>
                    <td className="td text-right tabular-nums">{r.attempts}</td>
                    <td className="td w-44">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-line/60 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${pct}%`,
                              background: pct >= 65 ? '#0d9488' : pct >= 40 ? '#f59e0b' : '#dc2626',
                              transition: chartsAnimate() ? 'width .4s ease-out' : undefined,
                            }}
                          />
                        </div>
                        <span className="text-xs font-bold tabular-nums w-11 text-right">{pct}%</span>
                      </div>
                      <Pill tone={h.tone}>{h.word}</Pill>
                    </td>
                    <td className="td">
                      {r.top_wrong_option ? (
                        <div className={misleading ? 'font-bold text-amber-700' : ''}>
                          {r.top_wrong_option} · {r.top_wrong_pct}%
                          <div className="text-[11px] text-muted font-normal">key is {r.correct_option}</div>
                        </div>
                      ) : <span className="text-muted">—</span>}
                    </td>
                    <td className="td text-right tabular-nums">
                      {r.avg_seconds ? `${r.avg_seconds}s` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Page>
  );
}
