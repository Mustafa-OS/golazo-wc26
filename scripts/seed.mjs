// ============================================================================
// SEED THE EMULATOR
// ----------------------------------------------------------------------------
// Writes matches + props + a leaderboard + a couple of groups into the local
// Firestore emulator, so the live code path (firebase.js -> Firestore) has real
// data to render against `npm run dev:emulator`.
//
// It builds props with the SAME lineEngine the Cloud Functions use, so this is
// a faithful stand-in for `generateDailyProps` — not a parallel mock.
//
// Usage:  npm run emulators   (in one terminal)
//         npm run seed        (in another)
// ============================================================================

import admin from 'firebase-admin';
import { MOCK_MATCHES, MOCK_LEADERBOARD } from '../src/lib/mockData.js';
import { buildMatchProps } from '../src/lib/lineEngine.js';

process.env.FIRESTORE_EMULATOR_HOST ||= 'localhost:8080';
admin.initializeApp({ projectId: 'demo-over-wc26' });
const db = admin.firestore();

// One match in the past so the "locked after kickoff" state is observable.
const now = Date.now();
const matches = MOCK_MATCHES.map((m, i) => ({
  ...m,
  kickoff:
    i === MOCK_MATCHES.length - 1
      ? new Date(now - 2 * 60 * 60 * 1000).toISOString() // last match: 2h ago (locked)
      : new Date(now + 6 * 60 * 60 * 1000).toISOString(), // others: +6h (open)
}));

async function run() {
  const batch = db.batch();

  for (const match of matches) {
    // Strip nested player arrays off the match doc (props carry that info);
    // matches the lean shape generateDailyProps writes for the UI rail.
    batch.set(db.doc(`matches/${match.id}`), {
      id: match.id,
      kickoff: match.kickoff,
      stage: match.stage,
      home: { name: match.home.name, code: match.home.code, flag: match.home.flag },
      away: { name: match.away.name, code: match.away.code, flag: match.away.flag },
      settled: false,
    });
    for (const prop of buildMatchProps(match)) {
      batch.set(db.doc(`matches/${match.id}/props/${prop.id.replace(/:/g, '_')}`), prop);
    }
  }

  // Seed a leaderboard so the board page has live rows in emulator mode.
  batch.set(db.doc('leaderboards/imperial'), {
    board: MOCK_LEADERBOARD.map((u, i) => ({ rank: i + 1, ...u })),
    updatedAt: now,
  });

  // A couple of public groups to browse / join by code.
  batch.set(db.doc('groups/seed-dyson'), {
    name: 'Dyson DesEng', code: 'DYSON26', members: [], createdAt: now,
  });
  batch.set(db.doc('groups/seed-beit'), {
    name: 'Beit Halls Boys', code: 'BEIT99', members: [], createdAt: now,
  });

  await batch.commit();

  const propCount = matches.reduce((n, m) => n + buildMatchProps(m).length, 0);
  console.log(`Seeded ${matches.length} matches, ${propCount} props, 1 leaderboard, 2 groups.`);
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
