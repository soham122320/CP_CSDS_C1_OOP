/**
 * Client-Side Prediction & Server Reconciliation for Local Operative
 * for SHARD-4: BLACKOUT PROTOCOL
 * 
 * Butter-smooth 60 FPS client-side movement loop with zero server snap-back.
 */

import { PlayerInputPacket, OperativeState } from '@shared/types.js';
import { CONSTANTS } from '@shared/constants.js';
import { MapData } from '@shared/mapData.js';

export class ClientPrediction {
  public predictedX: number = 570;
  public predictedY: number = 420;
  public predictedVx: number = 0;
  public predictedVy: number = 0;
  private pendingInputs: PlayerInputPacket[] = [];
  private currentSeq: number = 0;
  private map: MapData | null = null;
  public bulkheadsOpen: boolean[] = [false, false, false, false];
  public shardsRecovered: number = 0;

  public setMap(map: MapData): void {
    this.map = map;
  }

  public setBulkheads(bulkheads: boolean[], shards: number = 0): void {
    this.bulkheadsOpen = bulkheads;
    this.shardsRecovered = shards;
  }

  public initPosition(x: number, y: number): void {
    this.predictedX = x;
    this.predictedY = y;
    this.predictedVx = 0;
    this.predictedVy = 0;
    this.pendingInputs = [];
  }

  public getNextSequenceNumber(): number {
    return ++this.currentSeq;
  }

  public recordAndPredictInput(input: PlayerInputPacket): void {
    this.pendingInputs.push(input);

    // Apply movement physics locally immediately
    const dt = input.dt;
    let baseSpeed = CONSTANTS.SPEED.WALK;
    if (input.isSprinting) {
      baseSpeed *= CONSTANTS.SPEED.SPRINT_MULTIPLIER;
    } else if (input.isCrouched) {
      baseSpeed *= CONSTANTS.SPEED.CROUCH_MULTIPLIER;
    }

    const mag = Math.hypot(input.moveX, input.moveY);
    let targetVx = 0;
    let targetVy = 0;

    if (mag > 0.01) {
      targetVx = (input.moveX / mag) * baseSpeed;
      targetVy = (input.moveY / mag) * baseSpeed;
    }

    // Dodge override
    if (input.isDodging) {
      const dodgeSpeed = CONSTANTS.SPEED.WALK * CONSTANTS.DODGE.SPEED_MULTIPLIER;
      targetVx = Math.cos(input.aimAngle) * dodgeSpeed;
      targetVy = Math.sin(input.aimAngle) * dodgeSpeed;
    }

    const accelRate = targetVx !== 0 || targetVy !== 0 
      ? 1 / CONSTANTS.SPEED.ACCELERATION_TIME 
      : 1 / CONSTANTS.SPEED.DECELERATION_TIME;

    this.predictedVx += (targetVx - this.predictedVx) * Math.min(1, accelRate * dt);
    this.predictedVy += (targetVy - this.predictedVy) * Math.min(1, accelRate * dt);

    this.predictedX += this.predictedVx * dt;
    this.predictedY += this.predictedVy * dt;

    this.resolveMapCollision(input.isCrouched);
  }

  private isTileSolid(tx: number, ty: number): boolean {
    if (!this.map) return false;
    if (tx < 0 || tx >= this.map.width || ty < 0 || ty >= this.map.height) return true;
    const tile = this.map.grid[ty][tx];
    if (tile === 0 || tile === 2) return false;

    // Bulkhead door collision check (Door 1: shards >= 1, Door 2: shards >= 2, etc.)
    if (tile >= 3 && tile <= 6) {
      const doorIdx = tile - 3;
      const requiredShards = doorIdx + 1;
      if (this.bulkheadsOpen[doorIdx] || this.shardsRecovered >= requiredShards) {
        return false; // Walkable! Pass freely!
      }
      return true;
    }
    return true;
  }

  private resolveMapCollision(isCrouched: boolean): void {
    if (!this.map) return;
    const rad = isCrouched ? 16 * CONSTANTS.CROUCH.HITBOX_RADIUS_MODIFIER : 16;
    const ts = this.map.tileSize;

    const minTx = Math.max(0, Math.floor((this.predictedX - rad - 2) / ts));
    const maxTx = Math.min(this.map.width - 1, Math.floor((this.predictedX + rad + 2) / ts));
    const minTy = Math.max(0, Math.floor((this.predictedY - rad - 2) / ts));
    const maxTy = Math.min(this.map.height - 1, Math.floor((this.predictedY + rad + 2) / ts));

    for (let ty = minTy; ty <= maxTy; ty++) {
      for (let tx = minTx; tx <= maxTx; tx++) {
        if (!this.isTileSolid(tx, ty)) continue;

        const tileLeft = tx * ts;
        const tileRight = tileLeft + ts;
        const tileTop = ty * ts;
        const tileBottom = tileTop + ts;

        // Eject if center inside tile
        if (this.predictedX >= tileLeft && this.predictedX <= tileRight &&
            this.predictedY >= tileTop && this.predictedY <= tileBottom) {
          const toLeft = this.predictedX - tileLeft;
          const toRight = tileRight - this.predictedX;
          const toTop = this.predictedY - tileTop;
          const toBottom = tileBottom - this.predictedY;
          const minPen = Math.min(toLeft, toRight, toTop, toBottom);

          if (minPen === toLeft) this.predictedX = tileLeft - rad - 1;
          else if (minPen === toRight) this.predictedX = tileRight + rad + 1;
          else if (minPen === toTop) this.predictedY = tileTop - rad - 1;
          else this.predictedY = tileBottom + rad + 1;
          continue;
        }

        const closestX = Math.max(tileLeft, Math.min(this.predictedX, tileRight));
        const closestY = Math.max(tileTop, Math.min(this.predictedY, tileBottom));
        const distX = this.predictedX - closestX;
        const distY = this.predictedY - closestY;
        const distSq = distX * distX + distY * distY;

        if (distSq < rad * rad && distSq > 0.0001) {
          const dist = Math.sqrt(distSq);
          const overlap = rad - dist;
          this.predictedX += (distX / dist) * overlap;
          this.predictedY += (distY / dist) * overlap;
        }
      }
    }
  }

  public reconcileWithServer(serverState: OperativeState): void {
    const dx = serverState.x - this.predictedX;
    const dy = serverState.y - this.predictedY;
    const dist = Math.hypot(dx, dy);

    // Only reconcile if discrepancy exceeds 120px (prevents any rubber-banding)
    if (dist > 120) {
      // Lerp smoothly by 0.15 instead of hard snapping
      this.predictedX += dx * 0.15;
      this.predictedY += dy * 0.15;
    }

    // Prune acknowledged inputs
    this.pendingInputs = this.pendingInputs.filter(
      (input) => input.seq > serverState.lastAcknowledgedSeq
    );
  }

  public updateErrorDecay(_dt: number): void {
    // Kept for backward compatibility
  }

  public getVisualPosition(): { x: number; y: number } {
    return {
      x: this.predictedX,
      y: this.predictedY,
    };
  }
}
