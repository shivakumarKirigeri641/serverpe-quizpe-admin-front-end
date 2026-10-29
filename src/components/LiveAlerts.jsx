import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getToken } from '../lib/api';
import { chime } from '../lib/sound';
import { confettiBurst } from './Celebrate.jsx';
import { motionLevel } from '../lib/motion.jsx';

/**
 * src/components/LiveAlerts.jsx
 * ---------------------------------------------------------------------------
 * What the panel tells you while it is open: a pop-up, with a chime, each time
 * someone says hi, starts a trial, pays, leaves feedback, or opens a ticket.
 *
 * ONE POLLER FOR THE WHOLE PANEL, living in this module rather than in a page.
 * Every screen is drawn inside the Shell, so a poller inside a page would stop
 * and start again on every click, and would replay pop-ups each time.
 *
 * IT STARTS QUIET. On the first poll it learns where the feed currently is and
 * shows nothing — opening the panel should not replay this morning's events as
 * if they had just happened. Only what arrives afterwards pops. The watermark
 * is kept per browser, so a refresh does not replay either.
 *
 * THE CHATTY KINDS CAN BE MUTED from the pop-up itself. "Said hi" and "quiz
 * completed" are frequent and pleasant; payments and support tickets are not
 * frequent and must never be muted, because those are the ones you would be
 * sorry to miss.
 */

const POLL_MS = 15000;
const SINCE_KEY = 'quizpe.alerts.since';
const QUIET_KEY = 'quizpe.alerts.chatty.off';

const chattyOn = () => {
  try { return localStorage.getItem(QUIET_KEY) !== '1'; } catch { return true; }
};
export function setChattyAlerts(on) {
  try { localStorage.setItem(QUIET_KEY, on ? '0' : '1'); } catch { /* private window */ }
}

/* Only these pop. quiz_started is deliberately absent — in a busy evening it
   would fire for every child twice. */
const SHOWN = {
  paid: {
    title: 'Payment received', tone: 'paid', life: 14000, chatty: false,
    icon: '🎉', where: () => '/finance',
  },
  trial: {
    title: 'Free trial started', tone: 'good', life: 9000, chatty: false,
    icon: '🌱', where: (e) => (e.parent_id ? `/parents/${e.parent_id}` : '/parents'),
  },
  // PAY AS YOU ANSWER (2026-10-29): a recharge pops like a payment; the free 50 like a new trial.
  mcq_recharge: {
    title: 'MCQ recharge', tone: 'paid', life: 14000, chatty: false,
    icon: '💰', where: () => '/mcq',
  },
  mcq_free: {
    title: 'Free 50 started', tone: 'good', life: 9000, chatty: false,
    icon: '🎁', where: (e) => (e.parent_id ? `/parents/${e.parent_id}` : '/mcq'),
  },
  mcq_referral: {
    title: 'Invite bonus paid', tone: 'good', life: 9000, chatty: false,
    icon: '🎁', where: (e) => (e.parent_id ? `/parents/${e.parent_id}` : '/mcq'),
  },
  // WhatsApp is back (new number, 2026-10-28): someone writing for the very first time pops again.
  said_hi: {
    title: 'New on WhatsApp', tone: 'good', life: 9000, chatty: true,
    icon: '👋', where: (e) => (e.parent_id ? `/parents/${e.parent_id}` : '/web/families'),
  },
  feedback: {
    title: 'New feedback', tone: 'info', life: 11000, chatty: false,
    icon: '⭐', where: () => '/support',
  },
  support: {
    title: 'Support ticket', tone: 'warn', life: 12000, chatty: false,
    icon: '🛟', where: () => '/support',
  },
  // The website's events (2026-10-21, WhatsApp is gone): a new family on the app, a failed payment,
  // a confirmed email.
  app_signin: {
    title: 'New family on the app', tone: 'good', life: 11000, chatty: false,
    icon: '👋', where: (e) => (e.parent_id ? `/parents/${e.parent_id}` : '/web/families'),
  },
  payment_failed: {
    title: 'Payment failed', tone: 'warn', life: 12000, chatty: false,
    icon: '❌', where: () => '/event-log',
  },
  email_confirmed: {
    title: 'Email confirmed', tone: 'info', life: 7000, chatty: true,
    icon: '📧', where: (e) => (e.parent_id ? `/parents/${e.parent_id}` : '/web/families'),
  },
  quiz_completed: {
    title: 'Quiz finished', tone: 'good', life: 6000, chatty: true,
    icon: '✅', where: (e) => (e.ref_id ? `/quizzes/${e.ref_id}` : '/tonight'),
  },
};

const TONE = {
  paid: 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-400/30',
  good: 'border-emerald-200 bg-white',
  info: 'border-line bg-white',
  warn: 'border-amber-300 bg-amber-50',
};

const readSince = () => { try { return localStorage.getItem(SINCE_KEY) || null; } catch { return null; } };
const writeSince = (v) => { try { if (v) localStorage.setItem(SINCE_KEY, v); } catch { /* private window */ } };

export default function LiveAlerts() {
  const [toasts, setToasts] = useState([]);
  // Desktop notifications need the browser's permission, asked from a click (2026-10-21).
  const [perm, setPerm] = useState(() => (typeof Notification === 'undefined' ? 'unsupported' : Notification.permission));
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    let timer = 0;
    // Null until the first poll has established where the feed is. Until then
    // nothing pops — see the note above about not replaying the morning.
    let since = readSince();
    let primed = Boolean(since);

    const drop = (id) => setToasts((list) => list.filter((t) => t.id !== id));

    const show = (e) => {
      const spec = SHOWN[e.kind];
      if (!spec) return;
      if (spec.chatty && !chattyOn()) return;

      const id = `${e.kind}-${e.ref_id}-${e.at}`;
      setToasts((list) => (list.some((t) => t.id === id) ? list : [...list.slice(-4), { ...e, id, spec }]));
      chime(e.kind === 'quiz_completed' || e.kind === 'said_hi' || e.kind === 'email_confirmed' ? 'hi'
        : e.kind === 'app_signin' || e.kind === 'mcq_free' ? 'trial' : e.kind === 'mcq_recharge' ? 'paid'
        : e.kind === 'payment_failed' ? 'support' : e.kind);
      /* A DESKTOP NOTIFICATION too while this tab is in the background (2026-10-21, like GaadiPe's web
         admin) — only when the browser has allowed it (asked once, from the bell below). */
      try {
        if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
          const n = new Notification(`${spec.icon} ${spec.title}`, { body: [e.who, e.detail].filter(Boolean).join(' · '), tag: id });
          n.onclick = () => { window.focus(); navigate(spec.where(e)); n.close(); };
        }
      } catch { /* notifications not available */ }
      if ((e.kind === 'paid' || e.kind === 'mcq_recharge') && motionLevel() === 'full') confettiBurst();
      setTimeout(() => drop(id), spec.life);
    };

    const tick = async () => {
      if (!getToken() || document.hidden) return;
      try {
        const { rows } = await api.activity({ limit: 40 });
        if (!alive || !rows?.length) return;

        const newest = rows[0].at;
        if (!primed) {                 // first look: remember, show nothing
          primed = true;
          since = newest;
          writeSince(newest);
          return;
        }
        // The feed is newest-first; pop what arrived since, oldest of those first.
        const fresh = rows.filter((r) => r.at > since).reverse();
        if (fresh.length) {
          since = newest;
          writeSince(newest);
          fresh.forEach(show);
        }
      } catch { /* a failed poll is not worth telling anyone about */ }
    };

    tick();
    timer = setInterval(tick, POLL_MS);
    return () => { alive = false; clearInterval(timer); };
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[70] flex flex-col gap-2 w-[min(92vw,22rem)]" role="status" aria-live="polite">
      {perm === 'default' ? (
        <button type="button" className="self-end rounded-full border border-line bg-white px-3 py-1.5 text-[11px] font-semibold text-ink shadow-card hover:bg-line/30"
          onClick={() => { try { Notification.requestPermission().then((p) => setPerm(p)); } catch { setPerm('unsupported'); } }}>
          🔔 Allow desktop pop-ups
        </button>
      ) : null}
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => { setToasts((l) => l.filter((x) => x.id !== t.id)); navigate(t.spec.where(t)); }}
          className={`cursor-pointer rounded-xl border shadow-card p-3 transition ${TONE[t.spec.tone] || TONE.info}`}
          style={motionLevel() === 'full' ? { animation: 'qp-rise .28s cubic-bezier(.22,.9,.28,1)' } : undefined}
        >
          <div className="flex items-start gap-2">
            <span className="text-lg leading-none shrink-0">{t.spec.icon}</span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-ink">
                {t.spec.title}
                {t.amount ? ` · ₹${Number(t.amount).toLocaleString('en-IN')}` : ''}
              </div>
              <div className="text-[12px] text-ink/80 truncate">
                {t.who && t.who !== '—' ? t.who : t.parent || t.mobile}
              </div>
              {t.detail && <div className="text-[11px] text-muted truncate">{t.detail}</div>}
              <div className="text-[11px] text-muted mt-0.5 tabular-nums">{t.at_ist}</div>
            </div>
            <button
              onClick={(ev) => { ev.stopPropagation(); setToasts((l) => l.filter((x) => x.id !== t.id)); }}
              aria-label="Dismiss"
              className="text-muted hover:text-ink text-sm leading-none px-1"
            >
              ×
            </button>
          </div>

          {/* the frequent kinds can be silenced from the pop-up itself */}
          {t.spec.chatty && (
            <button
              onClick={(ev) => {
                ev.stopPropagation();
                setChattyAlerts(false);
                setToasts([]);
              }}
              className="text-[11px] text-muted hover:text-ink underline mt-1 ml-7"
            >
              Stop showing these
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
