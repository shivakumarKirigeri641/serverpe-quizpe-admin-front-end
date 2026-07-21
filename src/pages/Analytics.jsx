/** Trends over a selectable window, plan mix, and per-student engagement. */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, Legend, PieChart, Pie, Cell,
} from 'recharts';
import { api } from '../lib/api';
import { Page, Loading, ErrorBox, Pill, inr } from '../components/ui.jsx';

const COLORS = ['#00a884', '#075e54', '#13b48f', '#f4a261', '#e76f51'];
const short = (d) => String(d).slice(5);

export default function Analytics() {
  const [days, setDays] = useState(30);
  const [trend, setTrend] = useState(null);
  const [plans, setPlans] = useState(null);
  const [eng, setEng] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    setError('');
    Promise.all([api.daily(days), api.plans(), api.engagement()])
      .then(([t, p, e]) => { setTrend(t.rows); setPlans(p); setEng(e.rows); })
      .catch((e) => setError(e.message));
  };
  useEffect(load, [days]);

  if (error) return <ErrorBox error={error} onRetry={load} />;
  if (!trend || !plans || !eng) return <Loading label="Crunching numbers…" />;

  const pie = plans.plans.filter((p) => p.active > 0).map((p) => ({ name: p.plan_name, value: p.active }));
  const engHead = ['Student', 'School', 'Board / Grade', 'Parent', 'Quizzes', 'Done', 'Skipped', 'Avg %', 'Last quiz'];

  return (
    <Page
      title="Analytics"
      subtitle="Trends, plan mix and engagement"
      actions={
        <div className="flex gap-1">
          {[7, 30, 90, 365].map((d) => (
            <button
              key={d} onClick={() => setDays(d)}
              className={`btn text-xs px-3 py-2 ${days === d ? 'bg-brand text-white' : 'bg-white border border-line'}`}
            >{d === 365 ? '1y' : `${d}d`}</button>
          ))}
        </div>
      }
    >
      <div className="grid lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-5">
          <h2 className="font-bold text-brand mb-4">Quizzes taken vs completed</h2>
          <div className="h-60">
            <ResponsiveContainer>
              <LineChart data={trend} margin={{ left: -20, right: 6 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e3eae8" vertical={false} />
                <XAxis dataKey="date" tickFormatter={short} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="quizzes_taken" name="Taken" stroke="#075e54" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="quizzes_completed" name="Completed" stroke="#00a884" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card p-5">
          <h2 className="font-bold text-brand mb-4">Average score</h2>
          <div className="h-60">
            <ResponsiveContainer>
              <BarChart data={trend} margin={{ left: -20, right: 6 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e3eae8" vertical={false} />
                <XAxis dataKey="date" tickFormatter={short} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="avg_score_pct" name="Avg score %" fill="#00a884" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-5">
          <h2 className="font-bold text-brand mb-4">Active plan mix</h2>
          {pie.length ? (
            <div className="h-60">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                    {pie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="text-sm text-muted">No active plans yet.</p>}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card p-5">
          <h2 className="font-bold text-brand mb-1">Revenue by plan</h2>
          <p className="text-xs text-muted mb-4">Lifetime, from issued invoices</p>
          <div className="space-y-2">
            {plans.plans.map((p) => (
              <div key={p.plan_code} className="flex items-center justify-between text-sm border-b border-line/60 pb-2">
                <span className="flex items-center gap-2">
                  <Pill tone={p.is_trial ? 'amber' : 'green'}>{p.is_trial ? 'TRIAL' : 'PAID'}</Pill>
                  {p.plan_name}
                </span>
                <span className="text-right">
                  <b>{inr(p.revenue)}</b>
                  <span className="text-xs text-muted block">{p.active} active · {p.lapsed} lapsed</span>
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="card mt-4 overflow-hidden">
        <h2 className="font-bold text-brand p-5 pb-3">Student engagement</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead><tr>{engHead.map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody>
              {eng.map((s) => (
                <tr key={s.student_id}>
                  <td className="td font-semibold">{s.student_name}</td>
                  <td className="td text-xs text-muted">{s.school_name || '—'}</td>
                  <td className="td text-xs">{s.board_code} · {s.grade_name}</td>
                  <td className="td text-xs">
                    {s.parent_name}
                    <div className="text-muted">{s.parent_mobile_number}</div>
                  </td>
                  <td className="td">{s.quizzes}</td>
                  <td className="td text-emerald-700 font-semibold">{s.completed}</td>
                  <td className="td text-red-600">{s.skipped}</td>
                  <td className="td font-semibold">{s.avg_pct}%</td>
                  <td className="td text-xs text-muted">{s.last_quiz || '—'}</td>
                </tr>
              ))}
              {!eng.length && (
                <tr><td className="td text-center text-muted" colSpan={engHead.length}>No students yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Page>
  );
}
