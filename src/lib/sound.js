/**
 * src/lib/sound.js
 * ---------------------------------------------------------------------------
 * The chime that comes with each pop-up, drawn by the browser with Web Audio.
 * No audio files to host, load or get blocked.
 *
 *   paid       "ta-daaa" in soft bells — one short note, then three ringing
 *              together. The sound you want to hear from across the room.
 *   trial      two rising notes — someone just started
 *   hi         one quiet drop, so a busy hour does not become noise
 *   feedback   a bright pair when the rating is kind, the quiet drop otherwise
 *   support    two falling notes — something needs you
 *   broadcast  a soft double tick — the send finished
 *   milestone  a short bell fanfare
 *
 * Several pop-ups arriving at once play ONE sound: the most important of them.
 * Ten children finishing a quiz in the same ten seconds should not sound like
 * a slot machine.
 *
 * Browsers refuse to play sound until the person has clicked or typed on the
 * page once, so the first interaction unlocks it and until then this stays
 * silent rather than throwing. Off switch is per browser.
 */

const OFF_KEY = 'quizpe.sound.off';

export const soundOn = () => {
  try { return localStorage.getItem(OFF_KEY) !== '1'; } catch { return true; }
};
export function setSound(on) {
  try { localStorage.setItem(OFF_KEY, on ? '0' : '1'); } catch { /* private window */ }
}

let ctx = null;
function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch { return null; }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

// The first click or key press unlocks sound for the rest of the visit.
if (typeof window !== 'undefined') {
  const unlock = () => {
    audio();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
}

/** One bell-like note: a sine with quieter harmonics above it, fading out. */
function bell(ac, out, freq, at, { dur = 1.1, gain = 0.22, type = 'sine' } = {}) {
  [[1, 1], [2, 0.28], [3, 0.08]].forEach(([mult, level]) => {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.value = freq * mult;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain * level), at + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur / mult);
    o.connect(g).connect(out);
    o.start(at);
    o.stop(at + dur + 0.05);
  });
}

/* How loud each kind is allowed to be, and how much it matters when several
   arrive together. Higher rank wins. */
const RANK = {
  paid: 100, milestone: 90, support: 60, feedback: 50,
  trial: 40, broadcast: 30, hi: 10,
};

const C5 = 523.25, E5 = 659.25, G5 = 783.99, C6 = 1046.5, A4 = 440, F5 = 698.46;

function play(kind) {
  const ac = audio();
  if (!ac) return;
  const out = ac.createGain();
  out.gain.value = 0.9;
  out.connect(ac.destination);
  const t = ac.currentTime + 0.02;

  switch (kind) {
    case 'paid':                       // ta — daaaa
      bell(ac, out, G5, t, { dur: 0.45, gain: 0.24 });
      [C5, E5, G5, C6].forEach((f, i) => bell(ac, out, f, t + 0.26, { dur: 1.9, gain: 0.2 - i * 0.03 }));
      break;
    case 'milestone':
      [C5, E5, G5, C6].forEach((f, i) => bell(ac, out, f, t + i * 0.11, { dur: 1.5, gain: 0.2 }));
      break;
    case 'trial':                      // two rising notes
      bell(ac, out, E5, t, { dur: 0.5, gain: 0.18 });
      bell(ac, out, G5, t + 0.13, { dur: 0.8, gain: 0.18 });
      break;
    case 'feedback':                   // a bright pair
      bell(ac, out, G5, t, { dur: 0.6, gain: 0.18 });
      bell(ac, out, C6, t + 0.1, { dur: 0.9, gain: 0.16 });
      break;
    case 'support':                    // two falling notes
      bell(ac, out, F5, t, { dur: 0.5, gain: 0.17 });
      bell(ac, out, A4, t + 0.14, { dur: 0.8, gain: 0.17 });
      break;
    case 'broadcast':                  // soft double tick
      bell(ac, out, C5, t, { dur: 0.25, gain: 0.12 });
      bell(ac, out, C5, t + 0.12, { dur: 0.3, gain: 0.1 });
      break;
    default:                           // 'hi' and anything unnamed — one quiet drop
      bell(ac, out, A4, t, { dur: 0.45, gain: 0.1 });
  }
}

/* Several pop-ups in the same tick collapse into one sound, chosen by rank. */
let pending = null;
let timer = 0;

export function chime(kind = 'hi') {
  if (!soundOn()) return;
  const rank = RANK[kind] ?? 0;
  if (!pending || rank > pending.rank) pending = { kind, rank };
  if (timer) return;
  timer = setTimeout(() => {
    const k = pending?.kind || 'hi';
    pending = null;
    timer = 0;
    try { play(k); } catch { /* a chime is never worth an error */ }
  }, 120);
}
