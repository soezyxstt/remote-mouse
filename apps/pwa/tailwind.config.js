/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0a0f1d',
        surface: '#131b2e',
        'surface-elevated': '#1d2843',
        'surface-hover': '#243254',
        primary: {
          DEFAULT: '#3b82f6',
          hover: '#2563eb',
          glow: 'rgba(59, 130, 246, 0.25)',
        },
        accent: '#06b6d4',
        danger: '#ef4444',
        success: '#10b981',
      },
      touchAction: {
        'none': 'none',
        'manipulation': 'manipulation',
      },
    },
  },
  plugins: [],
};
