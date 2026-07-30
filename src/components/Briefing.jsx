/**
 * Briefing — the founder's "good morning" card at the top of the Dashboard.
 *
 * A plain-English recap of the night + today's money, then an action list of
 * the few things worth doing now: trials ending without payment and children
 * who missed last night, each with a one-tap prewritten WhatsApp nudge.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import { inr } from './ui.jsx';

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

const wa = (mobile, text) =>
  `https://wa.me/91${String(mobile).replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;

const trialText = (name, daysLeft) =>
  `Hi ${name || 'there'}! Your child's QuizPe free trial ${daysLeft <= 0 ? 'ends today' : daysLeft === 1 ? 'ends tomorrow' : `ends in ${daysLeft} days`}. ` +
  `To keep the daily quizzes going, you can continue from just ₹99 (about ₹3.50/day) at quizpe.in. Happy to help if you have any questions. 🙂`;

const missedText = (parent, student) =>
  `Hi ${parent || 'there'}! ${student || 'Your child'} missed last night's QuizPe quiz. ` +
  `Tonight's is ready and takes only about 5 minutes — a small daily habit makes a big difference. 🙂`;

export default function Briefing() {
  const [b, setB] = useState(null);
  const [err, setErr] = useState(false);

  useEffect(() => { api.briefing().then((d) => setB(d.briefing)).catch(() => setErr(true)); }, []);

  if (err) return null;                       // never block the dashboard on the briefing
  if (!b) return <div className="card p-5 mb-4 animate-pulse h-24" />;

  const s = b.stats;
  const summary = [
    `Last night ${s.done_last_night} quiz${s.done_last_night === 1 ? '' : 'zes'} completed` +
      (s.missed_last_night ? `, ${s.missed_last_night} missed` : ''),
    `Today ${inr(s.revenue_today)} from ${s.payments_today} payment${s.payments_today === 1 ? '' : 's'}` +
      (s.trials_today ? ` · ${s.trials_today} new trial${s.trials_today === 1 ? '' : 's'}` : ''),
    `WhatsApp taps ${s.wa_today} (${s.wa_delta >= 0 ? '+' : ''}${s.wa_delta}% vs yesterday)`,
  ].join('  ·  ');

  const hasTodos = b.trials_ending.length || b.missed.length || s.open_enquiries || s.testimonials_pending;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
      {/* greeting banner */}
      <div className="rounded-2xl p-5 text-white shadow-card"
           style={{ background: 'linear-gradient(120deg,#0f766e,#0b5c55)' }}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-xl font-black">{greeting()} ☀️</h2>
          <span className="text-xs font-semibold text-white/70">{b.today}</span>
        </div>
        <p className="text-sm text-white/90 mt-1">{summary}</p>
      </div>

      {/* action list */}
      {hasTodos ? (
        <div className="grid md:grid-cols-2 gap-3 mt-3">
          {b.trials_ending.length > 0 && (
            <Card title={`⚠️ ${b.trials_ending.length} trial${b.trials_ending.length === 1 ? '' : 's'} ending (no payment yet)`} tone="border-amber-300 bg-amber-50/50">
              {b.trials_ending.map((t) => (
                <Row key={t.parent_id}
                     to={`/parents/${t.parent_id}`}
                     name={t.parent_name || t.parent_mobile_number}
                     note={t.days_left <= 0 ? 'ends today' : t.days_left === 1 ? 'ends tomorrow' : `ends in ${t.days_left} days`}
                     href={wa(t.parent_mobile_number, trialText(t.parent_name, t.days_left))} />
              ))}
            </Card>
          )}

          {b.missed.length > 0 && (
            <Card title={`🚫 ${b.missed.length} missed last night`} tone="border-red-200 bg-red-50/40">
              {b.missed.map((m) => (
                <Row key={m.student_id}
                     to={`/parents/${m.parent_id}`}
                     name={m.student_name}
                     note={m.parent_name || m.parent_mobile_number}
                     href={wa(m.parent_mobile_number, missedText(m.parent_name, m.student_name))} />
              ))}
            </Card>
          )}

          {(s.open_enquiries > 0 || s.testimonials_pending > 0) && (
            <Card title="📥 Waiting on you" tone="border-line">
              {s.open_enquiries > 0 && (
                <Link to="/inbox" className="flex items-center justify-between py-1.5 text-sm hover:text-brand-accent">
                  <span>{s.open_enquiries} open enquir{s.open_enquiries === 1 ? 'y' : 'ies'}</span>
                  <span className="text-brand-accent font-semibold">answer →</span>
                </Link>
              )}
              {s.testimonials_pending > 0 && (
                <Link to="/inbox" className="flex items-center justify-between py-1.5 text-sm hover:text-brand-accent">
                  <span>{s.testimonials_pending} testimonial{s.testimonials_pending === 1 ? '' : 's'} to approve</span>
                  <span className="text-brand-accent font-semibold">review →</span>
                </Link>
              )}
            </Card>
          )}
        </div>
      ) : (
        <div className="card p-4 mt-3 text-sm text-muted text-center">🎉 Nothing needs chasing right now — you're all caught up.</div>
      )}
    </motion.div>
  );
}

function Card({ title, tone, children }) {
  return (
    <div className={`rounded-2xl border-2 p-4 ${tone}`}>
      <p className="font-bold text-sm mb-2">{title}</p>
      <div className="space-y-1 max-h-56 overflow-y-auto pr-1">{children}</div>
    </div>
  );
}

function Row({ to, name, note, href }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Link to={to} className="min-w-0 flex-1 truncate font-semibold text-ink hover:text-brand-accent">
        {name} <span className="font-normal text-muted text-xs">· {note}</span>
      </Link>
      <a href={href} target="_blank" rel="noopener noreferrer"
         onClick={(e) => e.stopPropagation()}
         className="shrink-0 pill bg-emerald-500 text-white hover:bg-emerald-600 transition">
        💬 Nudge
      </a>
    </div>
  );
}
