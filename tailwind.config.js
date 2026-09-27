/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        'accent-fg': 'rgb(var(--accent-fg) / <alpha-value>)',
        ink: {
          950: 'rgb(var(--ink-950) / <alpha-value>)',
          900: 'rgb(var(--ink-900) / <alpha-value>)',
          850: 'rgb(var(--ink-850) / <alpha-value>)',
          800: 'rgb(var(--ink-800) / <alpha-value>)',
          700: 'rgb(var(--ink-700) / <alpha-value>)',
          600: 'rgb(var(--ink-600) / <alpha-value>)',
          500: 'rgb(var(--ink-500) / <alpha-value>)',
        },
        mist: {
          DEFAULT: 'rgb(var(--mist) / <alpha-value>)',
          muted: 'rgb(var(--mist-muted) / <alpha-value>)',
          dim: 'rgb(var(--mist-dim) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          600: 'rgb(var(--accent) / <alpha-value>)',
          500: 'rgb(var(--accent) / <alpha-value>)',
          400: 'rgb(var(--accent) / <alpha-value>)',
        },
      },
      opacity: { 12: '.12', 15: '.15' },
      boxShadow: {
        panel: '0 1px 3px rgb(0 0 0 / .05)',
        glow: '0 1px 2px rgb(var(--accent) / .18)',
      },
      backgroundImage: {
        'accent-grad': 'linear-gradient(135deg, rgb(var(--accent)), rgb(var(--secondary)))',
      },
    },
  },
  plugins: [],
};
