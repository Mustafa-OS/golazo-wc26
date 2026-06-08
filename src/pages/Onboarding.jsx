import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

// Imperial departments for the picker (optional; free text still allowed).
const DEPARTMENTS = [
  'Aeronautics', 'Bioengineering', 'Chemical Engineering',
  'Civil and Environmental Engineering', 'Computing', 'Design Engineering',
  'Earth Science and Engineering', 'Electrical and Electronic Engineering',
  'Materials', 'Mechanical Engineering', 'Medicine', 'Business School',
  'Maths', 'Physics', 'Chemistry', 'Life Sciences',
];

export default function Onboarding() {
  const { user, completeOnboarding, error, busy, signOut } = useAuth();
  const [name, setName] = useState(user?.displayName || ''); // pre-filled from Microsoft
  const [dept, setDept] = useState('');

  async function submit(e) {
    e.preventDefault();
    await completeOnboarding({ name, dept });
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center px-6 py-10">
      <div className="text-center">
        <div className="font-display text-4xl tracking-wide">ALMOST IN<span className="text-more">.</span></div>
        <p className="mt-2 text-sm font-semibold text-mist">
          Set up how you’ll show on the leaderboard.
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
            Department <span className="text-mist/70">· optional</span>
          </label>
          <select
            value={dept}
            onChange={(e) => setDept(e.target.value)}
            className={`w-full appearance-none rounded-xl border border-line bg-panel2 px-3.5 py-3 text-sm font-semibold outline-none focus:border-more ${
              dept ? 'text-white' : 'text-mist'
            }`}
          >
            <option value="">Select your department (or skip)</option>
            {DEPARTMENTS.map((d) => <option key={d} value={d} className="text-white">{d}</option>)}
          </select>
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
