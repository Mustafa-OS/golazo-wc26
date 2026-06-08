import React, { useState, useMemo, useEffect } from 'react';
import PropCard from '../components/PropCard.jsx';
import Flag from '../components/Flag.jsx';
import { teamShort } from '../lib/team.js';

// The 2026 World Cup is US-hosted, so group fixtures into match days by US
// Eastern calendar date (not UTC/UK) — keeps a whole evening's slate together.
const US_TZ = 'America/New_York';
const usDateKey = (iso) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: US_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
const usDateLabel = (iso) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: US_TZ, weekday: 'long', day: 'numeric', month: 'short' }).format(new Date(iso));
const ukTime = (iso) =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

function relKickoff(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return { live: true, text: '🔴 LIVE' };
  const h = Math.floor(ms / 3.6e6);
  const m = Math.floor((ms % 3.6e6) / 6e4);
  if (h >= 24) return { text: `${ukTime(iso)} UK` };
  if (h >= 1) return { text: `in ${h}h ${m}m` };
  return { text: `in ${m}m` };
}

export default function Today({ matches, pickFor, onPick, max, count, locked }) {
  const [dayKey, setDayKey] = useState(null);
  const [matchId, setMatchId] = useState(null);

  const matchdays = useMemo(() => {
    const byDay = new Map();
    for (const m of matches) {
      const k = usDateKey(m.kickoff);
      if (!byDay.has(k)) byDay.set(k, []);
      byDay.get(k).push(m);
    }
    return [...byDay.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([key, games], i) => ({
        key,
        n: i + 1,
        label: usDateLabel(games[0].kickoff),
        games: [...games].sort((x, y) => new Date(x.kickoff) - new Date(y.kickoff)),
      }));
  }, [matches]);

  const selectedMatch = matchId ? matches.find((m) => m.id === matchId) : null;
  const selectedDay = dayKey ? matchdays.find((d) => d.key === dayKey) : null;

  if (selectedMatch) {
    return (
      <MatchProps
        key={selectedMatch.id}
        match={selectedMatch}
        onBack={() => setMatchId(null)}
        pickFor={pickFor}
        onPick={onPick}
        max={max}
        count={count}
        locked={locked}
      />
    );
  }
  if (selectedDay) {
    return <GamesList md={selectedDay} onBack={() => setDayKey(null)} onPick={setMatchId} count={count} max={max} />;
  }
  return <MatchdayList matchdays={matchdays} onPick={setDayKey} count={count} max={max} />;
}

// --- shared bits -----------------------------------------------------------
function SlipBar({ count, max }) {
  return (
    <div className="mt-2 flex items-center justify-between rounded-xl border border-line bg-panel px-3 py-2">
      <span className="text-xs font-semibold text-mist">
        Tap <span className="text-more">MORE</span> / <span className="text-less">LESS</span> — lock your best{' '}
        <span className="text-white">{max}</span>.
      </span>
      <span className="font-display text-lg text-gold">{count}/{max}</span>
    </div>
  );
}

function teamsOfDay(games) {
  const seen = new Map();
  for (const g of games) {
    for (const t of [g.home, g.away]) if (!seen.has(t.code)) seen.set(t.code, t);
  }
  return [...seen.values()];
}

// --- Level 1: match days ---------------------------------------------------
function MatchdayList({ matchdays, onPick, count, max }) {
  return (
    <div>
      <div className="mt-2 flex items-end justify-between">
        <h1 className="font-display text-3xl">MATCH DAYS</h1>
        <span className="pb-1 text-2xl">⚽</span>
      </div>
      <SlipBar count={count} max={max} />

      {matchdays.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="mt-3 space-y-2.5">
          {matchdays.map((d) => {
            const teams = teamsOfDay(d.games);
            return (
              <button
                key={d.key}
                onClick={() => onPick(d.key)}
                className="group relative w-full overflow-hidden rounded-2xl border border-line bg-panel p-4 text-left transition active:scale-[0.99] hover:border-more/50"
              >
                {/* pitch-stripe accent */}
                <div className="pointer-events-none absolute inset-y-0 right-0 w-1.5 bg-more/40" />
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-display text-2xl leading-none">
                      MATCHDAY {d.n}
                    </div>
                    <div className="mt-1 text-xs font-semibold text-mist">{d.label}</div>
                  </div>
                  <span className="rounded-full bg-panel2 px-3 py-1 text-xs font-bold text-mist">
                    {d.games.length} {d.games.length === 1 ? 'game' : 'games'} ›
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {teams.slice(0, 12).map((t) => (
                    <Flag key={t.code} team={t} size="h-5 w-5" />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- Level 2: games in a match day -----------------------------------------
function GamesList({ md, onBack, onPick, count, max }) {
  return (
    <div>
      <BackHeader onBack={onBack} title={`MATCHDAY ${md.n}`} sub={md.label} />
      <SlipBar count={count} max={max} />
      <div className="mt-3 space-y-2.5">
        {md.games.map((m) => {
          const k = relKickoff(m.kickoff);
          return (
            <button
              key={m.id}
              onClick={() => onPick(m.id)}
              className="w-full rounded-2xl border border-line bg-panel p-4 text-left transition active:scale-[0.99] hover:border-more/50"
            >
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-mist">{m.stage}</div>
                <div className={`text-[11px] font-bold ${k.live ? 'text-less' : 'text-mist'}`}>{k.text}</div>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <TeamRow team={m.home} />
                <span className="px-3 font-display text-lg text-mist">v</span>
                <TeamRow team={m.away} right />
              </div>
              <div className="mt-2 text-center text-[11px] font-bold text-more">Tap to pick players ›</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TeamRow({ team, right }) {
  return (
    <div className={`flex flex-1 items-center gap-2 ${right ? 'flex-row-reverse text-right' : ''}`}>
      <Flag team={team} size="h-6 w-6" />
      <span className="truncate text-base font-extrabold">{team.name}</span>
    </div>
  );
}

function BackHeader({ onBack, title, sub }) {
  return (
    <div className="mt-2 flex items-center gap-3">
      <button
        onClick={onBack}
        aria-label="Back"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-panel text-lg text-mist transition active:scale-95 hover:text-white"
      >
        ‹
      </button>
      <div className="leading-tight">
        <div className="font-display text-2xl">{title}</div>
        {sub && <div className="text-[11px] font-semibold text-mist">{sub}</div>}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <div className="text-5xl">🗓️</div>
      <h2 className="mt-4 font-display text-2xl">NO MATCH DAYS YET</h2>
      <p className="mt-2 max-w-xs text-sm font-semibold text-mist">
        Lines drop every morning once fixtures are in. Check back soon to build your slip.
      </p>
    </div>
  );
}

// --- Level 3: a match's player props ---------------------------------------
function MatchProps({ match, onBack, pickFor, onPick, max, count, locked }) {
  const [posFilter, setPosFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');

  const matchStarted = Date.now() >= new Date(match.kickoff).getTime();
  const propsLocked = locked || matchStarted;
  const atCap = count >= max;

  const FILTERS = ['F', 'M', 'D', 'G'];
  const FILTER_LABEL = { F: 'Forwards', M: 'Midfield', D: 'Defence', G: 'Keepers' };
  const TEAMS = [match.home, match.away];

  const POS_ORDER = { F: 0, M: 1, D: 2, G: 3 };
  const players = useMemo(() => {
    const byId = new Map();
    for (const p of match.props) {
      if (!byId.has(p.playerId)) {
        byId.set(p.playerId, {
          id: p.playerId,
          name: p.playerName,
          position: p.position,
          teamCode: p.teamCode,
          teamShort: teamShort(p.team, p.teamCode),
          flag: String(p.teamCode) === String(match.home.code) ? match.home.flag : match.away.flag,
          props: [],
        });
      }
      byId.get(p.playerId).props.push(p);
    }
    return [...byId.values()]
      .map((pl, i) => ({ pl, i }))
      .sort((a, b) => (POS_ORDER[a.pl.position] - POS_ORDER[b.pl.position]) || (a.i - b.i))
      .map(({ pl }) => pl);
  }, [match]);

  const shown = players.filter(
    (pl) => (!posFilter || pl.position === posFilter) && (!teamFilter || pl.teamCode === teamFilter)
  );

  return (
    <div>
      <BackHeader
        onBack={onBack}
        title={`${teamShort(match.home.name, match.home.code)} v ${teamShort(match.away.name, match.away.code)}`}
        sub={match.stage}
      />

      {locked ? (
        <div className="mt-2 flex items-center justify-between rounded-xl border border-gold/40 bg-gold/10 px-3 py-2">
          <span className="text-xs font-bold text-gold">🔒 Slip locked in — no more edits.</span>
          <span className="font-display text-lg text-gold">{count}/{max}</span>
        </div>
      ) : (
        <SlipBar count={count} max={max} />
      )}

      {/* team filter (tap again to clear) */}
      <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
        {TEAMS.map((t) => (
          <button
            key={t.code}
            aria-label={`team-${t.code}`}
            onClick={() => setTeamFilter((v) => (v === t.code ? '' : t.code))}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
              teamFilter === t.code ? 'bg-more text-ink' : 'border border-line bg-panel text-mist'
            }`}
          >
            <Flag team={t} size="h-3.5 w-3.5" />
            {teamShort(t.name, t.code)}
          </button>
        ))}
      </div>

      {/* position filter (tap again to clear) */}
      <div className="no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setPosFilter((v) => (v === f ? '' : f))}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
              posFilter === f ? 'bg-more text-ink' : 'border border-line bg-panel text-mist'
            }`}
          >
            {FILTER_LABEL[f]}
          </button>
        ))}
      </div>

      {matchStarted && !locked && (
        <div className="mt-3 rounded-xl border border-line bg-panel px-3 py-2 text-center text-xs font-bold text-mist">
          ⏱️ This match has kicked off — lines are closed.
        </div>
      )}

      <div className="mt-3 space-y-2.5">
        {shown.map((player) => (
          <PropCard
            key={player.id}
            player={player}
            props={player.props}
            pickFor={pickFor}
            onPick={onPick}
            locked={propsLocked}
            atCap={atCap}
          />
        ))}
      </div>
    </div>
  );
}
