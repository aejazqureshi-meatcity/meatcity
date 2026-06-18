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
        gold: '#D4AF37',
        black: '#111111',
        white: '#FFFFFF',
        background: '#F8F9FA',
        surface: '#111111',
        "text-primary": '#FFFFFF',
        "text-secondary": '#B8B8B8',
        border: 'rgba(255,255,255,0.08)'
      },
      borderRadius: {
        DEFAULT: '16px',
        btn: '12px'
      },
      spacing: {
        container: '480px'
      }
    }
  },
  plugins: []
};
