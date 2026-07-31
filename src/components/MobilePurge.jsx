/**
 * Danger zone — permanently remove a mobile number and everything hanging off
 * it (WhatsApp chat, consents, links, a trial family that never paid).
 *
 * Two hard rules, both enforced server-side as well:
 *   • a number that has EVER transacted (any invoice or payment) is refused —
 *     GST records must be retained.
 *   • deletion is irreversible, so it is gated behind a one-time code sent to
 *     the admin's own phone.
 *
 * Flow: type the number → we show its status + exactly what would be removed →
 * "Send code" → enter the 4-digit OTP → "Delete permanently".
 */

import { useState } from 'react';
import { api } from '../lib/api';
import { Pill } from './ui.jsx';

const TONE = { transacted: 'blue', trial: 'amber', lead: 'grey', none: 'grey' };
const LABEL = {
  transacted: 'Has payments — protected',
  trial: 'On record, never paid',
  lead: 'Lead — chat only',
  none: 'Nothing on file',
};

export default function MobilePurge() {
  const [mobile, setMobile] = useState('');
  const [st, setSt] = useState(null);        // status lookup
  const [stage, setStage] = useState('idle'); // idle | otp | done
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [removed, setRemoved] = useState(null);

  const clean = (v) => v.replace(/\D/g, '').slice(-10);
  const ten = clean(mobile).length === 10;

  const reset = () => { setSt(null); setStage('idle'); setOtp(''); setError(''); setMsg(''); setRemoved(null); };

  const check = async () => {
    setBusy(true); setError(''); setMsg(''); setRemoved(null); setStage('idle'); setSt(null);
    try { const r = await api.mobileLookup(clean(mobile)); setSt(r.status); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const sendOtp = async () => {
    setBusy(true); setError('');
    try {
      const r = await api.mobilePurgeOtp(st.mobile);
      setStage('otp'); setMsg(`Code sent to your phone (${r.to}). Valid ~${r.ttlMin} min.`);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const purge = async () => {
    setBusy(true); setError('');
    try {
      const r = await api.mobilePurge(st.mobile, otp);
      setRemoved(r.removed || {}); setStage('done'); setMsg(`${st.mobile} and its data were deleted.`);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const rows = st && [
    ['Children', st.students], ['Quizzes', st.quizzes], ['Subscriptions', st.subscriptions],
    ['WhatsApp messages', st.messages], ['Invoices', st.invoices], ['Payments', st.payments],
  ].filter(([, n]) => n > 0);

  return (
    <div className="card p-5 border-red-200">
      <h3 className="font-bold text-red-700 mb-1">Remove a mobile number</h3>
      <p className="text-xs text-muted mb-3">
        Deletes a number and all its dependent rows. Refused if any payment or invoice exists —
        those must be retained for GST. Irreversible, so it needs a code sent to your phone.
      </p>

      <div className="flex gap-2 items-center">
        <input className="input font-mono" placeholder="10-digit mobile" value={mobile}
               onChange={(e) => { setMobile(e.target.value); reset(); }} maxLength={14} />
        <button className="btn-sec whitespace-nowrap" disabled={!ten || busy} onClick={check}>
          {busy && !st ? 'Checking…' : 'Check'}
        </button>
      </div>

      {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
      {msg && !error && <div className="mt-3 text-sm text-green-700">{msg}</div>}

      {st && stage !== 'done' && (
        <div className="mt-4 rounded-xl border border-line/70 p-4 bg-line/10">
          <div className="flex items-center gap-2 mb-2">
            <b className="font-mono">{st.mobile}</b>
            {st.parent_name && <span className="text-sm text-muted">· {st.parent_name}</span>}
            <Pill tone={TONE[st.status]}>{LABEL[st.status]}</Pill>
          </div>

          {rows.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 text-sm mb-3">
              {rows.map(([k, n]) => (
                <div key={k} className="flex justify-between border-b border-line/50 py-0.5">
                  <span className="text-muted">{k}</span><b>{n}</b>
                </div>
              ))}
            </div>
          )}

          {st.transacted ? (
            <p className="text-sm text-blue-700">
              This number has {st.invoices} invoice(s) and {st.payments} payment(s). It is protected and
              cannot be deleted — deactivate the parent instead if needed.
            </p>
          ) : !st.canDelete ? (
            <p className="text-sm text-muted">Nothing on file for this number to delete.</p>
          ) : stage === 'idle' ? (
            <button className="btn-pri bg-red-600 hover:bg-red-700 border-red-600" disabled={busy} onClick={sendOtp}>
              {busy ? 'Sending…' : 'Send code to delete'}
            </button>
          ) : (
            <div className="flex flex-wrap gap-2 items-center">
              <input className="input w-28 tracking-widest text-center font-mono" placeholder="0000"
                     value={otp} maxLength={4} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} />
              <button className="btn-pri bg-red-600 hover:bg-red-700 border-red-600"
                      disabled={busy || otp.length !== 4} onClick={purge}>
                {busy ? 'Deleting…' : 'Delete permanently'}
              </button>
              <button className="btn-sec" disabled={busy} onClick={reset}>Cancel</button>
            </div>
          )}
        </div>
      )}

      {stage === 'done' && removed && (
        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4">
          <div className="font-bold text-green-800 mb-1">✅ Deleted</div>
          {Object.keys(removed).length > 0 ? (
            <div className="text-sm text-green-900/80">
              Removed: {Object.entries(removed).map(([k, n]) => `${n} ${k.replace(/_/g, ' ')}`).join(', ')}.
            </div>
          ) : <div className="text-sm text-green-900/80">The number carried no rows.</div>}
          <button className="btn-sec mt-3" onClick={() => { setMobile(''); reset(); }}>Remove another</button>
        </div>
      )}
    </div>
  );
}
