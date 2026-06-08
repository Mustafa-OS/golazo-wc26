import React, { useState } from 'react';

export default function GroupsPage({ groups, onCreate, onJoin }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { kind: 'ok'|'err', text }

  async function join() {
    if (busy) return;
    setBusy(true); setMsg(null);
    try {
      const res = await onJoin(code);
      setMsg({ kind: 'ok', text: `Joined ${res?.name || 'the group'}!` });
      setCode('');
    } catch (e) {
      setMsg({ kind: 'err', text: e.message || 'Could not join that group.' });
    } finally { setBusy(false); }
  }

  async function create() {
    if (busy) return;
    setBusy(true); setMsg(null);
    try {
      const g = await onCreate(name);
      setMsg({ kind: 'ok', text: `Created “${g.name}” — share code ${g.code}` });
      setName('');
    } catch (e) {
      setMsg({ kind: 'err', text: e.message || 'Could not create the group.' });
    } finally { setBusy(false); }
  }

  return (
    <div>
      <h1 className="mt-2 font-display text-3xl">GROUPS</h1>
      <p className="mt-1 text-sm text-mist">
        Make a private league and battle your course / halls / society.
      </p>

      {msg && (
        <div
          className={`mt-3 rounded-xl border px-3.5 py-2.5 text-sm font-semibold ${
            msg.kind === 'ok'
              ? 'border-more/40 bg-more/10 text-more'
              : 'border-less/40 bg-less/10 text-less'
          }`}
        >
          {msg.text}
        </div>
      )}

      <div className="mt-4 rounded-2xl border border-line bg-panel p-3">
        <div className="text-xs font-bold uppercase tracking-wide text-mist">Join with a code</div>
        <div className="mt-2 flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. DYSON26"
            onKeyDown={(e) => e.key === 'Enter' && join()}
            className="flex-1 rounded-xl border border-line bg-panel2 px-3 py-2.5 text-sm font-semibold uppercase tracking-wide outline-none placeholder:normal-case placeholder:text-mist focus:border-more"
          />
          <button
            onClick={join}
            disabled={busy || !code.trim()}
            className="rounded-xl bg-more px-4 font-bold text-ink transition active:scale-95 disabled:opacity-40"
          >
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
            maxLength={24}
            onKeyDown={(e) => e.key === 'Enter' && create()}
            className="flex-1 rounded-xl border border-line bg-panel2 px-3 py-2.5 text-sm font-semibold outline-none placeholder:text-mist focus:border-more"
          />
          <button
            onClick={create}
            disabled={busy || !name.trim()}
            className="rounded-xl border border-line bg-panel2 px-4 font-bold text-more transition active:scale-95 disabled:opacity-40"
          >
            Create
          </button>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        {groups.length === 0 ? (
          <p className="py-8 text-center text-sm text-mist">
            You’re not in any groups yet. Join one with a code, or create your own.
          </p>
        ) : (
          groups.map((g) => (
            <div key={g.id} className="flex items-center justify-between rounded-xl border border-line bg-panel px-3 py-3">
              <div>
                <div className="text-sm font-bold">{g.name}</div>
                <div className="text-[11px] font-semibold text-mist">
                  {(g.members?.length ?? 0)} member{(g.members?.length ?? 0) === 1 ? '' : 's'}
                </div>
              </div>
              <div className="rounded-lg bg-panel2 px-3 py-1.5 font-display text-base tracking-widest text-gold">
                {g.code}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
