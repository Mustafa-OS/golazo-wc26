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
import { MOCK_MATCHES, MOCK_LEADERBOARD, MOCK_WEEKLY } from '../lib/mockData.js';
import { buildMatchProps } from '../lib/lineEngine.js';
import { buildMatchdays } from '../lib/matchday.js';

const DataCtx = createContext(null);
export const useData = () => useContext(DataCtx);

function buildMockMatches() {
  return MOCK_MATCHES.map((m) => ({ ...m, props: buildMatchProps(m) }));
}

export function DataProvider({ children }) {
  const [matches, setMatches] = useState(() => (MOCK_MODE ? buildMockMatches() : []));
  const [loading, setLoading] = useState(!MOCK_MODE);
  const [leaderboard, setLeaderboard] = useState(() => (MOCK_MODE ? MOCK_LEADERBOARD : []));
  const [weekly, setWeekly] = useState(() => (MOCK_MODE ? MOCK_WEEKLY : []));

  // Leaderboards the functions roll up: all-time (`imperial`) + `weekly`.
  useEffect(() => {
    if (MOCK_MODE) return;
    let unsubs = [];
    (async () => {
      const { doc, onSnapshot } = await import('firebase/firestore');
      const sub = (id, set) =>
        onSnapshot(
          doc(db, 'leaderboards', id),
          (snap) => set(snap.exists() ? snap.data().board || [] : []),
          (err) => console.error(`leaderboard ${id} subscription error`, err)
        );
      unsubs = [sub('imperial', setLeaderboard), sub('weekly', setWeekly)];
    })();
    return () => unsubs.forEach((u) => u && u());
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
          // Only OPEN match days are playable, so only THOSE matches need their
          // props loaded — every locked/finished match's ~230 prop docs would be
          // dead reads. Cuts Firestore reads ~5x vs subscribing to all 72 matches.
          const openIds = new Set(
            buildMatchdays(matchDocs)
              .filter((d) => d.status === 'open')
              .flatMap((d) => d.games.map((g) => g.id))
          );
          // Drop prop listeners for matches that are gone or no longer open.
          for (const [id, unsub] of propUnsubs) {
            if (!openIds.has(id)) { unsub(); propUnsubs.delete(id); propData.delete(id); }
          }
          // Subscribe to props only for currently-open matches that lack a listener.
          for (const m of matchDocs) {
            if (openIds.has(m.id) && !propUnsubs.has(m.id)) {
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

  return <DataCtx.Provider value={{ matches, loading, leaderboard, weekly }}>{children}</DataCtx.Provider>;
}
