/**
 * Frantic Battles - Ranked PvP Modal (RankedModal.ts)
 * Built with Flat Scene GameObjects (Depth 2000+) for 100% Reliable Pointer Clicks.
 * Left Side: 3 Team Slots (Player / Mate 1 / Mate 2)
 * Right Side: Rank Badge, Points ("Суета"), Progress Bar, Solo/Duo/Trio Mode Selector, and Play Button.
 */

import Phaser from 'phaser';
import { soundEngine } from './audio';
import { QuickInviteModal } from './QuickInviteModal';

export interface RankTier {
  id: string;
  name: string;
  minPoints: number;
  maxPoints: number;
  color: number;
  colorHex: string;
  badgeSymbol: string;
}

export const RANK_TIERS: RankTier[] = [
  { id: 'wanderer', name: 'БРОДЯГА', minPoints: 0, maxPoints: 399, color: 0x94a3b8, colorHex: '#94a3b8', badgeSymbol: '❖' },
  { id: 'hunter', name: 'ОХОТНИК', minPoints: 400, maxPoints: 999, color: 0x22c55e, colorHex: '#22c55e', badgeSymbol: '◆' },
  { id: 'executioner', name: 'ПАЛАЧ', minPoints: 1000, maxPoints: 1999, color: 0x06b6d4, colorHex: '#06b6d4', badgeSymbol: '⬢' },
  { id: 'reaper', name: 'ЖНЕЦ', minPoints: 2000, maxPoints: 3499, color: 0xa855f7, colorHex: '#a855f7', badgeSymbol: '★' },
  { id: 'absolute', name: 'АБСОЛЮТ', minPoints: 3500, maxPoints: 99999, color: 0xef4444, colorHex: '#ef4444', badgeSymbol: '👑' }
];

export type RankedMode = 'solo' | 'duo' | 'trio';

export function getRankTier(points: number): { current: RankTier; next: RankTier | null; progress: number; pointsToNext: number } {
  const current = RANK_TIERS.slice().reverse().find(t => points >= t.minPoints) || RANK_TIERS[0];
  const currentIndex = RANK_TIERS.indexOf(current);
  const next = currentIndex < RANK_TIERS.length - 1 ? RANK_TIERS[currentIndex + 1] : null;

  let progress = 1;
  let pointsToNext = 0;

  if (next) {
    const range = next.minPoints - current.minPoints;
    const currentInTier = points - current.minPoints;
    progress = Phaser.Math.Clamp(currentInTier / range, 0, 1);
    pointsToNext = Math.max(0, next.minPoints - points);
  }

  return { current, next, progress, pointsToNext };
}

export function generateRankedModeIcons(scene: Phaser.Scene): void {
  const textures = scene.textures;

  const drawSilhouette = (g: Phaser.GameObjects.Graphics, cx: number, cy: number, scale = 1.0) => {
    g.fillCircle(cx, cy - 8 * scale, 5.5 * scale);
    g.beginPath();
    g.moveTo(cx - 7 * scale, cy - 1 * scale);
    g.lineTo(cx + 7 * scale, cy - 1 * scale);
    g.lineTo(cx + 10 * scale, cy + 10 * scale);
    g.lineTo(cx - 10 * scale, cy + 10 * scale);
    g.closePath();
    g.fillPath();
  };

  if (!textures.exists('icon_solo')) {
    const gSolo = scene.make.graphics({ x: 0, y: 0 });
    gSolo.fillStyle(0xffffff, 1.0);
    drawSilhouette(gSolo, 16, 16, 1.0);
    gSolo.generateTexture('icon_solo', 32, 32);
    gSolo.destroy();
  }

  if (!textures.exists('icon_duo')) {
    const gDuo = scene.make.graphics({ x: 0, y: 0 });
    gDuo.fillStyle(0xffffff, 1.0);
    drawSilhouette(gDuo, 10, 16, 0.85);
    drawSilhouette(gDuo, 22, 16, 0.85);
    gDuo.generateTexture('icon_duo', 32, 32);
    gDuo.destroy();
  }

  if (!textures.exists('icon_trio')) {
    const gTrio = scene.make.graphics({ x: 0, y: 0 });
    gTrio.fillStyle(0x94a3b8, 0.85);
    drawSilhouette(gTrio, 7, 13, 0.7);
    drawSilhouette(gTrio, 25, 13, 0.7);
    gTrio.fillStyle(0xffffff, 1.0);
    drawSilhouette(gTrio, 16, 17, 0.95);
    gTrio.generateTexture('icon_trio', 32, 32);
    gTrio.destroy();
  }
}

export class RankedModal {
  private scene: Phaser.Scene;
  private elements: Phaser.GameObjects.GameObject[] = [];
  private selectedMode: RankedMode = 'solo';
  private rankedPoints = 2450;
  private modeButtons: { mode: RankedMode; bg: Phaser.GameObjects.Rectangle; border: Phaser.GameObjects.Rectangle; icon: Phaser.GameObjects.Image; text: Phaser.GameObjects.Text }[] = [];
  private lobbySlots: { bg: Phaser.GameObjects.Rectangle; border: Phaser.GameObjects.Rectangle; titleText: Phaser.GameObjects.Text; subText: Phaser.GameObjects.Text; badge?: Phaser.GameObjects.Text }[] = [];
  private onStartMatch: (config: { mode: RankedMode; rank: RankTier; points: number; slots: number }) => void;
  private onCloseModal: () => void;
  private isClosing: boolean = false;

  constructor(
    scene: Phaser.Scene,
    onStartMatch: (config: { mode: RankedMode; rank: RankTier; points: number; slots: number }) => void,
    onCloseModal: () => void
  ) {
    this.scene = scene;
    this.onStartMatch = onStartMatch;
    this.onCloseModal = onCloseModal;

    const savedPts = localStorage.getItem('fb_ranked_points');
    if (savedPts !== null) {
      this.rankedPoints = parseInt(savedPts, 10) || 2450;
    }

    generateRankedModeIcons(scene);
    this.buildUI();
  }

  private buildUI() {
    const w = this.scene.cameras.main.width;
    const h = this.scene.cameras.main.height;
    const cx = w / 2;
    const cy = h / 2;

    const rankInfo = getRankTier(this.rankedPoints);
    const cardW = Math.min(680, w - 24);
    const cardH = Math.min(480, h - 24);

    // 1. Semi-transparent Backdrop (blocking world clicks)
    const backdrop = this.scene.add.rectangle(cx, cy, w * 2, h * 2, 0x000000, 0.85)
      .setScrollFactor(0)
      .setDepth(2000)
      .setInteractive();
    backdrop.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: { stopPropagation: () => void }) => {
      if (ev && typeof ev.stopPropagation === 'function') ev.stopPropagation();
    });
    this.elements.push(backdrop);

    // 2. Main Stylized Card
    const cardBg = this.scene.add.rectangle(cx, cy, cardW, cardH, 0x090d16)
      .setScrollFactor(0).setDepth(2001);
    const cardInner = this.scene.add.rectangle(cx, cy, cardW - 8, cardH - 8, 0x0f172a)
      .setScrollFactor(0).setDepth(2002);
    const cardBorder = this.scene.add.rectangle(cx, cy, cardW, cardH)
      .setStrokeStyle(3, rankInfo.current.color, 0.9)
      .setScrollFactor(0).setDepth(2003);
    this.elements.push(cardBg, cardInner, cardBorder);

    // 3. Header Title & Close Button [X]
    const headerTitle = this.scene.add.text(cx, cy - cardH / 2 + 24, '✦ РЕЙТИНГОВАЯ АРЕНА ✦', {
      fontSize: '18px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#facc15'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2005);

    const closeBtn = this.scene.add.text(cx + cardW / 2 - 28, cy - cardH / 2 + 24, '[✕]', {
      fontSize: '20px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#ef4444'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2010).setInteractive({ useHandCursor: true });

    closeBtn.on('pointerover', () => closeBtn.setScale(1.2));
    closeBtn.on('pointerout', () => closeBtn.setScale(1.0));
    closeBtn.on('pointerdown', (p: Phaser.Input.Pointer, _x: number, _y: number, ev: { stopPropagation: () => void }) => {
      if (ev && typeof ev.stopPropagation === 'function') ev.stopPropagation();
      soundEngine.playClick();
      this.close();
    });

    this.elements.push(headerTitle, closeBtn);

    // =========================================================================
    // LEFT SIDE: 3 TEAM / PLAYER CARDS
    // =========================================================================
    const leftColW = Math.floor((cardW - 54) * 0.44);
    const leftColX = cx - cardW / 2 + 20 + leftColW / 2;
    const topContentY = cy - cardH / 2 + 58;

    const leftColTitle = this.scene.add.text(leftColX, topContentY, '👥 СОСТАВ КОМАНДЫ', {
      fontSize: '13px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#38bdf8'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2005);
    this.elements.push(leftColTitle);

    const slotH = 78;
    const slotSpacing = slotH + 12;
    const slotStartY = topContentY + 54;

    for (let i = 0; i < 3; i++) {
      const sy = slotStartY + i * slotSpacing;

      const sBg = this.scene.add.rectangle(leftColX, sy, leftColW, slotH, 0x131d31)
        .setScrollFactor(0).setDepth(2004);
      const sBorder = this.scene.add.rectangle(leftColX, sy, leftColW, slotH)
        .setStrokeStyle(2, 0x38bdf8).setScrollFactor(0).setDepth(2005);
      this.elements.push(sBg, sBorder);

      let titleText: Phaser.GameObjects.Text;
      let subText: Phaser.GameObjects.Text;
      let badge: Phaser.GameObjects.Text | undefined;

      if (i === 0) {
        const crown = this.scene.add.text(leftColX - leftColW / 2 + 14, sy - 18, '👑 ТЫ (ЛИДЕР)', {
          fontSize: '11px',
          fontFamily: 'monospace',
          fontStyle: 'bold',
          color: '#facc15'
        }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(2006);

        titleText = this.scene.add.text(leftColX - leftColW / 2 + 14, sy + 4, 'ИГРОК 1', {
          fontSize: '14px',
          fontFamily: 'monospace',
          fontStyle: 'bold',
          color: '#ffffff'
        }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(2006);

        badge = this.scene.add.text(leftColX + leftColW / 2 - 14, sy, '[ ГОТОВ ]', {
          fontSize: '11px',
          fontFamily: 'monospace',
          fontStyle: 'bold',
          color: '#22c55e'
        }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(2006);

        subText = this.scene.add.text(leftColX - leftColW / 2 + 14, sy + 22, `Очки суеты: ${this.rankedPoints}`, {
          fontSize: '10px',
          fontFamily: 'monospace',
          color: '#94a3b8'
        }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(2006);

        this.elements.push(crown, titleText, badge, subText);
      } else {
        titleText = this.scene.add.text(leftColX - leftColW / 2 + 14, sy - 10, `СЛОТ ${i + 1}`, {
          fontSize: '13px',
          fontFamily: 'monospace',
          fontStyle: 'bold',
          color: '#94a3b8'
        }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(2006);

        subText = this.scene.add.text(leftColX - leftColW / 2 + 14, sy + 12, 'СВОБОДНЫЙ СЛОТ', {
          fontSize: '11px',
          fontFamily: 'monospace',
          color: '#64748b'
        }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(2006);

        // Stylish '+' Invite Friend button
        const plusBtn = this.scene.add.rectangle(leftColX + leftColW / 2 - 24, sy, 32, 32, 0x1d4ed8)
          .setStrokeStyle(1.5, 0x60a5fa)
          .setScrollFactor(0).setDepth(2008).setInteractive({ useHandCursor: true });

        const plusTxt = this.scene.add.text(leftColX + leftColW / 2 - 24, sy, '+', {
          fontSize: '20px',
          fontFamily: 'monospace',
          fontStyle: 'bold',
          color: '#ffffff'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2009).setInteractive({ useHandCursor: true });

        const triggerInvite = (p: Phaser.Input.Pointer, _x: number, _y: number, ev: { stopPropagation: () => void }) => {
          if (ev && typeof ev.stopPropagation === 'function') ev.stopPropagation();
          soundEngine.playClick();
          new QuickInviteModal(this.scene, `RANKED-${this.selectedMode.toUpperCase()}`, 'PVP');
        };

        plusBtn.on('pointerdown', triggerInvite);
        plusTxt.on('pointerdown', triggerInvite);

        this.elements.push(titleText, subText, plusBtn, plusTxt);
      }

      this.lobbySlots.push({ bg: sBg, border: sBorder, titleText, subText, badge });
    }

    // =========================================================================
    // RIGHT SIDE: RANK EMBLEM, PROGRESS, MODES, PLAY BUTTON
    // =========================================================================
    const rightColW = Math.floor((cardW - 54) * 0.52);
    const rightColX = cx + cardW / 2 - 20 - rightColW / 2;

    const rankBoxY = topContentY + 44;
    const emblemCx = rightColX - rightColW / 2 + 36;

    const emblemGfx = this.scene.add.graphics().setScrollFactor(0).setDepth(2004);
    emblemGfx.fillStyle(rankInfo.current.color, 0.25);
    emblemGfx.fillCircle(emblemCx, rankBoxY, 26);
    emblemGfx.lineStyle(3, rankInfo.current.color, 1.0);
    emblemGfx.beginPath();
    emblemGfx.moveTo(emblemCx, rankBoxY - 22);
    emblemGfx.lineTo(emblemCx + 20, rankBoxY);
    emblemGfx.lineTo(emblemCx, rankBoxY + 22);
    emblemGfx.lineTo(emblemCx - 20, rankBoxY);
    emblemGfx.closePath();
    emblemGfx.strokePath();
    emblemGfx.fillStyle(0x0f172a, 0.85);
    emblemGfx.fillPath();

    const emblemIcon = this.scene.add.text(emblemCx, rankBoxY, rankInfo.current.badgeSymbol, {
      fontSize: '20px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: rankInfo.current.colorHex
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2005);

    const rankTitleText = this.scene.add.text(emblemCx + 38, rankBoxY - 14, `${rankInfo.current.name}`, {
      fontSize: '16px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: rankInfo.current.colorHex
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(2005);

    const rankPtsText = this.scene.add.text(emblemCx + 38, rankBoxY + 8, `${this.rankedPoints} СУЕТЫ`, {
      fontSize: '13px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#facc15'
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(2005);

    // Progress bar
    const barW = rightColW - 10;
    const barH = 12;
    const barY = rankBoxY + 42;

    const barBg = this.scene.add.rectangle(rightColX, barY, barW, barH, 0x1e293b)
      .setStrokeStyle(1.5, 0x475569).setScrollFactor(0).setDepth(2004);
    const fillW = Math.max(6, barW * rankInfo.progress);
    const barFill = this.scene.add.rectangle(rightColX - barW / 2 + fillW / 2, barY, fillW, barH - 2, rankInfo.current.color)
      .setScrollFactor(0).setDepth(2005);

    const nextInfoText = rankInfo.next
      ? `До «${rankInfo.next.name}»: +${rankInfo.pointsToNext} СУЕТЫ`
      : '★ МАКСИМАЛЬНЫЙ РАНГ ДОСТИГНУТ! ★';

    const barSubText = this.scene.add.text(rightColX, barY + 16, nextInfoText, {
      fontSize: '10px',
      fontFamily: 'monospace',
      color: '#94a3b8'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2005);

    this.elements.push(emblemGfx, emblemIcon, rankTitleText, rankPtsText, barBg, barFill, barSubText);

    // Mode Selector
    const modeSectionY = barY + 54;
    const modeTitle = this.scene.add.text(rightColX, modeSectionY, 'ВЫБОР РЕЖИМА:', {
      fontSize: '12px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#cbd5e1'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2005);
    this.elements.push(modeTitle);

    const modes: { mode: RankedMode; label: string; iconKey: string }[] = [
      { mode: 'solo', label: 'СОЛО', iconKey: 'icon_solo' },
      { mode: 'duo', label: 'ДУО', iconKey: 'icon_duo' },
      { mode: 'trio', label: 'ТРИО', iconKey: 'icon_trio' }
    ];

    const modeBtnW = Math.floor((rightColW - 16) / 3);
    const modeBtnH = 44;
    const modeBtnSpacing = modeBtnW + 8;
    const modeStartX = rightColX - modeBtnSpacing;
    const modeBtnY = modeSectionY + 34;

    modes.forEach((m, idx) => {
      const bx = modeStartX + idx * modeBtnSpacing;
      const bg = this.scene.add.rectangle(bx, modeBtnY, modeBtnW, modeBtnH, 0x1e293b)
        .setScrollFactor(0).setDepth(2006).setInteractive({ useHandCursor: true });
      const border = this.scene.add.rectangle(bx, modeBtnY, modeBtnW, modeBtnH)
        .setStrokeStyle(2, 0x475569).setScrollFactor(0).setDepth(2007);
      const icon = this.scene.add.image(bx - 20, modeBtnY, m.iconKey)
        .setScale(0.8).setScrollFactor(0).setDepth(2008);
      const text = this.scene.add.text(bx + 10, modeBtnY, m.label, {
        fontSize: '12px',
        fontFamily: 'monospace',
        fontStyle: 'bold',
        color: '#ffffff'
      }).setOrigin(0.5).setScrollFactor(0).setDepth(2008);

      const triggerSelect = (p: Phaser.Input.Pointer, _x: number, _y: number, ev: { stopPropagation: () => void }) => {
        if (ev && typeof ev.stopPropagation === 'function') ev.stopPropagation();
        soundEngine.playClick();
        this.selectMode(m.mode);
      };

      bg.on('pointerdown', triggerSelect);
      icon.setInteractive({ useHandCursor: true }).on('pointerdown', triggerSelect);
      text.setInteractive({ useHandCursor: true }).on('pointerdown', triggerSelect);

      this.modeButtons.push({ mode: m.mode, bg, border, icon, text });
      this.elements.push(bg, border, icon, text);
    });

    // Play Button «⚔️ В БОЙ — ПОИСК МАТЧА ⚔️»
    const playBtnY = cy + cardH / 2 - 42;
    const playBtnW = rightColW;
    const playBtnH = 48;

    const playBtnBg = this.scene.add.rectangle(rightColX, playBtnY, playBtnW, playBtnH, 0xd97706)
      .setStrokeStyle(3, 0xfde68a)
      .setScrollFactor(0)
      .setDepth(2010)
      .setInteractive({ useHandCursor: true });

    const playBtnText = this.scene.add.text(rightColX, playBtnY, '⚔️ В БОЙ — ПОИСК МАТЧА ⚔️', {
      fontSize: '13px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2011).setInteractive({ useHandCursor: true });

    const triggerPlay = (p: Phaser.Input.Pointer, _x: number, _y: number, ev: { stopPropagation: () => void }) => {
      if (ev && typeof ev.stopPropagation === 'function') ev.stopPropagation();
      if (this.isClosing) return;
      soundEngine.playLevelUp();
      this.scene.tweens.add({
        targets: [playBtnBg, playBtnText],
        scale: 0.95,
        duration: 80,
        yoyo: true,
        onComplete: () => {
          const config = {
            mode: this.selectedMode,
            rank: rankInfo.current,
            points: this.rankedPoints,
            slots: this.selectedMode === 'solo' ? 1 : this.selectedMode === 'duo' ? 2 : 3
          };
          this.close();
          this.onStartMatch(config);
        }
      });
    };

    playBtnBg.on('pointerover', () => {
      playBtnBg.setFillStyle(0xea580c);
      playBtnBg.setStrokeStyle(3, 0xfef08a);
    });
    playBtnBg.on('pointerout', () => {
      playBtnBg.setFillStyle(0xd97706);
      playBtnBg.setStrokeStyle(3, 0xfde68a);
    });

    playBtnBg.on('pointerdown', triggerPlay);
    playBtnText.on('pointerdown', triggerPlay);

    this.elements.push(playBtnBg, playBtnText);

    // Initial Mode Selection
    this.selectMode('solo');
  }

  private selectMode(mode: RankedMode) {
    this.selectedMode = mode;

    this.modeButtons.forEach(b => {
      if (b.mode === mode) {
        b.bg.setFillStyle(0x0284c7);
        b.border.setStrokeStyle(3, 0x38bdf8);
        b.text.setColor('#ffffff');
      } else {
        b.bg.setFillStyle(0x1e293b);
        b.border.setStrokeStyle(2, 0x475569);
        b.text.setColor('#94a3b8');
      }
    });

    this.lobbySlots.forEach((slot, idx) => {
      if (idx === 0) return;

      if (mode === 'solo') {
        slot.bg.setFillStyle(0x0f172a, 0.6);
        slot.border.setStrokeStyle(2, 0x334155);
        slot.titleText.setText(`СЛОТ ${idx + 1}`);
        slot.titleText.setColor('#475569');
        slot.subText.setText('[ ЗАКРЫТО В СОЛО ]');
        slot.subText.setColor('#475569');
      } else if (mode === 'duo') {
        if (idx === 1) {
          slot.bg.setFillStyle(0x131d31);
          slot.border.setStrokeStyle(2, 0x38bdf8);
          slot.titleText.setText('НАПАРНИК 1');
          slot.titleText.setColor('#ffffff');
          slot.subText.setText('+ СВОБОДНЫЙ СЛОТ');
          slot.subText.setColor('#38bdf8');
        } else {
          slot.bg.setFillStyle(0x0f172a, 0.6);
          slot.border.setStrokeStyle(2, 0x334155);
          slot.titleText.setText('СЛОТ 3');
          slot.titleText.setColor('#475569');
          slot.subText.setText('[ ЗАКРЫТО В ДУО ]');
          slot.subText.setColor('#475569');
        }
      } else if (mode === 'trio') {
        slot.bg.setFillStyle(0x131d31);
        slot.border.setStrokeStyle(2, 0x38bdf8);
        slot.titleText.setText(`НАПАРНИК ${idx}`);
        slot.titleText.setColor('#ffffff');
        slot.subText.setText('+ СВОБОДНЫЙ СЛОТ');
        slot.subText.setColor('#38bdf8');
      }
    });
  }

  public close() {
    if (this.isClosing) return;
    this.isClosing = true;
    this.elements.forEach(el => {
      if (el && el.active) {
        el.destroy();
      }
    });
    this.elements = [];
    this.onCloseModal();
  }
}
