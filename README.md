# OVER. — Imperial World Cup 2026 Props

A PrizePicks-style player-props game for the 2026 World Cup, built to spread across
Imperial College. Browse a match, tap **MORE** or **LESS** on app-set lines, lock
your best **5 picks** a day, climb the all-Imperial leaderboard or a private group.
**No betting** — just points and bragging rights.

> Kickoff is **11 June 2026**. The UI, engines, auth, live Firestore wiring, slips,
> leaderboards and groups are all built and tested. What's left is *yours*: create a
> Firebase project and an API-Football account, then flip the switches in §4.

**▶ Live demo (mock data):** https://mustafa-os.github.io/over-wc26/

---

## 1. Run it right now (30 seconds)

```bash
npm install
npm run dev
```

Open the local URL. With no `.env`, the app runs in **MOCK_MODE** on sample
fixtures (England v Croatia, Argentina v Algeria) so you can see and feel the whole
game — sign-up, the match rail, props, the More/Less mechanic, the slip, leaderboard,
groups — before any backend exists. There's a one-tap **"Try the demo"** button too.

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
`npm test` runs 21 assertions over them.

---

## 3. The architecture that makes it scale

**Users never call the football API.** Scheduled Cloud Functions hit API-Football a
few times a day and cache everything in Firestore; every student reads from Firestore
(huge free tier). 10 players or 1,000 — your API usage is identical.

```
                 (scheduled, ~hourly)
  API-Football  ───────────────────────▶  Cloud Functions  ───▶  Firestore
   fixtures                                generate props          (matches,
   lineups                                 resolve & score          props,
   player stats                            roll leaderboard         users, slips,
                                                                    leaderboards, groups)
                                                                        │
                                                  all users read  ◀─────┘
```

- `generateDailyProps` (08:00): fixtures + lineups → write today's props
- `resolveFinished` (hourly): finished matches → player stats → settle every slip, award points, roll streaks
- `recomputeLeaderboard` (hourly): roll user totals into the boards
- `joinGroup` (callable): add caller to a group by code

### Three run modes (`src/firebase.js`)

| Mode | Trigger | Backend |
|------|---------|---------|
| **MOCK** | no `.env` | runs entirely on `mockData.js` (default `npm run dev`) |
| **EMULATOR** | `VITE_FB_EMULATOR=1` | real Firebase SDK → local Emulator Suite |
| **LIVE** | `VITE_FB_API_KEY` set | your real Firebase project |

Every page is backend-agnostic via `AuthContext` / `DataContext` and the
`slipStore` / `groupStore` modules — the same UI runs on mock, emulator, or live.

---

## 4. Taking it live  ⬅ this is the part only you can do

### a) Firebase  *(blocks Auth, live data, slips, leaderboards, groups)*
1. Create a project at <https://console.firebase.google.com>.
2. Enable **Authentication** (Email/Password) and **Firestore**.
3. Copy your web config into `.env` (see `.env.example`). The app leaves MOCK_MODE
   automatically once `VITE_FB_API_KEY` is set.
4. `firebase use --add` (writes `.firebaserc`), then deploy rules + indexes:
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes
   ```

### b) API-Football  *(blocks prop generation + resolution)*
1. Sign up at <https://www.api-football.com>. **Free tier** (100 req/day, no live
   data) is fine for wiring everything up now.
2. **Before 11 June, upgrade to Pro ($19/mo)** for live data + player stats. That
   single upgrade is what makes resolution work during the tournament.
3. Store the key as a Functions secret — never in client code:
   ```bash
   firebase functions:secrets:set API_FOOTBALL_KEY
   ```

### c) Functions
The engines are ES modules; the functions runtime uses `require`. An esbuild step
converts them to `.cjs` next to `index.js` (wired into `predeploy`):
```bash
cd functions && npm install && npm run deploy   # builds engines + deploys
```

### d) Frontend hosting
```bash
npm run build
firebase deploy --only hosting        # Firebase Hosting (firebase.json -> dist, SPA rewrite)
```
A MOCK_MODE demo also auto-deploys to **GitHub Pages** on every push to `main`
(`.github/workflows/deploy.yml`). To make that demo *live*, add your `VITE_FB_*`
values as repo secrets and pass them to the build step.

---

## 5. Local development against the emulator (no cloud needed)

Test the full live code path — real Auth, Firestore reads/writes, security rules,
and the `joinGroup` callable — entirely offline (needs Java for the Firestore emulator):

```bash
# terminal 1 — emulators (auth, firestore, functions)
cd functions && npm install && npm run build:engines && cd ..
firebase emulators:start --only auth,firestore,functions --project demo-over-wc26

# terminal 2 — seed sample matches/props/leaderboard/groups, then run the app
npm run seed
npm run dev:emulator        # http://localhost:5174  (VITE_FB_EMULATOR=1)
```

## 6. Tests

```bash
npm test     # engine unit tests (lineEngine + scoringEngine), 21 assertions
```

The build was also verified headlessly during development: full mock UI flow,
the live emulator UI flow, a security-rules suite, and the groups/callable suite.

---

## File map

```
src/
  lib/lineEngine.js       line generation (positions, baselines, half-lines)
  lib/scoringEngine.js    risk-weighted points + slip settlement (Poisson)
  lib/mockData.js         sample fixtures/squads for MOCK_MODE
  lib/mockAuth.js         localStorage auth stand-in for MOCK_MODE
  lib/slipStore.js        slip persistence (mock + Firestore)
  lib/groupStore.js       groups (mock + Firestore + joinGroup callable)
  firebase.js             guarded init (MOCK / EMULATOR / LIVE)
  context/AuthContext.jsx auth state machine over both backends
  context/DataContext.jsx matches + props + leaderboard subscriptions
  App.jsx                 shell: auth gate, slip state, lock-at-kickoff, nav
  components/             PropCard (More/Less), PickSlip (slip + results + share)
  pages/                  AuthScreen, Onboarding, Today, Leaderboard, Groups, Profile
functions/
  index.js                scheduled jobs + joinGroup callable
  apiFootball.js          API-Football client (server-side only)
firestore.rules           server-only matches/props, protected points, owner-only
                          slips (locked = one-way latch), member-read groups
firebase.json             rules + indexes + functions + hosting + emulator config
scripts/                  seed.mjs (emulator seed), test-engines.mjs (npm test)
```
