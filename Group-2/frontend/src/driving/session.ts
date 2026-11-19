import {
  HOMES,
  HOSPITAL,
  VEHICLES,
  type Mission,
  type Point,
  type Replay,
} from "./model";
export const distance = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, a.z - b.z);
export function door(id: number): Point {
  const p = HOMES[id];
  let road = [-60, 0, 60].sort(
    (a, b) => Math.abs(a - p.z) - Math.abs(b - p.z),
  )[0];
  return { x: p.x, z: p.z + (road < p.z ? -6 : 6) };
}
export interface Controls {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  brake: boolean;
}
export const emptyControls = (): Controls => ({
  up: false,
  down: false,
  left: false,
  right: false,
  brake: false,
});
export type CallStatus =
  "waiting" | "treated" | "carried" | "onboard" | "delivered";
export interface Call {
  id: number;
  house: number;
  name: string;
  kind: string;
  status: CallStatus;
  condition: number;
}
export class RescueSession {
  car = { x: 0, z: 76, angle: Math.PI, speed: 0 };
  person = { x: 0, z: 76, angle: 0 };
  stage: "driving" | "walking" | "treating" | "carrying" = "driving";
  paused = false;
  siren = false;
  elapsed = 0;
  damage = 0;
  fuel = 100;
  collisions = 0;
  delivered = 0;
  active = 0;
  aidStep = 0;
  aidReady = 0;
  impactCooldown = 0;
  result: "success" | "failure" | null = null;
  reason = "";
  calls: Call[];
  traffic: {
    x: number;
    z: number;
    angle: number;
    t: number;
    yielding: boolean;
    offset: number;
  }[] = [];
  event = false;
  events: { id: number; text: string }[] = [];
  private serial = 0;
  private sample = 0;
  private warning = 0;
  private lowWarned = false;
  trace: Point[] = [{ x: 0, z: 76 }];
  impacts: Point[] = [];
  rescues: Point[] = [];
  pickups: Point[] = [];
  vehicle: (typeof VEHICLES)[number];
  constructor(
    public mission: Mission,
    vehicle = 0,
  ) {
    this.vehicle = VEHICLES[vehicle] || VEHICLES[0];
    this.calls = mission.houses.map((h, i) => this.makeCall(h, i));
    if (mission.traffic)
      this.traffic = Array.from({ length: 6 }, (_, i) => ({
        x: 0,
        z: 0,
        angle: 0,
        t: i * 70,
        yielding: false,
        offset: 2,
      }));
    this.radio(
      mission.mode === "training"
        ? "Training shift. No timer, damage penalties or coin rewards. Follow the cyan beacon."
        : `Dispatch: ${this.calls.length} calls waiting. Choose a call. Partner Morgan is with you.`,
    );
  }
  private makeCall(house: number, id: number): Call {
    return {
      id,
      house,
      name: [
        "Mrs. Rivera",
        "Mr. Patel",
        "The Williams family",
        "Ms. Chen",
        "Mr. Okafor",
        "Mrs. Silva",
      ][id % 6],
      kind: ["Elderly patient", "Household emergency", "Minor road accident"][
        id % 3
      ],
      status: "waiting",
      condition: 100,
    };
  }
  get relaxed() {
    return this.mission.mode === "training" || this.mission.mode === "free";
  }
  get current() {
    return this.calls.find((c) => c.id === this.active) || this.calls[0];
  }
  get onboard() {
    return this.calls.filter((c) => c.status === "onboard");
  }
  get target(): Point {
    return this.onboard.length && this.current.status !== "waiting"
      ? HOSPITAL
      : door(this.current.house);
  }
  get actor(): Point {
    return this.stage === "driving" ? this.car : this.person;
  }
  get condition() {
    return Math.min(100, ...this.calls.map((c) => c.condition));
  }
  radio(text: string) {
    this.events.unshift({ id: ++this.serial, text });
    this.events = this.events.slice(0, 5);
  }
  choose(id: number) {
    const c = this.calls.find((c) => c.id === id);
    if (c?.status === "waiting" && this.stage === "driving") {
      this.active = id;
      this.radio(
        `Morgan: ${c.name}, ${c.kind.toLowerCase()}. Follow the cyan call marker.`,
      );
    }
  }
  toggleSiren() {
    this.siren = !this.siren;
    this.radio(
      this.siren
        ? "Morgan: Siren on. Nearby traffic will make room."
        : "Morgan: Siren off. Watch the junctions.",
    );
  }
  interact() {
    if (this.paused || this.result) return;
    if (this.stage === "driving") {
      if (Math.abs(this.car.speed) > 1) {
        this.radio("Morgan: Stop the ambulance before stepping out.");
        return;
      }
      if (distance(this.car, HOSPITAL) < 9 && this.onboard.length) {
        const passengers = this.onboard;
        for (const c of passengers) {
          c.status = "delivered";
          this.delivered++;
          this.rescues.push({ ...HOSPITAL });
        }
        this.radio(
          `Hospital: ${passengers.length} patient${passengers.length > 1 ? "s" : ""} received. Thank you, team.`,
        );
        if (this.calls.every((c) => c.status === "delivered")) {
          if (this.mission.mode === "free") {
            const ids = this.calls.map((c) => (c.house + 5) % 16);
            this.calls = ids.map((h, i) => this.makeCall(h, i));
            this.active = 0;
            this.radio(
              "Dispatch: New optional calls are available. Take your time.",
            );
          } else {
            this.result = "success";
            this.reason = "Every patient is safely at the hospital.";
          }
        } else
          this.active =
            this.calls.find((c) => c.status === "waiting")?.id ?? this.active;
        return;
      }
      if (this.onboard.length >= this.vehicle.capacity) {
        this.radio(
          "Morgan: All patient spaces are occupied. Go to the hospital.",
        );
        return;
      }
      const exit = [
        { x: this.car.x + 3, z: this.car.z },
        { x: this.car.x - 3, z: this.car.z },
        { x: this.car.x, z: this.car.z + 4 },
        { x: this.car.x, z: this.car.z - 4 },
      ].find((p) => !this.blocked(p, 0.45));
      if (!exit) {
        this.radio(
          "Morgan: Move the ambulance away from the wall before stepping out.",
        );
        return;
      }
      this.stage = "walking";
      this.person = { ...exit, angle: this.car.angle };
      this.radio(
        "Morgan: I am with you. Walk to the house beacon; E opens the rescue interaction.",
      );
      return;
    }
    if (this.stage === "treating") return;
    if (
      this.stage === "walking" &&
      this.current.status === "waiting" &&
      distance(this.person, door(this.current.house)) < 5
    ) {
      this.stage = "treating";
      this.aidStep = 0;
      this.aidReady = this.elapsed;
      this.radio(
        "Morgan: Prepare the kit, then secure the bandage and stabilize. This is a fictional game task.",
      );
      return;
    }
    if (distance(this.person, this.car) < 5) {
      const carried = this.calls.find((c) => c.status === "carried");
      if (carried) {
        carried.status = "onboard";
        this.radio("Morgan: Patient secured. Drive smoothly to the hospital.");
      }
      this.stage = "driving";
      this.car.speed = 0;
      return;
    }
    this.radio(
      this.stage === "carrying"
        ? "Morgan: Bring the stretcher back to the ambulance."
        : "Morgan: Walk closer to the marked front door.",
    );
  }
  aid(step: number) {
    if (
      this.paused ||
      this.result ||
      this.stage !== "treating" ||
      step !== this.aidStep ||
      this.elapsed < this.aidReady
    )
      return;
    this.aidStep++;
    this.aidReady = this.elapsed + 0.65;
    if (this.aidStep === 3) {
      this.current.condition = Math.min(100, this.current.condition + 12);
      this.current.status = "carried";
      this.pickups.push(door(this.current.house));
      this.stage = "carrying";
      this.radio(
        "Morgan: Ready to move. We will carry the stretcher together. Return to the ambulance and press E.",
      );
    }
  }
  private blocked(p: Point, radius: number) {
    return (
      (Math.abs(p.x - 31) < 22 + radius && Math.abs(p.z - 91) < 6.5 + radius) ||
      Math.abs(p.x) > 96 - radius ||
      Math.abs(p.z) > 96 - radius ||
      HOMES.some(
        (h) =>
          Math.abs(h.x - p.x) < 5 + radius && Math.abs(h.z - p.z) < 5 + radius,
      ) ||
      (Math.abs(p.x + 28) < 11 + radius && Math.abs(p.z - 43) < 8 + radius) ||
      (this.event &&
        Math.abs(p.x) < 7 + radius &&
        Math.abs(p.z + 25) < 2 + radius)
    );
  }
  private hit() {
    if (this.impactCooldown > 0) return;
    this.impactCooldown = 1.3;
    this.collisions++;
    this.impacts.push({ x: this.car.x, z: this.car.z });
    if (!this.relaxed) {
      this.damage = Math.min(100, this.damage + 9);
      for (const c of this.onboard) c.condition = Math.max(0, c.condition - 9);
    }
    this.radio(
      "Morgan: Collision! Slow down. Patient comfort and vehicle handling matter.",
    );
  }
  step(rawDt: number, input: Controls) {
    if (this.paused || this.result) return;
    const dt = Math.min(0.05, Math.max(0, rawDt));
    this.elapsed += dt;
    this.impactCooldown = Math.max(0, this.impactCooldown - dt);
    this.warning -= dt;
    if (this.mission.events && !this.event && this.elapsed > 25) {
      this.event = true;
      this.radio(
        "Dispatch: Fallen tree on Central Avenue north of the square. Use a cross street.",
      );
    }
    for (const t of this.traffic) {
      t.yielding = this.siren && distance(t, this.car) < 28;
      t.t = (t.t + dt * (t.yielding ? 1 : 5)) % 480;
      t.offset += ((t.yielding ? 4 : 2) - t.offset) * Math.min(1, dt * 3);
      const leg = Math.floor(t.t / 120),
        a = t.t % 120,
        offset = t.offset;
      if (leg === 0) {
        t.x = -60 + offset;
        t.z = -60 + a;
        t.angle = 0;
      } else if (leg === 1) {
        t.x = -60 + a;
        t.z = 60 - offset;
        t.angle = Math.PI / 2;
      } else if (leg === 2) {
        t.x = 60 - offset;
        t.z = 60 - a;
        t.angle = Math.PI;
      } else {
        t.x = 60 - a;
        t.z = -60 + offset;
        t.angle = -Math.PI / 2;
      }
    }
    if (this.stage === "driving") {
      const oldSpeed = this.car.speed;
      const throttle = Number(input.up) - Number(input.down);
      const road =
        Math.min(
          ...[-60, 0, 60].flatMap((r) => [
            Math.abs(this.car.x - r),
            Math.abs(this.car.z - r),
          ]),
        ) < 7;
      const max =
        this.vehicle.speed * (1 - this.damage * 0.004) * (road ? 1 : 0.6);
      if (input.brake)
        this.car.speed *= Math.max(
          0,
          1 - (this.mission.weather === "rain" ? 3.2 : 5) * dt,
        );
      else if (throttle) this.car.speed += throttle * 8 * dt;
      else this.car.speed *= Math.max(0, 1 - 1.6 * dt);
      this.car.speed = Math.max(-max * 0.4, Math.min(max, this.car.speed));
      const steer = Number(input.left) - Number(input.right);
      this.car.angle +=
        steer *
        this.vehicle.handling *
        (this.mission.weather === "rain" ? 0.75 : 1) *
        Math.min(1, Math.abs(this.car.speed) / 5) *
        Math.sign(this.car.speed) *
        dt;
      const next = {
        x: this.car.x + Math.sin(this.car.angle) * this.car.speed * dt,
        z: this.car.z + Math.cos(this.car.angle) * this.car.speed * dt,
      };
      if (
        this.blocked(next, 1.5) ||
        this.traffic.some((t) => distance(next, t) < 3)
      ) {
        if (Math.abs(this.car.speed) > 2) this.hit();
        this.car.speed *= -0.18;
      } else {
        this.car.x = next.x;
        this.car.z = next.z;
      }
      if (!this.relaxed) {
        this.fuel = Math.max(
          0,
          this.fuel - Math.abs(this.car.speed) * dt * 0.008,
        );
        if (Math.abs(oldSpeed - this.car.speed) / dt > 24)
          for (const c of this.onboard)
            c.condition = Math.max(0, c.condition - dt * 6);
      }
      if (
        distance(this.car, this.target) < 15 &&
        Math.abs(this.car.speed) > 11 &&
        this.warning < 0
      ) {
        this.radio(
          "Morgan: We are close. Brake gently and find a safe place to stop.",
        );
        this.warning = 15;
      }
    } else if (this.stage !== "treating") {
      let x = Number(input.right) - Number(input.left),
        z = Number(input.down) - Number(input.up);
      const n = Math.hypot(x, z);
      if (n) {
        x /= n;
        z /= n;
        this.person.angle = Math.atan2(x, z);
        const speed = this.stage === "carrying" ? 3.5 : 5.8;
        const next = {
          x: this.person.x + x * speed * dt,
          z: this.person.z + z * speed * dt,
        };
        if (!this.blocked(next, 0.45)) {
          this.person.x = next.x;
          this.person.z = next.z;
        }
      }
    }
    if (!this.relaxed) {
      for (const c of this.calls)
        if (c.status !== "delivered")
          c.condition = Math.max(
            0,
            c.condition -
              dt *
                (c.status === "onboard"
                  ? this.vehicle.id === 3
                    ? 0.018
                    : 0.04
                  : 0.012),
          );
      if (this.elapsed >= this.mission.limit) {
        this.result = "failure";
        this.reason = "The response window closed. Try a steadier route.";
      }
      if (
        this.damage >= 100 ||
        this.fuel <= 0 ||
        this.calls.some((c) => c.condition <= 0)
      ) {
        this.result = "failure";
        this.reason =
          this.damage >= 100
            ? "The ambulance needs repairs."
            : this.fuel <= 0
              ? "The ambulance ran out of fuel."
              : "A patient became unstable. Plan a faster, smoother rescue.";
      }
    }
    if (!this.lowWarned && this.condition < 65) {
      this.lowWarned = true;
      this.radio(
        "Morgan: Patient stability is falling. Drive smoothly and get to the hospital.",
      );
    }
    this.sample += dt;
    if (this.sample > 0.4) {
      this.sample = 0;
      if (this.trace.length < 4000)
        this.trace.push({ x: this.car.x, z: this.car.z });
    }
  }
  get prompt() {
    if (this.stage === "treating")
      return "Complete the three fictional first-aid steps";
    if (this.stage === "carrying")
      return distance(this.person, this.car) < 5
        ? "E · Load patient & enter ambulance"
        : "Carry the stretcher back to the ambulance";
    if (this.stage === "walking")
      return this.current.status === "waiting" &&
        distance(this.person, door(this.current.house)) < 5
        ? "E · Help this patient"
        : distance(this.person, this.car) < 5
          ? "E · Enter ambulance"
          : "Walk to the cyan house beacon";
    if (this.onboard.length && distance(this.car, HOSPITAL) < 9)
      return "Stop, then E · Hand over patients";
    if (this.onboard.length) return "Drive to the green hospital beacon";
    return "Park near the call, then E · Step out";
  }
  replay(): Replay {
    return {
      name: this.mission.name,
      duration: this.elapsed,
      trace: this.trace,
      impacts: this.impacts,
      rescues: this.rescues,
      pickups: this.pickups,
    };
  }
}
