export type Point = { x: number; z: number };
export type Weather = "clear" | "night" | "rain";
export type Mode = "campaign" | "training" | "free" | "custom";
export interface Mission {
  id: number;
  name: string;
  subtitle: string;
  description: string;
  houses: number[];
  limit: number;
  weather: Weather;
  traffic: boolean;
  events: boolean;
  mode: Mode;
}
export const HOMES: Point[] = Array.from({ length: 16 }, (_, i) => ({
  x: [-78, -36, 24, 78][i % 4],
  z: [-78, -36, 24, 78][Math.floor(i / 4)],
}));
export const HOSPITAL = { x: -28, z: 57 };
export const LEVELS: Mission[] = [
  {
    id: 1,
    name: "First Call",
    subtitle: "THE BASICS",
    description:
      "A quiet street. One call. Learn to drive, step out and bring your first patient home.",
    houses: [10],
    limit: 360,
    weather: "clear",
    traffic: false,
    events: false,
    mode: "campaign",
  },
  {
    id: 2,
    name: "Neighbourhood Rescue",
    subtitle: "TWO CALLS. YOUR CHOICE.",
    description:
      "Two families need you. Choose your first call and coordinate with your partner.",
    houses: [9, 6],
    limit: 480,
    weather: "clear",
    traffic: false,
    events: false,
    mode: "campaign",
  },
  {
    id: 3,
    name: "Rush Hour",
    subtitle: "MAKE WAY FOR HELP",
    description:
      "The streets are busy. Your siren asks nearby drivers to pull over.",
    houses: [6, 5],
    limit: 460,
    weather: "clear",
    traffic: true,
    events: false,
    mode: "campaign",
  },
  {
    id: 4,
    name: "Road Closed",
    subtitle: "FIND ANOTHER WAY",
    description:
      "A fallen tree can change your route. Watch dispatch and use the cross streets.",
    houses: [2, 4],
    limit: 460,
    weather: "clear",
    traffic: true,
    events: true,
    mode: "campaign",
  },
  {
    id: 5,
    name: "Night Shift",
    subtitle: "A LIGHT IN THE DARK",
    description:
      "Follow the call beacons through a sleeping neighbourhood. Your headlights lead the way.",
    houses: [1, 11],
    limit: 440,
    weather: "night",
    traffic: true,
    events: true,
    mode: "campaign",
  },
  {
    id: 6,
    name: "Rainy Rescue",
    subtitle: "STEADY HANDS SAVE LIVES",
    description:
      "Wet roads mean longer stops. Keep your patients stable through three difficult calls.",
    houses: [0, 7, 10],
    limit: 560,
    weather: "rain",
    traffic: true,
    events: true,
    mode: "campaign",
  },
  {
    id: 7,
    name: "City Emergency",
    subtitle: "THE CITY IS COUNTING ON YOU",
    description:
      "Four households. Limited time. Bring everything you have learned to the final shift.",
    houses: [0, 3, 12, 15],
    limit: 660,
    weather: "night",
    traffic: true,
    events: true,
    mode: "campaign",
  },
];
export const VEHICLES = [
  {
    id: 0,
    name: "First Responder",
    tag: "THE EVERYDAY HERO",
    price: 0,
    unlock: 1,
    speed: 17,
    handling: 1.85,
    capacity: 1,
    description: "Dependable, nimble, and ready for your very first call.",
  },
  {
    id: 1,
    name: "Rapid Response",
    tag: "BUILT FOR THE CITY",
    price: 1500,
    unlock: 2,
    speed: 22,
    handling: 2.2,
    capacity: 1,
    description: "Lighter steering and extra pace for crowded streets.",
  },
  {
    id: 2,
    name: "Rescue Carrier",
    tag: "MORE ROOM FOR HOPE",
    price: 2500,
    unlock: 4,
    speed: 18,
    handling: 1.65,
    capacity: 2,
    description: "Two patient spaces let you combine nearby rescues.",
  },
  {
    id: 3,
    name: "Critical Care",
    tag: "THE ADVANCED UNIT",
    price: 4000,
    unlock: 6,
    speed: 21,
    handling: 2,
    capacity: 2,
    description: "A smooth ride with slower onboard condition loss.",
  },
];
export interface Livery {
  color: string;
  name: string;
  decal: string;
  lights: "alternate" | "strobe";
}
export interface Profile {
  version: 1;
  coins: number;
  owned: number[];
  selected: number;
  completed: Record<string, { stars: number; time: number }>;
  livery: Livery;
  lastReplay?: Replay;
}
export interface Replay {
  name: string;
  duration: number;
  trace: Point[];
  impacts: Point[];
  rescues: Point[];
  pickups: Point[];
}
export const freshProfile = (): Profile => ({
  version: 1,
  coins: 0,
  owned: [0],
  selected: 0,
  completed: {},
  livery: {
    color: "#e5f4ed",
    name: "RESCUE 01",
    decal: "MEDIC",
    lights: "alternate",
  },
});
export const unlocked = (p: Profile) => {
  let n = 1;
  while (n <= 7 && p.completed[String(n)]) n++;
  return Math.min(7, n);
};
export const stationRank = (p: Profile) =>
  Object.keys(p.completed).length >= 6
    ? "Central rescue base"
    : Object.keys(p.completed).length >= 3
      ? "Neighbourhood response hub"
      : "Your first rescue station";
export function readProfile(): Profile {
  try {
    const raw = JSON.parse(
      localStorage.getItem("rescue-drive-profile") || "null",
    );
    if (!raw || raw.version !== 1) return freshProfile();
    const p = freshProfile();
    p.coins = Number.isInteger(raw.coins)
      ? Math.max(0, Math.min(7000, raw.coins))
      : 0;
    p.owned = Array.isArray(raw.owned)
      ? ([
          ...new Set([
            0,
            ...raw.owned.filter(
              (n: unknown) =>
                Number.isInteger(n) && Number(n) >= 0 && Number(n) <= 3,
            ),
          ]),
        ] as number[])
      : [0];
    p.selected = p.owned.includes(raw.selected) ? raw.selected : 0;
    for (let i = 1; i <= 7; i++) {
      const c = raw.completed?.[i];
      if (
        c &&
        Number.isInteger(c.stars) &&
        c.stars >= 1 &&
        c.stars <= 3 &&
        Number.isFinite(c.time) &&
        c.time >= 0
      )
        p.completed[i] = { stars: c.stars, time: c.time };
    }
    if (raw.livery) {
      const c = raw.livery;
      p.livery = {
        color: /^#[0-9a-f]{6}$/i.test(c.color) ? c.color : p.livery.color,
        name: typeof c.name === "string" ? c.name.slice(0, 18) : p.livery.name,
        decal: ["MEDIC", "RESCUE", "CITY CARE"].includes(c.decal)
          ? c.decal
          : "MEDIC",
        lights: c.lights === "strobe" ? "strobe" : "alternate",
      };
    }
    return p;
  } catch {
    return freshProfile();
  }
}
export function persist(p: Profile) {
  try {
    localStorage.setItem("rescue-drive-profile", JSON.stringify(p));
    return true;
  } catch {
    return false;
  }
}
export function makeCode(m: Mission) {
  return (
    "RD1." +
    btoa(
      Array.from(
        new TextEncoder().encode(
          JSON.stringify({
            name: m.name,
            houses: m.houses,
            limit: m.limit,
            weather: m.weather,
            traffic: m.traffic,
            events: m.events,
          }),
        ),
        (b) => String.fromCharCode(b),
      ).join(""),
    )
  );
}
export function parseCode(code: string): Mission {
  if (code.length > 5000 || !code.trim().startsWith("RD1."))
    throw new Error("Paste a complete RD1. driving challenge code.");
  let d;
  try {
    d = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(
        Uint8Array.from(atob(code.trim().slice(4)), (c) => c.charCodeAt(0)),
      ),
    );
  } catch {
    throw new Error("This code is damaged. Ask your friend to copy it again.");
  }
  if (
    typeof d.name !== "string" ||
    !d.name.trim() ||
    d.name.length > 48 ||
    /[\x00-\x1f]/.test(d.name) ||
    !Array.isArray(d.houses) ||
    d.houses.length < 1 ||
    d.houses.length > 6 ||
    new Set(d.houses).size !== d.houses.length ||
    !d.houses.every(
      (n: unknown) => Number.isInteger(n) && Number(n) >= 0 && Number(n) < 16,
    ) ||
    !Number.isInteger(d.limit) ||
    d.limit < 120 ||
    d.limit > 1200 ||
    !["clear", "night", "rain"].includes(d.weather) ||
    typeof d.traffic !== "boolean" ||
    typeof d.events !== "boolean"
  )
    throw new Error(
      "Use 1–6 different houses, a short name, and a 120–1200 second budget.",
    );
  return {
    id: 0,
    name: d.name,
    subtitle: "A FRIEND’S CHALLENGE",
    description: "A custom rescue route. No campaign coin rewards.",
    houses: d.houses,
    limit: d.limit,
    weather: d.weather,
    traffic: d.traffic,
    events: d.events,
    mode: "custom",
  };
}
