/**
 * Frantic Battles - Brawl Stars Style Lootbox Opening System (LootboxModal.ts)
 * Features "Old Coffin" & "Heroic Sarcophagus" chest openings,
 * Wiggling chest idle animation, squish tap interactions,
 * Flying reward cards with Back.easeOut, jackpot anticipation pulsing,
 * and Anti-Duplicate compensation.
 */

import Phaser from 'phaser';
import {
  EconomyState,
  loadEconomy,
  saveEconomy,
  addCurrencies,
  loadRoster,
  unlockHeroWithAntiDuplicate,
  CANONICAL_ROSTER
} from './economy';
import { soundEngine } from './audio';

export interface RewardItem {
  type: 'skulls' | 'shards' | 'upgradePts' | 'hero';
  amount: number;
  label: string;
  subLabel?: string;
  iconTexture: string;
  heroId?: string;
  isJackpot?: boolean;
  isDuplicate?: boolean;
}

export class LootboxModal {
  private scene: Phaser.Scene;
  private chestType: 'coffin' | 'sarcophagus';
  private elements: Phaser.GameObjects.GameObject[] = [];
  private remainingRewards: RewardItem[] = [];
  private currentRewardIndex: number = 0;
  private collectedRewards: RewardItem[] = [];

  // UI Elements
  private backdrop!: Phaser.GameObjects.Rectangle;
  private chestSprite!: Phaser.GameObjects.Image;
  private counterContainer!: Phaser.GameObjects.Container;
  private counterText!: Phaser.GameObjects.Text;
  private counterBg!: Phaser.GameObjects.Rectangle;
  private claimAllBtn!: Phaser.GameObjects.Container;
  private rewardCardContainer!: Phaser.GameObjects.Container;
  private isFinished: boolean = false;
  private onCloseCallback?: () => void;

  constructor(scene: Phaser.Scene, chestType: 'coffin' | 'sarcophagus', onClose?: () => void) {
    this.scene = scene;
    this.chestType = chestType;
    this.onCloseCallback = onClose;

    this.generateRewards();
    this.buildUI();
  }

  private generateRewards() {
    this.remainingRewards = [];
    const roster = loadRoster();

    if (this.chestType === 'coffin') {
      // 1. OLD COFFIN (2 REWARDS)
      // Reward 1: 15-30 upgrade points
      const pts = Phaser.Math.Between(15, 30);
      this.remainingRewards.push({
        type: 'upgradePts',
        amount: pts,
        label: `+${pts} ОЧКОВ ПРОКАЧКИ`,
        iconTexture: 'icon_upgrade'
      });

      // Reward 2: 40-90 skulls (70%), 1 shard (5%), or 20 upgrade pts (25%)
      const roll = Math.random();
      if (roll < 0.05) {
        this.remainingRewards.push({
          type: 'shards',
          amount: 1,
          label: '+1 ОСКОЛОК ПУСТОТЫ',
          iconTexture: 'icon_shard',
          isJackpot: true
        });
      } else if (roll < 0.75) {
        const skulls = Phaser.Math.Between(40, 90);
        this.remainingRewards.push({
          type: 'skulls',
          amount: skulls,
          label: `+${skulls} РЖАВЫХ ЧЕРЕПОВ`,
          iconTexture: 'icon_skull'
        });
      } else {
        this.remainingRewards.push({
          type: 'upgradePts',
          amount: 20,
          label: '+20 ОЧКОВ ПРОКАЧКИ',
          iconTexture: 'icon_upgrade'
        });
      }
    } else {
      // 2. HEROIC SARCOPHAGUS (3 REWARDS)
      // Reward 1: 50-100 upgrade points
      const pts = Phaser.Math.Between(50, 100);
      this.remainingRewards.push({
        type: 'upgradePts',
        amount: pts,
        label: `+${pts} ОЧКОВ ПРОКАЧКИ`,
        iconTexture: 'icon_upgrade'
      });

      // Reward 2: 200-450 skulls
      const skulls = Phaser.Math.Between(200, 450);
      this.remainingRewards.push({
        type: 'skulls',
        amount: skulls,
        label: `+${skulls} РЖАВЫХ ЧЕРЕПОВ`,
        iconTexture: 'icon_skull'
      });

      // Reward 3: JACKPOT HERO DROP (15% chance)
      const isJackpotHero = Math.random() < 0.15;
      if (isJackpotHero) {
        // Roll rarity: Rare 60%, Epic 30%, Mythic 10%
        const rRoll = Math.random();
        let targetHeroId = 'char_torf';

        if (rRoll < 0.60) {
          targetHeroId = Math.random() < 0.5 ? 'char_torf' : 'char_alrik';
        } else if (rRoll < 0.90) {
          targetHeroId = Math.random() < 0.5 ? 'char_kraul' : 'char_zaza';
        } else {
          targetHeroId = Math.random() < 0.5 ? 'char_omen' : 'char_nihil';
        }

        const heroConfig = CANONICAL_ROSTER[targetHeroId];
        const isAlreadyUnlocked = !!roster[targetHeroId]?.unlocked;

        if (isAlreadyUnlocked) {
          // ANTI-DUPLICATE COMPENSATION!
          let compPts = 150;
          let compSkulls = 500;
          if (heroConfig.rarity === 'ЭПИЧЕСКИЙ') { compPts = 300; compSkulls = 1000; }
          else if (heroConfig.rarity === 'МИФИЧЕСКИЙ') { compPts = 600; compSkulls = 2000; }

          this.remainingRewards.push({
            type: 'hero',
            amount: 1,
            heroId: targetHeroId,
            label: `ПОВТОРКА: ${heroConfig.name.toUpperCase()}`,
            subLabel: `Боец уже в ростере!\nПолучена компенсация: +${compPts} Очков, +${compSkulls} Черепов`,
            iconTexture: targetHeroId,
            isJackpot: true,
            isDuplicate: true
          });
        } else {
          this.remainingRewards.push({
            type: 'hero',
            amount: 1,
            heroId: targetHeroId,
            label: `НОВЫЙ БОЕЦ: ${heroConfig.name.toUpperCase()}!`,
            subLabel: `Редкость: ${heroConfig.rarity}`,
            iconTexture: targetHeroId,
            isJackpot: true,
            isDuplicate: false
          });
        }
      } else {
        // Shards or extra upgrade points
        const shardRoll = Math.random() < 0.5;
        if (shardRoll) {
          const shards = Phaser.Math.Between(2, 3);
          this.remainingRewards.push({
            type: 'shards',
            amount: shards,
            label: `+${shards} ОСКОЛКА ПУСТОТЫ`,
            iconTexture: 'icon_shard',
            isJackpot: true
          });
        } else {
          this.remainingRewards.push({
            type: 'upgradePts',
            amount: 100,
            label: '+100 ОЧКОВ ПРОКАЧКИ',
            iconTexture: 'icon_upgrade',
            isJackpot: true
          });
        }
      }
    }
  }

  private buildUI() {
    const w = this.scene.cameras.main.width;
    const h = this.scene.cameras.main.height;
    const cx = w / 2;
    const cy = h / 2;

    // 1. Fullscreen Dark Backdrop
    // Depth 3500 so it sits comfortably above all other UI elements
    this.backdrop = this.scene.add.rectangle(cx, cy, w * 2, h * 2, 0x030712, 0.94)
      .setScrollFactor(0).setDepth(3500).setInteractive();
    this.elements.push(this.backdrop);

    // Notify scene to freeze controls
    this.scene.game.events.emit('modal-opened');

    // Prominent Close Button [ ✕ ] in Top-Right
    const closeBtnX = Math.min(w - 45, cx + 240);
    const closeBtnY = 38;
    const closeBtnBg = this.scene.add.rectangle(closeBtnX, closeBtnY, 78, 36, 0x1f2937, 0.9)
      .setStrokeStyle(2, 0xef4444).setScrollFactor(0).setDepth(3510).setInteractive({ useHandCursor: true });
    const closeBtnTxt = this.scene.add.text(closeBtnX, closeBtnY, '✕ ЗАКРЫТЬ', {
      fontSize: '11px',
      fontFamily: 'Consolas, monospace',
      fontStyle: 'bold',
      color: '#f87171',
      resolution: 2
    }).setOrigin(0.5).setScrollFactor(0).setDepth(3511);

    const forceClose = () => {
      soundEngine.playClick();
      // Auto-collect all remaining rewards if skipping
      while (this.currentRewardIndex < this.remainingRewards.length) {
        this.collectedRewards.push(this.remainingRewards[this.currentRewardIndex]);
        this.currentRewardIndex++;
      }
      this.applyCollectedRewards();
      this.destroy();
    };

    closeBtnBg.on('pointerdown', forceClose);
    closeBtnTxt.setInteractive({ useHandCursor: true });
    closeBtnTxt.on('pointerdown', forceClose);
    this.elements.push(closeBtnBg, closeBtnTxt);

    // Header Title
    const titleText = this.chestType === 'coffin' ? '⚰️ ОТКРЫТИЕ: СТАРЫЙ ГРОБ' : '👑 ОТКРЫТИЕ: ГЕРОИЧЕСКИЙ САРКОФАГ';
    const title = this.scene.add.text(cx, 45, titleText, {
      fontSize: '18px',
      fontFamily: 'Consolas, monospace',
      fontStyle: 'bold',
      color: this.chestType === 'coffin' ? '#facc15' : '#c084fc',
      stroke: '#000000',
      strokeThickness: 3,
      resolution: 2
    }).setOrigin(0.5).setScrollFactor(0).setDepth(3505);
    this.elements.push(title);

    // Tap Prompt
    const tapHint = this.scene.add.text(cx, Math.min(h - 35, cy + 180), '👆 НАЖИМАЙТЕ НА ЭКРАН, ЧТОБЫ ЗАБИРАТЬ НАГРАДЫ!', {
      fontSize: '12px',
      fontFamily: 'Consolas, monospace',
      fontStyle: 'bold',
      color: '#ffffff',
      resolution: 2
    }).setOrigin(0.5).setScrollFactor(0).setDepth(3505);
    this.scene.tweens.add({ targets: tapHint, alpha: 0.4, duration: 600, yoyo: true, repeat: -1 });
    this.elements.push(tapHint);

    // 2. Chest Sprite with Wiggling Idle Tween
    const chestTex = this.chestType === 'coffin' ? 'chest_coffin' : 'chest_sarcophagus';
    this.chestSprite = this.scene.add.image(cx, cy - 20, chestTex)
      .setScale(2.5).setScrollFactor(0).setDepth(3502);
    this.elements.push(this.chestSprite);

    // Chest Idle Wiggle
    this.scene.tweens.add({
      targets: this.chestSprite,
      angle: 4,
      duration: 220,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // 3. Counter Badge showing remaining items count
    this.counterContainer = this.scene.add.container(cx + 65, cy - 65).setScrollFactor(0).setDepth(3503);
    this.counterBg = this.scene.add.rectangle(0, 0, 38, 38, 0xef4444)
      .setStrokeStyle(2, 0xffffff);
    this.counterText = this.scene.add.text(0, 0, `${this.remainingRewards.length}`, {
      fontSize: '20px',
      fontFamily: 'Consolas, monospace',
      fontStyle: 'bold',
      color: '#ffffff',
      resolution: 2
    }).setOrigin(0.5);
    this.counterContainer.add([this.counterBg, this.counterText]);
    this.elements.push(this.counterContainer);

    // Check if jackpot remains for Counter Pulse
    this.updateCounterPulse();

    // 4. Reward Card Container (Flies Upwards on Tap)
    this.rewardCardContainer = this.scene.add.container(cx, cy - 140).setScrollFactor(0).setDepth(3510).setVisible(false);
    this.elements.push(this.rewardCardContainer);

    // 5. Screen Tap Listener
    this.backdrop.on('pointerdown', () => this.handleTap());
  }

  private updateCounterPulse() {
    const itemsLeft = this.remainingRewards.length - this.currentRewardIndex;
    if (itemsLeft <= 0) return;

    const nextReward = this.remainingRewards[this.currentRewardIndex];
    if (nextReward && nextReward.isJackpot) {
      this.counterBg.setFillStyle(0xa855f7);
      this.counterBg.setStrokeStyle(3, 0xfacc15);
      this.scene.tweens.add({
        targets: this.counterContainer,
        scale: 1.25,
        duration: 300,
        yoyo: true,
        repeat: -1
      });
    } else {
      this.counterBg.setFillStyle(0xef4444);
      this.counterBg.setStrokeStyle(2, 0xffffff);
    }
  }

  private handleTap() {
    if (this.isFinished) return;

    if (this.currentRewardIndex >= this.remainingRewards.length) {
      return;
    }

    const reward = this.remainingRewards[this.currentRewardIndex];
    this.collectedRewards.push(reward);

    soundEngine.playLevelUp();

    // 1. Squish Chest Animation
    this.scene.tweens.add({
      targets: this.chestSprite,
      scaleY: 1.8,
      scaleX: 2.8,
      duration: 110,
      yoyo: true,
      ease: 'Quad.easeOut'
    });

    // 2. Fly Out Reward Card with Back.easeOut
    this.showRewardCard(reward);

    this.currentRewardIndex++;
    const itemsLeft = this.remainingRewards.length - this.currentRewardIndex;
    this.counterText.setText(`${itemsLeft}`);

    if (itemsLeft <= 0) {
      this.counterContainer.setVisible(false);
      this.showClaimAllButton();
      this.isFinished = true;
    } else {
      this.updateCounterPulse();
    }
  }

  private showRewardCard(reward: RewardItem) {
    const cx = this.scene.cameras.main.width / 2;
    const cy = this.scene.cameras.main.height / 2;

    this.rewardCardContainer.removeAll(true);
    this.rewardCardContainer.setPosition(cx, cy + 20);
    this.rewardCardContainer.setAlpha(0);
    this.rewardCardContainer.setVisible(true);

    const cardW = 340;
    const cardH = reward.subLabel ? 160 : 120;
    const isHero = reward.type === 'hero';

    const bgCol = isHero ? (reward.isDuplicate ? 0x450a0a : 0x3b0764) : 0x0f172a;
    const strokeCol = isHero ? (reward.isDuplicate ? 0xf87171 : 0xfacc15) : 0x38bdf8;

    const bg = this.scene.add.rectangle(0, 0, cardW, cardH, bgCol, 0.96)
      .setStrokeStyle(3, strokeCol);

    const icon = this.scene.add.image(0, -cardH / 2 + 35, reward.iconTexture)
      .setScale(isHero ? 1.6 : 1.4);

    const label = this.scene.add.text(0, reward.subLabel ? 10 : 18, reward.label, {
      fontSize: '15px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: isHero ? '#fef08a' : '#ffffff',
      align: 'center'
    }).setOrigin(0.5);

    this.rewardCardContainer.add([bg, icon, label]);

    if (reward.subLabel) {
      const sub = this.scene.add.text(0, 48, reward.subLabel, {
        fontSize: '11px',
        fontFamily: 'monospace',
        fontStyle: 'bold',
        color: reward.isDuplicate ? '#fca5a5' : '#c084fc',
        align: 'center'
      }).setOrigin(0.5);
      this.rewardCardContainer.add(sub);
    }

    // Flying Upwards Animation (Back.easeOut)
    this.scene.tweens.add({
      targets: this.rewardCardContainer,
      y: cy - 140,
      alpha: 1.0,
      angle: (Math.random() - 0.5) * 6,
      duration: 380,
      ease: 'Back.easeOut'
    });
  }

  private showClaimAllButton() {
    const cx = this.scene.cameras.main.width / 2;
    const cy = this.scene.cameras.main.height / 2;
    const h = this.scene.cameras.main.height;
    const btnY = Math.min(h - 45, cy + 165);

    this.claimAllBtn = this.scene.add.container(cx, btnY).setScrollFactor(0).setDepth(3520);
    const bg = this.scene.add.rectangle(0, 0, 260, 48, 0x15803d)
      .setStrokeStyle(2.5, 0x86efac).setInteractive({ useHandCursor: true });
    const text = this.scene.add.text(0, 0, '[ ЗАБРАТЬ ВСЕ НАГРАДЫ ]', {
      fontSize: '13px',
      fontFamily: 'Consolas, monospace',
      fontStyle: 'bold',
      color: '#ffffff',
      resolution: 2
    }).setOrigin(0.5);

    this.claimAllBtn.add([bg, text]);
    this.elements.push(this.claimAllBtn);

    const claimAction = () => {
      soundEngine.playLevelUp();
      this.applyCollectedRewards();
      this.destroy();
    };

    text.setInteractive({ useHandCursor: true });
    text.on('pointerdown', claimAction);
    bg.on('pointerdown', claimAction);
    this.backdrop.removeAllListeners('pointerdown');
    this.backdrop.on('pointerdown', claimAction);
  }

  private applyCollectedRewards() {
    this.collectedRewards.forEach(r => {
      if (r.type === 'skulls') {
        addCurrencies({ skulls: r.amount });
      } else if (r.type === 'shards') {
        addCurrencies({ shards: r.amount });
      } else if (r.type === 'upgradePts') {
        addCurrencies({ upgradePts: r.amount });
      } else if (r.type === 'hero' && r.heroId) {
        unlockHeroWithAntiDuplicate(r.heroId);
      }
    });

    if (this.onCloseCallback) {
      this.onCloseCallback();
    }
  }

  public destroy() {
    this.scene.game.events.emit('modal-closed');
    this.elements.forEach(el => el.destroy());
    this.elements = [];
  }
}
