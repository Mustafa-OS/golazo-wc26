// Unit tests for the shared line + scoring engines — the single source of truth
// imported by BOTH the frontend and the Cloud Functions. Pure JS, no backend.
//   run:  npm test
import { buildLine, buildPlayerProps, buildMatchProps, METRICS } from '../src/lib/lineEngine.js';
import { sideProbability, pickValue, resolvePick, settleSlip, slipPotential, powerMultiplier, CAPTAIN_MULT } from '../src/lib/scoringEngine.js';

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
  ok('defender has NO cards line (removed)', buildLine({ position: 'D' }, 'cards') === null);
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

  // --- team strength + player quality drive the payout --------------------
  const argFwd = { id: 'af', name: 'Squadplayer', position: 'F', team: 'Argentina', teamCode: 'ARG' };
  const haiFwd = { id: 'hf', name: 'Squadplayer', position: 'F', team: 'Haiti', teamCode: 'HAI' };
  const mm = buildMatchProps({ id: 'mm', home: { name: 'Argentina', players: [argFwd] }, away: { name: 'Haiti', players: [haiFwd] } });
  const argGoals = mm.find((p) => p.playerId === 'af' && p.metric === 'goals');
  const haiGoals = mm.find((p) => p.playerId === 'hf' && p.metric === 'goals');
  ok('goals line stays 0.5 regardless of team strength', argGoals.line === 0.5 && haiGoals.line === 0.5);
  ok('strong-team scorer has a higher goal baseline', argGoals.baseline > haiGoals.baseline);
  ok('weak-team scorer pays MORE than a strong-team scorer', pickValue(haiGoals, 'MORE') > pickValue(argGoals, 'MORE'));

  // Player quality: elite vs a squad player on the SAME (strong) team.
  const elite = { id: 'el', name: 'Messi', position: 'F', team: 'Argentina', teamCode: 'ARG' };
  const squad = { id: 'sq', name: 'Nobody Random', position: 'F', team: 'Argentina', teamCode: 'ARG' };
  const qm = buildMatchProps({ id: 'qm', home: { name: 'Argentina', players: [elite, squad] }, away: { name: 'Haiti', players: [haiFwd] } });
  const eliteGoals = qm.find((p) => p.playerId === 'el' && p.metric === 'goals');
  const squadGoals = qm.find((p) => p.playerId === 'sq' && p.metric === 'goals');
  ok('elite scorer is likelier than a squad team-mate', eliteGoals.baseline > squadGoals.baseline);
  ok('elite scorer pays LESS for MORE than a squad team-mate', pickValue(eliteGoals, 'MORE') < pickValue(squadGoals, 'MORE'));
  // A no-ctx buildLine is unchanged (default position baseline) — back-compat.
  ok('buildLine without a match context is unadjusted', buildLine(argFwd, 'goals').baseline === buildLine(haiFwd, 'goals').baseline);

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

  // --- settleSlip ----------------------------------------------------------
  const lessPick = { ...buildLine(striker, 'shotsOn'), id: 'p2', playerId: 's1', matchId: 'm1', side: 'LESS', value: 5 };
  const settled = settleSlip([pick, lessPick], { s1: played({ goals: 1, shotsOn: 0 }) }, 0);
  eq('settleSlip counts correct picks', settled.correctCount, 2);
  ok('settleSlip totals base points', settled.basePoints === more + 5);
  ok('settleSlip total has no streak multiplier', settled.total === settled.basePoints);

  // A DNP pick in a slip is voided, not scored or counted.
  const voided = settleSlip([pick], { s1: { goals: 2 } }, 0); // no minutes -> void
  eq('voided pick scores 0 in a slip', voided.basePoints, 0);
  eq('voided pick is not counted correct', voided.correctCount, 0);
  ok('voided pick is flagged in results', voided.results[0].void === true);

  // --- Captain (2x in normal mode) ----------------------------------------
  const p1 = { id: 'a', playerId: 's1', metric: 'goals', line: 0.5, side: 'MORE', value: 10 };
  const p2 = { id: 'b', playerId: 's2', metric: 'goals', line: 0.5, side: 'MORE', value: 20 };
  const bothPlay = { s1: played({ goals: 1 }), s2: played({ goals: 1 }) };
  const capN = settleSlip([p1, p2], bothPlay, 0, { captainId: 'b' });
  eq('captain doubles its pick (10 + 20*2)', capN.basePoints, 50);
  ok('captain pick is flagged', capN.results.find((r) => r.id === 'b').captain === true);
  const capMiss = settleSlip([p1, p2], { s1: played({ goals: 1 }), s2: played({ goals: 0 }) }, 0, { captainId: 'b' });
  eq('captain miss = 0 for that pick, no negative (just p1=10)', capMiss.basePoints, 10);

  // --- Power Slip (parlay, all-or-nothing) --------------------------------
  eq('power multiplier scales with picks', powerMultiplier(5), 3.3);
  const powAll = settleSlip([p1, p2], bothPlay, 0, { mode: 'power' });
  eq('power: all hit -> (10+20)*1.5', powAll.basePoints, 45);
  const powMiss = settleSlip([p1, p2], { s1: played({ goals: 1 }), s2: played({ goals: 0 }) }, 0, { mode: 'power' });
  eq('power: one miss -> 0', powMiss.basePoints, 0);
  // A DNP pick must NOT break the parlay; it drops out of the live set.
  const powVoid = settleSlip([p1, p2], { s1: played({ goals: 1 }), s2: { goals: 0 } }, 0, { mode: 'power' });
  eq('power: void pick ignored, remaining hit -> 10*1 (1 live pick)', powVoid.basePoints, 10);

  // --- slipPotential preview ----------------------------------------------
  eq('potential: normal sum', slipPotential([p1, p2]), 30);
  eq('potential: captain doubles', slipPotential([p1, p2], { captainId: 'b' }), 50);
  eq('potential: power multiplies the stake', slipPotential([p1, p2], { mode: 'power' }), 45);
  eq('CAPTAIN_MULT is 2', CAPTAIN_MULT, 2);

  console.log(`\nENGINE TESTS PASSED — ${passed} assertions.`);
  process.exit(0);
} catch (e) {
  console.error('\nENGINE TESTS FAILED:', e.message);
  process.exit(1);
}
