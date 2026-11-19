import { useEffect, useState } from "react";
import {
  ArrowRight,
  Copy,
  Flag,
  Play,
  Share2,
  ShieldCheck,
} from "lucide-react";
import type { Engine, GameState, Scenario } from "../types/engine";
type Action = (name: keyof Engine, ...args: unknown[]) => string | undefined;
const encode = (text: string) =>
  "RC1." +
  btoa(
    Array.from(new TextEncoder().encode(text), (b) =>
      String.fromCharCode(b),
    ).join(""),
  );
const decode = (text: string) => {
  if (text.length > 24000 || !text.startsWith("RC1."))
    throw new Error(
      "Paste a complete RC1. mission code (maximum 24,000 characters).",
    );
  return new TextDecoder("utf-8", { fatal: true }).decode(
    Uint8Array.from(atob(text.slice(4)), (c) => c.charCodeAt(0)),
  );
};
export default function MissionLevels({
  state,
  action,
  onLoaded,
}: {
  state: GameState;
  action: Action;
  onLoaded: () => void;
}) {
  const [levels, setLevels] = useState<Scenario[]>([]),
    [draft, setDraft] = useState<Scenario | null>(null);
  const [tab, setTab] = useState<"levels" | "builder" | "import">("levels"),
    [code, setCode] = useState(""),
    [incoming, setIncoming] = useState(""),
    [message, setMessage] = useState("");
  const [tool, setTool] = useState("civilian"),
    [severity, setSeverity] = useState(3);
  useEffect(() => {
    const data = action("getScenarios");
    if (data) {
      const items = JSON.parse(data) as Scenario[];
      setLevels(items);
      setDraft({
        ...items[0],
        name: "My rescue challenge",
        difficulty: "Custom",
      });
    }
  }, [action]);
  const launch = (scenario: Scenario) => {
    if (
      (state.phase !== "ready" || state.ticks > 0) &&
      !window.confirm(
        "Replace the current operation? Save it first if you want to return to it.",
      )
    )
      return;
    if (action("setScenario", JSON.stringify(scenario))) onLoaded();
  };
  const update = (patch: Partial<Scenario>) => {
    setDraft((d) => (d ? { ...d, ...patch, difficulty: "Custom" } : d));
    setCode("");
    setMessage("");
  };
  const paint = (cell: number) => {
    if (!draft) return;
    const next = structuredClone(draft);
    const fixed =
      next.vehicles.includes(cell) ||
      next.hospitals.some((h) => h.cell === cell);
    if (tool === "erase") {
      next.blocked = next.blocked.filter((c) => c !== cell);
      next.civilians = next.civilians.filter((c) => c.cell !== cell);
    } else if (tool === "blocked") {
      if (fixed || next.civilians.some((c) => c.cell === cell)) {
        setMessage(
          "Move the unit, hospital or civilian before blocking this cell.",
        );
        return;
      }
      next.blocked = next.blocked.includes(cell)
        ? next.blocked.filter((c) => c !== cell)
        : [...next.blocked, cell];
    } else if (tool === "civilian") {
      if (fixed) {
        setMessage("Choose a cell without a vehicle or hospital.");
        return;
      }
      next.blocked = next.blocked.filter((c) => c !== cell);
      const existing = next.civilians.find((c) => c.cell === cell);
      if (existing) existing.severity = severity;
      else next.civilians.push({ cell, severity });
    } else {
      const [kind, index] = tool.split(":");
      const current =
        kind === "vehicle"
          ? next.vehicles[+index]
          : next.hospitals[+index].cell;
      if (fixed && cell !== current) {
        setMessage("Another vehicle or hospital already occupies this cell.");
        return;
      }
      next.blocked = next.blocked.filter((c) => c !== cell);
      next.civilians = next.civilians.filter((c) => c.cell !== cell);
      if (kind === "vehicle") next.vehicles[+index] = cell;
      else next.hospitals[+index].cell = cell;
    }
    update(next);
  };
  const share = () => {
    if (!draft) return;
    const result = action("validateScenario", JSON.stringify(draft));
    if (result) {
      setCode(encode(result));
      setMessage("Mission validated by C++. Send this code to your friend.");
    }
  };
  const importMission = () => {
    try {
      const result = action("validateScenario", decode(incoming.trim()));
      if (result) launch(JSON.parse(result));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Invalid mission code.");
    }
  };
  return (
    <div className="mission-hub">
      <section className="mission-briefing panel">
        <Flag size={24} />
        <div>
          <span className="eyebrow">
            CURRENT CHALLENGE · {state.scenario.difficulty}
          </span>
          <h2>{state.scenario.name}</h2>
          <p>
            {state.scenario.objective === "critical"
              ? "Deliver every critical civilian; other rescues are optional."
              : "Deliver every civilian to a hospital."}{" "}
            Budget: {state.timeLimit} engine ticks.
          </p>
        </div>
        <span
          className={`badge ${state.outcome === "failure" ? "red" : state.outcome === "success" ? "green" : "blue"}`}
        >
          {state.outcome === "success"
            ? "Mission accomplished"
            : state.outcome === "failure"
              ? "Mission failed"
              : state.phase === "running"
                ? "In progress"
                : "Standing by"}
        </span>
      </section>
      <div className="mission-tabs" role="tablist" aria-label="Mission tools">
        {[
          ["levels", "Mission levels"],
          ["builder", "Create for a friend"],
          ["import", "Play a friend’s code"],
        ].map(([value, label]) => (
          <button
            key={value}
            role="tab"
            aria-selected={tab === value}
            onClick={() => {
              setTab(value as typeof tab);
              setMessage("");
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "levels" && (
        <>
          <p className="mission-intro">
            Seven challenges. From your first dispatch to expert resource
            management. All levels are unlocked.
          </p>
          <div className="level-grid">
            {levels.map((level, i) => (
              <section className="panel level-card" key={level.name}>
                <div className="level-top">
                  <span className="level-number">0{i + 1}</span>
                  <span
                    className={`badge ${i < 2 ? "green" : i < 4 ? "amber" : "red"}`}
                  >
                    {level.difficulty}
                  </span>
                </div>
                <div className="difficulty-bars">
                  {Array.from({ length: 7 }, (_, n) => (
                    <i key={n} className={n <= i ? "filled" : ""} />
                  ))}
                </div>
                <h2>{level.name}</h2>
                <p>{level.brief}</p>
                <div className="level-facts">
                  <span>{level.civilians.length} civilians</span>
                  <span>{level.fuel}% fuel</span>
                  <span>{level.timeLimit} ticks</span>
                </div>
                <div className="level-objective">
                  {level.objective === "critical"
                    ? "Critical-care extraction"
                    : "Full civilian evacuation"}
                </div>
                <button className="primary" onClick={() => launch(level)}>
                  <Play size={13} /> Load level {i + 1}
                  <ArrowRight size={14} />
                </button>
              </section>
            ))}
          </div>
        </>
      )}
      {tab === "builder" && draft && (
        <div className="builder-layout">
          <section className="panel builder-map">
            <div className="panel-heading">
              <div>
                <h2>Design your rescue zone</h2>
                <p className="muted tiny">
                  Pick a tool, then click cells. H = hospital, V = vehicle, C =
                  civilian.
                </p>
              </div>
            </div>
            <div className="builder-tools">
              <label>
                Paint tool
                <select
                  aria-label="Paint tool"
                  value={tool}
                  onChange={(e) => setTool(e.target.value)}
                >
                  <option value="civilian">Civilian</option>
                  <option value="blocked">Blocked road</option>
                  <option value="erase">Erase civilian / block</option>
                  {["Ambulance", "Rescue van", "Fire truck", "Helicopter"].map(
                    (v, i) => (
                      <option key={v} value={`vehicle:${i}`}>
                        V{i + 1} · {v}
                      </option>
                    ),
                  )}
                  <option value="hospital:0">H1 · Hospital</option>
                  <option value="hospital:1">H2 · Hospital</option>
                </select>
              </label>
              {tool === "civilian" && (
                <label>
                  Severity
                  <select
                    aria-label="Civilian severity"
                    value={severity}
                    onChange={(e) => setSeverity(+e.target.value)}
                  >
                    <option value={3}>Critical</option>
                    <option value={2}>Urgent</option>
                    <option value={1}>Stable</option>
                  </select>
                </label>
              )}
            </div>
            <div
              className="builder-grid"
              role="group"
              aria-label="Mission editor grid"
            >
              {Array.from({ length: 117 }, (_, cell) => {
                const c = draft.civilians.find((c) => c.cell === cell),
                  v = draft.vehicles.indexOf(cell),
                  h = draft.hospitals.findIndex((h) => h.cell === cell),
                  blocked = draft.blocked.includes(cell);
                return (
                  <button
                    key={cell}
                    title={`Cell ${cell} · row ${Math.floor(cell / 13) + 1}, column ${(cell % 13) + 1}`}
                    aria-label={`Edit cell ${cell}`}
                    onClick={() => paint(cell)}
                    className={
                      blocked
                        ? "blocked"
                        : v >= 0
                          ? "unit"
                          : h >= 0
                            ? "medical"
                            : c
                              ? `civilian severity-${c.severity}`
                              : ""
                    }
                  >
                    <small>{cell}</small>
                    <b>
                      {blocked
                        ? "×"
                        : v >= 0
                          ? `V${v + 1}`
                          : h >= 0
                            ? `H${h + 1}`
                            : c
                              ? "C"
                              : ""}
                    </b>
                  </button>
                );
              })}
            </div>
            <p className="builder-caption">
              {draft.civilians.length} civilians · {draft.blocked.length}{" "}
              blocked cells · 4 units · 2 hospitals
            </p>
            <div className="info-banner">
              <ShieldCheck size={18} />
              <p>
                C++ checks overlap, beds, kits and reachable objective civilians
                within fuel/time limits. Overall resource scheduling is still
                your friend’s challenge.
              </p>
            </div>
          </section>
          <section className="panel builder-settings">
            <div className="panel-heading">
              <h2>Challenge settings</h2>
            </div>
            <div className="dispatch-body">
              <label>
                Mission name
                <input
                  maxLength={64}
                  value={draft.name}
                  onChange={(e) => update({ name: e.target.value })}
                />
              </label>
              <label>
                Objective
                <select
                  value={draft.objective}
                  onChange={(e) =>
                    update({
                      objective: e.target.value as Scenario["objective"],
                    })
                  }
                >
                  <option value="all">Rescue every civilian</option>
                  <option value="critical">
                    Rescue all critical civilians
                  </option>
                </select>
              </label>
              {[
                {
                  key: "timeLimit",
                  label: "Time budget (ticks)",
                  min: 30,
                  max: 1200,
                },
                {
                  key: "fuel",
                  label: "Fuel per vehicle (%)",
                  min: 10,
                  max: 100,
                },
                { key: "supplies", label: "Kits per vehicle", min: 1, max: 5 },
              ].map(({ key, label, min, max }) => (
                <label key={key}>
                  {label}
                  <input
                    type="number"
                    min={min}
                    max={max}
                    value={draft[key as "fuel" | "timeLimit" | "supplies"]}
                    onChange={(e) => update({ [key]: +e.target.value })}
                  />
                </label>
              ))}
              {draft.hospitals.map((h, i) => (
                <label key={i}>
                  Hospital {i + 1} bed capacity
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={h.capacity}
                    onChange={(e) =>
                      update({
                        hospitals: draft.hospitals.map((x, n) =>
                          n === i ? { ...x, capacity: +e.target.value } : x,
                        ),
                      })
                    }
                  />
                </label>
              ))}
              <p className="muted tiny">
                Loading replaces the current operation. Save first if needed.
                Creating a code does not change your running game.
              </p>
              <button className="primary" onClick={share}>
                <Share2 size={14} /> Create share code
              </button>
              <button className="secondary" onClick={() => launch(draft)}>
                <Play size={14} /> Play my challenge
              </button>
            </div>
          </section>
        </div>
      )}
      {tab === "builder" && code && (
        <section className="panel share-panel">
          <h2>Your challenge is ready to share</h2>
          <p>
            Send this code to a friend. Open Mission levels → Play a friend’s
            code.
          </p>
          <textarea readOnly aria-label="Shareable mission code" value={code} />
          <button
            className="secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(code);
                setMessage("Mission code copied.");
              } catch {
                setMessage(
                  "Clipboard unavailable. Select the code and copy it manually.",
                );
              }
            }}
          >
            <Copy size={14} /> Copy mission code
          </button>
        </section>
      )}
      {tab === "import" && (
        <section className="panel share-panel import-panel">
          <Share2 size={30} className="cyan" />
          <h2>Can you solve your friend’s rescue challenge?</h2>
          <p>
            Paste an RC1. mission code. C++ validates it before loading. Codes
            contain layout and rules, not a solution or saved progress.
          </p>
          <label>
            Friend’s mission code
            <textarea
              value={incoming}
              onChange={(e) => setIncoming(e.target.value)}
              placeholder="RC1.…"
              maxLength={24000}
            />
          </label>
          <button
            className="primary"
            onClick={importMission}
            disabled={!incoming.trim()}
          >
            <Play size={15} /> Validate & load challenge
          </button>
        </section>
      )}
      {message && (
        <div className="mission-message" role="status">
          {message}
        </div>
      )}
    </div>
  );
}
