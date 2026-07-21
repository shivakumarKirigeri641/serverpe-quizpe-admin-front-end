/**
 * Edit a parent's own details.
 *
 * The mobile number is intentionally not editable: it is the account identity
 * across WhatsApp sessions, consents, notification logs and invoices. Changing
 * it would orphan all of that. If a parent genuinely changes number, they
 * should sign up again — which also captures fresh consent.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';

export default function EditParent({ parent, onSaved }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    parent_name: parent.parent_name || '',
    state_code: parent.state_code || '',
    reminders_enabled: !!parent.reminders_enabled,
    is_active: !!parent.is_active,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setBusy(true); setError('');
    try {
      await api.updateParent(parent.id, f);
      setOpen(false);
      onSaved();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  return (
    <>
      <button className="btn-sec" onClick={() => setOpen(true)}>✎ Edit</button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 grid place-items-center z-50 p-4"
            onClick={() => !busy && setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.96, y: 10 }} animate={{ scale: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="card p-6 w-full max-w-md"
            >
              <h3 className="font-bold text-brand text-lg mb-4">Edit parent</h3>

              <label className="block text-[11px] font-bold text-muted mb-1">Name</label>
              <input className="input mb-3" value={f.parent_name}
                     onChange={(e) => setF({ ...f, parent_name: e.target.value })} />

              <label className="block text-[11px] font-bold text-muted mb-1">Mobile</label>
              <input className="input mb-1 bg-line/30" value={parent.parent_mobile_number} readOnly />
              <p className="text-[11px] text-muted mb-3">
                Not editable — it identifies the account across WhatsApp, consents and invoices.
              </p>

              <label className="block text-[11px] font-bold text-muted mb-1">State code</label>
              <input className="input mb-4" value={f.state_code} maxLength={2}
                     onChange={(e) => setF({ ...f, state_code: e.target.value.toUpperCase() })} />

              <label className="flex items-center gap-2 text-sm mb-2">
                <input type="checkbox" checked={f.reminders_enabled}
                       onChange={(e) => setF({ ...f, reminders_enabled: e.target.checked })} />
                Daily reminders enabled
              </label>
              <label className="flex items-center gap-2 text-sm mb-4">
                <input type="checkbox" checked={f.is_active}
                       onChange={(e) => setF({ ...f, is_active: e.target.checked })} />
                Account active
              </label>

              {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

              <div className="flex gap-2">
                <button className="btn-pri flex-1" disabled={busy} onClick={save}>
                  {busy ? 'Saving…' : 'Save changes'}
                </button>
                <button className="btn-sec" disabled={busy} onClick={() => setOpen(false)}>Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
