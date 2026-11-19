/**
 * Stalker Drone (Fast melee pack swarmer)
 */

import { HostileUnit } from './HostileUnit.js';
import { EnemyType } from '@shared/types.js';
import { Operative } from './Operative.js';
import { PathfindingGrid } from '../ai/pathfinding.js';

export class StalkerDrone extends HostileUnit {
  public readonly enemyType: EnemyType = 'stalker';
  private lungeCooldown: number = 0;
  private isLunging: boolean = false;
  private lungeTimer: number = 0;
  private lungeVx: number = 0;
  private lungeVy: number = 0;

  constructor(id: string, x: number, y: number) {
    super(id, x, y, 14, 38, 205); // Fast, 38 HP, 205 px/s
  }

  public update(dt: number, operatives: Operative[], pathfinder: PathfindingGrid): {
    attackHit: boolean;
    targetId: string | null;
    damage: number;
  } {
    let attackResult = { attackHit: false, targetId: null as string | null, damage: 0 };

    if (this.isDead) return attackResult;

    // Stun logic
    if (this.isStunned) {
      this.stunTimer -= dt;
      if (this.stunTimer <= 0) {
        this.isStunned = false;
        this.state = 'chase';
      }
      return attackResult;
    }

    if (this.lungeCooldown > 0) {
      this.lungeCooldown -= dt;
    }

    // Active lunge motion
    if (this.isLunging) {
      this.lungeTimer -= dt;
      this.x += this.lungeVx * dt;
      this.y += this.lungeVy * dt;

      // Check collision with operatives during lunge
      for (const op of operatives) {
        if (!op.isDead && Math.hypot(op.x - this.x, op.y - this.y) < this.radius + op.radius + 6) {
          attackResult = { attackHit: true, targetId: op.id, damage: 24 };
          this.isLunging = false;
          this.lungeCooldown = 1.6;
          break;
        }
      }

      if (this.lungeTimer <= 0) {
        this.isLunging = false;
        this.lungeCooldown = 1.6;
      }
      return attackResult;
    }

    // FSM
    const target = this.findNearestVisibleOperative(operatives, pathfinder, 600);

    if (target) {
      this.targetId = target.id;
      this.state = 'chase';
      const dist = Math.hypot(target.x - this.x, target.y - this.y);
      this.angle = Math.atan2(target.y - this.y, target.x - this.x);

      // Trigger lunge when close
      if (dist < 130 && this.lungeCooldown <= 0 && pathfinder.hasLineOfSight(this.x, this.y, target.x, target.y)) {
        this.isLunging = true;
        this.lungeTimer = 0.32;
        const lungeSpeed = 440;
        this.lungeVx = Math.cos(this.angle) * lungeSpeed;
        this.lungeVy = Math.sin(this.angle) * lungeSpeed;
        return attackResult;
      }

      // Pathfinding
      this.pathUpdateTimer -= dt;
      if (this.pathUpdateTimer <= 0) {
        this.pathUpdateTimer = 0.45;
        this.path = pathfinder.findPath(this.x, this.y, target.x, target.y);
        this.pathIndex = 0;
      }

      if (this.path.length > 0) {
        const wp = this.path[this.pathIndex] || this.path[this.path.length - 1];
        const dx = wp.x - this.x;
        const dy = wp.y - this.y;
        const d = Math.hypot(dx, dy);

        if (d < 20 && this.pathIndex < this.path.length - 1) {
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

    return attackResult;
  }
}
