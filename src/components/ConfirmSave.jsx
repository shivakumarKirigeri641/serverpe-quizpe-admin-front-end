/**
 * Confirmation before reference data is written.
 *
 * Plans, add-ons and offers are live commercial terms — a mistyped price is
 * what the next parent is charged, and an accidentally deactivated plan
 * disappears from the public pricing page immediately. Inline fields save on a
 * single click, which is far too cheap for that.
 *
 * The dialog shows the actual diff, old value beside new, rather than a generic
 * "are you sure?". A prompt nobody reads is just a slower click; a prompt that
 * shows "₹99 -> ₹9" stops the mistake.
 */

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const show = (v) => {
  if (v === null || v === undefined || v === '') return <em className="text-muted">empty</em>;
  if (typeof v === 'boolean') return v ? 'yes' : 'no';
  return String(v);
};

/** Fields where a wrong value has an immediate outward effect. */
const SENSITIVE = /price|amount|discount|percent|gst|is_active|is_trial|duration|max_students|valid/i;

export default function ConfirmSave({ open, tableLabel, rowLabel, changes, busy, onConfirm, onCancel }) {
  const confirmRef = useRef(null);

  // Escape must always back out; focus starts on Confirm so the keyboard path
  // works, but Cancel is the safer default if anything goes wrong.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onCancel(); };
    window.addEventListener('keydown', onKey);
    confirmRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onCancel]);

  const list = Object.entries(changes || {});
  const risky = list.filter(([k]) => SENSITIVE.test(k));

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onCancel(); }}
        >
          <motion.div
            role="dialog" aria-modal="true" aria-labelledby="confirm-title"
            className="card w-full max-w-lg p-6"
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            <h2 id="confirm-title" className="font-bold text-brand text-lg">
              Save changes to {tableLabel}?
            </h2>
            <p className="text-xs text-muted mt-1">{rowLabel}</p>

            <div className="mt-4 rounded-xl border border-line divide-y divide-line overflow-hidden">
              {list.length === 0 && (
                <p className="p-3 text-sm text-muted">Nothing has changed.</p>
              )}
              {list.map(([field, next]) => (
                <div key={field} className="p-3 text-sm">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-muted">
                    {field.replace(/_/g, ' ')}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="line-through text-muted">{show(next.from)}</span>
                    <span aria-hidden className="text-muted">→</span>
                    <span className="font-bold text-brand">{show(next.to)}</span>
                  </div>
                </div>
              ))}
            </div>

            {risky.length > 0 && (
              <p className="mt-4 text-[11px] leading-relaxed text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                <b>This is live.</b> {risky.map(([k]) => k.replace(/_/g, ' ')).join(', ')}
                {risky.length === 1 ? ' affects' : ' affect'} what parents are shown and charged
                from the moment you save. Existing subscriptions keep the terms they signed up on.
              </p>
            )}

            <div className="flex justify-end gap-2 mt-6">
              <button type="button" className="btn-ghost !py-2 !text-sm" disabled={busy} onClick={onCancel}>
                Cancel
              </button>
              <button ref={confirmRef} type="button" className="btn-pri !py-2 !text-sm"
                      disabled={busy || list.length === 0} onClick={onConfirm}>
                {busy ? 'Saving…' : 'Yes, save'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
