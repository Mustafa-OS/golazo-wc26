import React, { useState, useMemo } from 'react';
import { MOCK_MATCHES, MOCK_LEADERBOARD } from './lib/mockData.js';
import { buildMatchProps } from './lib/lineEngine.js';
import { pickValue } from './lib/scoringEngine.js';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import AuthScreen from './pages/AuthScreen.jsx';
import Onboarding from './pages/Onboarding.jsx';
import Today from './pages/Today.jsx';
import LeaderboardPage from './pages/LeaderboardPage.jsx';
import GroupsPage from './pages/GroupsPage.jsx';
import Profile from './pages/Profile.jsx';
import PickSlip from './components/PickSlip.jsx';

const MAX_PICKS = 5;

const NAV = [
  { id: 'today', label: 'Today', icon: '⚽' },
  { id: 'board', label: 'Leaderboard', icon: '🏆' },
  { id: 'groups', label: 'Groups', icon: '👥' },
  { id: 'me', label: 'Profile', icon: '👤' },
];

export default function App() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  );
}

// Gate the app behind auth state.
function Root() {
  const { status } = useAuth();
  if (status === 'loading') return <Splash />;
  if (status === 'signedOut') return <AuthScreen />;
  if (status === 'needsOnboarding') return <Onboarding />;
  return <MainApp />;
}

function Splash() {
  return (
    <div className="flex min-h-full items-center justify-center">
      <div className="animate-pulse text-center">
        <div className="font-display text-5xl tracking-wide">
          OVER<span className="text-more">.</span>
        </div>
        <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-mist">
          Loading
        </div>
      </div>
    </div>
  );
}

function MainApp() {
  const { user } = useAuth();
  const [tab, setTab] = useState('today');
  const [picks, setPicks] = useState([]); // [{ ...prop, side, value }]
  const [slipOpen, setSlipOpen] = useState(false);

  // Pre-compute every prop for every match once.
  const matches = useMemo(
    () => MOCK_MATCHES.map((m) => ({ ...m, props: buildMatchProps(m) })),
    []
  );

  // Leaderboard rows with the real signed-in user merged in (drops the demo
  // placeholder so "you" always reflect the actual account).
  const rows = useMemo(() => {
    const others = MOCK_LEADERBOARD.filter((r) => r.uid !== 'me' && r.uid !== user.uid);
    const meRow = {
      uid: user.uid,
      name: user.name,
      dept: user.dept,
      points: user.points || 0,
      streak: user.streak || 0,
    };
    return [...others, meRow];
  }, [user]);

  const pickFor = (propId) => picks.find((p) => p.id === propId);

  function togglePick(prop, side) {
    setPicks((prev) => {
      const existing = prev.find((p) => p.id === prop.id);
      // Tapping the same side again removes the pick.
      if (existing && existing.side === side) return prev.filter((p) => p.id !== prop.id);
      const without = prev.filter((p) => p.id !== prop.id);
      if (without.length >= MAX_PICKS && !existing) return prev; // capped
      // Freeze the points value at selection time so later baseline changes
      // can't retroactively alter a locked slip.
      return [...without, { ...prop, side, value: pickValue(prop, side) }];
    });
  }

  function removePick(propId) {
    setPicks((prev) => prev.filter((p) => p.id !== propId));
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col">
      <Header picks={picks} max={MAX_PICKS} onOpenSlip={() => setSlipOpen(true)} />

      <main className="flex-1 px-4 pb-28 pt-2">
        {tab === 'today' && (
          <Today matches={matches} pickFor={pickFor} onPick={togglePick} max={MAX_PICKS} count={picks.length} />
        )}
        {tab === 'board' && <LeaderboardPage rows={rows} meUid={user.uid} />}
        {tab === 'groups' && <GroupsPage />}
        {tab === 'me' && <Profile rows={rows} />}
      </main>

      {slipOpen && (
        <PickSlip
          picks={picks}
          max={MAX_PICKS}
          onRemove={removePick}
          onClose={() => setSlipOpen(false)}
        />
      )}

      <BottomNav tab={tab} setTab={setTab} />
    </div>
  );
}

function Header({ picks, max, onOpenSlip }) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-ink/85 px-4 py-3 backdrop-blur">
      <div className="leading-none">
        <div className="font-display text-2xl tracking-wide">
          OVER<span className="text-more">.</span>
        </div>
        <div className="-mt-0.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-mist">
          Imperial · WC26
        </div>
      </div>
      <button
        onClick={onOpenSlip}
        className="flex items-center gap-2 rounded-full border border-line bg-panel2 px-4 py-2 text-sm font-bold transition active:scale-95"
      >
        <span>My Slip</span>
        <span className="rounded-full bg-more px-2 py-0.5 text-xs font-extrabold text-ink">
          {picks.length}/{max}
        </span>
      </button>
    </header>
  );
}

function BottomNav({ tab, setTab }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md border-t border-line bg-ink/95 backdrop-blur">
      <div className="grid grid-cols-4">
        {NAV.map((n) => (
          <button
            key={n.id}
            onClick={() => setTab(n.id)}
            className={`flex flex-col items-center gap-1 py-3 text-[11px] font-bold uppercase tracking-wide transition ${
              tab === n.id ? 'text-more' : 'text-mist'
            }`}
          >
            <span className="text-lg">{n.icon}</span>
            {n.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
