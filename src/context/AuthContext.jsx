// ============================================================================
// AUTH CONTEXT
// ----------------------------------------------------------------------------
// One auth surface for the whole app, regardless of backend:
//   MOCK_MODE -> localStorage mock (src/lib/mockAuth.js)
//   live/emu  -> Firebase Auth + the users/{uid} Firestore doc
//
// status:  'loading' | 'signedOut' | 'needsOnboarding' | 'ready'
// user:    { uid, email, name, dept, points, streak } once onboarded
// ============================================================================

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { MOCK_MODE, EMULATOR_MODE, auth, db } from '../firebase.js';
import { ALLOWED_EMAIL_DOMAINS } from '../config.js';
import * as mock from '../lib/mockAuth.js';

export const MODE = MOCK_MODE ? 'mock' : EMULATOR_MODE ? 'emulator' : 'live';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

// Friendly text for the Firebase/mock error codes we surface to users.
function friendly(code) {
  const map = {
    'auth/email-already-in-use': 'That email is already registered. Try signing in.',
    'auth/invalid-credential': 'Email or password is incorrect.',
    'auth/invalid-email': 'That doesn’t look like a valid email.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/user-not-found': 'No account found for that email.',
    'auth/wrong-password': 'Email or password is incorrect.',
    'auth/too-many-requests': 'Too many attempts — wait a moment and retry.',
    'auth/operation-not-allowed': 'Microsoft sign-in isn’t switched on yet.',
    'auth/popup-closed-by-user': 'Sign-in cancelled.',
    'auth/cancelled-popup-request': 'Sign-in cancelled.',
    'auth/popup-blocked': 'Your browser blocked the sign-in popup — allow popups and retry.',
    'auth/account-exists-with-different-credential': 'That email is already registered with a different sign-in method.',
  };
  return map[code] || 'Something went wrong. Please try again.';
}

// When ALLOWED_EMAIL_DOMAINS is null/empty the app is open to any email.
function isAllowedEmail(email) {
  if (!ALLOWED_EMAIL_DOMAINS || !ALLOWED_EMAIL_DOMAINS.length) return true;
  const e = email.trim().toLowerCase();
  return ALLOWED_EMAIL_DOMAINS.some((d) => e.endsWith(d));
}

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
      else if (!u.name) setStatus('needsOnboarding');
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
          if (data && data.name) {
            setUser({ uid: fbUser.uid, email: fbUser.email, points: 0, streak: 0, ...data });
            setStatus('ready');
          } else {
            // displayName (from Microsoft) pre-fills the onboarding name field.
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
  const signUp = useCallback(async (email, password) => {
    setError('');
    if (!isAllowedEmail(email)) {
      setError(`Use your Imperial email (${(ALLOWED_EMAIL_DOMAINS || []).join(' or ')}).`);
      return false;
    }
    if (!password || password.length < 6) { setError(friendly('auth/weak-password')); return false; }
    setBusy(true);
    try {
      if (MOCK_MODE) {
        mock.signUp(email, password);
        setStatus('needsOnboarding');
      } else {
        const { createUserWithEmailAndPassword } = await import('firebase/auth');
        await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
        // onAuthStateChanged -> needsOnboarding (no profile yet)
      }
      return true;
    } catch (e) {
      setError(friendly(e.code || e.message));
      return false;
    } finally { setBusy(false); }
  }, []);

  const signIn = useCallback(async (email, password) => {
    setError('');
    setBusy(true);
    try {
      if (MOCK_MODE) {
        const u = mock.signIn(email, password);
        if (!u.name) setStatus('needsOnboarding');
        else { setUser(u); setStatus('ready'); }
      } else {
        const { signInWithEmailAndPassword } = await import('firebase/auth');
        await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      }
      return true;
    } catch (e) {
      setError(friendly(e.code || e.message));
      return false;
    } finally { setBusy(false); }
  }, []);

  const signInDemo = useCallback(async () => {
    setError('');
    if (MOCK_MODE) {
      const u = mock.signInDemo();
      setUser(u);
      setStatus('ready');
      return true;
    }
    // Live: best-effort anonymous-style demo isn't enabled; nudge to real auth.
    setError('Demo mode is only available offline. Please sign up.');
    return false;
  }, []);

  // One-tap sign-in with an Imperial Microsoft (Office 365) account. No password,
  // no reset emails — and it genuinely verifies the @imperial.ac.uk address.
  const signInMicrosoft = useCallback(async () => {
    setError('');
    if (MOCK_MODE) { setError('Microsoft sign-in needs the live app.'); return false; }
    setBusy(true);
    try {
      const { OAuthProvider, signInWithPopup, signOut } = await import('firebase/auth');
      const provider = new OAuthProvider('microsoft.com');
      provider.addScope('email');
      provider.setCustomParameters({ prompt: 'select_account' });
      const res = await signInWithPopup(auth, provider);
      const email = res.user?.email || '';
      if (!isAllowedEmail(email)) {
        await signOut(auth);
        setError(`Use your Imperial Microsoft account (${(ALLOWED_EMAIL_DOMAINS || []).join(' or ')}).`);
        return false;
      }
      return true; // onAuthStateChanged -> onboarding (new) or ready (returning)
    } catch (e) {
      setError(friendly(e.code || e.message));
      return false;
    } finally { setBusy(false); }
  }, []);

  const completeOnboarding = useCallback(async ({ name, dept }) => {
    setError('');
    if (!name?.trim()) { setError('Add a display name to continue.'); return false; }
    const cleanDept = (dept || '').trim(); // department is optional
    setBusy(true);
    try {
      if (MOCK_MODE) {
        const u = mock.currentUser();
        const updated = mock.updateProfile(u.uid, { name: name.trim(), dept: cleanDept, onboarded: true });
        setUser(updated);
        setStatus('ready');
      } else {
        const { setDoc, doc, serverTimestamp } = await import('firebase/firestore');
        const fbUser = auth.currentUser;
        await setDoc(
          doc(db, 'users', fbUser.uid),
          {
            uid: fbUser.uid,
            email: fbUser.email,
            name: name.trim(),
            dept: cleanDept,
            points: 0,
            streak: 0,
            onboarded: true,
            createdAt: serverTimestamp(),
          },
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

  // Send a password-reset email (so a forgotten password never loses an account).
  const resetPassword = useCallback(async (email) => {
    setError('');
    if (!email?.trim()) { setError('Enter your email above first, then tap Forgot password again to get a reset link.'); return false; }
    if (!isAllowedEmail(email)) {
      setError(`Use your Imperial email (${(ALLOWED_EMAIL_DOMAINS || []).join(' or ')}).`);
      return false;
    }
    setBusy(true);
    try {
      if (!MOCK_MODE) {
        const { sendPasswordResetEmail } = await import('firebase/auth');
        await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      }
      // Mock mode has no email; resolve as if sent. Live uses Firebase's own
      // reset email + flow (no extra pages to build).
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
    signUp, signIn, signInDemo, signInMicrosoft, resetPassword, completeOnboarding, signOut: signOutNow,
  };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
