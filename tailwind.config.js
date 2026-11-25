/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./App.tsx",
    "./index.tsx",
    "./constants.tsx",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./contexts/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
    "./utils/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        "primary": "#4A7C59",
        "primary-dark": "#3B6547",
        "primary-light": "#EAF2EC",
        "background": "var(--terra-canvas)",
        "surface": "var(--terra-surface)",
        "surface-subtle": "var(--terra-soft)",
        "surface-border": "var(--terra-border)",
        "graphite": "var(--terra-ink)",
        "graphite-muted": "var(--terra-muted)",
        "clay": "#B25E41",
        "clay-light": "#FAECE7",
        "clay-border": "#EBD2C9",
        "warm-amber": "#C48C3B",
        "slate-pine": "#50756C"
      },
      fontFamily: {
        sans: ['"Nunito Sans"', 'system-ui', 'sans-serif'],
        headline: ['"Literata"', 'serif'],
        body: ['"Nunito Sans"', 'system-ui', 'sans-serif'],
        display: ['"Literata"', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'soft': '0 10px 40px -10px rgba(0, 0, 0, 0.08)'
      }
    },
  },
  plugins: [],
}
