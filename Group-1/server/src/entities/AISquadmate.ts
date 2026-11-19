/**
 * AI Squadmate Bot Controller for Solo Mode and Fill Slots
 * for SHARD-4: BLACKOUT PROTOCOL
 */

import { Operative } from './Operative.js';
import { HostileUnit } from './HostileUnit.js';
import { PathfindingGrid } from '../ai/pathfinding.js';
import { CONSTANTS } from '@shared/constants.js';
import { ExtractionPadState } from '@shared/types.js';

export type SquadmateFSMState = 'FOLLOW' | 'COMBAT' | 'REVIVE' | 'EXTRACT';

export class AISquadmateController {
  public readonly operative: Operative;
  public currentState: SquadmateFSMState = 'FOLLOW';
  private pathfinder: PathfindingGrid;
  private path: { x: number; y: number }[] = [];
  private pathUpdateTimer: number = Math.random() * 0.5;
  private currentWaypointIndex: number = 0;
  private targetEnemyId: string | null = null;
  private revivingTargetId: string | null = null;

  constructor(operative: Operative, pathfinder: PathfindingGrid) {
    this.operative = operative;
    this.pathfinder = pathfinder;
  }

  public update(
    dt: number,
    allOperatives: Operative[],
    enemies: HostileUnit[],
    terminals: any[],
    extractionPads: ExtractionPadState[] = [],
    bossDefeated: boolean = false,
    shardsRecovered: number = 0
  ): {
    moveX: number;
    moveY: number;
    aimAngle: number;
    isFiring: boolean;
    useSkill: boolean;
    isReviving: boolean;
    revivingTargetId: string | null;
  } {
    if (this.operative.isDead || this.operative.isDowned) {
      return {
        moveX: 0,
        moveY: 0,
        aimAngle: this.operative.aimAngle,
        isFiring: false,
        useSkill: false,
        isReviving: false,
        revivingTargetId: null,
      };
    }

    // Check if any human player has stepped onto a Sync Pad or boss is defeated
    const humanOps = allOperatives.filter((op) => !op.isBot && !op.isDead && !op.isDowned);
    const humanOnPad = humanOps.some((human) =>
      extractionPads.some((pad) => Math.hypot(human.x - pad.x, human.y - pad.y) <= pad.radius + 20)
    );

    const isExtractPhase = bossDefeated || (shardsRecovered >= 4 && bossDefeated) || (humanOnPad && (bossDefeated || shardsRecovered >= 4));

    // 1. High priority: Check for downed squadmates to revive (if not in final extraction)
    const downedTeammate = !isExtractPhase
      ? allOperatives.find((op) => op.id !== this.operative.id && op.isDowned && !op.isDead)
      : null;

    let destinationX = this.operative.x;
    let destinationY = this.operative.y;
    let wantRevive = false;
    let revivingId: string | null = null;
    let isStationaryOnPad = false;

    if (isExtractPhase && extractionPads.length > 0) {
      this.currentState = 'EXTRACT';

      // -----------------------------------------------------------------------
      // DEDICATED SYNC PAD ASSIGNMENT (1-TO-1 MAPPING)
      // Pad 0: Human Operative (OPERATIVE-01)
      // Pad 1: Valkyrie-AI (Slot 1)
      // Pad 2: Spectre-AI (Slot 2)
      // Pad 3: Aegis-AI (Slot 3)
      // -----------------------------------------------------------------------
      const humanAssignedPads = new Set<number>();
      for (const human of humanOps) {
        let closestPadIdx = 0;
        let minD = Infinity;
        extractionPads.forEach((pad, pIdx) => {
          const d = Math.hypot(human.x - pad.x, human.y - pad.y);
          if (d < minD) {
            minD = d;
            closestPadIdx = pIdx;
          }
        });
        if (minD < 400) {
          humanAssignedPads.add(closestPadIdx);
        }
      }
      if (humanAssignedPads.size === 0) {
        humanAssignedPads.add(0); // Reserve Pad 0 for Player 1 by default
      }

      // Collect available remaining pads for AI bots (sorted 0..3)
      const availablePadIndices = [0, 1, 2, 3].filter((idx) => !humanAssignedPads.has(idx));

      // Get alive AI bots sorted by slotIndex
      const aliveBots = allOperatives
        .filter((op) => op.isBot && !op.isDead)
        .sort((a, b) => a.slotIndex - b.slotIndex);

      const myBotIndex = aliveBots.findIndex((b) => b.id === this.operative.id);
      const assignedPadIdx =
        myBotIndex >= 0 && myBotIndex < availablePadIndices.length
          ? availablePadIndices[myBotIndex]
          : ((this.operative.slotIndex - 1) % 4);

      const targetPad =
        extractionPads.find((p) => p.index === assignedPadIdx) ||
        extractionPads[assignedPadIdx] ||
        extractionPads[1];

      destinationX = targetPad.x;
      destinationY = targetPad.y;

      const distToPad = Math.hypot(targetPad.x - this.operative.x, targetPad.y - this.operative.y);
      if (distToPad <= 20) {
        isStationaryOnPad = true;
      }
    } else if (downedTeammate) {
      this.currentState = 'REVIVE';
      destinationX = downedTeammate.x;
      destinationY = downedTeammate.y;
      const distToDowned = Math.hypot(downedTeammate.x - this.operative.x, downedTeammate.y - this.operative.y);
      if (distToDowned <= 45) {
        wantRevive = true;
        revivingId = downedTeammate.id;
      }
    } else {
      this.currentState = 'FOLLOW';
      // Normal formation: Follow the human leader in 120px trailing formation
      const leader = allOperatives.find((op) => !op.isBot && !op.isDead) || allOperatives[0];
      if (leader && leader.id !== this.operative.id) {
        const trailOffset = (this.operative.slotIndex - 2) * 0.6; // -0.6, 0, +0.6 rad
        const trailAngle = leader.aimAngle + Math.PI + trailOffset;
        const formationDist = 120;
        destinationX = leader.x + Math.cos(trailAngle) * formationDist;
        destinationY = leader.y + Math.sin(trailAngle) * formationDist;
      }
    }

    const dx = destinationX - this.operative.x;
    const dy = destinationY - this.operative.y;
    const distToDest = Math.hypot(dx, dy);

    // If destination is already reached or very close (< 18px), skip A* search completely
    if (distToDest <= 18 || isStationaryOnPad) {
      this.path = [{ x: destinationX, y: destinationY }];
      this.currentWaypointIndex = 0;
    } else {
      // Update pathfinding every ~0.35s
      this.pathUpdateTimer -= dt;
      if (this.pathUpdateTimer <= 0) {
        this.pathUpdateTimer = 0.35 + Math.random() * 0.15;
        this.path = this.pathfinder.findPath(this.operative.x, this.operative.y, destinationX, destinationY);
        this.currentWaypointIndex = 0;
      }
    }

    // Move along path or steer directly towards destination
    let moveX = 0;
    let moveY = 0;

    if (distToDest > (isStationaryOnPad ? 15 : 22) && !wantRevive) {
      if (this.path.length > 0) {
        const wp = this.path[this.currentWaypointIndex] || this.path[this.path.length - 1];
        const wdx = wp.x - this.operative.x;
        const wdy = wp.y - this.operative.y;
        const wdist = Math.hypot(wdx, wdy);

        if (wdist < 28 && this.currentWaypointIndex < this.path.length - 1) {
          this.currentWaypointIndex++;
        }
        if (wdist > 0.001) {
          moveX = wdx / wdist;
          moveY = wdy / wdist;
        }
      } else {
        // Direct line steering
        moveX = dx / distToDest;
        moveY = dy / distToDest;
      }
    }

    // 3. Combat targeting: Find nearest visible hostile
    let nearestEnemy: HostileUnit | null = null;
    let nearestDist = 550;

    for (const enemy of enemies) {
      if (enemy.isDead) continue;
      const d = Math.hypot(enemy.x - this.operative.x, enemy.y - this.operative.y);
      if (d < nearestDist && this.pathfinder.hasLineOfSight(this.operative.x, this.operative.y, enemy.x, enemy.y)) {
        nearestDist = d;
        nearestEnemy = enemy;
      }
    }

    let aimAngle = this.operative.aimAngle;
    let isFiring = false;
    let useSkill = false;

    if (nearestEnemy) {
      this.targetEnemyId = nearestEnemy.id;
      aimAngle = Math.atan2(nearestEnemy.y - this.operative.y, nearestEnemy.x - this.operative.x);
      // Lead target slightly
      aimAngle += (Math.random() - 0.5) * 0.05;

      // Shoot if weapon ready
      const weapon = this.operative.getActiveWeapon();
      if (weapon.magAmmo > 0) {
        isFiring = true;
      } else if (!weapon.isReloading) {
        weapon.reload();
      }

      // Tactical skill usage
      if (this.operative.skillCooldownRemaining <= 0) {
        if (this.operative.operativeClass === 'vanguard' && nearestDist < 300) {
          useSkill = true; // Shield against close enemies
        } else if (this.operative.operativeClass === 'phantom' && (this.operative.hp < 45 || nearestDist < 200)) {
          useSkill = true; // Camo for escape/crit
        } else if (this.operative.operativeClass === 'breacher' && nearestDist < 280) {
          useSkill = true; // Cluster bomb
        } else if (this.operative.operativeClass === 'medic') {
          // Heal beacon if self or allies low
          const teamDamaged = allOperatives.some((op) => !op.isDead && op.hp < op.maxHp * 0.7);
          if (teamDamaged) {
            useSkill = true;
          }
        }
      }
    } else {
      this.targetEnemyId = null;
      if (isStationaryOnPad) {
        // Face outward from Central Vault center (3000, 1200) in defensive perimeter stance
        aimAngle = Math.atan2(this.operative.y - 1200, this.operative.x - 3000);
      } else if (Math.hypot(moveX, moveY) > 0.1) {
        aimAngle = Math.atan2(moveY, moveX);
      }
    }

    return {
      moveX,
      moveY,
      aimAngle,
      isFiring,
      useSkill,
      isReviving: wantRevive,
      revivingTargetId: revivingId,
    };
  }
}
