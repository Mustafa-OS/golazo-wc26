import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
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
