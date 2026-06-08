import React, { useState, useMemo, useEffect } from 'react';
import PropCard from '../components/PropCard.jsx';
import { isLogoUrl, teamShort } from '../lib/team.js';

// Team flag: emoji (mock) or logo image (live API).
function Flag({ team, size = 'h-4 w-4' }) {
  if (isLogoUrl(team.flag)) {
    return <img src={team.flag} alt="" className={`${size} shrink-0 rounded-sm object-contain`} />;
  }
  return <span>{team.flag}</span>;
}

function kickoffLabel(iso) {
  const d = new Date(iso);
  return d.toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
}

// Relative kickoff status for the match rail.
function relKickoff(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return { live: true, text: '🔴 LIVE' };
  const h = Math.floor(ms / 3.6e6);
  const m = Math.floor((ms % 3.6e6) / 6e4);
  if (h >= 24) return { text: kickoffLabel(iso) };
  if (h >= 1) return { text: `in ${h}h ${m}m` };
  return { text: `in ${m}m` };
}

export default function Today({ matches, pickFor, onPick, max, count, locked }) {
  const [activeId, setActiveId] = useState(matches[0]?.id);
  const [posFilter, setPosFilter] = useState(''); // '' = all positions
  const [teamFilter, setTeamFilter] = useState(''); // '' = both teams
  const match = matches.find((m) => m.id === activeId) || matches[0];

  // Team codes are match-specific, so reset the team filter when the match changes.
  useEffect(() => setTeamFilter(''), [activeId]);

  const FILTERS = ['F', 'M', 'D', 'G'];
  const FILTER_LABEL = { F: 'FWD', M: 'MID', D: 'DEF', G: 'GK' };
  const TEAMS = [
    { id: match.home.code, label: teamShort(match.home.name, match.home.code), team: match.home },
    { id: match.away.code, label: teamShort(match.away.name, match.away.code), team: match.away },
  ];

  const matchStarted = match && Date.now() >= new Date(match.kickoff).getTime();
  const propsLocked = locked || matchStarted;
  const atCap = count >= max;

  // One card per player: group this match's props by player, then surface the
  // most interesting props first (attackers before keepers).
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
    // Stable sort by position priority (keeps home-then-away within a position).
    return [...byId.values()]
      .map((pl, i) => ({ pl, i }))
      .sort((a, b) => (POS_ORDER[a.pl.position] - POS_ORDER[b.pl.position]) || (a.i - b.i))
      .map(({ pl }) => pl);
  }, [match]);

  const shown = players.filter(
    (pl) =>
      (!posFilter || pl.position === posFilter) &&
      (!teamFilter || pl.teamCode === teamFilter)
  );

  return (
    <div>
      {/* match rail */}
      <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 py-2">
        {matches.map((m) => (
          <button
            key={m.id}
            onClick={() => setActiveId(m.id)}
            className={`min-w-[150px] shrink-0 rounded-2xl border p-3 text-left transition ${
              m.id === activeId ? 'border-more bg-panel2' : 'border-line bg-panel'
            }`}
          >
            <div className="text-[10px] font-semibold uppercase tracking-wide text-mist">
              {m.stage}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-base font-extrabold">
              <Flag team={m.home} />
              <span>{teamShort(m.home.name, m.home.code)}</span>
              <span className="text-mist">v</span>
              <span>{teamShort(m.away.name, m.away.code)}</span>
              <Flag team={m.away} />
            </div>
            {(() => {
              const k = relKickoff(m.kickoff);
              return (
                <div className={`mt-1 text-[11px] font-bold ${k.live ? 'text-less' : 'text-mist'}`}>
                  {k.text}
                </div>
              );
            })()}
          </button>
        ))}
      </div>

      {/* cap nudge / locked banner */}
      {locked ? (
        <div className="mt-2 flex items-center justify-between rounded-xl border border-gold/40 bg-gold/10 px-3 py-2">
          <span className="text-xs font-bold text-gold">🔒 Slip locked in — no more edits.</span>
          <span className="font-display text-lg text-gold">{count}/{max}</span>
        </div>
      ) : (
        <div className="mt-2 flex items-center justify-between rounded-xl border border-line bg-panel px-3 py-2">
          <span className="text-xs font-semibold text-mist">
            Tap <span className="text-more">MORE</span> or <span className="text-less">LESS</span>. Best{' '}
            <span className="text-white">{max}</span> lock at kickoff.
          </span>
          <span className="font-display text-lg text-gold">{count}/{max}</span>
        </div>
      )}

      {/* team filter */}
      <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
        {TEAMS.map((t) => (
          <button
            key={t.id}
            aria-label={`team-${t.id}`}
            onClick={() => setTeamFilter((v) => (v === t.id ? '' : t.id))}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
              teamFilter === t.id ? 'bg-more text-ink' : 'border border-line bg-panel text-mist'
            }`}
          >
            {t.team && <Flag team={t.team} size="h-3.5 w-3.5" />}
            {t.label}
          </button>
        ))}
      </div>

      {/* position filter */}
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

      {/* per-match kickoff notice */}
      {matchStarted && !locked && (
        <div className="mt-3 rounded-xl border border-line bg-panel px-3 py-2 text-center text-xs font-bold text-mist">
          ⏱️ This match has kicked off — lines are closed.
        </div>
      )}

      {/* one card per player */}
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
