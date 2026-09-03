/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary-blue': '#2563EB',
        'primary-indigo': '#4F46E5',
        'primary-violet': '#7C3AED',
        'primary-light-blue': '#EFF6FF',
        'primary-light-indigo': '#EEF2FF',
        'primary-light-violet': '#F5F3FF',
        'surface-background': '#F8FAFC',
        'surface-card': '#FFFFFF',
        'surface-border': '#E2E8F0',
        'text-primary': '#111827',
        'text-secondary': '#64748B',
        'text-muted': '#94A3B8',
      },
      fontFamily: {
        sans: ['Inter', 'Manrope', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
