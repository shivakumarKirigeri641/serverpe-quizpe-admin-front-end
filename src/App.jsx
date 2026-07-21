/**
 * src/App.jsx
 * ---------------------------------------------------------------------------
 * Routing, session and chrome for the QuizPe admin panel.
 *
 * Branding (company name, tagline, GSTIN, logos) is fetched from the back-end
 * rather than hardcoded, so changing business_details in the database updates
 * the panel with no rebuild.
 */

import { useEffect, useState, createContext, useContext } from 'react';
import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api, getToken, setToken, clearToken, setUnauthorizedHandler } from './lib/api';

import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Parents from './pages/Parents.jsx';
import ParentDetail from './pages/ParentDetail.jsx';
import QuizDetail from './pages/QuizDetail.jsx';
import Analytics from './pages/Analytics.jsx';
import Finance from './pages/Finance.jsx';
import Reports from './pages/Reports.jsx';
import Support from './pages/Support.jsx';
import Settings from './pages/Settings.jsx';
import LiveFeed from './pages/LiveFeed.jsx';
import Questions from './pages/Questions.jsx';
import Tonight from './pages/Tonight.jsx';
import WhatsAppPage from './pages/WhatsApp.jsx';
import Inbox from './pages/Inbox.jsx';

export const Brand = createContext({ business: {}, logos: {} });
export const useBrand = () => useContext(Brand);

const NAV = [
  { to: '/', label: 'Dashboard', icon: '📊', end: true },
  { to: '/tonight', label: 'Tonight (live)', icon: '🟢' },
  { to: '/live', label: 'Live activity', icon: '📡' },
  { to: '/analytics', label: 'Analytics', icon: '📈' },
  { to: '/parents', label: 'Parents & students', icon: '👨‍👩‍👧' },
  { to: '/whatsapp', label: 'Conversations', icon: '💬' },
  { to: '/questions', label: 'Question bank', icon: '❓' },
  { to: '/reports', label: 'Reports', icon: '📄' },
  { to: '/finance', label: 'Finance & GST', icon: '₹' },
  { to: '/inbox', label: 'Inbox', icon: '📥' },
  { to: '/support', label: 'Support', icon: '💬' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function App() {
  const [authed, setAuthed] = useState(!!getToken());
  const [brand, setBrand] = useState({ business: {}, logos: {} });
  const navigate = useNavigate();

  useEffect(() => {
    setUnauthorizedHandler(() => { setAuthed(false); navigate('/login'); });
    api.branding?.().catch(() => {});
  }, [navigate]);

  // branding is public, so it loads on the login screen too
  useEffect(() => {
    fetch('/admin/api/branding')
      .then(r => r.json())
      .then(d => d.success && setBrand({ business: d.business || {}, logos: d.logos || {} }))
      .catch(() => {});
  }, []);

  const signIn = (token) => { setToken(token); setAuthed(true); navigate('/'); };
  const signOut = () => { clearToken(); setAuthed(false); navigate('/login'); };

  if (!authed) {
    return (
      <Brand.Provider value={brand}>
        <Routes>
          <Route path="*" element={<Login onSignedIn={signIn} />} />
        </Routes>
      </Brand.Provider>
    );
  }

  return (
    <Brand.Provider value={brand}>
      <div className="min-h-screen flex">
        <Sidebar onSignOut={signOut} />
        <main className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 0.9, 0.28, 1] }}
              className="p-6 max-w-[1600px] mx-auto"
            >
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/tonight" element={<Tonight />} />
                <Route path="/live" element={<LiveFeed />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/parents" element={<Parents />} />
                <Route path="/parents/:id" element={<ParentDetail />} />
                <Route path="/quizzes/:trackerId" element={<QuizDetail />} />
                <Route path="/whatsapp" element={<WhatsAppPage />} />
                <Route path="/questions" element={<Questions />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/finance" element={<Finance />} />
                <Route path="/inbox" element={<Inbox />} />
                <Route path="/support" element={<Support />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </Brand.Provider>
  );
}

function Sidebar({ onSignOut }) {
  const { business, logos } = useBrand();
  return (
    <aside className="w-60 shrink-0 bg-brand text-white/90 min-h-screen sticky top-0 flex flex-col">
      <div className="p-5 flex items-center gap-3 border-b border-white/10">
        {logos['logo-mark'] && (
          <img src={logos['logo-mark']} alt="" className="w-10 h-10 rounded-xl bg-white p-1" />
        )}
        <div className="min-w-0">
          <div className="font-bold text-white leading-tight">{business.product_name || 'QuizPe'}</div>
          <div className="text-[11px] text-white/60 truncate">{business.product_tagline || ''}</div>
        </div>
      </div>

      <nav className="p-3 space-y-1 flex-1">
        {NAV.map(n => (
          <NavLink
            key={n.to} to={n.to} end={n.end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                isActive ? 'bg-white/15 text-white font-semibold' : 'hover:bg-white/10'}`}
          >
            <span className="w-5 text-center">{n.icon}</span>{n.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10 text-[11px] text-white/50">
        <div className="font-semibold text-white/70">{business.company_name}</div>
        {business.gstin && <div>GSTIN {business.gstin}</div>}
        <button onClick={onSignOut} className="mt-3 w-full rounded-lg bg-white/10 hover:bg-white/20 py-2 text-white text-xs font-semibold transition">
          Sign out
        </button>
      </div>
    </aside>
  );
}
