/**
 * Snapshot Interpolation Engine (~100ms Render Buffer)
 * for SHARD-4: BLACKOUT PROTOCOL
 */

import { GameSnapshot, OperativeState, HostileState } from '@shared/types.js';
import { CONSTANTS } from '@shared/constants.js';

interface BufferedSnapshot {
  timestamp: number;
  snapshot: GameSnapshot;
}

export class SnapshotInterpolator {
  private buffer: BufferedSnapshot[] = [];
  private readonly bufferOffsetMs: number = CONSTANTS.CLIENT_INTERPOLATION_OFFSET_MS; // 100ms delay

  public pushSnapshot(snapshot: GameSnapshot): void {
    this.buffer.push({
      timestamp: Date.now(),
      snapshot,
    });

    // Prune buffer older than 800ms
    const pruneTime = Date.now() - 800;
    while (this.buffer.length > 2 && this.buffer[0].timestamp < pruneTime) {
      this.buffer.shift();
    }
  }

  public getLatestSnapshot(): GameSnapshot | null {
    if (this.buffer.length === 0) return null;
    return this.buffer[this.buffer.length - 1].snapshot;
  }

  public getInterpolatedEntities(): {
    operatives: Map<string, OperativeState>;
    enemies: Map<string, HostileState>;
  } {
    const operatives = new Map<string, OperativeState>();
    const enemies = new Map<string, HostileState>();

    if (this.buffer.length === 0) {
      return { operatives, enemies };
    }

    if (this.buffer.length === 1) {
      for (const op of this.buffer[0].snapshot.operatives) operatives.set(op.id, op);
      for (const en of this.buffer[0].snapshot.enemies) enemies.set(en.id, en);
      return { operatives, enemies };
    }

    const renderTime = Date.now() - this.bufferOffsetMs;

    // Find previous and next snapshots
    let s0: BufferedSnapshot = this.buffer[0];
    let s1: BufferedSnapshot = this.buffer[this.buffer.length - 1];

    for (let i = 0; i < this.buffer.length - 1; i++) {
      if (this.buffer[i].timestamp <= renderTime && this.buffer[i + 1].timestamp >= renderTime) {
        s0 = this.buffer[i];
        s1 = this.buffer[i + 1];
        break;
      }
    }

    const span = s1.timestamp - s0.timestamp;
    const alpha = span > 0 ? Math.max(0, Math.min(1, (renderTime - s0.timestamp) / span)) : 0;

    // Interpolate Operatives
    const nextOpsMap = new Map(s1.snapshot.operatives.map((o) => [o.id, o]));
    for (const prevOp of s0.snapshot.operatives) {
      const nextOp = nextOpsMap.get(prevOp.id);
      if (nextOp) {
        operatives.set(prevOp.id, {
          ...nextOp,
          x: this.lerp(prevOp.x, nextOp.x, alpha),
          y: this.lerp(prevOp.y, nextOp.y, alpha),
          aimAngle: this.lerpAngle(prevOp.aimAngle, nextOp.aimAngle, alpha),
        });
      } else {
        operatives.set(prevOp.id, prevOp);
      }
    }

    // Interpolate Enemies
    const nextEnemiesMap = new Map(s1.snapshot.enemies.map((e) => [e.id, e]));
    for (const prevEn of s0.snapshot.enemies) {
      const nextEn = nextEnemiesMap.get(prevEn.id);
      if (nextEn) {
        enemies.set(prevEn.id, {
          ...nextEn,
          x: this.lerp(prevEn.x, nextEn.x, alpha),
          y: this.lerp(prevEn.y, nextEn.y, alpha),
          angle: this.lerpAngle(prevEn.angle, nextEn.angle, alpha),
        });
      } else {
        enemies.set(prevEn.id, prevEn);
      }
    }

    return { operatives, enemies };
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private lerpAngle(a: number, b: number, t: number): number {
    let diff = (b - a) % (2 * Math.PI);
    if (diff < -Math.PI) diff += 2 * Math.PI;
    if (diff > Math.PI) diff -= 2 * Math.PI;
    return a + diff * t;
  }
}
