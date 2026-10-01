/**
 * Frantic Battles - Unified Virtual Joystick (VirtualJoystick.ts)
 * Reusable touch / drag joystick for movement and aiming across all game scenes.
 */

import Phaser from 'phaser';
import { getCustomControlsScale } from '../../utils/customControls';

export interface VirtualJoystickOptions {
  radius?: number;
  thumbRadius?: number;
  baseColor?: number;
  baseAlpha?: number;
  thumbColor?: number;
  thumbAlpha?: number;
  baseStrokeColor?: number;
  baseStrokeWidth?: number;
  thumbStrokeColor?: number;
  thumbStrokeWidth?: number;
  depth?: number;
  fixed?: boolean;
}

export class VirtualJoystick {
  private scene: Phaser.Scene;
  private base: Phaser.GameObjects.Arc;
  private thumb: Phaser.GameObjects.Arc;
  private radius: number;
  private thumbRadius: number;
  private pointerId: number | null = null;
  private vector: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);
  private originX: number;
  private originY: number;
  private isMoved: boolean = false;
  private touchStartTime: number = 0;
  private touchStartX: number = 0;
  private touchStartY: number = 0;
  private onPressCallback?: (p: Phaser.Input.Pointer) => void;
  private onMoveCallback?: (vec: Phaser.Math.Vector2, p: Phaser.Input.Pointer) => void;
  private onReleaseCallback?: (vec: Phaser.Math.Vector2, duration: number, moveDist: number) => void;

  constructor(scene: Phaser.Scene, x: number, y: number, options?: VirtualJoystickOptions) {
    this.scene = scene;
    this.originX = x;
    this.originY = y;
    const ctrlScale = getCustomControlsScale();
    this.radius = (options?.radius ?? 52) * ctrlScale;
    this.thumbRadius = (options?.thumbRadius ?? 26) * ctrlScale;

    const baseColor = options?.baseColor ?? 0x27272a;
    const baseAlpha = options?.baseAlpha ?? 0.6;
    const thumbColor = options?.thumbColor ?? 0x71717a;
    const thumbAlpha = options?.thumbAlpha ?? 0.8;
    const depth = options?.depth ?? 2000;

    this.base = scene.add.circle(x, y, this.radius, baseColor, baseAlpha)
      .setScrollFactor(0)
      .setDepth(depth)
      .setInteractive({ useHandCursor: true });

    if (options?.baseStrokeColor !== undefined) {
      this.base.setStrokeStyle(options.baseStrokeWidth ?? 2, options.baseStrokeColor);
    }

    this.thumb = scene.add.circle(x, y, this.thumbRadius, thumbColor, thumbAlpha)
      .setScrollFactor(0)
      .setDepth(depth + 1);

    if (options?.thumbStrokeColor !== undefined) {
      this.thumb.setStrokeStyle(options.thumbStrokeWidth ?? 2, options.thumbStrokeColor);
    }

    this.bindEvents();
  }

  private bindEvents() {
    this.base.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.pointerId = p.id;
      this.isMoved = false;
      this.touchStartTime = this.scene.time.now;
      this.touchStartX = p.x;
      this.touchStartY = p.y;
      if (this.onPressCallback) {
        this.onPressCallback(p);
      }
      this.updatePosition(p.x, p.y, p);
    });

    this.scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.pointerId === p.id) {
        const moveDist = Phaser.Math.Distance.Between(this.touchStartX, this.touchStartY, p.x, p.y);
        if (moveDist > 12) this.isMoved = true;
        this.updatePosition(p.x, p.y, p);
      }
    });

    this.scene.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (this.pointerId === p.id) {
        const duration = this.scene.time.now - this.touchStartTime;
        const moveDist = Phaser.Math.Distance.Between(this.touchStartX, this.touchStartY, p.x, p.y);
        const lastVec = this.vector.clone();

        this.pointerId = null;
        this.vector.set(0, 0);
        this.thumb.setPosition(this.base.x, this.base.y);

        if (this.onReleaseCallback) {
          this.onReleaseCallback(lastVec, duration, moveDist);
        }
        this.isMoved = false;
      }
    });
  }

  private updatePosition(px: number, py: number, p: Phaser.Input.Pointer) {
    const dx = px - this.base.x;
    const dy = py - this.base.y;
    const rawDist = Math.sqrt(dx * dx + dy * dy);
    const dist = Math.min(rawDist, this.radius);
    const angle = Math.atan2(dy, dx);

    this.thumb.setPosition(
      this.base.x + Math.cos(angle) * dist,
      this.base.y + Math.sin(angle) * dist
    );

    const norm = dist / this.radius;
    this.vector.set(Math.cos(angle) * norm, Math.sin(angle) * norm);

    if (this.onMoveCallback) {
      this.onMoveCallback(this.vector, p);
    }
  }

  public onPress(cb: (p: Phaser.Input.Pointer) => void) {
    this.onPressCallback = cb;
    return this;
  }

  public onMove(cb: (vec: Phaser.Math.Vector2, p: Phaser.Input.Pointer) => void) {
    this.onMoveCallback = cb;
    return this;
  }

  public onRelease(cb: (vec: Phaser.Math.Vector2, duration: number, moveDist: number) => void) {
    this.onReleaseCallback = cb;
    return this;
  }

  public getVector(): Phaser.Math.Vector2 {
    return this.vector;
  }

  public isDown(): boolean {
    return this.pointerId !== null;
  }

  public hasMoved(): boolean {
    return this.isMoved;
  }

  public setPosition(x: number, y: number) {
    this.originX = x;
    this.originY = y;
    this.base.setPosition(x, y);
    if (this.pointerId === null) {
      this.thumb.setPosition(x, y);
    }
  }

  public setScale(scale: number) {
    this.base.setScale(scale);
    this.thumb.setScale(scale);
  }

  public setVisible(visible: boolean) {
    this.base.setVisible(visible);
    this.thumb.setVisible(visible);
  }

  public getBaseObject(): Phaser.GameObjects.Arc {
    return this.base;
  }

  public getThumbObject(): Phaser.GameObjects.Arc {
    return this.thumb;
  }

  public destroy() {
    this.base.destroy();
    this.thumb.destroy();
  }
}
