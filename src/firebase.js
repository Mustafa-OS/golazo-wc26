// ============================================================================
// FIREBASE INIT  (guarded)
// ----------------------------------------------------------------------------
// If env vars are present -> real Firebase. If not -> MOCK_MODE, and the app
// runs entirely on mockData.js so you can develop the UI before the backend
// exists. Fill .env (see .env.example) to flip to live.
// ============================================================================

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

const cfg = {
  apiKey: import.meta.env.VITE_FB_API_KEY,
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FB_PROJECT_ID,
  appId: import.meta.env.VITE_FB_APP_ID,
};

export const MOCK_MODE = !cfg.apiKey;

let auth = null, dbf = null, fns = null;
if (!MOCK_MODE) {
  const app = initializeApp(cfg);
  auth = getAuth(app);
  dbf = getFirestore(app);
  fns = getFunctions(app);
}

export { auth, dbf as db, fns };
