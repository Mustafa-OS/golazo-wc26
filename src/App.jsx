import React, { useState, useMemo, useEffect, useRef } from 'react';
import { pickValue } from './lib/scoringEngine.js';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { DataProvider, useData } from './context/DataContext.jsx';
import { subscribeSlip, writeSlip } from './lib/slipStore.js';
import { buildMatchdays, usDateKey, matchdayKickoff, LOCK_LEAD_MS } from './lib/matchday.js';
import { subscribeMyGroups, createGroup, joinGroup } from './lib/groupStore.js';
import AuthScreen from './pages/AuthScreen.jsx';
import Onboarding from './pages/Onboarding.jsx';
import Home from './pages/Home.jsx';
import Today from './pages/Today.jsx';
import LeaderboardPage from './pages/LeaderboardPage.jsx';
import GroupsPage from './pages/GroupsPage.jsx';
import Profile from './pages/Profile.jsx';
import PickSlip from './components/PickSlip.jsx';
import HowToPlay from './components/HowToPlay.jsx';
import Pitch from './components/Pitch.jsx';
import { IconHome, IconBall, IconTrophy, IconUsers, IconUser, IconInfo } from './components/Icons.jsx';

const MAX_PICKS = 5;

const NAV = [
  { id: 'home', label: 'Home', Icon: IconHome },
  { id: 'today', label: 'Matches', Icon: IconBall },
  { id: 'board', label: 'Board', Icon: IconTrophy },
  { id: 'groups', label: 'Groups', Icon: IconUsers },
  { id: 'me', label: 'Profile', Icon: IconUser },
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
  const [tab, setTab] = useState('home');
  const [picks, setPicks] = useState([]); // [{ ...prop, side, value }]
  const [slipOpen, setSlipOpen] = useState(false);
  const [locked, setLocked] = useState(false);
  const [mode, setMode] = useState('normal'); // 'normal' | 'power'
  const [captainId, setCaptainId] = useState(null);
  const [groups, setGroups] = useState([]);
  const [showHelp, setShowHelp] = useState(false);

  // Open the how-to-play as a popup first thing each app session (reopenable
  // anytime via the header info button).
  useEffect(() => {
    if (!sessionStorage.getItem('golazo.seenIntro')) {
      setShowHelp(true);
      sessionStorage.setItem('golazo.seenIntro', '1');
    }
  }, []);
  const loadedRef = useRef(false);
  const draftTimer = useRef(null);

  // The groups this user belongs to (for the Groups tab + group boards).
  useEffect(() => subscribeMyGroups(user.uid, setGroups), [user.uid]);

  // Slips are per MATCH DAY. Default the active slip to the nearest open day,
  // and switch it when the user opens another open match day in the Today tab.
  const openMatchdays = useMemo(
    () => buildMatchdays(matches).filter((d) => d.status === 'open'),
    [matches]
  );
  const [activeMdKey, setActiveMdKey] = useState(null);
  useEffect(() => {
    if (!activeMdKey && openMatchdays[0]) setActiveMdKey(openMatchdays[0].key);
  }, [openMatchdays, activeMdKey]);

  // Restore that match day's saved slip (picks reset when the day changes).
  useEffect(() => {
    if (!activeMdKey) return;
    loadedRef.current = false;
    setLocked(false); setPicks([]); setMode('normal'); setCaptainId(null);
    return subscribeSlip(user.uid, activeMdKey, (slip) => {
      if (!slip) { loadedRef.current = true; return; }
      if (!loadedRef.current) {
        setPicks(slip.picks || []);
        setMode(slip.mode || 'normal');
        setCaptainId(slip.captainId || null);
        loadedRef.current = true;
      }
      setLocked((prev) => prev || !!slip.locked);
    });
  }, [user.uid, activeMdKey]);

  // Slip auto-locks 30 min before the match day's earliest kickoff.
  const lockAt = useMemo(() => {
    if (!activeMdKey) return null;
    const games = matches.filter((m) => usDateKey(m.kickoff) === activeMdKey);
    return games.length ? matchdayKickoff(games) - LOCK_LEAD_MS : null;
  }, [matches, activeMdKey]);
  const [, tick] = useState(0);
  useEffect(() => {
    if (lockAt == null) return;
    const ms = lockAt - Date.now();
    if (ms <= 0) return;
    const t = setTimeout(() => tick((n) => n + 1), Math.min(ms + 500, 2 ** 31 - 1));
    return () => clearTimeout(t);
  }, [lockAt]);
  const timeLocked = lockAt != null && Date.now() >= lockAt;
  const effectiveLocked = locked || timeLocked;

  // Keep the captain valid: clear it in power mode or if its pick was removed.
  useEffect(() => {
    if (mode === 'power' && captainId) setCaptainId(null);
    else if (captainId && !picks.some((p) => p.id === captainId)) setCaptainId(null);
  }, [picks, mode, captainId]);

  // Persist a draft (debounced) whenever the slip changes while still editable.
  useEffect(() => {
    if (!loadedRef.current || effectiveLocked || !activeMdKey || picks.length === 0) return;
    clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      writeSlip(user.uid, activeMdKey, { picks, locked: false, mode, captainId }).catch((e) => console.error('draft save', e));
    }, 700);
    return () => clearTimeout(draftTimer.current);
  }, [picks, effectiveLocked, user.uid, activeMdKey, mode, captainId]);

  // Latch the slip locked in storage once the 30-min deadline passes.
  useEffect(() => {
    if (timeLocked && !locked && activeMdKey && picks.length > 0) {
      setLocked(true);
      writeSlip(user.uid, activeMdKey, { picks, locked: true, mode, captainId }).catch((e) => console.error('auto-lock', e));
    }
  }, [timeLocked]); // eslint-disable-line react-hooks/exhaustive-deps

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
      // Tapping the same metric+side again removes the pick.
      if (existing && existing.side === side) return prev.filter((p) => p.id !== prop.id);
      // RULE: one pick per player per game — drop any existing pick for this
      // player (a different metric) before adding the new one.
      const hadPlayer = prev.some((p) => p.playerId === prop.playerId);
      const without = prev.filter((p) => p.playerId !== prop.playerId);
      if (!hadPlayer && without.length >= MAX_PICKS) return prev; // capped (adding a new player)
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

  async function saveSlip() {
    if (picks.length === 0 || effectiveLocked || !activeMdKey) return false;
    clearTimeout(draftTimer.current);
    try {
      await writeSlip(user.uid, activeMdKey, { picks, locked: false, mode, captainId });
      return true;
    } catch (e) {
      console.error('save slip', e);
      return false;
    }
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col">
      <Pitch />
      <Header
        picks={picks}
        max={MAX_PICKS}
        onOpenSlip={() => setSlipOpen(true)}
        onHelp={() => setShowHelp(true)}
        onHome={() => setTab('home')}
      />

      <main className="flex-1 px-4 pb-28 pt-2">
        {tab === 'home' && (
          <Home
            matches={matches}
            rows={rows}
            count={picks.length}
            max={MAX_PICKS}
            onGoToday={() => setTab('today')}
            onInvite={() => setTab('me')}
          />
        )}
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
              uid={user.uid}
              onOpenMatchday={setActiveMdKey}
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
          onSave={saveSlip}
          onClose={() => setSlipOpen(false)}
        />
      )}

      {showHelp && <HowToPlay onClose={() => setShowHelp(false)} />}

      <BottomNav tab={tab} setTab={setTab} />
    </div>
  );
}

function Header({ picks, max, onOpenSlip, onHelp, onHome }) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-ink/85 px-4 py-3 backdrop-blur">
      <button onClick={onHome} aria-label="Home" className="text-left leading-none transition active:scale-95">
        <div className="font-display text-2xl tracking-wide">
          GOLAZO<span className="text-more">.</span>
        </div>
        <div className="-mt-0.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-mist">
          Imperial · WC26
        </div>
      </button>
      <div className="flex items-center gap-2">
        <button
          onClick={onHelp}
          aria-label="How to play"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-panel2 text-mist transition active:scale-95 hover:text-white"
        >
          <IconInfo size={18} />
        </button>
        <button
          onClick={onOpenSlip}
          className="flex items-center gap-2 rounded-full border border-line bg-panel2 px-4 py-2 text-sm font-bold transition active:scale-95"
        >
          <span>My Slip</span>
          <span className="rounded-full bg-more px-2 py-0.5 text-xs font-extrabold text-ink">
            {picks.length}/{max}
          </span>
        </button>
      </div>
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
      <h2 className="font-display text-2xl">NO MATCHES YET</h2>
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
      <div className="grid grid-cols-5">
        {NAV.map((n) => (
          <button
            key={n.id}
            onClick={() => setTab(n.id)}
            className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-bold uppercase tracking-wide transition ${
              tab === n.id ? 'text-more' : 'text-mist'
            }`}
          >
            <n.Icon size={20} />
            {n.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
