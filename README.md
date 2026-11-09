# ⚽ Golazo: Imperial's World Cup 2026 prediction game

**Call MORE or LESS on World Cup player stats, lock in your best five picks a day, and climb the all-Imperial leaderboard. No betting, just points and bragging rights.**

**[▶ Play the live app](https://golazo-wc.web.app)** · **[Try the demo](https://mustafa-os.github.io/golazo-wc26/)** (no sign-in) · React · Firebase · Cloud Functions · API-Football

![Golazo: call MORE or LESS on World Cup player props](public/og.png)

## At a glance

- 🎯 **Fair, probability-based scoring.** A pick's points are roughly `1 / chance it lands`, modelled with a Poisson distribution, so a striker's brace pays up to 100 and a likely shot on target pays ~5–8.
- 🏗️ **Built to scale for free.** Players never call the football API. Scheduled cloud jobs fetch data once and cache it in Firestore, so **1,000 players cost the same API calls as 10**.
- 🔒 **Secure by design.** Points are only ever awarded by the server. Firestore rules stop anyone editing their score or changing a pick after kickoff.
- ✅ **One source of truth.** The line and scoring engines are shared by the app (to preview points) and the server (to award them), so they can't disagree. 45 automated tests run before every deploy.
- 🎓 **Imperial-only.** Students sign in with Google and are verified by their college shortcode.

## How to play

1. Each day, every player gets **over/under lines** on stats that suit their position: goals and shots for strikers, saves for keepers.
2. Call **MORE** or **LESS** on up to **5 picks**. Go big with a **Power Play** (all must land) or make one pick a **2× Captain**.
3. Picks lock at kickoff. When the matches finish, the server settles every slip and updates the leaderboards.
4. Compete on the all-Imperial board or start a **private group** with friends.

<details>
<summary><b>How lines and scoring work</b></summary>

**Lines** (`src/lib/lineEngine.js`) — every player gets over/under lines on the
metrics that suit their position (strikers: goals/shots; keepers: saves; etc.).
Lines are half-numbers (0.5, 1.5, 2.5…) so every prop resolves cleanly. No odds feed
needed — lines come from position baselines, upgraded to a player's own form when the
stats feed provides it.

**Scoring** (`src/lib/scoringEngine.js`) — risk-weighted. A pick's value ≈ `1 / P(it lands)`,
where the probability is modelled with a Poisson tail on the metric's baseline. A safe
shot-on-target pays ~5–8 pts; a striker brace or a keeper scoring pays up to 100. Wrong
picks score **0** (never negative), and a picked player who doesn't play is **void** —
the standard DFS "Did Not Play" rule. The engine also supports a daily-streak
multiplier of up to +50%.

Both engines are plain dependency-free JS, imported by **both** the frontend (to
preview points) and the Cloud Functions (to award them) — so they can never disagree.
`npm test` runs 45 assertions over them.

</details>

## How it's built

```
                 (scheduled)
  API-Football  ───────────────────────▶  Cloud Functions  ───▶  Firestore
   fixtures                                generate props          (matches,
   lineups                                 resolve & score          props,
   player stats                            roll leaderboard         users, slips,
                                                                    leaderboards, groups)
                                                                        │
                                                  all users read  ◀─────┘
```

| Job | When | What it does |
|---|---|---|
| `generateDailyProps` | daily, 08:00 London | Writes props for every match in the next 5 days |
| `resolveFinished` | every 15 min | Settles slips once **all** their matches are done, awarding points exactly once |
| `recomputeLeaderboard` | every 5 min | Rolls totals into cached all-time and weekly boards |
| `joinGroup` / `leaveGroup` | on request | Group changes go through the server, since direct writes are blocked |

The same UI runs in three modes: **mock** (sample data, no backend), **emulator** (local Firebase) and **live**.

<details>
<summary><b>The three run modes</b></summary>

| Mode | Trigger | Backend |
|------|---------|---------|
| **MOCK** | no `.env` | runs entirely on `mockData.js` (default `npm run dev`) |
| **EMULATOR** | `VITE_FB_EMULATOR=1` | real Firebase SDK → local Emulator Suite |
| **LIVE** | `VITE_FB_API_KEY` set | your real Firebase project |

Every page is backend-agnostic via `AuthContext` / `DataContext` and the
`slipStore` / `groupStore` modules — the same UI runs on mock, emulator, or live.

</details>

## Run it

```bash
npm install
npm run dev     # runs in MOCK mode on sample fixtures: no accounts or keys needed
npm test        # 45 engine tests
```

<details>
<summary><b>Going live: Firebase, API-Football and deployment</b></summary>

### a) Firebase *(unlocks Auth, live data, slips, leaderboards, groups)*
1. Create a project at <https://console.firebase.google.com>.
2. Enable **Authentication** (Google provider) and **Firestore**.
3. Copy your web config into `.env` (see `.env.example`). The app leaves MOCK_MODE
   automatically once `VITE_FB_API_KEY` is set.
4. `firebase use --add` (writes `.firebaserc`), then deploy rules + indexes:
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes
   ```

### b) API-Football *(unlocks prop generation + resolution)*
1. Sign up at <https://www.api-football.com>. The free tier is enough to wire
   everything up; live in-tournament resolution needs a paid tier with live data
   and player stats.
2. Store the key as a Functions secret — never in client code:
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
(`.github/workflows/deploy.yml` — CI runs the engine tests and build first).

### Local development against the emulator

Test the full live code path — real Auth, Firestore reads/writes, security rules,
and the group callables — entirely offline (needs Java for the Firestore emulator):

```bash
# terminal 1 — emulators (auth, firestore, functions)
cd functions && npm install && npm run build:engines && cd ..
firebase emulators:start --only auth,firestore,functions --project demo-over-wc26

# terminal 2 — seed sample matches/props/leaderboard/groups, then run the app
npm run seed
npm run dev:emulator        # http://localhost:5174  (VITE_FB_EMULATOR=1)
```

### Tests

```bash
npm test     # engine unit tests (lineEngine + scoringEngine), 45 assertions
```

The same tests run in CI before every GitHub Pages deploy. During development the
build was also verified headlessly: full mock UI flow, the live emulator UI flow,
a security-rules suite, and the groups/callable suite.

</details>

<details>
<summary><b>File map</b></summary>

```
src/
  lib/lineEngine.js       line generation (positions, baselines, half-lines)
  lib/scoringEngine.js    risk-weighted points + slip settlement (Poisson)
  lib/mockData.js         sample fixtures/squads for MOCK_MODE
  lib/mockAuth.js         localStorage auth stand-in for MOCK_MODE
  lib/slipStore.js        slip persistence (mock + Firestore)
  lib/groupStore.js       groups (mock + Firestore + callables)
  firebase.js             guarded init (MOCK / EMULATOR / LIVE)
  config.js               Imperial shortcode validation (onboarding gate)
  context/AuthContext.jsx auth state machine over both backends
  context/DataContext.jsx matches + props + leaderboard subscriptions
  App.jsx                 shell: auth gate, slip state, lock-at-kickoff, nav
  components/             PropCard (More/Less), PickSlip (slip + results + share)
  pages/                  AuthScreen, Onboarding, Today, Leaderboard, Groups, Profile
functions/
  index.js                scheduled jobs + group callables
  apiFootball.js          API-Football client (server-side only)
firestore.rules           server-only matches/props, protected points, owner-only
                          slips (locked = one-way latch), member-read groups
firebase.json             rules + indexes + functions + hosting + emulator config
scripts/                  seed.mjs (emulator seed), test-engines.mjs (npm test)
```

</details>

## About

Personal project, built in June 2026 in the run-up to and during the FIFA World Cup, so Imperial College students could play along with the tournament.

---

<sub>Built by <b>Mustafa Suleman</b>, MEng Design Engineering, Imperial College London · <a href="https://github.com/Mustafa-OS">More projects</a> · <a href="https://www.linkedin.com/in/mustafaosuleman/">LinkedIn</a></sub>
