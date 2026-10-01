import Phaser from 'phaser';
import { soundEngine } from './audio';
import { getFriendsList, addFriendByTag, removeFriend, sendChatMessage } from './firebase';
import { showHTMLInputModal } from '../utils/domInput';
import { PresenceService } from './PresenceService';

export class FriendsModal {
  private scene: Phaser.Scene;
  private elements: Phaser.GameObjects.GameObject[] = [];
  private listContainer?: Phaser.GameObjects.Container;
  private scrollMaskGraphics?: Phaser.GameObjects.Graphics;
  private scrollbarTrack?: Phaser.GameObjects.Rectangle;
  private scrollbarHandle?: Phaser.GameObjects.Rectangle;
  private scrollBgZone?: Phaser.GameObjects.Rectangle;
  private targetScrollY = 0;
  private currentFriends: any[] = [];
  private isClosing = false;
  private statusText?: Phaser.GameObjects.Text;

  private modalW = 740;
  private modalH = 480;
  private listW = 680;
  private listH = 300;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.buildUI();
  }

  private buildUI() {
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const cx = Math.round(w / 2);
    const cy = Math.round(h / 2);

    this.modalW = Math.min(740, w - 24);
    this.modalH = Math.min(480, h - 24);
    this.listW = this.modalW - 60;
    this.listH = this.modalH - 180;

    // 1. Full screen backdrop (depth 4000)
    const backdrop = this.scene.add.rectangle(cx, cy, w * 2, h * 2, 0x000000, 0.85)
      .setScrollFactor(0)
      .setDepth(4000)
      .setInteractive();
    backdrop.on('pointerdown', (p: any, x: number, y: number, ev: { stopPropagation: () => void }) => {
      if (ev && typeof ev.stopPropagation === 'function') ev.stopPropagation();
    });
    this.elements.push(backdrop);

    // 2. Window Frame (depth 4001)
    const frameBg = this.scene.add.rectangle(cx, cy, this.modalW, this.modalH, 0x090d16)
      .setStrokeStyle(3, 0xfacc15, 1.0)
      .setScrollFactor(0)
      .setDepth(4001);
    const frameInner = this.scene.add.rectangle(cx, cy, this.modalW - 8, this.modalH - 8, 0x0f172a)
      .setScrollFactor(0)
      .setDepth(4002);
    this.elements.push(frameBg, frameInner);

    // 3. Header title
    const titleText = this.scene.add.text(cx, cy - this.modalH / 2 + 30, '👥 СПИСОК ДРУЗЕЙ', {
      fontSize: '16px',
      fontFamily: 'Consolas, monospace, system-ui',
      fontStyle: 'bold',
      color: '#facc15'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(4003).setResolution(2);
    this.elements.push(titleText);

    // 4. Close button in top-right [ X ]
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

    // 5. Add Friend Input Box and Button
    const addY = cy - this.modalH / 2 + 75;
    const addBoxW = Math.round(this.modalW * 0.55);

    const inputBg = this.scene.add.rectangle(cx - 70, addY, addBoxW, 32, 0x1e293b)
      .setStrokeStyle(1.5, 0x475569)
      .setScrollFactor(0)
      .setDepth(4003)
      .setInteractive({ useHandCursor: true });

    const inputPlaceholder = this.scene.add.text(cx - 70 - addBoxW / 2 + 10, addY, '✏ Введите тег друга (Ник#1234)...', {
      fontSize: '11px',
      fontFamily: 'monospace',
      color: '#94a3b8'
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(4004).setResolution(2);

    let enteredTag = '';

    const addBtn = this.scene.add.rectangle(cx - 70 + addBoxW / 2 + 60, addY, 100, 32, 0x15803d)
      .setStrokeStyle(1.5, 0x4ade80)
      .setScrollFactor(0)
      .setDepth(4003)
      .setInteractive({ useHandCursor: true });

    const addBtnTxt = this.scene.add.text(cx - 70 + addBoxW / 2 + 60, addY, '➕ ДОБАВИТЬ', {
      fontSize: '10px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(4004).setResolution(2);

    const triggerTagInput = () => {
      soundEngine.playClick();
      showHTMLInputModal({
        title: 'Добавить друга по тегу',
        placeholder: 'Введите тег друга в формате: Ник#1234...',
        defaultValue: enteredTag,
        onConfirm: (val: string) => {
          enteredTag = val.trim();
          inputPlaceholder.setText(enteredTag ? `👤 ${enteredTag}` : '✏ Введите тег друга (Ник#1234)...');
          inputPlaceholder.setColor(enteredTag ? '#facc15' : '#94a3b8');
        }
      });
    };

    inputBg.on('pointerdown', triggerTagInput);

    this.statusText = this.scene.add.text(cx, addY + 28, '', {
      fontSize: '11px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#ef4444'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(4004).setResolution(2);

    addBtn.on('pointerdown', async () => {
      soundEngine.playClick();
      if (!enteredTag) {
        this.statusText?.setText('⚠ Пожалуйста, введите тег друга!').setColor('#ef4444');
        return;
      }
      this.statusText?.setText('Добавление...').setColor('#38bdf8');
      const res = await addFriendByTag(enteredTag);
      if (res.success) {
        soundEngine.playLevelUp();
        this.statusText?.setText(`✅ ${res.message}`).setColor('#4ade80');
        enteredTag = '';
        inputPlaceholder.setText('✏ Введите тег друга (Ник#1234)...').setColor('#94a3b8');
        this.loadFriends();
      } else {
        soundEngine.playMonsterUlt();
        this.statusText?.setText(`❌ ${res.message}`).setColor('#ef4444');
      }
    });

    this.elements.push(inputBg, inputPlaceholder, addBtn, addBtnTxt, this.statusText);

    // 6. Build the Scrollable Container
    this.listContainer = this.scene.add.container(0, 0).setDepth(4005);
    this.elements.push(this.listContainer);

    this.loadFriends();
  }

  private async loadFriends() {
    this.currentFriends = await getFriendsList();
    this.renderFriendsList();
  }

  private renderFriendsList() {
    if (this.isClosing || !this.listContainer) return;

    // Clear previous items from list container
    this.listContainer.removeAll(true);

    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const cx = Math.round(w / 2);
    const cy = Math.round(h / 2);

    const startY = Math.round(cy - this.modalH / 2 + 130);
    const rowH = 60;
    const spacing = 6;

    // Create the geometry mask shape
    if (this.scrollMaskGraphics) this.scrollMaskGraphics.destroy();
    this.scrollMaskGraphics = this.scene.add.graphics().setScrollFactor(0).setDepth(4004);
    this.scrollMaskGraphics.fillStyle(0xffffff, 1);
    this.scrollMaskGraphics.fillRect(cx - this.listW / 2, startY, this.listW, this.listH);
    const mask = this.scrollMaskGraphics.createGeometryMask();
    this.listContainer.setMask(mask);

    if (this.currentFriends.length === 0) {
      const emptyText = this.scene.add.text(cx, startY + this.listH / 2, 'СПИСОК ДРУЗЕЙ ПУСТ. ПОДЕЛИТЕСЬ СВОИМ ТЕГОМ С ДРУЗЬЯМИ!', {
        fontSize: '11px',
        fontFamily: 'monospace',
        color: '#64748b',
        align: 'center'
      }).setOrigin(0.5).setResolution(2);
      this.listContainer.add(emptyText);
      
      this.scrollbarTrack?.destroy();
      this.scrollbarHandle?.destroy();
      this.scrollBgZone?.destroy();
      return;
    }

    // Generate Cards
    let currentY = startY;
    this.currentFriends.forEach((friend, idx) => {
      const cardY = currentY + this.targetScrollY;

      const presence = PresenceService.getStatusString(friend.lastSeen);

      // Card Background
      const cardBg = this.scene.add.rectangle(cx, cardY + rowH / 2, this.listW, rowH, 0x1e293b, 0.6)
        .setStrokeStyle(1.5, presence.isOnline ? 0x22c55e : 0x475569)
        .setDepth(4005);

      // Left: Avatar Box
      const avatarBox = this.scene.add.rectangle(cx - this.listW / 2 + 35, cardY + rowH / 2, 40, 40, 0x0f172a)
        .setStrokeStyle(2, this.getRankColor(friend.rank))
        .setDepth(4005)
        .setInteractive({ useHandCursor: true });
      
      const avatarTxt = this.scene.add.text(cx - this.listW / 2 + 35, cardY + rowH / 2, '👤', {
        fontSize: '20px'
      }).setOrigin(0.5).setDepth(4005).setInteractive({ useHandCursor: true });

      // Center: Nickname & Details
      const nameTxt = this.scene.add.text(cx - this.listW / 2 + 70, cardY + 12, `${friend.nickname} (${friend.tag})`, {
        fontSize: '12px',
        fontFamily: 'monospace',
        fontStyle: 'bold',
        color: '#ffffff'
      }).setOrigin(0, 0.5).setDepth(4006).setResolution(2).setInteractive({ useHandCursor: true });

      const openFriendProfile = (p: any, _x: number, _y: number, ev: { stopPropagation: () => void }) => {
        if (ev && typeof ev.stopPropagation === 'function') ev.stopPropagation();
        soundEngine.playClick();
        window.dispatchEvent(new CustomEvent('open-public-profile', {
          detail: {
            uid: friend.uid,
            nickname: friend.nickname,
            tag: friend.tag,
            rating: friend.rating || 1000,
            rank: friend.rank || 'Бродяга',
            avatar: friend.avatar || 'avatar_sq_1',
            isOnline: presence.isOnline,
            lastSeen: friend.lastSeen
          }
        }));
      };

      avatarBox.on('pointerdown', openFriendProfile);
      avatarTxt.on('pointerdown', openFriendProfile);
      nameTxt.on('pointerdown', openFriendProfile);

      const descTxt = this.scene.add.text(cx - this.listW / 2 + 70, cardY + 30, `Ранг: ${friend.rank}`, {
        fontSize: '10px',
        fontFamily: 'monospace',
        color: '#94a3b8'
      }).setOrigin(0, 0.5).setDepth(4006).setResolution(2);

      const statusTxt = this.scene.add.text(cx - this.listW / 2 + 70, cardY + 46, presence.text, {
        fontSize: '9px',
        fontFamily: 'monospace',
        fontStyle: 'bold',
        color: presence.isOnline ? '#22c55e' : '#94a3b8'
      }).setOrigin(0, 0.5).setDepth(4006).setResolution(2);

      // Right Side Action Buttons
      const writeBtn = this.scene.add.rectangle(cx + this.listW / 2 - 100, cardY + rowH / 2, 90, 26, 0x1d4ed8)
        .setStrokeStyle(1, 0x60a5fa)
        .setDepth(4006)
        .setInteractive({ useHandCursor: true });
      const writeTxt = this.scene.add.text(cx + this.listW / 2 - 100, cardY + rowH / 2, '✉ НАПИСАТЬ', {
        fontSize: '9px',
        fontFamily: 'monospace',
        fontStyle: 'bold',
        color: '#ffffff'
      }).setOrigin(0.5).setDepth(4007).setResolution(2);

      writeBtn.on('pointerdown', (p: any, x: number, y: number, ev: { stopPropagation: () => void }) => {
        if (ev && typeof ev.stopPropagation === 'function') ev.stopPropagation();
        soundEngine.playClick();
        showHTMLInputModal({
          title: `Написать ${friend.nickname}`,
          placeholder: 'Введите сообщение другу (до 120 символов)...',
          onConfirm: async (val: string) => {
            const cleanMsg = val.trim();
            if (cleanMsg) {
              await sendChatMessage(friend.uid, cleanMsg);
              this.statusText?.setText(`✅ Сообщение успешно отправлено другу ${friend.nickname}!`).setColor('#4ade80');
            }
          }
        });
      });

      const deleteBtn = this.scene.add.rectangle(cx + this.listW / 2 - 30, cardY + rowH / 2, 30, 26, 0x991b1b)
        .setStrokeStyle(1, 0xfca5a5)
        .setDepth(4006)
        .setInteractive({ useHandCursor: true });
      const deleteTxt = this.scene.add.text(cx + this.listW / 2 - 30, cardY + rowH / 2, '❌', {
        fontSize: '10px',
        fontFamily: 'monospace',
        fontStyle: 'bold',
        color: '#ffffff'
      }).setOrigin(0.5).setDepth(4007).setResolution(2);

      deleteBtn.on('pointerdown', async (p: any, x: number, y: number, ev: { stopPropagation: () => void }) => {
        if (ev && typeof ev.stopPropagation === 'function') ev.stopPropagation();
        soundEngine.playMonsterUlt();
        const res = await removeFriend(friend.uid);
        if (res.success) {
          this.statusText?.setText('✅ Друг удален').setColor('#e2e8f0');
          this.loadFriends();
        }
      });

      this.listContainer!.add([cardBg, avatarBox, avatarTxt, nameTxt, descTxt, statusTxt, writeBtn, writeTxt, deleteBtn, deleteTxt]);

      currentY += rowH + spacing;
    });

    // 7. Scrollbar
    this.scrollbarTrack?.destroy();
    this.scrollbarHandle?.destroy();

    const trackX = cx + this.listW / 2 + 10;
    this.scrollbarTrack = this.scene.add.rectangle(trackX, startY + this.listH / 2, 6, this.listH - 4, 0x1e293b)
      .setStrokeStyle(1, 0x475569)
      .setDepth(4004);

    const totalContentH = this.currentFriends.length * (rowH + spacing) - spacing;
    const ratio = Math.min(1, this.listH / totalContentH);
    const handleH = Math.max(30, this.listH * ratio);
    const maxScroll = totalContentH - this.listH;

    const scrollPct = maxScroll > 0 ? -this.targetScrollY / maxScroll : 0;
    const handleY = startY + handleH / 2 + scrollPct * (this.listH - handleH);

    this.scrollbarHandle = this.scene.add.rectangle(trackX, handleY, 6, handleH, 0xfacc15)
      .setDepth(4005);

    this.elements.push(this.scrollbarTrack, this.scrollbarHandle);

    // 8. Scrolling events zones
    this.scrollBgZone?.destroy();
    this.scrollBgZone = this.scene.add.rectangle(cx, startY + this.listH / 2, this.listW, this.listH, 0x000000, 0)
      .setScrollFactor(0)
      .setDepth(4003)
      .setInteractive();

    this.scrollBgZone.on('wheel', (pointer: any, deltaX: number, deltaY: number) => {
      this.scrollList(deltaY, maxScroll);
    });

    let dragY = 0;
    this.scrollBgZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      dragY = pointer.y;
    });
    this.scrollBgZone.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown) {
        const diff = pointer.y - dragY;
        if (Math.abs(diff) > 2) {
          this.scrollList(-diff, maxScroll);
          dragY = pointer.y;
        }
      }
    });

    this.elements.push(this.scrollBgZone);
  }

  private scrollList(deltaY: number, maxScroll: number) {
    if (maxScroll <= 0) return;
    this.targetScrollY -= deltaY;
    if (this.targetScrollY > 0) this.targetScrollY = 0;
    if (this.targetScrollY < -maxScroll) this.targetScrollY = -maxScroll;
    this.renderFriendsList();
  }

  private getOfflineTime(lastSeen: number): string {
    if (!lastSeen) return 'давно';
    const seconds = Math.floor((Date.now() - lastSeen) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'только что';
    if (minutes < 60) return `${minutes} мин. назад`;
    if (hours < 24) return `${hours} ч. назад`;
    return `${days} дн. назад`;
  }

  private getRankColor(rank: string): number {
    switch (rank) {
      case 'Бронза': return 0xb45309;
      case 'Серебро': return 0x94a3b8;
      case 'Золото': return 0xfacc15;
      case 'Платина': return 0x38bdf8;
      case 'Алмаз': return 0xc084fc;
      default: return 0x64748b;
    }
  }

  public close() {
    if (this.isClosing) return;
    this.isClosing = true;

    this.elements.forEach(el => {
      if (el && el.active) el.destroy();
    });
    this.elements = [];
    if (this.scrollMaskGraphics) this.scrollMaskGraphics.destroy();
    if (this.scrollBgZone) this.scrollBgZone.destroy();
  }
}
