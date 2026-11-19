import { describe, it, expect, vi, afterEach } from "vitest";
import { RescueSession, emptyControls, door, distance } from "./session";
import {
  LEVELS,
  HOSPITAL,
  makeCode,
  parseCode,
  freshProfile,
  readProfile,
  unlocked,
  persist,
} from "./model";
const idle = emptyControls();
function advance(s: RescueSession, seconds: number) {
  for (let i = 0; i < seconds * 50; i++) s.step(0.02, idle);
}
function rescue(s: RescueSession, id: number) {
  s.choose(id);
  const d = door(s.current.house);
  s.car = { x: d.x, z: d.z - 3, angle: 0, speed: 0 };
  s.interact();
  expect(s.stage).toBe("walking");
  // Arrange the actor at the doorway to isolate rescue interaction from steering physics.
  s.person = { ...d, angle: 0 };
  s.interact();
  expect(s.stage).toBe("treating");
  s.aid(1);
  expect(s.aidStep).toBe(0);
  s.aid(0);
  s.aid(1);
  expect(s.aidStep).toBe(1);
  advance(s, 0.7);
  s.aid(1);
  advance(s, 0.7);
  s.aid(2);
  expect(s.stage).toBe("carrying");
  expect(s.current.status).toBe("carried");
  s.person = { x: s.car.x, z: s.car.z, angle: 0 };
  s.interact();
  expect(s.current.status).toBe("onboard");
  expect(s.stage).toBe("driving");
}
describe("driving and rescue simulation", () => {
  it("accelerates, steers, brakes and reverses using actual controls", () => {
    const s = new RescueSession(LEVELS[0]);
    const input = emptyControls();
    input.up = true;
    for (let i = 0; i < 50; i++) s.step(0.02, input);
    expect(s.car.z).toBeLessThan(76);
    expect(s.car.speed).toBeGreaterThan(0);
    input.left = true;
    for (let i = 0; i < 20; i++) s.step(0.02, input);
    expect(s.car.angle).not.toBe(Math.PI);
    input.up = false;
    input.left = false;
    input.brake = true;
    for (let i = 0; i < 150; i++) s.step(0.02, input);
    expect(Math.abs(s.car.speed)).toBeLessThan(0.01);
    input.brake = false;
    input.down = true;
    for (let i = 0; i < 20; i++) s.step(0.02, input);
    expect(s.car.speed).toBeLessThan(0);
  });
  it("refuses an unsafe moving exit and never loads a patient remotely", () => {
    const s = new RescueSession(LEVELS[0]);
    s.car.speed = 5;
    s.interact();
    expect(s.stage).toBe("driving");
    s.car.speed = 0;
    s.interact();
    s.interact();
    expect(s.stage).not.toBe("treating");
    expect(s.onboard.length).toBe(0);
  });
  it.each(LEVELS.map((l) => [l.name, l] as const))(
    "completes the rescue lifecycle for %s",
    (_, level) => {
      const s = new RescueSession(level);
      for (let i = 0; i < s.calls.length; i++) {
        rescue(s, i);
        s.car = { ...HOSPITAL, angle: 0, speed: 0 };
        s.interact();
      }
      expect(s.result).toBe("success");
      expect(s.delivered).toBe(level.houses.length);
      expect(s.rescues.length).toBe(s.delivered);
      expect(s.replay().trace.length).toBeGreaterThan(1);
    },
  );
  it("uses the two-patient carrier capacity, then drops both at hospital", () => {
    const s = new RescueSession(LEVELS[1], 2);
    rescue(s, 0);
    rescue(s, 1);
    expect(s.onboard.length).toBe(2);
    s.interact();
    expect(s.stage).toBe("driving");
    s.car = { ...HOSPITAL, angle: 0, speed: 0 };
    s.interact();
    expect(s.delivered).toBe(2);
    expect(s.result).toBe("success");
  });
  it("reduces damage and condition on collisions and adds a replay impact", () => {
    const s = new RescueSession(LEVELS[0]);
    rescue(s, 0);
    s.car = { x: 0, z: -96, angle: Math.PI, speed: 15 };
    s.step(0.02, { ...idle, up: true });
    expect(s.collisions).toBe(1);
    expect(s.damage).toBe(9);
    expect(s.condition).toBeLessThan(100);
    expect(s.impacts.length).toBe(1);
  });
  it("gives practice no timeout, fuel loss, condition loss or vehicle damage", () => {
    const s = new RescueSession({ ...LEVELS[0], mode: "training", limit: 0 });
    advance(s, 500);
    expect(s.result).toBeNull();
    s.car = { x: 0, z: -96, angle: Math.PI, speed: 15 };
    s.step(0.02, { ...idle, up: true });
    expect(s.damage).toBe(0);
    expect(s.fuel).toBe(100);
    expect(s.condition).toBe(100);
  });
  it("pauses all simulation time and creates dynamic road events", () => {
    const s = new RescueSession(LEVELS[3]);
    s.paused = true;
    advance(s, 40);
    expect(s.elapsed).toBe(0);
    s.paused = false;
    advance(s, 26);
    expect(s.event).toBe(true);
    expect(s.events.some((e) => e.text.includes("Fallen tree"))).toBe(true);
  });
  it("traffic yields only near an ambulance with siren on", () => {
    const s = new RescueSession(LEVELS[2]);
    s.step(0.02, idle);
    s.car.x = s.traffic[0].x;
    s.car.z = s.traffic[0].z;
    s.siren = true;
    s.step(0.02, idle);
    expect(s.traffic[0].yielding).toBe(true);
    s.siren = false;
    s.step(0.02, idle);
    expect(s.traffic[0].yielding).toBe(false);
  });
  it("times out campaign shifts but never free-drive shifts", () => {
    const s = new RescueSession({ ...LEVELS[0], limit: 1 });
    advance(s, 2);
    expect(s.result).toBe("failure");
    const f = new RescueSession({ ...LEVELS[0], mode: "free", limit: 1 });
    advance(f, 2);
    expect(f.result).toBeNull();
  });
  it("does not move while first-aid is open and ignores invalid input timing", () => {
    const s = new RescueSession(LEVELS[0]);
    s.stage = "treating";
    const before = { ...s.car };
    s.step(0.02, { ...idle, up: true });
    expect(s.car).toEqual(before);
    s.paused = true;
    s.aid(0);
    expect(s.aidStep).toBe(0);
  });
});
describe("challenge sharing and saved progression", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("round-trips a driving challenge without its solution or progress", () => {
    const mission = {
      ...LEVELS[1],
      name: "A friend challenge",
      mode: "custom" as const,
      id: 0,
    };
    const parsed = parseCode(makeCode(mission));
    expect(parsed.houses).toEqual(mission.houses);
    expect(parsed.mode).toBe("custom");
    expect(parsed.id).toBe(0);
    expect("coins" in parsed).toBe(false);
  });
  it("rejects corrupt, oversized, duplicate and out-of-bounds friend codes", () => {
    expect(() => parseCode("RC1.old")).toThrow();
    expect(() => parseCode("RD1.broken")).toThrow();
    expect(() => parseCode("RD1." + "a".repeat(6000))).toThrow();
    for (const patch of [
      { houses: [0, 0] },
      { houses: [20] },
      { limit: 1 },
      { weather: "snow" },
      { name: "<\n>" },
      { traffic: "yes" },
    ])
      expect(() =>
        parseCode(makeCode({ ...LEVELS[0], ...patch } as never)),
      ).toThrow();
  });
  it("persists and restores coins, livery, ownership, ratings and unlocks", () => {
    const storage = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => storage.get(k),
      setItem: (k: string, v: string) => storage.set(k, v),
    });
    const p = freshProfile();
    p.coins = 1000;
    p.completed["1"] = { stars: 3, time: 120 };
    p.livery.name = "TEAM 11";
    expect(persist(p)).toBe(true);
    expect(readProfile()).toEqual(p);
    expect(unlocked(readProfile())).toBe(2);
  });
  it("recovers from corrupt storage and clamps invalid profile fields", () => {
    vi.stubGlobal("localStorage", { getItem: () => "{broken" });
    expect(readProfile()).toEqual(freshProfile());
    vi.stubGlobal("localStorage", {
      getItem: () =>
        JSON.stringify({
          version: 1,
          coins: -1,
          owned: [99],
          selected: 99,
          completed: { 1: { stars: 99, time: -5 } },
          livery: { name: "A".repeat(50) },
        }),
    });
    const p = readProfile();
    expect(p.coins).toBe(0);
    expect(p.owned).toEqual([0]);
    expect(p.selected).toBe(0);
    expect(unlocked(p)).toBe(1);
    expect(p.livery.name.length).toBe(18);
  });
});
