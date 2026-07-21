/**
 * Edit a parent's details, including a guarded mobile-number change.
 *
 * The number is the account identity — WhatsApp sessions, message history,
 * consents, OTPs and every pending link key off it — so changing it re-links
 * all of those in one transaction rather than editing a single column. The
 * panel shows exactly how many rows will move before you commit.
 *
 * The WhatsApp display name cannot be fetched: Meta only sends it on an
 * inbound message. It is captured automatically the next time that number
 * writes in, and the form says so rather than pretending otherwise.
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
  const [mob, setMob] = useState(false);
  const [mobInfo, setMobInfo] = useState(null);
  const [newMob, setNewMob] = useState('');
  const [confMob, setConfMob] = useState('');
  const [mobErr, setMobErr] = useState('');

  const loadMobPreview = () =>
    api.mobilePreview(parent.id).then(setMobInfo).catch((e) => setMobErr(e.message));

  const doMobile = async () => {
    setBusy(true); setMobErr('');
    try {
      await api.changeMobile(parent.id, newMob, confMob);
      setMob(false); setNewMob(''); setConfMob('');
      setOpen(false);
      onSaved();
    } catch (e) { setMobErr(e.message); }
    finally { setBusy(false); }
  };

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
              <div className="flex gap-2 mb-1">
                <input className="input bg-line/30" value={parent.parent_mobile_number} readOnly />
                <button type="button" className="btn-sec shrink-0"
                        onClick={() => { setMob(!mob); if (!mob) loadMobPreview(); }}>
                  {mob ? 'Cancel' : 'Change'}
                </button>
              </div>

              {mob && (
                <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-3 mb-3">
                  <p className="text-[11px] text-amber-900 font-semibold mb-2">
                    Changing the number moves this parent's whole history onto it.
                  </p>
                  {mobInfo && (
                    <ul className="text-[11px] text-amber-900 mb-2 space-y-0.5">
                      {Object.entries(mobInfo.counts || {}).map(([t, n]) => (
                        <li key={t}>• {n} row(s) in {t.replace(/_/g, ' ')}</li>
                      ))}
                      {!Object.keys(mobInfo.counts || {}).length && <li>• nothing linked yet</li>}
                      {mobInfo.frozen?.gstr1_filing > 0 && (
                        <li className="font-bold mt-1">
                          • {mobInfo.frozen.gstr1_filing} GST record(s) keep the OLD number — a filed
                          return must not be rewritten
                        </li>
                      )}
                    </ul>
                  )}
                  <input className="input mb-2" inputMode="numeric" maxLength={10}
                         placeholder="New 10-digit number" value={newMob}
                         onChange={(e) => setNewMob(e.target.value.replace(/\D/g, ''))} />
                  <input className="input mb-2" inputMode="numeric" maxLength={10}
                         placeholder="Type it again to confirm" value={confMob}
                         onChange={(e) => setConfMob(e.target.value.replace(/\D/g, ''))} />
                  {mobErr && <p className="text-[11px] text-red-700 font-semibold mb-2">{mobErr}</p>}
                  <button type="button" className="btn-pri w-full text-xs py-2"
                          disabled={newMob.length !== 10 || newMob !== confMob || busy}
                          onClick={doMobile}>
                    Move account to {newMob || '…'}
                  </button>
                  <p className="text-[11px] text-amber-800 mt-2">
                    The WhatsApp name can't be looked up — Meta only sends it when the person
                    messages. It will fill in automatically the next time this number writes in.
                  </p>
                </div>
              )}

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
