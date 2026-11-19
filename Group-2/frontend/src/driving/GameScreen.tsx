import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Maximize,
  Pause,
  Play,
  Radio,
  Volume2,
  VolumeX,
  Siren,
  HeartPulse,
  Shield,
  Flag,
  LogOut,
} from "lucide-react";
import { RescueScene } from "./scene";
import { RescueSession, emptyControls, distance, door } from "./session";
import { HOMES, HOSPITAL, type Livery, type Point } from "./model";
function SteeringWheel({
  size,
  style,
}: {
  size: number;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      style={style}
    >
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="2.2" />
      <path d="M3.5 9l6.5 2m4 0l6.5-2M12 14v7" />
    </svg>
  );
}
export const fmt = (n: number) =>
  `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(Math.floor(n % 60)).padStart(2, "0")}`;
export function Minimap({
  session: s,
  trace,
  large = false,
}: {
  session?: RescueSession;
  trace?: Point[];
  large?: boolean;
}) {
  const c = (n: number) => n * 0.82 + 90;
  return (
    <svg
      className={large ? "drive-map large" : "drive-map"}
      viewBox="0 0 180 180"
      aria-label="City minimap"
    >
      <rect width="180" height="180" rx="14" fill="#d9e4d0" />
      {[-60, 0, 60].map((r) => (
        <g key={r}>
          <path
            d={`M${c(r)} 0V180M0 ${c(r)}H180`}
            stroke="#a7b7a4"
            strokeWidth="12"
          />
          <path
            d={`M${c(r)} 0V180M0 ${c(r)}H180`}
            stroke="#d5d9c9"
            strokeWidth="1"
            strokeDasharray="3 4"
          />
        </g>
      ))}
      {HOMES.map((h, i) => (
        <rect
          key={i}
          x={c(h.x) - 4}
          y={c(h.z) - 4}
          width="8"
          height="8"
          rx="1"
          fill="#9aab8e"
        />
      ))}
      <rect
        x={c(HOSPITAL.x) - 5}
        y={c(HOSPITAL.z) - 5}
        width="10"
        height="10"
        rx="2"
        fill="#258969"
      />
      <path
        d={`M${c(HOSPITAL.x) - 3} ${c(HOSPITAL.z)}h6m-3-3v6`}
        stroke="white"
        strokeWidth="1.2"
      />
      {trace && (
        <polyline
          points={trace.map((p) => `${c(p.x)},${c(p.z)}`).join(" ")}
          fill="none"
          stroke="#eb724c"
          strokeWidth="1.6"
        />
      )}
      {s && (
        <>
          {s.calls
            .filter((call) => call.status === "waiting")
            .map((call) => {
              const h = door(call.house);
              return (
                <circle
                  key={call.id}
                  cx={c(h.x)}
                  cy={c(h.z)}
                  r="4"
                  fill={s.active === call.id ? "#e2734f" : "#efba5d"}
                  stroke="white"
                  strokeWidth="1.2"
                />
              );
            })}
          {s.event && (
            <path
              d={`M${c(-6)} ${c(-25)}h10`}
              stroke="#cb5545"
              strokeWidth="4"
            />
          )}
          <circle
            cx={c(s.car.x)}
            cy={c(s.car.z)}
            r="4"
            fill="#176f65"
            stroke="white"
            strokeWidth="1.5"
          />
          {s.stage !== "driving" && (
            <circle
              cx={c(s.person.x)}
              cy={c(s.person.z)}
              r="2.5"
              fill="#f16841"
            />
          )}
        </>
      )}
    </svg>
  );
}
export function CityPreview({
  livery,
  vehicle = 0,
  rank = 0,
}: {
  livery: Livery;
  vehicle?: number;
  rank?: number;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [previewLivery, setPreviewLivery] = useState(livery);
  useEffect(() => {
    const timer = setTimeout(() => setPreviewLivery(livery), 220);
    return () => clearTimeout(timer);
  }, [livery.color, livery.name, livery.decal, livery.lights]);
  useEffect(() => {
    if (!host.current) return;
    const session = new RescueSession(
      {
        id: 0,
        name: "Preview",
        subtitle: "",
        description: "",
        houses: [10],
        limit: 0,
        weather: "clear",
        events: false,
        traffic: false,
        mode: "free",
      },
      vehicle,
    );
    let scene: RescueScene | undefined;
    try {
      scene = new RescueScene(
        host.current,
        session,
        previewLivery,
        (dt) => {
          session.elapsed += dt;
        },
        true,
        rank,
      );
    } catch {
      setFailed(true);
    }
    return () => scene?.dispose();
  }, [
    previewLivery.color,
    previewLivery.name,
    previewLivery.decal,
    previewLivery.lights,
    vehicle,
    rank,
  ]);
  return (
    <div
      ref={host}
      className="city-preview"
      aria-label="3D ambulance and neighbourhood preview"
    >
      {failed && (
        <div className="webgl-note">
          3D preview needs WebGL. Enable hardware acceleration in your browser.
        </div>
      )}
    </div>
  );
}
export default function GameScreen({
  session: s,
  livery,
  onExit,
  onFinish,
}: {
  session: RescueSession;
  livery: Livery;
  onExit: () => void;
  onFinish: (s: RescueSession) => void;
}) {
  const host = useRef<HTMLDivElement>(null),
    shell = useRef<HTMLDivElement>(null),
    controls = useRef(emptyControls()),
    done = useRef(false);
  const [tick, setTick] = useState(0),
    [audio, setAudio] = useState(false),
    [failed, setFailed] = useState(""),
    [wheel, setWheel] = useState(0);
  const audioRef = useRef(false),
    lastSpoken = useRef(0);
  useEffect(() => {
    audioRef.current = audio;
    if (!audio) window.speechSynthesis?.cancel();
  }, [audio]);
  useEffect(() => {
    if (!host.current) return;
    let scene: RescueScene | undefined;
    let accumulated = 0;
    try {
      scene = new RescueScene(host.current, s, livery, (dt) => {
        for (let remaining = dt; remaining > 0; remaining -= 0.02)
          s.step(Math.min(0.02, remaining), controls.current);
        accumulated += dt;
        if (accumulated > 0.1) {
          accumulated = 0;
          setTick((t) => t + 1);
        }
        if (s.result && !done.current) {
          done.current = true;
          onFinish(s);
        }
      });
    } catch (e) {
      setFailed(
        `3D could not start. Enable WebGL / hardware acceleration and reload. ${e instanceof Error ? e.message : ""}`,
      );
    }
    return () => scene?.dispose();
  }, [s]);
  useEffect(() => {
    const map: Record<string, keyof ReturnType<typeof emptyControls>> = {
      w: "up",
      ArrowUp: "up",
      s: "down",
      ArrowDown: "down",
      a: "left",
      ArrowLeft: "left",
      d: "right",
      ArrowRight: "right",
      " ": "brake",
    };
    const down = (e: KeyboardEvent) => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (map[key]) {
        e.preventDefault();
        controls.current[map[key]] = true;
      }
      if (e.repeat) return;
      if (key === "e") s.interact();
      if (key === "q") s.toggleSiren();
      if (key === "Escape") {
        s.paused = !s.paused;
        controls.current = emptyControls();
      }
      if (["1", "2", "3"].includes(key)) s.aid(+key - 1);
      setTick((t) => t + 1);
    };
    const up = (e: KeyboardEvent) => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (map[key]) {
        e.preventDefault();
        controls.current[map[key]] = false;
      }
    };
    const blur = () => {
      s.paused = true;
      controls.current = emptyControls();
      setTick((t) => t + 1);
    };
    let wasFullscreen = !!document.fullscreenElement;
    const fullscreen = () => {
      if (wasFullscreen && !document.fullscreenElement) blur();
      wasFullscreen = !!document.fullscreenElement;
    };
    const visibility = () => {
      if (document.hidden) blur();
    };
    document.addEventListener("fullscreenchange", fullscreen);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      document.removeEventListener("fullscreenchange", fullscreen);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      window.speechSynthesis?.cancel();
    };
  }, [s]);
  useEffect(() => {
    const item = s.events[0];
    if (!item || item.id === lastSpoken.current || !audio || s.paused) return;
    lastSpoken.current = item.id;
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const speech = new SpeechSynthesisUtterance(item.text);
      speech.rate = 1.05;
      window.speechSynthesis.speak(speech);
    }
  }, [tick, audio]);
  useEffect(() => {
    if (!audio || !s.siren || s.paused) return;
    let context: AudioContext | undefined;
    try {
      context = new AudioContext();
      const oscillator = context.createOscillator(),
        gain = context.createGain();
      gain.gain.value = 0.025;
      oscillator.type = "sine";
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      let high = false;
      const id = setInterval(() => {
        high = !high;
        oscillator.frequency.setTargetAtTime(
          high ? 780 : 530,
          context!.currentTime,
          0.12,
        );
      }, 500);
      return () => {
        clearInterval(id);
        oscillator.stop();
        void context?.close();
      };
    } catch {
      return;
    }
  }, [audio, s.siren, s.paused]);
  const press = (key: keyof ReturnType<typeof emptyControls>) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      controls.current[key] = true;
    },
    onPointerUp: () => {
      controls.current[key] = false;
    },
    onPointerCancel: () => {
      controls.current[key] = false;
    },
    onLostPointerCapture: () => {
      controls.current[key] = false;
    },
  });
  const turnWheel = (e: React.PointerEvent<HTMLButtonElement>) => {
    const bounds = e.currentTarget.getBoundingClientRect();
    const turn = Math.max(
      -1,
      Math.min(
        1,
        (e.clientX - (bounds.left + bounds.width / 2)) / (bounds.width / 2),
      ),
    );
    controls.current.left = turn < -0.15;
    controls.current.right = turn > 0.15;
    setWheel(turn * 70);
  };
  const releaseWheel = () => {
    controls.current.left = false;
    controls.current.right = false;
    setWheel(0);
  };
  const action = () => {
    s.interact();
    setTick((t) => t + 1);
  };
  return (
    <div className="gaming-shell" ref={shell}>
      <div className="game-canvas" ref={host} />
      {failed && (
        <div className="game-error">
          <h2>We need your graphics engine.</h2>
          <p>{failed}</p>
          <button onClick={onExit}>Return to station</button>
        </div>
      )}
      <div className="game-top">
        <button
          className="hud-icon"
          aria-label="Pause game"
          onClick={() => {
            s.paused = !s.paused;
            controls.current = emptyControls();
            setTick((t) => t + 1);
          }}
        >
          <Pause size={19} />
        </button>
        <div className="game-title">
          <span>
            {s.mission.mode.toUpperCase()} / {s.mission.weather.toUpperCase()}
          </span>
          <strong>{s.mission.name}</strong>
        </div>
        <div className="game-score">
          <Flag size={16} />
          {s.delivered} / {s.calls.length}
          <span>RESCUED</span>
        </div>
        <div className="game-timer">
          {s.relaxed ? "∞" : fmt(Math.max(0, s.mission.limit - s.elapsed))}
          <span>{s.relaxed ? "NO TIME PRESSURE" : "TIME REMAINING"}</span>
        </div>
        <button
          className="hud-icon"
          aria-label={audio ? "Mute radio" : "Enable radio audio"}
          onClick={() => setAudio(!audio)}
        >
          {audio ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
        <button
          className="hud-icon"
          aria-label="Enter fullscreen"
          onClick={() => {
            if (document.fullscreenElement)
              void document.exitFullscreen().catch(() => {});
            else void shell.current?.requestFullscreen?.().catch(() => {});
          }}
        >
          <Maximize size={18} />
        </button>
      </div>
      <div className="direction-guide">
        <ArrowUp
          size={21}
          style={{
            transform: `rotate(${((Math.atan2(s.target.x - s.actor.x, s.target.z - s.actor.z) - (s.stage === "driving" ? s.car.angle : Math.PI)) * -180) / Math.PI}deg)`,
          }}
        />
        <div>
          <b>
            {Math.round(distance(s.actor, s.target))} m ·{" "}
            {s.onboard.length && s.current.status !== "waiting"
              ? "HOSPITAL"
              : "SELECTED CALL"}
          </b>
          <span aria-label="Compass heading">
            {(((((s.car.angle * 180) / Math.PI) % 360) + 360) % 360) | 0}°
            heading
          </span>
        </div>
      </div>
      <div className="dispatch-stack">
        <div className="dispatch-heading">
          <span className="pulse-dot" /> DISPATCH / LIVE CALLS
        </div>
        {s.calls
          .filter((c) => c.status === "waiting")
          .slice(0, 2)
          .map((c) => (
            <button
              key={c.id}
              className={`call-card ${s.active === c.id ? "chosen" : ""}`}
              disabled={s.stage !== "driving"}
              onClick={() => {
                s.choose(c.id);
                setTick((t) => t + 1);
              }}
            >
              <span>
                HOUSE {String(c.house + 1).padStart(2, "0")} ·{" "}
                {Math.round(distance(s.car, door(c.house)))}m
              </span>
              <strong>{c.name}</strong>
              <small>{c.kind}</small>
              <b>
                {s.active === c.id ? "RESPONDING" : "SELECT CALL"}{" "}
                <ArrowRight size={12} />
              </b>
            </button>
          ))}
      </div>
      <div className="game-map-wrap">
        <Minimap session={s} />
        <span>
          <i /> YOU <b /> CALL <em /> HOSPITAL
        </span>
      </div>
      <div className="partner-radio">
        <Radio size={17} />
        <div>
          <b>PARTNER MORGAN</b>
          <p>{s.events[0]?.text}</p>
        </div>
      </div>
      <div className="objective-prompt">
        <span>
          {s.stage === "driving"
            ? "ON THE ROAD"
            : s.stage === "carrying"
              ? "TEAM LIFT"
              : "ON FOOT"}
        </span>
        <strong>{s.prompt}</strong>
        <button onClick={action}>
          {s.stage === "driving" &&
          s.onboard.length &&
          distance(s.car, HOSPITAL) < 9
            ? "Hand over patients"
            : s.stage === "driving"
              ? "Step out [E]"
              : s.stage === "carrying"
                ? "Load patient [E]"
                : "Interact [E]"}
        </button>
      </div>
      <div className="vehicle-status">
        <div className="speed-number">
          {Math.round(Math.abs(s.car.speed) * 3.6)}
          <span>KM/H</span>
        </div>
        <div>
          <p>
            <HeartPulse size={14} /> Patient <b>{Math.round(s.condition)}%</b>
          </p>
          <progress max={100} value={s.condition} />
          <p>
            <Shield size={14} /> Vehicle <b>{Math.round(100 - s.damage)}%</b>
          </p>
          <progress max={100} value={100 - s.damage} />
          <small>
            {s.fuel.toFixed(0)}% fuel · {s.onboard.length}/{s.vehicle.capacity}{" "}
            patients
          </small>
        </div>
      </div>
      <div className="drive-buttons">
        <div>
          <button aria-label="Steer left" {...press("left")}>
            <ChevronLeft />
          </button>
          <button
            className="steering-wheel"
            aria-label="Drag steering wheel"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              turnWheel(e);
            }}
            onPointerMove={(e) => {
              if (e.buttons) turnWheel(e);
            }}
            onPointerUp={releaseWheel}
            onPointerCancel={releaseWheel}
            onLostPointerCapture={releaseWheel}
          >
            <SteeringWheel
              size={42}
              style={{ transform: `rotate(${wheel}deg)` }}
            />
          </button>
          <button aria-label="Steer right" {...press("right")}>
            <ChevronRight />
          </button>
        </div>
        <button
          className={s.siren ? "siren active" : "siren"}
          aria-label="Toggle siren"
          onClick={() => {
            s.toggleSiren();
            setTick((t) => t + 1);
          }}
        >
          <Siren size={21} />
          <small>SIREN [Q]</small>
        </button>
        <div>
          <button
            className="brake-pedal"
            aria-label="Brake"
            {...press("brake")}
          >
            BRAKE
          </button>
          <button aria-label="Reverse" {...press("down")}>
            <ArrowDown />
          </button>
          <button
            className="accelerator"
            aria-label="Accelerate"
            {...press("up")}
          >
            <ArrowUp />
          </button>
        </div>
      </div>
      {s.stage !== "driving" && (
        <div className="foot-controls">
          <button aria-label="Walk north" {...press("up")}>
            <ArrowUp />
          </button>
          <div>
            <button aria-label="Walk west" {...press("left")}>
              <ArrowLeft />
            </button>
            <button aria-label="Walk south" {...press("down")}>
              <ArrowDown />
            </button>
            <button aria-label="Walk east" {...press("right")}>
              <ArrowRight />
            </button>
          </div>
        </div>
      )}
      <div className="keyboard-hint">
        WASD / ARROWS · DRIVE & WALK <i /> SPACE · BRAKE <i /> E · INTERACT{" "}
        <i /> Q · SIREN <i /> ESC · PAUSE
      </div>
      {s.stage === "treating" && (
        <div className="aid-overlay">
          <div className="aid-card">
            <span className="eyebrow">SMALL ACTIONS. REAL PURPOSE.</span>
            <h2>Let’s get them ready.</h2>
            <p>
              Fictional first-aid minigame—not medical guidance. Complete each
              step in order; Morgan will help with the stretcher.
            </p>
            {[
              "Prepare the kit",
              "Secure the bandage",
              "Stabilize for transport",
            ].map((label, i) => (
              <button
                key={label}
                disabled={s.aidStep !== i || s.elapsed < s.aidReady}
                onClick={() => {
                  s.aid(i);
                  setTick((t) => t + 1);
                }}
              >
                <span>{s.aidStep > i ? "✓" : `0${i + 1}`}</span>
                {label}
                <small>[{i + 1}]</small>
              </button>
            ))}
          </div>
        </div>
      )}
      {s.paused && (
        <div className="pause-overlay">
          <div>
            <span className="eyebrow">TAKE A BREATH, COMMANDER.</span>
            <h2>Your city can wait.</h2>
            <p>
              The simulation is paused. This shift is not saved when you leave;
              campaign progress and purchases are.
            </p>
            <button
              className="drive-primary"
              onClick={() => {
                s.paused = false;
                setTick((t) => t + 1);
              }}
            >
              <Play size={16} /> Resume shift
            </button>
            <button className="drive-secondary" onClick={onExit}>
              <LogOut size={16} /> Return to station
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
