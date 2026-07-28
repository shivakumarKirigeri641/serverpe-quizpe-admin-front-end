/**
 * Global toast/snackbar.
 *
 * Rendered once, near the app root. It registers itself with the API layer, so
 * EVERY write (PATCH/POST/PUT/DELETE) automatically shows a success or error
 * toast — no page needs to wire it up. Components can also raise one manually
 * via `toast(message, type)`.
 */
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { setToastHandler } from '../lib/api';

let counter = 0;
let external = null;                 // lets non-React code raise a toast too

/** Raise a toast from anywhere: toast('Saved'), toast('Oops', 'error'). */
export function toast(message, type = 'success') { external?.({ message, type }); }

export default function Toaster() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const add = ({ message, type = 'success', duration = 3500 }) => {
      const id = ++counter;
      setItems((cur) => [...cur, { id, message, type }]);
      setTimeout(() => setItems((cur) => cur.filter((x) => x.id !== id)), duration);
    };
    setToastHandler(add);            // API-layer auto-toasts
    external = add;                  // manual toast() calls
    return () => { external = null; };
  }, []);

  const tone = {
    success: 'bg-emerald-600',
    error: 'bg-red-600',
    info: 'bg-brand',
  };
  const icon = { success: '✅', error: '⚠️', info: 'ℹ️' };

  return (
    <div className="fixed z-[200] bottom-5 right-5 flex flex-col gap-2 w-[min(92vw,22rem)] pointer-events-none">
      <AnimatePresence>
        {items.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 24, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.22, 0.9, 0.28, 1] }}
            className={`pointer-events-auto rounded-xl px-4 py-3 shadow-lift text-white text-sm
                        font-semibold flex items-start gap-2.5 ${tone[t.type] || tone.success}`}
          >
            <span className="leading-none mt-px">{icon[t.type] || icon.success}</span>
            <span className="leading-snug">{t.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
