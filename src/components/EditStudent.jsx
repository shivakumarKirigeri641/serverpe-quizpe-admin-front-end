/**
 * Edit an existing child's details — name, school, board/grade/medium, and
 * active status.
 *
 * The board → grade → medium cascade comes from what we actually have content
 * for (same guard as Add), so an edit can never move a child into a combination
 * that would produce a broken quiz. The current values are pre-selected.
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';

export default function EditStudent({ student, onSaved }) {
  const [open, setOpen] = useState(false);
  const [look, setLook] = useState(null);
  const [f, setF] = useState({
    student_name: student.student_name || '',
    school_name: student.school_name || '',
    board: student.board_code || '',
    grade: student.grade_code || '',
    medium: student.medium_code || '',
    is_active: student.is_active !== false,
  });
  const [error, setError] = useState('');
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

  const save = async () => {
    setBusy(true); setError('');
    try {
      await api.updateStudent(student.id, {
        student_name: f.student_name.trim(),
        school_name: f.school_name.trim(),
        board: f.board, grade: f.grade, medium: f.medium,
        is_active: f.is_active,
      });
      setOpen(false);
      onSaved();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const valid = f.student_name.trim() && f.board && f.grade && f.medium;

  return (
    <div className="px-5 pt-1 pb-3">
      <button
        onClick={() => setOpen(!open)}
        className="text-sm font-semibold text-brand-accent inline-flex items-center gap-2"
      >
        <span className={`transition-transform ${open ? 'rotate-45' : ''}`}>✏️</span>
        {open ? 'Close editor' : 'Edit child details'}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-2"
          >
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-muted mb-1">Child's name *</label>
                <input className="input" value={f.student_name} maxLength={60}
                       onChange={(e) => set('student_name', e.target.value)} />
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

            <label className="flex items-center gap-2 mt-3 text-sm">
              <input type="checkbox" checked={f.is_active}
                     onChange={(e) => set('is_active', e.target.checked)} />
              <span className="font-semibold">Active</span>
              <span className="text-muted text-xs">— unticking pauses this child's daily quiz.</span>
            </label>

            {error && <div className="mt-2 text-sm text-red-600">{error}</div>}

            <div className="flex gap-2 mt-3">
              <button className="btn-pri" disabled={!valid || busy} onClick={save}>
                {busy ? 'Saving…' : 'Save changes'}
              </button>
              <button className="btn-sec" onClick={() => { setOpen(false); setError(''); }}>Cancel</button>
            </div>
            <p className="mt-2 text-[11px] text-muted">
              Only board/grade/medium combinations with real questions are offered — the same guard as enrolment.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
