import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAutoRefresh } from '../lib/useAutoRefresh';
import { Page, Loading, ErrorBox, Empty, Pill } from '../components/ui.jsx';

/**
 * src/pages/AuditLog.jsx
 * ---------------------------------------------------------------------------
 * What administrators did.
 *
 * It records only administrative actions — a broadcast sent, free access
 * granted — never a parent's or a child's message content. The summary on each
 * row is written by the route that performed the action, so it says what
 * actually happened rather than dumping a request body and hoping.
 *
 * An empty log is not an error. Before the migration runs, and before anyone
 * does anything worth recording, there is correctly nothing here.
 */

export default function AuditLog() {
  const [rows, setRows] = useState(null);
  const [summary, setSummary] = useState([]);
  const [days, setDays] = useState(30);
  const [action, setAction] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    setError('');
    return Promise.all([api.auditList(days, action || null), api.auditSummary(days)])
      .then(([l, s]) => { setRows(l.rows); setSummary(s.rows); })
      .catch((e) => setError(e.message));
  };

  useEffect(() => { load(); }, [days, action]);
  useAutoRefresh(load, 60000);

  if (error) return <ErrorBox error={error} onRetry={load} />;
  if (!rows) return <Loading label="Reading the audit log…" />;

  return (
    <Page
      title="Audit log"
      subtitle="Every administrative action, who did it, and when"
      actions={
        <div className="flex gap-1">
          {[7, 30, 90].map((n) => (
            <button
              key={n} onClick={() => setDays(n)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                days === n ? 'bg-brand-accent text-white' : 'bg-white border border-line text-muted hover:bg-line/40'}`}
            >{n} days</button>
          ))}
        </div>
      }
    >
      {summary.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          <button
            onClick={() => setAction('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              !action ? 'bg-brand-accent text-white' : 'bg-white border border-line text-muted hover:bg-line/40'}`}
          >
            All
          </button>
          {summary.map((s) => (
            <button
              key={s.action}
              onClick={() => setAction(s.action === action ? '' : s.action)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                action === s.action ? 'bg-brand-accent text-white' : 'bg-white border border-line text-muted hover:bg-line/40'}`}
              title={`last ${s.last_at}`}
            >
              {s.action} <span className="opacity-60">{s.times}</span>
            </button>
          ))}
        </div>
      )}

      {!rows.length ? (
        <Empty>
          Nothing recorded yet. Administrative actions appear here as they happen —
          broadcasts, free access grants, and anything else worth remembering.
        </Empty>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">When</th>
                <th className="th">Who</th>
                <th className="th">Action</th>
                <th className="th">What</th>
                <th className="th">Target</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-line/20">
                  <td className="td whitespace-nowrap tabular-nums text-muted">{r.at}</td>
                  <td className="td tabular-nums">{r.admin_mobile || <span className="text-muted">—</span>}</td>
                  <td className="td"><Pill tone="blue">{r.action}</Pill></td>
                  <td className="td max-w-[380px]">
                    <div className="text-sm leading-snug">
                      {r.summary || <span className="text-muted">—</span>}
                    </div>
                    {r.after_state && (
                      <details className="mt-1">
                        <summary className="text-[11px] text-muted cursor-pointer">details</summary>
                        <pre className="text-[11px] text-muted mt-1 whitespace-pre-wrap break-all">
                          {JSON.stringify(r.after_state, null, 1)}
                        </pre>
                      </details>
                    )}
                  </td>
                  <td className="td text-[11px] text-muted">
                    {r.target_type ? `${r.target_type}${r.target_id ? ` · ${r.target_id}` : ''}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Page>
  );
}
