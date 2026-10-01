/**
 * Frantic Battles - Main Menu Scene
 * Fully responsive: expands and scales beautifully on any screen resolution.
 */

import Phaser from 'phaser';
import { generateAllTextures } from '../pixelArt';
import { soundEngine } from '../audio';
import { showHTMLSettingsModal } from '../../utils/domInput';
import { getActiveUserProfile } from '../firebase';
import { ShopModal } from '../ShopModal';
import { LootboxModal } from '../LootboxModal';
import { SocialHUD } from '../SocialHUD';

export class MainMenuScene extends Phaser.Scene {
  private bgRect!: Phaser.GameObjects.Rectangle;
  private ruinsContainer!: Phaser.GameObjects.Container;
  private caveEntrance!: Phaser.GameObjects.Rectangle;
  private mouseSprite!: Phaser.GameObjects.Image;
  private leftMenuContainer!: Phaser.GameObjects.Container;
  private fireflyParticles!: Phaser.GameObjects.Particles.ParticleEmitter;

  // Popups
  private popupContainer!: Phaser.GameObjects.Container;
  private popupBg!: Phaser.GameObjects.Rectangle;
  private popupDimBackdrop!: Phaser.GameObjects.Rectangle;
  private popupTitle!: Phaser.GameObjects.Text;
  private popupContentText!: Phaser.GameObjects.Text;

  // Settings UI
  private musicVolBtn!: Phaser.GameObjects.Text;
  private soundVolBtn!: Phaser.GameObjects.Text;
  private muteAllBtn!: Phaser.GameObjects.Text;
  private openMusicBtn!: Phaser.GameObjects.Rectangle;
  private openMusicTxt!: Phaser.GameObjects.Text;
  private ctrlModeBtn!: Phaser.GameObjects.Text;

  // Music Selection Panel (All 5 Tracks displayed with album covers)
  private musicPanel!: Phaser.GameObjects.Container;
  private musicTracks = [
    { id: 'Wiklund' as const, name: 'WIKLUND', desc: 'Поход (RPG 8-Bit)', tex: 'WiklundPic', color: '#fef08a' },
    { id: 'Neowave' as const, name: 'NEOWAVE', desc: 'Замок (Synthwave)', tex: 'NeowavePic', color: '#e0aaff' },
    { id: 'VoidOverlord' as const, name: 'ВЛАСТЕЛИН', desc: 'Кибер (Techno)', tex: 'VoidOverlordPic', color: '#c084fc' },
    { id: 'ShadowRealm' as const, name: 'ТЁМНАЯ ОБИТЕЛЬ', desc: 'Мрак (Gothic)', tex: 'ShadowRealmPic', color: '#facc15' },
    { id: 'BloodMoon' as const, name: 'КРОВАВАЯ ЛУНА', desc: 'Босс (Boss Battle)', tex: 'BloodMoonPic', color: '#ef4444' }
  ];
  private musicSlotCards: Array<{
    bg: Phaser.GameObjects.Rectangle;
    pic: Phaser.GameObjects.Image;
    name: Phaser.GameObjects.Text;
    desc: Phaser.GameObjects.Text;
    btn: Phaser.GameObjects.Text;
    trackId: 'Wiklund' | 'Neowave' | 'VoidOverlord' | 'ShadowRealm' | 'BloodMoon';
  }> = [];

  // Adventurer Profile Panel (7 Avatars & Fantasy Lore)
  private profilePanel!: Phaser.GameObjects.Container;
  private selectedAvatarKey = 'char_grim';
  private avatarCards: Array<{ key: string; bg: Phaser.GameObjects.Rectangle }> = [];
  private profileNameText!: Phaser.GameObjects.Text;
  private profileAvatarImage!: Phaser.GameObjects.Image;

  private userAvatarContainer!: Phaser.GameObjects.Container;
  private isPC = false;

  constructor() {
    super({ key: 'MainMenuScene' });
  }

  preload() {
    generateAllTextures(this);
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    this.isPC = this.registry.get('isPC') || false;

    this.cameras.main.fadeIn(400, 0, 0, 0);
    this.cameras.main.setRoundPixels(true);

    // 1. Deep dark fantasy mossy forest background (ARCO palette)
    this.bgRect = this.add.rectangle(0, 0, width, height, 0x050c07).setOrigin(0, 0).setDepth(-12);

    // Deep forest backdrop silhouette
    const forestBgGfx = this.add.graphics().setDepth(-10);
    forestBgGfx.fillStyle(0x030704, 1.0);
    forestBgGfx.fillRect(0, 0, width, height);

    // Giant Ancient Mossy Tree on left framing the menu
    const leftTreeImg = this.add.image(0, height / 2, 'arco_bg_tree_left')
      .setOrigin(0, 0.5)
      .setDepth(-8)
      .setScale(Math.max(1, height / 360));

    // Hanging Jungle Canopy silhouetted along the top
    const canopyGfx = this.add.graphics().setDepth(-7);
    canopyGfx.fillStyle(0x060f09, 0.95);
    for (let x = 0; x <= width + 80; x += 55) {
      const r = 38 + ((x * 17) % 25);
      canopyGfx.fillCircle(x, -5, r);
    }
    canopyGfx.fillStyle(0x142b17, 0.7);
    for (let x = 20; x <= width + 80; x += 65) {
      canopyGfx.fillCircle(x, 15, 24);
    }

    // 2. Responsive ARCO-style Stone Temple Monolith & Illuminated Glade
    this.ruinsContainer = this.add.container(0, 0).setDepth(-5);

    // Sunlit bright lime-green grass spots and stone path on the glade floor
    const gladeGfx = this.add.graphics();
    
    // Deep dark moss base
    gladeGfx.fillStyle(0x0d1f11, 0.95);
    gladeGfx.fillEllipse(0, 150, 520, 240);

    // Contrasting vibrant sunlit grass patches (chartreuse / yellow-green exactly matching ARCO reference)
    gladeGfx.fillStyle(0x365314, 0.92);
    gladeGfx.fillEllipse(-40, 140, 200, 75);
    gladeGfx.fillEllipse(50, 160, 220, 85);

    gladeGfx.fillStyle(0x65a30d, 0.95);
    gladeGfx.fillEllipse(-20, 145, 140, 50);
    gladeGfx.fillEllipse(40, 165, 150, 55);

    gladeGfx.fillStyle(0xa3e635, 1.0);
    gladeGfx.fillEllipse(-15, 148, 95, 32);
    gladeGfx.fillEllipse(35, 168, 105, 34);
    gladeGfx.fillEllipse(10, 130, 60, 22);

    gladeGfx.fillStyle(0xd9f99d, 0.9);
    gladeGfx.fillEllipse(-5, 150, 45, 16);
    gladeGfx.fillEllipse(30, 170, 50, 18);

    // Weathered stone path leading into archway
    gladeGfx.fillStyle(0x19271c, 0.95);
    gladeGfx.fillPoints([
      new Phaser.Math.Vector2(-20, 110),
      new Phaser.Math.Vector2(20, 110),
      new Phaser.Math.Vector2(38, 220),
      new Phaser.Math.Vector2(-38, 220)
    ]);

    // Stepping stones with mossy relief
    const steps = [
      { x: -2, y: 105, w: 32, h: 10 },
      { x: 4, y: 122, w: 36, h: 12 },
      { x: -6, y: 142, w: 42, h: 14 },
      { x: 8, y: 165, w: 48, h: 16 },
      { x: -2, y: 190, w: 54, h: 18 }
    ];
    steps.forEach(st => {
      gladeGfx.fillStyle(0x283827, 1.0);
      gladeGfx.fillRoundedRect(st.x - st.w / 2, st.y, st.w, st.h, 3);
      gladeGfx.fillStyle(0x4d634b, 1.0);
      gladeGfx.fillRoundedRect(st.x - st.w / 2 + 2, st.y + 1, st.w - 4, 3, 1);
    });

    // Ancient Monolith Temple Image (Pixel replica from pixelArt.ts)
    const templeImage = this.add.image(0, 0, 'arco_ruins').setScale(1.25);

    // Mysterious inner emerald glow within dark cavern void
    this.caveEntrance = this.add.rectangle(0, 68, 80, 85, 0x052e1a, 0.35);
    this.tweens.add({
      targets: this.caveEntrance,
      alpha: 0.8,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Glowing cave depth particles (faint embers rising from the doorway)
    const caveEmbers = this.add.particles(0, 75, 'firefly', {
      x: { min: -25, max: 25 },
      y: { min: -10, max: 10 },
      lifespan: { min: 2000, max: 3500 },
      speedY: { min: -12, max: -28 },
      speedX: { min: -5, max: 5 },
      scale: { start: 1.1, end: 0 },
      alpha: { start: 0.85, end: 0 },
      tint: 0xfacc15,
      blendMode: 'ADD',
      frequency: 380
    });

    // 3. Characters on Background:
    // Explorer / Warrior standing directly on the stone stairs facing temple entrance (soft breathing animation)
    const warriorOnPath = this.add.image(0, 158, 'arco_warrior').setScale(1.42).setDepth(15);
    this.tweens.add({
      targets: warriorOnPath,
      scaleY: 1.45,
      y: 156,
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Bouncing Guardian Retro Rat / Mouse in the middle on the top entrance step
    this.mouseSprite = this.add.image(0, 98, 'bg_mouse').setOrigin(0.5, 1.0).setScale(1.15).setDepth(20);

    // Glade Foliage & Mossy Boulders (Left and right glade corners)
    const gladeBushesLeft = this.add.image(-150, 160, 'arco_glade_bushes').setScale(1.0);
    const gladeBushesRight = this.add.image(160, 170, 'arco_glade_bushes').setScale(1.0).setFlipX(true);

    // Volumetric Sunbeam Shaft cutting through glade
    const sunbeam = this.add.image(20, 60, 'arco_sunbeam_shaft')
      .setScale(1.6)
      .setAlpha(0.65)
      .setRotation(-0.12);
    this.tweens.add({
      targets: sunbeam,
      alpha: 0.9,
      duration: 2400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.ruinsContainer.add([
      gladeGfx,
      templeImage,
      this.caveEntrance,
      caveEmbers,
      gladeBushesLeft,
      gladeBushesRight,
      warriorOnPath,
      this.mouseSprite,
      sunbeam
    ]);
    this.setupMousePatrol();

    // 4. Glowing ambient forest spores & golden-green fireflies across the screen
    this.fireflyParticles = this.add.particles(0, 0, 'firefly', {
      x: { min: width * 0.25, max: width },
      y: { min: height * 0.1, max: height },
      lifespan: { min: 4500, max: 9000 },
      speedY: { min: -8, max: -24 },
      speedX: { min: -14, max: 14 },
      scale: { start: 1.5, end: 0 },
      alpha: { start: 0.95, end: 0 },
      blendMode: 'ADD',
      frequency: 200
    }).setDepth(-2);

    // Faint atmospheric forest ground mist
    const mistGfx = this.add.graphics().setDepth(-3);
    mistGfx.fillStyle(0x84cc16, 0.035);
    mistGfx.fillEllipse(width * 0.65, height * 0.85, width * 0.8, 90);
    this.tweens.add({
      targets: mistGfx,
      alpha: 0.6,
      x: 20,
      duration: 3500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // 5. Left Branding & Menu Buttons Container (ARCO styled)
    this.leftMenuContainer = this.add.container(0, 0);

    // Bold rounded retro typography with shadow (matching ARCO reference)
    const res = Math.max(window.devicePixelRatio || 1, 2);
    const titleShadow = this.add.text(3, 3, 'RETRO\nREVIVAL', {
      fontSize: '32px',
      fontFamily: '"Press Start 2P", monospace',
      fontStyle: 'bold',
      color: '#040b07'
    }).setOrigin(0, 0).setResolution(res);

    const titleText = this.add.text(0, 0, 'RETRO\nREVIVAL', {
      fontSize: '32px',
      fontFamily: '"Press Start 2P", monospace',
      fontStyle: 'bold',
      color: '#4ade80'
    }).setOrigin(0, 0).setResolution(res);

    this.tweens.add({
      targets: titleText,
      alpha: 0.92,
      duration: 1400,
      yoyo: true,
      repeat: -1
    });

    this.leftMenuContainer.add([titleShadow, titleText]);

    // Menu Buttons: ВЗРЫВ, ПРОФИЛЬ, НАСТРОЙКИ
    const startY = 155;
    const spacing = 58;

    this.addMenuButtonToContainer(this.leftMenuContainer, 0, startY, 'ВЗРЫВ', '#4ade80', () => {
      this.startGame();
    });

    this.addMenuButtonToContainer(this.leftMenuContainer, 0, startY + spacing, 'ПРОФИЛЬ', '#ffffff', () => {
      this.showProfilePopup();
    });

    this.addMenuButtonToContainer(this.leftMenuContainer, 0, startY + spacing * 2, 'НАСТРОЙКИ', '#ffffff', () => {
      this.showSettingsPopup();
    });

    // 6. Build the Popup UI and Music Selection Modal
    this.buildPopups(width, height);

    // 7. Top-Left Square Avatar & Profile Badge
    this.createTopLeftUserAvatar();

    // Initial Layout positioning
    this.layoutElements(width, height);

    // Orientation & Screen Resize Listener
    this.scale.on('resize', this.handleResize, this);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.handleResize, this);
    });

    // Handle First-touch audio start
    this.input.once('pointerdown', () => {
      soundEngine.startMusic();
    });
  }

  private addMenuButtonToContainer(
    container: Phaser.GameObjects.Container,
    x: number,
    y: number,
    text: string,
    defaultColor: string,
    callback: () => void
  ) {
    const res = Math.max(window.devicePixelRatio || 1, 2);
    const item = this.add.text(x, y, text, {
      fontSize: '34px',
      fontFamily: '"VT323", "Courier New", monospace',
      fontStyle: 'bold',
      color: defaultColor
    }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true }).setResolution(res);

    item.on('pointerover', () => {
      item.setColor('#fef08a');
      item.x = x + 10;
      soundEngine.playClick();
    });

    item.on('pointerout', () => {
      item.setColor(defaultColor);
      item.x = x;
    });

    item.on('pointerdown', () => {
      soundEngine.playClick();
      callback();
    });

    container.add(item);
  }

  private setupMousePatrol() {
    if (!this.mouseSprite) return;

    this.tweens.killTweensOf(this.mouseSprite);

    const baseX = 0;
    const baseY = 98;
    this.mouseSprite.setOrigin(0.5, 1.0);
    this.mouseSprite.setPosition(baseX, baseY);
    this.mouseSprite.setScale(1.15);

    // Continuous playful cartoon squash, stretch, and bouncy jump animation
    const doJumpCycle = () => {
      if (!this.mouseSprite || !this.mouseSprite.active) return;

      // 1. Gentle Squash Down (Anticipation before leap)
      this.tweens.add({
        targets: this.mouseSprite,
        scaleX: 1.35,
        scaleY: 0.85,
        y: baseY + 2,
        duration: 120,
        ease: 'Quad.easeInOut',
        onComplete: () => {
          if (!this.mouseSprite || !this.mouseSprite.active) return;

          // 2. Launch upward with elastic stretch
          this.tweens.add({
            targets: this.mouseSprite,
            scaleX: 0.88,
            scaleY: 1.38,
            y: baseY - 32,
            duration: 240,
            ease: 'Cubic.easeOut',
            onComplete: () => {
              if (!this.mouseSprite || !this.mouseSprite.active) return;

              // 3. Fall back down smoothly
              this.tweens.add({
                targets: this.mouseSprite,
                scaleX: 1.05,
                scaleY: 1.1,
                y: baseY,
                duration: 200,
                ease: 'Quad.easeIn',
                onComplete: () => {
                  if (!this.mouseSprite || !this.mouseSprite.active) return;

                  // 4. Touchdown landing squash cushion
                  this.tweens.add({
                    targets: this.mouseSprite,
                    scaleX: 1.35,
                    scaleY: 0.85,
                    y: baseY + 2,
                    duration: 90,
                    ease: 'Quad.easeOut',
                    onComplete: () => {
                      if (!this.mouseSprite || !this.mouseSprite.active) return;

                      // 5. Elastic rebound to standing pose
                      this.tweens.add({
                        targets: this.mouseSprite,
                        scaleX: 1.1,
                        scaleY: 1.1,
                        y: baseY,
                        duration: 120,
                        ease: 'Back.easeOut',
                        onComplete: () => {
                          if (!this.mouseSprite || !this.mouseSprite.active) return;
                          // 6. Playful breathing settle before next bouncy hop
                          this.time.delayedCall(280, doJumpCycle);
                        }
                      });
                    }
                  });
                }
              });
            }
          });
        }
      });
    };

    this.time.delayedCall(100, doJumpCycle);
  }

  private layoutElements(width: number, height: number) {
    if (this.cameras.main) {
      this.cameras.main.setViewport(0, 0, width, height);
    }
    // 1. Background
    if (this.bgRect && typeof this.bgRect.setDisplaySize === 'function') {
      this.bgRect.setDisplaySize(width, height);
    }

    const isPortrait = height > width;

    // 2. Ruins & Cave Entrance: Adapt position for both phone orientations
    if (this.ruinsContainer) {
      if (isPortrait) {
        const rScale = Phaser.Math.Clamp(width / 420, 0.65, 1.15);
        const rx = Math.round(width * 0.5);
        const ry = Math.round(height * 0.32);
        this.ruinsContainer.setPosition(rx, ry).setScale(rScale);
      } else {
        const rScale = Phaser.Math.Clamp(Math.min(width / 820, height / 580), 0.75, 1.45);
        const rx = Math.round(width * 0.72);
        const ry = Math.round(height * 0.54);
        this.ruinsContainer.setPosition(rx, ry).setScale(rScale);
      }
    }

    // 4. Left Menu Container: Position centered below ruins in portrait, on left side in landscape
    if (this.leftMenuContainer) {
      if (isPortrait) {
        const menuScale = Phaser.Math.Clamp(width / 380, 0.8, 1.15);
        const leftPad = Math.max(20, Math.round((width - 220 * menuScale) / 2));
        const topPad = Math.round(height * 0.52);
        this.leftMenuContainer.setPosition(leftPad, topPad).setScale(menuScale);
      } else {
        const menuScale = Phaser.Math.Clamp(Math.min(width / 750, height / 550), 0.85, 1.65);
        const leftPad = Math.max(30, Math.round(width * 0.08));
        const topPad = Math.max(30, Math.round(height * 0.12));
        this.leftMenuContainer.setPosition(leftPad, topPad).setScale(menuScale);
      }
    }

    // 5. Popups & Modals: Expands with screen without 1.0 limit!
    if (this.popupContainer) {
      const popupScale = Phaser.Math.Clamp(Math.min((width * 0.92) / 520, (height * 0.90) / 360), 0.75, 2.1);
      this.popupContainer.setPosition(width / 2, height / 2).setScale(popupScale);
      if (this.popupDimBackdrop && typeof this.popupDimBackdrop.setDisplaySize === 'function') {
        this.popupDimBackdrop.setDisplaySize(width * 4, height * 4);
      }
    }

    // 6. User Avatar in Bottom-Left Corner
    if (this.userAvatarContainer) {
      this.userAvatarContainer.setPosition(Math.max(20, Math.round(width * 0.05)), height - 75);
    }
  }

  private buildPopups(width: number, height: number) {
    const cx = width / 2;
    const cy = height / 2;

    this.popupContainer = this.add.container(cx, cy).setDepth(200).setVisible(false);

    // Dim backdrop
    this.popupDimBackdrop = this.add.rectangle(0, 0, width * 4, height * 4, 0x000000, 0.75)
      .setInteractive()
      .on('pointerdown', (_p: unknown, _lx: unknown, _ly: unknown, event: { stopPropagation: () => void }) => {
        event.stopPropagation();
      });
    this.popupContainer.add(this.popupDimBackdrop);

    // Window Frame
    this.popupBg = this.add.rectangle(0, 0, 520, 360, 0x18201a)
      .setStrokeStyle(4, 0x4ade80);
    this.popupContainer.add(this.popupBg);

    // Popup Title
    this.popupTitle = this.add.text(0, -135, '', {
      fontSize: '22px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);
    this.popupContainer.add(this.popupTitle);

    // Profile / General Text Content
    this.popupContentText = this.add.text(0, -10, '', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#e2e8f0',
      align: 'center',
      lineSpacing: 10
    }).setOrigin(0.5);
    this.popupContainer.add(this.popupContentText);

    // Corner X button
    const cornerClose = this.add.text(230, -150, '[X]', {
      fontSize: '20px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#f87171'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    cornerClose.on('pointerdown', () => {
      soundEngine.playClick();
      this.popupContainer.setVisible(false);
    });

    // Settings Options: Clean direct list without confusing tab buttons
    this.musicVolBtn = this.add.text(0, -70, this.getMusicText(), {
      fontSize: '17px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: soundEngine.isMusicOn() ? '#4ade80' : '#f87171'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.soundVolBtn = this.add.text(0, -30, this.getSfxText(), {
      fontSize: '17px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: soundEngine.isSfxOn() ? '#4ade80' : '#f87171'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.musicVolBtn.on('pointerdown', () => {
      soundEngine.toggleMusic();
      this.musicVolBtn.setText(this.getMusicText()).setColor(soundEngine.isMusicOn() ? '#4ade80' : '#f87171');
    });

    this.soundVolBtn.on('pointerdown', () => {
      soundEngine.toggleSfx();
      this.soundVolBtn.setText(this.getSfxText()).setColor(soundEngine.isSfxOn() ? '#4ade80' : '#f87171');
    });

    // Controls Option
    this.ctrlModeBtn = this.add.text(0, 10, this.isPC ? 'РЕЖИМ: [ КЛАВИАТУРА ПК ]' : 'РЕЖИМ: [ ДЖОЙСТИК ТЕЛЕФОН ]', {
      fontSize: '17px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#facc15'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.ctrlModeBtn.on('pointerdown', () => {
      soundEngine.playClick();
      this.isPC = !this.isPC;
      this.registry.set('isPC', this.isPC);
      this.ctrlModeBtn.setText(this.isPC ? 'РЕЖИМ: [ КЛАВИАТУРА ПК ]' : 'РЕЖИМ: [ ДЖОЙСТИК ТЕЛЕФОН ]');
    });

    // Button: Open Music Selection Panel
    this.openMusicBtn = this.add.rectangle(0, 58, 280, 36, 0x1d4ed8)
      .setStrokeStyle(2, 0x60a5fa)
      .setInteractive({ useHandCursor: true });
    this.openMusicTxt = this.add.text(0, 58, 'ВЫБРАТЬ МУЗЫКАЛЬНЫЙ ТРЕК 🎵', {
      fontSize: '14px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);

    this.openMusicBtn.on('pointerdown', () => {
      soundEngine.playClick();
      this.openMusicSelectionModal();
    });

    // Mute All
    this.muteAllBtn = this.add.text(0, 104, '[ ВЫКЛЮЧИТЬ ВСЁ ]', {
      fontSize: '15px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#ef4444'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.muteAllBtn.on('pointerdown', () => {
      soundEngine.setMuteAll(true);
      this.musicVolBtn.setText(this.getMusicText()).setColor('#f87171');
      this.soundVolBtn.setText(this.getSfxText()).setColor('#f87171');
    });

    this.popupContainer.add([
      this.musicVolBtn,
      this.soundVolBtn,
      this.ctrlModeBtn,
      this.openMusicBtn,
      this.openMusicTxt,
      this.muteAllBtn,
      cornerClose
    ]);

    // Separate Music Selection Modal Panel
    this.buildMusicSelectionPanel();
    this.popupContainer.add(this.musicPanel);

    // Adventurer Profile Panel (7 Avatars & Fantasy Lore)
    this.buildProfilePanel();
    this.popupContainer.add(this.profilePanel);

    // Social HUD integration
    new SocialHUD(this);
  }

  private showExitPopup() {
    this.musicPanel.setVisible(false);
    this.hideSettingsElements();
    this.popupTitle.setText('ВЫХОД ИЗ ИГРЫ').setVisible(true);
    this.popupContentText.setText(
      'Спасибо за игру в Retro Revival!\n\n' +
      'Для продолжения приключения\nнажмите [ CONTINUE ] или [ NEW GAME ].\n\n' +
      'Чтобы покинуть игру, просто закройте вкладку браузера.'
    ).setVisible(true);
    this.popupContainer.setVisible(true);
  }

  private getMusicText(): string {
    return soundEngine.isMusicOn() ? 'МУЗЫКА: [ ВКЛЮЧЕНА ]' : 'МУЗЫКА: [ ВЫКЛЮЧЕНА ]';
  }

  private getSfxText(): string {
    return soundEngine.isSfxOn() ? 'ЗВУКИ ЭФФЕКТОВ: [ ВКЛ ]' : 'ЗВУКИ ЭФФЕКТОВ: [ ВЫКЛ ]';
  }

  private musicScrollY = 0;
  private musicListContainer!: Phaser.GameObjects.Container;

  private buildMusicSelectionPanel() {
    this.musicPanel = this.add.container(0, 0).setVisible(false).setDepth(210);

    const musicBg = this.add.rectangle(0, 0, 680, 420, 0x0f172a)
      .setStrokeStyle(4, 0x38bdf8);

    const musicTitle = this.add.text(0, -180, '🎵 ВЫБОР САУНДТРЕКА (5 ТРЕКОВ) 🎵', {
      fontSize: '17px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#f0f9ff'
    }).setOrigin(0.5);

    const musicSubtitle = this.add.text(0, -156, '3 трека в ряду • Прокручивайте список вверх и вниз ↕', {
      fontSize: '11px',
      fontFamily: 'monospace',
      color: '#94a3b8'
    }).setOrigin(0.5);

    this.musicPanel.add([musicBg, musicTitle, musicSubtitle]);

    // Scrollable container for the 3-columns grid
    this.musicListContainer = this.add.container(0, -20);
    this.musicPanel.add(this.musicListContainer);

    this.musicSlotCards = [];

    // Max 3 tracks per line (Row 0: 3 items, Row 1: 2 items)
    const colWidth = 195;
    const rowHeight = 175;

    for (let i = 0; i < 5; i++) {
      const track = this.musicTracks[i];
      const row = Math.floor(i / 3);
      const col = i % 3;

      let cx = 0;
      if (row === 0) {
        cx = (col - 1) * colWidth; // -195, 0, 195
      } else {
        // Row 1 with 2 items: centered
        cx = (col === 0 ? -100 : 100);
      }
      const cy = (row === 0 ? -45 : 130);

      const bg = this.add.rectangle(cx, cy, 178, 160, 0x1e293b)
        .setStrokeStyle(3, 0x475569).setInteractive({ useHandCursor: true });

      const pic = this.add.image(cx, cy - 35, track.tex).setDisplaySize(62, 62);

      const name = this.add.text(cx, cy + 12, track.name, {
        fontSize: '11px', fontFamily: 'monospace', fontStyle: 'bold', color: track.color,
        wordWrap: { width: 170 }, align: 'center'
      }).setOrigin(0.5);

      const desc = this.add.text(cx, cy + 32, track.desc, {
        fontSize: '9px', fontFamily: 'monospace', color: '#cbd5e1',
        wordWrap: { width: 170 }, align: 'center'
      }).setOrigin(0.5);

      const btn = this.add.text(cx, cy + 58, '[ ВЫБРАТЬ ]', {
        fontSize: '10px', fontFamily: 'monospace', fontStyle: 'bold',
        color: '#ffffff', backgroundColor: '#1e3a8a', padding: { x: 10, y: 3 }
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      const slotObj = { bg, pic, name, desc, btn, trackId: track.id };
      this.musicSlotCards.push(slotObj);

      const onPick = () => {
        soundEngine.playClick();
        soundEngine.selectTrack(slotObj.trackId);
        this.updateTrackSelectionUI();
      };
      bg.on('pointerdown', onPick);
      btn.on('pointerdown', onPick);

      this.musicListContainer.add([bg, pic, name, desc, btn]);
    }

    // Scroll buttons
    const scrollUpBtn = this.add.text(285, -60, '▲', {
      fontSize: '20px', fontFamily: 'monospace', fontStyle: 'bold', color: '#38bdf8',
      backgroundColor: '#1e293b', padding: { x: 8, y: 6 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const scrollDownBtn = this.add.text(285, 60, '▼', {
      fontSize: '20px', fontFamily: 'monospace', fontStyle: 'bold', color: '#38bdf8',
      backgroundColor: '#1e293b', padding: { x: 8, y: 6 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    scrollUpBtn.on('pointerdown', () => {
      soundEngine.playClick();
      this.scrollMusicList(-70);
    });

    scrollDownBtn.on('pointerdown', () => {
      soundEngine.playClick();
      this.scrollMusicList(70);
    });

    // Mouse wheel support for scrolling music
    this.input.on('wheel', (_pointer: unknown, _gameObjects: unknown, _deltaX: number, deltaY: number) => {
      if (this.musicPanel && this.musicPanel.visible) {
        this.scrollMusicList(deltaY > 0 ? 50 : -50);
      }
    });

    // Touch scroll drag support
    let dragStartY = 0;
    musicBg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      dragStartY = pointer.y;
    });
    musicBg.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown) {
        const diff = pointer.y - dragStartY;
        if (Math.abs(diff) > 10) {
          this.scrollMusicList(-diff * 0.7);
          dragStartY = pointer.y;
        }
      }
    });

    // Back button from Music panel
    const musicBackBtn = this.add.rectangle(0, 180, 240, 36, 0x334155)
      .setInteractive({ useHandCursor: true });
    const musicBackTxt = this.add.text(0, 180, '< НАЗАД В НАСТРОЙКИ', {
      fontSize: '13px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffffff'
    }).setOrigin(0.5);

    musicBackBtn.on('pointerdown', () => {
      soundEngine.playClick();
      this.musicPanel.setVisible(false);
      this.showSettingsPopup();
    });

    // Corner close X
    const musicClose = this.add.text(320, -180, '[X]', {
      fontSize: '20px', fontFamily: 'monospace', fontStyle: 'bold', color: '#f87171'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    musicClose.on('pointerdown', () => {
      soundEngine.playClick();
      this.popupContainer.setVisible(false);
      this.musicPanel.setVisible(false);
    });

    this.musicPanel.add([
      scrollUpBtn, scrollDownBtn,
      musicBackBtn, musicBackTxt,
      musicClose
    ]);
  }

  private scrollMusicList(delta: number) {
    if (!this.musicListContainer) return;
    this.musicScrollY = Phaser.Math.Clamp(this.musicScrollY - delta, -90, 0);
    this.tweens.add({
      targets: this.musicListContainer,
      y: -20 + this.musicScrollY,
      duration: 120,
      ease: 'Power1'
    });
  }

  private updateTrackSelectionUI() {
    const selected = soundEngine.getSelectedTrack();

    for (let i = 0; i < 5; i++) {
      const track = this.musicTracks[i];
      const slot = this.musicSlotCards[i];
      if (!track || !slot) continue;

      slot.pic.setTexture(track.tex);
      slot.name.setText(track.name).setColor(track.color);
      slot.desc.setText(track.desc);

      const isCurrent = selected === track.id;
      slot.bg.setStrokeStyle(3, isCurrent ? 0x4ade80 : 0x475569);
      slot.btn.setText(isCurrent ? '▶ ИГРАЕТ' : '[ ВЫБРАТЬ ]')
        .setColor(isCurrent ? '#4ade80' : '#ffffff')
        .setBackgroundColor(isCurrent ? '#064e3b' : '#1e3a8a');
    }
  }

  private openMusicSelectionModal() {
    this.hideSettingsElements();
    this.popupBg.setVisible(false);
    this.popupTitle.setVisible(false);
    this.popupContentText.setVisible(false);
    if (this.profilePanel) this.profilePanel.setVisible(false);
    this.updateTrackSelectionUI();
    this.musicPanel.setVisible(true);
    this.popupContainer.setVisible(true);
  }

  private buildProfilePanel() {
    this.profilePanel = this.add.container(0, 0).setVisible(false);

    let savedAvatar = localStorage.getItem('adv_avatar') || 'avatar_sq_1';
    let savedFirstName = localStorage.getItem('adv_firstname') || 'Элрик';
    let savedLastName = localStorage.getItem('adv_lastname') || 'Тенеход (Гром)';
    let savedDob = localStorage.getItem('adv_dob') || '14.05.1242 г.';
    let savedBio = localStorage.getItem('adv_bio') || 'Ветеран S-класса. Победитель 100 Боссов Подземелья.';

    this.selectedAvatarKey = savedAvatar;

    // Outer Profile Card Container
    const cardBg = this.add.rectangle(0, -10, 500, 310, 0x0f172a).setStrokeStyle(3, 0x38bdf8);

    // Title
    const title = this.add.text(0, -148, '✦ КАРТОЧКА АВАНТЮРИСТА ✦', {
      fontSize: '18px', fontFamily: 'monospace', fontStyle: 'bold', color: '#facc15'
    }).setOrigin(0.5);

    // TOP: Square Avatar Frame & Picture (80x80)
    const avatarFrame = this.add.rectangle(-180, -70, 84, 84, 0x1e293b).setStrokeStyle(3, 0x4ade80);
    this.profileAvatarImage = this.add.image(-180, -70, this.selectedAvatarKey).setDisplaySize(76, 76);

    const changeAvatarBtn = this.add.text(-180, -18, '[ 📷 ИЗМЕНИТЬ ]', {
      fontSize: '10px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffffff',
      backgroundColor: '#16a34a', padding: { x: 6, y: 3 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    // Grid Popup for 7 Square Avatars Selection
    const avatarPickerGrid = this.add.container(0, -10).setVisible(false);
    const pickerBg = this.add.rectangle(0, 0, 480, 240, 0x020617, 0.95).setStrokeStyle(3, 0xfacc15).setInteractive();
    const pickerTitle = this.add.text(0, -95, '✦ ВЫБЕРИТЕ КВАДРАТНУЮ АВАТАРКУ ✦', {
      fontSize: '15px', fontFamily: 'monospace', fontStyle: 'bold', color: '#facc15'
    }).setOrigin(0.5);

    const sqAvatars = [
      { key: 'avatar_sq_1', label: 'Гром' },
      { key: 'avatar_sq_2', label: 'Заза' },
      { key: 'avatar_sq_3', label: 'Бьёрн' },
      { key: 'avatar_sq_4', label: 'Рыцарь' },
      { key: 'avatar_sq_5', label: 'Маг' },
      { key: 'avatar_sq_6', label: 'Следопыт' },
      { key: 'avatar_sq_7', label: 'Проклятый' },
      { key: 'avatar_sq_8', label: 'Властелин' }
    ];

    sqAvatars.forEach((av, idx) => {
      const col = idx % 4;
      const row = Math.floor(idx / 4);
      const px = -150 + col * 100;
      const py = -40 + row * 80;

      const avBox = this.add.rectangle(px, py, 68, 68, 0x1e293b)
        .setStrokeStyle(2, this.selectedAvatarKey === av.key ? 0x4ade80 : 0x475569)
        .setInteractive({ useHandCursor: true });

      const avImg = this.add.image(px, py - 6, av.key).setDisplaySize(54, 54);
      const avTxt = this.add.text(px, py + 22, av.label, {
        fontSize: '9px', fontFamily: 'monospace', fontStyle: 'bold', color: '#cbd5e1'
      }).setOrigin(0.5);

      avBox.on('pointerdown', () => {
        soundEngine.playClick();
        this.selectedAvatarKey = av.key;
        localStorage.setItem('adv_avatar', av.key);
        this.profileAvatarImage.setTexture(av.key);
        avatarPickerGrid.setVisible(false);
      });

      avatarPickerGrid.add([avBox, avImg, avTxt]);
    });

    const pickerClose = this.add.text(0, 90, '[ ЗАКРЫТЬ ]', {
      fontSize: '12px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffffff',
      backgroundColor: '#ef4444', padding: { x: 12, y: 4 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    pickerClose.on('pointerdown', () => {
      soundEngine.playClick();
      avatarPickerGrid.setVisible(false);
    });
    avatarPickerGrid.add([pickerBg, pickerTitle, pickerClose]);

    changeAvatarBtn.on('pointerdown', () => {
      soundEngine.playClick();
      avatarPickerGrid.setVisible(true);
    });

    // EDITABLE PROFILE FIELDS (Right of avatar & below avatar)
    const firstNamesList = ['Элрик', 'Артур', 'Гарольд', 'Заза', 'Бьёрн', 'Леопард', 'Вальтер'];
    const lastNamesList = ['Тенеход (Гром)', 'Безумный Варитель', 'Сокрушитель Скал', 'Легенда Гильдии', 'Одинокий Волшебник'];
    const dobsList = ['14.05.1242 г.', '01.09.1238 г.', '28.11.1245 г.', '07.03.1240 г.', '19.08.1235 г.'];
    const biosList = [
      'Ветеран S-класса. Победитель 100 Боссов Подземелья.',
      'Мастер ядов и защитных эликсиров подземного царства.',
      'Северный берсерк с громовыми топорами и ледяным щитом.',
      'Секретный агент Гильдии Исследователей Тёмных Пещер.',
      'Великий рыцарь круглого стола Древней Крепости.'
    ];

    let fnIdx = firstNamesList.indexOf(savedFirstName); if (fnIdx < 0) fnIdx = 0;
    let lnIdx = lastNamesList.indexOf(savedLastName); if (lnIdx < 0) lnIdx = 0;
    let dobIdx = dobsList.indexOf(savedDob); if (dobIdx < 0) dobIdx = 0;
    let bioIdx = biosList.indexOf(savedBio); if (bioIdx < 0) bioIdx = 0;

    // Имя
    const firstNameText = this.add.text(-120, -100, `ИМЯ: [ ${savedFirstName} ] ✏`, {
      fontSize: '12px', fontFamily: 'monospace', fontStyle: 'bold', color: '#4ade80',
      backgroundColor: '#1e293b', padding: { x: 8, y: 4 }
    }).setInteractive({ useHandCursor: true });

    firstNameText.on('pointerdown', () => {
      soundEngine.playClick();
      fnIdx = (fnIdx + 1) % firstNamesList.length;
      savedFirstName = firstNamesList[fnIdx];
      localStorage.setItem('adv_firstname', savedFirstName);
      firstNameText.setText(`ИМЯ: [ ${savedFirstName} ] ✏`);
    });

    // Фамилия
    const lastNameText = this.add.text(-120, -68, `ФАМИЛИЯ: [ ${savedLastName} ] ✏`, {
      fontSize: '12px', fontFamily: 'monospace', fontStyle: 'bold', color: '#38bdf8',
      backgroundColor: '#1e293b', padding: { x: 8, y: 4 }
    }).setInteractive({ useHandCursor: true });

    lastNameText.on('pointerdown', () => {
      soundEngine.playClick();
      lnIdx = (lnIdx + 1) % lastNamesList.length;
      savedLastName = lastNamesList[lnIdx];
      localStorage.setItem('adv_lastname', savedLastName);
      lastNameText.setText(`ФАМИЛИЯ: [ ${savedLastName} ] ✏`);
    });

    // Дата рождения
    const dobText = this.add.text(-120, -36, `ДАТА РОЖДЕНИЯ: [ ${savedDob} ] ✏`, {
      fontSize: '11px', fontFamily: 'monospace', fontStyle: 'bold', color: '#fef08a',
      backgroundColor: '#1e293b', padding: { x: 8, y: 4 }
    }).setInteractive({ useHandCursor: true });

    dobText.on('pointerdown', () => {
      soundEngine.playClick();
      dobIdx = (dobIdx + 1) % dobsList.length;
      savedDob = dobsList[dobIdx];
      localStorage.setItem('adv_dob', savedDob);
      dobText.setText(`ДАТА РОЖДЕНИЯ: [ ${savedDob} ] ✏`);
    });

    // Описание
    const bioTitle = this.add.text(-220, 10, 'ОПИСАНИЕ И ЛОР ГЕРОЯ: [ КЛИКНИТЕ ДЛЯ СМЕНЫ ✏ ]', {
      fontSize: '10px', fontFamily: 'monospace', fontStyle: 'bold', color: '#cbd5e1'
    });

    const bioBox = this.add.rectangle(0, 60, 440, 75, 0x1e293b).setStrokeStyle(2, 0x475569).setInteractive({ useHandCursor: true });
    const bioText = this.add.text(-210, 32, savedBio, {
      fontSize: '11px', fontFamily: 'monospace', color: '#e2e8f0',
      wordWrap: { width: 420 }, lineSpacing: 4
    });

    const cycleBio = () => {
      soundEngine.playClick();
      bioIdx = (bioIdx + 1) % biosList.length;
      savedBio = biosList[bioIdx];
      localStorage.setItem('adv_bio', savedBio);
      bioText.setText(savedBio);
    };

    bioBox.on('pointerdown', cycleBio);

    this.profilePanel.add([
      cardBg, title,
      avatarFrame, this.profileAvatarImage, changeAvatarBtn,
      firstNameText, lastNameText, dobText,
      bioTitle, bioBox, bioText,
      avatarPickerGrid
    ]);
  }

  private showProfilePopup() {
    this.game.events.emit('open-profile-modal');
  }

  private showSettingsPopup() {
    showHTMLSettingsModal(() => {});
  }

  private hideSettingsElements() {
    this.musicVolBtn.setVisible(false);
    this.soundVolBtn.setVisible(false);
    this.openMusicBtn.setVisible(false);
    this.openMusicTxt.setVisible(false);
    this.muteAllBtn.setVisible(false);
    this.ctrlModeBtn.setVisible(false);
  }

  private startGame() {
    soundEngine.playLevelUp();
    const targetX = this.ruinsContainer.x + this.caveEntrance.x * this.ruinsContainer.scaleX;
    const targetY = this.ruinsContainer.y + (this.caveEntrance.y + 10) * this.ruinsContainer.scaleY;

    // Cinematic zoom & pan flying straight inside the dark emerald cave
    this.cameras.main.pan(targetX, targetY, 700, 'Quad.easeInOut');
    this.cameras.main.zoomTo(3.5, 700, 'Quad.easeIn');
    this.cameras.main.fadeOut(750, 0, 0, 0);

    let started = false;
    const proceedToHub = () => {
      if (started) return;
      started = true;
      this.scene.start('HubScene');
    };

    this.cameras.main.once('camerafadeoutcomplete', proceedToHub);
    this.time.delayedCall(800, proceedToHub);
  }

  private handleResize(gameSize: Phaser.Structs.Size) {
    this.layoutElements(gameSize.width, gameSize.height);
  }

  private createTopLeftUserAvatar() {
    if (this.userAvatarContainer) {
      this.userAvatarContainer.destroy();
    }
    const profile = getActiveUserProfile();
    const initY = this.cameras.main.height - 75;

    this.userAvatarContainer = this.add.container(30, initY).setScrollFactor(0).setDepth(1500);

    // 52x52 px square box with rounded corners and neon frame
    const bgBox = this.add.rectangle(26, 26, 52, 52, 0x0f172a)
      .setStrokeStyle(2.5, profile.isGoogle ? 0x22c55e : 0x38bdf8)
      .setInteractive({ useHandCursor: true });

    // Inside avatar
    let icon: Phaser.GameObjects.GameObject;
    if (this.textures.exists(profile.avatar)) {
      icon = this.add.image(26, 26, profile.avatar).setDisplaySize(44, 44);
    } else {
      icon = this.add.text(26, 26, profile.nickname.charAt(0).toUpperCase(), {
        fontSize: '22px', fontFamily: 'monospace', fontStyle: 'bold', color: '#facc15'
      }).setOrigin(0.5);
    }

    // Right of square: Nickname & Rank
    const avatarNameText = this.add.text(62, 14, profile.nickname, {
      fontSize: '13px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffffff'
    }).setOrigin(0, 0.5);

    const avatarRankText = this.add.text(62, 34, `${profile.rank} [${profile.rating}]`, {
      fontSize: '10px', fontFamily: 'monospace', fontStyle: 'bold', color: '#facc15'
    }).setOrigin(0, 0.5);

    bgBox.on('pointerdown', () => {
      soundEngine.playClick();
      this.showProfilePopup();
    });

    this.userAvatarContainer.add([bgBox, icon, avatarNameText, avatarRankText]);

    // Real-time update listener
    const onProfileUpdate = () => {
      const p = getActiveUserProfile();
      if (avatarNameText) avatarNameText.setText(p.nickname);
      if (avatarRankText) avatarRankText.setText(`${p.rank} [${p.rating}]`);
      bgBox.setStrokeStyle(2.5, p.isGoogle ? 0x22c55e : 0x38bdf8);
    };

    window.addEventListener('profile_updated', onProfileUpdate);

    const onShopClose = () => {
      this.createTopLeftUserAvatar();
    };
    this.game.events.on('close-shop-modal', onShopClose);

    const onTriggerLootbox = (data: { chestType: 'coffin' | 'sarcophagus' }) => {
      new LootboxModal(this, data.chestType, () => {
        this.game.events.emit('open-shop-modal');
      });
    };
    this.game.events.on('trigger-lootbox-open', onTriggerLootbox);

    this.events.once('shutdown', () => {
      window.removeEventListener('profile_updated', onProfileUpdate);
      this.game.events.off('close-shop-modal', onShopClose);
      this.game.events.off('trigger-lootbox-open', onTriggerLootbox);
    });
  }
}
