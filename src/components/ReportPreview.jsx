/**
 * Preview a report PDF before downloading it.
 *
 * The API needs a bearer token and an <iframe src> cannot send headers, so the
 * bytes are fetched and handed to the iframe as a blob URL. The URL is revoked
 * when the preview closes — leaking blob URLs keeps whole PDFs in memory.
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getToken, download, api } from '../lib/api';

export default function ReportPreview({ report, onClose }) {
  const [url, setUrl] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let revoked = false;
    let objectUrl = null;

    fetch(`/admin/api/reports/${report.id}/view`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(async (r) => {
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          throw new Error(d.error || 'Could not open the report.');
        }
        return r.blob();
      })
      .then((blob) => {
        if (revoked) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch((e) => setError(e.message));

    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [report.id]);

  const save = async () => {
    setBusy(true);
    try { await download(api.reportDownloadUrl(report.id), report.file_name); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-50 p-4 flex items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.97, y: 12 }} animate={{ scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="card w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden"
      >
        <div className="flex items-center gap-3 p-4 border-b border-line">
          <div className="min-w-0">
            <h3 className="font-bold text-brand truncate">
              {report.student_name} — {report.quiz_date}
            </h3>
            <p className="text-xs text-muted">
              {report.score_correct}/{report.score_total} ({report.score_pct}%) · Grade {report.grade}
              {' · '}{report.file_name}
            </p>
          </div>
          <div className="ml-auto flex gap-2">
            <button className="btn-pri" onClick={save} disabled={busy || !url}>
              {busy ? 'Saving…' : '⬇ Download'}
            </button>
            <button className="btn-sec" onClick={onClose}>Close</button>
          </div>
        </div>

        <div className="flex-1 bg-line/30 grid place-items-center overflow-hidden">
          {error ? (
            <p className="text-sm text-red-600 p-6 text-center">{error}</p>
          ) : !url ? (
            <div className="text-sm text-muted flex flex-col items-center gap-3">
              <div className="w-6 h-6 rounded-full border-2 border-line border-t-brand-accent animate-spin" />
              Loading preview…
            </div>
          ) : (
            <iframe title="report" src={url} className="w-full h-full border-0" />
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
