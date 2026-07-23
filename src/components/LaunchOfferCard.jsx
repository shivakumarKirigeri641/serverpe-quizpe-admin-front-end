/**
 * Founding-families seats remaining.
 *
 * The number that decides when your pricing changes, so it sits on the
 * dashboard rather than buried in Settings. Once the seats are gone the card
 * stays — knowing the offer has ended is as useful as knowing it is running.
 */

import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function LaunchOfferCard() {
  const [o, setO] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    let alive = true;
    api.launchOffer()
      .then((r) => { if (alive) setO(r); })
      .catch((e) => { if (alive) setErr(e.message); });
    return () => { alive = false; };
  }, []);

  if (err) return <div className="card p-5 text-sm text-red-600">{err}</div>;
  if (!o) return <div className="card p-5 text-sm text-muted">Loading…</div>;

  const done = !o.active;

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-brand">{o.label}</h2>
          <p className="text-xs text-muted mt-0.5">
            {done
              ? o.enabled ? 'All seats taken — everyone now pays the regular price.'
                          : 'Offer switched off in Settings.'
              : 'Launch pricing while seats last'}
          </p>
        </div>
        <span className={`text-[10px] font-extrabold uppercase px-2 py-1 rounded-full ${
          done ? 'bg-slate-100 text-muted' : 'bg-emerald-100 text-emerald-700'}`}>
          {done ? 'ended' : 'live'}
        </span>
      </div>

      <div className="flex items-end gap-2 mt-3">
        <p className="text-3xl font-black text-brand">{o.remaining}</p>
        <p className="text-xs text-muted pb-1">of {o.cap} seats left</p>
      </div>

      <div className="h-2 rounded-full bg-line overflow-hidden mt-2">
        <div className={`h-full rounded-full transition-all ${done ? 'bg-slate-400' : 'bg-brand-accent'}`}
             style={{ width: `${o.pct_taken}%` }} />
      </div>
      <p className="text-[11px] text-muted mt-1.5">
        {o.taken} student{o.taken === 1 ? '' : 's'} enrolled at launch pricing
        {!done && o.remaining <= 10 && (
          <b className="text-rose-600"> · only {o.remaining} left, prices rise after this</b>
        )}
      </p>
    </div>
  );
}
