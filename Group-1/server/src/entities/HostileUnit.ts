/**
 * Base HostileUnit class & Finite State Machine
 * for SHARD-4: BLACKOUT PROTOCOL
 */

import { GameEntity } from './GameEntity.js';
import { EnemyType, EnemyState, HostileState } from '@shared/types.js';
import { PathfindingGrid } from '../ai/pathfinding.js';
import { Operative } from './Operative.js';

export abstract class HostileUnit extends GameEntity {
  public abstract readonly enemyType: EnemyType;
  public state: EnemyState = 'idle';
  public angle: number = 0;
  public moveSpeed: number = 140;

  // Stun status
  public isStunned: boolean = false;
  public stunTimer: number = 0;

  // AI navigation & targeting
  public targetId: string | null = null;
  protected path: { x: number; y: number }[] = [];
  protected pathIndex: number = 0;
  protected pathUpdateTimer: number = Math.random() * 0.5;
  protected alertTimer: number = 0;
  protected stateTimer: number = 0;

  constructor(id: string, x: number, y: number, radius: number, maxHp: number, speed: number) {
    super(id, x, y, radius, maxHp);
    this.moveSpeed = speed;
  }

  public applyStun(duration: number): void {
    if (this.isDead) return;
    this.isStunned = true;
    this.stunTimer = Math.max(this.stunTimer, duration);
    this.state = 'stunned';
    this.vx = 0;
    this.vy = 0;
  }

  public override takeDamage(amount: number, isWeakSpot: boolean = false): number {
    if (this.isDead) return 0;
    const finalAmount = isWeakSpot ? amount * 3.0 : amount;
    const taken = super.takeDamage(finalAmount);

    if (this.state === 'idle') {
      this.state = 'alert';
      this.alertTimer = 2.0;
    }
    return taken;
  }

  protected findNearestVisibleOperative(
    operatives: Operative[],
    pathfinder: PathfindingGrid,
    maxDetectionRange: number = 650
  ): Operative | null {
    let nearest: Operative | null = null;
    let minDist = maxDetectionRange;

    for (const op of operatives) {
      if (op.isDead || op.isCamo) continue; // Phantom camo ignores aggro!
      const dist = Math.hypot(op.x - this.x, op.y - this.y);
      if (dist < minDist) {
        if (pathfinder.hasLineOfSight(this.x, this.y, op.x, op.y)) {
          minDist = dist;
          nearest = op;
        }
      }
    }

    return nearest;
  }

  public serialize(): HostileState {
    return {
      id: this.id,
      type: this.enemyType,
      state: this.state,
      x: this.x,
      y: this.y,
      vx: this.vx,
      vy: this.vy,
      angle: this.angle,
      hp: this.hp,
      maxHp: this.maxHp,
      isStunned: this.isStunned,
      stunTimer: this.stunTimer,
      targetId: this.targetId,
    };
  }
}
