/**
 * src/pages/Login.jsx
 * ---------------------------------------------------------------------------
 * Mobile number + PIN.
 *
 * ⚠️ The PIN is temporary and the screen says so out loud — this panel shows
 * children's names, parents' phone numbers and financial records, and the
 * warning is there so it cannot quietly ship to production unnoticed.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import { useBrand } from '../App.jsx';

export default function Login({ onSignedIn }) {
  const { business, logos } = useBrand();
  const [mobile, setMobile] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try {
      const r = await api.login(mobile.replace(/\D/g, ''), pin);
      onSignedIn(r.token);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-brand-deep via-brand to-brand-light p-6">
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 0.9, 0.28, 1] }}
        className="card w-full max-w-sm p-7"
      >
        <div className="flex items-center gap-3 mb-6">
          {logos['logo-mark'] && <img src={logos['logo-mark']} alt="" className="w-12 h-12 rounded-xl" />}
          <div>
            <h1 className="text-lg font-bold text-brand leading-tight">
              {business.product_name || 'QuizPe'} Admin
            </h1>
            <p className="text-xs text-muted">{business.company_name || ''}</p>
          </div>
        </div>

        <label className="block text-xs font-bold text-muted mb-1.5">Mobile number</label>
        <input
          className="input mb-4" inputMode="numeric" autoComplete="username"
          placeholder="10-digit number" value={mobile} maxLength={13}
          onChange={(e) => setMobile(e.target.value)}
        />

        <label className="block text-xs font-bold text-muted mb-1.5">PIN</label>
        <input
          className="input mb-4" type="password" inputMode="numeric" autoComplete="current-password"
          placeholder="••••" value={pin} maxLength={8}
          onChange={(e) => setPin(e.target.value)}
        />

        {error && (
          <motion.p
            initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
            className="text-sm text-red-600 mb-3"
          >{error}</motion.p>
        )}

        <button className="btn-pri w-full" disabled={busy || !mobile || !pin}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="mt-5 text-[11px] leading-relaxed text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
          <b>Temporary sign-in.</b> This panel shows children's data, parent phone
          numbers and GST records. Replace the PIN with SMS/OTP before hosting.
        </p>
      </motion.form>
    </div>
  );
}
