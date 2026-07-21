/** Generated report PDFs, downloadable straight from the panel. */

import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { api, download } from '../lib/api';
import { Page, Loading, ErrorBox, Pill, Row } from '../components/ui.jsx';
import ReportPreview from '../components/ReportPreview.jsx';

export default function Reports() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);
  const [preview, setPreview] = useState(null);

  const load = () => {
    setError('');
    api.reports(100).then((d) => setRows(d.rows)).catch((e) => setError(e.message));
  };
  useEffect(load, []);

  const get = async (r) => {
    setBusy(r.id);
    try {
      await download(api.reportDownloadUrl(r.id), r.file_name);
    } catch (e) {
      // the row can outlive the file — say so plainly rather than failing silently
      setError(`${r.file_name}: ${e.message}`);
    } finally {
      setBusy(null);
    }
  };

  if (error && !rows) return <ErrorBox error={error} onRetry={load} />;
  if (!rows) return <Loading label="Loading reports…" />;

  const head = ['Date', 'Type', 'Student', 'Parent', 'Score', 'Grade', 'Downloads', ''];

  return (
    <Page title="Reports" subtitle={`${rows.length} generated PDF${rows.length === 1 ? '' : 's'}`}>
      {error && <div className="card p-3 mb-3 text-sm text-red-700 bg-red-50 border-red-200">{error}</div>}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead><tr>{head.map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <Row key={r.id} index={i}>
                  <td className="td whitespace-nowrap">{r.quiz_date}</td>
                  <td className="td"><Pill tone="blue">{r.report_type}</Pill></td>
                  <td className="td font-semibold">{r.student_name}</td>
                  <td className="td text-xs">
                    {r.parent_name}
                    <div className="text-muted">{r.parent_mobile_number}</div>
                  </td>
                  <td className="td">{r.score_correct}/{r.score_total} ({r.score_pct}%)</td>
                  <td className="td font-bold">{r.grade}</td>
                  <td className="td text-muted">{r.download_count || 0}</td>
                  <td className="td whitespace-nowrap">
                    <button className="btn-pri text-xs py-1.5 mr-1" onClick={() => setPreview(r)}>
                      👁 Preview
                    </button>
                    <button className="btn-sec text-xs py-1.5" disabled={busy === r.id} onClick={() => get(r)}>
                      {busy === r.id ? '…' : '⬇'}
                    </button>
                  </td>
                </Row>
              ))}
              {!rows.length && (
                <tr><td className="td text-center text-muted" colSpan={head.length}>
                  No reports generated yet.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {preview && <ReportPreview report={preview} onClose={() => setPreview(null)} />}
      </AnimatePresence>
    </Page>
  );
}
