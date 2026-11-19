/**
 * Shield Pylon for Core Warden Boss Phase 1
 */

import { HostileUnit } from './HostileUnit.js';
import { EnemyType } from '@shared/types.js';

export class ShieldPylon extends HostileUnit {
  public readonly enemyType: EnemyType = 'pylon';

  constructor(id: string, x: number, y: number, humanCount: number = 1) {
    // Scales HP based on human count
    const hp = 150 + humanCount * 40;
    super(id, x, y, 22, hp, 0); // Immobile pylon
  }

  public update(dt: number): void {
    // Stationary conduit
    this.vx = 0;
    this.vy = 0;
  }
}
