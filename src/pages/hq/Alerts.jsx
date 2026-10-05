import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAutoRefresh } from '../../lib/useAutoRefresh';
import { Page, Loading, ErrorBox, Empty, Pill } from '../../components/ui.jsx';
import { dt } from '../../components/hq/kit.jsx';

/*
 * ALERTS (admin revamp, 2026-10-05) — the alerts centre, as on GaadiPe:
 * problems the server noticed on its own (checked every five minutes), each
 * shown once while it lasts and closed by itself when it clears. New ones
 * also reach you by email and — if switched on below — as a phone alert.
 */
const TONE = { critical: 'red', warning: 'amber', info: 'blue' };

export default function Alerts() {
  const [all, setAll] = useState(false);
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const load = useCallback(() => api.hq.alerts(all).then((x) => { setRows(x.rows); setError(null); }).catch(setError), [all]);
  useEffect(() => { load(); }, [load]);
  useAutoRefresh(load, 30000);
  return (
    <Page title="Alerts" subtitle="Problems the server noticed — checked every five minutes, closed by themselves when they clear"
      actions={<label className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} /> Show resolved too</label>}>
      <PhoneAlerts />
      {error && !rows ? <ErrorBox error={error} onRetry={load} /> : !rows ? <Loading /> : !rows.length ? <Empty>All clear. ✅</Empty> : (
        <div className="grid gap-3">
          {rows.map((a) => (
            <div key={a.id} className={`card p-4 ${a.status === 'open' ? '' : 'opacity-60'}`}>
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone={TONE[a.severity] || 'grey'}>{a.severity}</Pill>
                <b className="text-ink">{a.title}</b>
                <span className="ml-auto text-[11px] text-muted">{dt(a.created_at)}</span>
              </div>
              {a.description && <p className="mt-1.5 text-sm text-ink">{a.description}</p>}
              {a.status === 'open'
                ? <button type="button" className="btn-sec mt-3 !py-1.5 text-xs" onClick={async () => { await api.hq.resolveAlert(a.id); load(); }}>Mark resolved</button>
                : <p className="mt-1 text-[11px] text-muted">Resolved {dt(a.resolved_at)} — {a.resolution}</p>}
            </div>
          ))}
        </div>
      )}
    </Page>
  );
}

const b64 = (s) => {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const raw = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

/* Phone alerts for THIS device: on, off, test. */
function PhoneAlerts() {
  const [state, setState] = useState('checking');
  const [info, setInfo] = useState(null);
  const supported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const check = useCallback(async () => {
    if (!supported) { setState('unsupported'); return; }
    if (Notification.permission === 'denied') { setState('blocked'); return; }
    const reg = await navigator.serviceWorker.getRegistration('/hq-sw.js').catch(() => null);
    const sub = reg && await reg.pushManager.getSubscription();
    setState(sub ? 'on' : 'off');
    api.hq.pushKey().then(setInfo).catch(() => {});
  }, [supported]);
  useEffect(() => { check(); }, [check]);
  const turnOn = async () => {
    const k = await api.hq.pushKey();
    if (!k.key) { setState('unavailable'); return; }
    const reg = await navigator.serviceWorker.register('/hq-sw.js');
    await navigator.serviceWorker.ready;
    if (await Notification.requestPermission() !== 'granted') { setState('blocked'); return; }
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(k.key) });
    await api.hq.pushSubscribe(sub.toJSON());
    check();
  };
  const turnOff = async () => {
    const reg = await navigator.serviceWorker.getRegistration('/hq-sw.js');
    const sub = reg && await reg.pushManager.getSubscription();
    if (sub) { await api.hq.pushUnsubscribe(sub.endpoint); await sub.unsubscribe(); }
    check();
  };
  return (
    <div className="card mb-4 flex flex-wrap items-center gap-3 p-4">
      <span className="text-xl">📱</span>
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-ink">Phone alerts on this device</div>
        <div className="text-xs text-muted">
          {{ on: 'On — new alerts arrive here even with the panel closed.', off: 'Off for this device.', blocked: 'Notifications are blocked for this site in the browser settings.',
            unsupported: 'This browser cannot receive push alerts.', unavailable: 'The server cannot send push yet (web-push not installed — run npm install on the server).', checking: '…' }[state]}
          {info?.devices != null && ` · ${info.devices} device(s) subscribed`}
        </div>
      </div>
      {state === 'off' && <button type="button" className="btn-pri !py-2 text-sm" onClick={() => turnOn().catch(() => setState('off'))}>Turn on</button>}
      {state === 'on' && <>
        <button type="button" className="btn-sec !py-2 text-sm" onClick={() => api.hq.pushTest()}>Send a test</button>
        <button type="button" className="btn-sec !py-2 text-sm" onClick={() => turnOff()}>Turn off</button>
      </>}
    </div>
  );
}
