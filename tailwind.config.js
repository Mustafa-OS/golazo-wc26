/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Anton', 'sans-serif'],
        body: ['"Hanken Grotesk"', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Fixed dark navy — used as TEXT on bright accent buttons + translucent
        // pills on lime (text-ink, bg-ink/20). NOT the page background.
        ink: '#070E1A',
        // Theme-aware (CSS vars flip between light/dark — see index.css).
        bg: 'rgb(var(--bg) / <alpha-value>)',          // page background
        panel: 'rgb(var(--panel) / <alpha-value>)',    // card
        panel2: 'rgb(var(--panel2) / <alpha-value>)',  // raised card
        line: 'rgb(var(--line) / <alpha-value>)',      // borders
        mist: 'rgb(var(--mist) / <alpha-value>)',      // muted text
        fg: 'rgb(var(--fg) / <alpha-value>)',          // primary text
        // Fixed brand accents (legible on both themes).
        more: '#C6FF3E',       // electric lime  (MORE)
        less: '#FF5C7A',       // hot coral      (LESS)
        gold: '#FFC83D',       // points / trophy
        azure: '#37C5FF',      // vivid blue
        grape: '#9B6CFF',      // purple
        flame: '#FF8A3D',      // orange
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(198,255,62,0.4), 0 8px 30px -8px rgba(198,255,62,0.35)',
        glowless: '0 0 0 1px rgba(255,92,122,0.4), 0 8px 30px -8px rgba(255,92,122,0.35)',
      },
    },
  },
  plugins: [],
};
