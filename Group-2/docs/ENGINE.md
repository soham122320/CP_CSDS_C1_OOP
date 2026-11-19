> **Archived command-centre documentation.** The default app is now Rescue Drive. See [DRIVING.md](DRIVING.md) and the root README for the current architecture and test suite. This older engine/source is preserved, not loaded by the driving game.

# C++ / WebAssembly API

`main.cpp` exposes the C++ `GameManager` using Emscripten embind. Every state response below is a JSON string. `frontend/src/services/engine.ts` asynchronously loads the native browser module, then the React hook calls the compiled exports. There is no TypeScript fallback engine.

| Export | Inputs | Result |
|---|---|---|
| `initializeGame()` | — | Reset state, phase `ready` |
| `startGame()` | — | Start/resume state |
| `pauseGame()` | — | Paused state |
| `restartGame()` | — | Reset state |
| `getGameState()` | — | Complete current state |
| `getVehicles()` | — | Vehicle array |
| `getCivilians()` | — | Civilian array |
| `getFacilities()` | — | Hospital and station array |
| `selectVehicle(id)` | Vehicle ID 0–3 | Updated state |
| `assignRescueMission(vehicleId, civilianId)` | Vehicle ID, civilian ID 0–7 | Validated mission + updated state |
| `calculateShortestPath(start, destination)` | Cell indices 0–116 | `{route, visited, distance, calculated}` |
| `moveVehicle(vehicleId)` | Vehicle ID | One movement step, one engine tick |
| `tick()` | — | One global tick; all active units advance |
| `getCurrentScore()` | — | Integer score (not a JSON string) |
| `saveGame()` | — | Versioned command-log JSON |
| `loadGame(text)` | Command-log JSON string | Validated restored state |

Invalid commands throw C++ exceptions; the frontend reads exported exception messages and releases caught exception references. Mission assignment is disabled in the UI when obviously unavailable, but C++ independently validates all commands. A failed mission assignment cannot reserve a bed, spend fuel or mark a civilian assigned.

## Pathfinding

The city contains 117 cells (`cell = row * 13 + column`, zero-based). Dijkstra uses a `std::vector` distance array and previous-node array, a min-priority queue, four-direction neighbors and path reconstruction. Out-of-range and blocked endpoints return `distance: -1`, an empty route and `calculated: true`. Before any calculation, `calculated` is false. Roads have unit cost. No diagonal movement or blocked-cell traversal is allowed. Helicopters use the same safe corridors but consume two fuel units per step.

Time is O((V + E) log V), auxiliary space O(V) for this bounded-degree grid. `visited` records finalized node order for the visualizer. `route` includes both endpoints. Identical valid endpoints return a one-cell path with zero distance.

## State ownership and mission lifecycle

1. C++ validates operation phase, identifiers, unit availability, civilian availability and medical supply.
2. Dijkstra finds a pickup route and the nearest reachable hospital with unoccupied/unreserved capacity.
3. C++ validates enough fuel for **both** pickup and hospital delivery before making changes.
4. A bed is reserved; the unit is `responding`; civilian becomes `assigned`.
5. Every step subtracts the polymorphic vehicle fuel cost.
6. On pickup the unit becomes `transporting`, civilian `onboard` and one kit is consumed.
7. At the hospital the reservation becomes occupied, civilian becomes `rescued`, the score updates and the unit becomes `available`.
8. A completed operation is terminal until restart. Paused global ticks do not advance time or vehicles.

All units are single-patient units in this scenario. No refueling, hospital discharge or supplies refill is provided. No real-time civilian health decay is modeled. A stationary fire station provides staging/visual context rather than hidden bonuses. These are explicit rules, not nonfunctional UI controls.

## Persistence

New saves are `{version: 2, scenario: <normalized mission or null for classic>, commands: [[action, a, b], ...]}`. Legacy `{version: 1, commands: [...]}` saves remain supported. A fresh candidate manager replays the log through the same validated commands. Only a successful complete replay is moved into the live manager. Logs are limited to 20,000 commands / 2 MB input. This is deterministic local persistence, not anti-cheat or cryptographic signing. Browser storage is handled by React; serialization, validation and restoration are C++ responsibilities.

## Scenario extensions

- `getScenarios()` returns the seven preset blueprints as a JSON array.
- `validateScenario(jsonText)` validates/normalizes a blueprint using a separate C++ manager and returns its canonical JSON without changing the live operation.
- `setScenario(jsonText)` atomically replaces the operation with a validated blueprint in `ready` phase.
- `exportScenario()` returns the current blueprint without runtime progress (choose a level or custom challenge first).
- `restartGame()` now preserves the current blueprint; `initializeGame()` still opens the classic operation.

`GameState` adds `scenario`, `timeLimit` and `outcome` (`pending`, `success`, `failure`). Scenario `objective` is `all` or `critical`. The C++ goal evaluator, rather than React, determines success. See `MISSIONS.md` for bounds and the friend-code transport format.
