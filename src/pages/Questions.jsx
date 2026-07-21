/**
 * question_bank grid with inline editing, plus the Excel import.
 *
 * Editing is validated on both sides: the answer must be A–D and must point at
 * a non-empty option, options must be distinct. The same rules run on the
 * server, because a browser check is a convenience, not a guarantee.
 *
 * Deleting deactivates rather than removes — a question already served to a
 * child is referenced by their answer history, and hard-deleting it would
 * blank their report.
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';
import { Page, Loading, ErrorBox, Pill } from '../components/ui.jsx';
import ImportQuestions from '../components/ImportQuestions.jsx';

const LETTERS = ['A', 'B', 'C', 'D'];
const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Same rules the API enforces — kept together so they cannot drift apart. */
export function validateQuestion(q) {
  const errs = {};
  if (!String(q.chapter || '').trim()) errs.chapter = 'Chapter is required';
  if (!String(q.question_pdf || '').trim()) errs.question_pdf = 'Question text is required';
  const opts = [q.option_a, q.option_b, q.option_c, q.option_d];
  const filled = opts.filter((o) => String(o || '').trim());
  if (filled.length < 2) errs.option_a = 'At least 2 options are needed';
  const lower = filled.map((o) => o.trim().toLowerCase());
  if (new Set(lower).size !== lower.length) errs.option_b = 'Options must be different';
  const a = String(q.answer || '').toUpperCase();
  if (!LETTERS.includes(a)) errs.answer = 'Answer must be A, B, C or D';
  else if (!String(opts[LETTERS.indexOf(a)] || '').trim()) errs.answer = `Option ${a} is empty`;
  return errs;
}

export default function Questions() {
  const [facets, setFacets] = useState([]);
  const [f, setF] = useState({ board: '', grade: '', subject: '', medium: '', chapter: '', month: '', q: '' });
  const [data, setData] = useState(null);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [importing, setImporting] = useState(false);
  const LIMIT = 25;

  useEffect(() => { api.questionFacets().then((d) => setFacets(d.rows)).catch(() => {}); }, []);

  const load = () => {
    setError('');
    api.questions({ ...f, limit: LIMIT, offset })
      .then(setData).catch((e) => setError(e.message));
  };
  useEffect(() => { const t = setTimeout(load, f.q ? 300 : 0); return () => clearTimeout(t); }, [f, offset]);

  const uniq = (key, filter = () => true) =>
    [...new Set(facets.filter(filter).map((x) => x[key]))].filter(Boolean).sort();

  const set = (k, v) => { setOffset(0); setF((s) => ({ ...s, [k]: v })); };

  return (
    <Page
      title="Question bank"
      subtitle={data ? `${data.total.toLocaleString('en-IN')} question${data.total === 1 ? '' : 's'} match` : ''}
      actions={<button className="btn-pri" onClick={() => setImporting(true)}>⬆ Import from Excel</button>}
    >
      <div className="card p-4 mb-4 grid sm:grid-cols-3 lg:grid-cols-7 gap-2">
        <select className="input" value={f.board} onChange={(e) => set('board', e.target.value)}>
          <option value="">All boards</option>
          {uniq('board_code').map((x) => <option key={x}>{x}</option>)}
        </select>
        <select className="input" value={f.grade} onChange={(e) => set('grade', e.target.value)}>
          <option value="">All grades</option>
          {uniq('grade_code', (x) => !f.board || x.board_code === f.board).map((x) => <option key={x}>{x}</option>)}
        </select>
        <select className="input" value={f.subject} onChange={(e) => set('subject', e.target.value)}>
          <option value="">All subjects</option>
          {uniq('subject_code').map((x) => <option key={x}>{x}</option>)}
        </select>
        <select className="input" value={f.medium} onChange={(e) => set('medium', e.target.value)}>
          <option value="">All mediums</option>
          {uniq('medium_code').map((x) => <option key={x}>{x}</option>)}
        </select>
        <select className="input" value={f.chapter} onChange={(e) => set('chapter', e.target.value)}>
          <option value="">All chapters</option>
          {uniq('chapter', (x) => (!f.board || x.board_code === f.board) && (!f.grade || x.grade_code === f.grade))
            .map((x) => <option key={x}>{x}</option>)}
        </select>
        <select className="input" value={f.month} onChange={(e) => set('month', e.target.value)}>
          <option value="">All months</option>
          {uniq('current_month').sort((a, b) => a - b).map((m) => <option key={m} value={m}>{MONTHS[m]}</option>)}
        </select>
        <input className="input" placeholder="Search text…" value={f.q}
               onChange={(e) => set('q', e.target.value)} />
      </div>

      {error ? <ErrorBox error={error} onRetry={load} />
        : !data ? <Loading label="Loading questions…" />
          : (
            <>
              <div className="space-y-2">
                {data.rows.map((q) => (
                  <QuestionCard key={q.id} q={q} onChanged={load}
                                open={editing === q.id} onOpen={() => setEditing(editing === q.id ? null : q.id)} />
                ))}
                {!data.rows.length && (
                  <div className="card p-10 text-center text-muted text-sm">No questions match those filters.</div>
                )}
              </div>

              {data.total > LIMIT && (
                <div className="flex items-center justify-between mt-4 text-sm">
                  <span className="text-muted">
                    {offset + 1}–{Math.min(offset + LIMIT, data.total)} of {data.total.toLocaleString('en-IN')}
                  </span>
                  <div className="flex gap-2">
                    <button className="btn-sec" disabled={offset === 0}
                            onClick={() => setOffset(Math.max(0, offset - LIMIT))}>← Previous</button>
                    <button className="btn-sec" disabled={offset + LIMIT >= data.total}
                            onClick={() => setOffset(offset + LIMIT)}>Next →</button>
                  </div>
                </div>
              )}
            </>
          )}

      <AnimatePresence>
        {importing && <ImportQuestions facets={facets} onClose={() => setImporting(false)} onDone={load} />}
      </AnimatePresence>
    </Page>
  );
}

function QuestionCard({ q, open, onOpen, onChanged }) {
  const [draft, setDraft] = useState(q);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const errs = validateQuestion(draft);
  const clean = Object.keys(errs).length === 0;

  useEffect(() => { setDraft(q); setMsg(''); }, [q, open]);

  const save = async () => {
    setBusy(true); setMsg('');
    try {
      await api.updateQuestion(q.id, {
        chapter: draft.chapter, question_pdf: draft.question_pdf,
        question_whatsapp: draft.question_whatsapp,
        option_a: draft.option_a, option_b: draft.option_b,
        option_c: draft.option_c, option_d: draft.option_d,
        answer: String(draft.answer).toUpperCase(), explanation: draft.explanation,
      });
      onChanged();
    } catch (e) { setMsg(e.message); }
    finally { setBusy(false); }
  };

  const deactivate = async () => {
    if (!confirm('Deactivate this question? It will no longer be served to children.')) return;
    setBusy(true);
    try { const r = await api.deleteQuestion(q.id); setMsg(r.note); onChanged(); }
    catch (e) { setMsg(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className={`card overflow-hidden ${q.is_active ? '' : 'opacity-60'}`}>
      <button onClick={onOpen} className="w-full text-left px-4 py-3 hover:bg-line/20 transition flex items-start gap-3">
        <span className={`transition-transform mt-0.5 ${open ? 'rotate-90' : ''}`}>▶</span>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] text-muted">
            {q.board_code} · {q.grade_code} · {q.subject_code} · {q.medium_code} · {MONTHS[q.current_month]} · {q.chapter}
          </div>
          <div className="font-medium truncate">{q.question_pdf || q.question_whatsapp}</div>
        </div>
        <Pill tone="green">{q.answer}</Pill>
        {!q.is_active && <Pill tone="grey">inactive</Pill>}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-line/10">
            <div className="p-4 space-y-3">
              <Field label="Chapter" value={draft.chapter} err={errs.chapter}
                     onChange={(v) => setDraft({ ...draft, chapter: v })} />
              <Field label="Question (report)" value={draft.question_pdf} err={errs.question_pdf} textarea
                     onChange={(v) => setDraft({ ...draft, question_pdf: v })} />
              <Field label="Question (WhatsApp)" value={draft.question_whatsapp || ''}
                     onChange={(v) => setDraft({ ...draft, question_whatsapp: v })} />
              <div className="grid sm:grid-cols-2 gap-3">
                {LETTERS.map((L, i) => (
                  <Field key={L} label={`Option ${L}`} value={draft[`option_${L.toLowerCase()}`] || ''}
                         err={i === 0 ? errs.option_a : i === 1 ? errs.option_b : null}
                         onChange={(v) => setDraft({ ...draft, [`option_${L.toLowerCase()}`]: v })} />
                ))}
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-muted mb-1">Correct answer</label>
                  <select className={`input ${errs.answer ? 'border-red-400' : ''}`}
                          value={String(draft.answer || '').toUpperCase()}
                          onChange={(e) => setDraft({ ...draft, answer: e.target.value })}>
                    <option value="">—</option>
                    {LETTERS.map((L) => <option key={L}>{L}</option>)}
                  </select>
                  {errs.answer && <p className="text-[11px] text-red-600 mt-1">{errs.answer}</p>}
                </div>
                <div className="sm:col-span-2">
                  <Field label="Explanation" value={draft.explanation || ''}
                         onChange={(v) => setDraft({ ...draft, explanation: v })} />
                </div>
              </div>

              {msg && <p className="text-sm text-amber-700">{msg}</p>}

              <div className="flex gap-2 pt-1">
                <button className="btn-pri" disabled={!clean || busy} onClick={save}>
                  {busy ? 'Saving…' : 'Save changes'}
                </button>
                <button className="btn-sec text-red-600 border-red-200" disabled={busy} onClick={deactivate}>
                  Deactivate
                </button>
                {!clean && <span className="text-xs text-red-600 self-center">Fix the highlighted fields first</span>}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({ label, value, onChange, err, textarea }) {
  const C = textarea ? 'textarea' : 'input';
  return (
    <div>
      <label className="block text-[11px] font-bold text-muted mb-1">{label}</label>
      <C className={`input ${err ? 'border-red-400' : ''}`} value={value}
         rows={textarea ? 2 : undefined} onChange={(e) => onChange(e.target.value)} />
      {err && <p className="text-[11px] text-red-600 mt-1">{err}</p>}
    </div>
  );
}
