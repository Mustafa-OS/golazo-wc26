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
        ink: '#070E1A',        // deep navy base
        panel: '#0F1B30',      // card
        panel2: '#16263F',     // raised card
        line: '#23344f',       // borders
        more: '#C6FF3E',       // electric lime  (MORE)
        less: '#FF5C7A',       // hot coral      (LESS)
        gold: '#FFC83D',       // points / streak
        mist: '#8DA0BC',       // muted text
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(198,255,62,0.4), 0 8px 30px -8px rgba(198,255,62,0.35)',
        glowless: '0 0 0 1px rgba(255,92,122,0.4), 0 8px 30px -8px rgba(255,92,122,0.35)',
      },
    },
  },
  plugins: [],
};
