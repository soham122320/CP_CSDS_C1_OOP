/**
 * Tactical 2.5D Procedural Renderer (Alien Swarm / Helldivers aesthetic)
 * for SHARD-4: BLACKOUT PROTOCOL
 * 
 * Rich textured floor plates, 3D-style beveled walls with drop shadows,
 * detailed top-down armored operatives, distinct synth hostiles, holographic
 * terminals, and high-contrast, juicy combat VFX.
 */

import {
  GameSnapshot,
  OperativeState,
  HostileState,
  ProjectileState,
  LootCrateState,
  PlasmaBarrelState,
  TerminalState,
  ExtractionPadState,
  ActiveBeaconState,
} from '@shared/types.js';
import { Camera } from './Camera.js';
import { ParticlePool } from './ParticlePool.js';
import { CONSTANTS } from '@shared/constants.js';
import { MapData, TILE_WALL, TILE_COVER } from '@shared/mapData.js';

export class GameRenderer {
  private map: MapData;
  private particlePool: ParticlePool;
  private animTimer: number = 0;

  constructor(map: MapData, particlePool: ParticlePool) {
    this.map = map;
    this.particlePool = particlePool;
  }

  public renderEnvironment(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    snapshot: GameSnapshot | null,
    localOp: OperativeState | undefined,
    enemies: Map<string, HostileState>,
    dt: number
  ): void {
    this.animTimer += dt;
    const bounds = camera.getViewportBounds();

    camera.applyTransform(ctx);

    // 1. Render Textured Metallic Floor Plates
    this.renderFloor(ctx, bounds);

    // 2. Render Floor Decals (blood stains, oil spills, impact burns)
    this.renderDecals(ctx);

    // 3. Render Extraction Sync Pads in Central Vault
    if (snapshot?.extractionPads) {
      this.renderExtractionPads(
        ctx,
        snapshot.extractionPads,
        snapshot.extractionHoldTimer,
        Boolean(snapshot.bossDefeated)
      );
    }

    // 4. Render 2.5D Pseudo-3D Walls with Drop Shadows
    this.renderWalls(
      ctx,
      bounds,
      snapshot?.bulkheadsOpen || [false, false, false, false],
      snapshot?.shardsRecovered ?? 0
    );

    // 5. Render Interactive World Objects (Terminals, Crates, Barrels, Beacons)
    if (snapshot?.terminals) this.renderTerminals(ctx, snapshot.terminals, localOp);
    if (snapshot?.crates) this.renderCrates(ctx, snapshot.crates, localOp);
    if (snapshot?.barrels) this.renderBarrels(ctx, snapshot.barrels);
    if (snapshot?.beacons) this.renderBeacons(ctx, snapshot.beacons);

    // 5.5 Render Glowing Purple Energy Tether Lines from active Shield Pylons to Core Warden
    const wardenBoss = Array.from(enemies.values()).find(
      (e) => e.type === 'warden' && e.hp > 0
    );

    if (wardenBoss) {
      for (const enemy of enemies.values()) {
        if (enemy.type === 'pylon' && enemy.hp > 0) {
          ctx.save();
          // Outer purple glow
          ctx.shadowColor = '#a855f7';
          ctx.shadowBlur = 16;
          ctx.strokeStyle = 'rgba(168, 85, 247, 0.85)';
          ctx.lineWidth = 3.5;
          ctx.setLineDash([12, 8]);
          ctx.lineDashOffset = -this.animTimer * 45;

          ctx.beginPath();
          ctx.moveTo(enemy.x, enemy.y);
          ctx.lineTo(wardenBoss.x, wardenBoss.y);
          ctx.stroke();

          // High-energy white/lavender core beam
          ctx.shadowBlur = 0;
          ctx.strokeStyle = '#f3e8ff';
          ctx.lineWidth = 1.2;
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(enemy.x, enemy.y);
          ctx.lineTo(wardenBoss.x, wardenBoss.y);
          ctx.stroke();

          // Traveling energy plasma packet towards Warden
          const travelT = (this.animTimer * 1.5 + (enemy.x % 100) * 0.01) % 1;
          const packetX = enemy.x + (wardenBoss.x - enemy.x) * travelT;
          const packetY = enemy.y + (wardenBoss.y - enemy.y) * travelT;

          ctx.fillStyle = '#e9d5ff';
          ctx.beginPath();
          ctx.arc(packetX, packetY, 4.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        }
      }
    }

    // 6. Render Hostile Synths & Boss
    for (const enemy of enemies.values()) {
      this.renderHostileUnit(ctx, enemy);
    }

    camera.restoreTransform(ctx);
  }

  public renderOperatives(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    localPlayerId: string,
    operatives: Map<string, OperativeState>
  ): void {
    camera.applyTransform(ctx);

    // Render Armored Operatives on Top Layer
    for (const op of operatives.values()) {
      this.renderOperative(ctx, op, op.id === localPlayerId);
    }

    camera.restoreTransform(ctx);
  }

  public renderVFXAndOverlay(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    snapshot: GameSnapshot | null,
    crosshairPos: { x: number; y: number },
    crosshairSpread: number
  ): void {
    camera.applyTransform(ctx);

    // Render Projectiles, Tracers & Grenades
    if (snapshot?.projectiles) {
      this.renderProjectiles(ctx, snapshot.projectiles);
    }

    // Render Object-Pooled Particles (Shells, Sparks, Smoke)
    this.particlePool.renderParticles(ctx);

    // Render Floating Damage Numbers
    this.particlePool.renderDamageNumbers(ctx);

    camera.restoreTransform(ctx);

    // Render Dynamic Crosshair Reticle (in screen space)
    this.renderDynamicCrosshair(ctx, crosshairPos.x, crosshairPos.y, crosshairSpread);
  }

  public render(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    localPlayerId: string,
    operatives: Map<string, OperativeState>,
    enemies: Map<string, HostileState>,
    snapshot: GameSnapshot | null,
    crosshairPos: { x: number; y: number },
    crosshairSpread: number,
    dt: number
  ): void {
    this.renderEnvironment(ctx, camera, snapshot, operatives.get(localPlayerId), enemies, dt);
    this.renderOperatives(ctx, camera, localPlayerId, operatives);
    this.renderVFXAndOverlay(ctx, camera, snapshot, crosshairPos, crosshairSpread);
  }

  // =========================================================================
  // 1. TEXTURED METALLIC FLOOR PLATES (No Plain Grids)
  // =========================================================================
  private renderFloor(ctx: CanvasRenderingContext2D, bounds: any): void {
    const ts = this.map.tileSize;
    const minTx = Math.max(0, Math.floor(bounds.minX / ts));
    const maxTx = Math.min(this.map.width - 1, Math.floor(bounds.maxX / ts));
    const minTy = Math.max(0, Math.floor(bounds.minY / ts));
    const maxTy = Math.min(this.map.height - 1, Math.floor(bounds.maxY / ts));

    for (let ty = minTy; ty <= maxTy; ty++) {
      for (let tx = minTx; tx <= maxTx; tx++) {
        const tile = this.map.grid[ty][tx];
        // Only draw floor under walkable areas or doorways
        if (tile === TILE_WALL) continue;

        const px = tx * ts;
        const py = ty * ts;
        const tileHash = (tx * 17 + ty * 31) % 4;

        // Base metallic plate color
        ctx.fillStyle = tileHash === 0 ? '#1b2438' : (tileHash === 1 ? '#182033' : '#1e2942');
        ctx.fillRect(px, py, ts, ts);

        // Panel bevel seams
        ctx.strokeStyle = '#283756';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 0.5, py + 0.5, ts - 1, ts - 1);

        // Industrial Tread / Grate Pattern on alternating tiles
        if (tileHash === 0) {
          ctx.strokeStyle = '#22304d';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          for (let i = 8; i < ts; i += 10) {
            ctx.moveTo(px + i, py + 4);
            ctx.lineTo(px + i, py + ts - 4);
          }
          ctx.stroke();
        } else if (tileHash === 2) {
          // Circular conduit hatch in center
          ctx.fillStyle = '#141c2c';
          ctx.beginPath();
          ctx.arc(px + ts * 0.5, py + ts * 0.5, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#2b3b5c';
          ctx.stroke();
        }

        // Corner metallic bolt rivets
        ctx.fillStyle = '#3b4f7a';
        ctx.fillRect(px + 3, py + 3, 2, 2);
        ctx.fillRect(px + ts - 5, py + 3, 2, 2);
        ctx.fillRect(px + 3, py + ts - 5, 2, 2);
        ctx.fillRect(px + ts - 5, py + ts - 5, 2, 2);
      }
    }
  }

  // =========================================================================
  // 2. 2.5D WALLS WITH TOP CAPS & DROP SHADOWS
  // =========================================================================
  private renderWalls(
    ctx: CanvasRenderingContext2D,
    bounds: any,
    bulkheadsOpen: boolean[],
    shardsRecovered: number = 0
  ): void {
    const ts = this.map.tileSize;
    const minTx = Math.max(0, Math.floor(bounds.minX / ts));
    const maxTx = Math.min(this.map.width - 1, Math.floor(bounds.maxX / ts));
    const minTy = Math.max(0, Math.floor(bounds.minY / ts));
    const maxTy = Math.min(this.map.height - 1, Math.floor(bounds.maxY / ts));

    for (let ty = minTy; ty <= maxTy; ty++) {
      for (let tx = minTx; tx <= maxTx; tx++) {
        const tile = this.map.grid[ty][tx];
        const px = tx * ts;
        const py = ty * ts;

        if (tile === TILE_WALL) {
          // A. Drop Shadow onto floor directly below the wall
          ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
          ctx.fillRect(px, py + ts, ts, 10);

          // B. Front Wall Face (vertical depth)
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(px, py + 8, ts, ts - 8);

          // C. 3D Top Cap (raised surface)
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(px, py, ts, ts - 8);

          // Top cap highlighted border
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(px + 0.5, py + 0.5, ts - 1, ts - 9);

          // Glowing Cyber Neon Conduit along wall top edge
          ctx.strokeStyle = '#0284c7';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(px + 4, py + 3);
          ctx.lineTo(px + ts - 4, py + 3);
          ctx.stroke();

          // Structural Center Stud
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(px + ts * 0.35, py + 4, ts * 0.3, ts * 0.3);
        } else if (tile === TILE_COVER) {
          // Low Tactical Cover Barricade
          ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
          ctx.fillRect(px, py + ts * 0.8, ts, 6); // shadow

          ctx.fillStyle = '#334155';
          ctx.fillRect(px + 2, py + 4, ts - 4, ts - 8);

          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 2;
          ctx.strokeRect(px + 2, py + 4, ts - 4, ts - 8);

          // Bright Hazard Stripes
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(px + 6, py + ts - 6); ctx.lineTo(px + ts - 6, py + 6);
          ctx.moveTo(px + 16, py + ts - 6); ctx.lineTo(px + ts - 6, py + 16);
          ctx.stroke();
        } else if (tile >= 3 && tile <= 6) {
          // Bulkhead Blast Doors
          const bulkheadIdx = tile - 3;
          const isOpen = bulkheadsOpen[bulkheadIdx] || shardsRecovered > bulkheadIdx;

          if (isOpen) {
            // Unlocked Door Threshold
            ctx.fillStyle = '#111827';
            ctx.fillRect(px, py, ts, ts);

            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 3;
            ctx.strokeRect(px + 2, py + 2, ts - 4, ts - 4);

            // Green traversal guide light
            ctx.fillStyle = '#34d399';
            ctx.beginPath();
            ctx.arc(px + ts * 0.5, py + ts * 0.5, 5, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // Locked Heavy Blast Gate with Hazard Chevrons
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(px, py + ts, ts, 8); // shadow

            ctx.fillStyle = '#261214';
            ctx.fillRect(px, py, ts, ts);

            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 3.5;
            ctx.strokeRect(px + 2, py + 2, ts - 4, ts - 4);

            // Red warning strobes
            const pulse = 0.5 + Math.sin(this.animTimer * 6.0) * 0.5;
            ctx.fillStyle = `rgba(239, 68, 68, ${pulse})`;
            ctx.fillRect(px + ts * 0.35, py + ts * 0.35, ts * 0.3, ts * 0.3);

            ctx.font = "bold 9px 'JetBrains Mono', monospace";
            ctx.fillStyle = '#f87171';
            ctx.textAlign = 'center';
            ctx.fillText('LOCKED', px + ts * 0.5, py + ts - 4);
          }
        }
      }
    }
  }

  // =========================================================================
  // 3. DECALS (Persistent Blood Stains & Oil Splatters)
  // =========================================================================
  private renderDecals(ctx: CanvasRenderingContext2D): void {
    for (const decal of this.particlePool.decals) {
      ctx.save();
      ctx.globalAlpha = decal.alpha;
      ctx.translate(decal.x, decal.y);
      ctx.rotate(decal.rotation);
      ctx.fillStyle = decal.color;
      ctx.beginPath();
      ctx.arc(0, 0, decal.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // =========================================================================
  // 4. EXTRACTION SYNC PADS (Central Vault Finale)
  // =========================================================================
  private renderExtractionPads(
    ctx: CanvasRenderingContext2D,
    pads: ExtractionPadState[],
    holdTimer: number,
    bossDefeated: boolean = false
  ): void {
    const isSyncing = holdTimer > 0;
    const allOccupied = pads.every((p) => p.isOccupied) || isSyncing;
    const padAssignees = [
      'OPERATIVE-01 (YOU)',
      'VALKYRIE-AI',
      'SPECTRE-AI',
      'AEGIS-AI',
    ];

    // 1. Draw glowing energy conduits connecting all 4 pads to central reactor hub (3000, 1200)
    if (bossDefeated || isSyncing) {
      ctx.save();
      for (const pad of pads) {
        ctx.strokeStyle = isSyncing ? 'rgba(16, 185, 129, 0.45)' : 'rgba(6, 182, 212, 0.25)';
        ctx.lineWidth = isSyncing ? 3 : 1.5;
        ctx.setLineDash([8, 8]);
        ctx.lineDashOffset = -this.animTimer * (isSyncing ? 35 : 15);
        ctx.beginPath();
        ctx.moveTo(pad.x, pad.y);
        ctx.lineTo(3000, 1200);
        ctx.stroke();

        // Moving pulse dot along conduit
        const t = (this.animTimer * 1.2 + pad.index * 0.25) % 1;
        const pulseX = pad.x + (3000 - pad.x) * t;
        const pulseY = pad.y + (1200 - pad.y) * t;
        ctx.fillStyle = isSyncing ? '#34d399' : '#38bdf8';
        ctx.beginPath();
        ctx.arc(pulseX, pulseY, isSyncing ? 4.5 : 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 2. Render each Sync Pad Platform & Holographic Badge
    for (const pad of pads) {
      const isLit = pad.isOccupied || isSyncing || allOccupied;
      const primaryColor = isLit ? '#10b981' : '#06b6d4';
      const secondaryColor = isLit ? '#34d399' : '#38bdf8';
      const pulseSize = isLit ? Math.sin(this.animTimer * 6 + pad.index) * 3 : 0;

      ctx.save();
      ctx.translate(pad.x, pad.y);

      // Outer platform pulsing ring
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = isLit ? 4.5 : 3.5;
      ctx.shadowColor = primaryColor;
      ctx.shadowBlur = isLit ? 16 : 8;
      ctx.beginPath();
      ctx.arc(0, 0, pad.radius + pulseSize, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Translucent platform base
      ctx.fillStyle = isLit ? 'rgba(16, 185, 129, 0.32)' : 'rgba(6, 182, 212, 0.16)';
      ctx.fill();

      // Rotating inner chevrons
      ctx.rotate(this.animTimer * (isLit ? 3.0 : 1.2));
      ctx.strokeStyle = secondaryColor;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(
        -pad.radius * 0.45,
        -pad.radius * 0.45,
        pad.radius * 0.9,
        pad.radius * 0.9
      );

      // Radial Sync Progress Arc during extraction hold countdown
      if (holdTimer > 0) {
        ctx.rotate(-this.animTimer * (isLit ? 3.0 : 1.2)); // Un-rotate for progress arc
        const progressFrac = Math.min(1.0, holdTimer / CONSTANTS.EXTRACTION.HOLD_TIME_SEC);
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(
          0,
          0,
          pad.radius + 6,
          -Math.PI * 0.5,
          -Math.PI * 0.5 + Math.PI * 2 * progressFrac
        );
        ctx.stroke();
      }

      ctx.restore();

      // 3. Floating Holographic Pad Label & Status Banner
      ctx.save();
      ctx.translate(pad.x, pad.y);
      const bobY = Math.sin(this.animTimer * 4 + pad.index) * 4;

      // Draw floating badge card above the pad
      const badgeY = -pad.radius - 28 + bobY;
      const badgeW = 130;
      const badgeH = 34;

      ctx.fillStyle = 'rgba(2, 6, 23, 0.88)';
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.roundRect(-badgeW * 0.5, badgeY - badgeH * 0.5, badgeW, badgeH, 6);
      ctx.fill();
      ctx.stroke();

      // Title: [PAD 01], [PAD 02], etc.
      ctx.font = "bold 11px 'Chakra Petch', sans-serif";
      ctx.fillStyle = primaryColor;
      ctx.textAlign = 'center';
      ctx.fillText(`[PAD 0${pad.index + 1}]`, 0, badgeY - 3);

      // Subtitle: Assigned operative name
      ctx.font = "10px 'Chakra Petch', sans-serif";
      ctx.fillStyle = isLit ? '#34d399' : '#94a3b8';
      ctx.fillText(padAssignees[pad.index] || `SYNC ${pad.index + 1}`, 0, badgeY + 11);

      // Platform Floor Status
      ctx.font = "bold 12px 'Chakra Petch', sans-serif";
      ctx.textAlign = 'center';
      if (isSyncing) {
        const percent = Math.round((holdTimer / CONSTANTS.EXTRACTION.HOLD_TIME_SEC) * 100);
        ctx.fillStyle = '#10b981';
        ctx.fillText(`SYNCING: ${percent}%`, 0, 4);
      } else if (pad.isOccupied) {
        ctx.fillStyle = '#34d399';
        ctx.fillText('LOCKED ON [OK]', 0, 4);
      } else {
        ctx.fillStyle = '#38bdf8';
        ctx.fillText('STAND HERE', 0, 4);
      }

      ctx.fillText(`SYNC PAD 0${pad.index + 1}`, 0, pad.radius + 18);
      ctx.restore();
    }
  }

  // =========================================================================
  // 5. INTERACTIVE OBJECTS (Terminals, Supply Crates, Plasma Barrels, Beacons)
  // =========================================================================
  private renderTerminals(ctx: CanvasRenderingContext2D, terminals: TerminalState[], localOp?: OperativeState): void {
    for (const term of terminals) {
      ctx.save();
      ctx.translate(term.x, term.y);

      // Console base
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-22, -16, 44, 32);
      ctx.strokeStyle = term.hacked ? '#10b981' : (term.isBeingHacked ? '#f59e0b' : '#38bdf8');
      ctx.lineWidth = 3;
      ctx.strokeRect(-22, -16, 44, 32);

      // Screen glow
      ctx.fillStyle = term.hacked ? '#064e3b' : '#0369a1';
      ctx.fillRect(-18, -12, 36, 24);

      // Rotating 3D Holographic Cipher Shard floating above console
      ctx.save();
      ctx.translate(0, -32);
      ctx.rotate(this.animTimer * 1.6);
      ctx.fillStyle = term.hacked ? 'rgba(16, 185, 129, 0.85)' : 'rgba(6, 182, 212, 0.9)';
      ctx.strokeStyle = term.hacked ? '#34d399' : '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(11, 0);
      ctx.lineTo(0, 14);
      ctx.lineTo(-11, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Hack Progress Ring
      if (term.hackProgress > 0 && !term.hacked) {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.arc(0, 0, 36, -Math.PI * 0.5, -Math.PI * 0.5 + Math.PI * 2 * term.hackProgress);
        ctx.stroke();
      }

      // Proximity Action Prompt
      const isNearby = localOp && Math.hypot(localOp.x - term.x, localOp.y - term.y) < 65;
      ctx.font = "bold 11px 'Chakra Petch', sans-serif";
      ctx.textAlign = 'center';

      if (term.hacked) {
        ctx.fillStyle = '#10b981';
        ctx.fillText('CIPHER DECODED [✔]', 0, 28);
      } else if (term.isBeingHacked) {
        ctx.fillStyle = '#fbbf24';
        ctx.fillText('DECODING CIPHER...', 0, 28);
      } else if (isNearby) {
        // High visibility prompt badge
        ctx.fillStyle = '#f59e0b';
        ctx.fillText('PRESS [E] TO HACK', 0, 28);
      } else {
        ctx.fillStyle = '#38bdf8';
        ctx.fillText('CIPHER TERMINAL', 0, 28);
      }

      ctx.restore();
    }
  }

  private renderCrates(ctx: CanvasRenderingContext2D, crates: LootCrateState[], localOp?: OperativeState): void {
    for (const crate of crates) {
      ctx.save();
      ctx.translate(crate.x, crate.y);

      ctx.fillStyle = crate.opened ? '#334155' : '#0284c7';
      ctx.fillRect(-18, -14, 36, 28);

      ctx.strokeStyle = crate.opened ? '#64748b' : '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(-18, -14, 36, 28);

      // Weapon Hologram / Text
      ctx.font = "bold 11px 'JetBrains Mono', monospace";
      ctx.textAlign = 'center';

      if (!crate.opened) {
        const isNearby = localOp && Math.hypot(localOp.x - crate.x, localOp.y - crate.y) < 60;
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(crate.weaponType.toUpperCase(), 0, -22);

        if (isNearby) {
          ctx.fillStyle = '#facc15';
          ctx.fillText('PRESS [E]', 0, 4);
        } else {
          ctx.fillStyle = '#ffffff';
          ctx.fillText('CRATE', 0, 4);
        }
      }
      ctx.restore();
    }
  }

  private renderBarrels(ctx: CanvasRenderingContext2D, barrels: PlasmaBarrelState[]): void {
    for (const b of barrels) {
      if (b.isExploding) continue;
      ctx.save();
      ctx.translate(b.x, b.y);

      // Barrel Body
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();

      // Glowing Volatile Core
      const pulse = 0.7 + Math.sin(this.animTimer * 5.0) * 0.3;
      ctx.fillStyle = `rgba(239, 68, 68, ${pulse})`;
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Warning marker
      ctx.fillStyle = '#ffffff';
      ctx.font = "bold 8px 'JetBrains Mono', monospace";
      ctx.textAlign = 'center';
      ctx.fillText('HAZARD', 0, 3);

      ctx.restore();
    }
  }

  private renderBeacons(ctx: CanvasRenderingContext2D, beacons: ActiveBeaconState[]): void {
    for (const beacon of beacons) {
      ctx.save();
      ctx.translate(beacon.x, beacon.y);

      // Concentric healing pulse wave
      const pulseAlpha = 0.25 + Math.sin(this.animTimer * 4.0) * 0.08;
      ctx.fillStyle = `rgba(16, 185, 129, ${pulseAlpha})`;
      ctx.beginPath();
      ctx.arc(0, 0, beacon.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(16, 185, 129, 0.7)';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Central emitter
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  // =========================================================================
  // 6. ARMORED OPERATIVES (Top-Down Alien Swarm / Helldivers Style)
  // =========================================================================
  private renderOperative(ctx: CanvasRenderingContext2D, op: OperativeState, isLocal: boolean): void {
    if (op.isDead) return;

    ctx.save();
    ctx.translate(op.x, op.y);

    // Phantom Active Camo Refractive Shimmer
    if (op.isCamo) {
      ctx.globalAlpha = 0.35;
    }

    // Role Distinct Accent Color
    const roleColors: Record<string, string> = {
      vanguard: '#38bdf8', // Blue Vanguard
      phantom: '#c084fc',  // Purple Phantom
      breacher: '#fb923c', // Orange Breacher
      medic: '#34d399',    // Green Medic
    };
    const accentColor = roleColors[op.operativeClass] || '#38bdf8';

    // 0. Glowing Team Ground Ring underneath operative feet
    ctx.save();
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = isLocal ? 14 : 9;
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = isLocal ? 3.0 : 2.0;
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = isLocal ? 'rgba(56, 189, 248, 0.22)' : 'rgba(15, 23, 42, 0.4)';
    ctx.fill();
    ctx.restore();

    // 1. Vanguard Deployable Aegis Riot Shield Barrier ([Q] Skill)
    const isShieldActive = Boolean(op.hasRiotShield || (op as any).isShieldActive);
    if (isShieldActive) {
      ctx.save();
      const shieldAngle = op.riotShieldAngle !== undefined ? op.riotShieldAngle : op.aimAngle;
      ctx.rotate(shieldAngle);

      const shieldRadius = 42; // 42px radius directly in front of the operative
      const shieldArc = (120 * Math.PI) / 180; // 120° wide frontal barrier arc
      const halfArc = shieldArc * 0.5;

      // A. Outer Intense Cyan Glow
      ctx.save();
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 18;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(0, 0, shieldRadius, -halfArc, halfArc);
      ctx.stroke();
      ctx.restore();

      // B. Translucent Energy Forcefield Fill with Gradient
      ctx.save();
      const shieldGrad = ctx.createRadialGradient(0, 0, shieldRadius - 12, 0, 0, shieldRadius + 4);
      shieldGrad.addColorStop(0, 'rgba(6, 182, 212, 0.04)');
      shieldGrad.addColorStop(0.65, 'rgba(56, 189, 248, 0.28)');
      shieldGrad.addColorStop(1, 'rgba(165, 243, 252, 0.65)');

      ctx.fillStyle = shieldGrad;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, shieldRadius, -halfArc, halfArc);
      ctx.closePath();
      ctx.fill();

      // C. Holographic Primary Arc & Energy Ripple Waves
      ctx.strokeStyle = '#a5f3fc';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(0, 0, shieldRadius, -halfArc, halfArc);
      ctx.stroke();

      const rippleOffset = Math.sin(this.animTimer * 12) * 3;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, shieldRadius - 6 + rippleOffset, -halfArc * 0.85, halfArc * 0.85);
      ctx.stroke();

      // D. Heavy Armored Hardpoint Emitter Brackets at Arc Ends
      const leftTipX = Math.cos(-halfArc) * shieldRadius;
      const leftTipY = Math.sin(-halfArc) * shieldRadius;
      const rightTipX = Math.cos(halfArc) * shieldRadius;
      const rightTipY = Math.sin(halfArc) * shieldRadius;

      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.arc(leftTipX, leftTipY, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(rightTipX, rightTipY, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // E. Spark Flashes along Shield Surface
      for (let s = 0; s < 3; s++) {
        const sparkT = ((this.animTimer * 3.5 + s * 0.33) % 1) * 2 - 1; // -1 to 1
        const sparkA = sparkT * halfArc * 0.9;
        const sx = Math.cos(sparkA) * (shieldRadius + (Math.random() - 0.5) * 4);
        const sy = Math.sin(sparkA) * (shieldRadius + (Math.random() - 0.5) * 4);

        ctx.fillStyle = Math.random() > 0.4 ? '#ffffff' : '#67e8f9';
        ctx.beginPath();
        ctx.arc(sx, sy, 1.8 + Math.random() * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      ctx.restore();
    }

    // 2. High-Contrast Armored Torso & Weapon (Rotated with Aim)
    ctx.save();
    ctx.rotate(op.aimAngle);

    const isMoving = Math.hypot(op.vx, op.vy) > 10 || op.isSprinting;
    const animSpeed = op.isSprinting ? 22 : 14;
    const stride = isMoving ? Math.sin(this.animTimer * animSpeed) * 7 : 0;

    // A. Subtle Walking Legs & Tactical Boots
    if (!op.isDowned) {
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;

      // Left leg & boot
      ctx.beginPath();
      ctx.rect(-6 + stride, -13, 11, 5);
      ctx.fill();
      ctx.stroke();

      // Right leg & boot
      ctx.beginPath();
      ctx.rect(-6 - stride, 8, 11, 5);
      ctx.fill();
      ctx.stroke();

      // Back Cyber Thruster Flame / Micro-jet when moving
      if (isMoving) {
        const jetLen = (op.isSprinting ? 16 : 8) + Math.random() * 5;
        const jetGrad = ctx.createLinearGradient(-12, 0, -12 - jetLen, 0);
        jetGrad.addColorStop(0, '#ffffff');
        jetGrad.addColorStop(0.35, accentColor);
        jetGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = jetGrad;
        ctx.beginPath();
        ctx.moveTo(-14, -4);
        ctx.lineTo(-14 - jetLen, 0);
        ctx.lineTo(-14, 4);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Two-handed gun model with shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(10, 4, 22, 5);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(8, 2, 22, 5); // Gun receiver & barrel
    ctx.fillStyle = accentColor;
    ctx.fillRect(26, 3, 5, 3);  // Muzzle tip

    // Tactical Soldier Body with drop shadow
    ctx.save();
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 8;
    ctx.fillStyle = op.isDowned ? '#475569' : '#0f172a';
    ctx.beginPath();
    ctx.arc(0, 0, op.isCrouched ? 14 : 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // High-contrast armor silhouette ring
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = isLocal ? 3.5 : 2.5;
    ctx.stroke();

    // Armored Tactical Shoulder Pauldrons
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.arc(-2, -13, 6, 0, Math.PI * 2);
    ctx.arc(-2, 13, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Glowing Helmet Visor Slit
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(7, -4, 6, 8);
    ctx.fillStyle = accentColor;
    ctx.fillRect(8, -3, 4, 6);

    ctx.restore();

    // 3. DBNO Downed State Indicators
    if (op.isDowned) {
      // Bleedout ring
      const bleedoutProgress = op.bleedoutTimer / CONSTANTS.DBNO.BLEEDOUT_TIME_SEC;
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(0, 0, 26, -Math.PI * 0.5, -Math.PI * 0.5 + Math.PI * 2 * bleedoutProgress);
      ctx.stroke();

      // Revive progress ring
      if (op.reviveProgress > 0) {
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.arc(0, 0, 30, -Math.PI * 0.5, -Math.PI * 0.5 + Math.PI * 2 * op.reviveProgress);
        ctx.stroke();
      }

      ctx.font = "bold 11px 'Chakra Petch', sans-serif";
      ctx.fillStyle = '#ef4444';
      ctx.textAlign = 'center';
      ctx.fillText('DOWNED // HOLD [E]', 0, -34);
    } else {
      // High-Contrast Overhead Name & Vital Bars
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(-22, -32, 44, 6);

      const hpPercent = Math.max(0, op.hp / op.maxHp);
      ctx.fillStyle = hpPercent > 0.35 ? accentColor : '#ef4444';
      ctx.fillRect(-22, -32, 44 * hpPercent, 6);

      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.strokeRect(-22, -32, 44, 6);

      ctx.font = "bold 11px 'Chakra Petch', sans-serif";
      ctx.fillStyle = isLocal ? '#ffffff' : '#cbd5e1';
      ctx.textAlign = 'center';
      ctx.fillText(op.name + (isLocal ? ' (YOU)' : ''), 0, -38);
    }

    ctx.restore();
  }

  // =========================================================================
  // 7. DISTINCT SYNTH HOSTILES & BOSS
  // =========================================================================
  private renderHostileUnit(ctx: CanvasRenderingContext2D, enemy: HostileState): void {
    if (enemy.hp <= 0) return;

    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    switch (enemy.type) {
      case 'stalker': {
        // Stalker Drone: Crimson quad mechanical crawler
        ctx.rotate(enemy.angle);
        ctx.fillStyle = '#991b1b';
        ctx.beginPath();
        ctx.arc(0, 0, 13, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // 4 Articulated melee legs
        ctx.beginPath();
        ctx.moveTo(8, -8); ctx.lineTo(18, -15);
        ctx.moveTo(8, 8); ctx.lineTo(18, 15);
        ctx.moveTo(-6, -8); ctx.lineTo(-14, -15);
        ctx.moveTo(-6, 8); ctx.lineTo(-14, 15);
        ctx.stroke();

        // Glowing red optic eye
        ctx.fillStyle = '#f87171';
        ctx.fillRect(5, -3, 6, 6);
        break;
      }

      case 'enforcer': {
        // Enforcer Synth: Armored rifleman with telegraphed laser sight
        if (enemy.telegraphProgress && enemy.telegraphProgress > 0) {
          ctx.save();
          ctx.rotate(enemy.telegraphAngle || enemy.angle);
          ctx.strokeStyle = `rgba(239, 68, 68, ${0.4 + enemy.telegraphProgress * 0.6})`;
          ctx.lineWidth = 2.5;
          ctx.setLineDash([8, 8]);
          ctx.beginPath();
          ctx.moveTo(18, 0);
          ctx.lineTo(450, 0);
          ctx.stroke();
          ctx.restore();
        }

        ctx.rotate(enemy.angle);
        ctx.fillStyle = '#312e81';
        ctx.beginPath();
        ctx.arc(0, 0, 17, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Heavy rifle
        ctx.fillStyle = '#64748b';
        ctx.fillRect(8, 4, 20, 5);

        // Visor
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(7, -4, 5, 8);
        break;
      }

      case 'juggernaut': {
        // Heavy Juggernaut Dreadnought
        ctx.rotate(enemy.angle);

        // Frontal Energy Shield Arc
        if (enemy.shieldHp && enemy.shieldHp > 0) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 5.5;
          ctx.beginPath();
          ctx.arc(0, 0, 36, -Math.PI * 0.45, Math.PI * 0.45);
          ctx.stroke();
        }

        // Heavy Armored Hull
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(0, 0, 25, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 3.5;
        ctx.stroke();

        // Twin shoulder plasma cannon
        ctx.fillStyle = '#475569';
        ctx.fillRect(10, -7, 22, 14);

        // Glowing Pulsing Rear Power Core [WEAK SPOT: 3X DMG]
        const pulse = 0.7 + Math.sin(this.animTimer * 8.0) * 0.3;
        ctx.fillStyle = `rgba(245, 158, 11, ${pulse})`;
        ctx.beginPath();
        ctx.arc(-20, 0, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.stroke();
        break;
      }

      case 'pylon': {
        // Shield Pylon Node
        const pylonPulse = Math.sin(this.animTimer * 6.0) * 3;
        ctx.strokeStyle = '#818cf8';
        ctx.lineWidth = 3.5;
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(0, 0, 24 + pylonPulse, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#1e1b4b';
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Rotating central crystal core
        ctx.save();
        ctx.rotate(this.animTimer * 2.2);
        ctx.fillStyle = '#e0e7ff';
        ctx.fillRect(-6, -6, 12, 12);
        ctx.restore();

        // Crisp Overhead Floating Badge: SHIELD PYLON [HP]
        ctx.restore();
        ctx.save();
        ctx.translate(enemy.x, enemy.y);

        const badgeY = -38;
        const badgeW = 136;
        const badgeH = 30;

        ctx.fillStyle = 'rgba(2, 6, 23, 0.9)';
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.roundRect(-badgeW * 0.5, badgeY - badgeH * 0.5, badgeW, badgeH, 4);
        ctx.fill();
        ctx.stroke();

        // Title: SHIELD PYLON [HP]
        ctx.font = "bold 10px 'Chakra Petch', sans-serif";
        ctx.fillStyle = '#c084fc';
        ctx.textAlign = 'center';
        ctx.fillText(`SHIELD PYLON [${Math.max(0, Math.round(enemy.hp))} HP]`, 0, badgeY - 2);

        // Subtitle: TARGET TO BREAK BOSS SHIELD
        ctx.font = "8px 'Chakra Petch', sans-serif";
        ctx.fillStyle = '#e9d5ff';
        ctx.fillText('TARGET TO BREAK BOSS SHIELD', 0, badgeY + 9);

        // Mini Health Bar below badge
        const hpP = Math.max(0, enemy.hp / enemy.maxHp);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(-26, badgeY + 18, 52, 4);
        ctx.fillStyle = '#a855f7';
        ctx.fillRect(-26, badgeY + 18, 52 * hpP, 4);
        ctx.strokeStyle = '#e9d5ff';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(-26, badgeY + 18, 52, 4);

        ctx.restore();
        return;
      }

      case 'warden': {
        // CORE WARDEN BOSS
        // Phase 1: Invulnerability Shield Bubble when Pylons are alive
        if (enemy.phase === 1) {
          ctx.save();
          const shieldPulse = 54 + Math.sin(this.animTimer * 5) * 3;
          ctx.strokeStyle = '#c084fc';
          ctx.lineWidth = 3.5;
          ctx.shadowColor = '#a855f7';
          ctx.shadowBlur = 18;
          ctx.beginPath();
          ctx.arc(0, 0, shieldPulse, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = 'rgba(168, 85, 247, 0.18)';
          ctx.fill();

          ctx.font = "bold 10px 'Chakra Petch', sans-serif";
          ctx.fillStyle = '#e9d5ff';
          ctx.textAlign = 'center';
          ctx.fillText('INVULNERABLE // DESTROY 4 PYLONS', 0, -shieldPulse - 6);
          ctx.restore();
        }

        if (enemy.telegraphProgress && enemy.telegraphProgress > 0) {
          ctx.save();
          ctx.rotate(enemy.telegraphAngle || enemy.angle);

          const isFiring = enemy.telegraphProgress >= 1;
          ctx.strokeStyle = isFiring ? '#ef4444' : 'rgba(239, 68, 68, 0.5)';
          ctx.lineWidth = isFiring ? 10 : 3;
          ctx.beginPath();
          ctx.moveTo(40, 0);
          ctx.lineTo(650, 0);
          ctx.stroke();

          // Phase 3 Dual Laser
          if (enemy.phase === 3) {
            ctx.beginPath();
            ctx.moveTo(-40, 0);
            ctx.lineTo(-650, 0);
            ctx.stroke();
          }
          ctx.restore();
        }

        // Monolith Boss Body
        ctx.rotate(enemy.angle);
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(0, 0, 42, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = enemy.phase === 3 ? '#ef4444' : '#8b5cf6';
        ctx.lineWidth = 5;
        ctx.stroke();

        // Pulsing Core
        const corePulse = 0.6 + Math.sin(this.animTimer * 6.0) * 0.4;
        ctx.fillStyle = enemy.phase === 3 ? `rgba(239, 68, 68, ${corePulse})` : `rgba(139, 92, 246, ${corePulse})`;
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
    }

    // Overhead Boss Health Bar
    if (enemy.type === 'warden') {
      ctx.restore();
      ctx.save();
      ctx.translate(enemy.x, enemy.y);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.fillRect(-55, -65, 110, 9);

      const hpP = Math.max(0, enemy.hp / enemy.maxHp);
      ctx.fillStyle = enemy.phase === 3 ? '#ef4444' : '#8b5cf6';
      ctx.fillRect(-55, -65, 110 * hpP, 9);

      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.strokeRect(-55, -65, 110, 9);

      ctx.font = "bold 12px 'Chakra Petch', sans-serif";
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(`CORE WARDEN [PHASE ${enemy.phase || 1}]`, 0, -75);
      ctx.restore();
      return;
    }

    ctx.restore();
  }

  // =========================================================================
  // 8. PROJECTILES, TRACERS & GRENADES
  // =========================================================================
  private renderProjectiles(ctx: CanvasRenderingContext2D, projectiles: ProjectileState[]): void {
    for (const p of projectiles) {
      ctx.save();
      ctx.translate(p.x, p.y);

      if (p.weaponType === 'grenade_frag' || p.weaponType === 'grenade_emp') {
        ctx.fillStyle = p.weaponType === 'grenade_frag' ? '#f97316' : '#06b6d4';
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.fill();

        const blink = Math.sin(this.animTimer * 18) > 0 ? '#ef4444' : '#000';
        ctx.fillStyle = blink;
        ctx.beginPath();
        ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Bright bullet tracer
        const color = p.isEnemy ? '#ef4444' : (p.isCrit ? '#facc15' : '#38bdf8');
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  // =========================================================================
  // 9. DYNAMIC CROSSHAIR RETICLE
  // =========================================================================
  private renderDynamicCrosshair(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    spread: number
  ): void {
    ctx.save();
    ctx.translate(x, y);

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;

    // Reticle segments
    ctx.beginPath();
    ctx.moveTo(0, -spread); ctx.lineTo(0, -spread - 8);
    ctx.moveTo(0, spread); ctx.lineTo(0, spread + 8);
    ctx.moveTo(-spread, 0); ctx.lineTo(-spread - 8, 0);
    ctx.moveTo(spread, 0); ctx.lineTo(spread + 8, 0);
    ctx.stroke();

    // Center dot
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(0, 0, 2, 0, Math.PI * 2);
    ctx.fill();

    // Hit-marker flash (X shape)
    if (this.particlePool.hitMarkerAlpha > 0) {
      ctx.globalAlpha = this.particlePool.hitMarkerAlpha;
      ctx.strokeStyle = this.particlePool.hitMarkerCrit ? '#facc15' : '#ef4444';
      ctx.lineWidth = 3;
      const s = 7;
      ctx.beginPath();
      ctx.moveTo(-s, -s); ctx.lineTo(s, s);
      ctx.moveTo(s, -s); ctx.lineTo(-s, s);
      ctx.stroke();
    }

    ctx.restore();
  }
}
