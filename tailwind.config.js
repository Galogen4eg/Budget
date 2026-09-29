/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./App.tsx",
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
        "background": "#F8F6F2",
        "surface": "#FFFFFF",
        "surface-subtle": "#F2EFEB",
        "surface-border": "#E6E2DA",
        "graphite": "#1E2923",
        "graphite-muted": "#68726B",
        "clay": "#B25E41",
        "clay-light": "#FAECE7",
        "clay-border": "#EBD2C9",
        "warm-amber": "#C48C3B",
        "slate-pine": "#50756C"
      },
      fontFamily: {
        sans: ['"Nunito Sans"', 'system-ui', 'sans-serif'],
        headline: ['"Literata"', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'soft': '0 10px 40px -10px rgba(0, 0, 0, 0.08)'
      }
    },
  },
  plugins: [],
}
