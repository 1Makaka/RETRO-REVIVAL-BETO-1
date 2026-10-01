/**
 * Frantic Battles - Soul Knight Style Procedural Multi-Floor Dungeon Scene
 * Features:
 * - 7 Dungeon Floors (1/7 to 7/7) with increasing difficulty
 * - Procedural 2D connected rooms layout with corridors (not a straight line!)
 * - Soul Knight style Minimap with unvisited fog of war, visited rooms, and icons (Shop, Companion, Portal, Combat, Boss)
 * - Companion / Pet system (Knight mercenary, Combat Dog, Guardian Bear) hired for gold
 * - Shop Room with Trader selling Potions, Relics, and Hero Class Weapons
 * - Class-specific weapons matching heroes with dynamic weapon rendering on player sprite
 * - Upgrade Cards selection at 2/7 (after floor 1), 4/7 (after floor 3), and 7/7 (after floor 6)
 * - Fixed enemy HP bars attached directly to mob sprites with advanced AI
 * - Floor 7 Boss Arena: "Cursed Knight" with Telegraph Dash, 12-Projectile Death Ring, and Triple Greatsword Slash!
 */

import Phaser from 'phaser';
import { HEROES, HeroData } from '../players';
import { soundEngine } from '../audio';
import { generateAllTextures } from '../pixelArt';
import { showHTMLPauseModal, showHTMLBlackMarketModal } from '../../utils/domInput';
import { DungeonDOMHUD } from '../DungeonHUD';
import { getCustomControlsLayout, getShowAttackRange, DEFAULT_CONTROLS_LAYOUT } from '../../utils/customControls';
import { loadEconomy, saveEconomy, addCurrencies, exchangeShardsToSkulls } from '../economy';
import { saveUserDataToCloud, stats, CloudSyncManager, addMatchToHistory } from '../firebase';
import { MatchHistoryManager } from '../MatchHistoryManager';
import { MechaDragonBoss } from '../entities/MechaDragonBoss';
import { FloorRewardModal, FLOOR_PERKS_DATABASE } from '../FloorRewardModal';

export interface DungeonWeapon {
  id: string;
  name: string;
  icon: string;
  texture: string;
  heroClass: 'char_zaza' | 'char_grim' | 'char_bjorn' | 'char_torf' | 'char_omen' | 'char_alrik' | 'char_kraul' | 'char_nihil' | 'all';
  damage: number;
  attackSpeed: number; // ms cooldown
  rangeType: 'melee_fast' | 'melee_heavy_aoe' | 'ranged_single' | 'ranged_double' | 'ranged_explosive';
  energyCost: number;
  desc: string;
}

export const CLASS_WEAPONS: Record<string, DungeonWeapon> = {
  // Kraul Weapon
  weapon_kraul_whips: {
    id: 'weapon_kraul_whips',
    name: 'Хлесткие руки',
    icon: 'skill_kraul_2',
    texture: 'weapon_kraul_whips',
    heroClass: 'char_kraul',
    damage: 110,
    attackSpeed: 340,
    rangeType: 'melee_fast',
    energyCost: 0,
    desc: 'Базовое оружие Краула: резкие удары длинными руками-плетями.'
  },
  // Alrik Weapon
  weapon_spear: {
    id: 'weapon_spear',
    name: 'Копье Стража',
    icon: 'skill_alrik_1',
    texture: 'weapon_spear',
    heroClass: 'char_alrik',
    damage: 95,
    attackSpeed: 380,
    rangeType: 'melee_fast',
    energyCost: 0,
    desc: 'Базовое оружие Аларика: длинный резкий выпад копьем с повышенной дальностью атаки.'
  },
  // Omen Weapon
  weapon_feather_darts: {
    id: 'weapon_feather_darts',
    name: 'Теневые лезвия',
    icon: 'skill_omen_1',
    texture: 'weapon_feather_darts',
    heroClass: 'char_omen',
    damage: 85,
    attackSpeed: 300,
    rangeType: 'ranged_single',
    energyCost: 0,
    desc: 'Базовое оружие Омена: разрезающие теневые лезвия дальнего боя.'
  },
  // Nihil Innate Mouth Attack
  weapon_nihil_sickle: {
    id: 'weapon_nihil_sickle',
    name: 'Зов Бездны',
    icon: 'skill_nihil_1',
    texture: 'proj_nihil_bullet',
    heroClass: 'char_nihil',
    damage: 90,
    attackSpeed: 380,
    rangeType: 'ranged_single',
    energyCost: 0,
    desc: 'Врождённая атака Нихила: извержение теневых пуль прямо изо рта.'
  },
  // Zaza Weapons
  weapon_stick: {
    id: 'weapon_stick',
    name: 'Посох мутанта',
    icon: 'weapon_stick',
    texture: 'weapon_stick',
    heroClass: 'char_zaza',
    damage: 68,
    attackSpeed: 280,
    rangeType: 'melee_fast',
    energyCost: 0,
    desc: 'Базовое оружие Зазы: быстрые токсичные удары посохом.'
  },
  weapon_scythe: {
    id: 'weapon_scythe',
    name: 'Чумная коса',
    icon: 'weapon_scythe',
    texture: 'weapon_scythe',
    heroClass: 'char_zaza',
    damage: 48,
    attackSpeed: 500,
    rangeType: 'melee_heavy_aoe',
    energyCost: 5,
    desc: 'Размашистый удар косой, отравляющий врагов ядом.'
  },
  weapon_claws: {
    id: 'weapon_claws',
    name: 'Когти мутанта',
    icon: 'weapon_claws',
    texture: 'weapon_claws',
    heroClass: 'char_zaza',
    damage: 32,
    attackSpeed: 220,
    rangeType: 'melee_fast',
    energyCost: 0,
    desc: 'Сверхбыстрые яростные царапающие удары когтями.'
  },

  // Grim Weapons
  weapon_flask_launcher: {
    id: 'weapon_flask_launcher',
    name: 'Алхимический флакон',
    icon: 'weapon_flask_launcher',
    texture: 'weapon_flask_launcher',
    heroClass: 'char_grim',
    damage: 38,
    attackSpeed: 400,
    rangeType: 'ranged_explosive',
    energyCost: 6,
    desc: 'Базовое оружие Грима: бросок взрывных токсичных флаконов!'
  },
  weapon_crossbow: {
    id: 'weapon_crossbow',
    name: 'Охотничий арбалет',
    icon: 'weapon_crossbow',
    texture: 'weapon_crossbow',
    heroClass: 'char_grim',
    damage: 30,
    attackSpeed: 300,
    rangeType: 'ranged_single',
    energyCost: 8,
    desc: 'Точная стрельба дальнобойными стрелами.'
  },
  weapon_pistols: {
    id: 'weapon_pistols',
    name: 'Двойные пистоли',
    icon: 'weapon_pistols',
    texture: 'weapon_pistols',
    heroClass: 'char_grim',
    damage: 22,
    attackSpeed: 340,
    rangeType: 'ranged_double',
    energyCost: 12,
    desc: 'Быстрый сдвоенный выстрел 2 пулями подряд!'
  },

  // Bjorn Weapons
  weapon_battleaxe: {
    id: 'weapon_battleaxe',
    name: 'Боевой топор',
    icon: 'weapon_battleaxe',
    texture: 'weapon_battleaxe',
    heroClass: 'char_bjorn',
    damage: 54,
    attackSpeed: 440,
    rangeType: 'melee_heavy_aoe',
    energyCost: 0,
    desc: 'Базовое оружие Бьорна: широкий сокрушительный размах секирой.'
  },
  weapon_mace: {
    id: 'weapon_mace',
    name: 'Тяжелая булава',
    icon: 'weapon_mace',
    texture: 'weapon_mace',
    heroClass: 'char_bjorn',
    damage: 62,
    attackSpeed: 560,
    rangeType: 'melee_heavy_aoe',
    energyCost: 0,
    desc: 'Сокрушительный размах на 180 градусов (АОЕ урон).'
  },
  weapon_thunder_hammer: {
    id: 'weapon_thunder_hammer',
    name: 'Молот Тора',
    icon: 'weapon_thunder_hammer',
    texture: 'weapon_thunder_hammer',
    heroClass: 'char_bjorn',
    damage: 80,
    attackSpeed: 700,
    rangeType: 'melee_heavy_aoe',
    energyCost: 10,
    desc: 'Удар молнии о землю с электрической ударной волной!'
  },

  // 2 New Weapons for Zaza
  weapon_toxic_staff: {
    id: 'weapon_toxic_staff',
    name: 'Чумной посох',
    icon: 'weapon_toxic_staff',
    texture: 'weapon_toxic_staff',
    heroClass: 'char_zaza',
    damage: 42,
    attackSpeed: 360,
    rangeType: 'ranged_single',
    energyCost: 7,
    desc: 'Спец-навык: выпускает дальнобойные самонаводящиеся споры скверны.'
  },
  weapon_mutant_blade: {
    id: 'weapon_mutant_blade',
    name: 'Клинок скверны',
    icon: 'weapon_mutant_blade',
    texture: 'weapon_mutant_blade',
    heroClass: 'char_zaza',
    damage: 52,
    attackSpeed: 290,
    rangeType: 'melee_fast',
    energyCost: 4,
    desc: 'Спец-навык: ядовитые комбо-удары, оставляющие едкие ожоги.'
  },

  // 2 New Weapons for Grim
  weapon_repeater_crossbow: {
    id: 'weapon_repeater_crossbow',
    name: 'Многозарядный арбалет',
    icon: 'weapon_repeater_crossbow',
    texture: 'weapon_repeater_crossbow',
    heroClass: 'char_grim',
    damage: 28,
    attackSpeed: 260,
    rangeType: 'ranged_double',
    energyCost: 10,
    desc: 'Спец-навык: скоростной веер из 3 стрел подряд.'
  },
  weapon_grenade_launcher: {
    id: 'weapon_grenade_launcher',
    name: 'Гранатомет теней',
    icon: 'weapon_grenade_launcher',
    texture: 'weapon_grenade_launcher',
    heroClass: 'char_grim',
    damage: 60,
    attackSpeed: 520,
    rangeType: 'ranged_explosive',
    energyCost: 16,
    desc: 'Спец-навык: запускает разрывные гранаты с огромным радиусом взрыва.'
  },

  // 2 New Weapons for Bjorn
  weapon_frost_hammer: {
    id: 'weapon_frost_hammer',
    name: 'Ледяной сокрушитель',
    icon: 'weapon_frost_hammer',
    texture: 'weapon_frost_hammer',
    heroClass: 'char_bjorn',
    damage: 75,
    attackSpeed: 620,
    rangeType: 'melee_heavy_aoe',
    energyCost: 8,
    desc: 'Спец-навык: удар льда, замедляющий и замораживающий противников.'
  },
  weapon_dual_daggers: {
    id: 'weapon_dual_daggers',
    name: 'Парные секиры',
    icon: 'weapon_dual_daggers',
    texture: 'weapon_dual_daggers',
    heroClass: 'char_bjorn',
    damage: 46,
    attackSpeed: 240,
    rangeType: 'melee_fast',
    energyCost: 0,
    desc: 'Спец-навык: сверхбыстрая серия рубящих ударов с двух рук.'
  },

  // Torf Weapons
  weapon_stone_fists: {
    id: 'weapon_stone_fists',
    name: 'Тяжелые кулаки',
    icon: 'skill_torf_1',
    texture: 'weapon_boulder',
    heroClass: 'char_torf',
    damage: 68,
    attackSpeed: 480,
    rangeType: 'melee_heavy_aoe',
    energyCost: 0,
    desc: 'Базовая атака Торфа: сокрушительные удары каменными руками по широкой дуге.'
  }
};

export interface UpgradeCard {
  id: string;
  title: string;
  type: 'common' | 'hero';
  heroTarget?: string;
  icon: string;
  desc: string;
  effect: (scene: DungeonScene) => void;
}

export interface DestructibleProp extends Phaser.Physics.Arcade.Sprite {
  propType: 'crate' | 'barrel' | 'tnt' | 'pillar' | 'urn';
  hp: number;
  maxHp: number;
}

export interface DungeonInteractable {
  id: string;
  x: number;
  y: number;
  radius: number;
  prompt: string;
  onInteract: () => void;
  active: boolean;
}

interface DungeonMob extends Phaser.Physics.Arcade.Sprite {
  hp: number;
  maxHp: number;
  mobType: 'skeleton' | 'mage' | 'slime' | 'cursed_knight' | 'goblin_bomber' | 'spider' | 'necromancer' | 'gargoyle' | 'golem' | 'jaw_beast' | 'executioner' | 'bone_golem' | 'bat' | 'zombie' | 'bubble_spitter' | 'butcher' | 'cultist' | 'toxic_hydra' | 'shadow_stalker' | 'shield_knight' | 'miniboss_bone_golem' | 'miniboss_executioner' | 'miniboss_butcher';
  speed: number;
  damage: number;
  attackCd: number;
  roomId: number;
  hpBar: Phaser.GameObjects.Rectangle;
  hpBarBg: Phaser.GameObjects.Rectangle;
  isSlowed?: boolean;
  slowTimer?: number;
  isStunned?: boolean;
  isEnraged?: boolean;
  isBurning?: boolean;
  burnTimer?: number;
  burnTickTimer?: number;
  burnDps?: number;
  burnVisual?: Phaser.GameObjects.Text | null;
  butcherHookCd?: number;
  butcherSlamCd?: number;
  butcherIsTelegraphing?: boolean;
  cultistTeleportCd?: number;
  stalkerInvis?: boolean;
  bossState?: 'idle' | 'charging_dash' | 'dashing' | 'bullet_hell' | 'triple_strike' | 'aoe_bombardment';
  bossDashTarget?: { x: number; y: number };
  bossAttackTimer?: number;
  leapCooldown?: number;
  gargoyleSwoopTimer?: number;
  golemStompTimer?: number;
}

interface CompanionFollower {
  sprite: Phaser.Physics.Arcade.Sprite;
  name: string;
  type: 'knight' | 'dog' | 'bear';
  hp: number;
  maxHp: number;
  damage: number;
  speed: number;
  attackCd: number;
  hpBarBg: Phaser.GameObjects.Rectangle;
  hpBar: Phaser.GameObjects.Rectangle;
  nameText: Phaser.GameObjects.Text;
}

interface GridRoom {
  id: number;
  gridX: number;
  gridY: number;
  worldX: number;
  worldY: number;
  w: number;
  h: number;
  type: 'start' | 'combat' | 'companion' | 'shop' | 'portal' | 'boss' | 'market' | 'treasure' | 'miniboss';
  name: string;
  cleared: boolean;
  visited: boolean;
  active: boolean;
  mobCount: number;
  connections: { north?: number; south?: number; east?: number; west?: number };
  doors: Phaser.Physics.Arcade.Image[];
}

export class DungeonScene extends Phaser.Scene {
  private heroData!: HeroData;
  private selectedHeroKey: string = 'char_zaza';
  private mode: 'solo' | 'online' = 'solo';
  private roomCode: string = '#DUNGEON-7419';
  public dungeonType: 'standard' | 'butcher' = 'standard';

  // Floor Progression (1/7 to 7/7)
  private currentFloor: number = 1;
  private maxFloors: number = 7;
  private miniBossFloor: number = 3;
  private dungeonStartTime: number = Date.now();

  // Player Stats & Dual Weapons (2 Slots)
  private player!: Phaser.Physics.Arcade.Sprite;
  private playerWeaponVisual!: Phaser.GameObjects.Image;
  private playerHp: number = 1000;
  private playerMaxHp: number = 1000;
  private playerEnergy: number = 100;
  private playerMaxEnergy: number = 100;
  private energyRegenRate: number = 12;
  private playerSpeed: number = 290;
  private basePlayerSpeed: number = 290;
  private slowTimerEvent: Phaser.Time.TimerEvent | null = null;
  private damageMultiplier: number = 1.0;
  private isPlayerDown: boolean = false;
  private isMonster: boolean = false;
  private weapons: [DungeonWeapon, DungeonWeapon | null] = [CLASS_WEAPONS.weapon_stick, null];
  private activeWeaponIndex: number = 0;
  private currentWeapon: DungeonWeapon = CLASS_WEAPONS.weapon_stick;
  private dungeonGold: number = 0;
  private aimVector = new Phaser.Math.Vector2(1, 0);

  // Weapon Slot UI Badges & Energy Indicators
  private weaponSlot1Btn!: Phaser.GameObjects.Container;
  private weaponSlot2Btn!: Phaser.GameObjects.Container;
  private weaponSlot1Icon!: Phaser.GameObjects.Image;
  private weaponSlot2Icon!: Phaser.GameObjects.Image;
  private weaponSlot1Border!: Phaser.GameObjects.Rectangle;
  private weaponSlot2Border!: Phaser.GameObjects.Rectangle;
  private weaponSlot1EnergyText!: Phaser.GameObjects.Text;
  private weaponSlot2EnergyText!: Phaser.GameObjects.Text;
  private attackEnergyCostText!: Phaser.GameObjects.Text;

  // Aim Joystick (Dual-Stick Controls for Ranged Weapons)
  private aimStickBase!: Phaser.GameObjects.Arc;
  private aimStickThumb!: Phaser.GameObjects.Arc;
  private aimStickPointerId: number | null = null;
  private isAiming: boolean = false;

  // Hired Companion Follower & Flying Pet
  private companion: CompanionFollower | null = null;
  private flyingPet: { sprite: Phaser.GameObjects.Sprite; shootTimer: number; angle: number } | null = null;
  private carryPetPersisted: boolean = false;
  private carryCompanionPersisted: { hp: number; maxHp: number; name: string } | null = null;
  private spikeTraps: Array<{ sprite: Phaser.GameObjects.Sprite; x: number; y: number; roomId: number; state: 'retracted' | 'warning' | 'extended'; timer: number }> = [];
  private shieldScrollActive: boolean = false;
  private shieldScrollVisual: Phaser.GameObjects.Arc | null = null;

  // 2D Grid Dungeon Rooms
  private rooms: GridRoom[] = [];
  private currentRoomId: number = 0;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private coverObstacles!: Phaser.Physics.Arcade.StaticGroup;
  private destructibleList: DestructibleProp[] = [];
  private doorsGroup!: Phaser.Physics.Arcade.StaticGroup;
  private doorBarrierGfx!: Phaser.GameObjects.Graphics;
  private mobs: DungeonMob[] = [];
  private mobsGroup!: Phaser.Physics.Arcade.Group;
  private pickups!: Phaser.Physics.Arcade.Group;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private propsContainer!: Phaser.GameObjects.Group;
  private playerLightGfx!: Phaser.GameObjects.Graphics;
  private isMobile: boolean = false;

  // Boss Elements
  private bossMob: DungeonMob | null = null;
  private bossHpContainer!: Phaser.GameObjects.Container;
  private bossHpFill!: Phaser.GameObjects.Rectangle;
  private bossHpText!: Phaser.GameObjects.Text;
  private bossTelegraphLine!: Phaser.GameObjects.Graphics;

  // Interactive Prompts
  private interactBtnBg!: Phaser.GameObjects.Rectangle;
  private interactBtnText!: Phaser.GameObjects.Text;
  private currentPromptText: string = '';
  private roomsMap = new Map<number, GridRoom>();
  private interactionTimer: number = 0;
  private interactableTargets: DungeonInteractable[] = [];

  // HUD & Minimap
  private domHud: DungeonDOMHUD | null = null;
  private hpFill!: Phaser.GameObjects.Rectangle;
  private hpText!: Phaser.GameObjects.Text;
  private energyFill!: Phaser.GameObjects.Rectangle;
  private energyText!: Phaser.GameObjects.Text;
  private goldText!: Phaser.GameObjects.Text;
  private floorBadgeText!: Phaser.GameObjects.Text;
  private minimapGfx!: Phaser.GameObjects.Graphics;
  private minimapContainer!: Phaser.GameObjects.Container;
  private minimapIcons: Phaser.GameObjects.Text[] = [];
  private spikeCooldown: number = 0;

  // Combat Touch Controls & Buttons
  private attackBtnIcon!: Phaser.GameObjects.Image;
  private attackBtnLabel!: Phaser.GameObjects.Text;
  private skill1Circle!: Phaser.GameObjects.Arc;
  private skill1BtnIcon!: Phaser.GameObjects.Image;
  private skill1Label!: Phaser.GameObjects.Text;
  private skill2Circle!: Phaser.GameObjects.Arc;
  private skill2BtnIcon!: Phaser.GameObjects.Image;
  private skill2Label!: Phaser.GameObjects.Text;
  private ultCircle!: Phaser.GameObjects.Arc;
  private ultBtnIcon!: Phaser.GameObjects.Image;
  private ultLabel!: Phaser.GameObjects.Text;
  private controlsChangedListener?: () => void;
  private cdOverlays: Record<string, Phaser.GameObjects.Arc | Phaser.GameObjects.Rectangle> = {};
  private cdTextLabels: Record<string, Phaser.GameObjects.Text> = {};
  private cds: Record<string, number> = { attack: 0, s1: 0, s2: 0, ult: 0 };
  private cdMax: Record<string, number> = { attack: 300, s1: 3000, s2: 4500, ult: 14000 };
  private attackFacingTimer: number = 0;
  private isUltChanneling: boolean = false;
  private isDescending: boolean = false;
  private alrikShieldActive: boolean = false;
  private alrikShieldAngle: number = 0;
  private alrikShieldGfx: Phaser.GameObjects.Rectangle | null = null;
  private alrikUltStabCd: number = 0;
  private currentInteraction: (() => void) | null = null;

  // Upgrade Cards Modal
  private upgradeModalContainer!: Phaser.GameObjects.Container;
  private isUpgradeModalOpen: boolean = false;
  private isBlackMarketOpen: boolean = false;
  private appliedUpgradeCards: string[] = [];

  // Buff Perks & Skill Replacements
  private zazaDoubleSpit: boolean = false;
  private zazaPoisonTrail: boolean = false;
  private zazaAcidGeyser: boolean = false;
  private zazaSpikedShell: boolean = false;
  private grimDoubleBullet: boolean = false;
  private grimClusterBomb: boolean = false;
  private grimLaserBolt: boolean = false;
  private grimSmokeScreen: boolean = false;
  private bjornFireWhirl: boolean = false;
  private bjornWarcry: boolean = false;
  private bjornAxeBoomerang: boolean = false;

  // Movement & Aim Joysticks
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private joyStickBase!: Phaser.GameObjects.Arc;
  private joyStickThumb!: Phaser.GameObjects.Arc;
  private joyStickPointerId: number | null = null;
  private joyStickVector = new Phaser.Math.Vector2(0, 0);

  private aimJoyBase!: Phaser.GameObjects.Arc;
  private aimJoyThumb!: Phaser.GameObjects.Arc;
  private aimJoyPointerId: number | null = null;
  private aimJoyVector = new Phaser.Math.Vector2(0, 0);
  private aimJoyMoved: boolean = false;
  private aimTouchStartX: number = 0;
  private aimTouchStartY: number = 0;
  private aimTouchStartTime: number = 0;
  private aimLineGfx!: Phaser.GameObjects.Graphics;
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
  private torfStoneSkin: boolean = false;
  private torfShieldAura: Phaser.GameObjects.Arc | null = null;
  private torfShieldBorder: Phaser.GameObjects.Arc | null = null;
  private torfShieldTween: Phaser.Tweens.Tween | null = null;
  private torfCancelBadgeS2: Phaser.GameObjects.Container | null = null;
  private bjornActiveAxe: Phaser.GameObjects.Rectangle | null = null;
  private torfInvulnerable: boolean = false;
  private kraulUltActive: boolean = false;
  public mechaDragonBoss?: MechaDragonBoss;
  public bossCoverPillars: Phaser.GameObjects.Rectangle[] = [];

  // Card perk flags & VFX systems
  public torfSeismicFault: boolean = false;
  public torfMagmaIgnite: boolean = false;
  public hasIgnitePerk: boolean = false;
  public nihilGroundFracture: boolean = false;
  public nihilAstralBurn: boolean = false;
  public hasVampirism: boolean = false;
  public activeFissures: Array<{
    container: Phaser.GameObjects.Container;
    x: number;
    y: number;
    radius: number;
    type: 'seismic' | 'void';
    timer: number;
    tickTimer: number;
    dps: number;
  }> = [];

  constructor() {
    super('DungeonScene');
  }

  init(data: {
    selectedHeroKey?: string;
    mode?: 'solo' | 'online';
    roomCode?: string;
    floor?: number;
    carryGold?: number;
    carryHp?: number;
    carryMaxHp?: number;
    carryPet?: boolean;
    carryCompanion?: { hp: number; maxHp: number; name: string } | null;
    companionType?: 'knight' | 'dog' | 'bear';
    appliedUpgrades?: string[];
    weaponSlot1Id?: string;
    weaponSlot2Id?: string;
    currentWeaponId?: string;
    miniBossFloor?: number;
  }) {
    this.selectedHeroKey = data.selectedHeroKey || 'char_zaza';
    this.mode = data.mode || 'solo';
    this.roomCode = data.roomCode || '#DUNGEON-7419';
    this.currentFloor = data.floor || 1;
    // Mini-boss appears randomly on strictly either floor 3 or floor 4!
    this.miniBossFloor = data.miniBossFloor || (Math.random() < 0.5 ? 3 : 4);
    this.heroData = HEROES[this.selectedHeroKey] || HEROES.char_zaza;

    // Set Default Starting Weapon for Hero Class
    let defaultBaseWeapon = CLASS_WEAPONS.weapon_stick;
    if (this.selectedHeroKey === 'char_grim') defaultBaseWeapon = CLASS_WEAPONS.weapon_flask_launcher;
    else if (this.selectedHeroKey === 'char_bjorn') defaultBaseWeapon = CLASS_WEAPONS.weapon_battleaxe;
    else if (this.selectedHeroKey === 'char_torf') defaultBaseWeapon = CLASS_WEAPONS.weapon_stone_fists;
    else if (this.selectedHeroKey === 'char_omen') defaultBaseWeapon = CLASS_WEAPONS.weapon_feather_darts;
    else if (this.selectedHeroKey === 'char_nihil') defaultBaseWeapon = CLASS_WEAPONS.weapon_nihil_sickle;
    else if (this.selectedHeroKey === 'char_alrik') defaultBaseWeapon = CLASS_WEAPONS.weapon_spear;
    else if (this.selectedHeroKey === 'char_kraul') defaultBaseWeapon = CLASS_WEAPONS.weapon_kraul_whips;

    const slot1 = (data.weaponSlot1Id && CLASS_WEAPONS[data.weaponSlot1Id])
      || (data.currentWeaponId && CLASS_WEAPONS[data.currentWeaponId])
      || defaultBaseWeapon;
    const slot2 = (data.weaponSlot2Id && CLASS_WEAPONS[data.weaponSlot2Id]) || null;

    this.weapons = [slot1, slot2];
    this.activeWeaponIndex = 0;
    this.currentWeapon = this.weapons[0]!;
    this.aimVector.set(1, 0);

    // Retain reduced max HP from Black Market across all floors!
    const targetMaxHp = data.carryMaxHp !== undefined ? data.carryMaxHp : this.heroData.hp;
    const targetHp = data.carryHp !== undefined ? Math.min(targetMaxHp, data.carryHp) : targetMaxHp;
    this.playerMaxHp = targetMaxHp;
    this.playerHp = targetHp;
    this.playerEnergy = 100;
    this.playerMaxEnergy = 100;
    // Base speed reference to prevent permanent slow stacking bugs
    this.playerSpeed = data.carryHp ? (data.appliedUpgrades?.includes('up_speed') ? Math.round(this.heroData.speed * 1.2) : this.heroData.speed) : this.heroData.speed;
    this.basePlayerSpeed = this.playerSpeed;
    if (this.slowTimerEvent) {
      this.slowTimerEvent.remove();
      this.slowTimerEvent = null;
    }
    // Boosted coin economy (+10% gold balance)
    this.dungeonGold = data.carryGold !== undefined ? data.carryGold : 15;
    this.appliedUpgradeCards = data.appliedUpgrades || [];

    // Re-apply perk passive flags from previous floors
    if (this.appliedUpgradeCards.length > 0) {
      this.appliedUpgradeCards.forEach(cardId => {
        const perk = FLOOR_PERKS_DATABASE.find(p => p.id === cardId);
        if (perk) {
          try {
            perk.effect(this);
          } catch (e) {
            console.error('Error re-applying perk', cardId, e);
          }
        }
      });
      // Ensure Black Market max HP reduction is strictly preserved and not overwritten by re-applied perks!
      if (data.carryMaxHp !== undefined) {
        this.playerMaxHp = targetMaxHp;
        this.playerHp = targetHp;
      }
    }
    this.isPlayerDown = false;
    this.isUpgradeModalOpen = false;
    this.isBlackMarketOpen = false;
    this.isDescending = false;
    this.alrikShieldActive = false;
    this.alrikShieldAngle = 0;
    this.kraulUltActive = false;
    this.weaponThrustDist = 0;
    this.weaponSwingAngle = 0;
    this.weaponAttackAngle = 0;
    this.aimingSkillSlot = null;
    this.skillAimPointerId = null;
    this.alrikShieldGfx = null;
    this.alrikUltStabCd = 0;
    this.mobs = [];
    this.rooms = [];
    this.currentRoomId = 0;
    this.cdOverlays = {};
    this.cdTextLabels = {};
    this.cds = { attack: 0, s1: 0, s2: 0, ult: 0 };
    this.cdMax = {
      attack: this.currentWeapon.attackSpeed,
      s1: (this.heroData.skills[0]?.cooldown || 3.0) * 1000,
      s2: (this.heroData.skills[1]?.cooldown || 4.5) * 1000,
      ult: (this.heroData.skills[2]?.cooldown || 14.0) * 1000
    };
    this.minimapIcons = [];
    this.companion = null;
    this.flyingPet = null;
    this.carryPetPersisted = !!data.carryPet;
    this.carryCompanionPersisted = data.carryCompanion || null;
    this.spikeTraps = [];
    this.spikeCooldown = 0;
    this.currentInteraction = null;
    this.interactableTargets = [];
    this.clearInteraction();

    // Reapply persistent upgrades
    this.zazaDoubleSpit = this.appliedUpgradeCards.includes('zaza_double_spit');
    this.zazaPoisonTrail = this.appliedUpgradeCards.includes('zaza_poison_trail');
    this.grimDoubleBullet = this.appliedUpgradeCards.includes('grim_double_bullet');
    this.grimClusterBomb = this.appliedUpgradeCards.includes('grim_cluster_bomb');
    this.bjornFireWhirl = this.appliedUpgradeCards.includes('bjorn_fire_whirl');
    if (this.appliedUpgradeCards.includes('up_hp')) this.playerMaxHp += 250;
    if (this.appliedUpgradeCards.includes('up_speed')) this.playerSpeed = Math.round(this.playerSpeed * 1.2);
    if (this.appliedUpgradeCards.includes('up_damage')) this.damageMultiplier += 0.25;
    if (this.appliedUpgradeCards.includes('up_energy')) {
      this.playerMaxEnergy += 50;
      this.energyRegenRate += 8;
    }
  }

  create() {
    generateAllTextures(this);

    const res = Math.max(window.devicePixelRatio || 1, 2);

    // Detect mobile touch
    this.isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    const onResize = (gameSize: Phaser.Structs.Size) => {
      this.cameras.main.setViewport(0, 0, gameSize.width, gameSize.height);
      this.repositionTouchControls();
      this.updateHUD();
    };
    this.scale.on('resize', onResize);
    this.events.once('shutdown', () => {
      this.scale.off('resize', onResize);
      this.shutdown();
    });

    const worldW = 8000;
    const worldH = 8000;
    this.physics.world.setBounds(0, 0, worldW, worldH);

    // Pure pitch-black void background outside rooms
    this.add.rectangle(worldW / 2, worldH / 2, worldW, worldH, 0x000000).setDepth(0);

    // Physics Groups
    this.walls = this.physics.add.staticGroup();
    this.coverObstacles = this.physics.add.staticGroup();
    this.doorsGroup = this.physics.add.staticGroup();
    this.mobsGroup = this.physics.add.group();
    this.pickups = this.physics.add.group();
    this.projectiles = this.physics.add.group();
    this.propsContainer = this.add.group();

    // Door Barrier Graphic Overlay for Combat Lock
    this.doorBarrierGfx = this.add.graphics().setDepth(28);

    // Boss Telegraph Graphic
    this.bossTelegraphLine = this.add.graphics().setDepth(45);

    // Spawn Player BEFORE generating layout and rooms
    this.player = this.physics.add.sprite(worldW / 2, worldH / 2, this.heroData.texture).setDepth(50);
    this.player.setCollideWorldBounds(true);
    this.player.setScale(1.2);
    if (this.selectedHeroKey === 'char_kraul' && this.player.body) {
      this.player.body.setSize(this.player.width * 0.7, this.player.height * 0.7);
    }

    // Player skill aiming graphics
    this.skillAimGfx = this.add.graphics().setDepth(49);

    // Render Equipped Weapon (hidden in dungeon as requested)
    this.playerWeaponVisual = this.add.image(this.player.x + 16, this.player.y + 4, this.currentWeapon.texture)
      .setDepth(51).setScale(1.2).setVisible(false);

    // Build HUD, Minimap, Touch Controls & Modals first so all UI references exist
    this.buildHUD();
    this.buildMinimap();
    this.buildTouchControls();
    this.buildUpgradeModal();

    // Generate Procedural 2D Dungeon Layout (4 to 7 connected rooms)
    this.generateProceduralDungeonLayout();

    // Reposition Player strictly to the EXACT CENTER of Safe Start Room (Room 0)
    const startRoom = this.rooms[0] || { id: 0, worldX: worldW / 2, worldY: worldH / 2 };
    this.currentRoomId = startRoom.id;
    this.player.setPosition(startRoom.worldX, startRoom.worldY);
    this.player.setVelocity(0, 0);
    if (this.player.body) {
      this.player.body.reset(startRoom.worldX, startRoom.worldY);
    }
    if (this.playerWeaponVisual) {
      this.playerWeaponVisual.setPosition(this.player.x + 16, this.player.y + 4);
    }

    // Spawn carried companion or flying pet from previous floor
    if (this.carryPetPersisted) {
      const petSprite = this.add.sprite(this.player.x, this.player.y - 30, 'pet_bat').setDepth(52).setScale(1.3);
      this.flyingPet = {
        sprite: petSprite,
        shootTimer: 1000,
        angle: 0
      };
    }
    if (this.carryCompanionPersisted) {
      this.hireMercenaryAlly(this.carryCompanionPersisted.hp);
    }

    // Collisions
    this.physics.add.collider(this.player, this.walls);
    this.physics.add.collider(this.player, this.coverObstacles);
    this.physics.add.collider(this.player, this.doorsGroup);

    // Camera setup: Clean 1.0 zoom and instant camera lock (no floaty lerp lag)
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.cameras.main.startFollow(this.player, true, 1, 1);
    this.cameras.main.setZoom(1.0);
    this.cameras.main.setRoundPixels(true);

    // Keyboard Controls
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.keys = {
        W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
        E: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
        F: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F),
        Q: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
        SPACE: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
        ONE: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE),
        TWO: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO),
        THREE: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE)
      };

      this.input.keyboard.on('keydown-E', () => {
        if (this.currentInteraction) this.currentInteraction();
      });
      this.input.keyboard.on('keydown-F', () => {
        if (this.currentInteraction) this.currentInteraction();
      });
      this.input.keyboard.on('keydown-Q', () => {
        this.switchWeapon();
      });
    }

    // Support multi-touch (up to 5 pointers for simultaneous joystick movement + attack aim + skill cast)
    if (this.input.manager.pointers.length < 5) {
      this.input.addPointer(5 - this.input.manager.pointers.length);
    }

    // Mouse click attacks for PC & Left-screen dynamic joystick
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.isUpgradeModalOpen || this.isBlackMarketOpen || this.isPlayerDown) return;
      const target = p.event?.target as HTMLElement;
      if (target && (target.closest('#dungeon-dom-hud-root') || target.closest('#game-dom-black-market-modal') || target.closest('#game-dom-pause-modal') || target.closest('#floor-reward-modal-root') || target.closest('#game-dom-notice-board-modal') || target.tagName === 'BUTTON')) {
        return;
      }
      const w = this.cameras.main.width;

      // 1. LEFT HALF OF SCREEN: Dedicated Movement Joystick
      if (p.x < w * 0.5 && this.aimJoyPointerId !== p.id && this.skillAimPointerId !== p.id) {
        this.joyStickPointerId = p.id;
        if (this.joyStickBase && this.joyStickThumb) {
          this.joyStickBase.setPosition(p.x, p.y);
          this.joyStickThumb.setPosition(p.x, p.y);
        }
        this.updateJoystick(p.x, p.y);
        return;
      }

      // 2. RIGHT HALF: PC mouse click attack
      if (!this.isMobile && p.leftButtonDown()) {
        if (this.cds.attack <= 0) {
          const dx = p.worldX - this.player.x;
          const dy = p.worldY - this.player.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 15) {
            this.executeCombatSkill('attack', dx / dist, dy / dist);
          } else {
            this.autoAimAndAttackDungeon();
          }
        }
      }
    });

    // Check if Upgrade Card should trigger right at start of floor (strictly Floor 2, Floor 4, and Floor 6)
    if (this.currentFloor === 2 || this.currentFloor === 4 || this.currentFloor === 6) {
      this.time.delayedCall(600, () => this.openUpgradeModal());
    }

    // Periodic state loop
    this.time.addEvent({
      delay: 400,
      loop: true,
      callback: () => this.handlePeriodicState()
    });

    // Single unified torch flame ticker (replaces 60+ individual timers)
    let torchFrame = 1;
    this.time.addEvent({
      delay: 180,
      loop: true,
      callback: () => {
        torchFrame = torchFrame === 1 ? 2 : 1;
        const tex = torchFrame === 1 ? 'dungeon_torch_1' : 'dungeon_torch_2';
        for (let i = 0; i < this.wallTorches.length; i++) {
          const t = this.wallTorches[i];
          if (t && t.active) t.setTexture(tex);
        }
      }
    });

    // Pickups collision
    this.physics.add.overlap(this.player, this.pickups, (_p, pickup) => {
      this.collectPickup(pickup as Phaser.Physics.Arcade.Sprite);
    });

    // Show Biome Entrance Banner: "ЗАБРОШЕННЫЕ ПОДЗЕМЕЛЬЯ"
    this.showBiomeIntroBanner();
  }

  private showBiomeIntroBanner() {
    const w = this.cameras.main.width;
    const bannerContainer = this.add.container(w / 2, 130).setScrollFactor(0).setDepth(400);

    const bg = this.add.rectangle(0, 0, 480, 74, 0x090d16, 0.92)
      .setStrokeStyle(2, 0xf59e0b);
    const innerBorder = this.add.rectangle(0, 0, 470, 64, 0x000000, 0)
      .setStrokeStyle(1, 0x78350f);

    const res = Math.max(window.devicePixelRatio || 1, 2);
    const subTitle = this.add.text(0, -18, '✦ ПОДЗЕМЕЛЬЕ • ДРЕВНИЕ КАТАКОМБЫ ✦', {
      fontSize: '16px', fontFamily: '"VT323", "Courier New", monospace', fontStyle: 'bold', color: '#fbbf24', letterSpacing: 2
    }).setOrigin(0.5).setResolution(res);

    const mainTitle = this.add.text(0, 4, 'ЗАБРОШЕННЫЕ ПОДЗЕМЕЛЬЯ', {
      fontSize: '24px', fontFamily: '"VT323", "Courier New", monospace', fontStyle: 'bold', color: '#ffffff'
    }).setOrigin(0.5).setResolution(res);

    const floorText = this.add.text(0, 24, `[ ЭТАЖ ${this.currentFloor} / ${this.maxFloors} ]`, {
      fontSize: '16px', fontFamily: '"VT323", "Courier New", monospace', fontStyle: 'bold', color: '#38bdf8'
    }).setOrigin(0.5).setResolution(res);

    bannerContainer.add([bg, innerBorder, subTitle, mainTitle, floorText]);
    bannerContainer.setAlpha(0);
    bannerContainer.setScale(0.9);

    this.tweens.add({
      targets: bannerContainer,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 400,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.time.delayedCall(2400, () => {
          this.tweens.add({
            targets: bannerContainer,
            alpha: 0,
            y: 110,
            duration: 600,
            ease: 'Sine.easeIn',
            onComplete: () => bannerContainer.destroy()
          });
        });
      }
    });
  }

  // --- 2D PROCEDURAL DUNGEON GENERATION (4 TO 7 CONNECTED ROOMS) ---
  private generateProceduralDungeonLayout() {
    const isBossFloor = this.currentFloor === this.maxFloors;
    const roomCount = isBossFloor ? 5 : Phaser.Math.Between(4, 7);

    // Grid coordinates (spacious rooms on 1500px grid)
    const cellSize = 1500;
    const originX = 4000;
    const originY = 4000;

    // Build Connected Grid Graph safely
    const gridOccupied = new Map<string, GridRoom>();
    const roomList: GridRoom[] = [];

    const directions = [
      { dx: 0, dy: -1, dir: 'north', opp: 'south' },
      { dx: 0, dy: 1, dir: 'south', opp: 'north' },
      { dx: 1, dy: 0, dir: 'east', opp: 'west' },
      { dx: -1, dy: 0, dir: 'west', opp: 'east' }
    ];

    // Start Room (0,0) - Safe starting haven
    const startRoom: GridRoom = {
      id: 0,
      gridX: 0,
      gridY: 0,
      worldX: originX,
      worldY: originY,
      w: 1050,
      h: 780,
      type: 'start',
      name: '🛡 БЕЗОПАСНАЯ ЗОНА',
      cleared: true,
      visited: true,
      active: false,
      mobCount: 0,
      connections: {},
      doors: []
    };
    gridOccupied.set('0,0', startRoom);
    roomList.push(startRoom);

    // Pre-determine room types for intermediate slots (indices 1 to roomCount - 1)
    const plannedTypes: Array<'combat' | 'companion' | 'shop' | 'portal' | 'boss' | 'market' | 'treasure' | 'miniboss'> = [];

    if (isBossFloor) {
      plannedTypes.push('combat', 'combat', 'shop');
    } else {
      const intermediateSlots = roomCount - 2; // slots between start (0) and exit portal
      const specialPool: Array<'combat' | 'companion' | 'shop' | 'market' | 'treasure' | 'miniboss'> = [];

      // 1. Mini-boss Arena: strictly on floor 3 or 4
      if (this.currentFloor === this.miniBossFloor) {
        specialPool.push('miniboss');
      }
      // 2. Black Market: appears on floor 3 or 4
      if ((this.currentFloor === 3 || this.currentFloor === 4) && specialPool.length < intermediateSlots) {
        specialPool.push('market');
      }
      // 3. Dungeon Shop: once every 2 floors
      if (this.currentFloor % 2 === 0 && specialPool.length < intermediateSlots) {
        specialPool.push('shop');
      }
      // 4. Recruitment Camp: 60% chance
      if (Math.random() < 0.6 && specialPool.length < intermediateSlots) {
        specialPool.push('companion');
      }
      // 5. Treasure / Shrine: 30% chance
      if (Math.random() < 0.3 && specialPool.length < intermediateSlots) {
        specialPool.push('treasure');
      }

      // Fill remaining intermediate slots with combat rooms (approx 50% of the dungeon)
      while (specialPool.length < intermediateSlots) {
        specialPool.push('combat');
      }

      // Shuffle intermediate rooms for variety
      Phaser.Utils.Array.Shuffle(specialPool);
      plannedTypes.push(...specialPool);
    }

    // Pick from existing rooms to branch outwards safely
    let safetyAttempts = 0;

    while (roomList.length < roomCount && safetyAttempts < 180) {
      safetyAttempts++;
      const parentRoom = Phaser.Utils.Array.GetRandom(roomList);
      const step = Phaser.Utils.Array.GetRandom(directions);
      const nextGX = Phaser.Math.Clamp(parentRoom.gridX + step.dx, -2, 2);
      const nextGY = Phaser.Math.Clamp(parentRoom.gridY + step.dy, -2, 2);
      const key = `${nextGX},${nextGY}`;

      if (!gridOccupied.has(key)) {
        const roomIndex = roomList.length;

        const newRoom: GridRoom = {
          id: roomIndex,
          gridX: nextGX,
          gridY: nextGY,
          worldX: originX + nextGX * cellSize,
          worldY: originY + nextGY * cellSize,
          w: 1150,
          h: 860,
          type: 'combat',
          name: this.getRoomTypeName('combat', roomIndex),
          cleared: false,
          visited: false,
          active: false,
          mobCount: 4 + this.currentFloor,
          connections: {},
          doors: []
        };

        (parentRoom.connections as Record<string, number>)[step.dir] = roomIndex;
        (newRoom.connections as Record<string, number>)[step.opp] = parentRoom.id;

        gridOccupied.set(key, newRoom);
        roomList.push(newRoom);
      }
    }

    // Compute graph distance (BFS) from startRoom (room 0) to ensure portal is placed at the farthest room!
    const distMap = new Map<number, number>();
    distMap.set(0, 0);
    const queue: number[] = [0];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const currentDist = distMap.get(currentId)!;
      const room = roomList[currentId];
      if (!room) continue;

      for (const neighborId of Object.values(room.connections)) {
        if (!distMap.has(neighborId)) {
          distMap.set(neighborId, currentDist + 1);
          queue.push(neighborId);
        }
      }
    }

    // Sort non-start rooms by distance from start (farthest first)
    const nonStartRooms = roomList.filter(r => r.id !== 0);
    nonStartRooms.sort((a, b) => (distMap.get(b.id) || 0) - (distMap.get(a.id) || 0));

    // The exit room (portal or boss) is guaranteed to be the farthest room from start
    const exitRoom = nonStartRooms[0];
    const targetExitType = isBossFloor ? 'boss' : 'portal';
    exitRoom.type = targetExitType;
    exitRoom.w = targetExitType === 'boss' ? 1400 : 1050;
    exitRoom.h = targetExitType === 'boss' ? 1000 : 780;
    exitRoom.name = this.getRoomTypeName(targetExitType, exitRoom.id);
    exitRoom.cleared = targetExitType === 'portal';
    exitRoom.mobCount = targetExitType === 'boss' ? 1 : 0;

    // Assign intermediate room types to remaining rooms
    const remainingRooms = nonStartRooms.filter(r => r.id !== exitRoom.id);
    for (let i = 0; i < remainingRooms.length; i++) {
      const r = remainingRooms[i];
      const rType = plannedTypes[i] || 'combat';
      r.type = rType;
      r.w = rType === 'miniboss' ? 1300 : (rType === 'combat' || rType === 'market' ? 1150 : 1050);
      r.h = rType === 'miniboss' ? 950 : (rType === 'combat' || rType === 'market' ? 860 : 780);
      r.name = this.getRoomTypeName(rType, r.id);
      r.cleared = rType === 'companion' || rType === 'shop' || rType === 'market' || rType === 'treasure';
      r.mobCount = rType === 'combat' ? 4 + this.currentFloor : (rType === 'miniboss' ? 1 : 0);
    }

    this.rooms = roomList;
    this.roomsMap.clear();
    this.rooms.forEach(r => this.roomsMap.set(r.id, r));

    // Construct Walls, Corridors and Props for each room
    this.rooms.forEach(room => {
      this.buildRoomGeometry(room, cellSize);
    });
  }

  private getRoomTypeName(type: string, idx: number): string {
    if (type === 'start') return '🛡 БЕЗОПАСНАЯ ЗОНА';
    if (type === 'companion') return '🐾 ЛАГЕРЬ ВЕРБОВКИ';
    if (type === 'shop') return '⚖️ МАГАЗИН ТОРГОВЦА';
    if (type === 'market') return '🩸 ЧЕРНЫЙ РЫНОК';
    if (type === 'treasure') return '✨ СОКРОВИЩНИЦА / АЛТАРЬ';
    if (type === 'miniboss') return '👑 АРЕНА МИНИ-БОССА';
    if (type === 'boss') return '👑 ТРОННЫЙ ЗАЛ ФИНАЛЬНОГО БОССА';
    if (type === 'portal') return '🌀 ВХОД В ПЕЩЕРУ (ПЕРЕХОД)';
    return `💀 БОЕВОЙ ЗАЛ #${idx}`;
  }

  // --- ROOM GEOMETRY & CORRIDORS ---
  private buildRoomGeometry(room: GridRoom, cellSize: number) {
    const cx = room.worldX;
    const cy = room.worldY;
    const halfW = room.w / 2;
    const halfH = room.h / 2;
    const doorGap = 85;
    const corridorLen = (cellSize - room.h) / 2;

    // Base Room Floor Tile
    this.add.tileSprite(cx, cy, room.w, room.h, 'tile_floor').setDepth(1).setAlpha(0.95);

    // Procedural mix of floor tiles (32x32) across the room
    const step = 64;
    for (let fx = cx - halfW + 48; fx <= cx + halfW - 48; fx += step) {
      for (let fy = cy - halfH + 48; fy <= cy + halfH - 48; fy += step) {
        const roll = Math.random();
        if (roll < 0.16) {
          this.add.image(Math.round(fx), Math.round(fy), 'tile_floor_cracked').setDepth(2).setAlpha(0.9);
        } else if (roll < 0.28) {
          this.add.image(Math.round(fx), Math.round(fy), 'tile_floor_mossy').setDepth(2).setAlpha(0.88);
        } else if (roll < 0.36) {
          this.add.image(Math.round(fx), Math.round(fy), 'tile_floor_grate').setDepth(2).setAlpha(0.92);
        }
      }
    }

    // Top Wall (North)
    if (room.connections.north !== undefined) {
      this.add.tileSprite(cx, cy - halfH - corridorLen / 2, doorGap * 2, corridorLen, 'tile_floor').setDepth(1).setAlpha(0.95);
      this.createWallLine(cx - halfW, cy - halfH, cx - doorGap, cy - halfH);
      this.createWallLine(cx + doorGap, cy - halfH, cx + halfW, cy - halfH);
      // Corridor to north
      this.createWallLine(cx - doorGap, cy - halfH, cx - doorGap, cy - halfH - corridorLen);
      this.createWallLine(cx + doorGap, cy - halfH, cx + doorGap, cy - halfH - corridorLen);
    } else {
      this.createWallLine(cx - halfW, cy - halfH, cx + halfW, cy - halfH);
    }

    // Bottom Wall (South)
    if (room.connections.south !== undefined) {
      this.add.tileSprite(cx, cy + halfH + corridorLen / 2, doorGap * 2, corridorLen, 'tile_floor').setDepth(1).setAlpha(0.95);
      this.createWallLine(cx - halfW, cy + halfH, cx - doorGap, cy + halfH);
      this.createWallLine(cx + doorGap, cy + halfH, cx + halfW, cy + halfH);
      // Corridor to south
      this.createWallLine(cx - doorGap, cy + halfH, cx - doorGap, cy + halfH + corridorLen);
      this.createWallLine(cx + doorGap, cy + halfH, cx + doorGap, cy + halfH + corridorLen);
    } else {
      this.createWallLine(cx - halfW, cy + halfH, cx + halfW, cy + halfH);
    }

    // Left Wall (West)
    if (room.connections.west !== undefined) {
      this.add.tileSprite(cx - halfW - corridorLen / 2, cy, corridorLen, doorGap * 2, 'tile_floor').setDepth(1).setAlpha(0.95);
      this.createWallLine(cx - halfW, cy - halfH, cx - halfW, cy - doorGap);
      this.createWallLine(cx - halfW, cy + doorGap, cx - halfW, cy + halfH);
      // Corridor to west
      this.createWallLine(cx - halfW, cy - doorGap, cx - halfW - corridorLen, cy - doorGap);
      this.createWallLine(cx - halfW, cy + doorGap, cx - halfW - corridorLen, cy + doorGap);
    } else {
      this.createWallLine(cx - halfW, cy - halfH, cx - halfW, cy + halfH);
    }

    // Right Wall (East)
    if (room.connections.east !== undefined) {
      this.add.tileSprite(cx + halfW + corridorLen / 2, cy, corridorLen, doorGap * 2, 'tile_floor').setDepth(1).setAlpha(0.95);
      this.createWallLine(cx + halfW, cy - halfH, cx + halfW, cy - doorGap);
      this.createWallLine(cx + halfW, cy + doorGap, cx + halfW, cy + halfH);
      // Corridor to east
      this.createWallLine(cx + halfW, cy - doorGap, cx + halfW + corridorLen, cy - doorGap);
      this.createWallLine(cx + halfW, cy + doorGap, cx + halfW + corridorLen, cy + doorGap);
    } else {
      this.createWallLine(cx + halfW, cy - halfH, cx + halfW, cy + halfH);
    }

    // Wall Torches with warm flickering light
    this.addWallTorch(cx - halfW + 45, cy - halfH + 20);
    this.addWallTorch(cx + halfW - 45, cy - halfH + 20);
    this.addWallTorch(cx - halfW + 45, cy + halfH - 20);
    this.addWallTorch(cx + halfW - 45, cy + halfH - 20);

    // Floor Title Marker
    this.add.text(cx, cy - halfH + 25, `[ ${room.name} ]`, {
      fontSize: '13px', fontFamily: 'Consolas, monospace', resolution: 2, fontStyle: 'bold',
      color: room.type === 'start' ? '#22c55e' : (room.type === 'boss' || room.type === 'miniboss' ? '#ef4444' : (room.type === 'shop' ? '#facc15' : (room.type === 'companion' ? '#38bdf8' : (room.type === 'market' ? '#f43f5e' : '#94a3b8'))))
    }).setOrigin(0.5).setDepth(5);

    // Rich atmospheric decorations & destructible props in every room
    this.decorateDungeonRoom(room);

    // Room Interactive Props
    if (room.type === 'start') {
      this.buildSafeStartZone(cx, cy);
    } else if (room.type === 'companion') {
      this.buildRecruitmentCamp(cx, cy);
    } else if (room.type === 'shop') {
      this.buildShopRoom(cx, cy);
    } else if (room.type === 'market') {
      this.buildBlackMarket(cx, cy);
    } else if (room.type === 'treasure') {
      this.buildTreasureShrineRoom(cx, cy);
    } else if (room.type === 'miniboss') {
      this.buildMiniBossRoom(cx, cy);
    } else if (room.type === 'boss') {
      this.buildBossRoom(cx, cy);
    } else if (room.type === 'portal') {
      this.buildLevelPortal(cx, cy);
    }
  }

  private spawnDestructibleProp(x: number, y: number, type: 'crate' | 'barrel' | 'tnt' | 'pillar' | 'urn') {
    const texMap: Record<string, string> = {
      crate: 'prop_crate',
      barrel: 'prop_barrel',
      tnt: 'prop_explosive_barrel',
      pillar: 'prop_pillar_broken',
      urn: 'prop_urn'
    };
    const hpMap: Record<string, number> = {
      crate: 40,
      barrel: 40,
      tnt: 30,
      pillar: 70,
      urn: 25
    };

    const prop = this.physics.add.sprite(x, y, texMap[type]) as DestructibleProp;
    prop.setDepth(14).setScale(1.2).setImmovable(true);
    prop.propType = type;
    prop.hp = hpMap[type] || 40;
    prop.maxHp = prop.hp;

    this.coverObstacles.add(prop);
    this.destructibleList.push(prop);
  }

  public checkDestructibleDamage(x: number, y: number, radius: number, damage: number, isHeavy: boolean) {
    if (!this.destructibleList) return;
    // ONLY HEAVY ATTACKS (damage >= 45 or isHeavy flag) break sturdy crates, barrels, and walls!
    if (!isHeavy && damage < 45) return;

    for (let i = this.destructibleList.length - 1; i >= 0; i--) {
      const prop = this.destructibleList[i];
      if (!prop || !prop.active) {
        this.destructibleList.splice(i, 1);
        continue;
      }

      const dist = Phaser.Math.Distance.Between(x, y, prop.x, prop.y);
      if (dist <= radius + 22) {
        prop.hp -= damage;
        // Visual hit wobble
        this.tweens.add({
          targets: prop,
          scaleX: 1.35,
          scaleY: 1.35,
          duration: 65,
          yoyo: true
        });

        if (prop.hp <= 0) {
          this.destroyProp(prop, i);
        }
      }
    }
  }

  private destroyProp(prop: DestructibleProp, idx?: number) {
    if (!prop || !prop.active) return;
    const px = prop.x;
    const py = prop.y;
    const pType = prop.propType;

    if (idx !== undefined) {
      this.destructibleList.splice(idx, 1);
    } else {
      const foundIdx = this.destructibleList.indexOf(prop);
      if (foundIdx >= 0) this.destructibleList.splice(foundIdx, 1);
    }

    prop.destroy();

    if (pType === 'tnt') {
      soundEngine.playExplosion();
      this.cameras.main.shake(200, 0.015);

      // Fiery blast AoE
      const blast = this.add.circle(px, py, 80, 0xef4444, 0.85).setDepth(45);
      this.tweens.add({ targets: blast, scale: 1.7, alpha: 0, duration: 320, onComplete: () => blast.destroy() });

      // Damage nearby mobs
      this.mobs.forEach(m => {
        if (m.active && Phaser.Math.Distance.Between(px, py, m.x, m.y) < 115) {
          this.damageMob(m, 240);
        }
      });

      // Chain reaction to nearby destructible barrels
      this.checkDestructibleDamage(px, py, 110, 240, true);
    } else if (pType === 'pillar') {
      soundEngine.playSmash();
      // Stone shards
      for (let s = 0; s < 6; s++) {
        const shard = this.add.circle(px + (Math.random() - 0.5) * 20, py + (Math.random() - 0.5) * 20, 5, 0x475569).setDepth(45);
        this.tweens.add({
          targets: shard,
          x: shard.x + (Math.random() - 0.5) * 65,
          y: shard.y + (Math.random() - 0.5) * 65,
          alpha: 0,
          duration: 350,
          onComplete: () => shard.destroy()
        });
      }
    } else {
      // Wood crates and barrels
      soundEngine.playHit();
      for (let s = 0; s < 6; s++) {
        const splinter = this.add.rectangle(px + (Math.random() - 0.5) * 20, py + (Math.random() - 0.5) * 20, 6, 3, 0x92400e).setDepth(45);
        this.tweens.add({
          targets: splinter,
          x: splinter.x + (Math.random() - 0.5) * 55,
          y: splinter.y + (Math.random() - 0.5) * 55,
          angle: Math.random() * 180,
          alpha: 0,
          duration: 300,
          onComplete: () => splinter.destroy()
        });
      }

      // Loot drops
      const roll = Math.random();
      if (roll < 0.45) {
        this.spawnPickup(px, py, 'coin');
      } else if (roll < 0.70) {
        this.spawnPickup(px, py, 'heart');
      }
    }
  }

  private decorateDungeonRoom(room: GridRoom) {
    if (room.type === 'start') {
      // Guaranteed safe starting zone - no destructible blocks or obstacles
      return;
    }
    const cx = room.worldX;
    const cy = room.worldY;
    const hw = room.w / 2 - 60;
    const hh = room.h / 2 - 60;

    // 1. Cobwebs in room corners
    const cobwebNW = this.add.image(cx - hw, cy - hh, 'prop_cobweb').setDepth(6).setScale(1.2);
    const cobwebNE = this.add.image(cx + hw, cy - hh, 'prop_cobweb').setDepth(6).setScale(1.2).setFlipX(true);
    const cobwebSW = this.add.image(cx - hw, cy + hh, 'prop_cobweb').setDepth(6).setScale(1.2).setFlipY(true);
    const cobwebSE = this.add.image(cx + hw, cy + hh, 'prop_cobweb').setDepth(6).setScale(1.2).setFlipX(true).setFlipY(true);
    this.propsContainer.addMultiple([cobwebNW, cobwebNE, cobwebSW, cobwebSE]);

    // 2. Ancient Rune Stones in corners / sides with soft pulsing glow
    const rune1 = this.add.image(cx - hw + 50, cy - hh + 50, 'prop_rune_stone').setDepth(7).setScale(1.1);
    const rune2 = this.add.image(cx + hw - 50, cy + hh - 50, 'prop_rune_stone').setDepth(7).setScale(1.1);
    this.tweens.add({
      targets: [rune1, rune2],
      alpha: 0.7,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    this.propsContainer.addMultiple([rune1, rune2]);

    // 3. Beautiful symmetrical destructible formations (neatly clustered in corners and wall alcoves):
    // Top-Left Corner Cluster: 2 Crates + 1 Barrel
    this.spawnDestructibleProp(cx - hw + 40, cy - hh + 80, 'crate');
    this.spawnDestructibleProp(cx - hw + 68, cy - hh + 80, 'crate');
    this.spawnDestructibleProp(cx - hw + 54, cy - hh + 52, 'barrel');

    // Top-Right Corner Cluster: 2 Crates + 1 Barrel
    this.spawnDestructibleProp(cx + hw - 40, cy - hh + 80, 'crate');
    this.spawnDestructibleProp(cx + hw - 68, cy - hh + 80, 'crate');
    this.spawnDestructibleProp(cx + hw - 54, cy - hh + 52, 'barrel');

    // Bottom-Left Corner Cluster: Broken Stone Pillar + Barrel
    this.spawnDestructibleProp(cx - hw + 45, cy + hh - 60, 'pillar');
    this.spawnDestructibleProp(cx - hw + 75, cy + hh - 60, 'barrel');

    // Bottom-Right Corner Cluster: Broken Stone Pillar + Explosive TNT Barrel
    this.spawnDestructibleProp(cx + hw - 45, cy + hh - 60, 'pillar');
    this.spawnDestructibleProp(cx + hw - 75, cy + hh - 60, 'tnt');

    // Side wall symmetric barricade pairs in combat & boss rooms
    if (room.type === 'combat' || room.type === 'boss') {
      this.spawnDestructibleProp(cx - hw + 40, cy - 80, 'barrel');
      this.spawnDestructibleProp(cx - hw + 40, cy + 80, 'tnt');
      this.spawnDestructibleProp(cx + hw - 40, cy - 80, 'tnt');
      this.spawnDestructibleProp(cx + hw - 40, cy + 80, 'barrel');
    }

    // 4. Deadly Timed Spike Traps strictly in Combat Rooms (100% prohibited in safe zones, shops, camps, black market, portals)
    if (room.type !== 'combat') return;

    const numTraps = Phaser.Math.Between(2, 4);
    const marginX = Math.max(40, Math.floor(hw - 90));
    const marginY = Math.max(40, Math.floor(hh - 90));
    const generatedCoords: Array<{ x: number; y: number }> = [];

    for (let t = 0; t < numTraps; t++) {
      let attempts = 0;
      let rx = cx;
      let ry = cy;
      let foundValid = false;

      while (attempts < 15) {
        attempts++;
        rx = cx + Phaser.Math.Between(-marginX, marginX);
        ry = cy + Phaser.Math.Between(-marginY, marginY);

        // Avoid center spot where chests, altars or boss spawn
        if (Math.hypot(rx - cx, ry - cy) < 70) continue;

        // Avoid placing too close to another spike trap
        const tooClose = generatedCoords.some(c => Math.hypot(c.x - rx, c.y - ry) < 65);
        if (!tooClose) {
          foundValid = true;
          break;
        }
      }

      if (foundValid) {
        generatedCoords.push({ x: rx, y: ry });
        this.spawnSpikeTrap(rx, ry, room.id);
      }
    }
  }

  private spawnSpikeTrap(x: number, y: number, roomId: number) {
    const sprite = this.add.sprite(x, y, 'spike_trap_retracted').setDepth(4).setScale(1.2);

    this.spikeTraps.push({
      sprite,
      x,
      y,
      roomId,
      state: 'retracted',
      timer: Phaser.Math.Between(0, 1600)
    });
  }

  private updateSpikeTraps(delta: number) {
    if (!this.player || !this.player.active) return;
    const px = this.player.x;
    const py = this.player.y;

    for (const trap of this.spikeTraps) {
      const dist = Phaser.Math.Distance.Between(px, py, trap.x, trap.y);

      // Super optimization: only calculate / animate traps in current room or within 650px of player
      if (trap.roomId !== this.currentRoomId && dist > 650) {
        continue;
      }

      trap.timer += delta;

      // Cycle: retracted (1600ms) -> warning (600ms) -> extended (900ms) -> retracted
      if (trap.state === 'retracted') {
        if (trap.timer > 1600) {
          trap.state = 'warning';
          trap.timer = 0;
          trap.sprite.setTexture('spike_trap_warning');
        }
      } else if (trap.state === 'warning') {
        if (trap.timer > 600) {
          trap.state = 'extended';
          trap.timer = 0;
          trap.sprite.setTexture('spike_trap_extended');

          // Only play sound when player is close enough to hear it!
          if (dist < 260) {
            soundEngine.playHit();
          }
        }
      } else if (trap.state === 'extended') {
        // Player contact damage & knockback
        if (!this.isPlayerDown && dist < 28 && this.spikeCooldown <= 0) {
          this.spikeCooldown = 900;
          this.damagePlayer(25);
          soundEngine.playSmash();

          // Knockback player away from trap
          const angle = Phaser.Math.Angle.Between(trap.x, trap.y, px, py);
          const kbDist = 65;
          this.player.x += Math.cos(angle) * kbDist;
          this.player.y += Math.sin(angle) * kbDist;
          this.showDamageNumber(this.player.x, this.player.y - 20, '-25 ШИПЫ! ⚔', '#ef4444');

          const b = this.add.circle(this.player.x, this.player.y, 16, 0xef4444, 0.75).setDepth(45);
          this.tweens.add({ targets: b, scale: 2, alpha: 0, duration: 250, onComplete: () => b.destroy() });
        }

        if (trap.timer > 900) {
          trap.state = 'retracted';
          trap.timer = 0;
          trap.sprite.setTexture('spike_trap_retracted');
        }
      }
    }
  }

  private updateFlyingPet(delta: number) {
    if (!this.flyingPet || !this.flyingPet.sprite || !this.flyingPet.sprite.active) return;
    this.flyingPet.angle += delta * 0.0028;
    const targetX = this.player.x + Math.cos(this.flyingPet.angle) * 44;
    const targetY = this.player.y - 30 + Math.sin(this.flyingPet.angle * 1.5) * 16;

    this.flyingPet.sprite.x = Phaser.Math.Linear(this.flyingPet.sprite.x, targetX, 0.2);
    this.flyingPet.sprite.y = Phaser.Math.Linear(this.flyingPet.sprite.y, targetY, 0.2);

    if (this.flyingPet.sprite.x < this.player.x) {
      this.flyingPet.sprite.setFlipX(true);
    } else {
      this.flyingPet.sprite.setFlipX(false);
    }

    this.flyingPet.shootTimer -= delta;
    if (this.flyingPet.shootTimer <= 0) {
      this.flyingPet.shootTimer = 1300;
      let nearestMob: DungeonMob | null = null;
      let minDist = 360;
      for (const m of this.mobs) {
        if (m.active && m.roomId === this.currentRoomId) {
          const d = Phaser.Math.Distance.Between(this.flyingPet.sprite.x, this.flyingPet.sprite.y, m.x, m.y);
          if (d < minDist) {
            minDist = d;
            nearestMob = m;
          }
        }
      }
      if (nearestMob) {
        this.shootPetDarkBolt(this.flyingPet.sprite.x, this.flyingPet.sprite.y, nearestMob);
      }
    }
  }

  private shootPetDarkBolt(x: number, y: number, targetMob: DungeonMob) {
    if (!targetMob || !targetMob.active) return;
    soundEngine.playCast();
    const bolt = this.add.circle(x, y, 7, 0xa855f7, 0.95).setDepth(48);
    const boltGlow = this.add.circle(x, y, 14, 0xc084fc, 0.4).setDepth(47);

    const dist = Phaser.Math.Distance.Between(x, y, targetMob.x, targetMob.y);
    const duration = Math.max(120, (dist / 400) * 1000);

    this.tweens.add({
      targets: [bolt, boltGlow],
      x: targetMob.x,
      y: targetMob.y,
      duration,
      ease: 'Linear',
      onComplete: () => {
        bolt.destroy();
        boltGlow.destroy();
        if (targetMob && targetMob.active) {
          this.damageMob(targetMob, 40, 'magic');
          const pSplash = this.add.circle(targetMob.x, targetMob.y, 22, 0xa855f7, 0.7).setDepth(49);
          this.tweens.add({ targets: pSplash, scale: 2.2, alpha: 0, duration: 250, onComplete: () => pSplash.destroy() });
        }
      }
    });
  }

  private cauldronUsedFree = false;

  // --- 2. MAGIC CAULDRON (SINGLE USE, FLOOR SCALED COST & BALANCED REWARDS) ---
  private buildSafeStartZone(cx: number, cy: number) {
    // 1. Centerpiece: Stone Fireplace & Adventurer's Campfire
    this.add.circle(cx, cy, 26, 0x27272a).setDepth(5).setStrokeStyle(2, 0x52525b);
    const fireCore = this.add.circle(cx, cy, 14, 0xf97316, 0.95).setDepth(6);

    this.tweens.add({
      targets: fireCore,
      scaleX: 1.25,
      scaleY: 1.35,
      alpha: 0.8,
      duration: 350,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Ambient floating sparks
    this.time.addEvent({
      delay: 280,
      repeat: -1,
      callback: () => {
        if (!this.scene.isActive()) return;
        const spark = this.add.circle(cx + (Math.random() - 0.5) * 16, cy, 2, 0xfde047, 0.9).setDepth(20);
        this.tweens.add({
          targets: spark,
          y: spark.y - Phaser.Math.Between(20, 45),
          x: spark.x + (Math.random() - 0.5) * 20,
          alpha: 0,
          scale: 0.3,
          duration: Phaser.Math.Between(500, 800),
          onComplete: () => spark.destroy()
        });
      }
    });

    // Resting logs near campfire
    this.add.rectangle(cx - 36, cy, 12, 38, 0x78350f).setDepth(5).setStrokeStyle(1, 0x92400e);
    this.add.rectangle(cx + 36, cy, 12, 38, 0x78350f).setDepth(5).setStrokeStyle(1, 0x92400e);

    // 2. Alchemist Workstation & Magical Cauldron (Single Use, Rebalanced Floor-Scaled Cost)
    const cX = cx + 110;
    const cY = cy - 20;

    let cauldronIsUsed = false;
    const cauldronCost = 50; // Balanced flat price for all floors

    const cauldron = this.add.image(cX, cY, 'proj_cauldron').setDepth(16).setScale(1.6)
      .setInteractive({ useHandCursor: true });
    const cauldronTween = this.tweens.add({
      targets: cauldron,
      scaleX: 1.75,
      scaleY: 1.75,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    const cauldronLabel = this.add.text(cX, cY + 26, `[ 🧪 ВОЛШЕБНЫЙ КОТЁЛ (${cauldronCost} 🪙) ]`, {
      fontSize: '11px', fontFamily: 'Consolas, monospace', resolution: 2, fontStyle: 'bold', color: '#fef08a'
    }).setOrigin(0.5).setDepth(16).setInteractive({ useHandCursor: true });

    const brewCauldron = () => {
      if (!this.player) return;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, cX, cY);
      if (dist > 240) {
        this.showFloatingNotice('ПОДОЙДИТЕ БЛИЖЕ К КОТЛУ!', '#fbbf24');
        return;
      }

      if (cauldronIsUsed) {
        this.showFloatingNotice('Огонь погас, варево закончилось...', '#94a3b8');
        return;
      }

      if (this.dungeonGold < cauldronCost) {
        this.showFloatingNotice('Недостаточно монет!', '#ef4444');
        return;
      }

      // Deduct cost and mark used
      this.dungeonGold -= cauldronCost;
      this.updateHUD();
      cauldronIsUsed = true;

      // Stop bubbling animation, extinguish fire, tint dark grey
      cauldronTween.stop();
      cauldron.setScale(1.6).setTint(0x475569);
      cauldronLabel.setText('[ 🧪 КОТЁЛ ОСТЫЛ ]').setColor('#64748b');

      soundEngine.playLevelUp();
      const pPuff = this.add.circle(cX, cY, 24, 0xa855f7, 0.85).setDepth(20);
      this.tweens.add({ targets: pPuff, scale: 3.5, alpha: 0, duration: 450, onComplete: () => pPuff.destroy() });

      // Balanced reward pool (Single Buff)
      const roll = Math.random();
      if (roll < 0.25) {
        // 25% chance: Small Fortitude Draught (+5% Max HP)
        this.playerMaxHp = Math.round(this.playerMaxHp * 1.05);
        this.playerHp += Math.round(this.playerMaxHp * 0.05);
        this.updateHUD();
        this.showFloatingNotice('+5% MAX HP (НАСТОЙ СТОЙКОСТИ)! ❤', '#22c55e');
      } else if (roll < 0.45) {
        // 20% chance: Swift Step Potion (+4% Speed)
        this.playerSpeed = Math.round(this.playerSpeed * 1.04);
        this.basePlayerSpeed = this.playerSpeed;
        this.showFloatingNotice('+4% СКОРОСТИ (ЛЕГКАЯ ПОСТУПЬ)! 👟', '#38bdf8');
      } else if (roll < 0.65) {
        // 20% chance: Catacomb Strength Drop (+3% Damage)
        this.damageMultiplier += 0.03;
        this.showFloatingNotice('+3% УРОНА (СИЛА КАТАКОМБ)! ⚔', '#c084fc');
      } else if (roll < 0.85) {
        // 20% chance: Invigorating Steam (Instant heal 25% max HP)
        const healAmt = Math.round(this.playerMaxHp * 0.25);
        this.playerHp = Math.min(this.playerMaxHp, this.playerHp + healAmt);
        this.updateHUD();
        this.showFloatingNotice(`+${healAmt} HP (ЖИВИТЕЛЬНЫЙ ПАР)! ❤`, '#22c55e');
      } else {
        // 15% chance: Alchemist Residue (1.5x refund coins)
        const refund = Math.round(cauldronCost * 1.5);
        this.dungeonGold += refund;
        this.updateHUD();
        this.showFloatingNotice(`+${refund} МОНЕТ (ОСАДОК АЛХИМИКА)! 🪙`, '#facc15');
      }
      CloudSyncManager.saveAllProgress();
    };

    cauldron.on('pointerdown', brewCauldron);
    cauldronLabel.on('pointerdown', brewCauldron);

    this.interactableTargets.push({
      id: 'cauldron',
      x: cX,
      y: cY,
      radius: 140,
      prompt: `🧪 ВАРИТЬ В КОТЛЕ (${cauldronCost} 🪙)`,
      onInteract: brewCauldron,
      active: true
    });

    // 3. Sanctuary Header Banner
    this.add.text(cx, cy - 120, '🛡 БЕЗОПАСНАЯ ЗОНА 🛡', {
      fontSize: '13px', fontFamily: 'Consolas, monospace', resolution: 2, fontStyle: 'bold', color: '#4ade80'
    }).setOrigin(0.5).setDepth(4);
  }

  private createWallLine(x1: number, y1: number, x2: number, y2: number) {
    const dist = Phaser.Math.Distance.Between(x1, y1, x2, y2);
    const steps = Math.max(1, Math.floor(dist / 44));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const wx = Math.round(Phaser.Math.Linear(x1, x2, t));
      const wy = Math.round(Phaser.Math.Linear(y1, y2, t));
      const wall = this.walls.create(wx, wy, 'wall');
      wall.setScale(0.85);
      wall.refreshBody();
      wall.setDepth(25);
    }
  }

  private wallTorches: Phaser.GameObjects.Image[] = [];

  private addWallTorch(x: number, y: number) {
    const rx = Math.round(x);
    const ry = Math.round(y);
    const torch = this.add.image(rx, ry, 'dungeon_torch_1').setDepth(26);
    this.wallTorches.push(torch);
  }

  // --- 2. RECRUITMENT CAMP (SAFE ZONE WITH BONFIRE, PET BAT CAGE & MERCENARY) ---
  private buildRecruitmentCamp(cx: number, cy: number) {
    // Campfire in center
    this.add.image(cx, cy, 'prop_bonfire').setDepth(15).setScale(1.4);
    const fireLight = this.add.circle(cx, cy, 80, 0xf59e0b, 0.25).setDepth(14);
    this.tweens.add({
      targets: fireLight,
      radius: 96,
      alpha: 0.38,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.add.text(cx, cy - 80, '✦ ЛАГЕРЬ ВЕРБОВКИ ✦', {
      fontSize: '13px', fontFamily: 'Consolas, monospace', resolution: 2, fontStyle: 'bold', color: '#38bdf8'
    }).setOrigin(0.5).setDepth(16);

    // Option 1: Bat Pet in Iron Cage (cx - 130, cy)
    const cageX = cx - 130;
    const cageY = cy;
    const cage = this.add.image(cageX, cageY, 'prop_cage').setDepth(16).setScale(1.3).setInteractive({ useHandCursor: true });
    const batInside = this.add.image(cageX, cageY + 2, 'pet_bat').setDepth(15).setScale(1.2);
    this.tweens.add({ targets: batInside, y: cageY - 4, duration: 400, yoyo: true, repeat: -1 });

    const petCost = 150;
    const petLabel = this.add.text(cageX, cageY + 45, `ЛЕТУЧАЯ МЫШЬ (ПИТОМЕЦ)\n[ ${petCost} 🪙 МОНЕТ ]`, {
      fontSize: '10px', fontFamily: 'Consolas, monospace', resolution: 2, fontStyle: 'bold', color: '#c084fc', align: 'center'
    }).setOrigin(0.5).setDepth(16).setInteractive({ useHandCursor: true });

    const recruitPet = () => {
      if (this.flyingPet) {
        this.showFloatingNotice('У ВАС УЖЕ ЕСТЬ АКТИВНЫЙ ПИТОМЕЦ!', '#facc15');
        return;
      }
      if (this.dungeonGold < petCost) {
        this.showFloatingNotice(`НЕДОСТАТОЧНО МОНЕТ! НУЖНО ${petCost} 🪙`, '#ef4444');
        return;
      }
      this.dungeonGold -= petCost;
      this.updateHUD();
      soundEngine.playLevelUp();

      cage.destroy();
      batInside.destroy();
      petLabel.destroy();
      petTarget.active = false;

      const petSprite = this.add.sprite(this.player.x, this.player.y - 30, 'pet_bat').setDepth(52).setScale(1.3);
      this.flyingPet = {
        sprite: petSprite,
        shootTimer: 1000,
        angle: 0
      };

      this.showFloatingNotice('🐾 БОЕВАЯ ЛЕТУЧАЯ МЫШЬ НАНЯТА! АТАКУЕТ ВРАГОВ СГУСТКАМИ ТЬМЫ! 🦇', '#a855f7');
      this.clearInteraction();
      CloudSyncManager.saveAllProgress();
    };

    cage.on('pointerdown', recruitPet);
    petLabel.on('pointerdown', recruitPet);

    const petTarget: DungeonInteractable = {
      id: 'recruit_pet_bat',
      x: cageX,
      y: cageY,
      radius: 140,
      prompt: `🐾 ОСВОБОДИТЬ / НАНЯТЬ ПИТОМЦА: ${petCost} 🪙`,
      onInteract: recruitPet,
      active: true
    };
    this.interactableTargets.push(petTarget);

    // Option 2: Mercenary Ally near campfire (cx + 130, cy)
    const mercX = cx + 130;
    const mercY = cy;
    const mercSprite = this.add.image(mercX, mercY - 4, 'ally_mercenary').setDepth(16).setScale(1.3).setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: mercSprite, y: mercY - 8, duration: 600, yoyo: true, repeat: -1 });

    const mercCost = 60;
    const mercLabel = this.add.text(mercX, mercY + 45, `ПЛЕННЫЙ НАЕМНИК\n[ ${mercCost} 🪙 МОНЕТ ]`, {
      fontSize: '10px', fontFamily: 'Consolas, monospace', resolution: 2, fontStyle: 'bold', color: '#facc15', align: 'center'
    }).setOrigin(0.5).setDepth(16).setInteractive({ useHandCursor: true });

    const recruitMerc = () => {
      if (this.dungeonGold < mercCost) {
        this.showFloatingNotice(`НЕДОСТАТОЧНО МОНЕТ! НУЖНО ${mercCost} 🪙`, '#ef4444');
        return;
      }
      this.dungeonGold -= mercCost;
      this.updateHUD();

      mercSprite.destroy();
      mercLabel.destroy();
      mercTarget.active = false;

      this.hireMercenaryAlly();
      this.showFloatingNotice('⚔️ ПЛЕННЫЙ НАЕМНИК ПРИСОЕДИНИЛСЯ К ВАМ И ТАНЧИТ УРОН! 🛡️', '#4ade80');
      this.clearInteraction();
      CloudSyncManager.saveAllProgress();
    };

    mercSprite.on('pointerdown', recruitMerc);
    mercLabel.on('pointerdown', recruitMerc);

    const mercTarget: DungeonInteractable = {
      id: 'recruit_mercenary',
      x: mercX,
      y: mercY,
      radius: 140,
      prompt: `⚔️ НАНЯТЬ НАЕМНИКА: ${mercCost} 🪙`,
      onInteract: recruitMerc,
      active: true
    };
    this.interactableTargets.push(mercTarget);
  }

  private hireMercenaryAlly(carryHp?: number) {
    if (this.companion) {
      this.companion.sprite.destroy();
      this.companion.hpBar.destroy();
      this.companion.hpBarBg.destroy();
      this.companion.nameText.destroy();
    }
    soundEngine.playLevelUp();

    const maxHp = 500;
    const initialHp = carryHp !== undefined ? Math.max(50, carryHp) : maxHp;
    const dmg = 40;
    const speed = 230;

    const compSprite = this.physics.add.sprite(this.player.x + 35, this.player.y + 35, 'ally_mercenary').setDepth(48).setScale(1.2);
    compSprite.setCollideWorldBounds(true);
    this.physics.add.collider(compSprite, this.walls);

    const hpBg = this.add.rectangle(compSprite.x, compSprite.y - 26, 38, 5, 0x000000).setDepth(49);
    const hpBar = this.add.rectangle(compSprite.x - 18, compSprite.y - 26, 36, 3, 0x38bdf8).setOrigin(0, 0.5).setDepth(50);
    const nameTxt = this.add.text(compSprite.x, compSprite.y - 34, 'НАЕМНИК', {
      fontSize: '9px', fontFamily: 'Consolas, monospace', resolution: 2, fontStyle: 'bold', color: '#38bdf8'
    }).setOrigin(0.5).setDepth(50);

    this.companion = {
      sprite: compSprite,
      name: 'НАЕМНИК',
      type: 'knight',
      hp: initialHp,
      maxHp,
      damage: dmg,
      speed,
      attackCd: 0,
      hpBarBg: hpBg,
      hpBar,
      nameText: nameTxt
    };
  }

  // --- 3. BLACK MARKET (CRIMSON HALL, BLOOD ALTAR, PURPLE CANDLES, -300 HP RELICS) ---
  private buildBlackMarket(cx: number, cy: number) {
    const altar = this.add.image(cx, cy, 'blood_altar').setDepth(16).setScale(1.6).setInteractive({ useHandCursor: true });
    this.tweens.add({
      targets: altar,
      scaleX: 1.66,
      scaleY: 1.66,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    const candleCoords = [
      { x: cx - 70, y: cy - 45 },
      { x: cx + 70, y: cy - 45 },
      { x: cx - 70, y: cy + 45 },
      { x: cx + 70, y: cy + 45 }
    ];
    candleCoords.forEach(pt => {
      this.add.image(pt.x, pt.y, 'purple_candle').setDepth(15).setScale(1.2);
      const glow = this.add.circle(pt.x, pt.y - 10, 24, 0xa855f7, 0.25).setDepth(14);
      this.tweens.add({
        targets: glow,
        radius: 30,
        alpha: 0.45,
        duration: 400 + Math.random() * 200,
        yoyo: true,
        repeat: -1
      });
    });

    const label = this.add.text(cx, cy + 50, '[ 🩸 КРОВАВЫЙ АЛТАРЬ ЧЁРНОГО РЫНКА ]', {
      fontSize: '11px', fontFamily: 'Consolas, monospace', resolution: 2, fontStyle: 'bold', color: '#ef4444'
    }).setOrigin(0.5).setDepth(16).setInteractive({ useHandCursor: true });

    const openBM = () => {
      this.openBlackMarketModal();
    };

    altar.on('pointerdown', openBM);
    label.on('pointerdown', openBM);

    this.interactableTargets.push({
      id: 'black_market_room_altar',
      x: cx,
      y: cy,
      radius: 150,
      prompt: '🩸 КРОВАВЫЙ АЛТАРЬ (ЧЁРНЫЙ РЫНОК)',
      onInteract: openBM,
      active: true
    });
  }

  private openBlackMarketModal() {
    if (this.isBlackMarketOpen) return;
    this.isBlackMarketOpen = true;
    if (this.player && this.player.body) this.player.setVelocity(0, 0);
    this.clearInteraction();
    soundEngine.playClick();

    showHTMLBlackMarketModal({
      scene: this,
      onClose: () => {
        this.isBlackMarketOpen = false;
        if (this.input) this.input.enabled = true;
        if (this.input?.keyboard) this.input.keyboard.enabled = true;
      }
    });
  }

  // --- 4. DUNGEON SHOP (GOBLIN TRADER WITH COUNTER & LANTERN, POTIONS & SHIELD SCROLL) ---
  private buildShopRoom(cx: number, cy: number) {
    const shopRes = Math.max(window.devicePixelRatio || 1, 3);
    const roundedCX = Math.round(cx);
    const roundedCY = Math.round(cy);

    this.add.image(roundedCX, roundedCY - 80, 'dungeon_shopkeeper').setDepth(16).setScale(1.5);
    
    // Crisp Header Badge
    const shopHeaderBg = this.add.rectangle(roundedCX, roundedCY - 40, 200, 22, 0x0f172a, 0.95)
      .setStrokeStyle(1.5, 0xc084fc).setDepth(16);
    this.add.text(roundedCX, roundedCY - 40, '✦ ПОХОДНЫЙ ТОРГОВЕЦ ✦', {
      fontSize: '11px', fontFamily: '"VT323", "Courier New", Consolas, monospace', fontStyle: 'bold', color: '#e9d5ff'
    }).setOrigin(0.5).setDepth(17).setResolution(shopRes);

    const items = [
      {
        id: 'potion_hp',
        name: 'ЗЕЛЬЕ ИСЦЕЛЕНИЯ (+50% HP)',
        cost: 75,
        icon: 'potion_hp',
        x: roundedCX - 130,
        onBuy: () => {
          const heal = Math.round(this.playerMaxHp * 0.5);
          this.playerHp = Math.min(this.playerMaxHp, this.playerHp + heal);
          this.updateHUD();
          this.showFloatingNotice(`+${heal} HP ВОССТАНОВЛЕНО! ❤`, '#4ade80');
        }
      },
      {
        id: 'sphere_power',
        name: 'СФЕРА СИЛЫ (+15% УРОНА)',
        cost: 120,
        icon: 'relic_damage',
        x: roundedCX,
        onBuy: () => {
          this.damageMultiplier += 0.15;
          this.showFloatingNotice('+15% К УРОНУ НА ЭТАЖ! 🔥', '#f59e0b');
        }
      },
      {
        id: 'shield_scroll',
        name: 'ЗАЩИТНЫЙ СВИТОК (ЩИТ)',
        cost: 95,
        icon: 'potion_energy',
        x: roundedCX + 130,
        onBuy: () => {
          this.shieldScrollActive = true;
          if (!this.shieldScrollVisual) {
            this.shieldScrollVisual = this.add.circle(this.player.x, this.player.y, 44, 0x38bdf8, 0.35).setDepth(52);
            this.tweens.add({ targets: this.shieldScrollVisual, scale: 1.15, alpha: 0.55, duration: 600, yoyo: true, repeat: -1 });
          }
          this.showFloatingNotice('🛡 ОДНОРАЗОВЫЙ ЗАЩИТНЫЙ ЩИТ АКТИВИРОВАН!', '#38bdf8');
        }
      }
    ];

    items.forEach(it => {
      const ix = Math.round(it.x);
      const iy = Math.round(roundedCY + 20);

      const itemBg = this.add.rectangle(ix, iy, 72, 72, 0x0f172a, 0.95).setStrokeStyle(2, 0xfacc15).setDepth(15).setInteractive({ useHandCursor: true });
      const icon = this.add.image(ix, iy - 6, it.icon).setDepth(16).setScale(1.4).setInteractive({ useHandCursor: true });

      this.tweens.add({
        targets: icon,
        y: '-=4',
        duration: 650,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      // Sharp Crisp Label with solid backing plate
      const labelCard = this.add.rectangle(ix, iy + 48, 118, 30, 0x020617, 0.92).setStrokeStyle(1, 0xfacc15).setDepth(16);
      const label = this.add.text(ix, iy + 48, `${it.name}\n[ ${it.cost} 🪙 МОНЕТ ]`, {
        fontSize: '9px', fontFamily: 'Consolas, "Courier New", monospace', fontStyle: 'bold', color: '#fef08a', align: 'center', wordWrap: { width: 114 }
      }).setOrigin(0.5).setDepth(17).setResolution(shopRes).setInteractive({ useHandCursor: true });

      const shopTarget = {
        id: `shop_${it.id}`,
        x: ix,
        y: iy,
        radius: 180,
        prompt: `💰 КУПИТЬ: ${it.name} (${it.cost} 🪙)`,
        onInteract: () => {
          if (this.dungeonGold < it.cost) {
            this.showFloatingNotice(`НЕДОСТАТОЧНО МОНЕТ! НУЖНО ${it.cost} 🪙`, '#ef4444');
            return;
          }
          this.dungeonGold -= it.cost;
          this.updateHUD();
          soundEngine.playLevelUp();
          it.onBuy();
          shopTarget.active = false;
          itemBg.destroy();
          icon.destroy();
          labelCard.destroy();
          label.destroy();
          this.clearInteraction();
          CloudSyncManager.saveAllProgress();
        },
        active: true
      };

      this.interactableTargets.push(shopTarget);
      itemBg.on('pointerdown', shopTarget.onInteract);
      icon.on('pointerdown', shopTarget.onInteract);
      label.on('pointerdown', shopTarget.onInteract);
    });
  }

  // --- 5. TREASURE & SHRINE ROOM (SPIKE TRAP CHEST OR ANCIENT SHRINE OF POWER) ---
  private buildTreasureShrineRoom(cx: number, cy: number) {
    const isShrine = Math.random() < 0.5;

    if (isShrine) {
      const shrine = this.add.image(cx, cy, 'shrine_power').setDepth(16).setScale(1.5).setInteractive({ useHandCursor: true });
      this.tweens.add({
        targets: shrine,
        y: cy - 4,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      const label = this.add.text(cx, cy + 48, '[ ДРЕВНИЙ АЛТАРЬ СИЛЫ ]', {
        fontSize: '11px', fontFamily: 'Consolas, monospace', resolution: 2, fontStyle: 'bold', color: '#38bdf8'
      }).setOrigin(0.5).setDepth(16).setInteractive({ useHandCursor: true });

      const prayShrine = () => {
        if (!shrine.active) return;
        soundEngine.playLevelUp();
        const roll = Math.random();
        if (roll < 0.5) {
          this.playerSpeed = Math.round(this.playerSpeed * 1.25);
          this.basePlayerSpeed = this.playerSpeed;
          this.showFloatingNotice('✨ БЛАГОСЛОВЕНИЕ ВЕТРА: +25% СКОРОСТИ БЕГА! 👟', '#38bdf8');
        } else {
          this.damageMultiplier += 0.20;
          this.showFloatingNotice('✨ БЛАГОСЛОВЕНИЕ СИЛЫ: +20% К УРОНУ И КРИТУ! ⚔️', '#facc15');
        }
        shrine.setTint(0x64748b);
        label.setText('[ АЛТАРЬ ИСТОЩЕН ]').setColor('#64748b');
        target.active = false;
        this.clearInteraction();
        CloudSyncManager.saveAllProgress();
      };

      shrine.on('pointerdown', prayShrine);
      label.on('pointerdown', prayShrine);

      const target: DungeonInteractable = {
        id: 'shrine_power_target',
        x: cx,
        y: cy,
        radius: 140,
        prompt: '✨ ПОМОЛИТЬСЯ У АЛТАРЯ СИЛЫ',
        onInteract: prayShrine,
        active: true
      };
      this.interactableTargets.push(target);
    } else {
      const chest = this.physics.add.sprite(cx, cy, 'gold_chest').setDepth(16).setScale(1.4).setInteractive({ useHandCursor: true });
      const chestLabel = this.add.text(cx, cy + 34, '[ ЗОЛОТОЙ СУНДУК СОКРОВИЩ ]', {
        fontSize: '11px', fontFamily: 'Consolas, monospace', resolution: 2, fontStyle: 'bold', color: '#facc15'
      }).setOrigin(0.5).setDepth(16);

      const openChest = () => {
        if (!chest.active) return;
        chest.destroy();
        chestLabel.destroy();
        soundEngine.playLevelUp();

        const skulls = Phaser.Math.Between(15, 25);
        this.dungeonGold += skulls;
        this.updateHUD();

        this.showFloatingNotice(`СОКРОВИЩА: +${skulls} 🪙 МОНЕТ!`, '#facc15');
        target.active = false;
        this.interactableTargets = this.interactableTargets.filter(t => t !== target && t.id !== 'gold_treasure_chest');
        this.clearInteraction();
      };

      chest.on('pointerdown', openChest);

      const target: DungeonInteractable = {
        id: 'gold_treasure_chest',
        x: cx,
        y: cy,
        radius: 120,
        prompt: '🎁 ОТКРЫТЬ ЗОЛОТОЙ СУНДУК',
        onInteract: openChest,
        active: true
      };
      this.interactableTargets.push(target);
    }
  }

  // --- 6. MINI-BOSS ARENA (PILLARS) ---
  private buildMiniBossRoom(cx: number, cy: number) {
    this.spawnDestructibleProp(cx - 200, cy - 140, 'pillar');
    this.spawnDestructibleProp(cx + 200, cy - 140, 'pillar');
    this.spawnDestructibleProp(cx - 200, cy + 140, 'pillar');
    this.spawnDestructibleProp(cx + 200, cy + 140, 'pillar');
  }

  // --- 7. FINAL BOSS ARENA ("САНКТУАРИЙ МЕХАНИЗМОВ") ---
  private buildBossRoom(cx: number, cy: number) {
    this.bossCoverPillars = [];

    // 1. Polished Black Obsidian Floor (1100x700 px)
    const floorTile = this.add.rectangle(cx, cy, 1100, 700, 0x0b0f19).setDepth(1);
    floorTile.setStrokeStyle(4, 0x78350f);

    // Golden Magic-Engineering Circle in Center
    const circleGfx = this.add.graphics().setDepth(2);
    circleGfx.lineStyle(3, 0xfacc15, 0.85);
    circleGfx.strokeCircle(cx, cy, 210);
    circleGfx.lineStyle(2, 0x38bdf8, 0.7);
    circleGfx.strokeCircle(cx, cy, 140);
    circleGfx.lineStyle(1.5, 0xfacc15, 0.6);
    circleGfx.strokeRect(cx - 100, cy - 100, 200, 200);

    // 2. Copper Floor Grates with Cyclic Steam Jets
    const grates = [
      { x: cx - 180, y: cy - 120 },
      { x: cx + 180, y: cy - 120 },
      { x: cx - 180, y: cy + 120 },
      { x: cx + 180, y: cy + 120 }
    ];

    grates.forEach(g => {
      const grate = this.add.rectangle(g.x, g.y, 48, 48, 0x78350f).setDepth(3).setStrokeStyle(2, 0xb45309);
      // Periodical steam jet event
      this.time.addEvent({
        delay: Phaser.Math.Between(2500, 4000),
        loop: true,
        callback: () => {
          if (!this.scene.isActive()) return;
          const steam = this.add.circle(g.x, g.y, 18, 0xe2e8f0, 0.75).setDepth(20);
          this.tweens.add({
            targets: steam,
            scale: 2.2,
            alpha: 0,
            y: g.y - 30,
            duration: 500,
            onComplete: () => steam.destroy()
          });
        }
      });
    });

    // 3. Titanic Background Wall Gears
    const gearPositions = [
      { x: cx - 480, y: cy - 280, scale: 2.2 },
      { x: cx + 480, y: cy - 280, scale: 2.2 },
      { x: cx - 480, y: cy + 280, scale: 2.2 },
      { x: cx + 480, y: cy + 280, scale: 2.2 }
    ];

    gearPositions.forEach(gp => {
      const gear = this.add.image(gp.x, gp.y, 'gear_projectile').setDepth(4).setScale(gp.scale).setAlpha(0.65);
      this.tweens.add({
        targets: gear,
        angle: 360,
        repeat: -1,
        duration: 20000
      });
    });

    // 4. Corner Energy Generators with Pulsing Blue Spheres
    const genPositions = [
      { x: cx - 450, y: cy - 270 },
      { x: cx + 450, y: cy - 270 },
      { x: cx - 450, y: cy + 270 },
      { x: cx + 450, y: cy + 270 }
    ];

    genPositions.forEach(gp => {
      const genBase = this.add.rectangle(gp.x, gp.y, 52, 52, 0x1e293b).setDepth(5).setStrokeStyle(2, 0x38bdf8);
      const orb = this.add.circle(gp.x, gp.y, 16, 0x38bdf8, 0.85).setDepth(6);
      this.tweens.add({
        targets: orb,
        scale: 1.35,
        alpha: 0.4,
        duration: 700,
        yoyo: true,
        repeat: -1
      });
    });

    // 5. Heavy Bronze Cover Pillars with Rivets
    const pillarPositions = [
      { x: cx - 260, y: cy - 180 },
      { x: cx + 260, y: cy - 180 },
      { x: cx - 260, y: cy + 180 },
      { x: cx + 260, y: cy + 180 }
    ];

    pillarPositions.forEach(pp => {
      const pillarRect = this.add.rectangle(pp.x, pp.y, 56, 90, 0x78350f).setDepth(20).setStrokeStyle(3, 0xb45309);
      this.physics.add.existing(pillarRect, true);
      this.bossCoverPillars.push(pillarRect);

      this.physics.add.collider(this.player, pillarRect);
      if (this.mobsGroup) this.physics.add.collider(this.mobsGroup, pillarRect);
    });

    this.addWallTorch(cx - 150, cy - 280);
    this.addWallTorch(cx + 150, cy - 280);
    this.addWallTorch(cx - 150, cy + 280);
    this.addWallTorch(cx + 150, cy + 280);
  }

  // --- PROCEDURAL COMBAT REWARD CHEST ---
  private spawnCombatRewardChest(cx: number, cy: number) {
    const chest = this.physics.add.sprite(cx, cy, 'gold_chest').setDepth(16).setScale(1.3).setInteractive({ useHandCursor: true });
    this.tweens.add({
      targets: chest,
      y: cy - 6,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    const chestLabel = this.add.text(cx, cy + 34, '[ СУНДУК С НАГРАДОЙ ]', {
      fontSize: '11px', fontFamily: 'Consolas, monospace', resolution: 2, fontStyle: 'bold', color: '#facc15'
    }).setOrigin(0.5).setDepth(16);

    const onOpen = () => {
      if (!chest.active) return;
      chest.destroy();
      chestLabel.destroy();
      soundEngine.playLevelUp();

      const skulls = Phaser.Math.Between(5, 12);
      this.dungeonGold += skulls;
      this.updateHUD();

      this.showFloatingNotice(`НАГРАДА: +${skulls} 🪙 МОНЕТ!`, '#4ade80');
      target.active = false;
      this.interactableTargets = this.interactableTargets.filter(t => t !== target && t.id !== target.id);
      this.clearInteraction();
    };

    const target: DungeonInteractable = {
      id: `combat_chest_${cx}_${cy}`,
      x: cx,
      y: cy,
      radius: 120,
      prompt: '🎁 ОТКРЫТЬ СУНДУК С НАГРАДОЙ',
      onInteract: onOpen,
      active: true
    };
    this.interactableTargets.push(target);
    chest.on('pointerdown', onOpen);
  }

  // --- GOLDEN VICTORY PORTAL ---
  private buildVictoryPortal(cx: number, cy: number) {
    const portal = this.add.image(cx, cy, 'gold_chest_open').setDepth(16).setScale(1.8).setInteractive({ useHandCursor: true });
    const glow = this.add.circle(cx, cy, 60, 0xfacc15, 0.4).setDepth(15);
    this.tweens.add({
      targets: glow,
      scale: 1.5,
      alpha: 0.1,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    const portalLabel = this.add.text(cx, cy + 45, '★ ПОРТАЛ ВЕЛИКОЙ ПОБЕДЫ ★', {
      fontSize: '13px', fontFamily: 'Consolas, monospace', resolution: 2, fontStyle: 'bold', color: '#facc15'
    }).setOrigin(0.5).setDepth(16).setInteractive({ useHandCursor: true });

    const enterVictory = () => {
      soundEngine.playLevelUp();
      this.showVictoryScreen();
    };

    portal.on('pointerdown', enterVictory);
    portalLabel.on('pointerdown', enterVictory);

    this.interactableTargets.push({
      id: 'final_victory_portal',
      x: cx,
      y: cy,
      radius: 180,
      prompt: '👑 ВОЙТИ В ЗОЛОТОЙ ПОРТАЛ ПОБЕДЫ',
      onInteract: enterVictory,
      active: true
    });
  }

  // --- 8. LEVEL PASSAGE / PORTAL ROOM (DESCENT TO NEXT FLOOR) ---
  private buildLevelPortal(cx: number, cy: number) {
    const portal = this.add.image(cx, cy, 'dungeon_portal_active').setDepth(16).setScale(1.5).setInteractive({ useHandCursor: true });
    this.tweens.add({
      targets: portal,
      angle: 360,
      duration: 6000,
      repeat: -1
    });

    const glow = this.add.circle(cx, cy, 52, 0x38bdf8, 0.35).setDepth(15);
    this.tweens.add({
      targets: glow,
      scale: 1.4,
      alpha: 0.15,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    const portalLabel = this.add.text(cx, cy + 45, '🌀 ПЕРЕХОД НА СЛЕДУЮЩИЙ ЭТАЖ', {
      fontSize: '12px', fontFamily: 'Consolas, monospace', resolution: 2, fontStyle: 'bold', color: '#38bdf8'
    }).setOrigin(0.5).setDepth(16).setInteractive({ useHandCursor: true });

    const enterPortal = () => {
      this.descendToNextFloor();
    };

    portal.on('pointerdown', enterPortal);
    portalLabel.on('pointerdown', enterPortal);

    this.interactableTargets.push({
      id: `level_portal_${cx}_${cy}`,
      x: cx,
      y: cy,
      radius: 140,
      prompt: '🌀 СПУСТИТЬСЯ НА СЛЕДУЮЩИЙ ЭТАЖ',
      onInteract: enterPortal,
      active: true
    });
  }

  private descendToNextFloor() {
    if (this.isDescending) return;
    this.isDescending = true;

    // Bulletproof anti-multi-click: disable input and clear interactives immediately!
    this.clearInteraction();
    this.interactableTargets = [];
    this.joyStickPointerId = null;
    this.aimJoyPointerId = null;
    this.skillAimPointerId = null;
    this.joyStickVector.set(0, 0);
    this.aimJoyVector.set(0, 0);
    this.skillAimVector.set(0, 0);
    if (this.player && this.player.body) this.player.setVelocity(0, 0);

    soundEngine.playLevelUp();
    this.cameras.main.fadeOut(350, 0, 0, 0);
    this.time.delayedCall(380, () => {
      if (this.input) {
        this.input.enabled = true;
        if (this.input.keyboard) this.input.keyboard.enabled = true;
      }
      this.joyStickPointerId = null;
      this.aimJoyPointerId = null;
      this.skillAimPointerId = null;
      this.joyStickVector.set(0, 0);
      this.aimJoyVector.set(0, 0);
      this.skillAimVector.set(0, 0);
      this.isDescending = false;
      this.scene.restart({
        selectedHeroKey: this.selectedHeroKey,
        mode: this.mode,
        roomCode: this.roomCode,
        floor: this.currentFloor + 1,
        carryGold: this.dungeonGold,
        carryHp: Math.min(this.playerMaxHp, Math.max(1, this.playerHp)),
        carryMaxHp: this.playerMaxHp,
        carryPet: !!this.flyingPet,
        carryCompanion: this.companion && this.companion.sprite && this.companion.sprite.active ? { hp: this.companion.hp, maxHp: this.companion.maxHp, name: this.companion.name } : null,
        weaponSlot1Id: this.weapons[0]?.id,
        weaponSlot2Id: this.weapons[1]?.id,
        currentWeaponId: this.currentWeapon.id,
        appliedUpgrades: this.appliedUpgradeCards,
        miniBossFloor: this.miniBossFloor
      });
      CloudSyncManager.saveAllProgress();
    });
  }

  // --- ROOM TRIGGERS & COMBAT LOCKS ---
  private checkRoomTriggers() {
    const px = this.player.x;
    const py = this.player.y;

    for (const room of this.rooms) {
      if (Math.abs(px - room.worldX) < room.w / 2 && Math.abs(py - room.worldY) < room.h / 2) {
        if (!room.visited) {
          room.visited = true;
          this.updateMinimap();
        }

        if (this.currentRoomId !== room.id) {
          this.currentRoomId = room.id;
          this.updateMinimap();
        }

        if (!room.cleared && !room.active) {
          this.startRoomBattle(room);
        }
        break;
      }
    }
  }

  private startRoomBattle(room: GridRoom) {
    room.active = true;
    soundEngine.playExplosion();

    this.showFloatingNotice(`⚠ ${room.name}: ВОРОТА ЗАБЛОКИРОВАНЫ! ⚠`, '#ef4444');
    this.closeRoomDoors(room);

    // Teleport companion inside room if far away
    if (this.companion && this.companion.sprite && this.companion.sprite.active) {
      if (Phaser.Math.Distance.Between(this.companion.sprite.x, this.companion.sprite.y, room.worldX, room.worldY) > room.w / 2) {
        this.companion.sprite.setPosition(room.worldX - 40, room.worldY);
      }
    }

    if (room.type === 'combat') {
      soundEngine.setDungeonMusicState('combat');
      // Dynamic enemy pool that unlocks tougher and deadlier enemies on deeper floors!
      const basePool: Array<{ type: DungeonMob['mobType']; tex: string; hp: number; spd: number; dmg: number }> = [
        { type: 'skeleton', tex: 'mob_skeleton', hp: 160, spd: 130, dmg: 28 },
        { type: 'zombie', tex: 'mob_zombie', hp: 230, spd: 90, dmg: 34 },
        { type: 'bat', tex: 'mob_bat', hp: 95, spd: 185, dmg: 22 },
        { type: 'bubble_spitter', tex: 'mob_slime', hp: 175, spd: 80, dmg: 28 },
        { type: 'mage', tex: 'mob_mage', hp: 110, spd: 105, dmg: 25 },
      ];

      // Floor 2+: Shadow Cultists, Webslinging Spiders, Stone Gargoyles
      if (this.currentFloor >= 2) {
        basePool.push({ type: 'cultist', tex: 'mob_cultist', hp: 210, spd: 115, dmg: 35 });
        basePool.push({ type: 'spider', tex: 'mob_spider', hp: 140, spd: 165, dmg: 24 });
        basePool.push({ type: 'gargoyle', tex: 'mob_gargoyle', hp: 260, spd: 150, dmg: 38 });
      }

      // Floor 3+: Dangerous Hook/Cleaver Butchers, Toxic Hydras, Rune Golems
      if (this.currentFloor >= 3) {
        basePool.push({ type: 'butcher', tex: 'boss_butcher', hp: 520, spd: 125, dmg: 55 });
        basePool.push({ type: 'toxic_hydra', tex: 'mob_toxic_hydra', hp: 290, spd: 100, dmg: 38 });
        basePool.push({ type: 'golem', tex: 'mob_golem', hp: 480, spd: 85, dmg: 55 });
      }

      // Floor 4+: Shadow Stalkers (Invis Backstabbers), Shield Knights, Dark Necromancers
      if (this.currentFloor >= 4) {
        basePool.push({ type: 'shadow_stalker', tex: 'mob_shadow_stalker', hp: 220, spd: 210, dmg: 48 });
        basePool.push({ type: 'shield_knight', tex: 'mob_shield_knight', hp: 420, spd: 120, dmg: 42 });
        basePool.push({ type: 'necromancer', tex: 'mob_necromancer', hp: 240, spd: 95, dmg: 32 });
      }

      // Deeper floors scale with more aggressive mob counts!
      const totalMobCount = Math.max(room.mobCount, 4 + Math.round(this.currentFloor * 1.6) + (this.currentFloor >= 4 ? 2 : 0));
      for (let i = 0; i < totalMobCount; i++) {
        const ox = (Math.random() - 0.5) * (room.w - 180);
        const oy = (Math.random() - 0.5) * (room.h - 180);

        const chosen = Phaser.Utils.Array.GetRandom(basePool);
        const hp = Math.round(chosen.hp * (1 + (this.currentFloor - 1) * 0.28));
        const dmg = Math.round(chosen.dmg * (1 + (this.currentFloor - 1) * 0.22));

        this.spawnMob(Math.round(room.worldX + ox), Math.round(room.worldY + oy), chosen.type as any, chosen.tex, hp, chosen.spd, dmg, room.id);
      }
    } else if (room.type === 'miniboss') {
      soundEngine.setDungeonMusicState('boss');
      this.spawnMiniBoss(Math.round(room.worldX), Math.round(room.worldY - 20), room.id);
    } else if (room.type === 'boss') {
      soundEngine.setDungeonMusicState('boss');
      if (this.currentFloor === 7 || this.currentFloor === this.maxFloors) {
        this.spawnMechaDragonBoss(Math.round(room.worldX), Math.round(room.worldY - 30), room.id);
      } else {
        this.spawnCursedKnightBoss(Math.round(room.worldX), Math.round(room.worldY - 30), room.id);
      }
    }
  }

  private spawnMechaDragonBoss(x: number, y: number, roomId: number) {
    this.mechaDragonBoss = new MechaDragonBoss(this, x, y, roomId);

    const bossMob = this.mechaDragonBoss.sprite as DungeonMob;
    bossMob.hp = 15000;
    bossMob.maxHp = 15000;
    bossMob.mobType = 'mecha_dragon' as any;
    bossMob.speed = 220;
    bossMob.damage = 180;
    bossMob.attackCd = 0;
    bossMob.roomId = roomId;
    (bossMob as any).mechaBossRef = this.mechaDragonBoss;

    if (bossMob.body) {
      bossMob.body.setSize(110, 90);
    }

    this.physics.add.collider(bossMob, this.walls);
    this.bossMob = bossMob;
    this.mobs.push(bossMob);
    if (this.mobsGroup) this.mobsGroup.add(bossMob);

    if (this.bossHpContainer) this.bossHpContainer.setVisible(true);
    if (this.bossHpText) this.bossHpText.setText('ВАЛГАРТ, СТАЛЬНОЙ ВЛАДЫКА БЕЗДНЫ [15000 / 15000]');
    if (this.bossHpFill && typeof this.bossHpFill.setDisplaySize === 'function') {
      this.bossHpFill.setDisplaySize(320, 16);
      this.bossHpFill.setFillStyle(0xef4444);
    }
    if (this.domHud) {
      this.domHud.showBossBar(true, 'ВАЛГАРТ, СТАЛЬНОЙ ВЛАДЫКА БЕЗДНЫ', 15000, 15000);
    }
    soundEngine.playExplosion();
    this.showFloatingNotice('🐉 ФИНАЛЬНЫЙ БОСС: ВАЛГАРТ, СТАЛЬНОЙ ВЛАДЫКА БЕЗДНЫ! 🐉', '#ef4444');
  }

  private closeRoomDoors(room: GridRoom) {
    this.doorsGroup.clear(true, true);
    const cx = room.worldX;
    const cy = room.worldY;
    const halfW = room.w / 2;
    const halfH = room.h / 2;

    if (room.connections.north !== undefined) {
      const door = this.doorsGroup.create(cx, cy - halfH, 'dungeon_door_closed').setDepth(25).setScale(1.2);
      door.refreshBody();
    }
    if (room.connections.south !== undefined) {
      const door = this.doorsGroup.create(cx, cy + halfH, 'dungeon_door_closed').setDepth(25).setScale(1.2);
      door.refreshBody();
    }
    if (room.connections.west !== undefined) {
      const door = this.doorsGroup.create(cx - halfW, cy, 'dungeon_door_closed').setDepth(25).setScale(1.2);
      door.refreshBody();
    }
    if (room.connections.east !== undefined) {
      const door = this.doorsGroup.create(cx + halfW, cy, 'dungeon_door_closed').setDepth(25).setScale(1.2);
      door.refreshBody();
    }
  }

  private spawnMob(
    x: number, y: number,
    mobType: DungeonMob['mobType'],
    tex: string, hp: number, speed: number, damage: number, roomId: number
  ) {
    const mob = this.physics.add.sprite(Math.round(x), Math.round(y), tex) as DungeonMob;
    mob.setCollideWorldBounds(true);
    mob.hp = hp;
    mob.maxHp = hp;
    mob.mobType = mobType as any;
    mob.speed = speed;
    mob.damage = damage;
    mob.attackCd = 0;
    mob.roomId = roomId;
    mob.setDepth(40);
    mob.setScale(mobType === 'golem' ? 1.5 : (mobType === 'jaw_beast' ? 1.35 : (mobType === 'butcher' ? 1.4 : (mobType === 'shield_knight' ? 1.35 : 1.25))));

    // HP Bar directly tied to Mob Sprite
    const hpBg = this.add.rectangle(Math.round(x), Math.round(y - 24), 34, 4, 0x000000).setDepth(41);
    const hpBar = this.add.rectangle(Math.round(x - 16), Math.round(y - 24), 32, 3, 0xef4444).setOrigin(0, 0.5).setDepth(42);
    mob.hpBarBg = hpBg;
    mob.hpBar = hpBar;

    this.physics.add.collider(mob, this.walls);
    this.mobs.push(mob);
    if (this.mobsGroup) this.mobsGroup.add(mob);
  }

  private spawnMiniBoss(x: number, y: number, roomId: number) {
    const roll = Math.random();
    let mobType = 'miniboss_bone_golem';
    let tex = 'boss_bone_golem';
    let name = 'КОСТЯНОЙ ГОЛЕМ';
    let hp = 2100;
    let speed = 155;
    let damage = 20;

    if (roll < 0.33) {
      mobType = 'miniboss_bone_golem';
      tex = 'boss_bone_golem';
      name = 'КОСТЯНОЙ ГОЛЕМ';
      hp = 2100;
      speed = 155;
      damage = 20;
    } else if (roll < 0.66) {
      mobType = 'miniboss_executioner';
      tex = 'boss_executioner';
      name = 'ПАЛАЧ КАТАКОМБ';
      hp = 1900;
      speed = 170;
      damage = 22;
    } else {
      mobType = 'miniboss_butcher';
      tex = 'boss_butcher';
      name = 'МЯСНИК КАТАКОМБ';
      hp = 2300;
      speed = 160;
      damage = 22;
    }

    hp = Math.round(hp * (1 + (this.currentFloor - 1) * 0.12));

    const boss = this.physics.add.sprite(Math.round(x), Math.round(y), tex) as DungeonMob;
    boss.setCollideWorldBounds(true);
    boss.hp = hp;
    boss.maxHp = hp;
    boss.mobType = mobType as any;
    boss.speed = speed;
    boss.damage = damage;
    boss.attackCd = 0;
    boss.roomId = roomId;
    boss.setDepth(40);
    boss.setScale(1.75);
    boss.bossState = 'idle';
    boss.bossAttackTimer = 1800;
    boss.leapCooldown = 8000;

    const hpBg = this.add.rectangle(Math.round(x), Math.round(y - 46), 66, 7, 0x000000).setDepth(41);
    const hpBar = this.add.rectangle(Math.round(x - 32), Math.round(y - 46), 64, 5, 0xf59e0b).setOrigin(0, 0.5).setDepth(42);
    boss.hpBarBg = hpBg;
    boss.hpBar = hpBar;

    this.physics.add.collider(boss, this.walls);
    this.bossMob = boss;
    this.mobs.push(boss);
    if (this.mobsGroup) this.mobsGroup.add(boss);

    if (this.bossHpContainer) this.bossHpContainer.setVisible(true);
    if (this.bossHpText) this.bossHpText.setText(`МИНИ-БОСС: ${name} [${hp} / ${hp}]`);
    if (this.bossHpFill && typeof this.bossHpFill.setDisplaySize === 'function') {
      this.bossHpFill.setDisplaySize(320, 16);
      this.bossHpFill.setFillStyle(0xf59e0b);
    }
    if (this.domHud) {
      this.domHud.showBossBar(true, name, hp, hp);
    }
    soundEngine.playExplosion();
  }

  private updateMiniBossAI(boss: DungeonMob, delta: number, px: number, py: number) {
    const name = boss.mobType === 'miniboss_bone_golem' ? 'КОСТЯНОЙ ГОЛЕМ' : (boss.mobType === 'miniboss_butcher' ? 'МЯСНИК КАТАКОМБ' : 'ПАЛАЧ КАТАКОМБ');
    if (this.bossHpFill && this.bossHpFill.active && this.bossHpText && this.bossHpText.active && typeof this.bossHpFill.setDisplaySize === 'function') {
      const pct = Math.max(0, boss.hp / boss.maxHp);
      this.bossHpFill.setDisplaySize(Math.max(1, 320 * pct), 16);
      this.bossHpText.setText(`МИНИ-БОСС: ${name} [${boss.hp} / ${boss.maxHp}]`);
    }
    if (this.domHud) {
      this.domHud.updateBossHp(boss.hp, boss.maxHp, name);
    }

    boss.bossAttackTimer = (boss.bossAttackTimer || 0) - delta;
    boss.attackCd = Math.max(0, (boss.attackCd || 0) - delta);
    boss.leapCooldown = Math.max(0, (boss.leapCooldown || 0) - delta);

    const isEnraged = boss.hp < boss.maxHp * 0.4;
    if (isEnraged && !boss.isEnraged) {
      boss.isEnraged = true;
      boss.setTint(0xef4444);
      soundEngine.playCast();
      this.showFloatingNotice(`⚡ ${name}: ВПАДАЕТ В ЯРОСТЬ! ⚡`, '#ef4444');
    }

    if (boss.bossState === 'charging_dash' || boss.bossState === 'dashing') {
      boss.setVelocity(0, 0);
      return;
    }

    const dist = Phaser.Math.Distance.Between(boss.x, boss.y, px, py);

    // Close-quarters melee strike with fair cooldown and damage
    if (dist <= 60 && boss.attackCd <= 0 && !this.isPlayerDown) {
      boss.attackCd = isEnraged ? 1150 : 1550;
      soundEngine.playSlash();
      this.damagePlayer(boss.damage);
      this.showDamageNumber(this.player.x, this.player.y - 20, `-${boss.damage} ⚔`, '#ef4444');
      const hitSlice = this.add.circle(this.player.x, this.player.y, 32, 0xef4444, 0.4).setDepth(48);
      this.tweens.add({ targets: hitSlice, scale: 1.2, alpha: 0, duration: 180, onComplete: () => hitSlice.destroy() });
    }

    // GAP CLOSER LEAP SMASH: Generous 950ms telegraph, small impact radius, fair 14 dmg, NO SLOW, long boss recovery
    if (dist > 180 && boss.leapCooldown <= 0 && boss.bossAttackTimer <= 0 && boss.bossState === 'idle' && !this.isPlayerDown) {
      boss.bossState = 'charging_dash';
      boss.setVelocity(0, 0);
      boss.leapCooldown = isEnraged ? 8000 : 11000; // Rare tactical leap, cannot be spammed
      boss.bossAttackTimer = 2200;
      soundEngine.playCast();
      this.showFloatingNotice(`⚠ ${name}: ЗАМАХ ДЛЯ ПРЫЖКА! ⚠`, '#f59e0b');

      const targetX = px;
      const targetY = py;
      const reticle = this.add.circle(targetX, targetY, 45, 0xef4444, 0.3).setDepth(44);
      const ring = this.add.circle(targetX, targetY, 45).setStrokeStyle(2, 0xff0000).setDepth(45);
      this.tweens.add({ targets: [reticle, ring], scale: 1.2, duration: 320, yoyo: true, repeat: 1 });

      // Generous 950ms telegraph so player easily steps or dashes away
      this.tweens.add({
        targets: boss,
        scaleX: 2.1,
        scaleY: 2.1,
        y: boss.y - 85,
        alpha: 0.5,
        duration: 950,
        ease: 'Quad.easeInOut',
        onComplete: () => {
          reticle.destroy();
          ring.destroy();
          if (!boss.active) return;
          boss.setPosition(targetX, targetY);
          boss.setScale(1.75);
          boss.setAlpha(1.0);
          soundEngine.playErupt();
          soundEngine.playSmash();
          this.cameras.main.shake(150, 0.01);

          // Impact radius 48px (compact, very easy to dodge)
          const shock = this.add.circle(targetX, targetY, 48, 0xef4444, 0.5).setDepth(45);
          this.tweens.add({ targets: shock, scale: 1.3, alpha: 0, duration: 250, onComplete: () => shock.destroy() });

          // 1800ms recovery window so boss is resting and cannot attack immediately
          boss.attackCd = 1800;
          boss.bossAttackTimer = 1600;

          // Check hit: ONLY hits if player was standing directly inside the 48px circle
          const hitDist = Phaser.Math.Distance.Between(targetX, targetY, this.player.x, this.player.y);
          if (hitDist <= 48) {
            const leapDmg = 14; // Fair, non-lethal damage
            this.damagePlayer(leapDmg);
            this.showDamageNumber(this.player.x, this.player.y - 20, `-${leapDmg} ПРЫЖОК БОССА! 💥`, '#ef4444');
            soundEngine.playHit();

            // Push player gently away from boss center so they are not trapped inside boss hitbox
            const pushAngle = Phaser.Math.Angle.Between(targetX, targetY, this.player.x, this.player.y);
            this.player.x += Math.cos(pushAngle) * 45;
            this.player.y += Math.sin(pushAngle) * 45;
          }

          // Ensure player speed is completely unaffected (strictly NO slow penalty)
          if (this.slowTimerEvent) {
            this.slowTimerEvent.remove();
            this.slowTimerEvent = null;
          }
          this.playerSpeed = this.basePlayerSpeed;

          boss.bossState = 'idle';
        }
      });
      return;
    }

    if (boss.bossAttackTimer <= 0) {
      if (boss.mobType === 'miniboss_bone_golem') {
        const roll = Math.random();
        if (roll < 0.45) {
          // Ground Stomp AoE Shockwave
          soundEngine.playSmash();
          this.showFloatingNotice('⚠ СОТРЯСЕНИЕ ЗЕМЛИ: УДАР ПО ПЛОЩАДИ! ⚠', '#f59e0b');
          const stomp = this.add.circle(boss.x, boss.y, 90, 0xf59e0b, 0.4).setDepth(45);
          this.tweens.add({
            targets: stomp,
            scale: 1.4,
            alpha: 0,
            duration: 350,
            onComplete: () => stomp.destroy()
          });
          if (Phaser.Math.Distance.Between(boss.x, boss.y, this.player.x, this.player.y) < 100) {
            this.damagePlayer(16);
            soundEngine.playHit();
          }
        } else {
          // Bone Spike Ring: 8 spinning bone skulls
          soundEngine.playCast();
          this.showFloatingNotice('⚠ КОЛЬЦО КОСТЯНЫХ ШИПОВ! ⚠', '#e2e8f0');
          for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI * 2) / 8;
            this.shootNecromancerSkull(
              boss.x + Math.cos(angle) * 35,
              boss.y + Math.sin(angle) * 35,
              boss.x + Math.cos(angle) * 240,
              boss.y + Math.sin(angle) * 240,
              12
            );
          }
        }
      } else if (boss.mobType === 'miniboss_butcher') {
        const roll = Math.random();
        if (roll < 0.4) {
          // Meat Cleaver Throw (2 Spinning cleavers in a spread fan)
          soundEngine.playSlash();
          this.showFloatingNotice('☠ ВЕЕР МЯСНЫХ ТЕСАКОВ! ☠', '#ef4444');
          const baseAngle = Phaser.Math.Angle.Between(boss.x, boss.y, px, py);
          [-0.2, 0.2].forEach(offset => {
            const angle = baseAngle + offset;
            const cleaver = this.physics.add.sprite(boss.x, boss.y, 'boss_butcher').setScale(0.5).setDepth(45);
            cleaver.setTint(0xef4444);
            this.physics.add.existing(cleaver);
            const spd = 240;
            cleaver.setVelocity(Math.cos(angle) * spd, Math.sin(angle) * spd);
            this.tweens.add({ targets: cleaver, angle: 360, duration: 350, repeat: -1 });
            this.physics.add.overlap(cleaver, this.player, () => {
              this.damagePlayer(14);
              soundEngine.playHit();
              cleaver.destroy();
            });
            this.time.delayedCall(2000, () => { if (cleaver.active) cleaver.destroy(); });
          });
        } else if (roll < 0.75) {
          // Meat Hook pull (range: 340px)
          soundEngine.playSmash();
          this.showFloatingNotice('☠ ПРИТЯГИВАНИЕ КРЮКОМ! ☠', '#f97316');
          if (dist < 340) {
            const chain = this.add.graphics().setDepth(44);
            chain.lineStyle(3, 0xd1d5db, 0.9);
            chain.lineBetween(boss.x, boss.y, this.player.x, this.player.y);
            this.time.delayedCall(150, () => chain.destroy());

            const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, boss.x, boss.y);
            this.player.x += Math.cos(angle) * (dist * 0.45);
            this.player.y += Math.sin(angle) * (dist * 0.45);
            
            this.damagePlayer(14);
            boss.attackCd = 1200; // Grace window after hook
            soundEngine.playHit();
          }
        } else {
          // Whirlwind Cleave Dash
          soundEngine.playSlash();
          this.showFloatingNotice('☠ ВИХРЬ ТЕСАКОВ! ☠', '#ef4444');
          this.executeBossDash(boss, px, py);
        }
      } else {
        const roll = Math.random();
        if (roll < 0.45) {
          // Blood Rage Dash
          this.executeBossDash(boss, px, py);
        } else if (roll < 0.75) {
          // Brutal Axe Cleave AoE
          soundEngine.playSlash();
          this.showFloatingNotice('⚠ РАССЕКАЮЩИЙ УДАР ПАЛАЧА! ⚠', '#ef4444');
          const cleave = this.add.circle(boss.x, boss.y, 85, 0xdc2626, 0.45).setDepth(45);
          this.tweens.add({
            targets: cleave,
            scale: 1.4,
            alpha: 0,
            duration: 300,
            onComplete: () => cleave.destroy()
          });
          if (Phaser.Math.Distance.Between(boss.x, boss.y, this.player.x, this.player.y) < 95) {
            this.damagePlayer(18);
            soundEngine.playHit();
          }
        } else {
          // Cursed Guillotine Shockwave
          soundEngine.playSlash();
          this.showFloatingNotice('⚠ ВОЛНА ГИЛЬОТИНЫ! ⚠', '#991b1b');
          const angle = Phaser.Math.Angle.Between(boss.x, boss.y, px, py);
          for (let w = -1; w <= 1; w++) {
            const waveAngle = angle + w * 0.22;
            const shock = this.physics.add.sprite(boss.x, boss.y, 'proj_rock_spike').setDepth(45).setScale(1.1).setTint(0xef4444);
            this.physics.add.existing(shock);
            const wSpd = 240;
            shock.setVelocity(Math.cos(waveAngle) * wSpd, Math.sin(waveAngle) * wSpd);
            this.physics.add.overlap(shock, this.player, () => {
              this.damagePlayer(14);
              soundEngine.playHit();
              shock.destroy();
            });
            this.time.delayedCall(1600, () => { if (shock.active) shock.destroy(); });
          }
        }
      }
      boss.bossAttackTimer = isEnraged ? 1400 : 2000;
    } else {
      if (dist > 45 && !this.isPlayerDown) {
        const angle = Phaser.Math.Angle.Between(boss.x, boss.y, px, py);
        const curSpeed = isEnraged ? boss.speed * 1.1 : boss.speed;
        boss.setVelocity(Math.cos(angle) * curSpeed, Math.sin(angle) * curSpeed);
        boss.setFlipX(px < boss.x);
      } else {
        boss.setVelocity(0, 0);
      }
    }
  }

  private spawnCursedKnightBoss(x: number, y: number, roomId: number) {
    const boss = this.physics.add.sprite(x, y, 'boss_cursed_knight') as DungeonMob;
    boss.setCollideWorldBounds(true);
    boss.hp = 7500;
    boss.maxHp = 7500;
    boss.mobType = 'cursed_knight';
    boss.speed = 160;
    boss.damage = 75;
    boss.attackCd = 0;
    boss.roomId = roomId;
    boss.setDepth(40);
    boss.setScale(1.95);
    boss.bossState = 'idle';
    boss.bossAttackTimer = 1500;

    const hpBg = this.add.rectangle(x, y - 48, 70, 7, 0x000000).setDepth(41);
    const hpBar = this.add.rectangle(x - 34, y - 48, 68, 5, 0xdc2626).setOrigin(0, 0.5).setDepth(42);
    boss.hpBarBg = hpBg;
    boss.hpBar = hpBar;

    this.physics.add.collider(boss, this.walls);
    this.bossMob = boss;
    this.mobs.push(boss);
    if (this.mobsGroup) this.mobsGroup.add(boss);

    if (this.bossHpContainer) this.bossHpContainer.setVisible(true);
    if (this.bossHpText) this.bossHpText.setText('БОСС ФИНАЛА: ПРОКЛЯТЫЙ РЫЦАРЬ [7500 / 7500]');
    if (this.bossHpFill && typeof this.bossHpFill.setDisplaySize === 'function') this.bossHpFill.setDisplaySize(320, 16);
    if (this.domHud) {
      this.domHud.showBossBar(true, 'ПРОКЛЯТЫЙ РЫЦАРЬ', 7500, 7500);
    }
    soundEngine.playExplosion();
  }

  private spawnButcherBoss(x: number, y: number, roomId: number) {
    const boss = this.physics.add.sprite(x, y, 'boss_butcher') as DungeonMob;
    boss.setCollideWorldBounds(true);
    boss.hp = 12000;
    boss.maxHp = 12000;
    boss.mobType = 'miniboss_butcher';
    boss.speed = 195;
    boss.damage = 110;
    boss.attackCd = 0;
    boss.roomId = roomId;
    boss.setDepth(40);
    boss.setScale(2.55);
    boss.bossState = 'idle';
    boss.bossAttackTimer = 1200;

    const hpBg = this.add.rectangle(x, y - 56, 80, 8, 0x000000).setDepth(41);
    const hpBar = this.add.rectangle(x - 39, y - 56, 78, 6, 0xdc2626).setOrigin(0, 0.5).setDepth(42);
    boss.hpBarBg = hpBg;
    boss.hpBar = hpBar;

    this.physics.add.collider(boss, this.walls);
    this.bossMob = boss;
    this.mobs.push(boss);
    if (this.mobsGroup) this.mobsGroup.add(boss);

    if (this.bossHpContainer) this.bossHpContainer.setVisible(true);
    if (this.bossHpText) this.bossHpText.setText('ЛЕГЕНДАРНЫЙ МЯСНИК: ВЛАДЫКА КАТАКОМБ [12000 / 12000]');
    if (this.bossHpFill && typeof this.bossHpFill.setDisplaySize === 'function') this.bossHpFill.setDisplaySize(320, 16);
    if (this.domHud) {
      this.domHud.showBossBar(true, 'ЛЕГЕНДАРНЫЙ МЯСНИК', 12000, 12000);
    }
    soundEngine.playExplosion();
  }

  // --- MOBS & COMPANION AI ---
  private updateMobs(delta: number) {
    const px = this.player.x;
    const py = this.player.y;

    // 1. Companion AI
    if (this.companion && this.companion.sprite && this.companion.sprite.active) {
      this.updateCompanionAI(delta, px, py);
    }

    // 1.5 Mecha Dragon Boss AI
    if (this.mechaDragonBoss && this.mechaDragonBoss.active) {
      this.mechaDragonBoss.update(delta, px, py, this.playerHp, (amt) => this.damagePlayer(amt), this.bossCoverPillars);

      if (this.bossHpFill && this.bossHpFill.active && this.bossHpText && this.bossHpText.active && typeof this.bossHpFill.setDisplaySize === 'function') {
        const pct = Math.max(0, this.mechaDragonBoss.hp / this.mechaDragonBoss.maxHp);
        this.bossHpFill.setDisplaySize(Math.max(1, 320 * pct), 16);
        const phaseName = this.mechaDragonBoss.phase === 3 ? 'БЕРСЕРК' : (this.mechaDragonBoss.phase === 2 ? 'ПЕРЕГРУЗКА' : 'ХИЩНИК');
        this.bossHpText.setText(`ВАЛГАРТ, СТАЛЬНОЙ ВЛАДЫКА БЕЗДНЫ [${this.mechaDragonBoss.hp} / ${this.mechaDragonBoss.maxHp}] - ФАЗА ${this.mechaDragonBoss.phase} (${phaseName})`);
      }
      if (this.domHud) {
        this.domHud.updateBossHp(this.mechaDragonBoss.hp, this.mechaDragonBoss.maxHp, 'ВАЛГАРТ, СТАЛЬНОЙ ВЛАДЫКА БЕЗДНЫ');
      }

      if (!this.mechaDragonBoss.active || this.mechaDragonBoss.hp <= 0) {
        if (this.bossHpContainer) this.bossHpContainer.setVisible(false);
        if (this.domHud) this.domHud.showBossBar(false);
        soundEngine.setDungeonMusicState('ambient');

        const room = this.rooms.find(r => r.id === this.mechaDragonBoss?.roomId);
        if (room && !room.cleared) {
          room.cleared = true;
          this.doorsGroup.clear(true, true);
          this.updateMinimap();
        }
      }
    }

    // 2. Mobs AI
    for (let i = this.mobs.length - 1; i >= 0; i--) {
      const mob = this.mobs[i];
      if (!mob || !mob.active) continue;

      // Clamp mob strictly within its designated room floor boundaries
      const mobRoom = this.roomsMap.get(mob.roomId);
      if (mobRoom) {
        const minX = mobRoom.worldX - mobRoom.w / 2 + 32;
        const maxX = mobRoom.worldX + mobRoom.w / 2 - 32;
        const minY = mobRoom.worldY - mobRoom.h / 2 + 32;
        const maxY = mobRoom.worldY + mobRoom.h / 2 - 32;
        mob.x = Phaser.Math.Clamp(mob.x, minX, maxX);
        mob.y = Phaser.Math.Clamp(mob.y, minY, maxY);
      }

      // Stick HP bar directly above mob head
      if (mob.hpBar && mob.hpBar.active && mob.hpBarBg && mob.hpBarBg.active && typeof mob.hpBar.setDisplaySize === 'function') {
        const isBigBoss = mob.mobType === 'cursed_knight' || mob.mobType === 'miniboss_bone_golem' || mob.mobType === 'miniboss_executioner' || mob.mobType === 'miniboss_butcher';
        mob.hpBarBg.setPosition(Math.round(mob.x), Math.round(mob.y - (isBigBoss ? 44 : 26)));
        mob.hpBar.setPosition(Math.round(mob.x - (isBigBoss ? 29 : 16)), Math.round(mob.y - (isBigBoss ? 44 : 26)));
        const pct = Math.max(0, mob.hp / mob.maxHp);
        mob.hpBar.setDisplaySize(Math.max(1, (isBigBoss ? 58 : 32) * pct), isBigBoss ? 4 : 3);
      }

      // Burning Status Effect Ticker (clearly visible fire ticks & periodic damage)
      if (mob.isBurning) {
        mob.burnTimer = (mob.burnTimer || 0) - delta;
        mob.burnTickTimer = (mob.burnTickTimer || 0) - delta;

        if (mob.burnVisual && mob.burnVisual.active) {
          mob.burnVisual.setPosition(mob.x, mob.y - 32);
        }

        if (mob.burnTickTimer <= 0) {
          mob.burnTickTimer = 380;
          const bDmg = mob.burnDps || 35;
          mob.hp -= bDmg;
          this.showDamageNumber(mob.x + Phaser.Math.Between(-8, 8), mob.y - 18, `-${bDmg} 🔥`, '#f97316');
          soundEngine.playHit();

          if (mob.hpBar && mob.hpBar.active && typeof mob.hpBar.setDisplaySize === 'function') {
            const isBigBoss = mob.mobType === 'cursed_knight' || mob.mobType === 'miniboss_bone_golem' || mob.mobType === 'miniboss_executioner' || mob.mobType === 'miniboss_butcher';
            const pct = Math.max(0, mob.hp / mob.maxHp);
            mob.hpBar.setDisplaySize(Math.max(1, (isBigBoss ? 58 : 32) * pct), isBigBoss ? 4 : 3);
          }

          if (mob.hp <= 0) {
            this.killMob(mob);
            continue;
          }
        }

        if (mob.burnTimer <= 0) {
          mob.isBurning = false;
          if (mob.burnVisual && mob.burnVisual.active) mob.burnVisual.destroy();
          mob.burnVisual = null;
          mob.clearTint();
        }
      }

      mob.attackCd = Math.max(0, mob.attackCd - delta);

      if (mob.isStunned) {
        mob.setVelocity(0, 0);
        continue;
      }

      if (mob.mobType === 'cursed_knight') {
        this.updateCursedKnightAI(mob, delta, px, py);
        continue;
      }

      if (mob.mobType === 'miniboss_bone_golem' || mob.mobType === 'miniboss_executioner' || mob.mobType === 'miniboss_butcher') {
        this.updateMiniBossAI(mob, delta, px, py);
        continue;
      }

      if (mob.mobType === 'butcher') {
        // BUTCHER ENEMY NPC: Heavy Meat Cleaver, Chain Hook Pull, and Blood Rage!
        mob.butcherHookCd = Math.max(0, (mob.butcherHookCd || 0) - delta);
        mob.butcherSlamCd = Math.max(0, (mob.butcherSlamCd || 0) - delta);

        if (mob.butcherIsTelegraphing) {
          mob.setVelocity(0, 0);
          continue;
        }

        // Low-HP Berserk Enrage
        const isRaged = mob.hp < mob.maxHp * 0.45;
        if (isRaged && !mob.isEnraged) {
          mob.isEnraged = true;
          mob.setTint(0xef4444);
          soundEngine.playCast();
          this.showFloatingNotice('☠ МЯСНИК: КРОВАВАЯ ЯРОСТЬ! ☠', '#ef4444');
        }

        const dist = Phaser.Math.Distance.Between(mob.x, mob.y, px, py);
        if (px < mob.x) mob.setFlipX(true);
        else if (px > mob.x) mob.setFlipX(false);

        // SKILL 1: Meat Hook Pull (Range: 110-330px)
        if (dist >= 110 && dist <= 330 && mob.butcherHookCd <= 0 && !this.isPlayerDown) {
          mob.butcherHookCd = isRaged ? 3800 : 5200;
          mob.setVelocity(0, 0);
          soundEngine.playSmash();
          this.showFloatingNotice('☠ МЯСНИК: БРОСОК КРЮКА! ☠', '#f97316');

          const chain = this.add.graphics().setDepth(44);
          chain.lineStyle(3, 0xd1d5db, 0.9);
          chain.lineBetween(mob.x, mob.y, this.player.x, this.player.y);
          this.time.delayedCall(150, () => chain.destroy());

          const hookAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, mob.x, mob.y);
          this.player.x += Math.cos(hookAngle) * (dist * 0.72);
          this.player.y += Math.sin(hookAngle) * (dist * 0.72);
          this.damagePlayer(35);
          soundEngine.playHit();
          continue;
        }

        // SKILL 2: Telegraphed Heavy Cleaver Smash (Distance <= 65px)
        if (dist <= 65 && mob.butcherSlamCd <= 0 && !this.isPlayerDown) {
          mob.butcherIsTelegraphing = true;
          mob.setVelocity(0, 0);

          // Red telegraph circle on floor
          const telegraph = this.add.circle(px, py, 45, 0xef4444, 0.35).setDepth(44);
          const telegraphRing = this.add.circle(px, py, 45).setStrokeStyle(2, 0xff0000).setDepth(45);

          // Raise cleaver high animation
          this.tweens.add({
            targets: mob,
            scaleY: 1.6,
            scaleX: 1.1,
            y: mob.y - 12,
            duration: 380,
            ease: 'Quad.easeOut',
            onComplete: () => {
              telegraph.destroy();
              telegraphRing.destroy();
              if (!mob.active) return;
              mob.setScale(1.4);
              mob.butcherIsTelegraphing = false;
              mob.butcherSlamCd = isRaged ? 1000 : 1800;

              soundEngine.playSlash();
              soundEngine.playSmash();
              this.cameras.main.shake(180, 0.012);

              const slash = this.add.circle(mob.x, mob.y, 48, 0xdc2626, 0.75).setDepth(46);
              this.tweens.add({ targets: slash, scale: 1.5, alpha: 0, duration: 220, onComplete: () => slash.destroy() });

              if (Phaser.Math.Distance.Between(mob.x, mob.y, this.player.x, this.player.y) <= 75) {
                const finalDmg = isRaged ? mob.damage + 25 : mob.damage;
                this.damagePlayer(finalDmg);
                this.showDamageNumber(this.player.x, this.player.y - 20, `-${finalDmg} СОКРУШЕНИЕ! 🪓`, '#ef4444');
              }
            }
          });
          continue;
        }

        // Relentless pursuit
        if (dist > 45 && !this.isPlayerDown) {
          const angle = Phaser.Math.Angle.Between(mob.x, mob.y, px, py);
          const baseSpd = mob.isSlowed ? mob.speed * 0.45 : mob.speed;
          const spd = isRaged ? baseSpd * 1.35 : baseSpd;
          mob.setVelocity(Math.cos(angle) * spd, Math.sin(angle) * spd);
        } else {
          mob.setVelocity(0, 0);
        }
        continue;
      }

      // Determine target (Player or Companion)
      let tx = px;
      let ty = py;
      if (this.companion && this.companion.sprite.active) {
        const dComp = Phaser.Math.Distance.Between(mob.x, mob.y, this.companion.sprite.x, this.companion.sprite.y);
        const dPlay = Phaser.Math.Distance.Between(mob.x, mob.y, px, py);
        if (dComp < dPlay && Math.random() > 0.4) {
          tx = this.companion.sprite.x;
          ty = this.companion.sprite.y;
        }
      }

      const dist = Phaser.Math.Distance.Between(mob.x, mob.y, tx, ty);

      // Facing orientation
      if (tx < mob.x) mob.setFlipX(true);
      else if (tx > mob.x) mob.setFlipX(false);

      if (mob.mobType === 'skeleton') {
        if (dist > 40 && !this.isPlayerDown) {
          const angle = Phaser.Math.Angle.Between(mob.x, mob.y, tx, ty);
          const spd = mob.isSlowed ? mob.speed * 0.45 : mob.speed;
          mob.setVelocity(Math.cos(angle) * spd, Math.sin(angle) * spd);
        } else {
          mob.setVelocity(0, 0);
          if (dist <= 46 && mob.attackCd <= 0 && !this.isPlayerDown) {
            mob.attackCd = 1200;
            this.mobMeleeSlash(mob, tx, ty, mob.damage);
          }
        }
      } else if (mob.mobType === 'slime') {
        // SLIME: Wobbles and when standing/attacking spits 4 small floating toxic bubbles in all directions!
        if (mob.attackCd <= 0 && !this.isPlayerDown) {
          mob.attackCd = 2600;
          mob.setVelocity(0, 0);

          // Slime swell up pulse animation before bursting bubbles
          this.tweens.add({
            targets: mob,
            scaleX: 1.5,
            scaleY: 1.5,
            duration: 250,
            yoyo: true,
            ease: 'Sine.easeInOut',
            onComplete: () => {
              if (!mob.active) return;
              soundEngine.playCast();
              this.shootSlimeBubbleBurst(mob.x, mob.y, mob.damage);
            }
          });
        } else {
          // Slowly creeps toward target
          if (dist > 35 && !this.isPlayerDown) {
            const angle = Phaser.Math.Angle.Between(mob.x, mob.y, tx, ty);
            mob.setVelocity(Math.cos(angle) * mob.speed, Math.sin(angle) * mob.speed);
          } else {
            mob.setVelocity(0, 0);
            if (dist <= 44 && !this.isPlayerDown && mob.attackCd <= 0) {
              mob.attackCd = 1200;
              this.mobMeleeSlash(mob, tx, ty, 22);
            }
          }
        }
      } else if (mob.mobType === 'jaw_beast') {
        // JAW BEAST (Chomper): Fierce snapping predator
        if (dist > 44 && !this.isPlayerDown) {
          const angle = Phaser.Math.Angle.Between(mob.x, mob.y, tx, ty);
          mob.setVelocity(Math.cos(angle) * mob.speed, Math.sin(angle) * mob.speed);
        } else {
          mob.setVelocity(0, 0);
          if (dist <= 52 && mob.attackCd <= 0 && !this.isPlayerDown) {
            mob.attackCd = 1100;
            this.jawBeastChompAttack(mob, tx, ty, mob.damage);
          }
        }
      } else if (mob.mobType === 'mage') {
        if (dist < 260) {
          const angle = Phaser.Math.Angle.Between(tx, ty, mob.x, mob.y);
          mob.setVelocity(Math.cos(angle) * mob.speed, Math.sin(angle) * mob.speed);
        } else if (dist > 340) {
          const angle = Phaser.Math.Angle.Between(mob.x, mob.y, tx, ty);
          mob.setVelocity(Math.cos(angle) * mob.speed, Math.sin(angle) * mob.speed);
        } else {
          mob.setVelocity(0, 0);
        }

        if (mob.attackCd <= 0 && !this.isPlayerDown) {
          mob.attackCd = 2800;
          this.tweens.add({
            targets: mob,
            scaleY: mob.scaleY * 1.3,
            scaleX: mob.scaleX * 0.85,
            duration: 140,
            yoyo: true,
            onComplete: () => {
              if (mob.active) this.shootEnemyOrb(mob.x, mob.y, tx, ty, mob.damage);
            }
          });
        }
      } else if (mob.mobType === 'goblin_bomber') {
        // Goblin runs around unpredictably and tosses bombs
        if (dist < 200) {
          const angle = Phaser.Math.Angle.Between(tx, ty, mob.x, mob.y);
          mob.setVelocity(Math.cos(angle) * mob.speed, Math.sin(angle) * mob.speed);
        } else {
          const angle = Phaser.Math.Angle.Between(mob.x, mob.y, tx, ty);
          mob.setVelocity(Math.cos(angle) * mob.speed, Math.sin(angle) * mob.speed);
        }

        if (mob.attackCd <= 0 && !this.isPlayerDown) {
          mob.attackCd = 3200;
          this.tweens.add({
            targets: mob,
            y: mob.y - 12,
            duration: 150,
            yoyo: true,
            onComplete: () => {
              if (mob.active) this.shootGoblinBomb(mob.x, mob.y, tx, ty, mob.damage);
            }
          });
        }
      } else if (mob.mobType === 'spider') {
        // Spider dashes fast and shoots slowing webs
        const angle = Phaser.Math.Angle.Between(mob.x, mob.y, tx, ty);
        if (dist > 45 && !this.isPlayerDown) {
          mob.setVelocity(Math.cos(angle) * mob.speed, Math.sin(angle) * mob.speed);
        } else {
          mob.setVelocity(0, 0);
          if (mob.attackCd <= 0 && !this.isPlayerDown) {
            mob.attackCd = 1100;
            this.mobMeleeSlash(mob, tx, ty, mob.damage);
          }
        }
        if (mob.attackCd <= 0 && dist > 100 && Math.random() > 0.5 && !this.isPlayerDown) {
          mob.attackCd = 3000;
          this.tweens.add({
            targets: mob,
            scaleX: mob.scaleX * 1.35,
            duration: 120,
            yoyo: true,
            onComplete: () => {
              if (mob.active) this.shootSpiderWeb(mob.x, mob.y, tx, ty);
            }
          });
        }
      } else if (mob.mobType === 'gargoyle') {
        // Gargoyle: swoops down fast and leaves shadow slash
        if (dist > 50 && !this.isPlayerDown) {
          const angle = Phaser.Math.Angle.Between(mob.x, mob.y, tx, ty);
          mob.setVelocity(Math.cos(angle) * mob.speed, Math.sin(angle) * mob.speed);
        } else {
          mob.setVelocity(0, 0);
          if (mob.attackCd <= 0 && !this.isPlayerDown) {
            mob.attackCd = 1400;
            this.mobMeleeSlash(mob, tx, ty, mob.damage);
          }
        }
      } else if (mob.mobType === 'golem') {
        // Golem: heavy slow footsteps, slams ground with shockwave
        if (dist > 55 && !this.isPlayerDown) {
          const angle = Phaser.Math.Angle.Between(mob.x, mob.y, tx, ty);
          mob.setVelocity(Math.cos(angle) * mob.speed, Math.sin(angle) * mob.speed);
        } else {
          mob.setVelocity(0, 0);
          if (mob.attackCd <= 0 && !this.isPlayerDown) {
            mob.attackCd = 2000;
            this.tweens.add({
              targets: mob,
              y: mob.y - 16,
              scaleY: mob.scaleY * 1.25,
              duration: 200,
              yoyo: true,
              ease: 'Quad.easeOut',
              onComplete: () => {
                if (!mob.active) return;
                soundEngine.playSmash();
                this.cameras.main.shake(120, 0.008);
                const shock = this.add.circle(mob.x, mob.y, 65, 0xf59e0b, 0.6).setDepth(45);
                this.tweens.add({ targets: shock, scale: 1.5, alpha: 0, duration: 250, onComplete: () => shock.destroy() });
                if (Phaser.Math.Distance.Between(mob.x, mob.y, this.player.x, this.player.y) < 70) {
                  this.damagePlayer(mob.damage);
                }
              }
            });
          }
        }
      } else if (mob.mobType === 'necromancer') {
        // Necromancer floats, summons skeletons and shoots homing skulls
        if (dist < 220) {
          const angle = Phaser.Math.Angle.Between(tx, ty, mob.x, mob.y);
          mob.setVelocity(Math.cos(angle) * mob.speed, Math.sin(angle) * mob.speed);
        } else {
          mob.setVelocity(0, 0);
        }

        if (mob.attackCd <= 0 && !this.isPlayerDown) {
          mob.attackCd = 3500;
          this.tweens.add({
            targets: mob,
            y: mob.y - 14,
            scaleX: mob.scaleX * 1.2,
            duration: 180,
            yoyo: true,
            onComplete: () => {
              if (!mob.active) return;
              if (Math.random() > 0.4) {
                this.shootNecromancerSkull(mob.x, mob.y, tx, ty, mob.damage);
              } else {
                this.spawnMob(mob.x + (Math.random() - 0.5) * 60, mob.y + (Math.random() - 0.5) * 60, 'skeleton', 'mob_skeleton', 60, 130, 16, mob.roomId);
                soundEngine.playCast();
              }
            }
          });
        }
      } else if (mob.mobType === 'zombie') {
        // PLAGUE ZOMBIE: Shambles relentlessly toward player/companion and strikes
        if (dist > 42 && !this.isPlayerDown) {
          const angle = Phaser.Math.Angle.Between(mob.x, mob.y, tx, ty);
          const spd = mob.isSlowed ? mob.speed * 0.45 : mob.speed;
          mob.setVelocity(Math.cos(angle) * spd, Math.sin(angle) * spd);
        } else {
          mob.setVelocity(0, 0);
          if (dist <= 48 && mob.attackCd <= 0 && !this.isPlayerDown) {
            mob.attackCd = 1300;
            this.mobMeleeSlash(mob, tx, ty, mob.damage);
          }
        }
      } else if (mob.mobType === 'bat') {
        // VAMPIRE BAT: Swoops in sinusoidal waves, bites, then circles back
        if (!this.isPlayerDown) {
          const baseAngle = Phaser.Math.Angle.Between(mob.x, mob.y, tx, ty);
          const wobble = Math.sin((this.time.now + mob.x) * 0.009) * 0.55;
          const finalAngle = baseAngle + wobble;
          const spd = mob.isSlowed ? mob.speed * 0.45 : mob.speed;
          mob.setVelocity(Math.cos(finalAngle) * spd, Math.sin(finalAngle) * spd);

          if (dist <= 44 && mob.attackCd <= 0) {
            mob.attackCd = 1000;
            soundEngine.playHit();
            // Bat swooping attack lunge animation
            const origScale = mob.scale;
            this.tweens.add({
              targets: mob,
              scale: origScale * 1.35,
              duration: 90,
              yoyo: true
            });
            if (this.player && this.player.active) {
              this.damagePlayer(mob.damage);
            }
          }
        } else {
          mob.setVelocity(0, 0);
        }
      } else if (mob.mobType === 'bubble_spitter') {
        // BUBBLE SPITTER: Floating toxic slime caster that spits slow pulsating small bubbles (no puddles)
        if (dist < 180) {
          const angle = Phaser.Math.Angle.Between(tx, ty, mob.x, mob.y);
          mob.setVelocity(Math.cos(angle) * mob.speed, Math.sin(angle) * mob.speed);
        } else if (dist > 280) {
          const angle = Phaser.Math.Angle.Between(mob.x, mob.y, tx, ty);
          mob.setVelocity(Math.cos(angle) * mob.speed, Math.sin(angle) * mob.speed);
        } else {
          mob.setVelocity(0, 0);
        }

        if (mob.attackCd <= 0 && !this.isPlayerDown) {
          mob.attackCd = 2400;
          this.tweens.add({
            targets: mob,
            scaleX: 1.45,
            scaleY: 1.45,
            duration: 250,
            yoyo: true,
            ease: 'Sine.easeInOut',
            onComplete: () => {
              if (mob && mob.active) {
                this.shootPulsingBubbleAoE(mob.x, mob.y, tx, ty, mob.damage);
              }
            }
          });
        }
      } else if (mob.mobType === 'cultist') {
        // SHADOW CULTIST: Keeps distance, casts void orbs, and teleports with purple smoke if cornered!
        mob.cultistTeleportCd = Math.max(0, (mob.cultistTeleportCd || 0) - delta);
        if (dist < 100 && mob.cultistTeleportCd <= 0 && !this.isPlayerDown) {
          mob.cultistTeleportCd = 4500;
          soundEngine.playWhoosh();
          const puff = this.add.circle(mob.x, mob.y, 22, 0xa855f7, 0.7).setDepth(48);
          this.tweens.add({ targets: puff, scale: 2.0, alpha: 0, duration: 250, onComplete: () => puff.destroy() });

          const escapeAngle = Phaser.Math.Angle.Between(px, py, mob.x, mob.y) + (Math.random() - 0.5) * 0.8;
          const newX = mob.x + Math.cos(escapeAngle) * 180;
          const newY = mob.y + Math.sin(escapeAngle) * 180;
          const room = this.roomsMap.get(mob.roomId);
          if (room) {
            mob.x = Phaser.Math.Clamp(newX, room.worldX - room.w / 2 + 50, room.worldX + room.w / 2 - 50);
            mob.y = Phaser.Math.Clamp(newY, room.worldY - room.h / 2 + 50, room.worldY + room.h / 2 - 50);
          }
          const puff2 = this.add.circle(mob.x, mob.y, 22, 0xc084fc, 0.7).setDepth(48);
          this.tweens.add({ targets: puff2, scale: 1.8, alpha: 0, duration: 250, onComplete: () => puff2.destroy() });
          mob.setVelocity(0, 0);
        } else if (dist < 210) {
          const angle = Phaser.Math.Angle.Between(tx, ty, mob.x, mob.y);
          mob.setVelocity(Math.cos(angle) * mob.speed, Math.sin(angle) * mob.speed);
        } else if (dist > 310) {
          const angle = Phaser.Math.Angle.Between(mob.x, mob.y, tx, ty);
          mob.setVelocity(Math.cos(angle) * mob.speed, Math.sin(angle) * mob.speed);
        } else {
          mob.setVelocity(0, 0);
        }

        if (mob.attackCd <= 0 && !this.isPlayerDown) {
          mob.attackCd = 2600;
          this.tweens.add({
            targets: mob,
            scaleY: mob.scaleY * 1.3,
            duration: 150,
            yoyo: true,
            onComplete: () => {
              if (mob.active) {
                soundEngine.playCast();
                this.shootEnemyOrb(mob.x, mob.y, tx, ty, mob.damage);
              }
            }
          });
        }
      } else if (mob.mobType === 'toxic_hydra') {
        // TOXIC HYDRA: Ranged serpent that spits bubbling acid pools onto the ground!
        if (dist > 220 && !this.isPlayerDown) {
          const angle = Phaser.Math.Angle.Between(mob.x, mob.y, tx, ty);
          mob.setVelocity(Math.cos(angle) * mob.speed, Math.sin(angle) * mob.speed);
        } else if (dist < 130) {
          const angle = Phaser.Math.Angle.Between(tx, ty, mob.x, mob.y);
          mob.setVelocity(Math.cos(angle) * mob.speed, Math.sin(angle) * mob.speed);
        } else {
          mob.setVelocity(0, 0);
        }

        if (mob.attackCd <= 0 && !this.isPlayerDown) {
          mob.attackCd = 3000;
          this.tweens.add({
            targets: mob,
            scaleX: mob.scaleX * 1.35,
            scaleY: mob.scaleY * 0.8,
            duration: 200,
            yoyo: true,
            onComplete: () => {
              if (!mob.active) return;
              this.shootHydraAcidPool(mob.x, mob.y, tx, ty, mob.damage);
            }
          });
        }
      } else if (mob.mobType === 'shadow_stalker') {
        // SHADOW STALKER: Semi-invisible stealth assassin that ambushes from behind!
        if (mob.stalkerInvis === undefined) mob.stalkerInvis = true;
        if (mob.stalkerInvis) {
          mob.setAlpha(0.25);
          mob.setTint(0x7e22ce);
        }

        if (dist > 44 && !this.isPlayerDown) {
          const angle = Phaser.Math.Angle.Between(mob.x, mob.y, tx, ty);
          const spd = mob.isSlowed ? mob.speed * 0.5 : mob.speed;
          mob.setVelocity(Math.cos(angle) * spd, Math.sin(angle) * spd);
        } else {
          mob.setVelocity(0, 0);
          if (dist <= 52 && mob.attackCd <= 0 && !this.isPlayerDown) {
            mob.attackCd = 2000;
            // Reveal from stealth
            mob.stalkerInvis = false;
            mob.setAlpha(1.0);
            mob.clearTint();
            soundEngine.playCritHit();

            const stab = this.add.circle(px, py, 30, 0xa855f7, 0.85).setDepth(46);
            this.tweens.add({ targets: stab, scale: 1.5, alpha: 0, duration: 180, onComplete: () => stab.destroy() });
            this.damagePlayer(mob.damage);
            this.showDamageNumber(px, py - 20, '☠ ВНЕЗАПНЫЙ УДАР!', '#c084fc');

            this.time.delayedCall(1200, () => {
              if (mob.active) mob.stalkerInvis = true;
            });
          }
        }
      } else if (mob.mobType === 'shield_knight') {
        // SHIELD KNIGHT: Armored tank that blocks frontal attacks and strikes with spiked mace!
        if (dist > 42 && !this.isPlayerDown) {
          const angle = Phaser.Math.Angle.Between(mob.x, mob.y, tx, ty);
          const spd = mob.isSlowed ? mob.speed * 0.45 : mob.speed;
          mob.setVelocity(Math.cos(angle) * spd, Math.sin(angle) * spd);
        } else {
          mob.setVelocity(0, 0);
          if (dist <= 48 && mob.attackCd <= 0 && !this.isPlayerDown) {
            mob.attackCd = 1350;
            soundEngine.playSmash();
            const smash = this.add.circle(px, py, 36, 0xfacc15, 0.7).setDepth(46);
            this.tweens.add({ targets: smash, scale: 1.4, alpha: 0, duration: 200, onComplete: () => smash.destroy() });
            this.damagePlayer(mob.damage);
          }
        }
      }
    }
  }

  private shootPulsingBubbleAoE(x: number, y: number, tx: number, ty: number, dmg: number) {
    soundEngine.playCast();
    const angle = Phaser.Math.Angle.Between(x, y, tx, ty);
    const spd = 130;

    // Small, cute pulsing green bubble (without giant size or ground puddles)
    const bubbleCore = this.add.circle(x, y, 6, 0x10b981, 0.9).setDepth(48);
    const bubbleAura = this.add.circle(x, y, 10, 0x34d399, 0.35).setDepth(47);

    // Smooth subtle pulsating animation
    this.tweens.add({
      targets: [bubbleCore, bubbleAura],
      scale: 1.25,
      alpha: 0.65,
      duration: 320,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    const burstBubble = (bx: number, by: number) => {
      if (!bubbleCore.active) return;
      bubbleCore.destroy();
      bubbleAura.destroy();
      soundEngine.playHit();

      // Quick clean sparkle pop burst (NO lingering puddles on floor!)
      for (let p = 0; p < 4; p++) {
        const ang = (p * Math.PI) / 2;
        const spark = this.add.circle(bx, by, 2.5, 0x34d399, 0.9).setDepth(49);
        this.tweens.add({
          targets: spark,
          x: bx + Math.cos(ang) * 16,
          y: by + Math.sin(ang) * 16,
          alpha: 0,
          scale: 0.2,
          duration: 160,
          onComplete: () => spark.destroy()
        });
      }

      if (this.player && this.player.active && Phaser.Math.Distance.Between(bx, by, this.player.x, this.player.y) < 42) {
        this.damagePlayer(dmg);
        this.showDamageNumber(this.player.x, this.player.y - 20, `-${dmg} КИСЛОТА 🧪`, '#10b981');
      }
      if (this.companion && this.companion.sprite.active && Phaser.Math.Distance.Between(bx, by, this.companion.sprite.x, this.companion.sprite.y) < 42) {
        this.damageCompanion(dmg);
      }
    };

    // Travel via tween for smooth trajectory
    const travelDist = 320;
    const destX = x + Math.cos(angle) * travelDist;
    const destY = y + Math.sin(angle) * travelDist;

    this.tweens.add({
      targets: [bubbleCore, bubbleAura],
      x: destX,
      y: destY,
      duration: (travelDist / spd) * 1000,
      ease: 'Linear',
      onUpdate: () => {
        if (!bubbleCore.active) return;
        if (this.player && this.player.active && Phaser.Math.Distance.Between(bubbleCore.x, bubbleCore.y, this.player.x, this.player.y) < 20) {
          burstBubble(bubbleCore.x, bubbleCore.y);
        }
      },
      onComplete: () => {
        burstBubble(destX, destY);
      }
    });
  }

  private shootHydraAcidPool(x: number, y: number, tx: number, ty: number, dmg: number) {
    soundEngine.playShoot();
    const spit = this.physics.add.sprite(x, y, 'proj_slime_bubble').setDepth(45).setScale(1.2).setTint(0x22c55e);
    this.projectiles.add(spit);
    const angle = Phaser.Math.Angle.Between(x, y, tx, ty);
    const speed = 250;
    spit.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

    const landAcid = () => {
      if (!spit.active) return;
      const sx = spit.x;
      const sy = spit.y;
      spit.destroy();
      soundEngine.playAcidHit();

      // Persistent Acid Pool for 4 seconds
      const pool = this.add.circle(sx, sy, 36, 0x15803d, 0.65).setDepth(13);
      const ring = this.add.circle(sx, sy, 36).setStrokeStyle(2, 0x4ade80, 0.85).setDepth(14);
      this.tweens.add({ targets: [pool, ring], scale: 1.15, duration: 400, yoyo: true, repeat: -1 });

      const poolTimer = this.time.addEvent({
        delay: 350,
        repeat: 11,
        callback: () => {
          if (!this.player || !this.player.active) return;
          if (Phaser.Math.Distance.Between(sx, sy, this.player.x, this.player.y) <= 42) {
            this.damagePlayer(Math.round(dmg * 0.45));
            this.showDamageNumber(this.player.x, this.player.y - 18, '-16 КИСЛОТА 🧪', '#4ade80');
          }
        }
      });

      this.time.delayedCall(4200, () => {
        poolTimer.remove();
        if (pool.active) pool.destroy();
        if (ring.active) ring.destroy();
      });
    };

    this.physics.add.overlap(spit, this.player, landAcid);
    if (this.walls) this.physics.add.collider(spit, this.walls, landAcid);
    this.time.delayedCall(1600, landAcid);
  }

  public spawnGroundFissure(x: number, y: number, type: 'seismic' | 'void' = 'seismic', duration = 6500) {
    const isSeismic = type === 'seismic';
    const container = this.add.container(x, y).setDepth(12);

    const gfx = this.add.graphics();
    const coreColor = isSeismic ? 0xf97316 : 0xa855f7;
    const outerColor = isSeismic ? 0xef4444 : 0x581c87;
    const crackColor = isSeismic ? 0xfacc15 : 0xe879f9;

    gfx.fillStyle(outerColor, 0.45);
    gfx.fillCircle(0, 0, 115);
    gfx.fillStyle(coreColor, 0.65);
    gfx.fillCircle(0, 0, 80);

    // Jagged earth cracks
    gfx.lineStyle(4, crackColor, 0.95);
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3 + (Math.random() - 0.5) * 0.4;
      const len = 70 + Math.random() * 40;
      const midLen = len * 0.55;
      const mx = Math.cos(angle + 0.3) * midLen;
      const my = Math.sin(angle + 0.3) * midLen;
      const ex = Math.cos(angle) * len;
      const ey = Math.sin(angle) * len;
      gfx.beginPath();
      gfx.moveTo(0, 0);
      gfx.lineTo(mx, my);
      gfx.lineTo(ex, ey);
      gfx.strokePath();
    }
    container.add(gfx);

    const label = this.add.text(0, -48, isSeismic ? '⚡ СЕЙСМИЧЕСКИЙ РАЗЛОМ ⚡' : '🔮 РАСКОЛ БЕЗДНЫ 🔮', {
      fontSize: '11px',
      fontFamily: 'Consolas, monospace',
      fontStyle: 'bold',
      color: isSeismic ? '#facc15' : '#c084fc',
      backgroundColor: '#09090b',
      padding: { x: 8, y: 3 }
    }).setOrigin(0.5).setDepth(13);
    container.add(label);

    this.tweens.add({
      targets: container,
      scaleX: 1.08,
      scaleY: 1.08,
      alpha: 0.85,
      yoyo: true,
      repeat: -1,
      duration: 380,
      ease: 'Sine.easeInOut'
    });

    soundEngine.playErupt();
    this.cameras.main.shake(250, 0.015);

    this.activeFissures.push({
      container,
      x,
      y,
      radius: 120,
      type,
      timer: duration,
      tickTimer: 350,
      dps: Math.round(55 * this.damageMultiplier)
    });
  }

  public applyMobBurn(mob: DungeonMob, duration: number = 3800, dps: number = 35, isAstral: boolean = false) {
    if (!mob || !mob.active || mob.hp <= 0) return;
    const wasBurning = mob.isBurning;
    mob.isBurning = true;
    mob.burnTimer = Math.max(mob.burnTimer || 0, duration);
    if (!mob.burnTickTimer || mob.burnTickTimer <= 0) mob.burnTickTimer = 350;
    mob.burnDps = Math.max(mob.burnDps || 0, dps);
    mob.setTint(isAstral ? 0xc084fc : 0xf97316);

    if (!mob.burnVisual || !mob.burnVisual.active) {
      mob.burnVisual = this.add.text(mob.x, mob.y - 32, isAstral ? '🟣' : '🔥', {
        fontSize: '18px'
      }).setOrigin(0.5).setDepth(45);
      this.tweens.add({
        targets: mob.burnVisual,
        scaleX: 1.35,
        scaleY: 1.35,
        yoyo: true,
        repeat: -1,
        duration: 250,
        ease: 'Sine.easeInOut'
      });
    }

    if (!wasBurning) {
      soundEngine.playCast();
      this.showDamageNumber(mob.x, mob.y - 24, isAstral ? '🟣 АСТРАЛ!' : '🔥 ПОДЖОГ!', isAstral ? '#c084fc' : '#f97316');
    }
  }

  private updateActiveFissures(delta: number) {
    if (!this.activeFissures || this.activeFissures.length === 0) return;
    for (let i = this.activeFissures.length - 1; i >= 0; i--) {
      const f = this.activeFissures[i];
      f.timer -= delta;
      f.tickTimer -= delta;

      if (f.tickTimer <= 0) {
        f.tickTimer = 350;
        this.mobs.forEach(m => {
          if (m && m.active && m.hp > 0) {
            const dist = Phaser.Math.Distance.Between(f.x, f.y, m.x, m.y);
            if (dist <= f.radius) {
              m.isSlowed = true;
              m.slowTimer = 450;
              this.damageMob(m, f.dps);
              if (f.type === 'seismic') {
                this.applyMobBurn(m, 2800, Math.round(25 * this.damageMultiplier), false);
              } else {
                this.applyMobBurn(m, 2800, Math.round(25 * this.damageMultiplier), true);
              }
            }
          }
        });
        this.checkDestructibleDamage(f.x, f.y, f.radius, f.dps, false);
      }

      if (f.timer <= 0) {
        if (f.container && f.container.active) {
          this.tweens.add({
            targets: f.container,
            alpha: 0,
            scale: 0.1,
            duration: 350,
            onComplete: () => {
              if (f.container && f.container.active) f.container.destroy();
            }
          });
        }
        this.activeFissures.splice(i, 1);
      }
    }
  }

  private companionStateTimer: number = 0;
  private companionState: 'chasing' | 'attacking' | 'retreating' = 'chasing';

  private updateCompanionAI(delta: number, px: number, py: number) {
    if (!this.companion || !this.companion.sprite || !this.companion.sprite.active) return;
    const comp = this.companion;
    const cs = comp.sprite;

    if (comp.hpBar && comp.hpBar.active && comp.hpBarBg && comp.hpBarBg.active && typeof comp.hpBar.setDisplaySize === 'function') {
      comp.hpBarBg.setPosition(Math.round(cs.x), Math.round(cs.y - 24));
      comp.hpBar.setPosition(Math.round(cs.x - 17), Math.round(cs.y - 24));
      comp.hpBar.setDisplaySize(Math.max(1, 34 * Math.max(0, comp.hp / comp.maxHp)), 3);
    }
    if (comp.nameText && comp.nameText.active) {
      comp.nameText.setPosition(Math.round(cs.x), Math.round(cs.y - 32));
    }

    comp.attackCd = Math.max(0, comp.attackCd - delta);
    this.companionStateTimer = Math.max(0, this.companionStateTimer - delta);

    // Find closest active mob in current or adjacent room
    let nearestMob: DungeonMob | null = null;
    let minDist = 450;

    for (const mob of this.mobs) {
      if (mob && mob.active && mob.hp > 0) {
        const d = Phaser.Math.Distance.Between(cs.x, cs.y, mob.x, mob.y);
        if (d < minDist) {
          minDist = d;
          nearestMob = mob;
        }
      }
    }

    // State machine for tactical combat behavior
    if (this.companionState === 'retreating' && this.companionStateTimer > 0) {
      // Step back or strafe away from enemy after striking to avoid counter-attack!
      if (nearestMob) {
        const backAngle = Phaser.Math.Angle.Between(nearestMob.x, nearestMob.y, cs.x, cs.y) + 0.3;
        cs.setVelocity(Math.cos(backAngle) * (comp.speed * 0.85), Math.sin(backAngle) * (comp.speed * 0.85));
        cs.setFlipX(nearestMob.x < cs.x);
      }
      return;
    }

    if (nearestMob) {
      const angle = Phaser.Math.Angle.Between(cs.x, cs.y, nearestMob.x, nearestMob.y);
      cs.setFlipX(nearestMob.x < cs.x);

      if (minDist > 52) {
        this.companionState = 'chasing';
        cs.setVelocity(Math.cos(angle) * comp.speed, Math.sin(angle) * comp.speed);
      } else {
        cs.setVelocity(0, 0);
        if (comp.attackCd <= 0) {
          comp.attackCd = 900;
          this.companionState = 'attacking';
          soundEngine.playSlash();

          // Lunge forward animation towards mob
          this.tweens.add({
            targets: cs,
            x: cs.x + Math.cos(angle) * 18,
            y: cs.y + Math.sin(angle) * 18,
            scaleX: cs.scaleX * 1.2,
            duration: 90,
            yoyo: true,
            ease: 'Quad.easeOut'
          });

          this.damageMob(nearestMob, comp.damage);

          // Bright blue slash arc
          const sl = this.add.circle(nearestMob.x, nearestMob.y, 26, 0x38bdf8, 0.75).setDepth(46);
          this.tweens.add({ targets: sl, scale: 1.5, alpha: 0, duration: 180, onComplete: () => sl.destroy() });

          // After attacking, trigger tactical 320ms retreat step!
          this.companionState = 'retreating';
          this.companionStateTimer = 320;
        }
      }
    } else {
      // Follow player smoothly
      this.companionState = 'chasing';
      const distToPlayer = Phaser.Math.Distance.Between(cs.x, cs.y, px, py);
      if (distToPlayer > 75) {
        const angle = Phaser.Math.Angle.Between(cs.x, cs.y, px, py);
        cs.setVelocity(Math.cos(angle) * comp.speed, Math.sin(angle) * comp.speed);
        cs.setFlipX(px < cs.x);
      } else {
        cs.setVelocity(0, 0);
      }
    }
  }

  private damageCompanion(dmg: number) {
    if (!this.companion || !this.companion.sprite || !this.companion.sprite.active) return;
    this.companion.hp = Math.max(0, this.companion.hp - dmg);
    this.showDamageNumber(this.companion.sprite.x, this.companion.sprite.y - 20, `-${dmg}`, '#38bdf8');

    // Brief hit flash tint
    this.companion.sprite.setTint(0xef4444);
    this.time.delayedCall(100, () => {
      if (this.companion && this.companion.sprite && this.companion.sprite.active) {
        this.companion.sprite.clearTint();
      }
    });

    if (this.companion.hp <= 0) {
      soundEngine.playHit();
      this.companion.sprite.destroy();
      this.companion.hpBar.destroy();
      this.companion.hpBarBg.destroy();
      this.companion.nameText.destroy();
      this.companion = null;
      this.showFloatingNotice('⚔️ НАЕМНИК ПАЛ В БОЮ!', '#ef4444');
    }
  }

  private mobMeleeSlash(mob: DungeonMob, tx: number, ty: number, dmg: number) {
    soundEngine.playHit();

    // Mob attack animation: forward lunge & recoil tween
    const angle = Phaser.Math.Angle.Between(mob.x, mob.y, tx, ty);
    const lungeDist = 16;
    this.tweens.add({
      targets: mob,
      x: mob.x + Math.cos(angle) * lungeDist,
      y: mob.y + Math.sin(angle) * lungeDist,
      scaleX: mob.scaleX * 1.25,
      scaleY: mob.scaleY * 0.85,
      duration: 100,
      yoyo: true,
      ease: 'Quad.easeOut'
    });

    const slash = this.add.circle(mob.x + (tx > mob.x ? 18 : -18), mob.y, 22, 0xef4444, 0.6).setDepth(45);
    this.tweens.add({
      targets: slash,
      alpha: 0,
      scaleX: 1.4,
      duration: 180,
      onComplete: () => slash.destroy()
    });

    // Check hit on companion first if mob was targeting or close to companion!
    if (this.companion && this.companion.sprite && this.companion.sprite.active && Phaser.Math.Distance.Between(mob.x, mob.y, this.companion.sprite.x, this.companion.sprite.y) < 52) {
      this.damageCompanion(dmg);
    } else if (Phaser.Math.Distance.Between(mob.x, mob.y, this.player.x, this.player.y) < 48) {
      this.damagePlayer(dmg);
    }
  }

  private jawBeastChompAttack(mob: DungeonMob, tx: number, ty: number, dmg: number) {
    soundEngine.playAttack();
    soundEngine.playHit();
    this.cameras.main.shake(100, 0.007);

    // Snapping jaws aggressive chomper attack animation
    const angle = Phaser.Math.Angle.Between(mob.x, mob.y, tx, ty);
    this.tweens.add({
      targets: mob,
      x: mob.x + Math.cos(angle) * 22,
      y: mob.y + Math.sin(angle) * 22,
      scaleX: mob.scaleX * 1.35,
      scaleY: mob.scaleY * 0.75,
      duration: 120,
      yoyo: true,
      ease: 'Back.easeOut'
    });

    const biteX = mob.x + (tx > mob.x ? 22 : -22);
    const bite = this.add.circle(biteX, mob.y, 28, 0xef4444, 0.8).setDepth(48);
    this.tweens.add({
      targets: bite,
      scale: 1.6,
      alpha: 0,
      duration: 200,
      onComplete: () => bite.destroy()
    });

    // Blood splatters
    for (let b = 0; b < 5; b++) {
      const drop = this.add.circle(biteX + (Math.random() - 0.5) * 20, mob.y + (Math.random() - 0.5) * 20, 3.5, 0xdc2626).setDepth(49);
      this.tweens.add({
        targets: drop,
        x: drop.x + (Math.random() - 0.5) * 40,
        y: drop.y + (Math.random() - 0.5) * 40,
        alpha: 0,
        duration: 350,
        onComplete: () => drop.destroy()
      });
    }

    if (this.companion && this.companion.sprite && this.companion.sprite.active && Phaser.Math.Distance.Between(mob.x, mob.y, this.companion.sprite.x, this.companion.sprite.y) < 58) {
      this.damageCompanion(dmg);
    } else if (Phaser.Math.Distance.Between(mob.x, mob.y, this.player.x, this.player.y) < 56) {
      this.damagePlayer(dmg);
      this.showFloatingNotice('🩸 УКУС ЗУБАСТИКА! 🩸', '#ef4444');
    }
  }

  private shootSlimeBubbleBurst(x: number, y: number, dmg: number) {
    // 4 Small Slow Floating Toxic Bubbles
    const numBubbles = 4;
    for (let i = 0; i < numBubbles; i++) {
      const angle = (i * Math.PI * 2) / numBubbles + 0.25;
      const spawnX = x + Math.cos(angle) * 20;
      const spawnY = y + Math.sin(angle) * 20;
      const bubble = this.physics.add.sprite(spawnX, spawnY, 'proj_toxic_bubble').setDepth(45).setScale(0.75);
      this.projectiles.add(bubble);

      const speed = 120; // Slow drifting float
      bubble.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

      // Wobble tween on floating bubble
      this.tweens.add({
        targets: bubble,
        scaleX: 0.9,
        scaleY: 0.65,
        duration: 280,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      const popBubble = () => {
        if (!bubble || !bubble.active) return;
        const bx = bubble.x;
        const by = bubble.y;
        bubble.destroy();

        // Quick clean pop
        for (let d = 0; d < 3; d++) {
          const drop = this.add.circle(bx, by, 2.5, 0x4ade80).setDepth(46);
          this.tweens.add({
            targets: drop,
            x: bx + (Math.random() - 0.5) * 20,
            y: by + (Math.random() - 0.5) * 20,
            alpha: 0,
            duration: 180,
            onComplete: () => drop.destroy()
          });
        }
      };

      const onHitPlayer = () => {
        if (bubble.active) {
          popBubble();
          this.damagePlayer(dmg);
          soundEngine.playHit();
          this.showFloatingNotice('🧪 ТОКСИЧНЫЙ ПУЗЫРЬ! 🧪', '#22c55e');
        }
      };

      this.physics.add.overlap(bubble, this.player, onHitPlayer);
      if (this.walls) this.physics.add.collider(bubble, this.walls, popBubble);

      // Lingers and pops after 3.2s
      this.time.delayedCall(3200, popBubble);
    }
  }

  private detonateEnemyBomb(bomb: Phaser.Physics.Arcade.Sprite, dmg: number) {
    if (!bomb || !bomb.active) return;
    const bx = bomb.x;
    const by = bomb.y;
    bomb.destroy();
    soundEngine.playExplosion();
    const blast = this.add.circle(bx, by, 65, 0xef4444, 0.75).setDepth(46);
    this.tweens.add({ targets: blast, alpha: 0, scaleX: 1.5, scaleY: 1.5, duration: 250, onComplete: () => blast.destroy() });
    if (Phaser.Math.Distance.Between(bx, by, this.player.x, this.player.y) < 75) {
      this.damagePlayer(dmg);
    }
  }

  private shootEnemyOrb(x: number, y: number, tx: number, ty: number, dmg: number) {
    soundEngine.playShoot();
    const orb = this.physics.add.sprite(x, y, 'proj_dark_orb').setDepth(45).setScale(1.2);
    this.projectiles.add(orb);

    const angle = Phaser.Math.Angle.Between(x, y, tx, ty);
    const speed = 210;
    orb.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

    const onHit = () => {
      if (orb.active) {
        orb.destroy();
        this.damagePlayer(dmg);
        soundEngine.playHit();
      }
    };

    this.physics.add.overlap(orb, this.player, onHit);
    if (this.walls) this.physics.add.collider(orb, this.walls, () => orb.destroy());

    this.time.delayedCall(4000, () => {
      if (orb && orb.active) orb.destroy();
    });
  }

  private shootGoblinBomb(x: number, y: number, tx: number, ty: number, dmg: number) {
    soundEngine.playCast();
    const bomb = this.physics.add.sprite(x, y, 'proj_goblin_bomb').setDepth(45).setScale(1.3);
    this.projectiles.add(bomb);

    const angle = Phaser.Math.Angle.Between(x, y, tx, ty);
    const speed = 260;
    bomb.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

    const triggerExplosion = () => {
      this.detonateEnemyBomb(bomb, dmg);
    };

    this.physics.add.overlap(bomb, this.player, triggerExplosion);
    if (this.walls) this.physics.add.collider(bomb, this.walls, triggerExplosion);

    this.time.delayedCall(1200, triggerExplosion);
  }

  private shootSpiderWeb(x: number, y: number, tx: number, ty: number) {
    soundEngine.playShoot();
    const web = this.physics.add.sprite(x, y, 'proj_web_shot').setDepth(45).setScale(1.4);
    this.projectiles.add(web);

    const angle = Phaser.Math.Angle.Between(x, y, tx, ty);
    const speed = 280;
    web.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

    const onWebHit = () => {
      if (web.active) {
        web.destroy();
        this.showFloatingNotice('🕸 ЗАМЕДЛЕН ПАУТИНОЙ! 🕸', '#4ade80');
        if (this.slowTimerEvent) {
          this.slowTimerEvent.remove();
          this.slowTimerEvent = null;
        }
        this.playerSpeed = Math.round(this.basePlayerSpeed * 0.5);
        this.slowTimerEvent = this.time.delayedCall(2500, () => {
          this.playerSpeed = this.basePlayerSpeed;
          this.slowTimerEvent = null;
        });
      }
    };

    this.physics.add.overlap(web, this.player, onWebHit);
    if (this.walls) this.physics.add.collider(web, this.walls, () => web.destroy());

    this.time.delayedCall(3000, () => {
      if (web && web.active) web.destroy();
    });
  }

  private shootNecromancerSkull(x: number, y: number, tx: number, ty: number, dmg: number) {
    soundEngine.playCast();
    const skull = this.physics.add.sprite(x, y, 'proj_skull_homing').setDepth(45).setScale(1.3);
    this.projectiles.add(skull);

    const angle = Phaser.Math.Angle.Between(x, y, tx, ty);
    const speed = 190;
    skull.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

    const onSkullHit = () => {
      if (skull.active) {
        skull.destroy();
        this.damagePlayer(dmg);
        soundEngine.playHit();
      }
    };

    this.physics.add.overlap(skull, this.player, onSkullHit);
    if (this.walls) this.physics.add.collider(skull, this.walls, () => skull.destroy());

    this.time.delayedCall(4500, () => {
      if (skull && skull.active) skull.destroy();
    });
  }

  // --- BOSS: CURSED KNIGHT ---
  private updateCursedKnightAI(boss: DungeonMob, delta: number, px: number, py: number) {
    if (this.bossHpFill && this.bossHpFill.active && this.bossHpText && this.bossHpText.active && typeof this.bossHpFill.setDisplaySize === 'function') {
      const pct = Math.max(0, boss.hp / boss.maxHp);
      this.bossHpFill.setDisplaySize(Math.max(1, 320 * pct), 16);
      this.bossHpText.setText(`БОСС ФИНАЛА: ПРОКЛЯТЫЙ РЫЦАРЬ [${boss.hp} / ${boss.maxHp}]`);
    }
    if (this.domHud) {
      this.domHud.updateBossHp(boss.hp, boss.maxHp, 'ПРОКЛЯТЫЙ РЫЦАРЬ');
    }

    // Check 50% HP Enrage Phase
    if (boss.hp <= boss.maxHp * 0.5 && !boss.isEnraged) {
      boss.isEnraged = true;
      boss.speed = 220;
      soundEngine.playExplosion();
      this.cameras.main.shake(300, 0.02);
      this.showFloatingNotice('⚡ БОСС В ФАЗЕ БЕШЕНСТВА (ENRAGE)! АОЕ ПО ВСЕЙ АРЕНЕ! ⚡', '#ef4444');

      const shield = this.add.circle(boss.x, boss.y, 65, 0xc084fc, 0.35).setDepth(39);
      this.tweens.add({
        targets: shield,
        alpha: 0.65,
        scale: 1.25,
        duration: 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      const shieldTimer = this.time.addEvent({
        delay: 50,
        loop: true,
        callback: () => {
          if (boss && boss.active && shield.active) {
            shield.setPosition(boss.x, boss.y);
          } else if (shield.active) {
            shield.destroy();
            shieldTimer.remove();
          }
        }
      });
    }

    boss.bossAttackTimer = (boss.bossAttackTimer || 0) - delta;

    if (boss.bossState === 'charging_dash') {
      boss.setVelocity(0, 0);
      if (boss.bossDashTarget) {
        this.bossTelegraphLine.clear();
        this.bossTelegraphLine.lineStyle(3, 0xef4444, 0.85);
        this.bossTelegraphLine.lineBetween(boss.x, boss.y, boss.bossDashTarget.x, boss.bossDashTarget.y);
      }
      return;
    }

    if (boss.bossState === 'dashing') return;

    if (boss.bossAttackTimer <= 0) {
      const roll = Math.random();
      if (boss.isEnraged && roll < 0.35) {
        this.executeBossAoEBombardment(boss);
      } else if (roll < 0.25) {
        this.executeBossDash(boss, px, py);
      } else if (roll < 0.50) {
        this.executeBossBulletHell(boss);
      } else if (roll < 0.75) {
        this.executeBossVoidBeam(boss, px, py);
      } else {
        this.executeBossTripleStrike(boss, px, py);
      }
      boss.bossAttackTimer = boss.isEnraged ? 1400 : 2100;
    } else {
      const dist = Phaser.Math.Distance.Between(boss.x, boss.y, px, py);
      if (dist > 60 && !this.isPlayerDown) {
        const angle = Phaser.Math.Angle.Between(boss.x, boss.y, px, py);
        boss.setVelocity(Math.cos(angle) * boss.speed, Math.sin(angle) * boss.speed);
      } else {
        boss.setVelocity(0, 0);
      }
    }
  }

  private executeBossAoEBombardment(boss: DungeonMob) {
    boss.bossState = 'aoe_bombardment';
    boss.setVelocity(0, 0);
    soundEngine.playCast();
    this.showFloatingNotice('⚠ АОЕ ОБСТРЕЛ АРЕНЫ: ПРЯЧТЕСЬ ЗА УКРЫТИЯМИ! ⚠', '#ef4444');

    const bossRoom = this.rooms.find(r => r.id === boss.roomId);
    const roomX = bossRoom ? bossRoom.worldX : boss.x;
    const roomY = bossRoom ? bossRoom.worldY : boss.y;

    for (let i = 0; i < 8; i++) {
      const rx = roomX + (Math.random() - 0.5) * 800;
      const ry = roomY + (Math.random() - 0.5) * 600;

      const dangerCircle = this.add.circle(rx, ry, 70, 0xef4444, 0.4).setDepth(15);
      const strokeCircle = this.add.circle(rx, ry, 70, 0xffffff, 0).setStrokeStyle(3, 0xef4444).setDepth(16);

      this.tweens.add({
        targets: dangerCircle,
        alpha: 0.85,
        duration: 800,
        ease: 'Sine.easeIn',
        onComplete: () => {
          dangerCircle.destroy();
          strokeCircle.destroy();
          if (!this.player) return;

          soundEngine.playExplosion();
          const blast = this.add.circle(rx, ry, 80, 0xdc2626, 0.85).setDepth(45);
          this.tweens.add({ targets: blast, scale: 1.5, alpha: 0, duration: 300, onComplete: () => blast.destroy() });

          if (Phaser.Math.Distance.Between(rx, ry, this.player.x, this.player.y) < 85) {
            this.damagePlayer(65);
            soundEngine.playHit();
          }
        }
      });
    }

    this.time.delayedCall(1200, () => {
      boss.bossState = 'idle';
    });
  }

  private executeBossVoidBeam(boss: DungeonMob, px: number, py: number) {
    boss.bossState = 'charging_dash';
    boss.setVelocity(0, 0);
    const angle = Phaser.Math.Angle.Between(boss.x, boss.y, px, py);
    const beamLen = 520;
    const targetX = boss.x + Math.cos(angle) * beamLen;
    const targetY = boss.y + Math.sin(angle) * beamLen;

    soundEngine.playCast();
    this.showFloatingNotice('⚠ ТЁМНЫЙ ЛУЧ БЕЗДНЫ! ⚠', '#a855f7');

    // Warning telegraph line
    this.bossTelegraphLine.clear();
    this.bossTelegraphLine.lineStyle(2, 0xa855f7, 0.85);
    this.bossTelegraphLine.lineBetween(boss.x, boss.y, targetX, targetY);

    this.time.delayedCall(850, () => {
      if (!boss.active) return;
      this.bossTelegraphLine.clear();
      soundEngine.playExplosion();

      // Huge laser beam blast
      const beamGfx = this.add.graphics().setDepth(48);
      beamGfx.lineStyle(20, 0xa855f7, 0.95);
      beamGfx.lineBetween(boss.x, boss.y, targetX, targetY);
      this.tweens.add({ targets: beamGfx, alpha: 0, duration: 400, onComplete: () => beamGfx.destroy() });

      // Check if player intersects beam
      const line = new Phaser.Geom.Line(boss.x, boss.y, targetX, targetY);
      const playerCircle = new Phaser.Geom.Circle(this.player.x, this.player.y, 28);
      if (Phaser.Geom.Intersects.LineToCircle(line, playerCircle)) {
        this.damagePlayer(85);
        soundEngine.playHit();
      }

      boss.bossState = 'idle';
    });
  }

  private executeBossDash(boss: DungeonMob, px: number, py: number) {
    boss.bossState = 'charging_dash';
    const angle = Phaser.Math.Angle.Between(boss.x, boss.y, px, py);
    const targetX = boss.x + Math.cos(angle) * 450;
    const targetY = boss.y + Math.sin(angle) * 450;
    boss.bossDashTarget = { x: targetX, y: targetY };

    const isKnight = boss.mobType === 'cursed_knight';
    soundEngine.playCast();
    this.showFloatingNotice(isKnight ? '⚠ РЫВОК ПРОКЛЯТОГО РЫЦАРЯ! ⚠' : '⚠ РЫВОК БОССА! ⚠', '#ef4444');

    this.time.delayedCall(1000, () => {
      if (!boss.active) return;
      this.bossTelegraphLine.clear();
      boss.bossState = 'dashing';
      soundEngine.playExplosion();

      const dashSpeed = isKnight ? 700 : 560;
      boss.setVelocity(Math.cos(angle) * dashSpeed, Math.sin(angle) * dashSpeed);

      let hasHitPlayer = false;
      const hitTimer = this.time.addEvent({
        delay: 50,
        repeat: 10,
        callback: () => {
          if (!boss.active || hasHitPlayer) return;
          if (Phaser.Math.Distance.Between(boss.x, boss.y, this.player.x, this.player.y) < 60) {
            hasHitPlayer = true;
            const dashDmg = isKnight ? 35 : 18;
            this.damagePlayer(dashDmg);
            this.showDamageNumber(this.player.x, this.player.y - 20, `-${dashDmg} РЫВОК!`, '#ef4444');
            soundEngine.playHit();
          }
        }
      });

      this.time.delayedCall(600, () => {
        hitTimer.remove();
        boss.setVelocity(0, 0);
        boss.bossState = 'idle';
      });
    });
  }

  private executeBossBulletHell(boss: DungeonMob) {
    boss.bossState = 'bullet_hell';
    boss.setVelocity(0, 0);
    soundEngine.playCast();
    this.showFloatingNotice('☠ КОЛЬЦО СМЕРТИ: 12 СНАРЯДОВ! ☠', '#a855f7');

    const numProj = 12;
    for (let i = 0; i < numProj; i++) {
      const angle = (i / numProj) * Math.PI * 2;
      const orb = this.physics.add.sprite(boss.x, boss.y, 'proj_dark_orb').setDepth(45).setScale(1.3);
      this.projectiles.add(orb);
      const speed = 190;
      orb.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

      this.physics.add.overlap(orb, this.player, () => {
        orb.destroy();
        this.damagePlayer(25);
        soundEngine.playHit();
      });

      this.time.delayedCall(4500, () => {
        if (orb && orb.active) orb.destroy();
      });
    }

    this.time.delayedCall(1200, () => {
      boss.bossState = 'idle';
    });
  }

  private executeBossTripleStrike(boss: DungeonMob, px: number, py: number) {
    boss.bossState = 'triple_strike';
    const angle = Phaser.Math.Angle.Between(boss.x, boss.y, px, py);

    this.time.addEvent({
      delay: 400,
      repeat: 2,
      callback: () => {
        if (!boss.active) return;
        boss.setPosition(boss.x + Math.cos(angle) * 35, boss.y + Math.sin(angle) * 35);
        soundEngine.playSlash();

        const slash = this.add.circle(boss.x + Math.cos(angle) * 45, boss.y + Math.sin(angle) * 45, 45, 0xdc2626, 0.75).setDepth(46);
        this.tweens.add({
          targets: slash,
          alpha: 0,
          scaleX: 1.5,
          scaleY: 1.5,
          duration: 200,
          onComplete: () => slash.destroy()
        });

        if (Phaser.Math.Distance.Between(boss.x, boss.y, this.player.x, this.player.y) < 85) {
          this.damagePlayer(40);
        }
      }
    });

    this.time.delayedCall(1400, () => {
      boss.bossState = 'idle';
      const nonBossCount = this.mobs.filter(m => m.active && m.mobType !== 'cursed_knight').length;
      if (nonBossCount < 2) {
        soundEngine.playCast();
        this.spawnMob(boss.x - 50, boss.y + 20, 'skeleton', 'mob_skeleton', 180, 140, 22, boss.roomId);
        this.spawnMob(boss.x + 50, boss.y + 20, 'skeleton', 'mob_skeleton', 180, 140, 22, boss.roomId);
      }
    });
  }

  // --- DAMAGE & COMBAT ---
  public damageMob(mob: DungeonMob, dmg: number, hitType?: 'blade' | 'whip' | 'magic' | 'acid' | 'pierce' | 'blunt' | 'crit') {
    if (!mob || !mob.active || mob.hp <= 0) return;
    const finalDmg = Math.max(1, Math.round(dmg * this.damageMultiplier));

    if ((mob as any).mechaBossRef || mob.mobType === ('mecha_dragon' as any)) {
      if (this.mechaDragonBoss && this.mechaDragonBoss.active) {
        this.mechaDragonBoss.takeDamage(finalDmg);
        mob.hp = this.mechaDragonBoss.hp;

        if (hitType === 'whip' || this.selectedHeroKey === 'char_kraul') soundEngine.playWhipHit();
        else if (hitType === 'magic' || this.selectedHeroKey === 'char_omen') soundEngine.playMagicHit();
        else if (hitType === 'acid' || this.selectedHeroKey === 'char_grim') soundEngine.playAcidHit();
        else if (hitType === 'blunt' || this.selectedHeroKey === 'char_torf' || this.selectedHeroKey === 'char_bjorn') soundEngine.playBluntHit();
        else if (hitType === 'pierce' || this.selectedHeroKey === 'char_alrik') soundEngine.playPierceHit();
        else if (hitType === 'crit') soundEngine.playCritHit();
        else soundEngine.playBladeHit();

        this.showDamageNumber(mob.x, mob.y - 30, `-${finalDmg}`, '#f87171');
        mob.setTint(0xffffff);
        this.time.delayedCall(90, () => {
          if (mob && mob.active) mob.clearTint();
        });
      }
      return;
    }

    mob.hp -= finalDmg;

    // Trigger distinctive hit impact sound based on attack type or hero
    if (hitType === 'whip' || this.selectedHeroKey === 'char_kraul') {
      soundEngine.playWhipHit();
    } else if (hitType === 'magic' || this.selectedHeroKey === 'char_omen') {
      soundEngine.playMagicHit();
    } else if (hitType === 'acid' || this.selectedHeroKey === 'char_grim') {
      soundEngine.playAcidHit();
    } else if (hitType === 'blunt' || this.selectedHeroKey === 'char_torf' || this.selectedHeroKey === 'char_bjorn') {
      soundEngine.playBluntHit();
    } else if (hitType === 'pierce' || this.selectedHeroKey === 'char_alrik') {
      soundEngine.playPierceHit();
    } else if (hitType === 'crit') {
      soundEngine.playCritHit();
    } else if (hitType === 'blade') {
      soundEngine.playBladeHit();
    } else {
      soundEngine.playBladeHit();
    }

    this.showDamageNumber(mob.x, mob.y - 15, `-${finalDmg}`, '#f87171');
    mob.setTint(0xffffff);
    this.time.delayedCall(90, () => {
      if (mob && mob.active) mob.clearTint();
    });

    // Vampirism passive heal
    if (this.hasVampirism && !this.isPlayerDown && this.playerHp < this.playerMaxHp) {
      const healAmt = 5;
      this.playerHp = Math.min(this.playerMaxHp, this.playerHp + healAmt);
      this.updateHUD();
      this.showDamageNumber(this.player.x, this.player.y - 18, `+${healAmt} ❤`, '#4ade80');
    }

    // Ignite enemies from card perks (Torf magma ignite, Nihil astral burn, Bjorn, or Neutral ignite perk)
    if (this.hasIgnitePerk || this.torfMagmaIgnite || this.nihilAstralBurn || this.selectedHeroKey === 'char_bjorn') {
      this.applyMobBurn(mob, 3800, Math.round(26 * this.damageMultiplier), this.nihilAstralBurn);
    }

    if (mob.hpBar && mob.hpBar.active && typeof mob.hpBar.setDisplaySize === 'function') {
      const isBossRef = mob.mobType === 'cursed_knight' || (mob.mobType === 'miniboss_butcher' && this.currentFloor === this.maxFloors);
      const maxW = isBossRef ? 58 : 32;
      const pct = Math.max(0, mob.hp / mob.maxHp);
      mob.hpBar.setDisplaySize(Math.max(1, maxW * pct), mob.hpBar.height || 3);
    }

    if (mob.hp <= 0) {
      this.killMob(mob);
    }
  }

  private killMob(mob: DungeonMob) {
    if (!mob) return;
    soundEngine.playExplosion();
    const isBoss = mob.mobType === 'cursed_knight' || (mob.mobType === 'miniboss_butcher' && this.currentFloor === this.maxFloors);
    const isMiniBoss = mob.mobType === 'miniboss_bone_golem' || mob.mobType === 'miniboss_executioner' || (mob.mobType === 'miniboss_butcher' && !isBoss);
    const roomId = mob.roomId;
    const mobX = mob.x;
    const mobY = mob.y;

    // Boosted coin economy (+10% to +15% more coins overall)
    const goldDrop = isBoss ? 32 : (isMiniBoss ? 14 : (Math.random() < 0.38 ? Phaser.Math.Between(2, 4) : 0));
    if (goldDrop > 0) {
      this.dungeonGold += goldDrop;
      this.updateHUD();
      this.spawnPickup(mobX, mobY, 'coin');
    }

    // Health drops: strictly limited and valuable (12% for normal mobs, 100% for Boss, 50% for MiniBoss)
    if (isBoss || (isMiniBoss && Math.random() < 0.8) || Math.random() < 0.12) {
      this.spawnPickup(mobX + 16, mobY, 'heart');
    }

    if (mob.hpBar && mob.hpBar.active) mob.hpBar.destroy();
    if (mob.hpBarBg && mob.hpBarBg.active) mob.hpBarBg.destroy();
    if (mob.burnVisual && mob.burnVisual.active) {
      mob.burnVisual.destroy();
      mob.burnVisual = null;
    }

    const idx = this.mobs.indexOf(mob);
    if (idx !== -1) this.mobs.splice(idx, 1);
    if (this.mobsGroup && this.mobsGroup.contains(mob)) {
      this.mobsGroup.remove(mob, false, false);
    }
    if (mob.body) {
      mob.body.enable = false;
      mob.setVelocity(0, 0);
    }

    // Play enemy death animation: red flash, spinning tilt, squash & fade out
    mob.setTint(0xef4444);
    const deathAngle = (Math.random() > 0.5 ? 1 : -1) * Phaser.Math.Between(45, 90);

    // Floating soul icon / skull
    const skull = this.add.text(mobX, mobY - 8, '💀', {
      fontSize: '18px'
    }).setOrigin(0.5).setDepth(55);

    this.tweens.add({
      targets: skull,
      y: skull.y - 36,
      alpha: 0,
      scale: 1.4,
      duration: 500,
      ease: 'Sine.easeOut',
      onComplete: () => skull.destroy()
    });

    // Death dust / spark particles
    for (let p = 0; p < 6; p++) {
      const pColor = isBoss ? 0xfacc15 : (isMiniBoss ? 0xa855f7 : 0xef4444);
      const spark = this.add.circle(mobX, mobY, 3, pColor, 0.9).setDepth(54);
      const pAng = Math.random() * Math.PI * 2;
      const pDist = Phaser.Math.Between(18, 45);
      this.tweens.add({
        targets: spark,
        x: spark.x + Math.cos(pAng) * pDist,
        y: spark.y + Math.sin(pAng) * pDist,
        scale: 0.2,
        alpha: 0,
        duration: Phaser.Math.Between(280, 480),
        onComplete: () => spark.destroy()
      });
    }

    // Mob spin, squash and fade out
    this.tweens.add({
      targets: mob,
      angle: deathAngle,
      scaleX: mob.scaleX * 1.3,
      scaleY: 0.1,
      alpha: 0,
      y: mob.y + 10,
      duration: 300,
      ease: 'Quad.easeIn',
      onComplete: () => {
        if (mob && mob.active) {
          mob.destroy();
        }
      }
    });

    if (isBoss) {
      if (this.bossHpContainer) this.bossHpContainer.setVisible(false);
      if (this.domHud) this.domHud.showBossBar(false);
      soundEngine.setDungeonMusicState('ambient');
      stats.dungeonsCleared += 1;
      stats.bossesKilled += 1;

      const room = this.rooms.find(r => r.id === roomId);
      if (room) {
        room.cleared = true;
        this.doorsGroup.clear(true, true);
        this.buildVictoryPortal(room.worldX, room.worldY);
        this.updateMinimap();
      }
      this.showFloatingNotice('👑 ФИНАЛЬНЫЙ БОСС ПОВЕРЖЕН! ЗОЛОТОЙ ПОРТАЛ ПОБЕДЫ ОТКРЫТ!', '#facc15');
      CloudSyncManager.saveAllProgress();
      return;
    }

    if (isMiniBoss) {
      if (this.bossHpContainer) this.bossHpContainer.setVisible(false);
      if (this.domHud) this.domHud.showBossBar(false);
      soundEngine.setDungeonMusicState('ambient');
      stats.bossesKilled += 1;

      const room = this.rooms.find(r => r.id === roomId);
      if (room) {
        room.cleared = true;
        this.doorsGroup.clear(true, true);
        this.buildLevelPortal(room.worldX, room.worldY);
        this.updateMinimap();
      }
      this.showFloatingNotice('👑 МИНИ-БОСС ПОВЕРЖЕН! +80 🪙 МОНЕТ, +30 ⚡ ОЧКОВ!', '#facc15');
      CloudSyncManager.saveAllProgress();
      return;
    }

    // Check if room cleared
    const remainingInRoom = this.mobs.filter(m => m.active && m.roomId === roomId);
    if (remainingInRoom.length === 0) {
      const room = this.rooms.find(r => r.id === roomId);
      if (room && !room.cleared) {
        room.cleared = true;
        soundEngine.playLevelUp();
        soundEngine.setDungeonMusicState('ambient');
        this.doorsGroup.clear(true, true);
        this.showFloatingNotice(`✓ ${room.name} ЗАЧИЩЕНА! ВОРОТА ОТКРЫТЫ!`, '#4ade80');
        this.updateMinimap();
        if (room.type === 'combat') {
          this.spawnCombatRewardChest(room.worldX, room.worldY);
        }
      }
    }
  }

  private damagePlayer(dmg: number) {
    if (this.isPlayerDown) return;
    if (this.torfInvulnerable) return;

    let finalDmg = dmg;
    if (this.torfStoneSkin) {
      finalDmg = Math.round(dmg * 0.5);
    }

    // Sir Alrik's Heavy Platemail flat 10% damage reduction
    if (this.selectedHeroKey === 'char_alrik') {
      finalDmg = Math.round(finalDmg * 0.9);
      if (Math.random() < 0.3) {
        this.showDamageNumber(this.player.x, this.player.y - 40, '🛡 ЛАТЫ!', '#38bdf8');
      }
    }

    this.playerHp = Math.max(0, this.playerHp - finalDmg);
    this.updateHUD();
    soundEngine.playHit();

    // Solid damage tint without annoying alpha flickering or camera strobing
    this.player.setTint(0xff6666);
    this.time.delayedCall(90, () => {
      if (this.player && this.player.active && !this.isPlayerDown) {
        this.player.clearTint();
        this.player.setAlpha(1);
      }
    });

    if (this.playerHp <= 0) {
      this.isPlayerDown = true;
      this.player.setAngle(90);
      this.player.setTint(0x71717a);
      this.player.setVelocity(0, 0);
      this.showDefeatScreen();
    }
  }

  // --- DUAL WEAPON SWITCHING ---
  public switchWeapon(targetSlot?: number) {
    if (this.isPlayerDown || this.isUpgradeModalOpen) return;
    if (targetSlot !== undefined) {
      if (this.weapons[targetSlot]) {
        this.activeWeaponIndex = targetSlot;
      }
    } else {
      if (this.weapons[1] !== null) {
        this.activeWeaponIndex = 1 - this.activeWeaponIndex;
      }
    }
    this.applyEquippedWeapon();
    soundEngine.playClick();
  }

  private applyEquippedWeapon() {
    this.currentWeapon = this.weapons[this.activeWeaponIndex] || this.weapons[0]!;
    this.cdMax.attack = this.currentWeapon.attackSpeed;

    if (this.attackBtnIcon) {
      this.attackBtnIcon.setTexture(this.currentWeapon.texture);
    }
    if (this.attackBtnLabel) {
      this.attackBtnLabel.setText(this.currentWeapon.name);
    }
    if (this.playerWeaponVisual) {
      this.playerWeaponVisual.setTexture(this.currentWeapon.texture);
      this.playerWeaponVisual.setVisible(this.selectedHeroKey !== 'char_kraul' && !this.isMonster && !this.torfInvulnerable);
    }
    this.updateWeaponSlotsUI();
  }

  private updateWeaponSlotsUI() {
    if (!this.weaponSlot1Border || !this.weaponSlot2Border) return;
    const isSlot1 = this.activeWeaponIndex === 0;
    this.weaponSlot1Border.setStrokeStyle(isSlot1 ? 2 : 1, isSlot1 ? 0xf59e0b : 0x475569);
    this.weaponSlot2Border.setStrokeStyle(!isSlot1 ? 2 : 1, !isSlot1 ? 0xf59e0b : 0x475569);

    if (this.weapons[0] && this.weaponSlot1Icon) {
      this.weaponSlot1Icon.setTexture(this.weapons[0].texture).setVisible(true);
    }
    if (this.weaponSlot2Icon) {
      if (this.weapons[1]) {
        this.weaponSlot2Icon.setTexture(this.weapons[1].texture).setVisible(true);
      } else {
        this.weaponSlot2Icon.setVisible(false);
      }
    }
  }

  public cancelTorfStoneSkin() {
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
    this.cds.s2 = 2000;
    if (this.player && this.player.active) {
      this.showFloatingNotice('🛡 КАМЕННАЯ КОЖА ОТМЕНЕНА 🛡', '#60a5fa');
    }
  }

  // --- PLAYER SKILL EXECUTION (8-DIRECTIONAL AIMING WITH RED JOYSTICK) ---
  public executeCombatSkill(slot: 'attack' | 's1' | 's2' | 'ult', overrideDirX?: number, overrideDirY?: number) {
    if (this.isPlayerDown || this.isUpgradeModalOpen) return;

    // Torf S2 toggle cancellation
    if (this.selectedHeroKey === 'char_torf' && slot === 's2' && this.torfStoneSkin) {
      this.cancelTorfStoneSkin();
      return;
    }

    // Torf can cast ult during stone skin
    if (this.selectedHeroKey === 'char_torf' && slot === 'ult' && this.torfStoneSkin) {
      this.cancelTorfStoneSkin();
    }

    if (this.isUltChanneling && this.selectedHeroKey !== 'char_bjorn' && !(this.selectedHeroKey === 'char_torf' && slot === 'ult')) return;
    if (this.cds[slot] > 0) return;

    this.cds[slot] = this.cdMax[slot];
    if (slot !== 'attack') {
      // Prevent shooting standard weapon attack concurrently with skills
      this.cds.attack = Math.max(this.cds.attack, 280);
      if (this.aimLineGfx) {
        this.aimLineGfx.clear();
      }
    }

    let dirX = this.player.flipX ? -1 : 1;
    let dirY = 0;

    if (overrideDirX !== undefined && overrideDirY !== undefined && (overrideDirX !== 0 || overrideDirY !== 0)) {
      dirX = overrideDirX;
      dirY = overrideDirY;
    } else if (this.aimJoyVector.lengthSq() > 0.05) {
      dirX = this.aimJoyVector.x;
      dirY = this.aimJoyVector.y;
    } else if (this.aimVector.lengthSq() > 0.05) {
      dirX = this.aimVector.x;
      dirY = this.aimVector.y;
    } else if (this.joyStickVector.lengthSq() > 0.05) {
      dirX = this.joyStickVector.x;
      dirY = this.joyStickVector.y;
    }

    const dLen = Math.sqrt(dirX * dirX + dirY * dirY);
    if (dLen > 0) {
      dirX /= dLen;
      dirY /= dLen;
    }

    // Enforce player facing direction and weapon alignment to attack direction!
    if (this.selectedHeroKey === 'char_nihil') {
      this.player.setRotation(Math.atan2(dirY, dirX) + Math.PI / 2);
      this.player.setFlipX(false);
    } else if (dirX !== 0) {
      this.player.setFlipX(dirX < 0);
    }
    this.aimVector.set(dirX, dirY);
    this.attackFacingTimer = 350; // Maintain attack orientation during strafe

    if (this.playerWeaponVisual) {
      if (this.selectedHeroKey === 'char_kraul' || this.selectedHeroKey === 'char_nihil' || this.isMonster || this.torfInvulnerable) {
        this.playerWeaponVisual.setVisible(false);
      } else {
        this.playerWeaponVisual.setVisible(true);
        const facingRight = dirX >= 0;
        const facingAngle = Math.atan2(dirY, dirX);
        this.weaponAttackAngle = facingAngle;

        if (slot === 'attack') {
          if (this.selectedHeroKey === 'char_alrik') {
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
          } else {
            this.weaponSwingAngle = facingRight ? -0.4 : 0.4;
            this.tweens.add({
              targets: this,
              weaponSwingAngle: facingAngle + (facingRight ? 0.6 : -0.6),
              duration: 95,
              yoyo: true,
              ease: 'Quad.easeOut',
              onComplete: () => {
                this.weaponSwingAngle = 0;
              }
            });
          }
        }
        this.updateWeaponVisualPosition();
      }
    }

    if (slot === 'attack') this.executeWeaponAttack(dirX, dirY);
    else if (slot === 's1') this.executeSkill1(dirX, dirY);
    else if (slot === 's2') this.executeSkill2(dirX, dirY);
    else if (slot === 'ult') this.executeUlt(dirX, dirY);
  }

  private executeWeaponAttack(dirX: number, dirY: number) {
    if (this.isMonster) {
      soundEngine.playAttack();
      const bite = this.add.circle(this.player.x + dirX * 65, this.player.y + dirY * 65, 36, 0xef4444, 0.85).setDepth(100);
      this.tweens.add({
        targets: bite,
        scale: 1.5,
        alpha: 0,
        duration: 150,
        onComplete: () => bite.destroy()
      });
      this.mobs.forEach(m => {
        if (m.active && Phaser.Math.Distance.Between(this.player.x + dirX * 65, this.player.y + dirY * 65, m.x, m.y) < 85) {
          this.damageMob(m, 140);
        }
      });
      return;
    }

    const w = this.currentWeapon;

    if (w.energyCost > 0) {
      if (this.playerEnergy < w.energyCost) {
        this.showFloatingNotice('НЕДОСТАТОЧНО ЭНЕРГИИ!', '#fbbf24');
        this.cds.attack = 200;
        return;
      }
      this.playerEnergy -= w.energyCost;
      this.updateHUD();
    }

    if (w.rangeType === 'ranged_single' || w.rangeType === 'ranged_double' || w.rangeType === 'ranged_explosive') {
      if (w.id === 'weapon_flask_launcher') soundEngine.playFlaskLaunch();
      else if (w.id === 'weapon_crossbow' || w.id === 'weapon_repeater_crossbow') soundEngine.playCrossbowShoot();
      else if (w.id === 'weapon_pistols') soundEngine.playPistolShoot();
      else if (w.id === 'weapon_feather_darts' || this.selectedHeroKey === 'char_omen') soundEngine.playMagicArcaneShoot();
      else if (w.id === 'weapon_toxic_staff') soundEngine.playPoisonSpell();
      else if (w.id === 'weapon_thunder_hammer') soundEngine.playThunderBolt();
      else if (w.id === 'weapon_grenade_launcher') soundEngine.playGrenadeLaunch();
      else soundEngine.playCrossbowShoot();

      let projX = this.player.x;
      let projY = this.player.y;
      if (this.selectedHeroKey === 'char_nihil') {
        // Projectiles shoot right out of Nihil's mouth / head!
        projX = this.player.x + dirX * 20;
        projY = this.player.y + dirY * 20;
        const burst = this.add.circle(projX, projY, 8, 0xd8b4fe, 0.9).setDepth(48);
        this.tweens.add({ targets: burst, scale: 0.2, alpha: 0, duration: 140, onComplete: () => burst.destroy() });
      }

      this.firePlayerProjectile(projX, projY, dirX, dirY, w);
      if (w.rangeType === 'ranged_double' || this.grimDoubleBullet) {
        this.time.delayedCall(120, () => this.firePlayerProjectile(projX, projY, dirX, dirY, w));
      }
      return;
    }

    // Torf Heavy Fists Attack
    if (this.selectedHeroKey === 'char_torf' || w.id === 'weapon_stone_fists') {
      if (this.torfStoneSkin) {
        this.showFloatingNotice('КАМЕННАЯ КОЖА АКТИВНА!', '#38bdf8');
        this.cds.attack = 200;
        return;
      }

      this.time.delayedCall(100, () => {
        if (!this.player || !this.player.active || this.isPlayerDown) return;
        soundEngine.playStoneFistAttack();
        this.cameras.main.shake(120, 0.008);

        const hitX = this.player.x + dirX * 52;
        const hitY = this.player.y + dirY * 52;
        const facingAngle = Math.atan2(dirY, dirX);

        // Giant sweeping stone fists slam in wide arc
        const fist1 = this.add.circle(hitX - dirY * 22, hitY + dirX * 22, 22, 0x473d3a).setDepth(52);
        const fist2 = this.add.circle(hitX + dirY * 22, hitY - dirX * 22, 22, 0x57534e).setDepth(52);
        const shockArc = this.add.arc(hitX, hitY, 44, Phaser.Math.RadToDeg(facingAngle - 1.25), Phaser.Math.RadToDeg(facingAngle + 1.25), false, 0x60a5fa, 0.65).setDepth(50);

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

        const dmg = Math.round(w.damage * this.damageMultiplier);
        this.mobs.forEach(mob => {
          if (mob.active && Phaser.Math.Distance.Between(hitX, hitY, mob.x, mob.y) < 85) {
            this.damageMob(mob, dmg, 'blunt');
          }
        });
        this.checkDestructibleDamage(hitX, hitY, 85, dmg, true);
      });
      return;
    }

    if (this.selectedHeroKey === 'char_kraul' || w.id === 'weapon_kraul_whips') {
      soundEngine.playKraulWhipAttack();
      const hitX = this.player.x + dirX * 70;
      const hitY = this.player.y + dirY * 70;
      const facingAngle = Math.atan2(dirY, dirX);

      // Long whip snaps
      const whip1 = this.add.rectangle(hitX - dirY * 8, hitY + dirX * 8, 88, 3, 0x312e81).setDepth(45);
      const whip2 = this.add.rectangle(hitX + dirY * 8, hitY - dirX * 8, 88, 2, 0xa855f7).setDepth(46);
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

      const dmg = Math.round(w.damage * this.damageMultiplier);
      this.mobs.forEach(mob => {
        if (mob.active) {
          const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, mob.x, mob.y);
          if (dist <= 125) { // increased range matching whip indicator
            const mobAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, mob.x, mob.y);
            const angleDiff = Phaser.Math.Angle.Wrap(mobAngle - facingAngle);
            if (Math.abs(angleDiff) <= 0.55) { // Matching swing arc indicator
              this.damageMob(mob, dmg, 'whip');

              // Lifesteal/Vampirism passive during ultimate
              if (this.kraulUltActive) {
                const healAmt = Math.round(dmg * 0.15);
                this.playerHp = Math.min(this.playerMaxHp, this.playerHp + healAmt);
                this.updateHUD();
                this.showFloatingNotice(`+${healAmt} 🩸 ВАМПИРИЗМ`, '#22c55e');
              }
            }
          }
        }
      });
      this.checkDestructibleDamage(this.player.x + dirX * 70, this.player.y + dirY * 70, 70, dmg, true);

      // Adjust attack cooldown if in ultimate
      const finalCd = this.kraulUltActive ? (w.attackSpeed / 2) : w.attackSpeed;
      this.cds.attack = finalCd;
      return;
    }

    if (w.id === 'weapon_stick') {
      soundEngine.playStaffWhack();
      const hitX = this.player.x + dirX * 50;
      const hitY = this.player.y + dirY * 50;
      const facingAngle = Math.atan2(dirY, dirX);

      // Toxic green impact arc and poison splash (no duplicate stick spawned!)
      const toxicArc = this.add.arc(hitX, hitY, 36, Phaser.Math.RadToDeg(facingAngle - 0.8), Phaser.Math.RadToDeg(facingAngle + 0.8), false, 0x22c55e, 0.85).setDepth(46);
      this.tweens.add({ targets: toxicArc, scale: 1.5, alpha: 0, duration: 160, onComplete: () => toxicArc.destroy() });

      const puff = this.add.circle(hitX, hitY, 20, 0x84cc16, 0.65).setDepth(47);
      this.tweens.add({ targets: puff, scale: 2, alpha: 0, duration: 200, onComplete: () => puff.destroy() });

      this.mobs.forEach(mob => {
        if (mob.active && Phaser.Math.Distance.Between(hitX, hitY, mob.x, mob.y) < 85) {
          this.damageMob(mob, w.damage, 'acid');
        }
      });
      this.checkDestructibleDamage(hitX, hitY, 85, w.damage, false);
      return;
    }

    if (this.selectedHeroKey === 'char_alrik' || w.id === 'weapon_spear') {
      soundEngine.playSpearThrust();
      const hitX = this.player.x + dirX * 65;
      const hitY = this.player.y + dirY * 65;
      const facingAngle = Math.atan2(dirY, dirX);

      // Long narrow thrust visual (Tapered thrust line with white core and blue outer)
      const thrustOuter = this.add.rectangle(hitX, hitY, 80, 12, 0x0ea5e9, 0.8).setDepth(45);
      const thrustInner = this.add.rectangle(hitX, hitY, 80, 4, 0xffffff).setDepth(46);
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
      const puff = this.add.circle(this.player.x + dirX * 24, this.player.y + dirY * 24, 8, 0xf8fafc, 0.4).setDepth(44);
      this.tweens.add({
        targets: puff,
        scale: 1.8,
        alpha: 0,
        duration: 160,
        onComplete: () => puff.destroy()
      });

      const dmg = Math.round(w.damage * this.damageMultiplier);
      this.mobs.forEach(mob => {
        if (mob.active) {
          const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, mob.x, mob.y);
          if (dist <= 120) {
            const mobAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, mob.x, mob.y);
            const angleDiff = Phaser.Math.Angle.Wrap(mobAngle - facingAngle);
            if (Math.abs(angleDiff) <= 0.55) {
              this.damageMob(mob, dmg, 'pierce');
            }
          }
        }
      });
      this.checkDestructibleDamage(this.player.x + dirX * 70, this.player.y + dirY * 70, 70, dmg, true);
      return;
    }

    if (w.rangeType === 'melee_heavy_aoe' || w.rangeType === 'melee_fast') {
      soundEngine.playSwordSlash();
      const hitX = this.player.x + dirX * 50;
      const hitY = this.player.y + dirY * 50;
      const facingAngle = Math.atan2(dirY, dirX);

      // Sharp crisp axe/weapon slash directly in front of player
      const slash = this.add.rectangle(hitX, hitY, 50, 14, 0xe2e8f0).setDepth(45);
      slash.setRotation(facingAngle);
      this.tweens.add({
        targets: slash,
        scaleX: 1.4,
        alpha: 0,
        duration: 140,
        onComplete: () => slash.destroy()
      });

      const dmg = Math.round(w.damage * this.damageMultiplier);
      this.mobs.forEach(mob => {
        if (Phaser.Math.Distance.Between(hitX, hitY, mob.x, mob.y) < 85) {
          this.damageMob(mob, dmg, 'blade');
        }
      });
      this.checkDestructibleDamage(hitX, hitY, 85, dmg, dmg >= 45);
      return;
    }
  }

  private firePlayerProjectile(x: number, y: number, dirX: number, dirY: number, w: DungeonWeapon) {
    let tex = 'proj_bullet';
    if (w.id === 'weapon_feather_darts' || (this.selectedHeroKey === 'char_omen' && w.id === 'weapon_feather_darts')) {
      tex = 'proj_shadow_blade';
    } else if (w.id === 'weapon_nihil_sickle' || (this.selectedHeroKey === 'char_nihil')) {
      tex = 'proj_nihil_bullet';
    } else if (w.id === 'weapon_flask_launcher') {
      tex = 'proj_flask';
    } else if (w.id === 'weapon_crossbow') {
      tex = 'proj_arrow';
    } else if (w.id === 'weapon_repeater_crossbow') {
      tex = 'proj_heavy_bolt';
    } else if (w.id === 'weapon_thunder_hammer') {
      tex = 'proj_lightning_bolt';
    } else if (w.id === 'weapon_grenade_launcher') {
      tex = 'proj_goblin_bomb';
    } else if (w.id === 'weapon_toxic_staff') {
      tex = 'proj_toxic_spore';
    } else if (w.id === 'weapon_pistols') {
      tex = 'proj_bullet';
    } else if (this.selectedHeroKey === 'char_omen') {
      // Owl signature projectile fallback
      tex = 'proj_shadow_blade';
    }

    const proj = this.physics.add.sprite(x, y, tex).setDepth(45).setScale(1.4);
    this.projectiles.add(proj);
    proj.setData('weaponId', w.id);

    // Set a generous circular hitbox to avoid wall tunneling
    proj.setCircle(9, -2, -2);

    // Make all bullets significantly faster, snappier, and extremely satisfying!
    let speed = 1100; // high-speed snappy default bullet speed (increased from 680!)
    if (w.id === 'weapon_grenade_launcher') speed = 800; // heavy launcher (increased from 520 to 800!)
    else if (w.id === 'weapon_flask_launcher') speed = 850; // potions lob (increased from 550 to 850!)
    else if (tex === 'proj_arrow') speed = 1150; // high-speed sharp arrows (increased to 1150!)
    else if (tex === 'proj_heavy_bolt') speed = 1150; // heavy repeater bolt (increased to 1150!)
    else if (tex === 'proj_lightning_bolt') speed = 1250; // instant electric shockwave (increased to 1250!)
    else if (tex === 'proj_shadow_blade') speed = 750; // Omen's crimson blades (kept at 750, user says it's perfect)
    else if (tex === 'proj_nihil_bullet' || tex === 'proj_nihil_sickle') speed = 950; // Nihil's void mouth spit bullets
    else if (tex === 'proj_toxic_spore') speed = 980; // toxic spores speed

    proj.setVelocity(dirX * speed, dirY * speed);
    proj.setRotation(Math.atan2(dirY, dirX));

    // --- HIGH-FIDELITY THEMATIC PROJECTILE TRAILS ---
    if (tex === 'proj_nihil_bullet' || tex === 'proj_nihil_sickle') {
      // NIHIL: Ethereal Void Plasma Bullet spit directly from mouth
      proj.setScale(1.5).setTint(0xd8b4fe);
      this.time.addEvent({
        delay: 35,
        repeat: 12,
        callback: () => {
          if (proj && proj.active) {
            const trail = this.add.circle(proj.x, proj.y, 6, 0xa855f7, 0.7).setDepth(44);
            this.tweens.add({
              targets: trail,
              alpha: 0,
              scale: 0.2,
              duration: 160,
              onComplete: () => trail.destroy()
            });
            if (Math.random() > 0.4) {
              const spark = this.add.circle(proj.x + (Math.random() - 0.5) * 6, proj.y + (Math.random() - 0.5) * 6, 2.5, 0x38bdf8, 0.9).setDepth(44);
              this.tweens.add({
                targets: spark,
                scale: 0.1,
                alpha: 0,
                duration: 180,
                onComplete: () => spark.destroy()
              });
            }
          }
        }
      });
    } else if (tex === 'proj_shadow_blade') {
      // 1. OMEN (OWL): Vibrant crimson red blades with real-time shadow image trails
      proj.setScale(1.5).setTint(0xff3333);
      this.time.addEvent({
        delay: 45,
        repeat: 14,
        callback: () => {
          if (proj && proj.active) {
            const trail = this.add.image(proj.x, proj.y, 'proj_shadow_blade').setDepth(44).setScale(1.3).setAlpha(0.55).setTint(0xef4444);
            trail.setRotation(proj.rotation);
            this.tweens.add({
              targets: trail,
              alpha: 0,
              scale: 0.4,
              duration: 180,
              onComplete: () => trail.destroy()
            });
          }
        }
      });
    } else if (tex === 'proj_flask') {
      // 2. GRIM: Emerald Green bubbling trail for acid potions
      this.time.addEvent({
        delay: 50,
        repeat: 16,
        callback: () => {
          if (proj && proj.active) {
            const bubble = this.add.circle(proj.x + (Math.random() - 0.5) * 8, proj.y + (Math.random() - 0.5) * 8, 5, 0x10b981, 0.75).setDepth(44);
            this.tweens.add({
              targets: bubble,
              scale: 1.8,
              alpha: 0,
              y: bubble.y - 12,
              duration: 250,
              onComplete: () => bubble.destroy()
            });
          }
        }
      });
    } else if (tex === 'proj_lightning_bolt') {
      // 3. THUNDER HAMMER: Electric cyan spark arcs trailing behind lightning bolts
      this.time.addEvent({
        delay: 40,
        repeat: 20,
        callback: () => {
          if (proj && proj.active) {
            const spark = this.add.circle(proj.x, proj.y, 4, 0x38bdf8, 0.9).setDepth(44);
            this.tweens.add({
              targets: spark,
              x: spark.x + (Math.random() - 0.5) * 16,
              y: spark.y + (Math.random() - 0.5) * 16,
              scale: 0.2,
              alpha: 0,
              duration: 150,
              onComplete: () => spark.destroy()
            });
          }
        }
      });
    } else if (tex === 'proj_goblin_bomb') {
      // 4. GRENADE LAUNCHER: Dark smoke puffs and fiery orange sparks trailing behind bombs
      this.time.addEvent({
        delay: 45,
        repeat: 18,
        callback: () => {
          if (proj && proj.active) {
            // Smoke
            const smoke = this.add.circle(proj.x, proj.y, 7, 0x475569, 0.6).setDepth(43);
            this.tweens.add({ targets: smoke, scale: 2.0, alpha: 0, duration: 300, onComplete: () => smoke.destroy() });
            // Spark
            if (Math.random() > 0.4) {
              const spark = this.add.circle(proj.x, proj.y, 3, 0xf97316, 0.95).setDepth(44);
              this.tweens.add({
                targets: spark,
                x: spark.x - dirX * 24 + (Math.random() - 0.5) * 10,
                y: spark.y - dirY * 24 + (Math.random() - 0.5) * 10,
                alpha: 0,
                duration: 200,
                onComplete: () => spark.destroy()
              });
            }
          }
        }
      });
    } else if (tex === 'proj_arrow') {
      // 5. CROSSBOW: Clean woody wind streak lines trailing behind arrows
      this.time.addEvent({
        delay: 40,
        repeat: 16,
        callback: () => {
          if (proj && proj.active) {
            const streak = this.add.rectangle(proj.x, proj.y, 14, 2, 0xe2e8f0, 0.6).setDepth(44);
            streak.setRotation(proj.rotation);
            this.tweens.add({
              targets: streak,
              scaleX: 0.3,
              alpha: 0,
              duration: 160,
              onComplete: () => streak.destroy()
            });
          }
        }
      });
    } else if (tex === 'proj_heavy_bolt') {
      // 5b. REPEATER CROSSBOW: Thick steel fletching wind trails with red glowing particles
      this.time.addEvent({
        delay: 35,
        repeat: 18,
        callback: () => {
          if (proj && proj.active) {
            const streak = this.add.rectangle(proj.x, proj.y, 16, 3, 0x94a3b8, 0.5).setDepth(44);
            streak.setRotation(proj.rotation);
            this.tweens.add({ targets: streak, scaleX: 0.2, alpha: 0, duration: 180, onComplete: () => streak.destroy() });
            if (Math.random() > 0.5) {
              const rSpark = this.add.circle(proj.x, proj.y, 3, 0xef4444, 0.8).setDepth(45);
              this.tweens.add({ targets: rSpark, scale: 0.2, alpha: 0, duration: 200, onComplete: () => rSpark.destroy() });
            }
          }
        }
      });
    } else if (tex === 'proj_toxic_spore') {
      // 5c. TOXIC STAFF: Pulsing emerald bio-slime sparks and purple micro-spores
      this.time.addEvent({
        delay: 40,
        repeat: 16,
        callback: () => {
          if (proj && proj.active) {
            const spore = this.add.circle(proj.x, proj.y, 4, 0x7e22ce, 0.7).setDepth(44);
            this.tweens.add({ targets: spore, scale: 1.6, alpha: 0, duration: 220, onComplete: () => spore.destroy() });
            if (Math.random() > 0.4) {
              const slime = this.add.circle(proj.x + (Math.random() - 0.5) * 8, proj.y + (Math.random() - 0.5) * 8, 3, 0x22c55e, 0.8).setDepth(44);
              this.tweens.add({ targets: slime, scale: 0.2, alpha: 0, y: slime.y - 10, duration: 200, onComplete: () => slime.destroy() });
            }
          }
        }
      });
    } else {
      // 6. STANDARD BULLET: Sparkling golden sparks trailing behind bullets
      this.time.addEvent({
        delay: 45,
        repeat: 15,
        callback: () => {
          if (proj && proj.active) {
            const spark = this.add.circle(proj.x, proj.y, 2.5, 0xfacc15, 0.85).setDepth(44);
            this.tweens.add({
              targets: spark,
              scale: 0.3,
              alpha: 0,
              duration: 140,
              onComplete: () => spark.destroy()
            });
          }
        }
      });
    }

    const triggerExplosion = (ex: number, ey: number) => {
      if (!proj.active) return;
      proj.destroy();
      soundEngine.playExplosion();
      this.cameras.main.shake(200, 0.012);

      const expRing = this.add.circle(ex, ey, 70, 0xef4444, 0.85).setDepth(46);
      const expCore = this.add.circle(ex, ey, 35, 0xfde047, 0.95).setDepth(47);

      this.tweens.add({ targets: [expRing, expCore], scaleX: 1.4, scaleY: 1.4, alpha: 0, duration: 320, onComplete: () => {
        expRing.destroy();
        expCore.destroy();
      }});

      this.mobs.forEach(m => {
        if (m.active && Phaser.Math.Distance.Between(ex, ey, m.x, m.y) < 85) {
          this.damageMob(m, Math.round(w.damage * 1.25));
        }
      });
    };

    // Store explosion trigger callback directly on the projectile sprite
    proj.setData('triggerExplosion', () => triggerExplosion(proj.x, proj.y));

    if (this.mobsGroup) {
      this.physics.add.overlap(proj, this.mobsGroup, (_p, mob) => {
        if (!proj || !proj.active) return;
        const targetMob = mob as DungeonMob;
        if (!targetMob || !targetMob.active) return;

        if (w.id === 'weapon_grenade_launcher') {
          triggerExplosion(targetMob.x, targetMob.y);
        } else {
          let shouldDestroy = true;
          if (w.id === 'weapon_nihil_sickle' || tex === 'proj_nihil_sickle') {
            const hitMobs: any[] = proj.getData('hitMobs') || [];
            if (hitMobs.includes(targetMob)) return;
            hitMobs.push(targetMob);
            proj.setData('hitMobs', hitMobs);
            if (hitMobs.length < 2) {
              shouldDestroy = false;
            }
          }

          if (shouldDestroy) {
            proj.destroy();
          }

          let hitType: 'blade' | 'whip' | 'magic' | 'acid' | 'pierce' | 'blunt' | 'crit' = 'pierce';
          if (w.id === 'weapon_flask_launcher' || w.id === 'weapon_toxic_staff') hitType = 'acid';
          else if (w.id === 'weapon_feather_darts' || this.selectedHeroKey === 'char_omen') hitType = 'magic';
          else if (w.id === 'weapon_nihil_sickle' || this.selectedHeroKey === 'char_nihil') hitType = 'magic';
          else if (w.id === 'weapon_thunder_hammer' || w.id === 'weapon_boulder') hitType = 'blunt';
          else if (w.id === 'weapon_kraul_whips') hitType = 'whip';

          this.damageMob(targetMob, w.damage, hitType);

          if (w.id === 'weapon_flask_launcher') {
            soundEngine.playExplosion();
            const splash = this.add.circle(targetMob.x, targetMob.y, 45, 0x10b981, 0.55).setDepth(44);
            this.tweens.add({ targets: splash, alpha: 0, scaleX: 1.3, duration: 300, onComplete: () => splash.destroy() });
            const mobSnapshot = [...this.mobs];
            mobSnapshot.forEach(m => {
              if (m && m.active && m !== targetMob && Phaser.Math.Distance.Between(targetMob.x, targetMob.y, m.x, m.y) < 60) {
                this.damageMob(m, Math.round(w.damage * 0.7), 'acid');
              }
            });
          }
        }
      });
    }

    if (this.walls) {
      this.physics.add.collider(proj, this.walls, () => {
        if (!proj || !proj.active) return;
        if (w.id === 'weapon_grenade_launcher') {
          triggerExplosion(proj.x, proj.y);
        } else {
          const px = proj.x;
          const py = proj.y;
          proj.destroy();
          if (w.id === 'weapon_flask_launcher') {
            soundEngine.playExplosion();
            const splash = this.add.circle(px, py, 45, 0x10b981, 0.55).setDepth(44);
            this.tweens.add({ targets: splash, alpha: 0, scaleX: 1.3, duration: 300, onComplete: () => splash.destroy() });
          }
        }
      });
    }

    if (this.coverObstacles) {
      this.physics.add.collider(proj, this.coverObstacles, () => {
        if (!proj || !proj.active) return;
        if (w.id === 'weapon_grenade_launcher') {
          triggerExplosion(proj.x, proj.y);
        } else {
          const px = proj.x;
          const py = proj.y;
          proj.destroy();
          if (w.id === 'weapon_flask_launcher') {
            soundEngine.playExplosion();
            const splash = this.add.circle(px, py, 45, 0x10b981, 0.55).setDepth(44);
            this.tweens.add({ targets: splash, alpha: 0, scaleX: 1.3, duration: 300, onComplete: () => splash.destroy() });
          }
        }
      });
    }

    // For explosive/splash projectiles (flasks and grenades), burst upon reaching the aim range 260px
    if (w.id === 'weapon_flask_launcher' || w.id === 'weapon_grenade_launcher') {
      const rangedTrack = this.time.addEvent({
        delay: 16,
        repeat: 55,
        callback: () => {
          if (!proj || !proj.active) {
            rangedTrack.destroy();
            return;
          }
          if (Phaser.Math.Distance.Between(x, y, proj.x, proj.y) >= 260) {
            rangedTrack.destroy();
            if (w.id === 'weapon_grenade_launcher') {
              triggerExplosion(proj.x, proj.y);
            } else if (w.id === 'weapon_flask_launcher') {
              soundEngine.playExplosion();
              const splash = this.add.circle(proj.x, proj.y, 50, 0x10b981, 0.55).setDepth(44);
              this.tweens.add({ targets: splash, alpha: 0, scaleX: 1.3, duration: 300, onComplete: () => splash.destroy() });
              this.mobs.forEach(m => {
                if (m.active && Phaser.Math.Distance.Between(proj.x, proj.y, m.x, m.y) < 65) {
                  this.damageMob(m, Math.round(w.damage * 0.7));
                }
              });
              proj.destroy();
            }
          }
        }
      });
    }

    // Cap maximum travel distance of all bullets to 270px for fair arena PvP balance
    const maxBulletDist = 270;
    const bulletCapTrack = this.time.addEvent({
      delay: 16,
      repeat: 45,
      callback: () => {
        if (!proj || !proj.active) {
          bulletCapTrack.destroy();
          return;
        }
        if (Phaser.Math.Distance.Between(x, y, proj.x, proj.y) >= maxBulletDist) {
          bulletCapTrack.destroy();
          if (w.id === 'weapon_grenade_launcher') {
            triggerExplosion(proj.x, proj.y);
          } else {
            proj.destroy();
          }
        }
      }
    });

    this.time.delayedCall(w.id === 'weapon_grenade_launcher' ? 1200 : 2500, () => {
      if (proj && proj.active) {
        if (w.id === 'weapon_grenade_launcher') {
          triggerExplosion(proj.x, proj.y);
        } else {
          proj.destroy();
        }
      }
    });
  }

  private executeSkill1(dirX: number, dirY: number) {
    if (this.selectedHeroKey === 'char_zaza' && this.isMonster) {
      soundEngine.playWhirlwind();

      // Safe clamped dash so player doesn't clip through dungeon walls
      let finalX = this.player.x;
      let finalY = this.player.y;
      for (let step = 1; step <= 10; step++) {
        const testX = this.player.x + dirX * (18 * step);
        const testY = this.player.y + dirY * (18 * step);
        if (this.isPointInsideDungeonFloor(testX, testY)) {
          finalX = testX;
          finalY = testY;
        } else {
          break;
        }
      }

      this.tweens.add({
        targets: this.player,
        x: finalX,
        y: finalY,
        duration: 180,
        ease: 'Power2'
      });

      const clawSlash = this.add.circle(this.player.x + dirX * 70, this.player.y + dirY * 70, 45, 0xa855f7, 0.75).setDepth(45);
      this.tweens.add({ targets: clawSlash, scale: 1.6, alpha: 0, duration: 250, onComplete: () => clawSlash.destroy() });

      // Deal heavy damage along the monster dash path
      this.mobs.forEach(mob => {
        if (mob.active) {
          const dStart = Phaser.Math.Distance.Between(this.player.x, this.player.y, mob.x, mob.y);
          const dEnd = Phaser.Math.Distance.Between(finalX, finalY, mob.x, mob.y);
          if (dStart < 95 || dEnd < 95) {
            this.damageMob(mob, 160);
          }
        }
      });
      return;
    }

    soundEngine.playCast();
    if (this.selectedHeroKey === 'char_zaza') {
      this.firePoisonGlob(this.player.x, this.player.y, dirX, dirY, 50);
      if (this.zazaDoubleSpit) {
        this.time.delayedCall(120, () => {
          const angle = Math.atan2(dirY, dirX) + 0.25;
          this.firePoisonGlob(this.player.x, this.player.y, Math.cos(angle), Math.sin(angle), 50);
        });
      }
    } else if (this.selectedHeroKey === 'char_grim') {
      this.fireTarBomb(this.player.x, this.player.y, dirX, dirY);
    } else if (this.selectedHeroKey === 'char_torf') {
      this.fireTorfBoulder(this.player.x, this.player.y, dirX, dirY);
    } else if (this.selectedHeroKey === 'char_omen') {
      this.fireOmenShadowFan(this.player.x, this.player.y, dirX, dirY);
    } else if (this.selectedHeroKey === 'char_nihil') {
      this.fireNihilSingularity(dirX, dirY);
    } else if (this.selectedHeroKey === 'char_alrik') {
      this.fireAlrikCharge(this.player.x, this.player.y, dirX, dirY);
    } else if (this.selectedHeroKey === 'char_kraul') {
      this.fireKraulShadowDash(dirX, dirY);
    } else {
      this.fireBjornEarthquake(this.player.x, this.player.y, dirX, dirY);
    }
  }

  private getPointToLineSegmentDistance(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Phaser.Math.Distance.Between(px, py, x1, y1);
    
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    
    const projX = x1 + t * dx;
    const projY = y1 + t * dy;
    return Phaser.Math.Distance.Between(px, py, projX, projY);
  }

  private fireKraulShadowDash(dirX: number, dirY: number) {
    soundEngine.playWhirlwind();
    const startX = this.player.x;
    const startY = this.player.y;

    // Fast, almost invisible dash
    let finalX = startX;
    let finalY = startY;
    for (let step = 1; step <= 12; step++) {
      const testX = startX + dirX * (22 * step);
      const testY = startY + dirY * (22 * step);
      if (this.isPointInsideDungeonFloor(testX, testY)) {
        finalX = testX;
        finalY = testY;
      } else {
        break;
      }
    }

    // Shadow dash effect (faded duplicate)
    const shadowGhost = this.add.image(startX, startY, 'char_kraul')
      .setDepth(48).setAlpha(0.6).setTint(0x701a75);
    this.tweens.add({
      targets: shadowGhost,
      x: finalX,
      y: finalY,
      alpha: 0,
      duration: 150,
      onComplete: () => shadowGhost.destroy()
    });

    this.player.setPosition(finalX, finalY);

    // Purple shadow line showing trail
    const trailGfx = this.add.graphics().setDepth(47);
    trailGfx.lineStyle(4, 0xa855f7, 0.8);
    trailGfx.beginPath();
    trailGfx.moveTo(startX, startY);
    trailGfx.lineTo(finalX, finalY);
    trailGfx.strokePath();
    this.tweens.add({
      targets: trailGfx,
      alpha: 0,
      duration: 250,
      onComplete: () => trailGfx.destroy()
    });

    // Damage enemies passed through and apply bleed!
    this.mobs.forEach(mob => {
      if (mob.active) {
        // Distance from mob to the dash line segment!
        const distToDash = this.getPointToLineSegmentDistance(
          mob.x, mob.y,
          startX, startY,
          finalX, finalY
        );

        if (distToDash < 60) {
          this.damageMob(mob, 60); // Initial dash damage
          
          // Apply bleeding (3 ticks, 35 damage each)
          const bleed = (targetMob: any, ticks: number) => {
            if (!targetMob || !targetMob.active || targetMob.hp <= 0) return;
            this.damageMob(targetMob, 35);
            this.showDamageNumber(targetMob.x, targetMob.y - 30, 'КРОВОТЕЧЕНИЕ 🩸', '#ef4444');
            if (ticks > 1) {
              this.time.delayedCall(1000, () => bleed(targetMob, ticks - 1));
            }
          };
          this.time.delayedCall(1000, () => bleed(mob, 3));
        }
      }
    });
  }

  private fireKraulDeadGrip(dirX: number, dirY: number) {
    soundEngine.playCast();
    const startX = this.player.x;
    const startY = this.player.y;
    const range = 420; // High range hand extension

    // Find first active mob in the straight direction!
    let nearestMob: any = null;
    let minDist = range;

    this.mobs.forEach(mob => {
      if (mob.active && mob.hp > 0) {
        const d = Phaser.Math.Distance.Between(startX, startY, mob.x, mob.y);
        if (d <= range) {
          const segDist = this.getPointToLineSegmentDistance(mob.x, mob.y, startX, startY, startX + dirX * range, startY + dirY * range);
          const dot = (mob.x - startX) * dirX + (mob.y - startY) * dirY;
          if (dot > 0 && segDist <= 42) {
            if (d < minDist) {
              minDist = d;
              nearestMob = mob;
            }
          }
        }
      }
    });

    if (nearestMob) {
      const targetX = nearestMob.x;
      const targetY = nearestMob.y;

      // Draw long hand extension stretching to target
      const armLine = this.add.graphics().setDepth(52);
      armLine.lineStyle(5, 0x312e81, 1.0); // dark arm
      armLine.beginPath();
      armLine.moveTo(startX, startY);
      armLine.lineTo(targetX, targetY);
      armLine.strokePath();

      // Golden claw at target
      const handClaw = this.add.circle(targetX, targetY, 12, 0xfacc15, 0.95).setDepth(53);

      this.time.delayedCall(120, () => {
        armLine.destroy();
        handClaw.destroy();

        if (nearestMob && nearestMob.active && nearestMob.hp > 0) {
          // 1. Deal damage
          this.damageMob(nearestMob, 125);
          
          // 2. Stun target for 1 second
          nearestMob.isStunned = true;
          this.showDamageNumber(targetX, targetY - 30, 'ОГЛУШЕН! 😵', '#eab308');
          this.time.delayedCall(1000, () => {
            if (nearestMob && nearestMob.active) {
              nearestMob.isStunned = false;
            }
          });

          // 3. Clamped pull player to target
          let pullX = targetX - dirX * 45;
          let pullY = targetY - dirY * 45;
          if (!this.isPointInsideDungeonFloor(pullX, pullY)) {
            pullX = targetX;
            pullY = targetY;
          }

          this.tweens.add({
            targets: this.player,
            x: pullX,
            y: pullY,
            duration: 160,
            ease: 'Quad.easeOut'
          });
        }
      });
    } else {
      // Hand stretches into empty space and snaps back
      const targetX = startX + dirX * range;
      const targetY = startY + dirY * range;

      const armLine = this.add.graphics().setDepth(52);
      armLine.lineStyle(4, 0x312e81, 0.85);
      armLine.beginPath();
      armLine.moveTo(startX, startY);
      armLine.lineTo(targetX, targetY);
      armLine.strokePath();

      const handClaw = this.add.circle(targetX, targetY, 8, 0x701a75, 0.9).setDepth(53);

      this.time.delayedCall(140, () => {
        armLine.destroy();
        handClaw.destroy();
      });
    }
  }

  private fireNihilSingularity(dirX: number, dirY: number) {
    soundEngine.playCast();
    const castRange = 160;
    let targetX = this.player.x + dirX * castRange;
    let targetY = this.player.y + dirY * castRange;
    if (!this.isPointInsideDungeonFloor(targetX, targetY)) {
      targetX = this.player.x + dirX * 70;
      targetY = this.player.y + dirY * 70;
    }

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
    const timer = this.time.addEvent({
      delay: 500,
      repeat: 4,
      callback: () => {
        tickCount++;
        soundEngine.playPoison();

        this.mobs.forEach(mob => {
          if (mob && mob.active) {
            const dist = Phaser.Math.Distance.Between(targetX, targetY, mob.x, mob.y);
            if (dist < 110) {
              const pullAngle = Phaser.Math.Angle.Between(mob.x, mob.y, targetX, targetY);
              const pullForce = 16;
              const nextX = mob.x + Math.cos(pullAngle) * pullForce;
              const nextY = mob.y + Math.sin(pullAngle) * pullForce;
              if (this.isPointInsideDungeonFloor(nextX, nextY)) {
                mob.setPosition(nextX, nextY);
              }
              this.damageMob(mob, 40, 'magic');
            }
          }
        });

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
          singularityBg.destroy();
          singularityInner.destroy();
        }
      }
    });
  }

  private fireAlrikCharge(x: number, y: number, dirX: number, dirY: number) {
    soundEngine.playWhirlwind();
    let finalX = x;
    let finalY = y;
    for (let step = 1; step <= 15; step++) {
      const testX = x + dirX * (18 * step);
      const testY = y + dirY * (18 * step);
      if (this.isPointInsideDungeonFloor(testX, testY)) {
        finalX = testX;
        finalY = testY;
      } else {
        break;
      }
    }

    this.tweens.add({
      targets: this.player,
      x: finalX,
      y: finalY,
      duration: 180,
      ease: 'Power2'
    });

    const spearAura = this.add.circle(finalX, finalY, 50, 0x38bdf8, 0.6).setDepth(48);
    this.tweens.add({ targets: spearAura, scale: 1.5, alpha: 0, duration: 250, onComplete: () => spearAura.destroy() });

    this.mobs.forEach(mob => {
      if (mob.active) {
        const dStart = Phaser.Math.Distance.Between(x, y, mob.x, mob.y);
        const dEnd = Phaser.Math.Distance.Between(finalX, finalY, mob.x, mob.y);
        if (dStart < 85 || dEnd < 85) {
          this.damageMob(mob, Math.round(120 * this.damageMultiplier));
          mob.x += dirX * 50;
          mob.y += dirY * 50;
        }
      }
    });
    this.checkDestructibleDamage(finalX, finalY, 85, 120, true);
  }

  private fireOmenShadowFan(x: number, y: number, dirX: number, dirY: number) {
    soundEngine.playSlash();
    const baseAngle = Math.atan2(dirY, dirX);
    const angles = [-0.35, -0.18, 0, 0.18, 0.35];

    angles.forEach(offset => {
      const angle = baseAngle + offset;
      const bDirX = Math.cos(angle);
      const bDirY = Math.sin(angle);
      const blade = this.physics.add.sprite(x, y, 'proj_shadow_blade').setDepth(45).setScale(1.5);
      this.projectiles.add(blade);
      const speed = 520;
      blade.setVelocity(bDirX * speed, bDirY * speed);
      blade.setRotation(angle);

      const startX = x;
      const startY = y;
      let targetDist = 330;
      for (let s = 25; s <= 330; s += 15) {
        if (!this.isPointInsideDungeonFloor(startX + bDirX * s, startY + bDirY * s)) {
          targetDist = Math.max(30, s - 10);
          break;
        }
      }

      if (this.mobsGroup) {
        this.physics.add.overlap(blade, this.mobsGroup, (_b, mob) => {
          const targetMob = mob as DungeonMob;
          this.damageMob(targetMob, Math.round(75 * this.damageMultiplier));
          targetMob.isSlowed = true;
          this.time.delayedCall(2000, () => { if (targetMob && targetMob.active) targetMob.isSlowed = false; });
          blade.destroy();
        });
      }

      if (this.walls) {
        this.physics.add.collider(blade, this.walls, () => blade.destroy());
      }

      const trackEvent = this.time.addEvent({
        delay: 16,
        repeat: 60,
        callback: () => {
          if (!blade.active) {
            trackEvent.destroy();
            return;
          }
          if (Phaser.Math.Distance.Between(startX, startY, blade.x, blade.y) >= targetDist) {
            trackEvent.destroy();
            blade.destroy();
          }
        }
      });
    });
  }

  private fireTorfBoulder(x: number, y: number, dirX: number, dirY: number) {
    soundEngine.playBoulderThrow();
    const boulder = this.physics.add.sprite(x, y, 'proj_boulder').setDepth(45).setScale(1.4);
    this.projectiles.add(boulder);
    boulder.setVelocity(dirX * 440, dirY * 440);

    const startX = x;
    const startY = y;
    let targetDist = 310;
    for (let s = 25; s <= 310; s += 15) {
      if (!this.isPointInsideDungeonFloor(startX + dirX * s, startY + dirY * s)) {
        targetDist = Math.max(30, s - 10);
        break;
      }
    }

    let hasShattered = false;
    const shatterBoulder = (bx: number, by: number) => {
      if (hasShattered || !boulder.active) return;
      hasShattered = true;
      boulder.destroy();
      soundEngine.playExplosion();
      this.cameras.main.shake(200, 0.014);

      // Rock shockwave ring
      const ring = this.add.circle(bx, by, 75, 0x3b82f6, 0.7).setDepth(46);
      this.tweens.add({ targets: ring, scale: 1.5, alpha: 0, duration: 280, onComplete: () => ring.destroy() });

      // Flying rock debris shards in 6 directions
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        const shard = this.add.circle(bx, by, 6, 0x78716c).setDepth(47);
        this.tweens.add({
          targets: shard,
          x: bx + Math.cos(angle) * 55,
          y: by + Math.sin(angle) * 55,
          alpha: 0,
          scale: 0.3,
          duration: 300,
          onComplete: () => shard.destroy()
        });
      }

      this.mobs.forEach(m => {
        if (m.active && Phaser.Math.Distance.Between(bx, by, m.x, m.y) < 95) {
          this.damageMob(m, Math.round(170 * this.damageMultiplier));
        }
      });
      this.checkDestructibleDamage(bx, by, 95, 170, true);
    };

    if (this.mobsGroup) {
      this.physics.add.overlap(boulder, this.mobsGroup, (_b, mob) => {
        const targetMob = mob as DungeonMob;
        shatterBoulder(targetMob.x, targetMob.y);
      });
    }

    if (this.walls) {
      this.physics.add.collider(boulder, this.walls, () => {
        shatterBoulder(boulder.x, boulder.y);
      });
    }

    // Explode precisely when reaching the indicator range!
    const trackEvent = this.time.addEvent({
      delay: 16,
      repeat: 60,
      callback: () => {
        if (!boulder.active || hasShattered) {
          trackEvent.destroy();
          return;
        }
        const traveled = Phaser.Math.Distance.Between(startX, startY, boulder.x, boulder.y);
        if (traveled >= targetDist) {
          trackEvent.destroy();
          shatterBoulder(startX + dirX * targetDist, startY + dirY * targetDist);
        }
      }
    });
  }

  private firePoisonGlob(x: number, y: number, dirX: number, dirY: number, dmg: number) {
    const glob = this.physics.add.sprite(x, y, 'proj_toxic_spit').setDepth(45).setScale(1.4);
    glob.setVelocity(dirX * 380, dirY * 380);
    glob.setRotation(Math.atan2(dirY, dirX));

    const startX = x;
    const startY = y;
    let targetDist = 280;
    for (let s = 25; s <= 280; s += 15) {
      if (!this.isPointInsideDungeonFloor(startX + dirX * s, startY + dirY * s)) {
        targetDist = Math.max(30, s - 10);
        break;
      }
    }

    let hasBurst = false;
    const burstGlob = (gx: number, gy: number) => {
      if (hasBurst || !glob.active) return;
      hasBurst = true;
      glob.destroy();
      soundEngine.playPoison();
      const puddle = this.add.ellipse(gx, gy, 14, 8, 0x84cc16, 0.75).setDepth(10);
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
                this.mobs.forEach(m => {
                  if (m.active && Phaser.Math.Distance.Between(puddle.x, puddle.y, m.x, m.y) < 65) {
                    this.damageMob(m, 45);
                  }
                });
              }
            }
          });
          this.time.delayedCall(2500, () => puddle.destroy());
        }
      });
    };

    if (this.mobsGroup) {
      this.physics.add.overlap(glob, this.mobsGroup, (_g, mob) => {
        const targetMob = mob as DungeonMob;
        this.damageMob(targetMob, dmg);
        burstGlob(targetMob.x, targetMob.y);
      });
    }

    if (this.walls) {
      this.physics.add.collider(glob, this.walls, () => {
        burstGlob(glob.x, glob.y);
      });
    }

    // Distance tracking event so it bursts precisely at the indicator range!
    const trackEvent = this.time.addEvent({
      delay: 16,
      repeat: 60,
      callback: () => {
        if (!glob.active || hasBurst) {
          trackEvent.destroy();
          return;
        }
        const traveled = Phaser.Math.Distance.Between(startX, startY, glob.x, glob.y);
        if (traveled >= targetDist) {
          trackEvent.destroy();
          burstGlob(startX + dirX * targetDist, startY + dirY * targetDist);
        }
      }
    });
  }

  private fireTarBomb(x: number, y: number, dirX: number, dirY: number) {
    const bomb = this.physics.add.sprite(x, y, 'proj_tar_bomb').setDepth(45).setScale(1.3);
    bomb.setVelocity(dirX * 360, dirY * 360);
    bomb.setRotation(Math.atan2(dirY, dirX));

    const startX = x;
    const startY = y;
    let targetDist = 270;
    for (let s = 25; s <= 270; s += 15) {
      if (!this.isPointInsideDungeonFloor(startX + dirX * s, startY + dirY * s)) {
        targetDist = Math.max(30, s - 10);
        break;
      }
    }

    let hasBurst = false;
    const triggerTarSplash = (bx: number, by: number) => {
      if (hasBurst || !bomb.active) return;
      hasBurst = true;
      bomb.destroy();
      soundEngine.playExplosion();
      const slowPuddle = this.add.circle(bx, by, 50, 0x1e1b4b, 0.7).setDepth(15);
      this.mobs.forEach(m => {
        if (m.active && Phaser.Math.Distance.Between(bx, by, m.x, m.y) < 65) {
          this.damageMob(m, 65);
          m.isSlowed = true;
          this.time.delayedCall(2500, () => {
            if (m && m.active) m.isSlowed = false;
          });
        }
      });
      this.checkDestructibleDamage(bx, by, 65, 65, true);
      this.time.delayedCall(2500, () => slowPuddle.destroy());
    };

    if (this.mobsGroup) {
      this.physics.add.overlap(bomb, this.mobsGroup, (_b, mob) => {
        const targetMob = mob as DungeonMob;
        triggerTarSplash(targetMob.x, targetMob.y);
      });
    }

    if (this.walls) {
      this.physics.add.collider(bomb, this.walls, () => {
        triggerTarSplash(bomb.x, bomb.y);
      });
    }

    // Distance tracking event so it bursts precisely at the indicator range!
    const trackEvent = this.time.addEvent({
      delay: 16,
      repeat: 60,
      callback: () => {
        if (!bomb.active || hasBurst) {
          trackEvent.destroy();
          return;
        }
        const traveled = Phaser.Math.Distance.Between(startX, startY, bomb.x, bomb.y);
        if (traveled >= targetDist) {
          trackEvent.destroy();
          triggerTarSplash(startX + dirX * targetDist, startY + dirY * targetDist);
        }
      }
    });
  }

  private fireBjornEarthquake(x: number, y: number, dirX: number, dirY: number) {
    soundEngine.playExplosion();
    for (let step = 1; step <= 5; step++) {
      this.time.delayedCall(step * 70, () => {
        const spikeX = x + dirX * step * 44;
        const spikeY = y + dirY * step * 44;
        const spike = this.add.image(spikeX, spikeY, 'proj_rock_spike').setDepth(45).setScale(1.2);
        this.tweens.add({ targets: spike, alpha: 0, y: spikeY - 12, duration: 400, onComplete: () => spike.destroy() });
        this.mobs.forEach(mob => {
          if (Phaser.Math.Distance.Between(spikeX, spikeY, mob.x, mob.y) < 55) {
            this.damageMob(mob, 60);
          }
        });
        this.checkDestructibleDamage(spikeX, spikeY, 55, 60, true);
      });
    }
  }

  private isPointInsideDungeonFloor(px: number, py: number): boolean {
    if (!this.rooms || this.rooms.length === 0) return true;
    if (px < 0 || px > 8000 || py < 0 || py > 8000) return false;

    // Fast O(1) check in current room (covers >90% of checks during gameplay)
    if (this.currentRoomId) {
      const cur = this.roomsMap?.get(this.currentRoomId);
      if (cur && Math.abs(px - cur.worldX) <= cur.w / 2 - 8 && Math.abs(py - cur.worldY) <= cur.h / 2 - 8) {
        return true;
      }
    }

    // 1. Inside any room floor (generous room boundaries)
    for (const room of this.rooms) {
      if (Math.abs(px - room.worldX) <= room.w / 2 - 10 &&
          Math.abs(py - room.worldY) <= room.h / 2 - 10) {
        return true;
      }
    }

    // 2. Inside any corridor connecting adjacent rooms
    const cellSize = 1500;
    const doorHalfWidth = 90;

    for (const room of this.rooms) {
      const halfW = room.w / 2;
      const halfH = room.h / 2;
      const corridorLen = (cellSize - room.h) / 2 + 80;

      // North Corridor
      if (room.connections.north !== undefined) {
        if (Math.abs(px - room.worldX) <= doorHalfWidth &&
            py >= room.worldY - halfH - corridorLen && py <= room.worldY - halfH + 60) {
          return true;
        }
      }
      // South Corridor
      if (room.connections.south !== undefined) {
        if (Math.abs(px - room.worldX) <= doorHalfWidth &&
            py >= room.worldY + halfH - 60 && py <= room.worldY + halfH + corridorLen) {
          return true;
        }
      }
      // West Corridor
      if (room.connections.west !== undefined) {
        if (Math.abs(py - room.worldY) <= doorHalfWidth &&
            px >= room.worldX - halfW - corridorLen && px <= room.worldX - halfW + 60) {
          return true;
        }
      }
      // East Corridor
      if (room.connections.east !== undefined) {
        if (Math.abs(py - room.worldY) <= doorHalfWidth &&
            px >= room.worldX + halfW - 60 && px <= room.worldX + halfW + corridorLen) {
          return true;
        }
      }
    }

    return false;
  }

  private executeSkill2(dirX: number, dirY: number) {
    if (this.selectedHeroKey === 'char_zaza') {
      if (this.isMonster) {
        soundEngine.playMonsterUlt();
        this.time.addEvent({
          delay: 220,
          repeat: 2,
          callback: () => {
            if (!this.player || !this.player.active) return;
            const roar = this.add.circle(this.player.x, this.player.y, 25, 0xef4444, 0.6).setDepth(45);
            this.tweens.add({
              targets: roar,
              scale: 6,
              alpha: 0,
              duration: 350,
              onComplete: () => roar.destroy()
            });
            this.mobs.forEach(m => {
              if (m.active && Phaser.Math.Distance.Between(this.player.x, this.player.y, m.x, m.y) < 130) {
                this.damageMob(m, 85);
              }
            });
            this.checkDestructibleDamage(this.player.x, this.player.y, 130, 85, true);
          }
        });
      } else {
        soundEngine.playWhirlwind();
        // Rapid weapon spin animation on equipped weapon
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

        this.time.addEvent({
          delay: 190,
          repeat: 3,
          callback: () => {
            if (!this.player || !this.player.active) return;
            this.mobs.forEach(m => {
              if (m.active && Phaser.Math.Distance.Between(this.player.x, this.player.y, m.x, m.y) < 90) {
                this.damageMob(m, 55);
              }
            });
            this.checkDestructibleDamage(this.player.x, this.player.y, 90, 55, true);
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
      }
    } else if (this.selectedHeroKey === 'char_grim') {
      soundEngine.playCast();
      let safeX = this.player.x;
      let safeY = this.player.y;

      for (let dist = 5; dist <= 190; dist += 5) {
        const testX = this.player.x + dirX * dist;
        const testY = this.player.y + dirY * dist;
        if (this.isPointInsideDungeonFloor(testX, testY)) {
          safeX = testX;
          safeY = testY;
        } else {
          break;
        }
      }

      this.player.setPosition(safeX, safeY);
      this.player.setAlpha(0.25);
      this.time.delayedCall(1200, () => {
        if (this.player && this.player.active) this.player.setAlpha(1.0);
      });
    } else if (this.selectedHeroKey === 'char_bjorn') {
      soundEngine.playAttack();
      let chargeX = this.player.x;
      let chargeY = this.player.y;
      for (let s = 1; s <= 10; s++) {
        const tx = this.player.x + dirX * (23 * s);
        const ty = this.player.y + dirY * (23 * s);
        if (this.isPointInsideDungeonFloor(tx, ty)) {
          chargeX = tx;
          chargeY = ty;
        } else {
          break;
        }
      }

      this.tweens.add({
        targets: this.player,
        x: chargeX,
        y: chargeY,
        duration: 180
      });

      this.time.delayedCall(90, () => {
        this.mobs.forEach(m => {
          if (m.active && Phaser.Math.Distance.Between(this.player.x, this.player.y, m.x, m.y) < 85) {
            this.damageMob(m, 95);
            m.x += dirX * 40;
            m.y += dirY * 40;
          }
        });
        this.checkDestructibleDamage(this.player.x, this.player.y, 85, 95, true);
      });
    } else if (this.selectedHeroKey === 'char_torf') {
      // Skill 2: Stone Skin (Глухая оборона / Каменная кожа)
      soundEngine.playStoneSkin();
      this.torfStoneSkin = true;
      this.cds.attack = Math.max(this.cds.attack, 3500); // Cannot attack while in stone skin unless cancelled!
      this.showFloatingNotice('🛡 КАМЕННАЯ КОЖА! (-50% УРОНА) 🛡', '#60a5fa');

      if (this.torfShieldAura && this.torfShieldAura.active) this.torfShieldAura.destroy();
      if (this.torfShieldBorder && this.torfShieldBorder.active) this.torfShieldBorder.destroy();
      if (this.torfShieldTween) this.torfShieldTween.stop();
      if (this.torfCancelBadgeS2 && this.torfCancelBadgeS2.active) {
        this.torfCancelBadgeS2.destroy();
        this.torfCancelBadgeS2 = null;
      }

      if (this.skill2Circle) {
        this.torfCancelBadgeS2 = this.add.container(this.skill2Circle.x, this.skill2Circle.y).setDepth(216).setScrollFactor(0);
        const redBadge = this.add.circle(12, -12, 10, 0xef4444).setStrokeStyle(2, 0xffffff);
        const crossTxt = this.add.text(12, -12, '✕', {
          fontSize: '11px',
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
      }

      this.torfShieldAura = this.add.circle(this.player.x, this.player.y, 42, 0x38bdf8, 0.45).setDepth(49);
      this.torfShieldBorder = this.add.circle(this.player.x, this.player.y, 42).setStrokeStyle(3, 0xfacc15).setDepth(50);

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
            this.cds.attack = 0;
            if (this.player && this.player.active) {
              this.showFloatingNotice('КАМЕННАЯ КОЖА СПАЛА', '#94a3b8');
            }
          }
        }
      });
    } else if (this.selectedHeroKey === 'char_omen') {
      // Skill 2: Astral Dash & Decoy
      soundEngine.playCast();
      const startX = this.player.x;
      const startY = this.player.y;

      let safeX = startX;
      let safeY = startY;
      for (let dist = 10; dist <= 230; dist += 10) {
        const testX = startX + dirX * dist;
        const testY = startY + dirY * dist;
        if (this.isPointInsideDungeonFloor(testX, testY)) {
          safeX = testX;
          safeY = testY;
        } else {
          break;
        }
      }

      const shadowDecoy = this.add.image(startX, startY, 'char_omen').setDepth(48).setAlpha(0.75).setTint(0xef4444);
      this.player.setPosition(safeX, safeY);

      this.time.delayedCall(450, () => {
        if (shadowDecoy.active) {
          soundEngine.playExplosion();

          // Create an epic multilayer shadow explosion!
          const blast1 = this.add.circle(startX, startY, 40, 0x581c87, 0.9).setDepth(49); // Dark purple shadow core
          const blast2 = this.add.circle(startX, startY, 60, 0xdc2626, 0.6).setDepth(48); // Red fire middle
          const blast3 = this.add.circle(startX, startY, 80, 0xfacc15, 0.35).setDepth(47); // Yellow outer blast ring

          // Pulse & fade them with different speeds for dynamic texture
          this.tweens.add({ targets: blast1, scale: 2.2, alpha: 0, duration: 320, onComplete: () => blast1.destroy() });
          this.tweens.add({ targets: blast2, scale: 1.8, alpha: 0, duration: 250, onComplete: () => blast2.destroy() });
          this.tweens.add({ targets: blast3, scale: 1.4, alpha: 0, duration: 180, onComplete: () => blast3.destroy() });

          // Spawn flying shadow sparks/debris!
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

          shadowDecoy.destroy();

          this.mobs.forEach(m => {
            if (m.active && Phaser.Math.Distance.Between(startX, startY, m.x, m.y) < 90) {
              this.damageMob(m, Math.round(110 * this.damageMultiplier));
              if (m && m.active && m.hp > 0) {
                m.isSlowed = true;
                this.time.delayedCall(1800, () => { if (m && m.active && m.hp > 0) m.isSlowed = false; });
              }
            }
          });
        }
      });
    } else if (this.selectedHeroKey === 'char_alrik') {
      // Skill 2: Wide Sweep (Широкий взмах)
      soundEngine.playWhirlwind();
      const circleSweep = this.add.circle(this.player.x, this.player.y, 100).setStrokeStyle(3, 0x38bdf8).setDepth(48);
      const circleSweepFill = this.add.circle(this.player.x, this.player.y, 100, 0x60a5fa, 0.25).setDepth(47);
      this.tweens.add({
        targets: [circleSweep, circleSweepFill],
        scale: 1.4,
        alpha: 0,
        duration: 300,
        onUpdate: () => {
          if (circleSweep.active && this.player && this.player.active) {
            circleSweep.setPosition(this.player.x, this.player.y);
            circleSweepFill.setPosition(this.player.x, this.player.y);
          }
        },
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

      const dmg = Math.round(80 * this.damageMultiplier);
      this.mobs.forEach(mob => {
        if (mob.active && Phaser.Math.Distance.Between(this.player.x, this.player.y, mob.x, mob.y) < 110) {
          this.damageMob(mob, dmg);
          const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, mob.x, mob.y);
          const knockX = mob.x + Math.cos(angle) * 65;
          const knockY = mob.y + Math.sin(angle) * 65;
          if (this.isPointInsideDungeonFloor(knockX, knockY)) {
            mob.setPosition(knockX, knockY);
          }
        }
      });
      this.checkDestructibleDamage(this.player.x, this.player.y, 110, dmg, true);
    } else if (this.selectedHeroKey === 'char_kraul') {
      this.fireKraulDeadGrip(dirX, dirY);
    } else if (this.selectedHeroKey === 'char_nihil') {
      // Skill 2: Void Step (Шаг Пустоты)
      soundEngine.playCast();
      const startX = this.player.x;
      const startY = this.player.y;

      let safeX = startX;
      let safeY = startY;
      for (let dist = 10; dist <= 190; dist += 10) {
        const testX = startX + dirX * dist;
        const testY = startY + dirY * dist;
        if (this.isPointInsideDungeonFloor(testX, testY)) {
          safeX = testX;
          safeY = testY;
        } else {
          break;
        }
      }

      // Phantom trail behind warlock
      const shadow = this.add.image(startX, startY, 'char_nihil').setDepth(48).setAlpha(0.65).setTint(0xc084fc);
      this.tweens.add({
        targets: shadow,
        alpha: 0,
        scale: 0.8,
        duration: 300,
        onComplete: () => shadow.destroy()
      });

      this.player.setPosition(safeX, safeY);

      // Temporary 30% speed boost for 2 seconds
      const originalSpeed = this.heroData.speed;
      this.playerSpeed = originalSpeed * 1.30;
      this.time.delayedCall(2000, () => {
        this.playerSpeed = originalSpeed;
      });
    }
  }

  private executeUlt(dirX: number, dirY: number) {
    soundEngine.playExplosion();
    this.showFloatingNotice('★ АКТИВИРОВАНА СВЕРХСПОСОБНОСТЬ! ★', '#facc15');

    if (this.selectedHeroKey === 'char_zaza') {
      soundEngine.playMonsterUlt();
      this.isMonster = true;
      if (this.playerWeaponVisual) this.playerWeaponVisual.setVisible(false);
      this.player.setTexture('char_zaza_monster');
      this.player.setScale(1.8);
      this.playerHp = Math.min(this.playerMaxHp + 500, this.playerHp + 500);
      this.damageMultiplier = 1.6;

      // Transform Skill Icons to Monster icons!
      if (this.skill1BtnIcon) this.skill1BtnIcon.setTexture('skill_monster_1');
      if (this.skill2BtnIcon) this.skill2BtnIcon.setTexture('skill_monster_2');
      if (this.ultBtnIcon) this.ultBtnIcon.setTexture('skill_monster_1');

      const shock = this.add.circle(this.player.x, this.player.y, 12, 0xa855f7, 0.85).setDepth(100);
      this.tweens.add({
        targets: shock,
        scale: 16,
        alpha: 0,
        duration: 550,
        onComplete: () => shock.destroy()
      });
      this.checkDestructibleDamage(this.player.x, this.player.y, 140, 180, true);

      this.time.delayedCall(10000, () => {
        this.isMonster = false;
        if (this.player && this.player.active) {
          this.player.setTexture('char_zaza');
          this.player.setScale(1.2);
          if (this.playerWeaponVisual) this.playerWeaponVisual.setVisible(this.selectedHeroKey !== 'char_kraul');
        }
        // Revert skill icons to default Zaza skills!
        if (this.skill1BtnIcon) this.skill1BtnIcon.setTexture(this.heroData.skills[0]?.icon || 'skill_zaza_1');
        if (this.skill2BtnIcon) this.skill2BtnIcon.setTexture(this.heroData.skills[1]?.icon || 'skill_zaza_2');
        if (this.ultBtnIcon) this.ultBtnIcon.setTexture(this.heroData.skills[2]?.icon || 'skill_zaza_3');
        this.damageMultiplier = 1.0;
      });
    } else if (this.selectedHeroKey === 'char_grim') {
      let potX = this.player.x + dirX * 240;
      let potY = this.player.y + dirY * 240;
      for (let s = 12; s >= 1; s--) {
        const testX = this.player.x + dirX * (20 * s);
        const testY = this.player.y + dirY * (20 * s);
        if (this.isPointInsideDungeonFloor(testX, testY)) {
          potX = testX;
          potY = testY;
          break;
        }
      }
      const pot = this.add.image(potX, potY, 'proj_cauldron').setDepth(45).setScale(1.4);
      this.time.delayedCall(1400, () => {
        if (pot.active) pot.destroy();
        soundEngine.playExplosion();
        const expRing = this.add.circle(potX, potY, 120, 0xef4444, 0.85).setDepth(46);
        this.tweens.add({ targets: expRing, scaleX: 1.5, scaleY: 1.5, alpha: 0, duration: 350, onComplete: () => expRing.destroy() });

        this.mobs.forEach(mob => {
          if (mob.active && Phaser.Math.Distance.Between(potX, potY, mob.x, mob.y) < 140) {
            this.damageMob(mob, 220);
          }
        });
        this.checkDestructibleDamage(potX, potY, 140, 220, true);
      });
    } else if (this.selectedHeroKey === 'char_bjorn') {
      soundEngine.playWhirlwind();
      this.isUltChanneling = true;
      if (this.bjornActiveAxe && this.bjornActiveAxe.active) this.bjornActiveAxe.destroy();
      this.bjornActiveAxe = this.add.rectangle(this.player.x, this.player.y, 95, 16, 0xe2e8f0).setDepth(100);

      this.tweens.add({
        targets: [this.bjornActiveAxe, this.player],
        angle: 1440,
        duration: 1800,
        onUpdate: () => {
          if (this.bjornActiveAxe && this.bjornActiveAxe.active && this.player && this.player.active) {
            this.bjornActiveAxe.setPosition(this.player.x, this.player.y);
          }
        },
        onComplete: () => {
          this.isUltChanneling = false;
          if (this.player && this.player.active) this.player.angle = 0;
          if (this.bjornActiveAxe && this.bjornActiveAxe.active) {
            this.bjornActiveAxe.destroy();
            this.bjornActiveAxe = null;
          }
        }
      });

      this.time.addEvent({
        delay: 220,
        repeat: 7,
        callback: () => {
          if (!this.player || !this.player.active) return;
          this.mobs.forEach(mob => {
            if (mob.active && Phaser.Math.Distance.Between(this.player.x, this.player.y, mob.x, mob.y) < 110) {
              this.damageMob(mob, 75);
            }
          });
          this.checkDestructibleDamage(this.player.x, this.player.y, 110, 75, true);
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
    } else if (this.selectedHeroKey === 'char_torf') {
      // Ultimate: Underground Breach (Подземный прорыв)
      soundEngine.playBurrow();
      this.torfInvulnerable = true;
      this.isUltChanneling = true;
      this.player.setVisible(false);
      if (this.playerWeaponVisual) this.playerWeaponVisual.setVisible(false);
      this.showFloatingNotice('★ ПОДЗЕМНЫЙ ПРОРЫВ! ★', '#60a5fa');

      const origSpeed = this.playerSpeed;
      this.playerSpeed = origSpeed * 1.4;

      const burrowShadow = this.add.ellipse(this.player.x, this.player.y, 36, 18, 0x1c1917, 0.8).setDepth(45);
      const dustEvent = this.time.addEvent({
        delay: 130,
        repeat: 14,
        callback: () => {
          if (!this.player || !this.player.active) return;
          burrowShadow.setPosition(this.player.x, this.player.y);
          const dust = this.add.circle(this.player.x + (Math.random() - 0.5) * 16, this.player.y + (Math.random() - 0.5) * 16, 12, 0x78716c, 0.5).setDepth(44);
          this.tweens.add({ targets: dust, scale: 2.0, alpha: 0, duration: 250, onComplete: () => dust.destroy() });
        }
      });

      this.time.delayedCall(2000, () => {
        dustEvent.remove();
        burrowShadow.destroy();
        this.playerSpeed = origSpeed;
        this.player.setVisible(true);
        if (this.playerWeaponVisual) this.playerWeaponVisual.setVisible(!this.isMonster && this.selectedHeroKey !== 'char_kraul');
        this.torfInvulnerable = false;
        this.isUltChanneling = false;

        soundEngine.playErupt();
        this.cameras.main.shake(350, 0.022);

        const eruptRing = this.add.circle(this.player.x, this.player.y, 110, 0x3b82f6, 0.75).setDepth(52);
        this.tweens.add({ targets: eruptRing, scale: 1.8, alpha: 0, duration: 380, onComplete: () => eruptRing.destroy() });

        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI) / 4;
          const spikeX = this.player.x + Math.cos(angle) * 75;
          const spikeY = this.player.y + Math.sin(angle) * 75;
          const spike = this.add.image(spikeX, spikeY, 'proj_rock_spike').setScale(1.4).setDepth(53);
          this.tweens.add({ targets: spike, y: spikeY - 20, alpha: 0, duration: 400, onComplete: () => spike.destroy() });
        }

        this.mobs.forEach(m => {
          if (m.active && Phaser.Math.Distance.Between(this.player.x, this.player.y, m.x, m.y) < 145) {
            this.damageMob(m, Math.round(480 * this.damageMultiplier));
          }
        });
        this.checkDestructibleDamage(this.player.x, this.player.y, 145, 480, true);

        // Always create Seismic Fault / Ground Fissure when Torf unleashes his ultimate!
        this.spawnGroundFissure(this.player.x, this.player.y, 'seismic', 7500);
        this.showFloatingNotice('⚡ СЕЙСМИЧЕСКИЙ РАЗЛОМ ЗЕМЛИ! ⚡', '#f97316');
      });
    } else if (this.selectedHeroKey === 'char_omen') {
      // Ultimate: Shadow Flight, Airborne Reticle & Blind Slam (Теневое приземление)
      soundEngine.playCast();
      soundEngine.playExplosion();
      this.isUltChanneling = true;
      this.showFloatingNotice('★ ТЕНЕВОЙ ВЗЛЕТ И ПРИЦЕЛИВАНИЕ! ★', '#ef4444');

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

      // Invulnerability & Flight
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

          if (this.cursors) {
            if (this.cursors.left?.isDown || (this.keys?.A && this.keys.A.isDown)) dx = -1;
            else if (this.cursors.right?.isDown || (this.keys?.D && this.keys.D.isDown)) dx = 1;

            if (this.cursors.up?.isDown || (this.keys?.W && this.keys.W.isDown)) dy = -1;
            else if (this.cursors.down?.isDown || (this.keys?.S && this.keys.S.isDown)) dy = 1;
          }

          if (this.joyStickVector.lengthSq() > 0) {
            dx = this.joyStickVector.x;
            dy = this.joyStickVector.y;
          } else if (this.aimJoyVector && this.aimJoyVector.lengthSq() > 0) {
            dx = this.aimJoyVector.x;
            dy = this.aimJoyVector.y;
          }

          if (dx !== 0 || dy !== 0) {
            const testX = aimX + dx * 8.5;
            const testY = aimY + dy * 8.5;
            if (this.isPointInsideDungeonFloor(testX, testY)) {
              aimX = testX;
              aimY = testY;
            }
          }

          this.player.setPosition(aimX, aimY);
          reticleRing.setPosition(aimX, aimY);
          reticleFill.setPosition(aimX, aimY);
          reticleCross1.setPosition(aimX, aimY);
          reticleCross2.setPosition(aimX, aimY);
          reticleCenter.setPosition(aimX, aimY);
        }
      });

      // Slam Landing
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
          scale: 1.2,
          alpha: 1.0,
          duration: 160,
          ease: 'Quad.easeIn',
          onComplete: () => {
            this.torfInvulnerable = false;
            this.isUltChanneling = false;
            this.cameras.main.shake(350, 0.025);

            // Ultimate: Epic Dark Portal / Owl Shadow Slam Vortex Visuals!
            const impactCore = this.add.circle(aimX, aimY, 60, 0x3b0764, 0.95).setDepth(150); // Deep dark violet center
            const impactMiddle = this.add.circle(aimX, aimY, 110, 0x7e22ce, 0.75).setDepth(149); // Purple outer core
            const impactOuter = this.add.circle(aimX, aimY, 150, 0xdc2626, 0.45).setDepth(148); // Crimson red blast aura
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

            const finalDmg = Math.round(480 * this.damageMultiplier);
            this.mobs.forEach(m => {
              if (m.active && Phaser.Math.Distance.Between(aimX, aimY, m.x, m.y) <= 150) {
                const mobX = m.x;
                const mobY = m.y;
                this.damageMob(m, finalDmg);
                if (m && m.active && m.hp > 0) {
                  // Blindness effect: mob is blinded & disoriented for 2.0 seconds
                  m.isSlowed = true;
                  m.setTint(0x581c87);
                  this.showDamageNumber(m.x, m.y - 35, '🕶 СЛЕПОТА (2с)', '#c084fc');
                  this.time.delayedCall(2000, () => {
                    if (m && m.active && m.hp > 0) {
                      m.isSlowed = false;
                      m.clearTint();
                    }
                  });
                } else {
                  this.showDamageNumber(mobX, mobY - 35, '🕶 СЛЕПОТА (2с)', '#c084fc');
                }
              }
            });
            this.checkDestructibleDamage(aimX, aimY, 150, finalDmg, true);

            this.showFloatingNotice('⚔ ТЕНЕВОЙ СЛЭМ: СЛЕПОТА ВРАГОВ! ⚔', '#ef4444');
          }
        });
      });
    } else if (this.selectedHeroKey === 'char_alrik') {
      // Ultimate: Steel Phalanx (Стальная Фаланга)
      soundEngine.playStoneSkin();
      this.isUltChanneling = true;
      this.alrikShieldActive = true;
      this.alrikShieldAngle = Math.atan2(dirY, dirX);
      this.showFloatingNotice('★ СТАЛЬНАЯ ФАЛАНГА! ★', '#38bdf8');

      // Ground slam dust effect when sticking spear into ground
      soundEngine.playRockShatter();
      for (let s = 0; s < 6; s++) {
        const dust = this.add.circle(this.player.x + Math.cos(this.alrikShieldAngle) * 22, this.player.y + Math.sin(this.alrikShieldAngle) * 22, 6, 0x78716c, 0.6).setDepth(48);
        this.tweens.add({
          targets: dust,
          x: dust.x + (Math.random() - 0.5) * 35,
          y: dust.y + (Math.random() - 0.5) * 35,
          scale: 1.8,
          alpha: 0,
          duration: 300,
          onComplete: () => dust.destroy()
        });
      }

      // Wide energy shield rectangle visual in front of player
      this.alrikShieldGfx = this.add.rectangle(this.player.x, this.player.y, 80, 16, 0x38bdf8, 0.45).setStrokeStyle(3, 0x60a5fa).setDepth(52);

      // 3.0 seconds duration
      this.time.delayedCall(3000, () => {
        this.isUltChanneling = false;
        this.alrikShieldActive = false;
        if (this.alrikShieldGfx && this.alrikShieldGfx.active) {
          this.alrikShieldGfx.destroy();
        }
        this.showFloatingNotice('ЩИТ СТАЛЬНОЙ ФАЛАНГИ РАССЕЯЛСЯ', '#94a3b8');
        if (this.playerWeaponVisual) {
          this.playerWeaponVisual.setRotation(0);
        }
      });
    } else if (this.selectedHeroKey === 'char_kraul') {
      // Ultimate: Eerie Meatgrinder (Жуткая мясорубка)
      soundEngine.playCast();
      this.showFloatingNotice('★ ЖУТКАЯ МЯСОРУБКА! ★', '#c084fc');
      
      // Vertical yellow eyes flashing visual
      const leftEyeGfx = this.add.circle(this.player.x - 12, this.player.y - 25, 4, 0xfacc15, 0.95).setDepth(60);
      const rightEyeGfx = this.add.circle(this.player.x + 12, this.player.y - 25, 4, 0xfacc15, 0.95).setDepth(60);
      
      this.tweens.add({
        targets: [leftEyeGfx, rightEyeGfx],
        scaleX: 1.5,
        scaleY: 2.2,
        yoyo: true,
        repeat: -1,
        duration: 180
      });

      this.kraulUltActive = true;
      const originalSpeed = this.playerSpeed;
      this.playerSpeed = originalSpeed * 1.5; // Very high move speed

      // Aura on player
      const ultAura = this.add.circle(this.player.x, this.player.y, 45, 0x701a75, 0.35).setDepth(49);
      const auraTween = this.tweens.add({
        targets: ultAura,
        scale: 1.25,
        alpha: 0.15,
        duration: 250,
        yoyo: true,
        repeat: -1,
        onUpdate: () => {
          if (ultAura.active && this.player && this.player.active) {
            ultAura.setPosition(this.player.x, this.player.y);
            leftEyeGfx.setPosition(this.player.x - 8, this.player.y - 25);
            rightEyeGfx.setPosition(this.player.x + 8, this.player.y - 25);
          }
        }
      });

      // 4.0 seconds duration
      this.time.delayedCall(4000, () => {
        this.kraulUltActive = false;
        this.playerSpeed = originalSpeed;
        
        if (leftEyeGfx.active) leftEyeGfx.destroy();
        if (rightEyeGfx.active) rightEyeGfx.destroy();
        if (ultAura.active) ultAura.destroy();
        if (auraTween) auraTween.destroy();

        if (this.player && this.player.active) {
          this.showFloatingNotice('МЯСОРУБКА ЗАВЕРШЕНА', '#94a3b8');
        }
      });
    } else if (this.selectedHeroKey === 'char_nihil') {
      // Ultimate: Execution of Three Blades (Казнь Трех Клинков)
      soundEngine.playCast();
      this.cameras.main.shake(350, 0.02);

      // Create three huge falling sword/blade visual graphics
      const sx = this.player.x;
      const sy = this.player.y;

      const angles = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3]; // 120 degrees apart
      const radius = 95;

      angles.forEach((angle, idx) => {
        const fallX = sx + Math.cos(angle) * radius;
        const fallY = sy + Math.sin(angle) * radius;

        // Big vertical purple dagger blade
        const dagger = this.add.image(fallX, fallY - 200, 'skill_nihil_3').setDepth(160).setScale(3.5).setAlpha(0);
        
        // Falling tween
        this.tweens.add({
          targets: dagger,
          y: fallY,
          alpha: 1,
          duration: 380 + idx * 80,
          ease: 'Bounce.easeOut',
          onComplete: () => {
            soundEngine.playExplosion();
            this.cameras.main.shake(150, 0.015);

            // Ground impact dust/smoke and purple ring
            const impact = this.add.circle(fallX, fallY, 40, 0xc084fc, 0.6).setDepth(45);
            this.tweens.add({
              targets: impact,
              scale: 2.0,
              alpha: 0,
              duration: 250,
              onComplete: () => impact.destroy()
            });

            // Disappear sword after 1.5 seconds
            this.time.delayedCall(1500, () => {
              if (dagger.active) {
                this.tweens.add({
                  targets: dagger,
                  alpha: 0,
                  scale: 0.2,
                  duration: 250,
                  onComplete: () => dagger.destroy()
                });
              }
            });
          }
        });
      });

      // After 500ms (blades hit), apply massive 380 damage and 1.5s stun (freeze) to mobs in 180px radius!
      this.time.delayedCall(450, () => {
        soundEngine.playMonsterUlt();

        // Big flash ring around warlock
        const ultRing = this.add.circle(sx, sy, 180, 0xd8b4fe, 0.35).setDepth(44);
        this.tweens.add({
          targets: ultRing,
          scale: 1.5,
          alpha: 0,
          duration: 350,
          onComplete: () => ultRing.destroy()
        });

        this.mobs.forEach(m => {
          if (m && m.active) {
            const dist = Phaser.Math.Distance.Between(sx, sy, m.x, m.y);
            if (dist <= 180) {
              this.damageMob(m, Math.round(380 * this.damageMultiplier), 'magic');
              
              // Apply 1.5s Stun/Freeze (set speed to 0 and tint purple)
              if (m && m.active && m.hp > 0) {
                const originalMobSpeed = m.speed;
                m.speed = 0;
                m.setTint(0x4c1d95);
                this.showDamageNumber(m.x, m.y - 35, '⚡ ОГЛУШЕНИЕ (1.5с)', '#d8b4fe');
                this.time.delayedCall(1500, () => {
                  if (m && m.active && m.hp > 0) {
                    m.speed = originalMobSpeed;
                    m.clearTint();
                  }
                });
              }
            }
          }
        });
        this.checkDestructibleDamage(sx, sy, 180, 380, true);

        // Ground fracture perk for Nihil
        if (this.nihilGroundFracture) {
          this.spawnGroundFissure(sx, sy, 'void', 7500);
          this.showFloatingNotice('🔮 РАСКОЛ БЕЗДНЫ АКТИВИРОВАН! 🔮', '#c084fc');
        }
      });
    }
  }

  private upgradeModalObjects: Phaser.GameObjects.GameObject[] = [];

  // --- UPGRADE CARDS MODAL ---
  private buildUpgradeModal() {
    // Initialized dynamically on open
  }

  private closeUpgradeModal() {
    this.isUpgradeModalOpen = false;
    this.upgradeModalObjects.forEach(obj => {
      if (obj && obj.destroy) obj.destroy();
    });
    this.upgradeModalObjects = [];
  }

  private openUpgradeModal() {
    if (this.player && this.player.body) this.player.setVelocity(0, 0);
    this.clearInteraction();
    const rewardModal = new FloorRewardModal(this);
    rewardModal.open();
  }

  // --- MINIMAP (PROCEDURAL 14x14 PIXEL HUD RADAR) ---
  private buildMinimap() {
    const w = this.cameras.main.width;
    const mapSize = 130;
    const mapX = w - 90;
    const mapY = 90;

    this.minimapContainer = this.add.container(mapX, mapY).setScrollFactor(0).setDepth(200);
    const bgOuter = this.add.rectangle(0, 0, mapSize + 6, mapSize + 6, 0x0f172a, 0.95).setStrokeStyle(2, 0x38bdf8);
    const bgInner = this.add.rectangle(0, 0, mapSize, mapSize, 0x050a0e, 0.95);
    this.minimapGfx = this.add.graphics();

    // Strict geometry clipping mask inside minimap square
    const maskShape = this.make.graphics();
    maskShape.fillRect(mapX - mapSize / 2, mapY - mapSize / 2, mapSize, mapSize);
    const mask = maskShape.createGeometryMask();
    this.minimapContainer.setMask(mask);

    this.minimapContainer.add([bgOuter, bgInner, this.minimapGfx]);
    this.updateMinimap();
  }

  private updateMinimap() {
    if (!this.minimapGfx) return;
    this.minimapGfx.clear();

    // Clear old text icons
    this.minimapIcons.forEach(ic => ic.destroy());
    this.minimapIcons = [];

    if (this.rooms.length === 0) return;

    // Calculate dynamic grid bounds
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    this.rooms.forEach(r => {
      if (r.gridX < minX) minX = r.gridX;
      if (r.gridX > maxX) maxX = r.gridX;
      if (r.gridY < minY) minY = r.gridY;
      if (r.gridY > maxY) maxY = r.gridY;
    });

    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;

    const roomSize = 14; // Strictly 14x14 px per spec
    const stepDist = 20;
    const halfRoom = roomSize / 2;

    // 1. Draw connecting 1px corridors between adjacent rooms
    this.minimapGfx.lineStyle(1, 0x475569, 0.9);
    this.rooms.forEach(room => {
      const rx = Math.round((room.gridX - midX) * stepDist);
      const ry = Math.round((room.gridY - midY) * stepDist);

      if (room.connections.east !== undefined) {
        this.minimapGfx.lineBetween(rx + halfRoom, ry, rx + stepDist - halfRoom, ry);
      }
      if (room.connections.south !== undefined) {
        this.minimapGfx.lineBetween(rx, ry + halfRoom, rx, ry + stepDist - halfRoom);
      }
    });

    // 2. Draw 14x14 px squares & clear pixel icons for each room
    this.rooms.forEach(room => {
      const rx = Math.round((room.gridX - midX) * stepDist);
      const ry = Math.round((room.gridY - midY) * stepDist);

      if (!room.visited) {
        // Unexplored room: gray square (0x3f3f46) with 1px border & ❓ icon
        this.minimapGfx.fillStyle(0x3f3f46, 0.95);
        this.minimapGfx.fillRect(rx - halfRoom, ry - halfRoom, roomSize, roomSize);
        this.minimapGfx.lineStyle(1, 0x71717a, 1);
        this.minimapGfx.strokeRect(rx - halfRoom, ry - halfRoom, roomSize, roomSize);

        const qTxt = this.add.text(rx, ry, '❓', {
          fontSize: '8px', fontFamily: 'Consolas, monospace', resolution: 2
        }).setOrigin(0.5);
        this.minimapContainer.add(qTxt);
        this.minimapIcons.push(qTxt);
        return;
      }

      // Visited room
      const isCurrent = room.id === this.currentRoomId;
      this.minimapGfx.fillStyle(isCurrent ? 0x1e293b : 0x0f172a, 0.95);
      this.minimapGfx.fillRect(rx - halfRoom, ry - halfRoom, roomSize, roomSize);

      if (isCurrent) {
        // Current room: bright white highlight outline
        this.minimapGfx.lineStyle(2, 0xffffff, 1);
        this.minimapGfx.strokeRect(rx - halfRoom - 0.5, ry - halfRoom - 0.5, roomSize + 1, roomSize + 1);
      } else {
        // Regular visited 1px border
        this.minimapGfx.lineStyle(1, 0x64748b, 1);
        this.minimapGfx.strokeRect(rx - halfRoom, ry - halfRoom, roomSize, roomSize);
      }

      // Specified Room Icons:
      // 💀 — Бой с монстрами
      // 🐾 — Вербовка питомца/спутника
      // ⚖️ — Магазин торговца
      // 🩸 — Черный рынок
      // 👑 — Мини-босс / Босс
      let iconSymbol = '';
      if (room.type === 'combat') iconSymbol = '💀';
      else if (room.type === 'companion') iconSymbol = '🐾';
      else if (room.type === 'shop') iconSymbol = '⚖️';
      else if (room.type === 'market') iconSymbol = '🩸';
      else if (room.type === 'miniboss' || room.type === 'boss') iconSymbol = '👑';
      else if (room.type === 'portal') iconSymbol = '🌀';
      else if (room.type === 'treasure') iconSymbol = '✨';

      if (iconSymbol) {
        const iconTxt = this.add.text(rx, ry, iconSymbol, {
          fontSize: '9px', fontFamily: 'Consolas, monospace', resolution: 2
        }).setOrigin(0.5);
        this.minimapContainer.add(iconTxt);
        this.minimapIcons.push(iconTxt);
      }
    });
  }

  // --- HUD ---
  private buildHUD() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // Initialize Crisp Vector DOM HUD (HP, Mana, Floor, Coins, Minimal Pause [||], Boss Bar)
    if (this.domHud) {
      this.domHud.destroy();
    }
    this.domHud = new DungeonDOMHUD({
      playerHp: this.playerHp,
      playerMaxHp: this.playerMaxHp,
      playerEnergy: this.playerEnergy,
      playerMaxEnergy: this.playerMaxEnergy,
      currentFloor: this.currentFloor,
      maxFloors: this.maxFloors,
      skulls: this.dungeonGold,
      onPause: () => this.openPauseModal(),
      onInteract: () => {
        if (this.currentInteraction) {
          this.currentInteraction();
        }
      }
    });

    this.events.once('shutdown', () => {
      this.domHud?.destroy();
      this.domHud = null;
    });

    // Keyboard shortcuts for interaction
    this.input.keyboard?.on('keydown-E', () => {
      if (this.currentInteraction) this.currentInteraction();
    });
    this.input.keyboard?.on('keydown-SPACE', () => {
      if (this.currentInteraction && this.currentPromptText) {
        this.currentInteraction();
      }
    });
    this.input.keyboard?.on('keydown-ENTER', () => {
      if (this.currentInteraction) this.currentInteraction();
    });

    // Boss Top Bar Container (Canvas fallback)
    this.bossHpContainer = this.add.container(w / 2, 85).setScrollFactor(0).setDepth(250).setVisible(false);
    const bossBg = this.add.rectangle(0, 0, 324, 20, 0x000000).setStrokeStyle(2, 0xef4444);
    this.bossHpFill = this.add.rectangle(-160, 0, 320, 16, 0xdc2626).setOrigin(0, 0.5);
    this.bossHpText = this.add.text(0, 0, 'БОСС: ПРОКЛЯТЫЙ РЫЦАРЬ [3000 / 3000]', {
      fontSize: '12px', fontFamily: 'Consolas, monospace', resolution: 2, fontStyle: 'bold', color: '#ffffff'
    }).setOrigin(0.5);
    this.bossHpContainer.add([bossBg, this.bossHpFill, this.bossHpText]);

    this.updateHUD();
  }

  private updateHUD() {
    if (this.domHud) {
      this.domHud.updateHp(this.playerHp, this.playerMaxHp);
      this.domHud.updateEnergy(this.playerEnergy, this.playerMaxEnergy);
      this.domHud.updateSkulls(this.dungeonGold);
      this.domHud.updateFloor(this.currentFloor, this.maxFloors);
    }
  }

  // --- TOUCH CONTROLS WITH SPRITE ICONS & CUSTOMIZABLE LAYOUT ---
  private buildTouchControls() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const layout = getCustomControlsLayout();

    // Ensure multi-touch pointers exist up to 5 without endlessly accumulating on restarts
    const needed = 5 - this.input.manager.pointers.length;
    if (needed > 0) {
      this.input.addPointer(needed);
    }

    // Joystick
    const joyX = layout.joystick.x * w;
    const joyY = layout.joystick.y * h;
    this.joyStickBase = this.add.circle(joyX, joyY, 52, 0x27272a, 0.6).setScrollFactor(0).setDepth(210).setInteractive();
    this.joyStickThumb = this.add.circle(joyX, joyY, 26, 0x71717a, 0.8).setScrollFactor(0).setDepth(211);

    this.joyStickBase.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.joyStickPointerId = p.id;
      this.updateJoystick(p.x, p.y);
    });

    // Auto-claim active thumb if it was held down during floor descent transition
    this.time.delayedCall(50, () => {
      if (this.joyStickPointerId === null) {
        for (const p of this.input.manager.pointers) {
          if (p && p.isDown && p.x < w * 0.5) {
            this.joyStickPointerId = p.id;
            this.updateJoystick(p.x, p.y);
            break;
          }
        }
      }
    });

    // 1. RED AIM & SHOOT JOYSTICK (Aiming Joystick)
    const aimX = layout.attack.x * w;
    const aimY = layout.attack.y * h;
    this.aimJoyBase = this.add.circle(aimX, aimY, 52, 0x450a0a, 0.75)
      .setStrokeStyle(3, 0xef4444).setScrollFactor(0).setDepth(210).setInteractive();
    this.aimJoyThumb = this.add.circle(aimX, aimY, 26, 0xdc2626, 0.95)
      .setStrokeStyle(2, 0xfca5a5).setScrollFactor(0).setDepth(211);
    this.attackBtnIcon = this.add.image(aimX, aimY - 4, this.currentWeapon.texture)
      .setScale(1.2).setScrollFactor(0).setDepth(212);
    this.attackBtnLabel = this.add.text(aimX, aimY + 18, 'АТАКА', {
      fontSize: '9px', fontFamily: 'monospace', fontStyle: 'bold', color: '#fca5a5'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(212);

    // Smooth Circular Cooldown Overlays
    const atkCdOverlay = this.add.circle(aimX, aimY, 32, 0x000000, 0.6).setScrollFactor(0).setDepth(213).setVisible(false);
    this.cdOverlays.attack = atkCdOverlay;

    this.aimLineGfx = this.add.graphics().setDepth(48);

    this.aimJoyBase.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.aimJoyPointerId = p.id;
      this.aimJoyMoved = false;
      this.aimTouchStartTime = this.time.now;
      this.aimTouchStartX = p.x;
      this.aimTouchStartY = p.y;
    });

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      // Auto-claim left-side thumb for movement if not yet claimed
      if (this.joyStickPointerId === null && p.isDown && p.x < w * 0.5 && this.aimJoyPointerId !== p.id && this.skillAimPointerId !== p.id) {
        this.joyStickPointerId = p.id;
        if (this.joyStickBase && this.joyStickThumb) {
          this.joyStickBase.setPosition(p.x, p.y);
          this.joyStickThumb.setPosition(p.x, p.y);
        }
      }
      if (this.joyStickPointerId === p.id) this.updateJoystick(p.x, p.y);

      if (this.aimJoyPointerId === p.id) {
        const moveDist = Phaser.Math.Distance.Between(this.aimTouchStartX, this.aimTouchStartY, p.x, p.y);
        if (moveDist > 16) {
          this.aimJoyMoved = true;
        }
        if (this.aimJoyMoved) {
          this.updateAimJoystick(p.x, p.y);
        }
      }
      if (this.aimingSkillSlot !== null && this.skillAimPointerId === p.id) {
        this.updateAimingSkill(p.x, p.y);
      }
    });

    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (this.joyStickPointerId === p.id) {
        this.joyStickPointerId = null;
        this.joyStickVector.set(0, 0);
        const l = getCustomControlsLayout();
        const defX = l.joystick.x * this.cameras.main.width;
        const defY = l.joystick.y * this.cameras.main.height;
        if (this.joyStickThumb && this.joyStickBase) {
          this.joyStickBase.setPosition(defX, defY);
          this.joyStickThumb.setPosition(defX, defY);
        }
      }
      if (this.aimJoyPointerId === p.id) {
        this.aimJoyPointerId = null;
        if (this.aimJoyThumb && this.aimJoyBase) {
          this.aimJoyThumb.setPosition(this.aimJoyBase.x, this.aimJoyBase.y);
        }
        if (this.aimLineGfx) this.aimLineGfx.clear();

        const touchDuration = this.time.now - this.aimTouchStartTime;
        const moveDist = Phaser.Math.Distance.Between(this.aimTouchStartX, this.aimTouchStartY, p.x, p.y);

        // BRAWL STARS AUTO-AIM: Quick tap auto-targets closest mob / facing direction
        if (!this.aimJoyMoved || (touchDuration < 380 && moveDist < 24)) {
          this.autoAimAndAttackDungeon();
        } else {
          if (this.aimJoyVector.lengthSq() > 0.05) {
            this.executeCombatSkill('attack', this.aimJoyVector.x, this.aimJoyVector.y);
          }
        }
        this.aimJoyVector.set(0, 0);
        this.aimJoyMoved = false;
      }
      if (this.aimingSkillSlot !== null && this.skillAimPointerId === p.id) {
        this.finishAimingSkill(p.x, p.y);
      }
    });

    // 1b. DUAL WEAPON SLOTS & WEAPON SWITCH BUTTON
    const swX = w - 60;
    const swY = h - 220;

    const bigSwitchBg = this.add.rectangle(swX, swY, 58, 58, 0x181c2b, 0.95)
      .setStrokeStyle(2, 0x0284c7).setScrollFactor(0).setDepth(210).setInteractive({ useHandCursor: true });

    this.weaponSlot1Icon = this.add.image(swX - 10, swY - 5, this.weapons[0]?.texture || 'weapon_stick')
      .setScale(1.1).setScrollFactor(0).setDepth(211);
    this.weaponSlot2Icon = this.add.image(swX + 10, swY - 5, this.weapons[1]?.texture || 'weapon_stick')
      .setScale(1.1).setScrollFactor(0).setDepth(211).setVisible(this.weapons[1] !== null);

    const swLbl = this.add.text(swX, swY + 16, '🔄 СМЕНА', {
      fontSize: '8px', fontFamily: 'monospace', fontStyle: 'bold', color: '#38bdf8'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(212);

    const doSwitch = () => {
      soundEngine.playClick();
      this.switchWeapon();
      this.tweens.add({ targets: bigSwitchBg, scaleX: 1.15, scaleY: 1.15, duration: 100, yoyo: true });
    };

    bigSwitchBg.on('pointerdown', doSwitch);
    this.weaponSlot1Border = bigSwitchBg;
    this.weaponSlot2Border = bigSwitchBg;

    this.updateWeaponSlotsUI();

    // 2. SKILL 1
    const s1X = layout.s1.x * w;
    const s1Y = layout.s1.y * h;
    this.skill1Circle = this.add.circle(s1X, s1Y, 26, 0x16a34a, 0.85).setScrollFactor(0).setDepth(210).setInteractive({ useHandCursor: true });
    this.skill1BtnIcon = this.add.image(s1X, s1Y, this.heroData.skills[0]?.icon || 'skill_zaza_1').setScale(1.0).setScrollFactor(0).setDepth(211);
    this.skill1Label = this.add.text(s1X, s1Y + 15, '[ 1 ]', { fontSize: '8px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5).setScrollFactor(0).setDepth(212);
    const s1CdOverlay = this.add.circle(s1X, s1Y, 26, 0x000000, 0.6).setScrollFactor(0).setDepth(213).setVisible(false);
    const s1CdTxt = this.add.text(s1X, s1Y, '', { fontSize: '11px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5).setScrollFactor(0).setDepth(214);
    this.cdOverlays.s1 = s1CdOverlay;
    this.cdTextLabels.s1 = s1CdTxt;
    this.skill1Circle.on('pointerdown', (p: Phaser.Input.Pointer) => this.startAimingSkill('s1', p, this.skill1Circle.x, this.skill1Circle.y, this.skill1Circle));

    // 3. SKILL 2
    const s2X = layout.s2.x * w;
    const s2Y = layout.s2.y * h;
    this.skill2Circle = this.add.circle(s2X, s2Y, 26, 0x2563eb, 0.85).setScrollFactor(0).setDepth(210).setInteractive({ useHandCursor: true });
    this.skill2BtnIcon = this.add.image(s2X, s2Y, this.heroData.skills[1]?.icon || 'skill_zaza_2').setScale(1.0).setScrollFactor(0).setDepth(211);
    this.skill2Label = this.add.text(s2X, s2Y + 15, '[ 2 ]', { fontSize: '8px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5).setScrollFactor(0).setDepth(212);
    const s2CdOverlay = this.add.circle(s2X, s2Y, 26, 0x000000, 0.6).setScrollFactor(0).setDepth(213).setVisible(false);
    const s2CdTxt = this.add.text(s2X, s2Y, '', { fontSize: '11px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5).setScrollFactor(0).setDepth(214);
    this.cdOverlays.s2 = s2CdOverlay;
    this.cdTextLabels.s2 = s2CdTxt;
    this.skill2Circle.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.selectedHeroKey === 'char_torf' && this.torfStoneSkin) {
        this.cancelTorfStoneSkin();
        return;
      }
      this.startAimingSkill('s2', p, this.skill2Circle.x, this.skill2Circle.y, this.skill2Circle);
    });

    // 4. ULTIMATE
    const ultX = layout.ult.x * w;
    const ultY = layout.ult.y * h;
    this.ultCircle = this.add.circle(ultX, ultY, 28, 0x9333ea, 0.9).setStrokeStyle(3, 0xfacc15).setScrollFactor(0).setDepth(210).setInteractive({ useHandCursor: true });
    this.ultBtnIcon = this.add.image(ultX, ultY, this.heroData.skills[2]?.icon || 'skill_zaza_3').setScale(1.1).setScrollFactor(0).setDepth(211);
    this.ultLabel = this.add.text(ultX, ultY + 17, '[ ★ ]', { fontSize: '8px', fontFamily: 'monospace', fontStyle: 'bold', color: '#fef08a' }).setOrigin(0.5).setScrollFactor(0).setDepth(212);
    const ultCdOverlay = this.add.circle(ultX, ultY, 28, 0x000000, 0.6).setScrollFactor(0).setDepth(213).setVisible(false);
    const ultCdTxt = this.add.text(ultX, ultY, '', { fontSize: '12px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5).setScrollFactor(0).setDepth(214);
    this.cdOverlays.ult = ultCdOverlay;
    this.cdTextLabels.ult = ultCdTxt;
    this.ultCircle.on('pointerdown', (p: Phaser.Input.Pointer) => this.startAimingSkill('ult', p, this.ultCircle.x, this.ultCircle.y, this.ultCircle));

    // 5. CANCEL AIM ZONE
    const cancelZoneX = (layout.cancel ? layout.cancel.x : DEFAULT_CONTROLS_LAYOUT.cancel.x) * w;
    const cancelZoneY = (layout.cancel ? layout.cancel.y : DEFAULT_CONTROLS_LAYOUT.cancel.y) * h;
    this.cancelAimZoneContainer = this.add.container(cancelZoneX, cancelZoneY).setScrollFactor(0).setDepth(240).setVisible(false);
    this.cancelAimZoneBg = this.add.circle(0, 0, 32, 0xdc2626, 0.85).setStrokeStyle(2, 0xfca5a5);
    const cancelIcon = this.add.text(0, -6, '✕', {
      fontSize: '18px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffffff'
    }).setOrigin(0.5);
    const cancelLbl = this.add.text(0, 12, 'ОТМЕНА', {
      fontSize: '8px', fontFamily: 'monospace', fontStyle: 'bold', color: '#fef2f2'
    }).setOrigin(0.5);
    this.cancelAimZoneContainer.add([this.cancelAimZoneBg, cancelIcon, cancelLbl]);

    // Listen for custom controls layout updates
    this.controlsChangedListener = () => {
      this.repositionTouchControls();
    };
    window.addEventListener('controls-layout-changed', this.controlsChangedListener);
    this.events.once('shutdown', () => {
      if (this.controlsChangedListener) {
        window.removeEventListener('controls-layout-changed', this.controlsChangedListener);
      }
    });
  }

  private repositionTouchControls() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const layout = getCustomControlsLayout();

    const joyX = layout.joystick.x * w;
    const joyY = layout.joystick.y * h;
    if (this.joyStickBase) this.joyStickBase.setPosition(joyX, joyY);
    if (this.joyStickThumb && this.joyStickPointerId === null) this.joyStickThumb.setPosition(joyX, joyY);

    const aimX = layout.attack.x * w;
    const aimY = layout.attack.y * h;
    if (this.aimJoyBase) this.aimJoyBase.setPosition(aimX, aimY);
    if (this.aimJoyThumb && this.aimJoyPointerId === null) this.aimJoyThumb.setPosition(aimX, aimY);
    if (this.attackBtnIcon) this.attackBtnIcon.setPosition(aimX, aimY - 4);
    if (this.attackBtnLabel) this.attackBtnLabel.setPosition(aimX, aimY + 18);
    if (this.cdOverlays.attack) this.cdOverlays.attack.setPosition(aimX, aimY);

    const s1X = layout.s1.x * w;
    const s1Y = layout.s1.y * h;
    if (this.skill1Circle) this.skill1Circle.setPosition(s1X, s1Y);
    if (this.skill1BtnIcon) this.skill1BtnIcon.setPosition(s1X, s1Y);
    if (this.skill1Label) this.skill1Label.setPosition(s1X, s1Y + 15);
    if (this.cdOverlays.s1) this.cdOverlays.s1.setPosition(s1X, s1Y);
    if (this.cdTextLabels.s1) this.cdTextLabels.s1.setPosition(s1X, s1Y);

    const s2X = layout.s2.x * w;
    const s2Y = layout.s2.y * h;
    if (this.skill2Circle) this.skill2Circle.setPosition(s2X, s2Y);
    if (this.skill2BtnIcon) this.skill2BtnIcon.setPosition(s2X, s2Y);
    if (this.skill2Label) this.skill2Label.setPosition(s2X, s2Y + 15);
    if (this.cdOverlays.s2) this.cdOverlays.s2.setPosition(s2X, s2Y);
    if (this.cdTextLabels.s2) this.cdTextLabels.s2.setPosition(s2X, s2Y);
    if (this.torfCancelBadgeS2) this.torfCancelBadgeS2.setPosition(s2X, s2Y);

    const ultX = layout.ult.x * w;
    const ultY = layout.ult.y * h;
    if (this.ultCircle) this.ultCircle.setPosition(ultX, ultY);
    if (this.ultBtnIcon) this.ultBtnIcon.setPosition(ultX, ultY);
    if (this.ultLabel) this.ultLabel.setPosition(ultX, ultY + 17);
    if (this.cdOverlays.ult) this.cdOverlays.ult.setPosition(ultX, ultY);
    if (this.cdTextLabels.ult) this.cdTextLabels.ult.setPosition(ultX, ultY);

    const cancelX = (layout.cancel ? layout.cancel.x : DEFAULT_CONTROLS_LAYOUT.cancel.x) * w;
    const cancelY = (layout.cancel ? layout.cancel.y : DEFAULT_CONTROLS_LAYOUT.cancel.y) * h;
    if (this.cancelAimZoneContainer) this.cancelAimZoneContainer.setPosition(cancelX, cancelY);
  }

  private updateJoystick(px: number, py: number) {
    const dx = px - this.joyStickBase.x;
    const dy = py - this.joyStickBase.y;
    const dist = Math.min(Math.sqrt(dx * dx + dy * dy), 52);
    const angle = Math.atan2(dy, dx);
    this.joyStickThumb.setPosition(
      this.joyStickBase.x + Math.cos(angle) * dist,
      this.joyStickBase.y + Math.sin(angle) * dist
    );
    this.joyStickVector.set(Math.cos(angle) * (dist / 52), Math.sin(angle) * (dist / 52));
  }

  private updateAimJoystick(px: number, py: number) {
    if (!this.aimJoyBase || !this.aimJoyThumb || !this.player || !this.player.active) return;
    const baseX = this.aimJoyBase.x;
    const baseY = this.aimJoyBase.y;

    const dx = px - baseX;
    const dy = py - baseY;
    const angle = Math.atan2(dy, dx);
    const dist = Math.min(45, Math.sqrt(dx * dx + dy * dy));

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
    if (this.playerWeaponVisual) {
      this.playerWeaponVisual.setVisible(false);
    }
  }

  // --- WEAPON ATTACK AIMING INDICATOR ---
  private drawWeaponAimIndicator(dirX: number, dirY: number) {
    if (!this.aimLineGfx || !this.player || !this.player.active) return;
    this.aimLineGfx.clear();
    if (!getShowAttackRange()) return;
    const w = this.currentWeapon;
    const isRanged = w.rangeType === 'ranged_single' || w.rangeType === 'ranged_double' || w.rangeType === 'ranged_explosive';
    const startX = this.player.x;
    const startY = this.player.y;

    if (isRanged) {
      let range = 260;
      // Clamp range to walls so the aim indicator never points into walls where bullets can't go!
      for (let s = 25; s <= 260; s += 15) {
        if (!this.isPointInsideDungeonFloor(startX + dirX * s, startY + dirY * s)) {
          range = Math.max(30, s - 10);
          break;
        }
      }
      const endX = startX + dirX * range;
      const endY = startY + dirY * range;
      // Trajectory glow
      this.aimLineGfx.lineStyle(6, 0xef4444, 0.35);
      this.aimLineGfx.lineBetween(startX, startY, endX, endY);
      this.aimLineGfx.lineStyle(2, 0xffffff, 0.95);
      this.aimLineGfx.lineBetween(startX, startY, endX, endY);
      // Dotted bead indicators
      for (let s = 25; s < range; s += 30) {
        this.aimLineGfx.fillStyle(0xfca5a5, 0.85);
        this.aimLineGfx.fillCircle(startX + dirX * s, startY + dirY * s, 2.5);
      }
      // Target reticle
      this.aimLineGfx.lineStyle(2, 0xef4444, 0.9);
      this.aimLineGfx.strokeCircle(endX, endY, 14);
      this.aimLineGfx.fillStyle(0xffffff, 0.9);
      this.aimLineGfx.fillCircle(endX, endY, 3);
    } else {
      // Melee attack range indicator
      const reach = (this.selectedHeroKey === 'char_kraul' || w.id === 'weapon_kraul_whips') ? 125 :
                    (this.selectedHeroKey === 'char_alrik' || w.id === 'weapon_spear') ? 120 : 85;
      const endX = startX + dirX * reach;
      const endY = startY + dirY * reach;
      const angle = Math.atan2(dirY, dirX);

      this.aimLineGfx.lineStyle(6, 0xef4444, 0.35);
      this.aimLineGfx.lineBetween(startX, startY, endX, endY);
      this.aimLineGfx.lineStyle(2, 0xfca5a5, 0.9);
      this.aimLineGfx.lineBetween(startX, startY, endX, endY);

      // Arc showing swing zone
      this.aimLineGfx.lineStyle(2, 0xef4444, 0.85);
      this.aimLineGfx.beginPath();
      this.aimLineGfx.arc(startX, startY, reach, angle - 0.55, angle + 0.55, false);
      this.aimLineGfx.strokePath();
    }
  }

  // --- SKILL AIMING & TARGETING SYSTEM (BRAWL STARS STYLE) ---
  private startAimingSkill(slot: 's1' | 's2' | 'ult', pointer: Phaser.Input.Pointer, btnX: number, btnY: number, btnCircle: Phaser.GameObjects.Arc) {
    if (this.isPlayerDown || this.isUpgradeModalOpen) return;
    // Allow Torf to tap S2 to cancel while stone skin is active
    if (this.selectedHeroKey === 'char_torf' && slot === 's2' && this.torfStoneSkin) {
      this.cancelTorfStoneSkin();
      return;
    }
    if (this.isUltChanneling && !(this.selectedHeroKey === 'char_torf' && slot === 'ult')) return;
    if (this.cds[slot] > 0) return;

    // Prevent basic attack from firing simultaneously with skill aiming
    this.cds.attack = Math.max(this.cds.attack, 300);
    if (this.aimLineGfx) {
      this.aimLineGfx.clear();
    }

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

    // Check hover over Cancel Zone
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
      this.executeCombatSkill(slot, vec.x, vec.y);
    } else {
      this.autoAimCombatSkill(slot);
    }
  }

  private autoAimCombatSkill(slot: 's1' | 's2' | 'ult') {
    let nearestMob: DungeonMob | null = null;
    let minDist = 750;

    for (const mob of this.mobs) {
      if (mob && mob.active && mob.hp > 0) {
        const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, mob.x, mob.y);
        if (d < minDist) {
          minDist = d;
          nearestMob = mob;
        }
      }
    }

    if (nearestMob) {
      const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, nearestMob.x, nearestMob.y);
      this.executeCombatSkill(slot, Math.cos(angle), Math.sin(angle));
    } else {
      this.executeCombatSkill(slot);
    }
  }

  public executeCombatSkillWithMouseTarget(slot: 's1' | 's2' | 'ult') {
    const p = this.input.activePointer;
    if (p) {
      const dx = p.worldX - this.player.x;
      const dy = p.worldY - this.player.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 25) {
        this.executeCombatSkill(slot, dx / dist, dy / dist);
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

    const getClampedDist = (maxDist: number) => {
      let r = maxDist;
      for (let s = 25; s <= maxDist; s += 15) {
        if (!this.isPointInsideDungeonFloor(startX + dirX * s, startY + dirY * s)) {
          r = Math.max(30, s - 10);
          break;
        }
      }
      return r;
    };

    // --- 1. KRAUL ---
    if (this.selectedHeroKey === 'char_kraul') {
      if (slot === 's1') {
        // Shadow Dash (265px) - Purple glowing line + ghost arrival circle
        const range = getClampedDist(265);
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
        // Dead Grip (420px) - Long hook line + glowing claw reticle
        const range = getClampedDist(420);
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
        // Eerie Meatgrinder Ult - Berserk aura
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
        const range = getClampedDist(280);
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
        const range = getClampedDist(270);
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
        const range = getClampedDist(190);
        const endX = startX + dirX * range;
        const endY = startY + dirY * range;
        this.skillAimGfx.lineStyle(6, isCancelled ? 0xef4444 : 0x6366f1, 0.4);
        this.skillAimGfx.lineBetween(startX, startY, endX, endY);
        this.skillAimGfx.strokeCircle(endX, endY, 26);
        return;
      } else {
        const range = getClampedDist(240);
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
        const range = getClampedDist(310);
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
        const centerAngle = Math.atan2(dirY, dirX);
        for (let i = -2; i <= 2; i++) {
          const bladeAngle = centerAngle + i * 0.18;
          const bDirX = Math.cos(bladeAngle);
          const bDirY = Math.sin(bladeAngle);
          let bladeRange = 330;
          for (let s = 25; s <= 330; s += 15) {
            if (!this.isPointInsideDungeonFloor(startX + bDirX * s, startY + bDirY * s)) {
              bladeRange = Math.max(30, s - 10);
              break;
            }
          }
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
        const range = getClampedDist(230);
        const endX = startX + dirX * range;
        const endY = startY + dirY * range;
        this.skillAimGfx.lineStyle(7, isCancelled ? 0xef4444 : 0x9333ea, 0.4);
        this.skillAimGfx.lineBetween(startX, startY, endX, endY);
        this.skillAimGfx.strokeCircle(endX, endY, 32);
        return;
      } else {
        const range = getClampedDist(380);
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

    // --- 6. ALARIK ---
    if (this.selectedHeroKey === 'char_alrik') {
      if (slot === 's1') {
        const range = getClampedDist(270);
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
      const range = getClampedDist(220);
      const endX = startX + dirX * range;
      const endY = startY + dirY * range;
      this.skillAimGfx.lineStyle(8, isCancelled ? 0xef4444 : 0xb45309, 0.4);
      this.skillAimGfx.lineBetween(startX, startY, endX, endY);
      this.skillAimGfx.lineStyle(3, isCancelled ? 0xfca5a5 : 0xfcd34d, 0.95);
      this.skillAimGfx.lineBetween(startX, startY, endX, endY);
      this.skillAimGfx.strokeCircle(endX, endY, 28);
    } else if (slot === 's2') {
      const range = getClampedDist(230);
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

  private autoAimAndAttackDungeon() {
    if (this.isPlayerDown || this.isUpgradeModalOpen) return;
    if (this.cds.attack > 0) return;

    let nearestMob: DungeonMob | null = null;
    let minDist = 850;

    for (const mob of this.mobs) {
      if (mob && mob.active && mob.hp > 0) {
        const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, mob.x, mob.y);
        if (d < minDist) {
          minDist = d;
          nearestMob = mob;
        }
      }
    }

    if (nearestMob) {
      const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, nearestMob.x, nearestMob.y);
      this.aimVector.set(Math.cos(angle), Math.sin(angle));
      this.aimJoyVector.set(Math.cos(angle), Math.sin(angle));
      if (this.selectedHeroKey === 'char_nihil') {
        this.player.setRotation(angle + Math.PI / 2);
        this.player.setFlipX(false);
      } else {
        this.player.setFlipX(Math.cos(angle) < 0);
      }
      this.attackFacingTimer = 350;

      // Brief reticle flash on the auto-targeted mob
      const reticle = this.add.circle(nearestMob.x, nearestMob.y, 28, 0xef4444, 0.6).setDepth(105);
      this.tweens.add({ targets: reticle, scale: 0.5, alpha: 0, duration: 200, onComplete: () => reticle.destroy() });
    } else {
      const facing = this.player.flipX ? -1 : 1;
      this.aimVector.set(facing, 0);
      this.aimJoyVector.set(facing, 0);
    }

    this.executeCombatSkill('attack');
  }

  // --- INTERACTION HELPER ---
  private updateInteractions() {
    if (!this.player || !this.interactableTargets || this.isUpgradeModalOpen || this.isBlackMarketOpen || this.isGamePaused) {
      if (this.currentInteraction) this.clearInteraction();
      return;
    }
    const px = this.player.x;
    const py = this.player.y;

    let nearest: DungeonInteractable | null = null;
    let minDist = Infinity;

    for (const target of this.interactableTargets) {
      if (!target.active) continue;
      const d = Phaser.Math.Distance.Between(px, py, target.x, target.y);
      if (d <= target.radius && d < minDist) {
        minDist = d;
        nearest = target;
      }
    }

    if (nearest) {
      this.setInteraction(nearest.prompt, nearest.onInteract);
    } else {
      if (this.currentInteraction) {
        this.clearInteraction();
      }
    }
  }

  private setInteraction(text: string, callback: () => void) {
    let cleanText = text;
    if (text.includes('НАНЯТЬ')) {
      cleanText = text.replace(/\[\s*🐾\s*/, '🐾 ').replace(/\s*\]/, '');
    }

    this.currentInteraction = callback;
    this.currentPromptText = cleanText;

    if (this.domHud) {
      this.domHud.setPrompt(cleanText);
    }
  }

  private clearInteraction() {
    this.currentInteraction = null;
    this.currentPromptText = '';
    if (this.domHud) {
      this.domHud.setPrompt(null);
    }
  }

  // --- PERIODIC LOOP ---
  private handlePeriodicState() {
    if (this.playerEnergy < this.playerMaxEnergy) {
      this.playerEnergy = Math.min(this.playerMaxEnergy, this.playerEnergy + this.energyRegenRate * 0.4);
      this.updateHUD();
    }

    if (this.zazaPoisonTrail && this.player.body && (this.player.body.velocity.x !== 0 || this.player.body.velocity.y !== 0)) {
      const p = this.add.circle(this.player.x, this.player.y, 16, 0x15803d, 0.45).setDepth(15);
      this.time.delayedCall(2000, () => p.destroy());
    }
  }

  // --- PICKUPS ---
  private spawnPickup(x: number, y: number, type: 'heart' | 'coin') {
    const p = this.physics.add.sprite(x, y, type === 'heart' ? 'heart_pickup' : 'coin_pickup').setDepth(20);
    p.setData('type', type);
    this.pickups.add(p);
  }

  private collectPickup(p: Phaser.Physics.Arcade.Sprite) {
    if (!p || !p.active) return;
    const type = p.getData('type');
    p.destroy();
    soundEngine.playClick();

    if (type === 'heart') {
      this.playerHp = Math.min(this.playerMaxHp, this.playerHp + 180);
      this.updateHUD();
      this.showDamageNumber(this.player.x, this.player.y - 20, '+180 HP ❤', '#4ade80');
    } else {
      const skullsGain = 3;
      this.dungeonGold += skullsGain;
      this.updateHUD();
      this.showDamageNumber(this.player.x, this.player.y - 20, `+${skullsGain} 🪙`, '#facc15');
    }
  }

  // --- FLOATING TEXT & SCREENS ---
  private activeDamageTextCount = 0;
  private showDamageNumber(x: number, y: number, text: string, color: string) {
    if (this.activeDamageTextCount >= 22) return;
    this.activeDamageTextCount++;
    const t = this.add.text(x, y, text, {
      fontSize: '14px', fontFamily: 'monospace', fontStyle: 'bold', color
    }).setOrigin(0.5).setDepth(60);
    this.tweens.add({
      targets: t,
      y: y - 28,
      alpha: 0,
      duration: 550,
      onComplete: () => {
        this.activeDamageTextCount = Math.max(0, this.activeDamageTextCount - 1);
        t.destroy();
      }
    });
  }

  shutdown() {
    // 1. Clean up active ground fissures
    if (this.activeFissures) {
      this.activeFissures.forEach(f => {
        if (f.container && f.container.active) f.container.destroy();
      });
      this.activeFissures = [];
    }

    // 2. Clean up mob burn visuals & hp bars
    if (this.mobs) {
      this.mobs.forEach(m => {
        if (m.burnVisual && m.burnVisual.active) m.burnVisual.destroy();
        if (m.hpBar && m.hpBar.active) m.hpBar.destroy();
        if (m.hpBarBg && m.hpBarBg.active) m.hpBarBg.destroy();
      });
    }

    // 3. Remove all timers and active tweens to prevent memory leaks across floors
    this.time.removeAllEvents();
    this.tweens.killAll();

    // 4. Destroy HUD and cleanup DOM overlays
    this.domHud?.destroy();
    this.domHud = null;
    document.getElementById('game-dom-floor-reward-modal')?.remove();
    document.getElementById('game-dom-black-market-modal')?.remove();
    document.getElementById('hud-pause-modal-root')?.remove();

    if (this.controlsChangedListener) {
      window.removeEventListener('controls-layout-changed', this.controlsChangedListener);
    }

    // Always reset dungeon music state back to ambient peaceful music when dungeon scene shuts down
    soundEngine.setDungeonMusicState('ambient');
  }

  private showFloatingNotice(text: string, color: string) {
    const t = this.add.text(this.cameras.main.width / 2, 140, text, {
      fontSize: '13px', fontFamily: 'Consolas, monospace', resolution: 2, fontStyle: 'bold', color,
      backgroundColor: '#09090b', padding: { x: 14, y: 6 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(500);
    this.tweens.add({ targets: t, y: 120, alpha: 0, duration: 2000, onComplete: () => t.destroy() });
  }

  private showVictoryScreen() {
    soundEngine.playLevelUp();
    addMatchToHistory(this.selectedHeroKey, 'win', 'Одиночный');
    MatchHistoryManager.logDungeonMatch({
      result: 'VICTORY',
      heroId: this.selectedHeroKey,
      durationSeconds: Math.max(10, Math.round((Date.now() - (this.dungeonStartTime || (Date.now() - 320000))) / 1000)),
      floorsCleared: 7,
      skullsEarned: this.dungeonGold,
      bossesKilled: 2,
      roomsCleared: 28
    });
    if (this.dungeonGold > 0) {
      const econ = loadEconomy();
      econ.rustySkulls += this.dungeonGold;
      saveEconomy(econ);
      CloudSyncManager.saveAllProgress();
    }
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    this.add.rectangle(w / 2, h / 2, w * 2, h * 2, 0x000000, 0.88).setScrollFactor(0).setDepth(700);
    this.add.text(w / 2, h / 2 - 80, '★ ПОЛНАЯ ПОБЕДА: ДРЕВНИЕ КАТАКОМБЫ 7/7 ПРОЙДЕНЫ! ★', {
      fontSize: '18px', fontFamily: 'Consolas, monospace', resolution: 2, fontStyle: 'bold', color: '#facc15'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(701);

    this.add.text(w / 2, h / 2 - 20, `СОБРАНО МОНЕТ: ${this.dungeonGold} 🪙`, {
      fontSize: '16px', fontFamily: 'Consolas, monospace', resolution: 2, color: '#4ade80'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(701);

    const returnBtn = this.add.text(w / 2, h / 2 + 60, '[ ВЕРНУТЬСЯ В ХАБ ]', {
      fontSize: '16px', fontFamily: 'Consolas, monospace', resolution: 2, fontStyle: 'bold', color: '#ffffff',
      backgroundColor: '#2563eb', padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(701).setInteractive({ useHandCursor: true });

    returnBtn.on('pointerdown', () => {
      soundEngine.playClick();
      soundEngine.setDungeonMusicState('ambient');
      soundEngine.startMusic();
      this.scene.start('HubScene');
    });
  }

  private showDefeatScreen() {
    soundEngine.setDungeonMusicState('ambient');
    addMatchToHistory(this.selectedHeroKey, 'loss', 'Одиночный');
    MatchHistoryManager.logDungeonMatch({
      result: 'DEFEAT',
      heroId: this.selectedHeroKey,
      durationSeconds: Math.max(10, Math.round((Date.now() - (this.dungeonStartTime || (Date.now() - 180000))) / 1000)),
      floorsCleared: Math.max(1, this.currentFloor),
      skullsEarned: this.dungeonGold,
      bossesKilled: this.currentFloor >= 4 ? 1 : 0,
      roomsCleared: this.currentFloor * 3
    });
    if (this.dungeonGold > 0) {
      const econ = loadEconomy();
      econ.rustySkulls += this.dungeonGold;
      saveEconomy(econ);
      CloudSyncManager.saveAllProgress();
    }
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    this.add.rectangle(w / 2, h / 2, w * 2, h * 2, 0x000000, 0.88).setScrollFactor(0).setDepth(700);

    this.add.text(w / 2, h / 2 - 60, `☠ ВЫ ПАЛИ НА ЭТАЖЕ ${this.currentFloor}/${this.maxFloors} ☠`, {
      fontSize: '20px', fontFamily: 'Consolas, monospace', resolution: 2, fontStyle: 'bold', color: '#ef4444'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(701);

    this.add.text(w / 2, h / 2 - 20, `СОБРАНО МОНЕТ ЗА ЗАБЕГ: +${this.dungeonGold} 🪙`, {
      fontSize: '14px', fontFamily: 'Consolas, monospace', resolution: 2, fontStyle: 'bold', color: '#facc15'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(701);

    const retryBtn = this.add.text(w / 2, h / 2 + 40, '[ В ХАБ ]', {
      fontSize: '16px', fontFamily: 'Consolas, monospace', resolution: 2, fontStyle: 'bold', color: '#ffffff',
      backgroundColor: '#7f1d1d', padding: { x: 18, y: 8 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(701).setInteractive({ useHandCursor: true });

    retryBtn.on('pointerdown', () => {
      soundEngine.playClick();
      soundEngine.setDungeonMusicState('ambient');
      soundEngine.startMusic();
      this.scene.start('HubScene');
    });
  }

  // --- GAME UPDATE LOOP ---
  update(_time: number, delta: number) {
    if (this.isUpgradeModalOpen) return;

    // Clean up out-of-bounds/tunnelled projectiles (hitting walls)
    const activeProjectiles = this.projectiles.getChildren();
    for (let i = activeProjectiles.length - 1; i >= 0; i--) {
      const proj = activeProjectiles[i] as Phaser.Physics.Arcade.Sprite;
      if (proj && proj.active && proj.body) {
        if (!this.isPointInsideDungeonFloor(proj.x, proj.y)) {
          const expl = proj.getData('triggerExplosion');
          if (typeof expl === 'function') {
            expl();
          } else {
            proj.destroy();
          }
        }
      }
    }

    // Cooldown ticks - display text-only numbers for skills, skip attack entirely
    for (const key of Object.keys(this.cds)) {
      if (this.cds[key] > 0) {
        this.cds[key] = Math.max(0, this.cds[key] - delta);
        if (key !== 'attack') {
          // Hide circular overlay entirely (the user wants "не кружочки, а просто цифры")
          if (this.cdOverlays[key]) {
            this.cdOverlays[key].setVisible(false);
          }
          if (this.cdTextLabels[key]) {
            this.cdTextLabels[key].setText(`${(this.cds[key] / 1000).toFixed(1)}`);
            this.cdTextLabels[key].setVisible(true);
          }
        } else {
          // Skip attack entirely (the user wants "Для джойстика атаки не надо ничего делать")
          if (this.cdOverlays[key]) this.cdOverlays[key].setVisible(false);
          if (this.cdTextLabels[key]) this.cdTextLabels[key].setVisible(false);
        }
      } else {
        if (this.cdOverlays[key]) {
          this.cdOverlays[key].setVisible(false);
        }
        if (this.cdTextLabels[key]) {
          this.cdTextLabels[key].setVisible(false);
        }
      }
    }

    if (this.attackFacingTimer > 0) {
      this.attackFacingTimer = Math.max(0, this.attackFacingTimer - delta);
    }

    if (this.alrikShieldActive) {
      // 1. Block and reflect enemy projectiles
      this.projectiles.getChildren().forEach(projObj => {
        const proj = projObj as Phaser.Physics.Arcade.Sprite;
        if (proj && proj.active) {
          const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, proj.x, proj.y);
          if (d < 75) {
            const projAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, proj.x, proj.y);
            const angleDiff = Phaser.Math.Angle.Wrap(projAngle - this.alrikShieldAngle);
            if (Math.abs(angleDiff) < 1.1) { // 120 deg front sector
              soundEngine.playHit();
              const hitFx = this.add.circle(proj.x, proj.y, 16, 0xfacc15, 0.8).setDepth(55);
              this.tweens.add({ targets: hitFx, scale: 2.2, alpha: 0, duration: 150, onComplete: () => hitFx.destroy() });
              this.showDamageNumber(proj.x, proj.y, '🛡 ОТРАЖЕНО!', '#38bdf8');
              proj.destroy();
            }
          }
        }
      });

      // 2. Reflect damage and knock back mobs from front sector
      this.mobs.forEach(mob => {
        if (mob && mob.active) {
          const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, mob.x, mob.y);
          if (d < 85) {
            const mobAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, mob.x, mob.y);
            const angleDiff = Phaser.Math.Angle.Wrap(mobAngle - this.alrikShieldAngle);
            if (Math.abs(angleDiff) < 1.0) { // front sector
              // Deal massive damage
              const reflectedDmg = Math.round(180 * this.damageMultiplier);
              this.damageMob(mob, reflectedDmg);

              // Hard knockback away from Alrik
              const pushX = mob.x + Math.cos(this.alrikShieldAngle) * 55;
              const pushY = mob.y + Math.sin(this.alrikShieldAngle) * 55;
              if (this.isPointInsideDungeonFloor(pushX, pushY)) {
                mob.setPosition(pushX, pushY);
              }
              this.showDamageNumber(mob.x, mob.y - 20, '⚡ ОТРАЖЕНИЕ!', '#fde047');
            }
          }
        }
      });
    }

    if (!this.isPlayerDown) {
      let vx = 0;
      let vy = 0;

      if (this.alrikShieldActive) {
        // Hide aiming lines continuously so they don't interfere with the ultimate visuals
        if (this.aimLineGfx) {
          this.aimLineGfx.clear();
        }

        let dx = 0;
        let dy = 0;
        if (this.cursors) {
          if (this.cursors.left?.isDown || (this.keys?.A && this.keys.A.isDown)) dx = -1;
          if (this.cursors.right?.isDown || (this.keys?.D && this.keys.D.isDown)) dx = 1;
          if (this.cursors.up?.isDown || (this.keys?.W && this.keys.W.isDown)) dy = -1;
          if (this.cursors.down?.isDown || (this.keys?.S && this.keys.S.isDown)) dy = 1;
        }
        if (this.joyStickVector.length() > 0.1) {
          dx = this.joyStickVector.x;
          dy = this.joyStickVector.y;
        }
        if (this.aimJoyVector.length() > 0.1) {
          dx = this.aimJoyVector.x;
          dy = this.aimJoyVector.y;
        }

        // Allow walking during phalanx shield!
        if (dx !== 0 || dy !== 0) {
          const len = Math.sqrt(dx * dx + dy * dy);
          this.player.setVelocity((dx / len) * this.playerSpeed, (dy / len) * this.playerSpeed);
          this.alrikShieldAngle = Math.atan2(dy, dx);
          this.player.setFlipX(dx < 0);
        } else {
          this.player.setVelocity(0, 0);
        }

        // --- NON-STOP CONTINUOUS STABBING ATTACK ---
        if (!this.alrikUltStabCd) this.alrikUltStabCd = 0;
        this.alrikUltStabCd -= delta; // delta is in ms

        if (this.alrikUltStabCd <= 0) {
          this.alrikUltStabCd = 180; // strike non-stop every 180ms!
          soundEngine.playSlash();

          const angle = this.alrikShieldAngle;

          // 1. Animate weapon thrust forward
          if (this.playerWeaponVisual) {
            this.weaponAttackAngle = angle;
            this.weaponThrustDist = 0;
            this.tweens.add({
              targets: this,
              weaponThrustDist: 40,
              duration: 70,
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
          const stabOuter = this.add.rectangle(stabX, stabY, 80, 10, 0x38bdf8, 0.8).setDepth(53);
          const stabInner = this.add.rectangle(stabX, stabY, 80, 4, 0xffffff).setDepth(54);
          stabOuter.setRotation(angle);
          stabInner.setRotation(angle);
          this.tweens.add({
            targets: [stabOuter, stabInner],
            scaleX: 1.4,
            alpha: 0,
            duration: 120,
            onComplete: () => {
              stabOuter.destroy();
              stabInner.destroy();
            }
          });

          // 3. Generous, wide damage cone (front sector)
          const dmg = Math.round(180 * this.damageMultiplier); // heavy continuous damage!
          this.mobs.forEach(mob => {
            if (mob && mob.active && mob.hp > 0) {
              const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, mob.x, mob.y);
              if (dist <= 165) { // increased range to 165!
                const mobAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, mob.x, mob.y);
                const angleDiff = Phaser.Math.Angle.Wrap(mobAngle - angle);
                if (Math.abs(angleDiff) < 1.25) { // extremely generous 145 degree wide sector!
                  this.damageMob(mob, dmg);
                }
              }
            }
          });
          this.checkDestructibleDamage(stabX, stabY, 75, dmg, true);
        }

        if (this.alrikShieldGfx && this.alrikShieldGfx.active) {
          const shieldDist = 36;
          const sx = this.player.x + Math.cos(this.alrikShieldAngle) * shieldDist;
          const sy = this.player.y + Math.sin(this.alrikShieldAngle) * shieldDist;
          this.alrikShieldGfx.setPosition(sx, sy);
          this.alrikShieldGfx.setRotation(this.alrikShieldAngle);
        }
      } else {
        if (this.cursors) {
          if (this.cursors.left?.isDown || (this.keys?.A && this.keys.A.isDown)) vx = -1;
          if (this.cursors.right?.isDown || (this.keys?.D && this.keys.D.isDown)) vx = 1;
          if (this.cursors.up?.isDown || (this.keys?.W && this.keys.W.isDown)) vy = -1;
          if (this.cursors.down?.isDown || (this.keys?.S && this.keys.S.isDown)) vy = 1;
        }

        if (this.joyStickVector.length() > 0.1) {
          vx = this.joyStickVector.x;
          vy = this.joyStickVector.y;
        }

        if (vx !== 0 || vy !== 0) {
          const len = Math.sqrt(vx * vx + vy * vy);
          this.player.setVelocity((vx / len) * this.playerSpeed, (vy / len) * this.playerSpeed);
          // Only override facing if not actively aiming or recently attacking
          if (this.aimJoyPointerId === null && this.attackFacingTimer <= 0) {
            this.aimVector.set(vx / len, vy / len);
            if (this.selectedHeroKey === 'char_nihil') {
              this.player.setRotation(Math.atan2(vy, vx) + Math.PI / 2);
              this.player.setFlipX(false);
            } else {
              if (vx < 0) this.player.setFlipX(true);
              else if (vx > 0) this.player.setFlipX(false);
            }
          } else {
            // While attacking or aiming, stay facing towards the attack/shooting trajectory!
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

      // Continuous shooting when dragging or holding Red Aim Joystick
      if (this.aimJoyPointerId !== null && this.cds.attack <= 0) {
        if (this.aimJoyMoved && this.aimJoyVector.lengthSq() > 0.05) {
          this.executeCombatSkill('attack');
        } else {
          this.autoAimAndAttackDungeon();
        }
      }

      // Proximity update for all interactive targets (cauldron, shop, companion, portal) - throttled to 100ms
      this.interactionTimer += delta;
      if (this.interactionTimer >= 100) {
        this.interactionTimer = 0;
        this.updateInteractions();
      }

      // Enforce Room Lock during active combat & Strict Floor Guard
      const curRoom = this.roomsMap.get(this.currentRoomId);
      if (curRoom && !curRoom.cleared) {
        const minX = curRoom.worldX - curRoom.w / 2 + 30;
        const maxX = curRoom.worldX + curRoom.w / 2 - 30;
        const minY = curRoom.worldY - curRoom.h / 2 + 30;
        const maxY = curRoom.worldY + curRoom.h / 2 - 30;
        this.player.x = Phaser.Math.Clamp(this.player.x, minX, maxX);
        this.player.y = Phaser.Math.Clamp(this.player.y, minY, maxY);
      } else {
        if (!this.isPointInsideDungeonFloor(this.player.x, this.player.y)) {
          const lastX = this.player.getData('lastValidX');
          const lastY = this.player.getData('lastValidY');
          if (lastX !== undefined && lastY !== undefined) {
            this.player.setPosition(lastX, lastY);
            this.player.setVelocity(0, 0);
          }
        } else {
          this.player.setData('lastValidX', this.player.x);
          this.player.setData('lastValidY', this.player.y);
        }
      }
      this.updateWeaponVisualPosition();

      // Hotkey attacks and interaction
      if (this.keys?.SPACE && this.keys.SPACE.isDown) {
        if (this.cds.attack <= 0) {
          if (this.currentInteraction && this.interactBtnBg && this.interactBtnBg.visible) {
            this.currentInteraction();
          } else {
            this.autoAimAndAttackDungeon();
          }
        }
      }

      // Continuous mouse click attack while walking (ONLY when NOT aiming skills or holding skill controls)
      const activePointer = this.input.activePointer;
      const isAimingSkill = this.aimingSkillSlot !== null || this.skillAimPointerId !== null;
      if (
        activePointer &&
        activePointer.isDown &&
        activePointer.leftButtonDown() &&
        this.cds.attack <= 0 &&
        !isAimingSkill &&
        !this.isUltChanneling
      ) {
        const target = activePointer.event?.target as HTMLElement;
        const inUI = target && (target.closest('#dungeon-dom-hud-root') || target.closest('#hud-pause-modal-root') || target.closest('#game-dom-notice-board-modal') || target.tagName === 'BUTTON');
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;
        const isJoy = this.joyStickPointerId === activePointer.id || (activePointer.x < w * 0.4 && activePointer.y > h * 0.45);
        const isSkillTouch = this.skillAimPointerId === activePointer.id || this.aimJoyPointerId === activePointer.id;
        if (!inUI && !isJoy && !isSkillTouch && !this.isUpgradeModalOpen) {
          const dx = activePointer.worldX - this.player.x;
          const dy = activePointer.worldY - this.player.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 15) {
            this.executeCombatSkill('attack', dx / dist, dy / dist);
          } else {
            this.autoAimAndAttackDungeon();
          }
        }
      }
      if (this.keys?.ONE && Phaser.Input.Keyboard.JustDown(this.keys.ONE)) this.executeCombatSkillWithMouseTarget('s1');
      if (this.keys?.TWO && Phaser.Input.Keyboard.JustDown(this.keys.TWO)) this.executeCombatSkillWithMouseTarget('s2');
      if (this.keys?.THREE && Phaser.Input.Keyboard.JustDown(this.keys.THREE)) this.executeCombatSkillWithMouseTarget('ult');
      if (this.keys?.E && Phaser.Input.Keyboard.JustDown(this.keys.E)) {
        if (this.currentInteraction) this.currentInteraction();
      }
    }

    // 1. Integer coordinates for razor-sharp pixel rendering
    if (this.player && this.player.active) {
      this.player.x = Math.round(this.player.x);
      this.player.y = Math.round(this.player.y);
    }
    this.mobs.forEach(m => {
      if (m && m.active) {
        m.x = Math.round(m.x);
        m.y = Math.round(m.y);
      }
    });

    this.checkRoomTriggers();
    this.updateMobs(delta);
    this.updateActiveFissures(delta);
    this.updateSpikeTraps(delta);
    if (this.flyingPet && this.flyingPet.sprite && this.flyingPet.sprite.active) {
      this.updateFlyingPet(delta);
    }
    if (this.spikeCooldown > 0) {
      this.spikeCooldown -= delta;
    }
  }

  // --- PAUSE MODAL & SETTINGS ---
  private isGamePaused = false;
  private pauseModalContainer: Phaser.GameObjects.Container | null = null;

  private openPauseModal() {
    if (this.isGamePaused) return;
    this.isGamePaused = true;
    this.physics.pause();
    soundEngine.playClick();

    showHTMLPauseModal({
      sceneTitle: 'ПАУЗА ПОДЗЕМЕЛЬЯ',
      onResume: () => {
        this.isGamePaused = false;
        this.physics.resume();
      },
      onExit: () => {
        this.physics.resume();
        this.isGamePaused = false;
        soundEngine.setDungeonMusicState('ambient');
        soundEngine.startMusic();
        this.scene.start('HubScene');
      }
    });
  }

  private closePauseModal() {
    soundEngine.playClick();
    if (this.pauseModalContainer) {
      this.pauseModalContainer.destroy();
      this.pauseModalContainer = null;
    }
    this.isGamePaused = false;
    this.physics.resume();
  }

  private openMusicModal() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const musicContainer = this.add.container(w / 2, h / 2).setScrollFactor(0).setDepth(2500);

    const mBg = this.add.rectangle(0, 0, 320, 220, 0x0f172a, 0.98).setStrokeStyle(3, 0x38bdf8);
    const mTitle = this.add.text(0, -80, '⚙ НАСТРОЙКИ ЗВУКА', {
      fontSize: '16px', fontFamily: 'monospace', fontStyle: 'bold', color: '#38bdf8'
    }).setOrigin(0.5);

    const musicToggle = this.add.text(0, -20, soundEngine.isMusicOn() ? 'МУЗЫКА: [ВКЛ]' : 'МУЗЫКА: [ВЫКЛ]', {
      fontSize: '14px', fontFamily: 'monospace', fontStyle: 'bold', color: '#38bdf8', backgroundColor: '#1e293b', padding: { x: 12, y: 6 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    musicToggle.on('pointerdown', () => {
      const on = soundEngine.toggleMusic();
      musicToggle.setText(on ? 'МУЗЫКА: [ВКЛ]' : 'МУЗЫКА: [ВЫКЛ]').setColor(on ? '#38bdf8' : '#f87171');
    });

    const sfxToggle = this.add.text(0, 30, soundEngine.isSfxOn() ? 'ЗВУКИ: [ВКЛ]' : 'ЗВУКИ: [ВЫКЛ]', {
      fontSize: '14px', fontFamily: 'monospace', fontStyle: 'bold', color: '#4ade80', backgroundColor: '#1e293b', padding: { x: 12, y: 6 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    sfxToggle.on('pointerdown', () => {
      const on = soundEngine.toggleSfx();
      sfxToggle.setText(on ? 'ЗВУКИ: [ВКЛ]' : 'ЗВУКИ: [ВЫКЛ]').setColor(on ? '#4ade80' : '#f87171');
    });

    const mClose = this.add.text(0, 80, '[ ЗАКРЫТЬ ]', {
      fontSize: '13px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffffff', backgroundColor: '#334155', padding: { x: 16, y: 5 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    mClose.on('pointerdown', () => {
      soundEngine.playClick();
      musicContainer.destroy();
    });

    musicContainer.add([mBg, mTitle, musicToggle, sfxToggle, mClose]);
  }
}
