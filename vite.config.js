import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// On GitHub Pages the app is served from /<repo>/; everywhere else (local dev,
// Firebase Hosting) it's served from /. Derive the base from the repo name.
const base =
  process.env.GITHUB_PAGES === 'true' && process.env.GITHUB_REPOSITORY
    ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}/`
    : '/';

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 700, // the Firebase SDK vendor chunk is ~muchof this
    rollupOptions: {
      output: {
        // Split the Firebase SDK into its own chunk so the initial bundle stays
        // lean (and MOCK_MODE users don't pay for it on first paint).
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/functions'],
        },
      },
    },
  },
});
