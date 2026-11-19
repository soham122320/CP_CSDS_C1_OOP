import createEngine from "../frontend/public/wasm/game.js";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const wasmBinary = await readFile(
  new URL("../frontend/public/wasm/game.wasm", import.meta.url),
);
const e = await createEngine({ wasmBinary });
const state = () => JSON.parse(e.getGameState());
assert.equal(JSON.parse(e.initializeGame()).map.rows, 9);
assert.equal(JSON.parse(e.getVehicles()).length, 4);
assert.equal(JSON.parse(e.getCivilians()).length, 8);
assert.equal(JSON.parse(e.getFacilities()).length, 3);
const path = JSON.parse(e.calculateShortestPath(104, 14));
assert.ok(path.route.length > 1);
assert.equal(path.route[0], 104);
assert.equal(path.route.at(-1), 14);
for (const cell of path.route) assert.ok(!state().map.blocked.includes(cell));
e.selectVehicle(0);
e.startGame();
e.assignRescueMission(0, 0);
const steps = state().vehicles[0].route.length - 1;
e.pauseGame();
e.tick();
assert.equal(state().ticks, 0);
e.startGame();
for (let i = 0; i < steps; i++) e.tick();
assert.equal(state().rescued, 1);
assert.equal(e.getCurrentScore(), 325);
assert.equal(state().vehicles[0].fuel, 100 - steps);
const before = state(),
  save = e.saveGame();
e.restartGame();
assert.equal(state().score, 0);
e.loadGame(save);
assert.deepEqual(state(), before);
assert.throws(() => e.loadGame("bad data"));
assert.deepEqual(state(), before);
e.restartGame();
e.startGame();
for (let i = 0; i < 600 && state().phase !== "finished"; i++) {
  for (const v of state().vehicles)
    if (v.status === "available")
      for (const c of state().civilians)
        if (c.status === "waiting") {
          try {
            e.assignRescueMission(v.id, c.id);
            break;
          } catch {}
        }
  e.tick();
}
assert.equal(state().rescued, 8);
assert.equal(state().phase, "finished");
console.log(
  "WASM integration: exports, routing, rescue, fuel, score, save/load, full operation passed.",
);

const levels = JSON.parse(e.getScenarios());
assert.equal(levels.length, 7);
for (const level of levels) {
  const canonical = e.validateScenario(JSON.stringify(level));
  e.setScenario(canonical);
  assert.equal(state().scenario.name, level.name);
  e.startGame();
  for (let t = 0; t < 1200 && state().phase !== "finished"; t++) {
    for (const v of state().vehicles)
      if (v.status === "available")
        for (const id of state().priorities) {
          const c = state().civilians[id];
          if (level.objective === "critical" && c.severity !== 3) continue;
          try {
            e.assignRescueMission(v.id, id);
            break;
          } catch (err) {
            e.decrementExceptionRefcount?.(err);
          }
        }
    e.tick();
  }
  assert.equal(state().outcome, "success", level.name);
  const completed = state();
  const saved = e.saveGame();
  e.restartGame();
  assert.equal(state().scenario.name, level.name);
  assert.equal(state().ticks, 0);
  e.loadGame(saved);
  assert.deepEqual(state(), completed);
  const code = e.exportScenario();
  e.setScenario(code);
  assert.equal(state().scenario.name, level.name);
}
const beforeValidation = state();
e.validateScenario(JSON.stringify(levels[0]));
assert.deepEqual(state(), beforeValidation);
assert.throws(() => e.setScenario('{"name":"incomplete"}'));
assert.deepEqual(state(), beforeValidation);
console.log(
  "WASM scenarios: seven solvable levels, objectives, validation, sharing, restart and save replay passed.",
);
