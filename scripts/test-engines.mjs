// Unit tests for the shared line + scoring engines — the single source of truth
// imported by BOTH the frontend and the Cloud Functions. Pure JS, no backend.
//   run:  npm test
import { buildLine, buildPlayerProps, buildMatchProps, METRICS } from '../src/lib/lineEngine.js';
import { sideProbability, pickValue, resolvePick, applyStreak, settleSlip } from '../src/lib/scoringEngine.js';

let passed = 0;
const eq = (label, got, want) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) {
    console.error(`  ✗ ${label}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
    throw new Error(label);
  }
  passed++; console.log(`  ✓ ${label}`);
};
const ok = (label, cond) => { if (!cond) { console.error(`  ✗ ${label}`); throw new Error(label); } passed++; console.log(`  ✓ ${label}`); };

try {
  // --- lineEngine ----------------------------------------------------------
  const striker = { id: 's1', name: 'Kane', position: 'F', team: 'England', teamCode: 'ENG' };
  const gk = { id: 'g1', name: 'Pickford', position: 'G', team: 'England', teamCode: 'ENG' };

  eq('striker goals line is a half-line 0.5', buildLine(striker, 'goals').line, 0.5);
  ok('keeper gets a saves prop', buildPlayerProps(gk).some((p) => p.metric === 'saves'));
  ok('keeper gets a goals-conceded prop', buildPlayerProps(gk).some((p) => p.metric === 'conceded'));
  ok('keeper has NO goals line (no more 1%-novelty prop)', buildLine(gk, 'goals') === null);
  ok('keeper conceded line sits near the median (1.5)', buildLine(gk, 'conceded').line === 1.5);
  ok('striker cannot get a saves line', buildLine(striker, 'saves') === null);
  ok('per-player form upgrades the line', buildLine({ ...striker, baselines: { goals: 1.6 } }, 'goals').line === 1.5);

  const match = {
    id: 'm1',
    home: { players: [striker] },
    away: { players: [gk] },
  };
  const props = buildMatchProps(match);
  ok('match props have stable composite ids', props.every((p) => p.id === `${p.matchId}:${p.playerId}:${p.metric}`));
  ok('every prop carries a numeric line + baseline', props.every((p) => typeof p.line === 'number' && typeof p.baseline === 'number'));

  // --- scoringEngine: rarity pricing --------------------------------------
  const goalsProp = buildLine(striker, 'goals'); // line 0.5, low baseline -> MORE is rarer
  const more = pickValue(goalsProp, 'MORE');
  const less = pickValue(goalsProp, 'LESS');
  ok('rarer side (MORE goals) pays more than the safe side', more > less);
  ok('points are bounded [5,100]', more <= 100 && less >= 5);
  const pMore = sideProbability(goalsProp, 'MORE');
  ok('probability is in (0,1)', pMore > 0 && pMore < 1);
  ok('MORE + LESS probabilities are complementary', Math.abs(sideProbability(goalsProp, 'MORE') + sideProbability(goalsProp, 'LESS') - 1) < 1e-9);

  // --- resolvePick ---------------------------------------------------------
  const pick = { ...goalsProp, id: 'p', playerId: 's1', matchId: 'm1', side: 'MORE', value: more };
  const played = (extra) => ({ minutes: 90, ...extra });
  eq('MORE goals correct when player scored 1', resolvePick(pick, played({ goals: 1 })).correct, true);
  eq('MORE goals wrong when player blanked', resolvePick(pick, played({ goals: 0 })).correct, false);
  eq('wrong pick awards 0 (never negative)', resolvePick(pick, played({ goals: 0 })).awarded, 0);
  eq('correct pick awards its frozen value', resolvePick(pick, played({ goals: 1 })).awarded, more);

  // --- DNP / minimum-minutes voiding --------------------------------------
  ok('pick voids when player has no minutes', resolvePick(pick, { goals: 1 }).void === true);
  ok('voided pick awards 0', resolvePick(pick, { minutes: 0, goals: 5 }).awarded === 0);
  ok('voided pick is not counted correct', resolvePick(pick, { minutes: 0, goals: 5 }).correct === false);
  ok('played pick is not voided', !resolvePick(pick, played({ goals: 1 })).void);

  // --- streak multiplier ---------------------------------------------------
  eq('no streak = no bonus', applyStreak(100, 0), 100);
  eq('5-day streak = +25%', applyStreak(100, 5), 125);
  eq('streak bonus caps at +50%', applyStreak(100, 99), 150);

  // --- settleSlip ----------------------------------------------------------
  const lessPick = { ...buildLine(striker, 'shotsOn'), id: 'p2', playerId: 's1', matchId: 'm1', side: 'LESS', value: 5 };
  const settled = settleSlip([pick, lessPick], { s1: played({ goals: 1, shotsOn: 0 }) }, 0);
  eq('settleSlip counts correct picks', settled.correctCount, 2);
  ok('settleSlip totals base points', settled.basePoints === more + 5);
  eq('settleSlip advances the streak on a hit', settled.newStreak, 1);
  const blank = settleSlip([pick], { s1: played({ goals: 0 }) }, 3);
  eq('settleSlip resets streak when nothing lands', blank.newStreak, 0);

  // A DNP pick in a slip is voided, not scored or counted.
  const voided = settleSlip([pick], { s1: { goals: 2 } }, 0); // no minutes -> void
  eq('voided pick scores 0 in a slip', voided.basePoints, 0);
  eq('voided pick is not counted correct', voided.correctCount, 0);
  ok('voided pick is flagged in results', voided.results[0].void === true);

  console.log(`\nENGINE TESTS PASSED — ${passed} assertions.`);
  process.exit(0);
} catch (e) {
  console.error('\nENGINE TESTS FAILED:', e.message);
  process.exit(1);
}
