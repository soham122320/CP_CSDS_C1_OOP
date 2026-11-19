/**
 * Dual Virtual Touch Joysticks & Action Buttons for Mobile
 * for SHARD-4: BLACKOUT PROTOCOL
 */

export interface TouchJoystickState {
  active: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  deltaX: number; // -1 to 1
  deltaY: number; // -1 to 1
  angle: number;
  distance: number; // 0 to 1
}

export class TouchControls {
  public leftStick: TouchJoystickState = {
    active: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    deltaX: 0,
    deltaY: 0,
    angle: 0,
    distance: 0,
  };

  public rightStick: TouchJoystickState = {
    active: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    deltaX: 0,
    deltaY: 0,
    angle: 0,
    distance: 0,
  };

  public isSprintToggled: boolean = false;
  public isCrouchToggled: boolean = false;
  public wantDodge: boolean = false;
  public wantSkill: boolean = false;
  public wantGrenade: boolean = false;
  public wantReload: boolean = false;
  public wantInteract: boolean = false;
  public switchSlot: 1 | 2 | null = null;
  public isMobileDevice: boolean = false;

  private leftTouchId: number | null = null;
  private rightTouchId: number | null = null;
  private maxRadius: number = 55;

  constructor() {
    this.detectMobile();
    this.setupTouchListeners();
  }

  private detectMobile(): void {
    this.isMobileDevice =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  private vibrate(ms: number = 20): void {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(ms);
      }
    } catch (e) {
      // ignore
    }
  }

  private setupTouchListeners(): void {
    window.addEventListener(
      'touchstart',
      (e: TouchEvent) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
          const touch = e.changedTouches[i];
          const isLeftSide = touch.clientX < window.innerWidth * 0.45;
          const isRightSide = touch.clientX > window.innerWidth * 0.55;

          // Exclude top HUD and buttons area
          if (touch.clientY > window.innerHeight * 0.3) {
            if (isLeftSide && this.leftTouchId === null) {
              this.leftTouchId = touch.identifier;
              this.leftStick.active = true;
              this.leftStick.startX = touch.clientX;
              this.leftStick.startY = touch.clientY;
              this.leftStick.currentX = touch.clientX;
              this.leftStick.currentY = touch.clientY;
              this.leftStick.deltaX = 0;
              this.leftStick.deltaY = 0;
            } else if (isRightSide && this.rightTouchId === null) {
              this.rightTouchId = touch.identifier;
              this.rightStick.active = true;
              this.rightStick.startX = touch.clientX;
              this.rightStick.startY = touch.clientY;
              this.rightStick.currentX = touch.clientX;
              this.rightStick.currentY = touch.clientY;
              this.rightStick.deltaX = 0;
              this.rightStick.deltaY = 0;
            }
          }
        }
      },
      { passive: false }
    );

    window.addEventListener(
      'touchmove',
      (e: TouchEvent) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
          const touch = e.changedTouches[i];
          if (touch.identifier === this.leftTouchId) {
            this.updateJoystick(this.leftStick, touch.clientX, touch.clientY);
          } else if (touch.identifier === this.rightTouchId) {
            this.updateJoystick(this.rightStick, touch.clientX, touch.clientY);
          }
        }
      },
      { passive: false }
    );

    const handleTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === this.leftTouchId) {
          this.leftTouchId = null;
          this.leftStick.active = false;
          this.leftStick.deltaX = 0;
          this.leftStick.deltaY = 0;
        } else if (touch.identifier === this.rightTouchId) {
          this.rightTouchId = null;
          this.rightStick.active = false;
          this.rightStick.deltaX = 0;
          this.rightStick.deltaY = 0;
        }
      }
    };

    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchEnd);
  }

  private updateJoystick(stick: TouchJoystickState, clientX: number, clientY: number): void {
    const dx = clientX - stick.startX;
    const dy = clientY - stick.startY;
    const dist = Math.hypot(dx, dy);

    stick.angle = Math.atan2(dy, dx);
    const clampedDist = Math.min(this.maxRadius, dist);

    stick.currentX = stick.startX + Math.cos(stick.angle) * clampedDist;
    stick.currentY = stick.startY + Math.sin(stick.angle) * clampedDist;

    stick.deltaX = (Math.cos(stick.angle) * clampedDist) / this.maxRadius;
    stick.deltaY = (Math.sin(stick.angle) * clampedDist) / this.maxRadius;
    stick.distance = clampedDist / this.maxRadius;
  }

  // Action button triggers
  public triggerDodge(): void {
    this.wantDodge = true;
    this.vibrate(30);
  }

  public triggerSkill(): void {
    this.wantSkill = true;
    this.vibrate(40);
  }

  public triggerGrenade(): void {
    this.wantGrenade = true;
    this.vibrate(40);
  }

  public triggerReload(): void {
    this.wantReload = true;
    this.vibrate(20);
  }

  public triggerInteract(): void {
    this.wantInteract = true;
    this.vibrate(25);
  }

  public toggleCrouch(): void {
    this.isCrouchToggled = !this.isCrouchToggled;
    this.vibrate(20);
  }

  public triggerWeaponSwap(): void {
    this.switchSlot = this.switchSlot === 1 ? 2 : 1;
    this.vibrate(25);
  }
}

export const touchControls = new TouchControls();
