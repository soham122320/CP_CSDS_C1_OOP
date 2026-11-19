import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Command,
  Cross,
  Flame,
  Fuel,
  Flag,
  Heart,
  HeartPulse,
  Plane as Helicopter,
  Hospital,
  LayoutDashboard,
  LifeBuoy,
  Map,
  MapPin,
  Maximize2,
  Menu,
  Navigation,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Route,
  Save,
  Shield,
  ShieldCheck,
  Siren,
  Target,
  TrendingUp,
  TriangleAlert,
  Truck,
  Users,
  Volume2,
  Waypoints,
  X,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  AreaChart,
  Area,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useGame } from "./hooks/useGame";
import MissionLevels from "./pages/MissionLevels";
import CityMap from "./components/CityMap";
import type { Civilian, GameState, Vehicle } from "./types/engine";
type Page =
  | "Mission levels"
  | "Dashboard"
  | "City map"
  | "Rescue fleet"
  | "Civilians"
  | "Pathfinder"
  | "Facilities"
  | "Missions"
  | "Analytics"
  | "Field guide"
  | "Overview";
const nav: { label: Page; icon: LucideIcon }[] = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "City map", icon: Map },
  { label: "Rescue fleet", icon: Truck },
  { label: "Civilians", icon: Users },
  { label: "Missions", icon: Target },
  { label: "Mission levels", icon: Flag },
  { label: "Facilities", icon: Hospital },
  { label: "Pathfinder", icon: Waypoints },
  { label: "Analytics", icon: TrendingUp },
];
const pad = (n: number) => String(n).padStart(2, "0");
const time = (n: number) => `${pad(Math.floor(n / 60))}:${pad(n % 60)}`;
const unit = (id: number) => `RC-${pad(id + 1)}`;
const VehicleIcon = ({
  vehicle,
  size = 22,
}: {
  vehicle: Vehicle;
  size?: number;
}) =>
  vehicle.id === 3 ? (
    <Helicopter size={size} />
  ) : vehicle.id === 2 ? (
    <Flame size={size} />
  ) : vehicle.id === 0 ? (
    <HeartPulse size={size} />
  ) : (
    <Truck size={size} />
  );
function Badge({
  children,
  color = "green",
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <span className={`badge ${color}`}>
      <i />
      {children}
    </span>
  );
}
function PanelTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="panel-heading">
      <div>
        <h2>{title}</h2>
        {subtitle && <p className="muted tiny">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
export default function App() {
  const game = useGame();
  const { state, action } = game;
  const [page, setPage] = useState<Page>(
    () =>
      (nav.some((n) => n.label === decodeURIComponent(location.hash.slice(1)))
        ? decodeURIComponent(location.hash.slice(1))
        : "Dashboard") as Page,
  );
  const [menu, setMenu] = useState(false),
    [target, setTarget] = useState(0),
    [confirmRestart, setConfirmRestart] = useState(false),
    [search, setSearch] = useState("");
  const [startCell, setStartCell] = useState(104),
    [endCell, setEndCell] = useState(14),
    [pathPicking, setPathPicking] = useState<"start" | "end">("start"),
    [revealed, setRevealed] = useState(117);
  const [clock, setClock] = useState(new Date());
  const navigate = (p: Page) => {
    setPage(p);
    location.hash = p;
    setMenu(false);
    setSearch("");
  };
  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000);
    const listener = () => {
      const p = decodeURIComponent(location.hash.slice(1)) as Page;
      if ([...nav.map((n) => n.label), "Overview", "Field guide"].includes(p))
        setPage(p);
    };
    window.addEventListener("hashchange", listener);
    return () => {
      clearInterval(id);
      window.removeEventListener("hashchange", listener);
    };
  }, []);
  useEffect(() => {
    if (revealed >= 117) return;
    const id = setInterval(() => setRevealed((v) => Math.min(117, v + 3)), 35);
    return () => clearInterval(id);
  }, [revealed]);
  if (!state)
    return (
      <div className="loading-screen">
        <div className="brand-symbol">
          <Cross size={28} />
        </div>
        <h1>
          RESCUE<span>COMMAND</span>
        </h1>
        <div className="load-line" />
        <p>{game.error || "Initializing C++ WebAssembly engine…"}</p>
        {game.error && (
          <button className="primary" onClick={() => location.reload()}>
            Retry connection
          </button>
        )}
      </div>
    );
  const selected = state.vehicles[state.selectedVehicle];
  const civilian = state.civilians[target] ?? state.civilians[0];
  const selectCivilian = (id: number) => {
    setTarget(id);
  };
  const selectVehicle = (id: number) => action("selectVehicle", id);
  const dispatch = () =>
    action("assignRescueMission", selected.id, civilian.id);
  const run = () =>
    action(state.phase === "running" ? "pauseGame" : "startGame");
  const calculate = () => {
    action("calculateShortestPath", startCell, endCell);
    setRevealed(0);
  };
  const vehicleCard = (v: Vehicle) => (
    <button
      key={v.id}
      className={`fleet-card ${selected.id === v.id ? "selected" : ""}`}
      onClick={() => selectVehicle(v.id)}
    >
      <div className="fleet-card-top">
        <div className={`vehicle-icon v${v.id}`}>
          <VehicleIcon vehicle={v} />
        </div>
        <Badge color={v.status === "available" ? "green" : "blue"}>
          {v.status === "available"
            ? "Available"
            : v.status === "responding"
              ? "En route"
              : "Transporting"}
        </Badge>
      </div>
      <div className="fleet-name">
        <strong>{v.type}</strong>
        <span>
          {unit(v.id)} <span>•</span> SECTOR {pad(Math.floor(v.cell / 13) + 1)}
        </span>
      </div>
      <div className="fuel-label">
        <span>
          <Fuel size={11} /> Fuel level
        </span>
        <b>{v.fuel}%</b>
      </div>
      <div className="progress">
        <i
          style={{
            width: `${v.fuel}%`,
            background: v.fuel < 25 ? "var(--orange)" : "var(--teal)",
          }}
        />
      </div>
      <div className="fleet-bottom">
        <span>
          <Cross size={11} /> {v.supplies} medical kits
        </span>
        <ChevronRight size={14} />
      </div>
    </button>
  );
  const dispatchPanel = (
    <section className="panel dispatch-panel">
      <PanelTitle
        title="Dispatch control"
        action={<Radio size={17} className="muted" />}
      />
      <div className="dispatch-body">
        <div className="eyebrow">SELECTED UNIT</div>
        <div className="selected-unit">
          <div className={`vehicle-icon v${selected.id}`}>
            <VehicleIcon vehicle={selected} />
          </div>
          <div>
            <strong>{selected.type}</strong>
            <span>
              {unit(selected.id)} <i />{" "}
              {selected.status === "available"
                ? "Ready to deploy"
                : "Mission in progress"}
            </span>
          </div>
          <ChevronDown size={15} />
        </div>
        <div className="unit-resources">
          <span>
            <Fuel size={13} /> <b>{selected.fuel}%</b> fuel
          </span>
          <span>
            <Cross size={13} /> <b>{selected.supplies}</b> kits
          </span>
        </div>
        <div className="dispatch-divider" />
        <label className="eyebrow" htmlFor="rescue-target">
          RESCUE TARGET
        </label>
        <select
          id="rescue-target"
          value={civilian.id}
          onChange={(e) => setTarget(+e.target.value)}
        >
          {state.civilians.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ·{" "}
              {c.status === "waiting"
                ? ["", "Stable", "Urgent", "Critical"][c.severity]
                : c.status}
            </option>
          ))}
        </select>
        <div className="target-details">
          <MapPin size={13} />
          <span>
            Grid {Math.floor(civilian.cell / 13) + 1},{" "}
            {(civilian.cell % 13) + 1}
          </span>
          <Badge color={civilian.severity === 3 ? "red" : "amber"}>
            {["", "Stable", "Urgent", "Critical"][civilian.severity]}
          </Badge>
        </div>
        <div className="route-hint">
          <Waypoints size={16} />
          <p>
            Smart routing enabled
            <span>Dijkstra finds the safest available route.</span>
          </p>
        </div>
        <button
          className="primary dispatch-button"
          onClick={dispatch}
          disabled={
            selected.status !== "available" ||
            civilian.status !== "waiting" ||
            state.phase !== "running"
          }
        >
          <Radio size={15} /> Dispatch rescue unit <ArrowRight size={16} />
        </button>
        <p className="dispatch-note">
          {state.phase === "ready"
            ? "Start the simulation to deploy your fleet."
            : state.phase === "paused"
              ? "Resume the simulation to dispatch units."
              : selected.status !== "available"
                ? "Select an available unit to assign a mission."
                : "Every second counts. Make it matter."}
        </p>
      </div>
    </section>
  );
  const activityPanel = (
    <section className="panel activity-panel">
      <PanelTitle
        title="Operations feed"
        action={
          <span className="live-tag">
            <i /> LIVE
          </span>
        }
      />
      <div className="activity-list">
        {state.events.slice(0, page === "Dashboard" ? 3 : 12).map((e, i) => (
          <div className="activity-item" key={`${e.tick}-${e.text}`}>
            <span className={`event-icon ${e.kind}`}>
              {e.kind === "success" ? (
                <Check size={13} />
              ) : e.kind === "dispatch" ? (
                <Navigation size={13} />
              ) : (
                <Radio size={13} />
              )}
            </span>
            <div>
              <p>{e.text}</p>
              <span>
                {time(e.tick)} <i /> {i === 0 ? "Latest update" : "Command log"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
  const mapComponent = (
    <CityMap
      state={state}
      onCivilian={selectCivilian}
      onVehicle={selectVehicle}
    />
  );
  const stats = (
    <div className="stats-grid">
      <Stat
        title="CIVILIANS RESCUED"
        value={`${pad(state.rescued)}`}
        suffix={`/ ${pad(state.total)}`}
        icon={Heart}
        color="green"
        detail="Lives brought to safety"
        progress={(state.rescued / state.total) * 100}
      />
      <Stat
        title="ACTIVE MISSIONS"
        value={pad(state.activeMissions)}
        suffix="in progress"
        icon={Navigation}
        color="blue"
        detail={`${4 - state.activeMissions} units ready for dispatch`}
      />
      <Stat
        title="CRITICAL CIVILIANS"
        value={pad(state.critical)}
        suffix="need assistance"
        icon={TriangleAlert}
        color="orange"
        detail="Prioritize high-severity rescues"
      />
      <Stat
        title="RESCUE SCORE"
        value={state.score.toLocaleString().padStart(4, "0")}
        suffix="PTS"
        icon={ShieldCheck}
        color="violet"
        detail="Precision. Speed. Lives saved."
      />
    </div>
  );
  return (
    <div className="app-shell">
      {menu && (
        <button
          className="sidebar-backdrop"
          aria-label="Close menu"
          onClick={() => setMenu(false)}
        />
      )}
      <aside className={`sidebar ${menu ? "open" : ""}`}>
        <button className="brand" onClick={() => navigate("Overview")}>
          <span className="brand-symbol">
            <Cross size={23} strokeWidth={3} />
          </span>
          <span>
            RESCUE<b>COMMANDER</b>
          </span>
          <span className="brand-dot" />
        </button>
        <div className="workspace">
          <div className="workspace-icon">
            <Shield size={17} />
          </div>
          <div>
            Emergency response<span>Command workspace</span>
          </div>
          <ChevronDown size={13} />
        </div>
        <div className="nav-label">OPERATIONS</div>
        <nav>
          {nav.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={page === label ? "active" : ""}
              onClick={() => navigate(label)}
            >
              <Icon size={18} />
              <span>{label}</span>
              {label === "Missions" && (
                <b className="nav-count">{state.activeMissions}</b>
              )}
              {label === "Pathfinder" && <span className="cpp-tag">C++</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="engine-card">
            <div>
              <span className="engine-symbol">
                <Command size={17} />
              </span>
              <Badge>Engine online</Badge>
            </div>
            <strong>Built for critical decisions.</strong>
            <p>C++ precision. WebAssembly speed.</p>
            <div className="engine-tech">
              C++17 <i /> WASM <i /> DIJKSTRA
            </div>
          </div>
          <button
            className={
              page === "Field guide" ? "side-guide active" : "side-guide"
            }
            onClick={() => navigate("Field guide")}
          >
            <BookOpen size={17} /> Field guide <ArrowUpRight size={14} />
          </button>
          <div className="commander">
            <div className="avatar">AC</div>
            <div>
              Alex Carter<span>Incident commander</span>
            </div>
            <span className="online-dot" />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu"
              aria-label="Open menu"
              onClick={() => setMenu(true)}
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={13} />
            <b>{page === "Dashboard" ? "Command centre" : page}</b>
          </div>
          <div className="topbar-right">
            <span className="system-status">
              <i /> All systems operational
            </span>
            <span className="top-divider" />
            <Clock3 size={14} />
            <span className="clock">
              {clock.toLocaleTimeString("en-GB", { timeZone: "UTC" })}{" "}
              <small>UTC</small>
            </span>
            <div className="top-avatar">AC</div>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                <span className="orange-dash" /> DISASTER RESPONSE SIMULATION
              </div>
              <h1>
                {page === "Dashboard"
                  ? "Command centre"
                  : page === "City map"
                    ? "Eyes on the city"
                    : page === "Rescue fleet"
                      ? "Rescue fleet"
                      : page === "Pathfinder"
                        ? "Dijkstra pathfinder"
                        : page === "Overview"
                          ? "Every second. Every life."
                          : page === "Field guide"
                            ? "Your mission starts here"
                            : page === "Civilians"
                              ? "People, not just coordinates"
                              : page === "Facilities"
                                ? "The safety network"
                                : page === "Mission levels"
                                  ? "Mission levels"
                                  : page === "Missions"
                                    ? "Rescue operations"
                                    : "Operation analytics"}
                <span className="heading-period">.</span>
              </h1>
              <p>
                {page === "Dashboard"
                  ? "See the whole picture. Coordinate your fleet. Bring everyone home."
                  : page === "Overview"
                    ? "Take command when the city needs you most."
                    : page === "Pathfinder"
                      ? "See the C++ algorithm turn a complex city into a clear path to safety."
                      : "One connected operation. Every decision makes a difference."}
              </p>
            </div>
            <div className="simulation-actions">
              <div className={`simulation-status ${state.phase}`}>
                <i />
                {state.phase === "ready"
                  ? "STANDING BY"
                  : state.phase === "running"
                    ? "SIMULATION LIVE"
                    : state.phase === "paused"
                      ? "SIMULATION PAUSED"
                      : state.outcome === "success"
                        ? "MISSION ACCOMPLISHED"
                        : "OPERATION ENDED"}
              </div>
              <div className="action-row">
                <button
                  className="icon-button"
                  title="Restart simulation"
                  aria-label="Restart simulation"
                  onClick={() => setConfirmRestart(true)}
                >
                  <RotateCcw size={16} />
                </button>
                <button className="secondary save-button" onClick={game.save}>
                  <Save size={14} /> Save
                </button>
                <button
                  className="primary"
                  onClick={run}
                  disabled={state.phase === "finished"}
                >
                  {state.phase === "running" ? (
                    <Pause size={14} />
                  ) : (
                    <Play size={14} fill="currentColor" />
                  )}
                  {state.phase === "running"
                    ? "Pause simulation"
                    : state.phase === "paused"
                      ? "Resume simulation"
                      : "Start simulation"}
                </button>
              </div>
            </div>
          </div>
          <div className="operation-strip">
            <div>
              <span className="operation-indicator" />
              <b>{state.scenario.name.toUpperCase()}</b>
              <span className="strip-separator" />
              <MapPin size={13} />
              <span>Pune, India</span>
              <span className="scenario-badge">
                {state.scenario.difficulty}
              </span>
            </div>
            <div>
              <Clock3 size={13} />
              <span>TIME REMAINING</span>
              <strong>{time(state.timeRemaining)}</strong>
              <button
                className="speed-button"
                onClick={() =>
                  game.setSpeed(game.speed === 4 ? 1 : game.speed * 2)
                }
                aria-label="Change simulation speed"
              >
                {game.speed}×
              </button>
            </div>
          </div>
          {page === "Dashboard" && (
            <>
              <div className="mission-goal">
                <Flag size={14} />
                <span>
                  {state.scenario.objective === "critical"
                    ? "Critical care: rescue every critical civilian. Other rescues are optional."
                    : "Evacuation objective: bring every civilian safely to hospital."}
                </span>
                <button onClick={() => navigate("Mission levels")}>
                  Choose a mission <ArrowRight size={13} />
                </button>
              </div>
              {stats}
              <div className="command-grid">
                <div>{mapComponent}</div>
                <div className="right-column">{dispatchPanel}</div>
              </div>
              <div className="lower-grid">
                <section className="panel fleet-panel">
                  <PanelTitle
                    title="Your response fleet"
                    subtitle="Four units. One mission. Get everyone home."
                    action={
                      <button
                        className="text-link"
                        onClick={() => navigate("Rescue fleet")}
                      >
                        Manage fleet <ArrowUpRight size={13} />
                      </button>
                    }
                  />
                  <div className="fleet-grid">
                    {state.vehicles.map(vehicleCard)}
                  </div>
                </section>
                {activityPanel}
              </div>
              <div className="bottom-note">
                <span>
                  <ShieldCheck size={13} /> C++ powered simulation <i /> All
                  game logic runs locally in WebAssembly
                </span>
                <button onClick={() => navigate("Field guide")}>
                  New to command? Read the field guide <ArrowRight size={13} />
                </button>
              </div>
            </>
          )}
          {page === "City map" && (
            <div className="command-grid expanded-map">
              {mapComponent}
              <div>
                {dispatchPanel}
                <div className="panel map-summary">
                  <h3>Situation report</h3>
                  <p>
                    {state.critical} critical civilians await safety.{" "}
                    {state.map.blocked.length} blocked cells affect routing.
                  </p>
                  <p>
                    Select a civilian marker to set your rescue target. Select a
                    blue unit to dispatch.
                  </p>
                </div>
              </div>
            </div>
          )}
          {page === "Rescue fleet" && (
            <>
              {stats}
              <section className="panel">
                <PanelTitle
                  title="Fleet readiness"
                  subtitle="Select a unit to inspect it and assign a mission."
                />
                <div className="fleet-grid management-fleet">
                  {state.vehicles.map(vehicleCard)}
                </div>
              </section>
              <div className="detail-grid">
                <section className="panel">
                  <PanelTitle
                    title={`${unit(selected.id)} · ${selected.type}`}
                  />
                  <div className="detail-content">
                    <div className="big-unit">
                      <VehicleIcon vehicle={selected} size={65} />
                    </div>
                    <div className="detail-facts">
                      <p>
                        <span>Status</span>
                        <Badge
                          color={
                            selected.status === "available" ? "green" : "blue"
                          }
                        >
                          {selected.status}
                        </Badge>
                      </p>
                      <p>
                        <span>Grid position</span>
                        <strong>
                          {Math.floor(selected.cell / 13) + 1},{" "}
                          {(selected.cell % 13) + 1}
                        </strong>
                      </p>
                      <p>
                        <span>Fuel consumption</span>
                        <strong>{selected.fuelCost} / grid step</strong>
                      </p>
                      <p>
                        <span>Medical supplies</span>
                        <strong>{selected.supplies} kits remaining</strong>
                      </p>
                      <p>
                        <span>Route progress</span>
                        <strong>
                          {selected.route.length
                            ? `${selected.routeIndex} / ${selected.route.length - 1}`
                            : "No active route"}
                        </strong>
                      </p>
                    </div>
                  </div>
                </section>
                {dispatchPanel}
              </div>
            </>
          )}
          {page === "Civilians" && (
            <>
              {stats}
              <section className="panel">
                <PanelTitle
                  title="Civilian register"
                  subtitle="Critical casualties are prioritized by the C++ rescue manager."
                  action={
                    <input
                      className="search-input"
                      placeholder="Find a civilian…"
                      aria-label="Search civilians"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  }
                />
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>CIVILIAN</th>
                        <th>PRIORITY</th>
                        <th>LOCATION</th>
                        <th>STATUS</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {[...state.civilians]
                        .sort((a, b) => b.severity - a.severity)
                        .filter((c) =>
                          c.name.toLowerCase().includes(search.toLowerCase()),
                        )
                        .map((c) => (
                          <tr key={c.id}>
                            <td>
                              <span className="person-avatar">
                                {c.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </span>
                              <strong>{c.name}</strong>
                              <small>CV-{pad(c.id + 1)}</small>
                            </td>
                            <td>
                              <Badge
                                color={
                                  c.severity === 3
                                    ? "red"
                                    : c.severity === 2
                                      ? "amber"
                                      : "green"
                                }
                              >
                                {
                                  ["", "Stable", "Urgent", "Critical"][
                                    c.severity
                                  ]
                                }
                              </Badge>
                            </td>
                            <td className="mono">
                              GRID {Math.floor(c.cell / 13) + 1}:
                              {(c.cell % 13) + 1}
                            </td>
                            <td>
                              <Badge
                                color={
                                  c.status === "rescued"
                                    ? "green"
                                    : c.status === "waiting"
                                      ? "amber"
                                      : "blue"
                                }
                              >
                                {c.status}
                              </Badge>
                            </td>
                            <td>
                              <button
                                className="text-link"
                                disabled={c.status !== "waiting"}
                                onClick={() => {
                                  selectCivilian(c.id);
                                  navigate("City map");
                                }}
                              >
                                Locate & dispatch <ArrowUpRight size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
          {page === "Pathfinder" && (
            <>
              <div className="path-layout">
                <section>
                  <CityMap
                    state={state}
                    onCivilian={(id) => setEndCell(state.civilians[id].cell)}
                    onVehicle={(id) => setStartCell(state.vehicles[id].cell)}
                    visualize
                    revealed={revealed}
                    onCell={(cell) => {
                      if (pathPicking === "start") {
                        setStartCell(cell);
                        setPathPicking("end");
                      } else {
                        setEndCell(cell);
                        setPathPicking("start");
                      }
                    }}
                  />
                </section>
                <section className="panel path-controls">
                  <PanelTitle
                    title="Shortest path lab"
                    action={<Waypoints size={18} className="cyan" />}
                  />
                  <div className="dispatch-body">
                    <p className="muted">
                      Click cells on the map, or enter a start and destination
                      index (0–116).
                    </p>
                    <label>
                      Start cell
                      <input
                        type="number"
                        min="0"
                        max="116"
                        value={startCell}
                        onChange={(e) => setStartCell(+e.target.value)}
                      />
                    </label>
                    <label>
                      Destination
                      <input
                        type="number"
                        min="0"
                        max="116"
                        value={endCell}
                        onChange={(e) => setEndCell(+e.target.value)}
                      />
                    </label>
                    <button className="primary" onClick={calculate}>
                      <Route size={15} /> Calculate route
                    </button>
                    <div className="path-metrics">
                      <div>
                        <b>
                          {state.path.distance < 0 ? "—" : state.path.distance}
                        </b>
                        <span>GRID STEPS</span>
                      </div>
                      <div>
                        <b>{Math.min(revealed, state.path.visited.length)}</b>
                        <span>NODES VISITED</span>
                      </div>
                    </div>
                    {!state.path.calculated ? (
                      <p className="muted tiny">
                        Ready to calculate. Blocked cells are not traversable.
                      </p>
                    ) : (
                      <Badge color={state.path.distance >= 0 ? "green" : "red"}>
                        {state.path.distance >= 0
                          ? "Optimal route found"
                          : "No reachable route"}
                      </Badge>
                    )}
                    <div className="algorithm-note">
                      <span className="cpp-tag">C++17</span>
                      <h3>Dijkstra's algorithm</h3>
                      <p>
                        Priority queue · 4-direction traversal · Distance and
                        previous-node arrays
                      </p>
                      <code>O((V + E) log V)</code>
                      <p>
                        Cyan shows the reconstructed route. Blue cells show the
                        visited-node order returned by the engine.
                      </p>
                    </div>
                  </div>
                </section>
              </div>
            </>
          )}
          {page === "Facilities" && (
            <>
              <div className="facility-grid">
                {state.facilities.map((f) => (
                  <section className="panel facility-card" key={f.id}>
                    <div className={`facility-art ${f.type}`}>
                      <div className="facility-building">
                        {f.type === "hospital" ? (
                          <Hospital size={58} strokeWidth={1} />
                        ) : (
                          <Flame size={58} strokeWidth={1} />
                        )}
                      </div>
                      <span className="facility-art-label">
                        {f.type === "hospital"
                          ? "MEDICAL RESPONSE"
                          : "FIRE & RESCUE"}
                      </span>
                    </div>
                    <div className="facility-body">
                      <Badge>
                        {f.type === "hospital"
                          ? f.occupied! + f.reserved! >= f.capacity!
                            ? "At capacity"
                            : "Accepting patients"
                          : "Operational"}
                      </Badge>
                      <h2>{f.name}</h2>
                      <p>
                        <MapPin size={13} /> Grid {Math.floor(f.cell / 13) + 1},{" "}
                        {(f.cell % 13) + 1}
                      </p>
                      {f.type === "hospital" ? (
                        <>
                          <div className="fuel-label">
                            <span>Bed occupancy</span>
                            <b>
                              {f.occupied} / {f.capacity}
                            </b>
                          </div>
                          <div className="progress">
                            <i
                              style={{
                                width: `${((f.occupied! + f.reserved!) / f.capacity!) * 100}%`,
                              }}
                            />
                          </div>
                          <div className="bed-grid">
                            {Array.from({ length: f.capacity! }, (_, i) => (
                              <span
                                key={i}
                                className={
                                  i < f.occupied!
                                    ? "occupied"
                                    : i < f.occupied! + f.reserved!
                                      ? "reserved"
                                      : ""
                                }
                              >
                                <HeartPulse size={20} />
                              </span>
                            ))}
                          </div>
                          <p className="muted tiny">
                            {f.reserved} beds reserved for incoming rescues
                          </p>
                        </>
                      ) : (
                        <p className="muted facility-desc">
                          Home of the fire response unit. Coordinates disaster
                          response in the southern district.
                        </p>
                      )}
                    </div>
                  </section>
                ))}
              </div>
              <div className="info-banner">
                <ShieldCheck size={20} />
                <div>
                  <strong>Capacity-aware rescue routing</strong>
                  <p>
                    The C++ engine reserves a hospital bed before dispatching a
                    unit, so incoming patients always have a place to go.
                  </p>
                </div>
              </div>
            </>
          )}
          {page === "Mission levels" && (
            <MissionLevels
              state={state}
              action={action}
              onLoaded={() => {
                setTarget(0);
                navigate("Dashboard");
              }}
            />
          )}
          {state.phase === "finished" && (
            <section className="mission-result panel" role="status">
              <h2>
                {state.outcome === "success"
                  ? "Mission accomplished"
                  : "Mission failed"}
              </h2>
              <p>
                {state.scenario.name} · {state.rescued}/{state.total} rescued ·{" "}
                {state.score} points
              </p>
              <button
                className="primary"
                onClick={() => navigate("Mission levels")}
              >
                Choose another challenge <ArrowRight size={14} />
              </button>
            </section>
          )}
          {page === "Missions" && (
            <>
              {stats}
              <section className="panel">
                <PanelTitle
                  title="Mission board"
                  subtitle="From the first dispatch to a safe hospital arrival."
                  action={
                    <button
                      className="secondary"
                      onClick={() => navigate("City map")}
                    >
                      <Radio size={14} /> New rescue
                    </button>
                  }
                />
                {state.missions.length === 0 ? (
                  <Empty
                    icon={Radio}
                    title="Your next decision could save a life."
                    description="Start the simulation, select a response unit and dispatch it to a civilian."
                    action={
                      <button
                        className="primary"
                        onClick={() => navigate("City map")}
                      >
                        Open dispatch control <ArrowRight size={15} />
                      </button>
                    }
                  />
                ) : (
                  <div className="mission-list">
                    {state.missions.map((m) => (
                      <div className="mission-row" key={m.id}>
                        <div
                          className={`mission-icon ${m.status === "completed" ? "complete" : ""}`}
                        >
                          {m.status === "completed" ? (
                            <Check />
                          ) : (
                            <Navigation />
                          )}
                        </div>
                        <div>
                          <span className="eyebrow">MISSION {pad(m.id)}</span>
                          <h3>{state.civilians[m.civilianId].name}</h3>
                          <p>
                            {unit(m.vehicleId)} →{" "}
                            {
                              state.facilities.find(
                                (f) => f.id === m.hospitalId,
                              )?.name
                            }
                          </p>
                        </div>
                        <div className="mission-stages">
                          {["Dispatched", "Secured", "Delivered"].map(
                            (s, i) => (
                              <span
                                key={s}
                                className={
                                  m.status === "completed" ||
                                  i === 0 ||
                                  (i === 1 && m.status === "transporting")
                                    ? "done"
                                    : ""
                                }
                              >
                                <Check size={12} />
                                {s}
                              </span>
                            ),
                          )}
                        </div>
                        <div>
                          <Badge
                            color={m.status === "completed" ? "green" : "blue"}
                          >
                            {m.status}
                          </Badge>
                          <p className="mono tiny muted">
                            {time(m.started)}{" "}
                            {m.completed !== null
                              ? `— ${time(m.completed)}`
                              : "— ongoing"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
          {page === "Analytics" && (
            <>
              {stats}
              <div className="analytics-layout">
                <section className="panel">
                  <PanelTitle
                    title="Lives saved over time"
                    subtitle="Live telemetry from the C++ simulation engine"
                    action={<Badge color="blue">Operation history</Badge>}
                  />
                  <div className="chart-wrap">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={state.history}>
                        <defs>
                          <linearGradient
                            id="chartGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#00bfa6"
                              stopOpacity={0.35}
                            />
                            <stop
                              offset="100%"
                              stopColor="#00bfa6"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#ffffff08" vertical={false} />
                        <XAxis
                          dataKey="tick"
                          tick={{ fill: "#7a8c9b", fontSize: 10 }}
                          minTickGap={35}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          allowDecimals={false}
                          domain={[0, 8]}
                          tick={{ fill: "#7a8c9b", fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "#10202d",
                            border: "1px solid #2a3a45",
                            borderRadius: 8,
                          }}
                        />
                        <Area
                          type="stepAfter"
                          dataKey="rescued"
                          stroke="#00bfa6"
                          fill="url(#chartGradient)"
                          strokeWidth={2}
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </section>
                <section className="panel results-card">
                  <ShieldCheck size={40} />
                  <span className="eyebrow">OPERATION SCORE</span>
                  <strong>{state.score.toLocaleString()}</strong>
                  <Badge color={state.phase === "finished" ? "green" : "blue"}>
                    {state.phase === "finished"
                      ? "Final results"
                      : "Operation in progress"}
                  </Badge>
                  <p>
                    {state.rescued} of {state.total} lives brought to safety.
                  </p>
                  <div className="score-formula">
                    <p>
                      Critical rescue <b>300 pts</b>
                    </p>
                    <p>
                      Urgent rescue <b>200 pts</b>
                    </p>
                    <p>
                      Stable rescue <b>100 pts</b>
                    </p>
                    <p>
                      Ambulance care bonus <b>+25 pts</b>
                    </p>
                  </div>
                </section>
              </div>
              {activityPanel}
            </>
          )}
          {page === "Overview" && (
            <section className="overview panel">
              <div className="overview-copy">
                <Badge color="orange">DISASTER RESCUE COMMANDER</Badge>
                <h2>
                  A city in crisis.
                  <br />A commander in you<span>.</span>
                </h2>
                <p>
                  When disaster strikes, good intentions aren't enough. Deploy
                  your fleet, navigate blocked streets and get every civilian to
                  safety.
                </p>
                <div className="overview-actions">
                  <button
                    className="primary"
                    onClick={() => {
                      navigate("Dashboard");
                      if (state.phase === "ready") action("startGame");
                    }}
                  >
                    <Play size={16} /> Take command <ArrowRight size={16} />
                  </button>
                  <button
                    className="secondary"
                    onClick={() => navigate("Field guide")}
                  >
                    Read the field guide
                  </button>
                </div>
                <div className="overview-tech">
                  <span>
                    <Zap size={16} /> Powered by C++
                  </span>
                  <span>
                    <ShieldCheck size={16} /> No installation
                  </span>
                </div>
              </div>
              <div className="overview-visual">
                <div className="radar-circle c1" />
                <div className="radar-circle c2" />
                <div className="radar-circle c3" />
                <div className="radar-cross" />
                <div className="hero-shield">
                  <Cross size={64} strokeWidth={2} />
                </div>
                <span className="radar-label r1">
                  <HeartPulse size={16} /> Saving lives starts with you
                </span>
                <span className="radar-label r2">
                  <Navigation size={16} /> The clearest route forward
                </span>
              </div>
            </section>
          )}
          {page === "Field guide" && (
            <>
              <div className="guide-grid">
                {[
                  {
                    n: "01",
                    icon: Play,
                    title: "Take command",
                    text: "Choose a mission level or create a challenge for a friend. Each mission has its own time, fuel and rescue objectives. Pause any time to plan.",
                  },
                  {
                    n: "02",
                    icon: Truck,
                    title: "Choose your response",
                    text: "Select a unit on the city map or fleet panel. Each has a finite fuel supply and five medical kits. Helicopters use two fuel units per grid step.",
                  },
                  {
                    n: "03",
                    icon: Radio,
                    title: "Dispatch with purpose",
                    text: "Choose a waiting civilian, then dispatch. Critical civilians earn 300 points, urgent 200 and stable 100. Ambulances add a 25-point care bonus.",
                  },
                  {
                    n: "04",
                    icon: Hospital,
                    title: "Bring them home",
                    text: "Vehicles follow C++ Dijkstra routes, pick up a civilian and deliver them to a hospital. A hospital bed is reserved before departure. Points are awarded on delivery.",
                  },
                ].map((g) => (
                  <section className="panel guide-card" key={g.n}>
                    <div>
                      <span>{g.n}</span>
                      <g.icon size={23} />
                    </div>
                    <h2>{g.title}</h2>
                    <p>{g.text}</p>
                  </section>
                ))}
              </div>
              <section className="panel guide-about">
                <h2>Built on real engineering, not simulated buttons.</h2>
                <p>
                  The browser loads a compiled C++17 engine via Emscripten and
                  embind. Grid validation, shortest paths, mission state, fuel,
                  scoring and save validation all run in WebAssembly. React is
                  your command interface.
                </p>
                <div className="guide-actions">
                  <button className="secondary" onClick={game.save}>
                    <Save size={15} /> Save operation
                  </button>
                  <button className="secondary" onClick={game.load}>
                    <ArrowDownToLine size={15} /> Load saved operation
                  </button>
                  <button
                    className="secondary"
                    onClick={() => navigate("Pathfinder")}
                  >
                    <Waypoints size={15} /> Explore Dijkstra
                  </button>
                </div>
                <p className="muted tiny">
                  Saves stay in this browser. Saves are restored by replaying
                  validated C++ commands. No account or backend is required.
                </p>
                <h3>Operation rules</h3>
                <p>
                  Every map cell is one navigable road-grid intersection unless
                  marked blocked. Fire stations are staging facilities, not fuel
                  depots. All units carry one patient at a time. Fuel and
                  supplies are finite; plan your fleet assignments. The
                  operation ends when everyone is safe, time runs out, or no
                  mission is possible.
                </p>
              </section>
            </>
          )}
        </main>
        <footer>
          <span>
            RESCUE COMMANDER <i /> COMMAND WITH PURPOSE.
          </span>
          <span>
            <span className="online-dot" /> C++ ENGINE v1.0{" "}
            <span className="footer-separator">/</span> LOCAL SIMULATION
          </span>
          <button onClick={game.load}>
            <ArrowDownToLine size={12} /> Load operation
          </button>
        </footer>
      </div>
      <AnimatePresence>
        {(game.error || game.notice) && (
          <motion.div
            className={`toast ${game.error ? "error" : ""}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            role="alert"
          >
            {game.error ? <TriangleAlert size={19} /> : <Check size={19} />}
            <span>{game.error || game.notice}</span>
            <button aria-label="Dismiss message" onClick={game.clearMessage}>
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      {confirmRestart && (
        <div className="modal-overlay">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="restart-title"
          >
            <div className="modal-icon">
              <RotateCcw size={27} />
            </div>
            <h2 id="restart-title">Start a new operation?</h2>
            <p>
              Current progress will be reset. Your browser save will stay
              available until you save again.
            </p>
            <div>
              <button
                className="secondary"
                onClick={() => setConfirmRestart(false)}
              >
                Keep commanding
              </button>
              <button
                className="primary"
                onClick={() => {
                  action("restartGame");
                  setTarget(0);
                  setConfirmRestart(false);
                }}
              >
                Restart operation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function Stat({
  title,
  value,
  suffix,
  icon: Icon,
  color,
  detail,
  progress,
}: {
  title: string;
  value: string;
  suffix: string;
  icon: LucideIcon;
  color: string;
  detail: string;
  progress?: number;
}) {
  return (
    <section className={`stat-card ${color}`}>
      <div className="stat-top">
        <span>{title}</span>
        <Icon size={17} />
      </div>
      <div className="stat-value">
        {value}
        <span>{suffix}</span>
      </div>
      <div className="stat-detail">
        {progress !== undefined ? (
          <div className="mini-progress">
            <i style={{ width: `${progress}%` }} />
          </div>
        ) : (
          <span className="stat-indicator" />
        )}
        {detail}
      </div>
    </section>
  );
}
function Empty({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <div>
        <Icon size={30} />
      </div>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  );
}
