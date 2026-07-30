/**
 * CommandPalette — press Ctrl/Cmd-K anywhere to jump to a page or a parent.
 *
 * Static page targets are filtered instantly; parents/students are searched
 * live (by name or number) via the same endpoint the Parents page uses.
 * Arrow keys move, Enter opens, Esc closes.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';

const PAGES = [
  ['📊 Dashboard', '/'], ['🟢 Tonight (live)', '/tonight'], ['📡 Live activity', '/live'],
  ['📈 Analytics', '/analytics'], ['🌐 Visitors', '/visitors'], ['👨‍👩‍👧 Parents & students', '/parents'],
  ['💬 Conversations', '/whatsapp'], ['❓ Question bank', '/questions'], ['📄 Reports', '/reports'],
  ['₹ Finance & GST', '/finance'], ['📥 Inbox', '/inbox'], ['💬 Support', '/support'],
  ['⚙️ Settings', '/settings'],
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [parents, setParents] = useState([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // global hotkey
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // reset + focus on open
  useEffect(() => {
    if (open) { setQ(''); setParents([]); setActive(0); setTimeout(() => inputRef.current?.focus(), 30); }
  }, [open]);

  // live parent search (debounced)
  useEffect(() => {
    if (!open || q.trim().length < 2) { setParents([]); return; }
    const t = setTimeout(() => {
      api.parents({ q: q.trim(), limit: 6 })
        .then((d) => setParents(d.rows || []))
        .catch(() => setParents([]));
    }, 200);
    return () => clearTimeout(t);
  }, [q, open]);

  const ql = q.trim().toLowerCase();
  const pageItems = PAGES
    .filter(([label]) => !ql || label.toLowerCase().includes(ql))
    .map(([label, to]) => ({ kind: 'page', label, to }));
  const parentItems = parents.map((p) => ({
    kind: 'parent',
    label: p.parent_name || p.parent_mobile_number,
    sub: p.parent_mobile_number + (p.students_count ? ` · ${p.students_count} child${p.students_count === 1 ? '' : 'ren'}` : ''),
    to: `/parents/${p.id}`,
  }));
  const items = [...pageItems, ...parentItems];
  const clamped = Math.min(active, Math.max(0, items.length - 1));

  const go = (item) => { if (!item) return; setOpen(false); navigate(item.to); };

  const onInputKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); go(items[clamped]); }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[60] flex items-start justify-center pt-[12vh] px-4 bg-black/40"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={() => setOpen(false)}>
          <motion.div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
            initial={{ opacity: 0, y: -12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 px-4 border-b border-line">
              <span className="text-muted">🔍</span>
              <input ref={inputRef} value={q}
                onChange={(e) => { setQ(e.target.value); setActive(0); }}
                onKeyDown={onInputKey}
                placeholder="Jump to a page, parent or number…"
                className="flex-1 py-3.5 text-sm outline-none bg-transparent" />
              <kbd className="text-[10px] text-muted border border-line rounded px-1.5 py-0.5">Esc</kbd>
            </div>
            <ul className="max-h-[52vh] overflow-y-auto py-2">
              {items.length === 0 && (
                <li className="px-4 py-6 text-center text-sm text-muted">No matches.</li>
              )}
              {items.map((it, i) => (
                <li key={`${it.kind}-${it.to}`}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(it)}
                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer text-sm ${
                      i === clamped ? 'bg-brand-accent/10' : ''}`}>
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-semibold text-ink">{it.label}</span>
                    {it.sub && <span className="text-muted text-xs ml-2">{it.sub}</span>}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-muted shrink-0">
                    {it.kind === 'parent' ? 'Parent' : 'Page'}
                  </span>
                </li>
              ))}
            </ul>
            <div className="px-4 py-2 border-t border-line text-[11px] text-muted flex items-center gap-3">
              <span>↑↓ move</span><span>↵ open</span><span className="ml-auto">Ctrl/⌘ K</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
