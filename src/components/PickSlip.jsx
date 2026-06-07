import React, { useState } from 'react';

export default function PickSlip({ picks, max, locked, onRemove, onLock, onClose }) {
  const [shared, setShared] = useState(false);
  const potential = picks.reduce((s, p) => s + p.value, 0);
  const anySettled = picks.some((p) => p.correct !== undefined);
  const scored = picks.reduce((s, p) => s + (p.awarded ?? 0), 0);

  async function shareSlip() {
    const url = window.location.origin;
    const lines = picks.map(
      (p) => `${p.side === 'MORE' ? '▲' : '▼'} ${p.playerName} ${p.side} ${p.label} ${p.line}`
    );
    const text = `My OVER. slip 🔥\n${lines.join('\n')}\nMax ${potential} pts · play: ${url}`;
    try {
      if (navigator.share) await navigator.share({ title: 'My OVER. slip', text });
      else {
        await navigator.clipboard.writeText(text);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      }
    } catch { /* dismissed */ }
  }

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="animate-slideup relative mx-auto w-full max-w-md rounded-t-3xl border-t border-line bg-panel px-4 pb-8 pt-3">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-2xl">YOUR SLIP</h2>
          <div className="flex items-center gap-2">
            {anySettled ? (
              <span className="rounded-full bg-gold/15 px-3 py-1 text-sm font-bold text-gold">RESULTS</span>
            ) : locked ? (
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
            {picks.map((p) => {
              const isSettled = p.correct !== undefined;
              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between rounded-xl border bg-panel2 px-3 py-2.5 ${
                    isSettled ? (p.correct ? 'border-more/50' : 'border-less/40 opacity-70') : 'border-line'
                  }`}
                >
                  <div className="flex items-center gap-2.5 leading-tight">
                    {isSettled && (
                      <span className={`text-lg ${p.correct ? 'text-more' : 'text-less'}`}>
                        {p.correct ? '✓' : '✗'}
                      </span>
                    )}
                    <div>
                      <div className="text-sm font-bold">{p.playerName}</div>
                      <div className="text-[11px] font-semibold text-mist">
                        <span className={p.side === 'MORE' ? 'text-more' : 'text-less'}>
                          {p.side === 'MORE' ? '▲ MORE' : '▼ LESS'}
                        </span>{' '}
                        · {p.label} {p.line}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {isSettled ? (
                      <span className={`font-display text-lg ${p.correct ? 'text-more' : 'text-mist'}`}>
                        +{p.awarded ?? 0}
                      </span>
                    ) : (
                      <>
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
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between rounded-2xl border border-line bg-panel2 px-4 py-3">
          <span className="text-sm font-semibold text-mist">{anySettled ? 'You scored' : 'Max potential'}</span>
          <span className="font-display text-3xl text-gold">{anySettled ? scored : potential} pts</span>
        </div>

        {anySettled ? null : locked ? (
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

        {picks.length > 0 && (
          <button
            onClick={shareSlip}
            className="mt-3 w-full rounded-2xl border border-line bg-panel2 py-3 text-sm font-bold text-more transition active:scale-[0.98]"
          >
            {shared ? 'Slip copied ✓' : '📤 Share my slip'}
          </button>
        )}

        {!anySettled && (
          <p className="mt-2 text-center text-[11px] text-mist">
            {locked
              ? 'Your picks are in. Good luck! 🍀'
              : 'Locking is final · picks also lock automatically at the first kickoff'}
          </p>
        )}
      </div>
    </div>
  );
}
