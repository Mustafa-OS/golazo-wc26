import React, { useState } from 'react';

const TABS = [
  { id: 'imperial', label: 'All-time' },
  { id: 'week', label: 'This week' },
  { id: 'group', label: 'Groups' },
];

export default function LeaderboardPage({ rows, weekly = [], meUid, groups = [] }) {
  const [scope, setScope] = useState('imperial');
  const allTime = [...rows].sort((a, b) => b.points - a.points);
  const weekRows = [...weekly].sort((a, b) => b.points - a.points);

  return (
    <div>
      <h1 className="mt-2 font-display text-3xl">LEADERBOARD</h1>

      <div className="mt-3 flex gap-2">
        {TABS.map((s) => (
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

      {scope === 'group' ? (
        <GroupBoards groups={groups} sorted={allTime} meUid={meUid} />
      ) : scope === 'week' ? (
        <>
          <p className="mt-3 text-center text-[11px] font-semibold text-mist">
            Points earned this week · resets Monday
          </p>
          {weekRows.length === 0 ? (
            <EmptyBoard text="No points on the board yet this week — lock a slip to get on it." />
          ) : (
            <Board sorted={weekRows} meUid={meUid} />
          )}
        </>
      ) : (
        <Board sorted={allTime} meUid={meUid} />
      )}
    </div>
  );
}

function Board({ sorted, meUid }) {
  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);
  return (
    <>
      {/* podium */}
      <div className="mt-5 grid grid-cols-3 items-end gap-2">
        {[top3[1], top3[0], top3[2]].filter(Boolean).map((u) => {
          const rank = u === top3[0] ? 1 : u === top3[1] ? 2 : 3;
          const h = rank === 1 ? 'h-24' : rank === 2 ? 'h-20' : 'h-16';
          const ring = rank === 1 ? 'border-gold' : 'border-line';
          return (
            <div key={u.uid} className="flex flex-col items-center">
              <div className={`mb-1 flex h-12 w-12 items-center justify-center rounded-full border-2 ${ring} bg-panel2 text-lg font-extrabold`}>
                {u.name?.[0] || '?'}
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
    </>
  );
}

function GroupBoards({ groups, sorted, meUid }) {
  if (groups.length === 0) {
    return (
      <div className="mt-8 flex flex-col items-center justify-center px-6 text-center">
        <div className="text-5xl">👥</div>
        <h2 className="mt-3 font-display text-xl">GROUP BOARDS</h2>
        <p className="mt-2 max-w-xs text-sm font-semibold text-mist">
          Join or create a group on the <span className="text-more">Groups</span> tab to battle your
          course, halls, or society on a private board.
        </p>
      </div>
    );
  }
  return (
    <div className="mt-4 space-y-5">
      {groups.map((g) => {
        const memberSet = new Set(g.members || []);
        const board = sorted.filter((u) => memberSet.has(u.uid));
        return (
          <div key={g.id}>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-display text-lg">{g.name}</h3>
              <span className="rounded-lg bg-panel2 px-2.5 py-1 font-display text-sm tracking-widest text-gold">
                {g.code}
              </span>
            </div>
            {board.length === 0 ? (
              <p className="rounded-xl border border-line bg-panel px-3 py-3 text-xs font-semibold text-mist">
                No points on the board yet — pick a slip to get {g.name} started.
              </p>
            ) : (
              <div className="space-y-2">
                {board.map((u, i) => (
                  <Row key={u.uid} rank={i + 1} u={u} meUid={meUid} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function EmptyBoard({ text }) {
  return (
    <div className="mt-8 flex flex-col items-center justify-center px-6 text-center">
      <div className="text-5xl">📅</div>
      <p className="mt-3 max-w-xs text-sm font-semibold text-mist">{text}</p>
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
          <span className="rounded-full bg-flame/15 px-2 py-0.5 text-[11px] font-bold text-flame">
            {u.streak}-day
          </span>
        )}
        <span className="font-display text-xl text-gold">{u.points}</span>
      </div>
    </div>
  );
}
