/**
 * Cohort health — the day in percentages rather than counts.
 *
 * Counts stop being readable as the cohort grows: "42 completed" means nothing
 * unless you also hold "of how many" in your head. Every figure here is a share
 * of a stated denominator, and the denominator is always printed next to it —
 * so 100% of 2 children reads as 100% of 2, not as a triumph.
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../lib/api';

const clamp = (n) => Math.max(0, Math.min(100, Number(n) || 0));

/** A labelled percentage with a bar, and the raw counts underneath. */
function Stat({ label, pct, of, ofLabel, tone = 'brand', hint }) {
  const tones = {
    brand: 'bg-brand', good: 'bg-emerald-500', warn: 'bg-amber-500', bad: 'bg-rose-500',
  };
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold text-muted">{label}</span>
        <span className="text-lg font-black text-brand tabular-nums">{clamp(pct)}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden mt-1.5">
        <motion.div
          className={`h-full rounded-full ${tones[tone]}`}
          initial={{ width: 0 }} animate={{ width: `${clamp(pct)}%` }}
          transition={{ duration: 0.6, ease: [0.22, 0.9, 0.28, 1] }}
        />
      </div>
      <p className="text-[11px] text-muted mt-1">
        {of != null ? `${of} ${ofLabel}` : ''}{hint ? ` · ${hint}` : ''}
      </p>
    </div>
  );
}

export default function CohortHealth() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    let alive = true;
    api.cohort()
      .then((r) => { if (alive) setD(r); })
      .catch((e) => { if (alive) setErr(e.message); });
    return () => { alive = false; };
  }, []);

  if (err) return <div className="card p-5 text-sm text-red-600">{err}</div>;
  if (!d) return <div className="card p-5 text-sm text-muted">Loading cohort health…</div>;

  const { participation: p, scoring: s, trend: t } = d;
  const noQuizYet = p.delivered === 0;

  return (
    <section className="card p-6">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-bold text-brand text-lg">Cohort health</h2>
          <p className="text-xs text-muted">Today, as a share of the children who were due a quiz</p>
        </div>
        <span className="text-xs font-semibold text-muted">
          {p.expected} {p.expected === 1 ? 'child' : 'children'} expected
        </span>
      </div>

      {noQuizYet ? (
        <p className="mt-5 text-sm text-muted">
          No quiz has gone out yet today. Figures appear once the evening run starts.
        </p>
      ) : (
        <>
          {/* who turned up */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-5">
            <Stat label="Quiz delivered" pct={p.delivered_pct} of={p.delivered} ofLabel="sent"
                  hint={p.pending ? `${p.pending} still queued` : undefined} />
            <Stat label="Started" pct={p.started_pct} of={p.started} ofLabel="opened it" tone="brand" />
            <Stat label="Completed" pct={p.completed_pct} of={p.completed} ofLabel="finished"
                  tone={p.completed_pct >= 70 ? 'good' : p.completed_pct >= 40 ? 'warn' : 'bad'} />
            <Stat label="Finish rate" pct={p.finish_rate_pct} of={p.started} ofLabel="who started"
                  tone={p.finish_rate_pct >= 80 ? 'good' : 'warn'}
                  hint="dropped mid-quiz if low" />
          </div>

          <hr className="my-6 border-line" />

          {/* how well they did */}
          <div className="flex items-baseline justify-between">
            <h3 className="font-bold text-brand text-sm">How they scored</h3>
            <span className="text-xs text-muted">
              average <b className="text-brand">{s.avg_pct}%</b> across {s.scored} scored
            </span>
          </div>
          <div className="grid sm:grid-cols-3 gap-5 mt-4">
            <Stat label="Scored well (80%+)" pct={s.excellent_pct} of={s.excellent} ofLabel="children" tone="good" />
            <Stat label="Getting there (60–79%)" pct={s.fair_pct} of={s.fair} ofLabel="children" tone="warn" />
            <Stat label="Needs help (under 60%)" pct={s.needs_help_pct} of={s.needs_help} ofLabel="children" tone="bad" />
          </div>

          <hr className="my-6 border-line" />

          {/* movement against their own last quiz */}
          <div className="flex items-baseline justify-between flex-wrap gap-2">
            <h3 className="font-bold text-brand text-sm">Compared with their own last quiz</h3>
            <span className="text-xs text-muted">
              {t.comparable
                ? <>average change <b className={t.avg_change >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                    {t.avg_change > 0 ? '+' : ''}{t.avg_change}%
                  </b></>
                : 'first quiz for everyone today'}
            </span>
          </div>
          {t.comparable ? (
            <div className="grid sm:grid-cols-3 gap-5 mt-4">
              <Stat label="Improved" pct={t.improved_pct} of={t.improved} ofLabel="children" tone="good" />
              <Stat label="Held steady" pct={t.held_pct} of={t.held} ofLabel="children" />
              <Stat label="Slipped" pct={t.declined_pct} of={t.declined} ofLabel="children" tone="bad" />
            </div>
          ) : (
            <p className="text-sm text-muted mt-3">
              Nobody has a previous quiz to compare against yet, so there is no movement to show.
            </p>
          )}

          {/* Small numbers make percentages misleading; say so rather than
              letting a 100% built on two children look like a trend. */}
          {p.expected > 0 && p.expected < 10 && (
            <p className="mt-6 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
              Only {p.expected} {p.expected === 1 ? 'child is' : 'children are'} enrolled, so each one moves
              these percentages a great deal. Read the counts, not the shares, until the cohort is larger.
            </p>
          )}
        </>
      )}
    </section>
  );
}
