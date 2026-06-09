import React, { useState } from 'react';

const TABS = [
  { id: 'imperial', label: 'All-time' },
  { id: 'week', label: 'This week' },
  { id: 'group', label: 'Groups' },
];

// Gold / silver / bronze podium styling (static strings for Tailwind purge).
const PODIUM = {
  1: { border: 'border-gold', text: 'text-gold', bt: 'border-t-gold', from: 'from-gold/10' },
  2: { border: 'border-mist', text: 'text-mist', bt: 'border-t-mist', from: 'from-mist/10' },
  3: { border: 'border-flame', text: 'text-flame', bt: 'border-t-flame', from: 'from-flame/10' },
};

export default function LeaderboardPage({ rows, weekly = [], meUid, groups = [], onLeaveGroup }) {
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
        <GroupBoards groups={groups} sorted={allTime} meUid={meUid} onLeave={onLeaveGroup} />
      ) : scope === 'week' ? (
        <>
          <p className="mt-3 text-center text-[11px] font-semibold text-mist">
            Points earned this week · resets Monday
          </p>
          {weekRows.length === 0 ? (
            <EmptyBoard text="No points on the board yet this week — lock in your picks to get on it." />
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
          // Full static class strings so Tailwind's purge keeps them.
          const s = PODIUM[rank];
          return (
            <div key={u.uid} className="flex flex-col items-center">
              <div className={`mb-1 flex h-12 w-12 items-center justify-center rounded-full border-2 bg-panel2 text-lg font-extrabold ${s.border} ${s.text}`}>
                {u.name?.[0] || '?'}
              </div>
              <div className="truncate text-xs font-bold">{u.name}</div>
              <div className="font-display text-lg text-gold">{u.points}</div>
              <div className={`mt-1 flex w-full items-start justify-center rounded-t-xl border border-line border-t-2 bg-gradient-to-b to-transparent ${h} pt-1.5 ${s.bt} ${s.from}`}>
                <span className={`font-display text-2xl ${s.text}`}>{rank}</span>
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

function GroupBoards({ groups, sorted, meUid, onLeave }) {
  const [selId, setSelId] = useState(null);
  const [confirmLeave, setConfirmLeave] = useState(false);

  if (groups.length === 0) {
    return (
      <div className="mt-8 flex flex-col items-center justify-center px-6 text-center">
        <h2 className="font-display text-xl">GROUP BOARDS</h2>
        <p className="mt-2 max-w-xs text-sm font-semibold text-mist">
          Join or create a group on the <span className="text-more">Groups</span> tab to battle your
          course, halls, or society on a private board.
        </p>
      </div>
    );
  }

  const sel = groups.find((g) => g.id === selId);

  // List view — tap a group to open its board.
  if (!sel) {
    return (
      <div className="mt-4 space-y-2">
        <p className="px-1 text-[11px] font-semibold text-mist">Tap a group to see its board.</p>
        {groups.map((g) => {
          const members = g.members?.length ?? 0;
          return (
            <button
              key={g.id}
              onClick={() => setSelId(g.id)}
              className="flex w-full items-center justify-between rounded-2xl border border-line bg-panel px-4 py-3 text-left transition active:scale-[0.99] hover:border-more/50"
            >
              <div>
                <div className="text-sm font-bold">{g.name}</div>
                <div className="text-[11px] font-semibold text-mist">{members} member{members === 1 ? '' : 's'}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-panel2 px-2.5 py-1 font-display text-sm tracking-widest text-gold">{g.code}</span>
                <span className="text-lg text-mist">›</span>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  // Single group's board.
  const memberSet = new Set(sel.members || []);
  const board = sorted.filter((u) => memberSet.has(u.uid));
  return (
    <div className="mt-3">
      <button
        onClick={() => { setSelId(null); setConfirmLeave(false); }}
        className="inline-flex items-center gap-1 rounded-full border border-line bg-panel2 py-1.5 pl-2.5 pr-3.5 text-sm font-bold text-fg transition active:scale-95 hover:border-more/60"
      >
        ‹ All groups
      </button>
      <div className="mb-2 mt-3 flex items-center justify-between">
        <h3 className="font-display text-2xl">{sel.name}</h3>
        <span className="rounded-lg bg-panel2 px-2.5 py-1 font-display text-sm tracking-widest text-gold">{sel.code}</span>
      </div>
      {board.length === 0 ? (
        <p className="rounded-xl border border-line bg-panel px-3 py-3 text-xs font-semibold text-mist">
          No points on the board yet — make some picks to get {sel.name} started.
        </p>
      ) : (
        <div className="space-y-2">
          {board.map((u, i) => <Row key={u.uid} rank={i + 1} u={u} meUid={meUid} />)}
        </div>
      )}

      <div className="mt-6">
        {confirmLeave ? (
          <div>
            <p className="mb-2 text-center text-sm font-bold text-fg">Leave {sel.name}?</p>
            <div className="flex gap-2">
              <button
                onClick={() => { onLeave?.(sel.id); setSelId(null); setConfirmLeave(false); }}
                className="flex-1 rounded-xl bg-less py-2.5 text-sm font-extrabold uppercase tracking-wide text-ink transition active:scale-[0.98]"
              >
                Leave
              </button>
              <button
                onClick={() => setConfirmLeave(false)}
                className="shrink-0 rounded-xl border border-line bg-panel2 px-6 py-2.5 text-sm font-bold text-mist transition active:scale-[0.98]"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmLeave(true)}
            className="w-full rounded-xl bg-less py-2.5 text-sm font-extrabold uppercase tracking-wide text-ink transition active:scale-[0.98]"
          >
            Leave this group
          </button>
        )}
      </div>
    </div>
  );
}

function EmptyBoard({ text }) {
  return (
    <div className="mt-8 flex flex-col items-center justify-center px-6 text-center">
      <p className="max-w-xs text-sm font-semibold text-mist">{text}</p>
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
        <div className="text-sm font-bold">{u.name}</div>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-display text-xl text-gold">{u.points}</span>
      </div>
    </div>
  );
}
