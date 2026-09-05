/**
 * Broadcast — send an approved marketing template to a segment, safely.
 *
 * The guardrails live on the server (approved-only, STOP-excluded, and a
 * frequency guard that skips anyone messaged in the last N days). This screen
 * makes them visible: pick a template + segment, Preview to see who'll get it
 * and who's skipped, then Send.
 */
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { toast } from '../components/Toaster.jsx';
import { Page, Loading, ErrorBox } from '../components/ui.jsx';
import { templateGuide } from '../lib/templateGuide';

export default function Broadcast() {
  const [opts, setOpts] = useState(null);
  const [error, setError] = useState('');
  const [template, setTemplate] = useState('');
  const [segment, setSegment] = useState('');
  const [cooldown, setCooldown] = useState(7);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState('');
  const [result, setResult] = useState(null);
  const [pvals, setPvals] = useState([]);   // admin-typed values for {{2}}..{{n}}
  const [mode, setMode] = useState('segment');   // 'segment' | 'pick' | 'numbers'
  const [mobiles, setMobiles] = useState('');    // free-typed numbers for direct send
  // 'pick' mode: choose a category, then tick the individuals inside it.
  const [pickSeg, setPickSeg] = useState('');
  const [people, setPeople] = useState(null);
  const [checked, setChecked] = useState({});    // mobile -> true
  const [loadingPeople, setLoadingPeople] = useState(false);

  /** A template's variables array, tolerant of json/text storage. */
  const varsOf = (t) => !t ? []
    : Array.isArray(t.variables) ? t.variables
    : (() => { try { return JSON.parse(t.variables || '[]'); } catch { return []; } })();

  useEffect(() => {
    api.broadcastOptions().then(setOpts).catch((e) => setError(e.message));
  }, []);

  /** Load the people in a category so individuals can be ticked. */
  const loadPeople = async (seg) => {
    setPickSeg(seg); setPeople(null); setChecked({}); setPreview(null); setMobiles('');
    if (!seg) return;
    setLoadingPeople(true);
    try {
      const d = await api.broadcastSegmentPeople(seg);
      setPeople(d.rows);
      // Pre-tick everyone who can actually be reached — the common case is
      // "all of them except a few", not starting from an empty list.
      const pre = {};
      d.rows.forEach((r) => { if (!r.paused) pre[r.mobile] = true; });
      setChecked(pre);
    } catch (e) { toast(e.message, 'error'); }
    finally { setLoadingPeople(false); }
  };

  // 'pick' feeds the same direct-send path as typed numbers, so STOP handling,
  // the dry-run preview and the send log all behave identically.
  const pickedMobiles = Object.keys(checked).filter((m) => checked[m]);
  useEffect(() => {
    if (mode === 'pick') setMobiles(pickedMobiles.join(','));
  }, [checked, mode]);

  const doPreview = async () => {
    setBusy('preview'); setResult(null); setPreview(null);
    try {
      if (mode !== 'segment') {
        const d = await api.broadcastDirect({ template, params: pvals, mobiles, dryRun: true });
        setPreview({ total: d.total, no_session: 0, skipped_cooldown: d.paused,
          recipients: d.total - d.paused, direct: true,
          list: d.recipients.map((r) => ({ name: r.name, mobile: r.mobile })) });
      } else {
        setPreview(await api.broadcastPreview({ segment, cooldownDays: Number(cooldown) }));
      }
    } catch (e) { toast(e.message, 'error'); }
    finally { setBusy(''); }
  };

  const doSend = async () => {
    const who = mode !== 'segment' ? `${preview.recipients} number(s)` : `${preview.recipients} parent(s) in "${segment}"`;
    if (!confirm(`Send "${template}" to ${who}? This messages real people.`)) return;
    setBusy('send');
    try {
      const r = mode !== 'segment'
        ? await api.broadcastDirect({ template, params: pvals, mobiles })
        : await api.broadcastSend({ template, segment, cooldownDays: Number(cooldown), params: pvals });
      setResult(r);
      toast(`Sent — ${r.sent}${r.failed ? `, ${r.failed} failed` : ''}${r.skipped ? `, ${r.skipped} skipped (STOP)` : ''}.`, 'success');
      setPreview(null);
    } catch (e) { toast(e.message, 'error'); }
    finally { setBusy(''); }
  };

  if (error) return <ErrorBox error={error} onRetry={() => api.broadcastOptions().then(setOpts).catch((e) => setError(e.message))} />;
  if (!opts) return <Loading label="Loading broadcast…" />;

  const selT = opts.templates.find((x) => x.template_name === template);
  const extraVars = varsOf(selT).slice(1);           // {{2}}..{{n}} — {{1}} is always the name
  const extraFilled = extraVars.length === 0 || pvals.slice(0, extraVars.length).every((v) => v && v.trim());
  const canPreview = mode === 'segment' ? !!segment : !!(template && mobiles.trim());
  const canSend = template && preview && preview.recipients > 0 && extraFilled
    && (mode === 'segment' ? !!segment : true);

  return (
    <Page title="Broadcast" subtitle="Send an approved marketing template to a segment — with over-send guardrails">
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Compose */}
        <div className="card p-5 space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-muted mb-1.5">Template (approved only)</label>
            {opts.templates.length ? (
              <select className="input" value={template}
                      onChange={(e) => {
                        const name = e.target.value;
                        setTemplate(name); setPreview(null);
                        const n = Math.max(0, varsOf(opts.templates.find((x) => x.template_name === name)).length - 1);
                        setPvals(Array(n).fill(''));
                      }}>
                <option value="">— pick a template —</option>
                {opts.templates.map((t) => (
                  <option key={t.template_name} value={t.template_name}>{t.template_name}</option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-muted">No approved templates yet. Get a marketing template approved in Meta and add it to <code>whatsapp_templates</code>.</p>
            )}
            <p className="text-[11px] text-muted mt-1.5">Only marketing templates should be broadcast. Body must have one variable <code>{'{{1}}'}</code> = parent's first name.</p>

            {template && (() => {
              const t = opts.templates.find((x) => x.template_name === template);
              if (!t) return null;
              const g = templateGuide(t);
              return (
                <>
                  <div className="mt-3 rounded-xl bg-sky-50 border border-sky-200 p-3">
                    <div className="text-[11px] font-bold uppercase tracking-wide text-sky-800 mb-1">Who to send this to</div>
                    <div className="text-sm text-ink"><b>{g.audience}</b> — {g.note}</div>
                    {g.manual === false && (
                      <div className="text-[12px] text-amber-700 mt-1">⚠️ This is an automatic template — the app sends it on its own. Only broadcast marketing templates from here.</div>
                    )}
                  </div>

                  {extraVars.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <div className="text-[11px] font-bold uppercase tracking-wide text-muted">Your message text</div>
                      {extraVars.map((v, i) => (
                        <div key={i}>
                          <label className="block text-[11px] text-muted mb-1">
                            <span className="capitalize">{String(v).replace(/_/g, ' ')}</span>{' '}
                            <span className="font-mono">{`{{${i + 2}}}`}</span>
                          </label>
                          <textarea rows={i === extraVars.length - 1 ? 3 : 2} className="input"
                                    placeholder={`Type the ${String(v).replace(/_/g, ' ')}…`}
                                    value={pvals[i] || ''}
                                    onChange={(e) => { const n = [...pvals]; n[i] = e.target.value; setPvals(n); setPreview(null); }} />
                        </div>
                      ))}
                      <p className="text-[11px] text-muted">{'{{1}}'} is filled with each parent's first name automatically.</p>
                    </div>
                  )}

                  <TemplatePreview t={t} name="Ravi" params={pvals} />
                </>
              );
            })()}
          </div>

          {/* send to a whole segment, or to specific numbers you type in */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-muted mb-1.5">Who gets it</label>
            <div className="flex gap-1 mb-3">
              {[['segment', 'A segment'], ['pick', 'Pick people'], ['numbers', 'Specific numbers']].map(([k, label]) => (
                <button key={k} type="button"
                        onClick={() => { setMode(k); setPreview(null); }}
                        className={`text-sm px-3 py-1.5 rounded-lg font-semibold transition ${mode === k ? 'bg-brand text-white' : 'text-muted hover:bg-slate-100'}`}>
                  {label}
                </button>
              ))}
            </div>

            {mode === 'pick' ? (
              <>
                {/* 1 — the category */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {opts.segments.map((sg) => (
                    <button key={sg.key} type="button"
                            onClick={() => loadPeople(sg.key)}
                            className={`text-sm px-3 py-1.5 rounded-lg font-semibold border transition ${
                              pickSeg === sg.key ? 'bg-brand text-white border-brand' : 'border-line text-muted hover:bg-slate-50'}`}>
                      {sg.label} <span className="opacity-70">({sg.count})</span>
                    </button>
                  ))}
                </div>

                {loadingPeople && <p className="text-sm text-muted py-4">Loading people…</p>}

                {!loadingPeople && people && !people.length && (
                  <p className="text-sm text-muted py-4">Nobody is in that category right now.</p>
                )}

                {/* 2 — the individuals */}
                {!loadingPeople && people && !!people.length && (
                  <>
                    <div className="flex items-center gap-2 mb-2 text-sm">
                      <button type="button" className="btn-sec text-xs py-1"
                              onClick={() => { const a = {}; people.forEach((r) => { if (!r.paused) a[r.mobile] = true; }); setChecked(a); setPreview(null); }}>
                        Select all reachable
                      </button>
                      <button type="button" className="btn-sec text-xs py-1"
                              onClick={() => { setChecked({}); setPreview(null); }}>
                        Clear
                      </button>
                      <span className="ml-auto font-bold text-brand">{pickedMobiles.length} selected</span>
                    </div>

                    <div className="border border-line rounded-lg divide-y divide-line max-h-[420px] overflow-y-auto">
                      {people.map((r) => (
                        <label key={r.mobile}
                               className={`flex items-start gap-2.5 px-3 py-2.5 text-sm cursor-pointer hover:bg-slate-50 ${
                                 r.paused ? 'opacity-50' : ''}`}>
                          <input type="checkbox" className="mt-1"
                                 checked={!!checked[r.mobile]} disabled={r.paused}
                                 onChange={(e) => { setChecked((c) => ({ ...c, [r.mobile]: e.target.checked })); setPreview(null); }} />
                          <span className="min-w-0 flex-1">
                            <span className="font-semibold">{r.name}</span>
                            <span className="text-muted"> · {r.mobile}</span>
                            {r.children && <span className="block text-[11px] text-muted truncate">👦 {r.children}</span>}
                            <span className="block text-[11px] text-muted">
                              {r.plan ? `${r.plan}${r.expiry ? ` · till ${r.expiry}` : ''}` : 'No plan'}
                              {' · '}{r.quizzes_done} quiz{r.quizzes_done === 1 ? '' : 'zes'} done
                              {r.last_quiz ? ` · last ${r.last_quiz}` : ' · never started'}
                            </span>
                            <span className="flex flex-wrap gap-1 mt-1">
                              {r.paused && <em className="pill bg-red-50 text-red-700 not-italic">STOP — cannot message</em>}
                              {!r.reachable && !r.paused && <em className="pill bg-amber-50 text-amber-700 not-italic">no chat yet</em>}
                              {r.last_broadcast && (
                                <em className="pill bg-slate-100 text-muted not-italic">
                                  last messaged {new Date(r.last_broadcast).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                </em>
                              )}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                    <p className="text-[11px] text-muted mt-1.5">
                      Sorted by who was messaged longest ago. Anyone who replied STOP is locked out and can never be ticked.
                    </p>
                  </>
                )}
              </>
            ) : mode === 'segment' ? (
              <>
                <div className="space-y-1.5">
                  {opts.segments.map((s) => (
                    <label key={s.key} className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer text-sm ${segment === s.key ? 'border-brand bg-brand/5' : 'border-line'}`}>
                      <input type="radio" name="seg" checked={segment === s.key} onChange={() => { setSegment(s.key); setPreview(null); }} />
                      <span className="flex-1">{s.label}</span>
                      <span className="font-bold text-brand">{s.count}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2 text-sm">
                  <span>Skip anyone messaged in the last</span>
                  <input type="number" min="0" max="90" className="input w-20 text-center" value={cooldown}
                         onChange={(e) => { setCooldown(e.target.value); setPreview(null); }} />
                  <span>days</span>
                </div>
              </>
            ) : (
              <>
                <textarea rows={4} className="input font-mono text-sm"
                          placeholder={'Enter mobile numbers — one per line or comma-separated\n9886122415\n8618592876'}
                          value={mobiles}
                          onChange={(e) => { setMobiles(e.target.value); setPreview(null); }} />
                <p className="text-[11px] text-muted mt-1.5">
                  10-digit numbers. Known parents get their first name; unknown numbers get a generic greeting.
                  Anyone who replied STOP is always skipped.
                </p>
              </>
            )}
          </div>

          <button className="btn-sec w-full" disabled={!canPreview || busy} onClick={doPreview}>
            {busy === 'preview' ? 'Checking…' : 'Preview recipients'}
          </button>
        </div>

        {/* Result / send */}
        <div className="card p-5">
          <h2 className="font-bold text-brand mb-3">Before you send</h2>
          {!preview && !result && (
            <p className="text-sm text-muted">Choose recipients and tap <b>Preview recipients</b> to see who's in and who's skipped.</p>
          )}

          {preview && (
            <div className="space-y-3">
              <Row label={preview.direct ? 'Numbers entered' : 'In segment'} value={preview.total} />
              {!preview.direct && <Row label="Skipped — no WhatsApp chat yet" value={preview.no_session} muted />}
              <Row label={preview.direct ? 'Skipped — replied STOP' : `Skipped — messaged in last ${cooldown} days`} value={preview.skipped_cooldown} muted />
              <div className="border-t border-line pt-3">
                <Row label="Will receive it" value={preview.recipients} big />
              </div>

              {preview.list && preview.list.length > 0 && (
                <div className="border-t border-line pt-3">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-muted mb-2">
                    Recipients{preview.recipients > preview.list.length ? ` (showing first ${preview.list.length} of ${preview.recipients})` : ''}
                  </div>
                  <div className="max-h-64 overflow-y-auto rounded-lg border border-line divide-y divide-line/60">
                    {preview.list.map((r, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-1.5 text-sm">
                        <span className="font-medium truncate mr-2">{r.name || '—'}</span>
                        <span className="text-muted font-mono text-xs whitespace-nowrap">{r.mobile}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button className="btn-pri w-full mt-2" disabled={!canSend || busy} onClick={doSend}>
                {busy === 'send' ? 'Sending…' : `📣 Send to ${preview.recipients} parent(s)`}
              </button>
              {!template && <p className="text-[11px] text-red-600 mt-1">Pick a template above to enable Send.</p>}
              <p className="text-[11px] text-muted">Parents who replied STOP are always excluded. Sends are paced to stay under Meta's rate limit.</p>
            </div>
          )}

          {result && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm">
              ✅ Broadcast complete — <b>{result.sent}</b> sent{result.failed ? `, ${result.failed} failed` : ''}.
              {result.note && <span className="text-muted"> {result.note}</span>}
            </div>
          )}
        </div>
      </div>

      <div className="card p-4 mt-4 text-xs text-muted">
        <b className="text-ink">Tip:</b> keep marketing occasional and targeted — a win-back to lapsed parents, a referral nudge to happy payers, an exam-season push. Frequent blasts hurt your quality rating and get muted.
      </div>
    </Page>
  );
}

/** A WhatsApp-style preview of the COMPLETE template — header, body, footer and
 *  buttons — with {{1}} filled by an example name and *bold* rendered. */
function TemplatePreview({ t, name, params = [] }) {
  const fill = (s) => {
    let out = (s || '').replace(/\{\{\s*1\s*\}\}/g, name);
    params.forEach((val, i) => {
      out = out.replace(new RegExp(`\\{\\{\\s*${i + 2}\\s*\\}\\}`, 'g'), val || `{{${i + 2}}}`);
    });
    return out;
  };
  const header = fill(t.header_text).trim();
  const body = fill(t.body_text).trim();
  const footer = (t.footer_text || '').trim();
  const buttons = Array.isArray(t.buttons) ? t.buttons
    : (() => { try { return JSON.parse(t.buttons || '[]'); } catch { return []; } })();

  // WhatsApp *bold* + line breaks, rendered safely (no HTML injection).
  const rich = (text) => text.split('\n').map((ln, i) => (
    <p key={i} className={ln === '' ? 'h-2' : ''}>
      {ln.split(/(\*[^*]+\*)/g).map((part, j) =>
        /^\*[^*]+\*$/.test(part) ? <b key={j}>{part.slice(1, -1)}</b> : <span key={j}>{part}</span>)}
    </p>
  ));

  return (
    <div className="mt-3">
      <div className="text-[11px] font-bold uppercase tracking-wide text-muted mb-1.5">
        Full preview <span className="font-normal normal-case">(example name “{name}”)</span>
      </div>
      {body ? (
        <div className="rounded-xl rounded-tl-sm bg-[#dcf8c6] text-ink px-3 py-2.5 text-sm leading-relaxed max-w-md shadow-sm">
          {header && <div className="font-bold text-ink mb-1.5">{rich(header)}</div>}
          {rich(body)}
          {footer && <div className="text-[12px] text-slate-500 mt-1.5">{footer}</div>}
          {buttons.length > 0 && (
            <div className="mt-2 pt-2 border-t border-black/10 space-y-1">
              {buttons.map((b, i) => (
                <div key={i} className="text-center text-[#00a5f4] font-semibold text-[13px]">
                  {b.text || b.title}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="text-[12px] text-muted italic">
          Template body not stored yet. Run <code>node scripts/set_template_bodies.js</code> on the server to load the full preview.
        </p>
      )}
    </div>
  );
}

function Row({ label, value, muted, big }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm ${muted ? 'text-muted' : 'text-ink'}`}>{label}</span>
      <span className={`font-bold ${big ? 'text-2xl text-brand' : muted ? 'text-muted' : 'text-ink'}`}>{value}</span>
    </div>
  );
}
