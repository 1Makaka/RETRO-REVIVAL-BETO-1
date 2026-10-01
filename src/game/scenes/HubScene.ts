/**
 * Frantic Battles - HubScene (Game World, Heroes Altar, Combat & Matchmaking)
 */

import Phaser from 'phaser';
import { generateAllTextures } from '../pixelArt';
import { HEROES, HeroData } from '../players';
import { soundEngine } from '../audio';
import { RoomManager, GameRoom } from '../roomManager';
import { showHTMLInputModal, showHTMLPauseModal, showHTMLDungeonLobbyModal, showHTMLPvPLobbyModal, showHTMLDungeonSelectionModal } from '../../utils/domInput';
import { getCustomControlsLayout, getShowAttackRange, DEFAULT_CONTROLS_LAYOUT } from '../../utils/customControls';
import { RankedModal } from '../RankedModal';
import { CustomRoomLobby } from '../moba/CustomRoomLobby';
import { ShopModal } from '../ShopModal';
import { HeroSelectModal } from '../HeroSelectModal';
import { LootboxModal } from '../LootboxModal';
import { loadEconomy, loadRoster, getHeroStatMultipliers } from '../economy';
import { SocialHUD } from '../SocialHUD';
import { NoticeBoardModal } from '../NoticeBoardModal';
import { getActiveUserProfile } from '../firebase';

export class HubScene extends Phaser.Scene {
  // Player
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private selectedHeroKey = 'char_zaza';
  private tempHeroKey = 'char_zaza';
  private isMonster = false;
  private monsterTimer = 0;
  private playerHp = 1000;
  private playerMaxHp = 1000;
  private playerSpeed = 290;
  private damageMultiplier = 1.0;
  private playerWeaponVisual!: Phaser.GameObjects.Image;
  private torfShieldAura: Phaser.GameObjects.Arc | null = null;
  private torfShieldBorder: Phaser.GameObjects.Arc | null = null;
  private torfShieldTween: Phaser.Tweens.Tween | null = null;

  // HP Bar & combat
  private hpBarBg!: Phaser.GameObjects.Rectangle;
  private hpBarFill!: Phaser.GameObjects.Rectangle;
  private nameLabel!: Phaser.GameObjects.Text;

  // Currency HUD
  private currencyHUDContainer!: Phaser.GameObjects.Container;
  private currencyTextSkulls!: Phaser.GameObjects.Text;
  private currencyTextShards!: Phaser.GameObjects.Text;
  private currencyTextUpgrade!: Phaser.GameObjects.Text;
  private currencyTextRanked!: Phaser.GameObjects.Text;
  private currencyUpdateListener?: (e: Event) => void;

  // Cooldowns
  private cds: Record<string, number> = { attack: 0, s1: 0, s2: 0, ult: 0 };
  private cdMax: Record<string, number> = { attack: 350, s1: 3000, s2: 4500, ult: 14000 };

  // Environment & Enemies
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private dummyGroup!: Phaser.Physics.Arcade.StaticGroup;
  private botsGroup!: Phaser.Physics.Arcade.Group;
  private interactables: Array<{ x: number; y: number; text: string; action: string }> = [];
  private currentInteractable: { x: number; y: number; text: string; action: string } | null = null;
  private interactPromptUI!: Phaser.GameObjects.Text;

  // Remastered Building sprites
  private buildPortal!: Phaser.GameObjects.Image;
  private buildArena!: Phaser.GameObjects.Image;
  private buildAltar!: Phaser.GameObjects.Image;
  private buildTavern!: Phaser.GameObjects.Image;
  private buildShop!: Phaser.GameObjects.Image;
  private buildNotice!: Phaser.GameObjects.Image;

  // Minimap (110x110 HUD with Pixel Micro-Icons)
  private minimapContainer!: Phaser.GameObjects.Container;
  private minimapGfx!: Phaser.GameObjects.Graphics;
  private minimapPlayerIcon!: Phaser.GameObjects.Image;
  private minimapPoiIcons: Phaser.GameObjects.Image[] = [];
  private minimapTooltipContainer!: Phaser.GameObjects.Container;
  private minimapTooltipText!: Phaser.GameObjects.Text;

  // Mobile Controls & Red Aim Joystick
  private isPC = false;
  private isAnyModalOpen: boolean = false;
  private joyStickBase!: Phaser.GameObjects.Arc;
  private joyStickThumb!: Phaser.GameObjects.Arc;
  private joyStickPointerId: number | null = null;
  private joyStickVector = new Phaser.Math.Vector2(0, 0);
  private joyStickOrigin = new Phaser.Math.Vector2(0, 0);

  private aimJoyBase!: Phaser.GameObjects.Arc;
  private aimJoyThumb!: Phaser.GameObjects.Arc;
  private aimJoyPointerId: number | null = null;
  private aimJoyMoved: boolean = false;
  private aimJoyVector = new Phaser.Math.Vector2(0, 0);
  private aimVector = new Phaser.Math.Vector2(1, 0);
  private aimLineGfx!: Phaser.GameObjects.Graphics;

  // Combat buttons
  private combatElements: Phaser.GameObjects.GameObject[] = [];
  private btnAttack!: Phaser.GameObjects.Arc;
  private txtAttack!: Phaser.GameObjects.Text;
  private cdAttackOverlay!: Phaser.GameObjects.Arc;

  private btnS1!: Phaser.GameObjects.Arc;
  private iconS1!: Phaser.GameObjects.Image;
  private lblS1!: Phaser.GameObjects.Text;
  private cdS1Overlay!: Phaser.GameObjects.Arc;
  private cdS1Txt!: Phaser.GameObjects.Text;

  private btnS2!: Phaser.GameObjects.Arc;
  private iconS2!: Phaser.GameObjects.Image;
  private lblS2!: Phaser.GameObjects.Text;
  private cdS2Overlay!: Phaser.GameObjects.Arc;
  private cdS2Txt!: Phaser.GameObjects.Text;

  private btnUlt!: Phaser.GameObjects.Arc;
  private iconUlt!: Phaser.GameObjects.Image;
  private lblUlt!: Phaser.GameObjects.Text;
  private cdUltOverlay!: Phaser.GameObjects.Arc;
  private cdUltTxt!: Phaser.GameObjects.Text;

  // Keyboard
  private cursors!: {
    W: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
    UP: Phaser.Input.Keyboard.Key;
    DOWN: Phaser.Input.Keyboard.Key;
    LEFT: Phaser.Input.Keyboard.Key;
    RIGHT: Phaser.Input.Keyboard.Key;
  };
  private keyAttack!: Phaser.Input.Keyboard.Key;
  private keyS1!: Phaser.Input.Keyboard.Key;
  private keyS2!: Phaser.Input.Keyboard.Key;
  private keyUlt!: Phaser.Input.Keyboard.Key;

  // --- HEROES ALTAR: TWO-STEP SELECTION MODAL ---
  private isHeroMenuOpen = false;
  private isHeroDetailOpen = false;
  private heroOverlay!: Phaser.GameObjects.Rectangle;
  private altarBg!: Phaser.GameObjects.Rectangle;
  private rosterScrollY = 0;
  private maxRosterScrollY = 0;
  private rosterUpBtn!: Phaser.GameObjects.Rectangle;
  private rosterUpText!: Phaser.GameObjects.Text;
  private rosterDownBtn!: Phaser.GameObjects.Rectangle;
  private rosterDownText!: Phaser.GameObjects.Text;
  private rosterHintText!: Phaser.GameObjects.Text;

  // View 1 (Roster Previews)
  private rosterGroup: Phaser.GameObjects.GameObject[] = [];
  private rosterCards: Array<{
    bg: Phaser.GameObjects.Rectangle;
    banner: Phaser.GameObjects.Rectangle;
    portrait: Phaser.GameObjects.Image;
    nameText: Phaser.GameObjects.Text;
    rarityText: Phaser.GameObjects.Text;
    statsText: Phaser.GameObjects.Text;
    statusText: Phaser.GameObjects.Text;
    pedestalOuter: Phaser.GameObjects.Ellipse;
    pedestalInner: Phaser.GameObjects.Ellipse;
    key: string;
    row: number;
    col: number;
  }> = [];

  // View 2 (Detail View)
  private detailGroup: Phaser.GameObjects.GameObject[] = [];
  private detailPedestalOuter!: Phaser.GameObjects.Ellipse;
  private detailPedestal!: Phaser.GameObjects.Ellipse;
  private detailHeroSprite!: Phaser.GameObjects.Image;
  private detailHeroName!: Phaser.GameObjects.Text;
  private detailHeroRarityBadgeBg!: Phaser.GameObjects.Rectangle;
  private detailHeroRarity!: Phaser.GameObjects.Text;
  private detailHeroTitleBoxBg!: Phaser.GameObjects.Rectangle;
  private detailHeroTitle!: Phaser.GameObjects.Text;
  private detailHeroAttackBoxBg!: Phaser.GameObjects.Rectangle;
  private detailHeroAttackDesc!: Phaser.GameObjects.Text;
  private detailHeroStatsBoxBg!: Phaser.GameObjects.Rectangle;
  private detailHeroStats!: Phaser.GameObjects.Text;
  private detailSkillSquareButtons: Array<{
    bg: Phaser.GameObjects.Rectangle;
    icon: Phaser.GameObjects.Image;
    label: Phaser.GameObjects.Text;
  }> = [];
  private detailSkillNameBoxBg!: Phaser.GameObjects.Rectangle;
  private detailSkillTitle!: Phaser.GameObjects.Text;
  private detailSkillCdBoxBg!: Phaser.GameObjects.Rectangle;
  private detailSkillMeta!: Phaser.GameObjects.Text;
  private detailSkillDescBox!: Phaser.GameObjects.Rectangle;
  private detailSkillDesc!: Phaser.GameObjects.Text;
  private detailSelectBtn!: Phaser.GameObjects.Rectangle;
  private detailSelectText!: Phaser.GameObjects.Text;
  private currentDetailSkillIndex: number = 0;

  // --- MATCHMAKING & LOBBY MODAL (Flat Scene GameObjects for 100% reliable clicks) ---
  private isLobbyOpen = false;
  private lobbyOverlay!: Phaser.GameObjects.Rectangle;
  private lobbyBg!: Phaser.GameObjects.Rectangle;
  private lobbyTitle!: Phaser.GameObjects.Text;
  private lobbyBackBtn!: Phaser.GameObjects.Text;
  private lobbyCloseBtn!: Phaser.GameObjects.Text;
  private lobbyBaseGroup: Phaser.GameObjects.GameObject[] = [];

  // Portal View Hierarchies
  private lobbyView: 'portal_root' | 'pvp_modes' | 'casual' | 'ranked' | 'dungeon_modes' | 'dungeon_online_choice' | 'dungeon_create' | 'dungeon_servers' = 'portal_root';
  private portalRootGroup: Phaser.GameObjects.GameObject[] = [];
  private pvpModesGroup: Phaser.GameObjects.GameObject[] = [];
  private rankedGroup: Phaser.GameObjects.GameObject[] = [];
  private casualGroup: Phaser.GameObjects.GameObject[] = [];
  private searchGroup: Phaser.GameObjects.GameObject[] = [];
  private dungeonModesGroup: Phaser.GameObjects.GameObject[] = [];
  private dungeonOnlineChoiceGroup: Phaser.GameObjects.GameObject[] = [];
  private dungeonCreateGroup: Phaser.GameObjects.GameObject[] = [];
  private dungeonServersGroup: Phaser.GameObjects.GameObject[] = [];

  private currentPersonalCode: string = 'DG-7429';
  private currentRoomName: string = 'Подземелье Зазы';
  private roomPassword: string = '';
  private maxPlayersLimit: number = 4;
  private isPrivateRoom: boolean = false;
  private isQuickCodeMode: boolean = true;
  private btnTypeToggleBg!: Phaser.GameObjects.Rectangle;
  private btnTypeToggleTxt!: Phaser.GameObjects.Text;
  private btnGenCodeBg!: Phaser.GameObjects.Rectangle;
  private btnGenCodeText!: Phaser.GameObjects.Text;
  private personalCodeDisplay!: Phaser.GameObjects.Text;
  private roomNameDisplay!: Phaser.GameObjects.Text;
  private roomPassDisplay!: Phaser.GameObjects.Text;
  private emptyServersText!: Phaser.GameObjects.Text;
  private dungeonServerRows: Array<{ label: Phaser.GameObjects.Text; btn: Phaser.GameObjects.Text; bg: Phaser.GameObjects.Rectangle; code: string }> = [];

  private serverSearchQuery: string = '';
  private serverScrollIndex: number = 0;
  private pauseModalElements: Phaser.GameObjects.GameObject[] = [];

  private serverLabels: Phaser.GameObjects.Text[] = [];
  private matchmakingSearchText!: Phaser.GameObjects.Text;
  private matchmakingTimer: Phaser.Time.TimerEvent | null = null;
  private pvpSearchFilter: string = '';
  private isRankedModalOpen: boolean = false;
  private torfCancelBadgeS2: Phaser.GameObjects.Container | null = null;
  private lobbyScroll = 0;

  // Active attacks
  private activeClub: Phaser.GameObjects.Rectangle | null = null;
  private activeAxe: Phaser.GameObjects.Rectangle | null = null;
  private torfStoneSkin: boolean = false;
  private torfInvulnerable: boolean = false;
  private isUltChanneling: boolean = false;
  private alrikShieldActive: boolean = false;
  private alrikShieldAngle: number = 0;
  private alrikShieldGfx: Phaser.GameObjects.Rectangle | null = null;
  private alrikUltStabCd: number = 0;
  private aimTouchStartX: number = 0;
  private aimTouchStartY: number = 0;
  private aimTouchStartTime: number = 0;
  private attackFacingTimer: number = 0;
  private skillAimGfx!: Phaser.GameObjects.Graphics;
  private aimingSkillSlot: 's1' | 's2' | 'ult' | null = null;
  private skillAimVector = new Phaser.Math.Vector2(0, 0);
  private skillAimPointerId: number | null = null;
  private skillAimTouchStartX: number = 0;
  private skillAimTouchStartY: number = 0;
  private skillAimBtnOriginX: number = 0;
  private skillAimBtnOriginY: number = 0;
  private skillAimIsCancel: boolean = false;
  private cancelAimZoneContainer!: Phaser.GameObjects.Container;
  private cancelAimZoneBg!: Phaser.GameObjects.Arc;
  private activeAimBtnTarget: Phaser.GameObjects.Arc | null = null;
  private weaponThrustDist: number = 0;
  private weaponSwingAngle: number = 0;
  private weaponAttackAngle: number = 0;

  constructor() {
    super({ key: 'HubScene' });
  }

  init(data?: { selectedHeroKey?: string }) {
    if (data?.selectedHeroKey) {
      this.selectedHeroKey = data.selectedHeroKey;
      this.tempHeroKey = data.selectedHeroKey;
    }
    // Always restore peaceful hub / ambient track when returning to hub
    soundEngine.setDungeonMusicState('ambient');
  }

  preload() {
    generateAllTextures(this);
  }

  create() {
    // Restore normal ambient music state on entering hub
    soundEngine.setDungeonMusicState('ambient');
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Reset camera & state cleanly
    this.cameras.main.setZoom(1.0);
    this.cameras.main.resetFX();
    this.cameras.main.fadeIn(400, 0, 0, 0);
    this.cameras.main.setRoundPixels(true); // Full liquidation of blurriness!

    const mapW = 1600;
    const mapH = 1600;
    this.physics.world.setBounds(0, 0, mapW, mapH);

    // 1. World Tiles
    this.add.tileSprite(mapW / 2, mapH / 2, mapW, mapH, 'tile_floor');

    // Procedural Cobblestone Paths & Plaza (Full remastered top-down detail!)
    const pathGfx = this.add.graphics();
    pathGfx.setDepth(1);

    // Central Cobblestone plaza circular paving
    pathGfx.fillStyle(0x3a342c, 1.0);
    pathGfx.fillCircle(800, 800, 110);
    pathGfx.lineStyle(3, 0x1f1a14, 1.0);
    pathGfx.strokeCircle(800, 800, 110);

    // Fine concentric pavement detail lines
    pathGfx.lineStyle(1.5, 0x25201a, 0.85);
    for (let r = 20; r <= 100; r += 20) {
      pathGfx.strokeCircle(800, 800, r);
    }

    const nodes = [
      { x: 480, y: 520 },   // Dungeon Portal (Top-Left)
      { x: 1120, y: 520 },  // PVP Arena (Top-Right)
      { x: 480, y: 1080 },  // Tavern (Bottom-Left)
      { x: 1120, y: 1080 }, // Shop (Bottom-Right)
      { x: 800, y: 1150 }   // Notice Board (Bottom-Center)
    ];

    // Main thick paved paths
    pathGfx.lineStyle(46, 0x3a342c, 1.0);
    nodes.forEach(n => {
      pathGfx.lineBetween(800, 800, n.x, n.y);
    });

    // Dark cobblestone pathway border lines
    pathGfx.lineStyle(2.5, 0x1f1a14, 1.0);
    nodes.forEach(n => {
      const dx = n.x - 800;
      const dy = n.y - 800;
      const len = Math.hypot(dx, dy);
      if (len > 0) {
        const nx = -dy / len;
        const ny = dx / len;
        const offset = 23;
        pathGfx.lineBetween(800 + nx * offset, 800 + ny * offset, n.x + nx * offset, n.y + ny * offset);
        pathGfx.lineBetween(800 - nx * offset, 800 - ny * offset, n.x - nx * offset, n.y - ny * offset);
      }
    });

    // Dotted center lines representing rough worn stone graveling
    pathGfx.lineStyle(3, 0x4a4338, 0.9);
    nodes.forEach(n => {
      pathGfx.lineBetween(800, 800, n.x, n.y);
    });

    // Draw little stone details along the roads
    pathGfx.fillStyle(0x4a4338, 0.8);
    for (let i = 0; i < 40; i++) {
      const rx = Phaser.Math.Between(150, mapW - 150);
      const ry = Phaser.Math.Between(150, mapH - 150);
      pathGfx.fillRect(rx, ry, Phaser.Math.Between(4, 8), Phaser.Math.Between(4, 8));
    }

    // 2. Fortress Stone Perimeter Walls
    this.walls = this.physics.add.staticGroup();
    for (let i = 0; i < mapW; i += 64) {
      this.walls.create(i + 32, 32, 'wall');
      this.walls.create(i + 32, mapH - 32, 'wall');
      this.walls.create(32, i + 32, 'wall');
      this.walls.create(mapW - 32, i + 32, 'wall');
    }

    // 3. Spawning 6 Detailed Buildings with exact crisp rendering
    
    // Building 1: DUNGEON PORTAL (Top-Left)
    this.buildPortal = this.add.image(480, 520, 'build_dungeon_portal').setDepth(2).setOrigin(0.5);
    
    // Void swirl disk inside arch
    const vortex = this.add.circle(480, 510, 24, 0x120024).setDepth(2.1);
    const vortexInner = this.add.circle(480, 510, 12, 0x86198f).setDepth(2.2);
    this.tweens.add({
      targets: [vortex, vortexInner],
      alpha: 0.65,
      scale: 1.15,
      duration: 1300,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Building 2: PVP Battle Arena (Top-Right)
    this.buildArena = this.add.image(1120, 520, 'build_pvp_arena').setDepth(2).setOrigin(0.5);
    
    // Glowing torch indicators
    const blueTorch = this.add.circle(1120 - 45, 520 + 5, 20, 0x38bdf8, 0.22).setDepth(2.1);
    const redTorch = this.add.circle(1120 + 45, 520 + 5, 20, 0xef4444, 0.22).setDepth(2.1);
    this.tweens.add({
      targets: [blueTorch, redTorch],
      alpha: 0.48,
      scale: 1.3,
      duration: 950,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Building 3: Altar of Heroes (Center Hub)
    this.buildAltar = this.add.image(800, 770, 'build_hero_altar').setDepth(2).setOrigin(0.5);
    
    const altarGlow = this.add.circle(800, 755, 36, 0x38bdf8, 0.16).setDepth(1.9);
    this.tweens.add({
      targets: altarGlow,
      alpha: 0.38,
      scale: 1.25,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Building 4: Tavern "Drunken Gryphon" (Bottom-Left)
    this.buildTavern = this.add.image(480, 1080, 'build_tavern').setDepth(2).setOrigin(0.5);
    
    // Smoke coming from the chimney (cozy detailed effect)
    this.time.addEvent({
      delay: 550,
      loop: true,
      callback: () => {
        if (!this.scene.isActive('HubScene')) return;
        const smoke = this.add.circle(480 + 28, 1080 - 42, 3.5, 0xa1a1aa, 0.42).setDepth(2.5);
        this.tweens.add({
          targets: smoke,
          x: smoke.x + Phaser.Math.Between(-14, 14),
          y: smoke.y - Phaser.Math.Between(36, 64),
          scale: 3.2,
          alpha: 0,
          duration: 1400,
          onComplete: () => smoke.destroy()
        });
      }
    });

    // Building 5: Merchant Stall / Shop (Bottom-Right)
    this.buildShop = this.add.image(1120, 1080, 'build_merchant_stall').setDepth(2).setOrigin(0.5);
    
    const shopLantern = this.add.circle(1120 + 45, 1080 - 25, 28, 0xfacc15, 0.16).setDepth(1.5);
    this.tweens.add({
      targets: shopLantern,
      alpha: 0.34,
      scale: 1.2,
      duration: 1250,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Building 6: Notice Board (Bottom-Center)
    this.buildNotice = this.add.image(800, 1150, 'build_notice_board').setDepth(2).setOrigin(0.5);

    // 3.1 Crisp Name Plates (Resolution 2+, with outline, no blur!)
    const res = Math.max(window.devicePixelRatio || 1, 2);
    const nameStyle = {
      fontSize: '20px',
      fontFamily: '"VT323", "Courier New", monospace',
      fontStyle: 'bold',
      color: '#f8fafc',
      stroke: '#0f172a',
      strokeThickness: 3
    };
    this.add.text(800, 705, '✦ АЛТАРЬ ГЕРОЕВ ✦', nameStyle).setOrigin(0.5).setDepth(3).setResolution(res);
    this.add.text(480, 435, '🌀 ПОРТАЛ В ПОДЗЕМЕЛЬЕ 🌀', nameStyle).setOrigin(0.5).setDepth(3).setResolution(res);
    this.add.text(1120, 435, '⚔️ PVP АРЕНА БИТВ ⚔️', nameStyle).setOrigin(0.5).setDepth(3).setResolution(res);
    this.add.text(480, 1005, '🍺 ТАВЕРНА "ПЬЯНЫЙ ГРИФОН"', nameStyle).setOrigin(0.5).setDepth(3).setResolution(res);
    this.add.text(1120, 1010, '🛒 ГОРОДСКОЙ МАГАЗИН', nameStyle).setOrigin(0.5).setDepth(3).setResolution(res);
    this.add.text(800, 1095, '📋 ДОСКА ОБЪЯВЛЕНИЙ', nameStyle).setOrigin(0.5).setDepth(3).setResolution(res);

    // 3.2 Atmospheric Pulsing Floor Indicators Under Buildings (Depth 1.1)
    const bases = [
      { x: 800, y: 800, color: 0x38bdf8 },   // Altar
      { x: 480, y: 550, color: 0xa21caf },   // Portal
      { x: 1120, y: 550, color: 0xef4444 },  // PVP Arena
      { x: 480, y: 1110, color: 0xf59e0b },  // Tavern
      { x: 1120, y: 1110, color: 0xfacc15 }, // Shop
      { x: 800, y: 1170, color: 0x38bdf8 }   // Notice Board
    ];
    bases.forEach(b => {
      const floorIndicator = this.add.ellipse(b.x, b.y, 74, 26, b.color, 0.12).setDepth(1.1);
      this.tweens.add({
        targets: floorIndicator,
        alpha: 0.3,
        scaleX: 1.12,
        scaleY: 1.12,
        duration: 1350,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    });

    // 3.3 Path Stone Lanterns with Glowing Breathing Orbs of Light
    const lanterns = [
      { x: 640 - 20, y: 660 + 20 },
      { x: 960 + 20, y: 660 + 20 },
      { x: 640 - 20, y: 940 - 20 },
      { x: 960 + 20, y: 940 - 20 },
      { x: 800 - 32, y: 975 }
    ];
    lanterns.forEach((l, idx) => {
      this.add.rectangle(l.x, l.y, 10, 16, 0x44403c).setDepth(2);
      this.add.rectangle(l.x, l.y - 12, 14, 10, 0x78716c).setDepth(2);
      this.add.circle(l.x, l.y - 12, 5, 0xfacc15).setDepth(2.1);
      
      const glow = this.add.circle(l.x, l.y - 12, 45, 0xfacc15, 0.16).setDepth(1.5);
      this.tweens.add({
        targets: glow,
        alpha: 0.32,
        scale: 1.15,
        duration: 1100 + idx * 250,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    });

    // Interactive Trigger zones matching remastered positions exactly
    this.interactables = [
      { x: 800, y: 800, text: '[ АЛТАРЬ: ВЫБРАТЬ ГЕРОЯ ]', action: 'altar' },
      { x: 480, y: 550, text: '[ ПОРТАЛ: ПОДЗЕМЕЛЬЕ ]', action: 'dungeon_portal' },
      { x: 1120, y: 550, text: '[ АРЕНА: PVP БИТВЫ ]', action: 'pvp_arena' },
      { x: 480, y: 1110, text: '[ ТАВЕРНА: ОТДЫХ И СБОР ]', action: 'tavern' },
      { x: 1120, y: 1110, text: '[ ТОРГОВЕЦ: КУПИТЬ ПРЕДМЕТЫ ]', action: 'shop' },
      { x: 800, y: 1170, text: '[ ДОСКА: ЧИТАТЬ НОВОСТИ ]', action: 'news' }
    ];

    // 4. Practice Training Dummies & Bots Group in the courtyard
    this.dummyGroup = this.physics.add.staticGroup();
    this.botsGroup = this.physics.add.group();
    this.physics.add.collider(this.botsGroup, this.walls);

    const dummy1 = this.dummyGroup.create(mapW / 2 - 200, mapH / 2 - 120, 'target_dummy');
    dummy1.hp = 1500;
    const dummy2 = this.dummyGroup.create(mapW / 2 + 200, mapH / 2 - 120, 'target_dummy');
    dummy2.hp = 1500;

    this.add.text(mapW / 2 - 200, mapH / 2 - 165, 'ТРЕНИРОВОЧНЫЙ МАСТЕРА', {
      fontSize: '18px',
      fontFamily: '"VT323", "Courier New", monospace',
      color: '#facc15'
    }).setOrigin(0.5).setDepth(2).setResolution(res);
    this.add.text(mapW / 2 + 200, mapH / 2 - 165, 'ТРЕНИРОВОЧНЫЙ МАСТЕРА', {
      fontSize: '18px',
      fontFamily: '"VT323", "Courier New", monospace',
      color: '#facc15'
    }).setOrigin(0.5).setDepth(2).setResolution(res);

    // 5. Spawn Player Character
    const savedHero = localStorage.getItem('fb_current_hero') || 'char_zaza';
    this.selectedHeroKey = savedHero;
    this.tempHeroKey = savedHero;
    const heroConfig = HEROES[this.selectedHeroKey];
    this.playerHp = heroConfig.hp;
    this.playerMaxHp = heroConfig.hp;
    this.playerSpeed = heroConfig.speed;

    this.player = this.physics.add.sprite(mapW / 2, mapH - 280, heroConfig.texture).setDepth(50);
    this.player.setCollideWorldBounds(true);
    if (this.player.body) {
      this.player.setDamping(false);
      this.player.setDrag(0, 0);
      this.player.setFriction(0, 0);
    }
    if (this.selectedHeroKey === 'char_kraul' && this.player.body) {
      this.player.body.setSize(this.player.width * 0.7, this.player.height * 0.7);
    }
    this.physics.add.collider(this.player, this.walls);

    // Screen & Orientation Resize Listener
    this.scale.on('resize', this.handleResize, this);

    const onModalOpen = () => this.setModalOpenState(true);
    const onModalClose = () => this.setModalOpenState(false);

    this.game.events.on('modal-opened', onModalOpen);
    this.game.events.on('modal-closed', onModalClose);
    this.game.events.on('open-hero-select-modal', onModalOpen);
    this.game.events.on('close-hero-select-modal', onModalClose);
    this.game.events.on('open-shop-modal', onModalOpen);
    this.game.events.on('close-shop-modal', onModalClose);
    this.game.events.on('open-profile-modal', onModalOpen);
    this.game.events.on('close-profile-modal', onModalClose);

    const onTriggerLootbox = () => {
      this.setModalOpenState(true);
    };
    this.game.events.on('trigger-lootbox-open', onTriggerLootbox);

    this.events.once('shutdown', () => {
      this.scale.off('resize', this.handleResize, this);
      this.game.events.off('modal-opened', onModalOpen);
      this.game.events.off('modal-closed', onModalClose);
      this.game.events.off('open-hero-select-modal', onModalOpen);
      this.game.events.off('close-hero-select-modal', onModalClose);
      this.game.events.off('open-shop-modal', onModalOpen);
      this.game.events.off('close-shop-modal', onModalClose);
      this.game.events.off('open-profile-modal', onModalOpen);
      this.game.events.off('close-profile-modal', onModalClose);
      this.game.events.off('trigger-lootbox-open', onTriggerLootbox);
    });

    let initWeaponTex = 'weapon_stick';
    if (this.selectedHeroKey === 'char_grim') initWeaponTex = 'weapon_flask_launcher';
    else if (this.selectedHeroKey === 'char_bjorn') initWeaponTex = 'weapon_battleaxe';
    else if (this.selectedHeroKey === 'char_torf') initWeaponTex = 'weapon_boulder';
    else if (this.selectedHeroKey === 'char_omen') initWeaponTex = 'weapon_feather_darts';
    else if (this.selectedHeroKey === 'char_nihil') initWeaponTex = 'proj_nihil_sickle';
    else if (this.selectedHeroKey === 'char_alrik') initWeaponTex = 'weapon_spear';
    else if (this.selectedHeroKey === 'char_kraul') initWeaponTex = 'weapon_kraul_whips';
    this.playerWeaponVisual = this.add.image(this.player.x, this.player.y, initWeaponTex)
      .setDepth(51).setVisible(this.selectedHeroKey !== 'char_kraul' && this.selectedHeroKey !== 'char_nihil');
    this.skillAimGfx = this.add.graphics().setDepth(298);

    // Overhead HP Bar
    this.hpBarBg = this.add.rectangle(0, 0, 48, 7, 0x000000).setDepth(150);
    this.hpBarFill = this.add.rectangle(0, 0, 46, 5, 0x22c55e).setOrigin(0, 0.5).setDepth(150);
    const profile = getActiveUserProfile();
    this.nameLabel = this.add.text(0, 0, profile.nickname || heroConfig.name, {
      fontSize: '16px',
      fontFamily: '"VT323", "Courier New", monospace',
      fontStyle: 'bold',
      color: heroConfig.colorHex
    }).setOrigin(0.5).setDepth(150).setResolution(res);

    // Camera follow player with instant responsive tracking (zero lerp lag)
    this.cameras.main.setBounds(0, 0, mapW, mapH);
    this.cameras.main.startFollow(this.player, true, 1, 1);
    this.cameras.main.roundPixels = true;

    // 6. Pause Button || (Top-Left Corner)
    const pauseBtn = this.add.text(36, 30, '||', {
      fontSize: '24px', fontFamily: '"VT323", "Courier New", monospace', fontStyle: 'bold', color: '#ffffff',
      backgroundColor: '#334155', padding: { x: 14, y: 4 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(300).setInteractive({ useHandCursor: true }).setResolution(res);

    pauseBtn.on('pointerdown', () => {
      this.openPauseModal();
    });

    // Interaction Prompt at bottom center
    this.interactPromptUI = this.add.text(width / 2, height - 35, '', {
      fontSize: '20px',
      fontFamily: '"VT323", "Courier New", monospace',
      fontStyle: 'bold',
      color: '#ffffff',
      backgroundColor: '#0f172a',
      padding: { x: 14, y: 6 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(300).setInteractive({ useHandCursor: true }).setResolution(res);

    this.interactPromptUI.on('pointerdown', () => {
      this.handleCurrentInteraction();
    });

    // 7. Circular Minimap
    this.createMinimap(width);

    // 7.5 Economy Currency HUD (Top-Right)
    this.createCurrencyHUD(width);

    // 8. Virtual Joystick & Touch Controls
    this.isPC = this.registry.get('isPC') || false;
    this.setupControls(width, height);

    // 9. Combat Buttons (Attack, Skill 1, Skill 2, Ult)
    this.setupCombatUI(width, height);

    // 10. Modals: Heroes Altar & Matchmaking Gates & Music Modal & Tavern & News
    this.buildHeroAltarModal(width, height);
    this.buildLobbyGateModal(width, height);
    this.buildMusicModal(width, height);
    this.buildTavernModal(width, height);
    this.buildNewsModal(width, height);

    // Post-update: keep overhead health bars & active attack weapons synced
    this.events.on('postupdate', () => {
      this.hpBarBg.setPosition(this.player.x, this.player.y - 42);
      this.hpBarFill.setPosition(this.player.x - 23, this.player.y - 42);
      this.nameLabel.setPosition(this.player.x, this.player.y - 54);

      if (this.activeClub && this.activeClub.active) {
        this.activeClub.setPosition(this.player.x, this.player.y);
      }
      if (this.activeAxe && this.activeAxe.active) {
        this.activeAxe.setPosition(this.player.x, this.player.y);
        this.player.angle = this.activeAxe.angle;
      }
    });
  }

  // --- MINIMAP (110x110 HUD WITH PIXEL MICRO-ICONS) ---
  private createMinimap(width: number) {
    const size = 110;
    const capsuleH = 32;
    // Strictly BELOW the currency capsule with 15px gap
    const isPortrait = this.cameras.main.height > width;
    const miniX = isPortrait ? Math.round(width / 2) : Math.round(width - 20 - size / 2);
    const miniY = Math.round(20 + capsuleH + 15 + size / 2);

    this.minimapContainer = this.add.container(miniX, miniY).setScrollFactor(0).setDepth(2900);

    // Compact square 110x110 with thin metal frame (#334155) and dark semi-transparent background (#080c14, 0.8)
    const bg = this.add.rectangle(0, 0, size, size, 0x080c14, 0.8)
      .setStrokeStyle(1, 0x334155);
    
    this.minimapGfx = this.add.graphics();

    // Player arrow micro-icon (rotating with facing/movement angle)
    this.minimapPlayerIcon = this.add.image(0, 0, 'micro_icon_player').setDisplaySize(12, 12).setDepth(5);

    // Tooltip for POIs
    this.minimapTooltipContainer = this.add.container(0, -size / 2 - 12).setVisible(false).setDepth(10);
    const tooltipBg = this.add.rectangle(0, 0, 96, 18, 0x090d16, 0.95).setStrokeStyle(1, 0x1e293b);
    this.minimapTooltipText = this.add.text(0, 0, '', {
      fontSize: '10px',
      fontFamily: 'Consolas, monospace',
      fontStyle: 'bold',
      color: '#facc15',
      resolution: 2
    }).setOrigin(0.5);
    this.minimapTooltipContainer.add([tooltipBg, this.minimapTooltipText]);

    this.minimapContainer.add([bg, this.minimapGfx, this.minimapPlayerIcon, this.minimapTooltipContainer]);

    // Setup POI interactive micro-icons (12x12 px with 1px outline)
    const pois = [
      { name: 'ТАВЕРНА', worldX: 480, worldY: 1080, tex: 'micro_icon_tavern' },
      { name: 'ПОДЗЕМЕЛЬЕ', worldX: 480, worldY: 520, tex: 'micro_icon_dungeon' },
      { name: 'АЛТАРЬ ГЕРОЕВ', worldX: 800, worldY: 770, tex: 'micro_icon_altar' },
      { name: 'PVP АРЕНА', worldX: 1120, worldY: 520, tex: 'micro_icon_arena' },
      { name: 'МАСТЕРСКАЯ', worldX: 1120, worldY: 1080, tex: 'micro_icon_workshop' }
    ];

    this.minimapPoiIcons = pois.map(poi => {
      const img = this.add.image(0, 0, poi.tex).setDisplaySize(12, 12).setDepth(4).setInteractive({ useHandCursor: true });
      img.setData('poi', poi);
      img.on('pointerover', () => {
        this.minimapTooltipText.setText(`[ ${poi.name} ]`);
        tooltipBg.width = this.minimapTooltipText.width + 12;
        this.minimapTooltipContainer.setVisible(true);
      });
      img.on('pointerout', () => {
        this.minimapTooltipContainer.setVisible(false);
      });
      this.minimapContainer.add(img);
      return img;
    });

    this.updateMinimapRadar();
  }

  private updateMinimapRadar() {
    if (!this.minimapGfx || !this.player) return;
    this.minimapGfx.clear();

    // Subtle radar crosshair grid
    this.minimapGfx.lineStyle(1, 0x1e293b, 0.4);
    this.minimapGfx.lineBetween(-48, 0, 48, 0);
    this.minimapGfx.lineBetween(0, -48, 0, 48);

    const miniSize = 110;
    const halfSize = miniSize / 2 - 8;
    const scale = 0.055;

    // Update POI micro-icons relative to player position
    this.minimapPoiIcons.forEach(icon => {
      const poi = icon.getData('poi');
      if (!poi) return;
      const dx = (poi.worldX - this.player.x) * scale;
      const dy = (poi.worldY - this.player.y) * scale;

      const clampedX = Phaser.Math.Clamp(dx, -halfSize, halfSize);
      const clampedY = Phaser.Math.Clamp(dy, -halfSize, halfSize);
      icon.setPosition(Math.round(clampedX), Math.round(clampedY));
    });

    // Update player arrow rotation
    if (this.minimapPlayerIcon) {
      if (this.player.body && (this.player.body.velocity.x !== 0 || this.player.body.velocity.y !== 0)) {
        this.minimapPlayerIcon.setRotation(Math.atan2(this.player.body.velocity.y, this.player.body.velocity.x) + Math.PI / 2);
      } else if (this.aimJoyVector && this.aimJoyVector.lengthSq() > 0.1) {
        this.minimapPlayerIcon.setRotation(Math.atan2(this.aimJoyVector.y, this.aimJoyVector.x) + Math.PI / 2);
      }
    }
  }

  // --- UNIFIED HORIZONTAL CURRENCY CAPSULE (TOP-RIGHT CORNER) ---
  private createCurrencyHUD(width: number) {
    const capsuleW = 312;
    const capsuleH = 36;
    const isPortrait = this.cameras.main.height > width;
    const hudX = isPortrait ? Math.round(width / 2) : Math.round(width - 20 - capsuleW / 2);
    const hudY = 36;

    this.currencyHUDContainer = this.add.container(hudX, hudY).setScrollFactor(0).setDepth(3000);

    const econ = loadEconomy();

    // Dark Rounded Capsule Background #090d16 with 2px Settings border #38bdf8 & deep shadow
    const capsuleBg = this.add.rectangle(0, 0, capsuleW, capsuleH, 0x090d16, 0.98)
      .setStrokeStyle(2, 0x38bdf8);

    const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: '13px',
      fontFamily: '"VT323", "Courier New", monospace',
      fontStyle: 'bold',
      color: '#ffffff',
      resolution: 2,
      fixedWidth: 44
    };

    // Helper to create individual badge compartments (Settings style)
    const createSlot = (x: number, iconKey: string, initialVal: number, textColor = '#ffffff') => {
      const slotBg = this.add.rectangle(x, 0, 70, 26, 0x1e293b, 0.9)
        .setStrokeStyle(1, 0x334155);
      const icon = this.add.image(x - 22, 0, iconKey).setDisplaySize(16, 16);
      const txt = this.add.text(x - 10, 0, `${initialVal}`, { ...textStyle, color: textColor }).setOrigin(0, 0.5);
      return { slotBg, icon, txt };
    };

    // Item 1: Skulls 💀
    const slot1 = createSlot(-114, 'micro_icon_skull', econ.rustySkulls, '#facc15');
    this.currencyTextSkulls = slot1.txt;

    // Item 2: Shards 🔮
    const slot2 = createSlot(-38, 'micro_icon_shard', econ.voidShards, '#c084fc');
    this.currencyTextShards = slot2.txt;

    // Item 3: Upgrade Points ⚙️
    const slot3 = createSlot(38, 'micro_icon_upgrade', econ.upgradePoints, '#60a5fa');
    this.currencyTextUpgrade = slot3.txt;

    // Item 4: Ranked Points 🏺
    const slot4 = createSlot(114, 'micro_icon_ranked', econ.rankedPoints, '#4ade80');
    this.currencyTextRanked = slot4.txt;

    this.currencyHUDContainer.add([
      capsuleBg,
      slot1.slotBg, slot1.icon, slot1.txt,
      slot2.slotBg, slot2.icon, slot2.txt,
      slot3.slotBg, slot3.icon, slot3.txt,
      slot4.slotBg, slot4.icon, slot4.txt
    ]);

    this.currencyUpdateListener = () => {
      this.updateCurrencyHUD();
    };
    window.addEventListener('economy_updated', this.currencyUpdateListener);
    this.events.once('shutdown', () => {
      if (this.currencyUpdateListener) {
        window.removeEventListener('economy_updated', this.currencyUpdateListener);
      }
    });
  }

  private updateCurrencyHUD() {
    const econ = loadEconomy();
    if (this.currencyTextSkulls && this.currencyTextSkulls.active) this.currencyTextSkulls.setText(`${econ.rustySkulls}`);
    if (this.currencyTextShards && this.currencyTextShards.active) this.currencyTextShards.setText(`${econ.voidShards}`);
    if (this.currencyTextUpgrade && this.currencyTextUpgrade.active) this.currencyTextUpgrade.setText(`${econ.upgradePoints}`);
    if (this.currencyTextRanked && this.currencyTextRanked.active) this.currencyTextRanked.setText(`${econ.rankedPoints}`);
  }

  // --- CONTROLS SETUP ---
  private setupControls(width: number, height: number) {
    // Keyboard inputs
    this.cursors = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      UP: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      DOWN: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
      LEFT: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      RIGHT: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
    };

    this.keyAttack = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.keyS1 = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.J);
    this.keyS2 = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.K);
    this.keyUlt = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.L);

    const onControlsChanged = () => {
      this.positionCombatUI(this.cameras.main.width, this.cameras.main.height);
    };
    window.addEventListener('controls-layout-changed', onControlsChanged);
    this.events.once('shutdown', () => {
      window.removeEventListener('controls-layout-changed', onControlsChanged);
    });

    // Native Virtual Joystick (Zero CDN dependency, completely stable)
    const jX = 90;
    const jY = height - 90;
    this.joyStickOrigin.set(jX, jY);

    this.joyStickBase = this.add.circle(jX, jY, 52, 0x334155, 0.5)
      .setScrollFactor(0).setDepth(300).setStrokeStyle(3, 0x94a3b8);
    this.joyStickThumb = this.add.circle(jX, jY, 24, 0x4ade80, 0.85)
      .setScrollFactor(0).setDepth(301);

    this.joyStickBase.setVisible(!this.isPC);
    this.joyStickThumb.setVisible(!this.isPC);

    // Multi-touch tracking for joystick on left side and aim joystick on right side of screen
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isHeroMenuOpen || this.isLobbyOpen || this.isAnyModalOpen) return;
      if (pointer.x < width * 0.42 && pointer.y > height * 0.4) {
        this.joyStickPointerId = pointer.id;
        this.updateJoystick(pointer);
      } else if (this.aimJoyBase && Phaser.Math.Distance.Between(this.aimJoyBase.x, this.aimJoyBase.y, pointer.x, pointer.y) <= 52) {
        this.aimJoyPointerId = pointer.id;
        this.aimJoyMoved = false;
        this.aimTouchStartX = pointer.x;
        this.aimTouchStartY = pointer.y;
        this.aimTouchStartTime = Date.now();
        this.updateAimJoystick(pointer.x, pointer.y);
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isAnyModalOpen || this.isHeroMenuOpen || this.isLobbyOpen) return;
      if (pointer.id === this.joyStickPointerId) {
        this.updateJoystick(pointer);
      }
      if (pointer.id === this.aimJoyPointerId) {
        this.updateAimJoystick(pointer.x, pointer.y);
      }
      if (this.aimingSkillSlot !== null && pointer.id === this.skillAimPointerId) {
        this.updateAimingSkill(pointer.x, pointer.y);
      }
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === this.joyStickPointerId) {
        this.joyStickPointerId = null;
        this.joyStickVector.set(0, 0);
        this.joyStickThumb.setPosition(this.joyStickOrigin.x, this.joyStickOrigin.y);
      }
      if (pointer.id === this.aimJoyPointerId) {
        this.aimJoyPointerId = null;
        if (this.aimJoyBase) this.aimJoyThumb.setPosition(this.aimJoyBase.x, this.aimJoyBase.y);
        if (this.aimLineGfx) this.aimLineGfx.clear();

        const touchDuration = Date.now() - this.aimTouchStartTime;
        if (!this.aimJoyMoved || touchDuration < 280 || this.aimJoyVector.lengthSq() <= 0.05) {
          // BRAWL STARS AUTO-AIM: Quick tap auto-targets closest target within range
          this.autoAimAndAttackHub();
        } else {
          this.executeSkill('attack', this.aimJoyVector.x, this.aimJoyVector.y);
        }
        this.aimJoyVector.set(0, 0);
      }
      if (this.aimingSkillSlot !== null && pointer.id === this.skillAimPointerId) {
        this.finishAimingSkill(pointer.x, pointer.y);
      }
    });
  }

  private autoAimAndAttackHub() {
    let nearestTarget: { x: number; y: number } | null = null;
    let minDist = 850;

    // Check dummies in Hub
    if (this.dummyGroup) {
      this.dummyGroup.getChildren().forEach(obj => {
        const d = obj as Phaser.Physics.Arcade.Sprite;
        if (d.active) {
          const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, d.x, d.y);
          if (dist <= minDist) {
            minDist = dist;
            nearestTarget = d;
          }
        }
      });
    }

    // Check training bots in Hub
    if (this.botsGroup) {
      this.botsGroup.getChildren().forEach(obj => {
        const b = obj as Phaser.Physics.Arcade.Sprite;
        if (b.active) {
          const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, b.x, b.y);
          if (dist <= minDist) {
            minDist = dist;
            nearestTarget = b;
          }
        }
      });
    }

    if (nearestTarget) {
      const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, (nearestTarget as { x: number; y: number }).x, (nearestTarget as { x: number; y: number }).y);
      const dirX = Math.cos(angle);
      const dirY = Math.sin(angle);
      this.aimJoyVector.set(dirX, dirY);
      if (this.selectedHeroKey === 'char_nihil') {
        this.player.setRotation(angle + Math.PI / 2);
        this.player.setFlipX(false);
      } else {
        this.player.setFlipX(dirX < 0);
      }
      this.attackFacingTimer = 350;

      const reticle = this.add.circle((nearestTarget as { x: number; y: number }).x, (nearestTarget as { x: number; y: number }).y, 24, 0xef4444, 0.6).setDepth(105);
      this.tweens.add({ targets: reticle, scale: 0.5, alpha: 0, duration: 180, onComplete: () => reticle.destroy() });
      this.executeSkill('attack', dirX, dirY);
    } else {
      const facing = this.player.flipX ? -1 : 1;
      this.aimJoyVector.set(facing, 0);
      this.executeSkill('attack', facing, 0);
    }
  }

  private updateJoystick(pointer: Phaser.Input.Pointer) {
    const dist = Phaser.Math.Distance.Between(this.joyStickOrigin.x, this.joyStickOrigin.y, pointer.x, pointer.y);
    const maxRadius = 45;
    const angle = Phaser.Math.Angle.Between(this.joyStickOrigin.x, this.joyStickOrigin.y, pointer.x, pointer.y);

    if (dist > maxRadius) {
      this.joyStickThumb.setPosition(
        this.joyStickOrigin.x + Math.cos(angle) * maxRadius,
        this.joyStickOrigin.y + Math.sin(angle) * maxRadius
      );
    } else {
      this.joyStickThumb.setPosition(pointer.x, pointer.y);
    }

    if (dist > 8) {
      this.joyStickVector.set(Math.cos(angle), Math.sin(angle));
    } else {
      this.joyStickVector.set(0, 0);
    }
  }

  private updateAimJoystick(px: number, py: number) {
    if (!this.aimJoyBase) return;
    const baseX = this.aimJoyBase.x;
    const baseY = this.aimJoyBase.y;

    const dx = px - baseX;
    const dy = py - baseY;
    const angle = Math.atan2(dy, dx);
    const dist = Math.min(45, Math.sqrt(dx * dx + dy * dy));

    const dragDist = Math.hypot(px - this.aimTouchStartX, py - this.aimTouchStartY);
    if (dragDist > 16 && dist > 14) {
      this.aimJoyMoved = true;
    }

    this.aimJoyThumb.setPosition(baseX + Math.cos(angle) * dist, baseY + Math.sin(angle) * dist);
    this.aimJoyVector.set(Math.cos(angle), Math.sin(angle));

    if (this.selectedHeroKey === 'char_nihil') {
      this.player.setRotation(angle + Math.PI / 2);
      this.player.setFlipX(false);
      this.attackFacingTimer = 350;
      this.updateWeaponVisualPosition();
    } else if (Math.cos(angle) !== 0) {
      this.player.setFlipX(Math.cos(angle) < 0);
      this.attackFacingTimer = 350;
      this.updateWeaponVisualPosition();
    }
    this.drawWeaponAimIndicator(Math.cos(angle), Math.sin(angle));
  }

  // --- WEAPON POSITION TRACKING: PREVENT WEAPON DETACHMENT ---
  private updateWeaponVisualPosition() {
    if (!this.playerWeaponVisual || !this.player || !this.player.active) return;

    if (this.selectedHeroKey === 'char_kraul' || this.selectedHeroKey === 'char_nihil' || this.isMonster || this.torfInvulnerable) {
      this.playerWeaponVisual.setVisible(false);
      return;
    }

    this.playerWeaponVisual.setVisible(true);

    const facingRight = !this.player.flipX;
    let baseOffsetX = facingRight ? 16 : -16;
    let baseOffsetY = 4;

    if (this.selectedHeroKey === 'char_alrik') {
      baseOffsetX = facingRight ? 6 : -6;
      baseOffsetY = -3;
    }

    if (this.weaponThrustDist !== 0) {
      baseOffsetX += Math.cos(this.weaponAttackAngle) * this.weaponThrustDist;
      baseOffsetY += Math.sin(this.weaponAttackAngle) * this.weaponThrustDist;
    }

    this.playerWeaponVisual.setPosition(this.player.x + baseOffsetX, this.player.y + baseOffsetY);
    this.playerWeaponVisual.setFlipX(!facingRight);

    if (!this.tweens.isTweening(this.playerWeaponVisual)) {
      if (this.selectedHeroKey === 'char_alrik') {
        if (this.alrikShieldActive) {
          this.playerWeaponVisual.setPosition(
            this.player.x + Math.cos(this.alrikShieldAngle) * 18,
            this.player.y + Math.sin(this.alrikShieldAngle) * 18 + 6
          );
          this.playerWeaponVisual.setRotation(0.75 * Math.PI);
        } else if (this.weaponThrustDist !== 0) {
          this.playerWeaponVisual.setRotation(this.weaponAttackAngle + (facingRight ? Math.PI / 4 : -Math.PI / 4));
        } else {
          this.playerWeaponVisual.setRotation(facingRight ? -0.4 : 0.4);
        }
      } else if (this.weaponSwingAngle !== 0) {
        this.playerWeaponVisual.setRotation(this.weaponSwingAngle);
      } else {
        this.playerWeaponVisual.setRotation(0);
      }
    }
  }

  // --- WEAPON ATTACK AIMING INDICATOR ---
  private drawWeaponAimIndicator(dirX: number, dirY: number) {
    if (!this.aimLineGfx || !this.player || !this.player.active) return;
    this.aimLineGfx.clear();
    if (!getShowAttackRange()) return;
    const startX = this.player.x;
    const startY = this.player.y;

    const isRanged = this.selectedHeroKey === 'char_grim' || this.selectedHeroKey === 'char_omen' || this.selectedHeroKey === 'char_nihil';
    if (isRanged) {
      const range = this.selectedHeroKey === 'char_nihil' ? 340 : 260;
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
      const reach = (this.selectedHeroKey === 'char_kraul') ? 125 :
                    (this.selectedHeroKey === 'char_alrik') ? 115 : 75;
      const endX = startX + dirX * reach;
      const endY = startY + dirY * reach;
      const angle = Math.atan2(dirY, dirX);

      this.aimLineGfx.lineStyle(6, 0xef4444, 0.35);
      this.aimLineGfx.lineBetween(startX, startY, endX, endY);
      this.aimLineGfx.lineStyle(2, 0xfca5a5, 0.9);
      this.aimLineGfx.lineBetween(startX, startY, endX, endY);

      this.aimLineGfx.lineStyle(2, 0xef4444, 0.85);
      this.aimLineGfx.beginPath();
      this.aimLineGfx.arc(startX, startY, reach, angle - 0.5, angle + 0.5, false);
      this.aimLineGfx.strokePath();
    }
  }

  // --- SKILL AIMING & TARGETING SYSTEM (BRAWL STARS STYLE) ---
  private startAimingSkill(slot: 's1' | 's2' | 'ult', pointer: Phaser.Input.Pointer, btnX: number, btnY: number, btnCircle: Phaser.GameObjects.Arc) {
    if (this.selectedHeroKey === 'char_torf' && slot === 's2' && this.torfStoneSkin) {
      this.cancelTorfStoneSkin();
      return;
    }
    if (this.isUltChanneling && this.selectedHeroKey !== 'char_bjorn') return;
    if (this.cds[slot] > this.time.now) return;

    this.aimingSkillSlot = slot;
    this.skillAimPointerId = pointer.id;
    this.skillAimTouchStartX = pointer.x;
    this.skillAimTouchStartY = pointer.y;
    this.skillAimBtnOriginX = btnX;
    this.skillAimBtnOriginY = btnY;
    this.skillAimVector.set(0, 0);
    this.skillAimIsCancel = false;
    this.activeAimBtnTarget = btnCircle;

    btnCircle.setScale(1.2);
    if (this.cancelAimZoneContainer) {
      this.cancelAimZoneContainer.setVisible(true);
      this.cancelAimZoneBg.setScale(1).setStrokeStyle(2, 0xfca5a5);
    }

    const defaultFacing = this.player.flipX ? -1 : 1;
    this.drawSkillAimIndicator(slot, defaultFacing, 0, false);
  }

  private updateAimingSkill(pointerX: number, pointerY: number) {
    if (this.aimingSkillSlot === null) return;

    if (this.cancelAimZoneContainer) {
      const cx = this.cancelAimZoneContainer.x;
      const cy = this.cancelAimZoneContainer.y;
      const distToCancel = Phaser.Math.Distance.Between(pointerX, pointerY, cx, cy);
      if (distToCancel < 55) {
        this.skillAimIsCancel = true;
        this.cancelAimZoneBg.setScale(1.25).setStrokeStyle(3, 0xff0000);
      } else {
        this.skillAimIsCancel = false;
        this.cancelAimZoneBg.setScale(1).setStrokeStyle(2, 0xfca5a5);
      }
    }

    const dx = pointerX - this.skillAimBtnOriginX;
    const dy = pointerY - this.skillAimBtnOriginY;
    const dist = Math.hypot(dx, dy);

    if (dist > 14) {
      const dirX = dx / dist;
      const dirY = dy / dist;
      this.skillAimVector.set(dirX, dirY);
      if (this.selectedHeroKey === 'char_nihil') {
        this.player.setRotation(Math.atan2(dirY, dirX) + Math.PI / 2);
        this.player.setFlipX(false);
      } else {
        this.player.setFlipX(dirX < 0);
      }
      this.attackFacingTimer = 350;
    } else {
      const defaultFacing = this.player.flipX ? -1 : 1;
      this.skillAimVector.set(defaultFacing, 0);
    }

    this.drawSkillAimIndicator(this.aimingSkillSlot, this.skillAimVector.x, this.skillAimVector.y, this.skillAimIsCancel);
  }

  private finishAimingSkill(pointerX: number, pointerY: number) {
    if (this.aimingSkillSlot === null) return;

    const slot = this.aimingSkillSlot;
    let isCancel = this.skillAimIsCancel;
    if (this.cancelAimZoneContainer) {
      const cx = this.cancelAimZoneContainer.x;
      const cy = this.cancelAimZoneContainer.y;
      if (Phaser.Math.Distance.Between(pointerX, pointerY, cx, cy) < 55) {
        isCancel = true;
      }
    }
    const vec = this.skillAimVector.clone();

    this.aimingSkillSlot = null;
    this.skillAimPointerId = null;

    if (this.activeAimBtnTarget) {
      this.activeAimBtnTarget.setScale(1);
      this.activeAimBtnTarget = null;
    }
    if (this.cancelAimZoneContainer) {
      this.cancelAimZoneContainer.setVisible(false);
    }
    if (this.skillAimGfx) {
      this.skillAimGfx.clear();
    }

    if (isCancel) {
      soundEngine.playClick();
      return;
    }

    const dragDist = Phaser.Math.Distance.Between(this.skillAimTouchStartX, this.skillAimTouchStartY, pointerX, pointerY);
    if (dragDist >= 18 && vec.lengthSq() > 0.05) {
      this.executeSkill(slot, vec.x, vec.y);
    } else {
      this.autoAimCombatSkill(slot);
    }
  }

  private autoAimCombatSkill(slot: 's1' | 's2' | 'ult') {
    let nearestTarget: { x: number; y: number } | null = null;
    let minDist = 850;

    if (this.dummyGroup) {
      this.dummyGroup.getChildren().forEach(obj => {
        const d = obj as Phaser.Physics.Arcade.Sprite;
        if (d.active) {
          const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, d.x, d.y);
          if (dist <= minDist) {
            minDist = dist;
            nearestTarget = d;
          }
        }
      });
    }

    if (this.botsGroup) {
      this.botsGroup.getChildren().forEach(obj => {
        const b = obj as Phaser.Physics.Arcade.Sprite;
        if (b.active) {
          const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, b.x, b.y);
          if (dist <= minDist) {
            minDist = dist;
            nearestTarget = b;
          }
        }
      });
    }

    if (nearestTarget) {
      const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, (nearestTarget as any).x, (nearestTarget as any).y);
      const dirX = Math.cos(angle);
      const dirY = Math.sin(angle);
      if (this.selectedHeroKey === 'char_nihil') {
        this.player.setRotation(angle + Math.PI / 2);
        this.player.setFlipX(false);
      } else {
        this.player.setFlipX(dirX < 0);
      }
      this.attackFacingTimer = 350;
      this.executeSkill(slot, dirX, dirY);
    } else {
      const facing = this.player.flipX ? -1 : 1;
      this.executeSkill(slot, facing, 0);
    }
  }

  public executeCombatSkillWithMouseTarget(slot: 's1' | 's2' | 'ult') {
    const p = this.input.activePointer;
    if (p) {
      const dx = p.worldX - this.player.x;
      const dy = p.worldY - this.player.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 25) {
        this.executeSkill(slot, dx / dist, dy / dist);
        return;
      }
    }
    this.autoAimCombatSkill(slot);
  }

  // --- DRAW RICH SKILL AIM TRAJECTORY / RANGE / CONE INDICATOR ---
  private drawSkillAimIndicator(slot: 's1' | 's2' | 'ult', dirX: number, dirY: number, isCancelled: boolean) {
    if (!this.skillAimGfx || !this.player || !this.player.active) return;
    this.skillAimGfx.clear();

    const startX = this.player.x;
    const startY = this.player.y;

    // --- 1. KRAUL ---
    if (this.selectedHeroKey === 'char_kraul') {
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

    // --- 2. ZAZA ---
    if (this.selectedHeroKey === 'char_zaza') {
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

    // --- 3. GRIM ---
    if (this.selectedHeroKey === 'char_grim') {
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

    // --- 4. TORF ---
    if (this.selectedHeroKey === 'char_torf') {
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
        // Torf Underground Breach Ult: Subterranean burst aura
        this.skillAimGfx.lineStyle(3, isCancelled ? 0xef4444 : 0x3b82f6, 0.85);
        this.skillAimGfx.strokeCircle(startX, startY, 110);
        this.skillAimGfx.fillStyle(isCancelled ? 0xef4444 : 0x2563eb, 0.25);
        this.skillAimGfx.fillCircle(startX, startY, 110);
        return;
      }
    }

    // --- 5. OMEN ---
    if (this.selectedHeroKey === 'char_omen') {
      if (slot === 's1') {
        const range = 330;
        const centerAngle = Math.atan2(dirY, dirX);
        for (let i = -2; i <= 2; i++) {
          const bladeAngle = centerAngle + i * 0.18;
          const bx = startX + Math.cos(bladeAngle) * range;
          const by = startY + Math.sin(bladeAngle) * range;
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

    // --- NIHIL ---
    if (this.selectedHeroKey === 'char_nihil') {
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

    // --- 6. ALARIK ---
    if (this.selectedHeroKey === 'char_alrik') {
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

    // --- 7. BJORN (Default fallback) ---
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

  // --- COMBAT UI ---
  private setupCombatUI(width: number, height: number) {
    // Red Aim/Attack Joystick (Draggable, identical to DungeonScene)
    this.aimJoyBase = this.add.circle(0, 0, 52, 0xdc2626, 0.35)
      .setScrollFactor(0).setDepth(299).setStrokeStyle(3, 0xef4444);
    this.aimJoyThumb = this.add.circle(0, 0, 26, 0xef4444, 0.95)
      .setScrollFactor(0).setDepth(300);
    this.aimLineGfx = this.add.graphics().setDepth(298);

    // Dummy objects for compatibility with existing references
    this.btnAttack = this.add.circle(0, 0, 52, 0x000000, 0.001)
      .setScrollFactor(0).setDepth(299);
    this.txtAttack = this.add.text(0, 0, '', { fontSize: '1px' })
      .setScrollFactor(0).setVisible(false);
    this.cdAttackOverlay = this.add.circle(0, 0, 52, 0x000000, 0.65)
      .setScrollFactor(0).setDepth(302).setVisible(false);

    // Skill 1 Button (Identical to DungeonScene)
    this.btnS1 = this.add.circle(0, 0, 26, 0x16a34a, 0.85)
      .setScrollFactor(0).setDepth(300).setStrokeStyle(2, 0x4ade80).setInteractive({ useHandCursor: true });
    this.iconS1 = this.add.image(0, 0, 'skill_zaza_1').setScale(1.0).setScrollFactor(0).setDepth(301);
    this.lblS1 = this.add.text(0, 15, '[ 1 ]', { fontSize: '8px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffffff' })
      .setOrigin(0.5).setScrollFactor(0).setDepth(302);
    this.cdS1Overlay = this.add.circle(0, 0, 26, 0x000000, 0.6)
      .setScrollFactor(0).setDepth(303).setVisible(false);
    this.cdS1Txt = this.add.text(0, 0, '', { fontSize: '11px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffffff' })
      .setOrigin(0.5).setScrollFactor(0).setDepth(304).setVisible(false);

    this.btnS1.on('pointerdown', (p: Phaser.Input.Pointer, _lx: unknown, _ly: unknown, event: { stopPropagation: () => void }) => {
      event.stopPropagation();
      this.startAimingSkill('s1', p, this.btnS1.x, this.btnS1.y, this.btnS1);
    });

    // Skill 2 Button (Identical to DungeonScene)
    this.btnS2 = this.add.circle(0, 0, 26, 0x2563eb, 0.85)
      .setScrollFactor(0).setDepth(300).setStrokeStyle(2, 0x60a5fa).setInteractive({ useHandCursor: true });
    this.iconS2 = this.add.image(0, 0, 'skill_zaza_2').setScale(1.0).setScrollFactor(0).setDepth(301);
    this.lblS2 = this.add.text(0, 15, '[ 2 ]', { fontSize: '8px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffffff' })
      .setOrigin(0.5).setScrollFactor(0).setDepth(302);
    this.cdS2Overlay = this.add.circle(0, 0, 26, 0x000000, 0.6)
      .setScrollFactor(0).setDepth(303).setVisible(false);
    this.cdS2Txt = this.add.text(0, 0, '', { fontSize: '11px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffffff' })
      .setOrigin(0.5).setScrollFactor(0).setDepth(304).setVisible(false);

    this.btnS2.on('pointerdown', (p: Phaser.Input.Pointer, _lx: unknown, _ly: unknown, event: { stopPropagation: () => void }) => {
      event.stopPropagation();
      if (this.selectedHeroKey === 'char_torf' && this.torfStoneSkin) {
        this.cancelTorfStoneSkin();
        return;
      }
      this.startAimingSkill('s2', p, this.btnS2.x, this.btnS2.y, this.btnS2);
    });

    // Ultimate Button (Identical to DungeonScene)
    this.btnUlt = this.add.circle(0, 0, 28, 0x9333ea, 0.9)
      .setScrollFactor(0).setDepth(300).setStrokeStyle(3, 0xfacc15).setInteractive({ useHandCursor: true });
    this.iconUlt = this.add.image(0, 0, 'skill_zaza_3').setScale(1.1).setScrollFactor(0).setDepth(301);
    this.lblUlt = this.add.text(0, 17, '[ ★ ]', { fontSize: '8px', fontFamily: 'monospace', fontStyle: 'bold', color: '#fef08a' })
      .setOrigin(0.5).setScrollFactor(0).setDepth(302);
    this.cdUltOverlay = this.add.circle(0, 0, 28, 0x000000, 0.6)
      .setScrollFactor(0).setDepth(303).setVisible(false);
    this.cdUltTxt = this.add.text(0, 0, '', { fontSize: '12px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffffff' })
      .setOrigin(0.5).setScrollFactor(0).setDepth(304).setVisible(false);

    this.btnUlt.on('pointerdown', (p: Phaser.Input.Pointer, _lx: unknown, _ly: unknown, event: { stopPropagation: () => void }) => {
      event.stopPropagation();
      this.startAimingSkill('ult', p, this.btnUlt.x, this.btnUlt.y, this.btnUlt);
    });

    // Cancel Aim Zone
    this.cancelAimZoneContainer = this.add.container(0, 0).setScrollFactor(0).setDepth(340).setVisible(false);
    this.cancelAimZoneBg = this.add.circle(0, 0, 32, 0xdc2626, 0.85).setStrokeStyle(2, 0xfca5a5);
    const cancelIcon = this.add.text(0, -6, '✕', {
      fontSize: '18px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffffff'
    }).setOrigin(0.5);
    const cancelLbl = this.add.text(0, 12, 'ОТМЕНА', {
      fontSize: '8px', fontFamily: 'monospace', fontStyle: 'bold', color: '#fef2f2'
    }).setOrigin(0.5);
    this.cancelAimZoneContainer.add([this.cancelAimZoneBg, cancelIcon, cancelLbl]);

    this.combatElements = [
      this.btnAttack, this.txtAttack, this.cdAttackOverlay,
      this.btnS1, this.iconS1, this.lblS1, this.cdS1Overlay, this.cdS1Txt,
      this.btnS2, this.iconS2, this.lblS2, this.cdS2Overlay, this.cdS2Txt,
      this.btnUlt, this.iconUlt, this.lblUlt, this.cdUltOverlay, this.cdUltTxt
    ];

    this.positionCombatUI(width, height);
    this.updateCombatIcons();
  }

  private positionCombatUI(width: number, height: number) {
    const layout = getCustomControlsLayout();
    const btnScale = Math.min(1.25, Math.max(0.78, Math.min(width, height) / 480));

    // Custom or default coordinates from layout
    const cx = layout.attack.x * width;
    const cy = layout.attack.y * height;

    const s1X = layout.s1.x * width;
    const s1Y = layout.s1.y * height;

    const s2X = layout.s2.x * width;
    const s2Y = layout.s2.y * height;

    const ultX = layout.ult.x * width;
    const ultY = layout.ult.y * height;

    if (this.btnAttack) {
      this.btnAttack.setPosition(cx, cy).setScale(btnScale);
      this.txtAttack.setPosition(cx, cy).setScale(btnScale);
      this.cdAttackOverlay.setPosition(cx, cy).setScale(btnScale);

      if (this.aimJoyBase) this.aimJoyBase.setPosition(cx, cy).setScale(btnScale);
      if (this.aimJoyThumb && this.aimJoyPointerId === null) this.aimJoyThumb.setPosition(cx, cy).setScale(btnScale);

      this.btnS1.setPosition(s1X, s1Y).setScale(btnScale);
      this.iconS1.setPosition(s1X, s1Y).setScale(btnScale);
      this.lblS1.setPosition(s1X, s1Y + 15 * btnScale).setScale(btnScale);
      this.cdS1Overlay.setPosition(s1X, s1Y).setScale(btnScale);
      this.cdS1Txt.setPosition(s1X, s1Y).setScale(btnScale);

      this.btnS2.setPosition(s2X, s2Y).setScale(btnScale);
      this.iconS2.setPosition(s2X, s2Y).setScale(btnScale);
      this.lblS2.setPosition(s2X, s2Y + 15 * btnScale).setScale(btnScale);
      this.cdS2Overlay.setPosition(s2X, s2Y).setScale(btnScale);
      this.cdS2Txt.setPosition(s2X, s2Y).setScale(btnScale);
      if (this.torfCancelBadgeS2) this.torfCancelBadgeS2.setPosition(s2X, s2Y).setScale(btnScale);

      this.btnUlt.setPosition(ultX, ultY).setScale(btnScale);
      this.iconUlt.setPosition(ultX, ultY).setScale(btnScale);
      this.lblUlt.setPosition(ultX, ultY + 17 * btnScale).setScale(btnScale);
      this.cdUltOverlay.setPosition(ultX, ultY).setScale(btnScale);
      this.cdUltTxt.setPosition(ultX, ultY).setScale(btnScale);

      if (this.cancelAimZoneContainer) {
        const cancelX = (layout.cancel ? layout.cancel.x : DEFAULT_CONTROLS_LAYOUT.cancel.x) * width;
        const cancelY = (layout.cancel ? layout.cancel.y : DEFAULT_CONTROLS_LAYOUT.cancel.y) * height;
        this.cancelAimZoneContainer.setPosition(cancelX, cancelY).setScale(btnScale);
      }
    }

    // Joystick placement and scale
    const jScale = Math.min(1.25, Math.max(0.8, Math.min(width, height) / 480));
    const jX = layout.joystick.x * width;
    const jY = layout.joystick.y * height;
    this.joyStickOrigin.set(jX, jY);

    if (this.joyStickBase) {
      this.joyStickBase.setPosition(jX, jY).setScale(jScale);
    }
    if (this.joyStickThumb && this.joyStickPointerId === null) {
      this.joyStickThumb.setPosition(jX, jY).setScale(jScale);
    }
  }

  private scrollRoster(deltaAmount: number) {
    if (!this.isHeroMenuOpen || this.isHeroDetailOpen) return;
    soundEngine.playClick();
    this.rosterScrollY = Phaser.Math.Clamp(this.rosterScrollY + deltaAmount, 0, this.maxRosterScrollY);
    this.repositionAltarElements(this.cameras.main.width, this.cameras.main.height);
  }

  // --- HEROES ALTAR: TWO-STEP SELECTION MODAL ---
  private buildHeroAltarModal(width: number, height: number) {
    const cx = width / 2;
    const cy = height / 2;

    // 0. Dim Backdrop (prevents clicks to scene behind)
    this.heroOverlay = this.add.rectangle(cx, cy, width * 2, height * 2, 0x000000, 0.85)
      .setScrollFactor(0).setDepth(500).setVisible(false).setInteractive();

    this.heroOverlay.on('pointerdown', (_p: unknown, _lx: unknown, _ly: unknown, event: { stopPropagation: () => void }) => {
      event.stopPropagation();
    });

    // Main Modal Frame (760 x 480 with luxury warm amber/gold border & obsidian background)
    this.altarBg = this.add.rectangle(cx, cy, 760, 480, 0x0f1422)
      .setStrokeStyle(3, 0xf59e0b)
      .setScrollFactor(0).setDepth(501).setVisible(false);

    // ==========================================
    // 1. ROSTER VIEW (4 CHARACTERS PER LINE WITH VERTICAL SCROLL)
    // ==========================================
    const heroKeys = Object.keys(HEROES);
    const rosterTitle = this.add.text(cx, cy - 205, `✦ ВЫБОР ГЕРОЯ (${heroKeys.length}) ✦`, {
      fontSize: '18px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#facc15'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(502).setVisible(false);

    const rosterCloseBtn = this.add.text(cx + 350, cy - 205, '[X]', {
      fontSize: '18px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#ef4444'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(502).setInteractive({ useHandCursor: true }).setVisible(false);

    rosterCloseBtn.on('pointerdown', () => {
      soundEngine.playClick();
      this.closeHeroMenu();
    });

    // Scroll Up ▲ & Scroll Down ▼ Buttons on Right Margin
    this.rosterUpBtn = this.add.rectangle(cx + 352, cy - 50, 32, 54, 0x1e293b)
      .setStrokeStyle(2, 0xfacc15).setScrollFactor(0).setDepth(502)
      .setInteractive({ useHandCursor: true }).setVisible(false);

    this.rosterUpText = this.add.text(cx + 352, cy - 50, '▲', {
      fontSize: '18px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#facc15'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(503).setVisible(false);

    this.rosterUpBtn.on('pointerdown', () => this.scrollRoster(-180));

    this.rosterDownBtn = this.add.rectangle(cx + 352, cy + 50, 32, 54, 0x1e293b)
      .setStrokeStyle(2, 0xfacc15).setScrollFactor(0).setDepth(502)
      .setInteractive({ useHandCursor: true }).setVisible(false);

    this.rosterDownText = this.add.text(cx + 352, cy + 50, '▼', {
      fontSize: '18px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#facc15'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(503).setVisible(false);

    this.rosterDownBtn.on('pointerdown', () => this.scrollRoster(180));

    this.rosterHintText = this.add.text(cx, cy + 215, '▲ ВВЕРХ / ▼ ВНИЗ • Колесико мыши или кнопки справа', {
      fontSize: '10px',
      fontFamily: 'monospace',
      color: '#94a3b8'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(502).setVisible(false);

    this.rosterGroup = [rosterTitle, rosterCloseBtn, this.rosterUpBtn, this.rosterUpText, this.rosterDownBtn, this.rosterDownText, this.rosterHintText];
    this.rosterCards = [];

    const totalRows = Math.ceil(heroKeys.length / 4);
    this.maxRosterScrollY = Math.max(0, (totalRows - 2) * 180);

    // Wheel scroll listener
    this.input.on('wheel', (_p: unknown, _g: unknown, _dx: number, dy: number) => {
      if (this.isHeroMenuOpen && !this.isHeroDetailOpen) {
        this.scrollRoster(dy > 0 ? 80 : -80);
      }
    });

    const cardXOffsets = [-246, -82, 82, 246];

    heroKeys.forEach((key, idx) => {
      const hero = HEROES[key];
      const row = Math.floor(idx / 4);
      const col = idx % 4;

      const cardX = cx + cardXOffsets[col];
      const cardY = cy - 75 + row * 180;

      // Card Background (152 x 165)
      const cardBg = this.add.rectangle(cardX, cardY, 152, 165, 0x181c2b)
        .setStrokeStyle(2, hero.color)
        .setScrollFactor(0).setDepth(502).setInteractive({ useHandCursor: true }).setVisible(false);

      // Top Rarity Banner
      const cardBanner = this.add.rectangle(cardX, cardY - 65, 150, 20, 0x0b0f19)
        .setStrokeStyle(1, hero.color)
        .setScrollFactor(0).setDepth(503).setVisible(false);

      const rarityText = this.add.text(cardX, cardY - 65, `[ ${hero.rarity} ]`, {
        fontSize: '9px',
        fontFamily: 'monospace',
        fontStyle: 'bold',
        color: hero.colorHex
      }).setOrigin(0.5).setScrollFactor(0).setDepth(504).setVisible(false);

      // Double Stand Pedestals under character
      const charPedestalOuter = this.add.ellipse(cardX, cardY - 5, 58, 16, 0x090d16)
        .setStrokeStyle(2, hero.color)
        .setScrollFactor(0).setDepth(503).setVisible(false);

      const charPedestalInner = this.add.ellipse(cardX, cardY - 5, 42, 8, 0x1e293b)
        .setStrokeStyle(1, 0x38bdf8)
        .setScrollFactor(0).setDepth(503).setVisible(false);

      // Pixel Sprite
      const charSprite = this.add.image(cardX, cardY - 28, hero.texture)
        .setScale(1.5).setScrollFactor(0).setDepth(504).setInteractive({ useHandCursor: true }).setVisible(false);

      // Clean Display Name
      const displayName = hero.name.split(' ')[0] || hero.name;
      const nameText = this.add.text(cardX, cardY + 20, displayName, {
        fontSize: '13px',
        fontFamily: 'monospace',
        fontStyle: 'bold',
        color: '#ffffff'
      }).setOrigin(0.5).setScrollFactor(0).setDepth(504).setInteractive({ useHandCursor: true }).setVisible(false);

      const statsText = this.add.text(cardX, cardY + 38, `HP ${hero.hp} • СПД ${hero.speed}`, {
        fontSize: '9px',
        fontFamily: 'monospace',
        color: '#94a3b8'
      }).setOrigin(0.5).setScrollFactor(0).setDepth(504).setVisible(false);

      // Status indicator on card (Only shows equipped badge)
      const isEquipped = key === this.selectedHeroKey;
      const statusText = this.add.text(cardX, cardY + 56, isEquipped ? '[ ТЕКУЩИЙ ✓ ]' : '', {
        fontSize: '9.5px',
        fontFamily: 'monospace',
        fontStyle: 'bold',
        color: '#4ade80',
        backgroundColor: '#064e3b',
        padding: { x: 5, y: 2 }
      }).setOrigin(0.5).setScrollFactor(0).setDepth(504).setVisible(false);

      const onCardClick = () => {
        soundEngine.playClick();
        this.openHeroDetailView(key);
      };

      cardBg.on('pointerdown', onCardClick);
      charSprite.on('pointerdown', onCardClick);
      nameText.on('pointerdown', onCardClick);

      cardBg.on('pointerover', () => cardBg.setStrokeStyle(2, 0xfacc15));
      cardBg.on('pointerout', () => cardBg.setStrokeStyle(2, hero.color));

      this.rosterCards.push({
        bg: cardBg, banner: cardBanner, portrait: charSprite,
        nameText, rarityText, statsText, statusText,
        pedestalOuter: charPedestalOuter, pedestalInner: charPedestalInner,
        key, row, col
      });
      this.rosterGroup.push(cardBg, cardBanner, rarityText, charPedestalOuter, charPedestalInner, charSprite, nameText, statsText, statusText);
    });

    // =========================================================================
    // 2. DETAIL VIEW:
    //    TOP-LEFT: Hero Name & Subtitle & Attack & Stats Boxes
    //    CENTER: Hero Sprite on Pedestal (STATIONARY, NO MOVING)
    //    TOP-RIGHT: 3 SEPARATE BOXES (Skill Name Box, CD Box, Skill Desc Box)
    //    RIGHT COLUMN: 3 Skill Buttons
    //    BOTTOM-RIGHT: [ ВЫБРАТЬ ЭТОГО БОЙЦА ] Button
    // =========================================================================
    const detailBackBtn = this.add.text(cx - 290, cy - 180, '< НАЗАД', {
      fontSize: '12px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#facc15',
      backgroundColor: '#1e2230',
      padding: { x: 8, y: 4 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(502).setInteractive({ useHandCursor: true }).setVisible(false);

    detailBackBtn.on('pointerdown', () => {
      soundEngine.playClick();
      this.showRosterView();
    });

    const detailCloseBtn = this.add.text(cx + 305, cy - 180, '[X]', {
      fontSize: '18px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#ef4444'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(502).setInteractive({ useHandCursor: true }).setVisible(false);

    detailCloseBtn.on('pointerdown', () => {
      soundEngine.playClick();
      this.closeHeroMenu();
    });

    // 1. LEFT COLUMN: Name, Rarity Badge, Title, Attack & Stats
    const leftX = cx - 215;
    this.detailHeroName = this.add.text(leftX, cy - 135, 'ZAZA', {
      fontSize: '22px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(503).setVisible(false);

    this.detailHeroRarityBadgeBg = this.add.rectangle(leftX, cy - 106, 130, 22, 0x2e1065)
      .setStrokeStyle(1, 0xa855f7)
      .setScrollFactor(0).setDepth(503).setVisible(false);

    this.detailHeroRarity = this.add.text(leftX, cy - 106, '[ ЭПИЧЕСКИЙ ]', {
      fontSize: '10px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#c084fc'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(504).setVisible(false);

    this.detailHeroTitleBoxBg = this.add.rectangle(leftX, cy - 76, 165, 24, 0x181c2b)
      .setStrokeStyle(1, 0x3f3f46)
      .setScrollFactor(0).setDepth(502).setVisible(false);

    this.detailHeroTitle = this.add.text(leftX, cy - 76, 'Токсичный Мутант', {
      fontSize: '11px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#e2e8f0'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(503).setVisible(false);

    this.detailHeroAttackBoxBg = this.add.rectangle(leftX, cy - 30, 165, 44, 0x181c2b)
      .setStrokeStyle(1, 0x3f3f46)
      .setScrollFactor(0).setDepth(502).setVisible(false);

    this.detailHeroAttackDesc = this.add.text(leftX - 74, cy - 44, '⚔ Атака: Удар в ближнем бою.', {
      fontSize: '9px',
      fontFamily: 'monospace',
      color: '#94a3b8',
      wordWrap: { width: 150 },
      lineSpacing: 2
    }).setOrigin(0, 0).setScrollFactor(0).setDepth(503).setVisible(false);

    this.detailHeroStatsBoxBg = this.add.rectangle(leftX, cy + 22, 165, 34, 0x090d16)
      .setStrokeStyle(1, 0x22c55e)
      .setScrollFactor(0).setDepth(502).setVisible(false);

    this.detailHeroStats = this.add.text(leftX, cy + 22, '❤ HP: 1000   ⚡ СПД: 290', {
      fontSize: '10px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#4ade80'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(503).setVisible(false);

    // 2. CENTER: Glowing Circular Pedestal + Stationary Hero (NO MOVING BACK AND FORTH)
    const heroCenterX = cx - 10;
    this.detailPedestalOuter = this.add.ellipse(heroCenterX, cy + 62, 145, 42, 0x0f172a)
      .setStrokeStyle(3, 0xf59e0b)
      .setScrollFactor(0).setDepth(502).setVisible(false);

    this.detailPedestal = this.add.ellipse(heroCenterX, cy + 62, 125, 32, 0x181a26)
      .setStrokeStyle(2, 0x38bdf8)
      .setScrollFactor(0).setDepth(502).setVisible(false);

    this.detailHeroSprite = this.add.image(heroCenterX, cy - 12, 'char_zaza')
      .setScale(3.0).setScrollFactor(0).setDepth(503).setVisible(false);

    // 3. TOP-RIGHT: 3 DISTINCT SEPARATE BOXES (Skill Name, CD, Description)
    const rightColX = cx + 205;

    // Separate Box 1: Skill Name Box
    this.detailSkillNameBoxBg = this.add.rectangle(rightColX - 32, cy - 134, 140, 28, 0x181c2b)
      .setStrokeStyle(2, 0xfacc15)
      .setScrollFactor(0).setDepth(502).setVisible(false);

    this.detailSkillTitle = this.add.text(rightColX - 32, cy - 134, '1. ПЛЕВОК ЯДОМ', {
      fontSize: '10px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#facc15'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(503).setVisible(false);

    // Separate Box 2: Skill Cooldown (CD) Badge Box
    this.detailSkillCdBoxBg = this.add.rectangle(rightColX + 70, cy - 134, 52, 28, 0x064e3b)
      .setStrokeStyle(2, 0x22c55e)
      .setScrollFactor(0).setDepth(502).setVisible(false);

    this.detailSkillMeta = this.add.text(rightColX + 70, cy - 134, '⏱ 3.0с', {
      fontSize: '10px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#86efac'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(503).setVisible(false);

    // Separate Box 3: Skill Description Box
    this.detailSkillDescBox = this.add.rectangle(rightColX + 5, cy - 78, 205, 68, 0x111827)
      .setStrokeStyle(2, 0x475569)
      .setScrollFactor(0).setDepth(502).setVisible(false);

    this.detailSkillDesc = this.add.text(rightColX - 92, cy - 104, 'Описание способности...', {
      fontSize: '9.5px',
      fontFamily: 'monospace',
      color: '#e2e8f0',
      lineSpacing: 2,
      wordWrap: { width: 190 }
    }).setOrigin(0, 0).setScrollFactor(0).setDepth(503).setVisible(false);

    // 4. RIGHT COLUMN: 3 Square Skill Buttons Stacked Vertically
    this.detailSkillSquareButtons = [];
    const skillLabels = ['1', '2', '★'];
    const sqYOffsets = [-16, 32, 80];

    for (let i = 0; i < 3; i++) {
      const sqY = cy + sqYOffsets[i];

      const sqBg = this.add.rectangle(rightColX + 5, sqY, 205, 38, 0x181c2b)
        .setStrokeStyle(2, i === 0 ? 0x4ade80 : 0x3f3f46)
        .setScrollFactor(0).setDepth(502).setInteractive({ useHandCursor: true }).setVisible(false);

      const sqIcon = this.add.image(rightColX - 75, sqY, 'skill_zaza_1')
        .setScale(1.0).setScrollFactor(0).setDepth(503).setVisible(false);

      const sqLabel = this.add.text(rightColX - 48, sqY, '', {
        fontSize: '10px',
        fontFamily: 'monospace',
        fontStyle: 'bold',
        color: i === 0 ? '#4ade80' : '#ffffff'
      }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(503).setVisible(false);

      const onSquareClick = () => {
        soundEngine.playClick();
        this.selectDetailSkill(i);
      };
      sqBg.on('pointerdown', onSquareClick);
      sqIcon.on('pointerdown', onSquareClick);
      sqLabel.on('pointerdown', onSquareClick);

      this.detailSkillSquareButtons.push({ bg: sqBg, icon: sqIcon, label: sqLabel });
      this.detailGroup.push(sqBg, sqIcon, sqLabel);
    }

    // 5. BOTTOM-RIGHT: Select Button
    this.detailSelectBtn = this.add.rectangle(rightColX + 5, cy + 140, 205, 40, 0x16a34a)
      .setStrokeStyle(2, 0x86efac)
      .setScrollFactor(0).setDepth(502).setInteractive({ useHandCursor: true }).setVisible(false);

    this.detailSelectText = this.add.text(rightColX + 5, cy + 140, '[ ВЫБРАТЬ БОЙЦА ]', {
      fontSize: '12px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(503).setInteractive({ useHandCursor: true }).setVisible(false);

    const onSelectClick = () => {
      this.applySelectedHero();
    };
    this.detailSelectBtn.on('pointerdown', onSelectClick);
    this.detailSelectText.on('pointerdown', onSelectClick);

    this.detailGroup.push(
      detailBackBtn,
      detailCloseBtn,
      this.detailHeroName,
      this.detailHeroRarityBadgeBg,
      this.detailHeroRarity,
      this.detailHeroTitleBoxBg,
      this.detailHeroTitle,
      this.detailHeroAttackBoxBg,
      this.detailHeroAttackDesc,
      this.detailHeroStatsBoxBg,
      this.detailHeroStats,
      this.detailPedestalOuter,
      this.detailPedestal,
      this.detailHeroSprite,
      this.detailSkillNameBoxBg,
      this.detailSkillTitle,
      this.detailSkillCdBoxBg,
      this.detailSkillMeta,
      this.detailSkillDescBox,
      this.detailSkillDesc,
      this.detailSelectBtn,
      this.detailSelectText
    );
  }

  private selectDetailSkill(idx: number) {
    this.currentDetailSkillIndex = idx;
    const hero = HEROES[this.tempHeroKey] || HEROES.char_zaza;
    const skill = hero.skills[idx];
    if (!skill) return;

    this.detailSkillTitle.setText(skill.name.toUpperCase());
    this.detailSkillMeta.setText(`⏱ ${skill.cooldown}с`);
    this.detailSkillDesc.setText(skill.desc);

    const skillColor = idx === 2 ? 0xfbbf24 : (idx === 1 ? 0x38bdf8 : 0x4ade80);
    this.detailSkillNameBoxBg.setStrokeStyle(2, skillColor);

    this.detailSkillSquareButtons.forEach((btn, i) => {
      const isSelected = i === idx;
      btn.bg.setStrokeStyle(isSelected ? 2 : 1, isSelected ? skillColor : 0x3f3f46);
      btn.bg.setFillStyle(isSelected ? 0x14532d : 0x181a26);
      btn.label.setColor(isSelected ? '#86efac' : '#ffffff');
    });
  }

  private openHeroMenu() {
    this.setModalOpenState(true);
    this.player.setVelocity(0, 0);
    this.interactPromptUI.setVisible(false);

    if (this.minimapContainer) this.minimapContainer.setVisible(false);
    this.combatElements.forEach(el => (el as unknown as { setVisible: (v: boolean) => void }).setVisible(false));
    if (this.joyStickBase) {
      this.joyStickBase.setVisible(false);
      this.joyStickThumb.setVisible(false);
    }

    // Emit event to open the gorgeous, crisp, React-based Hero Selection overlay
    this.game.events.emit('open-hero-select-modal');
  }

  private closeHeroMenu() {
    this.isHeroMenuOpen = false;
    this.isHeroDetailOpen = false;
    this.heroOverlay.setVisible(false);
    this.altarBg.setVisible(false);
    this.rosterGroup.forEach(obj => (obj as unknown as { setVisible: (v: boolean) => void }).setVisible(false));
    this.detailGroup.forEach(obj => (obj as unknown as { setVisible: (v: boolean) => void }).setVisible(false));

    if (this.minimapContainer) this.minimapContainer.setVisible(true);
    this.combatElements.forEach(el => (el as unknown as { setVisible: (v: boolean) => void }).setVisible(true));
    if (!this.isPC && this.joyStickBase) {
      this.joyStickBase.setVisible(true);
      this.joyStickThumb.setVisible(true);
    }
  }

  private showRosterView() {
    this.isHeroDetailOpen = false;
    this.detailGroup.forEach(obj => (obj as unknown as { setVisible: (v: boolean) => void }).setVisible(false));

    this.rosterCards.forEach(c => {
      const isEquipped = c.key === this.selectedHeroKey;
      c.statusText.setText(isEquipped ? '[ ТЕКУЩИЙ ✓ ]' : '').setVisible(isEquipped);
      c.statusText.setColor('#4ade80');
      c.statusText.setBackgroundColor('#064e3b');
    });

    this.repositionAltarElements(this.cameras.main.width, this.cameras.main.height);
  }

  private openHeroDetailView(heroKey: string) {
    this.isHeroDetailOpen = true;
    this.tempHeroKey = heroKey;
    const hero = HEROES[heroKey];

    this.rosterGroup.forEach(obj => (obj as unknown as { setVisible: (v: boolean) => void }).setVisible(false));
    this.rosterCards.forEach(c => {
      c.bg.setVisible(false);
      c.banner.setVisible(false);
      c.rarityText.setVisible(false);
      c.pedestalOuter.setVisible(false);
      c.pedestalInner.setVisible(false);
      c.portrait.setVisible(false);
      c.nameText.setVisible(false);
      c.statsText.setVisible(false);
      c.statusText.setVisible(false);
    });

    // Show actual character sprite stationary on center pedestal
    this.tweens.killTweensOf(this.detailHeroSprite);
    this.detailHeroSprite.setTexture(hero.texture).setScale(3.0).setAngle(0);

    const displayName = hero.name.split(' ')[0] || hero.name;
    this.detailHeroName.setText(displayName).setColor('#ffffff');

    // Rarity badge directly below name
    this.detailHeroRarityBadgeBg.setStrokeStyle(1, hero.color).setFillStyle(0x1e293b);
    this.detailHeroRarity.setText(`[ ${hero.rarity} ]`).setColor(hero.colorHex);

    this.detailHeroTitle.setText(hero.title);
    this.detailHeroAttackDesc.setText(`⚔ Атака: ${hero.attackDesc}`);
    this.detailHeroStats.setText(`❤ HP: ${hero.hp}   ⚡ СПД: ${hero.speed}`);

    // Update square skill buttons on right
    hero.skills.forEach((skill, idx) => {
      const sqBtn = this.detailSkillSquareButtons[idx];
      if (sqBtn) {
        sqBtn.icon.setTexture(skill.icon);
        sqBtn.label.setText(skill.name.toUpperCase());
      }
    });

    // Select first skill by default to show title & description on top-right
    this.selectDetailSkill(0);

    // Update select button state
    const isAlreadyEquipped = this.selectedHeroKey === this.tempHeroKey;
    if (isAlreadyEquipped) {
      this.detailSelectBtn.setFillStyle(0x27272a).setStrokeStyle(2, 0x52525b);
      this.detailSelectText.setText('[ ТЕКУЩИЙ БОЕЦ ✓ ]').setColor('#94a3b8');
    } else {
      this.detailSelectBtn.setFillStyle(0x16a34a).setStrokeStyle(2, 0x86efac);
      this.detailSelectText.setText('[ ВЫБРАТЬ ЭТОГО БОЙЦА ]').setColor('#ffffff');
    }

    this.detailGroup.forEach(obj => (obj as unknown as { setVisible: (v: boolean) => void }).setVisible(true));
  }

  private applySelectedHero() {
    soundEngine.playClick();
    this.selectedHeroKey = this.tempHeroKey;
    localStorage.setItem('fb_current_hero', this.selectedHeroKey);

    const hero = HEROES[this.selectedHeroKey];
    this.player.setTexture(hero.texture);
    this.playerSpeed = hero.speed;
    this.playerHp = hero.hp;
    this.playerMaxHp = hero.hp;
    this.nameLabel.setText(hero.name).setColor(hero.colorHex);

    this.isMonster = false;
    this.player.setScale(1.15);
    if (this.player.body) {
      if (this.selectedHeroKey === 'char_kraul') {
        this.player.body.setSize(this.player.width * 0.7, this.player.height * 0.7);
      } else {
        this.player.body.setSize(this.player.width, this.player.height);
      }
    }

    this.alrikShieldActive = false;
    this.alrikShieldAngle = 0;
    this.isUltChanneling = false;
    if (this.alrikShieldGfx && this.alrikShieldGfx.active) {
      this.alrikShieldGfx.destroy();
      this.alrikShieldGfx = null;
    }
    this.player.setRotation(0);

    let wTex = 'weapon_stick';
    if (this.selectedHeroKey === 'char_grim') wTex = 'weapon_flask_launcher';
    else if (this.selectedHeroKey === 'char_bjorn') wTex = 'weapon_battleaxe';
    else if (this.selectedHeroKey === 'char_torf') wTex = 'weapon_boulder';
    else if (this.selectedHeroKey === 'char_omen') wTex = 'weapon_feather_darts';
    else if (this.selectedHeroKey === 'char_nihil') wTex = 'proj_nihil_sickle';
    else if (this.selectedHeroKey === 'char_alrik') wTex = 'weapon_spear';
    else if (this.selectedHeroKey === 'char_kraul') wTex = 'weapon_kraul_whips';
    if (this.playerWeaponVisual) {
      this.playerWeaponVisual.setTexture(wTex);
      this.playerWeaponVisual.setVisible(this.selectedHeroKey !== 'char_kraul' && this.selectedHeroKey !== 'char_nihil');
      this.playerWeaponVisual.setRotation(0);
    }

    this.updateCombatIcons();
    this.closeHeroMenu();

    // Floating text feedback
    this.showFloatingText(this.player.x, this.player.y - 60, `БОЕЦ ${hero.name} ВЫБРАН!`, hero.colorHex);
  }

  // --- LOBBY / MATCHMAKING GATE MODAL (Flat Scene GameObjects for 100% reliable clicks) ---
  private buildLobbyGateModal(width: number, height: number) {
    const cx = width / 2;
    const cy = height / 2;

    // Dim Backdrop (blocks clicks through to the world)
    this.lobbyOverlay = this.add.rectangle(cx, cy, width * 2, height * 2, 0x000000, 0.85)
      .setScrollFactor(0).setDepth(500).setVisible(false).setInteractive();

    this.lobbyOverlay.on('pointerdown', (_p: unknown, _lx: unknown, _ly: unknown, event: { stopPropagation: () => void }) => {
      event.stopPropagation();
    });

    // Window Frame (640 x 440 with gold/amber border)
    this.lobbyBg = this.add.rectangle(cx, cy, 640, 440, 0x0f111a)
      .setStrokeStyle(3, 0xd97706)
      .setScrollFactor(0).setDepth(501).setVisible(false);

    // Title
    this.lobbyTitle = this.add.text(cx, cy - 175, '✦ ПОРТАЛ ПРИКЛЮЧЕНИЙ ✦', {
      fontSize: '22px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#facc15'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(502).setVisible(false);

    // Back Button
    this.lobbyBackBtn = this.add.text(cx - 260, cy - 175, '< НАЗАД', {
      fontSize: '15px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#facc15',
      backgroundColor: '#1e2230',
      padding: { x: 10, y: 5 }
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(502).setInteractive({ useHandCursor: true }).setVisible(false);

    this.lobbyBackBtn.on('pointerdown', () => {
      soundEngine.playClick();
      this.handleLobbyBack();
    });

    // Close Button
    this.lobbyCloseBtn = this.add.text(cx + 275, cy - 175, '[X]', {
      fontSize: '22px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#ef4444'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(502).setInteractive({ useHandCursor: true }).setVisible(false);

    this.lobbyCloseBtn.on('pointerdown', () => this.closeLobby());

    this.lobbyBaseGroup = [this.lobbyOverlay, this.lobbyBg, this.lobbyTitle, this.lobbyBackBtn, this.lobbyCloseBtn];

    // ==========================================
    // 1. ROOT VIEW: 2 MAIN BUTTONS [ ПВП ] & [ ПОДЗЕМЕЛЬЕ ]
    // ==========================================
    const rootPvpY = cy - 40;
    const btnRootPvpBg = this.add.rectangle(cx, rootPvpY, 480, 80, 0x181a26)
      .setStrokeStyle(3, 0xd97706)
      .setScrollFactor(0).setDepth(502).setInteractive({ useHandCursor: true }).setVisible(false);

    const btnRootPvpTitle = this.add.text(cx, rootPvpY - 14, '[ ⚔️ ПВП АРЕНА ]', {
      fontSize: '21px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#facc15'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(503).setInteractive({ useHandCursor: true }).setVisible(false);

    const btnRootPvpDesc = this.add.text(cx, rootPvpY + 16, 'Обычные матчи • Рейтинговая лига • Битва за кубки', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#cbd5e1'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(503).setInteractive({ useHandCursor: true }).setVisible(false);

    const triggerRootPvp = () => {
      soundEngine.playClick();
      this.showPvPModes();
    };
    btnRootPvpBg.on('pointerdown', triggerRootPvp);
    btnRootPvpTitle.on('pointerdown', triggerRootPvp);
    btnRootPvpDesc.on('pointerdown', triggerRootPvp);

    btnRootPvpBg.on('pointerover', () => {
      btnRootPvpBg.setStrokeStyle(3, 0xfde047).setFillStyle(0x27273a);
      btnRootPvpTitle.setColor('#fde047');
    });
    btnRootPvpBg.on('pointerout', () => {
      btnRootPvpBg.setStrokeStyle(3, 0xd97706).setFillStyle(0x181a26);
      btnRootPvpTitle.setColor('#facc15');
    });

    const rootDungY = cy + 60;
    const btnRootDungBg = this.add.rectangle(cx, rootDungY, 480, 80, 0x064e3b)
      .setStrokeStyle(3, 0x10b981)
      .setScrollFactor(0).setDepth(502).setInteractive({ useHandCursor: true }).setVisible(false);

    const btnRootDungTitle = this.add.text(cx, rootDungY - 14, '[ 🗝️ ПОДЗЕМЕЛЬЕ ]', {
      fontSize: '21px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#34d399'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(503).setInteractive({ useHandCursor: true }).setVisible(false);

    const btnRootDungDesc = this.add.text(cx, rootDungY + 16, 'Рогалик Soul Knight • Монстры, комнаты, лут и Босс', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#a7f3d0'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(503).setInteractive({ useHandCursor: true }).setVisible(false);

    const triggerRootDung = () => {
      soundEngine.playClick();
      this.showDungeonModes();
    };
    btnRootDungBg.on('pointerdown', triggerRootDung);
    btnRootDungTitle.on('pointerdown', triggerRootDung);
    btnRootDungDesc.on('pointerdown', triggerRootDung);

    btnRootDungBg.on('pointerover', () => {
      btnRootDungBg.setStrokeStyle(3, 0x6ee7b7).setFillStyle(0x047857);
      btnRootDungTitle.setColor('#6ee7b7');
    });
    btnRootDungBg.on('pointerout', () => {
      btnRootDungBg.setStrokeStyle(3, 0x10b981).setFillStyle(0x064e3b);
      btnRootDungTitle.setColor('#34d399');
    });

    this.portalRootGroup = [btnRootPvpBg, btnRootPvpTitle, btnRootPvpDesc, btnRootDungBg, btnRootDungTitle, btnRootDungDesc];

    // ==========================================
    // 2. PVP MODES: [ ОБЫЧНЫЙ ] & [ РЕЙТИНГОВЫЙ ]
    // ==========================================
    const casualY = cy - 40;
    const btnCasualBg = this.add.rectangle(cx, casualY, 460, 78, 0x181a26)
      .setStrokeStyle(3, 0xd97706)
      .setScrollFactor(0).setDepth(502).setInteractive({ useHandCursor: true }).setVisible(false);

    const btnCasualTitle = this.add.text(cx, casualY - 14, '[ ⚔ ОБЫЧНЫЙ МАТЧ ]', {
      fontSize: '20px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(503).setInteractive({ useHandCursor: true }).setVisible(false);

    const btnCasualDesc = this.add.text(cx, casualY + 16, 'Быстрый вход • Свободный бой и тренировка арены', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#94a3b8'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(503).setInteractive({ useHandCursor: true }).setVisible(false);

    const triggerCasual = () => {
      soundEngine.playClick();
      this.showCasualMatchLobby();
    };
    btnCasualBg.on('pointerdown', triggerCasual);
    btnCasualTitle.on('pointerdown', triggerCasual);
    btnCasualDesc.on('pointerdown', triggerCasual);

    const rankedY = cy + 60;
    const btnRankedBg = this.add.rectangle(cx, rankedY, 460, 78, 0x451a03)
      .setStrokeStyle(3, 0xfbbf24)
      .setScrollFactor(0).setDepth(502).setInteractive({ useHandCursor: true }).setVisible(false);

    const btnRankedTitle = this.add.text(cx, rankedY - 14, '[ 👑 РЕЙТИНГОВЫЙ МАТЧ ]', {
      fontSize: '20px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#fbbf24'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(503).setInteractive({ useHandCursor: true }).setVisible(false);

    const btnRankedDesc = this.add.text(cx, rankedY + 16, 'Борьба за кубки и ранги • Золотая лига • Сезон 1', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#fde68a'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(503).setInteractive({ useHandCursor: true }).setVisible(false);

    const triggerRanked = () => {
      soundEngine.playClick();
      this.showRankedMatchLobby();
    };
    btnRankedBg.on('pointerdown', triggerRanked);
    btnRankedTitle.on('pointerdown', triggerRanked);
    btnRankedDesc.on('pointerdown', triggerRanked);

    this.pvpModesGroup = [btnCasualBg, btnCasualTitle, btnCasualDesc, btnRankedBg, btnRankedTitle, btnRankedDesc];

    // ==========================================
    // 3. DUNGEON MODES: [ СОЛО ] & [ ОНЛАЙН ]
    // ==========================================
    const soloY = cy - 40;
    const btnSoloBg = this.add.rectangle(cx, soloY, 460, 78, 0x1e293b)
      .setStrokeStyle(3, 0xf59e0b)
      .setScrollFactor(0).setDepth(502).setInteractive({ useHandCursor: true }).setVisible(false);

    const btnSoloTitle = this.add.text(cx, soloY - 14, '[ 🛡️ СОЛО РЕЖИМ ]', {
      fontSize: '20px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#fcd34d'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(503).setInteractive({ useHandCursor: true }).setVisible(false);

    const btnSoloDesc = this.add.text(cx, soloY + 16, 'Одиночный поход • Случайная генерация • Испытание героя', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#fef08a'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(503).setInteractive({ useHandCursor: true }).setVisible(false);

    const triggerSoloDung = () => {
      soundEngine.playClick();
      soundEngine.playLevelUp();
      this.closeLobby();
      this.scene.start('DungeonScene', { 
        selectedHeroKey: this.selectedHeroKey, 
        mode: 'solo'
      });
    };
    btnSoloBg.on('pointerdown', triggerSoloDung);
    btnSoloTitle.on('pointerdown', triggerSoloDung);
    btnSoloDesc.on('pointerdown', triggerSoloDung);

    const onlineY = cy + 60;
    const btnOnlineBg = this.add.rectangle(cx, onlineY, 460, 78, 0x064e3b)
      .setStrokeStyle(3, 0x34d399)
      .setScrollFactor(0).setDepth(502).setInteractive({ useHandCursor: true }).setVisible(false);

    const btnOnlineTitle = this.add.text(cx, onlineY - 14, '[ 🌐 ОНЛАЙН С ДРУЗЬЯМИ ]', {
      fontSize: '20px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#6ee7b7'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(503).setInteractive({ useHandCursor: true }).setVisible(false);

    const btnOnlineDesc = this.add.text(cx, onlineY + 16, 'Кооператив • Совместное подземелье и воскрешение соратников', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#a7f3d0'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(503).setInteractive({ useHandCursor: true }).setVisible(false);

    const triggerOnlineChoice = () => {
      soundEngine.playClick();
      this.showDungeonOnlineChoice();
    };
    btnOnlineBg.on('pointerdown', triggerOnlineChoice);
    btnOnlineTitle.on('pointerdown', triggerOnlineChoice);
    btnOnlineDesc.on('pointerdown', triggerOnlineChoice);

    this.dungeonModesGroup = [btnSoloBg, btnSoloTitle, btnSoloDesc, btnOnlineBg, btnOnlineTitle, btnOnlineDesc];

    // ==========================================
    // 4. DUNGEON ONLINE CHOICE: [ СОЗДАТЬ ] & [ ВОЙТИ ]
    // ==========================================
    const createChoiceY = cy - 40;
    const btnCreateChoiceBg = this.add.rectangle(cx, createChoiceY, 460, 78, 0x181a26)
      .setStrokeStyle(3, 0xf59e0b)
      .setScrollFactor(0).setDepth(502).setInteractive({ useHandCursor: true }).setVisible(false);

    const btnCreateChoiceTitle = this.add.text(cx, createChoiceY - 14, '[ ➕ СОЗДАТЬ КОМНАТУ ]', {
      fontSize: '20px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#facc15'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(503).setInteractive({ useHandCursor: true }).setVisible(false);

    const btnCreateChoiceDesc = this.add.text(cx, createChoiceY + 16, 'Задать имя, пароль и создать персональный код для друзей', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#cbd5e1'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(503).setInteractive({ useHandCursor: true }).setVisible(false);

    const triggerShowCreate = () => {
      soundEngine.playClick();
      this.showDungeonCreateView();
    };
    btnCreateChoiceBg.on('pointerdown', triggerShowCreate);
    btnCreateChoiceTitle.on('pointerdown', triggerShowCreate);
    btnCreateChoiceDesc.on('pointerdown', triggerShowCreate);

    const joinChoiceY = cy + 60;
    const btnJoinChoiceBg = this.add.rectangle(cx, joinChoiceY, 460, 78, 0x312e81)
      .setStrokeStyle(3, 0xa855f7)
      .setScrollFactor(0).setDepth(502).setInteractive({ useHandCursor: true }).setVisible(false);

    const btnJoinChoiceTitle = this.add.text(cx, joinChoiceY - 14, '[ 🚪 ВОЙТИ В КОМНАТУ ]', {
      fontSize: '20px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#c084fc'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(503).setInteractive({ useHandCursor: true }).setVisible(false);

    const btnJoinChoiceDesc = this.add.text(cx, joinChoiceY + 16, 'Список открытых серверов • Подбор • Вход по коду', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#e9d5ff'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(503).setInteractive({ useHandCursor: true }).setVisible(false);

    const triggerShowServers = () => {
      soundEngine.playClick();
      this.showDungeonServersView();
    };
    btnJoinChoiceBg.on('pointerdown', triggerShowServers);
    btnJoinChoiceTitle.on('pointerdown', triggerShowServers);
    btnJoinChoiceDesc.on('pointerdown', triggerShowServers);

    this.dungeonOnlineChoiceGroup = [btnCreateChoiceBg, btnCreateChoiceTitle, btnCreateChoiceDesc, btnJoinChoiceBg, btnJoinChoiceTitle, btnJoinChoiceDesc];

    // ==========================================
    // 5. DUNGEON CREATE VIEW (PUBLIC VS PRIVATE MODE, CODE, NAME, PASS, MAX PLAYERS)
    // ==========================================
    const createBox = this.add.rectangle(cx, cy, 540, 270, 0x181a26)
      .setStrokeStyle(2, 0xd97706)
      .setScrollFactor(0).setDepth(502).setVisible(false);

    // Row 1: Public / Private Toggle Button (Top Centered)
    this.btnTypeToggleBg = this.add.rectangle(cx, cy - 100, 420, 38, 0x064e3b)
      .setStrokeStyle(2, 0x22c55e).setScrollFactor(0).setDepth(502).setInteractive({ useHandCursor: true }).setVisible(false);
    this.btnTypeToggleTxt = this.add.text(cx, cy - 100, '🌐 ПУБЛИЧНЫЙ СЕРВЕР (В СПИСКЕ)', {
      fontSize: '13px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffffff'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(503).setInteractive({ useHandCursor: true }).setVisible(false);

    const toggleType = () => {
      soundEngine.playClick();
      this.isPrivateRoom = !this.isPrivateRoom;
      this.updateCreateViewVisibility();
    };
    this.btnTypeToggleBg.on('pointerdown', toggleType);
    this.btnTypeToggleTxt.on('pointerdown', toggleType);

    // Row 2 (Public Mode): Server Name Display
    this.roomNameDisplay = this.add.text(cx, cy - 45, `ИМЯ СЕРВЕРА: ${this.currentRoomName} ✎`, {
      fontSize: '13px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#ffffff',
      backgroundColor: '#27272a',
      padding: { x: 12, y: 6 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(503).setInteractive({ useHandCursor: true }).setVisible(false);

    this.roomNameDisplay.on('pointerdown', () => {
      soundEngine.playClick();
      showHTMLInputModal({
        title: 'ИМЯ ВАШЕГО СЕРВЕРА',
        defaultValue: this.currentRoomName,
        confirmText: 'СОХРАНИТЬ',
        onConfirm: (inputName) => {
          if (inputName) {
            this.currentRoomName = inputName.slice(0, 30);
            this.roomNameDisplay.setText(`ИМЯ СЕРВЕРА: ${this.currentRoomName} ✎`);
          }
        }
      });
    });

    // Row 3 (Public Mode Left): Server Password
    this.roomPassDisplay = this.add.text(cx - 110, cy + 10, '🔑 ПАРОЛЬ: [ БЕЗ ПАРОЛЯ ✎ ]', {
      fontSize: '11px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#4ade80',
      backgroundColor: '#27272a',
      padding: { x: 8, y: 6 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(503).setInteractive({ useHandCursor: true }).setVisible(false);

    this.roomPassDisplay.on('pointerdown', () => {
      soundEngine.playClick();
      showHTMLInputModal({
        title: 'ПАРОЛЬ СЕРВЕРА',
        placeholder: 'Оставьте пустым для открытой комнаты...',
        defaultValue: this.roomPassword,
        confirmText: 'СОХРАНИТЬ',
        onConfirm: (userPass) => {
          this.roomPassword = userPass;
          if (this.roomPassword) {
            this.roomPassDisplay.setText(`🔑 ПАРОЛЬ: [ 🔒 ${this.roomPassword} ✎ ]`).setColor('#facc15');
          } else {
            this.roomPassDisplay.setText('🔑 ПАРОЛЬ: [ БЕЗ ПАРОЛЯ ✎ ]').setColor('#4ade80');
          }
        }
      });
    });

    // Row 3 (Right): Max Players Limit Button
    const btnMaxPlayersBg = this.add.rectangle(cx + 110, cy + 10, 190, 34, 0x1e293b)
      .setStrokeStyle(2, 0x38bdf8).setScrollFactor(0).setDepth(502).setInteractive({ useHandCursor: true }).setVisible(false);
    const btnMaxPlayersTxt = this.add.text(cx + 110, cy + 10, `👥 МАКС: ${this.maxPlayersLimit} ИГРОКА ✎`, {
      fontSize: '11px', fontFamily: 'monospace', fontStyle: 'bold', color: '#38bdf8'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(503).setInteractive({ useHandCursor: true }).setVisible(false);

    const toggleMaxPlayers = () => {
      soundEngine.playClick();
      this.maxPlayersLimit = this.maxPlayersLimit === 4 ? 2 : (this.maxPlayersLimit === 2 ? 3 : 4);
      btnMaxPlayersTxt.setText(`👥 МАКС: ${this.maxPlayersLimit} ИГРОКА ✎`);
    };
    btnMaxPlayersBg.on('pointerdown', toggleMaxPlayers);
    btnMaxPlayersTxt.on('pointerdown', toggleMaxPlayers);

    // Row 2 (Private Mode): Unique Code Display
    this.personalCodeDisplay = this.add.text(cx, cy - 45, `🎲 УНИКАЛЬНЫЙ КОД: ${this.currentPersonalCode}`, {
      fontSize: '14px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#fbbf24',
      backgroundColor: '#451a03',
      padding: { x: 12, y: 7 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(503).setVisible(false);

    // Row 3 (Private Mode Left): Generate New Code Button
    this.btnGenCodeBg = this.add.rectangle(cx - 110, cy + 10, 210, 34, 0x3f3f46)
      .setStrokeStyle(2, 0xfbbf24)
      .setScrollFactor(0).setDepth(502).setInteractive({ useHandCursor: true }).setVisible(false);

    this.btnGenCodeText = this.add.text(cx - 110, cy + 10, '🎲 ОБНОВИТЬ КОД', {
      fontSize: '11px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#facc15'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(503).setInteractive({ useHandCursor: true }).setVisible(false);

    const triggerGenCode = () => {
      soundEngine.playClick();
      this.currentPersonalCode = 'DG-' + Math.floor(1000 + Math.random() * 9000);
      this.personalCodeDisplay.setText(`🎲 УНИКАЛЬНЫЙ КОД: ${this.currentPersonalCode}`);
      this.showFloatingText(this.personalCodeDisplay.x, this.personalCodeDisplay.y - 30, 'КОД ОБНОВЛЕН!', '#fbbf24');
    };
    this.btnGenCodeBg.on('pointerdown', triggerGenCode);
    this.btnGenCodeText.on('pointerdown', triggerGenCode);

    // Row 4 (Bottom): Main Create & Launch Button
    const btnCreateLaunchBg = this.add.rectangle(cx, cy + 80, 420, 46, 0x16a34a)
      .setStrokeStyle(3, 0x86efac)
      .setScrollFactor(0).setDepth(502).setInteractive({ useHandCursor: true }).setVisible(false);

    const btnCreateLaunchText = this.add.text(cx, cy + 80, '🚀 СОЗДАТЬ И ВОЙТИ В ЛОББИ ▶', {
      fontSize: '15px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(503).setInteractive({ useHandCursor: true }).setVisible(false);

    const triggerCreateLaunch = () => {
      soundEngine.playLevelUp();

      // Save created room into RoomManager registry
      RoomManager.createRoom({
        code: this.currentPersonalCode,
        name: this.isPrivateRoom ? `Приватная комната ${this.currentPersonalCode}` : this.currentRoomName,
        maxPlayers: this.maxPlayersLimit,
        isPrivate: this.isPrivateRoom,
        password: this.isPrivateRoom ? '' : this.roomPassword
      });

      this.closeLobby();
      this.scene.start('TavernScene', {
        selectedHeroKey: this.selectedHeroKey,
        isWaitingLobby: true,
        roomName: this.isPrivateRoom ? `Приватная комната ${this.currentPersonalCode}` : this.currentRoomName,
        maxPlayers: this.maxPlayersLimit,
        roomCode: this.currentPersonalCode
      });
    };
    btnCreateLaunchBg.on('pointerdown', triggerCreateLaunch);
    btnCreateLaunchText.on('pointerdown', triggerCreateLaunch);

    this.dungeonCreateGroup = [
      createBox,
      this.btnTypeToggleBg,
      this.btnTypeToggleTxt,
      btnMaxPlayersBg,
      btnMaxPlayersTxt,
      btnCreateLaunchBg,
      btnCreateLaunchText
    ];

    // ==========================================
    // 6. DUNGEON SERVERS VIEW: SEARCH, SCROLL & JOIN BY CODE
    // ==========================================
    const serverBox = this.add.rectangle(cx, cy - 35, 540, 160, 0x09090b)
      .setStrokeStyle(2, 0xd97706)
      .setScrollFactor(0).setDepth(502).setVisible(false);

    this.emptyServersText = this.add.text(cx, cy - 35, 'НЕТ АКТИВНЫХ СЕРВЕРОВ.\nСОЗДАЙТЕ СВОЙ В РАЗДЕЛЕ "СОЗДАТЬ"!', {
      fontSize: '13px', fontFamily: 'monospace', fontStyle: 'bold', color: '#facc15', align: 'center'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(503).setVisible(false);

    this.dungeonServerRows = [];
    this.dungeonServersGroup = [serverBox, this.emptyServersText];

    // Scroll buttons
    const btnScrollUp = this.add.text(cx + 210, cy - 110, '▲ ВВЕРХ', {
      fontSize: '10px', fontFamily: 'monospace', fontStyle: 'bold', color: '#fbbf24', backgroundColor: '#334155', padding: { x: 5, y: 3 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(503).setInteractive({ useHandCursor: true }).setVisible(false);

    const btnScrollDown = this.add.text(cx + 210, cy + 40, '▼ ВНИЗ', {
      fontSize: '10px', fontFamily: 'monospace', fontStyle: 'bold', color: '#fbbf24', backgroundColor: '#334155', padding: { x: 5, y: 3 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(503).setInteractive({ useHandCursor: true }).setVisible(false);

    const updateServerListUI = () => {
      // READ REAL ACTIVE PUBLIC ROOMS ONLY (NO FAKE SERVERS, NO PRIVATE ROOMS)
      const activeRooms = RoomManager.getRooms().filter(r => !r.isPrivate);
      const filtered = activeRooms.filter(s =>
        !this.serverSearchQuery || s.name.toLowerCase().includes(this.serverSearchQuery) || s.code.toLowerCase().includes(this.serverSearchQuery)
      );

      if (filtered.length === 0) {
        this.emptyServersText.setVisible(this.isLobbyOpen && this.lobbyView === 'dungeon_servers');
        for (let i = 0; i < 3; i++) {
          if (this.dungeonServerRows[i]) {
            this.dungeonServerRows[i].label.setVisible(false);
            this.dungeonServerRows[i].bg.setVisible(false);
            this.dungeonServerRows[i].btn.setVisible(false);
          }
        }
        return;
      }

      this.emptyServersText.setVisible(false);

      for (let i = 0; i < 3; i++) {
        const row = this.dungeonServerRows[i];
        if (!row) continue;
        const sIdx = this.serverScrollIndex * 3 + i;

        if (sIdx < filtered.length) {
          const sItem = filtered[sIdx];
          row.label.setText(`[▶] ${sItem.name} • ${sItem.currentPlayers}/${sItem.maxPlayers} • Код: ${sItem.code}`)
            .setVisible(this.isLobbyOpen && this.lobbyView === 'dungeon_servers');
          row.bg.setVisible(this.isLobbyOpen && this.lobbyView === 'dungeon_servers');
          row.bg.setData('code', sItem.code);
          row.btn.setVisible(this.isLobbyOpen && this.lobbyView === 'dungeon_servers');
          row.code = sItem.code;
        } else {
          row.label.setVisible(false);
          row.bg.setVisible(false);
          row.btn.setVisible(false);
        }
      }
    };

    btnScrollUp.on('pointerdown', () => {
      soundEngine.playClick();
      if (this.serverScrollIndex > 0) {
        this.serverScrollIndex--;
        updateServerListUI();
      }
    });

    btnScrollDown.on('pointerdown', () => {
      soundEngine.playClick();
      const activeRooms = RoomManager.getRooms().filter(r => !r.isPrivate);
      if ((this.serverScrollIndex + 1) * 3 < activeRooms.length) {
        this.serverScrollIndex++;
        updateServerListUI();
      }
    });

    this.dungeonServersGroup.push(btnScrollUp, btnScrollDown);

    for (let i = 0; i < 3; i++) {
      const sY = cy - 85 + i * 44;
      const rowBg = this.add.rectangle(cx, sY, 510, 36, 0x1f2937)
        .setStrokeStyle(1, 0xd97706)
        .setScrollFactor(0).setDepth(502).setVisible(false);

      const rowLabel = this.add.text(cx - 240, sY, '', {
        fontSize: '12px',
        fontFamily: 'monospace',
        color: '#ffffff'
      }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(503).setVisible(false);

      const rowBtn = this.add.text(cx + 200, sY, '[ ВОЙТИ ]', {
        fontSize: '12px',
        fontFamily: 'monospace',
        fontStyle: 'bold',
        color: '#4ade80',
        backgroundColor: '#064e3b',
        padding: { x: 8, y: 3 }
      }).setOrigin(0.5).setScrollFactor(0).setDepth(503).setInteractive({ useHandCursor: true }).setVisible(false);

      const joinServer = () => {
        soundEngine.playLevelUp();
        this.closeLobby();
        const rowCode = (rowBg.getData('code') as string) || 'DG-4820';
        const found = RoomManager.getRoomByCode(rowCode);
        this.scene.start('TavernScene', {
          selectedHeroKey: this.selectedHeroKey,
          isWaitingLobby: true,
          roomName: found ? found.name : 'Сервер Подземелья',
          maxPlayers: found ? found.maxPlayers : 4,
          roomCode: rowCode
        });
      };
      rowBtn.on('pointerdown', joinServer);

      this.dungeonServerRows.push({ label: rowLabel, btn: rowBtn, bg: rowBg, code: '' });
      // NOTE: DO NOT push rowBg, rowLabel, rowBtn to dungeonServersGroup to prevent showArray from forcing them visible when empty!
    }

    // Bottom 3 Action Buttons: [ ПОДБОР ] [ 🔍 ПОИСК ] [ 🔑 ПО КОДУ ]
    const btnMatchBg = this.add.rectangle(cx - 170, cy + 85, 155, 46, 0x16a34a)
      .setStrokeStyle(2, 0x86efac)
      .setScrollFactor(0).setDepth(502).setInteractive({ useHandCursor: true }).setVisible(false);

    const btnMatchText = this.add.text(cx - 170, cy + 85, '[ ⚡ ПОДБОР ]', {
      fontSize: '14px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(503).setInteractive({ useHandCursor: true }).setVisible(false);

    const triggerDungMatch = () => {
      soundEngine.playClick();
      const publicRooms = RoomManager.getRooms().filter(r => !r.isPrivate);
      if (publicRooms.length > 0) {
        const matched = publicRooms[0];
        soundEngine.playLevelUp();
        this.closeLobby();
        this.scene.start('TavernScene', {
          selectedHeroKey: this.selectedHeroKey,
          isWaitingLobby: true,
          roomName: matched.name,
          maxPlayers: matched.maxPlayers,
          roomCode: matched.code
        });
      } else {
        this.showFloatingText(cx, cy - 30, 'НЕТ АКТИВНЫХ СЕРВЕРОВ ДЛЯ ПОДБОРА!', '#f87171');
      }
    };
    btnMatchBg.on('pointerdown', triggerDungMatch);
    btnMatchText.on('pointerdown', triggerDungMatch);

    const btnSearchBg = this.add.rectangle(cx, cy + 85, 155, 46, 0x27272a)
      .setStrokeStyle(2, 0x38bdf8)
      .setScrollFactor(0).setDepth(502).setInteractive({ useHandCursor: true }).setVisible(false);

    const btnSearchText = this.add.text(cx, cy + 85, '[ 🔍 ПОИСК ]', {
      fontSize: '14px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#38bdf8'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(503).setInteractive({ useHandCursor: true }).setVisible(false);

    const triggerDungSearch = () => {
      soundEngine.playClick();
      showHTMLInputModal({
        title: '🔍 ПОИСК СЕРВЕРА ПО ИМЕНИ ИЛИ КОДУ',
        placeholder: 'Введите имя или код (например, DG-7429)...',
        confirmText: 'ИСКАТЬ',
        onConfirm: (searchQuery) => {
          this.serverSearchQuery = searchQuery.toLowerCase();
          this.serverScrollIndex = 0;
          updateServerListUI();
          this.showFloatingText(cx, cy - 30, this.serverSearchQuery ? `ПОИСК: "${searchQuery}"` : 'ПОИСК СБРОШЕН', '#38bdf8');
        }
      });
    };
    btnSearchBg.on('pointerdown', triggerDungSearch);
    btnSearchText.on('pointerdown', triggerDungSearch);

    const btnCodeBg = this.add.rectangle(cx + 170, cy + 85, 155, 46, 0x451a03)
      .setStrokeStyle(2, 0xfbbf24)
      .setScrollFactor(0).setDepth(502).setInteractive({ useHandCursor: true }).setVisible(false);

    const btnCodeText = this.add.text(cx + 170, cy + 85, '[ 🔑 ПО КОДУ ]', {
      fontSize: '14px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#fbbf24'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(503).setInteractive({ useHandCursor: true }).setVisible(false);

    const triggerJoinByCode = () => {
      soundEngine.playClick();
      showHTMLInputModal({
        title: '🔑 ВХОД В КОМНАТУ ПО КОДУ',
        placeholder: 'Введите код комнаты (например, DG-7429)...',
        confirmText: 'ВОЙТИ В ЛОББИ',
        onConfirm: (enteredCode) => {
          if (enteredCode) {
            const cleanCode = enteredCode.toUpperCase();
            soundEngine.playLevelUp();
            this.closeLobby();
            const found = RoomManager.getRoomByCode(cleanCode);
            this.scene.start('TavernScene', {
              selectedHeroKey: this.selectedHeroKey,
              isWaitingLobby: true,
              roomName: found ? found.name : `Комната ${cleanCode}`,
              maxPlayers: found ? found.maxPlayers : 4,
              roomCode: cleanCode
            });
          }
        }
      });
    };
    btnCodeBg.on('pointerdown', triggerJoinByCode);
    btnCodeText.on('pointerdown', triggerJoinByCode);

    this.dungeonServersGroup.push(btnMatchBg, btnMatchText, btnSearchBg, btnSearchText, btnCodeBg, btnCodeText);

    // ==========================================
    // 7. RANKED MATCH VIEW
    // ==========================================
    const rankIcon = this.add.image(cx, cy - 90, 'rank_gold')
      .setScale(1.8).setScrollFactor(0).setDepth(502).setVisible(false);

    const rankName = this.add.text(cx, cy - 45, 'РАНГ: ЗОЛОТОЙ ВОИН', {
      fontSize: '20px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#fbbf24'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(503).setVisible(false);

    const rankPts = this.add.text(cx, cy - 15, 'ОЧКИ: 1450 / 1500  (До Платины: 50 pts)', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#e2e8f0'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(503).setVisible(false);

    const teamModes = ['[ 👤 СОЛО ]', '[ 👥 ДУО ]', '[ 🫂 ТРИО ]'];
    let teamIdx = 0;

    const teamBg = this.add.rectangle(cx - 100, cy + 55, 170, 48, 0x3f3f46)
      .setStrokeStyle(2, 0xa1a1aa)
      .setScrollFactor(0).setDepth(502).setInteractive({ useHandCursor: true }).setVisible(false);

    const teamBtn = this.add.text(cx - 100, cy + 55, teamModes[teamIdx], {
      fontSize: '17px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(503).setInteractive({ useHandCursor: true }).setVisible(false);

    const toggleTeam = () => {
      soundEngine.playClick();
      teamIdx = (teamIdx + 1) % 3;
      teamBtn.setText(teamModes[teamIdx]);
    };
    teamBg.on('pointerdown', toggleTeam);
    teamBtn.on('pointerdown', toggleTeam);

    const startRankedBg = this.add.rectangle(cx + 100, cy + 55, 170, 48, 0x16a34a)
      .setStrokeStyle(3, 0x86efac)
      .setScrollFactor(0).setDepth(502).setInteractive({ useHandCursor: true }).setVisible(false);

    const startRankedBtn = this.add.text(cx + 100, cy + 55, 'В БОЙ ▶', {
      fontSize: '18px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(503).setInteractive({ useHandCursor: true }).setVisible(false);

    const triggerStartRanked = () => {
      this.startMatchmaking(6);
    };
    startRankedBg.on('pointerdown', triggerStartRanked);
    startRankedBtn.on('pointerdown', triggerStartRanked);

    this.rankedGroup = [rankIcon, rankName, rankPts, teamBg, teamBtn, startRankedBg, startRankedBtn];

    // ==========================================
    // 8. CASUAL MATCH VIEW (ПОДБОР, СПИСОК СЕРВЕРОВ, СОЗДАТЬ СЕРВЕР)
    // ==========================================
    const casualBox = this.add.rectangle(cx, cy, 560, 220, 0x181a26, 0.95)
      .setStrokeStyle(3, 0xd97706)
      .setScrollFactor(0).setDepth(502).setVisible(false);

    const casualHeader = this.add.text(cx, cy - 70, '⚔️ ОБЫЧНЫЙ PVP / MOBA РЕЖИМ ⚔️', {
      fontSize: '17px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#fbbf24'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(503).setVisible(false);

    const casualSub = this.add.text(cx, cy - 44, 'Сражайтесь 1v1, 2v2, 3v3 или 4v4 на боевой арене', {
      fontSize: '11px',
      fontFamily: 'monospace',
      color: '#94a3b8'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(503).setVisible(false);

    // 3 Buttons Row with equal spacing
    const btnWidth = 164;
    const btnSpacing = 176;

    // 1. [ ⚡ БЫСТРЫЙ ПОДБОР ]
    const btnPvpMatchBg = this.add.rectangle(cx - btnSpacing, cy + 20, btnWidth, 52, 0x15803d)
      .setStrokeStyle(2, 0x4ade80)
      .setScrollFactor(0).setDepth(502).setInteractive({ useHandCursor: true }).setVisible(false);

    const btnPvpMatchText = this.add.text(cx - btnSpacing, cy + 20, '⚡ БЫСТРЫЙ\nПОДБОР', {
      fontSize: '12px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(503).setInteractive({ useHandCursor: true }).setVisible(false);

    const triggerPvpMatch = () => {
      soundEngine.playLevelUp();
      this.closeLobby();
      this.scene.start('MobaScene', {
        mode: 'solo',
        playerTeam: 'blue',
        heroKey: this.selectedHeroKey
      });
    };
    btnPvpMatchBg.on('pointerdown', triggerPvpMatch);
    btnPvpMatchText.on('pointerdown', triggerPvpMatch);

    // 2. [ 🔍 СПИСОК СЕРВЕРОВ ]
    const btnPvpSearchBg = this.add.rectangle(cx, cy + 20, btnWidth, 52, 0x0369a1)
      .setStrokeStyle(2, 0x38bdf8)
      .setScrollFactor(0).setDepth(502).setInteractive({ useHandCursor: true }).setVisible(false);

    const btnPvpSearchText = this.add.text(cx, cy + 20, '🔍 СПИСОК\nСЕРВЕРОВ', {
      fontSize: '12px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#e0f2fe',
      align: 'center'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(503).setInteractive({ useHandCursor: true }).setVisible(false);

    const triggerPvpSearch = () => {
      soundEngine.playClick();
      showHTMLInputModal({
        title: '🔍 ПОИСК PVP КОМНАТЫ',
        placeholder: 'Введите название или код (например, PVP-7429)...',
        confirmText: 'ИСКАТЬ',
        onConfirm: (q) => {
          if (q) {
            this.showFloatingText(cx, cy - 20, `ПОИСК: "${q}"`, '#38bdf8');
            const found = RoomManager.getRoomByCode(q);
            if (found) {
              soundEngine.playLevelUp();
              this.closeLobby();
              const mode: 'solo' | 'duo' | 'trio' | '4v4' = found.maxPlayers <= 2 ? 'solo' : (found.maxPlayers <= 4 ? 'duo' : (found.maxPlayers <= 6 ? 'trio' : '4v4'));
              new CustomRoomLobby(this, {
                roomName: found.name,
                password: found.password,
                mode,
                heroKey: this.selectedHeroKey
              }, {
                onStartMatch: (cfg) => { this.scene.start('MobaScene', cfg); },
                onCloseLobby: () => { this.openLobby(); this.showCasualMatchLobby(); }
              });
            } else {
              this.showFloatingText(cx, cy - 20, `КОМНАТА "${q}" НЕ НАЙДЕНА`, '#ef4444');
            }
          }
        }
      });
    };
    btnPvpSearchBg.on('pointerdown', triggerPvpSearch);
    btnPvpSearchText.on('pointerdown', triggerPvpSearch);

    // 3. [ ➕ СОЗДАТЬ СЕРВЕР ]
    const btnCreatePvpBg = this.add.rectangle(cx + btnSpacing, cy + 20, btnWidth, 52, 0x78350f)
      .setStrokeStyle(2, 0xfbbf24)
      .setScrollFactor(0).setDepth(502).setInteractive({ useHandCursor: true }).setVisible(false);

    const btnCreatePvpText = this.add.text(cx + btnSpacing, cy + 20, '➕ СОЗДАТЬ\nСЕРВЕР', {
      fontSize: '12px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#fef08a',
      align: 'center'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(503).setInteractive({ useHandCursor: true }).setVisible(false);

    const triggerOpenCreateModal = () => {
      soundEngine.playClick();
      this.closeLobby();
      CustomRoomLobby.openCreateServerDialog(this, this.selectedHeroKey, {
        onStartMatch: (cfg) => {
          this.scene.start('MobaScene', {
            mode: cfg.mode,
            playerTeam: cfg.playerTeam,
            heroKey: cfg.heroKey,
            roomConfig: cfg.roomConfig
          });
        },
        onCloseLobby: () => {
          this.openLobby();
          this.showCasualMatchLobby();
        }
      });
    };
    btnCreatePvpBg.on('pointerdown', triggerOpenCreateModal);
    btnCreatePvpText.on('pointerdown', triggerOpenCreateModal);

    this.serverLabels = [];
    this.casualGroup = [
      casualBox,
      casualHeader,
      casualSub,
      btnPvpMatchBg,
      btnPvpMatchText,
      btnPvpSearchBg,
      btnPvpSearchText,
      btnCreatePvpBg,
      btnCreatePvpText
    ];

    // ==========================================
    // 9. MATCHMAKING SEARCH STATUS
    // ==========================================
    this.matchmakingSearchText = this.add.text(cx, cy - 20, '', {
      fontSize: '22px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#4ade80'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(503).setVisible(false);

    const cancelSearchBg = this.add.rectangle(cx, cy + 50, 180, 44, 0x3f3f46)
      .setStrokeStyle(2, 0xef4444)
      .setScrollFactor(0).setDepth(502).setInteractive({ useHandCursor: true }).setVisible(false);

    const cancelSearchBtn = this.add.text(cx, cy + 50, '[ ОТМЕНА ]', {
      fontSize: '16px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#f87171'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(503).setInteractive({ useHandCursor: true }).setVisible(false);

    const triggerCancelSearch = () => {
      soundEngine.playClick();
      if (this.matchmakingTimer) {
        this.matchmakingTimer.remove();
        this.matchmakingTimer = null;
      }
      this.showPvPModes();
    };
    cancelSearchBg.on('pointerdown', triggerCancelSearch);
    cancelSearchBtn.on('pointerdown', triggerCancelSearch);

    this.searchGroup = [this.matchmakingSearchText, cancelSearchBg, cancelSearchBtn];
  }

  private handleLobbyBack() {
    if (this.lobbyView === 'pvp_modes' || this.lobbyView === 'dungeon_modes') {
      this.showPortalRoot();
    } else if (this.lobbyView === 'casual' || this.lobbyView === 'ranked') {
      this.showPvPModes();
    } else if (this.lobbyView === 'dungeon_online_choice') {
      this.showDungeonModes();
    } else if (this.lobbyView === 'dungeon_create' || this.lobbyView === 'dungeon_servers') {
      this.showDungeonOnlineChoice();
    } else {
      this.showPortalRoot();
    }
  }

  private hideAllLobbyViews() {
    this.hideArray(this.portalRootGroup);
    this.hideArray(this.pvpModesGroup);
    this.hideArray(this.rankedGroup);
    this.hideArray(this.casualGroup);
    this.hideArray(this.searchGroup);
    this.hideArray(this.dungeonModesGroup);
    this.hideArray(this.dungeonOnlineChoiceGroup);
    this.hideArray(this.dungeonCreateGroup);
    this.hideArray(this.dungeonServersGroup);

    if (this.roomNameDisplay) this.roomNameDisplay.setVisible(false);
    if (this.roomPassDisplay) this.roomPassDisplay.setVisible(false);
    if (this.personalCodeDisplay) this.personalCodeDisplay.setVisible(false);
    if (this.btnGenCodeBg) this.btnGenCodeBg.setVisible(false);
    if (this.btnGenCodeText) this.btnGenCodeText.setVisible(false);
  }

  private openLobby(initialTab?: 'dungeon' | 'pvp') {
    this.isLobbyOpen = true;
    this.player.setVelocity(0, 0);
    this.interactPromptUI.setVisible(false);

    if (this.minimapContainer) this.minimapContainer.setVisible(false);
    this.combatElements.forEach(el => (el as unknown as { setVisible: (v: boolean) => void }).setVisible(false));
    if (this.joyStickBase) {
      this.joyStickBase.setVisible(false);
      this.joyStickThumb.setVisible(false);
    }

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const cx = width / 2;
    const cy = height / 2;

    this.repositionLobbyElements(cx, cy);

    if (this.lobbyOverlay && typeof this.lobbyOverlay.setDisplaySize === 'function') this.lobbyOverlay.setPosition(cx, cy).setDisplaySize(width * 2, height * 2).setVisible(true);
    if (this.lobbyBg) this.lobbyBg.setPosition(cx, cy).setVisible(true);
    this.lobbyTitle.setPosition(cx, cy - 175).setVisible(true);
    this.lobbyCloseBtn.setPosition(cx + 275, cy - 175).setVisible(true);

    if (initialTab === 'dungeon') {
      this.showDungeonModes();
    } else if (initialTab === 'pvp') {
      this.showPvPModes();
    } else {
      this.showPortalRoot();
    }
  }

  private closeLobby() {
    soundEngine.playClick();
    this.isLobbyOpen = false;

    if (this.matchmakingTimer) {
      this.matchmakingTimer.remove();
      this.matchmakingTimer = null;
    }

    this.lobbyBaseGroup.forEach(obj => (obj as unknown as { setVisible: (v: boolean) => void }).setVisible(false));
    this.hideAllLobbyViews();

    if (this.minimapContainer) this.minimapContainer.setVisible(true);
    this.combatElements.forEach(el => (el as unknown as { setVisible: (v: boolean) => void }).setVisible(true));
    if (!this.isPC && this.joyStickBase) {
      this.joyStickBase.setVisible(true);
      this.joyStickThumb.setVisible(true);
    }
  }

  private showPortalRoot() {
    this.lobbyView = 'portal_root';
    this.lobbyTitle.setText('✦ ПОРТАЛ ПРИКЛЮЧЕНИЙ ✦');
    this.lobbyBackBtn.setVisible(false);
    this.hideAllLobbyViews();
    this.showArray(this.portalRootGroup);
  }

  private showPvPModes() {
    this.lobbyView = 'pvp_modes';
    this.lobbyTitle.setText('ПВП: ВЫБОР РЕЖИМА');
    this.lobbyBackBtn.setVisible(true);
    this.hideAllLobbyViews();
    this.showArray(this.pvpModesGroup);
  }

  private showDungeonModes() {
    this.lobbyView = 'dungeon_modes';
    this.lobbyTitle.setText('ПОДЗЕМЕЛЬЕ: ВЫБОР РЕЖИМА');
    this.lobbyBackBtn.setVisible(true);
    this.hideAllLobbyViews();
    this.showArray(this.dungeonModesGroup);
  }

  private showDungeonOnlineChoice() {
    this.lobbyView = 'dungeon_online_choice';
    this.lobbyTitle.setText('ОНЛАЙН ПОДЗЕМЕЛЬЕ');
    this.lobbyBackBtn.setVisible(true);
    this.hideAllLobbyViews();
    this.showArray(this.dungeonOnlineChoiceGroup);
  }

  private showDungeonCreateView() {
    this.lobbyView = 'dungeon_create';
    this.lobbyTitle.setText('СОЗДАНИЕ КОМНАТЫ');
    this.lobbyBackBtn.setVisible(true);
    this.hideAllLobbyViews();
    this.showArray(this.dungeonCreateGroup);
    this.updateCreateViewVisibility();
  }

  private updateCreateViewVisibility() {
    const isCreateView = this.isLobbyOpen && this.lobbyView === 'dungeon_create';

    if (this.isPrivateRoom) {
      if (this.btnTypeToggleTxt) this.btnTypeToggleTxt.setText('🔒 ПРИВАТНАЯ КОМНАТА (ПО КОДУ)');
      if (this.btnTypeToggleBg) this.btnTypeToggleBg.setFillStyle(0x78350f).setStrokeStyle(2, 0xfbbf24);

      if (this.roomNameDisplay) this.roomNameDisplay.setVisible(false);
      if (this.roomPassDisplay) this.roomPassDisplay.setVisible(false);

      if (this.personalCodeDisplay) this.personalCodeDisplay.setVisible(isCreateView);
      if (this.btnGenCodeBg) this.btnGenCodeBg.setVisible(isCreateView);
      if (this.btnGenCodeText) this.btnGenCodeText.setVisible(isCreateView);
    } else {
      if (this.btnTypeToggleTxt) this.btnTypeToggleTxt.setText('🌐 ПУБЛИЧНЫЙ СЕРВЕР (В СПИСКЕ)');
      if (this.btnTypeToggleBg) this.btnTypeToggleBg.setFillStyle(0x064e3b).setStrokeStyle(2, 0x22c55e);

      if (this.roomNameDisplay) this.roomNameDisplay.setVisible(isCreateView);
      if (this.roomPassDisplay) this.roomPassDisplay.setVisible(isCreateView);

      if (this.personalCodeDisplay) this.personalCodeDisplay.setVisible(false);
      if (this.btnGenCodeBg) this.btnGenCodeBg.setVisible(false);
      if (this.btnGenCodeText) this.btnGenCodeText.setVisible(false);
    }
  }

  private showDungeonServersView() {
    this.lobbyView = 'dungeon_servers';
    this.lobbyTitle.setText('СЕРВЕРЫ ПОДЗЕМЕЛЬЯ');
    this.lobbyBackBtn.setVisible(true);
    this.hideAllLobbyViews();
    this.showArray(this.dungeonServersGroup);
  }

  private showCasualMatchLobby() {
    this.lobbyView = 'casual';
    this.lobbyTitle.setText('⚔️ MOBA: ВЫБОР РЕЖИМА');
    this.lobbyBackBtn.setVisible(true);
    this.hideAllLobbyViews();
    this.showArray(this.casualGroup);
  }

  private updateServerLabels() {
    const allRooms = RoomManager.getRooms().filter(r => !r.isPrivate);
    const filteredRooms = this.pvpSearchFilter
      ? allRooms.filter(r => r.name.toLowerCase().includes(this.pvpSearchFilter.toLowerCase()) || r.code.toLowerCase().includes(this.pvpSearchFilter.toLowerCase()))
      : allRooms;

    if (filteredRooms.length === 0) {
      if (this.serverLabels[0]) {
        this.serverLabels[0].setText(this.pvpSearchFilter ? `[ ПОИСК: "${this.pvpSearchFilter}" — НЕ НАЙДЕНО ]` : '• Активных публичных серверов нет •');
        this.serverLabels[0].setColor(this.pvpSearchFilter ? '#f87171' : '#94a3b8');
        this.serverLabels[0].removeAllListeners();
      }
      if (this.serverLabels[1]) {
        this.serverLabels[1].setText('Нажмите [ ⚡ БЫСТРЫЙ ВХОД ] или создайте новый бой');
        this.serverLabels[1].setColor('#64748b');
        this.serverLabels[1].removeAllListeners();
      }
      if (this.serverLabels[2]) {
        this.serverLabels[2].setText('');
        this.serverLabels[2].removeAllListeners();
      }
      return;
    }

    for (let i = 0; i < 3; i++) {
      const idx = this.lobbyScroll + i;
      if (idx < filteredRooms.length) {
        const item = filteredRooms[idx];
        this.serverLabels[i].setText(`[▶ ВОЙТИ] ${item.name} (${item.code}) | Игроки: ${item.currentPlayers}/${item.maxPlayers}`);
        this.serverLabels[i].setColor('#38bdf8');
        this.serverLabels[i].removeAllListeners();
        this.serverLabels[i].on('pointerdown', () => {
          soundEngine.playLevelUp();
          this.closeLobby();
          const mode: 'solo' | 'duo' | 'trio' | '4v4' = item.maxPlayers <= 2 ? 'solo' : item.maxPlayers <= 4 ? 'duo' : item.maxPlayers <= 6 ? 'trio' : '4v4';
          new CustomRoomLobby(
            this,
            {
              roomName: item.name,
              password: item.password,
              mode,
              heroKey: this.selectedHeroKey
            },
            {
              onStartMatch: (config) => {
                this.scene.start('MobaScene', {
                  mode: config.mode,
                  playerTeam: config.playerTeam,
                  heroKey: config.heroKey,
                  roomConfig: config.roomConfig
                });
              },
              onCloseLobby: () => {
                this.openLobby();
                this.showCasualMatchLobby();
              }
            }
          );
        });
      } else {
        this.serverLabels[i].setText('');
        this.serverLabels[i].removeAllListeners();
      }
    }
  }

  private showRankedMatchLobby() {
    this.closeLobby();
    this.isRankedModalOpen = true;
    new RankedModal(
      this,
      (config) => {
        this.isRankedModalOpen = false;
        this.openLobby();
        this.startMatchmaking(config.slots === 1 ? 2 : config.slots === 2 ? 4 : 6);
      },
      () => {
        this.isRankedModalOpen = false;
        this.openLobby();
        this.showPvPModes();
      }
    );
  }

  private startMatchmaking(limit: number) {
    soundEngine.playClick();
    this.hideAllLobbyViews();
    this.lobbyBackBtn.setVisible(false);
    this.lobbyTitle.setText('ПОДБОР ИГРОКОВ...');

    this.searchGroup.forEach(obj => (obj as unknown as { setVisible: (v: boolean) => void }).setVisible(true));

    let count = 1;
    this.matchmakingSearchText.setText(`ПОИСК ИГРОКОВ: 1/${limit}`);

    if (this.matchmakingTimer) {
      this.matchmakingTimer.remove();
    }

    this.matchmakingTimer = this.time.addEvent({
      delay: 450,
      repeat: limit - 2,
      callback: () => {
        count++;
        this.matchmakingSearchText.setText(`ПОИСК ИГРОКОВ: ${count}/${limit}`);
        soundEngine.playClick();

        if (count >= limit) {
          this.matchmakingSearchText.setText('МАТЧ НАЙДЕН! ЗАПУСК БОЯ...');
          this.time.delayedCall(800, () => {
            this.closeLobby();
            this.startArenaMatch();
          });
        }
      }
    });
  }

  private startArenaMatch() {
    // Spawns combat practice challenge in the courtyard
    this.showFloatingText(this.player.x, this.player.y - 70, '⚔ БОЙ НАЧАЛСЯ! ⚔', '#ef4444');
    soundEngine.playExplosion();

    // Clear any previous bots
    this.botsGroup.clear(true, true);

    // Spawn 2 enemy training bots
    for (let i = 0; i < 2; i++) {
      const offsetX = (i === 0 ? -1 : 1) * 140;
      const bot = this.physics.add.sprite(this.player.x + offsetX, this.player.y - 120, 'char_grim');
      this.botsGroup.add(bot);
      bot.setDepth(45);
      bot.setTint(0xef4444);
      (bot as unknown as { hp: number; maxHp: number }).hp = 600;
      (bot as unknown as { hp: number; maxHp: number }).maxHp = 600;

      // Bot movement towards player
      this.time.addEvent({
        delay: 500,
        repeat: 30,
        callback: () => {
          if (!bot || !bot.active || !this.player || !this.player.active) return;
          const angle = Phaser.Math.Angle.Between(bot.x, bot.y, this.player.x, this.player.y);
          bot.setVelocity(Math.cos(angle) * 140, Math.sin(angle) * 140);
        }
      });
    }
  }

  private cancelTorfStoneSkin() {
    this.torfStoneSkin = false;
    soundEngine.playRockShatter();
    if (this.torfShieldTween) {
      this.torfShieldTween.stop();
      this.torfShieldTween = null;
    }
    if (this.torfShieldAura && this.torfShieldAura.active) {
      this.torfShieldAura.destroy();
      this.torfShieldAura = null;
    }
    if (this.torfShieldBorder && this.torfShieldBorder.active) {
      this.torfShieldBorder.destroy();
      this.torfShieldBorder = null;
    }
    if (this.torfCancelBadgeS2 && this.torfCancelBadgeS2.active) {
      this.torfCancelBadgeS2.destroy();
      this.torfCancelBadgeS2 = null;
    }
    this.cds.attack = 0;
    this.cds.s2 = this.time.now + 1500;
    if (this.player && this.player.active) {
      this.showFloatingText(this.player.x, this.player.y - 60, '🛡 КАМЕННАЯ КОЖА ОТМЕНЕНА', '#60a5fa');
    }
  }

  // --- COMBAT & SKILLS EXECUTION ---
  private executeSkill(type: 'attack' | 's1' | 's2' | 'ult', overrideDirX?: number, overrideDirY?: number) {
    // Torf S2 toggle cancellation
    if (this.selectedHeroKey === 'char_torf' && type === 's2' && this.torfStoneSkin) {
      this.cancelTorfStoneSkin();
      return;
    }

    // Torf can cast ult during stone skin
    if (this.selectedHeroKey === 'char_torf' && type === 'ult' && this.torfStoneSkin) {
      this.cancelTorfStoneSkin();
    }

    if (this.isUltChanneling && this.selectedHeroKey !== 'char_bjorn' && !(this.selectedHeroKey === 'char_torf' && type === 'ult')) return;
    const time = this.time.now;
    if (this.cds[type] > time) return;
    this.cds[type] = time + this.cdMax[type];

    let dir = this.player.flipX ? -1 : 1;
    let dirX = dir;
    let dirY = 0;

    if (overrideDirX !== undefined && overrideDirY !== undefined && (overrideDirX !== 0 || overrideDirY !== 0)) {
      const len = Math.hypot(overrideDirX, overrideDirY);
      dirX = overrideDirX / len;
      dirY = overrideDirY / len;
      dir = dirX >= 0 ? 1 : -1;
      this.aimVector.set(dirX, dirY);
      if (this.selectedHeroKey === 'char_nihil') {
        this.player.setRotation(Math.atan2(dirY, dirX) + Math.PI / 2);
        this.player.setFlipX(false);
      } else {
        this.player.setFlipX(dir < 0);
      }
      this.attackFacingTimer = 450;
    } else if (this.aimJoyVector.lengthSq() > 0.05) {
      const len = this.aimJoyVector.length();
      dirX = this.aimJoyVector.x / len;
      dirY = this.aimJoyVector.y / len;
      dir = dirX >= 0 ? 1 : -1;
      this.aimVector.set(dirX, dirY);
      if (this.selectedHeroKey === 'char_nihil') {
        this.player.setRotation(Math.atan2(dirY, dirX) + Math.PI / 2);
        this.player.setFlipX(false);
      } else {
        this.player.setFlipX(dir < 0);
      }
      this.attackFacingTimer = 450;
    } else if (this.joyStickVector.lengthSq() > 0.05) {
      const len = this.joyStickVector.length();
      dirX = this.joyStickVector.x / len;
      dirY = this.joyStickVector.y / len;
      dir = dirX >= 0 ? 1 : -1;
      this.aimVector.set(dirX, dirY);
      if (this.selectedHeroKey === 'char_nihil') {
        this.player.setRotation(Math.atan2(dirY, dirX) + Math.PI / 2);
        this.player.setFlipX(false);
      } else {
        this.player.setFlipX(dir < 0);
      }
      this.attackFacingTimer = 450;
    }

    // 1. ZAZA (Normal or Monster)
    if (this.selectedHeroKey === 'char_zaza') {
      if (!this.isMonster) {
        if (type === 'attack') {
          soundEngine.playAttack();
          const slash = this.add.circle(this.player.x + dirX * 36, this.player.y + dirY * 36, 26, 0x84cc16, 0.5).setDepth(100);
          this.tweens.add({
            targets: slash,
            scale: 1.6,
            alpha: 0,
            duration: 160,
            onComplete: () => slash.destroy()
          });
          if (this.playerWeaponVisual) {
            this.tweens.add({
              targets: this.playerWeaponVisual,
              angle: dirX >= 0 ? 45 : -45,
              duration: 80,
              yoyo: true,
              onComplete: () => {
                if (this.playerWeaponVisual) this.playerWeaponVisual.angle = 0;
              }
            });
          }
          this.dealDamageInArea(this.player.x + dirX * 55, this.player.y + dirY * 55, 55, 90);
        } else if (type === 's1') {
          soundEngine.playPoison();
          const startX = this.player.x;
          const startY = this.player.y;
          const targetX = startX + dirX * 280;
          const targetY = startY + dirY * 280;
          const glob = this.add.image(startX, startY, 'proj_toxic_spit').setScale(1.4).setDepth(100);
          let hasBurst = false;

          const burstSpit = (hitX: number, hitY: number) => {
            if (hasBurst) return;
            hasBurst = true;
            glob.destroy();
            soundEngine.playPoison();
            this.dealDamageInArea(hitX, hitY, 55, 95);

            const puddle = this.add.ellipse(hitX, hitY, 14, 8, 0x84cc16, 0.75).setDepth(10);
            this.tweens.add({
              targets: puddle,
              scaleX: 6,
              scaleY: 6,
              alpha: 0.45,
              duration: 350,
              onComplete: () => {
                this.time.addEvent({
                  delay: 400,
                  repeat: 5,
                  callback: () => {
                    if (puddle.active) {
                      this.dealDamageInArea(puddle.x, puddle.y, 65, 45);
                    }
                  }
                });
                this.time.delayedCall(2500, () => puddle.destroy());
              }
            });
          };

          this.tweens.add({
            targets: glob,
            x: targetX,
            y: targetY,
            duration: 250,
            onUpdate: () => {
              if (hasBurst || !glob.active) return;
              if (this.checkEnemyAtPosition(glob.x, glob.y, 35)) {
                burstSpit(glob.x, glob.y);
              }
            },
            onComplete: () => {
              if (!hasBurst && glob.active) {
                burstSpit(targetX, targetY);
              }
            }
          });
        } else if (type === 's2') {
          soundEngine.playWhirlwind();
          if (this.playerWeaponVisual) {
            this.tweens.add({
              targets: this.playerWeaponVisual,
              angle: this.playerWeaponVisual.angle + 720,
              duration: 600,
              ease: 'Quad.easeOut'
            });
          }
          const spinAura = this.add.circle(this.player.x, this.player.y, 45, 0x84cc16, 0.35).setDepth(45);
          this.tweens.add({
            targets: spinAura,
            scale: 1.6,
            alpha: 0,
            duration: 600,
            onUpdate: () => {
              if (spinAura.active && this.player) spinAura.setPosition(this.player.x, this.player.y);
            },
            onComplete: () => spinAura.destroy()
          });

          // Continuous whirlwind damage ticks while Zaza is spinning!
          this.time.addEvent({
            delay: 190,
            repeat: 3,
            callback: () => {
              if (!this.player || !this.player.active) return;
              this.dealDamageInArea(this.player.x, this.player.y, 90, 55);
              const poisonPuff = this.add.circle(this.player.x + (Math.random() - 0.5) * 35, this.player.y + (Math.random() - 0.5) * 35, 16, 0x84cc16, 0.45).setDepth(49);
              this.tweens.add({
                targets: poisonPuff,
                scale: 1.6,
                alpha: 0,
                duration: 240,
                onComplete: () => poisonPuff.destroy()
              });
            }
          });
        } else if (type === 'ult') {
          soundEngine.playMonsterUlt();
          this.isMonster = true;
          if (this.playerWeaponVisual) this.playerWeaponVisual.setVisible(false);
          this.player.setTexture('char_zaza_monster');
          this.player.setScale(1.8);
          this.playerHp = Math.min(this.playerMaxHp + 500, this.playerHp + 500);
          this.damageMultiplier = 1.6;
          this.monsterTimer = time + 10000;
          this.updateCombatIcons();

          const shock = this.add.circle(this.player.x, this.player.y, 12, 0xa855f7, 0.85).setDepth(100);
          this.tweens.add({
            targets: shock,
            scale: 16,
            alpha: 0,
            duration: 550,
            onComplete: () => shock.destroy()
          });
          this.dealDamageInArea(this.player.x, this.player.y, 140, 180);
          this.showFloatingText(this.player.x, this.player.y - 70, 'МУТАЦИЯ МОНСТРА!', '#a855f7');
        }
      } else {
        // Monster form attacks
        if (type === 'attack') {
          soundEngine.playAttack();
          const bite = this.add.circle(this.player.x + dirX * 65, this.player.y + dirY * 65, 32, 0xef4444, 0.85).setDepth(100);
          this.tweens.add({
            targets: bite,
            scale: 1.5,
            alpha: 0,
            duration: 150,
            onComplete: () => bite.destroy()
          });
          this.dealDamageInArea(this.player.x + dirX * 65, this.player.y + dirY * 65, 60, 180);
        } else if (type === 's1') {
          soundEngine.playWhirlwind();
          this.tweens.add({
            targets: this.player,
            x: this.player.x + dirX * 180,
            y: this.player.y + dirY * 180,
            duration: 180,
            ease: 'Power2'
          });
          const clawSlash = this.add.circle(this.player.x + dirX * 70, this.player.y + dirY * 70, 45, 0xa855f7, 0.75).setDepth(100);
          this.tweens.add({ targets: clawSlash, scale: 1.6, alpha: 0, duration: 250, onComplete: () => clawSlash.destroy() });
          this.dealDamageInArea(this.player.x + dirX * 90, this.player.y + dirY * 90, 65, 160);
        } else if (type === 's2') {
          soundEngine.playMonsterUlt();
          this.time.addEvent({
            delay: 220,
            repeat: 2,
            callback: () => {
              if (!this.player || !this.player.active) return;
              const roar = this.add.circle(this.player.x, this.player.y, 25, 0xef4444, 0.6).setDepth(100);
              this.tweens.add({
                targets: roar,
                scale: 6,
                alpha: 0,
                duration: 350,
                onComplete: () => roar.destroy()
              });
              this.dealDamageInArea(this.player.x, this.player.y, 130, 85);
            }
          });
        }
      }
    }
    // 2. GRIM
    else if (this.selectedHeroKey === 'char_grim') {
      if (type === 'attack') {
        soundEngine.playFlaskLaunch();
        const startX = this.player.x;
        const startY = this.player.y;
        const targetX = startX + dirX * 260;
        const targetY = startY + dirY * 260;

        const flask = this.add.image(startX, startY, 'proj_flask').setScale(1.4).setDepth(100);
        let hasHit = false;

        const explodeFlask = (fx: number, fy: number) => {
          if (hasHit) return;
          hasHit = true;
          flask.destroy();
          soundEngine.playPoison();

          const splash = this.add.circle(fx, fy, 22, 0x38bdf8, 0.65).setDepth(99);
          this.tweens.add({
            targets: splash,
            scale: 2.4,
            alpha: 0,
            duration: 260,
            onComplete: () => splash.destroy()
          });

          for (let p = 0; p < 4; p++) {
            const frag = this.add.circle(fx, fy, 4, 0x7dd3fc).setDepth(99);
            const ang = (p / 4) * Math.PI * 2;
            this.tweens.add({
              targets: frag,
              x: fx + Math.cos(ang) * 35,
              y: fy + Math.sin(ang) * 35,
              alpha: 0,
              duration: 200,
              onComplete: () => frag.destroy()
            });
          }

          this.dealDamageInArea(fx, fy, 65, 95);
        };

        this.tweens.add({
          targets: flask,
          x: targetX,
          y: targetY,
          duration: 300,
          onUpdate: () => {
            if (hasHit || !flask.active) return;
            if (this.checkEnemyAtPosition(flask.x, flask.y, 36)) {
              explodeFlask(flask.x, flask.y);
            }
          },
          onComplete: () => {
            if (!hasHit && flask.active) {
              explodeFlask(targetX, targetY);
            }
          }
        });
      } else if (type === 's1') {
        soundEngine.playPoison();
        const startX = this.player.x;
        const startY = this.player.y;
        const targetX = startX + dirX * 270;
        const targetY = startY + dirY * 270;
        const tar = this.add.image(startX, startY, 'proj_tar_bomb').setScale(1.3).setDepth(100);
        let tarBurst = false;

        const explodeTar = (tx: number, ty: number) => {
          if (tarBurst) return;
          tarBurst = true;
          tar.destroy();
          soundEngine.playExplosion();
          this.dealDamageInArea(tx, ty, 65, 65);
          this.showFloatingText(tx, ty - 25, 'СМОЛА: ЗАМЕДЛЕНИЕ 50%!', '#38bdf8');

          const slowPuddle = this.add.circle(tx, ty, 50, 0x1e1b4b, 0.7).setDepth(15);
          this.time.delayedCall(2500, () => slowPuddle.destroy());
        };

        this.tweens.add({
          targets: tar,
          x: targetX,
          y: targetY,
          duration: 250,
          onUpdate: () => {
            if (tarBurst || !tar.active) return;
            if (this.checkEnemyAtPosition(tar.x, tar.y, 35)) {
              explodeTar(tar.x, tar.y);
            }
          },
          onComplete: () => {
            if (!tarBurst && tar.active) explodeTar(targetX, targetY);
          }
        });
      } else if (type === 's2') {
        soundEngine.playCast();
        this.player.setPosition(this.player.x + dirX * 190, this.player.y + dirY * 190);
        this.player.setAlpha(0.25);
        this.time.delayedCall(1200, () => {
          if (this.player && this.player.active) this.player.setAlpha(1.0);
        });
      } else if (type === 'ult') {
        const potX = this.player.x + dirX * 240;
        const potY = this.player.y + dirY * 240;
        const pot = this.add.image(potX, potY, 'proj_cauldron').setDepth(45).setScale(1.4);

        this.time.delayedCall(1400, () => {
          if (pot.active) pot.destroy();
          soundEngine.playExplosion();
          const expRing = this.add.circle(potX, potY, 120, 0xef4444, 0.85).setDepth(46);
          this.tweens.add({ targets: expRing, scaleX: 1.5, scaleY: 1.5, alpha: 0, duration: 350, onComplete: () => expRing.destroy() });
          this.dealDamageInArea(potX, potY, 140, 220);
        });
      }
    }
    // 3. BJORN
    else if (this.selectedHeroKey === 'char_bjorn') {
      if (type === 'attack') {
        soundEngine.playAttack();
        const hitX = this.player.x + dirX * 55;
        const hitY = this.player.y + dirY * 55;
        const facingAngle = Math.atan2(dirY, dirX);
        const axeHit = this.add.rectangle(hitX, hitY, 35, 10, 0xe2e8f0).setDepth(100);
        axeHit.setRotation(facingAngle);
        this.tweens.add({
          targets: axeHit,
          scale: 1.5,
          alpha: 0,
          duration: 150,
          onComplete: () => axeHit.destroy()
        });
        this.dealDamageInArea(hitX, hitY, 55, 120);
      } else if (type === 's1') {
        soundEngine.playEarthquake();
        soundEngine.playSmash();
        this.cameras.main.shake(160, 0.008);
        for (let step = 1; step <= 5; step++) {
          this.time.delayedCall(step * 70, () => {
            const spikeX = this.player.x + dirX * step * 48;
            const spikeY = this.player.y + dirY * step * 48;
            const spike = this.add.image(spikeX, spikeY, 'proj_rock_spike').setDepth(45).setScale(1.3);
            this.tweens.add({
              targets: spike,
              alpha: 0,
              y: spikeY - 14,
              scaleY: 1.6,
              duration: 450,
              onComplete: () => spike.destroy()
            });
            this.dealDamageInArea(spikeX, spikeY, 55, 90, 'blunt');
          });
        }
      } else if (type === 's2') {
        soundEngine.playAttack();
        this.tweens.add({
          targets: this.player,
          x: this.player.x + dirX * 230,
          y: this.player.y + dirY * 230,
          duration: 180
        });
        this.dealDamageInArea(this.player.x + dirX * 115, this.player.y + dirY * 115, 120, 240);
      } else if (type === 'ult') {
        soundEngine.playWhirlwind();
        this.isUltChanneling = true;
        this.activeAxe = this.add.rectangle(this.player.x, this.player.y, 95, 16, 0xe2e8f0).setDepth(100);

        // Spin axe for 1800ms
        this.tweens.add({
          targets: this.activeAxe,
          angle: 1440,
          duration: 1800,
          onUpdate: () => {
            if (this.activeAxe) {
              this.activeAxe.setPosition(this.player.x, this.player.y);
            }
          },
          onComplete: () => {
            this.isUltChanneling = false;
            if (this.activeAxe) {
              this.activeAxe.destroy();
              this.activeAxe = null;
            }
            this.player.angle = 0;
          }
        });

        // Continuous whirlwind damage ticks while Bjorn is spinning! (8 ticks over 1800ms)
        this.time.addEvent({
          delay: 220,
          repeat: 7,
          callback: () => {
            if (!this.player || !this.player.active) return;
            this.dealDamageInArea(this.player.x, this.player.y, 110, 85);
            // Visual spin wind slash
            const slash = this.add.circle(this.player.x, this.player.y, 65, 0xf97316, 0.25).setDepth(48);
            this.tweens.add({
              targets: slash,
              scale: 1.6,
              alpha: 0,
              duration: 200,
              onComplete: () => slash.destroy()
            });
          }
        });
      }
    }
    // 4. TORF (Earth Golem / Rare)
    else if (this.selectedHeroKey === 'char_torf') {
      if (type === 'attack') {
        if (this.torfStoneSkin) {
          this.showFloatingText(this.player.x, this.player.y - 60, 'КАМЕННАЯ КОЖА АКТИВНА!', '#38bdf8');
          return;
        }
        // Heavy fists windup delay
        this.time.delayedCall(110, () => {
          if (!this.player || !this.player.active) return;
          soundEngine.playAttack();
          soundEngine.playSmash();
          this.cameras.main.shake(120, 0.007);

          const hitX = this.player.x + dirX * 55;
          const hitY = this.player.y + dirY * 55;
          const facingAngle = Math.atan2(dirY, dirX);

          // Giant sweeping stone fists slam in wide arc
          const fist1 = this.add.circle(hitX - dirY * 20, hitY + dirX * 20, 22, 0x473d3a).setDepth(52);
          const fist2 = this.add.circle(hitX + dirY * 20, hitY - dirX * 20, 22, 0x57534e).setDepth(52);
          const shockArc = this.add.arc(hitX, hitY, 40, Phaser.Math.RadToDeg(facingAngle - 1.2), Phaser.Math.RadToDeg(facingAngle + 1.2), false, 0x60a5fa, 0.6).setDepth(50);

          this.tweens.add({
            targets: [fist1, fist2, shockArc],
            scale: 1.5,
            alpha: 0,
            duration: 180,
            onComplete: () => {
              fist1.destroy();
              fist2.destroy();
              shockArc.destroy();
            }
          });

          this.dealDamageInArea(hitX, hitY, 80, 160);
        });
      } else if (type === 's1') {
        // Skill 1: Boulder Throw (Бросок валуна)
        soundEngine.playBoulderThrow();
        const startX = this.player.x;
        const startY = this.player.y;
        const targetX = startX + dirX * 310;
        const targetY = startY + dirY * 310;

        const boulder = this.add.image(startX, startY, 'proj_boulder').setScale(1.2).setDepth(100);
        let hasShattered = false;

        const shatterBoulder = (bx: number, by: number) => {
          if (hasShattered) return;
          hasShattered = true;
          if (boulder.active) boulder.destroy();

          soundEngine.playExplosion();
          this.cameras.main.shake(180, 0.012);

          // Rock shockwave ring
          const ring = this.add.circle(bx, by, 75, 0x3b82f6, 0.65).setDepth(99);
          this.tweens.add({ targets: ring, scale: 1.5, alpha: 0, duration: 260, onComplete: () => ring.destroy() });

          // Flying rock debris shards in 6 directions
          for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3;
            const shard = this.add.circle(bx, by, 7, 0x78716c).setDepth(101);
            this.tweens.add({
              targets: shard,
              x: bx + Math.cos(angle) * 55,
              y: by + Math.sin(angle) * 55,
              alpha: 0,
              scale: 0.3,
              duration: 280,
              onComplete: () => shard.destroy()
            });
          }

          this.dealDamageInArea(bx, by, 85, 260);
        };

        this.tweens.add({
          targets: boulder,
          x: targetX,
          y: targetY,
          duration: 340,
          onUpdate: () => {
            if (hasShattered || !boulder.active) return;
            boulder.rotation += 0.2;
            if (this.checkEnemyAtPosition(boulder.x, boulder.y, 40)) {
              shatterBoulder(boulder.x, boulder.y);
            }
          },
          onComplete: () => {
            if (!hasShattered && boulder.active) {
              shatterBoulder(targetX, targetY);
            }
          }
        });
      } else if (type === 's2') {
        // Skill 2: Stone Skin (Каменная кожа / Глухая оборона)
        soundEngine.playStoneSkin();
        this.torfStoneSkin = true;
        this.showFloatingText(this.player.x, this.player.y - 60, 'КАМЕННАЯ КОЖА! (-50% УРОНА)', '#60a5fa');

        if (this.torfShieldAura && this.torfShieldAura.active) this.torfShieldAura.destroy();
        if (this.torfShieldBorder && this.torfShieldBorder.active) this.torfShieldBorder.destroy();
        if (this.torfShieldTween) this.torfShieldTween.stop();
        if (this.torfCancelBadgeS2 && this.torfCancelBadgeS2.active) {
          this.torfCancelBadgeS2.destroy();
          this.torfCancelBadgeS2 = null;
        }

        // Create cross cancellation badge on Skill 2 button!
        this.torfCancelBadgeS2 = this.add.container(this.btnS2.x, this.btnS2.y).setDepth(305).setScrollFactor(0);
        const redBadge = this.add.circle(16, -16, 11, 0xef4444).setStrokeStyle(2, 0xffffff);
        const crossTxt = this.add.text(16, -16, '✕', {
          fontSize: '12px',
          fontFamily: 'monospace',
          fontStyle: 'bold',
          color: '#ffffff'
        }).setOrigin(0.5);
        this.torfCancelBadgeS2.add([redBadge, crossTxt]);
        this.tweens.add({
          targets: this.torfCancelBadgeS2,
          scale: 1.15,
          duration: 300,
          yoyo: true,
          repeat: -1
        });

        // Yellow eyes flare bright + cyan rocky shield aura
        this.torfShieldAura = this.add.circle(this.player.x, this.player.y, 42, 0x38bdf8, 0.45).setDepth(49);
        this.torfShieldBorder = this.add.circle(this.player.x, this.player.y, 42)
          .setStrokeStyle(3, 0xfacc15).setDepth(50);

        this.torfShieldTween = this.tweens.add({
          targets: [this.torfShieldAura, this.torfShieldBorder],
          scale: 1.15,
          duration: 400,
          yoyo: true,
          repeat: 7,
          onUpdate: () => {
            if (this.torfShieldAura && this.torfShieldAura.active && this.player && this.player.active) {
              this.torfShieldAura.setPosition(this.player.x, this.player.y);
              this.torfShieldBorder?.setPosition(this.player.x, this.player.y);
            }
          },
          onComplete: () => {
            if (this.torfStoneSkin) {
              this.torfStoneSkin = false;
              soundEngine.playRockShatter();
              if (this.torfShieldAura?.active) this.torfShieldAura.destroy();
              if (this.torfShieldBorder?.active) this.torfShieldBorder.destroy();
              if (this.torfCancelBadgeS2?.active) this.torfCancelBadgeS2.destroy();
              this.torfShieldAura = null;
              this.torfShieldBorder = null;
              this.torfShieldTween = null;
              this.torfCancelBadgeS2 = null;
              if (this.player && this.player.active) {
                this.showFloatingText(this.player.x, this.player.y - 60, 'КАМЕННАЯ КОЖА СПАЛА', '#94a3b8');
              }
            }
          }
        });
      } else if (type === 'ult') {
        // Ultimate: Underground Breach (Подземный прорыв)
        soundEngine.playBurrow();
        this.torfInvulnerable = true;
        this.isUltChanneling = true;
        this.player.setVisible(false);
        if (this.playerWeaponVisual) this.playerWeaponVisual.setVisible(false);
        this.showFloatingText(this.player.x, this.player.y - 60, '★ ПОДЗЕМНЫЙ ПРОРЫВ! ★', '#60a5fa');

        const prevSpeed = this.playerSpeed;
        this.playerSpeed = prevSpeed * 1.4;

        // Shadow and dust trail beneath player
        const burrowShadow = this.add.ellipse(this.player.x, this.player.y, 36, 18, 0x1c1917, 0.75).setDepth(45);
        const dustEvent = this.time.addEvent({
          delay: 140,
          repeat: 14,
          callback: () => {
            if (!this.player || !this.player.active) return;
            burrowShadow.setPosition(this.player.x, this.player.y);
            const dust = this.add.circle(this.player.x + (Math.random() - 0.5) * 16, this.player.y + (Math.random() - 0.5) * 16, 12, 0x78716c, 0.5).setDepth(44);
            this.tweens.add({ targets: dust, scale: 2.0, alpha: 0, duration: 250, onComplete: () => dust.destroy() });
          }
        });

        // After 2.0 seconds: Erupt from underground!
        this.time.delayedCall(2000, () => {
          dustEvent.remove();
          burrowShadow.destroy();
          this.playerSpeed = prevSpeed;
          this.player.setVisible(true);
          if (this.playerWeaponVisual) this.playerWeaponVisual.setVisible(!this.isMonster && this.selectedHeroKey !== 'char_kraul');
          this.torfInvulnerable = false;
          this.isUltChanneling = false;

          soundEngine.playErupt();
          this.cameras.main.shake(350, 0.02);

          // Massive ground crack & stone eruption
          const eruptRing = this.add.circle(this.player.x, this.player.y, 110, 0x3b82f6, 0.75).setDepth(52);
          this.tweens.add({ targets: eruptRing, scale: 1.8, alpha: 0, duration: 380, onComplete: () => eruptRing.destroy() });

          // Stone spikes radiating outwards
          for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI) / 4;
            const spikeX = this.player.x + Math.cos(angle) * 75;
            const spikeY = this.player.y + Math.sin(angle) * 75;
            const spike = this.add.image(spikeX, spikeY, 'proj_rock_spike').setScale(1.4).setDepth(53);
            this.tweens.add({ targets: spike, y: spikeY - 20, alpha: 0, duration: 400, onComplete: () => spike.destroy() });
          }

          this.dealDamageInArea(this.player.x, this.player.y, 180, 450);
        });
      }
    }
    // 5. OMEN (Shadow Owl / Mythic)
    else if (this.selectedHeroKey === 'char_omen') {
      if (type === 'attack') {
        soundEngine.playAttack();
        const startX = this.player.x;
        const startY = this.player.y;
        const targetX = startX + dirX * 420;
        const targetY = startY + dirY * 420;

        const blade = this.add.image(startX, startY, 'proj_shadow_blade').setScale(1.2).setDepth(100);
        blade.rotation = Math.atan2(dirY, dirX);
        let hasHit = false;

        this.tweens.add({
          targets: blade,
          x: targetX,
          y: targetY,
          duration: 320,
          onUpdate: () => {
            if (hasHit || !blade.active) return;
            if (this.checkEnemyAtPosition(blade.x, blade.y, 35)) {
              hasHit = true;
              blade.destroy();
              soundEngine.playHit();
              this.dealDamageInArea(blade.x, blade.y, 45, 85);
            }
          },
          onComplete: () => {
            if (blade.active) {
              this.dealDamageInArea(targetX, targetY, 45, 85);
              blade.destroy();
            }
          }
        });
      } else if (type === 's1') {
        // Skill 1: Shadow Fan (Теневой шторм)
        soundEngine.playPoison();
        const startX = this.player.x;
        const startY = this.player.y;
        const baseAngle = Math.atan2(dirY, dirX);
        const offsets = [-0.35, -0.18, 0, 0.18, 0.35];

        offsets.forEach(off => {
          const angle = baseAngle + off;
          const blade = this.add.image(startX, startY, 'proj_shadow_blade').setScale(1.1).setDepth(100);
          blade.rotation = angle;
          let hit = false;
          const tx = startX + Math.cos(angle) * 330;
          const ty = startY + Math.sin(angle) * 330;

          this.tweens.add({
            targets: blade,
            x: tx,
            y: ty,
            duration: 300,
            onUpdate: () => {
              if (hit || !blade.active) return;
              if (this.checkEnemyAtPosition(blade.x, blade.y, 30)) {
                hit = true;
                blade.destroy();
                this.dealDamageInArea(blade.x, blade.y, 45, 110);
              }
            },
            onComplete: () => {
              if (blade.active) blade.destroy();
            }
          });
        });
      } else if (type === 's2') {
        // Skill 2: Astral Dash & Decoy (Астральный рывок)
        soundEngine.playCast();
        const startX = this.player.x;
        const startY = this.player.y;
        const dashDist = 230;
        const endX = startX + dirX * dashDist;
        const endY = startY + dirY * dashDist;

        // Shadow Decoy left behind
        const shadowDecoy = this.add.image(startX, startY, 'char_omen').setDepth(48).setAlpha(0.75).setTint(0xef4444);
        this.player.setPosition(endX, endY);

        this.time.delayedCall(450, () => {
          if (shadowDecoy.active) {
            soundEngine.playExplosion();

            // Create an epic multilayer shadow explosion (Identical to DungeonScene!)
            const blast1 = this.add.circle(startX, startY, 40, 0x581c87, 0.9).setDepth(49);
            const blast2 = this.add.circle(startX, startY, 60, 0xdc2626, 0.6).setDepth(48);
            const blast3 = this.add.circle(startX, startY, 80, 0xfacc15, 0.35).setDepth(47);

            this.tweens.add({ targets: blast1, scale: 2.2, alpha: 0, duration: 320, onComplete: () => blast1.destroy() });
            this.tweens.add({ targets: blast2, scale: 1.8, alpha: 0, duration: 250, onComplete: () => blast2.destroy() });
            this.tweens.add({ targets: blast3, scale: 1.4, alpha: 0, duration: 180, onComplete: () => blast3.destroy() });

            for (let s = 0; s < 10; s++) {
              const angle = Math.random() * Math.PI * 2;
              const dist = 30 + Math.random() * 60;
              const spark = this.add.circle(startX, startY, 6, 0xef4444, 0.9).setDepth(50);
              this.tweens.add({
                targets: spark,
                x: startX + Math.cos(angle) * dist,
                y: startY + Math.sin(angle) * dist,
                scale: 0.2,
                alpha: 0,
                duration: 350 + Math.random() * 200,
                onComplete: () => spark.destroy()
              });
            }

            this.dealDamageInArea(startX, startY, 90, 140);
            shadowDecoy.destroy();
          }
        });
      } else if (type === 'ult') {
        // Skill 3: Shadow Flight, Airborne Reticle & Blind Slam (Теневое приземление)
        soundEngine.playCast();
        soundEngine.playExplosion();
        this.isUltChanneling = true;
        this.showFloatingText(this.player.x, this.player.y - 60, '★ ТЕНЕВОЙ ВЗЛЕТ И ПРИЦЕЛИВАНИЕ! ★', '#ef4444');

        const startX = this.player.x;
        const startY = this.player.y;

        // 1. Red flashing mark on position
        const mark = this.add.circle(startX, startY, 40, 0xef4444, 0.7).setDepth(48);
        const markRing = this.add.circle(startX, startY, 40).setStrokeStyle(3, 0xff0000).setDepth(49);
        this.tweens.add({
          targets: [mark, markRing],
          alpha: 0.2,
          scale: 1.3,
          duration: 150,
          yoyo: true,
          repeat: 2,
          onComplete: () => {
            if (mark.active) mark.destroy();
            if (markRing.active) markRing.destroy();
          }
        });

        // Invulnerability and Takeoff
        this.torfInvulnerable = true;
        this.tweens.add({
          targets: this.player,
          scale: 3.0,
          alpha: 0,
          duration: 350,
          onComplete: () => {
            this.player.setVisible(false);
          }
        });

        // Reticle UI setup
        const screenDark = this.add.rectangle(this.cameras.main.width / 2, this.cameras.main.height / 2, this.cameras.main.width * 2, this.cameras.main.height * 2, 0x0f051d, 0.45)
          .setScrollFactor(0).setDepth(180);

        const reticleRing = this.add.circle(startX, startY, 90).setStrokeStyle(4, 0xef4444).setDepth(190);
        const reticleFill = this.add.circle(startX, startY, 90, 0xef4444, 0.25).setDepth(189);
        const reticleCross1 = this.add.rectangle(startX, startY, 180, 3, 0xff0000).setDepth(191);
        const reticleCross2 = this.add.rectangle(startX, startY, 3, 180, 0xff0000).setDepth(191);
        const reticleCenter = this.add.circle(startX, startY, 10, 0xfacc15).setDepth(192);

        this.tweens.add({
          targets: [reticleRing, reticleFill],
          scale: 1.15,
          duration: 300,
          yoyo: true,
          repeat: -1
        });

        let aimX = startX;
        let aimY = startY;

        // Steering timer for ~1.8s
        const steerTimer = this.time.addEvent({
          delay: 16,
          repeat: 110,
          callback: () => {
            let dx = 0;
            let dy = 0;

            if (this.cursors?.A?.isDown || this.cursors?.LEFT?.isDown) dx = -1;
            else if (this.cursors?.D?.isDown || this.cursors?.RIGHT?.isDown) dx = 1;

            if (this.cursors?.W?.isDown || this.cursors?.UP?.isDown) dy = -1;
            else if (this.cursors?.S?.isDown || this.cursors?.DOWN?.isDown) dy = 1;

            if (!this.isPC && this.joyStickVector.lengthSq() > 0) {
              dx = this.joyStickVector.x;
              dy = this.joyStickVector.y;
            } else if (this.aimJoyVector.lengthSq() > 0) {
              dx = this.aimJoyVector.x;
              dy = this.aimJoyVector.y;
            }

            if (dx !== 0 || dy !== 0) {
              aimX = Phaser.Math.Clamp(aimX + dx * 8.5, 80, 1520);
              aimY = Phaser.Math.Clamp(aimY + dy * 8.5, 80, 1520);
            }

            this.player.setPosition(aimX, aimY);
            reticleRing.setPosition(aimX, aimY);
            reticleFill.setPosition(aimX, aimY);
            reticleCross1.setPosition(aimX, aimY);
            reticleCross2.setPosition(aimX, aimY);
            reticleCenter.setPosition(aimX, aimY);
          }
        });

        // 2.0s Landing Impact
        this.time.delayedCall(1850, () => {
          steerTimer.destroy();
          screenDark.destroy();
          reticleRing.destroy();
          reticleFill.destroy();
          reticleCross1.destroy();
          reticleCross2.destroy();
          reticleCenter.destroy();

          this.player.setPosition(aimX, aimY - 140).setVisible(true).setAlpha(0.9).setScale(2.5);
          soundEngine.playErupt();
          soundEngine.playExplosion();

          this.tweens.add({
            targets: this.player,
            y: aimY,
            scale: 1.15,
            alpha: 1.0,
            duration: 160,
            ease: 'Quad.easeIn',
            onComplete: () => {
              this.torfInvulnerable = false;
              this.isUltChanneling = false;
              this.cameras.main.shake(350, 0.025);

              // Ultimate: Epic Dark Portal / Owl Shadow Slam Vortex Visuals (Identical to DungeonScene!)
              const impactCore = this.add.circle(aimX, aimY, 60, 0x3b0764, 0.95).setDepth(150);
              const impactMiddle = this.add.circle(aimX, aimY, 110, 0x7e22ce, 0.75).setDepth(149);
              const impactOuter = this.add.circle(aimX, aimY, 150, 0xdc2626, 0.45).setDepth(148);
              const ring1 = this.add.circle(aimX, aimY, 150).setStrokeStyle(4, 0xfca5a5, 0.8).setDepth(151);
              const ring2 = this.add.circle(aimX, aimY, 90).setStrokeStyle(2, 0xd8b4fe, 0.9).setDepth(151);

              this.tweens.add({ targets: impactCore, scale: 2.4, alpha: 0, duration: 450, onComplete: () => impactCore.destroy() });
              this.tweens.add({ targets: impactMiddle, scale: 1.8, alpha: 0, duration: 380, onComplete: () => impactMiddle.destroy() });
              this.tweens.add({ targets: impactOuter, scale: 1.4, alpha: 0, duration: 300, onComplete: () => impactOuter.destroy() });
              this.tweens.add({ targets: ring1, scale: 1.5, alpha: 0, duration: 350, onComplete: () => ring1.destroy() });
              this.tweens.add({ targets: ring2, scale: 1.9, alpha: 0, duration: 400, onComplete: () => ring2.destroy() });

              // Spawn epic radial shadow feathers shooting out!
              for (let i = 0; i < 16; i++) {
                const angle = (i * Math.PI) / 8;
                const dist = 70 + Math.random() * 110;
                const feather = this.add.image(aimX, aimY, 'proj_shadow_blade').setDepth(152).setScale(1.6).setRotation(angle);
                feather.setTint(0xc084fc);
                this.tweens.add({
                  targets: feather,
                  x: aimX + Math.cos(angle) * dist,
                  y: aimY + Math.sin(angle) * dist,
                  scale: 0.3,
                  alpha: 0,
                  duration: 450 + Math.random() * 250,
                  onComplete: () => feather.destroy()
                });
              }

              this.dealDamageInArea(aimX, aimY, 150, 480);
              this.showFloatingText(aimX, aimY - 70, '⚔ ТЕНЕВОЙ СЛЭМ: СЛЕПОТА ВРАГОВ! ⚔', '#ef4444');
            }
          });
        });
      }
    } else if (this.selectedHeroKey === 'char_alrik') {
      if (type === 'attack') {
        soundEngine.playSlash();
        const startX = this.player.x;
        const startY = this.player.y;
        const targetX = startX + dirX * 115;
        const targetY = startY + dirY * 115;

        // Visual thrust rectangle (Tapered thrust line with white core and blue outer)
        const hitX = startX + dirX * 65;
        const hitY = startY + dirY * 65;
        const facingAngle = Math.atan2(dirY, dirX);

        const thrustOuter = this.add.rectangle(hitX, hitY, 80, 12, 0x0ea5e9, 0.8).setDepth(100);
        const thrustInner = this.add.rectangle(hitX, hitY, 80, 4, 0xffffff).setDepth(101);
        thrustOuter.setRotation(facingAngle);
        thrustInner.setRotation(facingAngle);

        this.tweens.add({
          targets: [thrustOuter, thrustInner],
          scaleX: 1.4,
          alpha: 0,
          duration: 160,
          onComplete: () => {
            thrustOuter.destroy();
            thrustInner.destroy();
          }
        });

        // Small puff of thrust air
        const puff = this.add.circle(startX + dirX * 24, startY + dirY * 24, 8, 0xf8fafc, 0.4).setDepth(99);
        this.tweens.add({
          targets: puff,
          scale: 1.8,
          alpha: 0,
          duration: 160,
          onComplete: () => puff.destroy()
        });

        if (this.playerWeaponVisual) {
          this.weaponAttackAngle = facingAngle;
          this.weaponThrustDist = 0;
          this.tweens.add({
            targets: this,
            weaponThrustDist: 40,
            duration: 85,
            yoyo: true,
            ease: 'Cubic.easeOut',
            onComplete: () => {
              this.weaponThrustDist = 0;
            }
          });
        }

        // Damage dummies/bots in narrow cone
        if (this.dummyGroup) {
          this.dummyGroup.getChildren().forEach(obj => {
            const d = obj as Phaser.GameObjects.Sprite;
            const dist = Phaser.Math.Distance.Between(startX, startY, d.x, d.y);
            if (dist <= 115) {
              const angle = Phaser.Math.Angle.Between(startX, startY, d.x, d.y);
              const angleDiff = Phaser.Math.Angle.Wrap(angle - Math.atan2(dirY, dirX));
              if (Math.abs(angleDiff) < 0.4) {
                this.dealDamageInArea(d.x, d.y, 40, 95);
              }
            }
          });
        }
        if (this.botsGroup) {
          this.botsGroup.getChildren().forEach(obj => {
            const b = obj as Phaser.Physics.Arcade.Sprite;
            if (b.active) {
              const dist = Phaser.Math.Distance.Between(startX, startY, b.x, b.y);
              if (dist <= 115) {
                const angle = Phaser.Math.Angle.Between(startX, startY, b.x, b.y);
                const angleDiff = Phaser.Math.Angle.Wrap(angle - Math.atan2(dirY, dirX));
                if (Math.abs(angleDiff) < 0.4) {
                  this.dealDamageInArea(b.x, b.y, 40, 95);
                }
              }
            }
          });
        }
      } else if (type === 's1') {
        // Skill 1: Ramming Charge (Таранный рывок)
        soundEngine.playWhirlwind();
        const startX = this.player.x;
        const startY = this.player.y;
        const dashDist = 270;
        const targetX = Phaser.Math.Clamp(startX + dirX * dashDist, 80, 1520);
        const targetY = Phaser.Math.Clamp(startY + dirY * dashDist, 80, 1520);

        this.tweens.add({
          targets: this.player,
          x: targetX,
          y: targetY,
          duration: 180,
          ease: 'Power2'
        });

        const spearAura = this.add.circle(targetX, targetY, 50, 0x38bdf8, 0.6).setDepth(100);
        this.tweens.add({ targets: spearAura, scale: 1.5, alpha: 0, duration: 250, onComplete: () => spearAura.destroy() });

        this.dealDamageInArea(targetX, targetY, 85, 120);

        // Push away dummies/bots near start or end
        const pushAway = (obj: Phaser.GameObjects.Sprite) => {
          const dStart = Phaser.Math.Distance.Between(startX, startY, obj.x, obj.y);
          const dEnd = Phaser.Math.Distance.Between(targetX, targetY, obj.x, obj.y);
          if (dStart < 85 || dEnd < 85) {
            obj.x += dirX * 50;
            obj.y += dirY * 50;
          }
        };

        if (this.dummyGroup) this.dummyGroup.getChildren().forEach(obj => pushAway(obj as Phaser.GameObjects.Sprite));
        if (this.botsGroup) {
          this.botsGroup.getChildren().forEach(obj => {
            const b = obj as Phaser.Physics.Arcade.Sprite;
            if (b.active) pushAway(b);
          });
        }
      } else if (type === 's2') {
        // Skill 2: Wide Sweep (Широкий взмах)
        soundEngine.playWhirlwind();
        const circleSweep = this.add.circle(this.player.x, this.player.y, 100).setStrokeStyle(3, 0x38bdf8).setDepth(100);
        const circleSweepFill = this.add.circle(this.player.x, this.player.y, 100, 0x60a5fa, 0.25).setDepth(99);
        this.tweens.add({
          targets: [circleSweep, circleSweepFill],
          scale: 1.4,
          alpha: 0,
          duration: 300,
          onComplete: () => {
            circleSweep.destroy();
            circleSweepFill.destroy();
          }
        });

        if (this.playerWeaponVisual) {
          this.tweens.add({
            targets: this.playerWeaponVisual,
            angle: this.playerWeaponVisual.angle + 360,
            duration: 250
          });
        }

        this.dealDamageInArea(this.player.x, this.player.y, 110, 80);

        // Push bots/dummies back
        const pushBack = (obj: Phaser.GameObjects.Sprite) => {
          if (Phaser.Math.Distance.Between(this.player.x, this.player.y, obj.x, obj.y) < 110) {
            const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, obj.x, obj.y);
            obj.x += Math.cos(angle) * 65;
            obj.y += Math.sin(angle) * 65;
          }
        };

        if (this.dummyGroup) this.dummyGroup.getChildren().forEach(obj => pushBack(obj as Phaser.GameObjects.Sprite));
        if (this.botsGroup) {
          this.botsGroup.getChildren().forEach(obj => {
            const b = obj as Phaser.Physics.Arcade.Sprite;
            if (b.active) pushBack(b);
          });
        }
      } else if (type === 'ult') {
        // Ultimate: Steel Phalanx (Стальная Фаланга)
        soundEngine.playStoneSkin();
        this.isUltChanneling = true;
        this.alrikShieldActive = true;
        this.alrikShieldAngle = Math.atan2(dirY, dirX);
        this.alrikUltStabCd = 0;
        this.showFloatingText(this.player.x, this.player.y - 60, '★ СТАЛЬНАЯ ФАЛАНГА! ★', '#38bdf8');

        // Energetic shield banner
        this.alrikShieldGfx = this.add.rectangle(this.player.x, this.player.y, 80, 16, 0x38bdf8, 0.45).setStrokeStyle(3, 0x60a5fa).setDepth(152);

        // End ultimate after 3.0 seconds
        this.time.delayedCall(3000, () => {
          this.isUltChanneling = false;
          this.alrikShieldActive = false;
          if (this.alrikShieldGfx && this.alrikShieldGfx.active) {
            this.alrikShieldGfx.destroy();
            this.alrikShieldGfx = null;
          }
          this.showFloatingText(this.player.x, this.player.y - 60, 'ЩИТ РАССЕЯЛСЯ', '#94a3b8');
          if (this.playerWeaponVisual) {
            this.playerWeaponVisual.setRotation(0);
          }
        });
      }
    } else if (this.selectedHeroKey === 'char_kraul') {
      if (type === 'attack') {
        soundEngine.playKraulWhipAttack();
        const startX = this.player.x;
        const startY = this.player.y;
        const hitX = startX + dirX * 70;
        const hitY = startY + dirY * 70;
        const facingAngle = Math.atan2(dirY, dirX);

        // Whip strokes
        const whip1 = this.add.rectangle(hitX - dirY * 8, hitY + dirX * 8, 88, 3, 0x312e81).setDepth(100);
        const whip2 = this.add.rectangle(hitX + dirY * 8, hitY - dirX * 8, 88, 2, 0xa855f7).setDepth(101);
        whip1.setRotation(facingAngle + 0.1);
        whip2.setRotation(facingAngle - 0.1);

        this.tweens.add({
          targets: [whip1, whip2],
          scaleX: 1.3,
          alpha: 0,
          duration: 150,
          onComplete: () => {
            whip1.destroy();
            whip2.destroy();
          }
        });

        this.dealDamageInArea(hitX, hitY, 50, 110);
      } else if (type === 's1') {
        // Skill 1: Shadow Dash (Теневой рывок)
        soundEngine.playWhirlwind();
        const startX = this.player.x;
        const startY = this.player.y;
        const dashDist = 265;
        const targetX = Phaser.Math.Clamp(startX + dirX * dashDist, 80, 1520);
        const targetY = Phaser.Math.Clamp(startY + dirY * dashDist, 80, 1520);

        // Shadow dash effect (faded duplicate)
        const shadowGhost = this.add.image(startX, startY, 'char_kraul')
          .setDepth(99).setAlpha(0.6).setTint(0x701a75);
        this.tweens.add({
          targets: shadowGhost,
          x: targetX,
          y: targetY,
          alpha: 0,
          duration: 150,
          onComplete: () => shadowGhost.destroy()
        });

        this.player.setPosition(targetX, targetY);

        // Purple shadow line showing trail (Identical to DungeonScene!)
        const trailGfx = this.add.graphics().setDepth(98);
        trailGfx.lineStyle(4, 0xa855f7, 0.8);
        trailGfx.beginPath();
        trailGfx.moveTo(startX, startY);
        trailGfx.lineTo(targetX, targetY);
        trailGfx.strokePath();
        this.tweens.add({
          targets: trailGfx,
          alpha: 0,
          duration: 250,
          onComplete: () => trailGfx.destroy()
        });

        this.dealDamageInArea(targetX, targetY, 80, 60);

        // 3 bleed ticks (35 damage each)
        for (let t = 1; t <= 3; t++) {
          this.time.delayedCall(t * 1000, () => {
            if (this.dummyGroup) {
              this.dummyGroup.getChildren().forEach(obj => {
                const d = obj as Phaser.GameObjects.Sprite;
                if (Phaser.Math.Distance.Between(targetX, targetY, d.x, d.y) < 80) {
                  this.dealDamageInArea(d.x, d.y, 40, 35);
                  this.showFloatingText(d.x, d.y - 30, 'КРОВОТЕЧЕНИЕ 🩸', '#ef4444');
                }
              });
            }
          });
        }
      } else if (type === 's2') {
        // Skill 2: Dead Grip (Мертвая хватка)
        soundEngine.playCast();
        const startX = this.player.x;
        const startY = this.player.y;
        const targetX = Phaser.Math.Clamp(startX + dirX * 420, 80, 1520);
        const targetY = Phaser.Math.Clamp(startY + dirY * 420, 80, 1520);

        const armLine = this.add.graphics().setDepth(102);
        armLine.lineStyle(5, 0x312e81, 1.0);
        armLine.beginPath();
        armLine.moveTo(startX, startY);
        armLine.lineTo(targetX, targetY);
        armLine.strokePath();

        const handClaw = this.add.circle(targetX, targetY, 12, 0xfacc15, 0.95).setDepth(103);

        this.time.delayedCall(120, () => {
          armLine.destroy();
          handClaw.destroy();
          this.player.setPosition(targetX, targetY);
          this.dealDamageInArea(targetX, targetY, 65, 125);
          this.showFloatingText(targetX, targetY - 45, 'ОГЛУШЕН! 😵', '#eab308');
        });
      } else if (type === 'ult') {
        // Ultimate: Eerie Meatgrinder (Жуткая мясорубка)
        soundEngine.playCast();
        this.showFloatingText(this.player.x, this.player.y - 60, '★ ЖУТКАЯ МЯСОРУБКА! ★', '#c084fc');

        const leftEyeGfx = this.add.circle(this.player.x - 12, this.player.y - 25, 4, 0xfacc15, 0.95).setDepth(105);
        const rightEyeGfx = this.add.circle(this.player.x + 12, this.player.y - 25, 4, 0xfacc15, 0.95).setDepth(105);

        this.tweens.add({
          targets: [leftEyeGfx, rightEyeGfx],
          scaleX: 1.5,
          scaleY: 2.2,
          yoyo: true,
          repeat: -1,
          duration: 180
        });

        const ultAura = this.add.circle(this.player.x, this.player.y, 50, 0x701a75, 0.35).setDepth(99);
        const origSpeed = this.playerSpeed;
        this.playerSpeed = origSpeed * 1.5;

        const updateEvent = this.time.addEvent({
          delay: 16,
          repeat: 250,
          callback: () => {
            if (ultAura.active && this.player) {
              ultAura.setPosition(this.player.x, this.player.y);
              leftEyeGfx.setPosition(this.player.x - 8, this.player.y - 25);
              rightEyeGfx.setPosition(this.player.x + 8, this.player.y - 25);
            }
          }
        });

        this.time.delayedCall(4000, () => {
          this.playerSpeed = origSpeed;
          updateEvent.destroy();
          if (leftEyeGfx.active) leftEyeGfx.destroy();
          if (rightEyeGfx.active) rightEyeGfx.destroy();
          if (ultAura.active) ultAura.destroy();
          this.showFloatingText(this.player.x, this.player.y - 60, 'МЯСОРУБКА ЗАВЕРШЕНА', '#94a3b8');
        });
      }
    } else if (this.selectedHeroKey === 'char_nihil') {
      if (type === 'attack') {
        soundEngine.playMagicArcaneShoot();
        // Projectile shoots right out of Nihil's mouth / head!
        const startX = this.player.x + dirX * 22;
        const startY = this.player.y + dirY * 22;
        const targetX = startX + dirX * 360;
        const targetY = startY + dirY * 360;

        const muzzle = this.add.circle(startX, startY, 9, 0xd8b4fe, 0.9).setDepth(102);
        this.tweens.add({ targets: muzzle, scale: 0.2, alpha: 0, duration: 140, onComplete: () => muzzle.destroy() });

        const bullet = this.add.image(startX, startY, 'proj_nihil_bullet').setScale(1.5).setDepth(100);
        bullet.setTint(0xd8b4fe);

        let hitCount = 0;
        this.tweens.add({
          targets: bullet,
          x: targetX,
          y: targetY,
          duration: 320,
          onUpdate: () => {
            if (hitCount >= 2 || !bullet.active) return;
            if (this.checkEnemyAtPosition(bullet.x, bullet.y, 35)) {
              hitCount++;
              soundEngine.playMagicHit();
              this.dealDamageInArea(bullet.x, bullet.y, 40, 90, 'magic');
              if (hitCount >= 2) {
                bullet.destroy();
              }
            }
          },
          onComplete: () => {
            if (bullet.active) bullet.destroy();
          }
        });
      } else if (type === 's1') {
        // Singularity (Identical to DungeonScene)
        soundEngine.playCast();
        const targetX = this.player.x + dirX * 160;
        const targetY = this.player.y + dirY * 160;

        // Create gravity singularity visual
        const singularityBg = this.add.circle(targetX, targetY, 110, 0x1e1035, 0.45).setDepth(15);
        const singularityInner = this.add.circle(targetX, targetY, 15, 0xd8b4fe, 0.8).setDepth(16);

        this.tweens.add({
          targets: singularityBg,
          scaleX: 1.1,
          scaleY: 1.1,
          alpha: 0.25,
          duration: 350,
          yoyo: true,
          repeat: 6
        });

        let tickCount = 0;
        this.time.addEvent({
          delay: 500,
          repeat: 4,
          callback: () => {
            tickCount++;
            soundEngine.playPoison();

            // Pull and damage all dummy and enemy targets in hub
            this.dealDamageInArea(targetX, targetY, 110, 40, 'magic');

            // 8 inward flowing cosmic purple sparks
            for (let i = 0; i < 8; i++) {
              const angle = Math.random() * Math.PI * 2;
              const r = 85;
              const px = targetX + Math.cos(angle) * r;
              const py = targetY + Math.sin(angle) * r;
              const spark = this.add.circle(px, py, 4, 0xc084fc, 0.9).setDepth(20);
              this.tweens.add({
                targets: spark,
                x: targetX,
                y: targetY,
                scale: 0.2,
                alpha: 0,
                duration: 380,
                onComplete: () => spark.destroy()
              });
            }

            if (tickCount >= 5) {
              if (singularityBg.active) singularityBg.destroy();
              if (singularityInner.active) singularityInner.destroy();
            }
          }
        });
      } else if (type === 's2') {
        // Void Step (Шаг Пустоты)
        soundEngine.playCast();
        const startX = this.player.x;
        const startY = this.player.y;
        const targetX = Phaser.Math.Clamp(startX + dirX * 180, 80, 1520);
        const targetY = Phaser.Math.Clamp(startY + dirY * 180, 80, 1520);

        const shadow = this.add.image(startX, startY, 'char_nihil').setDepth(48).setAlpha(0.65).setTint(0xc084fc);
        this.tweens.add({ targets: shadow, alpha: 0, scale: 0.8, duration: 300, onComplete: () => shadow.destroy() });
        this.player.setPosition(targetX, targetY);

        // Speed boost for 2 seconds
        const originalSpeed = this.playerSpeed;
        this.playerSpeed = originalSpeed * 1.30;
        this.time.delayedCall(2000, () => {
          this.playerSpeed = originalSpeed;
        });
      } else if (type === 'ult') {
        // Execution of Three Blades (identical to Dungeon!)
        soundEngine.playCast();
        this.cameras.main.shake(350, 0.02);

        const sx = this.player.x;
        const sy = this.player.y;
        const angles = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];
        const radius = 95;

        angles.forEach((angle, idx) => {
          const fallX = sx + Math.cos(angle) * radius;
          const fallY = sy + Math.sin(angle) * radius;

          const dagger = this.add.image(fallX, fallY - 200, 'skill_nihil_3').setDepth(160).setScale(3.5).setAlpha(0);
          this.tweens.add({
            targets: dagger,
            y: fallY,
            alpha: 1,
            duration: 380 + idx * 80,
            ease: 'Bounce.easeOut',
            onComplete: () => {
              soundEngine.playExplosion();
              this.cameras.main.shake(150, 0.015);
              const impact = this.add.circle(fallX, fallY, 40, 0xc084fc, 0.6).setDepth(45);
              this.tweens.add({
                targets: impact,
                scale: 2.0,
                alpha: 0,
                duration: 250,
                onComplete: () => impact.destroy()
              });
              this.dealDamageInArea(fallX, fallY, 70, 160, 'magic');
              this.time.delayedCall(1200, () => {
                if (dagger.active) {
                  this.tweens.add({
                    targets: dagger,
                    alpha: 0,
                    scale: 0.2,
                    duration: 300,
                    onComplete: () => dagger.destroy()
                  });
                }
              });
            }
          });
        });
      }
    }
  }

  private checkEnemyAtPosition(x: number, y: number, radius: number): boolean {
    let hit = false;
    if (this.dummyGroup) {
      this.dummyGroup.getChildren().forEach(obj => {
        const dummy = obj as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
        if (Phaser.Math.Distance.Between(x, y, dummy.x, dummy.y) <= radius) {
          hit = true;
        }
      });
    }
    if (!hit && this.botsGroup) {
      this.botsGroup.getChildren().forEach(obj => {
        const bot = obj as Phaser.Physics.Arcade.Sprite;
        if (bot.active && Phaser.Math.Distance.Between(x, y, bot.x, bot.y) <= radius) {
          hit = true;
        }
      });
    }
    return hit;
  }

  private dealDamageInArea(x: number, y: number, radius: number, damage: number, hitType?: 'blade' | 'whip' | 'magic' | 'acid' | 'pierce' | 'blunt') {
    let hitTriggered = false;
    const triggerHitSound = () => {
      if (hitTriggered) return;
      hitTriggered = true;
      if (hitType === 'whip' || this.selectedHeroKey === 'char_kraul') soundEngine.playWhipHit();
      else if (hitType === 'magic' || this.selectedHeroKey === 'char_omen' || this.selectedHeroKey === 'char_nihil') soundEngine.playMagicHit();
      else if (hitType === 'acid' || this.selectedHeroKey === 'char_grim') soundEngine.playAcidHit();
      else if (hitType === 'blunt' || this.selectedHeroKey === 'char_torf' || this.selectedHeroKey === 'char_bjorn') soundEngine.playBluntHit();
      else if (hitType === 'pierce' || this.selectedHeroKey === 'char_alrik') soundEngine.playPierceHit();
      else soundEngine.playBladeHit();
    };

    if (this.dummyGroup) {
      this.dummyGroup.getChildren().forEach(obj => {
        const dummy = obj as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody & { hp?: number };
        const dist = Phaser.Math.Distance.Between(x, y, dummy.x, dummy.y);
        if (dist <= radius) {
          triggerHitSound();
          dummy.setTint(0xff0000);
          this.time.delayedCall(120, () => dummy.clearTint());
          this.showFloatingText(dummy.x, dummy.y - 25, `-${damage}`, '#f87171');
        }
      });
    }

    if (this.botsGroup) {
      this.botsGroup.getChildren().forEach(obj => {
        const bot = obj as Phaser.Physics.Arcade.Sprite & { hp: number; maxHp: number };
        if (!bot.active) return;
        const dist = Phaser.Math.Distance.Between(x, y, bot.x, bot.y);
        if (dist <= radius) {
          triggerHitSound();
          bot.setTint(0xff0000);
          this.time.delayedCall(120, () => {
            if (bot.active) bot.clearTint();
          });
          this.showFloatingText(bot.x, bot.y - 25, `-${damage}`, '#f87171');
          bot.hp -= damage;
          if (bot.hp <= 0) {
            soundEngine.playExplosion();
            this.showFloatingText(bot.x, bot.y - 45, 'ПОБЕЖДЕН! +100', '#4ade80');
            const deadFx = this.add.circle(bot.x, bot.y, 20, 0xef4444, 0.8).setDepth(45);
            this.tweens.add({
              targets: deadFx,
              scale: 2.5,
              alpha: 0,
              duration: 300,
              onComplete: () => deadFx.destroy()
            });
            bot.destroy();
          }
        }
      });
    }
  }

  private showFloatingText(x: number, y: number, text: string, color: string) {
    const floatTxt = this.add.text(x, y, text, {
      fontSize: '14px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: color
    }).setOrigin(0.5).setDepth(200);

    this.tweens.add({
      targets: floatTxt,
      y: y - 35,
      alpha: 0,
      duration: 750,
      onComplete: () => floatTxt.destroy()
    });
  }

  private updateCombatIcons() {
    if (this.isMonster && this.selectedHeroKey === 'char_zaza') {
      this.iconS1.setTexture('skill_monster_1');
      this.iconS2.setTexture('skill_monster_2');
      this.iconUlt.setTint(0x475569);
    } else {
      const hero = HEROES[this.selectedHeroKey];
      this.iconS1.setTexture(hero.skills[0].icon);
      this.iconS2.setTexture(hero.skills[1].icon);
      this.iconUlt.setTexture(hero.skills[2].icon).clearTint();
    }
  }

  private handleCurrentInteraction() {
    if (!this.currentInteractable) return;
    soundEngine.playClick();
    if (this.currentInteractable.action === 'altar') {
      this.openHeroMenu();
    } else if (this.currentInteractable.action === 'dungeon_portal') {
      this.openLobby('dungeon');
    } else if (this.currentInteractable.action === 'pvp_arena') {
      this.openLobby('pvp');
    } else if (this.currentInteractable.action === 'shop') {
      this.setModalOpenState(true);
      this.player.setVelocity(0, 0);
      this.interactPromptUI.setVisible(false);
      if (this.minimapContainer) this.minimapContainer.setVisible(false);
      this.combatElements.forEach(el => (el as unknown as { setVisible: (v: boolean) => void }).setVisible(false));
      if (this.joyStickBase) {
        this.joyStickBase.setVisible(false);
        this.joyStickThumb.setVisible(false);
      }
      this.game.events.emit('open-shop-modal');
    } else if (this.currentInteractable.action === 'tavern') {
      soundEngine.playLevelUp();
      this.scene.start('TavernScene', { selectedHeroKey: this.selectedHeroKey });
    } else if (this.currentInteractable.action === 'news') {
      this.openNewsModal();
    }
  }

  private hideArray(arr: Phaser.GameObjects.GameObject[]) {
    arr.forEach(el => (el as unknown as { setVisible: (v: boolean) => void }).setVisible(false));
  }

  private showArray(arr: Phaser.GameObjects.GameObject[]) {
    arr.forEach(el => (el as unknown as { setVisible: (v: boolean) => void }).setVisible(true));
  }

  override update(time: number, delta: number) {
    if (this.isLobbyOpen || this.isRankedModalOpen) {
      this.player.setVelocity(0, 0);
      return;
    }
    if (this.isHeroMenuOpen || this.isLobbyOpen || this.isTavernOpen || this.isNewsOpen) return;

    this.updateMinimapRadar();

    // Monster transformation expiration
    if (this.isMonster && time > this.monsterTimer) {
      this.isMonster = false;
      this.player.setTexture(HEROES[this.selectedHeroKey].texture);
      this.player.setScale(1);
      this.playerHp = HEROES[this.selectedHeroKey].hp;
      this.playerMaxHp = HEROES[this.selectedHeroKey].hp;
      if (this.playerWeaponVisual) this.playerWeaponVisual.setVisible(this.selectedHeroKey !== 'char_kraul');
      this.updateCombatIcons();
      this.showFloatingText(this.player.x, this.player.y - 60, 'ДЕЙСТВИЕ МУТАЦИИ ЗАКОНЧИЛОСЬ', '#94a3b8');
    }

    this.updateWeaponVisualPosition();

    if (this.aimJoyPointerId !== null) {
      if (this.cds.attack <= time) {
        if (this.aimJoyMoved && this.aimJoyVector.lengthSq() > 0.05) {
          this.executeSkill('attack');
        } else {
          this.autoAimAndAttackHub();
        }
      }
    }

    // Cooldown overlays - display text-only countdowns for skills, skip attack entirely
    const now = time;
    const s1Remaining = Math.max(0, this.cds.s1 - now);
    const s2Remaining = Math.max(0, this.cds.s2 - now);
    const ultRemaining = Math.max(0, this.cds.ult - now);

    // Hide circular overlays entirely
    this.cdAttackOverlay.setVisible(false);
    this.cdS1Overlay.setVisible(false);
    this.cdS2Overlay.setVisible(false);
    this.cdUltOverlay.setVisible(false);

    // Update text labels
    if (this.cdS1Txt) {
      if (s1Remaining > 0) {
        this.cdS1Txt.setText(`${(s1Remaining / 1000).toFixed(1)}`);
        this.cdS1Txt.setVisible(true);
      } else {
        this.cdS1Txt.setVisible(false);
      }
    }

    if (this.cdS2Txt) {
      if (s2Remaining > 0) {
        this.cdS2Txt.setText(`${(s2Remaining / 1000).toFixed(1)}`);
        this.cdS2Txt.setVisible(true);
      } else {
        this.cdS2Txt.setVisible(false);
      }
    }

    if (this.cdUltTxt) {
      if (ultRemaining > 0) {
        this.cdUltTxt.setText(`${(ultRemaining / 1000).toFixed(1)}`);
        this.cdUltTxt.setVisible(true);
      } else {
        this.cdUltTxt.setVisible(false);
      }
    }

    // Keyboard Shortcuts
    if (this.isPC) {
      if (Phaser.Input.Keyboard.JustDown(this.keyAttack)) this.autoAimAndAttackHub();
      if (Phaser.Input.Keyboard.JustDown(this.keyS1)) this.executeCombatSkillWithMouseTarget('s1');
      if (Phaser.Input.Keyboard.JustDown(this.keyS2)) this.executeCombatSkillWithMouseTarget('s2');
      if (Phaser.Input.Keyboard.JustDown(this.keyUlt)) this.executeCombatSkillWithMouseTarget('ult');
    }

    if (this.attackFacingTimer > 0) {
      this.attackFacingTimer = Math.max(0, this.attackFacingTimer - delta);
    }

    // Movement calculation (WASD, Arrows, or Joystick)
    const velocity = new Phaser.Math.Vector2(0, 0);

    if (this.isUltChanneling && this.selectedHeroKey === 'char_alrik') {
      let dx = 0;
      let dy = 0;
      if (this.cursors.A.isDown || this.cursors.LEFT.isDown) dx = -1;
      else if (this.cursors.D.isDown || this.cursors.RIGHT.isDown) dx = 1;

      if (this.cursors.W.isDown || this.cursors.UP.isDown) dy = -1;
      else if (this.cursors.S.isDown || this.cursors.DOWN.isDown) dy = 1;

      if (!this.isPC && this.joyStickVector.lengthSq() > 0) {
        dx = this.joyStickVector.x;
        dy = this.joyStickVector.y;
      }
      if (this.aimJoyVector.lengthSq() > 0.05) {
        dx = this.aimJoyVector.x;
        dy = this.aimJoyVector.y;
      }

      if (dx !== 0 || dy !== 0) {
        const len = Math.sqrt(dx * dx + dy * dy);
        this.player.setVelocity((dx / len) * this.playerSpeed, (dy / len) * this.playerSpeed);
        const angle = Math.atan2(dy, dx);
        this.alrikShieldAngle = angle;
        this.player.setFlipX(dx < 0);

          // Continuous stabbing attack cooldown tick during ultimate (HubScene)
          if (!this.alrikUltStabCd) this.alrikUltStabCd = 0;
          this.alrikUltStabCd -= delta;

          if (this.alrikUltStabCd <= 0) {
            this.alrikUltStabCd = 240;
            soundEngine.playSlash();

            // 1. Animate weapon thrust forward
            if (this.playerWeaponVisual) {
              this.weaponAttackAngle = angle;
              this.weaponThrustDist = 0;
              this.tweens.add({
                targets: this,
                weaponThrustDist: 40,
                duration: 80,
                yoyo: true,
                ease: 'Cubic.easeOut',
                onComplete: () => {
                  this.weaponThrustDist = 0;
                }
              });
            }

            // 2. Beautiful white-blue tapered thrust lines
            const stabX = this.player.x + Math.cos(angle) * 65;
            const stabY = this.player.y + Math.sin(angle) * 65;
            const stabOuter = this.add.rectangle(stabX, stabY, 80, 10, 0x38bdf8, 0.8).setDepth(153);
            const stabInner = this.add.rectangle(stabX, stabY, 80, 4, 0xffffff).setDepth(154);
            stabOuter.setRotation(angle);
            stabInner.setRotation(angle);
            this.tweens.add({
              targets: [stabOuter, stabInner],
              scaleX: 1.4,
              alpha: 0,
              duration: 140,
              onComplete: () => {
                stabOuter.destroy();
                stabInner.destroy();
              }
            });

            // 3. Damage dummies/mobs (front sector)
            if (this.dummyGroup) {
              this.dummyGroup.getChildren().forEach(obj => {
                const d = obj as Phaser.GameObjects.Sprite;
                const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, d.x, d.y);
                if (dist <= 145) {
                  const mAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, d.x, d.y);
                  const angleDiff = Phaser.Math.Angle.Wrap(mAngle - angle);
                  if (Math.abs(angleDiff) < 0.8) {
                    this.dealDamageInArea(d.x, d.y, 40, 135);
                  }
                }
              });
            }
          }
        } else {
          // No direction held, place spear in nice vertical defensive ground-stuck pose
          if (this.playerWeaponVisual && !this.tweens.isTweening(this.playerWeaponVisual)) {
            const spearX = this.player.x + Math.cos(this.alrikShieldAngle) * 18;
            const spearY = this.player.y + Math.sin(this.alrikShieldAngle) * 18 + 6;
            this.playerWeaponVisual.setPosition(spearX, spearY);
            this.playerWeaponVisual.setRotation(0.75 * Math.PI); // vertical
          }
        }

        if (this.alrikShieldActive && this.alrikShieldGfx && this.alrikShieldGfx.active) {
          const shieldDist = 36;
          const sx = this.player.x + Math.cos(this.alrikShieldAngle) * shieldDist;
          const sy = this.player.y + Math.sin(this.alrikShieldAngle) * shieldDist;
          this.alrikShieldGfx.setPosition(sx, sy);
          this.alrikShieldGfx.setRotation(this.alrikShieldAngle);
        }
    } else {
      if (this.isAnyModalOpen || this.isHeroMenuOpen || this.isLobbyOpen) {
        this.player.setVelocity(0, 0);
        return;
      }

      if (this.cursors.A.isDown || this.cursors.LEFT.isDown) velocity.x = -1;
      else if (this.cursors.D.isDown || this.cursors.RIGHT.isDown) velocity.x = 1;

      if (this.cursors.W.isDown || this.cursors.UP.isDown) velocity.y = -1;
      else if (this.cursors.S.isDown || this.cursors.DOWN.isDown) velocity.y = 1;

      if (!this.isPC && this.joyStickVector.lengthSq() > 0) {
        velocity.set(this.joyStickVector.x, this.joyStickVector.y);
      }

      if (velocity.lengthSq() > 0) {
        velocity.normalize();
        this.player.setVelocity(velocity.x * this.playerSpeed, velocity.y * this.playerSpeed);
        if (this.aimJoyPointerId === null && this.attackFacingTimer <= 0) {
          if (this.selectedHeroKey === 'char_nihil') {
            this.player.setRotation(Math.atan2(velocity.y, velocity.x) + Math.PI / 2);
            this.player.setFlipX(false);
          } else if (velocity.x !== 0) {
            this.player.setFlipX(velocity.x < 0);
          }
        } else {
          // While attacking or aiming, face where player is shooting/firing
          if (this.selectedHeroKey === 'char_nihil') {
            this.player.setRotation(Math.atan2(this.aimVector.y, this.aimVector.x) + Math.PI / 2);
            this.player.setFlipX(false);
          } else if (this.aimVector.x !== 0) {
            this.player.setFlipX(this.aimVector.x < 0);
          }
        }
      } else {
        this.player.setVelocity(0, 0);
      }
    }

    this.updateWeaponVisualPosition();

    // Check distance to interactable world triggers
    let closest: { x: number; y: number; text: string; action: string } | null = null;
    let minDist = 130;

    for (const item of this.interactables) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, item.x, item.y);
      if (dist < minDist) {
        closest = item;
        minDist = dist;
      }
    }

    this.currentInteractable = closest;
    if (closest) {
      this.interactPromptUI.setText(`${closest.text}\n(Нажми для открытия)`).setVisible(true);
    } else {
      this.interactPromptUI.setVisible(false);
    }
  }

  private repositionAltarElements(width: number, height: number) {
    const cx = width / 2;
    const cy = height / 2;

    if (this.heroOverlay && typeof this.heroOverlay.setDisplaySize === 'function') {
      this.heroOverlay.setDisplaySize(width * 2, height * 2).setPosition(cx, cy);
    }
    if (this.altarBg) {
      this.altarBg.setPosition(cx, cy);
    }

    // Reposition roster elements
    const isRosterVisible = this.isHeroMenuOpen && !this.isHeroDetailOpen;
    const cardXOffsets = [-246, -82, 82, 246];

    if (this.rosterGroup && this.rosterGroup.length > 0) {
      if (this.rosterGroup[0]) (this.rosterGroup[0] as Phaser.GameObjects.Text).setPosition(cx, cy - 205).setVisible(isRosterVisible);
      if (this.rosterGroup[1]) (this.rosterGroup[1] as Phaser.GameObjects.Text).setPosition(cx + 350, cy - 205).setVisible(isRosterVisible);

      const hasMultipleRows = this.maxRosterScrollY > 0;
      if (this.rosterUpBtn) this.rosterUpBtn.setPosition(cx + 352, cy - 50).setVisible(isRosterVisible && hasMultipleRows);
      if (this.rosterUpText) this.rosterUpText.setPosition(cx + 352, cy - 50).setVisible(isRosterVisible && hasMultipleRows);
      if (this.rosterDownBtn) this.rosterDownBtn.setPosition(cx + 352, cy + 50).setVisible(isRosterVisible && hasMultipleRows);
      if (this.rosterDownText) this.rosterDownText.setPosition(cx + 352, cy + 50).setVisible(isRosterVisible && hasMultipleRows);
      if (this.rosterHintText) this.rosterHintText.setPosition(cx, cy + 215).setVisible(isRosterVisible && hasMultipleRows);
    }

    if (this.rosterCards && this.rosterCards.length > 0) {
      this.rosterCards.forEach((c) => {
        const cX = cx + cardXOffsets[c.col];
        const baseY = cy - 75 + c.row * 180;
        const cY = baseY - this.rosterScrollY;

        // Viewport bounds check inside modal interior
        const inViewport = cY >= cy - 220 && cY <= cy + 220;
        const showCard = isRosterVisible && inViewport;

        if (c.bg) c.bg.setPosition(cX, cY).setVisible(showCard);
        if (c.banner) c.banner.setPosition(cX, cY - 65).setVisible(showCard);
        if (c.rarityText) c.rarityText.setPosition(cX, cY - 65).setVisible(showCard);
        if (c.pedestalOuter) c.pedestalOuter.setPosition(cX, cY - 5).setVisible(showCard);
        if (c.pedestalInner) c.pedestalInner.setPosition(cX, cY - 5).setVisible(showCard);
        if (c.portrait) c.portrait.setPosition(cX, cY - 28).setVisible(showCard);
        if (c.nameText) c.nameText.setPosition(cX, cY + 20).setVisible(showCard);
        if (c.statsText) c.statsText.setPosition(cX, cY + 38).setVisible(showCard);

        const isEquipped = c.key === this.selectedHeroKey;
        if (c.statusText) {
          c.statusText.setPosition(cX, cY + 56)
            .setText(isEquipped ? '[ ТЕКУЩИЙ ✓ ]' : '')
            .setVisible(showCard && isEquipped);
        }
      });
    }

    // Reposition detail elements (Hero Name top-left, Sprite & Pedestal center, 3 Separate Skill boxes, Skill selector buttons, Select button)
    if (this.detailGroup && this.detailGroup.length > 0) {
      const leftX = cx - 215;
      if (this.detailHeroName) this.detailHeroName.setPosition(leftX, cy - 135);
      if (this.detailHeroRarityBadgeBg) this.detailHeroRarityBadgeBg.setPosition(leftX, cy - 106);
      if (this.detailHeroRarity) this.detailHeroRarity.setPosition(leftX, cy - 106);
      if (this.detailHeroTitleBoxBg) this.detailHeroTitleBoxBg.setPosition(leftX, cy - 76);
      if (this.detailHeroTitle) this.detailHeroTitle.setPosition(leftX, cy - 76);
      if (this.detailHeroAttackBoxBg) this.detailHeroAttackBoxBg.setPosition(leftX, cy - 30);
      if (this.detailHeroAttackDesc) this.detailHeroAttackDesc.setPosition(leftX - 74, cy - 44);
      if (this.detailHeroStatsBoxBg) this.detailHeroStatsBoxBg.setPosition(leftX, cy + 22);
      if (this.detailHeroStats) this.detailHeroStats.setPosition(leftX, cy + 22);

      const heroCenterX = cx - 10;
      if (this.detailPedestalOuter) this.detailPedestalOuter.setPosition(heroCenterX, cy + 62);
      if (this.detailPedestal) this.detailPedestal.setPosition(heroCenterX, cy + 62);
      if (this.detailHeroSprite) this.detailHeroSprite.setPosition(heroCenterX, cy - 12);

      const rightColX = cx + 205;
      if (this.detailSkillNameBoxBg) this.detailSkillNameBoxBg.setPosition(rightColX - 32, cy - 134);
      if (this.detailSkillTitle) this.detailSkillTitle.setPosition(rightColX - 32, cy - 134);
      if (this.detailSkillCdBoxBg) this.detailSkillCdBoxBg.setPosition(rightColX + 70, cy - 134);
      if (this.detailSkillMeta) this.detailSkillMeta.setPosition(rightColX + 70, cy - 134);
      if (this.detailSkillDescBox) this.detailSkillDescBox.setPosition(rightColX + 5, cy - 78);
      if (this.detailSkillDesc) this.detailSkillDesc.setPosition(rightColX - 92, cy - 104);

      const sqYOffsets = [-16, 32, 80];
      this.detailSkillSquareButtons.forEach((sqBtn, i) => {
        const sqY = cy + sqYOffsets[i];
        if (sqBtn.bg) sqBtn.bg.setPosition(rightColX + 5, sqY);
        if (sqBtn.icon) sqBtn.icon.setPosition(rightColX - 75, sqY);
        if (sqBtn.label) sqBtn.label.setPosition(rightColX - 48, sqY);
      });

      if (this.detailSelectBtn) this.detailSelectBtn.setPosition(rightColX + 5, cy + 140);
      if (this.detailSelectText) this.detailSelectText.setPosition(rightColX + 5, cy + 140);
    }
  }

  private repositionLobbyElements(cx: number, cy: number) {
    if (this.lobbyOverlay) this.lobbyOverlay.setPosition(cx, cy);
    if (this.lobbyBg) this.lobbyBg.setPosition(cx, cy);
    if (this.lobbyTitle) this.lobbyTitle.setPosition(cx, cy - 175);
    if (this.lobbyBackBtn) this.lobbyBackBtn.setPosition(cx - 260, cy - 175);
    if (this.lobbyCloseBtn) this.lobbyCloseBtn.setPosition(cx + 275, cy - 175);

    // Root buttons [ ПВП ] & [ ПОДЗЕМЕЛЬЕ ]
    if (this.portalRootGroup && this.portalRootGroup.length === 6) {
      const rootPvpY = cy - 40;
      (this.portalRootGroup[0] as Phaser.GameObjects.Rectangle).setPosition(cx, rootPvpY);
      (this.portalRootGroup[1] as Phaser.GameObjects.Text).setPosition(cx, rootPvpY - 14);
      (this.portalRootGroup[2] as Phaser.GameObjects.Text).setPosition(cx, rootPvpY + 16);

      const rootDungY = cy + 60;
      (this.portalRootGroup[3] as Phaser.GameObjects.Rectangle).setPosition(cx, rootDungY);
      (this.portalRootGroup[4] as Phaser.GameObjects.Text).setPosition(cx, rootDungY - 14);
      (this.portalRootGroup[5] as Phaser.GameObjects.Text).setPosition(cx, rootDungY + 16);
    }

    // PVP modes [ ОБЫЧНЫЙ ] & [ РЕЙТИНГОВЫЙ ]
    if (this.pvpModesGroup && this.pvpModesGroup.length === 6) {
      const casualY = cy - 40;
      (this.pvpModesGroup[0] as Phaser.GameObjects.Rectangle).setPosition(cx, casualY);
      (this.pvpModesGroup[1] as Phaser.GameObjects.Text).setPosition(cx, casualY - 14);
      (this.pvpModesGroup[2] as Phaser.GameObjects.Text).setPosition(cx, casualY + 16);

      const rankedY = cy + 60;
      (this.pvpModesGroup[3] as Phaser.GameObjects.Rectangle).setPosition(cx, rankedY);
      (this.pvpModesGroup[4] as Phaser.GameObjects.Text).setPosition(cx, rankedY - 14);
      (this.pvpModesGroup[5] as Phaser.GameObjects.Text).setPosition(cx, rankedY + 16);
    }

    // Dungeon modes [ СОЛО ] & [ ОНЛАЙН ]
    if (this.dungeonModesGroup && this.dungeonModesGroup.length === 6) {
      const soloY = cy - 40;
      (this.dungeonModesGroup[0] as Phaser.GameObjects.Rectangle).setPosition(cx, soloY);
      (this.dungeonModesGroup[1] as Phaser.GameObjects.Text).setPosition(cx, soloY - 14);
      (this.dungeonModesGroup[2] as Phaser.GameObjects.Text).setPosition(cx, soloY + 16);

      const onlineY = cy + 60;
      (this.dungeonModesGroup[3] as Phaser.GameObjects.Rectangle).setPosition(cx, onlineY);
      (this.dungeonModesGroup[4] as Phaser.GameObjects.Text).setPosition(cx, onlineY - 14);
      (this.dungeonModesGroup[5] as Phaser.GameObjects.Text).setPosition(cx, onlineY + 16);
    }

    // Dungeon online choice [ СОЗДАТЬ ] & [ ВОЙТИ ]
    if (this.dungeonOnlineChoiceGroup && this.dungeonOnlineChoiceGroup.length === 6) {
      const createY = cy - 40;
      (this.dungeonOnlineChoiceGroup[0] as Phaser.GameObjects.Rectangle).setPosition(cx, createY);
      (this.dungeonOnlineChoiceGroup[1] as Phaser.GameObjects.Text).setPosition(cx, createY - 14);
      (this.dungeonOnlineChoiceGroup[2] as Phaser.GameObjects.Text).setPosition(cx, createY + 16);

      const joinY = cy + 60;
      (this.dungeonOnlineChoiceGroup[3] as Phaser.GameObjects.Rectangle).setPosition(cx, joinY);
      (this.dungeonOnlineChoiceGroup[4] as Phaser.GameObjects.Text).setPosition(cx, joinY - 14);
      (this.dungeonOnlineChoiceGroup[5] as Phaser.GameObjects.Text).setPosition(cx, joinY + 16);
    }

    // Dungeon create view
    if (this.dungeonCreateGroup && this.dungeonCreateGroup.length >= 8) {
      (this.dungeonCreateGroup[0] as Phaser.GameObjects.Rectangle).setPosition(cx, cy);
      if (this.roomNameDisplay) this.roomNameDisplay.setPosition(cx, cy - 90);
      if (this.roomPassDisplay) this.roomPassDisplay.setPosition(cx, cy - 45);
      (this.dungeonCreateGroup[3] as Phaser.GameObjects.Rectangle).setPosition(cx - 110, cy + 15);
      (this.dungeonCreateGroup[4] as Phaser.GameObjects.Text).setPosition(cx - 110, cy + 15);
      if (this.personalCodeDisplay) this.personalCodeDisplay.setPosition(cx + 120, cy + 15);
      (this.dungeonCreateGroup[6] as Phaser.GameObjects.Rectangle).setPosition(cx, cy + 85);
      (this.dungeonCreateGroup[7] as Phaser.GameObjects.Text).setPosition(cx, cy + 85);
    }

    // Ranked group
    if (this.rankedGroup && this.rankedGroup.length >= 7) {
      (this.rankedGroup[0] as Phaser.GameObjects.Image).setPosition(cx, cy - 90);
      (this.rankedGroup[1] as Phaser.GameObjects.Text).setPosition(cx, cy - 45);
      (this.rankedGroup[2] as Phaser.GameObjects.Text).setPosition(cx, cy - 15);
      (this.rankedGroup[3] as Phaser.GameObjects.Rectangle).setPosition(cx - 100, cy + 55);
      (this.rankedGroup[4] as Phaser.GameObjects.Text).setPosition(cx - 100, cy + 55);
      (this.rankedGroup[5] as Phaser.GameObjects.Rectangle).setPosition(cx + 100, cy + 55);
      (this.rankedGroup[6] as Phaser.GameObjects.Text).setPosition(cx + 100, cy + 55);
    }

    // Casual group
    if (this.casualGroup && this.casualGroup.length >= 10) {
      const listBorder = this.casualGroup[0] as Phaser.GameObjects.Rectangle;
      if (listBorder) listBorder.setPosition(cx, cy - 35);
      for (let i = 0; i < 3; i++) {
        if (this.serverLabels[i]) {
          this.serverLabels[i].setPosition(cx - 250, cy - 85 + i * 42);
        }
      }
      const btnSpacing = 175;
      (this.casualGroup[4] as Phaser.GameObjects.Rectangle).setPosition(cx - btnSpacing, cy + 75);
      (this.casualGroup[5] as Phaser.GameObjects.Text).setPosition(cx - btnSpacing, cy + 75);
      (this.casualGroup[6] as Phaser.GameObjects.Rectangle).setPosition(cx, cy + 75);
      (this.casualGroup[7] as Phaser.GameObjects.Text).setPosition(cx, cy + 75);
      (this.casualGroup[8] as Phaser.GameObjects.Rectangle).setPosition(cx + btnSpacing, cy + 75);
      (this.casualGroup[9] as Phaser.GameObjects.Text).setPosition(cx + btnSpacing, cy + 75);
    }

    // Search group
    if (this.searchGroup && this.searchGroup.length >= 3) {
      (this.searchGroup[0] as Phaser.GameObjects.Text).setPosition(cx, cy - 20);
      (this.searchGroup[1] as Phaser.GameObjects.Rectangle).setPosition(cx, cy + 50);
      (this.searchGroup[2] as Phaser.GameObjects.Text).setPosition(cx, cy + 50);
    }
  }

  private handleResize(gameSize: Phaser.Structs.Size) {
    const width = gameSize.width;
    const height = gameSize.height;

    if (this.cameras.main) {
      this.cameras.main.setViewport(0, 0, width, height);
    }

    this.repositionAltarElements(width, height);
    this.repositionLobbyElements(width / 2, height / 2);

    if (this.interactPromptUI) {
      this.interactPromptUI.setPosition(width / 2, height - 35);
    }

    // Reposition and scale controls & combat buttons cleanly
    this.positionCombatUI(width, height);

    // Reposition Currency HUD (Unified horizontal capsule)
    if (this.currencyHUDContainer) {
      const isPortrait = height > width;
      const capsuleW = 312;
      const hudX = isPortrait ? Math.round(width / 2) : Math.round(width - 20 - capsuleW / 2);
      this.currencyHUDContainer.setPosition(hudX, 36);
    }

    // Reposition Minimap strictly below the currency capsule
    if (this.minimapContainer) {
      const isPortrait = height > width;
      const size = 110;
      const miniX = isPortrait ? Math.round(width / 2) : Math.round(width - 20 - size / 2);
      const miniY = Math.round(20 + 36 + 15 + size / 2);
      this.minimapContainer.setPosition(miniX, miniY);
    }

    this.updateCurrencyHUD();
  }

  private setModalOpenState(isOpen: boolean) {
    this.isAnyModalOpen = isOpen;
    if (isOpen) {
      this.player.setVelocity(0, 0);
      this.joyStickVector.set(0, 0);
      this.aimJoyVector.set(0, 0);
      this.joyStickPointerId = null;
      this.aimJoyPointerId = null;
      if (this.joyStickBase) this.joyStickBase.setVisible(false);
      if (this.joyStickThumb) this.joyStickThumb.setVisible(false);
      if (this.minimapContainer) this.minimapContainer.setVisible(false);
      this.combatElements.forEach(el => (el as unknown as { setVisible: (v: boolean) => void }).setVisible(false));
    } else {
      if (!this.isPC && this.joyStickBase) {
        this.joyStickBase.setVisible(true);
        this.joyStickThumb.setVisible(true);
        this.joyStickThumb.setPosition(this.joyStickOrigin.x, this.joyStickOrigin.y);
      }
      if (this.minimapContainer) this.minimapContainer.setVisible(true);
      this.combatElements.forEach(el => (el as unknown as { setVisible: (v: boolean) => void }).setVisible(true));
      const savedHero = localStorage.getItem('fb_current_hero') || 'char_zaza';
      if (this.selectedHeroKey !== savedHero) {
        this.selectedHeroKey = savedHero;
        this.tempHeroKey = savedHero;
        this.applySelectedHero();
      }
      this.updateCurrencyHUD();
    }
  }

  // --- MUSIC SELECTION MODAL IN HUB ---
  private musicOverlay!: Phaser.GameObjects.Rectangle;
  private musicModalContainer!: Phaser.GameObjects.Container;
  private musicSlotCards: Array<{
    bg: Phaser.GameObjects.Rectangle;
    pic: Phaser.GameObjects.Image;
    name: Phaser.GameObjects.Text;
    desc: Phaser.GameObjects.Text;
    btn: Phaser.GameObjects.Text;
    trackId: 'Wiklund' | 'Neowave' | 'VoidOverlord' | 'ShadowRealm' | 'BloodMoon';
  }> = [];

  private musicHubScrollY = 0;
  private musicHubListContainer!: Phaser.GameObjects.Container;

  private buildMusicModal(width: number, height: number) {
    const cx = width / 2;
    const cy = height / 2;

    this.musicOverlay = this.add.rectangle(cx, cy, width * 2, height * 2, 0x000000, 0.85)
      .setScrollFactor(0).setDepth(500).setInteractive().setVisible(false);

    this.musicModalContainer = this.add.container(cx, cy).setScrollFactor(0).setDepth(501).setVisible(false);

    const musicBg = this.add.rectangle(0, 0, 680, 430, 0x0f172a).setStrokeStyle(4, 0x38bdf8);
    const musicTitle = this.add.text(0, -185, '⚙ НАСТРОЙКИ И МУЗЫКА (5 ТРЕКОВ) ⚙', {
      fontSize: '17px', fontFamily: 'monospace', fontStyle: 'bold', color: '#f0f9ff'
    }).setOrigin(0.5);

    const musicSubtitle = this.add.text(0, -162, '3 трека в ряду • Прокручивайте список вверх и вниз ↕', {
      fontSize: '11px', fontFamily: 'monospace', color: '#94a3b8'
    }).setOrigin(0.5);

    this.musicModalContainer.add([musicBg, musicTitle, musicSubtitle]);

    this.musicHubListContainer = this.add.container(0, -20);
    this.musicModalContainer.add(this.musicHubListContainer);

    const musicTracks = [
      { id: 'Wiklund' as const, name: 'WIKLUND', desc: 'Поход (RPG 8-Bit)', tex: 'WiklundPic', color: '#fef08a' },
      { id: 'Neowave' as const, name: 'NEOWAVE', desc: 'Замок (Synthwave)', tex: 'NeowavePic', color: '#e0aaff' },
      { id: 'VoidOverlord' as const, name: 'ВЛАСТЕЛИН', desc: 'Кибер (Techno)', tex: 'VoidOverlordPic', color: '#c084fc' },
      { id: 'ShadowRealm' as const, name: 'ТЁМНАЯ ОБИТЕЛЬ', desc: 'Мрак (Gothic)', tex: 'ShadowRealmPic', color: '#facc15' },
      { id: 'BloodMoon' as const, name: 'КРОВАВАЯ ЛУНА', desc: 'Босс (Boss Battle)', tex: 'BloodMoonPic', color: '#ef4444' }
    ];

    this.musicSlotCards = [];
    const colWidth = 195;

    for (let i = 0; i < 5; i++) {
      const track = musicTracks[i];
      const row = Math.floor(i / 3);
      const col = i % 3;

      let cardX = 0;
      if (row === 0) {
        cardX = (col - 1) * colWidth; // -195, 0, 195
      } else {
        cardX = (col === 0 ? -100 : 100);
      }
      const cardY = (row === 0 ? -45 : 130);

      const bg = this.add.rectangle(cardX, cardY, 178, 160, 0x1e293b)
        .setStrokeStyle(3, 0x475569).setInteractive({ useHandCursor: true });

      const pic = this.add.image(cardX, cardY - 35, track.tex).setDisplaySize(62, 62);

      const name = this.add.text(cardX, cardY + 12, track.name, {
        fontSize: '11px', fontFamily: 'monospace', fontStyle: 'bold', color: track.color,
        wordWrap: { width: 170 }, align: 'center'
      }).setOrigin(0.5);

      const desc = this.add.text(cardX, cardY + 32, track.desc, {
        fontSize: '9px', fontFamily: 'monospace', color: '#cbd5e1',
        wordWrap: { width: 170 }, align: 'center'
      }).setOrigin(0.5);

      const btn = this.add.text(cardX, cardY + 58, '[ ВЫБРАТЬ ]', {
        fontSize: '10px', fontFamily: 'monospace', fontStyle: 'bold',
        color: '#ffffff', backgroundColor: '#1e3a8a', padding: { x: 10, y: 3 }
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      const slotObj = { bg, pic, name, desc, btn, trackId: track.id };
      this.musicSlotCards.push(slotObj);

      const onPick = () => {
        soundEngine.playClick();
        soundEngine.selectTrack(slotObj.trackId);
        this.updateHubMusicUI();
      };
      bg.on('pointerdown', onPick);
      btn.on('pointerdown', onPick);

      this.musicHubListContainer.add([bg, pic, name, desc, btn]);
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
      this.scrollHubMusicList(-70);
    });

    scrollDownBtn.on('pointerdown', () => {
      soundEngine.playClick();
      this.scrollHubMusicList(70);
    });

    // Audio Mute and Volume quick toggles
    const musicToggle = this.add.text(-120, 182, soundEngine.isMusicOn() ? 'МУЗЫКА: [ВКЛ]' : 'МУЗЫКА: [ВЫКЛ]', {
      fontSize: '12px', fontFamily: 'monospace', fontStyle: 'bold', color: '#38bdf8', backgroundColor: '#1e293b', padding: { x: 10, y: 5 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    musicToggle.on('pointerdown', () => {
      const on = soundEngine.toggleMusic();
      musicToggle.setText(on ? 'МУЗЫКА: [ВКЛ]' : 'МУЗЫКА: [ВЫКЛ]').setColor(on ? '#38bdf8' : '#f87171');
    });

    const sfxToggle = this.add.text(120, 182, soundEngine.isSfxOn() ? 'ЗВУКИ: [ВКЛ]' : 'ЗВУКИ: [ВЫКЛ]', {
      fontSize: '12px', fontFamily: 'monospace', fontStyle: 'bold', color: '#4ade80', backgroundColor: '#1e293b', padding: { x: 10, y: 5 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    sfxToggle.on('pointerdown', () => {
      const on = soundEngine.toggleSfx();
      sfxToggle.setText(on ? 'ЗВУКИ: [ВКЛ]' : 'ЗВУКИ: [ВЫКЛ]').setColor(on ? '#4ade80' : '#f87171');
    });

    // Close button
    const closeBtn = this.add.text(0, 182, '[ ЗАКРЫТЬ ]', {
      fontSize: '13px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffffff',
      backgroundColor: '#334155', padding: { x: 16, y: 5 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    closeBtn.on('pointerdown', () => {
      soundEngine.playClick();
      this.closeMusicModal();
    });

    const cornerX = this.add.text(320, -185, '[X]', {
      fontSize: '20px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ef4444'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    cornerX.on('pointerdown', () => {
      soundEngine.playClick();
      this.closeMusicModal();
    });

    this.musicModalContainer.add([scrollUpBtn, scrollDownBtn, musicToggle, sfxToggle, closeBtn, cornerX]);
  }

  private scrollHubMusicList(delta: number) {
    if (!this.musicHubListContainer) return;
    this.musicHubScrollY = Phaser.Math.Clamp(this.musicHubScrollY - delta, -90, 0);
    this.tweens.add({
      targets: this.musicHubListContainer,
      y: -20 + this.musicHubScrollY,
      duration: 120,
      ease: 'Power1'
    });
  }

  private updateHubMusicUI() {
    const selected = soundEngine.getSelectedTrack();
    this.musicSlotCards.forEach(slot => {
      const isCurrent = selected === slot.trackId;
      slot.bg.setStrokeStyle(3, isCurrent ? 0x4ade80 : 0x475569);
      slot.btn.setText(isCurrent ? '▶ ИГРАЕТ' : '[ ВЫБРАТЬ ]')
        .setColor(isCurrent ? '#4ade80' : '#ffffff')
        .setBackgroundColor(isCurrent ? '#064e3b' : '#1e3a8a');
    });
  }

  private openMusicModal() {
    this.updateHubMusicUI();
    this.musicOverlay.setVisible(true);
    this.musicModalContainer.setVisible(true);
  }

  private closeMusicModal() {
    this.musicOverlay.setVisible(false);
    this.musicModalContainer.setVisible(false);
  }

  // --- PAUSE MODAL & SETTINGS ---
  private isGamePaused = false;

  private openPauseModal() {
    if (this.isGamePaused) return;
    this.isGamePaused = true;
    this.physics.pause();
    soundEngine.playClick();

    showHTMLPauseModal({
      sceneTitle: 'ПАУЗА ИГРЫ',
      onResume: () => {
        this.isGamePaused = false;
        this.physics.resume();
      },
      onExit: () => {
        this.physics.resume();
        this.isGamePaused = false;
        this.scene.start('MainMenuScene');
      },
      exitText: '🚪 ГЛАВНОЕ МЕНЮ'
    });
  }

  private closePauseModal() {
    soundEngine.playClick();
    this.pauseModalElements.forEach(obj => obj.destroy());
    this.pauseModalElements = [];
    this.isGamePaused = false;
    this.physics.resume();
  }

  // --- TAVERN MODAL (DRUNKEN GARGOYLE & CHAT & DUNGEON GATHERING PAD) ---
  private isTavernOpen = false;
  private tavernModalContainer!: Phaser.GameObjects.Container;
  private tavernOverlay!: Phaser.GameObjects.Rectangle;
  private tavernChatLogText!: Phaser.GameObjects.Text;
  private tavernPadStatusText!: Phaser.GameObjects.Text;
  private tavernTimerText!: Phaser.GameObjects.Text;
  private isPlayerOnPad = false;
  private tavernPadTimerEvent: Phaser.Time.TimerEvent | null = null;
  private tavernCountdown = 20;
  private tavernChatMessages: string[] = [
    '🍺 Бармен Боб: Добро пожаловать в таверну!',
    '⚔ Рыцарь_99: Кто со мной на 3 этаж подземелья?',
    '🔥 Маг_Заза: Вставайте на зеленый квадрат сбора!',
    '🛡 Воин_Торф: Я зашел на квадрат, жду еще двоих!'
  ];

  private buildTavernModal(width: number, height: number) {
    const cx = width / 2;
    const cy = height / 2;

    this.tavernOverlay = this.add.rectangle(cx, cy, width * 2, height * 2, 0x000000, 0.85)
      .setScrollFactor(0).setDepth(1500).setInteractive().setVisible(false);

    this.tavernModalContainer = this.add.container(cx, cy).setScrollFactor(0).setDepth(1501).setVisible(false);

    const bg = this.add.rectangle(0, 0, 720, 480, 0x0f172a, 0.98).setStrokeStyle(4, 0xf59e0b);

    const title = this.add.text(0, -215, '🍺 ТАВЕРНА "ПЬЯНЫЙ ГАРГОЙЛЬ" (ИГРОКИ: 6/8)', {
      fontSize: '18px', fontFamily: 'monospace', fontStyle: 'bold', color: '#facc15'
    }).setOrigin(0.5);

    const subtitle = this.add.text(0, -190, 'Онлайн заведение • Общайтесь в чате и собирайте отряд на квадрате!', {
      fontSize: '11px', fontFamily: 'monospace', color: '#cbd5e1'
    }).setOrigin(0.5);

    // Left Panel: Co-op Dungeon Gathering Pad
    const padBoxBg = this.add.rectangle(-170, -10, 320, 320, 0x064e3b, 0.95).setStrokeStyle(3, 0x22c55e);
    const padIcon = this.add.text(-170, -120, '🌀', { fontSize: '32px' }).setOrigin(0.5);
    const padTitle = this.add.text(-170, -80, 'КВАДРАТ СБОРА В ПОДЗЕМЕЛЬЕ', {
      fontSize: '13px', fontFamily: 'monospace', fontStyle: 'bold', color: '#4ade80'
    }).setOrigin(0.5);

    this.tavernPadStatusText = this.add.text(-170, -40, 'Игроки на квадрате: 3 / 8\n• Рыцарь_99 (Рыцарь)\n• Маг_Заза (Заза)\n• Воин_Торф (Торф)', {
      fontSize: '11px', fontFamily: 'monospace', color: '#fef08a', align: 'center'
    }).setOrigin(0.5);

    this.tavernTimerText = this.add.text(-170, 30, '⏳ СТАРТ ПОДЗЕМЕЛЬЯ ЧЕРЕЗ: --', {
      fontSize: '12px', fontFamily: 'monospace', fontStyle: 'bold', color: '#38bdf8'
    }).setOrigin(0.5);

    const padToggleBtnBg = this.add.rectangle(-170, 95, 240, 44, 0x16a34a)
      .setStrokeStyle(2, 0x86efac).setInteractive({ useHandCursor: true });
    const padToggleBtnTxt = this.add.text(-170, 95, '👣 ВСТАТЬ НА КВАДРАТ', {
      fontSize: '13px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffffff'
    }).setOrigin(0.5);

    const togglePad = () => {
      soundEngine.playClick();
      this.isPlayerOnPad = !this.isPlayerOnPad;
      if (this.isPlayerOnPad) {
        padToggleBtnBg.setFillStyle(0x991b1b).setStrokeStyle(2, 0xf87171);
        padToggleBtnTxt.setText('✋ СОЙТИ С КВАДРАТА');
        this.tavernPadStatusText.setText('Игроки на квадрате: 4 / 8\n• Вы (Готов)\n• Рыцарь_99\n• Маг_Заза\n• Воин_Торф');
        this.startTavernPadCountdown();
      } else {
        padToggleBtnBg.setFillStyle(0x16a34a).setStrokeStyle(2, 0x86efac);
        padToggleBtnTxt.setText('👣 ВСТАТЬ НА КВАДРАТ');
        this.tavernPadStatusText.setText('Игроки на квадрате: 3 / 8\n• Рыцарь_99\n• Маг_Заза\n• Воин_Торф');
        this.stopTavernPadCountdown();
      }
    };
    padToggleBtnBg.on('pointerdown', togglePad);
    padToggleBtnTxt.on('pointerdown', togglePad);

    // Right Panel: Live Chat Box
    const chatBoxBg = this.add.rectangle(170, -10, 320, 320, 0x1e293b, 0.95).setStrokeStyle(2, 0x475569);
    const chatTitle = this.add.text(170, -145, '💬 ЧАТ ТАВЕРНЫ', {
      fontSize: '13px', fontFamily: 'monospace', fontStyle: 'bold', color: '#38bdf8'
    }).setOrigin(0.5);

    this.tavernChatLogText = this.add.text(25, -120, this.tavernChatMessages.join('\n'), {
      fontSize: '10px', fontFamily: 'monospace', color: '#e2e8f0', wordWrap: { width: 290 }
    });

    // Custom Text Input Button for Chat
    const chatInputBg = this.add.rectangle(170, 65, 290, 32, 0x0f172a).setStrokeStyle(1, 0x38bdf8).setInteractive({ useHandCursor: true });
    const chatInputTxt = this.add.text(170, 65, '💬 ВВЕСТИ СООБЩЕНИЕ...', {
      fontSize: '11px', fontFamily: 'monospace', color: '#93c5fd'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const openCustomChatInput = () => {
      soundEngine.playClick();
      const userMsg = window.prompt('Напишите ваше сообщение в чат таверны:');
      if (userMsg && userMsg.trim()) {
        const cleanMsg = userMsg.trim().slice(0, 60);
        this.tavernChatMessages.push(`Вы: ${cleanMsg}`);
        if (this.tavernChatMessages.length > 7) this.tavernChatMessages.shift();
        this.tavernChatLogText.setText(this.tavernChatMessages.join('\n'));

        // Show floating speech bubble over player
        if (this.player) {
          const bubble = this.add.text(this.player.x, this.player.y - 65, cleanMsg, {
            fontSize: '11px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffffff',
            backgroundColor: '#1e293b', padding: { x: 8, y: 4 }
          }).setOrigin(0.5).setDepth(200);
          this.tweens.add({ targets: bubble, y: this.player.y - 95, alpha: 0, delay: 1800, duration: 600, onComplete: () => bubble.destroy() });
        }

        // Simulated live response after 1.2s
        this.time.delayedCall(1200, () => {
          if (!this.isTavernOpen) return;
          const randomReplies = [
            'Рыцарь_99: Отлично сказано!',
            'Маг_Заза: Го к зачистке подземелья!',
            'Воин_Торф: Нас уже четверо на квадрате!',
            'Бармен Боб: За ваш счет, авантюрист!'
          ];
          const botReply = Phaser.Utils.Array.GetRandom(randomReplies);
          this.tavernChatMessages.push(botReply);
          if (this.tavernChatMessages.length > 7) this.tavernChatMessages.shift();
          if (this.tavernChatLogText) this.tavernChatLogText.setText(this.tavernChatMessages.join('\n'));
        });
      }
    };

    chatInputBg.on('pointerdown', openCustomChatInput);
    chatInputTxt.on('pointerdown', openCustomChatInput);

    // Quick Chat Phrase Buttons
    const quickPhrases = ['👋 Привет!', '⚔ В бой!', '🔥 Я готов!'];
    quickPhrases.forEach((phrase, idx) => {
      const qX = 70 + idx * 100;
      const qY = 110;
      const qBg = this.add.rectangle(qX, qY, 92, 28, 0x334155).setStrokeStyle(1, 0x94a3b8).setInteractive({ useHandCursor: true });
      const qTxt = this.add.text(qX, qY, phrase, { fontSize: '9px', fontFamily: 'monospace', color: '#ffffff' }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      const sendPhrase = () => {
        soundEngine.playClick();
        this.tavernChatMessages.push(`Вы: ${phrase}`);
        if (this.tavernChatMessages.length > 7) this.tavernChatMessages.shift();
        this.tavernChatLogText.setText(this.tavernChatMessages.join('\n'));
      };
      qBg.on('pointerdown', sendPhrase);
      qTxt.on('pointerdown', sendPhrase);
      this.tavernModalContainer.add([qBg, qTxt]);
    });

    // Close Button
    const closeBtnBg = this.add.rectangle(0, 195, 240, 42, 0x334155).setStrokeStyle(2, 0x94a3b8).setInteractive({ useHandCursor: true });
    const closeBtnTxt = this.add.text(0, 195, '🚪 ВЫЙТИ ИЗ ТАВЕРНЫ', {
      fontSize: '14px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffffff'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const doClose = () => {
      soundEngine.playClick();
      this.closeTavernModal();
    };
    closeBtnBg.on('pointerdown', doClose);
    closeBtnTxt.on('pointerdown', doClose);

    this.tavernModalContainer.add([
      bg, title, subtitle,
      padBoxBg, padIcon, padTitle, this.tavernPadStatusText, this.tavernTimerText, padToggleBtnBg, padToggleBtnTxt,
      chatBoxBg, chatTitle, this.tavernChatLogText, chatInputBg, chatInputTxt,
      closeBtnBg, closeBtnTxt
    ]);
  }

  private startTavernPadCountdown() {
    this.stopTavernPadCountdown();
    this.tavernCountdown = 20;
    this.tavernTimerText.setText(`⏳ СТАРТ ПОДЗЕМЕЛЬЯ ЧЕРЕЗ: ${this.tavernCountdown} с...`).setColor('#facc15');

    this.tavernPadTimerEvent = this.time.addEvent({
      delay: 1000,
      repeat: 19,
      callback: () => {
        this.tavernCountdown--;
        this.tavernTimerText.setText(`⏳ СТАРТ ПОДЗЕМЕЛЬЯ ЧЕРЕЗ: ${this.tavernCountdown} с...`);
        if (this.tavernCountdown <= 0) {
          soundEngine.playLevelUp();
          this.closeTavernModal();
          this.cameras.main.fadeOut(350, 0, 0, 0);
          this.time.delayedCall(380, () => {
            this.scene.start('DungeonScene', {
              selectedHeroKey: this.selectedHeroKey,
              mode: 'online',
              floor: 1
            });
          });
        }
      }
    });
  }

  private stopTavernPadCountdown() {
    if (this.tavernPadTimerEvent) {
      this.tavernPadTimerEvent.remove();
      this.tavernPadTimerEvent = null;
    }
    this.tavernTimerText.setText('⏳ СТАРТ ПОДЗЕМЕЛЬЯ ЧЕРЕЗ: --').setColor('#38bdf8');
  }

  private openTavernModal() {
    this.isTavernOpen = true;
    this.tavernOverlay.setVisible(true);
    this.tavernModalContainer.setVisible(true);
  }

  private closeTavernModal() {
    this.stopTavernPadCountdown();
    this.isTavernOpen = false;
    this.isPlayerOnPad = false;
    this.tavernOverlay.setVisible(false);
    this.tavernModalContainer.setVisible(false);
  }

  // --- NEWS MODAL (PATCH NOTES & GAME ANNOUNCEMENTS) ---
  private isNewsOpen = false;
  private newsModalContainer!: Phaser.GameObjects.Container;
  private newsOverlay!: Phaser.GameObjects.Rectangle;

  private buildNewsModal(width: number, height: number) {
    const cx = width / 2;
    const cy = height / 2;

    this.newsOverlay = this.add.rectangle(cx, cy, width * 2, height * 2, 0x000000, 0.85)
      .setScrollFactor(0).setDepth(2000).setInteractive().setVisible(false);

    this.newsModalContainer = this.add.container(cx, cy).setScrollFactor(0).setDepth(2001).setVisible(false);

    const bg = this.add.rectangle(0, 0, 680, 440, 0x0f172a, 0.98).setStrokeStyle(4, 0x38bdf8);

    const title = this.add.text(0, -195, '📋 ДОСКА ОБЪЯВЛЕНИЙ И НОВОСТИ ИГРЫ 📋', {
      fontSize: '18px', fontFamily: 'monospace', fontStyle: 'bold', color: '#38bdf8'
    }).setOrigin(0.5);

    const topCloseBtn = this.add.text(310, -195, '✖', {
      fontSize: '22px', fontFamily: 'monospace', fontStyle: 'bold', color: '#f87171'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const newsText = this.add.text(-300, -160,
`🔥 ОБНОВЛЕНИЕ 2.5: ОНЛАЙН-ТАВЕРНА И ОТРЯДЫ!
• Добавлена локация «Пьяный Гаргойль» с живым чатом и зеленым квадратом сбора!
• Становитесь на квадрат сбором отряда до 8 игроков с таймером отсчета!

🛡 БЕЗОПАСНЫЙ СПАВН В ПОДЗЕМЕЛЬЕ:
• В начале каждого этажа создается гарантированная безопасная зона.
• Спавн игрока происходит точно в центре безопасной комнаты!

⚡ БАЛАНС И ГЕРОИ:
• Торф: способность Ульты полностью скрывает валун под землей и наносит 450 урон!
• Взрывной Валун Торфа теперь детонирует с осколками при ударе об любые стены!

⏸ ЕДИНОЕ МЕНЮ ПАУЗЫ:
• Кнопка паузы || размещена в левом верхнем углу для всех сцен!`, {
      fontSize: '11px', fontFamily: 'monospace', color: '#cbd5e1', wordWrap: { width: 600 }
    });

    const closeBtnBg = this.add.rectangle(0, 180, 220, 42, 0x334155).setStrokeStyle(2, 0x38bdf8).setInteractive({ useHandCursor: true });
    const closeBtnTxt = this.add.text(0, 180, '[ ✖ ЗАКРЫТЬ ]', {
      fontSize: '14px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffffff'
    }).setOrigin(0.5);

    const doClose = () => {
      soundEngine.playClick();
      this.closeNewsModal();
    };

    this.newsOverlay.on('pointerdown', doClose);
    closeBtnBg.on('pointerdown', doClose);
    closeBtnBg.on('pointerup', doClose);
    closeBtnTxt.on('pointerdown', doClose);
    closeBtnTxt.on('pointerup', doClose);
    topCloseBtn.on('pointerdown', doClose);
    topCloseBtn.on('pointerup', doClose);

    this.newsModalContainer.add([bg, title, topCloseBtn, newsText, closeBtnBg, closeBtnTxt]);
  }

  private openNewsModal() {
    soundEngine.playClick();
    new NoticeBoardModal(this, 'contracts');
  }

  private closeNewsModal() {
    this.isNewsOpen = false;
    if (this.newsOverlay) this.newsOverlay.setVisible(false);
    if (this.newsModalContainer) this.newsModalContainer.setVisible(false);
  }
}
