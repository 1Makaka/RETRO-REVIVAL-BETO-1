import Phaser from 'phaser';
import { soundEngine } from './audio';
import { getFriendsList, sendLobbyInvite } from './firebase';

export class QuickInviteModal {
  private scene: Phaser.Scene;
  private elements: Phaser.GameObjects.GameObject[] = [];
  private roomCode: string;
  private lobbyMode: 'Dungeon' | 'PVP' | 'Tavern';
  private listContainer?: Phaser.GameObjects.Container;
  private isClosing = false;

  private modalW = 500;
  private modalH = 400;

  constructor(scene: Phaser.Scene, roomCode: string, lobbyMode: 'Dungeon' | 'PVP' | 'Tavern') {
    this.scene = scene;
    this.roomCode = roomCode;
    this.lobbyMode = lobbyMode;
    this.buildUI();
  }

  private buildUI() {
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const cx = Math.round(w / 2);
    const cy = Math.round(h / 2);

    this.modalW = Math.min(500, w - 24);
    this.modalH = Math.min(400, h - 24);

    // 1. Semi-transparent backdrop (depth 4100)
    const backdrop = this.scene.add.rectangle(cx, cy, w * 2, h * 2, 0x000000, 0.8)
      .setScrollFactor(0)
      .setDepth(4100)
      .setInteractive();
    backdrop.on('pointerdown', (p: any, x: number, y: number, ev: { stopPropagation: () => void }) => {
      if (ev && typeof ev.stopPropagation === 'function') ev.stopPropagation();
    });
    this.elements.push(backdrop);

    // 2. Window Frame
    const cardBg = this.scene.add.rectangle(cx, cy, this.modalW, this.modalH, 0x090d16)
      .setStrokeStyle(3, 0xfacc15, 1.0)
      .setScrollFactor(0)
      .setDepth(4101);
    const cardInner = this.scene.add.rectangle(cx, cy, this.modalW - 8, this.modalH - 8, 0x0f172a)
      .setScrollFactor(0)
      .setDepth(4102);
    this.elements.push(cardBg, cardInner);

    // 3. Title & Close [✕]
    const titleTxt = this.scene.add.text(cx, cy - this.modalH / 2 + 28, '📩 ПОЗВАТЬ ДРУГА В БОЙ', {
      fontSize: '14px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#facc15'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(4103).setResolution(2);

    const closeBtn = this.scene.add.text(cx + this.modalW / 2 - 24, cy - this.modalH / 2 + 24, '[X]', {
      fontSize: '14px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#ef4444'
    }).setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(5000)
      .setInteractive({ useHandCursor: true });

    closeBtn.on('pointerdown', (p: any, x: number, y: number, ev: { stopPropagation: () => void }) => {
      if (ev && typeof ev.stopPropagation === 'function') ev.stopPropagation();
      soundEngine.playClick();
      this.close();
    });

    this.elements.push(titleTxt, closeBtn);

    // 4. Friends List container
    this.listContainer = this.scene.add.container(0, 0).setDepth(4104);
    this.elements.push(this.listContainer);

    this.loadAndRender();
  }

  private async loadAndRender() {
    const list = await getFriendsList();
    
    // Filter: lift Online friends to the top
    const sorted = [...list].sort((a, b) => {
      const aOn = a.isOnline ? 1 : 0;
      const bOn = b.isOnline ? 1 : 0;
      return bOn - aOn;
    });

    if (this.isClosing || !this.listContainer) return;

    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const cx = Math.round(w / 2);
    const cy = Math.round(h / 2);

    const startY = cy - this.modalH / 2 + 70;
    const rowH = 50;
    const spacing = 4;
    const cardW = this.modalW - 48;

    if (sorted.length === 0) {
      const emptyText = this.scene.add.text(cx, cy, 'У вас пока нет добавленных друзей.\nДобавьте их по тегу в панели друзей!', {
        fontSize: '11px',
        fontFamily: 'monospace',
        color: '#64748b',
        align: 'center'
      }).setOrigin(0.5).setResolution(2);
      this.listContainer.add(emptyText);
      return;
    }

    // Clip geometry mask for quick invite
    const maskGraphics = this.scene.add.graphics().setScrollFactor(0).setDepth(4103);
    maskGraphics.fillStyle(0xffffff, 1);
    maskGraphics.fillRect(cx - cardW / 2, startY, cardW, this.modalH - 110);
    const mask = maskGraphics.createGeometryMask();
    this.listContainer.setMask(mask);
    this.elements.push(maskGraphics);

    sorted.forEach((friend, i) => {
      const cardY = startY + i * (rowH + spacing);

      const itemBg = this.scene.add.rectangle(cx, cardY + rowH / 2, cardW, rowH, 0x1e293b, 0.5)
        .setStrokeStyle(1.5, friend.isOnline ? 0x22c55e : 0x475569)
        .setDepth(4104);

      // Left: indicator and name
      const statusIcon = friend.isOnline ? '🟢' : '⚪';
      const nameText = this.scene.add.text(cx - cardW / 2 + 16, cardY + rowH / 2, `${statusIcon} ${friend.nickname}`, {
        fontSize: '12px',
        fontFamily: 'monospace',
        fontStyle: 'bold',
        color: friend.isOnline ? '#ffffff' : '#94a3b8'
      }).setOrigin(0, 0.5).setDepth(4105).setResolution(2);

      // Right: Invite button
      if (friend.isOnline) {
        const inviteBtn = this.scene.add.rectangle(cx + cardW / 2 - 75, cardY + rowH / 2, 120, 26, 0x15803d)
          .setStrokeStyle(1, 0x4ade80)
          .setDepth(4105)
          .setInteractive({ useHandCursor: true });
        
        const inviteTxt = this.scene.add.text(cx + cardW / 2 - 75, cardY + rowH / 2, '📩 ПОЗВАТЬ В БОЙ', {
          fontSize: '9px',
          fontFamily: 'monospace',
          fontStyle: 'bold',
          color: '#ffffff'
        }).setOrigin(0.5).setDepth(4106).setResolution(2);

        inviteBtn.on('pointerdown', async (p: any, x: number, y: number, ev: { stopPropagation: () => void }) => {
          if (ev && typeof ev.stopPropagation === 'function') ev.stopPropagation();
          soundEngine.playLevelUp();
          
          // Send lobby invite
          await sendLobbyInvite(friend.uid, this.roomCode, this.lobbyMode);

          // Change button look to ОТПРАВЛЕНО ✔ for 3 seconds
          inviteBtn.setFillStyle(0x1e293b);
          inviteBtn.setStrokeStyle(1.5, 0x22c55e);
          inviteTxt.setText('ОТПРАВЛЕНО ✔').setColor('#22c55e');

          this.scene.time.delayedCall(3000, () => {
            if (inviteBtn && inviteBtn.active) {
              inviteBtn.setFillStyle(0x15803d);
              inviteBtn.setStrokeStyle(1, 0x4ade80);
              inviteTxt.setText('📩 ПОЗВАТЬ В БОЙ').setColor('#ffffff');
            }
          });
        });

        this.listContainer!.add([itemBg, nameText, inviteBtn, inviteTxt]);
      } else {
        const offlineTxt = this.scene.add.text(cx + cardW / 2 - 75, cardY + rowH / 2, 'НЕ В СЕТИ', {
          fontSize: '10px',
          fontFamily: 'monospace',
          color: '#64748b',
          fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(4105).setResolution(2);

        this.listContainer!.add([itemBg, nameText, offlineTxt]);
      }
    });
  }

  public close() {
    if (this.isClosing) return;
    this.isClosing = true;

    this.elements.forEach(el => {
      if (el && el.active) el.destroy();
    });
    this.elements = [];
  }
}
