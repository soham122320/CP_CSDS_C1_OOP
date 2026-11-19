> **Archived command-centre documentation.** The default app is now Rescue Drive. See [DRIVING.md](DRIVING.md) and the root README for the current architecture and test suite. This older engine/source is preserved, not loaded by the driving game.

# Mission blueprints and friend codes

The source of truth is `cpp-engine/src/Scenario.cpp`. React paints and edits a draft; C++ validates all gameplay constraints before import, play or code creation.

## Blueprint format

```json
{
  "name": "Friend challenge",
  "objective": "all",
  "timeLimit": 300,
  "fuel": 100,
  "supplies": 5,
  "blocked": [],
  "vehicles": [104, 106, 112, 116],
  "hospitals": [{"cell": 2, "capacity": 4}, {"cell": 38, "capacity": 4}],
  "civilians": [{"cell": 79, "severity": 3}, {"cell": 92, "severity": 2}]
}
```

- `name`: 1–64 UTF-8 bytes, no control characters. Use short names for non-ASCII scripts.
- `objective`: `all` = all civilians must reach hospital; `critical` = every severity-3 civilian must reach hospital. At least one critical civilian is required for a critical-care mission. The game ends immediately on objective completion, even if optional rescues remain in transit.
- `timeLimit`: integer 30–1200 engine ticks; ticks are simulation steps, not guaranteed wall-clock seconds.
- `fuel`: integer 10–100, initial fuel for each unit.
- `supplies`: integer 1–5 medical kits per unit.
- `blocked`: up to 80 unique cell indices.
- `vehicles`: exactly four unique cells, in ambulance / rescue van / fire truck / helicopter order.
- `hospitals`: exactly two unique locations, each capacity 1–12.
- `civilians`: 1–12 unique locations, severity 1 (stable), 2 (urgent) or 3 (critical).
- All locations are integer cell indices 0–116 on the original 9 × 13 grid. Map objects cannot overlap each other or blocked cells. The response-base marker may share the fire-truck starting cell because it is visual staging context.

Optional preset metadata such as difficulty is cosmetic, never trusted as progress or scoring. Imported data is canonicalized; unknown fields and original civilian names are not executed or carried into game logic. New civilian IDs are sequential, and names become `Civilian 1`, `Civilian 2`, etc.

## Validation and limits

The C++ validator requires enough total hospital beds and kits for the objective. Every objective civilian must have an initially feasible pickup/delivery route using at least one vehicle and hospital within the fuel and time limits. Blocked cells are excluded by C++ Dijkstra.

This checks individual route feasibility, **not** global scheduling feasibility. Multiple patients may compete for the same finite fuel, unit and beds. Authors should use **Play my challenge** to confirm the complete puzzle is solvable before sharing. Built-in scenarios are regression-tested to completion.

Malformed/incomplete payloads throw validation errors and leave the current game unchanged. Blueprint JSON input is limited to 16,000 bytes; copy/paste codes to 24,000 characters. This is local puzzle sharing, not a cryptographic competition or anti-cheat system.

## Transport and persistence

`RC1.` plus Base64-encoded UTF-8 canonical JSON is the friend-code format. Encoding/decoding is a UI transport concern; schema, objectives, pathfinding, resource validation and state transitions are C++ responsibilities. The code contains no JavaScript and is never evaluated.

The share button validates with a temporary C++ manager; it does not reset/pause the current operation. Loading a code starts a new ready operation. Saved games use version 2 with the scenario plus replay log. Restart preserves the scenario. Existing version-1 classic saves continue to load.

Editor drafts are in-memory only. Preserve the generated code to keep a layout. There are no user accounts, cloud mission storage, multiplayer sessions, shared scoreboards or Render dependencies.
