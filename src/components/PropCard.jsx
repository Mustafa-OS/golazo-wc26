import React, { useState, useEffect } from 'react';
import { sideProbability, pickValue } from '../lib/scoringEngine.js';
import { isLogoUrl } from '../lib/team.js';

const POS_LABEL = { G: 'Goalkeeper', D: 'Defender', M: 'Midfielder', F: 'Forward' };

// Readable metric labels for the chips (less abbreviated than the short codes).
const CHIP = {
  goals: 'Goals', assists: 'Assists', shots: 'Shots', shotsOn: 'On Target',
  saves: 'Saves', conceded: 'Conceded', tackles: 'Tackles', passes: 'Passes',
  fouls: 'Fouls', cards: 'Cards',
};
const chipLabel = (m) => CHIP[m] || m;

function FlagBadge({ flag, short }) {
  if (isLogoUrl(flag)) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-panel2">
        <img src={flag} alt={short} className="h-7 w-7 object-contain" />
      </div>
    );
  }
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-panel2 text-2xl">
      {flag || <span className="text-[11px] font-extrabold text-mist">{short}</span>}
    </div>
  );
}

// One card per PLAYER. The metric chips switch the line / MORE / LESS / model%,
// and a chip is dotted when that metric is already in the slip.
export default function PropCard({ player, props, pickFor, onPick, locked, atCap }) {
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

  return (
    <div className="animate-popin rounded-2xl border border-line bg-panel p-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FlagBadge flag={player.flag} short={player.teamShort} />
          <div className="min-w-0 leading-tight">
            <div className="flex items-center gap-1.5 text-[15px] font-extrabold">
              <span className="truncate">{player.name}</span>
              {pickedMetrics > 0 && (
                <span className="rounded-full bg-more/15 px-1.5 text-[10px] font-extrabold text-more">
                  {pickedMetrics} in slip
                </span>
              )}
            </div>
            <div className="text-[11px] font-semibold text-mist">
              {player.teamShort} · {POS_LABEL[player.position] || player.position}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-display text-3xl leading-none text-white">{active.line}</div>
          <div className="text-[11px] font-semibold text-mist">{chipLabel(active.metric)}</div>
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
                className={`flex shrink-0 items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  sel ? 'bg-panel2 text-white ring-1 ring-line' : 'text-mist hover:text-white'
                }`}
              >
                {chipLabel(p.metric)}
                {inSlip && <span className="h-1.5 w-1.5 rounded-full bg-more" />}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <SideButton side="MORE" pts={morePts} active={picked?.side === 'MORE'} disabled={sideDisabled} onClick={() => onPick(active, 'MORE')} />
        <SideButton side="LESS" pts={lessPts} active={picked?.side === 'LESS'} disabled={sideDisabled} onClick={() => onPick(active, 'LESS')} />
      </div>
      <div className="mt-2 text-center text-[10px] text-mist">
        model: {moreChance}% chance of more than {active.line}
      </div>
    </div>
  );
}

// Full class strings (no interpolation) so Tailwind's purge keeps them.
const SIDE_STYLES = {
  MORE: { active: 'bg-more text-ink shadow-glow', idle: 'border border-line bg-panel2 text-more hover:border-more/50', arrow: '▲' },
  LESS: { active: 'bg-less text-ink shadow-glowless', idle: 'border border-line bg-panel2 text-less hover:border-less/50', arrow: '▼' },
};

function SideButton({ side, pts, active, disabled, onClick }) {
  const s = SIDE_STYLES[side];
  const base =
    'flex items-center justify-between rounded-xl px-3.5 py-3 transition active:scale-[0.97] disabled:opacity-60';
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${active ? s.active : s.idle}`}>
      <span className="flex items-center gap-1.5 text-sm font-extrabold">
        <span className="text-lg">{s.arrow}</span>
        {side}
      </span>
      <span className="flex items-baseline gap-0.5">
        <span className="font-display text-2xl leading-none">+{pts}</span>
        <span className="text-[10px] font-bold opacity-70">pts</span>
      </span>
    </button>
  );
}
