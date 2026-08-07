/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ledger: {
          DEFAULT: '#16332B',
          dark: '#0E241D',
          light: '#24493D',
        },
        paper: '#F5F1E6',
        ink: '#1C1B18',
        brass: {
          DEFAULT: '#B08D45',
          light: '#D8B876',
        },
        rule: '#D8D2BF',
        redact: '#8B3A3A',
      },
      fontFamily: {
        display: ['"Fraunces"', 'ui-serif', 'Georgia', 'serif'],
        body: ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
    },
  },
  plugins: [],
}
