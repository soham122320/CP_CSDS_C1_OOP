/**
 * Desktop Input Controller (Keyboard & Mouse) & Dynamic Crosshair
 * for SHARD-4: BLACKOUT PROTOCOL
 * 
 * Global event-driven input tracking with zero latency and robust key retention.
 */

import { PlayerInputPacket } from '@shared/types.js';
import { Camera } from '../canvas/Camera.js';

// Global Set tracking active keyboard inputs
export const keysPressed = new Set<string>();

// Global mouse tracking
export let globalMouseScreenX = typeof window !== 'undefined' ? window.innerWidth * 0.5 : 960;
export let globalMouseScreenY = typeof window !== 'undefined' ? window.innerHeight * 0.5 : 540;
export let isGlobalMouseDown = false;

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    keysPressed.add(e.code);
    if (e.key) {
      keysPressed.add(e.key);
      keysPressed.add(e.key.toLowerCase());
      keysPressed.add(e.key.toUpperCase());
    }
  });

  window.addEventListener('keyup', (e: KeyboardEvent) => {
    keysPressed.delete(e.code);
    if (e.key) {
      keysPressed.delete(e.key);
      keysPressed.delete(e.key.toLowerCase());
      keysPressed.delete(e.key.toUpperCase());
    }
  });

  const handlePointer = (e: MouseEvent | PointerEvent) => {
    globalMouseScreenX = e.clientX;
    globalMouseScreenY = e.clientY;
  };
  window.addEventListener('mousemove', handlePointer);
  window.addEventListener('pointermove', handlePointer);

  window.addEventListener('mousedown', (e: MouseEvent) => {
    if (e.button === 0) {
      isGlobalMouseDown = true;
    }
  });

  window.addEventListener('mouseup', (e: MouseEvent) => {
    if (e.button === 0) {
      isGlobalMouseDown = false;
    }
  });

  window.addEventListener('contextmenu', (e) => e.preventDefault());
}

export class InputManager {
  private isCrouched: boolean = false;
  private wantDodge: boolean = false;
  private wantSkill: boolean = false;
  private wantGrenade: boolean = false;
  private wantReload: boolean = false;
  private wantInteract: boolean = false;
  private switchSlot: 1 | 2 | null = null;

  // Crosshair dynamic spread
  public crosshairSpread: number = 10; // px
  private firingSpreadImpulse: number = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', (e: KeyboardEvent) => {
        const code = e.code;
        const key = e.key ? e.key.toLowerCase() : '';

        if (code === 'KeyC' || key === 'c') {
          this.isCrouched = !this.isCrouched;
        }
        if (code === 'Space' || key === ' ') {
          this.wantDodge = true;
        }
        if (code === 'KeyQ' || key === 'q') {
          this.wantSkill = true;
        }
        if (code === 'KeyG' || key === 'g') {
          this.wantGrenade = true;
        }
        if (code === 'KeyR' || key === 'r') {
          this.wantReload = true;
        }
        if (code === 'KeyE' || key === 'e') {
          this.wantInteract = true;
        }
        if (code === 'Digit1' || key === '1') {
          this.switchSlot = 1;
        }
        if (code === 'Digit2' || key === '2') {
          this.switchSlot = 2;
        }
      });

      window.addEventListener('keyup', (e: KeyboardEvent) => {
        if (e.code === 'KeyE' || (e.key && e.key.toLowerCase() === 'e')) {
          this.wantInteract = false;
        }
      });
    }
  }

  public getActiveKeys(): string[] {
    return Array.from(keysPressed);
  }

  public addFiringRecoilSpread(amount: number = 8): void {
    this.firingSpreadImpulse = Math.min(30, this.firingSpreadImpulse + amount);
  }

  public updateCrosshair(isMoving: boolean, isSprinting: boolean, dt: number): void {
    let targetSpread = 12;
    if (this.isCrouched) targetSpread = 7;
    else if (isSprinting) targetSpread = 28;
    else if (isMoving) targetSpread = 18;

    targetSpread += this.firingSpreadImpulse;
    this.firingSpreadImpulse = Math.max(0, this.firingSpreadImpulse - dt * 25);

    this.crosshairSpread += (targetSpread - this.crosshairSpread) * Math.min(1, 15 * dt);
  }

  public getPlayerInput(
    seq: number,
    playerX: number,
    playerY: number,
    camera: Camera,
    dt: number
  ): PlayerInputPacket {
    let moveX = 0;
    let moveY = 0;

    const isW = keysPressed.has('KeyW') || keysPressed.has('w') || keysPressed.has('W') || keysPressed.has('ArrowUp');
    const isS = keysPressed.has('KeyS') || keysPressed.has('s') || keysPressed.has('S') || keysPressed.has('ArrowDown');
    const isA = keysPressed.has('KeyA') || keysPressed.has('a') || keysPressed.has('A') || keysPressed.has('ArrowLeft');
    const isD = keysPressed.has('KeyD') || keysPressed.has('d') || keysPressed.has('D') || keysPressed.has('ArrowRight');

    if (isW) moveY -= 1;
    if (isS) moveY += 1;
    if (isA) moveX -= 1;
    if (isD) moveX += 1;

    // Normalize diagonal movement
    const len = Math.hypot(moveX, moveY);
    if (len > 0) {
      moveX /= len;
      moveY /= len;
    }

    const isSprinting =
      keysPressed.has('ShiftLeft') ||
      keysPressed.has('ShiftRight') ||
      keysPressed.has('shift') ||
      keysPressed.has('Shift');

    // Calculate aim angle from player world coordinates to mouse world coordinates
    const mouseWorld = camera.screenToWorld(globalMouseScreenX, globalMouseScreenY);
    const aimAngle = Math.atan2(mouseWorld.y - playerY, mouseWorld.x - playerX);

    const packet: PlayerInputPacket = {
      seq,
      moveX,
      moveY,
      aimAngle,
      isSprinting,
      isCrouched: this.isCrouched,
      isDodging: this.wantDodge,
      isFiring: isGlobalMouseDown,
      isReloading: this.wantReload,
      isInteracting: this.wantInteract,
      useSkill: this.wantSkill,
      throwGrenade: this.wantGrenade,
      switchSlot: this.switchSlot,
      dt,
      clientTimestamp: Date.now(),
    };

    // Reset single-pulse action flags
    this.wantDodge = false;
    this.wantSkill = false;
    this.wantGrenade = false;
    this.wantReload = false;
    this.switchSlot = null;

    this.updateCrosshair(len > 0, isSprinting, dt);

    return packet;
  }

  public getMouseScreenPosition(): { x: number; y: number } {
    return { x: globalMouseScreenX, y: globalMouseScreenY };
  }
}
