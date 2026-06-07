import React from 'react';

export default function PickSlip({ picks, max, locked, onRemove, onLock, onClose }) {
  const potential = picks.reduce((s, p) => s + p.value, 0);

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="animate-slideup relative mx-auto w-full max-w-md rounded-t-3xl border-t border-line bg-panel px-4 pb-8 pt-3">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-2xl">YOUR SLIP</h2>
          <div className="flex items-center gap-2">
            {locked ? (
              <span className="rounded-full bg-gold/15 px-3 py-1 text-sm font-bold text-gold">🔒 Locked</span>
            ) : (
              <span className="rounded-full bg-panel2 px-3 py-1 text-sm font-bold text-mist">
                {picks.length}/{max}
              </span>
            )}
            <button
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-panel2 text-mist transition hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>

        {picks.length === 0 ? (
          <p className="py-10 text-center text-sm text-mist">
            No picks yet. Tap <span className="text-more">MORE</span> or{' '}
            <span className="text-less">LESS</span> on a prop to start your slip.
          </p>
        ) : (
          <div className="max-h-[45vh] space-y-2 overflow-y-auto">
            {picks.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-line bg-panel2 px-3 py-2.5"
              >
                <div className="leading-tight">
                  <div className="text-sm font-bold">{p.playerName}</div>
                  <div className="text-[11px] font-semibold text-mist">
                    <span className={p.side === 'MORE' ? 'text-more' : 'text-less'}>
                      {p.side === 'MORE' ? '▲ MORE' : '▼ LESS'}
                    </span>{' '}
                    · {p.label} {p.line}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-display text-lg text-gold">+{p.value}</span>
                  {!locked && (
                    <button
                      onClick={() => onRemove(p.id)}
                      className="text-mist transition hover:text-less"
                      aria-label="Remove pick"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between rounded-2xl border border-line bg-panel2 px-4 py-3">
          <span className="text-sm font-semibold text-mist">Max potential</span>
          <span className="font-display text-3xl text-gold">{potential} pts</span>
        </div>

        {locked ? (
          <div className="mt-3 w-full rounded-2xl border border-gold/40 bg-gold/10 py-3.5 text-center font-display text-lg tracking-wide text-gold">
            🔒 SLIP LOCKED
          </div>
        ) : (
          <button
            disabled={picks.length === 0}
            onClick={() => { onLock(); onClose(); }}
            className="mt-3 w-full rounded-2xl bg-more py-3.5 font-display text-lg tracking-wide text-ink transition active:scale-[0.98] disabled:opacity-40"
          >
            LOCK SLIP
          </button>
        )}
        <p className="mt-2 text-center text-[11px] text-mist">
          {locked
            ? 'Your picks are in. Good luck! 🍀'
            : 'Locking is final · picks also lock automatically at the first kickoff'}
        </p>
      </div>
    </div>
  );
}
