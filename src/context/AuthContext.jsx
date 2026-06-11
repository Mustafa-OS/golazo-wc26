// ============================================================================
// AUTH CONTEXT
// ----------------------------------------------------------------------------
// Sign-in is Google-only. Flow:
//   signed out -> "Continue with Google" -> onboarding (pick a display name) ->
//   ready. Open sign-up — anyone with a Google account can play.
//
//   MOCK_MODE -> localStorage stand-in (src/lib/mockAuth.js)
//   live/emu  -> Firebase Auth (Google) + the users/{uid} Firestore doc
//
// status:  'loading' | 'signedOut' | 'needsOnboarding' | 'ready'
// user:    { uid, email, name, points } once onboarded
// ============================================================================

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { MOCK_MODE, EMULATOR_MODE, auth, db } from '../firebase.js';
import * as mock from '../lib/mockAuth.js';

export const MODE = MOCK_MODE ? 'mock' : EMULATOR_MODE ? 'emulator' : 'live';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

// Friendly text for the auth error codes we surface to users.
function friendly(code) {
  const map = {
    'auth/operation-not-allowed': 'Google sign-in isn’t switched on yet — try again shortly.',
    'auth/popup-closed-by-user': 'Sign-in cancelled.',
    'auth/cancelled-popup-request': 'Sign-in cancelled.',
    'auth/popup-blocked': 'Your browser blocked the sign-in popup — allow popups and retry.',
    'auth/account-exists-with-different-credential': 'That email is already registered with a different sign-in method.',
    'auth/network-request-failed': 'Network hiccup — check your connection and retry.',
    'auth/too-many-requests': 'Too many attempts — wait a moment and retry.',
  };
  return map[code] || 'Something went wrong. Please try again.';
}

// A profile is "ready" once it has a display name.
const isOnboarded = (data) => !!(data && data.name);

export function AuthProvider({ children }) {
  const [status, setStatus] = useState('loading');
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // ---- bootstrap + subscribe ------------------------------------------------
  useEffect(() => {
    if (MOCK_MODE) {
      const u = mock.currentUser();
      if (!u) setStatus('signedOut');
      else if (!isOnboarded(u)) { setUser({ ...u }); setStatus('needsOnboarding'); }
      else { setUser(u); setStatus('ready'); }
      return;
    }

    // Live / emulator: react to auth changes, then live-subscribe the profile.
    let unsubAuth = null;
    let unsubProfile = null;
    let cancelled = false;

    (async () => {
      const { onAuthStateChanged } = await import('firebase/auth');
      const { doc, onSnapshot } = await import('firebase/firestore');
      if (cancelled) return;
      unsubAuth = onAuthStateChanged(auth, (fbUser) => {
        if (unsubProfile) { unsubProfile(); unsubProfile = null; }
        if (!fbUser) { setUser(null); setStatus('signedOut'); return; }
        const ref = doc(db, 'users', fbUser.uid);
        unsubProfile = onSnapshot(ref, (snap) => {
          const data = snap.exists() ? snap.data() : null;
          if (isOnboarded(data)) {
            setUser({ uid: fbUser.uid, email: fbUser.email, points: 0, ...data });
            setStatus('ready');
          } else {
            // displayName (from Google) pre-fills the onboarding name field.
            setUser({ uid: fbUser.uid, email: fbUser.email, displayName: fbUser.displayName });
            setStatus('needsOnboarding');
          }
        });
      });
    })();

    return () => {
      cancelled = true;
      if (unsubProfile) unsubProfile();
      if (unsubAuth) unsubAuth();
    };
  }, []);

  // ---- actions --------------------------------------------------------------
  const signInDemo = useCallback(async () => {
    setError('');
    if (MOCK_MODE) {
      const u = mock.signInDemo();
      setUser(u);
      setStatus('ready');
      return true;
    }
    setError('Demo mode is only available offline.');
    return false;
  }, []);

  // The one and only sign-in. Live: Google popup. Mock: a fresh "Google" user
  // that lands on onboarding so the full flow is testable offline.
  const signInGoogle = useCallback(async () => {
    setError('');
    if (MOCK_MODE) {
      const u = mock.signInGoogle();
      if (!isOnboarded(u)) { setUser({ ...u }); setStatus('needsOnboarding'); }
      else { setUser(u); setStatus('ready'); }
      return true;
    }
    setBusy(true);
    try {
      const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
      return true; // onAuthStateChanged -> onboarding (new) or ready (returning)
    } catch (e) {
      setError(friendly(e.code || e.message));
      return false;
    } finally { setBusy(false); }
  }, []);

  const completeOnboarding = useCallback(async ({ name }) => {
    setError('');
    if (!name?.trim()) { setError('Add a display name to continue.'); return false; }
    setBusy(true);
    try {
      const profile = { name: name.trim(), onboarded: true };
      if (MOCK_MODE) {
        const u = mock.currentUser();
        const updated = mock.updateProfile(u.uid, profile);
        setUser(updated);
        setStatus('ready');
      } else {
        const { setDoc, doc, serverTimestamp } = await import('firebase/firestore');
        const fbUser = auth.currentUser;
        await setDoc(
          doc(db, 'users', fbUser.uid),
          { uid: fbUser.uid, email: fbUser.email, points: 0, createdAt: serverTimestamp(), ...profile },
          { merge: true }
        );
        // onSnapshot flips status to 'ready'
      }
      return true;
    } catch (e) {
      setError(friendly(e.code || e.message));
      return false;
    } finally { setBusy(false); }
  }, []);

  const signOutNow = useCallback(async () => {
    if (MOCK_MODE) {
      mock.signOut();
      setUser(null);
      setStatus('signedOut');
    } else {
      const { signOut } = await import('firebase/auth');
      await signOut(auth);
    }
  }, []);

  const value = {
    mode: MODE, status, user, error, busy,
    setError,
    signInGoogle, signInDemo, completeOnboarding, signOut: signOutNow,
  };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
