/**
 * Excel → question_bank import.
 *
 * You pick board / grade / medium / subject / month once; the sheet carries
 * only the question columns and the server resolves the foreign keys.
 *
 * Nothing is written until you have seen the preview. Duplicates are checked
 * against the SAME board/grade/subject/medium AND month, because QuizPe's
 * spiral revision deliberately repeats June's questions into later months —
 * matching on text alone would flag thousands of correct rows.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import * as XLSX from 'xlsx';
import { api } from '../lib/api';

const MONTHS = [
  [6, 'June'], [7, 'July'], [8, 'August'], [9, 'September'], [10, 'October'],
  [11, 'November'], [12, 'December'], [1, 'January'], [2, 'February'], [3, 'March'],
];
const TONE = {
  new: 'bg-emerald-50 text-emerald-700',
  duplicate_db: 'bg-amber-50 text-amber-800',
  duplicate_file: 'bg-orange-50 text-orange-800',
  invalid: 'bg-red-50 text-red-700',
};

export default function ImportQuestions({ facets, onClose, onDone }) {
  const [target, setTarget] = useState({
    board: '', grade: '', subject: 'MATHS', medium: 'ENGLISH',
    current_month: new Date().getMonth() + 1,
    academic_year: new Date().getMonth() + 1 >= 6 ? new Date().getFullYear() : new Date().getFullYear() - 1,
  });
  const [rows, setRows] = useState(null);
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  const uniq = (k, filter = () => true) =>
    [...new Set(facets.filter(filter).map((x) => x[k]))].filter(Boolean).sort();

  const readFile = async (file) => {
    setError(''); setPreview(null); setDone(null);
    setFileName(file.name);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      if (!json.length) throw new Error('That sheet has no rows.');
      setRows(json);
    } catch (e) {
      setError(`Could not read the file: ${e.message}`);
      setRows(null);
    }
  };

  const runPreview = async () => {
    setBusy(true); setError('');
    try {
      const d = await api.importPreview({ ...target, rows });
      setPreview(d);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const commit = async () => {
    setBusy(true); setError('');
    try {
      const d = await api.importCommit({ ...target, rows: preview.rows });
      setDone(d.inserted);
      onDone();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const ready = target.board && target.grade && target.subject && target.medium && target.current_month && rows;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 p-4 overflow-y-auto"
      onClick={() => !busy && onClose()}
    >
      <motion.div
        initial={{ y: 20, scale: 0.98 }} animate={{ y: 0, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="card p-6 w-full max-w-5xl mx-auto my-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-brand">Import questions from Excel</h2>
            <p className="text-sm text-muted">Nothing is saved until you approve the preview.</p>
          </div>
          <button className="btn-sec" onClick={onClose} disabled={busy}>Close</button>
        </div>

        {/* 1. where the questions belong */}
        <div className="grid sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
          <Sel label="Board *" value={target.board} onChange={(v) => setTarget({ ...target, board: v, grade: '' })}
               opts={uniq('board_code')} />
          <Sel label="Grade *" value={target.grade} onChange={(v) => setTarget({ ...target, grade: v })}
               opts={uniq('grade_code', (x) => !target.board || x.board_code === target.board)}
               disabled={!target.board} />
          <Sel label="Subject *" value={target.subject} onChange={(v) => setTarget({ ...target, subject: v })}
               opts={uniq('subject_code').length ? uniq('subject_code') : ['MATHS']} />
          <Sel label="Medium *" value={target.medium} onChange={(v) => setTarget({ ...target, medium: v })}
               opts={uniq('medium_code').length ? uniq('medium_code') : ['ENGLISH']} />
          <div>
            <label className="block text-[11px] font-bold text-muted mb-1">Serving month *</label>
            <select className="input" value={target.current_month}
                    onChange={(e) => setTarget({ ...target, current_month: Number(e.target.value) })}>
              {MONTHS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-muted mb-1">Academic year</label>
            <input className="input" type="number" value={target.academic_year}
                   onChange={(e) => setTarget({ ...target, academic_year: Number(e.target.value) })} />
          </div>
        </div>

        {/* 2. the sheet */}
        <div className="rounded-xl border-2 border-dashed border-line p-5 text-center mb-4">
          <input id="xls" type="file" accept=".xlsx,.xls,.csv" className="hidden"
                 onChange={(e) => e.target.files[0] && readFile(e.target.files[0])} />
          <label htmlFor="xls" className="btn-sec cursor-pointer">📄 Choose .xlsx / .csv</label>
          {fileName && <p className="text-sm mt-2"><b>{fileName}</b> — {rows?.length || 0} row(s)</p>}
          <p className="text-[11px] text-muted mt-2">
            Columns: chapter, question, option_a…option_d, answer (A–D), explanation.
            Header names are matched loosely, so “Option A” and “optionA” both work.
          </p>
        </div>

        {error && <div className="card p-3 mb-3 bg-red-50 border-red-200 text-sm text-red-700">{error}</div>}

        {!preview && (
          <button className="btn-pri" disabled={!ready || busy} onClick={runPreview}>
            {busy ? 'Checking…' : 'Preview import'}
          </button>
        )}

        {/* 3. what would happen */}
        {preview && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
              <Tile label="Rows in sheet" value={preview.summary.total} />
              <Tile label="Will import" value={preview.summary.new} tone="text-emerald-700" />
              <Tile label="Already in bank" value={preview.summary.duplicate_db} tone="text-amber-700" />
              <Tile label="Repeated in sheet" value={preview.summary.duplicate_file} tone="text-orange-700" />
              <Tile label="Invalid" value={preview.summary.invalid} tone="text-red-700" />
            </div>

            <p className="text-xs text-muted mb-3">
              Duplicates are judged against {target.board} · {target.grade} · {target.subject} ·{' '}
              {target.medium} for this month only ({preview.existingInMonth.toLocaleString('en-IN')} existing).
              The spiral model repeats questions across months on purpose, so those are not duplicates.
            </p>

            <div className="card overflow-hidden mb-4 max-h-80 overflow-y-auto">
              <table className="w-full border-collapse">
                <thead className="sticky top-0"><tr>
                  {['Row', 'Status', 'Chapter', 'Question', 'Ans', 'Note'].map((h) =>
                    <th key={h} className="th">{h}</th>)}
                </tr></thead>
                <tbody>
                  {preview.rows.map((r) => (
                    <tr key={r.row} className={r.status === 'new' ? '' : TONE[r.status]}>
                      <td className="td text-muted">{r.row}</td>
                      <td className="td"><span className={`pill ${TONE[r.status]}`}>{r.status.replace('_', ' ')}</span></td>
                      <td className="td text-xs">{r.chapter}</td>
                      <td className="td text-xs max-w-md truncate">{r.question}</td>
                      <td className="td font-bold">{r.answer}</td>
                      <td className="td text-xs text-muted">{r.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {done != null ? (
              <div className="card p-4 bg-emerald-50 border-emerald-200 text-emerald-800">
                ✅ Imported <b>{done}</b> question(s). You can close this window.
              </div>
            ) : (
              <div className="flex gap-2">
                <button className="btn-pri" disabled={busy || !preview.summary.new} onClick={commit}>
                  {busy ? 'Importing…' : `Import ${preview.summary.new} question(s)`}
                </button>
                <button className="btn-sec" disabled={busy} onClick={() => setPreview(null)}>Back</button>
                {!preview.summary.new && (
                  <span className="text-sm text-amber-700 self-center">
                    Nothing new to import — every row is a duplicate or invalid.
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

const Sel = ({ label, value, onChange, opts, disabled }) => (
  <div>
    <label className="block text-[11px] font-bold text-muted mb-1">{label}</label>
    <select className="input" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
      <option value="">Select</option>
      {opts.map((o) => <option key={o}>{o}</option>)}
    </select>
  </div>
);

const Tile = ({ label, value, tone = 'text-brand' }) => (
  <div className="card p-3">
    <div className="text-[11px] font-bold uppercase text-muted">{label}</div>
    <div className={`text-2xl font-extrabold ${tone}`}>{value}</div>
  </div>
);
