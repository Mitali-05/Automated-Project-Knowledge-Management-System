/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary-blue': 'var(--primary-blue)',
        'primary-indigo': 'var(--primary-indigo)',
        'primary-violet': 'var(--primary-violet)',
        'primary-light-blue': 'var(--primary-light-blue, #EFF6FF)',
        'primary-light-indigo': 'var(--primary-light-indigo)',
        'primary-light-violet': 'var(--primary-light-violet, #F5F3FF)',
        'surface-background': 'var(--surface-background)',
        'surface-card': 'var(--surface-card)',
        'surface-border': 'var(--surface-border)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
