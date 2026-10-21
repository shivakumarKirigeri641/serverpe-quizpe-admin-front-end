import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Page, Loading, ErrorBox, Empty, Pill, Table, Row } from '../../components/ui.jsx';
import { num, ago } from '../../components/hq/kit.jsx';

/*
 * BROADCAST — EMAIL (user, 2026-10-21: "all do it" — QuizPe like GaadiPe's web admin). Goes only to
 * families who agreed, with a CONFIRMED email they have not unsubscribed (web/email.js). The rules beside
 * the box, a test to yourself first, SEND typed to confirm; every email carries an unsubscribe link and
 * {name} becomes the parent's first name. Sent a few a minute.
 */
export default function EmailBroadcast() {
  const [d, setD] = useState(null);
  const [error, setError] = useState(null);
  const [f, setF] = useState({ category: 'service', audience: 'all', subject: '', body: '' });
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(null);
  const load = useCallback(() => api.hq.emailBroadcast().then((x) => { setD(x); setError(null); }).catch(setError), []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  const ready = f.subject.trim().length >= 3 && f.body.trim().length >= 10;
  const go = async (test) => {
    setBusy(true); setNote(null);
    try {
      const r = await api.hq.emailSend({ ...f, test, confirm });
      setNote({ ok: true, text: r.message });
      if (!test) { setConfirm(''); setF({ ...f, subject: '', body: '' }); }
      load();
    } catch (x) { setNote({ ok: false, text: x.message }); }
    setBusy(false);
  };
  const reach = d ? d.counts[f.audience] : 0;

  return (
    <Page title="Broadcast email" subtitle="An email you write, to families who agreed and confirmed their email. Each email has an unsubscribe link. Test it on yourself first.">
      {error && !d ? <ErrorBox error={error} onRetry={load} /> : !d ? <Loading /> : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="card p-4"><div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Can be emailed</div>
              <div className="mt-1 text-2xl font-bold tabular-nums text-ink">{num(d.counts.all)}</div><div className="text-[11px] text-muted">confirmed and subscribed</div></div>
            <div className="card p-4"><div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Email not confirmed</div>
              <div className="mt-1 text-2xl font-bold tabular-nums text-ink">{num(d.counts.not_confirmed)}</div><div className="text-[11px] text-muted">asked to confirm in the app</div></div>
            <div className="card p-4"><div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Unsubscribed</div>
              <div className="mt-1 text-2xl font-bold tabular-nums text-ink">{num(d.counts.unsubscribed)}</div><div className="text-[11px] text-muted">never emailed again</div></div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="card p-4 lg:col-span-2">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-semibold text-muted">Kind
                  <select className="input mt-1 !py-2" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
                    <option value="service">Service notice</option><option value="promotion">Promotion / offer</option>
                  </select></label>
                <label className="text-xs font-semibold text-muted">Who gets it
                  <select className="input mt-1 !py-2" value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value })}>
                    {Object.entries(d.audiences).map(([k, l]) => <option key={k} value={k}>{l} ({num(d.counts[k])})</option>)}
                  </select></label>
              </div>
              <label className="mt-3 block text-xs font-semibold text-muted">Subject
                <input className="input mt-1" maxLength={150} value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} placeholder="e.g. New: weekly report for {name}'s child" /></label>
              <label className="mt-3 block text-xs font-semibold text-muted">Message
                <textarea className="input mt-1 min-h-[180px]" maxLength={8000} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })}
                  placeholder={'Dear {name},\n\nWrite your message here. A blank line starts a new paragraph.\n\nhttps://quizpe.in/app'} /></label>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button className="btn-sec" disabled={!ready || busy} onClick={() => go(true)}>Send a test to me</button>
                <input className="input !w-32 !py-2 text-center font-bold" placeholder="type SEND" value={confirm} onChange={(e) => setConfirm(e.target.value.toUpperCase())} />
                <button className="btn-pri" disabled={!ready || busy || confirm !== 'SEND' || !reach} onClick={() => go(false)}>
                  {busy ? 'Working…' : `Send to ${num(reach)} famil${reach === 1 ? 'y' : 'ies'}`}</button>
              </div>
              {note ? <p className={`mt-2 text-sm ${note.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{note.text}</p> : null}
            </div>
            <div className="card p-4 text-xs leading-relaxed text-muted">
              <div className="mb-2 text-sm font-bold text-ink">The rules</div>
              <ul className="list-disc space-y-1 pl-4">
                <li>Only families who <b>agreed</b> to QuizPe's terms and <b>confirmed</b> their email.</li>
                <li>Every email has an <b>unsubscribe</b> link; unsubscribed families are never emailed again.</li>
                <li><b>{'{name}'}</b> becomes the parent's first name. Web addresses become links.</li>
                <li>Send a <b>test to yourself</b> first and read it on your phone.</li>
                <li>Keep offers rare — once or twice a month at most.</li>
                <li>Sent a few a minute, so a large send takes a while.</li>
              </ul>
            </div>
          </div>

          <h2 className="mb-2 mt-6 text-sm font-bold text-ink">Sent so far</h2>
          {!d.campaigns.length ? <Empty>No broadcast emails yet.</Empty> : (
            <Table head={['When', 'Subject', 'Kind', 'Who', 'Sent', 'Status']}>
              {d.campaigns.map((c, i) => (
                <Row key={c.id} index={i}>
                  <td className="td whitespace-nowrap text-xs">{ago(c.created_at)}</td>
                  <td className="td">{c.subject}</td>
                  <td className="td text-xs">{c.category}</td>
                  <td className="td text-xs">{d.audiences[c.audience] || c.audience}</td>
                  <td className="td tabular-nums text-xs">{num(c.sent)} / {num(c.total)}{c.failed ? <span className="text-rose-700"> · {num(c.failed)} failed</span> : null}{c.skipped ? <span className="text-muted"> · {num(c.skipped)} skipped</span> : null}</td>
                  <td className="td"><Pill tone={c.status === 'sent' ? 'green' : 'blue'}>{c.status === 'sent' ? 'done' : 'sending'}</Pill></td>
                </Row>
              ))}
            </Table>
          )}
        </>
      )}
    </Page>
  );
}
