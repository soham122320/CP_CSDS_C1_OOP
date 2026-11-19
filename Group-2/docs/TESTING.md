> **Archived command-centre documentation.** The default app is now Rescue Drive. See [DRIVING.md](DRIVING.md) and the root README for the current architecture and test suite. This older engine/source is preserved, not loaded by the driving game.

# Testing

## Executed locally

- Native C++17 CMake build and CTest engine suite: passed.
- Actual compiled WebAssembly imported and exercised in Node.js: passed.
- TypeScript check and Vite production build: passed.
- Chromium browser checks against Vite development: passed with no page errors.
- Playwright suite against Vite **production preview**: 8 tests passed.
- Mobile viewport (390 × 844): no horizontal document overflow.

## Native regression coverage

Grid endpoints, blocked cells, four-direction path adjacency, route distance, pause behavior, duplicate rescue rejection, medical kits, fuel, hospital occupancy/reservations, scoring, full eight-civilian operation, terminal state, valid save replay, malformed/invalid save rejection and atomic load behavior. Tests use explicit runtime checks, not `assert`, so Release builds retain assertions.

## WASM integration coverage

Actual JS loader and binary instantiation; every getter; map dimensions; route endpoints and blocked-cell avoidance; selecting and dispatching; pause/resume; rescue completion; score and fuel; save, reset, load; corrupted save rejection; complete operation through compiled C++ exports.

## Browser coverage

1. WASM MIME type/magic bytes, successful initialization, dispatch, pause, save, refresh, load, real delivery and navigation between management pages.
2. Dijkstra route visualization and blocked-endpoint rejection.
3. Restart confirmation resets the operation.
4. Mobile navigation and overflow checks.

### Commands

```bash
cmake -S cpp-engine -B build/native
cmake --build build/native --parallel 2
ctest --test-dir build/native --output-on-failure
cd frontend
npm ci
npm run test:wasm
npm run build
npx playwright install --with-deps chromium
npm run test:e2e
```

Playwright starts a production preview server automatically on port 4173. Set `CHROMIUM_EXECUTABLE_PATH` only if using an existing system Chromium installation. The regular workflow installs Playwright's browser and OS dependencies.

## Limits of local verification

A production Vercel deployment cannot be declared tested until deployed with an authorized hosting account. The Vercel configuration is supplied; run the release checklist in `DEPLOYMENT.md` on the actual public URL. Safari/Firefox and assistive-technology testing have not been performed. The suite currently targets Chromium.

## Mission/challenge regression coverage

Native and WASM suites complete all seven preset levels, including critical-only objectives, and check scenario restart and save round trips. Native tests also check mission timeout, classic version-1 save compatibility, share round trips, atomic invalid-scenario rejection, unreachable civilians, overlap, missing critical patients, numeric overflow, invalid severity/time limits and insufficient beds.

Four additional production-browser tests verify the seven-level gallery and loaded timer, custom editor → share code → friend import → save/refresh/load, malformed-code rejection, and mobile editor layout. Total: **8 Playwright tests**.
