import Phaser from 'phaser';
import { HEROES } from './game/players';
import { soundEngine } from './game/audio';

export interface PreBattlePlayer {
  id: string;
  name: string;
  hero: string;
  isReady: boolean;
  team?: 'blue' | 'red';
}

export interface PreBattleModalConfig {
  roomCode: string;
  players: PreBattlePlayer[];
  yourPlayerId: string;
  modeName?: string;
  onConfirmChoice?: (heroKey: string) => void;
  onAllConfirmed?: () => void;
}

export class PreBattleHeroSelectModal {
  private scene: Phaser.Scene;
  private config: PreBattleModalConfig;
  private elements: Phaser.GameObjects.GameObject[] = [];
  private selectedHeroKey: string = 'char_zaza';
  private timerSeconds: number = 30;
  private timerText!: Phaser.GameObjects.Text;
  private timerEvent!: Phaser.Time.TimerEvent;
  private isConfirmed = false;
  private confirmBtnText!: Phaser.GameObjects.Text;
  private confirmBtnRect!: Phaser.GameObjects.Rectangle;
  private playerCardsContainer!: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, config: PreBattleModalConfig) {
    this.scene = scene;
    this.config = config;

    const savedHero = localStorage.getItem('fb_current_hero') || 'char_zaza';
    this.selectedHeroKey = savedHero;

    this.buildUI();
    this.startTimer();
  }

  private buildUI() {
    const w = this.scene.cameras.main.width;
    const h = this.scene.cameras.main.height;
    const cx = Math.round(w / 2);
    const cy = Math.round(h / 2);

    const modalW = Math.min(840, w - 30);
    const modalH = Math.min(480, h - 30);
    const startX = Math.round(cx - modalW / 2);
    const startY = Math.round(cy - modalH / 2);

    const backdrop = this.scene.add.rectangle(cx, cy, w * 2, h * 2, 0x000000, 0.85)
      .setScrollFactor(0)
      .setDepth(3500)
      .setInteractive();
    this.elements.push(backdrop);

    const frame = this.scene.add.rectangle(cx, cy, modalW, modalH, 0x0a101d, 0.96)
      .setStrokeStyle(3, 0xf59e0b)
      .setScrollFactor(0)
      .setDepth(3501);
    this.elements.push(frame);

    const modeTitle = this.config.modeName || 'ПРЕДМАТЧЕВЫЙ ВЫБОР ГЕРОЕВ';
    const titleText = this.scene.add.text(cx, startY + 25, modeTitle, {
      fontSize: '20px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#f59e0b'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(3502);
    this.elements.push(titleText);

    this.timerText = this.scene.add.text(cx, startY + 52, '⏳ 30 СЕКУНД', {
      fontSize: '15px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#ef4444'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(3502);
    this.elements.push(this.timerText);

    const heroKeys = Object.keys(HEROES);
    const startHeroX = cx - 280;
    const heroY = startY + 140;

    heroKeys.forEach((key, idx) => {
      const hero = HEROES[key];
      const hx = startHeroX + (idx % 5) * 110;
      const hy = heroY + Math.floor(idx / 5) * 105;

      const card = this.scene.add.rectangle(hx, hy, 95, 90, key === this.selectedHeroKey ? 0x1e3a8a : 0x1f2937, 0.9)
        .setStrokeStyle(key === this.selectedHeroKey ? 3 : 1, key === this.selectedHeroKey ? 0x3b82f6 : 0x4b5563)
        .setScrollFactor(0)
        .setDepth(3502)
        .setInteractive({ useHandCursor: true });

      const img = this.scene.add.image(hx, hy - 10, hero.texture)
        .setScale(1.2)
        .setScrollFactor(0)
        .setDepth(3503);

      const nameTxt = this.scene.add.text(hx, hy + 28, hero.name.toUpperCase(), {
        fontSize: '9px',
        fontFamily: '"Press Start 2P", monospace',
        color: key === this.selectedHeroKey ? '#60a5fa' : '#9ca3af'
      }).setOrigin(0.5).setScrollFactor(0).setDepth(3503);

      card.on('pointerdown', () => {
        if (this.isConfirmed) return;
        soundEngine.playClick();
        this.selectedHeroKey = key;
        localStorage.setItem('fb_current_hero', key);
        this.refreshRosterSelection();
        if (this.config.onConfirmChoice) {
          this.config.onConfirmChoice(key);
        }
      });

      this.elements.push(card, img, nameTxt);
    });

    this.playerCardsContainer = this.scene.add.container(0, 0).setDepth(3502);
    this.elements.push(this.playerCardsContainer);
    this.renderPlayerCards(startX, startY, modalW, modalH);

    const btnY = startY + modalH - 45;
    this.confirmBtnRect = this.scene.add.rectangle(cx, btnY, 240, 42, 0x16a34a, 1.0)
      .setStrokeStyle(2, 0x22c55e)
      .setScrollFactor(0)
      .setDepth(3503)
      .setInteractive({ useHandCursor: true });

    this.confirmBtnText = this.scene.add.text(cx, btnY, 'ПОДТВЕРДИТЬ (30)', {
      fontSize: '13px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#ffffff'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(3504);

    this.confirmBtnRect.on('pointerdown', () => {
      this.lockInSelection();
    });

    this.elements.push(this.confirmBtnRect, this.confirmBtnText);
  }

  private startTimer() {
    this.timerEvent = this.scene.time.addEvent({
      delay: 1000,
      repeat: 29,
      callback: () => {
        this.timerSeconds--;
        if (this.timerText && this.timerText.active) {
          this.timerText.setText(`⏳ ${this.timerSeconds} СЕКУНД`);
        }
        if (this.confirmBtnText && this.confirmBtnText.active && !this.isConfirmed) {
          this.confirmBtnText.setText(`ПОДТВЕРДИТЬ (${this.timerSeconds})`);
        }
        if (this.timerSeconds <= 0) {
          this.lockInSelection();
        }
      }
    });
  }

  public updatePlayers(players: PreBattlePlayer[]) {
    this.config.players = players;
    const w = this.scene.cameras.main.width;
    const h = this.scene.cameras.main.height;
    const modalW = Math.min(840, w - 30);
    const modalH = Math.min(480, h - 30);
    const startX = Math.round(w / 2 - modalW / 2);
    const startY = Math.round(h / 2 - modalH / 2);
    this.renderPlayerCards(startX, startY, modalW, modalH);
  }

  private renderPlayerCards(startX: number, startY: number, modalW: number, modalH: number) {
    if (!this.playerCardsContainer) return;
    this.playerCardsContainer.removeAll(true);

    const players = this.config.players || [];
    const count = Math.max(1, players.length);
    const cardW = Math.min(180, Math.floor((modalW - 60) / count));
    const cardY = startY + modalH - 110;

    players.forEach((p, idx) => {
      const px = startX + 30 + idx * (cardW + 10) + cardW / 2;
      const hero = HEROES[p.hero] || HEROES['char_zaza'];
      const isYou = p.id === this.config.yourPlayerId;

      const cardBg = this.scene.add.rectangle(px, cardY, cardW, 60, p.isReady ? 0x064e3b : 0x1f2937, 0.9)
        .setStrokeStyle(2, p.isReady ? 0x22c55e : (isYou ? 0x3b82f6 : 0x4b5563))
        .setScrollFactor(0);

      const nameTxt = this.scene.add.text(px, cardY - 18, (isYou ? 'ВЫ: ' : '') + p.name, {
        fontSize: '10px',
        fontFamily: '"Press Start 2P", monospace',
        color: isYou ? '#60a5fa' : '#f3f4f6'
      }).setOrigin(0.5).setScrollFactor(0);

      const heroTxt = this.scene.add.text(px, cardY, hero.name, {
        fontSize: '9px',
        fontFamily: '"Press Start 2P", monospace',
        color: '#fbbf24'
      }).setOrigin(0.5).setScrollFactor(0);

      const statusTxt = this.scene.add.text(px, cardY + 16, p.isReady ? 'ГОТОВ ✓' : 'ВЫБИРАЕТ...', {
        fontSize: '8px',
        fontFamily: '"Press Start 2P", monospace',
        color: p.isReady ? '#4ade80' : '#9ca3af'
      }).setOrigin(0.5).setScrollFactor(0);

      this.playerCardsContainer.add([cardBg, nameTxt, heroTxt, statusTxt]);
    });
  }

  private refreshRosterSelection() {
    if (this.config.onConfirmChoice) {
      this.config.onConfirmChoice(this.selectedHeroKey);
    }
  }

  private lockInSelection() {
    if (this.isConfirmed) return;
    this.isConfirmed = true;
    soundEngine.playCast();

    if (this.confirmBtnRect && this.confirmBtnRect.active) {
      this.confirmBtnRect.setFillStyle(0x374151, 1.0);
      this.confirmBtnRect.setStrokeStyle(2, 0x6b7280);
    }

    if (this.confirmBtnText && this.confirmBtnText.active) {
      this.confirmBtnText.setText('ГОТОВ ✓');
      this.confirmBtnText.setColor('#4ade80');
    }

    if (this.config.onConfirmChoice) {
      this.config.onConfirmChoice(this.selectedHeroKey);
    }
  }

  public destroy() {
    if (this.timerEvent) this.timerEvent.destroy();
    this.elements.forEach(el => {
      if (el && el.active) el.destroy();
    });
    this.elements = [];
  }
}
