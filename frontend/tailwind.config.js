/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'primary-blue': 'var(--primary-blue)',
        'primary-indigo': 'var(--primary-indigo)',
        'primary-violet': 'var(--primary-violet)',
        'primary-light-indigo': 'var(--primary-light-indigo)',
        'primary-light-violet': 'var(--primary-light-violet)',
        'surface-background': 'var(--surface-background)',
        'surface-card': 'var(--surface-card)',
        'surface-border': 'var(--surface-border)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
      },
      fontFamily: { sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'] },
      boxShadow: { card: '0 1px 3px rgba(79, 70, 229, 0.08), 0 1px 2px rgba(0,0,0,0.04)' },
    },
  },
  plugins: [],
}
