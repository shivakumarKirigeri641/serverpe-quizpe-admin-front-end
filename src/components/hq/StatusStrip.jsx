import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useRefreshSignal } from '../../lib/motion.jsx';
import { WHATSAPP_ADMIN } from '../../lib/flags';

const WA_LIGHTS = new Set(['whatsapp', 'limit', 'peer']);

/*
 * THE STATUS STRIP (admin revamp, 2026-10-05) — like GaadiPe's: one light per
 * thing QuizPe depends on (WhatsApp, the shared daily limit, the database,
 * the quiz scheduler, Razorpay, the GaadiPe link). Hover or tap a light for
 * what it means and why it is that colour. The card opens BELOW and to the
 * side of the light, so it never sits under the pointer.
 */
const DOT = { ok: 'bg-emerald-500', warn: 'bg-amber-400', down: 'bg-red-500', off: 'bg-gray-300' };
const WORD = { ok: 'Working', warn: 'Needs a look', down: 'Problem', off: 'Off' };
const ABOUT = {
  whatsapp: 'The QuizPe WhatsApp number as Meta sees it: quality rating, messaging limit tier, and whether it may start chats.',
  limit: 'People messaged FIRST (templates) in the last 24 hours, QuizPe and GaadiPe together — Meta allows 250 a day for both.',
  db: 'QuizPe’s database answering the panel.',
  jobs: 'The quiz scheduler that sends quizzes and reminders. It records a heartbeat every minute.',
  payments: 'Razorpay keys for plan payments.',
  peer: 'A read-only link to GaadiPe’s database, used only to count its messages in the shared limit.',
};

export default function StatusStrip() {
  const [rows, setRows] = useState(null);
  const [open, setOpen] = useState(null);
  // WhatsApp, its shared limit and the GaadiPe link that counts it are left out while WhatsApp is gone (2026-10-10).
  const load = useCallback(() => api.hq.status().then((x) => setRows((x.rows || []).filter((r) => WHATSAPP_ADMIN || !WA_LIGHTS.has(r.key)))).catch(() => {}), []);
  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, [load]);
  useRefreshSignal(load);
  if (!rows) return null;
  return (
    <div className="flex items-center gap-1 overflow-x-auto px-4 py-1.5 bg-white border-b border-line/70 text-[11px]">
      {rows.map((r) => (
        <div key={r.key} className="relative shrink-0"
          onMouseEnter={() => setOpen(r.key)} onMouseLeave={() => setOpen(null)}>
          <button type="button" onClick={() => setOpen(open === r.key ? null : r.key)}
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1 hover:bg-line/40"
            aria-label={`${r.label}: ${WORD[r.state] || r.state}`}>
            <span className={`h-2 w-2 rounded-full ${DOT[r.state] || DOT.off} ${r.state === 'down' ? 'animate-pulse' : ''}`} />
            <span className="font-semibold text-ink">{r.label}</span>
          </button>
          {open === r.key && (
            <div className="absolute left-2 top-full z-50 mt-2 w-72 rounded-xl border border-line bg-white p-3 text-xs shadow-card" role="tooltip">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${DOT[r.state] || DOT.off}`} />
                <b className="text-ink">{r.label} · {WORD[r.state] || r.state}</b>
              </div>
              <p className="mt-1.5 text-ink">{r.detail}</p>
              {(r.notes || []).length > 0 && <ul className="mt-1.5 list-disc pl-4 text-amber-700">{r.notes.map((n) => <li key={n}>{n}</li>)}</ul>}
              <p className="mt-2 text-muted">{ABOUT[r.key]}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
