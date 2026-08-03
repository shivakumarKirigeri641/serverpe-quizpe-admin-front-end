/** WhatsApp template registry.
 *
 *  This is the LOCAL registry the senders read — it does not create templates in
 *  Meta. You author + submit each template in the WhatsApp Manager; here you add
 *  a matching row, then flip it to APPROVED once Meta clears it. Every gated
 *  sender (welcome, expiry, support-resolution, thank-you, day-missed recap,
 *  broadcaster) uses APPROVED + active rows automatically on its next run. */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import { Page, Loading, ErrorBox, Empty, Pill } from '../components/ui.jsx';

const STATUS_TONE = { APPROVED: 'green', PENDING: 'amber', REJECTED: 'red' };
const CAT_TONE = { UTILITY: 'blue', MARKETING: 'amber', AUTHENTICATION: 'grey' };

const blank = {
  template_name: '', category: 'UTILITY', language: 'en', approval_status: 'PENDING',
  header_text: '', body_text: '', footer_text: '', send_context: '',
  variablesText: '', buttonsText: '', is_active: true,
};

// buttons are stored as [{type:'QUICK_REPLY', text}] — the form edits titles only
const buttonsToText = (b) => (Array.isArray(b) ? b.map((x) => x.text || x.title || '').filter(Boolean).join(', ') : '');
const textToButtons = (t) => String(t || '').split(',').map((s) => s.trim()).filter(Boolean)
  .map((text) => ({ type: 'QUICK_REPLY', text }));
const varsToText = (v) => (Array.isArray(v) ? v.join(', ') : '');
const textToVars = (t) => String(t || '').split(',').map((s) => s.trim()).filter(Boolean);

export default function Templates() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);   // null | {..form..} (new or edit; edit carries id)
  const [saving, setSaving] = useState(false);

  const load = () => {
    setError('');
    api.templates().then((d) => setRows(d.rows)).catch((e) => setError(e.message));
  };
  useEffect(load, []);

  const startNew = () => setEditing({ ...blank });
  const startEdit = (r) => setEditing({
    id: r.id, template_name: r.template_name, category: r.category, language: r.language || 'en',
    approval_status: r.approval_status, header_text: r.header_text || '', body_text: r.body_text || '',
    footer_text: r.footer_text || '', send_context: r.send_context || '',
    variablesText: varsToText(r.variables), buttonsText: buttonsToText(r.buttons), is_active: r.is_active,
  });

  const save = async () => {
    const e = editing;
    const body = {
      template_name: e.template_name, category: e.category, language: e.language,
      approval_status: e.approval_status, header_text: e.header_text, body_text: e.body_text,
      footer_text: e.footer_text, send_context: e.send_context,
      variables: textToVars(e.variablesText), buttons: textToButtons(e.buttonsText),
      is_active: e.is_active,
    };
    setSaving(true);
    try {
      if (e.id) await api.updateTemplate(e.id, body);
      else await api.createTemplate(body);
      setEditing(null); load();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  // quick status flip / active toggle from a card (optimistic)
  const patch = async (r, body) => {
    setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, ...body } : x)));
    try { await api.updateTemplate(r.id, body); }
    catch (e) { setError(e.message); load(); }
  };

  const remove = async (r) => {
    if (!window.confirm(`Delete ${r.template_name}? Senders that use it will stop until you re-add it.`)) return;
    try { await api.deleteTemplate(r.id); load(); }
    catch (e) { setError(e.message); }
  };

  if (error && !rows) return <ErrorBox error={error} onRetry={load} />;
  if (!rows) return <Loading label="Loading templates…" />;

  const approved = rows.filter((r) => r.approval_status === 'APPROVED' && r.is_active).length;

  return (
    <Page
      title="WhatsApp templates"
      subtitle={`${approved} approved & active · ${rows.length} total`}
      actions={<button className="btn-sec bg-emerald-600 text-white border-emerald-600" onClick={startNew}>+ New template</button>}
    >
      {error && <div className="card p-3 mb-3 text-sm text-red-700 bg-red-50 border-red-200">{error}</div>}

      <div className="card p-3 mb-4 text-[13px] text-muted bg-sky-50/50 border-sky-200">
        Adding a row here <b>registers it locally</b> — it does not create the template in Meta. Author &amp; submit
        each template in the WhatsApp Manager, add a matching row here, then flip it to <b>APPROVED</b> once Meta
        clears it. The senders pick up approved, active rows automatically.
      </div>

      {editing && (
        <Editor
          form={editing} setForm={setEditing} onSave={save} onCancel={() => setEditing(null)} saving={saving}
        />
      )}

      <div className="space-y-3">
        {rows.map((r, i) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.3) }}
            className={`card p-5 ${!r.is_active ? 'opacity-60' : ''}`}
          >
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="font-mono text-sm font-bold text-brand">{r.template_name}</span>
              <Pill tone={CAT_TONE[r.category] || 'grey'}>{r.category}</Pill>
              <Pill tone={STATUS_TONE[r.approval_status] || 'grey'}>{r.approval_status}</Pill>
              {!r.is_active && <Pill tone="grey">inactive</Pill>}
              {r.send_context && <span className="text-xs text-muted">· {r.send_context}</span>}
              <span className="text-xs text-muted ml-auto">{r.language}</span>
            </div>

            {/* preview */}
            <div className="rounded-xl bg-line/20 p-3 mb-3 text-sm whitespace-pre-wrap">
              {r.header_text && <div className="font-bold mb-1">{r.header_text}</div>}
              <div>{r.body_text}</div>
              {r.footer_text && <div className="text-xs text-muted mt-1">{r.footer_text}</div>}
            </div>

            {Array.isArray(r.variables) && r.variables.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {r.variables.map((v, k) => (
                  <span key={k} className="pill bg-line/60 text-muted font-mono text-[11px]">{`{{${k + 1}}}`} {v}</span>
                ))}
              </div>
            )}
            {Array.isArray(r.buttons) && r.buttons.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {r.buttons.map((b, k) => (
                  <span key={k} className="pill bg-emerald-50 text-emerald-700 text-[11px]">▸ {b.text || b.title}</span>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-1 text-xs mt-2">
              {['APPROVED', 'PENDING', 'REJECTED'].filter((s) => s !== r.approval_status).map((s) => (
                <button key={s} onClick={() => patch(r, { approval_status: s })}
                        className={`btn-sec text-[11px] py-1 px-2.5 ${s === 'APPROVED' ? 'border-emerald-300 text-emerald-700' : s === 'REJECTED' ? 'border-red-300 text-red-700' : ''}`}>
                  Mark {s}
                </button>
              ))}
              <button onClick={() => patch(r, { is_active: !r.is_active })} className="btn-sec text-[11px] py-1 px-2.5">
                {r.is_active ? 'Deactivate' : 'Activate'}
              </button>
              <div className="ml-auto flex gap-1">
                <button onClick={() => startEdit(r)} className="btn-sec text-[11px] py-1 px-2.5">Edit</button>
                <button onClick={() => remove(r)} className="btn-sec text-[11px] py-1 px-2.5 border-red-300 text-red-700">Delete</button>
              </div>
            </div>
          </motion.div>
        ))}
        {!rows.length && <Empty>No templates registered yet. Tap “New template” to add one.</Empty>}
      </div>
    </Page>
  );
}

function Editor({ form, setForm, onSave, onCancel, saving }) {
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const isEdit = !!form.id;
  return (
    <div className="card p-5 mb-4 border-brand-accent/40">
      <h3 className="font-bold text-brand mb-3">{isEdit ? `Edit ${form.template_name}` : 'New template'}</h3>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wide text-muted">Template name</span>
          <input className="input mt-1 font-mono" placeholder="qp_thankyou_v1" value={form.template_name}
                 disabled={isEdit}
                 onChange={(e) => set('template_name', e.target.value.toLowerCase())} />
        </label>
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wide text-muted">Category</span>
          <select className="input mt-1" value={form.category} onChange={(e) => set('category', e.target.value)}>
            <option>UTILITY</option><option>MARKETING</option><option>AUTHENTICATION</option>
          </select>
        </label>
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wide text-muted">Status</span>
          <select className="input mt-1" value={form.approval_status} onChange={(e) => set('approval_status', e.target.value)}>
            <option>PENDING</option><option>APPROVED</option><option>REJECTED</option>
          </select>
        </label>
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wide text-muted">Send context (optional)</span>
          <input className="input mt-1" placeholder="thankyou / day_missed / promo…" value={form.send_context}
                 onChange={(e) => set('send_context', e.target.value)} />
        </label>
      </div>

      <label className="block mt-3">
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted">Header text (optional)</span>
        <input className="input mt-1" value={form.header_text} onChange={(e) => set('header_text', e.target.value)} />
      </label>
      <label className="block mt-3">
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted">Body text</span>
        <textarea className="input min-h-[110px] mt-1" placeholder="Use {{1}}, {{2}}… for variables"
                  value={form.body_text} onChange={(e) => set('body_text', e.target.value)} />
      </label>
      <label className="block mt-3">
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted">Footer text (optional)</span>
        <input className="input mt-1" value={form.footer_text} onChange={(e) => set('footer_text', e.target.value)} />
      </label>

      <div className="grid sm:grid-cols-2 gap-3 mt-3">
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wide text-muted">Variables (comma-separated, in order)</span>
          <input className="input mt-1" placeholder="parent_name, child_name, attempted, enrolled"
                 value={form.variablesText} onChange={(e) => set('variablesText', e.target.value)} />
        </label>
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wide text-muted">Quick-reply buttons (comma-separated)</span>
          <input className="input mt-1" placeholder="Re-open ticket, View plans"
                 value={form.buttonsText} onChange={(e) => set('buttonsText', e.target.value)} />
        </label>
      </div>

      <label className="flex items-center gap-2 mt-3 text-sm">
        <input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} />
        Active (available to senders when APPROVED)
      </label>

      <div className="flex gap-2 mt-4">
        <button className="btn-sec bg-emerald-600 text-white border-emerald-600" onClick={onSave} disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add template'}
        </button>
        <button className="btn-sec" onClick={onCancel} disabled={saving}>Cancel</button>
      </div>
    </div>
  );
}
