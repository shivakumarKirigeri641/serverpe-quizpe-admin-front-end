/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#075e54', light: '#13b48f', accent: '#00a884', deep: '#053f38' },
        ink: '#111b21', muted: '#667781', line: '#e3eae8',
      },
      fontFamily: { sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'] },
      boxShadow: { card: '0 1px 3px rgba(16,24,40,.06), 0 6px 20px rgba(16,24,40,.06)' },
    },
  },
  plugins: [],
};
