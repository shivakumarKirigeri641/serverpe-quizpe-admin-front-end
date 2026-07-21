/**
 * src/pages/Dashboard.jsx
 * ---------------------------------------------------------------------------
 * The landing view: headline counters with period-over-period comparisons,
 * a 30-day trend, the trial→paid funnel, and the newest enrolments.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { api } from '../lib/api';
import { Page, Stat, Loading, ErrorBox, Pill, inr } from '../components/ui.jsx';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [trend, setTrend] = useState([]);
  const [error, setError] = useState('');

  const load = () => {
    setError('');
    Promise.all([api.dashboard(), api.daily(30)])
      .then(([d, t]) => { setData(d); setTrend(t.rows); })
      .catch((e) => setError(e.message));
  };
  useEffect(load, []);

  if (error) return <ErrorBox error={error} onRetry={load} />;
  if (!data) return <Loading label="Loading dashboard…" />;

  const { overview: o, comparisons: c, plans, feed } = data;

  return (
    <Page title="Dashboard" subtitle="Live figures from the QuizPe database">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <Stat index={0} label="Quizzes today" value={c.quizzes.today.now}
              delta={c.quizzes.today.delta} sub={`vs ${c.quizzes.today.was} yesterday`} />
        <Stat index={1} label="Signups today" value={c.signups.today.now}
              delta={c.signups.today.delta} sub={`vs ${c.signups.today.was} yesterday`} />
        <Stat index={2} label="Revenue today" value={inr(c.revenue.today.now)}
              delta={c.revenue.today.delta} sub={`vs ${inr(c.revenue.today.was)} yesterday`} />
        <Stat index={3} label="Open tickets" value={o.open_tickets}
              sub={o.open_tickets ? 'needs attention' : 'all clear'} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat index={4} label="Active parents" value={o.parents_total} sub={`${o.students_total} children`} />
        <Stat index={5} label="On trial" value={o.trial_active} sub="free plan" />
        <Stat index={6} label="Paying" value={o.paid_active}
              sub={`${plans.conversion.pct}% of triallists converted`} />
        <Stat index={7} label="Lifetime revenue" value={inr(o.revenue_total)}
              sub={`${o.questions_total.toLocaleString('en-IN')} questions in bank`} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }} className="card p-5 lg:col-span-2"
        >
          <h2 className="font-bold text-brand mb-4">Last 30 days</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ left: -18, right: 6, top: 4 }}>
                <defs>
                  <linearGradient id="gq" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00a884" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#00a884" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e3eae8" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)}
                       axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e3eae8', fontSize: 12 }} />
                <Area type="monotone" dataKey="quizzes_taken" name="Quizzes"
                      stroke="#00a884" strokeWidth={2} fill="url(#gq)" />
                <Area type="monotone" dataKey="signups" name="Signups"
                      stroke="#075e54" strokeWidth={2} fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }} className="card p-5"
        >
          <h2 className="font-bold text-brand mb-1">Trial → Paid</h2>
          <p className="text-xs text-muted mb-4">The number that decides the business</p>
          <div className="text-5xl font-extrabold text-brand-accent">{plans.conversion.pct}%</div>
          <p className="text-sm text-muted mt-1">
            {plans.conversion.converted} of {plans.conversion.tried} triallists upgraded
          </p>
          <div className="mt-5 space-y-2">
            {plans.plans.map(p => (
              <div key={p.plan_code} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Pill tone={p.is_trial ? 'amber' : 'green'}>{p.is_trial ? 'TRIAL' : 'PAID'}</Pill>
                  {p.plan_name}
                </span>
                <span className="font-semibold">{p.active} active</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }} className="card mt-4 overflow-hidden"
      >
        <div className="flex items-center justify-between p-5 pb-3">
          <h2 className="font-bold text-brand">Newest enrolments</h2>
          <Link to="/live" className="text-sm text-brand-accent font-semibold">View all →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead><tr>{['When', 'Parent', 'Plan', 'Children', 'Value'].map(h =>
              <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody>
              {feed.map(f => (
                <tr key={f.id}>
                  <td className="td whitespace-nowrap text-muted">{f.at}</td>
                  <td className="td">
                    <div className="font-semibold">{f.parent_name || '—'}</div>
                    <div className="text-xs text-muted">{f.parent_mobile_number}</div>
                  </td>
                  <td className="td"><Pill tone={f.is_trial ? 'amber' : 'green'}>{f.plan_name}</Pill></td>
                  <td className="td text-xs">{f.children_names || `${f.children} child`}</td>
                  <td className="td font-semibold">{f.is_trial ? '—' : inr(f.invoice_total || f.price)}</td>
                </tr>
              ))}
              {!feed.length && (
                <tr><td className="td text-center text-muted" colSpan={5}>No enrolments yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </Page>
  );
}
