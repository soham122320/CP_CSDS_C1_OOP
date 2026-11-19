import { useState } from "react";
import {
  Crosshair,
  Layers,
  Minus,
  Plus,
  Navigation,
  Route,
  X,
} from "lucide-react";
import type { GameState } from "../types/engine";
const coord = (cell: number) => ({
  x: 46 + (cell % 13) * 52,
  y: 46 + Math.floor(cell / 13) * 48,
});
export default function CityMap({
  state,
  onCivilian,
  onVehicle,
  visualize = false,
  revealed = 117,
  onCell,
}: {
  state: GameState;
  onCivilian: (id: number) => void;
  onVehicle: (id: number) => void;
  visualize?: boolean;
  revealed?: number;
  onCell?: (id: number) => void;
}) {
  const [zoom, setZoom] = useState(1),
    [routes, setRoutes] = useState(true),
    [layers, setLayers] = useState(false);
  const [labels, setLabels] = useState(true);
  const path = (cells: number[]) =>
    cells
      .map((c) => {
        const p = coord(c);
        return `${p.x},${p.y}`;
      })
      .join(" ");
  return (
    <section className="panel map-panel">
      <div className="panel-heading">
        <div className="heading-icon">
          <Navigation size={16} />
          <h2>Live city map</h2>
          <span className="live-tag">
            <i /> LIVE FEED
          </span>
        </div>
        <span className="muted tiny">
          SECTOR 07 <span className="separator">/</span> PUNE
        </span>
      </div>
      <div className="map-stage">
        <div className="map-info">
          <span className="map-dot" /> {state.scenario.name.toUpperCase()}{" "}
          <span className="map-weather">27°C · Clear skies</span>
        </div>
        <svg
          className="city-svg"
          viewBox={`${358 - 358 / zoom} ${244 - 244 / zoom} ${716 / zoom} ${488 / zoom}`}
          role="img"
          aria-label="Interactive 9 by 13 city map with rescue units, civilians, hospitals and blocked cells"
        >
          <defs>
            <pattern
              id="dots"
              width="8"
              height="8"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="1" cy="1" r=".55" fill="#526b79" opacity=".22" />
            </pattern>
            <pattern
              id="hazard"
              width="8"
              height="8"
              patternTransform="rotate(45)"
              patternUnits="userSpaceOnUse"
            >
              <rect width="3" height="8" fill="#ff5e35" opacity=".16" />
            </pattern>
            <filter id="glow">
              <feGaussianBlur stdDeviation="4" />
            </filter>
          </defs>
          <rect width="716" height="488" fill="#0c1921" />
          <rect width="716" height="488" fill="url(#dots)" />
          <path
            d="M520 -20C480 70 586 92 560 177S490 280 542 352 570 454 530 510"
            fill="none"
            stroke="#11333e"
            strokeWidth="37"
          />
          <path
            d="M520 -20C480 70 586 92 560 177S490 280 542 352 570 454 530 510"
            fill="none"
            stroke="#155062"
            strokeWidth="1"
            strokeDasharray="4 6"
          />
          {Array.from({ length: 117 }, (_, cell) => {
            const { x, y } = coord(cell);
            const blocked = state.map.blocked.includes(cell);
            const visited =
              visualize && state.path.visited.slice(0, revealed).includes(cell);
            return (
              <g
                key={cell}
                onClick={() => onCell?.(cell)}
                className={onCell ? "clickable" : ""}
              >
                <rect
                  x={x - 25}
                  y={y - 23}
                  width="50"
                  height="46"
                  rx="3"
                  fill={visited ? "#1677ff20" : "transparent"}
                  stroke={visited ? "#1677ff44" : "#60778315"}
                />
                {!blocked && (
                  <>
                    <rect
                      x={x - 19}
                      y={y - 17}
                      width={cell % 3 === 0 ? 15 : 34}
                      height="12"
                      rx="1.5"
                      fill={cell % 7 === 0 ? "#1a3436" : "#1a2831"}
                      stroke="#2a3942"
                      strokeWidth=".6"
                    />
                    <rect
                      x={x - 19}
                      y={y + 2}
                      width={cell % 4 === 0 ? 24 : 13}
                      height="15"
                      rx="1.5"
                      fill="#192831"
                      stroke="#293943"
                      strokeWidth=".6"
                    />
                    <rect
                      x={x + 1}
                      y={y + 2}
                      width="14"
                      height="15"
                      rx="1.5"
                      fill={cell % 6 === 0 ? "#183b32" : "#1b2c35"}
                      stroke="#2a3942"
                      strokeWidth=".6"
                    />
                  </>
                )}
                {blocked && (
                  <>
                    <rect
                      x={x - 24}
                      y={y - 22}
                      width="48"
                      height="44"
                      rx="2"
                      fill="#492a252a"
                    />
                    <rect
                      x={x - 24}
                      y={y - 22}
                      width="48"
                      height="44"
                      fill="url(#hazard)"
                      stroke="#ff5e3540"
                      strokeDasharray="3 3"
                    />
                    <path
                      d={`M${x - 6} ${y - 6}l12 12m0-12l-12 12`}
                      stroke="#ff774e"
                      strokeWidth="1.5"
                    />
                  </>
                )}
              </g>
            );
          })}
          {labels && (
            <g
              className="district-label"
              fill="#82949c"
              fontSize="8"
              letterSpacing="2.8"
            >
              <text x="80" y="119">
                NORTH DISTRICT
              </text>
              <text x="350" y="166">
                CITY CENTRE
              </text>
              <text x="90" y="355">
                WEST DISTRICT
              </text>
              <text x="565" y="311">
                EAST DISTRICT
              </text>
              <text x="285" y="448">
                RESPONSE BASE
              </text>
            </g>
          )}
          {routes &&
            state.vehicles
              .filter((v) => v.route.length > 0)
              .map((v) => (
                <g key={v.id}>
                  <polyline
                    points={path(v.route)}
                    fill="none"
                    stroke={
                      v.id === state.selectedVehicle ? "#00d9ff" : "#9b5de5"
                    }
                    strokeWidth="9"
                    opacity=".1"
                  />
                  <polyline
                    points={path(v.route)}
                    fill="none"
                    stroke={
                      v.id === state.selectedVehicle ? "#00d9ff" : "#9b5de5"
                    }
                    strokeWidth="2"
                    strokeLinejoin="round"
                    strokeDasharray="5 4"
                  />
                </g>
              ))}
          {visualize && (
            <polyline
              points={path(state.path.route)}
              fill="none"
              stroke="#00d9ff"
              strokeWidth="3"
              strokeLinejoin="round"
            />
          )}
          {state.facilities.map((f) => {
            const { x, y } = coord(f.cell);
            return (
              <g key={f.id} transform={`translate(${x},${y})`}>
                <rect
                  x="-13"
                  y="-13"
                  width="26"
                  height="26"
                  rx="6"
                  fill={f.type === "hospital" ? "#103d33" : "#4b3121"}
                  stroke={f.type === "hospital" ? "#16c784" : "#ff9f1c"}
                  strokeWidth="1"
                />
                {f.type === "hospital" ? (
                  <path d="M-2-8h4v6h6v4H2v6h-4V2h-6v-4h6z" fill="#49dfac" />
                ) : (
                  <path
                    d="M0-9C1-3 7-4 6 2S0 10-5 5C-9 0-2-2 0-9Z"
                    fill="#ffb34d"
                  />
                )}
              </g>
            );
          })}
          {state.civilians
            .filter((c) => c.status !== "rescued" && c.status !== "onboard")
            .map((c) => {
              const { x, y } = coord(c.cell);
              const color =
                c.severity === 3
                  ? "#f04452"
                  : c.severity === 2
                    ? "#ff9f1c"
                    : "#ffd43b";
              return (
                <g
                  key={c.id}
                  className="map-marker"
                  role="button"
                  tabIndex={0}
                  aria-label={`Select ${c.name}`}
                  onClick={() => onCivilian(c.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onCivilian(c.id);
                  }}
                  transform={`translate(${x},${y})`}
                >
                  <title>
                    {c.name} · {c.severity === 3 ? "Critical" : "Needs rescue"}
                  </title>
                  <circle r="17" fill={color} opacity=".09" />
                  <circle
                    r="10"
                    fill="#15252c"
                    stroke={color}
                    strokeWidth="1.5"
                  />
                  <circle cy="-3" r="2.2" fill={color} />
                  <path
                    d="M-3 5v-2a3 3 0 016 0v2"
                    fill="none"
                    stroke={color}
                    strokeWidth="1.5"
                  />
                  {c.severity === 3 && (
                    <circle cx="10" cy="-9" r="3" fill={color} />
                  )}
                </g>
              );
            })}
          {state.vehicles.map((v) => {
            const { x, y } = coord(v.cell);
            return (
              <g
                key={v.id}
                className="vehicle-marker map-marker"
                role="button"
                tabIndex={0}
                aria-label={`Select unit ${v.id + 1}`}
                onClick={() => onVehicle(v.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onVehicle(v.id);
                }}
                style={{ transform: `translate(${x}px,${y}px)` }}
              >
                <title>
                  {v.type} · {v.fuel}% fuel
                </title>
                {state.selectedVehicle === v.id && (
                  <rect
                    x="-19"
                    y="-19"
                    width="38"
                    height="38"
                    rx="11"
                    fill="#00d9ff15"
                    stroke="#00d9ff55"
                    strokeDasharray="3 3"
                  />
                )}
                <rect
                  x="-12"
                  y="-12"
                  width="24"
                  height="24"
                  rx="6"
                  fill="#0e3749"
                  stroke="#45cdff"
                />
                <path
                  d="M-7-3h8v8h-8zM1 0h4l2 3v2H1M-4-6v6m-3-3h6"
                  fill="none"
                  stroke="#75dbff"
                  strokeWidth="1.5"
                />
                <circle cx="-4" cy="6" r="1.5" fill="#75dbff" />
                <circle cx="5" cy="6" r="1.5" fill="#75dbff" />
                <text
                  x="0"
                  y="29"
                  textAnchor="middle"
                  fontSize="8"
                  fill="#80c5dc"
                  fontFamily="monospace"
                >
                  0{v.id + 1}
                </text>
              </g>
            );
          })}
          <g transform="translate(672 48)" stroke="#81949e" fill="none">
            <path d="M0-10L-4 5 0 2 4 5Z" />
            <text
              x="0"
              y="-15"
              textAnchor="middle"
              fill="#81949e"
              stroke="none"
              fontSize="8"
            >
              N
            </text>
          </g>
        </svg>
        <div className="map-tools">
          <button
            aria-label="Zoom in"
            onClick={() => setZoom(Math.min(1.6, zoom + 0.2))}
          >
            <Plus size={16} />
          </button>
          <button
            aria-label="Zoom out"
            onClick={() => setZoom(Math.max(1, zoom - 0.2))}
          >
            <Minus size={16} />
          </button>
          <span />
          <button aria-label="Reset map view" onClick={() => setZoom(1)}>
            <Crosshair size={16} />
          </button>
          <button aria-label="Map layers" onClick={() => setLayers(!layers)}>
            <Layers size={16} />
          </button>
        </div>
        {layers && (
          <div className="layer-menu">
            <strong>Map layers</strong>
            <button aria-label="Close layers" onClick={() => setLayers(false)}>
              <X size={13} />
            </button>
            <label>
              <input
                type="checkbox"
                checked={routes}
                onChange={(e) => setRoutes(e.target.checked)}
              />{" "}
              Rescue routes
            </label>
            <label>
              <input
                type="checkbox"
                checked={labels}
                onChange={(e) => setLabels(e.target.checked)}
              />{" "}
              District labels
            </label>
          </div>
        )}
        <div className="map-coords">
          18.5204° N, 73.8567° E <span>GRID 9 × 13</span>
        </div>
      </div>
      <div className="map-legend">
        <span>
          <i className="legend-circle red" /> Civilian
        </span>
        <span>
          <i className="legend-square blue" /> Rescue unit
        </span>
        <span>
          <i className="legend-square green" /> Hospital
        </span>
        <span>
          <i className="legend-square amber" /> Fire station
        </span>
        <span>
          <i className="legend-block" /> Blocked
        </span>
        <button
          className={routes ? "route-toggle active" : "route-toggle"}
          onClick={() => setRoutes(!routes)}
        >
          <Route size={12} /> Routes
        </button>
      </div>
    </section>
  );
}
