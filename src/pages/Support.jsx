/** Support tickets raised from the WhatsApp support form.
 *  Lifecycle: OPEN -> IN PROGRESS -> CLOSED (with a resolution note sent to the
 *  parent) / CANCELLED. A parent can re-open a closed ticket from the WhatsApp
 *  Support menu; re-opens show a badge here. */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import { Page, Loading, ErrorBox, Pill } from '../components/ui.jsx';

const TONE = { open: 'red', in_progress: 'amber', closed: 'green', cancelled: 'grey' };
const STATUSES = ['open', 'in_progress', 'closed', 'cancelled'];
const label = (s) => s.replace('_', ' ');

export default function Support() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [res, setRes] = useState({});   // ticket id -> resolution draft

  const load = () => {
    setError('');
    api.support().then((d) => {
      setRows(d.rows);
      setRes(Object.fromEntries(d.rows.map((r) => [r.id, r.resolution || ''])));
    }).catch((e) => setError(e.message));
  };
  useEffect(load, []);

  const setStatus = async (t, status) => {
    // Closing sends the resolution note to the parent (and offers them a re-open).
    const resolution = status === 'closed' ? (res[t.id] || '').trim() : undefined;
    setRows((rs) => rs.map((r) => (r.id === t.id ? { ...r, status, resolution: resolution ?? r.resolution } : r)));
    try { await api.updateTicket(t.id, status, resolution); }
    catch (e) { setError(e.message); load(); }
  };

  if (error && !rows) return <ErrorBox error={error} onRetry={load} />;
  if (!rows) return <Loading label="Loading tickets…" />;

  const open = rows.filter((r) => r.status === 'open').length;

  return (
    <Page title="Support" subtitle={`${open} open of ${rows.length} ticket${rows.length === 1 ? '' : 's'}`}>
      {error && <div className="card p-3 mb-3 text-sm text-red-700 bg-red-50 border-red-200">{error}</div>}
      <div className="space-y-3">
        {rows.map((t, i) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.3) }}
            className="card p-5"
          >
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <span className="font-mono text-sm font-bold text-brand">{t.ticket_no}</span>
              <Pill tone={TONE[t.status] || 'grey'}>{label(t.status)}</Pill>
              {t.reopen_count > 0 && <Pill tone="amber">re-opened ×{t.reopen_count}</Pill>}
              <span className="text-xs text-muted">{label(t.query_type)}</span>
              <span className="text-xs text-muted ml-auto">
                {new Date(t.created_at).toLocaleString('en-IN')}
              </span>
            </div>
            <p className="text-sm mb-3 whitespace-pre-wrap">{t.message}</p>

            {/* Resolution — written here, sent to the parent when the ticket is closed */}
            <div className="rounded-xl bg-line/20 p-3 mb-3">
              <label className="block text-[11px] font-bold uppercase tracking-wide text-muted mb-1.5">
                Resolution (sent to the parent on Close)
              </label>
              <textarea
                className="input min-h-[70px] text-sm"
                placeholder="Explain how it was resolved — this message goes to the parent."
                value={res[t.id] ?? ''}
                onChange={(e) => setRes((s) => ({ ...s, [t.id]: e.target.value }))}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
              <span>{t.user_name || 'Unnamed'} · {t.mobile_number}</span>
              <div className="ml-auto flex gap-1">
                {STATUSES.filter((s) => s !== t.status).map((s) => (
                  <button key={s} onClick={() => setStatus(t, s)}
                          className={`btn-sec text-[11px] py-1 px-2.5 ${s === 'closed' ? 'border-emerald-300 text-emerald-700' : s === 'cancelled' ? 'border-slate-300' : ''}`}>
                    Mark {label(s)}
                  </button>
                ))}
              </div>
            </div>
            {t.status !== 'closed' && !(res[t.id] || '').trim() && (
              <p className="text-[11px] text-amber-700 mt-2">
                Tip: write a resolution above before you tap <b>Mark closed</b> — that's the message the parent receives.
              </p>
            )}
          </motion.div>
        ))}
        {!rows.length && (
          <div className="card p-10 text-center text-muted text-sm">
            No support requests yet.
          </div>
        )}
      </div>
    </Page>
  );
}
