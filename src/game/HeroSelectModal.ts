/**
 * Frantic Battles - Canonical Roster Hero Selection & Upgrade Modal (HeroSelectModal.ts)
 * 3-Column Pixel Art Layout matching the visual style of Settings/Pause and Arena Shop:
 * - Left Column (25%): 7 Canonical Heroes Roster with smooth inertia scrolling.
 * - Center Column (45%): Animated Hero Showcase Sprite (aspect-ratio preserved), Rarity Badge, Level-Up Progress Bar, & Purchase/Select Buttons.
 * - Right Column (30%): HP/Dmg Stat Bars, level-up buttons, 3 active skill cards with real textures & passive ability box.
 * 
 * STRICTLY complies with bans: NO external PNGs, 100% round coordinate alignments,
 * resolution: 2 for text, and guaranteed close button visibility.
 */

import Phaser from 'phaser';
import { HEROES, HeroData } from './players';
import {
  CANONICAL_ROSTER,
  loadRoster,
  loadEconomy,
  levelUpHero,
  buyHeroFromShop,
  getHeroUpgradeCost,
  getHeroStatMultipliers
} from './economy';
import { soundEngine } from './audio';
import { saveUserDataToCloud } from './firebase';

export interface HeroSelectCallbacks {
  onHeroSelected?: (heroKey: string) => void;
  onClose?: () => void;
}

export class HeroSelectModal {
  private scene: Phaser.Scene;
  private callbacks: HeroSelectCallbacks;
  private elements: Phaser.GameObjects.GameObject[] = [];
  private selectedHeroId: string = 'char_zaza';
  private currentActiveHeroId: string = 'char_zaza';
  private messageText: Phaser.GameObjects.Text | null = null;
  private balanceSkullsText!: Phaser.GameObjects.Text;
  private balanceShardsText!: Phaser.GameObjects.Text;
  private balancePointsText!: Phaser.GameObjects.Text;
  private isClosing = false;
  private wheelListener: any = null;

  // Smooth Scroller Fields
  private targetScrollY = 0;
  private listViewportY = 0;
  private listViewportH = 345;
  private totalListHeight = 0;
  private minScrollY = 0;
  private scrollbarTrack: Phaser.GameObjects.Rectangle | null = null;
  private scrollbarThumb: Phaser.GameObjects.Rectangle | null = null;
  private rosterListContainer: Phaser.GameObjects.Container | null = null;
  private thumbH = 30;

  // Layout Dimensions
  private cx!: number;
  private cy!: number;
  private modalW = 820; // Exact compact width to fit inside smaller windows
  private modalH = 460; // Exact compact height to guarantee Close [✕] visibility
  private startX!: number;
  private startY!: number;

  constructor(scene: Phaser.Scene, callbacks: HeroSelectCallbacks = {}) {
    this.scene = scene;
    this.callbacks = callbacks;

    const saved = localStorage.getItem('fb_current_hero') || 'char_zaza';
    this.currentActiveHeroId = saved;
    this.selectedHeroId = saved;

    this.buildUI();

    // Register update loop for smooth lerp scroll
    this.scene.events.on('update', this.updateScrollLerp, this);
  }

  private buildUI() {
    // Clear any existing elements
    this.elements.forEach(el => {
      if (el && el.active) el.destroy();
    });
    this.elements = [];

    if (this.wheelListener) {
      this.scene.input.off('wheel', this.wheelListener);
      this.wheelListener = null;
    }

    this.modalW = Math.round(Math.min(860, this.scene.scale.width - 40));
    this.modalH = Math.round(Math.min(500, this.scene.scale.height - 40));
    const w = this.scene.cameras.main.width;
    const h = this.scene.cameras.main.height;
    this.cx = Math.round(w / 2);
    this.cy = Math.round(h / 2);
    this.startX = Math.round(this.cx - this.modalW / 2);
    this.startY = Math.round(this.cy - this.modalH / 2);

    // 1. Fullscreen Dim Backdrop (depth 3000)
    const backdrop = this.scene.add.rectangle(this.cx, this.cy, w * 4, h * 4, 0x000000, 0.85)
      .setScrollFactor(0)
      .setDepth(3000)
      .setInteractive();
    backdrop.on('pointerdown', (p: unknown, lx: unknown, ly: unknown, ev: { stopPropagation: () => void }) => {
      if (ev && typeof ev.stopPropagation === 'function') ev.stopPropagation();
    });
    this.elements.push(backdrop);

    // 2. Window Frame: Exact matching Style & Color of the Settings/Pause menu (0x18201a with 0xfacc15 border!)
    const cardBg = this.scene.add.rectangle(this.cx, this.cy, this.modalW, this.modalH, 0x18201a)
      .setScrollFactor(0).setDepth(3001);
    const cardInner = this.scene.add.rectangle(this.cx, this.cy, this.modalW - 8, this.modalH - 8, 0x0c120f)
      .setScrollFactor(0).setDepth(3002);
    // Double pixel neat border: Outer 3px gold & Inner 1.5px dark forest green
    const cardBorderOuter = this.scene.add.rectangle(this.cx, this.cy, this.modalW, this.modalH)
      .setStrokeStyle(3, 0xfacc15, 1.0).setScrollFactor(0).setDepth(3003);
    const cardBorderInner = this.scene.add.rectangle(this.cx, this.cy, this.modalW - 12, this.modalH - 12)
      .setStrokeStyle(1.5, 0x14532d, 1.0).setScrollFactor(0).setDepth(3003);
    this.elements.push(cardBg, cardInner, cardBorderOuter, cardBorderInner);

    // 3. Header Title & Close [✕] Button with monospace font & resolution: 2
    const titleTxtY = Math.round(this.startY + 22);
    const headerTitle = this.scene.add.text(Math.round(this.startX + 22), titleTxtY, '✦ ВЫБОР И ПРОКАЧКА БОЙЦА ✦', {
      fontSize: '14px',
      fontFamily: 'Consolas, "Lucida Console", Monaco, monospace',
      fontStyle: 'bold',
      color: '#facc15',
      resolution: 2
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(3005);

    // 4. Close Button [ ✕ ] on top-right (Depth 5000, large hitArea)
    const closeBtnX = Math.round(this.startX + this.modalW - 35);
    const closeBtnY = Math.round(this.startY + 25);
    const closeBtn = this.scene.add.text(closeBtnX, closeBtnY, '[ ✕ ]', {
      fontSize: '13px',
      fontFamily: 'Consolas, "Lucida Console", Monaco, monospace',
      fontStyle: 'bold',
      color: '#ef4444',
      resolution: 2
    }).setOrigin(1, 0.5)
      .setScrollFactor(0)
      .setDepth(5000)
      .setInteractive({
        useHandCursor: true,
        hitArea: new Phaser.Geom.Rectangle(-15, -15, 45, 36),
        hitAreaCallback: Phaser.Geom.Rectangle.Contains
      });

    closeBtn.on('pointerover', () => closeBtn.setColor('#fca5a5'));
    closeBtn.on('pointerout', () => closeBtn.setColor('#ef4444'));
    closeBtn.on('pointerdown', (p: Phaser.Input.Pointer, _x: number, _y: number, ev: { stopPropagation: () => void }) => {
      if (ev && typeof ev.stopPropagation === 'function') ev.stopPropagation();
      soundEngine.playClick();
      this.close();
    });

    this.elements.push(headerTitle, closeBtn);

    // 5. Player balances aligned relative to close button
    const econ = loadEconomy();
    // Section 3: Upgrade Points
    const balX3 = Math.round(this.startX + this.modalW - 145);
    const pointsIcon = this.scene.add.image(balX3, titleTxtY, 'icon_upgrade')
      .setDisplaySize(18, 18).setScrollFactor(0).setDepth(3005);
    this.balancePointsText = this.scene.add.text(balX3 + 12, titleTxtY, `${econ.upgradePoints}`, {
      fontSize: '12px',
      fontFamily: 'Consolas, "Lucida Console", Monaco, monospace',
      fontStyle: 'bold',
      color: '#ffffff',
      resolution: 2
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(3005);

    // Section 2: Shards
    const balX2 = Math.round(this.startX + this.modalW - 235);
    const shardIcon = this.scene.add.image(balX2, titleTxtY, 'icon_shard')
      .setDisplaySize(18, 18).setScrollFactor(0).setDepth(3005);
    this.balanceShardsText = this.scene.add.text(balX2 + 12, titleTxtY, `${econ.voidShards}`, {
      fontSize: '12px',
      fontFamily: 'Consolas, "Lucida Console", Monaco, monospace',
      fontStyle: 'bold',
      color: '#ffffff',
      resolution: 2
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(3005);

    // Section 1: Skulls
    const balX1 = Math.round(this.startX + this.modalW - 325);
    const skullIcon = this.scene.add.image(balX1, titleTxtY, 'icon_skull')
      .setDisplaySize(18, 18).setScrollFactor(0).setDepth(3005);
    this.balanceSkullsText = this.scene.add.text(balX1 + 12, titleTxtY, `${econ.rustySkulls}`, {
      fontSize: '12px',
      fontFamily: 'Consolas, "Lucida Console", Monaco, monospace',
      fontStyle: 'bold',
      color: '#ffffff',
      resolution: 2
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(3005);

    this.elements.push(
      skullIcon, this.balanceSkullsText,
      shardIcon, this.balanceShardsText,
      pointsIcon, this.balancePointsText
    );

    // Status Message Text banner (top center)
    this.messageText = this.scene.add.text(this.cx, Math.round(this.startY + 44), '', {
      fontSize: '11px',
      fontFamily: 'Consolas, "Lucida Console", Monaco, monospace',
      fontStyle: 'bold',
      color: '#4ade80',
      resolution: 2
    }).setOrigin(0.5).setScrollFactor(0).setDepth(3006);
    this.elements.push(this.messageText);

    // =========================================================================
    // COLUMN 1: LEFT — 7 Canonical Heroes Roster with Lerped Scrolling & Mask
    // =========================================================================
    const col1W = 210;
    const col1X = Math.round(this.startX + 16 + col1W / 2);
    const topY = Math.round(this.startY + 56);

    const col1Title = this.scene.add.text(col1X, topY, '👥 РОСТЕР (7 ГЕРОЕВ)', {
      fontSize: '11px',
      fontFamily: 'Consolas, "Lucida Console", Monaco, monospace',
      fontStyle: 'bold',
      color: '#38bdf8',
      resolution: 2
    }).setOrigin(0.5).setScrollFactor(0).setDepth(3005);
    this.elements.push(col1Title);

    const rosterList = [
      'char_grim',
      'char_bjorn',
      'char_torf',
      'char_alrik',
      'char_kraul',
      'char_zaza',
      'char_omen',
      'char_nihil'
    ];

    const rosterState = loadRoster();
    const itemH = 46;
    const itemSpacing = itemH + 6;
    this.listViewportY = Math.round(topY + 14);
    this.listViewportH = 345;
    this.totalListHeight = rosterList.length * itemSpacing - 6;

    // Viewport Clipping Mask (Geometry Mask)
    const maskGraphics = this.scene.make.graphics({ x: 0, y: 0 }, false);
    maskGraphics.fillStyle(0xffffff, 1.0);
    maskGraphics.fillRect(
      Math.round(col1X - col1W / 2),
      Math.round(this.listViewportY),
      Math.round(col1W),
      Math.round(this.listViewportH)
    );
    const mask = maskGraphics.createGeometryMask();
    this.elements.push(maskGraphics);

    // Smooth Scroller container
    this.rosterListContainer = this.scene.add.container(Math.round(col1X), Math.round(this.listViewportY))
      .setScrollFactor(0)
      .setDepth(3004);
    this.rosterListContainer.setMask(mask);
    this.elements.push(this.rosterListContainer);

    this.minScrollY = Math.min(0, this.listViewportH - this.totalListHeight);

    // Populate Roster List inside container
    rosterList.forEach((heroId, idx) => {
      const iy = idx * itemSpacing + itemH / 2;

      const config = CANONICAL_ROSTER[heroId];
      const state = rosterState[heroId] || { unlocked: false, level: 1 };
      const isSelected = heroId === this.selectedHeroId;
      const isActive = heroId === this.currentActiveHeroId;

      // Color border based on rarity & selection
      let borderColor = 0x475569;
      if (config.rarity === 'РЕДКИЙ') borderColor = 0x38bdf8;
      else if (config.rarity === 'ЭПИЧЕСКИЙ') borderColor = 0xc084fc;
      else if (config.rarity === 'МИФИЧЕСКИЙ') borderColor = 0xef4444;

      if (isSelected) borderColor = 0xfacc15;

      const cardContainer = this.scene.add.container(0, iy).setDepth(3004);

      const cardBg = this.scene.add.rectangle(0, 0, col1W - 8, itemH, isSelected ? 0x1e293b : 0x0f172a)
        .setStrokeStyle(isSelected ? 2.5 : 1.5, borderColor)
        .setScrollFactor(0).setDepth(3004);

      // Portrait / Avatar (36x36)
      const pKey = HEROES[heroId]?.texture || 'char_zaza';
      let avatarImg: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
      if (this.scene.textures.exists(pKey)) {
        avatarImg = this.scene.add.image(Math.round(-col1W / 2 + 24), 0, pKey).setDisplaySize(32, 32);
      } else {
        avatarImg = this.scene.add.rectangle(Math.round(-col1W / 2 + 24), 0, 32, 32, 0x334155);
      }
      avatarImg.setScrollFactor(0).setDepth(3005);

      // Hero Short Name & Level
      const displayName = HEROES[heroId]?.name.split(' ')[0] || config.name.split(' ')[0];
      const nameTxt = this.scene.add.text(Math.round(-col1W / 2 + 46), -9, displayName, {
        fontSize: '11.5px',
        fontFamily: 'Consolas, "Lucida Console", Monaco, monospace',
        fontStyle: 'bold',
        color: isSelected ? '#facc15' : '#ffffff',
        resolution: 2
      }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(3005);

      const statusTxt = this.scene.add.text(
        Math.round(-col1W / 2 + 46),
        7,
        state.unlocked ? `Ур. ${state.level}` : `🔒 ${config.costSkulls} 💀`,
        {
          fontSize: '9.5px',
          fontFamily: 'Consolas, "Lucida Console", Monaco, monospace',
          color: state.unlocked ? '#4ade80' : '#ef4444',
          resolution: 2
        }
      ).setOrigin(0, 0.5).setScrollFactor(0).setDepth(3005);

      // Active Indicator Badge
      let activeBadge: Phaser.GameObjects.Text | null = null;
      if (isActive) {
        activeBadge = this.scene.add.text(Math.round(col1W / 2 - 14), 0, '★', {
          fontSize: '12px',
          fontFamily: 'Consolas, "Lucida Console", Monaco, monospace',
          color: '#facc15',
          resolution: 2
        }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(3006);
      }

      // Lock Overlay if not unlocked
      if (!state.unlocked) {
        cardBg.setAlpha(0.65);
      }

      cardContainer.add([cardBg, avatarImg, nameTxt, statusTxt]);
      if (activeBadge) cardContainer.add(activeBadge);

      this.addButtonAnimations(cardBg, 1.0);

      cardBg.on('pointerdown', (p: Phaser.Input.Pointer, _x: number, _y: number, ev: { stopPropagation: () => void }) => {
        if (ev && typeof ev.stopPropagation === 'function') ev.stopPropagation();
        
        // Block clicks if scrolled out of viewport
        const absoluteY = this.rosterListContainer!.y + iy;
        if (absoluteY < this.listViewportY || absoluteY > this.listViewportY + this.listViewportH) {
          return;
        }

        soundEngine.playClick();
        this.selectedHeroId = heroId;
        this.buildUI();
      });

      this.rosterListContainer!.add(cardContainer);
    });

    // Visual Scrollbar track
    const scrollbarTrack = this.scene.add.rectangle(col1X + col1W / 2 + 4, this.listViewportY + this.listViewportH / 2, 3, this.listViewportH, 0x1e293b)
      .setScrollFactor(0).setDepth(3005);
    this.elements.push(scrollbarTrack);

    // Scrollbar thumb size
    this.thumbH = Math.max(24, Math.round((this.listViewportH / this.totalListHeight) * this.listViewportH));
    this.scrollbarThumb = this.scene.add.rectangle(col1X + col1W / 2 + 4, this.listViewportY, 3, this.thumbH, 0xfacc15)
      .setScrollFactor(0).setDepth(3006).setOrigin(0.5, 0);
    this.elements.push(this.scrollbarThumb);

    const triggerScroll = (deltaY: number) => {
      this.targetScrollY = Phaser.Math.Clamp(this.targetScrollY - deltaY, this.minScrollY, 0);
    };

    // Scroll interaction zone over Left column viewport
    const scrollZone = this.scene.add.rectangle(col1X, this.listViewportY + this.listViewportH / 2, col1W + 12, this.listViewportH, 0x000000, 0)
      .setScrollFactor(0).setDepth(3003).setInteractive({ useHandCursor: false });
    this.elements.push(scrollZone);

    // Swipe/Touch gesture support
    let isDragging = false;
    let startDragY = 0;
    let startScrollY = 0;

    scrollZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      isDragging = true;
      startDragY = pointer.y;
      startScrollY = this.targetScrollY;
    });

    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (isDragging) {
        const diff = pointer.y - startDragY;
        this.targetScrollY = Phaser.Math.Clamp(startScrollY + diff, this.minScrollY, 0);
      }
    });

    this.scene.input.on('pointerup', () => {
      isDragging = false;
    });

    // Mouse wheel scrolling
    this.wheelListener = (_pointer: unknown, _gameObjects: unknown, _deltaX: number, deltaY: number) => {
      if (this.isClosing) return;
      const p = this.scene.input.activePointer;
      if (p.x >= col1X - col1W / 2 - 20 && p.x <= col1X + col1W / 2 + 20) {
        triggerScroll(deltaY * 0.45);
      }
    };
    this.scene.input.on('wheel', this.wheelListener);

    // =========================================================================
    // COLUMN 2: CENTER — Hero Showcase with dynamic live animations
    // =========================================================================
    const col2W = 340;
    const col2X = Math.round(this.startX + 16 + col1W + 16 + col2W / 2);

    const currentCanonConfig = CANONICAL_ROSTER[this.selectedHeroId];
    const currentHeroData = HEROES[this.selectedHeroId];
    const currentRosterState = rosterState[this.selectedHeroId] || { unlocked: false, level: 1 };

    let rarityColorHex = currentCanonConfig.colorHex || '#cbd5e1';

    // Title & Rarity Badge
    const heroTitle = this.scene.add.text(col2X, Math.round(topY - 6), currentHeroData.name.toUpperCase(), {
      fontSize: '15px',
      fontFamily: 'Consolas, "Lucida Console", Monaco, monospace',
      fontStyle: 'bold',
      color: rarityColorHex,
      resolution: 2
    }).setOrigin(0.5).setScrollFactor(0).setDepth(3005);

    const rarityBadgeBg = this.scene.add.rectangle(col2X, Math.round(topY + 14), 100, 15, 0x1e293b)
      .setStrokeStyle(1, Phaser.Display.Color.HexStringToColor(rarityColorHex).color)
      .setScrollFactor(0).setDepth(3004);

    const rarityBadgeTxt = this.scene.add.text(col2X, Math.round(topY + 14), currentCanonConfig.rarity, {
      fontSize: '9px',
      fontFamily: 'Consolas, "Lucida Console", Monaco, monospace',
      fontStyle: 'bold',
      color: rarityColorHex,
      resolution: 2
    }).setOrigin(0.5).setScrollFactor(0).setDepth(3005);

    this.elements.push(heroTitle, rarityBadgeBg, rarityBadgeTxt);

    // Pedestal & Hero Model entry transition
    const avatarCy = Math.round(topY + 100);
    const pedestal = this.scene.add.ellipse(col2X, Math.round(avatarCy + 42), 100, 24, 0x1e3a8a, 0.7)
      .setStrokeStyle(2, 0x38bdf8)
      .setScrollFactor(0).setDepth(3004);

    const pTex = currentHeroData.texture || 'char_zaza';
    this.ensureHeroIdleAnimation(this.selectedHeroId);
    const heroShowcaseSprite = this.scene.add.sprite(col2X, avatarCy, pTex)
      .setScrollFactor(0).setDepth(3005);
    heroShowcaseSprite.play(`${this.selectedHeroId}_idle`);

    // NORMALIZATION OF HERO SCALE: Calculate aspect ratio dynamically so all 7 fighters
    // on the pedestal have the exact same physical height (105px) without stretch bugs!
    const targetHeight = 105;
    const nativeWidth = heroShowcaseSprite.width || 48;
    const nativeHeight = heroShowcaseSprite.height || 56;
    const ratio = nativeWidth / nativeHeight;
    heroShowcaseSprite.setDisplaySize(Math.round(targetHeight * ratio), targetHeight);

    // Juicy entry transition
    heroShowcaseSprite.setAlpha(0);
    this.scene.tweens.add({
      targets: heroShowcaseSprite,
      alpha: 1,
      duration: 180,
      ease: 'Sine.easeOut'
    });

    // Cartoon Squash, Stretch, and Bouncy Hop Animation Sequence
    const initialW = Math.round(targetHeight * ratio);
    const initialH = targetHeight;

    const playCartoonBouncyLoop = () => {
      if (!heroShowcaseSprite || !heroShowcaseSprite.active) return;

      // Stage 1: Gentle Squash Down (wind-up)
      this.scene.tweens.add({
        targets: heroShowcaseSprite,
        displayWidth: initialW * 1.14,
        displayHeight: initialH * 0.84,
        y: avatarCy + 5,
        duration: 220,
        ease: 'Quad.easeInOut',
        onComplete: () => {
          if (!heroShowcaseSprite || !heroShowcaseSprite.active) return;

          // Stage 2: Stretch Up and Quick Jump
          this.scene.tweens.add({
            targets: heroShowcaseSprite,
            displayWidth: initialW * 0.92,
            displayHeight: initialH * 1.12,
            y: avatarCy - 15,
            duration: 260,
            ease: 'Cubic.easeOut',
            onComplete: () => {
              if (!heroShowcaseSprite || !heroShowcaseSprite.active) return;

              // Stage 3: Smooth Land & Impact Squash
              this.scene.tweens.add({
                targets: heroShowcaseSprite,
                displayWidth: initialW * 1.12,
                displayHeight: initialH * 0.86,
                y: avatarCy + 4,
                duration: 160,
                ease: 'Quad.easeIn',
                onComplete: () => {
                  if (!heroShowcaseSprite || !heroShowcaseSprite.active) return;

                  // Stage 4: Elastic Rebound to normal shape
                  this.scene.tweens.add({
                    targets: heroShowcaseSprite,
                    displayWidth: initialW,
                    displayHeight: initialH,
                    y: avatarCy,
                    duration: 180,
                    ease: 'Back.easeOut',
                    onComplete: () => {
                      // Stage 5: Pause / breath before next playful bounce
                      if (!heroShowcaseSprite || !heroShowcaseSprite.active) return;
                      this.scene.time.delayedCall(700, playCartoonBouncyLoop);
                    }
                  });
                }
              });
            }
          });
        }
      });
    };

    playCartoonBouncyLoop();

    this.elements.push(pedestal, heroShowcaseSprite);

    // Lock icon overlay
    if (!currentRosterState.unlocked) {
      const lockOverlay = this.scene.add.rectangle(col2X, avatarCy, 80, 80, 0x000000, 0.5)
        .setScrollFactor(0).setDepth(3006);
      const lockIcon = this.scene.add.text(col2X, avatarCy, '🔒', {
        fontSize: '28px',
        resolution: 2
      }).setOrigin(0.5).setScrollFactor(0).setDepth(3007);
      this.elements.push(lockOverlay, lockIcon);
    }

    // Hero Level Title & Progress Bar
    const lvlBarY = Math.round(avatarCy + 65);
    const lvlText = this.scene.add.text(col2X, Math.round(lvlBarY - 12), `УРОВЕНЬ БОЙЦА: ${currentRosterState.level} / 10`, {
      fontSize: '11px',
      fontFamily: 'Consolas, "Lucida Console", Monaco, monospace',
      fontStyle: 'bold',
      color: '#ffffff',
      resolution: 2
    }).setOrigin(0.5).setScrollFactor(0).setDepth(3005);

    const barW = col2W - 60;
    const barH = 10;
    const lvlBarBg = this.scene.add.rectangle(col2X, Math.round(lvlBarY + 5), barW, barH, 0x1e293b)
      .setStrokeStyle(1.5, 0x475569).setScrollFactor(0).setDepth(3004);

    const levelRatio = currentRosterState.level / 10;
    const fillW = Math.max(4, barW * levelRatio);
    const lvlBarFill = this.scene.add.rectangle(col2X - barW / 2 + fillW / 2, Math.round(lvlBarY + 5), fillW, barH - 2, 0x22c55e)
      .setScrollFactor(0).setDepth(3005);

    const bonusTxt = this.scene.add.text(col2X, Math.round(lvlBarY + 20), `Бонус характеристик: +${Math.round((getHeroStatMultipliers(currentRosterState.level).hpMult - 1) * 100)}% ОЗ / ОУ`, {
      fontSize: '9.5px',
      fontFamily: 'Consolas, "Lucida Console", Monaco, monospace',
      color: '#86efac',
      resolution: 2
    }).setOrigin(0.5).setScrollFactor(0).setDepth(3005);

    this.elements.push(lvlText, lvlBarBg, lvlBarFill, bonusTxt);

    // Center Action Button block (20px bottom offset limit)
    const actionY = Math.round(this.startY + 412);

    if (currentRosterState.unlocked) {
      // --- SELECT HERO FOR COMBAT ---
      const isAlreadyActive = this.selectedHeroId === this.currentActiveHeroId;
      const selectBtnW = col2W - 30;

      const selectBtnBg = this.scene.add.rectangle(
        col2X,
        actionY,
        selectBtnW,
        34,
        isAlreadyActive ? 0x15803d : 0xd97706
      ).setStrokeStyle(2, isAlreadyActive ? 0x86efac : 0xfde68a)
        .setScrollFactor(0).setDepth(3005);

      const selectBtnTxt = this.scene.add.text(
        col2X,
        actionY,
        isAlreadyActive ? '▶ БОЕЦ ВЫБРАН В ОТРЯД ✓' : '⚔️ ВЫБРАТЬ В БОЙ',
        {
          fontSize: '11px',
          fontFamily: 'Consolas, "Lucida Console", Monaco, monospace',
          fontStyle: 'bold',
          color: '#ffffff',
          resolution: 2
        }
      ).setOrigin(0.5).setScrollFactor(0).setDepth(3006);

      this.addButtonAnimations(selectBtnBg, 1.0);

      selectBtnBg.on('pointerdown', async () => {
        if (isAlreadyActive) return;
        soundEngine.playLevelUp();
        this.currentActiveHeroId = this.selectedHeroId;
        localStorage.setItem('fb_current_hero', this.selectedHeroId);
        window.dispatchEvent(new CustomEvent('hero_selected', { detail: { heroKey: this.selectedHeroId } }));
        if (this.callbacks.onHeroSelected) {
          this.callbacks.onHeroSelected(this.selectedHeroId);
        }
        this.showMessage(`⚔️ ${currentHeroData.name} готов к битве!`, '#facc15');
        
        try { await saveUserDataToCloud(); } catch (e) {}
        this.buildUI();
      });

      this.elements.push(selectBtnBg, selectBtnTxt);
    } else {
      // --- LOCKED ACTIONS (SKULLS / SHARDS BUY) ---
      const buyBtnW = Math.floor(col2W / 2 - 8);

      // Skulls cost
      const costSkulls = currentCanonConfig.costSkulls;
      const canAffordSkulls = econ.rustySkulls >= costSkulls;

      const buySkullsBg = this.scene.add.rectangle(
        col2X - buyBtnW / 2 - 4,
        actionY,
        buyBtnW,
        34,
        canAffordSkulls ? 0xb45309 : 0x1f2937
      ).setStrokeStyle(1.5, canAffordSkulls ? 0xfacc15 : 0x475569)
        .setScrollFactor(0).setDepth(3005);

      const buySkullsTxt = this.scene.add.text(
        col2X - buyBtnW / 2 - 4,
        actionY,
        `🔓 ${costSkulls} 💀`,
        {
          fontSize: '10px',
          fontFamily: 'Consolas, "Lucida Console", Monaco, monospace',
          fontStyle: 'bold',
          color: '#ffffff',
          resolution: 2
        }
      ).setOrigin(0.5).setScrollFactor(0).setDepth(3006);

      this.addButtonAnimations(buySkullsBg, 1.0);

      buySkullsBg.on('pointerdown', async () => {
        soundEngine.playClick();
        const res = buyHeroFromShop(this.selectedHeroId, 'skulls');
        if (res.success) {
          soundEngine.playLevelUp();
          this.showMessage(`🎉 ${res.message}`, '#4ade80');
          try { await saveUserDataToCloud(); } catch (e) {}
          this.buildUI();
        } else {
          this.showMessage(`⚠ ${res.message}`, '#ef4444');
        }
      });

      // Shards cost
      const costShards = currentCanonConfig.costShards;
      const canAffordShards = econ.voidShards >= costShards;

      const buyShardsBg = this.scene.add.rectangle(
        col2X + buyBtnW / 2 + 4,
        actionY,
        buyBtnW,
        34,
        canAffordShards ? 0x6b21a8 : 0x1f2937
      ).setStrokeStyle(1.5, canAffordShards ? 0xc084fc : 0x475569)
        .setScrollFactor(0).setDepth(3005);

      const buyShardsTxt = this.scene.add.text(
        col2X + buyBtnW / 2 + 4,
        actionY,
        `💎 ${costShards} 🔮`,
        {
          fontSize: '10px',
          fontFamily: 'Consolas, "Lucida Console", Monaco, monospace',
          fontStyle: 'bold',
          color: '#ffffff',
          resolution: 2
        }
      ).setOrigin(0.5).setScrollFactor(0).setDepth(3006);

      this.addButtonAnimations(buyShardsBg, 1.0);

      buyShardsBg.on('pointerdown', async () => {
        soundEngine.playClick();
        const res = buyHeroFromShop(this.selectedHeroId, 'shards');
        if (res.success) {
          soundEngine.playLevelUp();
          this.showMessage(`🎉 ${res.message}`, '#4ade80');
          try { await saveUserDataToCloud(); } catch (e) {}
          this.buildUI();
        } else {
          this.showMessage(`⚠ ${res.message}`, '#ef4444');
        }
      });

      this.elements.push(buySkullsBg, buySkullsTxt, buyShardsBg, buyShardsTxt);
    }

    // =========================================================================
    // COLUMN 3: RIGHT — Stats & 3 beautifully aligned Skill Cards + Passive
    // =========================================================================
    const col3W = 220;
    const col3X = Math.round(this.startX + 16 + col1W + 16 + col2W + 16);
    const col3CenterX = Math.round(col3X + col3W / 2);

    const col3Title = this.scene.add.text(col3CenterX, topY, '⚡ ХАРАКТЕРИСТИКИ', {
      fontSize: '11px',
      fontFamily: 'Consolas, "Lucida Console", Monaco, monospace',
      fontStyle: 'bold',
      color: '#facc15',
      resolution: 2
    }).setOrigin(0.5).setScrollFactor(0).setDepth(3005);
    this.elements.push(col3Title);

    // Stat Block (HP / Damage)
    const barHP_Y = Math.round(this.startY + 76);
    const barDMG_Y = Math.round(this.startY + 94);
    const maxHpRef = 1600;

    // HP Bar
    const hpPct = Math.min(100, Math.round((currentHeroData.hp / maxHpRef) * 100));
    const targetHpWidth = (col3W - 100) * hpPct / 100;
    const hpBarBg = this.scene.add.rectangle(col3CenterX + 35, barHP_Y, col3W - 100, 6, 0x1e293b)
      .setStrokeStyle(1, 0x475569).setScrollFactor(0).setDepth(3004);
    const hpBarFill = this.scene.add.rectangle(
      col3CenterX + 35 - (col3W - 100) / 2,
      barHP_Y,
      0,
      4,
      0x22c55e
    ).setOrigin(0, 0.5).setScrollFactor(0).setDepth(3005);
    this.scene.tweens.add({
      targets: hpBarFill,
      width: targetHpWidth,
      duration: 400,
      ease: 'Cubic.easeOut'
    });

    const hpLabel = this.scene.add.text(col3X + 4, barHP_Y, `Здоровье ${hpPct}%`, {
      fontSize: '9.5px',
      fontFamily: 'Consolas, "Lucida Console", Monaco, monospace',
      fontStyle: 'bold',
      color: '#22c55e',
      resolution: 2
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(3005);
    this.elements.push(hpBarBg, hpBarFill, hpLabel);

    // Damage Bar
    const dmgPct = Math.min(100, Math.round((currentHeroData.hp / maxHpRef) * 90));
    const targetDmgWidth = (col3W - 100) * dmgPct / 100;
    const dmgBarBg = this.scene.add.rectangle(col3CenterX + 35, barDMG_Y, col3W - 100, 6, 0x1e293b)
      .setStrokeStyle(1, 0x475569).setScrollFactor(0).setDepth(3004);
    const dmgBarFill = this.scene.add.rectangle(
      col3CenterX + 35 - (col3W - 100) / 2,
      barDMG_Y,
      0,
      4,
      0xef4444
    ).setOrigin(0, 0.5).setScrollFactor(0).setDepth(3005);
    this.scene.tweens.add({
      targets: dmgBarFill,
      width: targetDmgWidth,
      duration: 400,
      ease: 'Cubic.easeOut'
    });

    const dmgLabel = this.scene.add.text(col3X + 4, barDMG_Y, `Урон ${dmgPct}%`, {
      fontSize: '9.5px',
      fontFamily: 'Consolas, "Lucida Console", Monaco, monospace',
      fontStyle: 'bold',
      color: '#ef4444',
      resolution: 2
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(3005);
    this.elements.push(dmgBarBg, dmgBarFill, dmgLabel);

    // [ ПРОКАЧАТЬ УРОВЕНЬ ] Button directly underneath the stat bars
    const upBtnY = Math.round(this.startY + 120);
    const canLevelUpRight = currentRosterState.unlocked && currentRosterState.level < 10;
    const upgradeCostVal = getHeroUpgradeCost(currentRosterState.level);

    const upBtnBg = this.scene.add.rectangle(
      col3CenterX,
      upBtnY,
      col3W - 8,
      24,
      currentRosterState.unlocked ? (canLevelUpRight ? 0x1d4ed8 : 0x1f2937) : 0x334155
    ).setStrokeStyle(1.5, canLevelUpRight ? 0x60a5fa : 0x475569)
      .setScrollFactor(0).setDepth(3005);

    const upBtnTextVal = !currentRosterState.unlocked 
      ? '🔒 ТРЕБУЕТСЯ РАЗБЛОКИРОВКА' 
      : (canLevelUpRight ? `УЛУЧШИТЬ ДО LVL ${currentRosterState.level + 1} (${upgradeCostVal.upgradePts}⚡·${upgradeCostVal.skulls}💀)` : '★ МАКСИМАЛЬНЫЙ УРОВЕНЬ (10) ★');

    const upBtnTxt = this.scene.add.text(col3CenterX, upBtnY, upBtnTextVal, {
      fontSize: '8px',
      fontFamily: 'Consolas, "Lucida Console", Monaco, monospace',
      fontStyle: 'bold',
      color: '#ffffff',
      resolution: 2
    }).setOrigin(0.5).setScrollFactor(0).setDepth(3006);

    this.addButtonAnimations(upBtnBg, 1.0);

    upBtnBg.on('pointerdown', async () => {
      if (!canLevelUpRight) return;
      soundEngine.playClick();
      const res = levelUpHero(this.selectedHeroId);
      if (res.success) {
        soundEngine.playLevelUp();
        this.showMessage(`✅ ${res.message}`, '#4ade80');
        try { await saveUserDataToCloud(); } catch (e) {}
        this.buildUI();
      } else {
        this.showMessage(`⚠ ${res.message}`, '#ef4444');
      }
    });
    this.elements.push(upBtnBg, upBtnTxt);

    // 3 Active Skills from players.ts (using dynamic textures and exact 2-lines word-wrap bounds)
    const skillsStartY = Math.round(this.startY + 155);
    currentHeroData.skills.forEach((sk, idx) => {
      const sy = Math.round(skillsStartY + idx * 56);
      
      const isUlt = idx === 2;
      const strokeCol = isUlt ? 0xfacc15 : 0x38bdf8;
      const skBg = this.scene.add.rectangle(col3CenterX, sy + 25, col3W - 8, 50, 0x0f172a)
        .setStrokeStyle(1.5, strokeCol).setScrollFactor(0).setDepth(3004);

      // Icon: Load actual game textures from project library (e.g. skill_zaza_1, skill_grim_1, etc.)
      let skIcon: any;
      if (this.scene.textures.exists(sk.icon)) {
        skIcon = this.scene.add.image(Math.round(col3X + 18), sy + 25, sk.icon).setDisplaySize(26, 26);
      } else {
        skIcon = this.scene.add.rectangle(Math.round(col3X + 18), sy + 25, 26, 26, isUlt ? 0x991b1b : 0x1e3a8a);
        const iconSign = this.scene.add.text(Math.round(col3X + 18), sy + 25, isUlt ? '🔥' : '⚡', {
          fontSize: '11px',
          resolution: 2
        }).setOrigin(0.5).setScrollFactor(0).setDepth(3006);
        this.elements.push(iconSign);
      }
      skIcon.setScrollFactor(0).setDepth(3005);

      const skName = this.scene.add.text(Math.round(col3X + 36), sy + 8, `${isUlt ? '🔥 УЛЬТ' : '⚡ НАВЫК'}: ${sk.name}`, {
        fontSize: '9px',
        fontFamily: 'Consolas, "Lucida Console", Monaco, monospace',
        fontStyle: 'bold',
        color: isUlt ? '#fbbf24' : '#38bdf8',
        resolution: 2
      }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(3005);

      const skCd = this.scene.add.text(Math.round(col3X + col3W - 14), sy + 8, `${sk.cooldown}с`, {
        fontSize: '8px',
        fontFamily: 'Consolas, "Lucida Console", Monaco, monospace',
        color: '#94a3b8',
        resolution: 2
      }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(3005);

      const displayDesc = (skillsDescMap[this.selectedHeroId] && skillsDescMap[this.selectedHeroId][idx]) || sk.desc;

      const skDesc = this.scene.add.text(Math.round(col3X + 36), sy + 28, displayDesc, {
        fontSize: '8.5px',
        fontFamily: 'Consolas, "Lucida Console", Monaco, monospace',
        color: '#cbd5e1',
        resolution: 2,
        lineSpacing: 2,
        wordWrap: { width: 220, useAdvancedWrap: true }
      }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(3005);

      this.elements.push(skBg, skIcon, skName, skCd, skDesc);
    });

    // Passive ability box
    const passiveBoxY = Math.round(this.startY + 322);
    const passBoxBg = this.scene.add.rectangle(col3CenterX, passiveBoxY + 25, col3W - 8, 50, 0x131d31)
      .setStrokeStyle(1.5, 0xa855f7).setScrollFactor(0).setDepth(3004);

    const passIcon = this.scene.add.text(Math.round(col3X + 18), passiveBoxY + 25, '✦', {
      fontSize: '18px',
      color: '#c084fc',
      resolution: 2
    }).setOrigin(0.5).setScrollFactor(0).setDepth(3005);

    const passTitle = this.scene.add.text(Math.round(col3X + 36), passiveBoxY + 8, 'ПАССИВНЫЙ НАВЫК', {
      fontSize: '9px',
      fontFamily: 'Consolas, "Lucida Console", Monaco, monospace',
      fontStyle: 'bold',
      color: '#c084fc',
      resolution: 2
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(3005);

    const passiveDescMap: Record<string, string> = {
      char_grim: '«Теневая Алхимия» — Смоляные колбы оставляют замедляющие ловушки.',
      char_bjorn: '«Северная Ярость» — При низком HP урон увеличивается на +30%.',
      char_torf: '«Каменный Монолит» — Невосприимчивость к отбросу и +15% брони.',
      char_alrik: '«Длинный Размах» — Копье бьет на +50% дальше по целям.',
      char_kraul: '«Жажда Крови» — Восстанавливает 15% HP от урона плетью.',
      char_zaza: '«Токсичная Аура» — Наносит урон ядом всем врагам вблизи.',
      char_omen: '«Призрачный Полет» — Парит над землей со скоростью +10%.',
      char_nihil: '«Левитация Бездны» — Парит над препятствиями, скорость бега 220.'
    };

    const displayPassive = passiveDescMap[this.selectedHeroId] || currentHeroData.style;

    const passDescText = this.scene.add.text(Math.round(col3X + 36), passiveBoxY + 28, displayPassive, {
      fontSize: '8.5px',
      fontFamily: 'Consolas, "Lucida Console", Monaco, monospace',
      color: '#e2e8f0',
      resolution: 2,
      lineSpacing: 2,
      wordWrap: { width: col3W - 48, useAdvancedWrap: true }
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(3005);

    this.elements.push(passBoxBg, passIcon, passTitle, passDescText);
  }

  private addButtonAnimations(target: Phaser.GameObjects.Container | Phaser.GameObjects.Rectangle | Phaser.GameObjects.Text, scaleFactor = 1.0) {
    target.setInteractive({ useHandCursor: true });
    
    target.on('pointerover', () => {
      this.scene.tweens.add({
        targets: target,
        scaleX: scaleFactor * 1.02,
        scaleY: scaleFactor * 1.02,
        duration: 100,
        ease: 'Sine.easeOut',
        overwrite: true
      });
    });
    
    target.on('pointerout', () => {
      this.scene.tweens.add({
        targets: target,
        scaleX: scaleFactor,
        scaleY: scaleFactor,
        duration: 100,
        ease: 'Sine.easeOut',
        overwrite: true
      });
    });
    
    target.on('pointerdown', () => {
      this.scene.tweens.add({
        targets: target,
        scaleX: scaleFactor * 0.96,
        scaleY: scaleFactor * 0.96,
        duration: 60,
        ease: 'Sine.easeOut',
        overwrite: true
      });
    });
    
    target.on('pointerup', () => {
      this.scene.tweens.add({
        targets: target,
        scaleX: scaleFactor,
        scaleY: scaleFactor,
        duration: 150,
        ease: 'Back.easeOut',
        overwrite: true
      });
    });
  }

  // preupdate/update lerping for smooth inertia scrolling
  private updateScrollLerp() {
    if (this.isClosing || !this.rosterListContainer) return;
    
    const targetY = Math.round(this.listViewportY + this.targetScrollY);
    this.rosterListContainer.y += (targetY - this.rosterListContainer.y) * 0.15;
    
    // Lock to absolute integers to prevent subpixel text blur
    this.rosterListContainer.y = Math.round(this.rosterListContainer.y);

    if (this.scrollbarThumb && this.totalListHeight > this.listViewportH) {
      const currentScrollY = this.rosterListContainer.y - this.listViewportY;
      const pct = currentScrollY / this.minScrollY; // 0 to 1
      const maxThumbY = this.listViewportH - this.thumbH;
      this.scrollbarThumb.y = Math.round(this.listViewportY + pct * maxThumbY);
      this.scrollbarThumb.setVisible(true);
    }
  }

  private showMessage(msg: string, colorHex: string = '#4ade80') {
    if (this.messageText) {
      this.messageText.setText(msg).setColor(colorHex);
    }
  }

  private ensureHeroIdleAnimation(heroId: string) {
    const animKey = `${heroId}_idle`;
    if (this.scene.anims.exists(animKey)) return;

    const frame2Key = `${heroId}_idle_2`;
    if (!this.scene.textures.exists(frame2Key)) {
      const baseTexture = this.scene.textures.get(heroId);
      if (baseTexture) {
        const sourceImage = baseTexture.getSourceImage() as HTMLImageElement | HTMLCanvasElement;
        if (sourceImage) {
          const w = sourceImage.width;
          const h = sourceImage.height;

          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = false;

            // Draw a vertically squashed, horizontally stretched version to simulate breathing
            const squashY = 0.94;
            const stretchX = 1.04;
            const dx = (w - w * stretchX) / 2;
            const dy = h - h * squashY; // keep bottom-aligned

            ctx.drawImage(sourceImage, dx, dy, w * stretchX, h * squashY);
            const f2Tex = this.scene.textures.addCanvas(frame2Key, canvas);
            if (f2Tex && f2Tex.setFilter) {
              f2Tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
            }
          }
        }
      }
    }

    this.scene.anims.create({
      key: animKey,
      frames: [
        { key: heroId },
        { key: frame2Key }
      ],
      frameRate: 2, // Slow breathing rate (2 frames per second)
      repeat: -1
    });
  }

  public close() {
    if (this.isClosing) return;
    this.isClosing = true;

    // Remove scene update listener
    this.scene.events.off('update', this.updateScrollLerp, this);

    if (this.wheelListener) {
      this.scene.input.off('wheel', this.wheelListener);
      this.wheelListener = null;
    }

    this.elements.forEach(el => {
      if (el && el.active) el.destroy();
    });
    this.elements = [];

    if (this.callbacks.onClose) {
      this.callbacks.onClose();
    }
  }
}

// Strict non-overlapping descriptions to prevent word-wrap overlaps
const skillsDescMap: Record<string, string[]> = {
  char_grim: [
    'Колбы: Алхимический взрыв снаряда с токсичным облаком.',
    'Смола: Бомба, замедляющая противников в зоне взрыва.',
    'Ульт: Телепортация с невидимостью и критическим уроном.'
  ],
  char_bjorn: [
    'Секира: Тяжелый круговой удар секирой по области.',
    'Земля: Трещина в земле, оглушающая врагов в линии.',
    'Ульт: Берсерк-бафф: +50% к скорости и похищение жизни.'
  ],
  char_torf: [
    'Кулаки: Сокрушительные АОЕ удары каменными кулаками.',
    'Валун: Швыряет тяжелый камень, оглушающий противников.',
    'Ульт: Барьер, полностью поглощающий урон на 6 сек.'
  ],
  char_alrik: [
    'Выпад: Длинный пробивающий выпад копьем вперед.',
    'Рывок: Быстрый рывок со щитом, отбрасывающий врагов.',
    'Ульт: Создает защитную ауру, снижающую урон на 40%.'
  ],
  char_kraul: [
    'Плети: Быстрая длинная атака плетьми-щупальцами.',
    'Рывок: Телепорт за спину цели с нанесением яда.',
    'Ульт: Призывает воронку, стягивающую всех врагов.'
  ],
  char_zaza: [
    'Укус: Быстрый укус вблизи с отравлением на 3 сек.',
    'Плевок: Запуск сгустка кислоты с токсичной лужей.',
    'Ульт: Трансформация в танка со сверхвысоким здоровьем.'
  ],
  char_omen: [
    'Перья: Скоростной обстрел режущими теневыми перьями.',
    'Вихрь: Создает бурю, наносящую урон по области.',
    'Ульт: Взмывает в воздух и совершает таранный пике-удар.'
  ],
  char_nihil: [
    'Серп: Пробивающий спектральный снаряд (85 урона).',
    'Сингулярность: Черная дыра, стягивающая врагов к центру.',
    'Ульт: Три клинка вонзаются с неба (380 урона, оглушение).'
  ]
};
