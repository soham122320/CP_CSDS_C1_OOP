/**
 * Station Erebus Tactical Minimap Radar
 * for SHARD-4: BLACKOUT PROTOCOL
 */

import React from 'react';
import { GameSnapshot, OperativeState } from '@shared/types.js';
import { CONSTANTS } from '@shared/constants.js';

interface MinimapProps {
  snapshot: GameSnapshot | null;
  localPlayerId: string;
}

export const Minimap: React.FC<MinimapProps> = ({ snapshot, localPlayerId }) => {
  if (!snapshot) return null;

  const mapW = CONSTANTS.MAP_WIDTH_TILES * CONSTANTS.TILE_SIZE;
  const mapH = CONSTANTS.MAP_HEIGHT_TILES * CONSTANTS.TILE_SIZE;
  const radarW = 150;
  const radarH = 112;

  const toRadarX = (wx: number) => (wx / mapW) * radarW;
  const toRadarY = (wy: number) => (wy / mapH) * radarH;

  const localOp = snapshot.operatives.find((o) => o.id === localPlayerId);

  return (
    <div className="relative border border-cyan-500/40 bg-gray-950/80 backdrop-blur-md rounded-lg p-1.5 shadow-lg shadow-cyan-950/40">
      <div className="flex items-center justify-between pb-1 border-b border-gray-800 text-[10px] text-cyan-400 font-mono tracking-wider">
        <span>RADAR // EREBUS</span>
        <span className="text-gray-400">SEC-0{snapshot.currentSector + 1}</span>
      </div>

      <div
        className="relative overflow-hidden bg-gray-900/60 rounded mt-1 border border-gray-800/80"
        style={{ width: `${radarW}px`, height: `${radarH}px` }}
      >
        {/* Sector Grid Overlay */}
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-2 opacity-20 pointer-events-none">
          <div className="border-r border-b border-cyan-500" />
          <div className="border-r border-b border-cyan-500" />
          <div className="border-b border-cyan-500" />
          <div className="border-r border-cyan-500" />
          <div className="border-r border-cyan-500" />
          <div />
        </div>

        {/* Forensic Terminals */}
        {snapshot.terminals.map((t) => (
          <div
            key={t.id}
            className={`absolute w-2 h-2 -translate-x-1/2 -translate-y-1/2 rotate-45 ${
              t.hacked ? 'bg-emerald-400' : 'bg-cyan-400 animate-pulse'
            }`}
            style={{ left: `${toRadarX(t.x)}px`, top: `${toRadarY(t.y)}px` }}
            title={`Terminal: ${t.sectorName}`}
          />
        ))}

        {/* Extraction Pads in Central Vault */}
        {snapshot.extractionPads.map((p) => (
          <div
            key={p.id}
            className={`absolute w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border ${
              p.isOccupied
                ? 'bg-emerald-500 border-emerald-300'
                : 'bg-cyan-900/40 border-cyan-400'
            }`}
            style={{ left: `${toRadarX(p.x)}px`, top: `${toRadarY(p.y)}px` }}
          />
        ))}

        {/* Boss Blip */}
        {snapshot.enemies
          .filter((e) => e.type === 'warden')
          .map((b) => (
            <div
              key={b.id}
              className="absolute w-3 h-3 -translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full animate-ping"
              style={{ left: `${toRadarX(b.x)}px`, top: `${toRadarY(b.y)}px` }}
            />
          ))}

        {/* Operatives Blips */}
        {snapshot.operatives.map((op) => {
          const isLocal = op.id === localPlayerId || (!op.isBot && snapshot.operatives.filter((o) => !o.isBot).length === 1);
          const roleColors: Record<string, string> = {
            vanguard: 'bg-cyan-400',
            phantom: 'bg-purple-400',
            breacher: 'bg-orange-400',
            medic: 'bg-emerald-400',
          };
          const colorClass = roleColors[op.operativeClass] || 'bg-cyan-400';

          return (
            <div
              key={op.id}
              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-75 ${
                isLocal ? 'w-2.5 h-2.5 ring-2 ring-white z-10 shadow-lg shadow-cyan-400/50' : 'w-2 h-2'
              } ${op.isDowned ? 'bg-red-500 animate-bounce' : colorClass}`}
              style={{ left: `${toRadarX(op.x)}px`, top: `${toRadarY(op.y)}px` }}
              title={`${op.name} (${op.operativeClass})`}
            />
          );
        })}
      </div>
    </div>
  );
};
