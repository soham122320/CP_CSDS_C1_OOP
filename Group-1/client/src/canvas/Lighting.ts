/**
 * Tactical Atmospheric Lighting & Visual FX Engine
 * for SHARD-4: BLACKOUT PROTOCOL
 * 
 * 100% Visibility: NO black shadow polygons blocking the screen!
 * Features aesthetic volumetric flashlight beams, muzzle flash blooms,
 * explosion light bursts, and subtle cinematic corner vignettes.
 */

import { Camera } from './Camera.js';

export interface LightBurst {
  x: number;
  y: number;
  radius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export class LightingEngine {
  private lightBursts: LightBurst[] = [];
  private emergencyPulseTimer: number = 0;

  public addBurst(x: number, y: number, radius: number, color: string = '#fef08a', duration: number = 0.15): void {
    this.lightBursts.push({
      x,
      y,
      radius,
      color,
      alpha: 1.0,
      life: 0,
      maxLife: duration,
    });
  }

  public update(dt: number): void {
    this.emergencyPulseTimer += dt * 3.5;

    for (let i = this.lightBursts.length - 1; i >= 0; i--) {
      const b = this.lightBursts[i];
      b.life += dt;
      b.alpha = 1 - b.life / b.maxLife;
      if (b.life >= b.maxLife) {
        this.lightBursts.splice(i, 1);
      }
    }
  }

  public renderLighting(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    playerX: number,
    playerY: number,
    aimAngle: number,
    otherPlayers: { x: number; y: number; aimAngle: number }[],
    isEmergency: boolean
  ): void {
    // 1. Draw Volumetric Flashlight Beams in World Space
    camera.applyTransform(ctx);

    // Local player weapon tactical beam
    this.renderVolumetricFlashlight(ctx, playerX, playerY, aimAngle, '#38bdf8', 420);

    // Teammate flashlight beams
    for (const op of otherPlayers) {
      this.renderVolumetricFlashlight(ctx, op.x, op.y, op.aimAngle, '#06b6d4', 360);
    }

    // Dynamic Muzzle & Explosion light blooms
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const b of this.lightBursts) {
      const grad = ctx.createRadialGradient(b.x, b.y, 10, b.x, b.y, b.radius);
      grad.addColorStop(0, b.color);
      grad.addColorStop(0.4, b.color);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = grad;
      ctx.globalAlpha = b.alpha * 0.7;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    camera.restoreTransform(ctx);

    // 2. Draw Subtle Cinematic Screen Vignette in Screen Space (Well-lit, never blocking)
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const w = camera.width;
    const h = camera.height;
    const maxRadius = Math.hypot(w * 0.5, h * 0.5);

    const vignetteGrad = ctx.createRadialGradient(w * 0.5, h * 0.5, maxRadius * 0.45, w * 0.5, h * 0.5, maxRadius);
    if (isEmergency) {
      const pulse = Math.sin(this.emergencyPulseTimer) * 0.08;
      vignetteGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vignetteGrad.addColorStop(1, `rgba(185, 28, 28, ${0.28 + pulse})`);
    } else {
      vignetteGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vignetteGrad.addColorStop(1, 'rgba(3, 7, 18, 0.28)'); // Subtle atmospheric edge
    }

    ctx.fillStyle = vignetteGrad;
    ctx.fillRect(0, 0, w, h);

    ctx.restore();
  }

  /**
   * Aesthetic top-down volumetric flashlight beam projecting from operative weapon
   */
  private renderVolumetricFlashlight(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    angle: number,
    color: string,
    range: number = 420
  ): void {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    const halfFov = (55 * Math.PI) / 360; // 55 degree arc
    const grad = ctx.createRadialGradient(x, y, 15, x, y, range);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
    grad.addColorStop(0.3, 'rgba(56, 189, 248, 0.15)');
    grad.addColorStop(0.7, 'rgba(6, 182, 212, 0.06)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, range, angle - halfFov, angle + halfFov);
    ctx.closePath();
    ctx.fill();

    // Sharp central weapon laser sight line
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * (range * 0.9), y + Math.sin(angle) * (range * 0.9));
    ctx.stroke();

    ctx.restore();
  }
}
