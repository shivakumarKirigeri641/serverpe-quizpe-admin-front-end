import { useEffect, useRef } from 'react';
import { quietly } from './api';
import { usePrefs, refreshEvery, useRefreshSignal } from './motion.jsx';

/**
 * src/lib/useAutoRefresh.js
 * ---------------------------------------------------------------------------
 * A screen that lists something asks again, by itself, every ten seconds.
 *
 * Quietly — no loading bar, no spinner, the rows simply change. A visible
 * reload every ten seconds is worse than no reload at all.
 *
 * And never at the wrong moment:
 *   · not while the tab is hidden — a panel left open in a background tab
 *     should not sit there querying the database all evening;
 *   · not while someone is typing in a field — a refresh must never move the
 *     ground under the cursor mid-sentence.
 *
 * The pace is the admin's Realtime preference: as asked, every 30s, every
 * minute, or only by hand. The header's Refresh reloads everything at once,
 * visibly, whatever the pace.
 *
 * QUIZ WINDOW. Between 7:00 and 11:45 PM IST children are answering, and this
 * panel reads the same tables the quiz writes to. In that window the floor is
 * raised so an open tab can never poll faster than every five seconds.
 */
export const REFRESH_MS = 10000;
const IN_WINDOW_FLOOR_MS = 5000;

/** Is a quiz running right now — in the founder's timezone, not the browser's? */
function inQuizWindow(d = new Date()) {
  const ist = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const mins = ist.getHours() * 60 + ist.getMinutes();
  return mins >= 19 * 60 && mins < 23 * 60 + 45;
}

export function useAutoRefresh(fn, ms = REFRESH_MS) {
  // Keep the newest closure without restarting the interval on every render.
  const latest = useRef(fn);
  latest.current = fn;

  const { realtime } = usePrefs();
  let every = refreshEvery(ms);
  if (every && inQuizWindow()) every = Math.max(every, IN_WINDOW_FLOOR_MS);

  useEffect(() => {
    if (!every) return undefined;                 // "manual" — the header only
    const id = setInterval(() => {
      if (document.hidden) return;
      const el = document.activeElement;
      if (el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && el.type !== 'checkbox'))) return;
      quietly(() => latest.current()).catch(() => { /* the next tick tries again */ });
    }, every);
    return () => clearInterval(id);
  }, [every, realtime]);

  // The global Refresh reloads this screen too — visibly, not quietly.
  useRefreshSignal(() => latest.current());
}
