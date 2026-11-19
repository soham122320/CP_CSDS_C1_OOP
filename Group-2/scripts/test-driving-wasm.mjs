import createRewards from "../frontend/public/wasm/driving.js";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const e = await createRewards({
  wasmBinary: await readFile(
    new URL("../frontend/public/wasm/driving.wasm", import.meta.url),
  ),
});
const data = {
  mode: "campaign",
  level: 1,
  delivered: 1,
  required: 1,
  collisions: 0,
  elapsed: 100,
  limit: 360,
  condition: 100,
  completedBefore: false,
};
const grade = (d) => JSON.parse(e.evaluateDrivingResult(JSON.stringify(d)));
assert.deepEqual(grade(data), { success: true, stars: 3, coins: 1000 });
assert.equal(grade({ ...data, completedBefore: true }).coins, 0);
for (const mode of ["custom", "training", "free"])
  assert.equal(grade({ ...data, mode }).coins, 0);
for (const patch of [{ delivered: 0 }, { elapsed: 361 }, { condition: 0 }]) {
  assert.equal(grade({ ...data, ...patch }).success, false);
  assert.equal(grade({ ...data, ...patch }).coins, 0);
}
assert.equal(grade({ ...data, collisions: 8, elapsed: 350 }).stars, 1);
assert.ok(JSON.parse(e.evaluateDrivingResult("{broken")).error);
assert.ok(grade({ ...data, level: 99 }).error);
assert.deepEqual(JSON.parse(e.purchaseDrivingVehicle(1, 2000, 2, false)), {
  approved: true,
  remaining: 500,
});
for (const args of [
  [1, 500, 2, false],
  [1, 2000, 1, false],
  [1, 2000, 2, true],
  [99, 2000, 2, false],
])
  assert.ok(JSON.parse(e.purchaseDrivingVehicle(...args)).error);
let coins = 0;
for (let level = 1; level <= 7; level++)
  coins += grade({ ...data, level }).coins;
assert.equal(coins, 7000);
console.log(
  "Driving WASM: actual C++ rewards, first-clear-only coins, all modes, ratings and shop validation passed.",
);
