import React from 'react';

const STEPS = [
  { icon: '⚽', title: 'Pick a player line', body: 'Browse a match and tap MORE or LESS on a player’s line (goals, shots, saves…).' },
  { icon: '🔒', title: 'Lock your best 5', body: 'Add up to 5 picks a day and lock your slip. Picks also lock automatically at kickoff.' },
  { icon: '⚡', title: 'Boost it (optional)', body: 'Make one pick your Captain for 2×, or go Power Play — all picks must land for a big multiplier.' },
  { icon: '🏆', title: 'Win points', body: 'Rarer calls pay more. Wrong picks score 0 — never negative. A daily streak adds up to +50%.' },
  { icon: '👥', title: 'Climb the board', body: 'Race the all-Imperial leaderboard, or start a private group for your course / halls / society.' },
];

export default function HowToPlay({ onClose }) {
  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end sm:justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="animate-slideup relative mx-auto max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl border-t border-line bg-panel px-5 pb-8 pt-4 sm:rounded-3xl sm:border">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line sm:hidden" />

        <div className="text-center">
          <div className="font-display text-4xl tracking-wide">
            HOW TO PLAY<span className="text-more">.</span>
          </div>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-mist">
            Golazo · Imperial · WC26
          </p>
        </div>

        <div className="mt-5 space-y-2.5">
          {STEPS.map((s, i) => (
            <div key={s.title} className="flex items-start gap-3 rounded-2xl border border-line bg-panel2 px-4 py-3">
              <span className="text-2xl leading-none">{s.icon}</span>
              <div className="leading-tight">
                <div className="text-sm font-bold">
                  <span className="text-more">{i + 1}.</span> {s.title}
                </div>
                <div className="mt-0.5 text-[13px] font-medium text-mist">{s.body}</div>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-4 text-center text-[12px] font-semibold text-mist">
          No money. No betting. Just bragging rights. 🏆
        </p>

        <button
          onClick={onClose}
          className="mt-4 w-full rounded-2xl bg-more py-3.5 font-display text-lg tracking-wide text-ink transition active:scale-[0.98]"
        >
          LET’S GO
        </button>
      </div>
    </div>
  );
}
