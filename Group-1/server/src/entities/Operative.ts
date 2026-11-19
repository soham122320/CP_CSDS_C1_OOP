/**
 * Operative Hierarchy & Polymorphic Class Specializations
 * for SHARD-4: BLACKOUT PROTOCOL
 */

import { GameEntity } from './GameEntity.js';
import { CONSTANTS } from '@shared/constants.js';
import { OperativeClass, OperativeState, GrenadeType, WeaponType } from '@shared/types.js';
import { Weapon, WeaponFactory } from '@shared/weapons.js';

export abstract class Operative extends GameEntity {
  public abstract readonly operativeClass: OperativeClass;
  public readonly name: string;
  public readonly slotIndex: number;
  public isBot: boolean = false;

  public aimAngle: number = 0;
  public stamina: number = CONSTANTS.STAMINA.MAX;
  public maxStamina: number = CONSTANTS.STAMINA.MAX;
  public isSprinting: boolean = false;
  public isCrouched: boolean = false;
  public isDodging: boolean = false;
  public dodgeTimer: number = 0;
  public dodgeCooldownRemaining: number = 0;
  public dodgeDirection: { x: number; y: number } = { x: 0, y: 0 };
  public iframeTimer: number = 0;

  // DBNO Revive state
  public isDowned: boolean = false;
  public bleedoutTimer: number = CONSTANTS.DBNO.BLEEDOUT_TIME_SEC;
  public reviveProgress: number = 0; // 0 to 1
  public beingRevivedBy: string | null = null;

  // Class specific skill timers
  public skillCooldownRemaining: number = 0;
  public isCamo: boolean = false;
  public camoTimer: number = 0;
  public camoCritCharged: boolean = false;
  public hasRiotShield: boolean = false;
  public riotShieldAngle: number = 0;
  public riotShieldTimer: number = 0;

  // Weapons & Inventory
  public activeSlot: 1 | 2 = 1;
  public primaryWeapon: Weapon;
  public sidearmWeapon: Weapon;
  public fragCount: number = CONSTANTS.GRENADES.STARTING_COUNT;
  public empCount: number = CONSTANTS.GRENADES.STARTING_COUNT;
  public selectedGrenade: GrenadeType = 'frag';

  // Movement physics acceleration
  public targetVx: number = 0;
  public targetVy: number = 0;
  public staminaRegenDelayTimer: number = 0;
  public isStaminaLockedOut: boolean = false;
  public lastAcknowledgedSeq: number = 0;

  // Telemetry & Match Statistics
  public kills: number = 0;
  public damageDealt: number = 0;
  public headshots: number = 0;
  public revivesPerformed: number = 0;
  public terminalsHacked: number = 0;

  constructor(
    id: string,
    name: string,
    slotIndex: number,
    maxHp: number,
    initialWeapon: WeaponType,
    isBot: boolean = false
  ) {
    super(id, 0, 0, 16, maxHp);
    this.name = name;
    this.slotIndex = slotIndex;
    this.isBot = isBot;
    this.primaryWeapon = WeaponFactory.create(initialWeapon);
    this.sidearmWeapon = WeaponFactory.create('p45');
  }

  public getActiveWeapon(): Weapon {
    return this.activeSlot === 1 ? this.primaryWeapon : this.sidearmWeapon;
  }

  public switchWeapon(slot: 1 | 2): void {
    if (this.activeSlot !== slot) {
      this.getActiveWeapon().cancelReload();
      this.activeSlot = slot;
    }
  }

  public override takeDamage(amount: number): number {
    // Check i-frames
    if (this.iframeTimer > 0 || this.isDead) return 0;

    const actual = super.takeDamage(amount);

    // If active camo was on, taking damage breaks it
    if (this.isCamo) {
      this.isCamo = false;
      this.camoTimer = 0;
    }

    if (this.hp <= 0 && !this.isDowned) {
      this.triggerDownedState();
    }
    return actual;
  }

  public triggerDownedState(): void {
    this.isDowned = true;
    this.hp = 0;
    this.bleedoutTimer = CONSTANTS.DBNO.BLEEDOUT_TIME_SEC;
    this.reviveProgress = 0;
    this.beingRevivedBy = null;
    this.isSprinting = false;
    this.isDodging = false;
    this.isCamo = false;
    this.hasRiotShield = false;
    this.activeSlot = 2; // Forced to backup sidearm
  }

  public reviveSuccess(): void {
    this.isDowned = false;
    this.hp = Math.floor(this.maxHp * CONSTANTS.DBNO.REVIVED_HP_PERCENT);
    this.bleedoutTimer = CONSTANTS.DBNO.BLEEDOUT_TIME_SEC;
    this.reviveProgress = 0;
    this.beingRevivedBy = null;
    this.iframeTimer = CONSTANTS.DBNO.REVIVED_IFRAME_SEC;
  }

  public applyMovementInput(moveX: number, moveY: number, wantSprint: boolean, dt: number): void {
    if (this.isDead) return;

    if (this.isDowned) {
      // Crawl slowly
      const len = Math.hypot(moveX, moveY);
      if (len > 0.001) {
        this.vx = (moveX / len) * CONSTANTS.SPEED.DOWNED_CRAWL;
        this.vy = (moveY / len) * CONSTANTS.SPEED.DOWNED_CRAWL;
      } else {
        this.vx = 0;
        this.vy = 0;
      }
      return;
    }

    // Dodge in progress overrides regular movement
    if (this.isDodging) {
      const dodgeSpeed = CONSTANTS.SPEED.WALK * CONSTANTS.DODGE.SPEED_MULTIPLIER;
      this.vx = this.dodgeDirection.x * dodgeSpeed;
      this.vy = this.dodgeDirection.y * dodgeSpeed;
      return;
    }

    const isMoving = Math.hypot(moveX, moveY) > 0.1;

    // Sprint & Stamina logic
    if (wantSprint && isMoving && !this.isCrouched && !this.isStaminaLockedOut && this.stamina >= CONSTANTS.STAMINA.EXHAUSTION_THRESHOLD) {
      this.isSprinting = true;
      this.stamina = Math.max(0, this.stamina - CONSTANTS.STAMINA.SPRINT_DRAIN_PER_SEC * dt);
      this.staminaRegenDelayTimer = CONSTANTS.STAMINA.REGEN_DELAY_SEC;
      if (this.stamina < CONSTANTS.STAMINA.EXHAUSTION_THRESHOLD) {
        this.isStaminaLockedOut = true;
        this.isSprinting = false;
      }
    } else {
      this.isSprinting = false;
      if (this.staminaRegenDelayTimer > 0) {
        this.staminaRegenDelayTimer -= dt;
      } else {
        this.stamina = Math.min(this.maxStamina, this.stamina + CONSTANTS.STAMINA.REGEN_PER_SEC * dt);
        if (this.isStaminaLockedOut && this.stamina >= CONSTANTS.STAMINA.MIN_TO_START_SPRINT) {
          this.isStaminaLockedOut = false;
        }
      }
    }

    // Determine target speed
    let baseSpeed = CONSTANTS.SPEED.WALK;
    if (this.isSprinting) {
      baseSpeed *= CONSTANTS.SPEED.SPRINT_MULTIPLIER;
    } else if (this.isCrouched) {
      baseSpeed *= CONSTANTS.SPEED.CROUCH_MULTIPLIER;
    }

    const mag = Math.hypot(moveX, moveY);
    if (mag > 0.01) {
      this.targetVx = (moveX / mag) * baseSpeed;
      this.targetVy = (moveY / mag) * baseSpeed;
    } else {
      this.targetVx = 0;
      this.targetVy = 0;
    }

    // Smooth acceleration / deceleration
    const accelRate = this.targetVx !== 0 || this.targetVy !== 0 
      ? 1 / CONSTANTS.SPEED.ACCELERATION_TIME 
      : 1 / CONSTANTS.SPEED.DECELERATION_TIME;

    this.vx += (this.targetVx - this.vx) * Math.min(1, accelRate * dt);
    this.vy += (this.targetVy - this.vy) * Math.min(1, accelRate * dt);
  }

  public initiateDodge(aimAngle: number): boolean {
    if (this.isDead || this.isDowned || this.isDodging || this.dodgeCooldownRemaining > 0) {
      return false;
    }
    if (this.stamina < CONSTANTS.DODGE.COST) {
      return false;
    }

    this.stamina -= CONSTANTS.DODGE.COST;
    this.staminaRegenDelayTimer = CONSTANTS.STAMINA.REGEN_DELAY_SEC;
    this.isDodging = true;
    this.dodgeTimer = CONSTANTS.DODGE.BURST_DURATION_SEC;
    this.iframeTimer = CONSTANTS.DODGE.IFRAME_DURATION_SEC;
    this.dodgeCooldownRemaining = CONSTANTS.DODGE.COOLDOWN_SEC;

    // Interrupt reload
    this.getActiveWeapon().cancelReload();

    // Direction = current movement input or aim direction if standing still
    const moveMag = Math.hypot(this.vx, this.vy);
    if (moveMag > 10) {
      this.dodgeDirection = { x: this.vx / moveMag, y: this.vy / moveMag };
    } else {
      this.dodgeDirection = { x: Math.cos(aimAngle), y: Math.sin(aimAngle) };
    }

    return true;
  }

  public update(dt: number): void {
    // Update active weapons
    this.primaryWeapon.update(dt);
    this.sidearmWeapon.update(dt);

    // Update i-frames
    if (this.iframeTimer > 0) {
      this.iframeTimer = Math.max(0, this.iframeTimer - dt);
    }

    // Update dodge state
    if (this.dodgeCooldownRemaining > 0) {
      this.dodgeCooldownRemaining = Math.max(0, this.dodgeCooldownRemaining - dt);
    }
    if (this.isDodging) {
      this.dodgeTimer -= dt;
      if (this.dodgeTimer <= 0) {
        this.isDodging = false;
      }
    }

    // Update skill cooldown
    if (this.skillCooldownRemaining > 0) {
      this.skillCooldownRemaining = Math.max(0, this.skillCooldownRemaining - dt);
    }

    // Update DBNO bleedout
    if (this.isDowned && !this.isDead) {
      this.bleedoutTimer -= dt;
      if (this.bleedoutTimer <= 0) {
        this.isDead = true;
        this.isDowned = false;
      }
    }

    // Subclass specific skill timer updates
    this.updateClassSpecificTimers(dt);
  }

  protected abstract updateClassSpecificTimers(dt: number): void;

  public abstract useSkill(): { success: boolean; type: string; details?: any };

  public serialize(): OperativeState {
    return {
      id: this.id,
      name: this.name,
      slotIndex: this.slotIndex,
      isBot: this.isBot,
      operativeClass: this.operativeClass,
      x: this.x,
      y: this.y,
      vx: this.vx,
      vy: this.vy,
      aimAngle: this.aimAngle,
      hp: this.hp,
      maxHp: this.maxHp,
      stamina: Math.round(this.stamina),
      maxStamina: this.maxStamina,
      isSprinting: this.isSprinting,
      isCrouched: this.isCrouched,
      isDodging: this.isDodging,
      dodgeTimer: this.dodgeTimer,
      dodgeCooldownRemaining: this.dodgeCooldownRemaining,
      isDead: this.isDead,
      isDowned: this.isDowned,
      bleedoutTimer: this.bleedoutTimer,
      reviveProgress: this.reviveProgress,
      isCamo: this.isCamo,
      camoTimer: this.camoTimer,
      hasRiotShield: this.hasRiotShield,
      riotShieldAngle: this.riotShieldAngle,
      riotShieldTimer: this.riotShieldTimer,
      activeSlot: this.activeSlot,
      primaryWeapon: this.primaryWeapon.serialize(),
      sidearmWeapon: this.sidearmWeapon.serialize(),
      fragCount: this.fragCount,
      empCount: this.empCount,
      selectedGrenade: this.selectedGrenade,
      skillCooldownRemaining: this.skillCooldownRemaining,
      lastAcknowledgedSeq: this.lastAcknowledgedSeq,
      kills: this.kills,
      damageDealt: this.damageDealt,
      headshots: this.headshots,
      revivesPerformed: this.revivesPerformed,
      terminalsHacked: this.terminalsHacked,
    };
  }
}

/**
 * 1. Vanguard (Tank, 140 HP, MK-IV)
 * Overrides useSkill() with deployable Riot Shield blocking enemy bullets for 6s.
 */
export class VanguardOperative extends Operative {
  public readonly operativeClass: OperativeClass = 'vanguard';

  constructor(id: string, name: string, slotIndex: number, isBot: boolean = false) {
    super(id, name, slotIndex, CONSTANTS.OPERATIVES.VANGUARD.MAX_HP, 'mk4', isBot);
  }

  protected updateClassSpecificTimers(dt: number): void {
    if (this.hasRiotShield) {
      this.riotShieldAngle = this.aimAngle;
      this.riotShieldTimer -= dt;
      if (this.riotShieldTimer <= 0) {
        this.hasRiotShield = false;
      }
    }
  }

  public useSkill(): { success: boolean; type: string; details?: any } {
    if (this.isDead || this.isDowned || this.skillCooldownRemaining > 0) {
      return { success: false, type: 'shield' };
    }

    this.hasRiotShield = true;
    this.riotShieldTimer = CONSTANTS.OPERATIVES.VANGUARD.SHIELD_DURATION_SEC;
    this.riotShieldAngle = this.aimAngle;
    this.skillCooldownRemaining = CONSTANTS.OPERATIVES.VANGUARD.SKILL_COOLDOWN_SEC;

    return {
      success: true,
      type: 'vanguard_shield',
      details: { duration: this.riotShieldTimer, angle: this.riotShieldAngle },
    };
  }
}

/**
 * 2. Phantom (Recon, 90 HP, Rail-X)
 * Overrides useSkill() with Active Camo for 8s (invisibility, enemy AI de-aggro, +100% crit on next shot).
 */
export class PhantomOperative extends Operative {
  public readonly operativeClass: OperativeClass = 'phantom';

  constructor(id: string, name: string, slotIndex: number, isBot: boolean = false) {
    super(id, name, slotIndex, CONSTANTS.OPERATIVES.PHANTOM.MAX_HP, 'railx', isBot);
  }

  protected updateClassSpecificTimers(dt: number): void {
    if (this.isCamo) {
      this.camoTimer -= dt;
      if (this.camoTimer <= 0) {
        this.isCamo = false;
        this.camoCritCharged = false;
      }
    }
  }

  public useSkill(): { success: boolean; type: string; details?: any } {
    if (this.isDead || this.isDowned || this.skillCooldownRemaining > 0) {
      return { success: false, type: 'camo' };
    }

    this.isCamo = true;
    this.camoTimer = CONSTANTS.OPERATIVES.PHANTOM.CAMO_DURATION_SEC;
    this.camoCritCharged = true;
    this.skillCooldownRemaining = CONSTANTS.OPERATIVES.PHANTOM.SKILL_COOLDOWN_SEC;

    return {
      success: true,
      type: 'phantom_camo',
      details: { duration: this.camoTimer },
    };
  }
}

/**
 * 3. Breacher (CQC, 120 HP, SG-12)
 * Overrides useSkill() with Cluster Breaker (cluster EMP/Frag grenades).
 */
export class BreacherOperative extends Operative {
  public readonly operativeClass: OperativeClass = 'breacher';

  constructor(id: string, name: string, slotIndex: number, isBot: boolean = false) {
    super(id, name, slotIndex, CONSTANTS.OPERATIVES.BREACHER.MAX_HP, 'sg12', isBot);
  }

  protected updateClassSpecificTimers(dt: number): void {
    // No continuous timer needed besides base cooldown
  }

  public useSkill(): { success: boolean; type: string; details?: any } {
    if (this.isDead || this.isDowned || this.skillCooldownRemaining > 0) {
      return { success: false, type: 'cluster' };
    }

    this.skillCooldownRemaining = CONSTANTS.OPERATIVES.BREACHER.SKILL_COOLDOWN_SEC;

    return {
      success: true,
      type: 'breacher_cluster',
      details: {
        x: this.x,
        y: this.y,
        aimAngle: this.aimAngle,
        count: CONSTANTS.OPERATIVES.BREACHER.CLUSTER_COUNT,
      },
    };
  }
}

/**
 * 4. Medic (Support, 100 HP, Viper-9)
 * Overrides useSkill() with Nano-Heal & Ammo Beacon (AoE 8s) + hacks 2x faster.
 */
export class MedicOperative extends Operative {
  public readonly operativeClass: OperativeClass = 'medic';

  constructor(id: string, name: string, slotIndex: number, isBot: boolean = false) {
    super(id, name, slotIndex, CONSTANTS.OPERATIVES.MEDIC.MAX_HP, 'viper9', isBot);
  }

  protected updateClassSpecificTimers(dt: number): void {
    // Handled by active world beacon state
  }

  public useSkill(): { success: boolean; type: string; details?: any } {
    if (this.isDead || this.isDowned || this.skillCooldownRemaining > 0) {
      return { success: false, type: 'beacon' };
    }

    this.skillCooldownRemaining = CONSTANTS.OPERATIVES.MEDIC.SKILL_COOLDOWN_SEC;

    return {
      success: true,
      type: 'medic_beacon',
      details: {
        x: this.x,
        y: this.y,
        radius: CONSTANTS.OPERATIVES.MEDIC.BEACON_RADIUS,
        duration: CONSTANTS.OPERATIVES.MEDIC.BEACON_DURATION_SEC,
      },
    };
  }
}

/**
 * Factory for creating concrete Operative subclasses
 */
export class OperativeFactory {
  public static create(
    operativeClass: OperativeClass,
    id: string,
    name: string,
    slotIndex: number,
    isBot: boolean = false
  ): Operative {
    switch (operativeClass) {
      case 'vanguard':
        return new VanguardOperative(id, name, slotIndex, isBot);
      case 'phantom':
        return new PhantomOperative(id, name, slotIndex, isBot);
      case 'breacher':
        return new BreacherOperative(id, name, slotIndex, isBot);
      case 'medic':
        return new MedicOperative(id, name, slotIndex, isBot);
      default:
        return new VanguardOperative(id, name, slotIndex, isBot);
    }
  }
}
