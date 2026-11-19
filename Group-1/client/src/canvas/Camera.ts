/**
 * 2D Game Camera with Smooth Follow, Subtle Aim-Lead & Screen Shake
 * for SHARD-4: BLACKOUT PROTOCOL
 */

export class Camera {
  public x: number = 400;
  public y: number = 400;
  public width: number = 1920;
  public height: number = 1080;

  // Screen shake
  private shakeIntensity: number = 0;
  private shakeDecay: number = 22; // per second
  private shakeOffsetX: number = 0;
  private shakeOffsetY: number = 0;

  // Recoil kickback
  private kickbackX: number = 0;
  private kickbackY: number = 0;
  private kickbackRecovery: number = 16;

  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  public addShake(amount: number): void {
    this.shakeIntensity = Math.min(30, this.shakeIntensity + amount);
  }

  public addKickback(angle: number, amount: number): void {
    // Kickback impulse opposite to fire angle
    this.kickbackX -= Math.cos(angle) * amount;
    this.kickbackY -= Math.sin(angle) * amount;
  }

  public update(targetX: number, targetY: number, aimAngle: number, dt: number): void {
    // Subtle aim-lead in the direction of the cursor (35px)
    const aimLeadDist = 35;
    const desiredX = targetX + Math.cos(aimAngle) * aimLeadDist;
    const desiredY = targetY + Math.sin(aimAngle) * aimLeadDist;

    // Smooth camera follow with tuned lerp factor (0.12)
    const lerpFactor = 1 - Math.pow(1 - 0.12, Math.max(0.01, dt * 60));
    this.x += (desiredX - this.x) * lerpFactor;
    this.y += (desiredY - this.y) * lerpFactor;

    // Screen shake decay & calculation
    if (this.shakeIntensity > 0) {
      this.shakeOffsetX = (Math.random() - 0.5) * 2 * this.shakeIntensity;
      this.shakeOffsetY = (Math.random() - 0.5) * 2 * this.shakeIntensity;
      this.shakeIntensity = Math.max(0, this.shakeIntensity - this.shakeDecay * dt);
    } else {
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
    }

    // Recoil kickback recovery
    this.kickbackX += (0 - this.kickbackX) * Math.min(1, this.kickbackRecovery * dt);
    this.kickbackY += (0 - this.kickbackY) * Math.min(1, this.kickbackRecovery * dt);
  }

  public getViewportBounds(): { minX: number; minY: number; maxX: number; maxY: number } {
    const halfW = this.width * 0.5;
    const halfH = this.height * 0.5;
    return {
      minX: this.x - halfW - 150,
      minY: this.y - halfH - 150,
      maxX: this.x + halfW + 150,
      maxY: this.y + halfH + 150,
    };
  }

  public applyTransform(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(
      Math.floor(this.width * 0.5 - this.x + this.shakeOffsetX + this.kickbackX),
      Math.floor(this.height * 0.5 - this.y + this.shakeOffsetY + this.kickbackY)
    );
  }

  public restoreTransform(ctx: CanvasRenderingContext2D): void {
    ctx.restore();
  }

  public screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: screenX - this.width * 0.5 + this.x - this.shakeOffsetX - this.kickbackX,
      y: screenY - this.height * 0.5 + this.y - this.shakeOffsetY - this.kickbackY,
    };
  }
}
