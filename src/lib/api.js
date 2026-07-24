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

async function request(path, { method = 'GET', body, signal } = {}) {
  const headers = { Accept: 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(`${API_BASE}/admin/api${path}`, {
      method, headers, signal,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(API_BASE
      ? `Cannot reach the server at ${API_BASE}. Please check your connection.`
      : 'Cannot reach the server. Is the back-end running on port 5008?');
  }

  if (res.status === 401) {
    clearToken();
    onUnauthorized();
    throw new Error('Session expired. Please sign in again.');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  requestOtp: (mobile) => request('/otp', { method: 'POST', body: { mobile } }),
  login: (mobile, code) => request('/login', { method: 'POST', body: { mobile, code } }),
  me: () => request('/me'),

  dashboard: () => request('/dashboard'),
  daily: (days = 30) => request(`/analytics/daily?days=${days}`),
  participation: (days = 30) => request(`/analytics/participation?days=${days}`),
  cohort: (date) => request(`/analytics/cohort${date ? `?date=${date}` : ''}`),
  plans: () => request('/analytics/plans'),
  engagement: () => request('/analytics/engagement'),
  boardGrade: (date) => request(`/analytics/board-grade${date ? `?date=${date}` : ''}`),
  launchOffer: () => request('/analytics/launch-offer'),
  feed: (limit = 50) => request(`/feed?limit=${limit}`),
  tonight: () => request('/tonight'),

  parents: ({ q = '', limit = 25, offset = 0 } = {}) =>
    request(`/parents?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}`),
  parent: (id) => request(`/parents/${id}`),
  lookups: () => request('/lookups'),
  updateParent: (id, body) => request(`/parents/${id}`, { method: 'PATCH', body }),
  mobilePreview: (id) => request(`/parents/${id}/mobile-preview`),
  changeMobile: (id, mobile, confirm) =>
    request(`/parents/${id}/mobile`, { method: 'POST', body: { mobile, confirm } }),
  addStudent: (parentId, body) => request(`/parents/${parentId}/students`, { method: 'POST', body }),
  updateStudent: (id, body) => request(`/students/${id}`, { method: 'PATCH', body }),
  studentQuizzes: (id) => request(`/students/${id}/quizzes`),
  quiz: (trackerId) => request(`/quizzes/${trackerId}`),

  reports: (limit = 50) => request(`/reports?limit=${limit}`),
  reportDownloadUrl: (id) => `/admin/api/reports/${id}/download`,

  invoices: (limit = 100) => request(`/finance/invoices?limit=${limit}`),
  gstr1: (period) => request(`/finance/gstr1${period ? `?period=${period}` : ''}`),
  financeSummary: () => request('/finance/summary'),
  financeMonthly: (months = 12) => request(`/finance/monthly?months=${months}`),
  expenses: (limit = 100) => request(`/finance/expenses?limit=${limit}`),
  addExpense: (body) => request('/finance/expenses', { method: 'POST', body }),
  removeExpense: (id) => request(`/finance/expenses/${id}`, { method: 'DELETE' }),

  table: (name) => request(`/tables/${name}`),
  updateRow: (name, id, patch) => request(`/tables/${name}/${id}`, { method: 'PATCH', body: patch }),

  support: () => request('/support'),
  updateTicket: (id, status) => request(`/support/${id}`, { method: 'PATCH', body: { status } }),

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

  enquiries: (status) => request(`/enquiries${status ? `?status=${status}` : ''}`),
  updateEnquiry: (id, status) => request(`/enquiries/${id}`, { method: 'PATCH', body: { status } }),
  adminTestimonials: () => request('/testimonials'),
  updateTestimonial: (id, body) => request(`/testimonials/${id}`, { method: 'PATCH', body }),
  promotable: () => request('/feedback/promotable'),
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
