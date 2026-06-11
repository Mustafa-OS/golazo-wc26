// ============================================================================
// CLOUD FUNCTIONS  (Firebase, Node 18+)
// ----------------------------------------------------------------------------
// Three scheduled jobs + one callable. This is the server-side spine:
//
//   generateDailyProps  (08:00) : fetch today's fixtures + squads -> write the
//                                 canonical prop set to Firestore. Users read
//                                 these to build their slips.
//   resolveFinished     (hourly): for any FT match not yet settled, pull player
//                                 stats, settle every user's slip, award points.
//   recomputeLeaderboard(hourly): roll user totals into the global board.
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

// ---------------------------------------------------------------------------
// Core logic, extracted so both the scheduled jobs and the on-demand test
// endpoint can run it.
// ---------------------------------------------------------------------------

// Matches kicking off within this many days get props generated (the "open"
// window the UI lets people play). The frontend marks match days open when
// they're within the next 4 days; we generate a touch beyond so they're ready.
const OPEN_WINDOW_MS = 5 * 86400e3;

async function generateProps(key, _date, season) {
  // Load the WHOLE schedule so every match day shows up (locked until open).
  const fixtures = await api.getFixtures(key, undefined, season);

  // 1) Write all fixtures as lightweight schedule docs (status + score).
  const sched = db.batch();
  for (const fx of fixtures) {
    sched.set(
      db.doc(`matches/${fx.id}`),
      { id: fx.id, kickoff: fx.kickoff, stage: fx.stage, status: fx.status, home: fx.home, away: fx.away, score: fx.score },
      { merge: true }
    );
  }
  await sched.commit();

  // 2) Generate player props only for upcoming matches inside the open window.
  const now = Date.now();
  const open = fixtures.filter((f) => {
    const t = new Date(f.kickoff).getTime();
    return f.status === 'NS' && t <= now + OPEN_WINDOW_MS;
  });
  let propCount = 0;
  for (const fx of open) {
    const [homeSquad, awaySquad] = await Promise.all([
      api.getSquad(key, fx.home.code),
      api.getSquad(key, fx.away.code),
    ]);
    const withTeam = (players, team) =>
      players.map((p) => ({ ...p, team: team.name, teamCode: team.code }));
    const match = {
      id: fx.id,
      kickoff: fx.kickoff,
      stage: fx.stage,
      status: fx.status,
      home: { ...fx.home, players: withTeam(homeSquad, fx.home) },
      away: { ...fx.away, players: withTeam(awaySquad, fx.away) },
    };
    const batch = db.batch(); // one batch per match keeps writes well under limits
    batch.set(db.doc(`matches/${fx.id}`), match, { merge: true });
    for (const prop of buildMatchProps(match)) {
      batch.set(db.doc(`matches/${fx.id}/props/${prop.id.replace(/:/g, '_')}`), prop);
      propCount++;
    }
    await batch.commit();
  }
  console.log(`Schedule: ${fixtures.length} fixtures; props for ${open.length} open matches (${propCount})`);
  return { fixtures: fixtures.length, open: open.length, props: propCount };
}

// Monday (UTC) of the current week, as YYYY-MM-DD — the weekly board cutoff.
function startOfWeekISO() {
  const d = new Date();
  const offset = (d.getUTCDay() + 6) % 7; // 0 = Monday
  d.setUTCDate(d.getUTCDate() - offset);
  return d.toISOString().slice(0, 10);
}

async function resolveMatches(key, date, season) {
  const fixtures = await api.getFixtures(key, date, season);
  const finished = fixtures.filter((f) => f.status === 'FT');
  if (!finished.length) return { finished: 0, settled: 0 };
  const finishedIds = new Set(finished.map((f) => f.id));

  // Candidate slips = any unsettled slip referencing a finished match.
  const candidates = new Map();
  for (const id of finishedIds) {
    const q = await db.collection('slips').where('matchIds', 'array-contains', id).get();
    q.docs.forEach((d) => candidates.set(d.id, d));
  }

  // Settle a slip as a WHOLE only once ALL its matches are finished — required
  // for Power Play (parlay) and harmless for normal slips.
  const settleable = [...candidates.values()].filter((d) => {
    const s = d.data();
    return !s.settled && (s.matchIds || []).every((mid) => finishedIds.has(mid));
  });

  // Pull player stats ONLY for matches on a slip we're settling right now — so we
  // never re-fetch stats for matches whose slips are already done.
  const needed = new Set();
  settleable.forEach((d) => (d.data().matchIds || []).forEach((mid) => needed.add(mid)));
  const statsByMatch = {};
  for (const mid of needed) statsByMatch[mid] = await api.getPlayerStats(key, mid);

  let settledCount = 0;
  for (const slipDoc of settleable) {
    const slip = slipDoc.data();
    const statsByPlayer = {};
    for (const mid of slip.matchIds) Object.assign(statsByPlayer, statsByMatch[mid] || {});

    const userRef = db.doc(`users/${slip.uid}`);
    const { results, total } = settleSlip(
      slip.picks, statsByPlayer, 0,
      { mode: slip.mode, captainId: slip.captainId }
    );

    const writes = db.batch();
    writes.update(slipDoc.ref, { picks: results, settled: true, scored: total, settledAt: Date.now() });
    writes.set(userRef, { points: FieldValue.increment(total) }, { merge: true });
    await writes.commit();
    settledCount++;
    console.log(`Settled slip ${slipDoc.id}: ${total} pts (${slip.mode || 'normal'})`);
  }

  // Mark finished matches for the UI (with the final score for the results view).
  const mb = db.batch();
  for (const fx of finished) mb.set(db.doc(`matches/${fx.id}`), { settled: true, status: 'FT', score: fx.score }, { merge: true });
  await mb.commit();

  return { finished: finished.length, settled: settledCount };
}

async function recompute() {
  // All-time board from cumulative user points.
  const users = await db.collection('users').orderBy('points', 'desc').limit(500).get();
  const allTime = users.docs.map((d, i) => ({
    rank: i + 1, uid: d.id, name: d.get('name'), year: d.get('year'), points: d.get('points') || 0,
  }));
  // Total registered players (for the userbase counter). Falls back to the
  // board length if the count() aggregation isn't available.
  let total = allTime.length;
  try { total = (await db.collection('users').count().get()).data().count; } catch (e) { /* keep fallback */ }
  await db.doc('leaderboards/imperial').set({ board: allTime, total, updatedAt: Date.now() });

  // Weekly board: sum settled slip scores since Monday, grouped by user.
  const weekStart = startOfWeekISO();
  const meta = {};
  users.docs.forEach((d) => { meta[d.id] = { name: d.get('name'), year: d.get('year') }; });
  const slips = await db.collection('slips').where('day', '>=', weekStart).get();
  const byUid = {};
  slips.docs.forEach((d) => {
    const s = d.data();
    if (s.settled) byUid[s.uid] = (byUid[s.uid] || 0) + (s.scored || 0);
  });
  const weekly = Object.entries(byUid)
    .map(([uid, points]) => ({ uid, points, name: meta[uid]?.name, year: meta[uid]?.year }))
    .filter((r) => r.name) // known users only
    .sort((a, b) => b.points - a.points)
    .slice(0, 500)
    .map((r, i) => ({ rank: i + 1, ...r }));
  await db.doc('leaderboards/weekly').set({ board: weekly, weekStart, updatedAt: Date.now() });

  return { ranked: allTime.length, weekly: weekly.length };
}

// ---------------------------------------------------------------------------
// Scheduled jobs (thin wrappers around the core logic above).
// ---------------------------------------------------------------------------

exports.generateDailyProps = onSchedule(
  { schedule: '0 8 * * *', timeZone: 'Europe/London', secrets: [API_KEY] },
  async () => { await generateProps(API_KEY.value(), todayISO()); }
);

exports.resolveFinished = onSchedule(
  { schedule: '0 * * * *', timeZone: 'Europe/London', secrets: [API_KEY] },
  async () => { await resolveMatches(API_KEY.value(), todayISO()); }
);

// Every 5 minutes so new signups + fresh points show on the board quickly
// (the board is a cached snapshot; this keeps it close to real-time).
exports.recomputeLeaderboard = onSchedule(
  { schedule: '*/5 * * * *', timeZone: 'Europe/London' },
  async () => { await recompute(); }
);

// --- Join a private group by code (callable) -------------------------------
exports.joinGroup = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Sign in first.');
  const code = (req.data.code || '').trim().toUpperCase();
  const q = await db.collection('groups').where('code', '==', code).limit(1).get();
  if (q.empty) throw new HttpsError('not-found', 'No group with that code.');
  const group = q.docs[0];
  await group.ref.update({ members: FieldValue.arrayUnion(req.auth.uid) });
  return { groupId: group.id, name: group.get('name') };
});

// --- Leave a group (callable) — group writes are blocked by rules, so removing
// yourself goes through the server, like joining. -------------------------------
exports.leaveGroup = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Sign in first.');
  const gid = String(req.data.groupId || '').trim();
  if (!gid) throw new HttpsError('invalid-argument', 'No group specified.');
  const ref = db.doc(`groups/${gid}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Group not found.');
  await ref.update({ members: FieldValue.arrayRemove(req.auth.uid) });
  return { ok: true };
});
