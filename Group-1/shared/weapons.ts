/**
 * Weapon System (OOP with Polymorphic firing algorithms)
 * for SHARD-4: BLACKOUT PROTOCOL
 */

import { WeaponType, SerializedWeapon, ProjectileState } from './types.js';
import { OutOfAmmoException } from './exceptions.js';

export interface FireResult {
  projectiles: {
    weaponType: WeaponType;
    x: number;
    y: number;
    vx: number;
    vy: number;
    damage: number;
    radius: number;
    lifetime: number;
    maxLifetime: number;
    pierceCount?: number;
    isCrit?: boolean;
    isHitscan?: boolean;
    hitscanMaxDistance?: number;
  }[];
  recoilAngle: number;
  recoilKickback: number;
  soundName: string;
}

export abstract class Weapon {
  public abstract readonly type: WeaponType;
  public abstract readonly name: string;
  public abstract readonly isAutomatic: boolean;
  public abstract readonly magCapacity: number;
  public abstract readonly maxReserveAmmo: number;
  public abstract readonly fireRateRps: number; // Rounds per second
  public abstract readonly reloadTimeSec: number;
  public abstract readonly baseSpreadRad: number;
  public abstract readonly recoilImpulse: number;
  public abstract readonly baseDamage: number;
  public abstract readonly effectiveRange: number;
  public abstract readonly projectileSpeed: number;

  public magAmmo: number = 0;
  public reserveAmmo: number = 0;
  public isReloading: boolean = false;
  public reloadTimer: number = 0;
  public lastShotTime: number = 0;
  public hasInfiniteReserve: boolean = false;

  constructor(initialMag?: number, initialReserve?: number) {
    // Initialized in subclasses
  }

  public initAmmo(mag?: number, reserve?: number): void {
    this.magAmmo = mag !== undefined ? mag : this.magCapacity;
    this.reserveAmmo = reserve !== undefined ? reserve : (this.hasInfiniteReserve ? Infinity : this.maxReserveAmmo);
  }

  public canFire(currentTimeSec: number): boolean {
    if (this.isReloading) return false;
    const interval = 1 / this.fireRateRps;
    if (currentTimeSec - this.lastShotTime < interval) return false;
    return this.magAmmo > 0;
  }

  public abstract fire(
    originX: number,
    originY: number,
    aimAngle: number,
    spreadMultiplier: number,
    currentTimeSec: number
  ): FireResult;

  public reload(): boolean {
    if (this.isReloading) return false;
    if (this.magAmmo >= this.magCapacity) return false;
    if (!this.hasInfiniteReserve && this.reserveAmmo <= 0) {
      throw new OutOfAmmoException(this.name, true);
    }
    this.isReloading = true;
    this.reloadTimer = 0;
    return true;
  }

  public cancelReload(): void {
    this.isReloading = false;
    this.reloadTimer = 0;
  }

  public update(dt: number): boolean {
    if (!this.isReloading) return false;
    this.reloadTimer += dt;
    if (this.reloadTimer >= this.reloadTimeSec) {
      this.completeReload();
      return true; // Reload finished
    }
    return false;
  }

  protected completeReload(): void {
    const needed = this.magCapacity - this.magAmmo;
    if (this.hasInfiniteReserve) {
      this.magAmmo = this.magCapacity;
    } else {
      const take = Math.min(needed, this.reserveAmmo);
      this.magAmmo += take;
      this.reserveAmmo -= take;
    }
    this.isReloading = false;
    this.reloadTimer = 0;
  }

  public addReserveAmmo(amount: number): number {
    if (this.hasInfiniteReserve) return 0;
    const space = this.maxReserveAmmo - this.reserveAmmo;
    const added = Math.min(space, amount);
    this.reserveAmmo += added;
    return added;
  }

  public serialize(): SerializedWeapon {
    return {
      type: this.type,
      name: this.name,
      magAmmo: this.magAmmo,
      magCapacity: this.magCapacity,
      reserveAmmo: this.hasInfiniteReserve ? 999 : this.reserveAmmo,
      maxReserveAmmo: this.hasInfiniteReserve ? 999 : this.maxReserveAmmo,
      isReloading: this.isReloading,
      reloadProgress: this.isReloading ? Math.min(1, this.reloadTimer / this.reloadTimeSec) : 0,
      hasInfiniteReserve: this.hasInfiniteReserve,
    };
  }

  public applySerialized(data: SerializedWeapon): void {
    this.magAmmo = data.magAmmo;
    if (!this.hasInfiniteReserve) {
      this.reserveAmmo = data.reserveAmmo;
    }
    this.isReloading = data.isReloading;
    this.reloadTimer = data.reloadProgress * this.reloadTimeSec;
  }
}

/**
 * 1. MK-IV Pulse Rifle (RapidProjectile)
 * Balanced, reliable medium-range rifle with full-auto capability.
 */
export class Mk4PulseRifle extends Weapon {
  public readonly type: WeaponType = 'mk4';
  public readonly name: string = 'MK-IV Pulse Rifle';
  public readonly isAutomatic: boolean = true;
  public readonly magCapacity: number = 30;
  public readonly maxReserveAmmo: number = 180;
  public readonly fireRateRps: number = 9.5; // ~570 RPM
  public readonly reloadTimeSec: number = 1.8;
  public readonly baseSpreadRad: number = 0.045; // ~2.5 deg
  public readonly recoilImpulse: number = 4.2;
  public readonly baseDamage: number = 18;
  public readonly effectiveRange: number = 550;
  public readonly projectileSpeed: number = 780; // px/s

  constructor(mag?: number, reserve?: number) {
    super();
    this.initAmmo(mag, reserve);
  }

  public fire(
    originX: number,
    originY: number,
    aimAngle: number,
    spreadMultiplier: number,
    currentTimeSec: number
  ): FireResult {
    if (this.magAmmo <= 0) {
      throw new OutOfAmmoException(this.name, this.reserveAmmo <= 0);
    }
    this.magAmmo--;
    this.lastShotTime = currentTimeSec;

    const spread = (Math.random() - 0.5) * this.baseSpreadRad * spreadMultiplier * 2;
    const finalAngle = aimAngle + spread;
    const lifetime = this.effectiveRange / this.projectileSpeed;

    return {
      projectiles: [
        {
          weaponType: this.type,
          x: originX,
          y: originY,
          vx: Math.cos(finalAngle) * this.projectileSpeed,
          vy: Math.sin(finalAngle) * this.projectileSpeed,
          damage: this.baseDamage,
          radius: 4,
          lifetime: 0,
          maxLifetime: lifetime,
        },
      ],
      recoilAngle: (Math.random() - 0.5) * 0.03,
      recoilKickback: this.recoilImpulse,
      soundName: 'fire_mk4',
    };
  }
}

/**
 * 2. SG-12 Breach Shotgun (PelletSpread)
 * Devastating close-range weapon that fires 8 pellets with heavy knockback.
 */
export class Sg12BreachShotgun extends Weapon {
  public readonly type: WeaponType = 'sg12';
  public readonly name: string = 'SG-12 Breach Shotgun';
  public readonly isAutomatic: boolean = false;
  public readonly magCapacity: number = 8;
  public readonly maxReserveAmmo: number = 48;
  public readonly fireRateRps: number = 1.4; // Pump action delay
  public readonly reloadTimeSec: number = 2.4;
  public readonly baseSpreadRad: number = 0.17; // ~10 deg spread
  public readonly recoilImpulse: number = 14.0;
  public readonly baseDamage: number = 11; // 11 * 8 = 88 dmg point blank
  public readonly effectiveRange: number = 320;
  public readonly projectileSpeed: number = 680;

  constructor(mag?: number, reserve?: number) {
    super();
    this.initAmmo(mag, reserve);
  }

  public fire(
    originX: number,
    originY: number,
    aimAngle: number,
    spreadMultiplier: number,
    currentTimeSec: number
  ): FireResult {
    if (this.magAmmo <= 0) {
      throw new OutOfAmmoException(this.name, this.reserveAmmo <= 0);
    }
    this.magAmmo--;
    this.lastShotTime = currentTimeSec;

    const pelletCount = 8;
    const projectiles: FireResult['projectiles'] = [];

    for (let i = 0; i < pelletCount; i++) {
      const spread = (Math.random() - 0.5) * this.baseSpreadRad * spreadMultiplier * 2;
      const angle = aimAngle + spread;
      const speed = this.projectileSpeed * (0.92 + Math.random() * 0.16);
      const lifetime = this.effectiveRange / speed;

      projectiles.push({
        weaponType: this.type,
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        damage: this.baseDamage,
        radius: 3.5,
        lifetime: 0,
        maxLifetime: lifetime,
      });
    }

    return {
      projectiles,
      recoilAngle: (Math.random() - 0.5) * 0.08,
      recoilKickback: this.recoilImpulse,
      soundName: 'fire_sg12',
    };
  }
}

/**
 * 3. Viper-9 SMG (RapidProjectile)
 * High fire rate, generous magazine, tight mobile handling with rapid reload.
 */
export class Viper9Smg extends Weapon {
  public readonly type: WeaponType = 'viper9';
  public readonly name: string = 'Viper-9 SMG';
  public readonly isAutomatic: boolean = true;
  public readonly magCapacity: number = 40;
  public readonly maxReserveAmmo: number = 240;
  public readonly fireRateRps: number = 14.0; // 840 RPM
  public readonly reloadTimeSec: number = 1.3;
  public readonly baseSpreadRad: number = 0.07;
  public readonly recoilImpulse: number = 2.4;
  public readonly baseDamage: number = 12;
  public readonly effectiveRange: number = 420;
  public readonly projectileSpeed: number = 740;

  constructor(mag?: number, reserve?: number) {
    super();
    this.initAmmo(mag, reserve);
  }

  public fire(
    originX: number,
    originY: number,
    aimAngle: number,
    spreadMultiplier: number,
    currentTimeSec: number
  ): FireResult {
    if (this.magAmmo <= 0) {
      throw new OutOfAmmoException(this.name, this.reserveAmmo <= 0);
    }
    this.magAmmo--;
    this.lastShotTime = currentTimeSec;

    // Viper-9 has reduced spread penalty while sprinting/moving
    const effectiveSpread = this.baseSpreadRad * (1 + (spreadMultiplier - 1) * 0.5);
    const spread = (Math.random() - 0.5) * effectiveSpread * 2;
    const finalAngle = aimAngle + spread;
    const lifetime = this.effectiveRange / this.projectileSpeed;

    return {
      projectiles: [
        {
          weaponType: this.type,
          x: originX,
          y: originY,
          vx: Math.cos(finalAngle) * this.projectileSpeed,
          vy: Math.sin(finalAngle) * this.projectileSpeed,
          damage: this.baseDamage,
          radius: 3.2,
          lifetime: 0,
          maxLifetime: lifetime,
        },
      ],
      recoilAngle: (Math.random() - 0.5) * 0.02,
      recoilKickback: this.recoilImpulse,
      soundName: 'fire_viper9',
    };
  }
}

/**
 * 4. Rail-X Sniper (HitscanRay)
 * High-velocity magnetic accelerator piercing up to 3 enemies with 3x weak-spot crit.
 */
export class RailXSniper extends Weapon {
  public readonly type: WeaponType = 'railx';
  public readonly name: string = 'Rail-X Piercing Sniper';
  public readonly isAutomatic: boolean = false;
  public readonly magCapacity: number = 5;
  public readonly maxReserveAmmo: number = 30;
  public readonly fireRateRps: number = 0.9;
  public readonly reloadTimeSec: number = 2.6;
  public readonly baseSpreadRad: number = 0.008; // Pinpoint accurate
  public readonly recoilImpulse: number = 16.0;
  public readonly baseDamage: number = 85;
  public readonly effectiveRange: number = 950;
  public readonly projectileSpeed: number = 2400; // Near-instant

  constructor(mag?: number, reserve?: number) {
    super();
    this.initAmmo(mag, reserve);
  }

  public fire(
    originX: number,
    originY: number,
    aimAngle: number,
    spreadMultiplier: number,
    currentTimeSec: number
  ): FireResult {
    if (this.magAmmo <= 0) {
      throw new OutOfAmmoException(this.name, this.reserveAmmo <= 0);
    }
    this.magAmmo--;
    this.lastShotTime = currentTimeSec;

    const spread = (Math.random() - 0.5) * this.baseSpreadRad * spreadMultiplier * 2;
    const finalAngle = aimAngle + spread;

    return {
      projectiles: [
        {
          weaponType: this.type,
          x: originX,
          y: originY,
          vx: Math.cos(finalAngle) * this.projectileSpeed,
          vy: Math.sin(finalAngle) * this.projectileSpeed,
          damage: this.baseDamage,
          radius: 5,
          lifetime: 0,
          maxLifetime: this.effectiveRange / this.projectileSpeed,
          pierceCount: 3, // Pierces up to 3 targets
          isHitscan: true,
          hitscanMaxDistance: this.effectiveRange,
        },
      ],
      recoilAngle: (Math.random() - 0.5) * 0.05,
      recoilKickback: this.recoilImpulse,
      soundName: 'fire_railx',
    };
  }
}

/**
 * 5. P-45 Sidearm
 * Reliable semi-automatic backup with infinite reserve ammo.
 */
export class P45Sidearm extends Weapon {
  public readonly type: WeaponType = 'p45';
  public readonly name: string = 'P-45 Sidearm';
  public readonly isAutomatic: boolean = false;
  public readonly magCapacity: number = 12;
  public readonly maxReserveAmmo: number = Infinity;
  public readonly fireRateRps: number = 4.2;
  public readonly reloadTimeSec: number = 1.2;
  public readonly baseSpreadRad: number = 0.055;
  public readonly recoilImpulse: number = 3.2;
  public readonly baseDamage: number = 15;
  public readonly effectiveRange: number = 420;
  public readonly projectileSpeed: number = 660;

  constructor(mag?: number, reserve?: number) {
    super();
    this.hasInfiniteReserve = true;
    this.initAmmo(mag, reserve);
  }

  public fire(
    originX: number,
    originY: number,
    aimAngle: number,
    spreadMultiplier: number,
    currentTimeSec: number
  ): FireResult {
    if (this.magAmmo <= 0) {
      throw new OutOfAmmoException(this.name, false);
    }
    this.magAmmo--;
    this.lastShotTime = currentTimeSec;

    const spread = (Math.random() - 0.5) * this.baseSpreadRad * spreadMultiplier * 2;
    const finalAngle = aimAngle + spread;
    const lifetime = this.effectiveRange / this.projectileSpeed;

    return {
      projectiles: [
        {
          weaponType: this.type,
          x: originX,
          y: originY,
          vx: Math.cos(finalAngle) * this.projectileSpeed,
          vy: Math.sin(finalAngle) * this.projectileSpeed,
          damage: this.baseDamage,
          radius: 3.5,
          lifetime: 0,
          maxLifetime: lifetime,
        },
      ],
      recoilAngle: (Math.random() - 0.5) * 0.03,
      recoilKickback: this.recoilImpulse,
      soundName: 'fire_p45',
    };
  }
}

/**
 * Factory for creating Weapon instances
 */
export class WeaponFactory {
  public static create(type: WeaponType, mag?: number, reserve?: number): Weapon {
    switch (type) {
      case 'mk4':
        return new Mk4PulseRifle(mag, reserve);
      case 'sg12':
        return new Sg12BreachShotgun(mag, reserve);
      case 'viper9':
        return new Viper9Smg(mag, reserve);
      case 'railx':
        return new RailXSniper(mag, reserve);
      case 'p45':
        return new P45Sidearm(mag, reserve);
      default:
        return new P45Sidearm(mag, reserve);
    }
  }
}
