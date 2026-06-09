import React, { useState, useEffect } from 'react';
import { sideProbability, pickValue } from '../lib/scoringEngine.js';
import Flag from './Flag.jsx';
import { IconStar } from './Icons.jsx';

const POS_LABEL = { G: 'GK', D: 'DEF', M: 'MID', F: 'FWD' };
// Readable metric labels (no cryptic abbreviations).
const METRIC_LABEL = {
  goals: 'Goals', assists: 'Assists', shots: 'Shots', shotsOn: 'On Target',
  saves: 'Saves', conceded: 'Conceded', tackles: 'Tackles', passes: 'Passes',
  fouls: 'Fouls', cards: 'Cards',
};
const ml = (m) => METRIC_LABEL[m] || m;

// One card per PLAYER; metric chips switch the line/points; tap MORE or LESS.
export default function PropCard({ player, props, pickFor, onPick, locked, atCap, popular }) {
  const [metric, setMetric] = useState(props[0]?.metric);
  useEffect(() => {
    if (!props.some((p) => p.metric === metric)) setMetric(props[0]?.metric);
  }, [props, metric]);

  const active = props.find((p) => p.metric === metric) || props[0];
  if (!active) return null;

  const morePts = pickValue(active, 'MORE');
  const lessPts = pickValue(active, 'LESS');
  const moreChance = Math.round(sideProbability(active, 'MORE') * 100);
  const picked = pickFor(active.id);
  const pickedMetrics = props.filter((p) => pickFor(p.id)).length;
  const sideDisabled = locked || (atCap && !picked);
  // Flag fallback uses the short code (letters) so it never mis-derives from a name.
  const flagTeam = { flag: player.flag, code: player.teamShort, name: player.teamShort };

  return (
    <div className="animate-popin rounded-2xl border border-line bg-panel p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Flag team={flagTeam} size="h-8 w-8" />
          <div className="leading-tight">
            <div className="flex items-center gap-1.5 text-sm font-bold">
              {popular && <IconStar size={13} className="shrink-0 text-gold" />}
              {player.name}
              {pickedMetrics > 0 && (
                <span className="rounded-full bg-more/15 px-1.5 text-[10px] font-extrabold text-more">
                  Picked
                </span>
              )}
            </div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-mist">
              {POS_LABEL[player.position]} · {player.teamShort}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-display text-5xl leading-none text-white">{active.line}</div>
          <div className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-mist">{ml(active.metric)}</div>
        </div>
      </div>

      {/* metric selector */}
      {props.length > 1 && (
        <div className="no-scrollbar -mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1">
          {props.map((p) => {
            const sel = p.metric === metric;
            const inSlip = !!pickFor(p.id);
            return (
              <button
                key={p.metric}
                onClick={() => setMetric(p.metric)}
                className={`flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                  sel ? 'bg-panel2 text-white ring-1 ring-line' : 'text-mist hover:text-white'
                }`}
              >
                {ml(p.metric)}
                {inSlip && <span className="h-1.5 w-1.5 rounded-full bg-more" />}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-3 text-center text-base font-bold text-white">
        More or less than <span className="text-more">{active.line}</span> {ml(active.metric).toLowerCase()}?
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <SideButton side="MORE" pts={morePts} active={picked?.side === 'MORE'} disabled={sideDisabled} onClick={() => onPick(active, 'MORE')} />
        <SideButton side="LESS" pts={lessPts} active={picked?.side === 'LESS'} disabled={sideDisabled} onClick={() => onPick(active, 'LESS')} />
      </div>
      <div className="mt-1.5 text-center text-[10px] text-mist">model: {moreChance}% chance of MORE</div>
    </div>
  );
}

// Full class strings (no interpolation) so Tailwind's purge keeps them.
const SIDE_STYLES = {
  MORE: {
    active: 'bg-more text-ink shadow-glow',
    idle: 'border border-line bg-panel2 text-more hover:border-more/50',
    arrow: '▲',
  },
  LESS: {
    active: 'bg-less text-ink shadow-glowless',
    idle: 'border border-line bg-panel2 text-less hover:border-less/50',
    arrow: '▼',
  },
};

function SideButton({ side, pts, active, disabled, onClick }) {
  const s = SIDE_STYLES[side];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 transition active:scale-[0.97] disabled:opacity-60 ${active ? s.active : s.idle}`}
    >
      <span className="flex items-center gap-1.5 text-sm font-extrabold">
        <span className="text-base">{s.arrow}</span>
        {side}
      </span>
      <span className={`font-display text-2xl leading-none ${active ? 'text-ink' : 'text-gold'}`}>+{pts}</span>
    </button>
  );
}
