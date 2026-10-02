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
import { Routes, Route, NavLink, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api, getToken, setToken, clearToken, setUnauthorizedHandler } from './lib/api';
import { motionLevel, DURATION } from './lib/motion.jsx';
import Shell from './components/Shell.jsx';
import { SessionProvider } from './lib/session.jsx';

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
import QuickQuiz from './pages/QuickQuiz.jsx';
import FreeQuizSlot from './pages/FreeQuizSlot.jsx';
import FreeAccess from './pages/FreeAccess.jsx';
import WhatsAppPage from './pages/WhatsApp.jsx';
import Inbox from './pages/Inbox.jsx';
import Visitors from './pages/Visitors.jsx';
import Broadcast from './pages/Broadcast.jsx';
import Templates from './pages/Templates.jsx';
import Holidays from './pages/Holidays.jsx';
import QuizLive from './pages/QuizLive.jsx';
import QuestionHealth from './pages/QuestionHealth.jsx';
import DeliveryHealth from './pages/DeliveryHealth.jsx';
import SystemHealth from './pages/SystemHealth.jsx';
import Curriculum from './pages/Curriculum.jsx';
import AuditLog from './pages/AuditLog.jsx';
import Toaster from './components/Toaster.jsx';
import CommandPalette from './components/CommandPalette.jsx';
import { PaymentCelebrator } from './components/Celebrate.jsx';

export const Brand = createContext({ business: {}, logos: {} });
export const useBrand = () => useContext(Brand);

export default function App() {
  const [authed, setAuthed] = useState(!!getToken());
  const [brand, setBrand] = useState({ business: {}, logos: {} });
  const navigate = useNavigate();
  const location = useLocation();

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

  // Someone who asked for stillness gets the page, not a page that arrives.
  const still = motionLevel() !== 'full';

  return (
    <Brand.Provider value={brand}>
      <Toaster />
      <CommandPalette />
      <PaymentCelebrator />
      <SessionProvider authed={authed}>
      <Shell brand={brand} onSignOut={signOut}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={still ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: still ? 0 : DURATION.normal / 1000, ease: [0.22, 0.9, 0.28, 1] }}
              className="p-4 sm:p-6 max-w-[1600px] mx-auto"
            >
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/tonight" element={<Tonight />} />
                <Route path="/quiz-live" element={<QuizLive />} />
                <Route path="/question-health" element={<QuestionHealth />} />
                <Route path="/delivery" element={<DeliveryHealth />} />
                <Route path="/system" element={<SystemHealth />} />
                <Route path="/curriculum" element={<Curriculum />} />
                <Route path="/audit" element={<AuditLog />} />
                <Route path="/quick-quiz" element={<QuickQuiz />} />
                <Route path="/free-quiz" element={<FreeQuizSlot />} />
                <Route path="/free-access" element={<FreeAccess />} />
                <Route path="/live" element={<LiveFeed />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/visitors" element={<Visitors />} />
                <Route path="/parents" element={<Parents />} />
                <Route path="/parents/:id" element={<ParentDetail />} />
                <Route path="/quizzes/:trackerId" element={<QuizDetail />} />
                <Route path="/whatsapp" element={<WhatsAppPage />} />
                <Route path="/broadcast" element={<Broadcast />} />
                <Route path="/holidays" element={<Holidays />} />
                <Route path="/templates" element={<Templates />} />
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
      </Shell>
      </SessionProvider>
    </Brand.Provider>
  );
}


