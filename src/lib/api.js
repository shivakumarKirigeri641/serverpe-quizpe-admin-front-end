/**
 * src/lib/api.js
 * ---------------------------------------------------------------------------
 * The single door to the QuizPe back-end.
 *
 * Every request carries the bearer token; every 401 clears the session and
 * bounces to login, so an expired token can never leave the panel showing
 * stale data it is no longer entitled to.
 *
 * The token lives in sessionStorage, not localStorage: closing the tab ends
 * the session. This panel shows children's names, parents' phone numbers and
 * financial records, so it should not survive a closed browser.
 */

import * as secure from './secure';

const KEY = 'quizpe.admin.token';

// Empty in development, where Vite proxies /admin/api to port 5008. In
// production the panel is admin.quizpe.in and the API is api.quizpe.in, so
// this is set to that absolute origin at build time via VITE_API_BASE.
export const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');

export const getToken = () => sessionStorage.getItem(KEY);
export const setToken = (t) => sessionStorage.setItem(KEY, t);
export const clearToken = () => sessionStorage.removeItem(KEY);

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

// The Toaster registers here, so any write can raise a snackbar without each
// page wiring one up.
let onToast = () => {};
export const setToastHandler = (fn) => { onToast = fn; };

/* ── Panel health & busy signal ──────────────────────────────────────────────
 * The header needs two things this module already knows: whether a request is
 * in flight (so a busy bar can show), and whether the last one reached the
 * server at all (so the connection dot can go amber). Published here rather
 * than threaded through every page.
 */
let inFlight = 0;
let healthy = true;
let lastOkAt = null;
const busyWatchers = new Set();
const healthWatchers = new Set();

export const onBusyChange = (fn) => { busyWatchers.add(fn); fn(inFlight > 0); return () => busyWatchers.delete(fn); };
export const onHealthChange = (fn) => { healthWatchers.add(fn); fn({ healthy, lastOkAt }); return () => healthWatchers.delete(fn); };

/* A background refresh must not flash the busy bar — the rows simply change. */
let silent = 0;
export const quietly = async (fn) => { silent += 1; try { return await fn(); } finally { silent -= 1; } };
// Auth flows have their own on-screen feedback (codes, PIN) — a toast there is
// noise, so they are excluded from the automatic snackbars.
const isAuthPath = (p) => /\/(login|otp)\b|request-otp/.test(p);

async function rawRequest(path, { method = 'GET', body, signal, quiet = false } = {}) {
  const headers = { Accept: 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';

  // A write (anything but GET) that isn't an auth flow gets an automatic toast,
  // unless the caller opts out with quiet (e.g. a price preview handled inline).
  const toastable = method !== 'GET' && !isAuthPath(path) && !quiet;

  /*
   * The encrypted channel, when the server offers one. `send` answers null
   * when it does not — today's normal path, not an error — and this falls
   * straight through to the plain fetch below.
   */
  let sealed = null;
  try {
    sealed = await secure.send(API_BASE, { method, path, body, token, signal });
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    sealed = null;                       // never fail a call over the channel
  }
  if (sealed) {
    if (sealed.status === 401) {
      clearToken();
      onUnauthorized();
      throw new Error('Session expired. Please sign in again.');
    }
    const d = sealed.data || {};
    if (sealed.status >= 400 || d.success === false) {
      const msg = d.error || `Request failed (${sealed.status})`;
      if (toastable) onToast({ type: 'error', message: msg });
      throw new Error(msg);
    }
    if (toastable) onToast({ type: 'success', message: d.message || 'Saved' });
    return d;
  }

  let res;
  try {
    res = await fetch(`${API_BASE}/admin/api${path}`, {
      method, headers, signal,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    const msg = API_BASE
      ? `Cannot reach the server at ${API_BASE}. Please check your connection.`
      : 'Cannot reach the server. Is the back-end running on port 5008?';
    if (toastable) onToast({ type: 'error', message: msg });
    throw new Error(msg);
  }

  if (res.status === 401) {
    clearToken();
    onUnauthorized();
    throw new Error('Session expired. Please sign in again.');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    const msg = data.error || `Request failed (${res.status})`;
    if (toastable) onToast({ type: 'error', message: msg });
    throw new Error(msg);
  }
  if (toastable) onToast({ type: 'success', message: data.message || 'Saved' });
  return data;
}

/* Every call passes through here, so the header always knows the truth. */
async function request(path, opts = {}) {
  const loud = silent === 0;
  if (loud && (inFlight += 1) === 1) busyWatchers.forEach((f) => f(true));
  try {
    const out = await rawRequest(path, opts);
    lastOkAt = Date.now();
    if (!healthy) { healthy = true; healthWatchers.forEach((f) => f({ healthy, lastOkAt })); }
    return out;
  } catch (e) {
    if (/Cannot reach the server/.test(e.message) && healthy) {
      healthy = false;
      healthWatchers.forEach((f) => f({ healthy, lastOkAt }));
    }
    throw e;
  } finally {
    if (loud && (inFlight -= 1) === 0) busyWatchers.forEach((f) => f(false));
  }
}

export const api = {
  // live quiz & delivery — all read-only, all under a READ ONLY transaction
  quizPulse:    () => request('/quiz-live/pulse'),
  quizSeries:   (minutes = 120) => request('/quiz-live/series?minutes=' + minutes),
  quizSlots:    () => request('/quiz-live/slots'),
  quizInFlight: () => request('/quiz-live/in-flight'),
  quizTimeline: (trackerId) => request('/quiz-live/timeline/' + trackerId),
  questionAnalytics: (days = 30, limit = 40) => request('/question-analytics?days=' + days + '&limit=' + limit),

  deliverySummary:       (days = 7)  => request('/delivery/summary?days=' + days),
  deliveryDaily:         (days = 14) => request('/delivery/daily?days=' + days),
  deliveryTemplates:     (days = 14) => request('/delivery/templates?days=' + days),
  deliveryUndeliverable: ()          => request('/delivery/undeliverable'),
  deliveryUnanswered:    ()          => request('/delivery/unanswered'),

  requestOtp: (mobile) => request('/otp', { method: 'POST', body: { mobile } }),
  login: (mobile, code) => request('/login', { method: 'POST', body: { mobile, code } }),
  loginPassword: (password) => request('/login-password', { method: 'POST', body: { password } }),
  me: () => request('/me'),

  dashboard: () => request('/dashboard'),
  quickQuiz: (range = '7d') => request(`/quick-quiz?range=${encodeURIComponent(range)}`),
  quickQuizStudent: (id) => request(`/quick-quiz/student/${id}`),
  freeQuizSearch: (q) => request(`/free-quiz/search?q=${encodeURIComponent(q)}`),
  freeQuizGrants: () => request('/free-quiz/grants'),
  freeQuizGrant: (body) => request('/free-quiz/grant', { method: 'POST', body }),
  freeQuizCancel: (id) => request('/free-quiz/cancel', { method: 'POST', body: { id } }),

  // Free access — quizzes at no charge for a date range (see pages/FreeAccess).
  freeAccessSearch: (q) => request(`/free-access/search?q=${encodeURIComponent(q)}`),
  freeAccessList: () => request('/free-access/campaigns'),
  freeAccessGrant: (body) => request('/free-access/grant', { method: 'POST', body }),
  freeAccessCancel: (id) => request('/free-access/cancel', { method: 'POST', body: { id } }),
  instantConfig: () => request('/instant-config'),
  saveInstantConfig: (body) => request('/instant-config', { method: 'PUT', body }),
  briefing: () => request('/briefing'),
  celebrations: () => request('/celebrations'),
  daily: (days = 30) => request(`/analytics/daily?days=${days}`),
  participation: (days = 30) => request(`/analytics/participation?days=${days}`),
  cohort: (date) => request(`/analytics/cohort${date ? `?date=${date}` : ''}`),
  funnel: () => request('/analytics/funnel'),
  retention: () => request('/analytics/retention'),
  activity: (weeks = 12) => request(`/analytics/activity?weeks=${weeks}`),
  plans: () => request('/analytics/plans'),
  engagement: () => request('/analytics/engagement'),
  boardGrade: (date) => request(`/analytics/board-grade${date ? `?date=${date}` : ''}`),
  launchOffer: () => request('/analytics/launch-offer'),
  feed: (limit = 50) => request(`/feed?limit=${limit}`),
  tonight: () => request('/tonight'),

  parents: ({ q = '', limit = 25, offset = 0, filter = 'all', sort = 'expiry_desc' } = {}) =>
    request(`/parents?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}&filter=${filter}&sort=${sort}`),
  parent: (id) => request(`/parents/${id}`),
  lookups: () => request('/lookups'),
  updateParent: (id, body) => request(`/parents/${id}`, { method: 'PATCH', body }),
  updateExpiry: (id, date) => request(`/parents/${id}/expiry`, { method: 'PATCH', body: { date } }),
  mobilePreview: (id) => request(`/parents/${id}/mobile-preview`),
  changeMobile: (id, mobile, confirm) =>
    request(`/parents/${id}/mobile`, { method: 'POST', body: { mobile, confirm } }),
  addStudent: (parentId, body) => request(`/parents/${parentId}/students`, { method: 'POST', body }),
  // Mid-plan add-child: preview the pro-rated price (quiet), then send the pay link.
  addChildQuote: (parentId, body) =>
    request(`/parents/${parentId}/add-child-link`, { method: 'POST', body: { ...body, dryRun: true }, quiet: true }),
  addChildLink: (parentId, body) =>
    request(`/parents/${parentId}/add-child-link`, { method: 'POST', body, quiet: true }),
  updateStudent: (id, body) => request(`/students/${id}`, { method: 'PATCH', body }),
  studentQuizzes: (id) => request(`/students/${id}/quizzes`),
  quiz: (trackerId) => request(`/quizzes/${trackerId}`),

  reports: (limit = 50) => request(`/reports?limit=${limit}`),
  reportDownloadUrl: (id) => `${API_BASE}/admin/api/reports/${id}/download`,
  reportViewUrl: (id) => `${API_BASE}/admin/api/reports/${id}/view`,

  invoices: (limit = 100) => request(`/finance/invoices?limit=${limit}`),
  invoiceDownloadUrl: (id) => `${API_BASE}/admin/api/finance/invoices/${id}/download`,
  invoiceViewUrl: (id) => `${API_BASE}/admin/api/finance/invoices/${id}/view`,
  gstr1: (period) => request(`/finance/gstr1${period ? `?period=${period}` : ''}`),
  gstr1DownloadUrl: (period) => `${API_BASE}/admin/api/finance/gstr1/download?period=${period}`,
  dbExportUrl: () => `${API_BASE}/admin/api/db/export`,
  financeSummary: () => request('/finance/summary'),
  financeMonthly: (months = 12) => request(`/finance/monthly?months=${months}`),
  expenses: (limit = 100) => request(`/finance/expenses?limit=${limit}`),
  addExpense: (body) => request('/finance/expenses', { method: 'POST', body }),
  removeExpense: (id) => request(`/finance/expenses/${id}`, { method: 'DELETE' }),

  table: (name) => request(`/tables/${name}`),
  updateRow: (name, id, patch) => request(`/tables/${name}/${id}`, { method: 'PATCH', body: patch }),

  support: () => request('/support'),
  updateTicket: (id, status, resolution) => request(`/support/${id}`, { method: 'PATCH', body: { status, resolution } }),

  // Recover a paid-but-unactivated payment by its Razorpay payment id.
  reconcilePayment: (payment_id, token) =>
    request('/pay/reconcile', { method: 'POST', body: { payment_id, token }, quiet: true }),

  // Delete a mobile + its dependent rows, OTP-gated, refused if it ever transacted.
  mobileLookup: (mobile) => request(`/mobiles/lookup?mobile=${encodeURIComponent(mobile)}`),
  mobilePurgeOtp: (mobile) => request('/mobiles/purge/request-otp', { method: 'POST', body: { mobile }, quiet: true }),
  mobilePurge: (mobile, otp) => request('/mobiles/purge', { method: 'POST', body: { mobile, otp }, quiet: true }),

  templates: () => request('/templates'),
  createTemplate: (body) => request('/templates', { method: 'POST', body }),
  updateTemplate: (id, body) => request(`/templates/${id}`, { method: 'PATCH', body }),
  deleteTemplate: (id) => request(`/templates/${id}`, { method: 'DELETE' }),

  system: () => request('/system'),
  paymentMode: () => request('/payment-mode'),
  requestModeOtp: () => request('/payment-mode/request-otp', { method: 'POST', body: {} }),
  setPaymentMode: (mode, otp) => request('/payment-mode', { method: 'PUT', body: { mode, otp } }),
  admins: () => request('/admins'),
  requestAdminOtp: (mobile) => request('/admins/request-otp', { method: 'POST', body: { mobile } }),
  addAdmin: (mobile, otp) => request('/admins', { method: 'POST', body: { mobile, otp } }),
  removeAdmin: (mobile) => request(`/admins/${mobile}`, { method: 'DELETE' }),

  waSessions: ({ q = '', limit = 25, offset = 0 } = {}) =>
    request(`/whatsapp/sessions?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}`),
  waThread: (id) => request(`/whatsapp/sessions/${id}`),
  waRaw: (id) => request(`/whatsapp/messages/${id}/raw`),

  visitors: () => request('/visitors'),
  visitorsRecent: (limit = 60) => request(`/visitors/recent?limit=${limit}`),
  visitorsGrouped: (kind = 'all') => request(`/visitors/grouped?kind=${kind}`),
  visitorsGeo: () => request('/visitors/geo'),

  broadcastOptions: () => request('/broadcast/options'),
  broadcastPreview: (body) => request('/broadcast/preview', { method: 'POST', body }),
  broadcastSend: (body) => request('/broadcast/send', { method: 'POST', body }),
  broadcastSegmentPeople: (segment) =>
    request(`/broadcast/segment-people?segment=${encodeURIComponent(segment)}`),
  broadcastDirect: (body) => request('/broadcast/direct', { method: 'POST', body }),

  holidays: (all = false) => request(`/holidays${all ? '?all=1' : ''}`),
  holidayAdd: (date, label) => request('/holidays', { method: 'POST', body: { date, label } }),
  holidayRemove: (date) => request(`/holidays/${date}`, { method: 'DELETE' }),
  setVisitorsInbox: (inbox_on) => request('/visitors/settings', { method: 'PATCH', body: { inbox_on } }),

  enquiries: (status) => request(`/enquiries${status ? `?status=${status}` : ''}`),
  updateEnquiry: (id, status) => request(`/enquiries/${id}`, { method: 'PATCH', body: { status } }),
  adminTestimonials: () => request('/testimonials'),
  updateTestimonial: (id, body) => request(`/testimonials/${id}`, { method: 'PATCH', body }),
  promotable: () => request('/feedback/promotable'),
  feedbackAllRatings: () => request('/feedback/all'),
  promoteFeedback: (id) => request(`/feedback/${id}/promote`, { method: 'POST', body: {} }),

  activity: ({ limit = 60, since = null, kinds = null } = {}) => {
    const p = new URLSearchParams({ limit });
    if (since) p.set('since', since);
    if (kinds && kinds.length) p.set('kinds', kinds.join(','));
    return request(`/activity?${p}`);
  },

  questions: (f = {}) => {
    const p = new URLSearchParams();
    Object.entries(f).forEach(([k, v]) => { if (v !== '' && v != null) p.set(k, v); });
    return request(`/questions?${p}`);
  },
  questionFacets: () => request('/questions/facets'),
  updateQuestion: (id, body) => request(`/questions/${id}`, { method: 'PATCH', body }),
  deleteQuestion: (id) => request(`/questions/${id}`, { method: 'DELETE' }),
  importPreview: (body) => request('/questions/import/preview', { method: 'POST', body }),
  importCommit: (body) => request('/questions/import/commit', { method: 'POST', body }),
};

/**
 * Downloads need the token too, and an <a href> cannot send headers — so fetch
 * the bytes, then hand the browser a blob.
 */
/**
 * Open an admin PDF inline in a new tab. An <a href> cannot carry the Bearer
 * token, so fetch the bytes and open a blob URL instead. Shared by every page
 * that shows an invoice or report, so the behaviour stays identical wherever a
 * PDF is opened.
 */
export async function viewPdf(url) {
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (!res.ok) throw new Error('open failed');
    const obj = URL.createObjectURL(await res.blob());
    window.open(obj, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(obj), 60000);
  } catch { /* ignore — download is the reliable path */ }
}

export async function download(url, filename) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!res.ok) throw new Error('Download failed.');
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}
