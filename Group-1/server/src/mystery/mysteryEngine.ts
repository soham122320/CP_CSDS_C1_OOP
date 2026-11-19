/**
 * Mystery Engine & Forensic Terminal Hack System
 * for SHARD-4: BLACKOUT PROTOCOL
 */

import { TerminalState, CipherLog, CombatEvent } from '@shared/types.js';
import { SECTOR_DEFINITIONS } from '@shared/mapData.js';
import { Operative } from '../entities/Operative.js';
import { InvalidCipherException } from '@shared/exceptions.js';

export class MysteryEngine {
  public terminals: TerminalState[] = [];
  public bulkheadsOpen: boolean[] = [false, false, false, false]; // A->B, B->C, C->D, D->Vault
  public recoveredShards: CipherLog[] = [];
  public currentSectorIndex: number = 0;
  private readonly hackDurationSec: number = 5.0;

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.bulkheadsOpen = [false, false, false, false];
    this.recoveredShards = [];
    this.currentSectorIndex = 0;

    this.terminals = SECTOR_DEFINITIONS.slice(0, 4).map((sector, idx) => ({
      id: `terminal_${sector.id}`,
      sectorIndex: idx,
      sectorName: sector.name,
      x: sector.terminalX,
      y: sector.terminalY,
      hacked: false,
      hackProgress: 0,
      isBeingHacked: false,
      hackerId: null,
    }));
  }

  public update(
    dt: number,
    operatives: Operative[]
  ): {
    events: CombatEvent[];
    newShardUnlocked: CipherLog | null;
    bulkheadUnlockedIndex: number | null;
  } {
    const events: CombatEvent[] = [];
    let newShardUnlocked: CipherLog | null = null;
    let bulkheadUnlockedIndex: number | null = null;

    for (const terminal of this.terminals) {
      if (terminal.hacked) continue;

      // Only the terminal of the active sector can be hacked sequentially
      if (terminal.sectorIndex !== this.currentSectorIndex) {
        terminal.isBeingHacked = false;
        terminal.hackerId = null;
        continue;
      }

      // Check if any alive operative is interacting nearby
      let activeHacker: Operative | null = null;
      for (const op of operatives) {
        if (!op.isDead && !op.isDowned) {
          const dist = Math.hypot(op.x - terminal.x, op.y - terminal.y);
          if (dist <= 52) {
            // Check interaction intention
            activeHacker = op;
            break;
          }
        }
      }

      if (activeHacker) {
        terminal.isBeingHacked = true;
        terminal.hackerId = activeHacker.id;

        // Medic hacks 2x faster!
        const speed = activeHacker.operativeClass === 'medic' ? 2.0 : 1.0;
        terminal.hackProgress += (dt / this.hackDurationSec) * speed;

        if (terminal.hackProgress >= 1.0) {
          terminal.hackProgress = 1.0;
          terminal.hacked = true;
          terminal.isBeingHacked = false;
          activeHacker.terminalsHacked++;

          const sectorDef = SECTOR_DEFINITIONS[terminal.sectorIndex];
          const log: CipherLog = {
            shardIndex: terminal.sectorIndex + 1,
            title: sectorDef.terminalLogTitle,
            sector: sectorDef.name,
            timestamp: `02:${14 + terminal.sectorIndex * 11}:00`,
            recoveredBy: `${activeHacker.name} (${activeHacker.operativeClass.toUpperCase()})`,
            logText: sectorDef.terminalLogText,
            clueSummary: sectorDef.terminalClue,
          };

          this.recoveredShards.push(log);
          newShardUnlocked = log;

          // Open bulkhead to next sector
          if (terminal.sectorIndex < 4) {
            this.bulkheadsOpen[terminal.sectorIndex] = true;
            bulkheadUnlockedIndex = terminal.sectorIndex;
            this.currentSectorIndex++;
          }

          events.push({
            id: `hack_comp_${Date.now()}_${terminal.id}`,
            type: 'shard_unlocked',
            x: terminal.x,
            y: terminal.y,
            text: `SHARD ${terminal.sectorIndex + 1}/4 DECODED: ${sectorDef.name}`,
            sourceId: activeHacker.id,
          });
        }
      } else {
        // Slowly decay progress if abandoned
        terminal.isBeingHacked = false;
        terminal.hackerId = null;
        terminal.hackProgress = Math.max(0, terminal.hackProgress - dt * 0.25);
      }
    }

    return { events, newShardUnlocked, bulkheadUnlockedIndex };
  }
}
