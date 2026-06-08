import React, { useState, useMemo, useEffect } from 'react';
import PropCard from '../components/PropCard.jsx';
import Flag from '../components/Flag.jsx';
import { teamShort } from '../lib/team.js';
import { buildMatchdays } from '../lib/matchday.js';
import { subscribeSlip } from '../lib/slipStore.js';

const ukTime = (iso) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
function relKickoff(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return { live: true, text: 'LIVE' };
  const h = Math.floor(ms / 3.6e6);
  const m = Math.floor((ms % 3.6e6) / 6e4);
  if (h >= 24) return { text: `${ukTime(iso)} UK` };
  if (h >= 1) return { text: `in ${h}h ${m}m` };
  return { text: `in ${m}m` };
}

const TABS = [
  { id: 'open', label: 'Open' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'previous', label: 'Previous' },
];

export default function Today({ matches, pickFor, onPick, max, count, locked, uid, onOpenMatchday }) {
  const [tab, setTab] = useState('open');
  const [dayKey, setDayKey] = useState(null);
  const [matchId, setMatchId] = useState(null);

  const matchdays = useMemo(() => buildMatchdays(matches), [matches]);
  const selectedDay = dayKey ? matchdays.find((d) => d.key === dayKey) : null;
  const selectedMatch = matchId ? matches.find((m) => m.id === matchId) : null;

  // Tell the app which match day's slip is in context (open days only).
  useEffect(() => {
    if (selectedDay && selectedDay.status === 'open') onOpenMatchday?.(selectedDay.key);
  }, [selectedDay, onOpenMatchday]);

  // Level 3 — props for a chosen game in an OPEN match day.
  if (selectedMatch && selectedDay?.status === 'open') {
    return (
      <MatchProps key={selectedMatch.id} match={selectedMatch} onBack={() => setMatchId(null)}
        pickFor={pickFor} onPick={onPick} max={max} count={count} locked={locked} />
    );
  }
  // Level 2 — a match day's games (open = playable, previous = results).
  if (selectedDay) {
    return selectedDay.status === 'previous'
      ? <PreviousDay md={selectedDay} uid={uid} onBack={() => setDayKey(null)} />
      : <GamesList md={selectedDay} onBack={() => setDayKey(null)} onPick={setMatchId} count={count} max={max} />;
  }
  // Level 1 — match-day list with the Open/Upcoming/Previous toggle.
  const list = matchdays.filter((d) => d.status === tab);
  return (
    <div>
      <h1 className="mt-2 font-display text-3xl">MATCH DAYS</h1>
      <SlipBar count={count} max={max} />

      <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-panel2 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg py-2 text-xs font-bold transition ${tab === t.id ? 'bg-more text-ink' : 'text-mist'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyTab tab={tab} />
      ) : (
        <div className="mt-3 space-y-2.5">
          {list.map((d) => <MatchdayCard key={d.key} d={d} onPick={setDayKey} />)}
        </div>
      )}
    </div>
  );
}

function teamsOfDay(games) {
  const seen = new Map();
  for (const g of games) for (const t of [g.home, g.away]) if (!seen.has(t.code)) seen.set(t.code, t);
  return [...seen.values()];
}

function MatchdayCard({ d, onPick }) {
  const locked = d.status === 'upcoming';
  const prev = d.status === 'previous';
  return (
    <button
      onClick={() => !locked && onPick(d.key)}
      disabled={locked}
      className={`group relative w-full overflow-hidden rounded-2xl border p-4 text-left transition ${
        locked ? 'border-line bg-panel/60 opacity-70' : 'border-line bg-panel active:scale-[0.99] hover:border-more/50'
      }`}
    >
      {!locked && <div className={`pointer-events-none absolute inset-y-0 right-0 w-1.5 ${prev ? 'bg-gold/40' : 'bg-more/50'}`} />}
      <div className="flex items-center justify-between">
        <div>
          <div className="font-display text-2xl leading-none">MATCHDAY {d.n}</div>
          <div className="mt-1 text-xs font-semibold text-mist">{d.label}</div>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${locked ? 'bg-panel2 text-mist' : prev ? 'bg-gold/15 text-gold' : 'bg-more/15 text-more'}`}>
          {locked ? 'Locked' : prev ? 'Results ›' : `${d.games.length} ${d.games.length === 1 ? 'game' : 'games'} ›`}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {teamsOfDay(d.games).slice(0, 12).map((t) => <Flag key={t.code} team={t} size="h-5 w-5" />)}
      </div>
    </button>
  );
}

function GamesList({ md, onBack, onPick, count, max }) {
  return (
    <div>
      <BackHeader onBack={onBack} title={`MATCHDAY ${md.n}`} sub={md.label} />
      <SlipBar count={count} max={max} />
      <div className="mt-3 space-y-2.5">
        {md.games.map((m) => {
          const k = relKickoff(m.kickoff);
          return (
            <button key={m.id} onClick={() => onPick(m.id)}
              className="w-full rounded-2xl border border-line bg-panel p-4 text-left transition active:scale-[0.99] hover:border-more/50">
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

function PreviousDay({ md, uid, onBack }) {
  const [slip, setSlip] = useState(undefined); // undefined = loading
  useEffect(() => subscribeSlip(uid, md.key, setSlip), [uid, md.key]);
  const byMatch = {};
  (slip?.picks || []).forEach((p) => { (byMatch[p.matchId] ||= []).push(p); });

  return (
    <div>
      <BackHeader onBack={onBack} title={`MATCHDAY ${md.n}`} sub={`${md.label} · results`} />
      {slip?.scored != null && (
        <div className="mt-2 flex items-center justify-between rounded-xl border border-gold/40 bg-gold/10 px-3 py-2">
          <span className="text-xs font-bold text-gold">Your slip scored</span>
          <span className="font-display text-xl text-gold">{slip.scored} pts</span>
        </div>
      )}
      <div className="mt-3 space-y-2.5">
        {md.games.map((m) => {
          const sc = m.score || {};
          const final = sc.home != null && sc.away != null;
          const myPicks = byMatch[m.id] || [];
          return (
            <div key={m.id} className="rounded-2xl border border-line bg-panel p-4">
              <div className="flex items-center justify-between">
                <TeamRow team={m.home} />
                <span className="px-3 font-display text-2xl">{final ? `${sc.home}–${sc.away}` : 'FT'}</span>
                <TeamRow team={m.away} right />
              </div>
              {myPicks.length > 0 && (
                <div className="mt-3 space-y-1.5 border-t border-line pt-3">
                  {myPicks.map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-[12px]">
                      <span className="font-semibold">
                        <span className={p.void ? 'text-mist' : p.correct ? 'text-more' : 'text-less'}>
                          {p.void ? '—' : p.correct ? '✓' : '✗'}
                        </span>{' '}
                        {p.playerName} <span className="text-mist">{p.side} {p.label} {p.line}</span>
                      </span>
                      <span className="font-bold text-gold">{p.void ? 'void' : `+${p.awarded ?? 0}`}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
      <button onClick={onBack} aria-label="Back"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-panel text-lg text-mist transition active:scale-95 hover:text-white">‹</button>
      <div className="leading-tight">
        <div className="font-display text-2xl">{title}</div>
        {sub && <div className="text-[11px] font-semibold text-mist">{sub}</div>}
      </div>
    </div>
  );
}

function SlipBar({ count, max }) {
  return (
    <div className="mt-2 flex items-center justify-between rounded-xl border border-line bg-panel px-3 py-2">
      <span className="text-xs font-semibold text-mist">
        Lock in your best <span className="text-white">{max}</span> for the match day.
      </span>
      <span className="font-display text-lg text-gold">{count}/{max}</span>
    </div>
  );
}

function EmptyTab({ tab }) {
  const msg = tab === 'open'
    ? 'No match days open right now — the next ones unlock 4 days out.'
    : tab === 'upcoming' ? 'No upcoming match days loaded yet.' : 'No finished match days yet.';
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <p className="max-w-xs text-sm font-semibold text-mist">{msg}</p>
    </div>
  );
}

// --- Level 3: a match's player props ---------------------------------------
function MatchProps({ match, onBack, pickFor, onPick, max, count, locked }) {
  const [posFilter, setPosFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const atCap = count >= max;

  const FILTERS = ['F', 'M', 'D', 'G'];
  const FILTER_LABEL = { F: 'Forwards', M: 'Midfield', D: 'Defence', G: 'Keepers' };
  const TEAMS = [match.home, match.away];

  const POS_ORDER = { F: 0, M: 1, D: 2, G: 3 };
  const players = useMemo(() => {
    const byId = new Map();
    for (const p of match.props || []) {
      if (!byId.has(p.playerId)) {
        byId.set(p.playerId, {
          id: p.playerId, name: p.playerName, position: p.position, teamCode: p.teamCode,
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

  const shown = players.filter((pl) => (!posFilter || pl.position === posFilter) && (!teamFilter || pl.teamCode === teamFilter));

  return (
    <div>
      <BackHeader onBack={onBack}
        title={`${teamShort(match.home.name, match.home.code)} v ${teamShort(match.away.name, match.away.code)}`}
        sub={match.stage} />

      {locked ? (
        <div className="mt-2 flex items-center justify-between rounded-xl border border-gold/40 bg-gold/10 px-3 py-2">
          <span className="text-xs font-bold text-gold">Locked — kickoff is near.</span>
          <span className="font-display text-lg text-gold">{count}/{max}</span>
        </div>
      ) : (
        <SlipBar count={count} max={max} />
      )}

      <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
        {TEAMS.map((t) => (
          <button key={t.code} aria-label={`team-${t.code}`}
            onClick={() => setTeamFilter((v) => (v === t.code ? '' : t.code))}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
              teamFilter === t.code ? 'bg-more text-ink' : 'border border-line bg-panel text-mist'}`}>
            <Flag team={t} size="h-3.5 w-3.5" />
            {teamShort(t.name, t.code)}
          </button>
        ))}
      </div>

      <div className="no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setPosFilter((v) => (v === f ? '' : f))}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
              posFilter === f ? 'bg-more text-ink' : 'border border-line bg-panel text-mist'}`}>
            {FILTER_LABEL[f]}
          </button>
        ))}
      </div>

      <div className="mt-3 space-y-2.5">
        {shown.map((player) => (
          <PropCard key={player.id} player={player} props={player.props}
            pickFor={pickFor} onPick={onPick} locked={locked} atCap={atCap} />
        ))}
      </div>
    </div>
  );
}
