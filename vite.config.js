import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // served from /admin by the back-end in production
  base: '/admin/',
  plugins: [react()],
  server: {
    port: 5173,
    // Talk to the QuizPe back-end without CORS headaches in development.
    proxy: {
      '/admin/api': { target: 'http://localhost:5008', changeOrigin: true },
      // logos and brand assets come from the back-end, never duplicated here
      '/assets': { target: 'http://localhost:5008', changeOrigin: true },
    },
  },
});
