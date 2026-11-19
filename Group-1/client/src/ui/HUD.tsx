/**
 * Live Tactical HUD & Squad Status
 * for SHARD-4: BLACKOUT PROTOCOL
 */

import React from 'react';
import { GameSnapshot, OperativeState } from '@shared/types.js';
import { Minimap } from './Minimap.js';
import { CONSTANTS } from '@shared/constants.js';

interface HUDProps {
  snapshot: GameSnapshot | null;
  localPlayerId: string;
  onOpenJournal: () => void;
  onOpenSettings: () => void;
  onOpenInspector: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  snapshot,
  localPlayerId,
  onOpenJournal,
  onOpenSettings,
  onOpenInspector,
}) => {
  const effectiveSnapshot: GameSnapshot = snapshot || {
    tick: 0,
    timestamp: Date.now(),
    operatives: [
      {
        id: localPlayerId || 'local_operative',
        name: 'OPERATIVE-01',
        slotIndex: 0,
        isBot: false,
        operativeClass: 'vanguard',
        x: 570,
        y: 420,
        vx: 0,
        vy: 0,
        aimAngle: 0,
        hp: 140,
        maxHp: 140,
        stamina: 100,
        maxStamina: 100,
        isSprinting: false,
        isCrouched: false,
        isDodging: false,
        dodgeTimer: 0,
        dodgeCooldownRemaining: 0,
        isDead: false,
        isDowned: false,
        bleedoutTimer: 25,
        reviveProgress: 0,
        activeSlot: 1,
        primaryWeapon: {
          type: 'mk4',
          name: 'MK-IV Pulse Rifle',
          magAmmo: 30,
          magCapacity: 30,
          reserveAmmo: 120,
          maxReserveAmmo: 240,
          isReloading: false,
          reloadProgress: 0,
        },
        sidearmWeapon: {
          type: 'p45',
          name: 'P-45 Sidearm',
          magAmmo: 12,
          magCapacity: 12,
          reserveAmmo: 999,
          maxReserveAmmo: 999,
          isReloading: false,
          reloadProgress: 0,
          hasInfiniteReserve: true,
        },
        fragCount: 2,
        empCount: 2,
        selectedGrenade: 'frag',
        skillCooldownRemaining: 0,
        isCamo: false,
        camoTimer: 0,
        hasRiotShield: false,
        riotShieldAngle: 0,
        riotShieldTimer: 0,
        lastAcknowledgedSeq: 0,
        kills: 0,
        damageDealt: 0,
        headshots: 0,
        revivesPerformed: 0,
        terminalsHacked: 0,
      },
      {
        id: 'bot_squad_1',
        name: 'VALKYRIE-AI',
        slotIndex: 1,
        isBot: true,
        operativeClass: 'phantom',
        x: 630,
        y: 420,
        vx: 0,
        vy: 0,
        aimAngle: 0,
        hp: 90,
        maxHp: 90,
        stamina: 100,
        maxStamina: 100,
        isSprinting: false,
        isCrouched: false,
        isDodging: false,
        dodgeTimer: 0,
        dodgeCooldownRemaining: 0,
        isDead: false,
        isDowned: false,
        bleedoutTimer: 25,
        reviveProgress: 0,
        activeSlot: 1,
        primaryWeapon: {
          type: 'viper9',
          name: 'Viper-9 PDW',
          magAmmo: 35,
          magCapacity: 35,
          reserveAmmo: 140,
          maxReserveAmmo: 280,
          isReloading: false,
          reloadProgress: 0,
        },
        sidearmWeapon: {
          type: 'p45',
          name: 'P-45 Sidearm',
          magAmmo: 12,
          magCapacity: 12,
          reserveAmmo: 999,
          maxReserveAmmo: 999,
          isReloading: false,
          reloadProgress: 0,
          hasInfiniteReserve: true,
        },
        fragCount: 2,
        empCount: 2,
        selectedGrenade: 'frag',
        skillCooldownRemaining: 0,
        isCamo: false,
        camoTimer: 0,
        hasRiotShield: false,
        riotShieldAngle: 0,
        riotShieldTimer: 0,
        lastAcknowledgedSeq: 0,
        kills: 0,
        damageDealt: 0,
        headshots: 0,
        revivesPerformed: 0,
        terminalsHacked: 0,
      },
      {
        id: 'bot_squad_2',
        name: 'SPECTRE-AI',
        slotIndex: 2,
        isBot: true,
        operativeClass: 'breacher',
        x: 570,
        y: 480,
        vx: 0,
        vy: 0,
        aimAngle: 0,
        hp: 120,
        maxHp: 120,
        stamina: 100,
        maxStamina: 100,
        isSprinting: false,
        isCrouched: false,
        isDodging: false,
        dodgeTimer: 0,
        dodgeCooldownRemaining: 0,
        isDead: false,
        isDowned: false,
        bleedoutTimer: 25,
        reviveProgress: 0,
        activeSlot: 1,
        primaryWeapon: {
          type: 'sg12',
          name: 'SG-12 Breacher',
          magAmmo: 8,
          magCapacity: 8,
          reserveAmmo: 48,
          maxReserveAmmo: 96,
          isReloading: false,
          reloadProgress: 0,
        },
        sidearmWeapon: {
          type: 'p45',
          name: 'P-45 Sidearm',
          magAmmo: 12,
          magCapacity: 12,
          reserveAmmo: 999,
          maxReserveAmmo: 999,
          isReloading: false,
          reloadProgress: 0,
          hasInfiniteReserve: true,
        },
        fragCount: 2,
        empCount: 2,
        selectedGrenade: 'frag',
        skillCooldownRemaining: 0,
        isCamo: false,
        camoTimer: 0,
        hasRiotShield: false,
        riotShieldAngle: 0,
        riotShieldTimer: 0,
        lastAcknowledgedSeq: 0,
        kills: 0,
        damageDealt: 0,
        headshots: 0,
        revivesPerformed: 0,
        terminalsHacked: 0,
      },
      {
        id: 'bot_squad_3',
        name: 'AEGIS-AI',
        slotIndex: 3,
        isBot: true,
        operativeClass: 'medic',
        x: 630,
        y: 480,
        vx: 0,
        vy: 0,
        aimAngle: 0,
        hp: 100,
        maxHp: 100,
        stamina: 100,
        maxStamina: 100,
        isSprinting: false,
        isCrouched: false,
        isDodging: false,
        dodgeTimer: 0,
        dodgeCooldownRemaining: 0,
        isDead: false,
        isDowned: false,
        bleedoutTimer: 25,
        reviveProgress: 0,
        activeSlot: 1,
        primaryWeapon: {
          type: 'mk4',
          name: 'MK-IV Pulse Rifle',
          magAmmo: 30,
          magCapacity: 30,
          reserveAmmo: 120,
          maxReserveAmmo: 240,
          isReloading: false,
          reloadProgress: 0,
        },
        sidearmWeapon: {
          type: 'p45',
          name: 'P-45 Sidearm',
          magAmmo: 12,
          magCapacity: 12,
          reserveAmmo: 999,
          maxReserveAmmo: 999,
          isReloading: false,
          reloadProgress: 0,
          hasInfiniteReserve: true,
        },
        fragCount: 2,
        empCount: 2,
        selectedGrenade: 'frag',
        skillCooldownRemaining: 0,
        isCamo: false,
        camoTimer: 0,
        hasRiotShield: false,
        riotShieldAngle: 0,
        riotShieldTimer: 0,
        lastAcknowledgedSeq: 0,
        kills: 0,
        damageDealt: 0,
        headshots: 0,
        revivesPerformed: 0,
        terminalsHacked: 0,
      },
    ],
    enemies: [],
    projectiles: [],
    crates: [],
    barrels: [],
    extractionPads: [],
    beacons: [],
    terminals: [],
    bulkheadsOpen: [false, false, false, false],
    currentSector: 0,
    shardsRecovered: 0,
    mysteryLogs: [],
    bossSpawned: false,
    bossDefeated: false,
    reactorStabilizationCountdown: 180,
    extractionHoldTimer: 0,
    gameStatus: 'playing',
    events: [],
  };

  const currentSnap = effectiveSnapshot;
  const localOp = currentSnap.operatives.find((o) => o.id === localPlayerId) || currentSnap.operatives[0];
  const activeWeapon = localOp ? (localOp.activeSlot === 1 ? localOp.primaryWeapon : localOp.sidearmWeapon) : null;
  const isEmergency = currentSnap.reactorStabilizationCountdown < 60;
  const isLowHp = localOp ? localOp.hp <= localOp.maxHp * 0.3 && !localOp.isDead : false;

  const nearbyTerminal = localOp
    ? currentSnap.terminals.find((t) => !t.hacked && Math.hypot(t.x - localOp.x, t.y - localOp.y) <= 80)
    : null;
  const nearbyCrate = localOp
    ? currentSnap.crates.find((c) => !c.opened && Math.hypot(c.x - localOp.x, c.y - localOp.y) <= 70)
    : null;
  const nearbyDowned = localOp
    ? currentSnap.operatives.find((o) => o.id !== localOp.id && o.isDowned && !o.isDead && Math.hypot(o.x - localOp.x, o.y - localOp.y) <= 65)
    : null;

  return (
    <div className="absolute inset-0 pointer-events-none select-none flex flex-col justify-between p-3 sm:p-5">
      {/* Low-HP Pulsing Vignette */}
      {isLowHp && <div className="absolute inset-0 low-hp-vignette pointer-events-none" />}

      {/* TOP BAR: Squad Roster + Objective Tracker + Minimap */}
      <div className="flex items-start justify-between w-full gap-4">
        {/* Top-Left: Squad Roster */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold tracking-wider text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800">
              STATION EREBUS // SQUAD LINK
            </span>
            <button
              onClick={onOpenSettings}
              className="pointer-events-auto text-[11px] font-mono text-gray-400 hover:text-white bg-gray-900/80 px-2 py-0.5 rounded border border-gray-700 hover:border-cyan-500 transition-colors"
            >
              ⚙ SETTINGS
            </button>
            <button
              onClick={onOpenInspector}
              className="pointer-events-auto text-[11px] font-mono text-amber-400 hover:text-amber-200 bg-gray-900/80 px-2 py-0.5 rounded border border-amber-700/60 transition-colors"
            >
              [F2] INSPECTOR
            </button>
          </div>

          <div className="flex flex-col gap-1.5 w-56 sm:w-64">
            {currentSnap.operatives.map((op) => {
              const isLocal = op.id === localPlayerId;
              const hpPercent = Math.max(0, (op.hp / op.maxHp) * 100);
              const staminaPercent = Math.max(0, (op.stamina / op.maxStamina) * 100);

              const roleColors: Record<string, string> = {
                vanguard: 'border-cyan-500 text-cyan-400',
                phantom: 'border-purple-500 text-purple-400',
                breacher: 'border-orange-500 text-orange-400',
                medic: 'border-emerald-500 text-emerald-400',
              };

              return (
                <div
                  key={op.id}
                  className={`border bg-gray-950/85 backdrop-blur-md rounded p-1.5 ${
                    op.isDowned
                      ? 'border-red-500 animate-pulse bg-red-950/40'
                      : isLocal
                      ? 'border-cyan-500/80 shadow-md shadow-cyan-950/50'
                      : 'border-gray-800'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="font-bold flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${op.isDowned ? 'bg-red-500' : 'bg-emerald-400'}`} />
                      {op.name} {isLocal && '(YOU)'}
                    </span>
                    <span className={`text-[10px] uppercase font-semibold ${roleColors[op.operativeClass]}`}>
                      {op.operativeClass}
                    </span>
                  </div>

                  {/* Health Bar */}
                  <div className="w-full bg-gray-900 h-2 rounded overflow-hidden mt-1 relative">
                    <div
                      className={`h-full transition-all duration-150 ${
                        op.isDowned ? 'bg-red-600' : hpPercent > 35 ? 'bg-cyan-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${hpPercent}%` }}
                    />
                    {op.isDowned && (
                      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white tracking-widest">
                        DOWNED // HOLD [E]
                      </span>
                    )}
                  </div>

                  {/* Stamina Bar */}
                  {!op.isDowned && (
                    <div className="w-full bg-gray-900 h-1 rounded overflow-hidden mt-0.5">
                      <div
                        className="h-full bg-emerald-400 transition-all duration-75"
                        style={{ width: `${staminaPercent}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Top-Center: Emergency Overload / Objective Banner */}
        <div className="flex flex-col items-center">
          {isEmergency && (
            <div className="bg-red-950/90 border-2 border-red-500 px-4 py-2 rounded-lg text-center animate-pulse shadow-xl shadow-red-950/60 mb-2">
              <div className="text-red-400 text-xs font-mono tracking-widest font-bold">
                ⚠ REACTOR CORE COLLAPSE IMMINENT
              </div>
              <div className="text-2xl sm:text-3xl font-mono font-bold text-white">
                00:{currentSnap.reactorStabilizationCountdown.toString().padStart(2, '0')}
              </div>
              <div className="text-[11px] text-amber-300 font-bold mt-0.5">
                HOLD ALL 4 EXTRACTION SYNC PADS TO EVACUATE!
              </div>
            </div>
          )}

          {/* Extraction Sync Hold Progress */}
          {currentSnap.bossDefeated && (
            <div className="bg-gray-950/90 border border-cyan-500/80 px-4 py-2 rounded-lg shadow-lg flex flex-col items-center">
              <div className="text-xs font-mono text-cyan-400 font-bold flex items-center gap-2">
                <span>EXTRACTION SYNC LOCK:</span>
                <span className="text-white">
                  {Math.round((currentSnap.extractionHoldTimer / CONSTANTS.EXTRACTION.HOLD_TIME_SEC) * 100)}%
                </span>
              </div>
              <div className="w-48 bg-gray-900 h-2 rounded mt-1 overflow-hidden border border-gray-700">
                <div
                  className="bg-emerald-400 h-full transition-all duration-100"
                  style={{
                    width: `${(currentSnap.extractionHoldTimer / CONSTANTS.EXTRACTION.HOLD_TIME_SEC) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Top-Right: Objective Tracker + Minimap */}
        <div className="flex flex-col items-end gap-2">
          <Minimap snapshot={currentSnap} localPlayerId={localPlayerId} />

          {/* Objectives Card */}
          <div className="bg-gray-950/85 border border-gray-800 rounded-lg p-2.5 w-52 sm:w-60 shadow-lg text-xs font-mono backdrop-blur-md">
            <div className="text-cyan-400 font-bold border-b border-gray-800 pb-1 flex justify-between items-center">
              <span>MISSION DIRECTIVES</span>
              <button
                onClick={onOpenJournal}
                className="pointer-events-auto text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800 hover:bg-cyan-900 px-1.5 py-0.5 rounded transition-colors"
              >
                [TAB] JOURNAL ({currentSnap.shardsRecovered}/4)
              </button>
            </div>

            <div className="mt-2 space-y-1.5 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className={currentSnap.shardsRecovered >= 4 ? 'text-emerald-400' : 'text-cyan-400'}>
                  {currentSnap.shardsRecovered >= 4 ? '✔' : '◆'}
                </span>
                <span className={currentSnap.shardsRecovered >= 4 ? 'line-through text-gray-400' : 'text-gray-200'}>
                  Decode 4 Cipher Shards ({currentSnap.shardsRecovered}/4)
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className={currentSnap.bossDefeated ? 'text-emerald-400' : 'text-purple-400'}>
                  {currentSnap.bossDefeated ? '✔' : '◆'}
                </span>
                <span className={currentSnap.bossDefeated ? 'line-through text-gray-400' : 'text-gray-200'}>
                  Defeat Core Warden Boss
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className={currentSnap.gameStatus === 'victory' ? 'text-emerald-400' : 'text-amber-400'}>
                  {currentSnap.gameStatus === 'victory' ? '✔' : '◆'}
                </span>
                <span className="text-gray-200">
                  Hold 4 Sync Extraction Pads
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contextual Interaction Banner */}
      <div className="absolute top-[68%] left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-20">
        {nearbyTerminal && (
          <div className="bg-amber-950/90 border-2 border-amber-400 px-4 py-2 rounded-xl text-center shadow-2xl animate-pulse">
            <span className="text-amber-300 font-mono font-bold text-sm">
              HOLD [E] TO HACK CIPHER SHARD ({Math.round(nearbyTerminal.hackProgress * 100)}%)
            </span>
          </div>
        )}
        {nearbyCrate && (
          <div className="bg-cyan-950/90 border-2 border-cyan-400 px-4 py-2 rounded-xl text-center shadow-2xl animate-bounce">
            <span className="text-cyan-300 font-mono font-bold text-sm">
              PRESS [E] TO EQUIP {nearbyCrate.weaponType.toUpperCase()}
            </span>
          </div>
        )}
        {nearbyDowned && (
          <div className="bg-red-950/90 border-2 border-red-500 px-4 py-2 rounded-xl text-center shadow-2xl animate-pulse">
            <span className="text-red-300 font-mono font-bold text-sm">
              HOLD [E] TO REVIVE {nearbyDowned.name}
            </span>
          </div>
        )}
      </div>

      {/* BOTTOM BAR: Local Weapon Stats + Class Skill + Ammo + Health */}
      {localOp && activeWeapon && (
        <div className="flex items-end justify-between w-full">
          {/* Bottom-Left: Operative Health & Stamina Bars */}
          <div className="bg-gray-950/85 border border-cyan-500/60 backdrop-blur-md rounded-lg p-3 w-64 sm:w-80 shadow-xl shadow-cyan-950/40">
            <div className="flex justify-between text-xs font-mono font-bold mb-1">
              <span className="text-gray-300">VITAL SIGNS</span>
              <span className={localOp.hp > 35 ? 'text-cyan-400' : 'text-red-400 animate-pulse'}>
                {Math.round(localOp.hp)} / {localOp.maxHp} HP
              </span>
            </div>

            {/* Health Bar */}
            <div className="w-full bg-gray-900 h-3 rounded overflow-hidden relative border border-gray-800">
              <div
                className={`h-full transition-all duration-150 ${
                  localOp.hp > 35 ? 'bg-gradient-to-r from-cyan-600 to-cyan-400' : 'bg-red-600'
                }`}
                style={{ width: `${(localOp.hp / localOp.maxHp) * 100}%` }}
              />
            </div>

            {/* Stamina Bar */}
            <div className="flex justify-between text-[10px] font-mono font-bold mt-2 mb-0.5">
              <span className="text-gray-400">STAMINA [SPACE: DODGE]</span>
              <span className="text-emerald-400">{Math.round(localOp.stamina)}%</span>
            </div>
            <div className="w-full bg-gray-900 h-2 rounded overflow-hidden border border-gray-800">
              <div
                className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-75"
                style={{ width: `${(localOp.stamina / localOp.maxStamina) * 100}%` }}
              />
            </div>

            {/* Crouch Indicator */}
            {localOp.isCrouched && (
              <div className="mt-2 text-center text-[10px] font-mono text-amber-300 bg-amber-950/40 border border-amber-800/80 rounded py-0.5 font-bold">
                CROUCH ENGAGED (-40% SPREAD / -45% SPEED)
              </div>
            )}
          </div>

          {/* Bottom-Center: Class Skill Cooldown [Q] */}
          <div className="bg-gray-950/85 border border-purple-500/60 backdrop-blur-md rounded-lg p-3 shadow-xl flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center font-mono font-bold border ${
                localOp.skillCooldownRemaining <= 0
                  ? 'border-purple-400 bg-purple-950/80 text-purple-300 shadow-md shadow-purple-900/60 animate-pulse'
                  : 'border-gray-800 bg-gray-900 text-gray-500'
              }`}
            >
              <span className="text-xs">[Q]</span>
              <span className="text-[10px]">SKILL</span>
            </div>

            <div className="font-mono text-xs">
              <div className="text-gray-200 font-bold uppercase">
                {localOp.operativeClass === 'vanguard' && 'Aegis Riot Shield'}
                {localOp.operativeClass === 'phantom' && 'Active Camo'}
                {localOp.operativeClass === 'breacher' && 'Cluster Breaker'}
                {localOp.operativeClass === 'medic' && 'Nano-Heal Beacon'}
              </div>
              <div className="text-[11px] text-gray-400 mt-0.5">
                {localOp.skillCooldownRemaining <= 0 ? (
                  <span className="text-emerald-400 font-bold">READY</span>
                ) : (
                  <span>COOLDOWN: {localOp.skillCooldownRemaining.toFixed(1)}s</span>
                )}
              </div>
            </div>
          </div>

          {/* Bottom-Right: Active Weapon Ammo & Grenades */}
          <div className="bg-gray-950/85 border border-cyan-500/60 backdrop-blur-md rounded-lg p-3 shadow-xl shadow-cyan-950/40 flex items-center gap-4">
            {/* Grenades */}
            <div className="flex flex-col gap-1 border-r border-gray-800 pr-3 font-mono text-xs">
              <div className="flex items-center gap-1.5 text-gray-300">
                <span className="w-2 h-2 rounded-full bg-orange-500" />
                <span>FRAG:</span>
                <span className="font-bold text-white">{localOp.fragCount}</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-300">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span>EMP:</span>
                <span className="font-bold text-white">{localOp.empCount}</span>
              </div>
              <span className="text-[9px] text-gray-500">[G] THROW</span>
            </div>

            {/* Weapon & Ammo Counter */}
            <div className="font-mono text-right min-w-[120px]">
              <div className="text-xs text-cyan-400 font-bold tracking-wider">
                {activeWeapon.name.toUpperCase()}
              </div>

              <div className="text-3xl sm:text-4xl font-bold tracking-tight mt-0.5">
                <span className={activeWeapon.magAmmo > 0 ? 'text-white' : 'text-red-500 animate-pulse'}>
                  {activeWeapon.magAmmo}
                </span>
                <span className="text-base text-gray-500 font-normal">
                  {' '}
                  / {activeWeapon.hasInfiniteReserve ? '∞' : activeWeapon.reserveAmmo}
                </span>
              </div>

              {activeWeapon.isReloading && (
                <div className="text-xs font-bold text-amber-400 animate-pulse mt-0.5">
                  RELOADING... [R]
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
