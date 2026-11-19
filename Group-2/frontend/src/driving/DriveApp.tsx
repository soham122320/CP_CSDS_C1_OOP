import { useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Coins,
  Copy,
  Cross,
  Flag,
  Gamepad2,
  Heart,
  Lock,
  MapPin,
  Play,
  Plus,
  Radio,
  ShieldCheck,
  Siren,
  Sparkles,
  Star,
  Truck,
  Volume2,
  Waypoints,
  Wrench,
} from "lucide-react";
import {
  loadDrivingEngine as loadEngine,
  type DrivingEngine as Engine,
} from "./rewards";
import {
  LEVELS,
  VEHICLES,
  HOMES,
  readProfile,
  persist,
  unlocked,
  stationRank,
  makeCode,
  parseCode,
  type Mission,
  type Profile,
  type Replay,
} from "./model";
import { RescueSession } from "./session";
import GameScreen, { CityPreview, Minimap, fmt } from "./GameScreen";

type View = "station" | "levels" | "garage" | "challenges";
interface Finish {
  success: boolean;
  stars: number;
  coins: number;
  session: RescueSession;
  replay: Replay;
}
export default function DriveApp() {
  const [view, setView] = useState<View>("station"),
    [profile, setProfile] = useState<Profile>(readProfile),
    [engine, setEngine] = useState<Engine | null>(null),
    [message, setMessage] = useState(""),
    [engineError, setEngineError] = useState(false),
    [session, setSession] = useState<RescueSession | null>(null),
    [result, setResult] = useState<Finish | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState(profile.selected),
    [reveal, setReveal] = useState(100);
  useEffect(() => {
    loadEngine()
      .then(setEngine)
      .catch(() => {
        setEngineError(true);
        setMessage("The C++ reward engine could not load. Refresh to retry.");
      });
  }, []);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 6500);
    return () => clearTimeout(timer);
  }, [message]);
  const save = (p: Profile) => {
    setProfile(p);
    if (!persist(p))
      setMessage("Progress is in memory only. Browser storage is unavailable.");
  };
  const available = unlocked(profile),
    completed = Object.keys(profile.completed).length,
    stars = Object.values(profile.completed).reduce(
      (sum, c) => sum + c.stars,
      0,
    );
  const navigate = (v: View) => {
    setView(v);
    setResult(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const start = (m: Mission) => {
    if (!engine) {
      setMessage(
        "Please wait for the WebAssembly reward engine, or refresh if it failed to load.",
      );
      return;
    }
    if (m.mode === "campaign" && m.id > available) {
      setMessage("Complete the previous level to unlock this shift.");
      return;
    }
    setResult(null);
    setSession(new RescueSession(m, profile.selected));
  };
  const leave = () => {
    if (document.fullscreenElement)
      void document.exitFullscreen().catch(() => {});
    setSession(null);
  };
  const finish = (s: RescueSession) => {
    const grade = JSON.parse(
      engine!.evaluateDrivingResult(
        JSON.stringify({
          mode: s.mission.mode,
          level: Math.max(1, s.mission.id),
          delivered: Math.min(s.delivered, s.calls.length),
          required: s.calls.length,
          collisions: s.collisions,
          elapsed: Math.ceil(s.elapsed),
          limit: s.relaxed ? Math.ceil(s.elapsed) + 1 : s.mission.limit,
          condition: Math.max(0, Math.floor(s.condition)),
          completedBefore: !!profile.completed[s.mission.id],
        }),
      ),
    );
    const success = s.result === "success" && grade.success === true;
    const coins = success ? grade.coins : 0;
    if (grade.error) setMessage(grade.error);
    if (success && s.mission.mode === "campaign") {
      const old = profile.completed[s.mission.id];
      const next = {
        ...profile,
        coins: profile.coins + coins,
        completed: {
          ...profile.completed,
          [s.mission.id]: {
            stars: Math.max(old?.stars || 0, grade.stars),
            time: Math.min(old?.time ?? Infinity, s.elapsed),
          },
        },
      };
      save(next);
    }
    setResult({
      success,
      stars: success ? grade.stars : 0,
      coins,
      session: s,
      replay: s.replay(),
    });
    setReveal(100);
    leave();
  };
  const buy = () => {
    if (!engine) {
      setMessage("Reward engine is still loading.");
      return;
    }
    const reply = JSON.parse(
      engine.purchaseDrivingVehicle(
        selectedVehicle,
        profile.coins,
        available,
        profile.owned.includes(selectedVehicle),
      ),
    );
    if (reply.error) {
      setMessage(reply.error);
      return;
    }
    save({
      ...profile,
      coins: reply.remaining,
      owned: [...profile.owned, selectedVehicle],
      selected: selectedVehicle,
    });
    setMessage(`${VEHICLES[selectedVehicle].name} is ready for duty.`);
  };
  if (session)
    return (
      <GameScreen
        session={session}
        livery={profile.livery}
        onExit={leave}
        onFinish={finish}
      />
    );
  return (
    <div className="drive-app">
      <header className="drive-header">
        <button className="drive-brand" onClick={() => navigate("station")}>
          <span>
            <Cross size={23} strokeWidth={3} />
          </span>
          <div>
            RESCUE<span>DRIVE</span>
            <small>EVERY SECOND. EVERY LIFE.</small>
          </div>
        </button>
        <nav className="drive-nav">
          {[
            { id: "station", label: "Play", icon: Gamepad2 },
            { id: "levels", label: "Levels", icon: Flag },
            { id: "garage", label: "Garage", icon: Truck },
            { id: "challenges", label: "Friend challenges", icon: Waypoints },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={view === id ? "current" : ""}
              onClick={() => navigate(id as View)}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </nav>
        <div className="header-profile">
          <span className="coin-pill">
            <Coins size={17} />
            {profile.coins.toLocaleString()}
            <small>COINS</small>
          </span>
          <span className="player-avatar">
            YOU
            <span />
          </span>
        </div>
      </header>
      <main className="drive-main">
        {engineError && (
          <div className="engine-warning" role="alert">
            The C++ reward module could not load.{" "}
            <button onClick={() => location.reload()}>Reload and retry</button>
          </div>
        )}
        {result ? (
          <section className="results-page">
            <div className="section-eyebrow">
              <span /> SHIFT REPORT /{" "}
              {result.session.mission.name.toUpperCase()}
            </div>
            <div className="results-layout">
              <div className="results-copy">
                <div className="result-emblem">
                  {result.success ? (
                    <ShieldCheck size={48} />
                  ) : (
                    <Heart size={48} />
                  )}
                </div>
                <h1>
                  {result.success
                    ? "You brought hope home."
                    : "Every hero tries again."}
                </h1>
                <p>{result.session.reason}</p>
                <div
                  className="result-stars"
                  aria-label={`${result.stars} stars`}
                >
                  {[1, 2, 3].map((n) => (
                    <Star
                      key={n}
                      fill={n <= result.stars ? "currentColor" : "none"}
                      className={n <= result.stars ? "earned" : ""}
                    />
                  ))}
                </div>
                <div className="result-stats">
                  <div>
                    <b>
                      {result.session.delivered}/{result.session.calls.length}
                    </b>
                    <span>PATIENTS SAFE</span>
                  </div>
                  <div>
                    <b>{fmt(result.session.elapsed)}</b>
                    <span>RESPONSE TIME</span>
                  </div>
                  <div>
                    <b>{result.session.collisions}</b>
                    <span>COLLISIONS</span>
                  </div>
                </div>
                <div className="reward-banner">
                  <Coins size={24} />
                  <strong>+{result.coins.toLocaleString()} coins</strong>
                  <span>
                    {result.coins
                      ? "First completion reward"
                      : result.session.mission.mode === "campaign"
                        ? "First-clear reward already earned, or mission incomplete"
                        : "Practice & custom shifts do not award coins"}
                  </span>
                </div>
                <div className="result-actions">
                  <button
                    className="drive-primary"
                    onClick={() => start(result.session.mission)}
                  >
                    <Play size={16} /> Drive again
                  </button>
                  <button
                    className="drive-secondary"
                    onClick={() => navigate("levels")}
                  >
                    Choose next level <ArrowRight size={16} />
                  </button>
                </div>
              </div>
              <div className="replay-card">
                <div>
                  <span className="section-eyebrow">
                    YOUR JOURNEY, REPLAYED
                  </span>
                  <h2>Every turn tells a story.</h2>
                </div>
                <div className="replay-map">
                  <Minimap
                    large
                    trace={result.replay.trace.slice(
                      0,
                      Math.max(
                        1,
                        Math.floor((result.replay.trace.length * reveal) / 100),
                      ),
                    )}
                  />
                  <svg
                    viewBox="0 0 180 180"
                    aria-label="Collision and rescue markers"
                  >
                    {result.replay.impacts.map((p, i) => (
                      <circle
                        key={i}
                        cx={p.x * 0.82 + 90}
                        cy={p.z * 0.82 + 90}
                        r="2"
                        fill="#d95742"
                      />
                    ))}
                    {result.replay.pickups.map((p, i) => (
                      <rect
                        key={`pickup-${i}`}
                        x={p.x * 0.82 + 88}
                        y={p.z * 0.82 + 88}
                        width="4"
                        height="4"
                        fill="#87749a"
                      />
                    ))}
                    {result.replay.rescues.map((p, i) => (
                      <circle
                        key={i}
                        cx={p.x * 0.82 + 90}
                        cy={p.z * 0.82 + 90}
                        r="3"
                        fill="#258969"
                        stroke="white"
                      />
                    ))}
                  </svg>
                </div>
                <input
                  aria-label="Replay timeline"
                  type="range"
                  min={1}
                  max={100}
                  value={reveal}
                  onChange={(e) => setReveal(+e.target.value)}
                />
                <div className="replay-legend">
                  <span>● Driven route</span>
                  <span>● Collision</span>
                  <span>● Hospital handover</span>
                  <span>■ Patient pickup</span>
                  <b>{fmt((result.replay.duration * reveal) / 100)}</b>
                </div>
                <p>
                  Scrub the route to review your driving. A local route
                  replay—not a recorded video.
                </p>
              </div>
            </div>
          </section>
        ) : view === "station" ? (
          <>
            <section className="home-hero">
              <div className="hero-copy">
                <div className="section-eyebrow">
                  <span /> YOUR SHIFT STARTS HERE
                </div>
                <h1>
                  The city calls.
                  <br />
                  You <em>answer.</em>
                </h1>
                <p>
                  More than a driver. A lifeline.
                  <br />
                  Take the wheel, answer the call, and bring your neighbourhood
                  home.
                </p>
                <div className="hero-actions">
                  <button
                    className="drive-primary"
                    disabled={!engine}
                    onClick={() => start(LEVELS[available - 1])}
                  >
                    <Play size={17} fill="currentColor" />
                    {engine ? "Start your shift" : "Starting C++ engine…"}
                    <ArrowRight size={18} />
                  </button>
                  <button
                    className="hero-link"
                    onClick={() => navigate("levels")}
                  >
                    Explore levels <ArrowUpRight size={16} />
                  </button>
                </div>
                <div className="hero-features">
                  <span>
                    <Gamepad2 size={15} /> YOU DRIVE
                  </span>
                  <span>
                    <Heart size={15} /> YOU RESCUE
                  </span>
                  <span>
                    <Sparkles size={15} /> YOU MAKE A DIFFERENCE
                  </span>
                </div>
              </div>
              <div className="hero-scene">
                <CityPreview
                  livery={profile.livery}
                  vehicle={profile.selected}
                  rank={completed}
                />
                <div className="scene-badge">
                  <span className="pulse-dot" /> YOUR NEIGHBOURHOOD IS ALIVE
                </div>
                <div className="next-call">
                  <span>
                    <Radio size={17} />
                  </span>
                  <div>
                    <small>
                      NEXT UP / LEVEL {available.toString().padStart(2, "0")}
                    </small>
                    <strong>{LEVELS[available - 1].name}</strong>
                  </div>
                  <ArrowUpRight size={18} />
                </div>
                <div className="scene-caption">
                  A small city. A big responsibility.
                  <span>3D LIVE PREVIEW</span>
                </div>
              </div>
            </section>
            <section className="progress-ribbon">
              <div>
                <span className="ribbon-icon">
                  <ShieldCheck size={23} />
                </span>
                <p>
                  YOUR RESCUE STORY<strong>{stationRank(profile)}</strong>
                </p>
              </div>
              <div>
                <b>
                  {completed}
                  <small>/ 7</small>
                </b>
                <span>SHIFTS COMPLETED</span>
              </div>
              <div>
                <b>
                  {stars}
                  <Star size={17} />
                  <small>/ 21</small>
                </b>
                <span>STARS EARNED</span>
              </div>
              <div className="ribbon-progress">
                <div>
                  {LEVELS.map((l) => (
                    <i
                      key={l.id}
                      className={
                        profile.completed[l.id]
                          ? "complete"
                          : l.id === available
                            ? "next"
                            : ""
                      }
                    />
                  ))}
                </div>
                <span>
                  {completed === 7
                    ? "An entire city, a little safer."
                    : "A new level. A little more courage."}
                </span>
              </div>
              <button onClick={() => navigate("levels")}>
                View your journey <ChevronRight size={16} />
              </button>
            </section>
            <section className="below-hero">
              <div className="section-title">
                <div>
                  <span className="section-eyebrow">
                    THERE’S MORE THAN ONE WAY TO HELP
                  </span>
                  <h2>Find your kind of drive.</h2>
                </div>
                <span className="small-note">
                  No installs. No accounts. Just you and the next call.
                </span>
              </div>
              <div className="mode-grid">
                <ModeCard
                  icon={Flag}
                  index="01"
                  title="The campaign"
                  text="Seven shifts. Bigger challenges. Earn 1,000 coins for every first completion."
                  label="Choose a level"
                  color="orange"
                  onClick={() => navigate("levels")}
                />
                <ModeCard
                  icon={Gamepad2}
                  index="02"
                  title="Room to practise"
                  text="Learn to steer, reverse, park and carry a stretcher. No timer. No penalties."
                  label="Enter training ground"
                  color="green"
                  onClick={() =>
                    start({
                      ...LEVELS[0],
                      id: 0,
                      name: "Training Ground",
                      mode: "training",
                      limit: 0,
                    })
                  }
                />
                <ModeCard
                  icon={MapPin}
                  index="03"
                  title="Take the long way"
                  text="A city to explore. Optional calls to answer. An unhurried shift, on your terms."
                  label="Start free drive"
                  color="blue"
                  onClick={() =>
                    start({
                      ...LEVELS[1],
                      id: 0,
                      name: "Free Drive",
                      mode: "free",
                      limit: 0,
                      traffic: true,
                    })
                  }
                />
              </div>
            </section>
            <div className="station-note">
              <Siren size={19} />
              <p>
                <strong>Not every hero wears a cape.</strong> Some drive
                carefully, park properly, and always bring a partner.
              </p>
              <span>MEET MORGAN. YOUR PARTNER ON EVERY SHIFT.</span>
            </div>
          </>
        ) : view === "levels" ? (
          <>
            <PageIntro
              eyebrow="SEVEN SHIFTS. ONE PURPOSE."
              title={
                <>
                  A little braver.
                  <br />
                  Every <em>level.</em>
                </>
              }
              text="Start with one call. Grow into the city’s most trusted rescue team. Complete a shift to unlock the next."
            />
            <div className="campaign-note">
              <Coins size={19} />
              <b>1,000 coins</b> for each level’s first completion.
              <span>Replays improve stars, not your coin balance.</span>
            </div>
            <div className="campaign-grid">
              {LEVELS.map((level, i) => {
                const record = profile.completed[level.id],
                  locked = level.id > available;
                return (
                  <article
                    className={`campaign-card ${locked ? "locked" : ""}`}
                    key={level.id}
                  >
                    <div className={`level-art art-${i}`}>
                      <span className="level-no">0{level.id}</span>
                      <div className="mini-houses">
                        <i />
                        <i />
                        <i />
                      </div>
                      <span className="weather-chip">
                        {level.weather === "night"
                          ? "☾ NIGHT SHIFT"
                          : level.weather === "rain"
                            ? "☂ RAINY ROADS"
                            : level.id < 3
                              ? "☀ CLEAR SKIES"
                              : "↗ CITY TRAFFIC"}
                      </span>
                      {locked && (
                        <span className="lock-medal">
                          <Lock size={21} />
                        </span>
                      )}
                    </div>
                    <div className="campaign-body">
                      <div className="card-eyebrow">
                        {level.subtitle}
                        <span>
                          {record
                            ? "COMPLETED"
                            : locked
                              ? "LOCKED"
                              : "READY TO DRIVE"}
                        </span>
                      </div>
                      <h2>{level.name}</h2>
                      <p>{level.description}</p>
                      <div className="campaign-facts">
                        <span>
                          <Heart size={13} />
                          {level.houses.length}{" "}
                          {level.houses.length === 1 ? "patient" : "patients"}
                        </span>
                        <span>{fmt(level.limit)} budget</span>
                        <span>
                          {i < 2 ? "Easy" : i < 5 ? "Medium" : "Advanced"}
                        </span>
                      </div>
                      <div className="campaign-bottom">
                        <div className="tiny-stars">
                          {[1, 2, 3].map((n) => (
                            <Star
                              key={n}
                              size={14}
                              fill={
                                record && record.stars >= n
                                  ? "currentColor"
                                  : "none"
                              }
                            />
                          ))}
                        </div>
                        <button
                          disabled={locked || !engine}
                          onClick={() => start(level)}
                        >
                          {locked ? (
                            <>
                              <Lock size={13} /> Complete level {i}
                            </>
                          ) : (
                            <>
                              {record ? "Replay shift" : "Start shift"}{" "}
                              <ArrowRight size={15} />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        ) : view === "garage" ? (
          <>
            <PageIntro
              eyebrow="YOUR RIDE. YOUR RESCUE STORY."
              title={
                <>
                  Built to help.
                  <br />
                  Made <em>yours.</em>
                </>
              }
              text="Spend your earned coins on a vehicle that fits your driving. Choose your colours and put your name on the next rescue."
            />
            <div className="garage-layout">
              <div className="garage-preview">
                <CityPreview
                  livery={profile.livery}
                  vehicle={selectedVehicle}
                  rank={completed}
                />
                <span className="garage-label">
                  {VEHICLES[selectedVehicle].tag}
                </span>
                <div className="garage-info">
                  <h2>{VEHICLES[selectedVehicle].name}</h2>
                  <p>{VEHICLES[selectedVehicle].description}</p>
                  <div>
                    <span>
                      <b>{Math.round(VEHICLES[selectedVehicle].speed * 3.6)}</b>{" "}
                      TOP SPEED KM/H
                    </span>
                    <span>
                      <b>{VEHICLES[selectedVehicle].capacity}</b> PATIENT SPACES
                    </span>
                  </div>
                </div>
              </div>
              <section className="customize-card">
                <span className="section-eyebrow">MAKE IT YOURS</span>
                <h2>
                  A familiar sight.
                  <br />A personal touch.
                </h2>
                <label>Body colour</label>
                <div className="paint-options">
                  {["#e5f4ed", "#e9bd73", "#ec8467", "#82afb6", "#657c65"].map(
                    (color) => (
                      <button
                        key={color}
                        aria-label={`Paint ${color}`}
                        className={
                          profile.livery.color === color ? "selected" : ""
                        }
                        style={{ background: color }}
                        onClick={() =>
                          save({
                            ...profile,
                            livery: { ...profile.livery, color },
                          })
                        }
                      >
                        {profile.livery.color === color && <Check size={16} />}
                      </button>
                    ),
                  )}
                </div>
                <label>
                  Unit name
                  <input
                    value={profile.livery.name}
                    maxLength={18}
                    onChange={(e) =>
                      save({
                        ...profile,
                        livery: { ...profile.livery, name: e.target.value },
                      })
                    }
                  />
                </label>
                <label>
                  Side decal
                  <select
                    value={profile.livery.decal}
                    onChange={(e) =>
                      save({
                        ...profile,
                        livery: { ...profile.livery, decal: e.target.value },
                      })
                    }
                  >
                    {["MEDIC", "RESCUE", "CITY CARE"].map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Emergency lights
                  <select
                    value={profile.livery.lights}
                    onChange={(e) =>
                      save({
                        ...profile,
                        livery: {
                          ...profile.livery,
                          lights: e.target.value as "strobe" | "alternate",
                        },
                      })
                    }
                  >
                    <option value="alternate">Alternating red & blue</option>
                    <option value="strobe">Rapid strobe</option>
                  </select>
                </label>
                <p>
                  Customizations are cosmetic, free, and saved on this browser.
                </p>
              </section>
            </div>
            <div className="vehicle-grid">
              {VEHICLES.map((v) => (
                <button
                  key={v.id}
                  className={
                    selectedVehicle === v.id
                      ? "vehicle-card selected"
                      : "vehicle-card"
                  }
                  onClick={() => setSelectedVehicle(v.id)}
                >
                  <span className="vehicle-illustration">
                    <Truck size={43} strokeWidth={1.3} />
                    {v.capacity === 2 && <Plus size={16} />}
                  </span>
                  <span className="card-eyebrow">
                    UNIT 0{v.id + 1}{" "}
                    <b>
                      {profile.selected === v.id
                        ? "IN SERVICE"
                        : profile.owned.includes(v.id)
                          ? "OWNED"
                          : `LEVEL ${v.unlock}`}
                    </b>
                  </span>
                  <strong>{v.name}</strong>
                  <span className="vehicle-price">
                    {profile.owned.includes(v.id) ? (
                      <>
                        <Check size={13} /> In your garage
                      </>
                    ) : (
                      <>
                        <Coins size={14} />
                        {v.price.toLocaleString()} coins
                      </>
                    )}
                  </span>
                </button>
              ))}
            </div>
            <div className="garage-purchase">
              <p>
                {profile.owned.includes(selectedVehicle)
                  ? "Ready when you are. Select this unit for your next shift."
                  : available < VEHICLES[selectedVehicle].unlock
                    ? `Unlock level ${VEHICLES[selectedVehicle].unlock} before purchasing this vehicle.`
                    : "A considered upgrade for the calls ahead."}
              </p>
              {profile.owned.includes(selectedVehicle) ? (
                <button
                  className="drive-primary"
                  onClick={() => {
                    save({ ...profile, selected: selectedVehicle });
                    setMessage("Your unit is ready for the next shift.");
                  }}
                >
                  <Check size={15} />
                  {profile.selected === selectedVehicle
                    ? "Current rescue unit"
                    : "Put this unit in service"}
                </button>
              ) : (
                <button
                  className="drive-primary"
                  disabled={
                    available < VEHICLES[selectedVehicle].unlock ||
                    profile.coins < VEHICLES[selectedVehicle].price ||
                    !engine
                  }
                  onClick={buy}
                >
                  <Coins size={16} /> Buy for{" "}
                  {VEHICLES[selectedVehicle].price.toLocaleString()}
                </button>
              )}
            </div>
          </>
        ) : (
          <Challenges onPlay={start} onMessage={setMessage} />
        )}
      </main>
      <footer className="drive-footer">
        <span>
          <Cross size={14} /> RESCUE DRIVE <i /> MADE FOR THE MOMENTS THAT
          MATTER.
        </span>
        <span>
          <i className="online-indicator" />
          {engine ? "C++ REWARD ENGINE ONLINE" : "LOADING WEBASSEMBLY"} <b>·</b>{" "}
          THREE.JS WORLD
        </span>
        <small>Progress stays in this browser. No real-money purchases.</small>
      </footer>
      {message && (
        <div className="drive-toast" role="status">
          <Activity size={18} />
          {message}
          <button aria-label="Dismiss message" onClick={() => setMessage("")}>
            ×
          </button>
        </div>
      )}
    </div>
  );
}
function PageIntro({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: React.ReactNode;
  text: string;
}) {
  return (
    <section className="page-intro">
      <div>
        <div className="section-eyebrow">
          <span />
          {eyebrow}
        </div>
        <h1>{title}</h1>
      </div>
      <p>{text}</p>
    </section>
  );
}
function ModeCard({
  icon: Icon,
  index,
  title,
  text,
  label,
  color,
  onClick,
}: {
  icon: typeof Flag;
  index: string;
  title: string;
  text: string;
  label: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button className={`mode-card ${color}`} onClick={onClick}>
      <div>
        <span>
          <Icon size={23} />
        </span>
        <small>{index}</small>
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      <b>
        {label}
        <ArrowUpRight size={16} />
      </b>
    </button>
  );
}
function Challenges({
  onPlay,
  onMessage,
}: {
  onPlay: (m: Mission) => void;
  onMessage: (t: string) => void;
}) {
  const [draft, setDraft] = useState<Mission>({
      ...LEVELS[1],
      id: 0,
      name: "My neighbourhood challenge",
      mode: "custom",
      houses: [6, 10],
    }),
    [code, setCode] = useState(""),
    [incoming, setIncoming] = useState("");
  const share = () => {
    try {
      const code = makeCode(draft);
      parseCode(code);
      setCode(code);
      onMessage("Challenge ready. Send the code to a friend.");
    } catch (e) {
      onMessage((e as Error).message);
    }
  };
  return (
    <>
      <PageIntro
        eyebrow="BETTER WHEN IT’S SHARED."
        title={
          <>
            Your streets.
            <br />
            Their <em>challenge.</em>
          </>
        }
        text="Choose the houses. Set the conditions. Send a code to a friend and see how they handle your rescue route."
      />
      <div className="challenge-layout">
        <section className="challenge-builder">
          <div className="section-eyebrow">01 / BUILD A RESCUE ROUTE</div>
          <h2>Where does the city need help?</h2>
          <p>
            Select 1–6 houses. Every house has an accessible front door; your
            friend chooses the order.
          </p>
          <div className="house-picker">
            {HOMES.map((_, i) => (
              <button
                key={i}
                className={draft.houses.includes(i) ? "selected" : ""}
                aria-label={`House ${i + 1}`}
                aria-pressed={draft.houses.includes(i)}
                onClick={() => {
                  setCode("");
                  setDraft({
                    ...draft,
                    houses: draft.houses.includes(i)
                      ? draft.houses.filter((h) => h !== i)
                      : draft.houses.length < 6
                        ? [...draft.houses, i]
                        : draft.houses,
                  });
                }}
              >
                <span>⌂</span>
                <small>HOUSE {String(i + 1).padStart(2, "0")}</small>
                {draft.houses.includes(i) && <Check size={14} />}
              </button>
            ))}
          </div>
          <div className="challenge-fields">
            <label>
              Challenge name
              <input
                maxLength={48}
                value={draft.name}
                onChange={(e) => {
                  setCode("");
                  setDraft({ ...draft, name: e.target.value });
                }}
              />
            </label>
            <label>
              Time budget (seconds)
              <input
                type="number"
                min={120}
                max={1200}
                value={draft.limit}
                onChange={(e) => {
                  setCode("");
                  setDraft({ ...draft, limit: +e.target.value });
                }}
              />
            </label>
            <label>
              Conditions
              <select
                value={draft.weather}
                onChange={(e) => {
                  setCode("");
                  setDraft({
                    ...draft,
                    weather: e.target.value as Mission["weather"],
                  });
                }}
              >
                <option value="clear">Clear afternoon</option>
                <option value="night">Night shift</option>
                <option value="rain">Rainy roads</option>
              </select>
            </label>
          </div>
          <div className="challenge-checks">
            <label>
              <input
                type="checkbox"
                checked={draft.traffic}
                onChange={(e) => {
                  setCode("");
                  setDraft({ ...draft, traffic: e.target.checked });
                }}
              />{" "}
              City traffic
            </label>
            <label>
              <input
                type="checkbox"
                checked={draft.events}
                onChange={(e) => {
                  setCode("");
                  setDraft({ ...draft, events: e.target.checked });
                }}
              />{" "}
              Dynamic road closure
            </label>
          </div>
          <div className="challenge-actions">
            <button className="drive-primary" onClick={share}>
              Create share code <ArrowRight size={16} />
            </button>
            <button
              className="drive-secondary"
              onClick={() => {
                try {
                  onPlay(parseCode(makeCode(draft)));
                } catch (e) {
                  onMessage((e as Error).message);
                }
              }}
            >
              Test your route <Play size={15} />
            </button>
          </div>
          {code && (
            <div className="share-code">
              <label>
                Your driving challenge code
                <textarea
                  aria-label="Shareable driving code"
                  readOnly
                  value={code}
                />
              </label>
              <button
                className="drive-secondary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(code);
                    onMessage("Copied! Your friend can paste it on the right.");
                  } catch {
                    onMessage("Select the code and copy it manually.");
                  }
                }}
              >
                <Copy size={14} /> Copy code
              </button>
            </div>
          )}
        </section>
        <section className="challenge-import">
          <span className="section-eyebrow">02 / ANSWER A FRIEND’S CALL</span>
          <div className="friend-icon">
            <Waypoints size={36} />
          </div>
          <h2>
            A friend made a route.
            <br />
            Can you bring them home?
          </h2>
          <p>
            Paste an RD1. code to load their houses, weather and time limit.
            Custom shifts do not award campaign coins.
          </p>
          <label>
            Friend’s challenge code
            <textarea
              value={incoming}
              onChange={(e) => setIncoming(e.target.value)}
              maxLength={5000}
              placeholder="RD1.…"
            />
          </label>
          <button
            className="drive-primary"
            disabled={!incoming.trim()}
            onClick={() => {
              try {
                onPlay(parseCode(incoming));
              } catch (e) {
                onMessage((e as Error).message);
              }
            }}
          >
            Load friend’s challenge <ArrowRight size={16} />
          </button>
          <p className="challenge-disclaimer">
            Copy-and-paste sharing. No accounts, cloud storage or multiplayer.
            Earlier RC1. command-centre codes use the old grid format and are
            not driving routes.
          </p>
        </section>
      </div>
    </>
  );
}
