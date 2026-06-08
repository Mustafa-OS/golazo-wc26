// ============================================================================
// SLIP STORE
// ----------------------------------------------------------------------------
// One slip per user per day: doc id `${uid}_${day}` in the `slips` collection.
//   { uid, day, matchIds, picks, locked, updatedAt, lockedAt }
//
// Same API over both backends:
//   MOCK_MODE -> localStorage
//   live/emu  -> Firestore (subject to the slips security rules)
//
// `locked` is a one-way latch (enforced by the rule): once true, no more edits.
// ============================================================================

import { MOCK_MODE, db } from '../firebase.js';

export const todayKey = () => new Date().toISOString().slice(0, 10); // UTC, matches functions
const lsKey = (uid, day) => `over.slip.${uid}.${day}`;
const docId = (uid, day) => `${uid}_${day}`;

export function subscribeSlip(uid, day, cb) {
  if (MOCK_MODE) {
    const read = () => {
      try { return JSON.parse(localStorage.getItem(lsKey(uid, day))); } catch { return null; }
    };
    cb(read());
    const handler = (e) => { if (e.key === lsKey(uid, day)) cb(read()); };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }

  let unsub = () => {};
  (async () => {
    const { doc, onSnapshot } = await import('firebase/firestore');
    unsub = onSnapshot(
      doc(db, 'slips', docId(uid, day)),
      (snap) => cb(snap.exists() ? snap.data() : null),
      (err) => console.error('slip subscription error', err)
    );
  })();
  return () => unsub();
}

export async function writeSlip(uid, day, { picks, locked, mode = 'normal', captainId = null }) {
  const matchIds = [...new Set(picks.map((p) => p.matchId))];
  const payload = {
    uid, day, matchIds, picks,
    mode,
    captainId: mode === 'power' ? null : captainId, // captain only applies in normal mode
    locked: !!locked,
    updatedAt: Date.now(),
  };
  if (locked) payload.lockedAt = Date.now();

  if (MOCK_MODE) {
    localStorage.setItem(lsKey(uid, day), JSON.stringify(payload));
    // same-tab notify (storage event only fires cross-tab natively)
    window.dispatchEvent(new StorageEvent('storage', { key: lsKey(uid, day) }));
    return payload;
  }

  const { doc, setDoc } = await import('firebase/firestore');
  await setDoc(doc(db, 'slips', docId(uid, day)), payload, { merge: true });
  return payload;
}
