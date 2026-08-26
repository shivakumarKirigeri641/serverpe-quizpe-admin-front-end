/**
 * View + Download buttons for one invoice PDF.
 *
 * Both need the admin Bearer token, so neither can be a plain <a href> — the
 * shared helpers fetch the bytes and hand the browser a blob. Kept as one
 * component so the invoice ledger, a parent's page and the Quick Quiz page all
 * behave identically instead of drifting apart.
 */

import { useState } from 'react';
import { api, download, viewPdf } from '../lib/api';

export default function InvoiceActions({ id, invoiceId, compact = false }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const save = async () => {
    setBusy(true); setErr('');
    try {
      await download(api.invoiceDownloadUrl(id), `QuizPe-Invoice-${invoiceId}.pdf`);
    } catch {
      // The PDF is generated once and kept on disk; if it has been cleared the
      // download 410s. Say so rather than failing silently on a click.
      setErr('Not available');
    } finally { setBusy(false); }
  };

  return (
    <span className="whitespace-nowrap">
      <button onClick={() => viewPdf(api.invoiceViewUrl(id))}
              className="text-brand-accent hover:underline text-xs font-semibold mr-3">
        View
      </button>
      <button onClick={save} disabled={busy}
              className="text-brand hover:underline text-xs font-semibold disabled:opacity-50">
        {busy ? '…' : '⬇ Download'}
      </button>
      {err && <span className="text-xs text-red-600 ml-2">{err}</span>}
      {!compact && null}
    </span>
  );
}
