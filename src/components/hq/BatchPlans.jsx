import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAutoRefresh } from '../../lib/useAutoRefresh';
import { Pill } from '../ui.jsx';
import { Modal, num, dt } from './kit.jsx';

/*
 * BROADCAST IN BATCHES (admin revamp, 2026-10-05) — as on GaadiPe's panel.
 * The WhatsApp allowance (250 people messaged first in any 24 hours) is shared
 * by QuizPe and GaadiPe, so a message to everyone goes in parts: one batch,
 * then the next 24 hours later, never more than the room left, until all are
 * reached. The server does it on its own (src/admin/hq/plans.js); each batch
 * goes through the same sender as the Send button, STOP always skipped.
 */

/** "Today: 120 of 250 used — this fits / does not fit." */
export function LimitNote({ count }) {
  const [lim, setLim] = useState(null);
  useEffect(() => { api.hq.limit().then(setLim).catch(() => {}); }, [count]);
  if (!lim || !count) return null;
  const fits = count <= lim.free_for_broadcast;
  return (
    <div className={`rounded-xl border p-3 text-xs ${fits ? 'border-sky-200 bg-sky-50 text-sky-900' : 'border-amber-300 bg-amber-50 text-amber-900'}`}>
      {fits
        ? <>WhatsApp limit: {num(lim.used)} of {num(lim.limit)} used in the last 24 hours ({lim.linked ? `QuizPe ${lim.quizpe} + GaadiPe ${lim.gaadipe}` : 'QuizPe only'}). This fits — {num(lim.free_for_broadcast)} free, keeping {lim.reserve} for quiz messages.</>
        : <>⚠️ <b>{num(count)}</b> chosen, but only <b>{num(lim.free_for_broadcast)}</b> can be messaged now without crowding out tonight's quiz messages ({num(lim.used)} of {num(lim.limit)} used, shared with GaadiPe). Use <b>Send in batches</b>.</>}
    </div>
  );
}

function outline(total, size, gap) {
  const parts = [];
  for (let i = 0, left = total; left > 0 && i < 10; i += 1) {
    const n = Math.min(size, left);
    parts.push(`${i === 0 ? 'Batch 1 now' : `Batch ${i + 1} after ${gap * i} h`}: ${num(n)}`);
    left -= n;
  }
  const batches = Math.ceil(total / Math.max(1, size));
  if (batches > 10) parts.push(`… ${batches} batches in all`);
  return { parts, batches };
}

export function BatchSend({ template, params, mobiles, onClose, onCreated }) {
  const [size, setSize] = useState('100');
  const [gap, setGap] = useState('24');
  const [reserve, setReserve] = useState('50');
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const s = Math.max(1, Math.round(Number(size) || 1));
  const g = Math.max(1, Number(gap) || 24);
  const plan = outline(mobiles.length, s, g);
  const create = async () => {
    setBusy(true);
    try {
      const out = await api.hq.createPlan({ template, params, mobiles, batch_size: s, gap_hours: g, reserve: Math.max(0, Math.round(Number(reserve) || 0)), confirm: 'SEND' });
      onCreated(out);
    } catch { /* the toast says why */ } finally { setBusy(false); }
  };
  return (
    <Modal title="Send in batches" subtitle={`${template} · ${num(mobiles.length)} number(s)`} onClose={onClose}>
      <p className="text-sm text-ink">QuizPe sends one batch, waits, then sends the next — never over the WhatsApp limit shared with GaadiPe — until everyone has it. Someone whose message fails is tried once more later. Anyone who replied STOP is skipped.</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <label className="block text-xs text-muted">People per batch<input className="input mt-1" type="number" min="1" value={size} onChange={(e) => setSize(e.target.value)} /></label>
        <label className="block text-xs text-muted">Hours between<input className="input mt-1" type="number" min="1" value={gap} onChange={(e) => setGap(e.target.value)} /></label>
        <label className="block text-xs text-muted">Keep free<input className="input mt-1" type="number" min="0" value={reserve} onChange={(e) => setReserve(e.target.value)} /></label>
      </div>
      <p className="mt-1 text-[11px] text-muted">“Keep free” leaves room each day for quiz reminders and GaadiPe. 24 hours between batches lets the earlier batch leave the window.</p>
      <div className="mt-3 rounded-xl bg-line/40 p-3 text-xs text-ink">
        <b>The plan:</b>
        <ul className="mt-1 list-disc pl-5">{plan.parts.map((p) => <li key={p}>{p}</li>)}</ul>
      </div>
      <label className="mt-3 block text-xs text-muted">Type SEND to confirm
        <input className="input mt-1" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="SEND" /></label>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" className="btn-sec" onClick={onClose} disabled={busy}>Cancel</button>
        <button type="button" className="btn-pri" onClick={create} disabled={typed !== 'SEND' || busy}>{busy ? 'Starting…' : `Start ${plan.batches} batch(es)`}</button>
      </div>
    </Modal>
  );
}

const STATUS = { running: ['▶ Running', 'green'], paused: ['⏸ Paused', 'amber'], done: ['✓ Done', 'grey'], cancelled: ['✕ Cancelled', 'grey'] };

export function PlansSection({ refreshKey }) {
  const [d, setD] = useState(null);
  const load = useCallback(() => api.hq.plans().then(setD).catch(() => {}), []);
  useEffect(() => { load(); }, [load, refreshKey]);
  useAutoRefresh(load, 30000);
  if (!d || !d.rows.length) return null;
  const act = async (p, action) => {
    const ask = { pause: 'Pause this plan? No new batch starts until you resume.', resume: 'Resume this plan?', cancel: 'Cancel this plan? No more batches will be sent.' }[action];
    if (!window.confirm(ask)) return;
    await api.hq.planAction(p.id, action).catch(() => {});
    load();
  };
  return (
    <div className="card mt-4 overflow-hidden">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-4 py-3">
        <h2 className="font-bold text-brand">Broadcasts in batches</h2>
        <span className="text-[11px] text-muted">WhatsApp limit now: {num(d.limit.used)} of {num(d.limit.limit)} used in 24 h{d.limit.linked ? ' (with GaadiPe)' : ''}</span>
      </div>
      <div className="divide-y divide-line">
        {d.rows.map((p) => {
          const [label, tone] = STATUS[p.status] || [p.status, 'grey'];
          const pct = p.total ? Math.round((p.sent / p.total) * 100) : 0;
          return (
            <div key={p.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <b className="text-sm text-ink">{p.template}</b><span className="text-[11px] text-muted">plan #{p.id}</span><Pill tone={tone}>{label}</Pill>
                {(p.status === 'running' || p.status === 'paused') && (
                  <span className="ml-auto flex gap-1.5">
                    {p.status === 'running'
                      ? <button type="button" className="btn-sec !px-2.5 !py-1 text-xs" onClick={() => act(p, 'pause')}>Pause</button>
                      : <button type="button" className="btn-sec !px-2.5 !py-1 text-xs" onClick={() => act(p, 'resume')}>Resume</button>}
                    <button type="button" className="btn-sec !px-2.5 !py-1 text-xs text-red-700" onClick={() => act(p, 'cancel')}>Cancel</button>
                  </span>
                )}
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-line/60" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full bg-brand-accent" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
                <span><b className="text-ink">{num(p.sent)}</b> of {num(p.total)} reached ({pct}%)</span>
                {p.left > 0 && <span>{num(p.left)} still to go</span>}
                {p.skipped > 0 && <span>{num(p.skipped)} skipped (STOP)</span>}
                {p.gave_up > 0 && <span className="text-red-700">{num(p.gave_up)} failed twice</span>}
                <span>{p.batches} batch(es) of up to {num(p.batch_size)} · every {p.gap_hours} h · {num(p.reserve)} kept free</span>
                {p.status === 'running' && p.left > 0 && <span>Next batch: <b className="text-ink">{dt(p.next_at)}</b></span>}
              </div>
              {p.last_note && <div className="mt-1 text-[11px] text-ink">{p.last_note}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
