/**
 * Frantic Battles - TavernScene ("Пьяный Гаргойль" & Mini-Lobby)
 * Walkable Tavern / Mini-Lobby Map Scene
 */

import Phaser from 'phaser';
import { generateAllTextures } from '../pixelArt';
import { HEROES, HeroData } from '../players';
import { soundEngine } from '../audio';
import { showHTMLInputModal, showHTMLPauseModal } from '../../utils/domInput';
import { SocialHUD } from '../SocialHUD';
import { getActiveUserProfile } from '../firebase';
import { NetworkService } from '../NetworkService';

interface TavernOnlinePeer {
  id: string;
  name: string;
  hero: string;
  sprite: Phaser.Physics.Arcade.Sprite;
  label: Phaser.GameObjects.Text;
  speechBubble?: Phaser.GameObjects.Text;
  targetX: number;
  targetY: number;
  flipX: boolean;
}

export class TavernScene extends Phaser.Scene {
  // Player
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private selectedHeroKey = 'char_zaza';
  private heroData!: HeroData;
  private playerSpeed = 290;
  private basePlayerSpeed = 290;
  private playerWeaponVisual!: Phaser.GameObjects.Image;
  private slowTimerEvent: Phaser.Time.TimerEvent | null = null;

  // Environment & Collisions
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private furnitureGroup!: Phaser.Physics.Arcade.StaticGroup;

  // Mini-Lobby Mode Settings
  private isWaitingLobby = false;
  private roomName = 'Подземелье Зазы';
  private maxPlayers = 4;
  private roomCode = 'DG-7429';
  private currentPlayers = 1;
  private lobbyJoinedPlayers: Array<{ sprite: Phaser.Physics.Arcade.Sprite; label: Phaser.GameObjects.Text }> = [];
  private lobbyTimerEvent: Phaser.Time.TimerEvent | null = null;
  private lobbyStartCountdown = 3;
  private isLobbyFull = false;

  // UI Headers & Prompts
  private lobbyHeaderUI!: Phaser.GameObjects.Text;
  private lobbyHeaderBg!: Phaser.GameObjects.Rectangle;

  // Matchmaking Square (Normal Tavern Mode)
  private matchSquareX = 750;
  private matchSquareY = 650;
  private matchSquareSize = 220;
  private isPlayerOnSquare = false;
  private squareCountdown = 20;
  private squareTimerEvent: Phaser.Time.TimerEvent | null = null;
  private squareTimerText!: Phaser.GameObjects.Text;
  private squareStatusText!: Phaser.GameObjects.Text;
  private squareGfx!: Phaser.GameObjects.Graphics;

  // Pause Modal & Settings
  private isGamePaused = false;
  private pauseModalElements: Phaser.GameObjects.GameObject[] = [];

  // Controls
  private isPC = false;
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
  private joyStickBase!: Phaser.GameObjects.Arc;
  private joyStickThumb!: Phaser.GameObjects.Arc;
  private joyStickPointerId: number | null = null;
  private joyStickVector = new Phaser.Math.Vector2(0, 0);
  private joyStickOrigin = new Phaser.Math.Vector2(0, 0);

  constructor() {
    super({ key: 'TavernScene' });
  }

  init(data?: {
    selectedHeroKey?: string;
    isWaitingLobby?: boolean;
    roomName?: string;
    maxPlayers?: number;
    roomCode?: string;
  }) {
    if (data?.selectedHeroKey && HEROES[data.selectedHeroKey]) {
      this.selectedHeroKey = data.selectedHeroKey;
    }
    this.heroData = HEROES[this.selectedHeroKey] || HEROES.char_zaza;
    this.playerSpeed = this.heroData.speed || 290;
    this.basePlayerSpeed = this.playerSpeed;

    this.isGamePaused = false;
    this.isWaitingLobby = data?.isWaitingLobby || false;
    this.roomName = data?.roomName || 'Подземелье Зазы';
    this.maxPlayers = data?.maxPlayers || 4;
    this.roomCode = data?.roomCode || 'DG-' + Math.floor(1000 + Math.random() * 9000);
    this.currentPlayers = 1;
    this.isLobbyFull = false;
    this.lobbyJoinedPlayers = [];
    this.lobbyStartCountdown = 3;

    this.isPlayerOnSquare = false;
    this.squareCountdown = 20;

    if (this.slowTimerEvent) {
      this.slowTimerEvent.remove();
      this.slowTimerEvent = null;
    }
    if (this.squareTimerEvent) {
      this.squareTimerEvent.remove();
      this.squareTimerEvent = null;
    }
    if (this.lobbyTimerEvent) {
      this.lobbyTimerEvent.remove();
      this.lobbyTimerEvent = null;
    }
  }

  preload() {
    generateAllTextures(this);
  }

  create() {
    this.isPC = this.registry.get('isPC') || false;

    // World map dimensions for Tavern Interior
    const mapW = 1500;
    const mapH = 1200;
    this.physics.world.setBounds(0, 0, mapW, mapH);

    // 1. Dark tavern background
    this.add.rectangle(mapW / 2, mapH / 2, mapW, mapH, 0x090d16).setDepth(0);

    // Physics groups
    this.walls = this.physics.add.staticGroup();
    this.furnitureGroup = this.physics.add.staticGroup();

    // 2. Build Tavern Architecture
    this.buildTavernMap(mapW, mapH);

    // 3. Matchmaking Square (Only in normal tavern mode)
    if (!this.isWaitingLobby) {
      this.buildMatchmakingSquare();
    }

    // 4. Spawn Main Player
    this.player = this.physics.add.sprite(350, 650, this.heroData.texture).setDepth(50).setScale(1.3);
    this.player.setCollideWorldBounds(true);

    const heroWeaponTexture = (this.heroData as unknown as { weaponTexture?: string }).weaponTexture || 'weapon_stick';
    this.playerWeaponVisual = this.add.image(this.player.x + 16, this.player.y + 4, heroWeaponTexture)
      .setDepth(51).setScale(1.2);

    // Name label above player using active user profile nickname
    const profile = getActiveUserProfile();
    const userNick = profile.nickname || 'Герой';
    const playerName = this.add.text(0, -32, `[ВЫ] ${userNick}`, {
      fontSize: '11px', fontFamily: 'Consolas, monospace', resolution: 2, fontStyle: 'bold', color: '#4ade80', backgroundColor: '#0f172a', padding: { x: 4, y: 2 }
    }).setOrigin(0.5).setDepth(52);

    // Collisions
    this.physics.add.collider(this.player, this.walls);
    this.physics.add.collider(this.player, this.furnitureGroup);

    // Camera setup - Instant crisp lock without floaty lerp lag
    this.cameras.main.setBounds(0, 0, mapW, mapH);
    this.cameras.main.startFollow(this.player, true, 1, 1);
    this.cameras.main.setZoom(1.0);
    this.cameras.main.setRoundPixels(true);

    // 5. UI HUD & Controls
    this.buildTavernHUD();
    this.buildTouchControls();

    // 6. Keyboard controls
    if (this.input.keyboard) {
      this.cursors = {
        W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
        UP: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
        DOWN: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
        LEFT: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
        RIGHT: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT)
      };
    }

    // 7. Setup Online Tavern Networking
    this.setupOnlineTavernNetwork();

    // Floating name & weapon position sync
    this.events.on('update', () => {
      if (this.player && playerName) {
        playerName.setPosition(this.player.x, this.player.y - 36);
        if (this.playerWeaponVisual) {
          const facingRight = !this.player.flipX;
          this.playerWeaponVisual.setPosition(this.player.x + (facingRight ? 16 : -16), this.player.y + 4);
          this.playerWeaponVisual.setFlipX(!facingRight);
        }
      }
    });

    // If Mini-Lobby Mode: Start simulated joining players loop
    if (this.isWaitingLobby) {
      this.startMiniLobbyLoop();
    }

    soundEngine.setDungeonMusicState('ambient');

    const onResize = (gameSize: Phaser.Structs.Size) => {
      this.cameras.main.setViewport(0, 0, gameSize.width, gameSize.height);
      const h = gameSize.height;
      if (this.joyStickBase) this.joyStickBase.setPosition(100, h - 100);
      if (this.joyStickThumb && this.joyStickPointerId === null) this.joyStickThumb.setPosition(100, h - 100);
    };
    this.scale.on('resize', onResize);

    const onModalOpen = () => {
      this.player.setVelocity(0, 0);
      this.joyStickVector.set(0, 0);
      this.joyStickPointerId = null;
    };
    this.game.events.on('modal-opened', onModalOpen);

    this.events.once('shutdown', () => {
      this.scale.off('resize', onResize);
      this.game.events.off('modal-opened', onModalOpen);
    });
  }

  private buildTavernMap(mapW: number, mapH: number) {
    // Floor
    this.add.tileSprite(mapW / 2, mapH / 2, mapW - 80, mapH - 80, 'tile_floor').setDepth(1).setAlpha(0.92);

    // Outer Walls
    const wallThick = 40;
    this.createWallBlock(mapW / 2, 40, mapW, wallThick);
    this.createWallBlock(mapW / 2, mapH - 40, mapW, wallThick);
    this.createWallBlock(40, mapH / 2, wallThick, mapH);
    this.createWallBlock(mapW - 40, mapH / 2, wallThick, mapH);

    // Bar Counter on Top Left
    const barCounter = this.physics.add.staticSprite(380, 220, 'prop_crate').setDepth(10);
    barCounter.setDisplaySize(380, 50).refreshBody();

    this.add.image(380, 160, 'dungeon_shopkeeper').setDepth(9).setScale(1.6);
    this.add.text(380, 120, '🍺 БАРМЕН БОБ • ТАВЕРНА "ПЬЯНЫЙ ГАРГОЙЛЬ"', {
      fontSize: '13px', fontFamily: 'monospace', fontStyle: 'bold', color: '#facc15'
    }).setOrigin(0.5).setDepth(12);

    // Fireplace on Top Right
    this.add.rectangle(1100, 100, 180, 70, 0xb45309).setDepth(8);
    this.add.image(1100, 100, 'prop_explosive_barrel').setDepth(10).setScale(1.5);
    const fireLight = this.add.circle(1100, 100, 110, 0xf59e0b, 0.25).setDepth(4);
    this.tweens.add({
      targets: fireLight,
      alpha: 0.45,
      scale: 1.15,
      duration: 350,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Tavern Tables & Chairs
    const tablePositions = [
      { x: 300, y: 450 },
      { x: 300, y: 880 },
      { x: 1100, y: 450 },
      { x: 1100, y: 880 }
    ];

    tablePositions.forEach(pos => {
      const table = this.physics.add.staticSprite(pos.x, pos.y, 'prop_crate').setDepth(10);
      table.setDisplaySize(120, 90).refreshBody();
      this.furnitureGroup.add(table);

      this.add.circle(pos.x - 70, pos.y, 16, 0x78350f).setDepth(9);
      this.add.circle(pos.x + 70, pos.y, 16, 0x78350f).setDepth(9);
      this.add.circle(pos.x, pos.y - 55, 16, 0x78350f).setDepth(9);
      this.add.circle(pos.x, pos.y + 55, 16, 0x78350f).setDepth(9);
    });

    // Exit Arch Door on Bottom Center
    const exitDoor = this.physics.add.staticSprite(750, 1120, 'dungeon_door_closed').setDepth(12).setScale(1.5);
    const exitLabel = this.add.text(750, 1080, '🚪 ВЫХОД В ХАБ', {
      fontSize: '12px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ef4444', backgroundColor: '#0f172a', padding: { x: 8, y: 4 }
    }).setOrigin(0.5).setDepth(15).setInteractive({ useHandCursor: true });

    const leaveTavern = () => {
      soundEngine.playClick();
      this.scene.start('HubScene', { selectedHeroKey: this.selectedHeroKey });
    };
    exitDoor.setInteractive({ useHandCursor: true });
    exitDoor.on('pointerdown', leaveTavern);
    exitLabel.on('pointerdown', leaveTavern);
  }

  private createWallBlock(x: number, y: number, w: number, h: number) {
    const wall = this.physics.add.staticSprite(x, y, 'wall').setDepth(20);
    wall.setDisplaySize(w, h).refreshBody();
    this.walls.add(wall);
  }

  // --- MATCHMAKING SQUARE (Normal Tavern Mode) ---
  private buildMatchmakingSquare() {
    const cx = this.matchSquareX;
    const cy = this.matchSquareY;
    const sz = this.matchSquareSize;

    this.squareGfx = this.add.graphics().setDepth(5);
    this.squareGfx.fillStyle(0x064e3b, 0.65);
    this.squareGfx.fillRect(cx - sz / 2, cy - sz / 2, sz, sz);
    this.squareGfx.lineStyle(4, 0x22c55e, 0.95);
    this.squareGfx.strokeRect(cx - sz / 2, cy - sz / 2, sz, sz);

    const innerRing = this.add.circle(cx, cy, 75, 0x4ade80, 0.25).setDepth(6);
    this.tweens.add({
      targets: innerRing,
      alpha: 0.5,
      scale: 1.15,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.add.text(cx, cy - sz / 2 - 25, '🌀 КВАДРАТ СБОРА В ПОДЗЕМЕЛЬЕ 🌀', {
      fontSize: '13px', fontFamily: 'monospace', fontStyle: 'bold', color: '#4ade80', backgroundColor: '#022c22', padding: { x: 8, y: 4 }
    }).setOrigin(0.5).setDepth(10);

    this.squareStatusText = this.add.text(cx, cy - 30, 'ВСТАНЬТЕ НА КВАДРАТ\nДЛЯ ОТРЯДА!', {
      fontSize: '11px', fontFamily: 'monospace', fontStyle: 'bold', color: '#fef08a', align: 'center'
    }).setOrigin(0.5).setDepth(10);

    this.squareTimerText = this.add.text(cx, cy + 30, '⏳ СТАРТ: --', {
      fontSize: '13px', fontFamily: 'monospace', fontStyle: 'bold', color: '#38bdf8'
    }).setOrigin(0.5).setDepth(10);
  }

  private checkMatchmakingSquareOverlap() {
    if (!this.player || this.isWaitingLobby) return;

    const half = this.matchSquareSize / 2;
    const inside = Math.abs(this.player.x - this.matchSquareX) < half && Math.abs(this.player.y - this.matchSquareY) < half;

    if (inside && !this.isPlayerOnSquare) {
      this.isPlayerOnSquare = true;
      this.squareCountdown = 20;
      soundEngine.playLevelUp();
      this.squareStatusText.setText('ГОТОВО! ОЖИДАНИЕ ТАЙМЕРА...');
      this.squareTimerText.setText(`⏳ СТАРТ ЧЕРЕЗ: ${this.squareCountdown} с...`);

      this.squareTimerEvent = this.time.addEvent({
        delay: 1000,
        repeat: 20,
        callback: () => {
          this.squareCountdown--;
          if (this.squareCountdown > 0) {
            this.squareTimerText.setText(`⏳ СТАРТ ЧЕРЕЗ: ${this.squareCountdown} с...`);
            soundEngine.playClick();
          } else if (this.squareCountdown <= 0) {
            this.squareTimerText.setText('🚀 ТЕЛЕПОРТАЦИЯ!');
            soundEngine.playExplosion();
            this.cameras.main.fadeOut(400, 0, 0, 0);
            this.time.delayedCall(450, () => {
              this.scene.start('DungeonScene', { selectedHeroKey: this.selectedHeroKey, floor: 1 });
            });
          }
        }
      });
    } else if (!inside && this.isPlayerOnSquare) {
      this.isPlayerOnSquare = false;
      this.squareCountdown = 20;
      if (this.squareTimerEvent) {
        this.squareTimerEvent.remove();
        this.squareTimerEvent = null;
      }
      this.squareStatusText.setText('ВСТАНЬТЕ НА КВАДРАТ\nДЛЯ ОТРЯДА!');
      this.squareTimerText.setText('⏳ СТАРТ: --');
    }
  }

  // --- WAITING MINI-LOBBY LOGIC ---
  private startMiniLobbyLoop() {
    // Real online lobby: No fake bots auto-join! Host starts when ready or shares room code.
  }

  private triggerLobbyCountdown() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    const startBannerBg = this.add.rectangle(w / 2, h / 2 - 80, 520, 80, 0x064e3b, 0.95)
      .setStrokeStyle(3, 0x22c55e).setScrollFactor(0).setDepth(2000);

    const startBannerText = this.add.text(w / 2, h / 2 - 80, `🎉 ЛОББИ ЗАПОЛНЕНО! (${this.maxPlayers}/${this.maxPlayers})\n⏳ СТАРТ ЧЕРЕЗ: 3 с...`, {
      fontSize: '16px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffffff', align: 'center'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);

    this.lobbyStartCountdown = 3;
    soundEngine.playExplosion();

    this.time.addEvent({
      delay: 1000,
      repeat: 3,
      callback: () => {
        this.lobbyStartCountdown--;
        if (this.lobbyStartCountdown > 0) {
          startBannerText.setText(`🎉 ЛОББИ ЗАПОЛНЕНО! (${this.maxPlayers}/${this.maxPlayers})\n⏳ СТАРТ ЧЕРЕЗ: ${this.lobbyStartCountdown} с...`);
          soundEngine.playClick();
        } else if (this.lobbyStartCountdown <= 0) {
          startBannerText.setText('🚀 СТАРТ ПОДЗЕМЕЛЬЯ!');
          soundEngine.playLevelUp();
          this.cameras.main.fadeOut(400, 0, 0, 0);
          this.time.delayedCall(450, () => {
            this.scene.start('DungeonScene', {
              selectedHeroKey: this.selectedHeroKey,
              mode: 'online',
              roomCode: this.roomCode,
              floor: 1
            });
          });
        }
      }
    });
  }

  // --- HUD & CHAT INPUT ---
  private buildTavernHUD() {
    const w = this.cameras.main.width;

    // Top Header Banner
    this.lobbyHeaderBg = this.add.rectangle(w / 2, 28, w, 56, 0x0f172a, 0.95).setScrollFactor(0).setDepth(100);

    const headerText = this.isWaitingLobby
      ? `👥 ЛОББИ: "${this.roomName}" | ИГРОКИ: ${this.currentPlayers}/${this.maxPlayers} | КОД: ${this.roomCode}`
      : '🍺 ТАВЕРНА "ПЬЯНЫЙ ГАРГОЙЛЬ"';

    this.lobbyHeaderUI = this.add.text(70, 28, headerText, {
      fontSize: '13px', fontFamily: 'monospace', fontStyle: 'bold', color: '#facc15'
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(101);

    // Pause Button in top-left
    const btnPause = this.add.rectangle(32, 28, 44, 44, 0x1e293b).setStrokeStyle(2, 0x38bdf8)
      .setScrollFactor(0).setDepth(102).setInteractive({ useHandCursor: true });
    const txtPause = this.add.text(32, 28, '⏸', {
      fontSize: '20px', color: '#38bdf8'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(103);

    const triggerPause = () => this.openPauseModal();
    btnPause.on('pointerdown', triggerPause);
    btnPause.on('pointerup', triggerPause);

    // Top Right Controls (Start Dungeon button, Add Test Player button, Chat button)
    let rightX = w - 70;

    if (this.isWaitingLobby) {
      // Start Dungeon Button
      const btnStart = this.add.rectangle(rightX, 28, 120, 38, 0x16a34a).setStrokeStyle(2, 0x4ade80)
        .setScrollFactor(0).setDepth(102).setInteractive({ useHandCursor: true });
      const txtStart = this.add.text(rightX, 28, '▶ СТАРТ', {
        fontSize: '13px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffffff'
      }).setOrigin(0.5).setScrollFactor(0).setDepth(103);

      const triggerStart = () => {
        soundEngine.playExplosion();
        this.cameras.main.fadeOut(350, 0, 0, 0);
        this.time.delayedCall(380, () => {
          this.scene.start('DungeonScene', {
            selectedHeroKey: this.selectedHeroKey,
            mode: 'online',
            roomCode: this.roomCode,
            floor: 1
          });
        });
      };
      btnStart.on('pointerdown', triggerStart);
      rightX -= 130;
    }

    // Top Right Chat Button
    const btnChatHeader = this.add.rectangle(rightX, 28, 90, 38, 0x1e293b).setStrokeStyle(2, 0x38bdf8)
      .setScrollFactor(0).setDepth(102).setInteractive({ useHandCursor: true });
    const txtChatHeader = this.add.text(rightX, 28, '💬 ЧАТ', {
      fontSize: '12px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffffff'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(103);

    const triggerChat = () => {
      soundEngine.playClick();
      showHTMLInputModal({
        title: '💬 СООБЩЕНИЕ В ЧАТ',
        placeholder: 'Напишите текст сообщения...',
        confirmText: 'ОТПРАВИТЬ',
        onConfirm: (userMsg) => {
          if (userMsg) {
            const cleanMsg = userMsg.slice(0, 60);
            this.sendPlayerSpeechBubble(cleanMsg);
          }
        }
      });
    };

    btnChatHeader.on('pointerdown', triggerChat);
    btnChatHeader.on('pointerup', triggerChat);
  }

  private onlinePeers: Map<string, TavernOnlinePeer> = new Map();
  private lastMoveSyncTime = 0;

  private setupOnlineTavernNetwork() {
    const net = NetworkService.getInstance();
    const profile = getActiveUserProfile();

    net.connect().then(() => {
      net.emit('join_tavern', {
        name: profile.nickname || 'Герой',
        hero: this.selectedHeroKey
      });
    });

    net.on('tavern_joined', (data: { players: Array<{ id: string; name: string; hero: string; x: number; y: number }> }) => {
      if (data && data.players) {
        data.players.forEach(p => {
          if (p.id !== net.getSocketId()) {
            this.spawnOnlinePeer(p);
          }
        });
      }
    });

    net.on('tavern_player_joined', (p: { id: string; name: string; hero: string; x: number; y: number }) => {
      this.spawnOnlinePeer(p);
    });

    net.on('tavern_player_moved', (data: { id: string; x: number; y: number; flipX?: boolean }) => {
      const peer = this.onlinePeers.get(data.id);
      if (peer) {
        peer.targetX = data.x;
        peer.targetY = data.y;
        if (data.flipX !== undefined) peer.flipX = data.flipX;
      }
    });

    net.on('tavern_player_left', (data: { id: string }) => {
      this.removeOnlinePeer(data.id);
    });

    net.on('tavern_chat_bubble', (data: { id: string; message: string }) => {
      if (data.id === net.getSocketId()) return;
      const peer = this.onlinePeers.get(data.id);
      if (peer) {
        this.showPeerSpeechBubble(peer, data.message);
      }
    });
  }

  private spawnOnlinePeer(p: { id: string; name: string; hero: string; x: number; y: number }) {
    if (this.onlinePeers.has(p.id)) return;

    const heroTex = HEROES[p.hero]?.texture || 'char_zaza';
    const peerSprite = this.physics.add.sprite(p.x || 400, p.y || 650, heroTex).setDepth(50).setScale(1.3);

    const label = this.add.text(p.x || 400, (p.y || 650) - 36, p.name || 'Игрок', {
      fontSize: '11px', fontFamily: 'Consolas, monospace', fontStyle: 'bold', color: '#60a5fa', backgroundColor: '#0f172a', padding: { x: 4, y: 2 }
    }).setOrigin(0.5).setDepth(52);

    this.onlinePeers.set(p.id, {
      id: p.id,
      name: p.name,
      hero: p.hero,
      sprite: peerSprite,
      label,
      targetX: p.x || 400,
      targetY: p.y || 650,
      flipX: false
    });
  }

  private removeOnlinePeer(id: string) {
    const peer = this.onlinePeers.get(id);
    if (peer) {
      peer.sprite.destroy();
      peer.label.destroy();
      if (peer.speechBubble) peer.speechBubble.destroy();
      this.onlinePeers.delete(id);
    }
  }

  private showPeerSpeechBubble(peer: TavernOnlinePeer, msg: string) {
    if (peer.speechBubble) peer.speechBubble.destroy();

    peer.speechBubble = this.add.text(peer.sprite.x, peer.sprite.y - 65, msg, {
      fontSize: '12px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffffff',
      backgroundColor: '#1e293b', padding: { x: 10, y: 5 }
    }).setOrigin(0.5).setDepth(300);

    this.time.delayedCall(3500, () => {
      if (peer.speechBubble) {
        peer.speechBubble.destroy();
        peer.speechBubble = undefined;
      }
    });
  }

  private playerSpeechBubble: { textObj: Phaser.GameObjects.Text; offsetY: number } | null = null;

  private sendPlayerSpeechBubble(msgText: string) {
    if (!this.player) return;

    NetworkService.getInstance().emit('tavern_chat', { message: msgText });

    if (this.playerSpeechBubble && this.playerSpeechBubble.textObj) {
      this.playerSpeechBubble.textObj.destroy();
      this.playerSpeechBubble = null;
    }

    // Floating speech bubble box directly over player head
    const bubbleText = this.add.text(this.player.x, this.player.y - 65, msgText, {
      fontSize: '12px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffffff',
      backgroundColor: '#1e293b', padding: { x: 10, y: 5 }
    }).setOrigin(0.5).setDepth(300);

    const bubbleData = { textObj: bubbleText, offsetY: 65 };
    this.playerSpeechBubble = bubbleData;

    this.tweens.add({
      targets: bubbleData,
      offsetY: 105,
      alpha: 0,
      delay: 3200,
      duration: 800,
      onComplete: () => {
        if (this.playerSpeechBubble === bubbleData) {
          bubbleText.destroy();
          this.playerSpeechBubble = null;
        }
      }
    });
  }

  // --- PAUSE MODAL ---
  private openPauseModal() {
    if (this.isGamePaused) return;
    this.isGamePaused = true;
    this.physics.pause();
    soundEngine.playClick();

    showHTMLPauseModal({
      sceneTitle: 'ПАУЗА ТАВЕРНЫ',
      onResume: () => {
        this.isGamePaused = false;
        this.physics.resume();
      },
      onExit: () => {
        this.physics.resume();
        this.isGamePaused = false;
        this.scene.start('HubScene', { selectedHeroKey: this.selectedHeroKey });
      }
    });
  }

  private closePauseModal() {
    soundEngine.playClick();
    this.pauseModalElements.forEach(obj => obj.destroy());
    this.pauseModalElements = [];
    this.isGamePaused = false;
    this.physics.resume();
  }

  // --- TOUCH CONTROLS ---
  private buildTouchControls() {
    const h = this.cameras.main.height;

    this.joyStickBase = this.add.circle(100, h - 100, 50, 0x1e293b, 0.6)
      .setStrokeStyle(3, 0x38bdf8).setScrollFactor(0).setDepth(150);
    this.joyStickThumb = this.add.circle(100, h - 100, 24, 0x38bdf8, 0.8)
      .setScrollFactor(0).setDepth(151);

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isGamePaused) return;
      if (pointer.x < 300 && pointer.y > h - 300) {
        this.joyStickPointerId = pointer.id;
        this.joyStickOrigin.set(pointer.x, pointer.y);
        this.joyStickBase.setPosition(pointer.x, pointer.y);
        this.joyStickThumb.setPosition(pointer.x, pointer.y);
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.joyStickPointerId === pointer.id) {
        const dist = Phaser.Math.Distance.Between(this.joyStickOrigin.x, this.joyStickOrigin.y, pointer.x, pointer.y);
        const maxDist = 50;
        const angle = Phaser.Math.Angle.Between(this.joyStickOrigin.x, this.joyStickOrigin.y, pointer.x, pointer.y);

        const clampDist = Math.min(dist, maxDist);
        this.joyStickThumb.setPosition(
          this.joyStickOrigin.x + Math.cos(angle) * clampDist,
          this.joyStickOrigin.y + Math.sin(angle) * clampDist
        );

        this.joyStickVector.set((pointer.x - this.joyStickOrigin.x) / maxDist, (pointer.y - this.joyStickOrigin.y) / maxDist);
        if (this.joyStickVector.lengthSq() > 1) this.joyStickVector.normalize();
      }
    });

    const resetJoystick = (pointer: Phaser.Input.Pointer) => {
      if (this.joyStickPointerId === pointer.id) {
        this.joyStickPointerId = null;
        this.joyStickVector.set(0, 0);
        this.joyStickThumb.setPosition(100, h - 100);
        this.joyStickBase.setPosition(100, h - 100);
      }
    };

    this.input.on('pointerup', resetJoystick);
    this.input.on('pointerupoutside', resetJoystick);
  }

  update() {
    if (this.isGamePaused) return;

    // 1. Update Player Movement
    let vx = 0;
    let vy = 0;

    if (this.cursors) {
      if (this.cursors.A.isDown || this.cursors.LEFT.isDown) vx -= 1;
      if (this.cursors.D.isDown || this.cursors.RIGHT.isDown) vx += 1;
      if (this.cursors.W.isDown || this.cursors.UP.isDown) vy -= 1;
      if (this.cursors.S.isDown || this.cursors.DOWN.isDown) vy += 1;
    }

    if (this.joyStickVector.lengthSq() > 0.05) {
      vx = this.joyStickVector.x;
      vy = this.joyStickVector.y;
    }

    const len = Math.sqrt(vx * vx + vy * vy);
    if (len > 0) {
      vx /= len;
      vy /= len;
      this.player.setVelocity(vx * this.playerSpeed, vy * this.playerSpeed);
      this.player.setFlipX(vx < 0);
    } else {
      this.player.setVelocity(0, 0);
    }

    // Emit position sync to online tavern
    const now = this.time.now;
    if (now - this.lastMoveSyncTime > 50 && (vx !== 0 || vy !== 0)) {
      this.lastMoveSyncTime = now;
      NetworkService.getInstance().emit('tavern_move', {
        x: this.player.x,
        y: this.player.y,
        flipX: this.player.flipX
      });
    }

    // Interpolate online peers
    this.onlinePeers.forEach(peer => {
      peer.sprite.x = Phaser.Math.Linear(peer.sprite.x, peer.targetX, 0.25);
      peer.sprite.y = Phaser.Math.Linear(peer.sprite.y, peer.targetY, 0.25);
      peer.sprite.setFlipX(peer.flipX);
      peer.label.setPosition(peer.sprite.x, peer.sprite.y - 36);
      if (peer.speechBubble) {
        peer.speechBubble.setPosition(peer.sprite.x, peer.sprite.y - 65);
      }
    });

    // Keep speech bubble anchored directly above player head as they walk
    if (this.playerSpeechBubble && this.playerSpeechBubble.textObj && this.player) {
      this.playerSpeechBubble.textObj.setPosition(
        this.player.x,
        this.player.y - this.playerSpeechBubble.offsetY
      );
    }

    // 2. Check Matchmaking Square
    if (!this.isWaitingLobby) {
      this.checkMatchmakingSquareOverlap();
    }
  }
}
