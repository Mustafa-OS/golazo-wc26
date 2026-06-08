// ============================================================================
// MATCH DAYS
// ----------------------------------------------------------------------------
// Group fixtures into match days by US Eastern calendar date (the 2026 WC is
// US-hosted), and classify each as previous / open / upcoming. "Open" = within
// the next OPEN_DAYS days and playable; upcoming = locked; previous = results.
// ============================================================================

export const US_TZ = 'America/New_York';
const OPEN_DAYS = 4; // today + next 3 days are playable

export const usDateKey = (iso) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: US_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
export const usDateLabel = (iso) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: US_TZ, weekday: 'long', day: 'numeric', month: 'short' }).format(new Date(iso));
export const usToday = () => usDateKey(Date.now());

const dayDiff = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400e3);

// → [{ key, n, label, status:'previous'|'open'|'upcoming', games:[...] }] sorted.
export function buildMatchdays(matches) {
  const byDay = new Map();
  for (const m of matches) {
    const k = usDateKey(m.kickoff);
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k).push(m);
  }
  const today = usToday();
  return [...byDay.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([key, games], i) => {
      const sorted = [...games].sort((x, y) => new Date(x.kickoff) - new Date(y.kickoff));
      const diff = dayDiff(today, key);
      const status = diff < 0 ? 'previous' : diff <= OPEN_DAYS - 1 ? 'open' : 'upcoming';
      return { key, n: i + 1, label: usDateLabel(sorted[0].kickoff), status, games: sorted };
    });
}

// Earliest kickoff (ms) among a matchday's games — drives the 30-min auto-lock.
export function matchdayKickoff(games) {
  return Math.min(...games.map((g) => new Date(g.kickoff).getTime()));
}

export const LOCK_LEAD_MS = 30 * 60 * 1000; // slips auto-lock 30 min before KO
