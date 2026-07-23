/**
 * Where the students actually are — by board and by grade.
 *
 * Three views of the same fetch, because one chart cannot answer all three
 * questions this section exists to answer:
 *
 *   Enrolment    where are they, and which segments are empty?
 *   Today        who turned up, who skipped, who has not started yet?
 *   Performance  which grades are coping and which are struggling?
 *
 * Empty board/grade cells are shown deliberately rather than filtered out. A
 * grade with nobody in it is the most actionable row on the page, and dropping
 * it would make the gap invisible.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, Cell,
} from 'recharts';
import { api } from '../lib/api';

const BOARD_COLOUR = { CBSE: '#00a884', ICSE: '#f4a261', KSEAB: '#075e54' };
const gradeNo = (name) => Number(String(name).replace(/\D/g, '')) || 0;

const VIEWS = [
  { k: 'enrolment', label: 'Enrolment' },
  { k: 'today', label: 'Today' },
  { k: 'performance', label: 'Performance' },
];

function Detail({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const r = payload[0].payload;
  return (
    <div className="rounded-xl border border-line bg-white shadow-lg p-3 text-xs space-y-0.5">
      <p className="font-bold text-brand mb-1">{label}</p>
      {r.students != null && <p>Students: <b>{r.students}</b> {r.paid > 0 && <span className="text-muted">({r.paid} paid)</span>}</p>}
      {r.delivered > 0 && (
        <>
          <p className="text-emerald-600">Attempted: <b>{r.attempted}</b> of {r.delivered} ({r.attendance_pct}%)</p>
          {r.skipped > 0 && <p className="text-rose-600">Skipped: {r.skipped}</p>}
          {r.pending > 0 && <p className="text-amber-600">Not started yet: {r.pending}</p>}
        </>
      )}
      {r.scored > 0 && (
        <p className="pt-1 border-t border-line mt-1">
          Avg <b>{r.avg_pct}%</b> over {r.scored} quizzes
          {r.struggling > 0 && <span className="text-rose-600"> · {r.struggling} below 50%</span>}
        </p>
      )}
      {!r.students && <p className="text-muted italic">Nobody enrolled here yet</p>}
    </div>
  );
}

export default function BoardGradeChart() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [view, setView] = useState('enrolment');
  const [board, setBoard] = useState('ALL');

  useEffect(() => {
    let alive = true;
    api.boardGrade()
      .then((r) => { if (alive) setData(r); })
      .catch((e) => { if (alive) setErr(e.message); });
    return () => { alive = false; };
  }, []);

  const boards = useMemo(
    () => (data?.totals || []).map((t) => t.board_code), [data]);

  // One row per grade. With a board selected the bars are that board's grades;
  // with ALL they are stacked so the boards can be compared at a glance.
  const rows = useMemo(() => {
    if (!data) return [];
    const grades = [...new Set(data.rows.map((r) => r.grade_name))]
      .sort((a, b) => gradeNo(a) - gradeNo(b));
    return grades.map((g) => {
      const cells = data.rows.filter((r) => r.grade_name === g
        && (board === 'ALL' || r.board_code === board));
      const sum = (k) => cells.reduce((a, c) => a + c[k], 0);
      const scored = sum('scored');
      const out = {
        grade: g.replace('Grade ', 'G'),
        students: sum('students'), paid: sum('paid'), families: sum('families'),
        delivered: sum('delivered'), attempted: sum('attempted'),
        skipped: sum('skipped'), pending: sum('pending'),
        scored, struggling: sum('struggling'), strong: sum('strong'),
        // weight the average by how many quizzes each cell actually scored,
        // or a grade with one quiz would swing the whole bar
        avg_pct: scored ? Math.round((cells.reduce((a, c) => a + c.avg_pct * c.scored, 0) / scored) * 10) / 10 : 0,
      };
      out.attendance_pct = out.delivered ? Math.round((out.attempted / out.delivered) * 100) : 0;
      for (const c of cells) out[c.board_code] = c.students;
      return out;
    });
  }, [data, board]);

  const totals = data?.totals || [];
  const grand = totals.reduce((a, t) => a + t.students, 0);

  if (err) return <div className="card p-5 text-sm text-red-600">{err}</div>;

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
        <div>
          <h2 className="font-bold text-brand">Students by board and grade</h2>
          <p className="text-xs text-muted mt-0.5">
            {data
              ? grand > 0
                ? <>{grand} student{grand === 1 ? '' : 's'} across {totals.filter((t) => t.students > 0).length} board(s)</>
                : 'No students enrolled yet — the chart fills in as families join'
              : 'Loading…'}
          </p>
        </div>
        <div className="flex gap-1 flex-wrap">
          {VIEWS.map((v) => (
            <button key={v.k} onClick={() => setView(v.k)}
                    className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition ${
                      view === v.k ? 'bg-brand text-white' : 'text-muted hover:bg-slate-100'}`}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* board totals — the headline row above the per-grade detail */}
      {data && (
        <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: `repeat(${Math.max(1, totals.length)}, minmax(0,1fr))` }}>
          {totals.map((t) => (
            <button key={t.board_code}
                    onClick={() => setBoard(board === t.board_code ? 'ALL' : t.board_code)}
                    className={`rounded-xl p-3 text-left border-2 transition ${
                      board === t.board_code ? 'border-brand bg-cream' : 'border-line hover:border-brand-accent'}`}>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: BOARD_COLOUR[t.board_code] || '#94a3b8' }} />
                <p className="text-xs font-extrabold">{t.board_code}</p>
              </div>
              <p className="text-xl font-black text-brand mt-1">{t.students}</p>
              <p className="text-[10px] text-muted">
                {t.paid} paid · {t.delivered > 0 ? `${t.attendance_pct}% today` : 'no quiz today'}
              </p>
            </button>
          ))}
        </div>
      )}
      {board !== 'ALL' && (
        <p className="text-xs text-muted mb-2">
          Showing <b className="text-brand">{board}</b> only — tap the card again to show all boards.
        </p>
      )}

      {!data ? (
        <div className="h-72 grid place-items-center text-sm text-muted">Loading…</div>
      ) : (
        <div className="h-72">
          <ResponsiveContainer>
            <BarChart data={rows} margin={{ left: -20, right: 6 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e3eae8" vertical={false} />
              <XAxis dataKey="grade" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} axisLine={false} tickLine={false}
                     domain={view === 'performance' ? [0, 100] : undefined}
                     unit={view === 'performance' ? '%' : undefined} />
              <Tooltip content={<Detail />} cursor={{ fill: '#f1f5f4' }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />

              {view === 'enrolment' && (board === 'ALL'
                ? boards.map((b) => (
                    <Bar key={b} dataKey={b} name={b} stackId="s"
                         fill={BOARD_COLOUR[b] || '#94a3b8'} radius={[0, 0, 0, 0]} />
                  ))
                : <Bar dataKey="students" name="Students" radius={[4, 4, 0, 0]}
                       fill={BOARD_COLOUR[board] || '#00a884'} />)}

              {view === 'today' && (
                <>
                  <Bar dataKey="attempted" name="Attempted" stackId="t" fill="#00a884" />
                  <Bar dataKey="pending" name="Not started" stackId="t" fill="#f4c95d" />
                  <Bar dataKey="skipped" name="Skipped" stackId="t" fill="#e76f51" radius={[4, 4, 0, 0]} />
                </>
              )}

              {view === 'performance' && (
                // coloured per bar: a grade averaging under half is a problem
                // worth seeing without reading the number
                <Bar dataKey="avg_pct" name="Average score %" radius={[4, 4, 0, 0]}>
                  {rows.map((r, i) => (
                    <Cell key={i} fill={r.avg_pct >= 80 ? '#00a884' : r.avg_pct >= 50 ? '#f4c95d' : '#e76f51'} />
                  ))}
                </Bar>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {view === 'performance' && (
        <p className="text-[11px] text-muted mt-2">
          Average over the last 28 days. Green ≥ 80%, amber 50–79%, red below 50%.
        </p>
      )}
    </div>
  );
}
