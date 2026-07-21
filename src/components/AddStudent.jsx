/**
 * Add a child to an existing parent.
 *
 * Board → grade → medium cascade from what we actually have content for, so
 * the admin cannot enrol a child into a combination that would produce a
 * broken quiz. If the plan's seats are full the API refuses; the admin can
 * then knowingly override, which is a business decision rather than an
 * accident.
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';

export default function AddStudent({ parentId, seatsUsed, seatLimit, planName, onAdded }) {
  const [open, setOpen] = useState(false);
  const [look, setLook] = useState(null);
  const [f, setF] = useState({ student_name: '', school_name: '', board: '', grade: '', medium: '' });
  const [error, setError] = useState('');
  const [needsOverride, setNeedsOverride] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open && !look) api.lookups().then(setLook).catch((e) => setError(e.message));
  }, [open]);

  const grades = look && f.board ? Object.entries(look.availability[f.board] || {}) : [];
  const mediums = look && f.board && f.grade
    ? Object.entries(look.availability[f.board]?.[f.grade]?.mediums || {}) : [];

  const set = (k, v) => setF((s) => {
    const next = { ...s, [k]: v };
    if (k === 'board') { next.grade = ''; next.medium = ''; }
    if (k === 'grade') { next.medium = ''; }
    return next;
  });

  const submit = async (override = false) => {
    setBusy(true); setError('');
    try {
      await api.addStudent(parentId, { ...f, override });
      setF({ student_name: '', school_name: '', board: '', grade: '', medium: '' });
      setOpen(false); setNeedsOverride(false);
      onAdded();
    } catch (e) {
      setError(e.message);
      // the API says seat-limit explicitly; only then do we offer the override
      if (/covers \d+ child/i.test(e.message)) setNeedsOverride(true);
    } finally { setBusy(false); }
  };

  const valid = f.student_name.trim() && f.board && f.grade && f.medium;
  const full = seatLimit != null && seatsUsed >= seatLimit;

  return (
    <div className="border-t border-line/70">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-line/20 transition text-sm font-semibold text-brand-accent"
      >
        <span className={`transition-transform ${open ? 'rotate-45' : ''}`}>＋</span>
        Add another child
        {seatLimit != null && (
          <span className={`ml-auto pill ${full ? 'bg-amber-50 text-amber-700' : 'bg-line/60 text-muted'}`}>
            {seatsUsed}/{seatLimit} seats used{planName ? ` · ${planName}` : ''}
          </span>
        )}
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
                       onChange={(e) => set('student_name', e.target.value)} placeholder="e.g. Aarav" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-muted mb-1">School</label>
                <input className="input" value={f.school_name} maxLength={120}
                       onChange={(e) => set('school_name', e.target.value)} placeholder="Short name is enough" />
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
                <select className="input" value={f.grade} disabled={!f.board}
                        onChange={(e) => set('grade', e.target.value)}>
                  <option value="">{f.board ? 'Select' : 'Board first'}</option>
                  {grades.map(([code, g]) => <option key={code} value={code}>{g.grade_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-muted mb-1">Medium *</label>
                <select className="input" value={f.medium} disabled={!f.grade}
                        onChange={(e) => set('medium', e.target.value)}>
                  <option value="">{f.grade ? 'Select' : 'Grade first'}</option>
                  {mediums.map(([code, m]) => <option key={code} value={code}>{m.label}</option>)}
                </select>
              </div>
            </div>

            {error && (
              <div className="px-5 pb-3 text-sm text-red-600">{error}</div>
            )}

            <div className="px-5 pb-5 flex gap-2">
              <button className="btn-pri" disabled={!valid || busy} onClick={() => submit(false)}>
                {busy ? 'Adding…' : 'Add child'}
              </button>
              {needsOverride && (
                <button className="btn-sec border-amber-300 text-amber-700" disabled={busy}
                        onClick={() => submit(true)}>
                  Add anyway (exceeds plan seats)
                </button>
              )}
              <button className="btn-sec" onClick={() => { setOpen(false); setError(''); setNeedsOverride(false); }}>
                Cancel
              </button>
            </div>

            <p className="px-5 pb-4 text-[11px] text-muted">
              Only board/grade/medium combinations with real questions are offered — a child
              enrolled into an empty combination would get a broken quiz at 8 PM.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
