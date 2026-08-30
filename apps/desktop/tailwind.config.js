/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0c111d',
        surface: '#161e31',
        'surface-elevated': '#202b46',
        'surface-hover': '#2a385b',
        primary: {
          DEFAULT: '#3b82f6',
          hover: '#2563eb',
        },
        accent: '#06b6d4',
      },
    },
  },
  plugins: [],
};
