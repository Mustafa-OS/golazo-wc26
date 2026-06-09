// ============================================================================
// MOCK AUTH + STORE  (MOCK_MODE only)
// ----------------------------------------------------------------------------
// A tiny localStorage stand-in for Firebase Auth + the users collection so the
// FULL first-run experience (Continue with Google -> onboard -> play) works with
// no backend. Mirrors the surface the live AuthContext uses.
//   - signInGoogle(): a fresh account that needs onboarding (name + shortcode)
//   - signInDemo():   a pre-baked, already-onboarded persona ("You")
// ============================================================================

const LS_USERS = 'over.mock.users';
const LS_SESSION = 'over.mock.session';

const read = (k, d) => {
  try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; }
};
const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));

// A pre-baked persona behind the one-tap "Try the demo" button.
const DEMO_UID = 'me';
const DEMO_USER = {
  uid: DEMO_UID,
  email: 'demo@imperial.ac.uk',
  name: 'You',
  shortcode: 'YOU24',
  year: 2024,
  points: 309,
  onboarded: true,
};

function allUsers() {
  const users = read(LS_USERS, null);
  if (users) return users;
  const seed = { [DEMO_USER.email]: { ...DEMO_USER } };
  write(LS_USERS, seed);
  return seed;
}

const rid = () => 'mock-' + Math.random().toString(36).slice(2, 10);

export function currentUser() {
  const uid = read(LS_SESSION, null);
  if (!uid) return null;
  const users = allUsers();
  const rec = Object.values(users).find((u) => u.uid === uid);
  return rec ? { ...rec } : null;
}

// Mock "Sign in with Google": a fresh personal-Google account that still needs
// to onboard (no name/shortcode yet) — so the onboarding step is exercised.
export function signInGoogle() {
  const users = allUsers();
  const email = 'student@gmail.com';
  let rec = users[email];
  if (!rec) {
    rec = { uid: rid(), email, onboarded: false, points: 0 };
    users[email] = rec;
    write(LS_USERS, users);
  }
  write(LS_SESSION, rec.uid);
  return { ...rec };
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
  return { ...users[key] };
}
