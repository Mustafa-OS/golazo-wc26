import React, { useState, useMemo, useEffect, useRef } from 'react';
import { pickValue } from './lib/scoringEngine.js';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { DataProvider, useData } from './context/DataContext.jsx';
import { subscribeSlip, writeSlip, todayKey } from './lib/slipStore.js';
import { subscribeMyGroups, createGroup, joinGroup } from './lib/groupStore.js';
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
  return (
    <DataProvider>
      <MainApp />
    </DataProvider>
  );
}

function Splash() {
  return (
    <div className="flex min-h-full items-center justify-center">
      <div className="animate-pulse text-center">
        <div className="font-display text-5xl tracking-wide">
          GOLAZO<span className="text-more">.</span>
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
  const { matches, loading, leaderboard, weekly } = useData();
  const [tab, setTab] = useState('today');
  const [picks, setPicks] = useState([]); // [{ ...prop, side, value }]
  const [slipOpen, setSlipOpen] = useState(false);
  const [locked, setLocked] = useState(false);
  const [mode, setMode] = useState('normal'); // 'normal' | 'power'
  const [captainId, setCaptainId] = useState(null);
  const [groups, setGroups] = useState([]);
  const day = useMemo(() => todayKey(), []);
  const loadedRef = useRef(false);
  const draftTimer = useRef(null);

  // The groups this user belongs to (for the Groups tab + group boards).
  useEffect(() => subscribeMyGroups(user.uid, setGroups), [user.uid]);

  // Restore the persisted slip. Load picks once (don't clobber live edits),
  // but keep tracking `locked` so a server-side lock is always reflected.
  useEffect(() => {
    loadedRef.current = false;
    return subscribeSlip(user.uid, day, (slip) => {
      if (!slip) { loadedRef.current = true; return; }
      if (!loadedRef.current) {
        setPicks(slip.picks || []);
        setMode(slip.mode || 'normal');
        setCaptainId(slip.captainId || null);
        loadedRef.current = true;
      }
      setLocked((prev) => prev || !!slip.locked);
    });
  }, [user.uid, day]);

  // Auto-lock once the earliest picked match has kicked off.
  const earliestKickoff = useMemo(() => {
    const koByMatch = Object.fromEntries(matches.map((m) => [m.id, new Date(m.kickoff).getTime()]));
    const times = picks.map((p) => koByMatch[p.matchId]).filter((t) => Number.isFinite(t));
    return times.length ? Math.min(...times) : null;
  }, [picks, matches]);
  const kickedOff = earliestKickoff != null && Date.now() >= earliestKickoff;
  const effectiveLocked = locked || kickedOff;

  // Keep the captain valid: clear it in power mode or if its pick was removed.
  useEffect(() => {
    if (mode === 'power' && captainId) setCaptainId(null);
    else if (captainId && !picks.some((p) => p.id === captainId)) setCaptainId(null);
  }, [picks, mode, captainId]);

  // Persist a draft (debounced) whenever the slip changes while still editable.
  useEffect(() => {
    if (!loadedRef.current || effectiveLocked || picks.length === 0) return;
    clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      writeSlip(user.uid, day, { picks, locked: false, mode, captainId }).catch((e) => console.error('draft save', e));
    }, 700);
    return () => clearTimeout(draftTimer.current);
  }, [picks, effectiveLocked, user.uid, day, mode, captainId]);

  // If a match kicks off while the slip is open, latch it locked in storage.
  useEffect(() => {
    if (kickedOff && !locked && picks.length > 0) {
      setLocked(true);
      writeSlip(user.uid, day, { picks, locked: true, mode, captainId }).catch((e) => console.error('auto-lock', e));
    }
  }, [kickedOff]); // eslint-disable-line react-hooks/exhaustive-deps

  // Leaderboard rows with the real signed-in user merged in (drops any stale
  // copy of "me" so the row always reflects the live profile points/streak).
  const rows = useMemo(() => {
    const others = leaderboard.filter((r) => r.uid !== 'me' && r.uid !== user.uid);
    const meRow = {
      uid: user.uid,
      name: user.name,
      dept: user.dept,
      points: user.points || 0,
      streak: user.streak || 0,
    };
    return [...others, meRow];
  }, [leaderboard, user]);

  const pickFor = (propId) => picks.find((p) => p.id === propId);

  function togglePick(prop, side) {
    if (effectiveLocked) return;
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
    if (effectiveLocked) return;
    setPicks((prev) => prev.filter((p) => p.id !== propId));
  }

  function changeMode(m) {
    if (effectiveLocked) return;
    setMode(m);
  }
  function toggleCaptain(propId) {
    if (effectiveLocked || mode === 'power') return;
    setCaptainId((prev) => (prev === propId ? null : propId));
  }

  async function lockSlip() {
    if (picks.length === 0 || effectiveLocked) return;
    clearTimeout(draftTimer.current); // don't let a pending draft race the lock
    setLocked(true);
    try {
      await writeSlip(user.uid, day, { picks, locked: true, mode, captainId });
    } catch (e) {
      console.error('lock slip', e);
      setLocked(false); // let them retry if the write failed
    }
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col">
      <Header picks={picks} max={MAX_PICKS} onOpenSlip={() => setSlipOpen(true)} />

      <main className="flex-1 px-4 pb-28 pt-2">
        {tab === 'today' &&
          (loading ? (
            <TodaySkeleton />
          ) : matches.length === 0 ? (
            <EmptyToday />
          ) : (
            <Today
              matches={matches}
              pickFor={pickFor}
              onPick={togglePick}
              max={MAX_PICKS}
              count={picks.length}
              locked={effectiveLocked}
            />
          ))}
        {tab === 'board' && <LeaderboardPage rows={rows} weekly={weekly} meUid={user.uid} groups={groups} />}
        {tab === 'groups' && (
          <GroupsPage
            groups={groups}
            onCreate={(name) => createGroup(user.uid, name)}
            onJoin={(code) => joinGroup(user.uid, code)}
          />
        )}
        {tab === 'me' && <Profile rows={rows} />}
      </main>

      {slipOpen && (
        <PickSlip
          picks={picks}
          max={MAX_PICKS}
          locked={effectiveLocked}
          mode={mode}
          captainId={captainId}
          onSetMode={changeMode}
          onSetCaptain={toggleCaptain}
          onRemove={removePick}
          onLock={lockSlip}
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
          GOLAZO<span className="text-more">.</span>
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

function TodaySkeleton() {
  return (
    <div className="space-y-3 pt-2">
      <div className="flex gap-3">
        <div className="h-20 w-[150px] shrink-0 animate-pulse rounded-2xl bg-panel" />
        <div className="h-20 w-[150px] shrink-0 animate-pulse rounded-2xl bg-panel" />
      </div>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-28 animate-pulse rounded-2xl bg-panel" />
      ))}
    </div>
  );
}

function EmptyToday() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <div className="text-5xl">🗓️</div>
      <h2 className="mt-4 font-display text-2xl">NO MATCHES YET</h2>
      <p className="mt-2 max-w-xs text-sm font-semibold text-mist">
        Today’s lines drop every morning at 08:00 once fixtures and lineups are in.
        Check back then to build your slip.
      </p>
    </div>
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
