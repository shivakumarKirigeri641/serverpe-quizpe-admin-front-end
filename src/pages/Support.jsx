/** Support tickets raised from the WhatsApp support form. */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import { Page, Loading, ErrorBox, Pill } from '../components/ui.jsx';

const TONE = { open: 'red', in_progress: 'amber', resolved: 'green', closed: 'grey' };
const NEXT = ['open', 'in_progress', 'resolved', 'closed'];

export default function Support() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    setError('');
    api.support().then((d) => setRows(d.rows)).catch((e) => setError(e.message));
  };
  useEffect(load, []);

  const setStatus = async (t, status) => {
    // optimistic: the panel is single-admin, so a conflict is near impossible
    setRows((rs) => rs.map((r) => (r.id === t.id ? { ...r, status } : r)));
    try { await api.updateTicket(t.id, status); }
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
              <Pill tone={TONE[t.status]}>{t.status.replace('_', ' ')}</Pill>
              <span className="text-xs text-muted">{t.query_type.replace('_', ' ')}</span>
              <span className="text-xs text-muted ml-auto">
                {new Date(t.created_at).toLocaleString('en-IN')}
              </span>
            </div>
            <p className="text-sm mb-3 whitespace-pre-wrap">{t.message}</p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
              <span>{t.user_name || 'Unnamed'} · {t.mobile_number}</span>
              <div className="ml-auto flex gap-1">
                {NEXT.filter((s) => s !== t.status).map((s) => (
                  <button key={s} onClick={() => setStatus(t, s)}
                          className="btn-sec text-[11px] py-1 px-2.5">
                    Mark {s.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
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
