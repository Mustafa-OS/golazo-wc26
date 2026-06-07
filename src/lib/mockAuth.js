// ============================================================================
// MOCK AUTH + STORE  (MOCK_MODE only)
// ----------------------------------------------------------------------------
// A tiny localStorage-backed stand-in for Firebase Auth + the users collection,
// so the FULL first-run experience (sign up -> onboard -> play) works with no
// backend. Mirrors the surface the live AuthContext uses, so the UI is identical
// whether we're on mock data or real Firebase.
//
// Passwords are stored in plaintext in localStorage — this is a throwaway demo
// backend, never used once VITE_FB_API_KEY (or the emulator) is present.
// ============================================================================

const LS_USERS = 'over.mock.users';
const LS_SESSION = 'over.mock.session';

const read = (k, d) => {
  try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; }
};
const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));

// A pre-baked persona behind the one-tap "Try the demo" button, so the demo
// lands in a lived-in account instead of an empty one.
const DEMO_UID = 'me';
const DEMO_USER = {
  uid: DEMO_UID,
  email: 'demo@imperial.ac.uk',
  name: 'You',
  dept: 'Design Eng',
  points: 309,
  streak: 3,
  onboarded: true,
};

function allUsers() {
  const users = read(LS_USERS, null);
  if (users) return users;
  const seed = { [DEMO_USER.email]: { ...DEMO_USER, password: 'demo' } };
  write(LS_USERS, seed);
  return seed;
}

const rid = () => 'mock-' + Math.random().toString(36).slice(2, 10);

export function currentUser() {
  const uid = read(LS_SESSION, null);
  if (!uid) return null;
  const users = allUsers();
  const rec = Object.values(users).find((u) => u.uid === uid);
  if (!rec) return null;
  const { password, ...safe } = rec;
  return safe;
}

export function signUp(email, password) {
  const users = allUsers();
  const key = email.toLowerCase();
  if (users[key]) throw new Error('auth/email-already-in-use');
  const user = { uid: rid(), email: key, password, onboarded: false, points: 0, streak: 0 };
  users[key] = user;
  write(LS_USERS, users);
  write(LS_SESSION, user.uid);
  const { password: _, ...safe } = user;
  return safe;
}

export function signIn(email, password) {
  const users = allUsers();
  const rec = users[email.toLowerCase()];
  if (!rec || rec.password !== password) throw new Error('auth/invalid-credential');
  write(LS_SESSION, rec.uid);
  const { password: _, ...safe } = rec;
  return safe;
}

export function signInDemo() {
  allUsers(); // ensure seeded
  write(LS_SESSION, DEMO_UID);
  return { ...DEMO_USER };
}

export function signOut() {
  localStorage.removeItem(LS_SESSION);
}

export function updateProfile(uid, patch) {
  const users = allUsers();
  const key = Object.keys(users).find((k) => users[k].uid === uid);
  if (!key) throw new Error('auth/user-not-found');
  users[key] = { ...users[key], ...patch };
  write(LS_USERS, users);
  const { password: _, ...safe } = users[key];
  return safe;
}
