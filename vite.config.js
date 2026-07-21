import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
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
