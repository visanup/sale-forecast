import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#d9eaff',
          200: '#b9d7ff',
          300: '#8abbff',
          400: '#5a97ff',
          500: '#2f6dff',
          600: '#1f4fe6',
          700: '#1c3fba',
          800: '#1a3696',
          900: '#182f7a'
        }
      },
      boxShadow: {
        card: '0 8px 30px rgba(0,0,0,0.08)'
      }
    }
  },
  plugins: []
} satisfies Config;


