import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Where `npm run dev` sends API calls. Defaults to the local back-end so admin
// actions in development can never hit PRODUCTION by accident — this panel can
// edit and delete real customer records, so the safe default matters here more
// than anywhere else. Set VITE_PROXY_TARGET deliberately to point elsewhere.
const API = process.env.VITE_PROXY_TARGET || 'http://localhost:5008';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Talk to the QuizPe back-end without CORS headaches in development.
    proxy: {
      '/admin/api': { target: API, changeOrigin: true },
      // logos and brand assets come from the back-end, never duplicated here
      '/assets': { target: API, changeOrigin: true },
    },
  },
});
