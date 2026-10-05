import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';
import { chime } from '../../lib/sound';
import { motionLevel } from '../../lib/motion.jsx';

/*
 * META'S NEWS AS A DIALOG (admin revamp, 2026-10-05) — as on GaadiPe's panel.
 * Meta's account webhooks (limit decisions, number cap, display name,
 * quality) reach GaadiPe's server; QuizPe reads them from there, read-only,
 * because the WhatsApp account is shared. The dialog covers the panel until
 * "Got it" is clicked (Escape and outside clicks do nothing); "Got it" is kept
 * in QuizPe's own database, never written back to GaadiPe.
 *
 * Good news — a raised limit or number cap, an approved name — gets its own
 * celebration: rising chat bubbles, pulsing rings, a rocket, and the limit
 * counting up from 250.
 */
const reduced = () => motionLevel() !== 'full';

function goodNews(n) {
  const text = `${n.title || ''}\n${n.description || ''}`;
  if (/FAILED|REJECT|DEFERRED|NEED_MORE_INFO|DOWNGRADE|FLAGGED|RESTRICT|DISABLED/i.test(text)) return null;
  const limit = /Limit:\s*(\d{4,})/i.exec(text) || /Current limit:\s*TIER_(\d+K?)/i.exec(text);
  const cap = /Phone number cap:\s*(\d+)/i.exec(text);
  if (limit) {
    const raw = String(limit[1]).toUpperCase();
    const to = raw.endsWith('K') ? Number(raw.slice(0, -1)) * 1000 : Number(raw);
    if (to > 250) return { kind: 'limit', to, cap: cap ? Number(cap[1]) : null };
  }
  if (cap && Number(cap[1]) > 2) return { kind: 'cap', cap: Number(cap[1]) };
  if (/APPROVED/i.test(text) && /name/i.test(text)) return { kind: 'name' };
  return null;
}

function Counter({ to }) {
  const [v, setV] = useState(reduced() ? to : 250);
  useEffect(() => {
    if (reduced()) return undefined;
    let raf; const start = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - start) / 1800);
      setV(Math.round(250 + (to - 250) * (1 - (1 - p) ** 3)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <span>{v.toLocaleString('en-IN')}</span>;
}

function Bubbles() {
  if (reduced()) return null;
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 22 }, (_, i) => (
        <span key={i} className="qp-meta-bubble"
          style={{ left: `${(i * 37) % 100}%`, fontSize: 18 + (i % 4) * 8, animationDelay: `${(i % 11) * 0.28}s`, animationDuration: `${3.2 + (i % 5) * 0.5}s` }}>
          {['💬', '✅', '💚', '📈', '🧠', '🚀'][i % 6]}
        </span>
      ))}
    </div>
  );
}

const STYLE = `
@keyframes qpRise { 0% { transform: translateY(0) scale(.6); opacity: 0 } 12% { opacity: 1 } 100% { transform: translateY(-110vh) scale(1.1); opacity: 0 } }
@keyframes qpRing { 0% { transform: scale(.8); opacity: .7 } 100% { transform: scale(1.9); opacity: 0 } }
@keyframes qpRocket { 0% { transform: translate(-30px, 40px); opacity: 0 } 30% { opacity: 1 } 100% { transform: translate(40px, -60px) rotate(-8deg); opacity: 0 } }
@keyframes qpPop { 0% { transform: scale(.85); opacity: 0 } 60% { transform: scale(1.03); opacity: 1 } 100% { transform: scale(1) } }
.qp-meta-bubble { position: absolute; bottom: -40px; animation-name: qpRise; animation-timing-function: ease-out; animation-iteration-count: infinite; }
.qp-meta-ring { position: absolute; inset: 0; border-radius: 9999px; border: 3px solid #12a150; animation: qpRing 1.6s ease-out infinite; }
.qp-meta-rocket { position: absolute; right: 18px; top: 18px; font-size: 28px; animation: qpRocket 2.4s ease-in-out infinite; }
.qp-meta-card { animation: qpPop .45s ease-out both; }
@media (prefers-reduced-motion: reduce) { .qp-meta-ring, .qp-meta-rocket, .qp-meta-card { animation: none } }
`;

export default function MetaNews() {
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const heard = useRef(new Set());
  const load = useCallback(() => api.hq.metaNews().then((x) => setRows(x.rows || [])).catch(() => {}), []);
  useEffect(() => {
    load();
    const t = setInterval(() => { if (!document.hidden) load(); }, 60000);
    const vis = () => { if (!document.hidden) load(); };
    document.addEventListener('visibilitychange', vis);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', vis); };
  }, [load]);

  const cur = rows[0];
  const good = cur ? goodNews(cur) : null;
  useEffect(() => {
    if (cur && !heard.current.has(cur.id)) { heard.current.add(cur.id); chime(good ? 'milestone' : 'support'); }
  }, [cur, good]);
  if (!cur) return null;

  const done = async () => {
    setBusy(true);
    try { await api.hq.metaSeen(cur.id); } catch { /* shown again next time */ }
    setRows((r) => r.slice(1));
    setBusy(false);
  };
  const when = new Date(cur.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 ${good ? 'bg-[#063b2a]/80' : 'bg-black/60'}`}
      role="dialog" aria-modal="true" aria-labelledby="qp-meta-title">
      <style>{STYLE}</style>
      {good && <Bubbles />}
      <div className="qp-meta-card relative w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 shadow-2xl">
        {good && <span className="qp-meta-rocket" aria-hidden="true">🚀</span>}
        {good ? (
          <div className="text-center">
            <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
              <span className="qp-meta-ring" aria-hidden="true" />
              <span className="qp-meta-ring" style={{ animationDelay: '.8s' }} aria-hidden="true" />
              <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-emerald-600 text-4xl text-white shadow-lg">🎉</span>
            </div>
            <div className="mt-3 text-[11px] font-bold uppercase tracking-wide text-emerald-700">Good news from Meta{rows.length > 1 ? ` · 1 of ${rows.length}` : ''}</div>
            <h2 id="qp-meta-title" className="mt-1 text-xl font-bold text-ink">
              {good.kind === 'limit' ? 'WhatsApp limit raised!' : good.kind === 'cap' ? 'More phone numbers allowed!' : 'Display name approved!'}
            </h2>
            {good.kind === 'limit' && (
              <div className="mt-3">
                <div className="text-4xl font-extrabold text-emerald-700"><Counter to={good.to} /></div>
                <div className="text-xs text-muted">people a day QuizPe and GaadiPe can message first — up from 250</div>
              </div>
            )}
            {good.cap && <div className="mt-2 text-sm text-ink">Phone numbers allowed: <b>{good.cap}</b> (was 2)</div>}
            <p className="mt-3 whitespace-pre-line rounded-lg bg-emerald-50 p-3 text-left text-xs text-ink">{cur.description || '—'}</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-50 text-2xl">📣</span>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wide text-muted">Message from Meta{rows.length > 1 ? ` · 1 of ${rows.length}` : ''}</div>
                <h2 id="qp-meta-title" className="text-base font-bold text-ink">{String(cur.title || '').replace(/^📣\s*/, '')}</h2>
              </div>
            </div>
            <p className="mt-4 whitespace-pre-line rounded-lg bg-line/40 p-3 text-sm text-ink">{cur.description || '—'}</p>
          </>
        )}
        <p className={`mt-2 text-[11px] text-muted ${good ? 'text-center' : ''}`}>{when} · shared WhatsApp account (QuizPe + GaadiPe)</p>
        <button type="button" autoFocus disabled={busy} onClick={done} className={`mt-5 w-full ${good ? 'btn bg-emerald-600 text-white hover:bg-emerald-700' : 'btn-pri'}`}>
          {busy ? '…' : rows.length > 1 ? 'Got it — next' : good ? 'Awesome — got it' : 'Got it'}
        </button>
      </div>
    </div>
  );
}
