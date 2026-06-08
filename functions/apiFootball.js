// ============================================================================
// API-FOOTBALL CLIENT  (runs ONLY inside Cloud Functions — never the browser)
// ----------------------------------------------------------------------------
// Wraps the three calls we need for the World Cup (league 1, season 2026):
//   1. fixtures        -> what's on, and when it kicks off
//   2. lineups/squads  -> who's playing, with positions (to build props)
//   3. fixture players -> per-player match stats (to resolve props)
//
// IMPORTANT ARCHITECTURE NOTE:
//   This client is called by SCHEDULED functions a handful of times per day and
//   the results are written to Firestore. End users NEVER call API-Football.
//   That's what keeps you inside the rate limit no matter how many people play.
//
// Free tier (build/test): 100 req/day, no live data.
// Pro tier ($19/mo, set before June 11): 7,500 req/day + live data + player stats.
// ============================================================================

const BASE = 'https://v3.football.api-sports.io';
const LEAGUE_WORLD_CUP = 1;
// Configurable so go-live is just an env change and we can validate the pipeline
// against a free season (2022-2024) before upgrading to Pro for 2026.
const SEASON = Number(process.env.WC_SEASON) || 2026;

// Map API-Football's position strings to our G/D/M/F buckets. The squads
// endpoint says "Attacker" (A); lineups say "F" — fold both to F.
function mapPosition(apiPos) {
  if (!apiPos) return 'M';
  const p = apiPos[0].toUpperCase();
  if (p === 'A') return 'F';
  return ['G', 'D', 'M', 'F'].includes(p) ? p : 'M';
}

async function call(path, params, apiKey) {
  const url = new URL(BASE + path);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url, { headers: { 'x-apisports-key': apiKey } });
  if (!res.ok) throw new Error(`API-Football ${path} -> ${res.status}`);
  const json = await res.json();
  if (json.errors && Object.keys(json.errors).length) {
    throw new Error(`API-Football errors: ${JSON.stringify(json.errors)}`);
  }
  return json.response;
}

/** All World Cup fixtures (optionally for a single date YYYY-MM-DD). */
export async function getFixtures(apiKey, date, season = SEASON) {
  const params = { league: LEAGUE_WORLD_CUP, season };
  if (date) params.date = date;
  const rows = await call('/fixtures', params, apiKey);
  return rows.map((r) => ({
    id: String(r.fixture.id),
    kickoff: r.fixture.date,
    status: r.fixture.status.short, // NS, 1H, HT, FT ...
    stage: r.league.round,
    home: { name: r.teams.home.name, code: r.teams.home.id, flag: r.teams.home.logo },
    away: { name: r.teams.away.name, code: r.teams.away.id, flag: r.teams.away.logo },
  }));
}

/**
 * Full squad for a team, with our position buckets. Unlike lineups (which only
 * appear ~1h before kickoff), squads are available all day — so props can be
 * generated at 08:00. Players who don't actually play are voided at resolution
 * (see scoringEngine MIN_MINUTES).
 */
export async function getSquad(apiKey, teamId) {
  const rows = await call('/players/squads', { team: teamId }, apiKey);
  const players = rows[0]?.players || [];
  return players.map((p) => ({
    id: String(p.id),
    name: p.name,
    position: mapPosition(p.position),
  }));
}

/**
 * Full player names via /players (firstname + lastname), paginated. Positions
 * from this feed are unreliable pre-tournament (no games yet), so callers should
 * keep squad positions and only use this to upgrade the display name.
 * @returns {object} { [playerId]: fullName }
 */
export async function getPlayerNames(apiKey, teamId, season = SEASON) {
  const names = {};
  let page = 1;
  for (;;) {
    const url = new URL(BASE + '/players');
    url.searchParams.set('team', teamId);
    url.searchParams.set('season', season);
    url.searchParams.set('page', page);
    const res = await fetch(url, { headers: { 'x-apisports-key': apiKey } });
    if (!res.ok) throw new Error(`API-Football /players -> ${res.status}`);
    const json = await res.json();
    if (json.errors && Object.keys(json.errors).length) throw new Error(`API-Football errors: ${JSON.stringify(json.errors)}`);
    for (const r of json.response || []) {
      // Prefer the clean common name ("Álvaro Fidalgo") when it's not abbreviated;
      // some commons are still initials ("G. Ochoa") -> use the full legal name.
      const common = r.player.name || '';
      const legal = [r.player.firstname, r.player.lastname].filter(Boolean).join(' ');
      const abbreviated = /(^|\s)[A-Z]\.\s/.test(common);
      const full = (!abbreviated && common) ? common : (legal || common);
      if (full) names[String(r.player.id)] = full;
    }
    const total = json.paging?.total || 1;
    if (page >= total) break;
    page++;
  }
  return names;
}

/** Starting XI + bench for a fixture, with our position buckets. */
export async function getLineups(apiKey, fixtureId) {
  const rows = await call('/fixtures/lineups', { fixture: fixtureId }, apiKey);
  const out = {};
  for (const side of rows) {
    const teamCode = side.team.id;
    const players = [...(side.startXI || []), ...(side.substitutes || [])].map((x) => ({
      id: String(x.player.id),
      name: x.player.name,
      position: mapPosition(x.player.pos),
      team: side.team.name,
      teamCode,
    }));
    out[teamCode] = { name: side.team.name, players };
  }
  return out; // { [teamId]: { name, players } }
}

/**
 * Per-player stats for a finished fixture, normalised to our METRIC keys so the
 * scoring engine can read them directly (actual[pick.metric]).
 * @returns {object} { [playerId]: { goals, assists, shots, shotsOn, saves, ... } }
 */
export function normalisePlayerStats(apiResponse) {
  const byPlayer = {};
  for (const side of apiResponse) {
    for (const entry of side.players) {
      const s = entry.statistics?.[0] || {};
      byPlayer[String(entry.player.id)] = {
        minutes: s.games?.minutes ?? 0, // drives DNP voiding at resolution
        goals: s.goals?.total ?? 0,
        assists: s.goals?.assists ?? 0,
        saves: s.goals?.saves ?? 0,
        conceded: s.goals?.conceded ?? 0,
        shots: s.shots?.total ?? 0,
        shotsOn: s.shots?.on ?? 0,
        passes: s.passes?.total ?? 0,
        tackles: s.tackles?.total ?? 0,
        fouls: s.fouls?.committed ?? 0,
        cards: (s.cards?.yellow ?? 0) + (s.cards?.red ?? 0),
      };
    }
  }
  return byPlayer;
}

export async function getPlayerStats(apiKey, fixtureId) {
  const rows = await call('/fixtures/players', { fixture: fixtureId }, apiKey);
  return normalisePlayerStats(rows);
}
