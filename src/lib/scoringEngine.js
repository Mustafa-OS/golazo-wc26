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
const STREAK_STEP = 0.05; // +5% per consecutive correct day
const STREAK_CAP = 0.5;   // max +50% from streaks
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

/**
 * Apply a daily streak multiplier to a day's base points.
 * @param {number} basePoints  sum of awarded points that day
 * @param {number} streakDays  consecutive prior days with >=1 correct pick
 */
export function applyStreak(basePoints, streakDays) {
  const mult = 1 + Math.min(streakDays * STREAK_STEP, STREAK_CAP);
  return Math.round(basePoints * mult);
}

/**
 * Settle a full day's slip.
 * @param {Array} picks   each { ...prop, side, value }
 * @param {object} statsByPlayer  { [playerId]: normalisedStats }
 * @param {number} streakDays
 * @returns {object} { results, basePoints, total, correctCount }
 */
export function settleSlip(picks, statsByPlayer, streakDays = 0) {
  const results = picks.map((pick) => {
    const actual = statsByPlayer[pick.playerId] || {};
    const r = resolvePick(pick, actual);
    return { ...pick, ...r };
  });
  const basePoints = results.reduce((s, r) => s + r.awarded, 0);
  const correctCount = results.filter((r) => r.correct).length;
  const newStreak = correctCount > 0 ? streakDays + 1 : 0;
  return {
    results,
    basePoints,
    total: applyStreak(basePoints, streakDays),
    correctCount,
    newStreak,
  };
}
