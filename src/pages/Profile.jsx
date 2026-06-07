import React from 'react';

export default function Profile({ rows }) {
  const me = rows.find((r) => r.uid === 'me') || rows[0];
  const rank = [...rows].sort((a, b) => b.points - a.points).findIndex((r) => r.uid === me.uid) + 1;

  const stats = [
    { label: 'Total Points', value: me.points, accent: 'text-gold' },
    { label: 'Imperial Rank', value: `#${rank}`, accent: 'text-more' },
    { label: 'Day Streak', value: `🔥 ${me.streak}`, accent: 'text-white' },
    { label: 'Hit Rate', value: '61%', accent: 'text-white' },
  ];

  return (
    <div>
      <div className="mt-4 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-more text-3xl font-extrabold text-ink">
          {me.name[0]}
        </div>
        <div>
          <div className="font-display text-2xl">{me.name}</div>
          <div className="text-sm font-semibold text-mist">{me.dept} · Imperial</div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-line bg-panel p-4">
            <div className="text-[11px] font-bold uppercase tracking-wide text-mist">{s.label}</div>
            <div className={`mt-1 font-display text-3xl ${s.accent}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-line bg-panel p-4">
        <div className="text-xs font-bold uppercase tracking-wide text-mist">How scoring works</div>
        <ul className="mt-2 space-y-1.5 text-sm text-mist">
          <li>• Rarer calls pay more — a striker brace beats a safe shot-on-target.</li>
          <li>• Wrong picks score 0. Never negative.</li>
          <li>• Keep a daily streak for up to +50% bonus points.</li>
        </ul>
      </div>
    </div>
  );
}
