import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import Flag from '../components/Flag.jsx';
import { buildMatchdays } from '../lib/matchday.js';

function countdown(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'LIVE';
  const h = Math.floor(ms / 3.6e6);
  const m = Math.floor((ms % 3.6e6) / 6e4);
  const d = Math.floor(h / 24);
  if (d >= 1) return `in ${d}d ${h % 24}h`;
  if (h >= 1) return `in ${h}h ${m}m`;
  return `in ${m}m`;
}

// Festive confetti scattered behind the hero.
const CONFETTI = [
  ['bg-gold', 'left-[8%] top-[18%] rotate-12'],
  ['bg-azure', 'left-[26%] top-[60%] -rotate-12'],
  ['bg-more', 'left-[44%] top-[12%] rotate-45'],
  ['bg-flame', 'left-[62%] top-[68%] rotate-6'],
  ['bg-grape', 'left-[78%] top-[24%] -rotate-12'],
  ['bg-less', 'left-[90%] top-[56%] rotate-12'],
  ['bg-azure', 'left-[16%] top-[80%] rotate-45'],
  ['bg-gold', 'left-[70%] top-[8%] -rotate-6'],
];

export default function Home({ matches = [], rows = [], count = 0, max = 5, onGoToday, onInvite }) {
  const { user } = useAuth();
  const mds = buildMatchdays(matches);
  const openMd = mds.find((d) => d.status === 'open');
  const nextGame = [...matches]
    .filter((m) => new Date(m.kickoff).getTime() > Date.now())
    .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff))[0];

  const sorted = [...rows].sort((a, b) => b.points - a.points);
  const rank = sorted.findIndex((r) => r.uid === user.uid) + 1;
  const top3 = sorted.slice(0, 3);
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="space-y-4 pt-2">
      {/* festive hero */}
      <div className="relative overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-grape/25 via-panel to-azure/20 p-5">
        {CONFETTI.map(([c, pos], i) => (
          <span key={i} className={`pointer-events-none absolute h-2.5 w-2.5 rounded-[2px] opacity-70 ${c} ${pos}`} />
        ))}
        <div className="relative">
          <div className="font-display text-5xl leading-none tracking-wide">
            GOLAZO<span className="text-more">.</span>
          </div>
          <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.28em] text-mist">
            Imperial · World Cup 2026
          </div>
          <p className="mt-3 text-sm font-semibold text-white/90">
            Hey {user.name?.split(' ')[0] || 'there'} 👋 — the tournament’s on. Make your calls. 🏆
          </p>
        </div>
      </div>

      {/* stat strip */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Points" value={user.points || 0} accent="text-gold" ring="ring-gold/40" />
        <Stat label="Imperial" value={rank ? `#${rank}` : '—'} accent="text-azure" ring="ring-azure/40" />
        <Stat label="Streak" value={`🔥 ${user.streak || 0}`} accent="text-flame" ring="ring-flame/40" />
      </div>

      {/* primary CTA */}
      <button
        onClick={onGoToday}
        className="w-full rounded-2xl bg-gradient-to-r from-more to-azure py-4 text-center font-display text-xl tracking-wide text-ink transition active:scale-[0.98]"
      >
        {openMd ? `⚽ BUILD MATCHDAY ${openMd.n} SLIP` : '⚽ SEE MATCH DAYS'}
        <span className="ml-2 rounded-full bg-ink/25 px-2 py-0.5 align-middle text-xs font-extrabold">{count}/{max}</span>
      </button>

      {/* next match */}
      {nextGame && (
        <div className="rounded-2xl border border-line bg-panel p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wide text-mist">Next kickoff</span>
            <span className="rounded-full bg-azure/15 px-2.5 py-0.5 text-[11px] font-bold text-azure">{countdown(nextGame.kickoff)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-2"><Flag team={nextGame.home} size="h-6 w-6" /><span className="truncate text-sm font-extrabold">{nextGame.home.name}</span></div>
            <span className="px-2 font-display text-base text-mist">v</span>
            <div className="flex items-center gap-2"><span className="truncate text-sm font-extrabold">{nextGame.away.name}</span><Flag team={nextGame.away} size="h-6 w-6" /></div>
          </div>
        </div>
      )}

      {/* mini leaderboard */}
      {top3.length > 0 && (
        <div className="rounded-2xl border border-line bg-panel p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wide text-mist">🏆 Top of Imperial</span>
            {rank ? <span className="text-[11px] font-bold text-azure">You: #{rank}</span> : null}
          </div>
          <div className="space-y-1.5">
            {top3.map((u, i) => (
              <div key={u.uid} className="flex items-center justify-between text-sm">
                <span className="font-semibold"><span className="mr-1.5">{medals[i]}</span>{u.name}</span>
                <span className="font-display text-base text-gold">{u.points}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onInvite}
        className="w-full rounded-2xl border border-line bg-panel2 py-3 text-sm font-bold text-more transition active:scale-[0.98]"
      >
        📣 Invite your mates
      </button>
    </div>
  );
}

function Stat({ label, value, accent, ring }) {
  return (
    <div className={`rounded-2xl border border-line bg-panel p-3 text-center ring-1 ${ring}`}>
      <div className="text-[10px] font-bold uppercase tracking-wide text-mist">{label}</div>
      <div className={`mt-0.5 font-display text-2xl ${accent}`}>{value}</div>
    </div>
  );
}
