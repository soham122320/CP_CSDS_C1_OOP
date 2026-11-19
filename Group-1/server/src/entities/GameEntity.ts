/**
 * Base GameEntity class (OOP hierarchy root for all active world actors)
 */

import { Vector2D } from '@shared/types.js';

export abstract class GameEntity {
  public readonly id: string;
  public x: number;
  public y: number;
  public vx: number = 0;
  public vy: number = 0;
  public radius: number;
  public hp: number;
  public maxHp: number;
  public isDead: boolean = false;

  constructor(id: string, x: number, y: number, radius: number, maxHp: number) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.maxHp = maxHp;
    this.hp = maxHp;
  }

  public takeDamage(amount: number): number {
    if (this.isDead) return 0;
    const actual = Math.min(this.hp, amount);
    this.hp -= actual;
    if (this.hp <= 0) {
      this.hp = 0;
      this.isDead = true;
    }
    return actual;
  }

  public heal(amount: number): number {
    if (this.isDead) return 0;
    const missing = this.maxHp - this.hp;
    const healed = Math.min(missing, amount);
    this.hp += healed;
    return healed;
  }

  public getPosition(): Vector2D {
    return { x: this.x, y: this.y };
  }

  public abstract update(dt: number, ...args: any[]): void;
}
