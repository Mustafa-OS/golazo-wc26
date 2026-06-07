import React, { useState } from 'react';
import PropCard from '../components/PropCard.jsx';

function kickoffLabel(iso) {
  const d = new Date(iso);
  return d.toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function Today({ matches, pickFor, onPick, max, count }) {
  const [activeId, setActiveId] = useState(matches[0]?.id);
  const [posFilter, setPosFilter] = useState('ALL');
  const match = matches.find((m) => m.id === activeId) || matches[0];

  const FILTERS = ['ALL', 'F', 'M', 'D', 'G'];
  const FILTER_LABEL = { ALL: 'All', F: 'FWD', M: 'MID', D: 'DEF', G: 'GK' };

  const props =
    posFilter === 'ALL' ? match.props : match.props.filter((p) => p.position === posFilter);

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
              <span>{m.home.flag}</span>
              <span>{m.home.code}</span>
              <span className="text-mist">v</span>
              <span>{m.away.code}</span>
              <span>{m.away.flag}</span>
            </div>
            <div className="mt-1 text-[11px] font-semibold text-mist">{kickoffLabel(m.kickoff)}</div>
          </button>
        ))}
      </div>

      {/* cap nudge */}
      <div className="mt-2 flex items-center justify-between rounded-xl border border-line bg-panel px-3 py-2">
        <span className="text-xs font-semibold text-mist">
          Tap <span className="text-more">MORE</span> or <span className="text-less">LESS</span>. Best{' '}
          <span className="text-white">{max}</span> lock at kickoff.
        </span>
        <span className="font-display text-lg text-gold">{count}/{max}</span>
      </div>

      {/* position filter */}
      <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setPosFilter(f)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
              posFilter === f ? 'bg-more text-ink' : 'border border-line bg-panel text-mist'
            }`}
          >
            {FILTER_LABEL[f]}
          </button>
        ))}
      </div>

      {/* props */}
      <div className="mt-3 space-y-2.5">
        {props.map((prop) => (
          <PropCard key={prop.id} prop={prop} picked={pickFor(prop.id)} onPick={onPick} />
        ))}
      </div>
    </div>
  );
}
