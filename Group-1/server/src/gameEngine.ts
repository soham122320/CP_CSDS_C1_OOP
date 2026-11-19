/**
 * Authoritative 30 Hz Game Engine
 * for SHARD-4: BLACKOUT PROTOCOL
 */

import { Server } from 'socket.io';
import { CONSTANTS } from '@shared/constants.js';
import {
  GameSnapshot,
  PlayerInputPacket,
  CombatEvent,
  ProjectileState,
  LootCrateState,
  PlasmaBarrelState,
  ExtractionPadState,
  ActiveBeaconState,
  WeaponType,
} from '@shared/types.js';
import { buildStationErebusMap, MapData, TILE_WALL, TILE_COVER } from '@shared/mapData.js';
import { PathfindingGrid } from './ai/pathfinding.js';
import { SpatialHashGrid } from './physics/spatialHash.js';
import { LagCompensationBuffer } from './physics/lagCompensation.js';
import { Operative, VanguardOperative, PhantomOperative, BreacherOperative, MedicOperative } from './entities/Operative.js';
import { AISquadmateController } from './entities/AISquadmate.js';
import { HostileUnit } from './entities/HostileUnit.js';
import { StalkerDrone } from './entities/StalkerDrone.js';
import { EnforcerSynth } from './entities/EnforcerSynth.js';
import { HeavyJuggernaut } from './entities/HeavyJuggernaut.js';
import { CoreWarden } from './entities/CoreWarden.js';
import { ShieldPylon } from './entities/ShieldPylon.js';
import { MysteryEngine } from './mystery/mysteryEngine.js';
import { WeaponFactory } from '@shared/weapons.js';

export class GameEngine {
  public readonly roomCode: string;
  private io: Server;
  private map: MapData;
  private pathfinder: PathfindingGrid;
  private spatialHash: SpatialHashGrid;
  private lagComp: LagCompensationBuffer;
  private mysteryEngine: MysteryEngine;

  // Active actors & entities
  public operatives: Map<string, Operative> = new Map();
  private botControllers: Map<string, AISquadmateController> = new Map();
  private inputQueues: Map<string, PlayerInputPacket[]> = new Map();
  private enemies: Map<string, HostileUnit> = new Map();
  private projectiles: ProjectileState[] = [];
  private crates: LootCrateState[] = [];
  private barrels: PlasmaBarrelState[] = [];
  private extractionPads: ExtractionPadState[] = [];
  private beacons: ActiveBeaconState[] = [];
  private pendingEvents: CombatEvent[] = [];

  // Boss & Endgame State
  private boss: CoreWarden | null = null;
  private pylons: ShieldPylon[] = [];
  private bossSpawned: boolean = false;
  private bossDefeated: boolean = false;
  private reactorCountdown: number = CONSTANTS.EXTRACTION.REACTOR_COUNTDOWN_SEC;
  private extractionHoldTimer: number = 0;
  private gameStatus: 'playing' | 'failed' | 'victory' = 'playing';

  // Game loop timing
  private tickInterval: NodeJS.Timeout | null = null;
  private tickCount: number = 0;
  private lastTime: number = Date.now();
  private enemySpawnTimer: number = 0;

  constructor(roomCode: string, io: Server) {
    this.roomCode = roomCode;
    this.io = io;
    this.map = buildStationErebusMap();
    this.pathfinder = new PathfindingGrid(this.map.grid, this.map.tileSize);
    this.spatialHash = new SpatialHashGrid(96);
    this.lagComp = new LagCompensationBuffer();
    this.mysteryEngine = new MysteryEngine();

    this.initMapEntities();
  }

  private initMapEntities(): void {
    // Crates
    this.crates = this.map.crates.map((c, i) => ({
      id: `crate_${i}`,
      x: c.x,
      y: c.y,
      weaponType: c.weaponType,
      opened: false,
    }));

    // Plasma Barrels
    this.barrels = this.map.barrels.map((b, i) => ({
      id: `barrel_${i}`,
      x: b.x,
      y: b.y,
      hp: CONSTANTS.PROPS.BARREL_HP,
      isExploding: false,
    }));

    // Extraction Sync Pads
    this.extractionPads = this.map.extractionPads.map((p) => ({
      id: `pad_${p.index}`,
      index: p.index,
      x: p.x,
      y: p.y,
      radius: 48,
      isOccupied: false,
      occupantId: null,
    }));

    // Spawn Sector A starting enemy patrol
    this.spawnSectorEnemies(0);
  }

  public addOperative(operative: Operative): void {
    this.operatives.set(operative.id, operative);
    this.inputQueues.set(operative.id, []);

    // Set spawn point based on sector 0 in clean 2x2 squad formation spaced by 60px
    const spawn = this.map.sectors[0].spawnPoint;
    const squad2x2 = [
      { x: -30, y: -30, angle: 0 },              // Slot 0: Top-Left (570, 420)
      { x: 30, y: -30, angle: -Math.PI * 0.25 }, // Slot 1: Top-Right (630, 420)
      { x: -30, y: 30, angle: Math.PI * 0.75 },  // Slot 2: Bottom-Left (570, 480)
      { x: 30, y: 30, angle: Math.PI * 0.25 },   // Slot 3: Bottom-Right (630, 480)
    ];
    const offset = squad2x2[operative.slotIndex % 4] || squad2x2[0];
    operative.x = spawn.x + offset.x;
    operative.y = spawn.y + offset.y;
    operative.aimAngle = offset.angle;
    operative.vx = 0;
    operative.vy = 0;

    if (operative.isBot) {
      this.botControllers.set(operative.id, new AISquadmateController(operative, this.pathfinder));
    }
  }

  public enqueueInput(playerId: string, input: PlayerInputPacket): void {
    const queue = this.inputQueues.get(playerId);
    if (queue) {
      queue.push(input);
    }
  }

  public start(): void {
    if (this.tickInterval) return;
    this.lastTime = Date.now();
    this.tickInterval = setInterval(() => {
      try {
        this.tick();
      } catch (loopErr) {
        console.error('[GameEngine 30Hz Loop Error Guard]:', loopErr);
      }
    }, CONSTANTS.SERVER_TICK_INTERVAL_MS);
  }

  public stop(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  private tick(): void {
    try {
      const now = Date.now();
      const dt = Math.min(0.05, (now - this.lastTime) / 1000);
      this.lastTime = now;
      this.tickCount++;

      if (this.gameStatus !== 'playing') {
        this.broadcastSnapshot();
        return;
      }

      // 1. Process Operative Inputs (Human & AI Bots)
      try {
        this.processOperativeInputs(dt, now);
      } catch (err) {
        console.error('[GameEngine] Error in processOperativeInputs:', err);
      }

      // 2. Update Mystery Engine & Bulkheads
      try {
        this.updateMystery(dt);
      } catch (err) {
        console.error('[GameEngine] Error in updateMystery:', err);
      }

      // 3. Update Combat Props & Beacons
      try {
        this.updateBeacons(dt);
      } catch (err) {
        console.error('[GameEngine] Error in updateBeacons:', err);
      }

      // 4. Update Hostile AI (Boss & Minions)
      try {
        this.updateHostileAI(dt);
      } catch (err) {
        console.error('[GameEngine] Error in updateHostileAI:', err);
      }

      // 5. Update Projectiles & Collisions
      try {
        this.updateProjectiles(dt);
      } catch (err) {
        console.error('[GameEngine] Error in updateProjectiles:', err);
      }

      // 6. Check Endgame & Extraction Conditions
      try {
        this.updateEndgameConditions(dt);
      } catch (err) {
        console.error('[GameEngine] Error in updateEndgameConditions:', err);
      }

      // 7. Check Defeat Condition (All 4 operatives Downed/Dead)
      try {
        this.checkDefeatCondition();
      } catch (err) {
        console.error('[GameEngine] Error in checkDefeatCondition:', err);
      }

      // 8. Record Lag Compensation History
      try {
        this.recordLagCompensation(now);
      } catch (err) {
        console.error('[GameEngine] Error in recordLagCompensation:', err);
      }

      // 9. Broadcast Snapshot to Room
      this.broadcastSnapshot();
    } catch (fatalErr) {
      console.error('[GameEngine] Fatal tick error caught cleanly:', fatalErr);
    }
  }

  private processOperativeInputs(dt: number, currentTimeMs: number): void {
    const currentTimeSec = currentTimeMs / 1000;
    const allOps = Array.from(this.operatives.values());
    const enemyList = Array.from(this.enemies.values());

    for (const [id, op] of this.operatives.entries()) {
      if (op.isDead) continue;

      if (op.isBot) {
        // AI Squadmate Bot Logic
        const bot = this.botControllers.get(id);
        if (bot) {
          const decision = bot.update(
            dt,
            allOps,
            enemyList,
            this.mysteryEngine.terminals,
            this.extractionPads,
            this.bossDefeated,
            this.mysteryEngine.recoveredShards.length
          );
          op.aimAngle = decision.aimAngle;
          op.applyMovementInput(decision.moveX, decision.moveY, false, dt);
          op.x += op.vx * dt;
          op.y += op.vy * dt;
          this.applyMapCollision(op);

          if (decision.useSkill) {
            this.executeOperativeSkill(op);
          }

          if (decision.isFiring) {
            this.executeOperativeFire(op, currentTimeSec);
          }

          if (decision.isReviving && decision.revivingTargetId) {
            this.handleReviveInteraction(op, decision.revivingTargetId, dt);
          }
        }
      } else {
        // Human Operative Input Queue
        const queue = this.inputQueues.get(id) || [];
        while (queue.length > 0) {
          const input = queue.shift()!;
          op.lastAcknowledgedSeq = input.seq;
          op.aimAngle = input.aimAngle;
          op.isCrouched = input.isCrouched;

          if (input.switchSlot) {
            op.switchWeapon(input.switchSlot);
          }

          if (input.isDodging) {
            op.initiateDodge(input.aimAngle);
          }

          if (input.posX !== undefined && input.posY !== undefined) {
            const dist = Math.hypot(input.posX - op.x, input.posY - op.y);
            if (dist < 160) {
              op.x = input.posX;
              op.y = input.posY;
            } else {
              op.applyMovementInput(input.moveX, input.moveY, input.isSprinting, dt);
              op.x += op.vx * dt;
              op.y += op.vy * dt;
            }
          } else {
            op.applyMovementInput(input.moveX, input.moveY, input.isSprinting, dt);
            op.x += op.vx * dt;
            op.y += op.vy * dt;
          }
          this.applyMapCollision(op);

          if (input.isReloading) {
            op.getActiveWeapon().reload();
          }

          if (input.useSkill) {
            this.executeOperativeSkill(op);
          }

          if (input.throwGrenade) {
            this.executeGrenadeThrow(op);
          }

          if (input.isFiring) {
            this.executeOperativeFire(op, currentTimeSec);
          }

          if (input.isInteracting) {
            this.handlePlayerInteract(op, dt);
          }
        }
      }

      op.update(dt);
    }
  }

  private handlePlayerInteract(op: Operative, dt: number): void {
    if (op.isDead || op.isDowned) return;

    // Check Reviving Downed Teammates
    for (const other of this.operatives.values()) {
      if (other.id !== op.id && other.isDowned && !other.isDead) {
        const dist = Math.hypot(other.x - op.x, other.y - op.y);
        if (dist <= 50) {
          this.handleReviveInteraction(op, other.id, dt);
          return;
        }
      }
    }

    // Check Loot Crates
    for (const crate of this.crates) {
      if (!crate.opened && Math.hypot(crate.x - op.x, crate.y - op.y) <= 45) {
        crate.opened = true;
        // Equip weapon to primary slot
        op.primaryWeapon = WeaponFactory.create(crate.weaponType);
        op.fragCount = Math.min(CONSTANTS.GRENADES.MAX_COUNT, op.fragCount + 1);
        op.empCount = Math.min(CONSTANTS.GRENADES.MAX_COUNT, op.empCount + 1);
        this.pendingEvents.push({
          id: `crate_loot_${Date.now()}_${op.id}`,
          type: 'kill',
          x: crate.x,
          y: crate.y,
          text: `EQUIPPED: ${op.primaryWeapon.name.toUpperCase()}`,
          sourceId: op.id,
        });
        return;
      }
    }
  }

  private handleReviveInteraction(reviver: Operative, targetId: string, dt: number): void {
    const target = this.operatives.get(targetId);
    if (!target || !target.isDowned || target.isDead) return;

    target.beingRevivedBy = reviver.id;
    // Medic revives 2x faster (1.5s vs 3.0s)
    const reviveTime = reviver.operativeClass === 'medic' 
      ? CONSTANTS.DBNO.REVIVE_TIME_MEDIC_SEC 
      : CONSTANTS.DBNO.REVIVE_TIME_STANDARD_SEC;

    target.reviveProgress += dt / reviveTime;

    if (target.reviveProgress >= 1.0) {
      target.reviveSuccess();
      reviver.revivesPerformed++;
      this.pendingEvents.push({
        id: `revive_done_${Date.now()}_${target.id}`,
        type: 'revive_success',
        x: target.x,
        y: target.y,
        text: `${target.name} REVIVED!`,
        sourceId: reviver.id,
        targetId: target.id,
      });
    }
  }

  private executeOperativeFire(op: Operative, currentTimeSec: number): void {
    if (op.isDead) return;
    const weapon = op.getActiveWeapon();

    // Spread modifier: crouching reduces spread by 40%
    const spreadMultiplier = op.isCrouched ? CONSTANTS.CROUCH.SPREAD_MODIFIER : (op.isSprinting ? 1.6 : 1.0);

    if (weapon.canFire(currentTimeSec)) {
      try {
        const result = weapon.fire(op.x, op.y, op.aimAngle, spreadMultiplier, currentTimeSec);

        // Check Phantom Camo Crit
        let isCrit = false;
        let critMultiplier = 1.0;
        if (op.isCamo || op.camoCritCharged) {
          isCrit = true;
          critMultiplier = CONSTANTS.OPERATIVES.PHANTOM.CRIT_BONUS_MULTIPLIER;
          op.isCamo = false;
          op.camoCritCharged = false;
          op.camoTimer = 0;
        }

        for (const proj of result.projectiles) {
          const finalDamage = Math.round(proj.damage * critMultiplier * (op.isDowned ? CONSTANTS.DBNO.DOWNED_WEAPON_DAMAGE_MODIFIER : 1.0));

          if (proj.isHitscan) {
            // Rail-X Lag-Compensated Hitscan Ray
            this.resolveHitscanShot(op, proj.x, proj.y, Math.atan2(proj.vy, proj.vx), finalDamage, proj.hitscanMaxDistance || 950, isCrit);
          } else {
            this.projectiles.push({
              id: `proj_${this.tickCount}_${Math.random()}`,
              ownerId: op.id,
              isEnemy: false,
              weaponType: proj.weaponType,
              x: proj.x,
              y: proj.y,
              vx: proj.vx,
              vy: proj.vy,
              damage: finalDamage,
              radius: proj.radius,
              lifetime: 0,
              maxLifetime: proj.maxLifetime,
              isCrit,
            });
          }
        }
      } catch (err: any) {
        // OutOfAmmoException or other handling
      }
    }
  }

  private resolveHitscanShot(
    shooter: Operative,
    originX: number,
    originY: number,
    angle: number,
    damage: number,
    maxDistance: number,
    isCrit: boolean
  ): void {
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);
    let hitCount = 0;
    const maxPierce = 3;

    // Raycast step
    const stepSize = 16;
    const steps = Math.floor(maxDistance / stepSize);
    const hitEnemies = new Set<string>();

    for (let s = 1; s <= steps && hitCount < maxPierce; s++) {
      const curX = originX + dirX * (s * stepSize);
      const curY = originY + dirY * (s * stepSize);

      // Check wall collision
      const tx = Math.floor(curX / this.map.tileSize);
      const ty = Math.floor(curY / this.map.tileSize);
      if (!this.pathfinder.isWalkableTile(tx, ty)) {
        break; // Bullet stops at wall
      }

      // Check enemy hit
      for (const enemy of this.enemies.values()) {
        if (enemy.isDead || hitEnemies.has(enemy.id)) continue;
        const dist = Math.hypot(enemy.x - curX, enemy.y - curY);
        if (dist <= enemy.radius + 8) {
          hitEnemies.add(enemy.id);
          hitCount++;

          let taken = 0;
          let wasWeakSpot = false;

          if (enemy instanceof HeavyJuggernaut) {
            const res = enemy.takeDamageFromAngle(damage, angle);
            taken = res.damageTaken;
            wasWeakSpot = res.wasWeakSpot;
          } else {
            // Rail-X deals 3x weak-spot damage
            taken = enemy.takeDamage(damage, isCrit);
          }

          shooter.damageDealt += taken;
          if (isCrit || wasWeakSpot) shooter.headshots++;

          if (enemy.isDead) {
            shooter.kills++;
            this.pendingEvents.push({
              id: `kill_${Date.now()}_${enemy.id}`,
              type: 'kill',
              x: enemy.x,
              y: enemy.y,
              text: `+${Math.round(taken)} [KILL]`,
              sourceId: shooter.id,
            });
          } else {
            this.pendingEvents.push({
              id: `dmg_${Date.now()}_${enemy.id}`,
              type: 'damage',
              x: enemy.x,
              y: enemy.y,
              amount: Math.round(taken),
              isCrit: isCrit || wasWeakSpot,
              isWeakSpot: wasWeakSpot,
              sourceId: shooter.id,
              targetId: enemy.id,
            });
          }
        }
      }
    }
  }

  private executeOperativeSkill(op: Operative): void {
    const res = op.useSkill();
    if (!res.success) return;

    if (res.type === 'medic_beacon') {
      this.beacons.push({
        id: `beacon_${Date.now()}`,
        ownerId: op.id,
        x: res.details.x,
        y: res.details.y,
        radius: res.details.radius,
        remainingTime: res.details.duration,
      });
      this.pendingEvents.push({
        id: `ev_beacon_${Date.now()}`,
        type: 'kill',
        x: res.details.x,
        y: res.details.y,
        text: 'NANO-BEACON DEPLOYED',
        sourceId: op.id,
      });
    } else if (res.type === 'breacher_cluster') {
      // Launch 5 cluster explosives
      for (let i = 0; i < res.details.count; i++) {
        const spread = (i - 2) * 0.28;
        const angle = res.details.aimAngle + spread;
        const speed = 360 + Math.random() * 80;
        this.projectiles.push({
          id: `cluster_${this.tickCount}_${i}`,
          ownerId: op.id,
          isEnemy: false,
          weaponType: 'grenade_frag',
          x: res.details.x,
          y: res.details.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          damage: CONSTANTS.GRENADES.FRAG.DAMAGE * 0.6,
          radius: 6,
          lifetime: 0,
          maxLifetime: 0.9 + i * 0.1,
        });
      }
    }
  }

  private executeGrenadeThrow(op: Operative): void {
    if (op.isDead || op.isDowned) return;
    const isFrag = op.selectedGrenade === 'frag';
    if (isFrag && op.fragCount <= 0) return;
    if (!isFrag && op.empCount <= 0) return;

    if (isFrag) op.fragCount--;
    else op.empCount--;

    const speed = 400;
    this.projectiles.push({
      id: `grenade_${this.tickCount}_${Math.random()}`,
      ownerId: op.id,
      isEnemy: false,
      weaponType: isFrag ? 'grenade_frag' : 'grenade_emp',
      x: op.x,
      y: op.y,
      vx: Math.cos(op.aimAngle) * speed,
      vy: Math.sin(op.aimAngle) * speed,
      damage: isFrag ? CONSTANTS.GRENADES.FRAG.DAMAGE : 25,
      radius: 7,
      lifetime: 0,
      maxLifetime: CONSTANTS.GRENADES.FUSE_SEC,
    });
  }

  private updateMystery(dt: number): void {
    const result = this.mysteryEngine.update(dt, Array.from(this.operatives.values()));
    this.pendingEvents.push(...result.events);

    // Keep pathfinder door collision thresholds continuously updated
    this.pathfinder.setBulkheads(
      this.mysteryEngine.bulkheadsOpen,
      this.mysteryEngine.recoveredShards.length
    );

    if (result.bulkheadUnlockedIndex !== null) {
      // Spawn next sector enemies
      const nextSector = result.bulkheadUnlockedIndex + 1;
      if (nextSector <= 3) {
        this.spawnSectorEnemies(nextSector);
      } else if (nextSector === 4 && !this.bossSpawned) {
        // Vault Blast Door Opened -> Spawn Core Warden Boss!
        this.spawnCoreWardenBoss();
      }
    }
  }

  private updateBeacons(dt: number): void {
    for (let i = this.beacons.length - 1; i >= 0; i--) {
      const beacon = this.beacons[i];
      beacon.remainingTime -= dt;

      // Pulse heal & ammo to allies within radius
      for (const op of this.operatives.values()) {
        if (!op.isDead && !op.isDowned) {
          const dist = Math.hypot(op.x - beacon.x, op.y - beacon.y);
          if (dist <= beacon.radius) {
            op.heal(CONSTANTS.OPERATIVES.MEDIC.BEACON_HEAL_PER_SEC * dt);
            op.primaryWeapon.addReserveAmmo(3);
          }
        }
      }

      if (beacon.remainingTime <= 0) {
        this.beacons.splice(i, 1);
      }
    }
  }

  private updateHostileAI(dt: number): void {
    const ops = Array.from(this.operatives.values());

    for (const [id, enemy] of this.enemies.entries()) {
      if (enemy.isDead) {
        this.enemies.delete(id);
        continue;
      }

      if (enemy instanceof StalkerDrone) {
        const res = enemy.update(dt, ops, this.pathfinder);
        if (res.attackHit && res.targetId) {
          const target = this.operatives.get(res.targetId);
          if (target) {
            target.takeDamage(res.damage);
            this.pendingEvents.push({
              id: `enemy_hit_${Date.now()}`,
              type: 'damage',
              x: target.x,
              y: target.y,
              amount: res.damage,
              targetId: target.id,
            });
          }
        }
      } else if (enemy instanceof EnforcerSynth) {
        const res = enemy.update(dt, ops, this.pathfinder);
        if (res.fireProjectile) {
          const speed = 560;
          this.projectiles.push({
            id: `proj_enforcer_${Date.now()}_${Math.random()}`,
            ownerId: enemy.id,
            isEnemy: true,
            weaponType: 'mk4',
            x: res.x,
            y: res.y,
            vx: Math.cos(res.angle) * speed,
            vy: Math.sin(res.angle) * speed,
            damage: res.damage,
            radius: 4,
            lifetime: 0,
            maxLifetime: 1.2,
          });
        }
      } else if (enemy instanceof HeavyJuggernaut) {
        const res = enemy.update(dt, ops, this.pathfinder);
        if (res.fireCannon) {
          const speed = 480;
          this.projectiles.push({
            id: `proj_juggernaut_${Date.now()}`,
            ownerId: enemy.id,
            isEnemy: true,
            weaponType: 'sg12',
            x: res.x,
            y: res.y,
            vx: Math.cos(res.angle) * speed,
            vy: Math.sin(res.angle) * speed,
            damage: res.damage,
            radius: 7,
            lifetime: 0,
            maxLifetime: 1.5,
          });
        }
      } else if (enemy instanceof CoreWarden) {
        const res = enemy.update(dt, ops, this.pathfinder);

        // Check if all 4 pylons destroyed
        if (enemy.phase === 1) {
          const validPylons = this.pylons.filter((p) => p !== null && p !== undefined);
          const anyPylonAlive = validPylons.length >= 4 && validPylons.some((p) => !p.isDead);
          if (validPylons.length >= 4 && !anyPylonAlive) {
            enemy.setPylonsDestroyed();
            this.pendingEvents.push({
              id: `boss_phase2_${Date.now()}`,
              type: 'boss_phase',
              x: enemy.x,
              y: enemy.y,
              text: 'WARDEN SHIELDS DOWN — PHASE 2 GROUND SLAM!',
            });
          }
        }

        // Apply boss lasers to operatives (instant O(1) angle difference, zero infinite loops)
        for (const laser of res.lasers) {
          if (!laser || isNaN(laser.x) || isNaN(laser.y)) continue;
          for (const op of ops) {
            if (!op.isDead && op.iframeTimer <= 0) {
              const dx = op.x - laser.x;
              const dy = op.y - laser.y;
              const opAngle = Math.atan2(dy, dx);
              let angleDiff = Math.abs((laser.angle - opAngle) % (2 * Math.PI));
              if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
              const dist = Math.hypot(dx, dy);

              if (angleDiff < 0.14 && dist <= laser.length) {
                op.takeDamage(laser.damage);
              }
            }
          }
        }

        // Handle boss shockwaves
        for (const sw of res.shockwaves) {
          for (const op of ops) {
            if (!op.isDead && op.iframeTimer <= 0) {
              const dist = Math.hypot(op.x - sw.x, op.y - sw.y);
              if (dist <= sw.maxRadius) {
                op.takeDamage(sw.damage);
                this.pendingEvents.push({
                  id: `shockwave_hit_${Date.now()}`,
                  type: 'damage',
                  x: op.x,
                  y: op.y,
                  amount: sw.damage,
                  text: 'DODGE SLAM!',
                });
              }
            }
          }
        }

        // Handle minion spawns
        if (res.spawnEvent) {
          for (let s = 0; s < res.spawnEvent.count; s++) {
            const sx = enemy.x + (Math.random() - 0.5) * 200;
            const sy = enemy.y + (Math.random() - 0.5) * 200;
            if (res.spawnEvent.type === 'stalker') {
              const drone = new StalkerDrone(`drone_boss_${Date.now()}_${s}`, sx, sy);
              this.enemies.set(drone.id, drone);
            } else {
              const synth = new EnforcerSynth(`synth_boss_${Date.now()}_${s}`, sx, sy);
              this.enemies.set(synth.id, synth);
            }
          }
        }

        if (enemy.isDead && !this.bossDefeated) {
          this.bossDefeated = true;
          this.pendingEvents.push({
            id: `warden_defeated_${Date.now()}`,
            type: 'shard_unlocked',
            x: enemy.x,
            y: enemy.y,
            text: 'CORE WARDEN DESTROYED — BLACKOUT PROTOCOL FAILING!',
          });
        }
      }
    }
  }

  private updateProjectiles(dt: number): void {
    const ops = Array.from(this.operatives.values());

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.lifetime += dt;
      proj.x += proj.vx * dt;
      proj.y += proj.vy * dt;

      // 1. Grenade Fuse Expiry Explosion
      if (proj.weaponType === 'grenade_frag' || proj.weaponType === 'grenade_emp') {
        if (proj.lifetime >= proj.maxLifetime) {
          this.detonateGrenade(proj);
          this.projectiles.splice(i, 1);
          continue;
        }
      }

      // 2. Wall collision
      const tx = Math.floor(proj.x / this.map.tileSize);
      const ty = Math.floor(proj.y / this.map.tileSize);
      if (!this.pathfinder.isWalkableTile(tx, ty)) {
        this.projectiles.splice(i, 1);
        continue;
      }

      // 3. Max lifetime expiry
      if (proj.lifetime >= proj.maxLifetime) {
        this.projectiles.splice(i, 1);
        continue;
      }

      // 4. Player bullet hitting enemies or plasma barrels
      if (!proj.isEnemy) {
        let hit = false;

        // Check Barrel hit
        for (const barrel of this.barrels) {
          if (!barrel.isExploding && Math.hypot(barrel.x - proj.x, barrel.y - proj.y) <= 18) {
            barrel.hp -= proj.damage;
            hit = true;
            if (barrel.hp <= 0) {
              this.detonatePlasmaBarrel(barrel);
            }
            break;
          }
        }

        if (hit) {
          this.projectiles.splice(i, 1);
          continue;
        }

        // Check Enemy hit
        for (const enemy of this.enemies.values()) {
          if (enemy.isDead) continue;
          const dist = Math.hypot(enemy.x - proj.x, enemy.y - proj.y);
          if (dist <= enemy.radius + proj.radius) {
            hit = true;
            const shooter = this.operatives.get(proj.ownerId);

            let taken = 0;
            let wasWeakSpot = false;
            const bulletAngle = Math.atan2(proj.vy, proj.vx);

            if (enemy instanceof HeavyJuggernaut) {
              const res = enemy.takeDamageFromAngle(proj.damage, bulletAngle);
              taken = res.damageTaken;
              wasWeakSpot = res.wasWeakSpot;
            } else {
              taken = enemy.takeDamage(proj.damage, proj.isCrit);
            }

            if (shooter) {
              shooter.damageDealt += taken;
              if (proj.isCrit || wasWeakSpot) shooter.headshots++;
              if (enemy.isDead) {
                shooter.kills++;
                this.pendingEvents.push({
                  id: `kill_${Date.now()}_${enemy.id}`,
                  type: 'kill',
                  x: enemy.x,
                  y: enemy.y,
                  text: `+${Math.round(taken)} [KILL]`,
                  sourceId: shooter.id,
                });
              } else {
                this.pendingEvents.push({
                  id: `dmg_${Date.now()}_${enemy.id}`,
                  type: 'damage',
                  x: enemy.x,
                  y: enemy.y,
                  amount: Math.round(taken),
                  isCrit: proj.isCrit || wasWeakSpot,
                  isWeakSpot: wasWeakSpot,
                  sourceId: shooter.id,
                  targetId: enemy.id,
                });
              }
            }
            break;
          }
        }

        if (hit) {
          this.projectiles.splice(i, 1);
          continue;
        }
      } else {
        // 5. Enemy bullet hitting Operatives or Vanguard Riot Shield
        let hit = false;
        for (const op of ops) {
          if (op.isDead) continue;

          // Check Vanguard Riot Shield blocking
          if (op.hasRiotShield) {
            const shieldDist = Math.hypot(op.x - proj.x, op.y - proj.y);
            if (shieldDist <= CONSTANTS.OPERATIVES.VANGUARD.SHIELD_RADIUS) {
              const toBulletAngle = Math.atan2(proj.y - op.y, proj.x - op.x);
              let angleDiff = Math.abs((op.riotShieldAngle - toBulletAngle) % (2 * Math.PI));
              if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

              if (angleDiff <= CONSTANTS.OPERATIVES.VANGUARD.SHIELD_ARC_RAD * 0.5) {
                // Riot Shield completely blocked enemy projectile!
                hit = true;
                this.pendingEvents.push({
                  id: `shield_block_${Date.now()}`,
                  type: 'shield_block',
                  x: proj.x,
                  y: proj.y,
                  text: 'BLOCKED',
                });
                break;
              }
            }
          }

          // Hit player body
          const dist = Math.hypot(op.x - proj.x, op.y - proj.y);
          const hitboxRadius = op.isCrouched 
            ? op.radius * CONSTANTS.CROUCH.HITBOX_RADIUS_MODIFIER 
            : op.radius;

          if (dist <= hitboxRadius + proj.radius) {
            hit = true;
            op.takeDamage(proj.damage);
            this.pendingEvents.push({
              id: `player_hit_${Date.now()}_${op.id}`,
              type: 'damage',
              x: op.x,
              y: op.y,
              amount: proj.damage,
              targetId: op.id,
            });
            break;
          }
        }

        if (hit) {
          this.projectiles.splice(i, 1);
          continue;
        }
      }
    }
  }

  private detonateGrenade(proj: ProjectileState): void {
    const isFrag = proj.weaponType === 'grenade_frag';
    const radius = isFrag ? CONSTANTS.GRENADES.FRAG.RADIUS : CONSTANTS.GRENADES.EMP.RADIUS;

    this.pendingEvents.push({
      id: `explode_${Date.now()}`,
      type: 'barrel_explode',
      x: proj.x,
      y: proj.y,
      amount: proj.damage,
      text: isFrag ? 'FRAG DETONATION' : 'EMP BLAST',
    });

    for (const enemy of this.enemies.values()) {
      if (enemy.isDead) continue;
      const dist = Math.hypot(enemy.x - proj.x, enemy.y - proj.y);
      if (dist <= radius) {
        if (!isFrag) {
          // EMP stuns synths & strips shields!
          enemy.applyStun(CONSTANTS.GRENADES.EMP.STUN_DURATION_SEC);
          if (enemy instanceof HeavyJuggernaut) {
            enemy.stripShield();
          }
        }
        enemy.takeDamage(proj.damage);
      }
    }
  }

  private detonatePlasmaBarrel(barrel: PlasmaBarrelState): void {
    if (barrel.isExploding) return;
    barrel.isExploding = true;
    barrel.hp = 0;

    this.pendingEvents.push({
      id: `barrel_${barrel.id}_${Date.now()}`,
      type: 'barrel_explode',
      x: barrel.x,
      y: barrel.y,
      amount: CONSTANTS.PROPS.BARREL_EXPLOSION_DAMAGE,
      text: 'PLASMA DETONATION',
    });

    // Damage enemies
    for (const enemy of this.enemies.values()) {
      if (enemy.isDead) continue;
      const dist = Math.hypot(enemy.x - barrel.x, enemy.y - barrel.y);
      if (dist <= CONSTANTS.PROPS.BARREL_EXPLOSION_RADIUS) {
        enemy.takeDamage(CONSTANTS.PROPS.BARREL_EXPLOSION_DAMAGE);
      }
    }

    // Damage players
    for (const op of this.operatives.values()) {
      if (op.isDead) continue;
      const dist = Math.hypot(op.x - barrel.x, op.y - barrel.y);
      if (dist <= CONSTANTS.PROPS.BARREL_EXPLOSION_RADIUS) {
        op.takeDamage(Math.floor(CONSTANTS.PROPS.BARREL_EXPLOSION_DAMAGE * 0.45));
      }
    }

    // Chain react other barrels!
    for (const other of this.barrels) {
      if (!other.isExploding && other.id !== barrel.id) {
        const d = Math.hypot(other.x - barrel.x, other.y - barrel.y);
        if (d <= CONSTANTS.PROPS.BARREL_EXPLOSION_RADIUS) {
          setTimeout(() => {
            this.detonatePlasmaBarrel(other);
          }, CONSTANTS.PROPS.CHAIN_REACTION_DELAY_SEC * 1000);
        }
      }
    }
  }

  private spawnSectorEnemies(sectorIndex: number): void {
    const sec = this.map.sectors[sectorIndex];
    if (!sec) return;

    // Spawn combination of Stalker Drones and Enforcer Synths
    const count = 4 + sectorIndex * 2;
    for (let i = 0; i < count; i++) {
      const rx = sec.bounds.minX * this.map.tileSize + Math.random() * (sec.bounds.maxX - sec.bounds.minX) * this.map.tileSize;
      const ry = sec.bounds.minY * this.map.tileSize + Math.random() * (sec.bounds.maxY - sec.bounds.minY) * this.map.tileSize;
      const tx = Math.floor(rx / this.map.tileSize);
      const ty = Math.floor(ry / this.map.tileSize);

      // Keep safe distance from initial player spawn in Sector A
      if (sectorIndex === 0 && Math.hypot(rx - 400, ry - 400) < 260) {
        continue;
      }

      if (this.pathfinder.isWalkableTile(tx, ty)) {
        if (i % 2 === 0) {
          const drone = new StalkerDrone(`drone_${sectorIndex}_${i}`, rx, ry);
          this.enemies.set(drone.id, drone);
        } else {
          const synth = new EnforcerSynth(`synth_${sectorIndex}_${i}`, rx, ry);
          this.enemies.set(synth.id, synth);
        }
      }
    }

    // Sectors C and D also spawn Heavy Juggernauts
    if (sectorIndex >= 2) {
      const juggX = (sec.bounds.minX + 8) * this.map.tileSize;
      const juggY = (sec.bounds.minY + 8) * this.map.tileSize;
      const jugg = new HeavyJuggernaut(`jugg_${sectorIndex}`, juggX, juggY);
      this.enemies.set(jugg.id, jugg);
    }
  }

  private spawnCoreWardenBoss(): void {
    this.bossSpawned = true;
    const humanCount = Array.from(this.operatives.values()).filter((op) => !op.isBot).length;

    // 1. Spawn Core Warden
    this.boss = new CoreWarden('core_warden_boss', this.map.bossSpawn.x, this.map.bossSpawn.y, humanCount);
    this.enemies.set(this.boss.id, this.boss);

    // 2. Spawn 4 Shield Pylons
    this.pylons = this.map.pylonSpawns.map((p, idx) => {
      const pylon = new ShieldPylon(`pylon_${idx}`, p.x, p.y, humanCount);
      this.enemies.set(pylon.id, pylon);
      return pylon;
    });

    this.pendingEvents.push({
      id: `boss_spawn_${Date.now()}`,
      type: 'boss_phase',
      x: this.map.bossSpawn.x,
      y: this.map.bossSpawn.y,
      text: 'CORE WARDEN AWAKENS — DESTROY THE 4 SHIELD PYLONS!',
    });
  }

  private updateEndgameConditions(dt: number): void {
    if (!this.bossDefeated) return;

    // 1. 60s Reactor Stabilization Countdown
    this.reactorCountdown -= dt;
    if (this.reactorCountdown <= 0) {
      // Overload reached -> Defeat
      this.gameStatus = 'failed';
      return;
    }

    // 2. Extraction Sync Pads verification
    const ops = Array.from(this.operatives.values()).filter((op) => !op.isDead);
    let allPadsOccupied = true;

    for (const pad of this.extractionPads) {
      let occupant: Operative | null = null;
      for (const op of ops) {
        if (!op.isDowned && Math.hypot(op.x - pad.x, op.y - pad.y) <= pad.radius + 15) {
          occupant = op;
          break;
        }
      }

      if (occupant) {
        pad.isOccupied = true;
        pad.occupantId = occupant.id;
      } else {
        pad.isOccupied = false;
        pad.occupantId = null;
        allPadsOccupied = false;
      }
    }

    // Check human extraction readiness (Solo mode / all alive humans on any Sync Pad)
    const humanOps = ops.filter((op) => !op.isBot && !op.isDowned);
    const allHumansOnPad =
      humanOps.length > 0 &&
      humanOps.every((human) =>
        this.extractionPads.some(
          (pad) => Math.hypot(human.x - pad.x, human.y - pad.y) <= pad.radius + 18
        )
      );

    const extractionReady = (allPadsOccupied && ops.length >= 1) || allHumansOnPad;

    if (extractionReady) {
      // Light up all 4 pads in radiant emerald green during synchronized extraction
      for (const pad of this.extractionPads) {
        pad.isOccupied = true;
      }

      this.extractionHoldTimer += dt;
      if (this.extractionHoldTimer >= CONSTANTS.EXTRACTION.HOLD_TIME_SEC) {
        // VICTORY! Single definitive ending achieved!
        this.gameStatus = 'victory';
        this.pendingEvents.push({
          id: `victory_ev_${Date.now()}`,
          type: 'shard_unlocked',
          x: 3000,
          y: 1200,
          text: 'MISSION ACCOMPLISHED — STATION EREBUS EVACUATION COMPLETE!',
        });
      }
    } else {
      // Progress resets if anyone steps off!
      this.extractionHoldTimer = Math.max(0, this.extractionHoldTimer - dt * 2.0);
    }
  }

  private checkDefeatCondition(): void {
    const allOps = Array.from(this.operatives.values());
    if (allOps.length === 0) return;

    const anyOperational = allOps.some((op) => !op.isDead && !op.isDowned);
    if (!anyOperational) {
      // All operatives downed or dead
      this.gameStatus = 'failed';
    }
  }

  private applyMapCollision(op: Operative): void {
    const rad = op.isCrouched 
      ? op.radius * CONSTANTS.CROUCH.HITBOX_RADIUS_MODIFIER 
      : op.radius;

    // Check surrounding tiles
    const minTx = Math.floor((op.x - rad - 4) / this.map.tileSize);
    const maxTx = Math.floor((op.x + rad + 4) / this.map.tileSize);
    const minTy = Math.floor((op.y - rad - 4) / this.map.tileSize);
    const maxTy = Math.floor((op.y + rad + 4) / this.map.tileSize);

    for (let ty = minTy; ty <= maxTy; ty++) {
      for (let tx = minTx; tx <= maxTx; tx++) {
        if (!this.pathfinder.isWalkableTile(tx, ty)) {
          const tileLeft = tx * this.map.tileSize;
          const tileRight = tileLeft + this.map.tileSize;
          const tileTop = ty * this.map.tileSize;
          const tileBottom = tileTop + this.map.tileSize;

          // Eject if entity center is completely inside a solid tile
          if (op.x >= tileLeft && op.x <= tileRight && op.y >= tileTop && op.y <= tileBottom) {
            const toLeft = op.x - tileLeft;
            const toRight = tileRight - op.x;
            const toTop = op.y - tileTop;
            const toBottom = tileBottom - op.y;
            const minPen = Math.min(toLeft, toRight, toTop, toBottom);

            if (minPen === toLeft) op.x = tileLeft - rad - 1;
            else if (minPen === toRight) op.x = tileRight + rad + 1;
            else if (minPen === toTop) op.y = tileTop - rad - 1;
            else op.y = tileBottom + rad + 1;
            continue;
          }

          // Resolve circle-AABB contact penetration
          const closestX = Math.max(tileLeft, Math.min(op.x, tileRight));
          const closestY = Math.max(tileTop, Math.min(op.y, tileBottom));

          const distX = op.x - closestX;
          const distY = op.y - closestY;
          const distSq = distX * distX + distY * distY;

          if (distSq < rad * rad) {
            const dist = Math.sqrt(distSq);
            if (dist > 0.0001) {
              const overlap = rad - dist;
              op.x += (distX / dist) * overlap;
              op.y += (distY / dist) * overlap;
            } else {
              const tileCenterX = tileLeft + this.map.tileSize * 0.5;
              const tileCenterY = tileTop + this.map.tileSize * 0.5;
              const pushX = op.x - tileCenterX;
              const pushY = op.y - tileCenterY;
              const pushLen = Math.hypot(pushX, pushY) || 1;
              op.x += (pushX / pushLen) * rad;
              op.y += (pushY / pushLen) * rad;
            }
          }
        }
      }
    }
  }

  private recordLagCompensation(timestamp: number): void {
    const samples = Array.from(this.enemies.values()).map((e) => ({
      id: e.id,
      x: e.x,
      y: e.y,
      radius: e.radius,
      isWeakSpotBack: e instanceof HeavyJuggernaut,
      angle: e.angle,
    }));
    this.lagComp.record(timestamp, samples);
  }

  private broadcastSnapshot(): void {
    const snapshot: GameSnapshot = {
      tick: this.tickCount,
      timestamp: Date.now(),
      operatives: Array.from(this.operatives.values()).map((op) => op.serialize()),
      enemies: Array.from(this.enemies.values()).map((e) => e.serialize()),
      projectiles: this.projectiles,
      crates: this.crates,
      barrels: this.barrels,
      terminals: this.mysteryEngine.terminals,
      extractionPads: this.extractionPads,
      beacons: this.beacons,
      bulkheadsOpen: this.mysteryEngine.bulkheadsOpen,
      currentSector: this.mysteryEngine.currentSectorIndex,
      shardsRecovered: this.mysteryEngine.recoveredShards.length,
      mysteryLogs: this.mysteryEngine.recoveredShards,
      bossSpawned: this.bossSpawned,
      bossDefeated: this.bossDefeated,
      reactorStabilizationCountdown: Math.max(0, Math.round(this.reactorCountdown)),
      extractionHoldTimer: Math.min(5, Math.max(0, this.extractionHoldTimer)),
      gameStatus: this.gameStatus,
      events: this.pendingEvents,
    };

    this.pendingEvents = [];
    this.io.to(this.roomCode).emit('game_snapshot', snapshot);
  }
}
