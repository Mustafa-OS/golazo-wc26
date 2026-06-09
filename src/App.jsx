import React, { useState, useMemo, useEffect, useRef } from 'react';
import { pickValue } from './lib/scoringEngine.js';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ThemeProvider, useTheme } from './context/ThemeContext.jsx';
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
import { IconHome, IconBall, IconTrophy, IconUsers, IconUser, IconInfo, IconSun, IconMoon } from './components/Icons.jsx';

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
    <ThemeProvider>
      <AuthProvider>
        <Root />
      </AuthProvider>
    </ThemeProvider>
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
  const [toast, setToast] = useState('');
  const toastTimer = useRef(null);
  const notify = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2600);
  };

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

  // Slips are per MATCH DAY. "My Picks" defaults to the NEAREST upcoming open
  // match day; it only switches to another while you're actively viewing that
  // match day in the Matches tab, then snaps back to nearest when you leave.
  const openMatchdays = useMemo(
    () => buildMatchdays(matches).filter((d) => d.status === 'open'),
    [matches]
  );
  const nearestOpenKey = openMatchdays[0]?.key ?? null;
  const [viewingKey, setViewingKey] = useState(null);
  const activeMdKey = viewingKey || nearestOpenKey;
  // Stop "viewing" a specific match day once you leave the Matches tab.
  useEffect(() => { if (tab !== 'today') setViewingKey(null); }, [tab]);

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
      year: user.year,
      points: user.points || 0,
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
      if (!hadPlayer && without.length >= MAX_PICKS) { notify('That’s your 5 — remove one to swap.'); return prev; }
      const next = [...without, { ...prop, side, value: pickValue(prop, side) }];
      // RULE: a full slip must span at least 2 different countries — block a 5th
      // pick that would leave every pick on the same nation.
      if (next.length >= MAX_PICKS && new Set(next.map((p) => p.teamCode)).size < 2) {
        notify('Your picks need at least 2 different countries.');
        return prev;
      }
      // Freeze the points value at selection time so later baseline changes
      // can't retroactively alter a locked slip.
      return next;
    });
  }

  function removePick(propId) {
    if (effectiveLocked) return;
    setPicks((prev) => prev.filter((p) => p.id !== propId));
  }

  function clearSlip() {
    if (effectiveLocked) return;
    clearTimeout(draftTimer.current);
    setPicks([]); setMode('normal'); setCaptainId(null);
    if (activeMdKey) writeSlip(user.uid, activeMdKey, { picks: [], locked: false, mode: 'normal', captainId: null }).catch(() => {});
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
              onOpenMatchday={setViewingKey}
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
        {tab === 'me' && <Profile rows={rows} onHowTo={() => setShowHelp(true)} />}
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
          onClear={clearSlip}
          onSave={saveSlip}
          onClose={() => setSlipOpen(false)}
        />
      )}

      {showHelp && <HowToPlay onClose={() => setShowHelp(false)} />}

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-40 flex justify-center px-6">
          <div className="rounded-full bg-flame px-4 py-2 text-center text-sm font-bold text-ink shadow-lg">{toast}</div>
        </div>
      )}

      {/* Unmissable save prompt — this is how picks get saved. */}
      {picks.length > 0 && !effectiveLocked && !slipOpen && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[70px] z-30 mx-auto max-w-md px-4">
          <button
            onClick={() => setSlipOpen(true)}
            className="animate-popin pointer-events-auto flex w-full items-center justify-between rounded-2xl bg-more px-5 py-3.5 font-display text-lg tracking-wide text-ink shadow-lg transition active:scale-[0.98]"
          >
            <span>REVIEW &amp; SAVE PICKS</span>
            <span className="rounded-full bg-ink/20 px-3 py-0.5 text-sm font-extrabold">{picks.length}/{MAX_PICKS}</span>
          </button>
        </div>
      )}

      <BottomNav tab={tab} setTab={setTab} />
    </div>
  );
}

function Header({ picks, max, onOpenSlip, onHelp, onHome }) {
  const { theme, toggle } = useTheme();
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-bg/85 px-4 py-3 backdrop-blur">
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
          onClick={toggle}
          aria-label="Toggle light or dark mode"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-panel2 text-mist transition active:scale-95 hover:text-fg"
        >
          {theme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
        </button>
        <button
          onClick={onHelp}
          aria-label="How to play"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-panel2 text-mist transition active:scale-95 hover:text-fg"
        >
          <IconInfo size={18} />
        </button>
        <button
          onClick={onOpenSlip}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-extrabold transition active:scale-95 ${
            picks.length > 0 ? 'bg-more text-ink shadow-glow' : 'border border-line bg-panel2 text-fg'
          }`}
        >
          <span>My Picks</span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-extrabold ${
            picks.length > 0 ? 'bg-ink/20 text-ink' : 'bg-more text-ink'
          }`}>
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
        Check back then to build your picks.
      </p>
    </div>
  );
}

function BottomNav({ tab, setTab }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md border-t border-line bg-bg/95 backdrop-blur">
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
