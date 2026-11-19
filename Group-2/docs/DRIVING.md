# Rescue Drive: implementation and verification

## Game modes

Campaign unlocks one level at a time. `model.ts` defines the seven shifts and vehicle tuning. Training and free drive do not apply time, damage, fuel or stability penalties. Free drive refreshes its optional call wave; training ends after the instructional rescue. Custom shifts use their imported timer/conditions but never earn campaign rewards.

## Simulation

`RescueSession` owns car position/heading/speed, walking actor, fuel/damage/stability, calls, passenger capacity, traffic, dynamic closures, radio messages and replay points. The renderer never teleports a vehicle to complete a mission. Game actions independently check proximity and stopped speed; a remote click cannot collect/deliver a patient.

Driving uses a bounded acceleration/steering model with axis-aligned building/world/tree collision checks. It is arcade physics, not a rigid-body simulator. Roads are faster than grass. Rain reduces steering response and braking power. Collisions damage the ambulance, reduce patient condition, log a replay marker and lower maximum speed. First aid has ordered steps and a brief cooldown; stopping or pause cannot skip it.

A frame is split into <=20ms simulation steps, with at most 250ms caught up per rendered frame to avoid tunnelling or giant time jumps. Focus/visibility loss pauses. Shadows/pixel density automatically reduce under sustained low frame rates. Three.js geometry/materials/textures, resize observers, animation frames, audio and WebGL contexts are released on unmount.

Morgan follows the player and stretcher, and issues contextual warnings. Traffic travels a deterministic road loop, gradually pulls aside and slows when an active siren is close. The road event is a deterministic fallen tree at `(0,-25)` after 25 simulation seconds. The minimap/compass expose the closure; no turn-by-turn road planner is claimed.

## C++ boundary

The default interface loads only `/wasm/driving-boot.js` → `driving.js` → `driving.wasm`. `rewards.ts` handles asynchronous initialization once. No TypeScript fallback grants coins when the WASM fails.

Exports:

- `evaluateDrivingResult(jsonText)` returns `{success, stars, coins}` or `{error}`. It checks bounds, delivery counts, time, condition and completion-ledger type. Success gives one star; safe driving/condition and a response within 75% of the budget each add one. The first successful **campaign** completion yields exactly 1,000 coins; repeats and other modes yield zero.
- `purchaseDrivingVehicle(id, coins, availableLevel, owned)` checks price, level gate, ownership and balance before returning an approved remaining balance.

Only a successful campaign result is applied to local progression. This is local validation, not proof against someone modifying their browser/profile/JavaScript. There is no secure server, identity or competitive economy.

## Friend-code contract

`RD1.` + Base64 UTF-8 JSON containing:

```json
{"name":"A friend in need","houses":[6,10],"limit":480,"weather":"clear","traffic":true,"events":true}
```

Names are 1–48 non-control characters. House IDs are unique integers 0–15, with 1–6 selected. Time is an integer 120–1200 seconds. Weather is `clear`, `rain` or `night`, and flags are booleans. Codes over 5,000 characters or malformed/incorrectly typed payloads are rejected. Unknown fields are not imported into a session. Codes are never evaluated as JavaScript.

All marked houses have an accessible doorstep; a custom route is not guaranteed to be easy for every vehicle/time choice. The creator can test it before sharing. RC1 grid scenarios belong to the previous command-centre implementation and are intentionally rejected by the driving importer rather than silently changing their meaning.

## Verification

- CTest: original engine/scenarios plus the separate reward-policy executable.
- Vitest: 20 deterministic driving, rescue, capacity, collision, timer, siren, road-event, practice, persistence and challenge tests.
- Node/WASM: both compiled modules instantiate; the original engine tests remain, and the new C++ policy is tested for rewards, repeat rejection, non-campaign modes, rating and purchases.
- Playwright: production build with an actual WebGL canvas. Tests cover controls, pause, siren, leaving the ambulance, sequential locks, a real C++ shop purchase and persisted livery, friend-code import/rejection, mobile overflow, untimed modes, and a complete rescue performed through real keyboard controls and UI first-aid buttons.

The lifecycle unit tests arrange actors near interaction boundaries to test the state machine in isolation. The full browser rescue does not inject/teleport actors or add production cheat hooks; it steers/walks using keyboard events and reads the public minimap/compass for navigation.

Browser speech depends on available OS voices and may be unavailable; radio text is always visible. Audio starts muted. Safari/Firefox, physical mobile touch devices and a public Vercel deployment have not been independently verified. Low-poly visuals are intentional; this is not a photorealistic or clinically accurate simulation.
