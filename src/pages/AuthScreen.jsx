import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';

// Multicolour Google "G" (logo, used on the sign-in button per Google guidelines).
function GoogleLogo({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.3 26.7 36 24 36c-5.3 0-9.7-3.1-11.3-7.6l-6.5 5C9.6 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C41.4 36.3 44 30.7 44 24c0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  );
}

const STEPS = [
  ['Call players MORE or LESS', 'on goals, shots, assists, saves…'],
  ['Best 5 picks a match day', 'pick across at least two countries'],
  ['Top the Imperial leaderboard', 'weekly, all-time, or a private group'],
];

export default function AuthScreen() {
  const { signInGoogle, signInDemo, error, busy, mode } = useAuth();

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center px-6 py-10">
      {/* brand */}
      <div className="text-center">
        <div className="font-display text-6xl tracking-wide">
          GOLAZO<span className="text-more">.</span>
        </div>
        <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-mist">
          Imperial · World Cup 2026
        </div>
        <p className="mx-auto mt-4 max-w-xs text-sm font-semibold text-fg/90">
          The free World Cup prediction game for Imperial. Read the players, not just the results.
        </p>
      </div>

      {/* how it works */}
      <div className="mt-7 space-y-2.5">
        {STEPS.map(([title, sub], i) => (
          <div key={title} className="flex items-center gap-3 rounded-2xl border border-line bg-panel px-4 py-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-more text-sm font-extrabold text-ink">
              {i + 1}
            </span>
            <div className="leading-tight">
              <div className="text-sm font-bold">{title}</div>
              <div className="text-[12px] font-medium text-mist">{sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* sign in */}
      <div className="mt-7">
        <button
          onClick={signInGoogle}
          disabled={busy}
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white py-3.5 font-bold text-[#1f2937] shadow-sm transition active:scale-[0.98] disabled:opacity-60"
        >
          <GoogleLogo size={20} />
          {busy ? 'One sec…' : 'Continue with Google'}
        </button>
        <p className="mt-2.5 text-center text-[11px] font-semibold text-mist">
          Imperial students — you’ll confirm your shortcode next to get in.
        </p>

        {error && (
          <div className="mt-3 rounded-xl border border-less/40 bg-less/10 px-3.5 py-2.5 text-center text-sm font-semibold text-less">
            {error}
          </div>
        )}

        {mode === 'mock' && (
          <button
            onClick={signInDemo}
            className="mt-3 w-full rounded-2xl border border-line bg-panel2 py-3 text-sm font-bold text-more transition active:scale-[0.98]"
          >
            Try the demo — skip sign in
          </button>
        )}
      </div>
    </div>
  );
}
