import React, { useState } from 'react';

export default function LeaderboardPage({ rows, meUid }) {
  const [scope, setScope] = useState('imperial');
  const sorted = [...rows].sort((a, b) => b.points - a.points);
  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  return (
    <div>
      <h1 className="mt-2 font-display text-3xl">LEADERBOARD</h1>

      <div className="mt-3 flex gap-2">
        {[
          { id: 'imperial', label: 'All Imperial' },
          { id: 'group', label: 'My Groups' },
        ].map((s) => (
          <button
            key={s.id}
            onClick={() => setScope(s.id)}
            className={`flex-1 rounded-xl py-2 text-sm font-bold transition ${
              scope === s.id ? 'bg-more text-ink' : 'border border-line bg-panel text-mist'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* podium */}
      <div className="mt-5 grid grid-cols-3 items-end gap-2">
        {[top3[1], top3[0], top3[2]].filter(Boolean).map((u, i) => {
          const rank = u === top3[0] ? 1 : u === top3[1] ? 2 : 3;
          const h = rank === 1 ? 'h-24' : rank === 2 ? 'h-20' : 'h-16';
          const ring = rank === 1 ? 'border-gold' : 'border-line';
          return (
            <div key={u.uid} className="flex flex-col items-center">
              <div className={`mb-1 flex h-12 w-12 items-center justify-center rounded-full border-2 ${ring} bg-panel2 text-lg font-extrabold`}>
                {u.name[0]}
              </div>
              <div className="text-xs font-bold">{u.name}</div>
              <div className="font-display text-lg text-gold">{u.points}</div>
              <div className={`mt-1 w-full rounded-t-xl border border-line bg-panel ${h} flex items-start justify-center pt-1.5`}>
                <span className="font-display text-2xl text-mist">{rank}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* the rest */}
      <div className="mt-4 space-y-2">
        {rest.map((u, i) => (
          <Row key={u.uid} rank={i + 4} u={u} meUid={meUid} />
        ))}
      </div>
    </div>
  );
}

function Row({ rank, u, meUid }) {
  const isMe = u.uid === meUid;
  return (
    <div
      className={`flex items-center justify-between rounded-xl border px-3 py-2.5 ${
        isMe ? 'border-more bg-panel2' : 'border-line bg-panel'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="w-5 text-center font-display text-lg text-mist">{rank}</span>
        <div>
          <div className="text-sm font-bold">{u.name}</div>
          <div className="text-[11px] font-semibold text-mist">{u.dept}</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {u.streak > 0 && (
          <span className="rounded-full bg-panel2 px-2 py-0.5 text-[11px] font-bold text-gold">
            🔥 {u.streak}
          </span>
        )}
        <span className="font-display text-xl text-gold">{u.points}</span>
      </div>
    </div>
  );
}
