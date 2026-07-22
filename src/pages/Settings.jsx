/**
 * Editable reference data + system status.
 *
 * Only tables an admin genuinely maintains are editable — plans, add-ons,
 * offers, benefits, policies, business details. Parents, students and
 * question_bank are deliberately NOT here: editing a live student's grade or a
 * question's answer by hand would desync running quizzes and the adaptive
 * engine, and there would be no audit trail.
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import { Page, Loading, ErrorBox, Pill } from '../components/ui.jsx';
import ConfirmSave from '../components/ConfirmSave.jsx';
import PaymentMode from '../components/PaymentMode.jsx';
import AdminUsers from '../components/AdminUsers.jsx';

const TABLES = [
  { name: 'quizpe_plans', label: 'Plans' },
  { name: 'quizpe_addons', label: 'Add-ons' },
  { name: 'quizpe_offers', label: 'Offers' },
  { name: 'quizpe_benefits', label: 'Benefits' },
  { name: 'policies', label: 'Policies' },
  { name: 'business_details', label: 'Business details' },
];

export default function Settings() {
  const [tab, setTab] = useState(TABLES[0].name);
  const [data, setData] = useState(null);
  const [system, setSystem] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(null);
  const [edits, setEdits] = useState({});
  const [pending, setPending] = useState(null);   // row awaiting confirmation
  const [toast, setToast] = useState('');
  const [isSuper, setIsSuper] = useState(false);

  useEffect(() => { api.me().then((m) => setIsSuper(!!m.super)).catch(() => {}); }, []);

  const load = () => {
    setError(''); setEdits({});
    Promise.all([api.table(tab), api.system()])
      .then(([t, s]) => { setData(t); setSystem(s); })
      .catch((e) => setError(e.message));
  };
  useEffect(load, [tab]);

  /** Step 1 — build the diff and ask. Nothing is written yet. */
  const askToSave = (row) => {
    const patch = edits[row.id];
    if (!patch) return;
    // Only fields that genuinely differ; an inline input that was focused and
    // left unchanged should not appear in the dialog as a change.
    const changes = {};
    Object.entries(patch).forEach(([k, to]) => {
      const from = row[k];
      if (String(from ?? '') !== String(to ?? '')) changes[k] = { from, to };
    });
    if (!Object.keys(changes).length) {
      setEdits((e) => { const n = { ...e }; delete n[row.id]; return n; });
      return;
    }
    setPending({ row, patch, changes });
  };

  /** Step 2 — the admin confirmed; write it. */
  const confirmSave = async () => {
    const { row, patch } = pending;
    setSaving(row.id);
    try {
      const r = await api.updateRow(tab, row.id, patch);
      setData((d) => ({ ...d, rows: d.rows.map((x) => (x.id === row.id ? r.row : x)) }));
      setEdits((e) => { const n = { ...e }; delete n[row.id]; return n; });
      setPending(null);
      setToast(`${TABLES.find((t) => t.name === tab)?.label || 'Row'} updated.`);
      setTimeout(() => setToast(''), 3500);
    } catch (e) { setError(e.message); setPending(null); }
    finally { setSaving(null); }
  };

  const edit = (id, col, value) =>
    setEdits((e) => ({ ...e, [id]: { ...(e[id] || {}), [col]: value } }));

  if (error && !data) return <ErrorBox error={error} onRetry={load} />;
  if (!data) return <Loading label="Loading settings…" />;

  return (
    <Page title="Settings" subtitle="Reference data and system status">
      {isSuper && (
        <div className="grid gap-5 mb-5 lg:grid-cols-2">
          <PaymentMode />
          <AdminUsers />
        </div>
      )}
      {system && (
        <div className="grid sm:grid-cols-4 gap-4 mb-5">
          <div className="card p-4">
            <div className="text-[11px] uppercase font-bold text-muted">Database</div>
            <div className="text-xl font-bold text-brand mt-1">{system.database}</div>
          </div>
          <div className="card p-4">
            <div className="text-[11px] uppercase font-bold text-muted">Job queue</div>
            <div className="text-xl font-bold text-brand mt-1">
              {(system.jobs.pending || 0) + (system.jobs.running || 0)} in flight
            </div>
            {system.jobs.failed > 0 && <Pill tone="red">{system.jobs.failed} failed</Pill>}
          </div>
          <div className="card p-4">
            <div className="text-[11px] uppercase font-bold text-muted">Sent today</div>
            <div className="text-xl font-bold text-brand mt-1">{system.today.sent}</div>
            {system.today.failed > 0 && <Pill tone="red">{system.today.failed} failed</Pill>}
          </div>
          <div className="card p-4">
            <div className="text-[11px] uppercase font-bold text-muted">Templates</div>
            <div className="mt-1 space-y-0.5">
              {system.templates.map((t) => (
                <div key={t.template_name} className="flex items-center gap-1.5 text-[11px]">
                  <Pill tone={t.approval_status === 'APPROVED' ? 'green' : 'amber'}>
                    {t.approval_status}
                  </Pill>
                  <span className="truncate">{t.template_name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-1 mb-4 flex-wrap">
        {TABLES.map((t) => (
          <button key={t.name} onClick={() => setTab(t.name)}
                  className={`btn text-xs px-3 py-2 ${tab === t.name ? 'bg-brand text-white' : 'bg-white border border-line'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {error && <div className="card p-3 mb-3 text-sm text-red-700 bg-red-50 border-red-200">{error}</div>}

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="th">id</th>
                {data.columns.map((c) => <th key={c} className="th">{c}</th>)}
                <th className="th"></th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => {
                const dirty = !!edits[row.id];
                return (
                  <tr key={row.id} className={dirty ? 'bg-amber-50/60' : ''}>
                    <td className="td text-muted">{row.id}</td>
                    {data.columns.map((c) => {
                      const val = edits[row.id]?.[c] ?? row[c];
                      const isBool = typeof row[c] === 'boolean';
                      return (
                        <td key={c} className="td">
                          {isBool ? (
                            <input type="checkbox" checked={!!val}
                                   onChange={(e) => edit(row.id, c, e.target.checked)} />
                          ) : (
                            <input className="input text-xs py-1.5 min-w-[7rem]"
                                   value={val ?? ''} onChange={(e) => edit(row.id, c, e.target.value)} />
                          )}
                        </td>
                      );
                    })}
                    <td className="td">
                      <button className="btn-pri text-xs py-1.5" disabled={!dirty || saving === row.id}
                              onClick={() => askToSave(row)}>
                        {saving === row.id ? 'Saving…' : 'Save'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>

      <p className="text-xs text-muted mt-4">
        Parents, students and the question bank are intentionally read-only here — editing them
        by hand would desync live quizzes and the adaptive engine.
      </p>
      <ConfirmSave
        open={!!pending}
        tableLabel={TABLES.find((t) => t.name === tab)?.label || tab}
        rowLabel={pending
          ? (pending.row.plan_name || pending.row.addon_name || pending.row.offer_name
             || pending.row.title || pending.row.company_name || `Row #${pending.row.id}`)
          : ''}
        changes={pending?.changes}
        busy={saving === pending?.row?.id}
        onConfirm={confirmSave}
        onCancel={() => setPending(null)}
      />

      {/* Confirmation that the write landed — without it, a successful save is
          indistinguishable from a click that did nothing. */}
      {toast && (
        <div role="status"
             className="fixed bottom-6 right-6 z-50 rounded-xl bg-brand text-white px-4 py-3
                        text-sm font-semibold shadow-lg">
          ✅ {toast}
        </div>
      )}
    </Page>
  );
}
