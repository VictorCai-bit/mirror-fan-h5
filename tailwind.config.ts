import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: '#0B0A1A',
        surface: '#14122A',
        elevated: '#1B1838',
        primary: { 500: '#FF3D8B' },
        accent: { 500: '#8B5CF6' },
        success: { 500: '#10B981' },
        info: { 500: '#60A5FA' },
        warn: { 500: '#F59E0B' },
        danger: { 500: '#EF4444' },
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
