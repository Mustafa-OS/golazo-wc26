# OVER. — Imperial World Cup 2026 Props

A PrizePicks-style player-props game for the 2026 World Cup, built to spread across
Imperial College. Browse a match, tap **MORE** or **LESS** on app-set lines, lock
your best **5 picks** a day, climb the all-Imperial leaderboard or a private group.
**No betting** — just points and bragging rights.

> Kickoff is **11 June 2026**. This repo is the working scaffold: the hard logic
> is done, the UI runs today on mock data, and the steps below take it live.

---

## 1. Run it right now (30 seconds)

```bash
npm install
npm run dev
```

Open the local URL. With no `.env`, the app runs in **MOCK_MODE** on sample
fixtures (England v Croatia, Argentina v Algeria) so you can see and feel the whole
game — match rail, props, the More/Less mechanic, the slip, the leaderboard — before
any backend exists.

---

## 2. How the game works

**Lines** (`src/lib/lineEngine.js`) — every player gets over/under lines on the
metrics that suit their position (strikers: goals/shots; keepers: saves; etc.).
Lines are half-numbers (0.5, 1.5, 2.5…) so every prop resolves cleanly. No odds feed
needed — lines come from position baselines, upgraded to a player's own form when the
stats feed provides it.

**Scoring** (`src/lib/scoringEngine.js`) — risk-weighted. A pick's value ≈ `1 / P(it lands)`,
where the probability is modelled with a Poisson tail on the metric's baseline. A safe
shot-on-target pays ~5–8 pts; a striker brace or a keeper scoring pays up to 100. Wrong
picks score **0** (never negative). A daily streak adds up to **+50%**.

Both engines are plain dependency-free JS, imported by **both** the frontend (to
preview points) and the Cloud Functions (to award them) — so they can never disagree.

---

## 3. The architecture that makes it scale

**Users never call the football API.** That's the whole trick. Scheduled Cloud
Functions hit API-Football a few times a day and cache everything in Firestore;
every student reads from Firestore (huge free tier). 10 players or 1,000 — your API
usage is identical.

```
                 (scheduled, ~hourly)
  API-Football  ───────────────────────▶  Cloud Functions  ───▶  Firestore
   fixtures                                generate props          (matches,
   lineups                                 resolve & score          props,
   player stats                            roll leaderboard         users, slips,
                                                                    leaderboards)
                                                                        │
                                                  all users read  ◀─────┘
```

- `generateDailyProps` (08:00): fixtures + lineups → write today's props
- `resolveFinished` (hourly): finished matches → player stats → settle every slip
- `recomputeLeaderboard` (hourly): roll user totals into the boards
- `joinGroup` (callable): add caller to a group by code

---

## 4. Taking it live

### a) Firebase
1. Create a project at <https://console.firebase.google.com>.
2. Enable **Authentication** (Email/Password) and **Firestore**.
3. Copy your web config into `.env` (see `.env.example`). The app leaves MOCK_MODE
   automatically once `VITE_FB_API_KEY` is set.
4. Deploy the security rules: `firebase deploy --only firestore:rules`.

### b) API-Football
1. Sign up at <https://www.api-football.com>. **Free tier** (100 req/day, no live
   data) is fine for wiring everything up now.
2. **Before 11 June, upgrade to Pro ($19/mo)** for live data + player stats. That
   single upgrade is what makes resolution work during the tournament.
3. Store the key as a Functions secret — never in client code:
   ```bash
   firebase functions:secrets:set API_FOOTBALL_KEY
   ```

### c) Functions
The engines are ES modules; the functions runtime here uses `require`. A one-line
esbuild step converts them to `.cjs` next to `index.js`:
```bash
cd functions && npm install && npm run deploy   # builds engines + deploys
```

### d) Frontend hosting
```bash
npm run build
# then either:
firebase deploy --only hosting      # Firebase Hosting
# or import the repo to Vercel for auto-deploys on push
```

---

## 5. Suggested Claude Code build order

The UI + engines are done. Wire the live pieces in this order — each is a clean,
self-contained prompt for Claude Code:

1. **Auth** — "Add Firebase email/password auth with an Imperial email check
   (`@imperial.ac.uk`), a name + department onboarding step, and write the user doc."
2. **Read props from Firestore** — "Replace `mockData` in `App.jsx` with a Firestore
   subscription to `matches` and `matches/{id}/props`; keep the same shapes."
3. **Persist slips** — "On Lock Slip, write a `slips` doc `{uid, matchIds, picks, locked, day}`;
   block writes after first kickoff (client + the existing security rule)."
4. **Live leaderboards** — "Subscribe `LeaderboardPage` to `leaderboards/imperial`
   and to group boards; remove the mock rows."
5. **Groups** — "Wire create-group (write a `groups` doc with a random code) and the
   join button to the `joinGroup` callable."
6. **Deploy functions + test** on the API-Football free tier with a past fixture, then
   flip to Pro before the 11th.

### Going-viral checklist for Imperial
- Friendly name + a QR code to the deployed URL for stories / group chats / society
  Slacks. Seed a few halls/course groups so new joiners land somewhere active.
- A "share my slip" image (export the slip as PNG) is a strong growth hook if you have
  time after the core loop.

---

## File map

```
src/
  lib/lineEngine.js       line generation (positions, baselines, half-lines)
  lib/scoringEngine.js    risk-weighted points + slip settlement (Poisson)
  lib/mockData.js         sample fixtures/squads for MOCK_MODE
  firebase.js             guarded init (MOCK_MODE when no env)
  App.jsx                 shell: state, slip, nav
  components/PropCard.jsx the More/Less selector
  components/PickSlip.jsx the bottom-sheet slip
  pages/                  Today, Leaderboard, Groups, Profile
functions/
  index.js                scheduled jobs + joinGroup
  apiFootball.js          API-Football client (server-side only)
firestore.rules           locks points/props to server writes
```
