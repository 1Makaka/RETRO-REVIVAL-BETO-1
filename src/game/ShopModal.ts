/**
 * Frantic Battles - Town & Main Menu Arena Shop Modal (ShopModal.ts)
 * Features an elegant, high-DPI (Retina Crisp UI), procedurally drawn,
 * dual-tab (Chests & Roster Upgrades) modal with zero text blurriness.
 * STRICTLY complies with bans: NO Black Market Exchange, NO external PNGs,
 * 100% round coordinate alignments, and a buttery smooth list scroller.
 */

import Phaser from 'phaser';
import {
  EconomyState,
  loadEconomy,
  saveEconomy,
  loadRoster,
  levelUpHero,
  buyHeroFromShop,
  getHeroUpgradeCost,
  getHeroStatMultipliers,
  CANONICAL_ROSTER
} from './economy';
import { LootboxModal } from './LootboxModal';
import { soundEngine } from './audio';
import { saveUserDataToCloud } from './firebase';
import { HEROES } from './players';

export class ShopModal {
  private scene: Phaser.Scene;
  private elements: Phaser.GameObjects.GameObject[] = [];
  private currentTab: 'chests' | 'roster' = 'chests';
  private onCloseCallback?: () => void;

  private backdrop!: Phaser.GameObjects.Rectangle;
  private modalBg!: Phaser.GameObjects.Rectangle;
  private innerFrame!: Phaser.GameObjects.Rectangle;
  private contentGroup: Phaser.GameObjects.GameObject[] = [];

  // Header Balance UI text elements
  private balanceSkullsText!: Phaser.GameObjects.Text;
  private balanceShardsText!: Phaser.GameObjects.Text;
  private balancePointsText!: Phaser.GameObjects.Text;

  // Tabs UI elements
  private tabChestsBg!: Phaser.GameObjects.Rectangle;
  private tabChestsTxt!: Phaser.GameObjects.Text;
  private tabRosterBg!: Phaser.GameObjects.Rectangle;
  private tabRosterTxt!: Phaser.GameObjects.Text;

  // Smooth Scroller State & Elements (Roster tab)
  private rosterListContainer?: Phaser.GameObjects.Container;
  private scrollbarTrack?: Phaser.GameObjects.Rectangle;
  private scrollbarHandle?: Phaser.GameObjects.Rectangle;
  private targetScrollY: number = 0;

  // Tooltip Elements
  private tooltipBg?: Phaser.GameObjects.Rectangle;
  private tooltipTitle?: Phaser.GameObjects.Text;
  private tooltipDesc?: Phaser.GameObjects.Text;

  // Layout Dimensions
  private cx!: number;
  private cy!: number;
  private modalW = 800; // Exact width limit
  private modalH = 450; // Exact height limit
  private startX!: number;
  private startY!: number;

  constructor(scene: Phaser.Scene, onClose?: () => void) {
    this.scene = scene;
    this.onCloseCallback = onClose;

    this.buildUI();
  }

  private buildUI() {
    this.modalW = Math.round(Math.min(860, this.scene.scale.width - 40));
    this.modalH = Math.round(Math.min(500, this.scene.scale.height - 40));
    const w = this.scene.cameras.main.width;
    const h = this.scene.cameras.main.height;
    this.cx = Math.round(w / 2);
    this.cy = Math.round(h / 2);
    this.startX = Math.round(this.cx - this.modalW / 2);
    this.startY = Math.round(this.cy - this.modalH / 2);

    // 1. Fullscreen Dimming Backdrop (Depth 2800)
    this.backdrop = this.scene.add.rectangle(this.cx, this.cy, w * 4, h * 4, 0x000000, 0.85)
      .setScrollFactor(0)
      .setDepth(2800)
      .setInteractive();
    this.elements.push(this.backdrop);

    // Prevent any clicks from falling through
    this.backdrop.on('pointerdown', (p: unknown, lx: unknown, ly: unknown, event: any) => {
      if (event && event.stopPropagation) event.stopPropagation();
    });

    // 2. Main Modal Background Window with Elegant Gold Border (Depth 2801)
    this.modalBg = this.scene.add.rectangle(this.cx, this.cy, this.modalW, this.modalH, 0x090d16, 0.98)
      .setStrokeStyle(3, 0xfacc15)
      .setScrollFactor(0)
      .setDepth(2801)
      .setInteractive();
    this.elements.push(this.modalBg);

    this.modalBg.on('pointerdown', (p: unknown, lx: unknown, ly: unknown, event: any) => {
      if (event && event.stopPropagation) event.stopPropagation();
    });

    // Inner bronze/brown double border frame (Depth 2802)
    this.innerFrame = this.scene.add.rectangle(this.cx, this.cy, this.modalW - 10, this.modalH - 10, 0x000000, 0)
      .setStrokeStyle(1.5, 0x854d0e)
      .setScrollFactor(0)
      .setDepth(2802);
    this.elements.push(this.innerFrame);

    // 3. Header Title text ("МАГАЗИН АРЕНЫ") (Depth 2805)
    const titleTxtY = Math.round(this.startY + 22);
    const title = this.scene.add.text(Math.round(this.startX + 22), titleTxtY, '🛒 МАГАЗИН АРЕНЫ', {
      fontSize: '14px',
      fontFamily: 'Consolas, "Lucida Console", Monaco, monospace',
      fontStyle: 'bold',
      color: '#facc15',
      resolution: 2
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(2805);
    this.elements.push(title);

    // 4. Close Button [ ✕ ] on top-right (Depth 5000, large hitArea)
    const closeBtnX = Math.round(this.startX + this.modalW - 35);
    const closeBtnY = Math.round(this.startY + 25);
    const closeBtn = this.scene.add.text(closeBtnX, closeBtnY, '[ ✕ ]', {
      fontSize: '13px',
      fontFamily: 'Consolas, "Lucida Console", Monaco, monospace',
      fontStyle: 'bold',
      color: '#ef4444',
      resolution: 2
    }).setOrigin(1, 0.5)
      .setScrollFactor(0)
      .setDepth(5000)
      .setInteractive({
        useHandCursor: true,
        hitArea: new Phaser.Geom.Rectangle(-15, -15, 45, 36),
        hitAreaCallback: Phaser.Geom.Rectangle.Contains
      });

    closeBtn.on('pointerover', () => { closeBtn.setColor('#f87171'); });
    closeBtn.on('pointerout', () => { closeBtn.setColor('#ef4444'); });
    closeBtn.on('pointerdown', (pointer: any, localX: any, localY: any, event: any) => {
      if (event && event.stopPropagation) event.stopPropagation();
      soundEngine.playClick();
      this.destroy();
    });
    this.elements.push(closeBtn);

    // 5. Player balances aligned relative to close button
    // Section 3: Upgrade Points
    const balX3 = Math.round(this.startX + this.modalW - 145);
    const pointsIcon = this.scene.add.image(balX3, titleTxtY, 'icon_upgrade')
      .setDisplaySize(18, 18).setScrollFactor(0).setDepth(2805);
    this.balancePointsText = this.scene.add.text(balX3 + 12, titleTxtY, '0', {
      fontSize: '12px',
      fontFamily: 'Consolas, "Lucida Console", Monaco, monospace',
      fontStyle: 'bold',
      color: '#ffffff',
      resolution: 2
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(2805);

    // Section 2: Shards
    const balX2 = Math.round(this.startX + this.modalW - 235);
    const shardIcon = this.scene.add.image(balX2, titleTxtY, 'icon_shard')
      .setDisplaySize(18, 18).setScrollFactor(0).setDepth(2805);
    this.balanceShardsText = this.scene.add.text(balX2 + 12, titleTxtY, '0', {
      fontSize: '12px',
      fontFamily: 'Consolas, "Lucida Console", Monaco, monospace',
      fontStyle: 'bold',
      color: '#ffffff',
      resolution: 2
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(2805);

    // Section 1: Skulls
    const balX1 = Math.round(this.startX + this.modalW - 325);
    const skullIcon = this.scene.add.image(balX1, titleTxtY, 'icon_skull')
      .setDisplaySize(18, 18).setScrollFactor(0).setDepth(2805);
    this.balanceSkullsText = this.scene.add.text(balX1 + 12, titleTxtY, '0', {
      fontSize: '12px',
      fontFamily: 'Consolas, "Lucida Console", Monaco, monospace',
      fontStyle: 'bold',
      color: '#ffffff',
      resolution: 2
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(2805);

    this.elements.push(
      skullIcon, this.balanceSkullsText,
      shardIcon, this.balanceShardsText,
      pointsIcon, this.balancePointsText
    );
    this.updateHeaderBalances();

    // 6. Navigation Tabs Header (Chests & Roster, completely centered)
    const tabY = Math.round(this.startY + 62);
    const tabW = 180;
    const tabH = 28;

    // --- Tab 1: Chests ---
    const tab1X = Math.round(this.cx - 100);
    this.tabChestsBg = this.scene.add.rectangle(tab1X, tabY, tabW, tabH, 0x1e293b)
      .setStrokeStyle(1.5, 0xfacc15)
      .setScrollFactor(0)
      .setDepth(2805)
      .setInteractive({ useHandCursor: true });
    
    this.tabChestsTxt = this.scene.add.text(tab1X, tabY, '📦 СУНДУКИ', {
      fontSize: '11px',
      fontFamily: 'Consolas, "Lucida Console", Monaco, monospace',
      fontStyle: 'bold',
      color: '#fef08a',
      resolution: 2
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2806);

    // --- Tab 2: Roster ---
    const tab2X = Math.round(this.cx + 100);
    this.tabRosterBg = this.scene.add.rectangle(tab2X, tabY, tabW, tabH, 0x0f172a)
      .setStrokeStyle(1.5, 0x475569)
      .setScrollFactor(0)
      .setDepth(2805)
      .setInteractive({ useHandCursor: true });
    
    this.tabRosterTxt = this.scene.add.text(tab2X, tabY, '⚔️ БОЙЦЫ И УРОВНИ', {
      fontSize: '11px',
      fontFamily: 'Consolas, "Lucida Console", Monaco, monospace',
      fontStyle: 'normal',
      color: '#94a3b8',
      resolution: 2
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2806);

    this.elements.push(this.tabChestsBg, this.tabChestsTxt, this.tabRosterBg, this.tabRosterTxt);

    // Listeners for tabs
    this.tabChestsBg.on('pointerover', () => { if (this.currentTab !== 'chests') this.tabChestsBg.setFillStyle(0x1e293b); });
    this.tabChestsBg.on('pointerout', () => { if (this.currentTab !== 'chests') this.tabChestsBg.setFillStyle(0x0f172a); });
    this.tabChestsBg.on('pointerdown', () => {
      if (this.currentTab === 'chests') return;
      soundEngine.playClick();
      this.currentTab = 'chests';
      this.refreshTabContent();
    });

    this.tabRosterBg.on('pointerover', () => { if (this.currentTab !== 'roster') this.tabRosterBg.setFillStyle(0x1e293b); });
    this.tabRosterBg.on('pointerout', () => { if (this.currentTab !== 'roster') this.tabRosterBg.setFillStyle(0x0f172a); });
    this.tabRosterBg.on('pointerdown', () => {
      if (this.currentTab === 'roster') return;
      soundEngine.playClick();
      this.currentTab = 'roster';
      this.refreshTabContent();
    });

    this.refreshTabContent();
  }

  private updateHeaderBalances() {
    const econ = loadEconomy();
    if (this.balanceSkullsText) this.balanceSkullsText.setText(`${econ.rustySkulls}`);
    if (this.balanceShardsText) this.balanceShardsText.setText(`${econ.voidShards}`);
    if (this.balancePointsText) this.balancePointsText.setText(`${econ.upgradePoints}`);
  }

  private refreshTabContent() {
    // Hide tooltips on transition
    this.hideTooltip();

    // Kill any active scrolling tweens to prevent updates on destroyed objects
    if (this.rosterListContainer) {
      this.scene.tweens.killTweensOf(this.rosterListContainer);
    }

    // Nullify references so any running update triggers exit early
    this.rosterListContainer = undefined;
    this.scrollbarTrack = undefined;
    this.scrollbarHandle = undefined;

    // Clear old content objects
    this.contentGroup.forEach(el => el.destroy());
    this.contentGroup = [];

    // Reset tab headers appearance
    if (this.currentTab === 'chests') {
      this.tabChestsBg.setFillStyle(0x1e293b).setStrokeStyle(1.5, 0xfacc15);
      this.tabChestsTxt.setColor('#fef08a').setFontStyle('bold');
      this.tabRosterBg.setFillStyle(0x0f172a).setStrokeStyle(1.5, 0x475569);
      this.tabRosterTxt.setColor('#94a3b8').setFontStyle('normal');

      this.renderChestsTab();
    } else {
      this.tabRosterBg.setFillStyle(0x1e293b).setStrokeStyle(1.5, 0xfacc15);
      this.tabRosterTxt.setColor('#fef08a').setFontStyle('bold');
      this.tabChestsBg.setFillStyle(0x0f172a).setStrokeStyle(1.5, 0x475569);
      this.tabChestsTxt.setColor('#94a3b8').setFontStyle('normal');

      this.targetScrollY = 0;
      this.renderRosterTab();
    }
  }

  // --- CHESTS TAB (SIDE BY SIDE CARDS) ---
  private renderChestsTab() {
    const cardW = 350;
    const cardH = 300;
    const centerY = Math.round(this.startY + 255);

    // --- 1. OLD COFFIN CARD ---
    {
      const x1 = Math.round(this.cx - 180);
      const cardBg1 = this.scene.add.rectangle(x1, centerY, cardW, cardH, 0x180e08, 0.95)
        .setStrokeStyle(2.5, 0xb45309).setScrollFactor(0).setDepth(2803);

      const chestImg1 = this.scene.add.image(x1, centerY - 65, 'chest_coffin')
        .setScale(1.8).setScrollFactor(0).setDepth(2804);

      const title1 = this.scene.add.text(x1, centerY - 10, 'СКАРБ: СТАРЫЙ ГРОБ', {
        fontSize: '12px',
        fontFamily: 'Consolas, "Lucida Console", Monaco, monospace',
        fontStyle: 'bold',
        color: '#facc15',
        resolution: 2
      }).setOrigin(0.5).setScrollFactor(0).setDepth(2804);

      const desc1 = this.scene.add.text(x1, centerY + 35, 'Содержит 2 награды:\n• 15-30 Очков прокачки⚡\n• 40-90 Черепов💀 (70%)\n• 1 Осколок пустоты🔮 (5%)', {
        fontSize: '10px',
        fontFamily: 'Consolas, "Lucida Console", Monaco, monospace',
        color: '#cbd5e1',
        align: 'left',
        lineSpacing: 4,
        resolution: 2
      }).setOrigin(0.5).setScrollFactor(0).setDepth(2804);

      // Buy Button
      const bBg1 = this.scene.add.rectangle(x1, centerY + 105, cardW - 60, 28, 0xb45309)
        .setStrokeStyle(1.5, 0xfef3c7).setScrollFactor(0).setDepth(2805).setInteractive({ useHandCursor: true });
      const bTxt1 = this.scene.add.text(x1, centerY + 105, 'КУПИТЬ ЗА 300 💀', {
        fontSize: '11px',
        fontFamily: 'Consolas, "Lucida Console", Monaco, monospace',
        fontStyle: 'bold',
        color: '#ffffff',
        resolution: 2
      }).setOrigin(0.5).setScrollFactor(0).setDepth(2806);

      bBg1.on('pointerover', () => { bBg1.setFillStyle(0x9a3412); });
      bBg1.on('pointerout', () => { bBg1.setFillStyle(0xb45309); });

      bBg1.on('pointerdown', () => {
        const econ = loadEconomy();
        if (econ.rustySkulls < 300) {
          soundEngine.playClick();
          this.showNotice('Недостаточно ржавых черепов! Нужно 300 💀', '#ef4444');
          return;
        }
        econ.rustySkulls -= 300;
        saveEconomy(econ);
        soundEngine.playLevelUp();
        try { saveUserDataToCloud(); } catch (e) {}
        this.updateHeaderBalances();

        // Open beautiful opening chest modal
        new LootboxModal(this.scene, 'coffin', () => {
          this.updateHeaderBalances();
          this.refreshTabContent();
        });
      });

      this.contentGroup.push(cardBg1, chestImg1, title1, desc1, bBg1, bTxt1);
    }

    // --- 2. HEROIC SARCOPHAGUS CARD ---
    {
      const x2 = Math.round(this.cx + 180);
      const cardBg2 = this.scene.add.rectangle(x2, centerY, cardW, cardH, 0x2e1065, 0.95)
        .setStrokeStyle(2.5, 0xc084fc).setScrollFactor(0).setDepth(2803);

      const chestImg2 = this.scene.add.image(x2, centerY - 65, 'chest_sarcophagus')
        .setScale(1.8).setScrollFactor(0).setDepth(2804);

      const title2 = this.scene.add.text(x2, centerY - 10, 'ГЕРОИЧЕСКИЙ САРКОФАГ', {
        fontSize: '12px',
        fontFamily: 'Consolas, "Lucida Console", Monaco, monospace',
        fontStyle: 'bold',
        color: '#c084fc',
        resolution: 2
      }).setOrigin(0.5).setScrollFactor(0).setDepth(2804);

      const desc2 = this.scene.add.text(x2, centerY + 35, 'Содержит 3 награды:\n• 50-100 Очков прокачки⚡\n• 200-450 Черепов💀\n• ★ 15% ШАНС НА НОВОГО БОЙЦА!\n (Торф, Аларик, Крал, Заза, Омен)', {
        fontSize: '9.5px',
        fontFamily: 'Consolas, "Lucida Console", Monaco, monospace',
        color: '#e9d5ff',
        align: 'left',
        lineSpacing: 3,
        resolution: 2
      }).setOrigin(0.5).setScrollFactor(0).setDepth(2804);

      // Buy Skulls Button (Side by side inside the 350px card width)
      const bBgSk = this.scene.add.rectangle(x2 - 70, centerY + 105, 120, 28, 0x7e22ce)
        .setStrokeStyle(1.5, 0xfacc15).setScrollFactor(0).setDepth(2805).setInteractive({ useHandCursor: true });
      const bTxtSk = this.scene.add.text(x2 - 70, centerY + 105, '1500 💀', {
        fontSize: '10px',
        fontFamily: 'Consolas, "Lucida Console", Monaco, monospace',
        fontStyle: 'bold',
        color: '#ffffff',
        resolution: 2
      }).setOrigin(0.5).setScrollFactor(0).setDepth(2806);

      bBgSk.on('pointerover', () => { bBgSk.setFillStyle(0x6b21a8); });
      bBgSk.on('pointerout', () => { bBgSk.setFillStyle(0x7e22ce); });

      bBgSk.on('pointerdown', () => {
        const econ = loadEconomy();
        if (econ.rustySkulls < 1500) {
          soundEngine.playClick();
          this.showNotice('Недостаточно ржавых черепов! Нужно 1500 💀', '#ef4444');
          return;
        }
        econ.rustySkulls -= 1500;
        saveEconomy(econ);
        soundEngine.playLevelUp();
        try { saveUserDataToCloud(); } catch (e) {}
        this.updateHeaderBalances();

        new LootboxModal(this.scene, 'sarcophagus', () => {
          this.updateHeaderBalances();
          this.refreshTabContent();
        });
      });

      // Buy Shards Button
      const bBgSh = this.scene.add.rectangle(x2 + 70, centerY + 105, 120, 28, 0x581c87)
        .setStrokeStyle(1.5, 0xc084fc).setScrollFactor(0).setDepth(2805).setInteractive({ useHandCursor: true });
      const bTxtSh = this.scene.add.text(x2 + 70, centerY + 105, '5 🔮', {
        fontSize: '10px',
        fontFamily: 'Consolas, "Lucida Console", Monaco, monospace',
        fontStyle: 'bold',
        color: '#fef08a',
        resolution: 2
      }).setOrigin(0.5).setScrollFactor(0).setDepth(2806);

      bBgSh.on('pointerover', () => { bBgSh.setFillStyle(0x4c1d95); });
      bBgSh.on('pointerout', () => { bBgSh.setFillStyle(0x581c87); });

      bBgSh.on('pointerdown', () => {
        const econ = loadEconomy();
        if (econ.voidShards < 5) {
          soundEngine.playClick();
          this.showNotice('Недостаточно осколков пустоты! Нужно 5 🔮', '#ef4444');
          return;
        }
        econ.voidShards -= 5;
        saveEconomy(econ);
        soundEngine.playLevelUp();
        try { saveUserDataToCloud(); } catch (e) {}
        this.updateHeaderBalances();

        new LootboxModal(this.scene, 'sarcophagus', () => {
          this.updateHeaderBalances();
          this.refreshTabContent();
        });
      });

      this.contentGroup.push(cardBg2, chestImg2, title2, desc2, bBgSk, bTxtSk, bBgSh, bTxtSh);
    }
  }

  // --- ROSTER TAB (SMOOTH SCROLL LIST WITH MASK & SCROLLBAR) ---
  private renderRosterTab() {
    try {
      // 1. Create a container for scrollable objects
      this.rosterListContainer = this.scene.add.container(0, 0).setDepth(2805);

      // 2. Add Geometry Mask so cards clip beautifully
      const maskShape = this.scene.add.graphics().setScrollFactor(0).setDepth(2804);
      maskShape.fillStyle(0xffffff);
      // Clip matching Roster Area exactly inside 450px height modal
      const maskY = Math.round(this.startY + 90);
      const maskH = 340;
      maskShape.fillRect(Math.round(this.cx - 375), maskY, 750, maskH);
      const mask = maskShape.createGeometryMask();
      this.rosterListContainer.setMask(mask);
      this.contentGroup.push(maskShape);

      // 3. Draw Scrollbar Track & Handle on the right
      this.scrollbarTrack = this.scene.add.rectangle(Math.round(this.cx + 384), maskY + Math.round(maskH / 2), 6, maskH - 4, 0x111827)
        .setStrokeStyle(1, 0x374151)
        .setScrollFactor(0)
        .setDepth(2804);
      
      this.scrollbarHandle = this.scene.add.rectangle(Math.round(this.cx + 384), maskY + 40, 6, 80, 0xfacc15)
        .setScrollFactor(0)
        .setDepth(2805);
      
      this.contentGroup.push(this.scrollbarTrack, this.scrollbarHandle);

      // 4. Fill scrollable list with 7 canonical heroes
      const roster = loadRoster();
      const heroKeys = Object.keys(CANONICAL_ROSTER);
      const rowH = 100; // Increased height to prevent text overlap & house skill icons beautifully
      const spacing = 6;
      const cardW = 730;
      let cardY = 0;

      heroKeys.forEach((hId) => {
        try {
          const config = CANONICAL_ROSTER[hId];
          const heroDef = HEROES[hId]; // Rich character stats/skills def
          if (!config || !heroDef) return; // Strict guard to prevent undefined crashes!

          const state = {
            id: hId,
            unlocked: roster[hId] ? !!roster[hId].unlocked : false,
            level: roster[hId] ? (roster[hId].level || 1) : 1
          };

          const currentCardY = cardY;

          // Card Background (Depth 2805)
          const bgCol = state.unlocked ? 0x0f172a : 0x1a1526;
          const strokeCol = state.unlocked ? 0x3b82f6 : 0x4b5563;
          const cardBg = this.scene.add.rectangle(this.cx, currentCardY + rowH / 2, cardW, rowH, bgCol, 0.95)
            .setStrokeStyle(1.5, strokeCol)
            .setDepth(2805);
          this.rosterListContainer!.add(cardBg);

          // Hero Avatar (Depth 2806) - Animated with dynamic breathing frame-by-frame animation & gentle hover bobbing
          if (this.scene.textures.exists(hId)) {
            this.ensureHeroIdleAnimation(hId);
            const avatarSprite = this.scene.add.sprite(Math.round(this.cx - cardW / 2 + 45), Math.round(currentCardY + rowH / 2), hId)
              .setDepth(2806);
            
            // Normalize avatar sizes: ensure all 7 fighters have exact same heights!
            const targetHeight = 56;
            const nativeWidth = avatarSprite.width || 48;
            const nativeHeight = avatarSprite.height || 56;
            const ratio = nativeWidth / nativeHeight;
            avatarSprite.setDisplaySize(Math.round(targetHeight * ratio), targetHeight);
            
            avatarSprite.play(`${hId}_idle`);
            this.rosterListContainer!.add(avatarSprite);

            // Gentle bobbing tween
            this.scene.tweens.add({
              targets: avatarSprite,
              y: avatarSprite.y - 3,
              duration: 1000 + Math.random() * 200,
              yoyo: true,
              repeat: -1,
              ease: 'Sine.easeInOut'
            });
          }

          // Hero Details: Name, Title & Rarity
          const nameTxt = this.scene.add.text(Math.round(this.cx - cardW / 2 + 95), Math.round(currentCardY + 14), config.name, {
            fontSize: '13px',
            fontFamily: 'Consolas, "Lucida Console", Monaco, monospace',
            fontStyle: 'bold',
            color: config.colorHex,
            resolution: 2
          }).setOrigin(0, 0).setDepth(2806);

          const titleTxt = this.scene.add.text(Math.round(this.cx - cardW / 2 + 95), Math.round(currentCardY + 36), heroDef?.title || 'Приключенец', {
            fontSize: '10.5px',
            fontFamily: 'Consolas, "Lucida Console", Monaco, monospace',
            color: '#cbd5e1',
            resolution: 2
          }).setOrigin(0, 0).setDepth(2806);

          const rarityTxt = this.scene.add.text(Math.round(this.cx - cardW / 2 + 95), Math.round(currentCardY + 56), `[ ${config.rarity} ]`, {
            fontSize: '9.5px',
            fontFamily: 'Consolas, "Lucida Console", Monaco, monospace',
            color: '#94a3b8',
            resolution: 2
          }).setOrigin(0, 0).setDepth(2806);

          this.rosterListContainer!.add([nameTxt, titleTxt, rarityTxt]);

          // Render 3 Skill Icons with fully functional hover tooltips
          if (heroDef && heroDef.skills) {
            for (let i = 0; i < 3; i++) {
              const skill = heroDef.skills[i];
              if (skill && this.scene.textures.exists(skill.icon)) {
                const skillX = Math.round(this.cx - cardW / 2 + 295 + i * 40);
                const skillImg = this.scene.add.image(skillX, Math.round(currentCardY + rowH / 2), skill.icon)
                  .setDisplaySize(32, 32)
                  .setDepth(2806)
                  .setInteractive({ useHandCursor: true });

                skillImg.on('pointerover', (pointer: Phaser.Input.Pointer) => {
                  this.showTooltip(pointer, skill.name, skill.desc);
                });
                skillImg.on('pointerout', () => {
                  this.hideTooltip();
                });
                skillImg.on('pointermove', (pointer: Phaser.Input.Pointer) => {
                  this.moveTooltip(pointer);
                });

                this.rosterListContainer!.add(skillImg);
              }
            }
          }

          // Stats or Status block
          if (state.unlocked) {
            const stats = getHeroStatMultipliers(state.level);
            const hpBonusPct = Math.round((stats.hpMult - 1) * 100);
            const dmgBonusPct = Math.round((stats.dmgMult - 1) * 100);

            const lvlTxt = this.scene.add.text(Math.round(this.cx - cardW / 2 + 420), Math.round(currentCardY + 28), `Уровень ${state.level}/10`, {
              fontSize: '11px',
              fontFamily: 'Consolas, "Lucida Console", Monaco, monospace',
              fontStyle: 'bold',
              color: '#4ade80',
              resolution: 2
            }).setOrigin(0, 0).setDepth(2806);

            const statsTxt = this.scene.add.text(Math.round(this.cx - cardW / 2 + 420), Math.round(currentCardY + 50), `(+${hpBonusPct}% ОЗ, +${dmgBonusPct}% АТК)`, {
              fontSize: '9px',
              fontFamily: 'Consolas, "Lucida Console", Monaco, monospace',
              color: '#94a3b8',
              resolution: 2
            }).setOrigin(0, 0).setDepth(2806);

            this.rosterListContainer!.add([lvlTxt, statsTxt]);

            // Level Upgrade buttons / Gold indicator on extreme right
            const btnX = Math.round(this.cx + cardW / 2 - 95);
            const btnY = Math.round(currentCardY + rowH / 2);

            if (state.level < 10) {
              const cost = getHeroUpgradeCost(state.level);
              const upBtnBg = this.scene.add.rectangle(btnX, btnY, 150, 36, 0x15803d)
                .setStrokeStyle(1.5, 0x86efac).setDepth(2806).setInteractive({ useHandCursor: true });
              
              const upBtnTxt = this.scene.add.text(btnX, btnY - 8, `УЛУЧШИТЬ Lv.${state.level + 1}`, {
                fontSize: '10px',
                fontFamily: 'Consolas, "Lucida Console", Monaco, monospace',
                fontStyle: 'bold',
                color: '#ffffff',
                resolution: 2
              }).setOrigin(0.5).setDepth(2807);

              const upBtnCostTxt = this.scene.add.text(btnX, btnY + 8, `(${cost.upgradePts}⚡ · ${cost.skulls}💀)`, {
                fontSize: '9px',
                fontFamily: 'Consolas, "Lucida Console", Monaco, monospace',
                color: '#fef08a',
                resolution: 2
              }).setOrigin(0.5).setDepth(2807);

              upBtnBg.on('pointerover', () => { upBtnBg.setFillStyle(0x166534); });
              upBtnBg.on('pointerout', () => { upBtnBg.setFillStyle(0x15803d); });

              upBtnBg.on('pointerdown', () => {
                soundEngine.playClick();
                const res = levelUpHero(hId);
                if (res.success) {
                  soundEngine.playLevelUp();
                  this.showNotice(res.message, '#4ade80');
                  try { saveUserDataToCloud(); } catch (e) {}
                  this.updateHeaderBalances();
                  this.refreshTabContent();
                } else {
                  this.showNotice(res.message, '#ef4444');
                }
              });

              this.rosterListContainer!.add([upBtnBg, upBtnTxt, upBtnCostTxt]);
            } else {
              // GOLDEN MAX LABEL
              const maxTxt = this.scene.add.text(btnX, btnY, '★ МАКС. УРОВЕНЬ ★', {
                fontSize: '11px',
                fontFamily: 'Consolas, "Lucida Console", Monaco, monospace',
                fontStyle: 'bold',
                color: '#facc15',
                resolution: 2
              }).setOrigin(0.5).setDepth(2806);
              this.rosterListContainer!.add(maxTxt);
            }
          } else {
            // LOCKED: Locked indicator & Stacked Buy buttons on extreme right
            const btnX = Math.round(this.cx + cardW / 2 - 95);

            const lockTxt = this.scene.add.text(Math.round(this.cx - cardW / 2 + 420), Math.round(currentCardY + 38), '🔒 ЗАБЛОКИРОВАН', {
              fontSize: '10px',
              fontFamily: 'Consolas, "Lucida Console", Monaco, monospace',
              fontStyle: 'bold',
              color: '#ef4444',
              resolution: 2
            }).setOrigin(0, 0).setDepth(2806);
            this.rosterListContainer!.add(lockTxt);

            // Buy with Skulls Button (Stacked Top)
            const buySkBg = this.scene.add.rectangle(btnX, Math.round(currentCardY + 30), 150, 26, 0x7c2d12)
              .setStrokeStyle(1.5, 0xf97316).setDepth(2806).setInteractive({ useHandCursor: true });
            
            const buySkTxt = this.scene.add.text(btnX, Math.round(currentCardY + 30), `КУПИТЬ: ${config.costSkulls}💀`, {
              fontSize: '10px',
              fontFamily: 'Consolas, "Lucida Console", Monaco, monospace',
              fontStyle: 'bold',
              color: '#ffffff',
              resolution: 2
            }).setOrigin(0.5).setDepth(2807);

            buySkBg.on('pointerover', () => { buySkBg.setFillStyle(0x9a3412); });
            buySkBg.on('pointerout', () => { buySkBg.setFillStyle(0x7c2d12); });

            buySkBg.on('pointerdown', () => {
              soundEngine.playClick();
              const res = buyHeroFromShop(hId, 'skulls');
              if (res.success) {
                soundEngine.playLevelUp();
                this.showNotice(res.message, '#4ade80');
                try { saveUserDataToCloud(); } catch (e) {}
                this.updateHeaderBalances();
                this.refreshTabContent();
              } else {
                this.showNotice(res.message, '#ef4444');
              }
            });

            // Buy with Shards Button (Stacked Bottom)
            const buyShBg = this.scene.add.rectangle(btnX, Math.round(currentCardY + 70), 150, 26, 0x581c87)
              .setStrokeStyle(1.5, 0xc084fc).setDepth(2806).setInteractive({ useHandCursor: true });
            
            const buyShTxt = this.scene.add.text(btnX, Math.round(currentCardY + 70), `КУПИТЬ: ${config.costShards}🔮`, {
              fontSize: '10px',
              fontFamily: 'Consolas, "Lucida Console", Monaco, monospace',
              fontStyle: 'bold',
              color: '#fef08a',
              resolution: 2
            }).setOrigin(0.5).setDepth(2807);

            buyShBg.on('pointerover', () => { buyShBg.setFillStyle(0x4c1d95); });
            buyShBg.on('pointerout', () => { buyShBg.setFillStyle(0x581c87); });

            buyShBg.on('pointerdown', () => {
              soundEngine.playClick();
              const res = buyHeroFromShop(hId, 'shards');
              if (res.success) {
                soundEngine.playLevelUp();
                this.showNotice(res.message, '#4ade80');
                try { saveUserDataToCloud(); } catch (e) {}
                this.updateHeaderBalances();
                this.refreshTabContent();
              } else {
                this.showNotice(res.message, '#ef4444');
              }
            });

            this.rosterListContainer!.add([buySkBg, buySkTxt, buyShBg, buyShTxt]);
          }

          cardY += rowH + spacing;
        } catch (err) {
          console.error('Ошибка рендера карточки бойца:', err);
        }
      });

      // 5. Scroll interactive background zone (catches wheel and drag scrolls)
      const scrollBg = this.scene.add.rectangle(this.cx, maskY + Math.round(maskH / 2), 750, maskH, 0x000000, 0)
        .setScrollFactor(0)
        .setDepth(2803)
        .setInteractive();
      this.contentGroup.push(scrollBg);

      // Apply initial scroller bounds position
      this.rosterListContainer.setPosition(Math.round(0), Math.round(this.startY + 90 + this.targetScrollY));
      this.updateScrollbar();

      // Attach wheel event directly on active viewport
      scrollBg.on('wheel', (pointer: any, deltaX: number, deltaY: number) => {
        this.scrollRoster(deltaY);
      });

      // Pointer Drag Scrolling
      let dragY = 0;
      scrollBg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        dragY = pointer.y;
      });
      scrollBg.on('pointermove', (pointer: Phaser.Input.Pointer) => {
        if (pointer.isDown) {
          const diff = pointer.y - dragY;
          if (Math.abs(diff) > 2) {
            this.scrollRoster(-diff);
            dragY = pointer.y;
          }
        }
      });

      this.contentGroup.push(this.rosterListContainer);
    } catch (err) {
      console.error('Ошибка рендера бойцов в renderRosterTab:', err);
    }
  }

  private scrollRoster(deltaY: number) {
    if (!this.rosterListContainer || !this.rosterListContainer.active) return;
    const scrollSpeed = 40;
    const totalHeight = 7 * (100 + 6) - 6;
    const viewportHeight = 340;
    const minScrollY = -(totalHeight - viewportHeight);

    this.targetScrollY = Phaser.Math.Clamp(this.targetScrollY - Math.sign(deltaY) * scrollSpeed, minScrollY, 0);

    // Smooth tween lerp to target scroll
    this.scene.tweens.add({
      targets: this.rosterListContainer,
      y: Math.round(this.startY + 90 + this.targetScrollY),
      duration: 100,
      ease: 'Quad.easeOut',
      onUpdate: () => {
        if (this.rosterListContainer && this.rosterListContainer.active) {
          this.rosterListContainer.y = Math.round(this.rosterListContainer.y);
        }
        this.updateScrollbar();
      }
    });
  }

  private updateScrollbar() {
    if (!this.scrollbarHandle || !this.scrollbarHandle.active || !this.scrollbarTrack || !this.scrollbarTrack.active) return;
    const totalHeight = 7 * (100 + 6) - 6;
    const viewportHeight = 340;

    const handleH = Math.max(30, Math.round((viewportHeight / totalHeight) * viewportHeight));
    this.scrollbarHandle.setSize(6, handleH);

    const scrollPct = -this.targetScrollY / (totalHeight - viewportHeight);
    const maxHandleTravel = viewportHeight - handleH;
    const handleY = this.startY + 90 + handleH / 2 + scrollPct * maxHandleTravel;

    this.scrollbarHandle.y = Math.round(handleY);
  }

  private showTooltip(pointer: Phaser.Input.Pointer, name: string, desc: string) {
    if (!this.tooltipBg || !this.tooltipTitle || !this.tooltipDesc) {
      // Create tooltip elements if they don't exist yet
      this.tooltipBg = this.scene.add.rectangle(0, 0, 240, 100, 0x090d16, 0.95)
        .setStrokeStyle(1.5, 0xfacc15)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(3200)
        .setVisible(false);
      this.elements.push(this.tooltipBg);

      this.tooltipTitle = this.scene.add.text(0, 0, '', {
        fontSize: '11px',
        fontFamily: 'Consolas, "Lucida Console", Monaco, monospace',
        fontStyle: 'bold',
        color: '#facc15',
        resolution: 2
      }).setOrigin(0, 0).setScrollFactor(0).setDepth(3201).setVisible(false);
      this.elements.push(this.tooltipTitle);

      this.tooltipDesc = this.scene.add.text(0, 0, '', {
        fontSize: '9.5px',
        fontFamily: 'Consolas, "Lucida Console", Monaco, monospace',
        color: '#cbd5e1',
        wordWrap: { width: 220, useAdvancedWrap: true },
        lineSpacing: 3,
        resolution: 2
      }).setOrigin(0, 0).setScrollFactor(0).setDepth(3201).setVisible(false);
      this.elements.push(this.tooltipDesc);
    }

    this.tooltipTitle.setText(name);
    this.tooltipDesc.setText(desc);

    this.tooltipBg.setVisible(true);
    this.tooltipTitle.setVisible(true);
    this.tooltipDesc.setVisible(true);

    this.moveTooltip(pointer);
  }

  private moveTooltip(pointer: Phaser.Input.Pointer) {
    if (!this.tooltipBg || !this.tooltipTitle || !this.tooltipDesc || !this.tooltipBg.visible) return;

    // Position tooltip near the cursor, keeping it within game boundaries
    const padding = 12;
    let tx = pointer.x + padding;
    let ty = pointer.y + padding;

    const w = this.scene.cameras.main.width;
    const h = this.scene.cameras.main.height;

    // Keep within right screen boundary
    if (tx + 240 > w) {
      tx = pointer.x - 240 - padding;
    }
    // Keep within bottom screen boundary
    const descHeight = this.tooltipDesc.height;
    const totalH = 15 + descHeight + 25; // padding top/bottom
    this.tooltipBg.setSize(240, totalH);

    if (ty + totalH > h) {
      ty = pointer.y - totalH - padding;
    }

    this.tooltipBg.setPosition(Math.round(tx), Math.round(ty));
    this.tooltipTitle.setPosition(Math.round(tx + 10), Math.round(ty + 8));
    this.tooltipDesc.setPosition(Math.round(tx + 10), Math.round(ty + 26));
  }

  private hideTooltip() {
    if (this.tooltipBg) this.tooltipBg.setVisible(false);
    if (this.tooltipTitle) this.tooltipTitle.setVisible(false);
    if (this.tooltipDesc) this.tooltipDesc.setVisible(false);
  }

  private showNotice(msg: string, color: string) {
    const cx = this.scene.cameras.main.width / 2;
    const cy = this.scene.cameras.main.height / 2;

    const bannerBg = this.scene.add.rectangle(cx, cy + 180, 420, 36, 0x0f172a, 0.95)
      .setStrokeStyle(2, color === '#4ade80' ? 0x22c55e : 0xef4444)
      .setScrollFactor(0)
      .setDepth(2950);

    const bannerTxt = this.scene.add.text(cx, cy + 180, msg, {
      fontSize: '11px',
      fontFamily: 'Consolas, "Lucida Console", Monaco, monospace',
      fontStyle: 'bold',
      color,
      resolution: 2
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2951);

    this.scene.tweens.add({
      targets: [bannerBg, bannerTxt],
      y: cy + 160,
      alpha: 0,
      duration: 1800,
      delay: 1000,
      onComplete: () => {
        bannerBg.destroy();
        bannerTxt.destroy();
      }
    });
  }

  private ensureHeroIdleAnimation(heroId: string) {
    const animKey = `${heroId}_idle`;
    if (this.scene.anims.exists(animKey)) return;

    const frame2Key = `${heroId}_idle_2`;
    if (!this.scene.textures.exists(frame2Key)) {
      const baseTexture = this.scene.textures.get(heroId);
      if (baseTexture) {
        const sourceImage = baseTexture.getSourceImage() as HTMLImageElement | HTMLCanvasElement;
        if (sourceImage) {
          const w = sourceImage.width;
          const h = sourceImage.height;

          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = false;

            // Draw a vertically squashed, horizontally stretched version to simulate breathing
            const squashY = 0.94;
            const stretchX = 1.04;
            const dx = (w - w * stretchX) / 2;
            const dy = h - h * squashY; // keep bottom-aligned

            ctx.drawImage(sourceImage, dx, dy, w * stretchX, h * squashY);
            this.scene.textures.addCanvas(frame2Key, canvas);
          }
        }
      }
    }

    this.scene.anims.create({
      key: animKey,
      frames: [
        { key: heroId },
        { key: frame2Key }
      ],
      frameRate: 2, // Slow breathing rate (2 frames per second)
      repeat: -1
    });
  }

  public destroy() {
    this.hideTooltip();

    this.contentGroup.forEach(el => el.destroy());
    this.elements.forEach(el => el.destroy());
    this.contentGroup = [];
    this.elements = [];

    if (this.onCloseCallback) {
      this.onCloseCallback();
    }
  }
}
