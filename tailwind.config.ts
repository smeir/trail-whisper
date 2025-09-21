import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter", ui-sans-serif, system-ui'],
      },
      colors: {
        brand: {
          50: '#f2f7ff',
          100: '#d9e7ff',
          200: '#b3cfff',
          300: '#80adff',
          400: '#4d8bff',
          500: '#1a69ff',
          600: '#1451cc',
          700: '#0f3ca3',
          800: '#0a287a',
          900: '#051651',
        },
      },
      boxShadow: {
        soft: '0 10px 30px rgba(15, 60, 163, 0.12)',
      },
    },
  },
  plugins: [],
} satisfies Config
