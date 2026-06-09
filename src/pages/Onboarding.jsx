import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Onboarding() {
  const { user, completeOnboarding, error, busy, signOut } = useAuth();
  const [name, setName] = useState(user?.displayName || ''); // pre-filled from Google
  const [shortcode, setShortcode] = useState('');

  async function submit(e) {
    e.preventDefault();
    await completeOnboarding({ name, shortcode });
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center px-6 py-10">
      <div className="text-center">
        <div className="font-display text-4xl tracking-wide">ALMOST IN<span className="text-more">.</span></div>
        <p className="mt-2 text-sm font-semibold text-mist">
          Set your name and confirm you’re at Imperial.
        </p>
        {user?.email && (
          <p className="mt-1 text-[11px] font-semibold text-mist">{user.email}</p>
        )}
      </div>

      <form onSubmit={submit} className="mt-7 space-y-4">
        <div>
          <label className="mb-1.5 block px-1 text-xs font-bold uppercase tracking-wide text-mist">
            Display name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Aryan K."
            maxLength={24}
            className="w-full rounded-xl border border-line bg-panel2 px-3.5 py-3 text-sm font-semibold outline-none placeholder:text-mist focus:border-more"
          />
        </div>

        <div>
          <label className="mb-1.5 block px-1 text-xs font-bold uppercase tracking-wide text-mist">
            Imperial shortcode
          </label>
          <input
            value={shortcode}
            onChange={(e) => setShortcode(e.target.value.toUpperCase())}
            placeholder="e.g. AG3824"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            maxLength={12}
            className="w-full rounded-xl border border-line bg-panel2 px-3.5 py-3 text-sm font-bold uppercase tracking-wide outline-none placeholder:font-semibold placeholder:normal-case placeholder:tracking-normal placeholder:text-mist focus:border-more"
          />
          <p className="mt-1.5 px-1 text-[11px] font-semibold text-mist">
            Your Imperial login code (letters then numbers) — the last two digits are your join year.
          </p>
        </div>

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
          {busy ? 'Saving…' : 'START PLAYING'}
        </button>
      </form>

      <button
        onClick={signOut}
        className="mt-5 text-center text-[11px] font-semibold text-mist underline-offset-2 hover:underline"
      >
        Use a different account
      </button>
    </div>
  );
}
