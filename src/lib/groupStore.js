// ============================================================================
// GROUP STORE
// ----------------------------------------------------------------------------
// Private groups (leagues) you join by code. Same API over both backends:
//   MOCK_MODE -> a shared localStorage registry (so you can "join" a group a
//                demo persona created).
//   live/emu  -> `groups` collection; create writes directly (owner-checked by
//                rules), join goes through the `joinGroup` callable (which
//                validates the code server-side), exactly as the README intends.
// ============================================================================

import { MOCK_MODE, db, fns } from '../firebase.js';

const REG = 'over.mock.groups';

function randomCode(name) {
  const base = (name || 'WC').replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase() || 'WC';
  return base + Math.floor(Math.random() * 90 + 10);
}

// ---- mock shared registry --------------------------------------------------
function regRead() {
  let g;
  try { g = JSON.parse(localStorage.getItem(REG)); } catch { g = null; }
  if (!g) {
    g = [
      { id: 'g-dyson', name: 'Dyson DesEng', code: 'DYSON26', members: ['u1', 'u2'], ownerUid: 'u1', createdAt: 1 },
      { id: 'g-beit', name: 'Beit Halls Boys', code: 'BEIT99', members: ['u3'], ownerUid: 'u3', createdAt: 2 },
    ];
    localStorage.setItem(REG, JSON.stringify(g));
  }
  return g;
}
function regWrite(g) {
  localStorage.setItem(REG, JSON.stringify(g));
  window.dispatchEvent(new StorageEvent('storage', { key: REG }));
}

// ---- subscribe to the groups I'm in ----------------------------------------
export function subscribeMyGroups(uid, cb) {
  if (MOCK_MODE) {
    const mine = () => regRead().filter((g) => g.members.includes(uid));
    cb(mine());
    const h = (e) => { if (e.key === REG) cb(mine()); };
    window.addEventListener('storage', h);
    return () => window.removeEventListener('storage', h);
  }

  let unsub = () => {};
  (async () => {
    const { collection, query, where, orderBy, onSnapshot } = await import('firebase/firestore');
    const q = query(
      collection(db, 'groups'),
      where('members', 'array-contains', uid),
      orderBy('createdAt', 'desc')
    );
    unsub = onSnapshot(
      q,
      (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => console.error('groups subscription error', err)
    );
  })();
  return () => unsub();
}

// ---- create a group --------------------------------------------------------
export async function createGroup(uid, name) {
  const clean = (name || '').trim();
  if (!clean) throw new Error('Give your group a name.');
  const code = randomCode(clean);

  if (MOCK_MODE) {
    const g = { id: 'g-' + Date.now(), name: clean, code, members: [uid], ownerUid: uid, createdAt: Date.now() };
    regWrite([g, ...regRead()]);
    return g;
  }

  const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
  const ref = await addDoc(collection(db, 'groups'), {
    name: clean, code, members: [uid], ownerUid: uid, createdAt: serverTimestamp(),
  });
  return { id: ref.id, name: clean, code };
}

// ---- join a group by code --------------------------------------------------
export async function joinGroup(uid, code) {
  const c = (code || '').trim().toUpperCase();
  if (!c) throw new Error('Enter a join code.');

  if (MOCK_MODE) {
    const reg = regRead();
    const g = reg.find((x) => x.code === c);
    if (!g) throw new Error('No group with that code.');
    if (!g.members.includes(uid)) {
      g.members.push(uid);
      regWrite(reg);
    }
    return { groupId: g.id, name: g.name };
  }

  const { httpsCallable } = await import('firebase/functions');
  const call = httpsCallable(fns, 'joinGroup');
  try {
    const res = await call({ code: c });
    return res.data; // { groupId, name }
  } catch (e) {
    // surface the callable's friendly message
    throw new Error(e?.message || 'Could not join that group.');
  }
}
