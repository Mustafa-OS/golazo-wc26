import React, { useState } from 'react';
import { slipPotential, powerMultiplier } from '../lib/scoringEngine.js';

// Actual settled payout for the results view (mirrors settleSlip's base points).
function computeScored(picks, mode) {
  if (mode === 'power') {
    const live = picks.filter((p) => !p.void);
    const allHit = live.length > 0 && live.every((p) => p.correct);
    return allHit ? Math.round(live.reduce((s, p) => s + p.value, 0) * powerMultiplier(live.length)) : 0;
  }
  return picks.reduce((s, p) => s + (p.awarded ?? 0), 0);
}

export default function PickSlip({
  picks, max, locked, mode = 'normal', captainId = null,
  onSetMode, onSetCaptain, onRemove, onLock, onClose,
}) {
  const [shared, setShared] = useState(false);
  const anySettled = picks.some((p) => p.correct !== undefined);
  const editable = !locked && !anySettled;
  const potential = slipPotential(picks, { mode, captainId });
  const scored = computeScored(picks, mode);
  const isPower = mode === 'power';

  async function shareSlip() {
    const url = window.location.origin + window.location.pathname;
    const lines = picks.map(
      (p) => `${p.side === 'MORE' ? '▲' : '▼'} ${p.playerName} ${p.side} ${p.label} ${p.line}${captainId === p.id ? ' (★C)' : ''}`
    );
    const tag = isPower ? '⚡ POWER PLAY' : 'My GOLAZO. slip';
    const text = `${tag} 🔥\n${lines.join('\n')}\nMax ${potential} pts · play: ${url}`;
    try {
      if (navigator.share) await navigator.share({ title: 'My GOLAZO. slip', text });
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

        {/* mode toggle (editable only) */}
        {editable && picks.length > 0 && (
          <div className="mb-3">
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-panel2 p-1">
              {[{ id: 'normal', label: 'Normal' }, { id: 'power', label: '⚡ Power Play' }].map((m) => (
                <button
                  key={m.id}
                  onClick={() => onSetMode(m.id)}
                  className={`rounded-lg py-2 text-sm font-bold transition ${
                    mode === m.id ? 'bg-more text-ink' : 'text-mist'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <p className="mt-2 px-1 text-[11px] font-semibold text-mist">
              {isPower ? (
                <>⚡ All {picks.length} must land for <span className="text-gold">{powerMultiplier(picks.length)}×</span> — one miss pays 0. (DNP picks are ignored.)</>
              ) : (
                <>Tap ☆ to make a pick your <span className="text-gold">Captain</span> — it pays 2× if it lands.</>
              )}
            </p>
          </div>
        )}

        {/* locked/results mode banner */}
        {!editable && isPower && (
          <div className="mb-3 rounded-xl border border-gold/40 bg-gold/10 px-3 py-2 text-center text-xs font-bold text-gold">
            ⚡ POWER PLAY · all picks must land
          </div>
        )}

        {picks.length === 0 ? (
          <p className="py-10 text-center text-sm text-mist">
            No picks yet. Tap <span className="text-more">MORE</span> or{' '}
            <span className="text-less">LESS</span> on a prop to start your slip.
          </p>
        ) : (
          <div className="max-h-[42vh] space-y-2 overflow-y-auto">
            {picks.map((p) => {
              const isSettled = p.correct !== undefined;
              const isCap = !isPower && (captainId === p.id || p.captain);
              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between rounded-xl border bg-panel2 px-3 py-2.5 ${
                    isSettled
                      ? p.void
                        ? 'border-line opacity-60'
                        : p.correct
                          ? 'border-more/50'
                          : 'border-less/40 opacity-70'
                      : isCap
                        ? 'border-gold/50'
                        : 'border-line'
                  }`}
                >
                  <div className="flex items-center gap-2.5 leading-tight">
                    {isSettled && (
                      <span className={`text-lg ${p.void ? 'text-mist' : p.correct ? 'text-more' : 'text-less'}`}>
                        {p.void ? '—' : p.correct ? '✓' : '✗'}
                      </span>
                    )}
                    {/* captain star (editable, normal mode) */}
                    {editable && !isPower && (
                      <button
                        onClick={() => onSetCaptain(p.id)}
                        aria-label="Make captain"
                        className={`text-lg leading-none transition ${captainId === p.id ? 'text-gold' : 'text-mist hover:text-gold'}`}
                      >
                        {captainId === p.id ? '★' : '☆'}
                      </button>
                    )}
                    <div>
                      <div className="flex items-center gap-1.5 text-sm font-bold">
                        {p.playerName}
                        {isCap && (
                          <span className="rounded bg-gold/20 px-1.5 text-[10px] font-extrabold text-gold">★ 2×</span>
                        )}
                      </div>
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
                      p.void ? (
                        <span className="rounded bg-panel px-1.5 py-0.5 text-[10px] font-bold uppercase text-mist">
                          Void · didn’t play
                        </span>
                      ) : isPower ? (
                        <span className={`text-sm font-extrabold ${p.correct ? 'text-more' : 'text-less'}`}>
                          {p.correct ? 'HIT' : 'MISS'}
                        </span>
                      ) : (
                        <span className={`font-display text-lg ${p.correct ? 'text-more' : 'text-mist'}`}>
                          +{p.awarded ?? 0}
                        </span>
                      )
                    ) : (
                      <>
                        <span className="font-display text-lg text-gold">
                          +{isCap ? p.value * 2 : p.value}
                        </span>
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
          <span className="text-sm font-semibold text-mist">
            {anySettled ? 'You scored' : isPower ? `If all land (${powerMultiplier(picks.length)}×)` : 'Max potential'}
          </span>
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
            {isPower ? 'LOCK POWER SLIP ⚡' : 'LOCK SLIP'}
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
