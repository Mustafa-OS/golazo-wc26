// ============================================================================
// DATA CONTEXT
// ----------------------------------------------------------------------------
// Provides the day's matches (each with its props) regardless of backend:
//   MOCK_MODE -> built from mockData via the shared lineEngine.
//   live/emu  -> realtime subscription to `matches` + each match's `props`
//                subcollection (the exact shape generateDailyProps writes).
//
// Per-match prop listeners (not a collectionGroup query) so the existing
// security rules — which authorise /matches/{id}/props/{pid} — are enough.
// ============================================================================

import React, { createContext, useContext, useEffect, useState } from 'react';
import { MOCK_MODE, db } from '../firebase.js';
import { MOCK_MATCHES, MOCK_LEADERBOARD } from '../lib/mockData.js';
import { buildMatchProps } from '../lib/lineEngine.js';

const DataCtx = createContext(null);
export const useData = () => useContext(DataCtx);

function buildMockMatches() {
  return MOCK_MATCHES.map((m) => ({ ...m, props: buildMatchProps(m) }));
}

export function DataProvider({ children }) {
  const [matches, setMatches] = useState(() => (MOCK_MODE ? buildMockMatches() : []));
  const [loading, setLoading] = useState(!MOCK_MODE);
  const [leaderboard, setLeaderboard] = useState(() => (MOCK_MODE ? MOCK_LEADERBOARD : []));

  // Imperial leaderboard (the `leaderboards/imperial` board the function rolls up).
  useEffect(() => {
    if (MOCK_MODE) return;
    let unsub = () => {};
    (async () => {
      const { doc, onSnapshot } = await import('firebase/firestore');
      unsub = onSnapshot(
        doc(db, 'leaderboards', 'imperial'),
        (snap) => setLeaderboard(snap.exists() ? snap.data().board || [] : []),
        (err) => console.error('leaderboard subscription error', err)
      );
    })();
    return () => unsub();
  }, []);

  useEffect(() => {
    if (MOCK_MODE) return;

    let cancelled = false;
    let unsubMatches = null;
    const propUnsubs = new Map(); // matchId -> unsubscribe
    const propData = new Map();   // matchId -> props[]
    let matchDocs = [];

    const publish = () =>
      setMatches(matchDocs.map((m) => ({ ...m, props: propData.get(m.id) || [] })));

    (async () => {
      const { collection, onSnapshot, query, orderBy } = await import('firebase/firestore');
      if (cancelled) return;

      const matchesQ = query(collection(db, 'matches'), orderBy('kickoff', 'asc'));
      unsubMatches = onSnapshot(
        matchesQ,
        (snap) => {
          matchDocs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          const ids = new Set(matchDocs.map((m) => m.id));

          // Drop listeners for matches that went away.
          for (const [id, unsub] of propUnsubs) {
            if (!ids.has(id)) { unsub(); propUnsubs.delete(id); propData.delete(id); }
          }
          // Add a props listener for each new match.
          for (const m of matchDocs) {
            if (!propUnsubs.has(m.id)) {
              const unsub = onSnapshot(collection(db, 'matches', m.id, 'props'), (ps) => {
                propData.set(m.id, ps.docs.map((d) => d.data()));
                publish();
              });
              propUnsubs.set(m.id, unsub);
            }
          }
          setLoading(false);
          publish();
        },
        (err) => { console.error('matches subscription error', err); setLoading(false); }
      );
    })();

    return () => {
      cancelled = true;
      if (unsubMatches) unsubMatches();
      for (const unsub of propUnsubs.values()) unsub();
    };
  }, []);

  return <DataCtx.Provider value={{ matches, loading, leaderboard }}>{children}</DataCtx.Provider>;
}
