/**
 * Forensic Evidence Journal Modal
 * for SHARD-4: BLACKOUT PROTOCOL
 * 
 * Reveals the 4 decoded Cipher Shards pointing to Chief Systems Architect Dr. Maya Vance.
 */

import React from 'react';
import { CipherLog } from '@shared/types.js';

interface JournalModalProps {
  logs: CipherLog[];
  onClose: () => void;
}

export const JournalModal: React.FC<JournalModalProps> = ({ logs, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="relative w-full max-w-2xl bg-gray-950 border border-cyan-500/80 rounded-xl shadow-2xl shadow-cyan-950/60 flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900/50">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-cyan-400 rotate-45 inline-block" />
            <h2 className="text-base sm:text-lg font-mono font-bold text-cyan-400 tracking-wider">
              FORENSIC INVESTIGATION JOURNAL // CIPHER SHARDS
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white font-mono text-sm px-2.5 py-1 bg-gray-800 rounded border border-gray-700 hover:border-cyan-500 transition-colors"
          >
            ESC / CLOSE
          </button>
        </div>

        {/* Content list */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 font-mono text-xs">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-gray-500 font-mono">
              <p className="text-sm">NO CIPHER SHARDS RECOVERED YET.</p>
              <p className="text-xs mt-1 text-gray-600">
                Infiltrate Sector Terminals and hold [E] to hack and extract forensic evidence.
              </p>
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.shardIndex}
                className="border border-cyan-900/60 bg-gray-900/40 rounded-lg p-4 space-y-2"
              >
                <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                  <span className="font-bold text-cyan-300 tracking-wider">
                    [SHARD 0{log.shardIndex}/04] {log.title}
                  </span>
                  <span className="text-[10px] text-gray-400">{log.timestamp}</span>
                </div>

                <div className="text-[11px] text-gray-400">
                  <span className="text-gray-500">SECTOR: </span>
                  <span className="text-gray-300 font-semibold">{log.sector}</span>
                  <span className="text-gray-500 ml-3">RECOVERED BY: </span>
                  <span className="text-cyan-400">{log.recoveredBy}</span>
                </div>

                <div className="bg-gray-950/80 p-3 rounded border border-gray-800/80 text-gray-300 leading-relaxed font-sans text-xs">
                  {log.logText}
                </div>

                <div className="text-[11px] text-amber-300 font-bold bg-amber-950/30 p-2 rounded border border-amber-900/40">
                  💡 {log.clueSummary}
                </div>
              </div>
            ))
          )}

          {logs.length === 4 && (
            <div className="bg-red-950/50 border border-red-500 p-4 rounded-lg text-center space-y-1">
              <div className="text-sm font-bold text-red-400 font-mono">
                CONSPIRACY RESOLVED: CULPRIT IDENTIFIED
              </div>
              <p className="text-xs text-gray-300">
                All 4 cryptographic fragments establish that Chief Systems Architect Dr. Maya Vance
                sabotaged the reactor to purge Station Erebus and smuggle the Core Warden neural core
                to Helios Syndicate. Proceed to Central Vault to neutralize the Core Warden!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
