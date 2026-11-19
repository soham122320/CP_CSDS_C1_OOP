/**
 * High-Performance Object Pooled Particles, Tracers, Floating Damage Numbers,
 * Decals, and Hit-Stop Management
 * for SHARD-4: BLACKOUT PROTOCOL
 */

export interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  maxAlpha: number;
  life: number;
  maxLife: number;
  rotation: number;
  rotSpeed: number;
  type: 'spark' | 'dust' | 'shell' | 'oil';
}

export interface DamageNumber {
  active: boolean;
  x: number;
  y: number;
  text: string;
  color: string;
  scale: number;
  alpha: number;
  life: number;
  maxLife: number;
  vy: number;
  isCrit: boolean;
}

export interface Decal {
  x: number;
  y: number;
  radius: number;
  color: string;
  alpha: number;
  rotation: number;
}

export class ParticlePool {
  private particles: Particle[] = [];
  private damageNumbers: DamageNumber[] = [];
  public decals: Decal[] = [];
  private maxDecals: number = 200;

  // Hit-stop state
  private hitStopTimer: number = 0;

  // Hit-marker flash state
  public hitMarkerAlpha: number = 0;
  public hitMarkerCrit: boolean = false;

  constructor(particleCapacity: number = 500, damageCapacity: number = 100) {
    for (let i = 0; i < particleCapacity; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 1,
        color: '#fff',
        alpha: 1,
        maxAlpha: 1,
        life: 0,
        maxLife: 1,
        rotation: 0,
        rotSpeed: 0,
        type: 'spark',
      });
    }

    for (let i = 0; i < damageCapacity; i++) {
      this.damageNumbers.push({
        active: false,
        x: 0,
        y: 0,
        text: '',
        color: '#fff',
        scale: 1,
        alpha: 1,
        life: 0,
        maxLife: 0.8,
        vy: -40,
        isCrit: false,
      });
    }
  }

  public triggerHitStop(durationMs: number = 40): void {
    this.hitStopTimer = durationMs / 1000;
  }

  public isHitStopped(): boolean {
    return this.hitStopTimer > 0;
  }

  public triggerHitMarker(isCrit: boolean = false): void {
    this.hitMarkerAlpha = 1.0;
    this.hitMarkerCrit = isCrit;
  }

  public spawnShellCasing(x: number, y: number, aimAngle: number): void {
    const p = this.getFreeParticle();
    if (!p) return;

    // Eject shell ~90 degrees to the right of gun aim
    const ejectAngle = aimAngle + Math.PI * 0.5 + (Math.random() - 0.5) * 0.4;
    const speed = 70 + Math.random() * 50;

    p.active = true;
    p.x = x;
    p.y = y;
    p.vx = Math.cos(ejectAngle) * speed;
    p.vy = Math.sin(ejectAngle) * speed;
    p.size = 2.5;
    p.color = '#facc15'; // Brass yellow
    p.alpha = 1.0;
    p.maxAlpha = 1.0;
    p.life = 0;
    p.maxLife = 1.8;
    p.rotation = Math.random() * Math.PI * 2;
    p.rotSpeed = (Math.random() - 0.5) * 15;
    p.type = 'shell';
  }

  public spawnSprintDust(x: number, y: number): void {
    const p = this.getFreeParticle();
    if (!p) return;

    p.active = true;
    p.x = x + (Math.random() - 0.5) * 8;
    p.y = y + (Math.random() - 0.5) * 8;
    p.vx = (Math.random() - 0.5) * 20;
    p.vy = (Math.random() - 0.5) * 20;
    p.size = 2.0 + Math.random() * 2.5;
    p.color = '#06b6d4'; // Cyan spark
    p.alpha = 0.6;
    p.maxAlpha = 0.6;
    p.life = 0;
    p.maxLife = 0.25;
    p.rotation = 0;
    p.rotSpeed = 0;
    p.type = 'dust';
  }

  public spawnMuzzleFlash(x: number, y: number, angle: number): void {
    for (let i = 0; i < 4; i++) {
      const p = this.getFreeParticle();
      if (!p) break;

      const spread = (Math.random() - 0.5) * 0.6;
      const speed = 120 + Math.random() * 100;
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle + spread) * speed;
      p.vy = Math.sin(angle + spread) * speed;
      p.size = 1.8 + Math.random() * 2;
      p.color = '#fef08a';
      p.alpha = 1.0;
      p.maxAlpha = 1.0;
      p.life = 0;
      p.maxLife = 0.08;
      p.type = 'spark';
    }
  }

  public spawnShieldDeflectSparks(x: number, y: number, angle: number): void {
    const count = 12;
    for (let i = 0; i < count; i++) {
      const p = this.getFreeParticle();
      if (!p) break;

      const spread = (Math.random() - 0.5) * 1.5;
      const sparkAngle = angle + Math.PI + spread;
      const speed = 90 + Math.random() * 220;

      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(sparkAngle) * speed;
      p.vy = Math.sin(sparkAngle) * speed;
      p.size = 2.0 + Math.random() * 2.8;
      p.color = Math.random() > 0.35 ? '#38bdf8' : '#ffffff';
      p.alpha = 1.0;
      p.maxAlpha = 1.0;
      p.life = 0;
      p.maxLife = 0.16 + Math.random() * 0.22;
      p.rotation = 0;
      p.rotSpeed = 0;
      p.type = 'spark';
    }
  }

  public spawnDeathBurst(x: number, y: number, isSynth: boolean = true): void {
    const count = 18;
    for (let i = 0; i < count; i++) {
      const p = this.getFreeParticle();
      if (!p) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 220;

      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.size = 2.0 + Math.random() * 3.5;
      p.color = isSynth 
        ? (Math.random() > 0.4 ? '#06b6d4' : '#f97316') // Sparks and burning oil
        : '#ef4444';
      p.alpha = 1.0;
      p.maxAlpha = 1.0;
      p.life = 0;
      p.maxLife = 0.4 + Math.random() * 0.5;
      p.rotation = 0;
      p.rotSpeed = 0;
      p.type = 'spark';
    }

    // Leave a persistent blood/oil decal on the floor
    this.addDecal(x, y, 16 + Math.random() * 12, isSynth ? '#0f172a' : '#450a0a');
  }

  public addDecal(x: number, y: number, radius: number, color: string): void {
    if (this.decals.length >= this.maxDecals) {
      this.decals.shift();
    }
    this.decals.push({
      x,
      y,
      radius,
      color,
      alpha: 0.75,
      rotation: Math.random() * Math.PI * 2,
    });
  }

  public spawnDamageNumber(x: number, y: number, amount: number, isCrit: boolean, isWeakSpot: boolean): void {
    const d = this.damageNumbers.find((n) => !n.active);
    if (!d) return;

    d.active = true;
    d.x = x + (Math.random() - 0.5) * 16;
    d.y = y - 10;
    d.text = Math.round(amount).toString();
    d.isCrit = isCrit || isWeakSpot;

    if (isWeakSpot) {
      d.color = '#ef4444'; // Red weak-spot
      d.scale = 1.4;
      d.text = `WEAKSPOT -${Math.round(amount)}!`;
    } else if (isCrit) {
      d.color = '#facc15'; // Yellow crit
      d.scale = 1.25;
      d.text = `CRIT -${Math.round(amount)}!`;
    } else {
      d.color = '#f3f4f6'; // White normal
      d.scale = 1.0;
      d.text = `-${Math.round(amount)}`;
    }

    d.alpha = 1.0;
    d.life = 0;
    d.maxLife = 0.75;
    d.vy = -55;
  }

  private getFreeParticle(): Particle | null {
    return this.particles.find((p) => !p.active) || null;
  }

  public update(dt: number): void {
    // Hit-stop countdown
    if (this.hitStopTimer > 0) {
      this.hitStopTimer = Math.max(0, this.hitStopTimer - dt);
      return; // Freeze visual particle update during hit-stop
    }

    // Hit-marker fade
    if (this.hitMarkerAlpha > 0) {
      this.hitMarkerAlpha = Math.max(0, this.hitMarkerAlpha - dt * 5.0);
    }

    // Update Particles
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.type === 'shell') {
        // Friction on shells
        p.vx *= 0.92;
        p.vy *= 0.92;
        p.rotation += p.rotSpeed * dt;
      } else {
        p.vx *= 0.94;
        p.vy *= 0.94;
      }

      p.alpha = p.maxAlpha * (1 - p.life / p.maxLife);
    }

    // Update Floating Damage Numbers
    for (const d of this.damageNumbers) {
      if (!d.active) continue;
      d.life += dt;
      if (d.life >= d.maxLife) {
        d.active = false;
        continue;
      }
      d.y += d.vy * dt;
      d.alpha = 1 - d.life / d.maxLife;
    }
  }

  public renderParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      if (!p.active) continue;

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);

      if (p.type === 'shell') {
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size * 0.5, -p.size, p.size, p.size * 2);
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  public renderDamageNumbers(ctx: CanvasRenderingContext2D): void {
    for (const d of this.damageNumbers) {
      if (!d.active) continue;

      ctx.save();
      ctx.globalAlpha = d.alpha;
      ctx.font = `bold ${Math.floor(16 * d.scale)}px 'Chakra Petch', sans-serif`;
      ctx.fillStyle = d.color;
      ctx.textAlign = 'center';
      ctx.shadowColor = d.color;
      ctx.shadowBlur = d.isCrit ? 8 : 4;
      ctx.fillText(d.text, d.x, d.y);
      ctx.restore();
    }
  }
}
