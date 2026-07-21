/**
 * Enrolled vs attended, per day.
 *
 * Two bars side by side rather than a single "quizzes taken" line, because the
 * number that matters is the GAP. Ten quizzes is excellent from twelve children
 * and dismal from a hundred, and a lone attendance bar cannot tell you which.
 *
 * "Enrolled" is reconstructed per day from subscription dates, so a child who
 * joined on Tuesday does not count against Monday.
 */

import { useEffect, useState } from 'react';
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { api } from '../lib/api';

const short = (d) => {
  const x = new Date(d);
  return `${x.getDate()}/${x.getMonth() + 1}`;
};

function Detail({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const r = payload[0].payload;
  return (
    <div className="rounded-xl border border-line bg-white shadow-lg p-3 text-xs">
      <p className="font-bold text-brand mb-1.5">
        {new Date(label).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
      </p>
      <p>Enrolled: <b>{r.enrolled}</b></p>
      <p>Attended: <b className="text-emerald-600">{r.attended}</b> ({r.attendance_pct}%)</p>
      {r.started_only > 0 && <p className="text-amber-600">Started, unfinished: {r.started_only}</p>}
      {r.missed > 0 && <p className="text-rose-600">Missed: {r.missed}</p>}
      {r.enrolled > 0 && r.attended < r.enrolled && (
        <p className="text-muted mt-1">{r.enrolled - r.attended} did not finish</p>
      )}
    </div>
  );
}

export default function AttendanceChart({ days = 14 }) {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');
  const [span, setSpan] = useState(days);

  useEffect(() => {
    let alive = true;
    setRows(null);
    api.participation(span)
      .then((r) => { if (alive) setRows(r.rows); })
      .catch((e) => { if (alive) setErr(e.message); });
    return () => { alive = false; };
  }, [span]);

  if (err) return <div className="card p-5 text-sm text-red-600">{err}</div>;

  // Days before anyone enrolled are noise, not zeros worth plotting.
  const data = (rows || []).filter((r) => r.enrolled > 0 || r.attended > 0);
  const live = data.length
    ? Math.round(data.reduce((a, r) => a + r.attendance_pct, 0) / data.length)
    : 0;

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
        <div>
          <h2 className="font-bold text-brand">Attendance — enrolled vs attended</h2>
          <p className="text-xs text-muted mt-0.5">
            {data.length
              ? <>Average attendance <b className="text-brand">{live}%</b> over {data.length} active {data.length === 1 ? 'day' : 'days'}</>
              : 'No quiz days yet'}
          </p>
        </div>
        <div className="flex gap-1">
          {[7, 14, 30, 90].map((d) => (
            <button key={d} onClick={() => setSpan(d)}
                    className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition ${
                      span === d ? 'bg-brand text-white' : 'text-muted hover:bg-slate-100'}`}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {!rows ? (
        <div className="h-64 grid place-items-center text-sm text-muted">Loading…</div>
      ) : !data.length ? (
        <div className="h-64 grid place-items-center text-sm text-muted">
          Nothing to plot yet — the chart fills in once children are enrolled.
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer>
            <ComposedChart data={data} margin={{ left: -20, right: 6 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e3eae8" vertical={false} />
              <XAxis dataKey="date" tickFormatter={short} tick={{ fontSize: 10 }}
                     axisLine={false} tickLine={false} />
              {/* counts left, percentage right — mixing them on one axis makes
                  a 3-child cohort at 67% look like it dwarfs the headcount */}
              <YAxis yAxisId="n" allowDecimals={false} tick={{ fontSize: 10 }}
                     axisLine={false} tickLine={false} />
              <YAxis yAxisId="pct" orientation="right" domain={[0, 100]} unit="%"
                     tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<Detail />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="n" dataKey="enrolled" name="Enrolled" fill="#c9dbd6" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="n" dataKey="attended" name="Attended" fill="#00a884" radius={[4, 4, 0, 0]} />
              <Line yAxisId="pct" type="monotone" dataKey="attendance_pct" name="Attendance %"
                    stroke="#075e54" strokeWidth={2} dot={{ r: 2 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
