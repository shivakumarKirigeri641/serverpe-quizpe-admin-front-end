/**
 * Danger zone: deactivate or permanently delete a parent or a child.
 *
 * Deliberately awkward. It shows exactly what would be destroyed, defaults to
 * the reversible option, and requires the mobile number (or child's name) to
 * be typed out before permanent deletion is even enabled. When invoices or
 * payments exist the API refuses outright and the button is not offered at
 * all — GST records have a statutory retention period.
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getToken } from '../lib/api';

async function call(path, method, body) {
  const res = await fetch(`/admin/api${path}`, {
    method,
    headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok || d.success === false) throw new Error(d.error || 'Request failed');
  return d;
}

export default function DangerZone({ kind, id, label, onDone }) {
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState(null);
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const base = kind === 'parent' ? `/parents/${id}` : `/students/${id}`;

  useEffect(() => {
    if (open && !info) {
      call(`${base}/impact`, 'GET').then(setInfo).catch((e) => setError(e.message));
    }
  }, [open]);

  const act = async (hard) => {
    setBusy(true); setError('');
    try {
      await call(`${base}${hard ? '?hard=1' : ''}`, 'DELETE', hard ? { confirm } : undefined);
      onDone(hard ? 'deleted' : 'deactivated');
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const i = info?.impact || {};
  const ready = confirm.trim() === String(info?.confirmWith || '').trim();

  return (
    <div className="card border-red-200 overflow-hidden mt-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-red-50/60 transition"
      >
        <span className="text-red-600">⚠️</span>
        <span className="font-bold text-red-700 text-sm">Danger zone</span>
        <span className="text-xs text-muted ml-auto">{open ? 'Hide' : 'Show'}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-red-50/40"
          >
            <div className="p-5">
              {!info && !error && <p className="text-sm text-muted">Checking what this would affect…</p>}

              {info && (
                <>
                  <p className="text-sm font-semibold text-red-800 mb-2">
                    Deleting {label} would affect:
                  </p>
                  <ul className="text-sm text-red-700 mb-4 space-y-0.5">
                    {kind === 'parent' && <li>• {i.students} child record(s)</li>}
                    <li>• {i.quizzes} quiz{i.quizzes === 1 ? '' : 'zes'} and all answers</li>
                    {kind === 'parent' && <li>• {i.subscriptions} subscription(s)</li>}
                    {kind === 'parent' && <li>• {i.invoices} invoice(s), {i.payments} payment(s)</li>}
                    {kind === 'student' && <li>• {i.reports} report PDF(s)</li>}
                  </ul>

                  <div className="rounded-xl bg-white border border-line p-4 mb-3">
                    <p className="text-sm font-semibold mb-1">Deactivate (recommended)</p>
                    <p className="text-xs text-muted mb-3">
                      Stops quizzes and hides them from lists. Nothing is lost and it can be undone.
                    </p>
                    <button className="btn-sec" disabled={busy} onClick={() => act(false)}>
                      Deactivate {label}
                    </button>
                  </div>

                  {info.canHardDelete ? (
                    <div className="rounded-xl bg-white border-2 border-red-300 p-4">
                      <p className="text-sm font-semibold text-red-700 mb-1">Delete permanently</p>
                      <p className="text-xs text-muted mb-3">
                        This cannot be undone. Type <b className="text-red-700">{info.confirmWith}</b> to enable.
                      </p>
                      <input
                        className="input mb-3 border-red-200" value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        placeholder={info.confirmWith}
                      />
                      <button
                        className="btn bg-red-600 text-white hover:bg-red-700 disabled:bg-red-200"
                        disabled={!ready || busy} onClick={() => act(true)}
                      >
                        {busy ? 'Deleting…' : 'Permanently delete'}
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
                      <b>Permanent deletion is not available.</b>
                      <p className="mt-1 text-xs">{info.blockedReason}</p>
                    </div>
                  )}
                </>
              )}

              {error && <p className="text-sm text-red-700 mt-3 font-semibold">{error}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
