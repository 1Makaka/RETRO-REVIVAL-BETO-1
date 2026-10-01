/**
 * Frantic Battles - Unified Skill Button (SkillButton.ts)
 * Reusable ability slot with cooldown countdown overlay, icon, hotkey badge,
 * and Brawl Stars style drag-aiming / touch-tap callbacks.
 */

import Phaser from 'phaser';
import { getCustomControlsScale } from '../../utils/customControls';

export interface SkillButtonConfig {
  slotKey: 'attack' | 's1' | 's2' | 'ult';
  iconTexture: string;
  radius: number;
  bgColor: number;
  bgAlpha?: number;
  strokeColor?: number;
  strokeWidth?: number;
  label: string;
  labelColor?: string;
  depth?: number;
}

export class SkillButton {
  public slotKey: 'attack' | 's1' | 's2' | 'ult';
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private circle: Phaser.GameObjects.Arc;
  private icon: Phaser.GameObjects.Image;
  private label: Phaser.GameObjects.Text;
  private cdOverlay: Phaser.GameObjects.Arc;
  private cdText: Phaser.GameObjects.Text;

  private currentCd: number = 0;
  private maxCd: number = 1000;
  private isAiming: boolean = false;
  private pointerId: number | null = null;
  private touchStartX: number = 0;
  private touchStartY: number = 0;

  private onAimStartCb?: (btn: SkillButton, pointer: Phaser.Input.Pointer) => void;
  private onAimMoveCb?: (btn: SkillButton, pointer: Phaser.Input.Pointer, dx: number, dy: number) => void;
  private onAimEndCb?: (btn: SkillButton, pointer: Phaser.Input.Pointer, isCancel: boolean) => void;

  constructor(scene: Phaser.Scene, x: number, y: number, config: SkillButtonConfig) {
    this.scene = scene;
    this.slotKey = config.slotKey;

    const depth = config.depth ?? 2000;
    const ctrlScale = getCustomControlsScale();
    this.container = scene.add.container(x, y).setScrollFactor(0).setDepth(depth).setScale(ctrlScale);

    // 1. Button Base Circle
    this.circle = scene.add.circle(0, 0, config.radius, config.bgColor, config.bgAlpha ?? 0.88)
      .setScrollFactor(0)
      .setDepth(depth + 1)
      .setInteractive({ useHandCursor: true });
    if (config.strokeColor !== undefined) {
      this.circle.setStrokeStyle(config.strokeWidth ?? 2.5, config.strokeColor);
    }

    // 2. Icon
    this.icon = scene.add.image(0, 0, config.iconTexture)
      .setScale(config.slotKey === 'attack' ? 1.2 : 1.0)
      .setScrollFactor(0)
      .setDepth(depth + 2);
    this.icon.disableInteractive();

    // 3. Label
    const lblY = config.radius * 0.58;
    this.label = scene.add.text(0, lblY, config.label, {
      fontSize: '8px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: config.labelColor ?? '#ffffff',
      resolution: 2
    }).setOrigin(0.5).setScrollFactor(0).setDepth(depth + 3);
    this.label.disableInteractive();

    // 4. Cooldown Overlay & Text
    this.cdOverlay = scene.add.circle(0, 0, config.radius, 0x000000, 0.7)
      .setScrollFactor(0).setDepth(depth + 4).setVisible(false);
    this.cdOverlay.disableInteractive();

    this.cdText = scene.add.text(0, 0, '', {
      fontSize: '11px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#ffffff',
      resolution: 2
    }).setOrigin(0.5).setScrollFactor(0).setDepth(depth + 5).setVisible(false);
    this.cdText.disableInteractive();

    this.container.add([this.circle, this.icon, this.label, this.cdOverlay, this.cdText]);
    this.container.setSize(config.radius * 2, config.radius * 2);

    this.bindEvents();
  }

  private bindEvents() {
    this.circle.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.currentCd > 0) return;
      this.pointerId = p.id;
      this.isAiming = true;
      this.touchStartX = p.x;
      this.touchStartY = p.y;
      this.circle.setScale(1.15);

      if (this.onAimStartCb) {
        this.onAimStartCb(this, p);
      }
    });

    this.scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.pointerId === p.id && this.isAiming) {
        const dx = p.x - this.touchStartX;
        const dy = p.y - this.touchStartY;
        if (this.onAimMoveCb) {
          this.onAimMoveCb(this, p, dx, dy);
        }
      }
    });

    this.scene.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (this.pointerId === p.id && this.isAiming) {
        this.pointerId = null;
        this.isAiming = false;
        this.circle.setScale(1.0);
        if (this.onAimEndCb) {
          this.onAimEndCb(this, p, false);
        }
      }
    });
  }

  public onAimStart(cb: (btn: SkillButton, pointer: Phaser.Input.Pointer) => void) {
    this.onAimStartCb = cb;
    return this;
  }

  public onAimMove(cb: (btn: SkillButton, pointer: Phaser.Input.Pointer, dx: number, dy: number) => void) {
    this.onAimMoveCb = cb;
    return this;
  }

  public onAimEnd(cb: (btn: SkillButton, pointer: Phaser.Input.Pointer, isCancel: boolean) => void) {
    this.onAimEndCb = cb;
    return this;
  }

  public setCooldown(currentMs: number, maxMs: number) {
    this.currentCd = Math.max(0, currentMs);
    this.maxCd = Math.max(1, maxMs);

    if (this.currentCd > 0) {
      this.cdOverlay.setVisible(true);
      this.cdText.setVisible(true);
      const secs = (this.currentCd / 1000).toFixed(1);
      this.cdText.setText(secs);
    } else {
      this.cdOverlay.setVisible(false);
      this.cdText.setVisible(false);
    }
  }

  public setIcon(textureKey: string) {
    if (this.scene.textures.exists(textureKey)) {
      this.icon.setTexture(textureKey);
    }
  }

  public setPosition(x: number, y: number) {
    this.container.setPosition(x, y);
  }

  public getPosition(): { x: number; y: number } {
    return { x: this.container.x, y: this.container.y };
  }

  public setScale(scale: number) {
    this.container.setScale(scale);
  }

  public setVisible(visible: boolean) {
    this.container.setVisible(visible);
  }

  public destroy() {
    this.container.destroy();
  }
}
