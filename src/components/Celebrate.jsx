/**
 * Celebrate — the delight pack.
 *
 *  <PaymentCelebrator/>  global: polls for new payments and, when one lands,
 *                        fires confetti + a soft chime + a toast.
 *  <Celebrations/>       a Dashboard card: children on a live streak and last
 *                        night's perfect scores — a ready source of testimonials.
 *
 * No dependencies: confetti is a tiny canvas animation, the chime is Web Audio.
 */
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import { toast } from './Toaster.jsx';
import { inr } from './ui.jsx';

/** A short, tasteful confetti burst from the top of the screen. */
export function confettiBurst() {
  const canvas = document.createElement('canvas');
  Object.assign(canvas.style, {
    position: 'fixed', inset: '0', width: '100%', height: '100%',
    pointerEvents: 'none', zIndex: '70',
  });
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const colors = ['#16a34a', '#0f766e', '#f7b500', '#6d5bd0', '#e11d2a', '#38bdf8'];
  const N = 140;
  const parts = Array.from({ length: N }, () => ({
    x: canvas.width / 2 + (Math.random() - 0.5) * 240,
    y: -20 - Math.random() * 60,
    vx: (Math.random() - 0.5) * 7,
    vy: 2 + Math.random() * 5,
    r: 4 + Math.random() * 5,
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.4,
    c: colors[(Math.random() * colors.length) | 0],
  }));
  let frame = 0;
  const tick = () => {
    frame++;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of parts) {
      p.vy += 0.12; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.c; ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 1.6);
      ctx.restore();
    }
    if (frame < 160) requestAnimationFrame(tick);
    else canvas.remove();
  };
  requestAnimationFrame(tick);
}

/** A soft two-note chime (best-effort; browsers may block until a click). */
export function chime() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ac = new AC();
    [ [880, 0], [1318.5, 0.12] ].forEach(([f, t]) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sine'; o.frequency.value = f;
      o.connect(g); g.connect(ac.destination);
      const s = ac.currentTime + t;
      g.gain.setValueAtTime(0, s);
      g.gain.linearRampToValueAtTime(0.18, s + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, s + 0.5);
      o.start(s); o.stop(s + 0.55);
    });
    setTimeout(() => ac.close?.(), 1200);
  } catch { /* audio blocked — confetti + toast still fire */ }
}

/** Global watcher: celebrate the moment a new payment is recorded. */
export function PaymentCelebrator() {
  const lastId = useRef(null);
  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const { celebrations } = await api.celebrations();
        const pay = celebrations?.latest_payment;
        if (!pay || !alive) return;
        if (lastId.current === null) { lastId.current = pay.id; return; }  // baseline, no cheer on first load
        if (pay.id > lastId.current) {
          lastId.current = pay.id;
          confettiBurst(); chime();
          toast(`🎉 ${inr(pay.amount)} — ${pay.parent_name || 'A parent'} just paid!`, 'success');
        }
      } catch { /* ignore */ }
    };
    check();
    const t = setInterval(check, 20000);
    return () => { alive = false; clearInterval(t); };
  }, []);
  return null;
}

/** Dashboard card: live streaks + last night's perfect scores. */
export function Celebrations() {
  const [c, setC] = useState(null);
  useEffect(() => { api.celebrations().then((d) => setC(d.celebrations)).catch(() => setC(null)); }, []);
  if (!c) return null;
  const { streaks = [], perfect = [] } = c;
  if (!streaks.length && !perfect.length) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="card p-5 mb-6">
      <h2 className="font-bold text-brand mb-3">🎉 Worth celebrating</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted mb-2">🔥 On a streak</p>
          {!streaks.length ? <p className="text-sm text-muted">No live streaks yet.</p> : (
            <ul className="space-y-1.5">
              {streaks.map((s, i) => (
                <li key={i} className="flex items-center justify-between text-sm">
                  <span className="truncate text-ink font-semibold">{s.student_name}</span>
                  <span className="pill bg-orange-100 text-orange-700 shrink-0">{s.len}-day 🔥</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted mb-2">⭐ Perfect last night</p>
          {!perfect.length ? <p className="text-sm text-muted">No perfect scores last night.</p> : (
            <ul className="space-y-1.5">
              {perfect.map((p, i) => (
                <li key={i} className="flex items-center justify-between text-sm">
                  <span className="truncate text-ink font-semibold">{p.student_name}</span>
                  <span className="pill bg-emerald-100 text-emerald-700 shrink-0">{p.score_total}/{p.score_total} ⭐</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <p className="text-[11px] text-muted mt-3">A happy parent here is a testimonial waiting to happen — a quick WhatsApp thank-you goes a long way.</p>
    </motion.div>
  );
}
