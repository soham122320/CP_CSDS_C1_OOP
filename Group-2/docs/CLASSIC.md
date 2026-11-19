# Disaster Rescue Commander

A browser-based disaster response simulation with a **real C++17 engine compiled to WebAssembly** and a React command-centre interface. No backend, account, API key, desktop software or player-side compilation is required.

> Repository inspection: the starting repository contained only a README, not an existing C++ game. This implementation therefore introduces a new OOP engine rather than claiming to reuse unavailable source. The scenario uses the requested 9 × 13 grid. The Pune map is fictional, not real emergency navigation.

## Play locally

Requires Node.js 20.19+ (Node.js 22 recommended).

```bash
cd frontend
npm ci
npm run dev
```

Open the address printed by Vite. **Compiled `game.js` and `game.wasm` are included** in `frontend/public/wasm`, so installing Emscripten is unnecessary unless you change the engine.

### How to play

1. Start the simulation. Select one of four response units on the map or in the fleet panel.
2. Choose a waiting civilian and click **Dispatch rescue unit**.
3. The C++ engine validates fuel, medical supplies and hospital capacity, reserves a bed and computes pickup and delivery routes.
4. Watch the unit follow the actual C++ route, collect the civilian and deliver them to a hospital.
5. Deploy other units in parallel. Prioritize critical civilians and keep an eye on fuel.
6. Pause/resume, change simulation cadence (1×/2×/4×), save locally, or load your saved operation after refreshing.

The classic operation ends after all eight rescues, 600 engine ticks, or when no active/feasible mission remains. Mission levels and custom challenges use their own objectives and time limits. Each unit carries one patient. A grid step costs one fuel (two for helicopters); pickup uses one medical kit. Fire stations are staging facilities, not refueling depots. Two hospitals have four beds each. Critical rescues earn 300 points, urgent 200 and stable 100. Ambulances add 25 points on successful delivery. No points are awarded until hospital arrival.

## Interface

- **Overview** — introductory landing screen (click the RESCUE logo).
- **Dashboard** — metrics, interactive map, dispatch, fleet and event feed.
- **City map** — clickable units and civilians, blocked cells, facilities, live routes, zoom and layers.
- **Rescue fleet** — unit selection, fuel, supplies and mission progress.
- **Civilians** — searchable register, severity and rescue state.
- **Missions** — dispatch, pickup and completed-delivery tracking.
- **Mission levels** — seven easy-to-expert scenarios, a visual custom mission editor, and share/import codes for friends.
- **Facilities** — occupancy and beds reserved for incoming patients.
- **Pathfinder** — animated Dijkstra exploration using the engine's visited nodes and reconstructed route.
- **Analytics** — score breakdown and engine-generated rescue history.
- **Field guide** — instructions, engine architecture and save/load controls.

Pages use hash navigation, so refreshing any page works with static hosting. The dashboard is the initial screen; the logo opens the landing page.

## Seven mission levels and friend challenges

Open **Mission levels** in the sidebar. All levels are unlocked:

| Level | Difficulty | Type | Civilians | Budget (ticks) | Fuel per unit |
|---|---|---|---:|---:|---:|
| First Response | Easy | Introductory evacuation | 2 | 300 | 100% |
| Aftershock Avenue | Easy | Debris evacuation | 3 | 240 | 100% |
| Critical Window | Medium | Critical-care extraction | 4 | 100 | 90% |
| Floodline Evacuation | Medium | Blocked-corridor evacuation | 5 | 180 | 90% |
| Fuel Discipline | Hard | Limited-fuel evacuation | 6 | 160 | 55% |
| Blackout Corridor | Hard | Critical extraction / damaged roads | 7 | 90 | 65% |
| The Last Mile | Expert | Tight-budget full evacuation | 8 | 80 | 55% |

Every preset has been completed by tests through both the native C++ engine and actual compiled WASM. Difficulty labels reflect scenario constraints, not a claim of adaptive difficulty. Flooding/blackout are scenario themes represented by blocked roads and resource limits, not new fluid or visibility physics.

### Create a mission for a friend

1. Open **Mission levels → Create for a friend**.
2. Name your challenge. Use the paint tool and numbered grid to add/remove civilians and blocked roads, relocate the four response units and two hospitals, and set civilian severity.
3. Set the objective (rescue everyone or rescue every critical civilian), time budget, fuel, kits and hospital capacities.
4. Click **Create share code**. C++ validates and normalizes the draft without changing the running operation.
5. Copy the `RC1.` code and send it to your friend.
6. Your friend opens the same app, selects **Play a friend’s code**, pastes the code, and clicks **Validate & load challenge**. They then start the simulation and solve it.

**Play my challenge** lets creators test their own draft. Loading replaces the operation (with confirmation when one is in progress); save first. Critical-care missions finish as soon as every critical patient is delivered, even if optional civilians or other transports remain. Success/failure is explicit. Restart retains the selected challenge. Saving/loading retains scenario rules and command history; old version-1 classic saves still load.

Codes contain mission setup only, not solutions, saved progress, executable code or accounts. Sharing is copy/paste, not online multiplayer or a cloud leaderboard. It requires no backend. The editor draft is temporary; keep the generated code if you want to return to it later.

C++ rejects overlapping/out-of-range locations, invalid numbers, missing critical objectives, insufficient aggregate beds/kits, and objective patients without a feasible route within initial fuel/time limits. Validation checks individual feasibility, not every combination of dispatch schedules: an advanced custom challenge can still require careful resource planning or be globally unsolvable. See [mission format](docs/MISSIONS.md).

## Architecture

```text
cpp-engine/
  include/
    core/           # Game, shared types and umbrella Engine.hpp
    entities/       # Abstract Person, Civilian
    vehicles/       # Abstract/polymorphic Vehicle and four unit subclasses
    facilities/     # Facility, Hospital, FireStation
    algorithms/     # Dijkstra path and exploration results
    map/            # 9 × 13 DisasterMap
    managers/       # GameManager, RescueManager, ScoreManager
  src/              # C++ engine implementations and embind entry point
  tests/            # Native engine regression tests
  vendor/json.hpp   # nlohmann/json 3.11.3 (MIT)
  CMakeLists.txt
frontend/
  public/wasm/      # Precompiled engine, loader and native-module bootstrap
  src/              # React, TypeScript, Tailwind, Framer Motion, Lucide, Recharts
  tests/            # Playwright browser tests
  vercel.json
scripts/
  build-wasm.sh
  test-wasm.mjs
.github/workflows/ci.yml
```

**React does not implement routing, rescue rules, fuel arithmetic, scoring or capacity logic.** It renders serialized engine state and sends commands through embind. SVG position transforms and animation timing are presentation only. The browser clock is informational and separate from engine ticks. All simulation timing advances through C++ commands, not elapsed wall-clock assumptions.

C++ owns grid validation, Dijkstra, vehicle state, pickup/delivery transitions, bed reservations, civilian priorities (STL priority queue), score calculation, notifications, history and game-over checks. C++ classes demonstrate abstraction, virtual dispatch, inheritance, RAII/`unique_ptr`, encapsulation and STL containers.

Saves contain versioned **command logs**, not arbitrary writable state snapshots. Loading replays every command against a fresh C++ engine and replaces the current state only after the complete log validates. Invalid saves cannot partially modify a running game. Save size and command count are bounded. Storage is local to the current browser/origin; it is not a cloud backup.

See [Engine API](docs/ENGINE.md), [deployment](docs/DEPLOYMENT.md) and [testing](docs/TESTING.md).

## Rebuild the C++ engine

Install CMake, Python 3, Node.js and the [Emscripten SDK](https://emscripten.org/docs/getting_started/downloads.html). With an activated SDK:

```bash
source /path/to/emsdk/emsdk_env.sh
./scripts/build-wasm.sh
```

Alternatively set `EMSDK=/path/to/emsdk` and the script will source its environment. CMake uses Emscripten's toolchain and creates:

```text
frontend/public/wasm/game.js
frontend/public/wasm/game.wasm
```

The checked-in artifacts were built and tested with Emscripten **6.0.9**. CI uses the same version. Rebuild and commit **both** generated files whenever you change C++. Do not edit the generated loader manually. `boot.js` is a handwritten native-module bootstrap, not generated game logic. It allows the same loader to work in Vite development and production.

## Tests and production build

```bash
# Native C++ tests (no Emscripten needed)
cmake -S cpp-engine -B build/native
cmake --build build/native --parallel 2
ctest --test-dir build/native --output-on-failure

# Actual WebAssembly + production frontend
cd frontend
npm ci
npm run test:wasm
npm run build

# Browser tests against the production build
npx playwright install --with-deps chromium
npm run test:e2e

# Serve the production build manually
npm run preview
```

GitHub Actions recompiles C++, runs native tests, rebuilds WebAssembly, tests the compiled engine, builds the frontend and runs Playwright. The resulting deployable `dist` is uploaded as an artifact. Build outputs and toolchains are ignored; the small deployment WASM assets are intentionally tracked.

## Deploy to Vercel

1. Import `Rampurkar91/oopgame-in-webformat` in your Vercel account and choose the branch containing this implementation.
2. Set **Root Directory** to `frontend` and framework to **Vite**.
3. Install command: `npm ci`; build command: `npm run build`; output: `dist`.
4. Deploy. `frontend/vercel.json` handles static WebAssembly MIME type, revalidation and SPA fallback.
5. Verify `/wasm/game.wasm` returns `application/wasm`, start a rescue, save/load, and refresh a page.

No Render server or MongoDB is necessary. Emscripten is **not** required on Vercel because deployable WASM is committed. Use the CI build to validate engine changes before deployment. This repository does not embed a deployment token, and no production Vercel URL is claimed without a successful account-authorized deployment.

## Third-party software

The vendored nlohmann/json header includes its MIT license and attribution. Other third-party dependencies retain their respective licenses in npm. No SFML, desktop runtime, remote map service, external image/font service or backend is used.
