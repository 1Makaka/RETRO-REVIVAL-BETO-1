/**
 * Frantic Battles - Custom MOBA Room Lobby (CustomRoomLobby.ts)
 * Features Server Creation Dialog, Red vs Blue Team selection,
 * Ready status toggling, and direct launch into MobaScene.
 */

import Phaser from 'phaser';
import { MobaMode, MobaTeam, MobaPlayerSlot, MobaRoomConfig } from './MobaTypes';
import { soundEngine } from '../audio';
import { RoomManager } from '../roomManager';
import { showHTMLInputModal } from '../../utils/domInput';
import { QuickInviteModal } from '../QuickInviteModal';

export interface CustomLobbyCallbacks {
  onStartMatch: (config: { mode: MobaMode; playerTeam: MobaTeam; heroKey: string; roomConfig: MobaRoomConfig }) => void;
  onCloseLobby: () => void;
}

export class CustomRoomLobby {
  private scene: Phaser.Scene;
  private callbacks: CustomLobbyCallbacks;
  private elements: Phaser.GameObjects.GameObject[] = [];
  private playerTeam: MobaTeam = 'blue';
  private playerHeroKey: string = 'char_zaza';
  private isPlayerReady: boolean = true;
  private selectedMode: MobaMode = 'solo';
  private roomName: string;
  private roomCode: string;
  private isPrivate: boolean;
  private password?: string;
  private playerLimit: number = 2;

  private teamBlueSlots: MobaPlayerSlot[] = [];
  private teamRedSlots: MobaPlayerSlot[] = [];
  private slotGameObjects: Phaser.GameObjects.GameObject[] = [];

  constructor(
    scene: Phaser.Scene,
    initialConfig: {
      roomName?: string;
      password?: string;
      mode?: MobaMode;
      heroKey?: string;
      team?: MobaTeam;
    },
    callbacks: CustomLobbyCallbacks
  ) {
    this.scene = scene;
    this.callbacks = callbacks;
    this.playerHeroKey = initialConfig.heroKey || 'char_zaza';
    this.selectedMode = initialConfig.mode || 'solo';
    this.roomName = initialConfig.roomName || 'MOBA Арена 1';
    this.password = initialConfig.password || '';
    this.isPrivate = !!this.password;
    this.playerTeam = initialConfig.team || 'blue';
    this.roomCode = `ROOM-${Math.floor(1000 + Math.random() * 9000)}`;

    this.playerLimit = this.selectedMode === 'solo' ? 2 : this.selectedMode === 'duo' ? 4 : this.selectedMode === 'trio' ? 6 : 8;

    this.setupSlots();
    this.buildUI();
  }

  /**
   * Static helper to open the Server Creation Modal before entering the lobby.
   */
  public static openCreateServerDialog(
    scene: Phaser.Scene,
    heroKey: string,
    callbacks: CustomLobbyCallbacks
  ) {
    const w = scene.cameras.main.width;
    const h = scene.cameras.main.height;
    const cx = w / 2;
    const cy = h / 2;

    const modalW = Math.min(520, w - 24);
    const modalH = Math.min(420, h - 24);
    const dialogGroup: Phaser.GameObjects.GameObject[] = [];

    // Backdrop
    const backdrop = scene.add.rectangle(cx, cy, w * 2, h * 2, 0x000000, 0.85)
      .setScrollFactor(0).setDepth(2200).setInteractive();
    dialogGroup.push(backdrop);

    // Modal Card
    const cardBg = scene.add.rectangle(cx, cy, modalW, modalH, 0x090d16)
      .setStrokeStyle(3, 0xf59e0b).setScrollFactor(0).setDepth(2201);
    dialogGroup.push(cardBg);

    // Header
    const title = scene.add.text(cx, cy - modalH / 2 + 28, '➕ СОЗДАНИЕ СЕРВЕРА MOBA', {
      fontSize: '17px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#facc15'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2205);

    const closeBtn = scene.add.text(cx + modalW / 2 - 24, cy - modalH / 2 + 24, '[✕]', {
      fontSize: '18px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#ef4444'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2205).setInteractive({ useHandCursor: true });

    const closeDialog = () => {
      soundEngine.playClick();
      dialogGroup.forEach(el => el.destroy());
    };
    closeBtn.on('pointerdown', closeDialog);
    dialogGroup.push(title, closeBtn);

    // State
    let chosenName = `Арена ${Math.floor(100 + Math.random() * 900)}`;
    let chosenPass = '';
    let chosenMode: MobaMode = 'solo';

    // 1. Server Name Row
    const nameLabel = scene.add.text(cx - modalW / 2 + 30, cy - 115, 'Название сервера:', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#94a3b8'
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(2205);

    const nameBox = scene.add.rectangle(cx, cy - 85, modalW - 60, 36, 0x1e293b)
      .setStrokeStyle(1.5, 0x38bdf8).setScrollFactor(0).setDepth(2205).setInteractive({ useHandCursor: true });

    const nameText = scene.add.text(cx - (modalW - 60) / 2 + 12, cy - 85, `📝 ${chosenName}`, {
      fontSize: '13px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(2206).setInteractive({ useHandCursor: true });

    const triggerEditName = () => {
      soundEngine.playClick();
      showHTMLInputModal({
        title: 'Название Сервера',
        placeholder: 'Введите имя для создаваемого сервера MOBA...',
        defaultValue: chosenName,
        onConfirm: (val: string) => {
          chosenName = val.trim() || `Арена ${Math.floor(100 + Math.random() * 900)}`;
          nameText.setText(`📝 ${chosenName}`);
        }
      });
    };
    nameBox.on('pointerdown', triggerEditName);
    nameText.on('pointerdown', triggerEditName);
    dialogGroup.push(nameLabel, nameBox, nameText);

    // 2. Password Row (Optional)
    const passLabel = scene.add.text(cx - modalW / 2 + 30, cy - 42, 'Пароль (опционально, пусто = открытый):', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#94a3b8'
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(2205);

    const passBox = scene.add.rectangle(cx, cy - 14, modalW - 60, 36, 0x1e293b)
      .setStrokeStyle(1.5, 0x64748b).setScrollFactor(0).setDepth(2205).setInteractive({ useHandCursor: true });

    const passText = scene.add.text(cx - (modalW - 60) / 2 + 12, cy - 14, chosenPass ? `🔒 ${chosenPass}` : '🔒 Без пароля (Публичный)', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: chosenPass ? '#facc15' : '#64748b'
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(2206).setInteractive({ useHandCursor: true });

    const triggerEditPass = () => {
      soundEngine.playClick();
      showHTMLInputModal({
        title: 'Пароль Сервера',
        placeholder: 'Введите пароль для приватного сервера (или оставьте пустым)...',
        defaultValue: chosenPass,
        onConfirm: (val: string) => {
          chosenPass = val.trim();
          passText.setText(chosenPass ? `🔒 ${chosenPass}` : '🔒 Без пароля (Публичный)');
          passText.setColor(chosenPass ? '#facc15' : '#64748b');
        }
      });
    };
    passBox.on('pointerdown', triggerEditPass);
    passText.on('pointerdown', triggerEditPass);
    dialogGroup.push(passLabel, passBox, passText);

    // 3. Mode Selection (1v1, 2v2, 3v3, 4v4)
    const modeLabel = scene.add.text(cx - modalW / 2 + 30, cy + 30, 'Режим и Лимит игроков:', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#94a3b8'
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(2205);
    dialogGroup.push(modeLabel);

    const modes: Array<{ mode: MobaMode; label: string; players: number }> = [
      { mode: 'solo', label: '1v1 (2)', players: 2 },
      { mode: 'duo', label: '2v2 (4)', players: 4 },
      { mode: 'trio', label: '3v3 (6)', players: 6 },
      { mode: '4v4', label: '4v4 (8)', players: 8 }
    ];

    const modeBtns: Array<{ bg: Phaser.GameObjects.Rectangle; txt: Phaser.GameObjects.Text; mode: MobaMode }> = [];
    const btnW = (modalW - 60 - 30) / 4;
    const startX = cx - (modalW - 60) / 2 + btnW / 2;

    modes.forEach((m, idx) => {
      const bx = startX + idx * (btnW + 10);
      const isSelected = m.mode === chosenMode;

      const mBg = scene.add.rectangle(bx, cy + 60, btnW, 34, isSelected ? 0x1e3a8a : 0x0f172a)
        .setStrokeStyle(isSelected ? 2 : 1, isSelected ? 0x38bdf8 : 0x334155)
        .setScrollFactor(0).setDepth(2205).setInteractive({ useHandCursor: true });

      const mTxt = scene.add.text(bx, cy + 60, m.label, {
        fontSize: '11px',
        fontFamily: 'monospace',
        fontStyle: 'bold',
        color: isSelected ? '#38bdf8' : '#94a3b8'
      }).setOrigin(0.5).setScrollFactor(0).setDepth(2206).setInteractive({ useHandCursor: true });

      const selectMode = () => {
        soundEngine.playClick();
        chosenMode = m.mode;
        modeBtns.forEach(b => {
          const sel = b.mode === chosenMode;
          b.bg.setFillStyle(sel ? 0x1e3a8a : 0x0f172a);
          b.bg.setStrokeStyle(sel ? 2 : 1, sel ? 0x38bdf8 : 0x334155);
          b.txt.setColor(sel ? '#38bdf8' : '#94a3b8');
        });
      };

      mBg.on('pointerdown', selectMode);
      mTxt.on('pointerdown', selectMode);

      modeBtns.push({ bg: mBg, txt: mTxt, mode: m.mode });
      dialogGroup.push(mBg, mTxt);
    });

    // 4. Confirm & Create Button
    const confirmBg = scene.add.rectangle(cx, cy + modalH / 2 - 36, modalW - 60, 42, 0x15803d)
      .setStrokeStyle(2, 0x4ade80).setScrollFactor(0).setDepth(2205).setInteractive({ useHandCursor: true });

    const confirmTxt = scene.add.text(cx, cy + modalH / 2 - 36, '⚔️ ПОДТВЕРДИТЬ И СОЗДАТЬ ⚔️', {
      fontSize: '13px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2206).setInteractive({ useHandCursor: true });

    const triggerConfirm = () => {
      soundEngine.playLevelUp();
      dialogGroup.forEach(el => el.destroy());

      // Save to RoomManager
      const code = `PVP-${Math.floor(1000 + Math.random() * 9000)}`;
      const pLimit = chosenMode === 'solo' ? 2 : chosenMode === 'duo' ? 4 : chosenMode === 'trio' ? 6 : 8;
      RoomManager.createRoom({
        code,
        name: chosenName,
        maxPlayers: pLimit,
        isPrivate: !!chosenPass,
        password: chosenPass
      });

      // Open Custom Room Lobby Screen
      new CustomRoomLobby(
        scene,
        {
          roomName: chosenName,
          password: chosenPass,
          mode: chosenMode,
          heroKey
        },
        callbacks
      );
    };

    confirmBg.on('pointerdown', triggerConfirm);
    confirmTxt.on('pointerdown', triggerConfirm);
    dialogGroup.push(confirmBg, confirmTxt);
  }

  private setupSlots() {
    const teamSize = this.playerLimit / 2;

    this.teamBlueSlots = [];
    this.teamRedSlots = [];

    // Blue Team
    for (let i = 0; i < teamSize; i++) {
      if (i === 0 && this.playerTeam === 'blue') {
        this.teamBlueSlots.push({
          id: 'player_you',
          name: 'ИГРОК 1 (ТЫ)',
          heroKey: this.playerHeroKey,
          team: 'blue',
          isHost: true,
          isBot: false,
          isReady: this.isPlayerReady
        });
      } else {
        const botHeroes = ['char_grim', 'char_bjorn', 'char_omen', 'char_torf', 'char_alrik', 'char_nihil'];
        this.teamBlueSlots.push({
          id: `bot_blue_${i}`,
          name: `Бот Синих ${i + 1}`,
          heroKey: botHeroes[i % botHeroes.length],
          team: 'blue',
          isHost: false,
          isBot: true,
          isReady: true
        });
      }
    }

    // Red Team
    for (let i = 0; i < teamSize; i++) {
      if (i === 0 && this.playerTeam === 'red') {
        this.teamRedSlots.push({
          id: 'player_you',
          name: 'ИГРОК 1 (ТЫ)',
          heroKey: this.playerHeroKey,
          team: 'red',
          isHost: true,
          isBot: false,
          isReady: this.isPlayerReady
        });
      } else {
        const botHeroes = ['char_omen', 'char_kraul', 'char_bjorn', 'char_zaza', 'char_alrik', 'char_nihil'];
        this.teamRedSlots.push({
          id: `bot_red_${i}`,
          name: `Бот Красных ${i + 1}`,
          heroKey: botHeroes[i % botHeroes.length],
          team: 'red',
          isHost: false,
          isBot: true,
          isReady: true
        });
      }
    }
  }

  private buildUI() {
    const w = this.scene.cameras.main.width;
    const h = this.scene.cameras.main.height;
    const cx = w / 2;
    const cy = h / 2;

    const cardW = Math.min(680, w - 24);
    const cardH = Math.min(500, h - 24);

    // 1. Backdrop
    const backdrop = this.scene.add.rectangle(cx, cy, w * 2, h * 2, 0x000000, 0.85)
      .setScrollFactor(0).setDepth(2100).setInteractive();
    this.elements.push(backdrop);

    // 2. Card Background
    const cardBg = this.scene.add.rectangle(cx, cy, cardW, cardH, 0x090d16)
      .setScrollFactor(0).setDepth(2101);
    const cardInner = this.scene.add.rectangle(cx, cy, cardW - 8, cardH - 8, 0x0f172a)
      .setScrollFactor(0).setDepth(2102);
    const cardBorder = this.scene.add.rectangle(cx, cy, cardW, cardH)
      .setStrokeStyle(3, 0x38bdf8, 0.9).setScrollFactor(0).setDepth(2103);
    this.elements.push(cardBg, cardInner, cardBorder);

    // 3. Header: Title & Close Button
    const header = this.scene.add.text(cx, cy - cardH / 2 + 24, `⚔️ ${this.roomName.toUpperCase()} ⚔️`, {
      fontSize: '17px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#facc15'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2105);

    const modeLabel = this.scene.add.text(cx, cy - cardH / 2 + 46, `РЕЖИМ: ${this.selectedMode.toUpperCase()} (${this.playerLimit} ИГРОКОВ) ${this.isPrivate ? '🔒' : '🌐'}`, {
      fontSize: '11px',
      fontFamily: 'monospace',
      color: '#94a3b8'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2105);

    const closeBtn = this.scene.add.text(cx + cardW / 2 - 26, cy - cardH / 2 + 24, '[✕]', {
      fontSize: '20px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#ef4444'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2110).setInteractive({ useHandCursor: true });

    closeBtn.on('pointerdown', (p: Phaser.Input.Pointer, _x: number, _y: number, ev: { stopPropagation: () => void }) => {
      if (ev && typeof ev.stopPropagation === 'function') ev.stopPropagation();
      soundEngine.playClick();
      this.close();
    });

    this.elements.push(header, modeLabel, closeBtn);

    // 4. Team Columns (Blue Team Left, Red Team Right)
    this.renderTeamSlots(cx, cy, cardW, cardH);

    // 5. Bottom Action Controls: [ СМЕНИТЬ КОМАНДУ ] & [ СТАРТ МАТЧА ]
    const btnY = cy + cardH / 2 - 38;
    const btnW = 200;

    // Switch Team Button
    const switchBg = this.scene.add.rectangle(cx - 120, btnY, btnW, 42, 0x1e293b)
      .setStrokeStyle(2, 0x38bdf8).setScrollFactor(0).setDepth(2110).setInteractive({ useHandCursor: true });

    const switchTxt = this.scene.add.text(cx - 120, btnY, this.playerTeam === 'blue' ? '➔ ЗА КРАСНЫХ' : '➔ ЗА СИНИХ', {
      fontSize: '13px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#38bdf8'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2111).setInteractive({ useHandCursor: true });

    const triggerSwitch = () => {
      soundEngine.playClick();
      this.playerTeam = this.playerTeam === 'blue' ? 'red' : 'blue';
      switchTxt.setText(this.playerTeam === 'blue' ? '➔ ЗА КРАСНЫХ' : '➔ ЗА СИНИХ');
      this.setupSlots();
      this.renderTeamSlots(cx, cy, cardW, cardH);
    };

    switchBg.on('pointerdown', triggerSwitch);
    switchTxt.on('pointerdown', triggerSwitch);

    // Start Match Button (Host only)
    const startBg = this.scene.add.rectangle(cx + 120, btnY, btnW, 42, 0x15803d)
      .setStrokeStyle(2, 0x4ade80).setScrollFactor(0).setDepth(2110).setInteractive({ useHandCursor: true });

    const startTxt = this.scene.add.text(cx + 120, btnY, '⚔️ СТАРТ МАТЧА ⚔️', {
      fontSize: '13px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2111).setInteractive({ useHandCursor: true });

    startBg.on('pointerdown', () => {
      soundEngine.playLevelUp();
      this.close();
      this.callbacks.onStartMatch({
        mode: this.selectedMode,
        playerTeam: this.playerTeam,
        heroKey: this.playerHeroKey,
        roomConfig: {
          roomCode: this.roomCode,
          roomName: this.roomName,
          mode: this.selectedMode,
          playerLimit: this.playerLimit,
          isPrivate: this.isPrivate,
          password: this.password,
          hostPlayerId: 'player_you',
          teamBlue: this.teamBlueSlots,
          teamRed: this.teamRedSlots
        }
      });
    });

    this.elements.push(switchBg, switchTxt, startBg, startTxt);
  }

  private renderTeamSlots(cx: number, cy: number, cardW: number, cardH: number) {
    // Clear old slot objects
    this.slotGameObjects.forEach(obj => obj.destroy());
    this.slotGameObjects = [];

    const colW = Math.floor((cardW - 48) * 0.48);
    const blueColX = cx - cardW / 4;
    const redColX = cx + cardW / 4;
    const startY = cy - cardH / 2 + 105;
    const slotH = 55;
    const spacing = slotH + 10;

    // 1. Blue Team Header
    const bHeader = this.scene.add.text(blueColX, startY - 26, '✦ СИНЯЯ КОМАНДА ✦', {
      fontSize: '13px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#38bdf8'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2105);
    this.slotGameObjects.push(bHeader);

    // Blue Team Slots
    this.teamBlueSlots.forEach((slot, i) => {
      const sy = startY + i * spacing;
      const sBg = this.scene.add.rectangle(blueColX, sy, colW, slotH, slot.isBot ? 0x0f172a : 0x1e3a8a)
        .setStrokeStyle(2, 0x38bdf8).setScrollFactor(0).setDepth(2105);
      const nameTxt = this.scene.add.text(blueColX - colW / 2 + 12, sy - 8, slot.name, {
        fontSize: '12px',
        fontFamily: 'monospace',
        fontStyle: 'bold',
        color: '#ffffff'
      }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(2106);
      const readyBadge = this.scene.add.text(blueColX + colW / 2 - 40, sy, slot.isReady ? '[ ГОТОВ ]' : '[ НЕ ГОТОВ ]', {
        fontSize: '10px',
        fontFamily: 'monospace',
        fontStyle: 'bold',
        color: slot.isReady ? '#22c55e' : '#f59e0b'
      }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(2106);

      const plusBtn = this.scene.add.rectangle(blueColX + colW / 2 - 18, sy, 24, 24, 0x1d4ed8)
        .setStrokeStyle(1, 0x60a5fa).setScrollFactor(0).setDepth(2107).setInteractive({ useHandCursor: true });
      const plusTxt = this.scene.add.text(blueColX + colW / 2 - 18, sy, '+', {
        fontSize: '16px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffffff'
      }).setOrigin(0.5).setScrollFactor(0).setDepth(2108).setInteractive({ useHandCursor: true });

      const triggerInvite = (p: Phaser.Input.Pointer, _x: number, _y: number, ev: { stopPropagation: () => void }) => {
        if (ev && typeof ev.stopPropagation === 'function') ev.stopPropagation();
        soundEngine.playClick();
        new QuickInviteModal(this.scene, this.roomCode, 'PVP');
      };
      plusBtn.on('pointerdown', triggerInvite);
      plusTxt.on('pointerdown', triggerInvite);

      this.slotGameObjects.push(sBg, nameTxt, readyBadge, plusBtn, plusTxt);
    });

    // 2. Red Team Header
    const rHeader = this.scene.add.text(redColX, startY - 26, '✦ КРАСНАЯ КОМАНДА ✦', {
      fontSize: '13px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#ef4444'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2105);
    this.slotGameObjects.push(rHeader);

    // Red Team Slots
    this.teamRedSlots.forEach((slot, i) => {
      const sy = startY + i * spacing;
      const sBg = this.scene.add.rectangle(redColX, sy, colW, slotH, slot.isBot ? 0x0f172a : 0x7f1d1d)
        .setStrokeStyle(2, 0xef4444).setScrollFactor(0).setDepth(2105);
      const nameTxt = this.scene.add.text(redColX - colW / 2 + 12, sy - 8, slot.name, {
        fontSize: '12px',
        fontFamily: 'monospace',
        fontStyle: 'bold',
        color: '#ffffff'
      }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(2106);
      const readyBadge = this.scene.add.text(redColX + colW / 2 - 40, sy, slot.isReady ? '[ ГОТОВ ]' : '[ НЕ ГОТОВ ]', {
        fontSize: '10px',
        fontFamily: 'monospace',
        fontStyle: 'bold',
        color: slot.isReady ? '#22c55e' : '#f59e0b'
      }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(2106);

      const plusBtn = this.scene.add.rectangle(redColX + colW / 2 - 18, sy, 24, 24, 0x991b1b)
        .setStrokeStyle(1, 0xfca5a5).setScrollFactor(0).setDepth(2107).setInteractive({ useHandCursor: true });
      const plusTxt = this.scene.add.text(redColX + colW / 2 - 18, sy, '+', {
        fontSize: '16px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffffff'
      }).setOrigin(0.5).setScrollFactor(0).setDepth(2108).setInteractive({ useHandCursor: true });

      const triggerInvite = (p: Phaser.Input.Pointer, _x: number, _y: number, ev: { stopPropagation: () => void }) => {
        if (ev && typeof ev.stopPropagation === 'function') ev.stopPropagation();
        soundEngine.playClick();
        new QuickInviteModal(this.scene, this.roomCode, 'PVP');
      };
      plusBtn.on('pointerdown', triggerInvite);
      plusTxt.on('pointerdown', triggerInvite);

      this.slotGameObjects.push(sBg, nameTxt, readyBadge, plusBtn, plusTxt);
    });
  }

  public close() {
    this.elements.forEach(el => el.destroy());
    this.slotGameObjects.forEach(el => el.destroy());
    this.elements = [];
    this.slotGameObjects = [];
    this.callbacks.onCloseLobby();
  }
}
