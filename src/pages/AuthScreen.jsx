import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

const PERKS = [
  { icon: '⚽', text: 'Tap MORE / LESS on real World Cup player lines' },
  { icon: '🔒', text: 'Lock your best 5 picks a day — no money, just points' },
  { icon: '🏆', text: 'Climb the all-Imperial board or a private group' },
];

export default function AuthScreen() {
  const { signIn, signUp, signInDemo, error, busy, setError, mode } = useAuth();
  const [tab, setTab] = useState('signup'); // 'signup' | 'signin'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (tab === 'signup') await signUp(email, password);
    else await signIn(email, password);
  }

  function switchTab(t) {
    setError('');
    setTab(t);
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center px-6 py-10">
      {/* brand */}
      <div className="text-center">
        <div className="font-display text-6xl tracking-wide">
          OVER<span className="text-more">.</span>
        </div>
        <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-mist">
          Imperial · World Cup 2026
        </div>
      </div>

      {/* perks */}
      <div className="mt-7 space-y-2.5">
        {PERKS.map((p) => (
          <div key={p.text} className="flex items-center gap-3 rounded-2xl border border-line bg-panel px-4 py-3">
            <span className="text-xl">{p.icon}</span>
            <span className="text-sm font-semibold text-mist">{p.text}</span>
          </div>
        ))}
      </div>

      {/* auth card */}
      <div className="mt-7 rounded-3xl border border-line bg-panel p-5">
        <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-panel2 p-1">
          {[
            { id: 'signup', label: 'Create account' },
            { id: 'signin', label: 'Sign in' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => switchTab(t.id)}
              className={`rounded-lg py-2 text-sm font-bold transition ${
                tab === t.id ? 'bg-more text-ink' : 'text-mist'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.name@imperial.ac.uk"
              autoComplete="email"
              className="w-full rounded-xl border border-line bg-panel2 px-3.5 py-3 text-sm font-semibold outline-none placeholder:text-mist focus:border-more"
            />
            {tab === 'signup' && (
              <p className="mt-1.5 px-1 text-[11px] font-semibold text-mist">
                Imperial email required — keeps the board all-Imperial.
              </p>
            )}
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
            className="w-full rounded-xl border border-line bg-panel2 px-3.5 py-3 text-sm font-semibold outline-none placeholder:text-mist focus:border-more"
          />

          {error && (
            <div className="rounded-xl border border-less/40 bg-less/10 px-3.5 py-2.5 text-sm font-semibold text-less">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-2xl bg-more py-3.5 font-display text-lg tracking-wide text-ink transition active:scale-[0.98] disabled:opacity-50"
          >
            {busy ? 'One sec…' : tab === 'signup' ? 'CREATE ACCOUNT' : 'SIGN IN'}
          </button>
        </form>

        {mode === 'mock' && (
          <>
            <div className="my-4 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wide text-mist">
              <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
            </div>
            <button
              onClick={signInDemo}
              className="w-full rounded-2xl border border-line bg-panel2 py-3 text-sm font-bold text-more transition active:scale-[0.98]"
            >
              Try the demo — no signup
            </button>
            <p className="mt-2 text-center text-[11px] text-mist">
              Running in demo mode (no backend connected yet).
            </p>
          </>
        )}
      </div>

      <p className="mt-5 text-center text-[11px] text-mist">
        No betting. No money. Just bragging rights. 🇬🇧
      </p>
    </div>
  );
}
