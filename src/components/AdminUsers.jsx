/**
 * Admin users — super-admin only.
 *
 * Adding an admin is a two-step OTP flow: enter the new person's mobile, a code
 * is sent to THAT number, and entering it proves the number is real and reachable
 * before access is granted. The super admin and yourself can't be removed here.
 */

import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function AdminUsers() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [mobile, setMobile] = useState('');
  const [step, setStep] = useState('mobile');   // 'mobile' | 'otp'
  const [otp, setOtp] = useState('');
  const [note, setNote] = useState('');

  const load = () => api.admins().then(setD).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  const digits = mobile.replace(/\D/g, '').slice(-10);
  const validMobile = /^[6-9]\d{9}$/.test(digits);

  const sendOtp = async () => {
    if (busy || !validMobile) return;
    setBusy(true); setErr(''); setNote('');
    try { const r = await api.requestAdminOtp(digits); setStep('otp'); setOtp(''); setNote(r.message); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const addAdmin = async () => {
    if (busy || otp.length !== 4) return;
    setBusy(true); setErr('');
    try {
      await api.addAdmin(digits, otp);
      setMobile(''); setOtp(''); setStep('mobile'); setNote('');
      await load();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const remove = async (m) => {
    if (!window.confirm(`Remove admin ${m}? They will no longer be able to sign in.`)) return;
    setErr('');
    try { await api.removeAdmin(m); await load(); } catch (e) { setErr(e.message); }
  };

  if (err && !d) return <div className="card p-5 text-sm text-red-600">{err}</div>;
  if (!d) return <div className="card p-5 text-sm text-muted">Loading admins…</div>;

  const active = d.rows.filter((r) => r.is_active);

  return (
    <div className="card p-6">
      <h2 className="font-bold text-brand text-lg">Admin users</h2>
      <p className="text-xs text-muted mt-0.5">People who can sign in to this panel. Only you (super admin) can manage this.</p>

      <div className="mt-4 rounded-xl border border-line divide-y divide-line overflow-hidden">
        {active.map((a) => (
          <div key={a.mobile_number} className="flex items-center justify-between p-3">
            <div>
              <span className="font-semibold text-brand">{a.mobile_number}</span>
              {a.is_super && <span className="ml-2 text-[10px] font-black bg-brand/10 text-brand px-2 py-0.5 rounded-full">SUPER</span>}
              {a.mobile_number === d.me && <span className="ml-2 text-[10px] text-muted">(you)</span>}
            </div>
            {!a.is_super && a.mobile_number !== d.me && (
              <button className="text-xs text-red-600 hover:underline" onClick={() => remove(a.mobile_number)}>Remove</button>
            )}
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-xl bg-slate-50 border border-line p-4">
        <p className="text-sm font-semibold text-brand mb-2">Add an admin</p>
        {step === 'mobile' ? (
          <div className="flex gap-2 flex-wrap">
            <input className="input max-w-[200px]" inputMode="numeric" maxLength={13}
              placeholder="New admin's 10-digit mobile" value={mobile}
              onChange={(e) => setMobile(e.target.value)} />
            <button className="btn-pri !py-2 !text-sm" disabled={busy || !validMobile} onClick={sendOtp}>
              {busy ? 'Sending…' : 'Send OTP'}
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted mb-2">{note}</p>
            <div className="flex gap-2 flex-wrap">
              <input className="input text-center tracking-[0.4em] font-bold max-w-[130px]"
                inputMode="numeric" maxLength={4} placeholder="••••" value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))} autoFocus />
              <button className="btn-pri !py-2 !text-sm" disabled={busy || otp.length !== 4} onClick={addAdmin}>
                {busy ? 'Adding…' : 'Verify & add'}
              </button>
              <button className="btn-ghost !py-2 !text-sm" disabled={busy}
                onClick={() => { setStep('mobile'); setOtp(''); setNote(''); setErr(''); }}>
                Change number
              </button>
            </div>
          </>
        )}
        {err && <p className="text-sm text-red-600 mt-2">{err}</p>}
      </div>
    </div>
  );
}
