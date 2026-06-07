// ============================================================================
// CLOUD FUNCTIONS  (Firebase, Node 18+)
// ----------------------------------------------------------------------------
// Three scheduled jobs + one callable. This is the server-side spine:
//
//   generateDailyProps  (08:00) : fetch today's fixtures + lineups -> write the
//                                 canonical prop set to Firestore. Users read
//                                 these to build their slips.
//   resolveFinished     (hourly): for any FT match not yet settled, pull player
//                                 stats, settle every user's slip, award points.
//   recomputeLeaderboard(hourly): roll user totals into the global + group boards.
//   joinGroup           (callable): add the caller to a group by join code.
//
// The line + scoring engines are imported from ../src/lib so the frontend and
// backend can NEVER disagree about how a prop is priced or settled.
// ============================================================================

const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
// FieldValue from the modular entry point (admin.firestore.FieldValue is
// undefined in firebase-admin v12).
const { FieldValue } = require('firebase-admin/firestore');

admin.initializeApp();
const db = admin.firestore();

const API_KEY = defineSecret('API_FOOTBALL_KEY');

// NOTE: these are ESM files; in functions use a small bundler or copy them to
// .cjs. The README explains the one-line build step. Shapes are identical.
const { buildMatchProps } = require('./lineEngine.cjs');
const { settleSlip } = require('./scoringEngine.cjs');
const api = require('./apiFootball.cjs');

const todayISO = () => new Date().toISOString().slice(0, 10);

// --- 1. Generate the day's props ------------------------------------------
exports.generateDailyProps = onSchedule(
  { schedule: '0 8 * * *', timeZone: 'Europe/London', secrets: [API_KEY] },
  async () => {
    const key = API_KEY.value();
    const fixtures = await api.getFixtures(key, todayISO());
    const batch = db.batch();

    for (const fx of fixtures) {
      const lineups = await api.getLineups(key, fx.id); // { teamId: {name, players} }
      const match = {
        id: fx.id,
        kickoff: fx.kickoff,
        stage: fx.stage,
        home: { ...fx.home, players: lineups[fx.home.code]?.players || [] },
        away: { ...fx.away, players: lineups[fx.away.code]?.players || [] },
      };
      // Match doc (for the UI) ...
      batch.set(db.doc(`matches/${fx.id}`), match, { merge: true });
      // ... and its props (stable IDs -> idempotent).
      for (const prop of buildMatchProps(match)) {
        batch.set(db.doc(`matches/${fx.id}/props/${prop.id.replace(/:/g, '_')}`), prop);
      }
    }
    await batch.commit();
    console.log(`Generated props for ${fixtures.length} fixtures`);
  }
);

// --- 2. Resolve finished matches & award points ---------------------------
exports.resolveFinished = onSchedule(
  { schedule: '0 * * * *', timeZone: 'Europe/London', secrets: [API_KEY] },
  async () => {
    const key = API_KEY.value();
    const fixtures = await api.getFixtures(key, todayISO());
    const finished = fixtures.filter((f) => f.status === 'FT');

    for (const fx of finished) {
      const matchRef = db.doc(`matches/${fx.id}`);
      const snap = await matchRef.get();
      if (snap.get('settled')) continue;

      const statsByPlayer = await api.getPlayerStats(key, fx.id);

      // Every slip that referenced this match.
      const slips = await db.collection('slips').where('matchIds', 'array-contains', fx.id).get();
      const writes = db.batch();

      for (const slipDoc of slips.docs) {
        const slip = slipDoc.data();
        const picksForMatch = slip.picks.filter((p) => p.matchId === fx.id);

        // The user's streak coming into today drives the bonus and the next value.
        const userRef = db.doc(`users/${slip.uid}`);
        const priorStreak = (await userRef.get()).get('streak') || 0;

        const { results, total } = settleSlip(picksForMatch, statsByPlayer, priorStreak);

        const mergedPicks = slip.picks.map((p) =>
          p.matchId === fx.id ? results.find((r) => r.id === p.id) || p : p
        );
        const slipUpdate = { picks: mergedPicks };

        // One write per doc per batch: fold points + (maybe) streak together.
        const userUpdate = { points: FieldValue.increment(total) };
        const fullySettled = mergedPicks.every((p) => p.correct !== undefined);
        if (fullySettled && !slip.streakApplied) {
          const correctCount = mergedPicks.filter((p) => p.correct).length;
          userUpdate.streak = correctCount > 0 ? priorStreak + 1 : 0; // daily streak roll
          slipUpdate.streakApplied = true;
        }

        writes.set(userRef, userUpdate, { merge: true });
        writes.update(slipDoc.ref, slipUpdate);
      }
      writes.update(matchRef, { settled: true });
      await writes.commit();
      console.log(`Settled ${fx.id}: ${slips.size} slips`);
    }
  }
);

// --- 3. Recompute leaderboards --------------------------------------------
exports.recomputeLeaderboard = onSchedule(
  { schedule: '15 * * * *', timeZone: 'Europe/London' },
  async () => {
    const users = await db.collection('users').orderBy('points', 'desc').limit(500).get();
    const board = users.docs.map((d, i) => ({
      rank: i + 1, uid: d.id, name: d.get('name'), dept: d.get('dept'), points: d.get('points') || 0,
    }));
    await db.doc('leaderboards/imperial').set({ board, updatedAt: Date.now() });
  }
);

// --- 4. Join a private group by code --------------------------------------
exports.joinGroup = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Sign in first.');
  const code = (req.data.code || '').trim().toUpperCase();
  const q = await db.collection('groups').where('code', '==', code).limit(1).get();
  if (q.empty) throw new HttpsError('not-found', 'No group with that code.');
  const group = q.docs[0];
  await group.ref.update({ members: FieldValue.arrayUnion(req.auth.uid) });
  return { groupId: group.id, name: group.get('name') };
});
