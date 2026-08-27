/**
 * Free quiz slot.
 *
 * A make-good tool: when a quiz did not reach a family because of a fault on
 * our side, grant them a real quiz at no charge. No payment and no invoice, but
 * the usual report and feedback still follow.
 *
 * The grant attaches to the MOBILE NUMBER, not a subscription, so it reaches a
 * lapsed parent or a number that only ever said "hi". The parent's next message
 * — a tap, "hi", anything — turns it into a quiz.
 */

import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Page, Loading, ErrorBox } from '../components/ui.jsx';

const SEGMENT_TONE = {
  premium: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  trial: 'bg-sky-50 text-sky-700 border-sky-200',
  lapsed: 'bg-amber-50 text-amber-700 border-amber-200',
  lead: 'bg-slate-100 text-slate-600 border-slate-200',
};

const STATUS_TONE = {
  pending: 'bg-amber-50 text-amber-700',
  consumed: 'bg-emerald-50 text-emerald-700',
  expired: 'bg-slate-100 text-slate-500',
  cancelled: 'bg-red-50 text-red-700',
};

const QUIZ_STATUS = {
  scheduled: 'Not started', delivered: 'Delivered', yet_to_start: 'Not started',
  in_progress: 'In progress', completed: 'Completed', cancelled: 'Cancelled',
};

export default function FreeQuizSlot() {
  const [q, setQ] = useState('');
  const [found, setFound] = useState([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState({});          // mobile -> true
  const [manual, setManual] = useState('');
  const [count, setCount] = useState(15);
  const [reason, setReason] = useState('');
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [grants, setGrants] = useState(null);
  const [err, setErr] = useState('');

  const loadGrants = () => api.freeQuizGrants().then((r) => setGrants(r.rows)).catch((e) => setErr(e.message));
  useEffect(() => { loadGrants(); }, []);

  const search = async (e) => {
    e?.preventDefault();
    if (!q.trim()) return;
    setSearching(true); setErr('');
    try {
      const r = await api.freeQuizSearch(q.trim());
      setFound(r.rows);
    } catch (e2) { setErr(e2.message); } finally { setSearching(false); }
  };

  // Everything selected: ticked search results plus anything pasted by hand.
  const selected = [
    ...Object.keys(picked).filter((m) => picked[m]),
    ...manual.split(/[\s,;]+/).map((x) => x.replace(/\D/g, '').slice(-10)).filter((x) => x.length === 10),
  ];
  const unique = [...new Set(selected)];

  const grant = async () => {
    if (!unique.length || busy) return;
    setBusy(true); setErr(''); setResult(null);
    try {
      const r = await api.freeQuizGrant({
        mobiles: unique.join(','), question_count: Number(count) || 15, reason, notify,
      });
      setResult(r);
      setPicked({}); setManual(''); setReason('');
      loadGrants();
    } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  };

  const cancel = async (id) => {
    try { await api.freeQuizCancel(id); loadGrants(); }
    catch (e2) { setErr(e2.message); }
  };

  return (
    <Page title="Free quiz slot"
      subtitle="Grant a no-charge quiz when one didn't reach a family · no invoice, normal report"
      actions={<span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">🎁 Free</span>}>

      {err && <div className="mb-4"><ErrorBox error={err} onRetry={() => setErr('')} /></div>}

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        {/* ---------------------------------------------------------- pick who */}
        <div className="rounded-2xl border border-line bg-white p-4">
          <div className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted">1 · Who needs a free quiz?</div>

          <form onSubmit={search} className="flex gap-2">
            <input className="input flex-1" placeholder="Search mobile, parent or child name…"
                   value={q} onChange={(e) => setQ(e.target.value)} />
            <button className="btn-pri whitespace-nowrap" disabled={searching || !q.trim()}>
              {searching ? 'Searching…' : 'Search'}
            </button>
          </form>

          {found.length > 0 && (
            <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
              {found.map((r) => (
                <label key={r.mobile}
                       className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition
                                   ${picked[r.mobile] ? 'border-emerald-400 bg-emerald-50/50' : 'border-line hover:bg-line/20'}`}>
                  <input type="checkbox" className="mt-1 h-4 w-4 accent-emerald-600"
                         checked={!!picked[r.mobile]}
                         onChange={(e) => setPicked({ ...picked, [r.mobile]: e.target.checked })} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-ink">{r.parent_name || 'Unknown'}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${SEGMENT_TONE[r.segment]}`}>
                        {r.label}
                      </span>
                      {r.paused && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700">STOP</span>}
                    </div>
                    <div className="mt-0.5 text-xs text-muted">{r.mobile}</div>
                    {r.child_names && <div className="mt-0.5 text-xs text-muted">👦 {r.child_names}</div>}
                    {!r.known && <div className="mt-0.5 text-xs text-muted">No child on file — they'll be asked for details</div>}
                  </div>
                </label>
              ))}
            </div>
          )}
          {q && !searching && found.length === 0 && (
            <p className="mt-3 text-sm text-muted">Nothing found. You can still paste the number below.</p>
          )}

          <div className="mt-4">
            <label className="mb-1 block text-xs font-bold text-muted">Or paste numbers directly</label>
            <textarea className="input min-h-[70px] font-mono text-sm"
                      placeholder="9886122415, 9740012345"
                      value={manual} onChange={(e) => setManual(e.target.value)} />
          </div>
        </div>

        {/* ---------------------------------------------------------- settings */}
        <div className="rounded-2xl border border-line bg-white p-4">
          <div className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted">2 · The free quiz</div>

          <label className="mb-1 block text-xs font-bold text-muted">Questions</label>
          <input className="input" type="number" min={4} max={30} value={count}
                 onChange={(e) => setCount(e.target.value)} />
          <p className="mt-1 text-[11px] text-muted">A normal daily quiz is 15.</p>

          <label className="mb-1 mt-4 block text-xs font-bold text-muted">Reason (internal note)</label>
          <input className="input" maxLength={200} placeholder="e.g. quiz didn't send on 26 Aug"
                 value={reason} onChange={(e) => setReason(e.target.value)} />

          <label className="mt-4 flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-emerald-600"
                   checked={notify} onChange={(e) => setNotify(e.target.checked)} />
            <span>Send them a WhatsApp message now
              <span className="block text-[11px] text-muted">
                Uncheck to grant silently — they'll get it next time they message.
              </span>
            </span>
          </label>

          <div className="mt-4 rounded-xl bg-line/30 p-3 text-xs text-muted">
            Selected: <b className="text-ink">{unique.length}</b> number{unique.length === 1 ? '' : 's'}
            <div className="mt-1">No payment · no invoice · normal report &amp; feedback</div>
          </div>

          <button className="btn-pri mt-4 w-full" disabled={busy || !unique.length} onClick={grant}>
            {busy ? 'Granting…' : `🎁 Grant free quiz${unique.length ? ` (${unique.length})` : ''}`}
          </button>

          {result && (
            <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm">
              <b className="text-emerald-800">{result.granted} granted.</b>
              <div className="mt-1 space-y-0.5 text-xs text-emerald-900/80">
                {(result.results || []).map((r) => (
                  <div key={r.mobile}>{r.mobile} — {r.status}{r.note ? ` (${r.note})` : ''}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ---------------------------------------------------------- history */}
      <h3 className="mb-2 mt-6 text-xs font-bold uppercase tracking-wider text-muted">Recent grants</h3>
      {grants === null ? <Loading label="Loading grants…" /> : (
        <div className="rounded-2xl border border-line bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead><tr className="bg-line/30 text-left text-[11px] uppercase tracking-wider text-muted">
                {['Mobile', 'Parent', 'Child', 'Qs', 'Grant', 'Quiz', 'Score', 'Reason', ''].map((h) => (
                  <th key={h} className="px-3 py-2 whitespace-nowrap">{h}</th>))}
              </tr></thead>
              <tbody>
                {grants.map((g) => (
                  <tr key={g.id} className="border-t border-line/60">
                    <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{g.mobile}</td>
                    <td className="px-3 py-2 text-muted whitespace-nowrap">{g.parent_name}</td>
                    <td className="px-3 py-2 text-muted whitespace-nowrap">{g.student_name || '—'}</td>
                    <td className="px-3 py-2 tabular-nums">{g.question_count}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS_TONE[g.status] || ''}`}>
                        {g.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-muted">
                      {g.quiz_status ? (QUIZ_STATUS[g.quiz_status] || g.quiz_status) : '—'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap tabular-nums">
                      {g.score_total ? `${g.score_correct}/${g.score_total} (${g.score_pct}%)` : '—'}
                    </td>
                    <td className="px-3 py-2 text-muted max-w-[220px] truncate" title={g.reason || ''}>
                      {g.reason || '—'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {g.status === 'pending' && (
                        <button onClick={() => cancel(g.id)}
                                className="text-xs font-semibold text-red-600 hover:underline">Cancel</button>
                      )}
                    </td>
                  </tr>
                ))}
                {grants.length === 0 && (
                  <tr><td colSpan={9} className="px-3 py-8 text-center text-muted">No free quizzes granted yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Page>
  );
}
