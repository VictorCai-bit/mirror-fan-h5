import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /* App backgrounds */
        bg: '#0B0A1A',      // alias for base — used in sticky bars etc.
        base: '#0B0A1A',
        surface: '#14122A',
        elevated: '#1B1838',

        /* Brand / semantic palette — 400 = lighter, 500 = base */
        primary: {
          400: '#FF6FA6',
          500: '#FF3D8B',
        },
        accent: {
          400: '#A78BFA',
          500: '#8B5CF6',
        },
        success: {
          400: '#34D399',
          500: '#10B981',
        },
        info: {
          400: '#93C5FD',
          500: '#60A5FA',
        },
        warning: {
          400: '#FBBF24',
          500: '#F59E0B',
        },
        /* keep 'warn' for any legacy usage */
        warn: {
          400: '#FBBF24',
          500: '#F59E0B',
        },
        danger: {
          400: '#F87171',
          500: '#EF4444',
        },

        /* Text tokens */
        text: {
          primary: '#F4F4F5',
          secondary: '#9CA3AF',
        },
      },
      backgroundImage: {
        'accent-gradient': 'linear-gradient(135deg,#8B5CF6,#FF3D8B)',
        'creator-band': 'linear-gradient(90deg,#10B981,#60A5FA)',
      },
      fontFamily: {
        sans: ['Inter', 'PingFang SC', 'Noto Sans SC', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
