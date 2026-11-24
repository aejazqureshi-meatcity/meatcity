/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './src/app/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#D60000',
        'primary-hover': '#B80000',
        gold: '#D4AF37',
        'gold-light': '#F3E5AB',
        surface: 'var(--color-surface)',
        'surface-elevated': 'var(--color-surface-elevated)',
        background: 'var(--color-background)',
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        border: 'var(--color-border)',
      },
      borderRadius: {
        DEFAULT: '16px',
        btn: '12px',
        card: '16px',
      },
      spacing: {
        container: '480px'
      }
    }
  },
  plugins: []
};
