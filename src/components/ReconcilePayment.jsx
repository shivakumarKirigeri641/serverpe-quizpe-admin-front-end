/**
 * Recover a payment that was made but never activated — e.g. the webhook was
 * rejected (bad signature) or the event wasn't subscribed, so the parent paid
 * but got no plan, invoice or confirmation.
 *
 * Paste the Razorpay payment id (pay_…) from the Razorpay dashboard and this
 * runs the SAME idempotent finalize() the webhook would have: it activates the
 * plan, issues the GST invoice and sends the WhatsApp confirmation. Running it
 * twice is safe — it just returns the existing invoice.
 */

import { useState } from 'react';
import { api } from '../lib/api';
import { toast } from './Toaster.jsx';

export default function ReconcilePayment() {
  const [pid, setPid] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);

  const run = async () => {
    setBusy(true); setError(''); setDone(null);
    try {
      const r = await api.reconcilePayment(pid.trim());
      setDone(r);
      toast(r.already ? 'Already activated — invoice returned.' : 'Payment activated + invoice sent.', 'success');
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const valid = /^pay_/.test(pid.trim());

  return (
    <div className="card p-5 border-amber-200">
      <h3 className="font-bold text-amber-700 mb-1">Recover a payment</h3>
      <p className="text-xs text-muted mb-3">
        If a parent paid but got no invoice/confirmation, paste the Razorpay payment id (from the
        Razorpay dashboard) to activate it. Safe to run twice — it never double-charges or double-issues.
      </p>

      <div className="flex gap-2 items-center">
        <input className="input font-mono" placeholder="pay_XXXXXXXXXXXXXX" value={pid}
               onChange={(e) => { setPid(e.target.value); setError(''); setDone(null); }} />
        <button className="btn-pri whitespace-nowrap" disabled={!valid || busy} onClick={run}>
          {busy ? 'Recovering…' : 'Activate payment'}
        </button>
      </div>

      {error && <div className="mt-3 text-sm text-red-600">{error}</div>}

      {done && (
        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900/90">
          <div className="font-bold text-green-800 mb-1">
            {done.already ? '✅ Was already activated' : '✅ Activated'}
          </div>
          <div>Invoice: <b className="font-mono">{done.invoice || '—'}</b></div>
          {done.end_date && <div>Valid till: <b>{String(done.end_date).slice(0, 10)}</b></div>}
          {done.midplan && <div className="text-xs text-muted mt-1">Mid-plan add-child.</div>}
        </div>
      )}
    </div>
  );
}
