/**
 * Free access — quizzes at no charge between two dates, with their own number
 * of quizzes per day.
 *
 * Not the same tool as "Free quiz slot". That one hands out a single quiz when
 * a quiz failed to reach somebody. This one opens a window: a school demo for a
 * fortnight, an apology week, a festival offer.
 *
 * Nothing here writes a plan, an invoice or a GST record, and it never spends
 * the family's one free trial. When the window closes they are exactly where
 * they were before it opened.
 */
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { toast } from '../components/Toaster.jsx';
import { Page, Loading, ErrorBox, Table, Row, Pill } from '../components/ui.jsx';

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const addDays = (iso, n) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const pretty = (iso) => (iso
  ? new Date(`${String(iso).slice(0, 10)}T00:00:00`)
    .toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
  : '—');

const STATE_TONE = { live: 'green', upcoming: 'blue', finished: 'grey', cancelled: 'red' };

export default function FreeAccess() {
  const [list, setList] = useState(null);
  const [error, setError] = useState('');

  const [q, setQ] = useState('');
  const [found, setFound] = useState([]);
  const [searching, setSearching] = useState(false);

  const [family, setFamily] = useState(null);      // the chosen parent row
  const [childId, setChildId] = useState('');      // '' = every child
  const [start, setStart] = useState(todayISO());
  const [end, setEnd] = useState(addDays(todayISO(), 6));
  const [slots, setSlots] = useState(1);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => {
    setError('');
    api.freeAccessList().then((r) => setList(r.rows)).catch((e) => setError(e.message));
  };
  useEffect(load, []);

  const search = async (e) => {
    e?.preventDefault();
    setSearching(true);
    try {
      const r = await api.freeAccessSearch(q.trim());
      setFound(r.rows);
      if (!r.rows.length) toast('No family found with a child on file.', 'error');
    } catch (err) { toast(err.message, 'error'); }
    finally { setSearching(false); }
  };

  const days = (() => {
    if (!start || !end || end < start) return 0;
    return Math.round((new Date(end) - new Date(start)) / 864e5) + 1;
  })();

  const grant = async () => {
    if (!family) return toast('Choose a family first.', 'error');
    if (!start || !end) return toast('Pick both dates.', 'error');
    if (end < start) return toast('The end date cannot be before the start date.', 'error');
    setBusy(true);
    try {
      await api.freeAccessGrant({
        parent_id: family.parent_id,
        student_id: childId ? Number(childId) : null,
        start_date: start,
        end_date: end,
        slots_per_day: Number(slots),
        reason: reason.trim() || null,
      });
      toast(`${family.parent_name} has free access for ${days} day${days === 1 ? '' : 's'}.`, 'success');
      setFamily(null); setChildId(''); setReason(''); setFound([]); setQ('');
      load();
    } catch (err) { toast(err.message, 'error'); }
    finally { setBusy(false); }
  };

  const cancel = async (row) => {
    if (!confirm(`Close ${row.parent_name}'s free access now? Quizzes stop from today.`)) return;
    try {
      await api.freeAccessCancel(row.id);
      toast('Window closed.', 'success');
      load();
    } catch (e) { toast(e.message, 'error'); }
  };

  if (error) return <ErrorBox error={error} onRetry={load} />;
  if (!list) return <Loading label="Loading free access…" />;

  const live = list.filter((r) => r.state === 'live').length;

  return (
    <Page
      title="Free access"
      subtitle="Quizzes at no charge between two dates. No plan, no invoice, and the free trial stays unspent."
    >
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        {/* ------------------------------------------------------- pick who */}
        <div className="rounded-2xl border border-line bg-white p-4">
          <div className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted">
            1 · Which family?
          </div>

          <form onSubmit={search} className="flex gap-2">
            <input
              className="input flex-1"
              placeholder="Search mobile, parent or child name…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <button className="btn-pri whitespace-nowrap" disabled={searching}>
              {searching ? 'Searching…' : 'Search'}
            </button>
          </form>
          <p className="mt-2 text-xs text-muted">
            Only families with a child on file appear here — free access gives quizzes to a
            child. For a number that has only ever said hi, use <b>Free quiz slot</b>.
          </p>

          {found.length > 0 && (
            <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
              {found.map((r) => (
                <label
                  key={r.parent_id}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition
                              ${family?.parent_id === r.parent_id
                                ? 'border-emerald-400 bg-emerald-50/50'
                                : 'border-line hover:bg-line/20'}`}
                >
                  <input
                    type="radio"
                    name="family"
                    className="mt-1 h-4 w-4 accent-emerald-600"
                    checked={family?.parent_id === r.parent_id}
                    onChange={() => { setFamily(r); setChildId(''); }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-ink">{r.parent_name || 'Unknown'}</span>
                      {r.has_live_window && <Pill tone="green">already open</Pill>}
                      {r.service_paused && <Pill tone="red">STOP</Pill>}
                    </div>
                    <div className="mt-0.5 text-xs text-muted">{r.mobile}</div>
                    <div className="mt-0.5 text-xs text-muted">
                      👦 {(r.children || []).map((c) => `${c.name} (${c.grade})`).join(', ')}
                    </div>
                    {r.last_plan && (
                      <div className="mt-0.5 text-xs text-muted">
                        {r.last_plan} · ended {pretty(r.plan_ends)}
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* ------------------------------------------------------ the window */}
        <div className="rounded-2xl border border-line bg-white p-4">
          <div className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted">
            2 · The window
          </div>

          {family && (family.children || []).length > 1 && (
            <>
              <label className="mb-1 block text-xs font-bold text-muted">Which child</label>
              <select className="input mb-3" value={childId} onChange={(e) => setChildId(e.target.value)}>
                <option value="">Every child in the family</option>
                {family.children.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} · {c.grade}</option>
                ))}
              </select>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-muted">From</label>
              <input className="input" type="date" value={start}
                     onChange={(e) => setStart(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-muted">To (included)</label>
              <input className="input" type="date" value={end} min={start}
                     onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>

          <label className="mb-1 mt-3 block text-xs font-bold text-muted">Quizzes per day</label>
          <input className="input" type="number" min={1} max={5} value={slots}
                 onChange={(e) => setSlots(e.target.value)} />
          <p className="mt-1 text-xs text-muted">
            This replaces the usual limit for the whole window — including weekends.
          </p>

          <label className="mb-1 mt-3 block text-xs font-bold text-muted">Reason (for your own records)</label>
          <input className="input" placeholder="School demo · Sorry for the outage · Diwali"
                 value={reason} onChange={(e) => setReason(e.target.value)} />

          <div className="mt-4 rounded-xl bg-line/30 p-3 text-sm">
            {family
              ? (
                <>
                  <b>{family.parent_name}</b>
                  {childId
                    ? <> · {family.children.find((c) => String(c.id) === String(childId))?.name}</>
                    : <> · all {family.children.length} child{family.children.length === 1 ? '' : 'ren'}</>}
                  <div className="mt-1 text-muted">
                    {days > 0
                      ? <>{days} day{days === 1 ? '' : 's'} · {slots} quiz{Number(slots) === 1 ? '' : 'zes'} a day · up to {days * Number(slots || 1)} quizzes</>
                      : 'Pick valid dates.'}
                  </div>
                </>
              )
              : <span className="text-muted">Choose a family on the left.</span>}
          </div>

          <button className="btn-pri mt-3 w-full" onClick={grant}
                  disabled={busy || !family || days < 1}>
            {busy ? 'Opening…' : 'Open free access'}
          </button>
          <p className="mt-2 text-xs text-muted">
            No message is sent. Tell the family yourself, or they will simply find the quiz
            working the next time they tap Start.
          </p>
        </div>
      </div>

      {/* ------------------------------------------------------------- list */}
      <div className="mt-5">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-sm font-bold text-ink">Windows</h2>
          <span className="text-xs text-muted">{live} open now · {list.length} in total</span>
        </div>
        <Table
          head={['Family', 'Child', 'From', 'To', 'Per day', 'Taken', 'State', '']}
          empty={list.length ? null : 'No free access has been given yet.'}
        >
          {list.map((r, i) => (
            <Row key={r.id} index={i}>
              <td className="td">
                <div className="font-semibold text-ink">{r.parent_name}</div>
                <div className="text-xs text-muted">{r.mobile}</div>
                {r.reason && <div className="text-xs text-muted">{r.reason}</div>}
              </td>
              <td className="td text-sm">{r.student_name || 'All'}</td>
              <td className="td text-sm">{pretty(r.start_date)}</td>
              <td className="td text-sm">{pretty(r.end_date)}</td>
              <td className="td text-sm tabular-nums">{r.slots_per_day}</td>
              <td className="td text-sm tabular-nums">{r.quizzes_taken}</td>
              <td className="td"><Pill tone={STATE_TONE[r.state]}>{r.state}</Pill></td>
              <td className="td text-right">
                {r.is_active && r.state !== 'finished' && (
                  <button className="btn-sec text-xs" onClick={() => cancel(r)}>Close</button>
                )}
              </td>
            </Row>
          ))}
        </Table>
      </div>
    </Page>
  );
}
