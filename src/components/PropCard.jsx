import React from 'react';
import { sideProbability, pickValue } from '../lib/scoringEngine.js';

const POS_LABEL = { G: 'GK', D: 'DEF', M: 'MID', F: 'FWD' };

export default function PropCard({ prop, picked, onPick, locked }) {
  const morePts = pickValue(prop, 'MORE');
  const lessPts = pickValue(prop, 'LESS');
  const moreChance = Math.round(sideProbability(prop, 'MORE') * 100);

  return (
    <div className="animate-popin rounded-2xl border border-line bg-panel p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-panel2 text-[11px] font-extrabold text-mist">
            {prop.teamCode?.toString().slice(0, 3).toUpperCase()}
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold">{prop.playerName}</div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-mist">
              {POS_LABEL[prop.position]} · {prop.label}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-display text-2xl leading-none">{prop.line}</div>
          <div className="text-[10px] font-semibold uppercase text-mist">{prop.short}</div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <SideButton
          side="MORE"
          pts={morePts}
          active={picked?.side === 'MORE'}
          disabled={locked}
          onClick={() => onPick(prop, 'MORE')}
        />
        <SideButton
          side="LESS"
          pts={lessPts}
          active={picked?.side === 'LESS'}
          disabled={locked}
          onClick={() => onPick(prop, 'LESS')}
        />
      </div>
      <div className="mt-1.5 text-center text-[10px] text-mist">
        model: {moreChance}% chance of MORE
      </div>
    </div>
  );
}

// Full class strings (no string interpolation) so Tailwind's purge keeps them.
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
  const base =
    'flex items-center justify-between rounded-xl px-3 py-2.5 font-extrabold transition active:scale-[0.97]';
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${active ? s.active : s.idle}`}>
      <span className="flex items-center gap-1.5 text-sm">
        <span className="text-base">{s.arrow}</span>
        {side}
      </span>
      <span className={`text-xs ${active ? 'text-ink/70' : 'text-mist'}`}>+{pts}</span>
    </button>
  );
}
