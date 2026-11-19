/**
 * Core Warden (Multi-Phase Boss in Central Vault)
 * for SHARD-4: BLACKOUT PROTOCOL
 */

import { HostileUnit } from './HostileUnit.js';
import { EnemyType, HostileState } from '@shared/types.js';
import { Operative } from './Operative.js';
import { PathfindingGrid } from '../ai/pathfinding.js';

export class CoreWarden extends HostileUnit {
  public readonly enemyType: EnemyType = 'warden';
  public phase: 1 | 2 | 3 = 1;

  // Phase 1: Invulnerable while pylons stand; sweeping laser beam
  public isInvulnerable: boolean = true;
  private laserSweeping: boolean = false;
  private laserAngle: number = 0;
  private laserSweepSpeed: number = 1.1; // rad/s
  private laserDuration: number = 3.5;
  private laserTimer: number = 0;
  private laserCooldown: number = 4.0;
  private telegraphLaser: boolean = false;
  private telegraphTimer: number = 0;

  // Phase 2: Ground-slam shockwave
  private groundSlamTimer: number = 0;
  private groundSlamCooldown: number = 4.5;
  private isGroundSlamming: boolean = false;

  // Phase 3: Enraged double laser and exposed core
  public coreExposed: boolean = false;

  // Minion spawn triggers
  public minionSpawnRequested: { type: 'stalker' | 'enforcer'; count: number } | null = null;
  private spawnCooldown: number = 8.0;

  constructor(id: string, x: number, y: number, humanCount: number = 1) {
    // Scales HP based on human count
    const hp = 800 + humanCount * 300;
    super(id, x, y, 42, hp, 75); // Massive 42px radius, 75 px/s
  }

  public setPylonsDestroyed(): void {
    if (this.phase === 1) {
      this.isInvulnerable = false;
      this.phase = 2;
      this.groundSlamCooldown = 2.0;
      this.minionSpawnRequested = { type: 'enforcer', count: 2 };
    }
  }

  public override takeDamage(amount: number, isWeakSpot: boolean = false): number {
    if (this.isInvulnerable || this.isDead) return 0;

    // Phase 3 exposed core crit multiplier
    let finalAmount = amount;
    if (this.phase === 3) {
      finalAmount *= 1.75; // 75% extra damage during Phase 3
    }

    const taken = super.takeDamage(finalAmount, isWeakSpot);

    // Transition from Phase 2 to Phase 3 at 40% HP
    if (this.phase === 2 && this.hp <= this.maxHp * 0.4) {
      this.phase = 3;
      this.coreExposed = true;
      this.moveSpeed = 105;
      this.laserSweepSpeed = 1.6;
      this.minionSpawnRequested = { type: 'stalker', count: 4 };
    }

    return taken;
  }

  public update(dt: number, operatives: Operative[], pathfinder: PathfindingGrid): {
    shockwaves: { x: number; y: number; radius: number; maxRadius: number; damage: number }[];
    lasers: { x: number; y: number; angle: number; length: number; damage: number }[];
    spawnEvent: { type: 'stalker' | 'enforcer'; count: number } | null;
  } {
    const shockwaves: { x: number; y: number; radius: number; maxRadius: number; damage: number }[] = [];
    const lasers: { x: number; y: number; angle: number; length: number; damage: number }[] = [];
    let spawnEvent = this.minionSpawnRequested;
    this.minionSpawnRequested = null;

    if (this.isDead) return { shockwaves, lasers, spawnEvent };

    // Periodic minion spawn pressure
    this.spawnCooldown -= dt;
    if (this.spawnCooldown <= 0) {
      this.spawnCooldown = this.phase === 3 ? 9.0 : 13.0;
      spawnEvent = {
        type: this.phase === 1 ? 'stalker' : 'enforcer',
        count: this.phase === 3 ? 3 : 2,
      };
    }

    // Laser attack logic (Phases 1 and 3)
    if (this.laserCooldown > 0) {
      this.laserCooldown -= dt;
    }

    if (this.telegraphLaser) {
      this.telegraphTimer -= dt;
      if (this.telegraphTimer <= 0) {
        this.telegraphLaser = false;
        this.laserSweeping = true;
        this.laserTimer = this.laserDuration;
      }
    } else if (this.laserSweeping) {
      this.laserTimer -= dt;
      this.laserAngle = (this.laserAngle + this.laserSweepSpeed * dt) % (2 * Math.PI);

      // Primary laser
      lasers.push({
        x: this.x,
        y: this.y,
        angle: this.laserAngle,
        length: 650,
        damage: 28 * dt,
      });

      // Phase 3 dual rotating laser!
      if (this.phase === 3) {
        lasers.push({
          x: this.x,
          y: this.y,
          angle: this.laserAngle + Math.PI,
          length: 650,
          damage: 28 * dt,
        });
      }

      if (this.laserTimer <= 0) {
        this.laserSweeping = false;
        this.laserCooldown = this.phase === 3 ? 3.5 : 5.0;
      }
    } else if (this.laserCooldown <= 0) {
      // Start telegraphing
      this.telegraphLaser = true;
      this.telegraphTimer = 1.0;
      const target = this.findNearestVisibleOperative(operatives, pathfinder, 900);
      this.laserAngle = target ? Math.atan2(target.y - this.y, target.x - this.x) : this.angle;
    }

    // Ground slam shockwave logic (Phases 2 and 3)
    if (this.phase >= 2) {
      this.groundSlamCooldown -= dt;
      if (this.groundSlamCooldown <= 0) {
        this.groundSlamCooldown = this.phase === 3 ? 3.4 : 5.2;
        // Trigger shockwave
        shockwaves.push({
          x: this.x,
          y: this.y,
          radius: 10,
          maxRadius: 280,
          damage: 45,
        });
      }
    }

    // Boss repositioning towards center or nearest player
    const target = this.findNearestVisibleOperative(operatives, pathfinder, 900);
    if (target && !this.laserSweeping) {
      this.angle = Math.atan2(target.y - this.y, target.x - this.x);
      const dist = Math.hypot(target.x - this.x, target.y - this.y);
      if (dist > 180) {
        this.vx = Math.cos(this.angle) * this.moveSpeed;
        this.vy = Math.sin(this.angle) * this.moveSpeed;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
      } else {
        this.vx = 0;
        this.vy = 0;
      }
    }

    return { shockwaves, lasers, spawnEvent };
  }

  public override serialize(): HostileState {
    const base = super.serialize();
    return {
      ...base,
      phase: this.phase,
      telegraphAngle: this.laserAngle,
      telegraphProgress: this.telegraphLaser ? 1 - (this.telegraphTimer / 1.0) : (this.laserSweeping ? 1 : 0),
    };
  }
}
