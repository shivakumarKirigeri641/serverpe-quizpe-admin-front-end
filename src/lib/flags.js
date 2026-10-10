/*
 * WHATSAPP IN THE ADMIN (user, 2026-10-10: "in the QuizPe admin hide the WhatsApp
 * based parts, and start with web based activities"). WhatsApp is gone; parents use
 * quizpe.in/app. Off unless the build sets VITE_WHATSAPP_ADMIN=1 — then the WhatsApp
 * menu, its graphs, the shared Meta limit and Meta news come back unchanged.
 */
export const WHATSAPP_ADMIN = String(import.meta.env.VITE_WHATSAPP_ADMIN || '') === '1';
