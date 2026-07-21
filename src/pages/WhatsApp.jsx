/**
 * WhatsApp conversations — read-only.
 *
 * A grid of numbers, each expanding into the complete thread: every inbound
 * and outbound message with its type, delivery status, timestamps and the raw
 * webhook payload, alongside the state-machine transitions that produced it.
 *
 * Read-only by design. These rows are the evidential record of what was said
 * to a parent and when, including consent. Editing them would destroy the one
 * thing they are for.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';
import { Page, Loading, ErrorBox, Pill } from '../components/ui.jsx';

const TYPE_ICON = {
  text: '💬', interactive: '🔘', button: '👆', image: '🖼️', document: '📄',
  audio: '🎤', video: '🎬', sticker: '🩹', template: '📣', location: '📍', contacts: '👤',
};

const STATUS_TONE = {
  sent: 'blue', delivered: 'green', read: 'green', failed: 'red', sending: 'amber',
};

export default function WhatsAppPage() {
  const [rows, setRows] = useState(null);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(null);
  const [thread, setThread] = useState({});
  const LIMIT = 25;

  const load = () => {
    setError('');
    api.waSessions({ q, limit: LIMIT, offset })
      .then((d) => { setRows(d.rows); setTotal(d.total); })
      .catch((e) => setError(e.message));
  };
  useEffect(() => { const t = setTimeout(load, q ? 300 : 0); return () => clearTimeout(t); }, [q, offset]);

  const toggle = async (id) => {
    if (open === id) return setOpen(null);
    setOpen(id);
    if (!thread[id]) {
      try {
        const d = await api.waThread(id);
        setThread((t) => ({ ...t, [id]: d }));
      } catch (e) {
        setThread((t) => ({ ...t, [id]: { error: e.message } }));
      }
    }
  };

  const head = ['', 'Mobile', 'Parent', 'State', 'Messages', 'In / Out', 'Failed', 'Events', 'Last message', 'Last seen'];

  return (
    <Page
      title="WhatsApp conversations"
      subtitle={rows ? `${total} conversation${total === 1 ? '' : 's'} · read-only record` : ''}
      actions={
        <input className="input max-w-xs" placeholder="Search number or name…"
               value={q} onChange={(e) => { setOffset(0); setQ(e.target.value); }} />
      }
    >
      {error ? <ErrorBox error={error} onRetry={load} />
        : !rows ? <Loading label="Loading conversations…" />
          : (
            <>
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead><tr>{head.map((h, i) => <th key={i} className="th">{h}</th>)}</tr></thead>
                    <tbody>
                      {rows.map((s) => (
                        <>
                          <tr key={s.id} onClick={() => toggle(s.id)}
                              className="cursor-pointer hover:bg-line/30 transition">
                            <td className="td">
                              <span className={`inline-block transition-transform ${open === s.id ? 'rotate-90' : ''}`}>▶</span>
                            </td>
                            <td className="td font-semibold whitespace-nowrap">{s.mobile_number}</td>
                            <td className="td">
                              {s.parent_id
                                ? <Link to={`/parents/${s.parent_id}`} onClick={(e) => e.stopPropagation()}
                                        className="text-brand-accent font-semibold">{s.parent_name || '—'}</Link>
                                : <span className="text-muted text-xs">not enrolled</span>}
                            </td>
                            <td className="td"><Pill tone={s.is_active ? 'blue' : 'grey'}>{s.state}</Pill></td>
                            <td className="td font-semibold">{s.messages}</td>
                            <td className="td text-xs text-muted">{s.inbound} / {s.outbound}</td>
                            <td className="td">{s.failed > 0 ? <Pill tone="red">{s.failed}</Pill> : <span className="text-muted">0</span>}</td>
                            <td className="td text-muted">{s.events}</td>
                            <td className="td text-xs text-muted max-w-xs truncate">{s.last_message || '—'}</td>
                            <td className="td text-xs whitespace-nowrap text-muted">{s.last_inbound_ist || '—'}</td>
                          </tr>

                          {open === s.id && (
                            <tr key={`${s.id}-thread`}>
                              <td colSpan={head.length} className="p-0 border-t border-line">
                                <Thread data={thread[s.id]} session={s} />
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                      {!rows.length && (
                        <tr><td className="td text-center text-muted" colSpan={head.length}>
                          No conversations match that search.
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {total > LIMIT && (
                <div className="flex items-center justify-between mt-4 text-sm">
                  <span className="text-muted">{offset + 1}–{Math.min(offset + LIMIT, total)} of {total}</span>
                  <div className="flex gap-2">
                    <button className="btn-sec" disabled={offset === 0}
                            onClick={() => setOffset(Math.max(0, offset - LIMIT))}>← Previous</button>
                    <button className="btn-sec" disabled={offset + LIMIT >= total}
                            onClick={() => setOffset(offset + LIMIT)}>Next →</button>
                  </div>
                </div>
              )}
            </>
          )}
    </Page>
  );
}

function Thread({ data, session }) {
  const [tab, setTab] = useState('messages');
  const [raw, setRaw] = useState(null);

  if (!data) return <div className="p-6 text-sm text-muted bg-line/10">Loading conversation…</div>;
  if (data.error) return <div className="p-6 text-sm text-red-600 bg-red-50">{data.error}</div>;

  const showRaw = async (id) => {
    if (raw?.id === id) return setRaw(null);
    try {
      const d = await api.waRaw(id);
      setRaw({ id, payload: d.message.payload });
    } catch { setRaw({ id, payload: { error: 'Could not load payload' } }); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-line/10 p-5">
      <div className="flex gap-1 mb-4">
        {[['messages', `Messages (${data.messages.length})`], ['events', `State changes (${data.events.length})`],
          ['context', 'Session context']].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
                  className={`btn text-xs px-3 py-1.5 ${tab === k ? 'bg-brand text-white' : 'bg-white border border-line'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'messages' && (
        <div className="space-y-2 max-h-[30rem] overflow-y-auto pr-1">
          {data.messages.map((m) => {
            const inbound = m.direction === 'inbound';
            return (
              <div key={m.id} className={`flex ${inbound ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm border
                                 ${inbound ? 'bg-white border-line' : 'bg-emerald-50 border-emerald-200'}`}>
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-muted mb-1">
                    <span>{TYPE_ICON[m.message_type] || '•'}</span>
                    <span>{inbound ? 'Parent' : 'QuizPe'}</span>
                    <span>· {m.message_type}</span>
                    {m.status && <Pill tone={STATUS_TONE[m.status] || 'grey'}>{m.status}</Pill>}
                  </div>
                  <p className="whitespace-pre-wrap break-words">{m.body || <em className="text-muted">no text body</em>}</p>
                  {m.error_message && <p className="text-xs text-red-600 mt-1">⚠ {m.error_message}</p>}
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted">
                    <span>{m.at_ist}</span>
                    {m.delivered_ist && <span>✓ delivered {m.delivered_ist.split(', ')[1]}</span>}
                    {m.read_ist && <span>✓✓ read</span>}
                    <button onClick={() => showRaw(m.id)} className="ml-auto text-brand-accent font-bold">
                      {raw?.id === m.id ? 'hide raw' : 'raw'}
                    </button>
                  </div>
                  <AnimatePresence>
                    {raw?.id === m.id && (
                      <motion.pre initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-auto text-[10px] bg-ink text-emerald-200 rounded-lg p-3 mt-2 max-h-56">
                        {JSON.stringify(raw.payload, null, 2)}
                      </motion.pre>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
          {!data.messages.length && <p className="text-sm text-muted">No messages in this conversation.</p>}
        </div>
      )}

      {tab === 'events' && (
        <div className="overflow-x-auto max-h-[30rem]">
          <table className="w-full border-collapse bg-white rounded-xl overflow-hidden">
            <thead><tr>{['When', 'From', 'To', 'Event', 'Payload'].map((h) =>
              <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody>
              {data.events.map((e) => (
                <tr key={e.id}>
                  <td className="td text-xs whitespace-nowrap">{e.at_ist}</td>
                  <td className="td text-xs text-muted">{e.from_state || '—'}</td>
                  <td className="td text-xs font-semibold">{e.to_state}</td>
                  <td className="td text-xs">{e.event}</td>
                  <td className="td text-[10px] text-muted max-w-md truncate">
                    {e.payload ? JSON.stringify(e.payload) : '—'}
                  </td>
                </tr>
              ))}
              {!data.events.length && (
                <tr><td className="td text-center text-muted" colSpan={5}>No state changes recorded.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'context' && (
        <pre className="overflow-auto text-xs bg-ink text-emerald-200 rounded-xl p-4 max-h-[30rem]">
          {JSON.stringify(data.session.context ?? {}, null, 2)}
        </pre>
      )}

      <p className="text-[11px] text-muted mt-4">
        Read-only. This is the evidential record of what was sent to {session.mobile_number}, including
        consent messages — it is never edited or deleted from here.
      </p>
    </motion.div>
  );
}
