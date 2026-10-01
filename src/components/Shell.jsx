import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ConnectionStatus, RefreshButton, BusyBar } from './HeaderStatus.jsx';
import Preferences from './Preferences.jsx';
import { useAllowed, useSession } from '../lib/session.jsx';
import {
  ChartIcon, PulseIcon, RadioIcon, GaugeIcon, TrendIcon, BoltIcon, GiftIcon,
  CalendarIcon, CalendarTickIcon, QuestionIcon, HeartIcon, UsersIcon, GlobeIcon,
  ChatIcon, MegaphoneIcon, PuzzleIcon, InboxIcon, RupeeIcon, DocIcon,
  LifebuoyIcon, CogIcon, MenuIcon, CloseIcon, ChevronIcon,
} from './Icons.jsx';

/**
 * src/components/Shell.jsx
 * ---------------------------------------------------------------------------
 * The frame every screen sits in: a sidebar on a desk, a drawer on a phone,
 * and a slim top bar saying where you are and whether the panel is talking to
 * the server.
 *
 * THE NAVIGATION LISTS WHAT EXISTS, GROUPED. Twenty flat items is a wall; the
 * same twenty in six groups is a map. Every screen the panel had keeps its
 * place — nothing was dropped in the regrouping.
 *
 * Groups fold. Which are folded is remembered in this browser, and the group
 * holding the screen you are on always shows, however you left it.
 *
 * `cap` is the capability a screen's API will demand. An item the admin lacks
 * is not drawn — but an unknown capability counts as held, so an older
 * back-end never makes the navigation appear to lose screens.
 */

const FOLD_KEY = 'quizpe.nav.folded';

export const NAV = [
  {
    group: 'Dashboard',
    items: [
      { to: '/',           label: 'Dashboard',      icon: ChartIcon, end: true, cap: 'dashboard.view' },
      { to: '/tonight',    label: 'Tonight (live)', icon: PulseIcon,            cap: 'dashboard.view' },
      { to: '/quiz-live',  label: 'Quiz pulse',     icon: GaugeIcon,            cap: 'dashboard.view' },
      { to: '/live',       label: 'Live activity',  icon: RadioIcon,            cap: 'dashboard.view' },
      { to: '/analytics',  label: 'Analytics',      icon: TrendIcon,            cap: 'analytics.view' },
    ],
  },
  {
    group: 'Quizzes',
    items: [
      { to: '/quick-quiz',      label: 'Quick Quiz',      icon: BoltIcon,         cap: 'quiz.manage' },
      { to: '/free-quiz',       label: 'Free quiz slot',  icon: GiftIcon,         cap: 'quiz.manage' },
      { to: '/free-access',     label: 'Free access',     icon: CalendarTickIcon, cap: 'quiz.manage' },
      { to: '/questions',       label: 'Question bank',   icon: QuestionIcon,     cap: 'questions.view' },
      { to: '/question-health', label: 'Question health', icon: HeartIcon,        cap: 'questions.view' },
      { to: '/holidays',        label: 'Holidays',        icon: CalendarIcon,     cap: 'quiz.manage' },
    ],
  },
  {
    group: 'Families',
    items: [
      { to: '/parents',  label: 'Parents & students', icon: UsersIcon, cap: 'parents.view' },
      { to: '/visitors', label: 'Visitors',           icon: GlobeIcon, cap: 'analytics.view' },
    ],
  },
  {
    group: 'WhatsApp',
    items: [
      { to: '/whatsapp',  label: 'Conversations',    icon: ChatIcon,      cap: 'whatsapp.view' },
      { to: '/broadcast', label: 'Broadcast',        icon: MegaphoneIcon, cap: 'whatsapp.send' },
      { to: '/delivery',  label: 'Delivery health',  icon: RadioIcon,     cap: 'whatsapp.view' },
      { to: '/templates', label: 'Templates',        icon: PuzzleIcon,    cap: 'whatsapp.view' },
      { to: '/inbox',     label: 'Inbox',            icon: InboxIcon,     cap: 'whatsapp.view' },
    ],
  },
  {
    group: 'Money',
    items: [
      { to: '/finance', label: 'Finance & GST', icon: RupeeIcon, cap: 'finance.view' },
      { to: '/reports', label: 'Reports',       icon: DocIcon,   cap: 'reports.view' },
    ],
  },
  {
    group: 'System',
    items: [
      { to: '/support',  label: 'Support',  icon: LifebuoyIcon, cap: 'support.view' },
      { to: '/settings', label: 'Settings', icon: CogIcon,      cap: 'settings.view' },
    ],
  },
];

const readFolded = () => {
  try { return new Set(JSON.parse(localStorage.getItem(FOLD_KEY) || '[]')); }
  catch { return new Set(); }
};

/** Which nav item owns this path — so its group can never be folded away. */
function here(pathname) {
  let best = null;
  for (const g of NAV) {
    for (const it of g.items) {
      const hit = it.end ? pathname === it.to : pathname.startsWith(it.to);
      if (hit && (!best || it.to.length > best.to.length)) best = { ...it, group: g.group };
    }
  }
  return best;
}

export default function Shell({ brand, onSignOut, children }) {
  const location = useLocation();
  const [open, setOpen] = useState(false);            // mobile drawer
  const [folded, setFolded] = useState(readFolded);
  const allowed = useAllowed();
  const { me } = useSession();

  const current = here(location.pathname);
  const activeGroup = current?.group || null;

  // A tap on a nav item should navigate AND dismiss the drawer, in one gesture.
  useEffect(() => { setOpen(false); }, [location.pathname]);

  const toggle = (name) => {
    setFolded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      try { localStorage.setItem(FOLD_KEY, JSON.stringify([...next])); } catch { /* private window */ }
      return next;
    });
  };

  return (
    <>
      <BusyBar />
      <div className="min-h-screen flex">
        {open && (
          <div className="lg:hidden fixed inset-0 z-30 bg-black/40" onClick={() => setOpen(false)} aria-hidden />
        )}

        <aside
          className={`bg-brand text-white/90 min-h-screen flex flex-col w-64 shrink-0
            fixed inset-y-0 left-0 z-40 transform transition-transform duration-200
            lg:sticky lg:top-0 lg:z-auto lg:w-60 lg:h-screen lg:translate-x-0
            ${open ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <div className="p-5 flex items-center gap-3 border-b border-white/10 shrink-0">
            <button
              onClick={() => setOpen(false)} aria-label="Close menu"
              className="lg:hidden grid place-items-center w-8 h-8 rounded-lg hover:bg-white/10 shrink-0 order-last ml-auto"
            >
              <CloseIcon size={20} />
            </button>
            {brand?.logos?.['logo-mark'] && (
              <img src={brand.logos['logo-mark']} alt="" className="w-10 h-10 rounded-xl bg-white p-1" />
            )}
            <div className="min-w-0">
              <div className="font-bold text-white leading-tight">{brand?.business?.product_name || 'QuizPe'}</div>
              <div className="text-[11px] text-white/60 truncate">{brand?.business?.product_tagline || ''}</div>
            </div>
          </div>

          <nav className="p-3 flex-1 overflow-y-auto">
            {NAV.map((g) => {
              const items = g.items.filter((it) => allowed(it.cap));
              if (!items.length) return null;
              const isOpen = !folded.has(g.group) || g.group === activeGroup;
              return (
                <div key={g.group} className="mb-1">
                  <button
                    onClick={() => toggle(g.group)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center gap-1.5 px-3 pt-3 pb-1.5 text-[10px] font-bold
                               uppercase tracking-wider text-white/45 hover:text-white/70 transition"
                  >
                    <span className="transition-transform duration-200"
                          style={{ transform: isOpen ? 'rotate(90deg)' : 'none' }}>
                      <ChevronIcon size={11} />
                    </span>
                    {g.group}
                  </button>

                  {isOpen && (
                    <div className="space-y-0.5">
                      {items.map((n) => {
                        const Icon = n.icon;
                        return (
                          <NavLink
                            key={n.to} to={n.to} end={n.end}
                            className={({ isActive }) =>
                              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                                isActive ? 'bg-white/15 text-white font-semibold' : 'hover:bg-white/10'}`}
                          >
                            <span className="w-5 grid place-items-center shrink-0"><Icon /></span>
                            <span className="truncate">{n.label}</span>
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <div className="p-4 border-t border-white/10 text-[11px] text-white/50 shrink-0">
            <div className="font-semibold text-white/70">{brand?.business?.company_name}</div>
            {brand?.business?.gstin && <div>GSTIN {brand.business.gstin}</div>}
            {me?.mobile && <div className="mt-0.5">{me.mobile}{me.super ? ' · full access' : ''}</div>}
            <button
              onClick={onSignOut}
              className="mt-3 w-full rounded-lg bg-white/10 hover:bg-white/20 py-2 text-white text-xs font-semibold transition"
            >
              Sign out
            </button>
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          <header className="sticky top-0 z-20 flex items-center gap-3 bg-brand-deep text-white px-4 h-12 shadow-card">
            <button
              onClick={() => setOpen(true)} aria-label="Open menu"
              className="lg:hidden grid place-items-center w-9 h-9 rounded-lg hover:bg-white/10 -ml-1"
            >
              <MenuIcon size={22} />
            </button>

            <div className="min-w-0 flex items-baseline gap-2">
              {activeGroup && (
                <span className="hidden sm:inline text-[11px] uppercase tracking-wider text-white/40 font-bold">
                  {activeGroup}
                </span>
              )}
              <span className="font-semibold text-sm truncate">
                {current?.label || brand?.business?.product_name || 'QuizPe'}
              </span>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <ConnectionStatus />
              <RefreshButton />
              <Preferences />
            </div>
          </header>

          {children}
        </main>
      </div>
    </>
  );
}
