import Phaser from 'phaser';
import { soundEngine } from './audio';
import { subscribeToMailbox, markMailAsRead, deleteMailMessage, sendChatMessage } from './firebase';
import { showHTMLInputModal } from '../utils/domInput';

export class MailModal {
  private scene: Phaser.Scene;
  private elements: Phaser.GameObjects.GameObject[] = [];
  private leftContainer?: Phaser.GameObjects.Container;
  private rightContainer?: Phaser.GameObjects.Container;
  private leftMaskGraphics?: Phaser.GameObjects.Graphics;
  private isClosing = false;
  private unsubscribeMail?: () => void;

  private modalW = 820;
  private modalH = 500;
  private selectedMsg: any = null;
  private allMsgs: any[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.buildUI();
  }

  private buildUI() {
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const cx = Math.round(w / 2);
    const cy = Math.round(h / 2);

    this.modalW = Math.min(820, w - 24);
    this.modalH = Math.min(500, h - 24);

    // 1. Semi-transparent Backdrop (depth 4000)
    const backdrop = this.scene.add.rectangle(cx, cy, w * 2, h * 2, 0x000000, 0.85)
      .setScrollFactor(0)
      .setDepth(4000)
      .setInteractive();
    backdrop.on('pointerdown', (p: any, x: number, y: number, ev: { stopPropagation: () => void }) => {
      if (ev && typeof ev.stopPropagation === 'function') ev.stopPropagation();
    });
    this.elements.push(backdrop);

    // 2. Main Frame
    const cardBg = this.scene.add.rectangle(cx, cy, this.modalW, this.modalH, 0x090d16)
      .setStrokeStyle(3, 0xfacc15, 1.0)
      .setScrollFactor(0)
      .setDepth(4001);
    const cardInner = this.scene.add.rectangle(cx, cy, this.modalW - 8, this.modalH - 8, 0x0f172a)
      .setScrollFactor(0)
      .setDepth(4002);
    this.elements.push(cardBg, cardInner);

    // 3. Title
    const titleTxt = this.scene.add.text(cx, cy - this.modalH / 2 + 30, '📬 ВНУТРИИГРОВАЯ ПОЧТА', {
      fontSize: '16px',
      fontFamily: 'Consolas, monospace, system-ui',
      fontStyle: 'bold',
      color: '#facc15'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(4003).setResolution(2);
    this.elements.push(titleTxt);

    // 4. Close [X]
    const closeBtn = this.scene.add.text(cx + this.modalW / 2 - 28, cy - this.modalH / 2 + 28, '[X]', {
      fontSize: '16px',
      fontFamily: 'Consolas, monospace, system-ui',
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
    this.elements.push(closeBtn);

    // 5. Containers for columns
    this.leftContainer = this.scene.add.container(0, 0).setDepth(4004);
    this.rightContainer = this.scene.add.container(0, 0).setDepth(4004);
    this.elements.push(this.leftContainer, this.rightContainer);

    // 6. Divide divider line
    const dividerX = cx - this.modalW / 2 + 310;
    const divider = this.scene.add.line(0, 0, dividerX, cy - this.modalH / 2 + 65, dividerX, cy + this.modalH / 2 - 25, 0x334155)
      .setLineWidth(1.5)
      .setScrollFactor(0)
      .setDepth(4003);
    this.elements.push(divider);

    // Subscribe to mailbox
    this.unsubscribeMail = subscribeToMailbox((messages) => {
      this.allMsgs = messages;
      
      // Auto-select first message if none selected
      if (!this.selectedMsg && messages.length > 0) {
        this.selectedMsg = messages[0];
      } else if (this.selectedMsg) {
        // Keep selected message updated if it is in incoming stream
        const updated = messages.find(m => m.id === this.selectedMsg.id);
        if (updated) this.selectedMsg = updated;
      }
      
      this.renderLeftInbox();
      this.renderRightContent();
    });
  }

  private renderLeftInbox() {
    if (this.isClosing || !this.leftContainer) return;
    this.leftContainer.removeAll(true);

    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const cx = Math.round(w / 2);
    const cy = Math.round(h / 2);

    const startX = cx - this.modalW / 2 + 25;
    const startY = cy - this.modalH / 2 + 70;
    const itemW = 270;
    const itemH = 65;
    const spacing = 5;

    // Left Column geometry mask
    if (this.leftMaskGraphics) this.leftMaskGraphics.destroy();
    this.leftMaskGraphics = this.scene.add.graphics().setScrollFactor(0).setDepth(4003);
    this.leftMaskGraphics.fillStyle(0xffffff, 1);
    this.leftMaskGraphics.fillRect(startX - 5, startY - 5, itemW + 10, this.modalH - 105);
    const mask = this.leftMaskGraphics.createGeometryMask();
    this.leftContainer.setMask(mask);

    if (this.allMsgs.length === 0) {
      const emptyTxt = this.scene.add.text(startX + itemW / 2, cy, 'ВАШ ПОЧТОВЫЙ ЯЩИК\nСОВЕРШЕННО ПУСТ', {
        fontSize: '11px',
        fontFamily: 'monospace',
        color: '#64748b',
        align: 'center'
      }).setOrigin(0.5).setResolution(2);
      this.leftContainer.add(emptyTxt);
      return;
    }

    this.allMsgs.forEach((msg, idx) => {
      const itemY = startY + idx * (itemH + spacing);
      const isSelected = this.selectedMsg && this.selectedMsg.id === msg.id;

      // Item Box
      const itemBg = this.scene.add.rectangle(startX + itemW / 2, itemY + itemH / 2, itemW, itemH, isSelected ? 0x1e3a8a : 0x1e293b, isSelected ? 0.8 : 0.4)
        .setStrokeStyle(1.5, isSelected ? 0x3b82f6 : (msg.read ? 0x475569 : 0xef4444))
        .setDepth(4005)
        .setInteractive({ useHandCursor: true });

      itemBg.on('pointerdown', () => {
        soundEngine.playClick();
        this.selectedMsg = msg;
        if (!msg.read) {
          markMailAsRead(msg.id).catch(() => {});
        } else {
          this.renderLeftInbox();
          this.renderRightContent();
        }
      });

      // Sender and title
      const senderTxt = this.scene.add.text(startX + 12, itemY + 12, msg.senderNick, {
        fontSize: '11px',
        fontFamily: 'monospace',
        fontStyle: 'bold',
        color: msg.read ? '#94a3b8' : '#ffffff'
      }).setDepth(4006).setResolution(2);

      const titleTxt = this.scene.add.text(startX + 12, itemY + 28, msg.title, {
        fontSize: '10px',
        fontFamily: 'monospace',
        color: isSelected ? '#ffffff' : '#facc15'
      }).setDepth(4006).setResolution(2);

      const timeTxt = this.scene.add.text(startX + 12, itemY + 44, this.getFormattedTime(msg.createdAt), {
        fontSize: '8px',
        fontFamily: 'monospace',
        color: '#64748b'
      }).setDepth(4006).setResolution(2);

      // Unread Indicator
      let unreadBadge;
      if (!msg.read) {
        unreadBadge = this.scene.add.circle(startX + itemW - 16, itemY + itemH / 2, 5, 0xef4444)
          .setDepth(4006);
      }

      this.leftContainer!.add([itemBg, senderTxt, titleTxt, timeTxt]);
      if (unreadBadge) this.leftContainer!.add(unreadBadge);
    });
  }

  private renderRightContent() {
    if (this.isClosing || !this.rightContainer) return;
    this.rightContainer.removeAll(true);

    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const cx = Math.round(w / 2);
    const cy = Math.round(h / 2);

    const startX = cx - this.modalW / 2 + 335;
    const startY = cy - this.modalH / 2 + 70;
    const rightW = this.modalW - 365;

    if (!this.selectedMsg) {
      const selectHint = this.scene.add.text(startX + rightW / 2, cy, 'ВЫБЕРИТЕ ПИСЬМО СЛЕВА ДЛЯ ПРОСМОТРА', {
        fontSize: '12px',
        fontFamily: 'monospace',
        color: '#64748b'
      }).setOrigin(0.5).setResolution(2);
      this.rightContainer.add(selectHint);
      return;
    }

    const msg = this.selectedMsg;

    // Sender Box Header
    const headerBg = this.scene.add.rectangle(startX + rightW / 2, startY + 25, rightW, 50, 0x1e293b, 0.5)
      .setStrokeStyle(1.5, 0x334155)
      .setDepth(4005);

    const senderTxt = this.scene.add.text(startX + 16, startY + 14, `Отправитель: ${msg.senderNick} (${msg.senderTag})`, {
      fontSize: '12px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#facc15'
    }).setDepth(4006).setResolution(2);

    const dateTxt = this.scene.add.text(startX + 16, startY + 32, `Получено: ${new Date(msg.createdAt).toLocaleString()}`, {
      fontSize: '9px',
      fontFamily: 'monospace',
      color: '#94a3b8'
    }).setDepth(4006).setResolution(2);

    // Delete Mail Button
    const deleteMailBtn = this.scene.add.rectangle(startX + rightW - 55, startY + 25, 80, 26, 0x991b1b)
      .setStrokeStyle(1, 0xfca5a5)
      .setDepth(4006)
      .setInteractive({ useHandCursor: true });
    
    const deleteMailTxt = this.scene.add.text(startX + rightW - 55, startY + 25, '❌ УДАЛИТЬ', {
      fontSize: '9px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5).setDepth(4007).setResolution(2);

    deleteMailBtn.on('pointerdown', async () => {
      soundEngine.playMonsterUlt();
      await deleteMailMessage(msg.id);
      this.selectedMsg = null;
    });

    this.rightContainer.add([headerBg, senderTxt, dateTxt, deleteMailBtn, deleteMailTxt]);

    // Text Content Area
    const textY = startY + 70;
    const textBg = this.scene.add.rectangle(startX + rightW / 2, textY + 80, rightW, 150, 0x090d16)
      .setStrokeStyle(1, 0x1e293b)
      .setDepth(4005);

    const bodyTxt = this.scene.add.text(startX + 16, textY + 16, msg.text, {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#e2e8f0',
      wordWrap: { width: rightW - 32 }
    }).setDepth(4006).setResolution(2);

    this.rightContainer.add([textBg, bodyTxt]);

    // LOBBY INVITE CARD
    if (msg.type === 'lobby_invite') {
      const cardY = textY + 175;
      const inviteCard = this.scene.add.rectangle(startX + rightW / 2, cardY + 50, rightW, 90, 0x0f172a)
        .setStrokeStyle(2, 0x22c55e)
        .setDepth(4005);

      // Mode Emojis
      let modeIconStr = '⚔️';
      if (msg.lobbyMode === 'Dungeon') modeIconStr = '💀';
      else if (msg.lobbyMode === 'Tavern') modeIconStr = '🍺';

      const iconText = this.scene.add.text(startX + 30, cardY + 50, modeIconStr, {
        fontSize: '32px'
      }).setOrigin(0.5).setDepth(4006);

      const labelTxt = this.scene.add.text(startX + 70, cardY + 22, `Группа: ${msg.lobbyMode === 'Dungeon' ? 'Подземелье' : (msg.lobbyMode === 'PVP' ? 'PvP Арена' : 'Таверна Пьяного Грифона')}`, {
        fontSize: '11px',
        fontFamily: 'monospace',
        fontStyle: 'bold',
        color: '#22c55e'
      }).setDepth(4006).setResolution(2);

      const joinBtn = this.scene.add.rectangle(startX + 250, cardY + 62, 280, 32, 0x15803d)
        .setStrokeStyle(1.5, 0x4ade80)
        .setDepth(4006)
        .setInteractive({ useHandCursor: true });

      const joinTxt = this.scene.add.text(startX + 250, cardY + 62, '🚀 ПРИНЯТЬ И ВОЙТИ В ЛОББИ', {
        fontSize: '10px',
        fontFamily: 'monospace',
        fontStyle: 'bold',
        color: '#ffffff'
      }).setOrigin(0.5).setDepth(4007).setResolution(2);

      joinBtn.on('pointerdown', async () => {
        soundEngine.playLevelUp();
        
        // Mark as read & accepted
        await markMailAsRead(msg.id);
        this.close();

        // Join Lobby transition directly
        if (msg.lobbyMode === 'Dungeon') {
          this.scene.scene.start('DungeonScene', { roomCode: msg.lobbyId });
        } else if (msg.lobbyMode === 'Tavern') {
          this.scene.scene.start('TavernScene', { roomCode: msg.lobbyId });
        } else if (msg.lobbyMode === 'PVP') {
          this.scene.scene.start('MobaScene', { roomConfig: { id: msg.lobbyId, title: 'Арена' } });
        }
      });

      this.rightContainer.add([inviteCard, iconText, labelTxt, joinBtn, joinTxt]);
    } else {
      // Regular Chat reply section
      const replyY = textY + 175;
      const replyBtn = this.scene.add.rectangle(startX + rightW / 2, replyY + 35, rightW, 36, 0x1d4ed8)
        .setStrokeStyle(1, 0x60a5fa)
        .setDepth(4005)
        .setInteractive({ useHandCursor: true });

      const replyTxt = this.scene.add.text(startX + rightW / 2, replyY + 35, '✍️ ОТПРАВИТЬ ОТВЕТНОЕ СООБЩЕНИЕ', {
        fontSize: '11px',
        fontFamily: 'monospace',
        fontStyle: 'bold',
        color: '#ffffff'
      }).setOrigin(0.5).setDepth(4006).setResolution(2);

      replyBtn.on('pointerdown', () => {
        soundEngine.playClick();
        showHTMLInputModal({
          title: `Ответить ${msg.senderNick}`,
          placeholder: 'Введите ваше сообщение (до 120 символов)...',
          onConfirm: async (val: string) => {
            const cleanText = val.trim();
            if (cleanText) {
              await sendChatMessage(msg.senderUid, cleanText);
              alert(`Ответ отправлен игроку ${msg.senderNick}!`);
            }
          }
        });
      });

      this.rightContainer.add([replyBtn, replyTxt]);
    }
  }

  private getFormattedTime(timestamp: number): string {
    const elapsed = Date.now() - timestamp;
    const minutes = Math.floor(elapsed / 60000);
    const hours = Math.floor(minutes / 60);

    if (minutes < 1) return 'Только что';
    if (minutes < 60) return `${minutes} мин. назад`;
    if (hours < 24) return `${hours} ч. назад`;
    return new Date(timestamp).toLocaleDateString();
  }

  public close() {
    if (this.isClosing) return;
    this.isClosing = true;

    if (this.unsubscribeMail) this.unsubscribeMail();

    this.elements.forEach(el => {
      if (el && el.active) el.destroy();
    });
    this.elements = [];

    if (this.leftMaskGraphics) this.leftMaskGraphics.destroy();
  }
}
