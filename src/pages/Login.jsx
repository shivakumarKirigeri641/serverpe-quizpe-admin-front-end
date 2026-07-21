/**
 * src/pages/Login.jsx
 * ---------------------------------------------------------------------------
 * Two-step sign-in: mobile number, then a 4-digit code sent by SMS.
 *
 * The code is short-lived, so the screen carries a live countdown and lets you
 * ask for another once it lapses. Without that, a code that quietly expired
 * looks identical to a code typed wrong, and you retype the same digits.
 */

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import { useBrand } from '../App.jsx';

export default function Login({ onSignedIn }) {
  const { business, logos } = useBrand();
  const [step, setStep] = useState('mobile');   // 'mobile' | 'code'
  const [mobile, setMobile] = useState('');
  const [code, setCode] = useState('');
  const [left, setLeft] = useState(0);          // seconds until the code lapses
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const codeRef = useRef(null);

  const digits = mobile.replace(/\D/g, '').slice(-10);
  const validMobile = /^[6-9]\d{9}$/.test(digits);

  useEffect(() => {
    if (left <= 0) return;
    const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [left]);

  // Move focus to the code box as soon as it appears, so the SMS can be typed
  // straight away without reaching for the mouse.
  useEffect(() => { if (step === 'code') codeRef.current?.focus(); }, [step]);

  const sendCode = async (e) => {
    e?.preventDefault();
    if (busy || !validMobile) return;
    setBusy(true); setError(''); setNote('');
    try {
      const r = await api.requestOtp(digits);
      setStep('code');
      setCode('');
      setLeft((r.ttlMin || 3) * 60);
      setNote(`Code sent to ${digits}. It is valid for ${r.ttlMin || 3} minutes.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const signIn = async (e) => {
    e.preventDefault();
    if (busy || code.length !== 4) return;
    setBusy(true); setError('');
    try {
      const r = await api.login(digits, code);
      onSignedIn(r.token);
    } catch (err) {
      setError(err.message);
      setCode('');
      setBusy(false);
      codeRef.current?.focus();
    }
  };

  const mmss = `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-brand-deep via-brand to-brand-light p-6">
      <motion.form
        onSubmit={step === 'mobile' ? sendCode : signIn}
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
          className="input" inputMode="numeric" autoComplete="username"
          placeholder="10-digit number" value={mobile} maxLength={13}
          disabled={step === 'code'}
          onChange={(e) => setMobile(e.target.value)}
        />

        {step === 'mobile' ? (
          <p className="text-[11px] text-muted mt-1.5 mb-4">
            We will send a 4-digit code to this number.
          </p>
        ) : (
          <>
            <button type="button"
                    className="text-[11px] text-brand hover:underline mt-1.5 mb-4 block"
                    onClick={() => { setStep('mobile'); setError(''); setNote(''); setLeft(0); }}>
              Use a different number
            </button>

            <label className="block text-xs font-bold text-muted mb-1.5">4-digit code</label>
            <input
              ref={codeRef}
              className="input text-center text-2xl tracking-[0.6em] font-bold"
              inputMode="numeric" autoComplete="one-time-code" maxLength={4}
              placeholder="••••" value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
            />

            <div className="flex items-center justify-between mt-2 mb-4 text-[11px]">
              {left > 0
                ? <span className="text-muted">Expires in <b className="text-brand">{mmss}</b></span>
                : <span className="text-red-600">That code has expired.</span>}
              <button type="button" disabled={busy || left > 0}
                      className="text-brand font-semibold hover:underline disabled:text-muted disabled:no-underline"
                      onClick={sendCode}>
                Send a new code
              </button>
            </div>
          </>
        )}

        {note && !error && (
          <p className="text-xs text-brand bg-brand/5 border border-brand/20 rounded-lg p-2.5 mb-3">{note}</p>
        )}
        {error && (
          <motion.p initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                    className="text-sm text-red-600 mb-3">{error}</motion.p>
        )}

        <button className="btn-pri w-full"
                disabled={busy || (step === 'mobile' ? !validMobile : code.length !== 4)}>
          {busy
            ? (step === 'mobile' ? 'Sending…' : 'Signing in…')
            : (step === 'mobile' ? 'Send code' : 'Sign in')}
        </button>

        <p className="mt-5 text-[11px] leading-relaxed text-muted">
          This panel shows children's data, parent phone numbers and GST records.
          Sign-in codes are single use and expire quickly — never share one.
        </p>
      </motion.form>
    </div>
  );
}
