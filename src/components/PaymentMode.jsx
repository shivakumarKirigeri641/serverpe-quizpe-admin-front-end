/**
 * Razorpay test/live toggle — OTP-gated.
 *
 * Live mode charges real money, so switching it is a two-step, second-factor
 * action: request a code to the super admin's phone, then confirm with it. The
 * switch is disabled if the server has no keys for the target mode.
 */

import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function PaymentMode() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(null);   // mode awaiting OTP
  const [otp, setOtp] = useState('');
  const [note, setNote] = useState('');

  const load = () => api.paymentMode().then(setD).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  const begin = async (mode) => {
    if (busy || !d || d.mode === mode) return;
    if (mode === 'live' && !window.confirm(
      'Switch to LIVE mode?\n\nReal payments will be charged to customers. You will confirm with an OTP next.')) return;
    setBusy(true); setErr(''); setNote('');
    try {
      const r = await api.requestModeOtp();
      setPending(mode); setOtp('');
      setNote(r.message || 'Code sent to your number.');
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const confirm = async () => {
    if (busy || otp.length !== 4) return;
    setBusy(true); setErr('');
    try {
      const r = await api.setPaymentMode(pending, otp);
      setD((x) => ({ ...x, mode: r.mode })); setPending(null); setOtp(''); setNote('');
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  if (err && !d) return <div className="card p-5 text-sm text-red-600">{err}</div>;
  if (!d) return <div className="card p-5 text-sm text-muted">Loading payment mode…</div>;

  const live = d.mode === 'live';

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-bold text-brand text-lg">Payment mode</h2>
          <p className="text-xs text-muted mt-0.5">Which Razorpay keys the checkout uses. Changing it needs an OTP.</p>
        </div>
        <span className={`text-xs font-black px-3 py-1 rounded-full ${live ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'}`}>
          {live ? '🔴 LIVE — real money' : '🧪 TEST — no real charges'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-5">
        {[
          { m: 'test', label: 'Test', hint: 'Sandbox keys · test cards', present: d.test_keys_present },
          { m: 'live', label: 'Live', hint: 'Real keys · real charges', present: d.live_keys_present },
        ].map(({ m, label, hint, present }) => {
          const active = d.mode === m;
          return (
            <button key={m} type="button" disabled={busy || !present || active || !!pending}
              onClick={() => begin(m)}
              className={`text-left rounded-xl border-2 p-4 transition
                ${active ? (m === 'live' ? 'border-rose-500 bg-rose-50' : 'border-amber-500 bg-amber-50') : 'border-line hover:border-brand/40'}
                ${(!present || active) ? 'cursor-default' : 'cursor-pointer'} ${!present ? 'opacity-50' : ''}`}>
              <div className="flex items-center justify-between">
                <span className="font-bold text-brand">{label} mode</span>
                {active && <span className="text-[11px] font-bold text-brand">● ACTIVE</span>}
              </div>
              <p className="text-[11px] text-muted mt-1">{hint}</p>
              {!present && <p className="text-[11px] text-red-600 mt-1">Keys not configured on server</p>}
            </button>
          );
        })}
      </div>

      {pending && (
        <div className="mt-4 rounded-xl border border-brand/30 bg-brand/5 p-4">
          <p className="text-sm font-semibold text-brand">
            Confirm switch to <b>{pending.toUpperCase()}</b> mode
          </p>
          {note && <p className="text-xs text-muted mt-1">{note}</p>}
          <div className="flex gap-2 mt-3">
            <input className="input text-center tracking-[0.4em] font-bold max-w-[140px]"
              inputMode="numeric" maxLength={4} placeholder="••••" value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))} autoFocus />
            <button className="btn-pri !py-2 !text-sm" disabled={busy || otp.length !== 4} onClick={confirm}>
              {busy ? 'Confirming…' : 'Confirm'}
            </button>
            <button className="btn-ghost !py-2 !text-sm" disabled={busy}
              onClick={() => { setPending(null); setOtp(''); setNote(''); setErr(''); }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {live && !pending && (
        <p className="mt-4 text-[11px] leading-relaxed text-rose-800 bg-rose-50 border border-rose-200 rounded-lg p-2.5">
          <b>Live mode is on.</b> Every checkout now charges the customer's real card/UPI/bank.
        </p>
      )}
      {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
    </div>
  );
}
