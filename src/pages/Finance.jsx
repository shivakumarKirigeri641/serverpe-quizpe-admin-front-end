/**
 * Finance & GST.
 *
 * Two things in one place: the invoice ledger, and a GSTR-1 summary per filing
 * period that can be exported as CSV to sit beside your return. Figures come
 * from the gstr1_filing rows written when each invoice was issued — never
 * recomputed here, so what you file always matches what the customer received.
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import { Page, Loading, ErrorBox, Stat, inr } from '../components/ui.jsx';

export default function Finance() {
  const [invoices, setInvoices] = useState(null);
  const [gst, setGst] = useState(null);
  const [period, setPeriod] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    setError('');
    Promise.all([api.invoices(200), api.gstr1(period || undefined)])
      .then(([i, g]) => { setInvoices(i.rows); setGst(g); if (!period) setPeriod(g.period); })
      .catch((e) => setError(e.message));
  };
  useEffect(load, [period]);

  /** CSV of the filing period — opens straight in Excel for your return. */
  const exportCsv = () => {
    if (!gst?.rows?.length) return;
    const cols = Object.keys(gst.rows[0]);
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [cols.join(','), ...gst.rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `GSTR1-${gst.period}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (error) return <ErrorBox error={error} onRetry={load} />;
  if (!invoices || !gst) return <Loading label="Loading finance…" />;

  const t = gst.totals || {};
  const invHead = ['Invoice', 'Date', 'Parent', 'State', 'Plan', 'Taxable', 'CGST', 'SGST', 'IGST', 'Total'];

  return (
    <Page
      title="Finance & GST"
      subtitle="Invoice ledger and GSTR-1 ready figures"
      actions={
        <div className="flex gap-2 items-center">
          <select className="input max-w-[10rem]" value={period} onChange={(e) => setPeriod(e.target.value)}>
            {(gst.periods?.length ? gst.periods : [gst.period]).map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <button className="btn-pri" onClick={exportCsv} disabled={!gst.rows.length}>
            ⬇ Export CSV
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-5">
        <Stat index={0} label="Invoices" value={t.invoices || 0} sub={gst.period} />
        <Stat index={1} label="Taxable value" value={inr(t.taxable)} />
        <Stat index={2} label="CGST" value={inr(t.cgst)} />
        <Stat index={3} label="SGST" value={inr(t.sgst)} />
        <Stat index={4} label="IGST" value={inr(t.igst)} sub="inter-state" />
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-5 mb-5">
        <h2 className="font-bold text-brand mb-1">GSTR-1 summary — {gst.period}</h2>
        <p className="text-xs text-muted mb-4">
          B2CS: every QuizPe invoice is under ₹2.5 lakh, so all supplies are consumer sales.
          Export the CSV and attach it to your return.
        </p>
        <div className="text-3xl font-extrabold text-brand">{inr(t.total)}</div>
        <p className="text-sm text-muted">total invoiced this period</p>
      </motion.div>

      <div className="card overflow-hidden">
        <h2 className="font-bold text-brand p-5 pb-3">Invoice ledger</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead><tr>{invHead.map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.id}>
                  <td className="td font-mono text-xs">{i.invoice_id}</td>
                  <td className="td whitespace-nowrap text-xs">
                    {new Date(i.created_at).toLocaleDateString('en-IN')}
                  </td>
                  <td className="td">
                    {i.parent_name}
                    <div className="text-xs text-muted">{i.parent_mobile_number}</div>
                  </td>
                  <td className="td">{i.state_code || '—'}</td>
                  <td className="td text-xs">{i.plan_name}</td>
                  <td className="td">{inr(i.amount_base)}</td>
                  <td className="td">{inr(i.cgst)}</td>
                  <td className="td">{inr(i.sgst)}</td>
                  <td className="td">{inr(i.igst)}</td>
                  <td className="td font-bold">{inr(i.total)}</td>
                </tr>
              ))}
              {!invoices.length && (
                <tr><td className="td text-center text-muted" colSpan={invHead.length}>
                  No invoices yet — no paid subscriptions so far.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Page>
  );
}
