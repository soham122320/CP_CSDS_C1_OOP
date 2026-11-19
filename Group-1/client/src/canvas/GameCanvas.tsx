/**
 * Main GameCanvas React Component & 60 FPS Tactical Engine
 * for SHARD-4: BLACKOUT PROTOCOL
 * 
 * Features:
 * 1. Direct Client-Side WASD Physics: Immediate 60 FPS movement without server lag.
 * 2. Strict Input Isolation: Only localPlayer responds to WASD & mouse aimAngle.
 * 3. Autonomous AI Squadmates: Valkyrie, Spectre, and Aegis trail at 100px and aim independently.
 * 4. High-contrast live debug readout: POS: (X, Y) | KEYS: [] | AIM: Angle°.
 */

import React, { useEffect, useRef } from 'react';
import { Camera } from './Camera.js';
import { LightingEngine } from './Lighting.js';
import { GameRenderer } from './Renderer.js';
import { ParticlePool } from './ParticlePool.js';
import { ClientPrediction } from '../net/prediction.js';
import { SnapshotInterpolator } from '../net/interpolation.js';
import { InputManager, keysPressed, globalMouseScreenX, globalMouseScreenY, isGlobalMouseDown } from '../input/inputManager.js';
import { touchControls } from '../input/touchControls.js';
import { socketClient } from '../net/socketClient.js';
import { audio } from '../audio/proceduralAudio.js';
import { buildStationErebusMap, MapData } from '@shared/mapData.js';
import { GameSnapshot, OperativeState, HostileState } from '@shared/types.js';
import { CONSTANTS } from '@shared/constants.js';

interface GameCanvasProps {
  localPlayerId: string;
  onSnapshotUpdate: (snapshot: GameSnapshot) => void;
  onTelemetryUpdate: (telemetry: any) => void;
  onOpenJournal: () => void;
}

interface AISquadmateState {
  state: OperativeState;
  shootTimer: number;
  watchAngle: number;
  offsetAngle: number;
  targetDist: number;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  localPlayerId,
  onSnapshotUpdate,
  onTelemetryUpdate,
  onOpenJournal,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Keep callback refs stable across renders
  const onSnapshotUpdateRef = useRef(onSnapshotUpdate);
  onSnapshotUpdateRef.current = onSnapshotUpdate;
  const onTelemetryUpdateRef = useRef(onTelemetryUpdate);
  onTelemetryUpdateRef.current = onTelemetryUpdate;

  // 1. Persistent Local Player Operative (NEVER reset by React re-renders)
  const localPlayerRef = useRef<OperativeState>({
    id: localPlayerId || 'local_operative',
    name: 'OPERATIVE-01',
    slotIndex: 0,
    isBot: false,
    operativeClass: 'vanguard',
    x: 570,
    y: 420,
    vx: 0,
    vy: 0,
    aimAngle: 0,
    hp: 140,
    maxHp: 140,
    stamina: 100,
    maxStamina: 100,
    isSprinting: false,
    isCrouched: false,
    isDodging: false,
    dodgeTimer: 0,
    dodgeCooldownRemaining: 0,
    isDead: false,
    isDowned: false,
    bleedoutTimer: 25,
    reviveProgress: 0,
    activeSlot: 1,
    primaryWeapon: {
      type: 'mk4',
      name: 'MK-IV Pulse Rifle',
      magAmmo: 30,
      magCapacity: 30,
      reserveAmmo: 120,
      maxReserveAmmo: 240,
      isReloading: false,
      reloadProgress: 0,
    },
    sidearmWeapon: {
      type: 'p45',
      name: 'P-45 Sidearm',
      magAmmo: 12,
      magCapacity: 12,
      reserveAmmo: 999,
      maxReserveAmmo: 999,
      isReloading: false,
      reloadProgress: 0,
      hasInfiniteReserve: true,
    },
    fragCount: 2,
    empCount: 2,
    selectedGrenade: 'frag',
    skillCooldownRemaining: 0,
    isCamo: false,
    camoTimer: 0,
    hasRiotShield: false,
    riotShieldAngle: 0,
    riotShieldTimer: 0,
    lastAcknowledgedSeq: 0,
    kills: 0,
    damageDealt: 0,
    headshots: 0,
    revivesPerformed: 0,
    terminalsHacked: 0,
  });

  // 2. Persistent 3 AI Squadmates (Valkyrie, Spectre, Aegis) with Independent AI & Aiming
  const aiSquadmatesRef = useRef<AISquadmateState[]>([
    {
      shootTimer: 0.6,
      watchAngle: -Math.PI * 0.25, // North-East
      offsetAngle: -0.55,
      targetDist: 100,
      state: {
        ...localPlayerRef.current,
        id: 'bot_squad_1',
        name: 'VALKYRIE-AI',
        slotIndex: 1,
        isBot: true,
        operativeClass: 'phantom',
        x: 630,
        y: 420,
        vx: 0,
        vy: 0,
        aimAngle: -Math.PI * 0.25,
        hp: 90,
        maxHp: 90,
      },
    },
    {
      shootTimer: 0.9,
      watchAngle: Math.PI * 0.75, // South-West
      offsetAngle: 0.0,
      targetDist: 120,
      state: {
        ...localPlayerRef.current,
        id: 'bot_squad_2',
        name: 'SPECTRE-AI',
        slotIndex: 2,
        isBot: true,
        operativeClass: 'breacher',
        x: 570,
        y: 480,
        vx: 0,
        vy: 0,
        aimAngle: Math.PI * 0.75,
        hp: 120,
        maxHp: 120,
      },
    },
    {
      shootTimer: 1.3,
      watchAngle: Math.PI * 0.25, // South-East
      offsetAngle: 0.55,
      targetDist: 100,
      state: {
        ...localPlayerRef.current,
        id: 'bot_squad_3',
        name: 'AEGIS-AI',
        slotIndex: 3,
        isBot: true,
        operativeClass: 'medic',
        x: 630,
        y: 480,
        vx: 0,
        vy: 0,
        aimAngle: Math.PI * 0.25,
        hp: 100,
        maxHp: 100,
      },
    },
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Subsystems initialization
    const map = buildStationErebusMap();
    const particlePool = new ParticlePool(500, 100);
    const camera = new Camera();
    const lighting = new LightingEngine();
    const renderer = new GameRenderer(map, particlePool);
    const prediction = new ClientPrediction();
    prediction.setMap(map);
    prediction.initPosition(localPlayerRef.current.x, localPlayerRef.current.y);
    camera.update(localPlayerRef.current.x, localPlayerRef.current.y, 0, 0);
    const interpolator = new SnapshotInterpolator();
    const inputManager = new InputManager();

    // Canvas sizing
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      camera.resize(canvas.width, canvas.height);
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    // Sequence counter for input packets
    let seq = 1;
    let hasInitializedPosition = false;
    let lastTime = performance.now();
    let frameCount = 0;
    let fps = 60;
    let lastFpsTime = performance.now();
    let animFrameId: number;

    // Local tracking of unlocked bulkheads
    const unlockedBulkheads: boolean[] = [false, false, false, false];

    // Check whether a map tile is solid (walkable check accounting for unlocked bulkhead doors)
    const isTileSolid = (tx: number, ty: number): boolean => {
      if (tx < 0 || tx >= map.width || ty < 0 || ty >= map.height) return true;
      const tile = map.grid[ty][tx];
      // 0 = empty floor, 2 = low cover (both are walkable)
      if (tile === 0 || tile === 2) return false;

      // Bulkhead doors (tiles 3, 4, 5, 6)
      if (tile >= 3 && tile <= 6) {
        const doorIdx = tile - 3; // 0: Door 1 (A->B), 1: Door 2 (B->C), 2: Door 3 (C->D), 3: Vault Door
        const latestSnap = interpolator.getLatestSnapshot();
        const shards = latestSnap?.shardsRecovered ?? 0;
        const snapOpen = latestSnap?.bulkheadsOpen?.[doorIdx];

        // Door 1 (tile 3): unlocked when shards >= 1 or bulkheadsOpen[0]
        // Door 2 (tile 4): unlocked when shards >= 2 or bulkheadsOpen[1]
        // Door 3 (tile 5): unlocked when shards >= 3 or bulkheadsOpen[2]
        // Final Boss Vault Door (tile 6): unlocked when shards >= 4 or bulkheadsOpen[3]
        const requiredShards = doorIdx + 1;
        const isOpen =
          unlockedBulkheads[doorIdx] ||
          Boolean(snapOpen) ||
          shards >= requiredShards;

        if (isOpen) {
          return false; // Unlocked! Walkable, pass freely!
        }
        return true; // Locked
      }

      // Normal wall (tile 1)
      return true;
    };

    // Slide Collision Resolution with Solid Map Walls & Locked Doors
    const resolveMapCollision = (entity: { x: number; y: number }, radius: number = 16) => {
      const ts = map.tileSize;
      const minTx = Math.max(0, Math.floor((entity.x - radius - 2) / ts));
      const maxTx = Math.min(map.width - 1, Math.floor((entity.x + radius + 2) / ts));
      const minTy = Math.max(0, Math.floor((entity.y - radius - 2) / ts));
      const maxTy = Math.min(map.height - 1, Math.floor((entity.y + radius + 2) / ts));

      for (let ty = minTy; ty <= maxTy; ty++) {
        for (let tx = minTx; tx <= maxTx; tx++) {
          if (!isTileSolid(tx, ty)) continue;

          const tileLeft = tx * ts;
          const tileRight = tileLeft + ts;
          const tileTop = ty * ts;
          const tileBottom = tileTop + ts;

          // Eject if center is inside solid tile
          if (
            entity.x >= tileLeft &&
            entity.x <= tileRight &&
            entity.y >= tileTop &&
            entity.y <= tileBottom
          ) {
            const toLeft = entity.x - tileLeft;
            const toRight = tileRight - entity.x;
            const toTop = entity.y - tileTop;
            const toBottom = tileBottom - entity.y;
            const minPen = Math.min(toLeft, toRight, toTop, toBottom);

            if (minPen === toLeft) entity.x = tileLeft - radius - 1;
            else if (minPen === toRight) entity.x = tileRight + radius + 1;
            else if (minPen === toTop) entity.y = tileTop - radius - 1;
            else entity.y = tileBottom + radius + 1;
            continue;
          }

          const closestX = Math.max(tileLeft, Math.min(entity.x, tileRight));
          const closestY = Math.max(tileTop, Math.min(entity.y, tileBottom));
          const distX = entity.x - closestX;
          const distY = entity.y - closestY;
          const distSq = distX * distX + distY * distY;

          if (distSq < radius * radius && distSq > 0.0001) {
            const dist = Math.sqrt(distSq);
            const overlap = radius - dist;
            entity.x += (distX / dist) * overlap;
            entity.y += (distY / dist) * overlap;
          }
        }
      }
    };

    // Snapshot Socket Listener
    socketClient.onSnapshot((snapshot: GameSnapshot) => {
      interpolator.pushSnapshot(snapshot);
      onSnapshotUpdateRef.current(snapshot);

      const localPlayer = localPlayerRef.current;

      // Audio & Event handling from snapshot events
      for (const ev of snapshot.events) {
        if (ev.type === 'shard_unlocked') {
          audio.playShardUnlockedSound();
          camera.addShake(8);
        } else if (ev.type === 'barrel_explode') {
          audio.playExplosion();
          camera.addShake(18);
          lighting.addBurst(ev.x, ev.y, 280, '#f97316', 0.25);
          particlePool.spawnDeathBurst(ev.x, ev.y, true);
        } else if (ev.type === 'boss_phase') {
          audio.playBossRoar();
          camera.addShake(22);
        } else if (ev.type === 'kill') {
          if (ev.sourceId === localPlayer.id) {
            particlePool.triggerHitStop(40);
            particlePool.triggerHitMarker(true);
          }
          particlePool.spawnDeathBurst(ev.x, ev.y, true);
        } else if (ev.type === 'shield_block') {
          audio.playShieldDeflect();
          camera.addShake(5);
          particlePool.spawnShieldDeflectSparks(ev.x, ev.y, localPlayer.aimAngle);
          lighting.addBurst(ev.x, ev.y, 160, '#06b6d4', 0.15);
        } else if (ev.type === 'damage') {
          if (ev.sourceId === localPlayer.id) {
            particlePool.triggerHitMarker(ev.isCrit || ev.isWeakSpot);
          }
          if (ev.amount) {
            particlePool.spawnDamageNumber(ev.x, ev.y, ev.amount, !!ev.isCrit, !!ev.isWeakSpot);
          }
        }
      }

      // Local player reconciliation (soft lerp if discrepancy > 120px)
      const serverLocalOp = snapshot.operatives.find(
        (op) => op.id === localPlayer.id || (!op.isBot && op.slotIndex === 0)
      );
      if (serverLocalOp) {
        if (!hasInitializedPosition) {
          localPlayer.x = serverLocalOp.x;
          localPlayer.y = serverLocalOp.y;
          localPlayer.id = serverLocalOp.id;
          hasInitializedPosition = true;
        } else {
          const dx = serverLocalOp.x - localPlayer.x;
          const dy = serverLocalOp.y - localPlayer.y;
          if (Math.hypot(dx, dy) > 120) {
            localPlayer.x += dx * 0.15;
            localPlayer.y += dy * 0.15;
          }
        }
        localPlayer.hp = serverLocalOp.hp;
        localPlayer.maxHp = serverLocalOp.maxHp;
        localPlayer.stamina = serverLocalOp.stamina;
        localPlayer.isDowned = serverLocalOp.isDowned;
        localPlayer.isDead = serverLocalOp.isDead;
        localPlayer.kills = serverLocalOp.kills;
        localPlayer.damageDealt = serverLocalOp.damageDealt;
        localPlayer.hasRiotShield = serverLocalOp.hasRiotShield;
        localPlayer.riotShieldAngle = serverLocalOp.riotShieldAngle;
        localPlayer.riotShieldTimer = serverLocalOp.riotShieldTimer;

        audio.updateHeartbeat(localPlayer.hp <= localPlayer.maxHp * 0.3 && !localPlayer.isDead);
      }

      // Sync bots from server if server broadcasts them
      const serverBots = snapshot.operatives.filter((op) => op.id !== localPlayer.id);
      serverBots.forEach((sBot, idx) => {
        if (aiSquadmatesRef.current[idx]) {
          const bot = aiSquadmatesRef.current[idx];
          bot.state.hp = sBot.hp;
          bot.state.maxHp = sBot.maxHp;
          bot.state.isDowned = sBot.isDowned;
          bot.state.isDead = sBot.isDead;
          bot.state.hasRiotShield = sBot.hasRiotShield;
          bot.state.riotShieldAngle = sBot.riotShieldAngle;
          bot.state.riotShieldTimer = sBot.riotShieldTimer;

          // Softly lerp towards server positions
          bot.state.x += (sBot.x - bot.state.x) * 0.22;
          bot.state.y += (sBot.y - bot.state.y) * 0.22;
        }
      });

      // Update unlocked bulkheads progression
      if (snapshot.bulkheadsOpen) {
        for (let i = 0; i < 4; i++) {
          if (snapshot.bulkheadsOpen[i] || snapshot.shardsRecovered > i) {
            unlockedBulkheads[i] = true;
          }
        }
      }
      prediction.setBulkheads(snapshot.bulkheadsOpen || unlockedBulkheads, snapshot.shardsRecovered);

      // Update adaptive music tension
      const hostileNearby = snapshot.enemies.some(
        (e) => Math.hypot(e.x - localPlayer.x, e.y - localPlayer.y) < 550
      );
      audio.setCombatIntensity(hostileNearby || snapshot.bossSpawned ? 0.9 : 0.15);
    });

    // 60 FPS Fixed-Step Render & Simulation Loop
    const renderLoop = (currentTime: number) => {
      try {
        const dt = Math.min(0.05, Math.max(0.001, (currentTime - lastTime) / 1000));
        lastTime = currentTime;

      const localPlayer = localPlayerRef.current;
      if (localPlayerId && localPlayer.id !== localPlayerId) {
        localPlayer.id = localPlayerId;
      }

      // FPS calculation
      frameCount++;
      if (currentTime - lastFpsTime >= 1000) {
        fps = frameCount;
        frameCount = 0;
        lastFpsTime = currentTime;

        // Telemetry update
        const latestSnap = interpolator.getLatestSnapshot();
        onTelemetryUpdateRef.current({
          fps,
          ping: socketClient.pingMs,
          serverTickRate: CONSTANTS.SERVER_TICK_RATE,
          bytesInPerSec: 1024 * 6,
          bytesOutPerSec: 1024 * 2,
          entityCounts: {
            operatives: 4,
            enemies: latestSnap?.enemies.length || 0,
            projectiles: latestSnap?.projectiles.length || 0,
            particles: 50,
            decals: particlePool.decals.length,
            crates: latestSnap?.crates.length || 0,
          },
          recentEvents: latestSnap?.events.map((e) => e.text || e.type).slice(-6) || [],
        });
      }

      // =======================================================================
      // 1. DIRECT CLIENT-SIDE WASD PHYSICS INTEGRATION (Instant, Zero Lag)
      // =======================================================================
      let moveX = 0;
      let moveY = 0;

      const isUp =
        keysPressed.has('KeyW') ||
        keysPressed.has('w') ||
        keysPressed.has('W') ||
        keysPressed.has('ArrowUp');
      const isDown =
        keysPressed.has('KeyS') ||
        keysPressed.has('s') ||
        keysPressed.has('S') ||
        keysPressed.has('ArrowDown');
      const isLeft =
        keysPressed.has('KeyA') ||
        keysPressed.has('a') ||
        keysPressed.has('A') ||
        keysPressed.has('ArrowLeft');
      const isRight =
        keysPressed.has('KeyD') ||
        keysPressed.has('d') ||
        keysPressed.has('D') ||
        keysPressed.has('ArrowRight');

      if (isUp) moveY -= 1;
      if (isDown) moveY += 1;
      if (isLeft) moveX -= 1;
      if (isRight) moveX += 1;

      // Merge Mobile Touch Left Stick if active
      if (touchControls.leftStick.active) {
        moveX = touchControls.leftStick.deltaX;
        moveY = touchControls.leftStick.deltaY;
      }

      // Normalize diagonal movement
      const moveLen = Math.hypot(moveX, moveY);
      if (moveLen > 0) {
        moveX /= moveLen;
        moveY /= moveLen;
      }

      const isSprinting =
        keysPressed.has('ShiftLeft') ||
        keysPressed.has('ShiftRight') ||
        keysPressed.has('shift') ||
        keysPressed.has('Shift') ||
        (touchControls.leftStick.active && touchControls.leftStick.distance > 0.85) ||
        touchControls.isSprintToggled;

      const speed = isSprinting ? 420 : 280;
      localPlayer.vx = moveX * speed;
      localPlayer.vy = moveY * speed;
      localPlayer.isSprinting = isSprinting;

      // Directly apply position increment with delta-time (EVERY FRAME)
      localPlayer.x += localPlayer.vx * dt;
      localPlayer.y += localPlayer.vy * dt;

      // Slide collision along walls
      resolveMapCollision(localPlayer, 16);

      // =======================================================================
      // 2. ISOLATE LOCAL PLAYER AIM: STRICTLY CONTROLLED BY MOUSE CURSOR
      // =======================================================================
      const mouseWorld = camera.screenToWorld(globalMouseScreenX, globalMouseScreenY);
      localPlayer.aimAngle = Math.atan2(mouseWorld.y - localPlayer.y, mouseWorld.x - localPlayer.x);

      if (touchControls.rightStick.active) {
        localPlayer.aimAngle = touchControls.rightStick.angle;
      }

      // Update camera follow smoothly (lerp = 0.12)
      camera.update(localPlayer.x, localPlayer.y, localPlayer.aimAngle, dt);

      // Weapon firing sound, recoil, muzzle flash
      const isFiring = isGlobalMouseDown || (touchControls.rightStick.active && touchControls.rightStick.distance > 0.3);
      if (isFiring) {
        const weapon = localPlayer.activeSlot === 1 ? localPlayer.primaryWeapon : localPlayer.sidearmWeapon;
        if (weapon.magAmmo > 0 && !weapon.isReloading) {
          audio.playGunshot(`fire_${weapon.type}`);
          particlePool.spawnMuzzleFlash(localPlayer.x, localPlayer.y, localPlayer.aimAngle);
          particlePool.spawnShellCasing(localPlayer.x, localPlayer.y, localPlayer.aimAngle);
          camera.addKickback(localPlayer.aimAngle, 2.5);
          inputManager.addFiringRecoilSpread(4.0);
        }
      }

      // Footstep audio & sprint dust
      if (moveLen > 0.1) {
        if (Math.random() < (isSprinting ? 0.45 : 0.22)) {
          audio.playFootstep(localPlayer.isCrouched);
          const moveAngle = Math.atan2(localPlayer.vy, localPlayer.vx);
          const dustX = localPlayer.x - Math.cos(moveAngle) * 16 + (Math.random() - 0.5) * 8;
          const dustY = localPlayer.y - Math.sin(moveAngle) * 16 + (Math.random() - 0.5) * 8;
          particlePool.spawnSprintDust(dustX, dustY);
        }
      }

      // Send predicted coordinates & input to server cleanly at 30Hz
      const inputPacket = inputManager.getPlayerInput(seq++, localPlayer.x, localPlayer.y, camera, dt);
      inputPacket.moveX = moveX;
      inputPacket.moveY = moveY;
      inputPacket.posX = localPlayer.x;
      inputPacket.posY = localPlayer.y;
      inputPacket.aimAngle = localPlayer.aimAngle;
      inputPacket.isSprinting = isSprinting;
      socketClient.sendInput(inputPacket);

      // Local Vanguard Riot Shield skill trigger & decay
      if (inputPacket.useSkill && localPlayer.operativeClass === 'vanguard') {
        localPlayer.hasRiotShield = true;
        localPlayer.riotShieldTimer = 6.0;
        localPlayer.riotShieldAngle = localPlayer.aimAngle;
      }
      if (localPlayer.hasRiotShield) {
        localPlayer.riotShieldAngle = localPlayer.aimAngle;
        localPlayer.riotShieldTimer -= dt;
        if (localPlayer.riotShieldTimer <= 0) {
          localPlayer.hasRiotShield = false;
        }
      }

      // =======================================================================
      // 3. INDEPENDENT AI SQUADMATES (Escort Formation & Extraction Finale)
      // =======================================================================
      const { enemies } = interpolator.getInterpolatedEntities();
      const latestSnapshot = interpolator.getLatestSnapshot();
      const enemiesList = Array.from(enemies.values());

      // Check if in extraction phase: bossDefeated OR human on any sync pad
      const isPlayerOnAnySyncPad = map.extractionPads.some(
        (p) => Math.hypot(localPlayer.x - p.x, localPlayer.y - p.y) <= 80
      );
      const isExtractionPhase = Boolean(
        latestSnapshot?.bossDefeated ||
        (isPlayerOnAnySyncPad && ((latestSnapshot?.shardsRecovered ?? 0) >= 4 || latestSnapshot?.bossSpawned))
      );

      // Determine human player's assigned / closest pad
      let humanPadIndex = 0;
      let minHDist = Infinity;
      map.extractionPads.forEach((pad, pIdx) => {
        const d = Math.hypot(localPlayer.x - pad.x, localPlayer.y - pad.y);
        if (d < minHDist) {
          minHDist = d;
          humanPadIndex = pIdx;
        }
      });

      const reservedPads = new Set<number>();
      if (minHDist < 400) {
        reservedPads.add(humanPadIndex);
      } else {
        reservedPads.add(0); // Default local player to Pad 0 (SYNC PAD 01)
      }

      const availablePadIndices = [0, 1, 2, 3].filter((idx) => !reservedPads.has(idx));

      aiSquadmatesRef.current.forEach((bot, bIdx) => {
        let targetX = 0;
        let targetY = 0;
        let isExtractingBot = false;

        if (isExtractionPhase) {
          isExtractingBot = true;
          // 1-to-1 Mapping to remaining unoccupied pads:
          // Valkyrie-AI (bIdx 0) -> Sync Pad 02 (index 1)
          // Spectre-AI  (bIdx 1) -> Sync Pad 03 (index 2)
          // Aegis-AI    (bIdx 2) -> Sync Pad 04 (index 3)
          const assignedPadIdx = availablePadIndices[bIdx] ?? ((bIdx + 1) % 4);
          const targetPad = map.extractionPads[assignedPadIdx] || map.extractionPads[1];
          targetX = targetPad.x;
          targetY = targetPad.y;
        } else {
          // Trailing formation: 100px distance behind localPlayer
          const trailAngle = localPlayer.aimAngle + Math.PI + bot.offsetAngle;
          targetX = localPlayer.x + Math.cos(trailAngle) * bot.targetDist;
          targetY = localPlayer.y + Math.sin(trailAngle) * bot.targetDist;
        }

        const dx = targetX - bot.state.x;
        const dy = targetY - bot.state.y;
        const distToTarget = Math.hypot(dx, dy);

        if (distToTarget > (isExtractingBot ? 12 : 20)) {
          const botSpeed = isExtractingBot ? (distToTarget > 250 ? 380 : 300) : (distToTarget > 200 ? 360 : 250);
          bot.state.vx = (dx / distToTarget) * botSpeed;
          bot.state.vy = (dy / distToTarget) * botSpeed;
          bot.state.x += bot.state.vx * dt;
          bot.state.y += bot.state.vy * dt;
          resolveMapCollision(bot.state, 16);
        } else {
          bot.state.vx = 0;
          bot.state.vy = 0;
          if (isExtractingBot) {
            bot.state.x = targetX;
            bot.state.y = targetY;
          }
        }

        // Independent Hostile Targeting: nearest visible enemy within 550px
        let nearestEnemy: HostileState | null = null;
        let nearestDist = 550;
        for (const e of enemiesList) {
          if (e.hp <= 0) continue;
          const d = Math.hypot(e.x - bot.state.x, e.y - bot.state.y);
          if (d < nearestDist) {
            nearestDist = d;
            nearestEnemy = e;
          }
        }

        if (nearestEnemy) {
          // Aim at enemy and shoot
          const enemyAngle = Math.atan2(nearestEnemy.y - bot.state.y, nearestEnemy.x - bot.state.x);
          let dAngle = (enemyAngle - bot.state.aimAngle) % (2 * Math.PI);
          if (dAngle > Math.PI) dAngle -= 2 * Math.PI;
          if (dAngle < -Math.PI) dAngle += 2 * Math.PI;
          bot.state.aimAngle += dAngle * Math.min(1, 15 * dt);

          bot.shootTimer -= dt;
          if (bot.shootTimer <= 0) {
            bot.shootTimer = 0.65 + Math.random() * 0.35;
            particlePool.spawnMuzzleFlash(bot.state.x, bot.state.y, bot.state.aimAngle);
            particlePool.spawnShellCasing(bot.state.x, bot.state.y, bot.state.aimAngle);
            audio.playGunshot('fire_mk4');
          }
        } else {
          // No enemy:
          if (isExtractingBot && distToTarget <= 20) {
            // Face outward from Central Vault center (3000, 1200) in defensive perimeter stance
            bot.state.aimAngle = Math.atan2(bot.state.y - 1200, bot.state.x - 3000);
          } else if (Math.hypot(bot.state.vx, bot.state.vy) > 15) {
            bot.state.aimAngle = Math.atan2(bot.state.vy, bot.state.vx);
          } else {
            // NEVER tracks the player's aim angle!
            bot.state.aimAngle = bot.watchAngle;
          }
        }
      });

      // Update local pad occupancy for crisp immediate feedback
      if (latestSnapshot?.extractionPads) {
        let occupiedCount = 0;
        latestSnapshot.extractionPads.forEach((pad) => {
          const isPlayerOnPad = Math.hypot(localPlayer.x - pad.x, localPlayer.y - pad.y) <= pad.radius + 18;
          const isBotOnPad = aiSquadmatesRef.current.some(
            (b) => Math.hypot(b.state.x - pad.x, b.state.y - pad.y) <= pad.radius + 18
          );
          if (isPlayerOnPad || isBotOnPad) {
            pad.isOccupied = true;
            occupiedCount++;
          }
        });

        if (occupiedCount >= 4 || (isPlayerOnAnySyncPad && latestSnapshot.bossDefeated)) {
          latestSnapshot.extractionPads.forEach((pad) => {
            pad.isOccupied = true;
          });
        }
      }

      // Update particle pool & lighting engine
      particlePool.update(dt);
      lighting.update(dt);

      // Build operatives map for top layer drawing
      const operativesMap = new Map<string, OperativeState>();
      operativesMap.set(localPlayer.id, localPlayer);
      aiSquadmatesRef.current.forEach((bot) => {
        operativesMap.set(bot.state.id, bot.state);
      });

      // =======================================================================
      // 4. RENDERING PASSES
      // =======================================================================
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Pass 1: World Environment
      renderer.renderEnvironment(
        ctx,
        camera,
        latestSnapshot,
        localPlayer,
        enemies,
        dt
      );

      // Pass 2: Volumetric Lighting & Flashlights (Independent Angles!)
      const otherPlayers = aiSquadmatesRef.current.map((b) => ({
        x: b.state.x,
        y: b.state.y,
        aimAngle: b.state.aimAngle,
      }));
      const isEmergency = (latestSnapshot?.reactorStabilizationCountdown || 999) < 60;

      lighting.renderLighting(
        ctx,
        camera,
        localPlayer.x,
        localPlayer.y,
        localPlayer.aimAngle,
        otherPlayers,
        isEmergency
      );

      // Pass 3: Armored Operatives (100% visible on top)
      renderer.renderOperatives(ctx, camera, localPlayer.id, operativesMap);

      // Pass 4: Projectiles, Object Particles, Damage VFX & Crosshair
      renderer.renderVFXAndOverlay(
        ctx,
        camera,
        latestSnapshot,
        { x: globalMouseScreenX, y: globalMouseScreenY },
        inputManager.crosshairSpread
      );

      // =======================================================================
      // 5. LIVE ON-SCREEN DEBUG READOUT (Top-Left HUD Bar)
      // =======================================================================
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0); // Pure 2D screen coordinates

      const keysArray = Array.from(keysPressed).filter(
        (k) =>
          k.startsWith('Key') ||
          k.startsWith('Arrow') ||
          k.includes('Shift') ||
          k === 'Space'
      );
      const aimDeg = Math.round(((localPlayer.aimAngle * 180) / Math.PI + 360) % 360);
      const debugText = `POS: (${Math.round(localPlayer.x)}, ${Math.round(localPlayer.y)}) | KEYS: [${keysArray.join(',')}] | AIM: ${aimDeg}°`;

      ctx.fillStyle = 'rgba(5, 10, 18, 0.9)';
      ctx.fillRect(16, 76, 440, 26);
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(16, 76, 440, 26);

      ctx.font = "bold 12px 'Courier New', monospace";
      ctx.fillStyle = '#38bdf8';
      ctx.textAlign = 'left';
      ctx.fillText(debugText, 24, 94);
      ctx.restore();
    } catch (renderErr) {
      console.error('[GameCanvas renderLoop Error Guard]:', renderErr);
    } finally {
      animFrameId = requestAnimationFrame(renderLoop);
    }
  };

    animFrameId = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [localPlayerId]);

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-black">
      <canvas
        ref={canvasRef}
        className="block w-full h-full cursor-none outline-none"
      />
    </div>
  );
};
