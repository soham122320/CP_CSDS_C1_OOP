/**
 * Main Tactical Lobby Screen & Class Selection
 * for SHARD-4: BLACKOUT PROTOCOL
 */

import React, { useState, useEffect } from 'react';
import { RoomInfo, OperativeClass } from '@shared/types.js';
import { socketClient } from '../net/socketClient.js';
import { CONSTANTS } from '@shared/constants.js';

interface LobbyScreenProps {
  onGameStarted: (localId: string, roomInfo: RoomInfo) => void;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({ onGameStarted }) => {
  const [playerName, setPlayerName] = useState('OPERATIVE-01');
  const [selectedClass, setSelectedClass] = useState<OperativeClass>('vanguard');
  const [joinCode, setJoinCode] = useState('');
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lanUrl, setLanUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Fetch server LAN IP info
    fetch('/api/info')
      .then((res) => res.json())
      .then((data) => {
        if (data.lanIp) {
          setLanUrl(`http://${data.lanIp}:5173`);
        }
      })
      .catch(() => {
        setLanUrl(window.location.origin);
      });

    // Listen to room updates from server
    socketClient.onRoomUpdated((info: RoomInfo) => {
      setRoomInfo(info);
    });

    socketClient.onMatchStarted((info: RoomInfo) => {
      const myPlayer = info.players.find((p) => p.id === socketClient.socket?.id) || info.players.find((p) => !p.isBot) || info.players[0];
      const id = myPlayer?.id || socketClient.socket?.id || 'local_operative';
      onGameStarted(id, info);
    });
  }, [onGameStarted]);

  const handleCreateRoom = async () => {
    setErrorMessage(null);
    const res = await socketClient.createRoom(playerName, selectedClass);
    if (res.success && res.roomInfo) {
      setRoomInfo(res.roomInfo);
    } else {
      setErrorMessage(res.error || 'Failed to create room.');
    }
  };

  const handleJoinRoom = async () => {
    if (!joinCode.trim()) {
      setErrorMessage('Please enter a 4-character Room Code.');
      return;
    }
    setErrorMessage(null);
    const res = await socketClient.joinRoom(joinCode.trim().toUpperCase(), playerName, selectedClass);
    if (res.success && res.roomInfo) {
      setRoomInfo(res.roomInfo);
    } else {
      setErrorMessage(res.error || 'Failed to join room.');
    }
  };

  const handleStartSolo = async () => {
    setErrorMessage(null);
    const res = await socketClient.startSoloGame(playerName, selectedClass);
    if (res.success && res.roomInfo) {
      const myPlayer = res.roomInfo.players.find((p) => !p.isBot) || res.roomInfo.players[0];
      const id = myPlayer?.id || socketClient.socket?.id || 'local_solo_commander';
      onGameStarted(id, res.roomInfo);
    } else {
      setErrorMessage(res.error || 'Failed to launch solo mission.');
    }
  };

  const handleToggleReady = () => {
    if (roomInfo) {
      socketClient.toggleReady(roomInfo.code);
    }
  };

  const handleStartMatch = async () => {
    if (roomInfo) {
      const res = await socketClient.startMatch(roomInfo.code);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to start match.');
      }
    }
  };

  const handleSelectClass = (cls: OperativeClass) => {
    setSelectedClass(cls);
    if (roomInfo) {
      socketClient.selectClass(roomInfo.code, cls);
    }
  };

  const copyLanUrl = () => {
    if (lanUrl) {
      navigator.clipboard.writeText(lanUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isHost = roomInfo && socketClient.socket && roomInfo.hostId === socketClient.socket.id;

  return (
    <div className="relative w-full h-full min-h-screen flex items-center justify-center bg-gray-950 p-4 sm:p-6 overflow-y-auto">
      {/* Background Cyber Grid & Vignette */}
      <div className="absolute inset-0 scanlines pointer-events-none opacity-40" />
      <div className="absolute inset-0 bg-radial from-transparent via-gray-950/60 to-gray-950 pointer-events-none" />

      <div className="relative z-10 w-full max-w-4xl bg-gray-950/90 border border-cyan-500/60 rounded-2xl shadow-2xl shadow-cyan-950/80 p-6 sm:p-8 space-y-6">
        {/* Title Header */}
        <div className="text-center space-y-2 border-b border-gray-800 pb-5">
          <div className="flex items-center justify-center gap-2">
            <span className="w-2.5 h-2.5 bg-cyan-400 rotate-45 inline-block" />
            <span className="text-xs font-mono font-bold tracking-widest text-cyan-400">
              4-PLAYER REAL-TIME CO-OP TACTICAL SHOOTER & FORENSIC MYSTERY
            </span>
            <span className="w-2.5 h-2.5 bg-cyan-400 rotate-45 inline-block" />
          </div>
          <h1 className="text-3xl sm:text-5xl font-mono font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-cyan-300">
            SHARD-4: BLACKOUT PROTOCOL
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 font-sans max-w-xl mx-auto">
            Infiltrate Station Erebus, recover the 4 Cipher Shards, uncover the sabotage culprit,
            neutralize the Core Warden, and hold the 4 Extraction Sync Pads together.
          </p>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="bg-red-950/80 border border-red-500 text-red-300 px-4 py-2 rounded-lg text-xs font-mono flex items-center justify-between">
            <span>⚠ {errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="text-gray-400 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {/* LAN Wi-Fi Phone Join Banner */}
        <div className="bg-cyan-950/30 border border-cyan-800/80 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 text-lg">📱</span>
            <div>
              <span className="text-gray-300">JOIN FROM PHONES ON SAME WI-FI: </span>
              <span className="text-cyan-300 font-bold underline select-all">{lanUrl || 'Detecting...'}</span>
            </div>
          </div>
          <button
            onClick={copyLanUrl}
            className="px-3 py-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-600 text-cyan-300 rounded font-bold transition-colors"
          >
            {copied ? 'COPIED!' : 'COPY URL'}
          </button>
        </div>

        {/* Player Name Input */}
        <div className="flex flex-col sm:flex-row items-center gap-4 bg-gray-900/50 p-4 rounded-xl border border-gray-800">
          <label className="text-xs font-mono text-gray-400 whitespace-nowrap font-bold">
            CALLSIGN / NAME:
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value.toUpperCase())}
            maxLength={16}
            className="w-full bg-gray-950 border border-cyan-500/60 rounded px-3 py-2 text-cyan-300 font-mono font-bold text-sm focus:outline-none focus:border-cyan-400"
            placeholder="OPERATIVE-01"
          />
        </div>

        {/* Operative Class Selection */}
        <div>
          <div className="text-xs font-mono text-gray-400 font-bold tracking-wider mb-2">
            SELECT OPERATIVE CLASS:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 font-mono">
            {/* Vanguard */}
            <div
              onClick={() => handleSelectClass('vanguard')}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                selectedClass === 'vanguard'
                  ? 'border-cyan-400 bg-cyan-950/40 shadow-lg shadow-cyan-950/60'
                  : 'border-gray-800 bg-gray-900/40 hover:border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-cyan-400">VANGUARD</span>
                <span className="text-[10px] bg-cyan-950 px-1.5 py-0.5 rounded text-cyan-300">TANK</span>
              </div>
              <div className="text-[11px] text-gray-400 mt-1">140 HP // MK-IV RIFLE</div>
              <p className="text-[11px] text-gray-300 font-sans mt-2">
                Deployable 6s Riot Shield that blocks enemy bullets while squadmates shoot through.
              </p>
            </div>

            {/* Phantom */}
            <div
              onClick={() => handleSelectClass('phantom')}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                selectedClass === 'phantom'
                  ? 'border-purple-400 bg-purple-950/40 shadow-lg shadow-purple-950/60'
                  : 'border-gray-800 bg-gray-900/40 hover:border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-purple-400">PHANTOM</span>
                <span className="text-[10px] bg-purple-950 px-1.5 py-0.5 rounded text-purple-300">RECON</span>
              </div>
              <div className="text-[11px] text-gray-400 mt-1">90 HP // RAIL-X SNIPER</div>
              <p className="text-[11px] text-gray-300 font-sans mt-2">
                Active Camo for 8s (enemies de-aggro) + guaranteed 2x crit damage on next hit.
              </p>
            </div>

            {/* Breacher */}
            <div
              onClick={() => handleSelectClass('breacher')}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                selectedClass === 'breacher'
                  ? 'border-orange-400 bg-orange-950/40 shadow-lg shadow-orange-950/60'
                  : 'border-gray-800 bg-gray-900/40 hover:border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-orange-400">BREACHER</span>
                <span className="text-[10px] bg-orange-950 px-1.5 py-0.5 rounded text-orange-300">CQC</span>
              </div>
              <div className="text-[11px] text-gray-400 mt-1">120 HP // SG-12 SHOTGUN</div>
              <p className="text-[11px] text-gray-300 font-sans mt-2">
                Cluster Breaker launching 5 cluster EMP/Frag explosives that stun and shred armor.
              </p>
            </div>

            {/* Medic */}
            <div
              onClick={() => handleSelectClass('medic')}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                selectedClass === 'medic'
                  ? 'border-emerald-400 bg-emerald-950/40 shadow-lg shadow-emerald-950/60'
                  : 'border-gray-800 bg-gray-900/40 hover:border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-400">MEDIC</span>
                <span className="text-[10px] bg-emerald-950 px-1.5 py-0.5 rounded text-emerald-300">SUPPORT</span>
              </div>
              <div className="text-[11px] text-gray-400 mt-1">100 HP // VIPER-9 SMG</div>
              <p className="text-[11px] text-gray-300 font-sans mt-2">
                Nano-Heal & Ammo Beacon (AoE 8s) + hacks terminals and revives teammates 2x faster.
              </p>
            </div>
          </div>
        </div>

        {/* Lobby Actions: Room Roster OR Create / Join */}
        {!roomInfo ? (
          <div className="space-y-4 pt-4 border-t border-gray-800 font-mono">
            {/* Solo Instant Launch Button */}
            <button
              onClick={handleStartSolo}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-black font-bold text-sm rounded-xl shadow-xl shadow-emerald-950/60 flex items-center justify-center gap-2 transition-all transform active:scale-98"
            >
              <span>⚡ SOLO MODE: INSTANT START (+3 AI SQUADMATES)</span>
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Create Multiplayer Room */}
              <button
                onClick={handleCreateRoom}
                className="py-3 bg-gray-900 hover:bg-gray-800 border border-cyan-500 text-cyan-300 font-bold text-xs rounded-xl transition-all shadow-lg"
              >
                CREATE 4-PLAYER CO-OP ROOM
              </button>

              {/* Join Multiplayer Room */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={4}
                  className="w-28 text-center bg-gray-950 border border-gray-700 rounded-lg px-2 py-2 text-white font-bold tracking-widest text-sm focus:border-cyan-400 focus:outline-none"
                  placeholder="CODE"
                />
                <button
                  onClick={handleJoinRoom}
                  className="flex-1 py-3 bg-gray-900 hover:bg-gray-800 border border-cyan-600 text-cyan-300 font-bold text-xs rounded-xl transition-all"
                >
                  JOIN ROOM
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Active Room Lobby Roster */
          <div className="space-y-4 pt-4 border-t border-gray-800 font-mono">
            <div className="flex items-center justify-between bg-cyan-950/40 border border-cyan-500/80 p-3 rounded-xl">
              <div>
                <span className="text-gray-400 text-xs">ROOM CODE: </span>
                <span className="text-xl font-bold text-cyan-300 tracking-widest">{roomInfo.code}</span>
              </div>
              <div className="text-xs text-gray-300">
                OPERATIVES: <span className="font-bold text-white">{roomInfo.playerCount} / 4</span>
              </div>
            </div>

            {/* Roster Slots */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {roomInfo.players.map((p) => (
                <div
                  key={p.id}
                  className="bg-gray-900/60 border border-gray-800 p-3 rounded-lg flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <div>
                      <div className="font-bold text-white text-xs">{p.name}</div>
                      <div className="text-[10px] text-cyan-400 uppercase">{p.operativeClass}</div>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      p.isReady ? 'bg-emerald-950 text-emerald-400 border border-emerald-700' : 'bg-gray-800 text-gray-400'
                    }`}
                  >
                    {p.isReady ? 'READY' : 'WAITING'}
                  </span>
                </div>
              ))}
            </div>

            {/* Ready / Start Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleToggleReady}
                className="flex-1 py-3 bg-gray-900 hover:bg-gray-800 border border-cyan-500 text-cyan-300 font-bold text-xs rounded-xl transition-all"
              >
                TOGGLE READY
              </button>

              {isHost && (
                <button
                  onClick={handleStartMatch}
                  className="flex-1 py-3 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-black font-bold text-xs rounded-xl shadow-lg shadow-cyan-950/80 transition-all"
                >
                  LAUNCH MISSION (AI FILLS SLOTS)
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
