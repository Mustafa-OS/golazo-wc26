import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { qrDataUrl } from '../lib/shareCard.js';

export default function Profile({ rows, onHowTo }) {
  const { user, signOut, mode } = useAuth();
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState('');

  // QR pointing at wherever the app is hosted (always current).
  useEffect(() => {
    qrDataUrl(window.location.origin + window.location.pathname, 360).then(setQr).catch(() => {});
  }, []);

  function downloadQr() {
    const a = document.createElement('a');
    a.href = qr; a.download = 'golazo-qr.png'; a.click();
  }

  async function shareApp() {
    const url = window.location.origin + window.location.pathname;
    const text = "I'm playing GOLAZO. — Imperial's World Cup 2026 predictions game. Get on:";
    try {
      if (navigator.share) {
        await navigator.share({ title: 'GOLAZO.', text, url });
      } else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch { /* user dismissed share sheet */ }
  }

  // Demo-only: wipe local accounts/slips/groups and reload fresh.
  function resetDemo() {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('over.'))
      .forEach((k) => localStorage.removeItem(k));
    window.location.reload();
  }

  const sorted = [...rows].sort((a, b) => b.points - a.points);
  const rank = sorted.findIndex((r) => r.uid === user.uid) + 1;

  const stats = [
    { label: 'Total Points', value: user.points || 0, accent: 'text-gold', ring: 'ring-gold/40' },
    { label: 'Imperial Rank', value: rank ? `#${rank}` : '—', accent: 'text-azure', ring: 'ring-azure/40' },
  ];

  return (
    <div>
      <div className="mt-4 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-more text-3xl font-extrabold text-ink">
          {(user.name || '?')[0]}
        </div>
        <div className="min-w-0">
          <div className="truncate font-display text-2xl">{user.name}</div>
          <div className="text-sm font-semibold text-mist">
            {user.year ? `Imperial · Class of ’${String(user.year).slice(2)}` : 'Imperial'}
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <div key={s.label} className={`rounded-2xl border border-line bg-panel p-4 ring-1 ${s.ring}`}>
            <div className="text-[11px] font-bold uppercase tracking-wide text-mist">{s.label}</div>
            <div className={`mt-1 font-display text-3xl ${s.accent}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-line bg-gradient-to-br from-grape/20 via-panel to-azure/15 p-4">
        <div className="text-xs font-bold uppercase tracking-wide text-mist">About Golazo</div>
        <p className="mt-2 text-sm font-medium leading-snug text-fg/90">
          Imperial’s free World Cup 2026 prediction game. Call whether players go{' '}
          <span className="font-bold text-more">MORE</span> or{' '}
          <span className="font-bold text-less">LESS</span> than their line, build your best 5 picks
          each match day, and climb the leaderboard. Riskier calls pay more — wrong picks just score 0.
        </p>
        <button
          onClick={() => onHowTo && onHowTo()}
          className="mt-3 w-full rounded-xl border border-line bg-panel2 py-2.5 text-sm font-bold text-more transition active:scale-[0.98]"
        >
          How to play
        </button>
      </div>

      <div className="mt-3 rounded-2xl border border-line bg-panel p-4">
        <div className="text-xs font-bold uppercase tracking-wide text-mist">How scoring works</div>
        <ul className="mt-2 space-y-1.5 text-sm text-mist">
          <li>• Rarer calls pay more — a striker brace beats a safe shot-on-target.</li>
          <li>• Wrong picks score 0. Never negative.</li>
          <li>• Captain a pick for 2×, or go Power Play for an all-or-nothing multiplier.</li>
        </ul>
      </div>

      <div className="mt-5 rounded-2xl border border-line bg-panel p-4 text-center">
        <div className="text-xs font-bold uppercase tracking-wide text-mist">Invite by QR</div>
        {qr ? (
          <img src={qr} alt="Scan to join Golazo" className="mx-auto mt-3 h-44 w-44 rounded-xl" />
        ) : (
          <div className="mx-auto mt-3 h-44 w-44 animate-pulse rounded-xl bg-panel2" />
        )}
        <p className="mt-2 text-[11px] font-semibold text-mist">Point a phone camera here to open Golazo.</p>
        {qr && (
          <button onClick={downloadQr} className="mt-2 text-xs font-bold text-more underline-offset-2 hover:underline">
            Download QR (for posters)
          </button>
        )}
      </div>

      <button
        onClick={shareApp}
        className="mt-3 w-full rounded-2xl bg-more py-3.5 font-display text-lg tracking-wide text-ink transition active:scale-[0.98]"
      >
        {copied ? 'LINK COPIED' : 'INVITE YOUR FRIENDS'}
      </button>

      <button
        onClick={signOut}
        className="mt-3 w-full rounded-2xl border border-line bg-panel2 py-3 text-sm font-bold text-mist transition active:scale-[0.98] hover:text-less"
      >
        Sign out
      </button>

      {mode === 'mock' && (
        <button
          onClick={resetDemo}
          className="mt-3 w-full rounded-2xl border border-line bg-panel py-2.5 text-xs font-bold text-mist transition active:scale-[0.98] hover:text-less"
        >
          Reset demo data
        </button>
      )}

      {mode !== 'live' && (
        <p className="mt-3 text-center text-[11px] text-mist">
          {mode === 'mock' ? 'Demo mode — data is local to this browser.' : 'Connected to local emulator.'}
        </p>
      )}
    </div>
  );
}
