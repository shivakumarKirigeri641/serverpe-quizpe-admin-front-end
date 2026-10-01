import { useEffect, useRef, useState } from 'react';

/**
 * src/lib/motion.jsx
 * ---------------------------------------------------------------------------
 * The panel's motion and realtime preferences, in one place.
 *
 *   motion    full | reduced | minimal    (the OS "reduce motion" counts as at least reduced)
 *   realtime  live | 30s | 60s | manual   (how often screens refresh themselves)
 *   charts    true | false                (charts draw in, or simply appear)
 *
 * Everything that animates asks motionLevel() first, so a gauge never sweeps
 * and a number never counts up for someone who asked for stillness.
 *
 * They live in this browser for now. The server-side copy — one set per admin,
 * so preferences follow you to another machine — is a change to savePrefs and
 * nothing else.
 */

export const DURATION = { instant: 100, fast: 150, normal: 220, emphasis: 350, complex: 500 };

const DEFAULTS = { motion: 'full', realtime: 'live', charts: true };
const KEY = 'quizpe.ui.prefs';

const osReduced = () =>
  typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

let prefs = (() => {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
  catch { return { ...DEFAULTS }; }          // private window — defaults are fine
})();

const watchers = new Set();

function apply() {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.motion = motionLevel();
  }
  watchers.forEach((f) => f({ ...prefs }));
}

/** full | reduced | minimal — what the screen may do right now. */
export function motionLevel() {
  if (prefs.motion === 'minimal') return 'minimal';
  if (prefs.motion === 'reduced' || osReduced()) return 'reduced';
  return 'full';
}

/** Should a chart draw itself in? Only with full motion AND the chart pref on. */
export const chartsAnimate = () => prefs.charts && motionLevel() === 'full';

export const getPrefs = () => ({ ...prefs });

export function savePrefs(patch) {
  prefs = { ...prefs, ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* private window */ }
  apply();
}

export function usePrefs() {
  const [p, setP] = useState(getPrefs);
  useEffect(() => {
    watchers.add(setP);
    return () => { watchers.delete(setP); };
  }, []);
  return p;
}

/**
 * How often a self-refreshing screen may ask again, in ms — or 0 for never,
 * which is what "manual" means: the header's Refresh is then the only way.
 */
export function refreshEvery(ms) {
  switch (prefs.realtime) {
    case 'manual': return 0;
    case '30s': return 30000;
    case '60s': return 60000;
    default: return ms;
  }
}

/* ── The global Refresh ──────────────────────────────────────────────────────
 * One button in the header reloads every listening screen at once, visibly.
 * Screens register with useRefreshSignal; nothing else needs to know.
 */
const refreshers = new Set();

export const fireRefresh = () => {
  refreshers.forEach((f) => {
    try { f(); } catch { /* one screen failing must not stop the rest */ }
  });
};

export function useRefreshSignal(fn) {
  // Held in a ref so an inline arrow — which every caller writes — does not
  // re-register the listener on every render.
  const latest = useRef(fn);
  latest.current = fn;
  useEffect(() => {
    const run = () => latest.current();
    refreshers.add(run);
    return () => { refreshers.delete(run); };
  }, []);
}

apply();
