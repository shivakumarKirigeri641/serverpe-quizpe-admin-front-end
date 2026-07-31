/**
 * Add a child to a family MID-PLAN, charged pro-rata.
 *
 * The parent already paid for a plan that runs to some future date. Rather than
 * make them buy a whole new plan for a second child, this charges only the
 * slice for the days that remain and lines the new child up to expire on the
 * SAME date as the rest of the family.
 *
 * Flow: fill the child in → "Preview price" (server computes the pro-rated
 * amount + GST) → "Send pay link", which drops a Razorpay link on the parent's
 * WhatsApp. On payment the back-end enrols the child and issues the invoice.
 *
 * Only offered when the current plan is PAID and has MORE than 7 days left —
 * with less than that, renewing is the honest option, and the back-end refuses
 * anyway so this can never charge a near-expired plan.
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';
import { Pill, inr } from './ui.jsx';
import { toast } from './Toaster.jsx';

export default function AddChildPaid({ parentId, daysLeft, endDate, planName }) {
  const [open, setOpen] = useState(false);
  const [look, setLook] = useState(null);
  const [f, setF] = useState({ student_name: '', school_name: '', board: '', grade: '', medium: '' });
  const [addons, setAddons] = useState([]);        // chosen subject codes
  const [quote, setQuote] = useState(null);        // pro-rated breakdown
  const [sent, setSent] = useState(null);          // { short_url, whatsapp_sent }
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open && !look) api.lookups().then(setLook).catch((e) => setError(e.message));
  }, [open]);

  const grades = look && f.board ? Object.entries(look.availability[f.board] || {}) : [];
  const mediums = look && f.board && f.grade
    ? Object.entries(look.availability[f.board]?.[f.grade]?.mediums || {}) : [];
  const offered = look && f.board && f.grade && f.medium
    ? (look.availability[f.board]?.[f.grade]?.mediums?.[f.medium]?.addons || []) : [];

  // Any edit invalidates a price already previewed — you must re-quote what the
  // parent will actually be charged, never send a stale amount.
  const reset = () => { setQuote(null); setSent(null); setError(''); };
  const set = (k, v) => { reset(); setF((s) => {
    const next = { ...s, [k]: v };
    if (k === 'board') { next.grade = ''; next.medium = ''; setAddons([]); }
    if (k === 'grade') { next.medium = ''; setAddons([]); }
    if (k === 'medium') { setAddons([]); }
    return next;
  }); };
  const toggleAddon = (code) => { reset(); setAddons((a) => a.includes(code) ? a.filter((x) => x !== code) : [...a, code]); };

  const body = () => ({
    student_name: f.student_name.trim(), school_name: f.school_name.trim(),
    board: f.board, grade: f.grade, medium: f.medium, addons,
  });
  const valid = f.student_name.trim() && f.board && f.grade && f.medium;

  const preview = async () => {
    setBusy(true); setError('');
    try { const r = await api.addChildQuote(parentId, body()); setQuote(r.quote); }
    catch (e) { setError(e.message); setQuote(null); }
    finally { setBusy(false); }
  };

  const send = async () => {
    setBusy(true); setError('');
    try {
      const r = await api.addChildLink(parentId, body());
      setSent({ short_url: r.short_url, whatsapp_sent: r.whatsapp_sent });
      toast(r.whatsapp_sent ? 'Pay link sent to the parent on WhatsApp.' : 'Pay link created — WhatsApp not sent (no chat).', 'success');
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const close = () => {
    setOpen(false); reset();
    setF({ student_name: '', school_name: '', board: '', grade: '', medium: '' }); setAddons([]);
  };

  return (
    <div className="border-t border-line/70">
      <button
        onClick={() => (open ? close() : setOpen(true))}
        className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-line/20 transition text-sm font-semibold text-brand-accent"
      >
        <span className={`transition-transform ${open ? 'rotate-45' : ''}`}>＋</span>
        Add a child (paid, pro-rated)
        <span className="ml-auto"><Pill tone="green">{daysLeft} days left · ends {String(endDate).slice(0, 10)}</Pill></span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-line/10"
          >
            <div className="p-5 grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-muted mb-1">Child's name *</label>
                <input className="input" value={f.student_name} maxLength={60}
                       onChange={(e) => { reset(); setF((s) => ({ ...s, student_name: e.target.value })); }} placeholder="e.g. Aarav" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-muted mb-1">School</label>
                <input className="input" value={f.school_name} maxLength={120}
                       onChange={(e) => { reset(); setF((s) => ({ ...s, school_name: e.target.value })); }} placeholder="Short name is enough" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-muted mb-1">Board *</label>
                <select className="input" value={f.board} onChange={(e) => set('board', e.target.value)}>
                  <option value="">Select</option>
                  {look?.boards.map((b) => <option key={b.board_code} value={b.board_code}>{b.board_code}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-muted mb-1">Grade *</label>
                <select className="input" value={f.grade} disabled={!f.board} onChange={(e) => set('grade', e.target.value)}>
                  <option value="">{f.board ? 'Select' : 'Board first'}</option>
                  {grades.map(([code, g]) => <option key={code} value={code}>{g.grade_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-muted mb-1">Medium *</label>
                <select className="input" value={f.medium} disabled={!f.grade} onChange={(e) => set('medium', e.target.value)}>
                  <option value="">{f.grade ? 'Select' : 'Grade first'}</option>
                  {mediums.map(([code, m]) => <option key={code} value={code}>{m.label}</option>)}
                </select>
              </div>
            </div>

            {offered.length > 0 && (
              <div className="px-5 pb-1">
                <label className="block text-[11px] font-bold text-muted mb-1">Extra subjects (optional — priced pro-rata too)</label>
                <div className="flex flex-wrap gap-2">
                  {offered.map((a) => (
                    <button key={a.subject_code} type="button" onClick={() => toggleAddon(a.subject_code)}
                      className={`pill border ${addons.includes(a.subject_code)
                        ? 'bg-brand-accent/15 border-brand-accent text-brand-accent font-semibold'
                        : 'bg-white border-line text-muted'}`}>
                      {a.subject_name} · {inr(a.price)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && <div className="px-5 pt-3 text-sm text-red-600">{error}</div>}

            {quote && !sent && (
              <div className="px-5 pt-4">
                <div className="card p-4 bg-white max-w-md">
                  <div className="text-[11px] font-bold text-muted mb-2">
                    PRO-RATED FOR {quote.days_left} OF {quote.duration} DAYS · aligns to {String(quote.align_end_date).slice(0, 10)}
                  </div>
                  <Row label={`Maths (per-child ${inr(quote.per_child)})`} value={inr(quote.prorated_base)} />
                  {quote.addons.map((a) => <Row key={a.subject_code} label={`${a.subject_code} add-on`} value={inr(a.price)} />)}
                  <div className="border-t border-line/70 mt-2 pt-2">
                    <Row label="Calculated amount (excl. GST)" value={inr(quote.calc_excl)} />
                    <Row label={`GST @ ${quote.gst_pct}% (added on top)`} value={inr(quote.gst)} />
                  </div>
                  <div className="border-t border-line/70 mt-2 pt-2 flex items-center justify-between">
                    <b>Total payable</b><b className="text-brand text-lg">{inr(quote.total)}</b>
                  </div>
                </div>
              </div>
            )}

            {sent && (
              <div className="px-5 pt-4">
                <div className="card p-4 bg-green-50 border border-green-200 max-w-md">
                  <div className="font-bold text-green-800 mb-1">
                    {sent.whatsapp_sent ? '✅ Pay link sent on WhatsApp' : '✅ Pay link created'}
                  </div>
                  <p className="text-sm text-green-900/80 mb-2">
                    {sent.whatsapp_sent
                      ? "The parent has the secure link in their chat. The child is enrolled and invoiced automatically once it's paid."
                      : "This parent has no WhatsApp chat on record — copy the link below and send it to them."}
                  </p>
                  <a href={sent.short_url} target="_blank" rel="noreferrer"
                     className="text-brand-accent font-semibold text-sm break-all underline">{sent.short_url}</a>
                </div>
              </div>
            )}

            <div className="px-5 py-5 flex flex-wrap gap-2">
              {!sent && !quote && (
                <button className="btn-pri" disabled={!valid || busy} onClick={preview}>
                  {busy ? 'Checking…' : 'Preview price'}
                </button>
              )}
              {quote && !sent && (
                <button className="btn-pri" disabled={busy} onClick={send}>
                  {busy ? 'Sending…' : `Send pay link · ${inr(quote.total)}`}
                </button>
              )}
              <button className="btn-sec" onClick={close}>{sent ? 'Done' : 'Cancel'}</button>
            </div>

            <p className="px-5 pb-4 text-[11px] text-muted">
              The child is created only after the parent pays. They share the family's expiry ({String(endDate).slice(0, 10)}),
              and a GST invoice for the pro-rated amount is sent to the parent automatically.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between text-sm py-0.5">
      <span className="text-muted">{label}</span><span>{value}</span>
    </div>
  );
}
