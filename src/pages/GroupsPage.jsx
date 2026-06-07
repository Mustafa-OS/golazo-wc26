import React, { useState } from 'react';

// Demo state only. Wire create/join to the joinGroup Cloud Function + Firestore.
const SEED_GROUPS = [
  { id: 'g1', name: 'Dyson DesEng', code: 'DYSON26', members: 23 },
  { id: 'g2', name: 'Beit Halls Boys', code: 'BEIT99', members: 11 },
];

export default function GroupsPage() {
  const [groups, setGroups] = useState(SEED_GROUPS);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');

  function join() {
    const c = code.trim().toUpperCase();
    if (!c || groups.some((g) => g.code === c)) return setCode('');
    setGroups((g) => [...g, { id: Date.now().toString(), name: `Group ${c}`, code: c, members: 1 }]);
    setCode('');
  }
  function create() {
    if (!name.trim()) return;
    const c = name.slice(0, 4).toUpperCase() + Math.floor(Math.random() * 90 + 10);
    setGroups((g) => [...g, { id: Date.now().toString(), name: name.trim(), code: c, members: 1 }]);
    setName('');
  }

  return (
    <div>
      <h1 className="mt-2 font-display text-3xl">GROUPS</h1>
      <p className="mt-1 text-sm text-mist">
        Make a private league and battle your course / halls / society.
      </p>

      <div className="mt-4 rounded-2xl border border-line bg-panel p-3">
        <div className="text-xs font-bold uppercase tracking-wide text-mist">Join with a code</div>
        <div className="mt-2 flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. DYSON26"
            className="flex-1 rounded-xl border border-line bg-panel2 px-3 py-2.5 text-sm font-semibold uppercase tracking-wide outline-none placeholder:normal-case placeholder:text-mist focus:border-more"
          />
          <button onClick={join} className="rounded-xl bg-more px-4 font-bold text-ink active:scale-95">
            Join
          </button>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-line bg-panel p-3">
        <div className="text-xs font-bold uppercase tracking-wide text-mist">Create a group</div>
        <div className="mt-2 flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Group name"
            className="flex-1 rounded-xl border border-line bg-panel2 px-3 py-2.5 text-sm font-semibold outline-none placeholder:text-mist focus:border-more"
          />
          <button onClick={create} className="rounded-xl border border-line bg-panel2 px-4 font-bold text-more active:scale-95">
            Create
          </button>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        {groups.map((g) => (
          <div key={g.id} className="flex items-center justify-between rounded-xl border border-line bg-panel px-3 py-3">
            <div>
              <div className="text-sm font-bold">{g.name}</div>
              <div className="text-[11px] font-semibold text-mist">{g.members} members</div>
            </div>
            <div className="rounded-lg bg-panel2 px-3 py-1.5 font-display text-base tracking-widest text-gold">
              {g.code}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
