// ============================================================================
// SCORING ENGINE
// ----------------------------------------------------------------------------
// Turns a pick into points. Core idea: the rarer the side you pick, the more
// it pays. "Rarity" is estimated from the gap between the line and the player's
// expected output (baseline), modelled with a Poisson tail for count stats.
//
// No negatives — a wrong pick scores 0. This keeps the game friendly and stops
// people who join late from being buried in the table.
//
// Shared by frontend (to PREVIEW the points on each prop) and Cloud Functions
// (to AWARD points on resolution). Dependency-free.
// ============================================================================

const MIN_POINTS = 5;     // floor for a near-certain pick
const MAX_POINTS = 100;   // cap so one lucky longshot can't run away with it
// Props are generated for the full squad, so a picked player might not play.
// Below this many minutes the pick is VOID (no points, no penalty, no streak
// effect) — the standard DFS "Did Not Play" rule. Raise toward 20–60 to also
// void brief cameo subs on volume stats.
const MIN_MINUTES = 1;

// Poisson P(X >= k) — probability of AT LEAST k events given mean lambda.
// Count stats (goals, shots, saves...) are well-approximated by Poisson.
function poissonAtLeast(k, lambda) {
  if (lambda <= 0) return k <= 0 ? 1 : 0;
  // P(X <= k-1) via summation, then complement.
  let cumulative = 0;
  let term = Math.exp(-lambda); // P(X = 0)
  for (let i = 0; i < k; i++) {
    cumulative += term;
    term *= lambda / (i + 1);
  }
  return Math.max(0, Math.min(1, 1 - cumulative));
}

/**
 * Probability the prop lands on the chosen side.
 * @param {object} prop  { line, baseline }
 * @param {'MORE'|'LESS'} side
 * @returns {number} probability in [0,1]
 */
export function sideProbability(prop, side) {
  const lambda = Math.max(prop.baseline, 0.001);
  // line is a half-line (e.g. 0.5), so MORE means X >= ceil(line).
  const threshold = Math.ceil(prop.line);
  const pMore = poissonAtLeast(threshold, lambda);
  return side === 'MORE' ? pMore : 1 - pMore;
}

/**
 * Points a pick is WORTH if correct. Inverse of probability — rare = expensive.
 * Computed up front and frozen onto the pick at lock time so later baseline
 * tweaks can't retroactively change a settled game.
 */
export function pickValue(prop, side) {
  const p = sideProbability(prop, side);
  const safe = Math.min(Math.max(p, 0.02), 0.98); // clamp to avoid infinities
  const raw = MIN_POINTS / safe;                  // 1/p scaling
  return Math.round(Math.min(raw, MAX_POINTS));
}

/**
 * Resolve a single pick against the actual stat line for that player.
 * @param {object} pick   { metric, line, side, value (frozen points) }
 * @param {object} actual normalised stat object, e.g. { goals: 1, saves: 0 }
 * @returns {object} { correct, awarded }
 */
export function resolvePick(pick, actual) {
  // Did Not Play (or under the minutes threshold) -> VOID: no points, no penalty,
  // and it doesn't count toward correct picks or the streak.
  const minutes = actual?.minutes ?? 0;
  if (minutes < MIN_MINUTES) return { correct: false, awarded: 0, void: true };

  const got = actual?.[pick.metric] ?? 0;
  const landedMore = got >= Math.ceil(pick.line);
  const correct = pick.side === 'MORE' ? landedMore : !landedMore;
  return { correct, awarded: correct ? pick.value : 0 };
}

// --- Slip modes ------------------------------------------------------------
// NORMAL: picks score independently; one pick may be CAPTAIN -> 2x if correct.
// POWER (parlay): all-or-nothing — if every live pick lands, the summed value is
// multiplied (bigger with more picks); a single miss pays 0. Still never < 0.
export const CAPTAIN_MULT = 2;
const POWER_MULTIPLIERS = { 2: 1.5, 3: 2, 4: 2.6, 5: 3.3 }; // by # live picks; tunable
export function powerMultiplier(n) {
  if (n < 2) return 1;
  return POWER_MULTIPLIERS[n] || POWER_MULTIPLIERS[5] + 0.4 * (n - 5);
}

/**
 * Max points a slip could pay (frozen pick values), used for the live preview.
 * @param {Array} picks
 * @param {object} opts { mode:'normal'|'power', captainId }
 */
export function slipPotential(picks, opts = {}) {
  const { mode = 'normal', captainId = null } = opts;
  if (mode === 'power') {
    const stake = picks.reduce((s, p) => s + (p.value || 0), 0);
    return Math.round(stake * powerMultiplier(picks.length));
  }
  return picks.reduce(
    (s, p) => s + (p.value || 0) * (captainId && p.id === captainId ? CAPTAIN_MULT : 1),
    0
  );
}

/**
 * Settle a full day's slip.
 * @param {Array} picks   each { ...prop, side, value }
 * @param {object} statsByPlayer  { [playerId]: normalisedStats }
 * @param {number} streakDays
 * @param {object} opts   { mode:'normal'|'power', captainId }
 * @returns {object} { results, basePoints, total, correctCount, newStreak, mode }
 */
export function settleSlip(picks, statsByPlayer, streakDays = 0, opts = {}) {
  const { mode = 'normal', captainId = null } = opts;

  const results = picks.map((pick) => {
    const actual = statsByPlayer[pick.playerId] || {};
    const r = resolvePick(pick, actual);
    const isCaptain = mode === 'normal' && !!captainId && pick.id === captainId;
    // Captain doubling applies only in normal mode; power mode is all-or-nothing.
    const awarded = isCaptain && r.correct ? r.awarded * CAPTAIN_MULT : r.awarded;
    return { ...pick, ...r, awarded, captain: isCaptain || undefined };
  });

  const correctCount = results.filter((r) => r.correct).length;
  const live = results.filter((r) => !r.void); // DNP picks don't break a parlay

  let basePoints;
  if (mode === 'power') {
    const allHit = live.length > 0 && live.every((r) => r.correct);
    const stake = live.reduce((s, r) => s + r.value, 0);
    basePoints = allHit ? Math.round(stake * powerMultiplier(live.length)) : 0;
  } else {
    basePoints = results.reduce((s, r) => s + r.awarded, 0);
  }

  return {
    results,
    basePoints,
    total: basePoints,
    correctCount,
    mode,
    powerMult: mode === 'power' ? powerMultiplier(live.length) : 1,
  };
}
