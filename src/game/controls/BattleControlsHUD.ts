/**
 * Frantic Battles - Unified Battle Controls HUD (BattleControlsHUD.ts)
 * 100% Faithful Port of DungeonScene controls:
 * - Dual Joystick (Left move, Right Red Aim & Continuous Attack on hold)
 * - Hero-specific vector aiming trajectories (Omen fan cone, Kraul hook/dash, Torf boulder/shield, etc.)
 * - Continuous auto-attack holding (keyboard SPACE or hold joystick/button)
 * - Cancel aim zone with red pulse & snap
 * - Keyboard shortcuts (WASD, 1/2/3, Q/E/R, Space)
 */

import Phaser from 'phaser';
import { VirtualJoystick } from './VirtualJoystick';
import { SkillButton } from './SkillButton';
import { getCustomControlsLayout, DEFAULT_CONTROLS_LAYOUT, getShowAttackRange, getIndividualButtonScale } from '../../utils/customControls';
import { soundEngine } from '../audio';
import { HeroData } from '../players';

export interface BattleControlsCallbacks {
  onAttack: (dirX: number, dirY: number, autoAim: boolean) => void;
  onSkill: (slot: 's1' | 's2' | 'ult', dirX: number, dirY: number, autoAim: boolean) => void;
  getNearestTarget?: () => { x: number; y: number } | null;
  getAimOrigin?: () => { x: number; y: number };
  isPointInsideBounds?: (x: number, y: number) => boolean;
}

export class BattleControlsHUD {
  private scene: Phaser.Scene;
  private heroData: HeroData;
  private heroKey: string;
  private callbacks: BattleControlsCallbacks;

  // Joysticks
  public moveJoystick!: VirtualJoystick;
  public aimJoystick!: VirtualJoystick;

  // Skill Buttons
  public skill1Btn!: SkillButton;
  public skill2Btn!: SkillButton;
  public ultBtn!: SkillButton;

  // Aiming Visuals & Cancel Zone
  private aimLineGfx: Phaser.GameObjects.Graphics;
  private skillAimGfx: Phaser.GameObjects.Graphics;
  private cancelZoneContainer: Phaser.GameObjects.Container;
  private cancelZoneBg: Phaser.GameObjects.Arc;
  private isAimCancelled: boolean = false;
  private activeAimingSlot: 'attack' | 's1' | 's2' | 'ult' | null = null;
  private aimVector: Phaser.Math.Vector2 = new Phaser.Math.Vector2(1, 0);

  // Continuous Attack Holding
  private isAttackHolding: boolean = false;
  private attackHoldTimer: number = 0;
  private isSpaceDown: boolean = false;

  // Keyboard controls
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private controlsListener: () => void;

  constructor(scene: Phaser.Scene, heroData: HeroData, callbacks: BattleControlsCallbacks) {
    this.scene = scene;
    this.heroData = heroData;
    this.heroKey = heroData.id;
    this.callbacks = callbacks;

    this.aimLineGfx = scene.add.graphics().setDepth(2010);
    this.skillAimGfx = scene.add.graphics().setDepth(2011);

    const w = scene.cameras.main.width;
    const h = scene.cameras.main.height;
    const layout = getCustomControlsLayout();

    // 1. Move Joystick (Left)
    const joyX = layout.joystick.x * w;
    const joyY = layout.joystick.y * h;
    this.moveJoystick = new VirtualJoystick(scene, joyX, joyY, {
      radius: 52,
      thumbRadius: 26,
      baseColor: 0x27272a,
      baseAlpha: 0.6,
      thumbColor: 0x71717a,
      thumbAlpha: 0.8,
      depth: 2000
    });

    // 2. Red Aim & Attack Joystick (Right)
    const aimX = layout.attack.x * w;
    const aimY = layout.attack.y * h;
    this.aimJoystick = new VirtualJoystick(scene, aimX, aimY, {
      radius: 52,
      thumbRadius: 26,
      baseColor: 0x450a0a,
      baseAlpha: 0.75,
      baseStrokeColor: 0xef4444,
      baseStrokeWidth: 3,
      thumbColor: 0xdc2626,
      thumbAlpha: 0.95,
      thumbStrokeColor: 0xfca5a5,
      thumbStrokeWidth: 2,
      depth: 2000
    });

    // Attack Joystick Aiming, Continuous Holding & Auto-Aim
    this.aimJoystick.onPress(() => {
      this.isAttackHolding = true;
      this.attackHoldTimer = 0;
      // Do instant auto-attack on tap start if target in range
      this.triggerAutoAttack();
    });

    this.aimJoystick.onMove((vec) => {
      if (vec.lengthSq() > 0.05) {
        this.aimVector.set(vec.x, vec.y);
        this.drawAttackTrajectory(vec.x, vec.y);
      }
    });

    this.aimJoystick.onRelease((vec, duration, moveDist) => {
      this.isAttackHolding = false;
      this.aimLineGfx.clear();
      if (!this.aimJoystick.hasMoved() || (duration < 380 && moveDist < 24)) {
        // Quick tap: Auto aim
        this.triggerAutoAttack();
      } else if (vec.lengthSq() > 0.05) {
        this.callbacks.onAttack(vec.x, vec.y, false);
      }
    });

    // 3. Skill 1 Button
    const s1X = layout.s1.x * w;
    const s1Y = layout.s1.y * h;
    this.skill1Btn = new SkillButton(scene, s1X, s1Y, {
      slotKey: 's1',
      iconTexture: heroData.skills[0]?.icon || 'skill_zaza_1',
      radius: 26,
      bgColor: 0x16a34a,
      strokeColor: 0x4ade80,
      strokeWidth: 2,
      label: '[ 1 ]',
      labelColor: '#ffffff',
      depth: 2000
    });
    this.setupSkillAiming(this.skill1Btn, 's1');

    // 4. Skill 2 Button
    const s2X = layout.s2.x * w;
    const s2Y = layout.s2.y * h;
    this.skill2Btn = new SkillButton(scene, s2X, s2Y, {
      slotKey: 's2',
      iconTexture: heroData.skills[1]?.icon || 'skill_zaza_2',
      radius: 26,
      bgColor: 0x2563eb,
      strokeColor: 0x60a5fa,
      strokeWidth: 2,
      label: '[ 2 ]',
      labelColor: '#ffffff',
      depth: 2000
    });
    this.setupSkillAiming(this.skill2Btn, 's2');

    // 5. Ultimate Button
    const ultX = layout.ult.x * w;
    const ultY = layout.ult.y * h;
    this.ultBtn = new SkillButton(scene, ultX, ultY, {
      slotKey: 'ult',
      iconTexture: heroData.skills[2]?.icon || 'skill_zaza_3',
      radius: 28,
      bgColor: 0x9333ea,
      strokeColor: 0xfacc15,
      strokeWidth: 3,
      label: '[ ★ ]',
      labelColor: '#fef08a',
      depth: 2000
    });
    this.setupSkillAiming(this.ultBtn, 'ult');

    // 6. Cancel Aim Zone
    const cancelX = (layout.cancel ? layout.cancel.x : DEFAULT_CONTROLS_LAYOUT.cancel.x) * w;
    const cancelY = (layout.cancel ? layout.cancel.y : DEFAULT_CONTROLS_LAYOUT.cancel.y) * h;
    this.cancelZoneContainer = scene.add.container(cancelX, cancelY).setScrollFactor(0).setDepth(2020).setVisible(false);
    this.cancelZoneBg = scene.add.circle(0, 0, 32, 0xdc2626, 0.85).setStrokeStyle(2, 0xfca5a5);
    const cancelIcon = scene.add.text(0, -6, '✕', {
      fontSize: '18px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffffff'
    }).setOrigin(0.5);
    const cancelLbl = scene.add.text(0, 12, 'ОТМЕНА', {
      fontSize: '8px', fontFamily: 'monospace', fontStyle: 'bold', color: '#fef2f2'
    }).setOrigin(0.5);
    this.cancelZoneContainer.add([this.cancelZoneBg, cancelIcon, cancelLbl]);

    // 7. Keyboard Bindings
    if (scene.input.keyboard) {
      this.cursors = scene.input.keyboard.createCursorKeys();
      this.keys = scene.input.keyboard.addKeys({
        W: Phaser.Input.Keyboard.KeyCodes.W,
        A: Phaser.Input.Keyboard.KeyCodes.A,
        S: Phaser.Input.Keyboard.KeyCodes.S,
        D: Phaser.Input.Keyboard.KeyCodes.D,
        Q: Phaser.Input.Keyboard.KeyCodes.Q,
        E: Phaser.Input.Keyboard.KeyCodes.E,
        R: Phaser.Input.Keyboard.KeyCodes.R,
        ONE: Phaser.Input.Keyboard.KeyCodes.ONE,
        TWO: Phaser.Input.Keyboard.KeyCodes.TWO,
        THREE: Phaser.Input.Keyboard.KeyCodes.THREE,
        SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE
      }) as Record<string, Phaser.Input.Keyboard.Key>;

      this.keys.SPACE.on('down', () => {
        this.isSpaceDown = true;
        this.triggerAutoAttack();
      });
      this.keys.SPACE.on('up', () => {
        this.isSpaceDown = false;
      });

      this.keys.Q.on('down', () => this.triggerAutoSkill('s1'));
      this.keys.ONE.on('down', () => this.triggerAutoSkill('s1'));
      this.keys.E.on('down', () => this.triggerAutoSkill('s2'));
      this.keys.TWO.on('down', () => this.triggerAutoSkill('s2'));
      this.keys.R.on('down', () => this.triggerAutoSkill('ult'));
      this.keys.THREE.on('down', () => this.triggerAutoSkill('ult'));
    }

    // 8. Custom Controls Repositioning Listener
    this.controlsListener = () => this.reposition();
    window.addEventListener('controls-layout-changed', this.controlsListener);
    scene.events.once('shutdown', () => {
      window.removeEventListener('controls-layout-changed', this.controlsListener);
    });

    // Apply initial positioning and scales
    this.reposition();
  }

  private setupSkillAiming(btn: SkillButton, slot: 's1' | 's2' | 'ult') {
    let hasMoved = false;

    btn.onAimStart(() => {
      this.activeAimingSlot = slot;
      this.isAimCancelled = false;
      hasMoved = false;
      this.cancelZoneContainer.setVisible(true);
      this.cancelZoneBg.setScale(1).setStrokeStyle(2, 0xfca5a5);

      const nearest = this.callbacks.getNearestTarget ? this.callbacks.getNearestTarget() : null;
      const origin = this.callbacks.getAimOrigin ? this.callbacks.getAimOrigin() : { x: 0, y: 0 };
      if (nearest) {
        const angle = Phaser.Math.Angle.Between(origin.x, origin.y, nearest.x, nearest.y);
        this.aimVector.set(Math.cos(angle), Math.sin(angle));
      }
      this.drawSkillTrajectory(slot, this.aimVector.x, this.aimVector.y, false);
    });

    btn.onAimMove((_b, pointer, dx, dy) => {
      if (this.activeAimingSlot !== slot) return;

      const dist = Math.hypot(dx, dy);
      if (dist > 12) {
        hasMoved = true;
        this.aimVector.set(dx / dist, dy / dist);
      }

      // Check distance to cancel zone
      const cx = this.cancelZoneContainer.x;
      const cy = this.cancelZoneContainer.y;
      const distToCancel = Phaser.Math.Distance.Between(pointer.x, pointer.y, cx, cy);

      if (distToCancel < 55) {
        this.isAimCancelled = true;
        this.cancelZoneBg.setScale(1.25).setStrokeStyle(3, 0xff0000);
      } else {
        this.isAimCancelled = false;
        this.cancelZoneBg.setScale(1).setStrokeStyle(2, 0xfca5a5);
      }

      this.drawSkillTrajectory(slot, this.aimVector.x, this.aimVector.y, this.isAimCancelled);
    });

    btn.onAimEnd((_b, _p) => {
      this.skillAimGfx.clear();
      this.cancelZoneContainer.setVisible(false);

      if (this.isAimCancelled) {
        soundEngine.playClick();
        this.activeAimingSlot = null;
        return;
      }

      if (!hasMoved) {
        // Quick tap: Auto-aim at nearest enemy if available
        this.triggerAutoSkill(slot);
      } else {
        // Dragged aiming: shoot exactly where aimed
        this.callbacks.onSkill(slot, this.aimVector.x, this.aimVector.y, false);
      }
      this.activeAimingSlot = null;
    });
  }

  public triggerAutoAttack() {
    const origin = this.callbacks.getAimOrigin ? this.callbacks.getAimOrigin() : { x: 0, y: 0 };
    const nearest = this.callbacks.getNearestTarget ? this.callbacks.getNearestTarget() : null;

    if (nearest) {
      const angle = Phaser.Math.Angle.Between(origin.x, origin.y, nearest.x, nearest.y);
      this.aimVector.set(Math.cos(angle), Math.sin(angle));
      this.callbacks.onAttack(Math.cos(angle), Math.sin(angle), true);
    } else {
      this.callbacks.onAttack(this.aimVector.x, this.aimVector.y, true);
    }
  }

  public triggerAutoSkill(slot: 's1' | 's2' | 'ult') {
    const origin = this.callbacks.getAimOrigin ? this.callbacks.getAimOrigin() : { x: 0, y: 0 };
    const nearest = this.callbacks.getNearestTarget ? this.callbacks.getNearestTarget() : null;

    if (nearest) {
      const angle = Phaser.Math.Angle.Between(origin.x, origin.y, nearest.x, nearest.y);
      this.aimVector.set(Math.cos(angle), Math.sin(angle));
      this.callbacks.onSkill(slot, Math.cos(angle), Math.sin(angle), true);
    } else {
      this.callbacks.onSkill(slot, this.aimVector.x, this.aimVector.y, true);
    }
  }

  // Continuous auto-attack update loop
  public update(delta: number) {
    if (this.isAttackHolding || this.isSpaceDown) {
      this.attackHoldTimer += delta;
      if (this.attackHoldTimer >= 180) {
        this.attackHoldTimer = 0;
        this.triggerAutoAttack();
      }
    }
  }

  private drawAttackTrajectory(dirX: number, dirY: number) {
    if (!this.aimLineGfx || !getShowAttackRange()) return;
    this.aimLineGfx.clear();
    const origin = this.callbacks.getAimOrigin ? this.callbacks.getAimOrigin() : { x: 0, y: 0 };

    const isRanged = this.heroKey === 'char_grim' || this.heroKey === 'char_omen' || this.heroKey === 'char_nihil';
    const startX = origin.x;
    const startY = origin.y;

    if (isRanged) {
      const range = this.heroKey === 'char_nihil' ? 340 : 280;
      const endX = startX + dirX * range;
      const endY = startY + dirY * range;

      this.aimLineGfx.lineStyle(6, 0xef4444, 0.35);
      this.aimLineGfx.lineBetween(startX, startY, endX, endY);
      this.aimLineGfx.lineStyle(2, 0xffffff, 0.95);
      this.aimLineGfx.lineBetween(startX, startY, endX, endY);

      for (let s = 25; s < range; s += 30) {
        this.aimLineGfx.fillStyle(0xfca5a5, 0.85);
        this.aimLineGfx.fillCircle(startX + dirX * s, startY + dirY * s, 2.5);
      }

      this.aimLineGfx.lineStyle(2, 0xef4444, 0.9);
      this.aimLineGfx.strokeCircle(endX, endY, 14);
      this.aimLineGfx.fillStyle(0xffffff, 0.9);
      this.aimLineGfx.fillCircle(endX, endY, 3);
    } else {
      const reach = (this.heroKey === 'char_kraul') ? 125 :
                    (this.heroKey === 'char_alrik') ? 120 : 85;
      const endX = startX + dirX * reach;
      const endY = startY + dirY * reach;
      const angle = Math.atan2(dirY, dirX);

      this.aimLineGfx.lineStyle(6, 0xef4444, 0.35);
      this.aimLineGfx.lineBetween(startX, startY, endX, endY);
      this.aimLineGfx.lineStyle(2, 0xfca5a5, 0.9);
      this.aimLineGfx.lineBetween(startX, startY, endX, endY);

      this.aimLineGfx.lineStyle(2, 0xef4444, 0.85);
      this.aimLineGfx.beginPath();
      this.aimLineGfx.arc(startX, startY, reach, angle - 0.55, angle + 0.55, false);
      this.aimLineGfx.strokePath();
    }
  }

  // 100% Faithful Skill Aim Indicators Ported from DungeonScene
  private drawSkillTrajectory(slot: 's1' | 's2' | 'ult', dirX: number, dirY: number, isCancelled: boolean) {
    if (!this.skillAimGfx) return;
    this.skillAimGfx.clear();
    const origin = this.callbacks.getAimOrigin ? this.callbacks.getAimOrigin() : { x: 0, y: 0 };
    const startX = origin.x;
    const startY = origin.y;

    // 1. Kraul
    if (this.heroKey === 'char_kraul') {
      if (slot === 's1') {
        const range = 265;
        const endX = startX + dirX * range;
        const endY = startY + dirY * range;
        this.skillAimGfx.lineStyle(8, isCancelled ? 0xef4444 : 0xa855f7, 0.4);
        this.skillAimGfx.lineBetween(startX, startY, endX, endY);
        this.skillAimGfx.lineStyle(3, isCancelled ? 0xfca5a5 : 0xf0abfc, 0.95);
        this.skillAimGfx.lineBetween(startX, startY, endX, endY);
        for (let s = 25; s < range; s += 28) {
          this.skillAimGfx.fillStyle(isCancelled ? 0xfca5a5 : 0xffffff, 0.85);
          this.skillAimGfx.fillCircle(startX + dirX * s, startY + dirY * s, 2.5);
        }
        this.skillAimGfx.lineStyle(2, isCancelled ? 0xef4444 : 0xc084fc, 0.85);
        this.skillAimGfx.strokeCircle(endX, endY, 22);
        this.skillAimGfx.fillStyle(isCancelled ? 0xef4444 : 0xa855f7, 0.25);
        this.skillAimGfx.fillCircle(endX, endY, 22);
        return;
      } else if (slot === 's2') {
        const range = 420;
        const endX = startX + dirX * range;
        const endY = startY + dirY * range;
        this.skillAimGfx.lineStyle(7, isCancelled ? 0xef4444 : 0xfacc15, 0.45);
        this.skillAimGfx.lineBetween(startX, startY, endX, endY);
        this.skillAimGfx.lineStyle(2.5, isCancelled ? 0xfca5a5 : 0xffffff, 0.95);
        this.skillAimGfx.lineBetween(startX, startY, endX, endY);
        for (let s = 25; s < range; s += 28) {
          this.skillAimGfx.fillStyle(isCancelled ? 0xfca5a5 : 0xfde047, 0.85);
          this.skillAimGfx.fillCircle(startX + dirX * s, startY + dirY * s, 2.5);
        }
        this.skillAimGfx.lineStyle(3, isCancelled ? 0xef4444 : 0xfacc15, 0.95);
        this.skillAimGfx.strokeCircle(endX, endY, 18);
        this.skillAimGfx.fillStyle(isCancelled ? 0xef4444 : 0xfef08a, 0.9);
        this.skillAimGfx.fillCircle(endX, endY, 3.5);
        this.skillAimGfx.lineBetween(endX - 22, endY, endX - 13, endY);
        this.skillAimGfx.lineBetween(endX + 13, endY, endX + 22, endY);
        this.skillAimGfx.lineBetween(endX, endY - 22, endX, endY - 13);
        this.skillAimGfx.lineBetween(endX, endY + 13, endX, endY + 22);
        return;
      } else {
        this.skillAimGfx.lineStyle(3, isCancelled ? 0xef4444 : 0xa855f7, 0.85);
        this.skillAimGfx.strokeCircle(startX, startY, 75);
        this.skillAimGfx.fillStyle(isCancelled ? 0xef4444 : 0x7e22ce, 0.22);
        this.skillAimGfx.fillCircle(startX, startY, 75);
        return;
      }
    }

    // 2. Zaza
    if (this.heroKey === 'char_zaza') {
      if (slot === 's1') {
        const range = 280;
        const endX = startX + dirX * range;
        const endY = startY + dirY * range;
        this.skillAimGfx.lineStyle(7, isCancelled ? 0xef4444 : 0x16a34a, 0.4);
        this.skillAimGfx.lineBetween(startX, startY, endX, endY);
        this.skillAimGfx.lineStyle(2.5, isCancelled ? 0xfca5a5 : 0x86efac, 0.95);
        this.skillAimGfx.lineBetween(startX, startY, endX, endY);
        this.skillAimGfx.lineStyle(2, isCancelled ? 0xef4444 : 0x22c55e, 0.9);
        this.skillAimGfx.strokeCircle(endX, endY, 45);
        this.skillAimGfx.fillStyle(isCancelled ? 0xef4444 : 0x22c55e, 0.25);
        this.skillAimGfx.fillCircle(endX, endY, 45);
        return;
      } else if (slot === 's2') {
        this.skillAimGfx.lineStyle(3, isCancelled ? 0xef4444 : 0x84cc16, 0.85);
        this.skillAimGfx.strokeCircle(startX, startY, 75);
        this.skillAimGfx.fillStyle(isCancelled ? 0xef4444 : 0x84cc16, 0.2);
        this.skillAimGfx.fillCircle(startX, startY, 75);
        return;
      } else {
        this.skillAimGfx.lineStyle(3, isCancelled ? 0xef4444 : 0xa855f7, 0.85);
        this.skillAimGfx.strokeCircle(startX, startY, 85);
        this.skillAimGfx.fillStyle(isCancelled ? 0xef4444 : 0xa855f7, 0.2);
        this.skillAimGfx.fillCircle(startX, startY, 85);
        return;
      }
    }

    // 3. Grim
    if (this.heroKey === 'char_grim') {
      if (slot === 's1') {
        const range = 270;
        const endX = startX + dirX * range;
        const endY = startY + dirY * range;
        this.skillAimGfx.lineStyle(7, isCancelled ? 0xef4444 : 0xf59e0b, 0.4);
        this.skillAimGfx.lineBetween(startX, startY, endX, endY);
        this.skillAimGfx.lineStyle(2.5, isCancelled ? 0xfca5a5 : 0xfef08a, 0.95);
        this.skillAimGfx.lineBetween(startX, startY, endX, endY);
        this.skillAimGfx.strokeCircle(endX, endY, 55);
        this.skillAimGfx.fillStyle(isCancelled ? 0xef4444 : 0xd97706, 0.25);
        this.skillAimGfx.fillCircle(endX, endY, 55);
        return;
      } else if (slot === 's2') {
        const range = 190;
        const endX = startX + dirX * range;
        const endY = startY + dirY * range;
        this.skillAimGfx.lineStyle(6, isCancelled ? 0xef4444 : 0x6366f1, 0.4);
        this.skillAimGfx.lineBetween(startX, startY, endX, endY);
        this.skillAimGfx.strokeCircle(endX, endY, 26);
        return;
      } else {
        const range = 240;
        const endX = startX + dirX * range;
        const endY = startY + dirY * range;
        this.skillAimGfx.lineStyle(6, isCancelled ? 0xef4444 : 0xef4444, 0.4);
        this.skillAimGfx.lineBetween(startX, startY, endX, endY);
        this.skillAimGfx.lineStyle(3, isCancelled ? 0xef4444 : 0xf87171, 0.9);
        this.skillAimGfx.strokeCircle(endX, endY, 130);
        this.skillAimGfx.fillStyle(isCancelled ? 0xef4444 : 0xef4444, 0.2);
        this.skillAimGfx.fillCircle(endX, endY, 130);
        return;
      }
    }

    // 4. Torf
    if (this.heroKey === 'char_torf') {
      if (slot === 's1') {
        const range = 310;
        const endX = startX + dirX * range;
        const endY = startY + dirY * range;
        this.skillAimGfx.lineStyle(7, isCancelled ? 0xef4444 : 0xd97706, 0.4);
        this.skillAimGfx.lineBetween(startX, startY, endX, endY);
        this.skillAimGfx.lineStyle(2.5, isCancelled ? 0xfca5a5 : 0xfde68a, 0.95);
        this.skillAimGfx.lineBetween(startX, startY, endX, endY);
        this.skillAimGfx.lineStyle(2, isCancelled ? 0xef4444 : 0xf59e0b, 0.85);
        this.skillAimGfx.strokeCircle(endX, endY, 65);
        this.skillAimGfx.fillStyle(isCancelled ? 0xef4444 : 0xd97706, 0.25);
        this.skillAimGfx.fillCircle(endX, endY, 65);
        return;
      } else if (slot === 's2') {
        this.skillAimGfx.lineStyle(3, isCancelled ? 0xef4444 : 0x38bdf8, 0.85);
        this.skillAimGfx.strokeCircle(startX, startY, 65);
        this.skillAimGfx.fillStyle(isCancelled ? 0xef4444 : 0x0284c7, 0.2);
        this.skillAimGfx.fillCircle(startX, startY, 65);
        return;
      } else {
        this.skillAimGfx.lineStyle(3, isCancelled ? 0xef4444 : 0x3b82f6, 0.85);
        this.skillAimGfx.strokeCircle(startX, startY, 110);
        this.skillAimGfx.fillStyle(isCancelled ? 0xef4444 : 0x2563eb, 0.25);
        this.skillAimGfx.fillCircle(startX, startY, 110);
        return;
      }
    }

    // 5. Omen
    if (this.heroKey === 'char_omen') {
      if (slot === 's1') {
        const centerAngle = Math.atan2(dirY, dirX);
        for (let i = -2; i <= 2; i++) {
          const bladeAngle = centerAngle + i * 0.18;
          const bDirX = Math.cos(bladeAngle);
          const bDirY = Math.sin(bladeAngle);
          const bladeRange = 330;
          const bx = startX + bDirX * bladeRange;
          const by = startY + bDirY * bladeRange;
          this.skillAimGfx.lineStyle(5, isCancelled ? 0xef4444 : 0xdc2626, 0.35);
          this.skillAimGfx.lineBetween(startX, startY, bx, by);
          this.skillAimGfx.lineStyle(2, isCancelled ? 0xfca5a5 : 0xfca5a5, 0.9);
          this.skillAimGfx.lineBetween(startX, startY, bx, by);
          this.skillAimGfx.fillStyle(isCancelled ? 0xef4444 : 0xef4444, 0.9);
          this.skillAimGfx.fillCircle(bx, by, 3);
        }
        return;
      } else if (slot === 's2') {
        const range = 230;
        const endX = startX + dirX * range;
        const endY = startY + dirY * range;
        this.skillAimGfx.lineStyle(7, isCancelled ? 0xef4444 : 0x9333ea, 0.4);
        this.skillAimGfx.lineBetween(startX, startY, endX, endY);
        this.skillAimGfx.strokeCircle(endX, endY, 32);
        return;
      } else {
        const range = 380;
        const endX = startX + dirX * range;
        const endY = startY + dirY * range;
        this.skillAimGfx.lineStyle(6, isCancelled ? 0xef4444 : 0xef4444, 0.4);
        this.skillAimGfx.lineBetween(startX, startY, endX, endY);
        this.skillAimGfx.strokeCircle(endX, endY, 135);
        this.skillAimGfx.fillStyle(isCancelled ? 0xef4444 : 0xef4444, 0.22);
        this.skillAimGfx.fillCircle(endX, endY, 135);
        this.skillAimGfx.lineBetween(endX - 20, endY, endX + 20, endY);
        this.skillAimGfx.lineBetween(endX, endY - 20, endX, endY + 20);
        return;
      }
    }

    // Nihil
    if (this.heroKey === 'char_nihil') {
      if (slot === 's1') {
        const radius = 110;
        const targetX = startX + dirX * 160;
        const targetY = startY + dirY * 160;
        this.skillAimGfx.lineStyle(3, isCancelled ? 0xef4444 : 0xc084fc, 0.9);
        this.skillAimGfx.strokeCircle(targetX, targetY, radius);
        this.skillAimGfx.fillStyle(isCancelled ? 0xef4444 : 0x7e22ce, 0.25);
        this.skillAimGfx.fillCircle(targetX, targetY, radius);
        return;
      } else if (slot === 's2') {
        const dashDist = 180;
        const endX = startX + dirX * dashDist;
        const endY = startY + dirY * dashDist;
        this.skillAimGfx.lineStyle(4, isCancelled ? 0xef4444 : 0xd8b4fe, 0.7);
        this.skillAimGfx.lineBetween(startX, startY, endX, endY);
        this.skillAimGfx.strokeCircle(endX, endY, 24);
        return;
      } else {
        const radius = 180;
        this.skillAimGfx.lineStyle(4, isCancelled ? 0xef4444 : 0xd8b4fe, 0.9);
        this.skillAimGfx.strokeCircle(startX, startY, radius);
        this.skillAimGfx.fillStyle(isCancelled ? 0xef4444 : 0x4c1d95, 0.25);
        this.skillAimGfx.fillCircle(startX, startY, radius);
        return;
      }
    }

    // 6. Alrik
    if (this.heroKey === 'char_alrik') {
      if (slot === 's1') {
        const range = 270;
        const endX = startX + dirX * range;
        const endY = startY + dirY * range;
        this.skillAimGfx.lineStyle(8, isCancelled ? 0xef4444 : 0x0284c7, 0.4);
        this.skillAimGfx.lineBetween(startX, startY, endX, endY);
        this.skillAimGfx.lineStyle(3, isCancelled ? 0xfca5a5 : 0x38bdf8, 0.95);
        this.skillAimGfx.lineBetween(startX, startY, endX, endY);
        this.skillAimGfx.strokeCircle(endX, endY, 30);
        return;
      } else if (slot === 's2') {
        this.skillAimGfx.lineStyle(3, isCancelled ? 0xef4444 : 0x60a5fa, 0.85);
        this.skillAimGfx.strokeCircle(startX, startY, 90);
        this.skillAimGfx.fillStyle(isCancelled ? 0xef4444 : 0x3b82f6, 0.2);
        this.skillAimGfx.fillCircle(startX, startY, 90);
        return;
      } else {
        const facingAngle = Math.atan2(dirY, dirX);
        this.skillAimGfx.lineStyle(6, isCancelled ? 0xef4444 : 0x38bdf8, 0.85);
        this.skillAimGfx.beginPath();
        this.skillAimGfx.arc(startX, startY, 65, facingAngle - 0.75, facingAngle + 0.75, false);
        this.skillAimGfx.strokePath();
        return;
      }
    }

    // 7. Bjorn / Fallback
    if (slot === 's1') {
      const range = 220;
      const endX = startX + dirX * range;
      const endY = startY + dirY * range;
      this.skillAimGfx.lineStyle(8, isCancelled ? 0xef4444 : 0xb45309, 0.4);
      this.skillAimGfx.lineBetween(startX, startY, endX, endY);
      this.skillAimGfx.lineStyle(3, isCancelled ? 0xfca5a5 : 0xfcd34d, 0.95);
      this.skillAimGfx.lineBetween(startX, startY, endX, endY);
      this.skillAimGfx.strokeCircle(endX, endY, 28);
    } else if (slot === 's2') {
      const range = 230;
      const endX = startX + dirX * range;
      const endY = startY + dirY * range;
      this.skillAimGfx.lineStyle(7, isCancelled ? 0xef4444 : 0xf97316, 0.4);
      this.skillAimGfx.lineBetween(startX, startY, endX, endY);
      this.skillAimGfx.strokeCircle(endX, endY, 28);
    } else {
      this.skillAimGfx.lineStyle(3, isCancelled ? 0xef4444 : 0x84cc16, 0.85);
      this.skillAimGfx.strokeCircle(startX, startY, 95);
      this.skillAimGfx.fillStyle(isCancelled ? 0xef4444 : 0x84cc16, 0.2);
      this.skillAimGfx.fillCircle(startX, startY, 95);
    }
  }

  public getMovementVector(): Phaser.Math.Vector2 {
    let vx = 0;
    let vy = 0;

    if (this.cursors) {
      if (this.cursors.left?.isDown || (this.keys?.A && this.keys.A.isDown)) vx = -1;
      else if (this.cursors.right?.isDown || (this.keys?.D && this.keys.D.isDown)) vx = 1;

      if (this.cursors.up?.isDown || (this.keys?.W && this.keys.W.isDown)) vy = -1;
      else if (this.cursors.down?.isDown || (this.keys?.S && this.keys.S.isDown)) vy = 1;
    }

    if (vx !== 0 || vy !== 0) {
      const len = Math.hypot(vx, vy);
      return new Phaser.Math.Vector2(vx / len, vy / len);
    }

    return this.moveJoystick.getVector();
  }

  public updateCooldowns(cds: { s1: number; s2: number; ult: number }, cdMax: { s1: number; s2: number; ult: number }) {
    this.skill1Btn.setCooldown(cds.s1, cdMax.s1);
    this.skill2Btn.setCooldown(cds.s2, cdMax.s2);
    this.ultBtn.setCooldown(cds.ult, cdMax.ult);
  }

  public reposition() {
    const w = this.scene.cameras.main.width;
    const h = this.scene.cameras.main.height;
    const layout = getCustomControlsLayout();

    const joyScale = getIndividualButtonScale('joystick');
    const attackScale = getIndividualButtonScale('attack');
    const s1Scale = getIndividualButtonScale('s1');
    const s2Scale = getIndividualButtonScale('s2');
    const ultScale = getIndividualButtonScale('ult');
    const cancelScale = getIndividualButtonScale('cancel');

    this.moveJoystick.setPosition(layout.joystick.x * w, layout.joystick.y * h);
    this.moveJoystick.setScale(joyScale);

    this.aimJoystick.setPosition(layout.attack.x * w, layout.attack.y * h);
    this.aimJoystick.setScale(attackScale);

    this.skill1Btn.setPosition(layout.s1.x * w, layout.s1.y * h);
    this.skill1Btn.setScale(s1Scale);

    this.skill2Btn.setPosition(layout.s2.x * w, layout.s2.y * h);
    this.skill2Btn.setScale(s2Scale);

    this.ultBtn.setPosition(layout.ult.x * w, layout.ult.y * h);
    this.ultBtn.setScale(ultScale);

    const cancelX = (layout.cancel ? layout.cancel.x : DEFAULT_CONTROLS_LAYOUT.cancel.x) * w;
    const cancelY = (layout.cancel ? layout.cancel.y : DEFAULT_CONTROLS_LAYOUT.cancel.y) * h;
    this.cancelZoneContainer.setPosition(cancelX, cancelY);
    this.cancelZoneContainer.setScale(cancelScale);
  }

  public destroy() {
    this.moveJoystick.destroy();
    this.aimJoystick.destroy();
    this.skill1Btn.destroy();
    this.skill2Btn.destroy();
    this.ultBtn.destroy();
    this.cancelZoneContainer.destroy();
    this.aimLineGfx.destroy();
    this.skillAimGfx.destroy();
  }
}

