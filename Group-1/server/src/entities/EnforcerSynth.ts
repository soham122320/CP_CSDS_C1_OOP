/**
 * Enforcer Synth (Armored tactical rifleman with telegraphed burst fire)
 */

import { HostileUnit } from './HostileUnit.js';
import { EnemyType, HostileState } from '@shared/types.js';
import { Operative } from './Operative.js';
import { PathfindingGrid } from '../ai/pathfinding.js';

export class EnforcerSynth extends HostileUnit {
  public readonly enemyType: EnemyType = 'enforcer';
  private shootCooldown: number = 2.0;
  private isTelegraphing: boolean = false;
  private telegraphTimer: number = 0;
  private telegraphTotal: number = 0.65;
  private burstCountRemaining: number = 0;
  private burstIntervalTimer: number = 0;
  private burstAngle: number = 0;

  constructor(id: string, x: number, y: number) {
    super(id, x, y, 18, 85, 125); // 85 HP, tactical 125 px/s
  }

  public update(dt: number, operatives: Operative[], pathfinder: PathfindingGrid): {
    fireProjectile: boolean;
    x: number;
    y: number;
    angle: number;
    damage: number;
  } {
    let fireResult = { fireProjectile: false, x: this.x, y: this.y, angle: this.angle, damage: 16 };

    if (this.isDead) return fireResult;

    if (this.isStunned) {
      this.stunTimer -= dt;
      if (this.stunTimer <= 0) {
        this.isStunned = false;
        this.state = 'chase';
      }
      this.isTelegraphing = false;
      this.burstCountRemaining = 0;
      return fireResult;
    }

    // Burst firing sequence
    if (this.burstCountRemaining > 0) {
      this.burstIntervalTimer -= dt;
      if (this.burstIntervalTimer <= 0) {
        this.burstIntervalTimer = 0.12;
        this.burstCountRemaining--;
        fireResult = {
          fireProjectile: true,
          x: this.x,
          y: this.y,
          angle: this.burstAngle + (Math.random() - 0.5) * 0.08,
          damage: 16,
        };
      }
      return fireResult;
    }

    // Telegraphing sequence before burst
    if (this.isTelegraphing) {
      this.telegraphTimer -= dt;
      this.vx = 0;
      this.vy = 0;
      if (this.telegraphTimer <= 0) {
        this.isTelegraphing = false;
        this.burstCountRemaining = 3;
        this.burstIntervalTimer = 0;
      }
      return fireResult;
    }

    if (this.shootCooldown > 0) {
      this.shootCooldown -= dt;
    }

    const target = this.findNearestVisibleOperative(operatives, pathfinder, 650);

    if (target) {
      this.targetId = target.id;
      const dist = Math.hypot(target.x - this.x, target.y - this.y);
      this.angle = Math.atan2(target.y - this.y, target.x - this.x);

      // Check if in shooting range and line of sight
      if (dist < 420 && pathfinder.hasLineOfSight(this.x, this.y, target.x, target.y)) {
        this.state = 'attack';
        this.vx = 0;
        this.vy = 0;

        if (this.shootCooldown <= 0) {
          this.isTelegraphing = true;
          this.telegraphTimer = this.telegraphTotal;
          this.burstAngle = this.angle;
          this.shootCooldown = 2.4 + Math.random() * 0.6;
        }
        return fireResult;
      }

      // Approach target
      this.state = 'chase';
      this.pathUpdateTimer -= dt;
      if (this.pathUpdateTimer <= 0) {
        this.pathUpdateTimer = 0.5;
        this.path = pathfinder.findPath(this.x, this.y, target.x, target.y);
        this.pathIndex = 0;
      }

      if (this.path.length > 0) {
        const wp = this.path[this.pathIndex] || this.path[this.path.length - 1];
        const dx = wp.x - this.x;
        const dy = wp.y - this.y;
        const d = Math.hypot(dx, dy);

        if (d < 25 && this.pathIndex < this.path.length - 1) {
          this.pathIndex++;
        } else if (d > 5) {
          this.vx = (dx / d) * this.moveSpeed;
          this.vy = (dy / d) * this.moveSpeed;
          this.x += this.vx * dt;
          this.y += this.vy * dt;
        }
      }
    } else {
      this.state = 'idle';
      this.vx = 0;
      this.vy = 0;
    }

    return fireResult;
  }

  public override serialize(): HostileState {
    const base = super.serialize();
    return {
      ...base,
      telegraphAngle: this.burstAngle,
      telegraphProgress: this.isTelegraphing ? 1 - (this.telegraphTimer / this.telegraphTotal) : 0,
    };
  }
}
