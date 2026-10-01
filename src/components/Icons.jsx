/**
 * src/components/Icons.jsx
 * ---------------------------------------------------------------------------
 * The panel's icon set, as real SVG rather than emoji.
 *
 * Emoji were fine while the navigation was one flat list, but they render
 * differently on every machine, cannot take the current text colour, and
 * cannot be dimmed when an item is unavailable. These do all three, and sit on
 * one 24-unit grid so nothing jumps when the nav is grouped.
 */

const Svg = ({ size = 18, children, ...p }) => (
  <svg
    width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.9"
    strokeLinecap="round" strokeLinejoin="round"
    aria-hidden focusable="false" {...p}
  >
    {children}
  </svg>
);

/* ── Navigation ──────────────────────────────────────────────────────────── */

export const ChartIcon = (p) => (
  <Svg {...p}><path d="M4 19V5" /><path d="M4 19h16" /><rect x="7" y="11" width="3" height="5" rx="1" /><rect x="12" y="7" width="3" height="9" rx="1" /><rect x="17" y="13" width="3" height="3" rx="1" /></Svg>
);
export const PulseIcon = (p) => (
  <Svg {...p}><path d="M3 12h4l2.5-6 4 12L16 12h5" /></Svg>
);
export const RadioIcon = (p) => (
  <Svg {...p}><circle cx="12" cy="12" r="2" /><path d="M8.5 15.5a5 5 0 0 1 0-7" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M5.5 18.5a9 9 0 0 1 0-13" /><path d="M18.5 5.5a9 9 0 0 1 0 13" /></Svg>
);
export const GaugeIcon = (p) => (
  <Svg {...p}><path d="M4.5 17a8.5 8.5 0 1 1 15 0" /><path d="m12 13 4-3.5" /><circle cx="12" cy="13.6" r="1.4" /></Svg>
);
export const TrendIcon = (p) => (
  <Svg {...p}><path d="M3 17l6-6 4 4 8-8" /><path d="M21 7v5h-5" /></Svg>
);
export const BoltIcon = (p) => (
  <Svg {...p}><path d="M13 2 4 14h6l-1 8 9-12h-6z" /></Svg>
);
export const GiftIcon = (p) => (
  <Svg {...p}><rect x="3" y="9" width="18" height="12" rx="2" /><path d="M3 13h18" /><path d="M12 9v12" /><path d="M12 9S9.5 4 7.5 5.2 9 9 12 9s4.5-5 6.5-3.8S15 9 12 9Z" /></Svg>
);
export const CalendarIcon = (p) => (
  <Svg {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></Svg>
);
export const CalendarTickIcon = (p) => (
  <Svg {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /><path d="m9 15 2 2 4-4" /></Svg>
);
export const QuestionIcon = (p) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.2 2.4c-.6.2-.7.7-.7 1.3" /><path d="M12 16.8h.01" /></Svg>
);
export const HeartIcon = (p) => (
  <Svg {...p}><path d="M12 20s-7-4.4-7-9.2A4 4 0 0 1 12 8a4 4 0 0 1 7 2.8C19 15.6 12 20 12 20Z" /></Svg>
);
export const UsersIcon = (p) => (
  <Svg {...p}><circle cx="9" cy="8" r="3.2" /><path d="M3 20a6 6 0 0 1 12 0" /><path d="M16 5.5a3.2 3.2 0 0 1 0 6" /><path d="M18 20a6 6 0 0 0-2.5-4.9" /></Svg>
);
export const GlobeIcon = (p) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18Z" /></Svg>
);
export const ChatIcon = (p) => (
  <Svg {...p}><path d="M21 12a8 8 0 0 1-8 8H8l-5 2 1.6-4.2A8 8 0 1 1 21 12Z" /></Svg>
);
export const MegaphoneIcon = (p) => (
  <Svg {...p}><path d="M3 11v2a1 1 0 0 0 1 1h3l7 4V6l-7 4H4a1 1 0 0 0-1 1Z" /><path d="M7 14v5h3v-3.3" /><path d="M18 9a4 4 0 0 1 0 6" /></Svg>
);
export const PuzzleIcon = (p) => (
  <Svg {...p}><path d="M10 4h4v2.2a1.8 1.8 0 1 0 3.6 0V4H20v4.4h-2.2a1.8 1.8 0 1 0 0 3.6H20V20h-4.4v-2.2a1.8 1.8 0 1 0-3.6 0V20H4V10h2.2a1.8 1.8 0 1 0 0-3.6H4V4h6Z" /></Svg>
);
export const InboxIcon = (p) => (
  <Svg {...p}><path d="M3 13h5l1.5 3h5L16 13h5" /><path d="M5 5h14l2 8v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5Z" /></Svg>
);
export const RupeeIcon = (p) => (
  <Svg {...p}><path d="M7 4h10" /><path d="M7 9h10" /><path d="M14 4c0 3.5-2.4 5-7 5" /><path d="M8 9c5 0 7 1.6 7 4.6S12.5 18 9 18l8 4" /></Svg>
);
export const DocIcon = (p) => (
  <Svg {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h4" /></Svg>
);
export const LifebuoyIcon = (p) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3.6" /><path d="m5.6 5.6 3.9 3.9M14.5 14.5l3.9 3.9M18.4 5.6l-3.9 3.9M9.5 14.5l-3.9 3.9" /></Svg>
);
export const CogIcon = (p) => (
  <Svg {...p}><circle cx="12" cy="12" r="3.2" /><path d="M19.4 14.5a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-3-1.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.3-3l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 2.9-1.2V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 3 1.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a2 2 0 1 1 0 4H21a1.7 1.7 0 0 0-1.6 1.4Z" /></Svg>
);

/* ── Chrome ──────────────────────────────────────────────────────────────── */

export const SearchIcon = (p) => (
  <Svg {...p}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></Svg>
);
export const RefreshIcon = (p) => (
  <Svg {...p}><path d="M20 11a8 8 0 1 0-.6 4" /><path d="M20 4v7h-7" /></Svg>
);
export const MenuIcon = (p) => (
  <Svg {...p}><path d="M4 7h16M4 12h16M4 17h16" /></Svg>
);
export const CloseIcon = (p) => (
  <Svg {...p}><path d="m6 6 12 12M18 6 6 18" /></Svg>
);
export const ChevronIcon = (p) => (
  <Svg {...p}><path d="m9 6 6 6-6 6" /></Svg>
);
