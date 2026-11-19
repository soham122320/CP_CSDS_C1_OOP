/**
 * OOP & Telemetry Inspector Drawer (Toggle Key: F2)
 * for SHARD-4: BLACKOUT PROTOCOL
 */

import React from 'react';
import { TelemetryInspectorData } from '@shared/types.js';

interface InspectorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  telemetry: TelemetryInspectorData | null;
}

export const InspectorDrawer: React.FC<InspectorDrawerProps> = ({ isOpen, onClose, telemetry }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-gray-950/95 border-l border-amber-500/80 shadow-2xl backdrop-blur-xl flex flex-col font-mono text-xs overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900/60">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-amber-400 rotate-45 inline-block" />
          <h2 className="text-sm font-bold text-amber-400 tracking-wider">
            SYSTEM // OOP & TELEMETRY INSPECTOR [F2]
          </h2>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white px-2 py-0.5 bg-gray-800 rounded border border-gray-700 hover:border-amber-400"
        >
          CLOSE
        </button>
      </div>

      <div className="p-4 overflow-y-auto space-y-5">
        {/* Real-time Telemetry Metrics */}
        <div>
          <div className="text-[11px] font-bold text-cyan-400 tracking-wider uppercase border-b border-gray-800 pb-1 mb-2">
            1. RUNTIME PERFORMANCE
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-gray-900/80 p-2 rounded border border-gray-800">
              <span className="text-gray-400">RENDER FPS: </span>
              <span className="font-bold text-emerald-400">{telemetry?.fps || 60} Hz</span>
            </div>
            <div className="bg-gray-900/80 p-2 rounded border border-gray-800">
              <span className="text-gray-400">SERVER TICKS: </span>
              <span className="font-bold text-cyan-400">{telemetry?.serverTickRate || 30} Hz</span>
            </div>
            <div className="bg-gray-900/80 p-2 rounded border border-gray-800">
              <span className="text-gray-400">ROUND-TRIP PING: </span>
              <span className="font-bold text-amber-400">{telemetry?.ping || 15} ms</span>
            </div>
            <div className="bg-gray-900/80 p-2 rounded border border-gray-800">
              <span className="text-gray-400">NET BANDWIDTH: </span>
              <span className="font-bold text-purple-400">~6.4 KB/s</span>
            </div>
          </div>
        </div>

        {/* Live Entity Counts */}
        <div>
          <div className="text-[11px] font-bold text-cyan-400 tracking-wider uppercase border-b border-gray-800 pb-1 mb-2">
            2. ACTIVE WORLD ACTORS
          </div>
          <div className="grid grid-cols-3 gap-2 text-[10px]">
            <div className="bg-gray-900/60 p-2 rounded border border-gray-800/80 text-center">
              <div className="text-gray-400">OPERATIVES</div>
              <div className="text-lg font-bold text-cyan-300">
                {telemetry?.entityCounts.operatives || 4}
              </div>
            </div>
            <div className="bg-gray-900/60 p-2 rounded border border-gray-800/80 text-center">
              <div className="text-gray-400">ENEMIES</div>
              <div className="text-lg font-bold text-red-400">
                {telemetry?.entityCounts.enemies || 0}
              </div>
            </div>
            <div className="bg-gray-900/60 p-2 rounded border border-gray-800/80 text-center">
              <div className="text-gray-400">PROJECTILES</div>
              <div className="text-lg font-bold text-amber-300">
                {telemetry?.entityCounts.projectiles || 0}
              </div>
            </div>
            <div className="bg-gray-900/60 p-2 rounded border border-gray-800/80 text-center">
              <div className="text-gray-400">PARTICLES</div>
              <div className="text-lg font-bold text-emerald-400">
                {telemetry?.entityCounts.particles || 0}
              </div>
            </div>
            <div className="bg-gray-900/60 p-2 rounded border border-gray-800/80 text-center">
              <div className="text-gray-400">FLOOR DECALS</div>
              <div className="text-lg font-bold text-purple-400">
                {telemetry?.entityCounts.decals || 0}
              </div>
            </div>
            <div className="bg-gray-900/60 p-2 rounded border border-gray-800/80 text-center">
              <div className="text-gray-400">CRATES</div>
              <div className="text-lg font-bold text-blue-400">
                {telemetry?.entityCounts.crates || 6}
              </div>
            </div>
          </div>
        </div>

        {/* Polymorphic Class Hierarchy Tree */}
        <div>
          <div className="text-[11px] font-bold text-cyan-400 tracking-wider uppercase border-b border-gray-800 pb-1 mb-2">
            3. OOP CLASS INHERITANCE HIERARCHY
          </div>
          <div className="bg-gray-900/80 p-3 rounded-lg border border-gray-800 text-[11px] text-gray-300 leading-relaxed overflow-x-auto">
            <div className="text-amber-400 font-bold">abstract class GameEntity</div>
            <div className="pl-3 border-l border-gray-700">
              <div>├── <span className="text-cyan-400 font-bold">abstract class Operative</span> (polymorphic useSkill)</div>
              <div className="pl-6 border-l border-gray-700 space-y-0.5 text-gray-400">
                <div>├── <span className="text-cyan-300">VanguardOperative</span> (Aegis Riot Shield)</div>
                <div>├── <span className="text-purple-300">PhantomOperative</span> (Active Camo + Crit)</div>
                <div>├── <span className="text-orange-300">BreacherOperative</span> (Cluster Breaker)</div>
                <div>└── <span className="text-emerald-300">MedicOperative</span> (Nano-Heal Beacon & 2x Hack)</div>
              </div>
              <div>└── <span className="text-red-400 font-bold">abstract class HostileUnit</span> (FSM State Machine)</div>
              <div className="pl-6 border-l border-gray-700 space-y-0.5 text-gray-400">
                <div>├── <span className="text-red-300">StalkerDrone</span> (Lunge Swarmer)</div>
                <div>├── <span className="text-indigo-300">EnforcerSynth</span> (Cover & Telegraphed Burst)</div>
                <div>├── <span className="text-blue-300">HeavyJuggernaut</span> (Shield & Rear Weak-Spot)</div>
                <div>├── <span className="text-violet-300">CoreWarden</span> (3-Phase Monolith Boss)</div>
                <div>└── <span className="text-purple-300">ShieldPylon</span> (Destructible Conduit)</div>
              </div>
            </div>

            <div className="text-amber-400 font-bold mt-3">abstract class Weapon</div>
            <div className="pl-3 border-l border-gray-700 space-y-0.5 text-gray-400">
              <div>├── <span className="text-cyan-300">Mk4PulseRifle</span> (RapidProjectile full-auto)</div>
              <div>├── <span className="text-orange-300">Sg12BreachShotgun</span> (PelletSpread 8-pellet pump)</div>
              <div>├── <span className="text-emerald-300">Viper9Smg</span> (High-RPM low-spread sprint)</div>
              <div>├── <span className="text-purple-300">RailXSniper</span> (HitscanRay 3-enemy pierce 3x crit)</div>
              <div>└── <span className="text-gray-300">P45Sidearm</span> (Infinite reserve backup)</div>
            </div>
          </div>
        </div>

        {/* Live Combat Event Stream */}
        <div>
          <div className="text-[11px] font-bold text-cyan-400 tracking-wider uppercase border-b border-gray-800 pb-1 mb-2">
            4. EVENT TELEMETRY STREAM
          </div>
          <div className="bg-gray-900/60 p-2.5 rounded border border-gray-800 space-y-1 text-[10px]">
            {telemetry?.recentEvents.length === 0 ? (
              <span className="text-gray-500">Awaiting combat events...</span>
            ) : (
              telemetry?.recentEvents.map((evt, idx) => (
                <div key={idx} className="text-gray-300 font-mono">
                  <span className="text-cyan-500">[{new Date().toLocaleTimeString()}]</span> {evt}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
