/**
 * Frantic Battles - Friend Invite Modal (FriendInviteModal.ts)
 * Modal popup displayed when clicking [ + ] in any lobby slot (Ranked, Custom Room, Dungeon, Tavern).
 * Displays Personal Invite Code, Copy Button, Friend ID/Nickname Input, and Direct Lobby Connection.
 */

import Phaser from 'phaser';
import { soundEngine } from './audio';
import { getActiveUserProfile } from './firebase';
import { showHTMLInputModal } from '../utils/domInput';

export class FriendInviteModal {
  private scene: Phaser.Scene;
  private elements: Phaser.GameObjects.GameObject[] = [];
  private roomCode: string;
  private modeName: string;
  private onCloseCallback?: () => void;
  private isClosing = false;

  constructor(scene: Phaser.Scene, roomCode?: string, modeName?: string, onClose?: () => void) {
    this.scene = scene;
    this.roomCode = roomCode || `REV-${Math.floor(1000 + Math.random() * 9000)}`;
    this.modeName = modeName || 'Лобби Команды';
    this.onCloseCallback = onClose;

    this.buildUI();
  }

  private buildUI() {
    const w = this.scene.cameras.main.width;
    const h = this.scene.cameras.main.height;
    const cx = w / 2;
    const cy = h / 2;

    const modalW = Math.min(480, w - 24);
    const modalH = Math.min(360, h - 24);

    const userProfile = getActiveUserProfile();
    const myCode = `REV-${userProfile.nickname.replace(/[^a-zA-Z0-9]/g, '').slice(0, 5).toUpperCase() || 'HOST'}`;

    // 1. Semi-transparent Backdrop (depth 3100)
    const backdrop = this.scene.add.rectangle(cx, cy, w * 2, h * 2, 0x000000, 0.85)
      .setScrollFactor(0)
      .setDepth(3100)
      .setInteractive();
    backdrop.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: { stopPropagation: () => void }) => {
      if (ev && typeof ev.stopPropagation === 'function') ev.stopPropagation();
    });
    this.elements.push(backdrop);

    // 2. Main Card Container
    const cardBg = this.scene.add.rectangle(cx, cy, modalW, modalH, 0x090d16)
      .setStrokeStyle(3, 0xfacc15, 0.95)
      .setScrollFactor(0).setDepth(3101);
    const cardInner = this.scene.add.rectangle(cx, cy, modalW - 8, modalH - 8, 0x0f172a)
      .setScrollFactor(0).setDepth(3102);
    this.elements.push(cardBg, cardInner);

    // 3. Header Title & Close [✕]
    const headerTitle = this.scene.add.text(cx, cy - modalH / 2 + 24, '👥 ПРИГЛАСИТЬ ДРУГА В ЛОББИ', {
      fontSize: '15px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#facc15'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(3105);

    const closeBtn = this.scene.add.text(cx + modalW / 2 - 24, cy - modalH / 2 + 24, '[✕]', {
      fontSize: '18px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#ef4444'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(3110).setInteractive({ useHandCursor: true });

    closeBtn.on('pointerdown', (p: Phaser.Input.Pointer, _x: number, _y: number, ev: { stopPropagation: () => void }) => {
      if (ev && typeof ev.stopPropagation === 'function') ev.stopPropagation();
      soundEngine.playClick();
      this.close();
    });

    this.elements.push(headerTitle, closeBtn);

    // 4. Section 1: My Room Code & Copy
    const sec1Y = cy - modalH / 2 + 75;
    const sec1Title = this.scene.add.text(cx - modalW / 2 + 24, sec1Y, '1. Код вашего лобби / комнаты:', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#94a3b8'
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(3105);

    const codeBox = this.scene.add.rectangle(cx, sec1Y + 32, modalW - 48, 38, 0x1e293b)
      .setStrokeStyle(1.5, 0x38bdf8).setScrollFactor(0).setDepth(3104);

    const codeTxt = this.scene.add.text(cx - (modalW - 48) / 2 + 16, sec1Y + 32, `🔑 ${this.roomCode} (${myCode})`, {
      fontSize: '13px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(3105);

    const copyBtn = this.scene.add.rectangle(cx + (modalW - 48) / 2 - 50, sec1Y + 32, 85, 28, 0x1d4ed8)
      .setStrokeStyle(1, 0x60a5fa).setScrollFactor(0).setDepth(3105).setInteractive({ useHandCursor: true });

    const copyTxt = this.scene.add.text(cx + (modalW - 48) / 2 - 50, sec1Y + 32, '📋 КОПИЯ', {
      fontSize: '10px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(3106);

    const triggerCopy = () => {
      soundEngine.playClick();
      navigator.clipboard.writeText(this.roomCode);
      copyTxt.setText('✅ СКОПИРОВАН!');
      this.scene.time.delayedCall(2000, () => {
        if (copyTxt && copyTxt.active) copyTxt.setText('📋 КОПИЯ');
      });
    };

    copyBtn.on('pointerdown', triggerCopy);
    this.elements.push(sec1Title, codeBox, codeTxt, copyBtn, copyTxt);

    // 5. Section 2: Connect to Friend by ID/Code
    const sec2Y = sec1Y + 95;
    const sec2Title = this.scene.add.text(cx - modalW / 2 + 24, sec2Y, '2. Ввести ID / Никнейм друга:', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#94a3b8'
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(3105);

    let enteredCode = '';
    const inputBox = this.scene.add.rectangle(cx - 45, sec2Y + 32, modalW - 145, 38, 0x1e293b)
      .setStrokeStyle(1.5, 0x64748b).setScrollFactor(0).setDepth(3104).setInteractive({ useHandCursor: true });

    const inputTxt = this.scene.add.text(cx - (modalW - 145) / 2 - 30, sec2Y + 32, '✏ Ввести ник друга...', {
      fontSize: '11px',
      fontFamily: 'monospace',
      color: '#64748b'
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(3105);

    const inviteSendBtn = this.scene.add.rectangle(cx + modalW / 2 - 68, sec2Y + 32, 80, 38, 0x15803d)
      .setStrokeStyle(1.5, 0x4ade80).setScrollFactor(0).setDepth(3105).setInteractive({ useHandCursor: true });

    const inviteSendTxt = this.scene.add.text(cx + modalW / 2 - 68, sec2Y + 32, 'ОТПРАВИТЬ', {
      fontSize: '10px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(3106);

    const triggerEditFriend = () => {
      soundEngine.playClick();
      showHTMLInputModal({
        title: 'Пригласить Друга',
        placeholder: 'Введите никнейм или код друга (например REV-ZAZA)...',
        defaultValue: enteredCode,
        onConfirm: (val: string) => {
          enteredCode = val.trim();
          inputTxt.setText(enteredCode ? `👤 ${enteredCode}` : '✏ Ввести ник друга...');
          inputTxt.setColor(enteredCode ? '#facc15' : '#64748b');
        }
      });
    };

    inputBox.on('pointerdown', triggerEditFriend);
    inputTxt.setInteractive({ useHandCursor: true }).on('pointerdown', triggerEditFriend);

    const statusBanner = this.scene.add.text(cx, cy + modalH / 2 - 32, '', {
      fontSize: '11px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#4ade80'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(3106);

    inviteSendBtn.on('pointerdown', () => {
      soundEngine.playLevelUp();
      if (!enteredCode) {
        statusBanner.setText('⚠ Введите никнейм или код друга!').setColor('#ef4444');
        return;
      }
      statusBanner.setText(`✅ Инвайт в ${this.modeName} отправлен игроку [${enteredCode}]!`).setColor('#4ade80');
      this.scene.time.delayedCall(2500, () => {
        this.close();
      });
    });

    this.elements.push(sec2Title, inputBox, inputTxt, inviteSendBtn, inviteSendTxt, statusBanner);
  }

  public close() {
    if (this.isClosing) return;
    this.isClosing = true;

    this.elements.forEach(el => {
      if (el && el.active) el.destroy();
    });
    this.elements = [];

    if (this.onCloseCallback) {
      this.onCloseCallback();
    }
  }
}
