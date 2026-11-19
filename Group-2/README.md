# Rescue Drive — Every Second. Every Life.

A playable, browser-based **3D ambulance rescue game**. Drive through a stylized neighbourhood, park, step out as a paramedic, help a patient with your partner, carry a stretcher back to the ambulance and deliver them to hospital.

The new interface is focused on **Play, Levels, Garage and Friend challenges**, not the old command-centre dashboard.

## Run

```bash
cd frontend
npm ci
npm run dev
```

Open the Vite address. Players need no installs, accounts, API keys or backend. WebGL / browser hardware acceleration is required. The compiled reward module is already committed.

## What you can play

- **Seven progressively unlocked campaign shifts:** First Call, Neighbourhood Rescue, Rush Hour, Road Closed, Night Shift, Rainy Rescue and City Emergency.
- **Direct driving:** acceleration, braking, reverse, steering, a draggable touch steering wheel, keyboard and on-screen controls.
- **Walk-out rescue:** stop, exit, walk to a marked front door, complete the three fictional first-aid actions, carry the patient with partner Morgan, return to the ambulance and load them.
- **A living 3D neighbourhood:** recognizable low-poly houses, roofs, doors that open, windows, trees, pavement, pedestrians, waiting families, a hospital and rescue base.
- **Calls and choices:** choose between waiting emergency calls, with location distance and urgency context. Two calls are visible at a time.
- **Partner Morgan:** follows you on foot, helps with the stretcher and gives context-sensitive radio guidance about pickup, stopping, collisions and patient stability.
- **Siren and traffic:** nearby traffic slows down and pulls towards the roadside when the siren is active.
- **Dynamic road event:** a fallen tree closes a section of Central Avenue after 25 simulation seconds on applicable missions. Find another cross street.
- **Patient stability, fuel and damage:** delays, heavy braking and impacts affect your response; vehicle damage reduces maximum speed. Wet missions have reduced steering response and weaker brakes.
- **Night/rain conditions:** night lighting and headlights, rain particles, darker/wetter roads and modified handling.
- **Garage:** four units with different speed, steering and capacity. The two larger units can transport two patients, and Critical Care slows onboard condition loss. Change body paint, unit name, side decal and light pattern.
- **Progression:** earn **1,000 coins on each campaign level's first successful completion**. Replays can improve your best stars/time but never farm additional coins. No real-money purchases.
- **Three-star results:** completion, safety/patient stability and response time.
- **Growing rescue base:** the station preview expands after three and six completed campaign shifts.
- **Training:** one untimed rescue with no vehicle-damage, fuel or condition penalties.
- **Free drive:** explore without a timer; optional rescue calls refresh after a wave is delivered.
- **Friend challenges:** choose 1–6 houses, time budget, weather, traffic and road events. Share an `RD1.` code for friends to paste and solve.
- **Mission replay:** a scrub-able driven route with collision, pickup and hospital-handover markers. This is route telemetry, not a video recording.
- **Pause/fullscreen:** the game occupies the entire browser viewport. A fullscreen button requests browser fullscreen; Escape, focus loss and leaving fullscreen pause safely.

The city is a hand-built **stylized low-poly world**, not photorealism or a real-world map. First aid is a simple fictional sequence, **not medical instruction**. Morgan and traffic use lightweight game behaviour, not an external AI service. Audio is off initially; enable the speaker icon for browser-provided speech and a synthesized siren. Voice availability depends on the browser/OS.

## Controls

| Action | Desktop | Touch |
|---|---|---|
| Accelerate / reverse | W / S or ↑ / ↓ | Up / down pedals |
| Steer | A / D or ← / → | Left/right buttons or drag steering wheel |
| Brake | Space | BRAKE pedal |
| Step out / interact / load / hand over | E | Contextual action button |
| Move on foot | WASD / arrows (north-up) | On-foot direction pad |
| Siren | Q | Siren button |
| First-aid sequence | 1, 2, 3, in order | First-aid task buttons |
| Pause | Escape | Pause icon |

**Rescue loop:** select a call → drive near it → stop → E to exit → walk to the cyan house beacon → E to help → complete the fictional tasks → carry the stretcher to the ambulance → E to load → drive to the green hospital marker → stop → E to hand over.

The minimap shows calls, your position, the hospital and active road closures. The direction guide points towards your selected destination; it is a compass, not turn-by-turn road routing. Call labels include elderly, household and accident emergencies; they share the same arcade pickup mechanics rather than separate clinical simulations.

## Architecture — deliberately changed for the driving redesign

You requested that most of the new game use a web game language, with **only a small C++ component**. Accordingly:

```text
frontend/src/driving/
  DriveApp.tsx        # Menus, campaign, garage, challenges, progression and results
  GameScreen.tsx      # Full-viewport HUD, input, touch controls, radio and audio
  scene.ts           # Three.js world, vehicles, characters, lights and renderer lifecycle
  session.ts         # TypeScript driving physics and rescue state machine
  model.ts           # Driving levels, vehicle tuning, profile and challenge codec
  rewards.ts         # Asynchronous small C++/WASM policy interface
  session.test.ts    # Deterministic simulation/profile/codec tests
  drive.css
cpp-engine/include/core/DrivingRewards.hpp  # Small C++ reward and shop policy
cpp-engine/src/driving-main.cpp             # Two embind exports
frontend/public/wasm/
  driving.js / driving.wasm / driving-boot.js
```

Three.js renders actual geometry, not a prerecorded scene. Driving, input, collision, rescue and traffic logic are TypeScript. The **separate, approximately 143 KB C++17/WebAssembly binary** validates results, calculates stars and first-clear rewards, and validates purchases. The active driving game **does not load the older full C++ engine**.

The previous command-centre source, its C++ engine, compiled files and regression tests are preserved—not deleted or rewritten into fake interactions—but are not the default website. Its original README is archived at [docs/CLASSIC.md](docs/CLASSIC.md). Its old `RC1.` grid codes are not interchangeable with the new `RD1.` driving-route codes. Old saved operations are left untouched in browser storage.

## Progress, rewards and sharing

- The local profile uses `rescue-drive-profile` in `localStorage`.
- Coins, purchased/equipped vehicles, livery, completed levels, best stars and best times survive refresh.
- Active shifts, editor drafts and route replay are in memory only; leaving/refreshing does not resume an unfinished shift. The pause screen explains this.
- Custom, training and free-drive shifts give **no campaign coins** and do not unlock levels.
- Coins are finite: seven first clears yield at most 7,000. Vehicle purchases are choices; there is no automatic refund, resale, refuelling shop or paid currency.
- Challenge codes contain configuration only, never executable code, solutions or player progression. UTF-8 names are supported. The decoder checks size, house bounds/uniqueness, timing and option types.
- This is a local single-player game. C++ validation and sanitized storage are **not tamper-proof anti-cheat**; browser storage is user-controlled. No online leaderboard, cloud accounts or multiplayer is claimed.

## Build and test

```bash
# Native legacy engine + small driving reward policy
cmake -S cpp-engine -B build/native
cmake --build build/native --parallel 2
ctest --test-dir build/native --output-on-failure

cd frontend
npm ci
npm run test:unit
npm run test:wasm
npm run build
npx playwright install --with-deps chromium
npm run test:e2e
```

The driving unit suite covers kinematics, rescue transitions across all levels, capacity, damage/stability, practice modes, traffic yielding, road events, timing, profile recovery and challenge validation. Native and WASM suites test actual C++ first-clear rewards, no repeat farming, ratings and purchase validation. Production-browser tests exercise the 3D game, controls, progression, purchases, customization, sharing, mobile layout and a complete **keyboard-driven** patient pickup/first-aid/stretcher/drive/hospital-handover flow without injecting game state.

The old command-centre Playwright source remains in `frontend/tests/game.spec.ts` for reference; the configured current suite is `driving.spec.ts`. See [docs/DRIVING.md](docs/DRIVING.md).

### Recompile WASM only when changing C++

Activate Emscripten 6.0.9 and install CMake/Python/Node, then:

```bash
source /path/to/emsdk/emsdk_env.sh
./scripts/build-wasm.sh
```

The script compiles **both** the new small `driving` policy and preserved `game` engine. Commit matching loader/binary pairs. Emscripten is not required for players, `npm run dev`, or Vercel builds using the committed binaries.

## Vercel

Import this repository, select the implementation branch, set root **`frontend`**, install **`npm ci`**, build **`npm run build`**, output **`dist`**. No environment variables or Render backend are required. `frontend/vercel.json` includes SPA fallback, WASM delivery headers and loader/binary revalidation.

A production Vercel URL must come from a successful account-authorized deployment. The local live preview is not a claimed production deployment. WebGL-capable browsers and HTTP(S) static serving are required.

## Third-party assets and licenses

All world geometry, textures/signs and siren tones are generated locally. No external map, image, font, voice server or paid asset is required. Three.js and other npm packages retain their licenses. Vendored nlohmann/json includes its MIT license/attribution. No SFML or desktop executable is used.
