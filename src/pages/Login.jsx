/**
 * src/pages/Login.jsx
 * ---------------------------------------------------------------------------
 * Single-password sign-in. No mobile, no OTP — the server checks the password
 * (ADMIN_PASSWORD / ADMIN_PASSWORD_HASH) and signs you in as the super admin.
 *
 * NOTE: one shared secret, no second factor — use a long, unique password. The
 * mobile+OTP endpoint still exists on the server as a stronger fallback.
 * ---------------------------------------------------------------------------
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import { useBrand } from '../App.jsx';

export default function Login({ onSignedIn }) {
  const { business, logos } = useBrand();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const signIn = async (e) => {
    e.preventDefault();
    if (busy || !password) return;
    setBusy(true); setError('');
    try {
      const r = await api.loginPassword(password);
      onSignedIn(r.token);
    } catch (err) {
      setError(err.message);
      setPassword('');
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-brand-deep via-brand to-brand-light p-6">
      <motion.form
        onSubmit={signIn}
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

        <label className="block text-xs font-bold text-muted mb-1.5">Password</label>
        <input
          className="input"
          type="password"
          autoFocus
          autoComplete="current-password"
          placeholder="Enter admin password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && (
          <motion.p initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                    className="text-sm text-red-600 mt-3">{error}</motion.p>
        )}

        <button className="btn-pri w-full mt-4" disabled={busy || !password}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="mt-5 text-[11px] leading-relaxed text-muted">
          This panel shows children's data, parent phone numbers and GST records.
          Keep the password private — never share it.
        </p>
      </motion.form>
    </div>
  );
}
