/**
 * Mission Epilogue & Match Results Screen
 * for SHARD-4: BLACKOUT PROTOCOL
 * 
 * Displays the definitive single ending narrative, per-player match telemetry,
 * MVP award badge, and JSON export match-log button.
 */

import React from 'react';
import { GameSnapshot } from '@shared/types.js';

interface EndingScreenProps {
  snapshot: GameSnapshot | null;
  onRestart: () => void;
}

export const EndingScreen: React.FC<EndingScreenProps> = ({ snapshot, onRestart }) => {
  if (!snapshot) return null;

  // Calculate team aggregate stats
  const totalKills = snapshot.operatives.reduce((acc, op) => acc + op.kills, 0);
  const totalHeadshots = snapshot.operatives.reduce((acc, op) => acc + op.headshots, 0);
  const totalDamage = snapshot.operatives.reduce((acc, op) => acc + op.damageDealt, 0);
  const totalRevives = snapshot.operatives.reduce((acc, op) => acc + op.revivesPerformed, 0);

  // MVP Calculation based on score: kills * 100 + damage + revives * 250 + hacks * 300
  let mvpOp = snapshot.operatives[0];
  let maxScore = -1;

  for (const op of snapshot.operatives) {
    const score = op.kills * 100 + op.damageDealt + op.revivesPerformed * 250 + op.terminalsHacked * 300;
    if (score > maxScore) {
      maxScore = score;
      mvpOp = op;
    }
  }

  // Export match log as JSON
  const handleExportJson = () => {
    const matchLog = {
      game: 'SHARD-4: BLACKOUT PROTOCOL',
      station: 'Station Erebus',
      timestamp: new Date().toISOString(),
      result: 'VICTORY - BLACKOUT PROTOCOL CONTAINED',
      culpritRevealed: 'Chief Systems Architect Dr. Maya Vance',
      conspiracySummary:
        'Dr. Maya Vance initiated the station blackout override using Directorate Level 4 credentials ' +
        'to facilitate extraction of the Core Warden synthetic neural core for Off-World Syndicate Helios Corp. ' +
        'All four forensic operatives successfully extracted the four cipher shards, neutralized the Core Warden, and synchronized extraction.',
      teamStats: {
        totalKills,
        totalHeadshots,
        totalDamage,
        totalRevives,
        shardsRecovered: snapshot.shardsRecovered,
      },
      mvp: {
        name: mvpOp.name,
        class: mvpOp.operativeClass,
        kills: mvpOp.kills,
        damage: mvpOp.damageDealt,
      },
      operatives: snapshot.operatives.map((op) => ({
        id: op.id,
        name: op.name,
        class: op.operativeClass,
        kills: op.kills,
        headshots: op.headshots,
        damageDealt: op.damageDealt,
        revivesPerformed: op.revivesPerformed,
        terminalsHacked: op.terminalsHacked,
      })),
      cipherLogs: snapshot.mysteryLogs,
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(matchLog, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `SHARD4_MATCH_LOG_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-gray-950 border border-cyan-500 rounded-2xl shadow-2xl shadow-cyan-950/80 p-6 sm:p-8 space-y-6 my-auto">
        {/* Title & Epilogue Banner */}
        <div className="text-center space-y-2 border-b border-gray-800 pb-5">
          <div className="inline-block px-3 py-1 bg-emerald-950/80 border border-emerald-500 text-emerald-400 font-mono text-xs font-bold tracking-widest rounded-full animate-pulse">
            MISSION ACCOMPLISHED // BLACKOUT PROTOCOL CONTAINED
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-cyan-400 font-mono">
            STATION EREBUS EVACUATION COMPLETE
          </h1>
          <p className="text-xs sm:text-sm text-gray-300 max-w-2xl mx-auto font-sans leading-relaxed">
            The emergency evacuation pod launched moments before the reactor stabilizer engaged.
            The decoded Cipher Shards definitively link Chief Systems Architect Dr. Maya Vance to the
            deliberate sabotage and illegal synthetic neural extraction for Helios Corp. The Core Warden
            has been neutralized.
          </p>
        </div>

        {/* Aggregate Team Statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-center">
          <div className="bg-gray-900/60 border border-gray-800 p-3 rounded-lg">
            <div className="text-gray-400 text-xs">SYNTHS PURGED</div>
            <div className="text-2xl font-bold text-cyan-400 mt-1">{totalKills}</div>
          </div>
          <div className="bg-gray-900/60 border border-gray-800 p-3 rounded-lg">
            <div className="text-gray-400 text-xs">CRITICAL WEAK-SPOTS</div>
            <div className="text-2xl font-bold text-amber-400 mt-1">{totalHeadshots}</div>
          </div>
          <div className="bg-gray-900/60 border border-gray-800 p-3 rounded-lg">
            <div className="text-gray-400 text-xs">TOTAL DAMAGE</div>
            <div className="text-2xl font-bold text-red-400 mt-1">{totalDamage}</div>
          </div>
          <div className="bg-gray-900/60 border border-gray-800 p-3 rounded-lg">
            <div className="text-gray-400 text-xs">SQUAD REVIVES</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">{totalRevives}</div>
          </div>
        </div>

        {/* MVP Award Badge */}
        {mvpOp && (
          <div className="bg-gradient-to-r from-cyan-950/60 via-purple-950/40 to-cyan-950/60 border border-cyan-500/80 p-4 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center text-xl">
                🎖
              </div>
              <div>
                <div className="text-xs font-mono font-bold text-cyan-400 tracking-wider">
                  MISSION MVP // MOST VALUABLE OPERATIVE
                </div>
                <div className="text-lg font-bold text-white font-mono">
                  {mvpOp.name}{' '}
                  <span className="text-xs text-gray-400 font-normal uppercase">
                    ({mvpOp.operativeClass})
                  </span>
                </div>
              </div>
            </div>
            <div className="font-mono text-right text-xs">
              <div className="text-gray-400">DAMAGE: <span className="text-white font-bold">{mvpOp.damageDealt}</span></div>
              <div className="text-gray-400">KILLS: <span className="text-cyan-400 font-bold">{mvpOp.kills}</span></div>
            </div>
          </div>
        )}

        {/* Per-Player Scorecard Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs border border-gray-800 rounded-lg overflow-hidden">
            <thead className="bg-gray-900 text-gray-400 border-b border-gray-800">
              <tr>
                <th className="p-2.5">OPERATIVE</th>
                <th className="p-2.5">CLASS</th>
                <th className="p-2.5 text-center">KILLS</th>
                <th className="p-2.5 text-center">WEAK-SPOTS</th>
                <th className="p-2.5 text-center">DAMAGE</th>
                <th className="p-2.5 text-center">REVIVES</th>
                <th className="p-2.5 text-center">HACKS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/80 bg-gray-950/80">
              {snapshot.operatives.map((op) => (
                <tr key={op.id} className="hover:bg-gray-900/40">
                  <td className="p-2.5 font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    {op.name}
                  </td>
                  <td className="p-2.5 uppercase text-cyan-400">{op.operativeClass}</td>
                  <td className="p-2.5 text-center text-gray-200">{op.kills}</td>
                  <td className="p-2.5 text-center text-amber-400">{op.headshots}</td>
                  <td className="p-2.5 text-center text-red-400">{op.damageDealt}</td>
                  <td className="p-2.5 text-center text-emerald-400">{op.revivesPerformed}</td>
                  <td className="p-2.5 text-center text-purple-400">{op.terminalsHacked}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-gray-800 font-mono">
          <button
            onClick={handleExportJson}
            className="w-full sm:w-auto px-5 py-2.5 bg-gray-900 hover:bg-gray-800 border border-cyan-500/70 text-cyan-300 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2"
          >
            <span>💾 EXPORT MATCH LOG (JSON)</span>
          </button>

          <button
            onClick={onRestart}
            className="w-full sm:w-auto px-8 py-2.5 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-black font-bold text-xs rounded-lg shadow-lg shadow-cyan-950/80 transition-all"
          >
            RETURN TO LOBBY
          </button>
        </div>
      </div>
    </div>
  );
};
