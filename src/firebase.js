// ============================================================================
// FIREBASE INIT  (guarded, three modes)
// ----------------------------------------------------------------------------
//   MOCK_MODE      no env + no emulator  -> app runs entirely on mockData.js.
//                  This is the default `npm run dev` experience.
//   EMULATOR_MODE  VITE_FB_EMULATOR=1    -> real Firebase SDK wired to the local
//                  Emulator Suite (auth/firestore/functions). Offline, no creds.
//                  Used by `npm run dev:emulator` to test the live code path.
//   LIVE           VITE_FB_API_KEY set   -> real Firebase project.
//
// Fill .env (see .env.example) to go live. Leaving it blank keeps MOCK_MODE.
// ============================================================================

import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const useEmulator = import.meta.env.VITE_FB_EMULATOR === '1';

const liveCfg = {
  apiKey: import.meta.env.VITE_FB_API_KEY,
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FB_PROJECT_ID,
  appId: import.meta.env.VITE_FB_APP_ID,
};

// The emulator runs fully offline against a "demo-" project — no real key needed.
const emulatorCfg = {
  apiKey: 'demo-key',
  authDomain: 'localhost',
  projectId: 'demo-over-wc26',
  appId: 'demo-app',
};

const cfg = useEmulator ? emulatorCfg : liveCfg;

// MOCK_MODE = no backend at all. EMULATOR_MODE is a live path (just local).
export const MOCK_MODE = !cfg.apiKey;
export const EMULATOR_MODE = useEmulator;

let auth = null, dbf = null, fns = null;
if (!MOCK_MODE) {
  const app = initializeApp(cfg);
  auth = getAuth(app);
  dbf = getFirestore(app);
  fns = getFunctions(app);
  if (useEmulator) {
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    connectFirestoreEmulator(dbf, 'localhost', 8080);
    connectFunctionsEmulator(fns, 'localhost', 5001);
  }
}

export { auth, dbf as db, fns };
