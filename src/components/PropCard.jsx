import React, { useState, useEffect } from 'react';
import { sideProbability, pickValue } from '../lib/scoringEngine.js';

const POS_LABEL = { G: 'GK', D: 'DEF', M: 'MID', F: 'FWD' };

// One card per PLAYER. The player's props (one per metric) are selectable via
// chips; the line / MORE / LESS / model% all update for the chosen metric, and
// a chip is dotted when that metric is already in the slip.
export default function PropCard({ player, props, pickFor, onPick, locked }) {
  const [metric, setMetric] = useState(props[0]?.metric);

  // If the prop set changes (e.g. live update), keep the selection valid.
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

  return (
    <div className="animate-popin rounded-2xl border border-line bg-panel p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-panel2 text-[11px] font-extrabold text-mist">
            {player.teamCode?.toString().slice(0, 3).toUpperCase()}
          </div>
          <div className="leading-tight">
            <div className="flex items-center gap-1.5 text-sm font-bold">
              {player.name}
              {pickedMetrics > 0 && (
                <span className="rounded-full bg-more/15 px-1.5 text-[10px] font-extrabold text-more">
                  {pickedMetrics} in slip
                </span>
              )}
            </div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-mist">
              {POS_LABEL[player.position]} · {active.label}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-display text-2xl leading-none">{active.line}</div>
          <div className="text-[10px] font-semibold uppercase text-mist">{active.short}</div>
        </div>
      </div>

      {/* metric selector (only when the player has more than one) */}
      {props.length > 1 && (
        <div className="no-scrollbar -mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1">
          {props.map((p) => {
            const sel = p.metric === metric;
            const inSlip = !!pickFor(p.id);
            return (
              <button
                key={p.metric}
                onClick={() => setMetric(p.metric)}
                className={`flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide transition ${
                  sel ? 'bg-panel2 text-white ring-1 ring-line' : 'text-mist hover:text-white'
                }`}
              >
                {p.short}
                {inSlip && <span className="h-1.5 w-1.5 rounded-full bg-more" />}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <SideButton
          side="MORE"
          pts={morePts}
          active={picked?.side === 'MORE'}
          disabled={locked}
          onClick={() => onPick(active, 'MORE')}
        />
        <SideButton
          side="LESS"
          pts={lessPts}
          active={picked?.side === 'LESS'}
          disabled={locked}
          onClick={() => onPick(active, 'LESS')}
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
    'flex items-center justify-between rounded-xl px-3 py-2.5 font-extrabold transition active:scale-[0.97] disabled:opacity-60';
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
