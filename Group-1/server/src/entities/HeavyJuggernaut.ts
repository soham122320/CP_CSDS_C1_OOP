/**
 * Heavy Juggernaut (Shielded frontline tank with glowing rear weak-spot)
 */

import { HostileUnit } from './HostileUnit.js';
import { EnemyType, HostileState } from '@shared/types.js';
import { Operative } from './Operative.js';
import { PathfindingGrid } from '../ai/pathfinding.js';

export class HeavyJuggernaut extends HostileUnit {
  public readonly enemyType: EnemyType = 'juggernaut';
  public shieldHp: number = 140;
  public maxShieldHp: number = 140;
  public shieldActive: boolean = true;
  private cannonCooldown: number = 3.0;

  constructor(id: string, x: number, y: number) {
    super(id, x, y, 26, 220, 80); // 220 HP, 80 px/s
  }

  public stripShield(): void {
    this.shieldActive = false;
    this.shieldHp = 0;
  }

  public takeDamageFromAngle(
    amount: number,
    incomingAngle: number
  ): { damageTaken: number; wasShieldBlock: boolean; wasWeakSpot: boolean } {
    if (this.isDead) return { damageTaken: 0, wasShieldBlock: false, wasWeakSpot: false };

    // Calculate angle difference between hit direction and unit facing
    const hitDirection = incomingAngle + Math.PI; // Vector pointing towards Juggernaut
    let angleDiff = Math.abs((this.angle - hitDirection) % (2 * Math.PI));
    if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

    // Frontal shield covers front ~130 degrees (angleDiff < ~1.13 rad)
    if (this.shieldActive && this.shieldHp > 0 && angleDiff < 1.15) {
      const absorbed = Math.min(this.shieldHp, amount);
      this.shieldHp -= absorbed;
      if (this.shieldHp <= 0) {
        this.shieldActive = false;
      }
      return { damageTaken: absorbed, wasShieldBlock: true, wasWeakSpot: false };
    }

    // Weak spot on the BACK: angleDiff > 2.4 rad (~135-180 degrees)
    const isWeakSpot = angleDiff > 2.35;
    const finalDamage = isWeakSpot ? amount * 3.0 : amount;
    const taken = super.takeDamage(finalDamage);

    return { damageTaken: taken, wasShieldBlock: false, wasWeakSpot: isWeakSpot };
  }

  public update(dt: number, operatives: Operative[], pathfinder: PathfindingGrid): {
    fireCannon: boolean;
    x: number;
    y: number;
    angle: number;
    damage: number;
  } {
    let fireResult = { fireCannon: false, x: this.x, y: this.y, angle: this.angle, damage: 38 };

    if (this.isDead) return fireResult;

    if (this.isStunned) {
      this.stunTimer -= dt;
      if (this.stunTimer <= 0) {
        this.isStunned = false;
        this.state = 'chase';
      }
      return fireResult;
    }

    if (this.cannonCooldown > 0) {
      this.cannonCooldown -= dt;
    }

    const target = this.findNearestVisibleOperative(operatives, pathfinder, 700);

    if (target) {
      this.targetId = target.id;
      const dist = Math.hypot(target.x - this.x, target.y - this.y);
      this.angle = Math.atan2(target.y - this.y, target.x - this.x);

      // Heavy plasma cannon
      if (dist < 460 && this.cannonCooldown <= 0 && pathfinder.hasLineOfSight(this.x, this.y, target.x, target.y)) {
        this.cannonCooldown = 3.2;
        fireResult = {
          fireCannon: true,
          x: this.x + Math.cos(this.angle) * (this.radius + 8),
          y: this.y + Math.sin(this.angle) * (this.radius + 8),
          angle: this.angle,
          damage: 38,
        };
        return fireResult;
      }

      this.state = 'chase';
      this.pathUpdateTimer -= dt;
      if (this.pathUpdateTimer <= 0) {
        this.pathUpdateTimer = 0.55;
        this.path = pathfinder.findPath(this.x, this.y, target.x, target.y);
        this.pathIndex = 0;
      }

      if (this.path.length > 0) {
        const wp = this.path[this.pathIndex] || this.path[this.path.length - 1];
        const dx = wp.x - this.x;
        const dy = wp.y - this.y;
        const d = Math.hypot(dx, dy);

        if (d < 30 && this.pathIndex < this.path.length - 1) {
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
      shieldHp: this.shieldActive ? this.shieldHp : 0,
      maxShieldHp: this.maxShieldHp,
      weakSpotAngle: this.angle + Math.PI, // 180 degrees behind
    };
  }
}
