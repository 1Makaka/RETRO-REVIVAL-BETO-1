/**
 * Frantic Battles - MOBA Battle HUD (MobaBattleHUD.ts)
 * Displays Team Score (Blue vs Red), Match Timer, Player EXP Bar & Level,
 * In-Match Skill Rank Up Buttons [+], Real-time Minimap,
 * Full Match KDA Scoreboard Modal (TAB key / Top Center Click),
 * and Prominent Player Death Screen with Live Countdown.
 */

import Phaser from 'phaser';
import { MobaHeroProgression, MobaTeam } from './MobaTypes';
import { MobaTower } from './Tower';
import { MobaMinion } from './MinionSpawner';
import { soundEngine } from '../audio';
import { MobaDOMHUD } from './MobaDOMHUD';

export interface HeroScoreboardRow {
  id: string;
  name: string;
  heroKey: string;
  team: MobaTeam;
  level: number;
  kills: number;
  deaths: number;
  assists: number;
  gold: number;
  isPlayer: boolean;
  isDead: boolean;
  respawnSec?: number;
}

export interface MobaHUDConfig {
  playerProgression: MobaHeroProgression;
  playerTeam: MobaTeam;
  onUpgradeSkill: (skillIndex: number) => void;
  onExitMatch: () => void;
  getScoreboardData?: () => HeroScoreboardRow[];
}

export class MobaBattleHUD {
  private scene: Phaser.Scene;
  private config: MobaHUDConfig;

  // Header Score & Timer
  private scoreContainer!: Phaser.GameObjects.Container;
  private scoreBg!: Phaser.GameObjects.Rectangle;
  private scoreText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private scoreTabBadge!: Phaser.GameObjects.Text;

  // Level & EXP
  private levelCircle!: Phaser.GameObjects.Arc;
  private levelText!: Phaser.GameObjects.Text;
  private expBarBg!: Phaser.GameObjects.Rectangle;
  private expBarFill!: Phaser.GameObjects.Rectangle;
  private expText!: Phaser.GameObjects.Text;

  // Skill Upgrade [+] Buttons & Rank Dots
  private upgradeButtons: Array<{ bg: Phaser.GameObjects.Arc; text: Phaser.GameObjects.Text }> = [];
  private skillRankDots: Array<Phaser.GameObjects.Text[]> = [];

  // Minimap
  private minimapBg!: Phaser.GameObjects.Rectangle;
  private minimapGfx!: Phaser.GameObjects.Graphics;
  private minimapW: number = 140;
  private minimapH: number = 70;

  // Scoreboard Modal
  private isScoreboardOpen: boolean = false;
  private scoreboardGroup: Phaser.GameObjects.GameObject[] = [];

  // Death Screen
  private isDeathScreenActive: boolean = false;
  private deathScreenGroup: Phaser.GameObjects.GameObject[] = [];
  private deathCountdownText!: Phaser.GameObjects.Text;

  // End Game Screen
  private endModalGroup: Phaser.GameObjects.GameObject[] = [];
  private domHud: MobaDOMHUD;

  constructor(scene: Phaser.Scene, config: MobaHUDConfig) {
    this.scene = scene;
    this.config = config;
    this.domHud = new MobaDOMHUD(config);

    this.buildHUD();
    this.setupKeyboardListeners();
  }

  private buildHUD() {
    const w = this.scene.cameras.main.width;
    const h = this.scene.cameras.main.height;
    const cx = w / 2;

    // 1. Top Score & Match Timer (Clickable to open Scoreboard / KDA stats)
    this.scoreContainer = this.scene.add.container(cx, 28).setScrollFactor(0).setDepth(400);

    this.scoreBg = this.scene.add.rectangle(0, 0, 260, 44, 0x090d16, 0.92)
      .setStrokeStyle(2, 0x38bdf8).setInteractive({ useHandCursor: true });

    this.scoreText = this.scene.add.text(0, -8, '0  VS  0', {
      fontSize: '18px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#ffffff',
      resolution: 2
    }).setOrigin(0.5);

    this.timerText = this.scene.add.text(-40, 11, '00:00', {
      fontSize: '11px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#facc15',
      resolution: 2
    }).setOrigin(0.5);

    this.scoreTabBadge = this.scene.add.text(40, 11, '📊 СЧЁТ / ТАБ', {
      fontSize: '9px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#38bdf8',
      resolution: 2
    }).setOrigin(0.5);

    this.scoreContainer.add([this.scoreBg, this.scoreText, this.timerText, this.scoreTabBadge]);

    const toggleScore = () => {
      soundEngine.playClick();
      this.toggleScoreboard();
    };

    this.scoreBg.on('pointerdown', toggleScore);

    // Dedicated Mobile Stats Tap Button in Top-Left (for easy thumb tap)
    const mobileStatsBtnBg = this.scene.add.rectangle(14 + 48, 28, 96, 32, 0x0f172a, 0.92)
      .setStrokeStyle(2, 0x38bdf8).setScrollFactor(0).setDepth(2010)
      .setInteractive({ useHandCursor: true });
    const mobileStatsBtnText = this.scene.add.text(14 + 48, 28, '📊 СТАТИСТИКА', {
      fontSize: '10px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#38bdf8',
      resolution: 2
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2011);

    mobileStatsBtnBg.on('pointerdown', toggleScore);
    mobileStatsBtnText.on('pointerdown', toggleScore);

    // 2. Level & EXP Bar (Above Bottom Controls)
    const expY = h - 14;
    const barW = Math.min(320, w - 80);

    this.levelCircle = this.scene.add.circle(cx - barW / 2 - 18, expY, 14, 0x1e3a8a, 0.95)
      .setStrokeStyle(2, 0x38bdf8).setScrollFactor(0).setDepth(400);
    this.levelText = this.scene.add.text(cx - barW / 2 - 18, expY, '1', {
      fontSize: '12px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#ffffff',
      resolution: 2
    }).setOrigin(0.5).setScrollFactor(0).setDepth(401);

    this.expBarBg = this.scene.add.rectangle(cx, expY, barW, 8, 0x0f172a)
      .setStrokeStyle(1.5, 0x475569).setScrollFactor(0).setDepth(400);
    this.expBarFill = this.scene.add.rectangle(cx - barW / 2 + 1, expY, 2, 6, 0x38bdf8)
      .setScrollFactor(0).setDepth(401);
    this.expText = this.scene.add.text(cx, expY, '0 / 120 EXP', {
      fontSize: '8px',
      fontFamily: 'monospace',
      color: '#ffffff'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(402);

    // Hide low-res canvas text HUDs in favor of crisp Vector MobaDOMHUD
    this.scoreContainer.setVisible(false);
    mobileStatsBtnBg.setVisible(false);
    mobileStatsBtnText.setVisible(false);
    this.levelCircle.setVisible(false);
    this.levelText.setVisible(false);
    this.expBarBg.setVisible(false);
    this.expBarFill.setVisible(false);
    this.expText.setVisible(false);

    // 3. Minimap in Top-Right
    const mmX = w - this.minimapW / 2 - 14;
    const mmY = this.minimapH / 2 + 14;

    this.minimapBg = this.scene.add.rectangle(mmX, mmY, this.minimapW, this.minimapH, 0x090d16, 0.85)
      .setStrokeStyle(2, 0x475569).setScrollFactor(0).setDepth(390);
    this.minimapGfx = this.scene.add.graphics().setScrollFactor(0).setDepth(391);

    // 4. Skill Rank [+] Buttons
    this.buildSkillUpgradeButtons();
  }

  private setupKeyboardListeners() {
    if (this.scene.input.keyboard) {
      const tabKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TAB);
      tabKey.on('down', (event: KeyboardEvent) => {
        if (event) event.preventDefault();
        soundEngine.playClick();
        this.toggleScoreboard();
      });
    }
  }

  public setSkillButtonPositions(positions: { s1: { x: number; y: number }; s2: { x: number; y: number }; ult: { x: number; y: number } }) {
    const slots = [positions.s1, positions.s2, positions.ult];
    slots.forEach((pos, idx) => {
      if (this.upgradeButtons[idx]) {
        this.upgradeButtons[idx].bg.setPosition(pos.x, pos.y - 36);
        this.upgradeButtons[idx].text.setPosition(pos.x, pos.y - 36);
      }
      if (this.skillRankDots[idx]) {
        this.skillRankDots[idx].forEach((dot, dotIdx) => {
          dot.setPosition(pos.x - 12 + dotIdx * 12, pos.y + 26);
        });
      }
    });
  }

  private buildSkillUpgradeButtons() {
    for (let i = 0; i < 3; i++) {
      const upgBg = this.scene.add.circle(0, 0, 13, 0xf59e0b, 0.95)
        .setStrokeStyle(2, 0xfef08a).setScrollFactor(0).setDepth(410)
        .setInteractive({ useHandCursor: true }).setVisible(false);

      const upgTxt = this.scene.add.text(0, 0, '+', {
        fontSize: '16px',
        fontFamily: 'monospace',
        fontStyle: 'bold',
        color: '#000000',
        resolution: 2
      }).setOrigin(0.5).setScrollFactor(0).setDepth(411).setVisible(false);

      const triggerUpg = () => {
        soundEngine.playLevelUp();
        this.config.onUpgradeSkill(i);
        this.updateProgressionUI(this.config.playerProgression);
      };

      upgBg.on('pointerdown', triggerUpg);
      upgTxt.on('pointerdown', triggerUpg);

      this.upgradeButtons.push({ bg: upgBg, text: upgTxt });

      // Rank dots: 3 dots for each skill
      const dots: Phaser.GameObjects.Text[] = [];
      for (let d = 0; d < 3; d++) {
        const dot = this.scene.add.text(0, 0, '○', {
          fontSize: '10px',
          fontFamily: 'monospace',
          fontStyle: 'bold',
          color: '#64748b',
          resolution: 2
        }).setOrigin(0.5).setScrollFactor(0).setDepth(405);
        dots.push(dot);
      }
      this.skillRankDots.push(dots);
    }
  }

  public updateScoreAndTimer(blueKills: number, redKills: number, elapsedSec: number) {
    this.domHud.updateScoreAndTimer(blueKills, redKills, elapsedSec);
    const mins = Math.floor(elapsedSec / 60).toString().padStart(2, '0');
    const secs = Math.floor(elapsedSec % 60).toString().padStart(2, '0');

    this.scoreText.setText(`${blueKills}  VS  ${redKills}`);
    this.timerText.setText(`${mins}:${secs}`);

    // If scoreboard is open, refresh live data
    if (this.isScoreboardOpen) {
      this.refreshScoreboard();
    }
  }

  public updateProgressionUI(prog: MobaHeroProgression) {
    this.domHud.updateProgressionUI(prog);
    this.levelText.setText(prog.level.toString());

    const w = this.scene.cameras.main.width;
    const barW = Math.min(320, w - 80);

    if (prog.level >= 10) {
      this.expBarFill.setSize(barW, 6);
      this.expBarFill.setPosition(w / 2, this.expBarBg.y);
      this.expText.setText('МАКСИМАЛЬНЫЙ УРОВЕНЬ');
    } else {
      const pct = Math.max(0, Math.min(1, prog.exp / prog.maxExp));
      const fillW = Math.max(2, barW * pct);
      this.expBarFill.setSize(fillW, 6);
      this.expBarFill.setPosition(w / 2 - barW / 2 + fillW / 2, this.expBarBg.y);
      this.expText.setText(`${prog.exp} / ${prog.maxExp} EXP`);
    }

    // Update Skill Upgrade [+] buttons visibility
    const canUpgrade = prog.unspentSkillPoints > 0;
    for (let i = 0; i < 3; i++) {
      const isMaxRank = prog.skillRanks[i] >= 3;
      // Ult level requirement
      let ultLocked = false;
      if (i === 2) {
        const currentRank = prog.skillRanks[2];
        if (currentRank === 0 && prog.level < 4) ultLocked = true;
        if (currentRank === 1 && prog.level < 7) ultLocked = true;
        if (currentRank === 2 && prog.level < 9) ultLocked = true;
      }

      const showBtn = canUpgrade && !isMaxRank && !ultLocked;
      this.upgradeButtons[i].bg.setVisible(showBtn);
      this.upgradeButtons[i].text.setVisible(showBtn);

      // Update rank dots
      const currentRank = prog.skillRanks[i];
      this.skillRankDots[i].forEach((dot, dotIdx) => {
        if (dotIdx < currentRank) {
          dot.setText('●').setColor('#facc15');
        } else {
          dot.setText('○').setColor('#64748b');
        }
      });
    }
  }

  // --- SCOREBOARD / TAB STATS PANEL (K / D / A TABLE) ---
  public toggleScoreboard() {
    this.domHud.toggleScoreboard();
  }

  public openScoreboard() {
    this.domHud.toggleScoreboard();
  }

  public closeScoreboard() {
    this.domHud.closeScoreboard();
  }

  private refreshScoreboard() {
    this.scoreboardGroup.forEach(obj => obj.destroy());
    this.scoreboardGroup = [];
    this.renderScoreboard();
  }

  private renderScoreboard() {
    const w = this.scene.cameras.main.width;
    const h = this.scene.cameras.main.height;
    const cx = w / 2;
    const cy = h / 2;

    const data = this.config.getScoreboardData ? this.config.getScoreboardData() : [];
    const blueTeam = data.filter(d => d.team === 'blue');
    const redTeam = data.filter(d => d.team === 'red');

    // Backdrop overlay
    const overlay = this.scene.add.rectangle(cx, cy, w * 2, h * 2, 0x000000, 0.75)
      .setScrollFactor(0).setDepth(2000).setInteractive();
    overlay.on('pointerdown', () => this.closeScoreboard());

    const modalW = Math.min(580, w - 24);
    const modalH = Math.min(380, h - 30);

    const modalBg = this.scene.add.rectangle(cx, cy, modalW, modalH, 0x090d16, 0.96)
      .setStrokeStyle(2, 0x38bdf8).setScrollFactor(0).setDepth(2001);

    const title = this.scene.add.text(cx, cy - modalH / 2 + 20, '⚔️ ТАБЛИЦА МАТЧА / СТАТИСТИКА (TAB) ⚔️', {
      fontSize: '15px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#38bdf8'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2002);

    const closeBtn = this.scene.add.text(cx + modalW / 2 - 24, cy - modalH / 2 + 20, '✕', {
      fontSize: '18px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#ef4444'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2003).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => {
      soundEngine.playClick();
      this.closeScoreboard();
    });

    this.scoreboardGroup.push(overlay, modalBg, title, closeBtn);

    // Render Table Sections: Blue Team vs Red Team
    const tableTopY = cy - modalH / 2 + 50;
    const colW = modalW - 24;

    // Header Row
    const headerBg = this.scene.add.rectangle(cx, tableTopY, colW, 20, 0x1e293b, 0.9)
      .setScrollFactor(0).setDepth(2002);
    const hCols = [
      { text: 'ИГРОК / ГЕРОЙ', x: cx - colW / 2 + 10, align: 0 },
      { text: 'LVL', x: cx - 40, align: 0.5 },
      { text: 'K / D / A', x: cx + 35, align: 0.5 },
      { text: 'ЗОЛОТО', x: cx + 115, align: 0.5 },
      { text: 'СТАТУС', x: cx + colW / 2 - 30, align: 1.0 }
    ];

    const headerTexts = hCols.map(c => this.scene.add.text(c.x, tableTopY, c.text, {
      fontSize: '10px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#94a3b8'
    }).setOrigin(c.align, 0.5).setScrollFactor(0).setDepth(2003));

    this.scoreboardGroup.push(headerBg, ...headerTexts);

    let rowY = tableTopY + 20;

    // 1. Blue Team Section
    const blueHeader = this.scene.add.text(cx - colW / 2 + 10, rowY + 6, '🔵 СИНЯЯ КОМАНДА', {
      fontSize: '11px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#38bdf8'
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(2003);
    this.scoreboardGroup.push(blueHeader);
    rowY += 18;

    blueTeam.forEach(hero => {
      this.renderScoreboardRow(cx, rowY, colW, hero);
      rowY += 24;
    });

    rowY += 6;

    // 2. Red Team Section
    const redHeader = this.scene.add.text(cx - colW / 2 + 10, rowY + 6, '🔴 КРАСНАЯ КОМАНДА', {
      fontSize: '11px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#ef4444'
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(2003);
    this.scoreboardGroup.push(redHeader);
    rowY += 18;

    redTeam.forEach(hero => {
      this.renderScoreboardRow(cx, rowY, colW, hero);
      rowY += 24;
    });

    // Mobile Close Button at bottom of modal
    const bottomCloseY = cy + modalH / 2 - 20;
    const bottomCloseBg = this.scene.add.rectangle(cx, bottomCloseY, 200, 32, 0xef4444, 0.9)
      .setStrokeStyle(2, 0xfca5a5).setScrollFactor(0).setDepth(2003)
      .setInteractive({ useHandCursor: true });
    const bottomCloseText = this.scene.add.text(cx, bottomCloseY, '✖ ЗАКРЫТЬ ТАБЛИЦУ', {
      fontSize: '11px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2004);

    const closeScoreboardCb = () => {
      soundEngine.playClick();
      this.closeScoreboard();
    };
    bottomCloseBg.on('pointerdown', closeScoreboardCb);
    bottomCloseText.on('pointerdown', closeScoreboardCb);

    this.scoreboardGroup.push(bottomCloseBg, bottomCloseText);
  }

  private renderScoreboardRow(cx: number, y: number, colW: number, hero: HeroScoreboardRow) {
    const isPlayer = hero.isPlayer;
    const bgCol = isPlayer ? 0x1e3a8a : hero.team === 'blue' ? 0x0f172a : 0x1c1917;
    const strokeCol = isPlayer ? 0xfacc15 : hero.team === 'blue' ? 0x38bdf8 : 0xef4444;

    const rowBg = this.scene.add.rectangle(cx, y, colW, 22, bgCol, 0.85)
      .setStrokeStyle(isPlayer ? 2 : 1, strokeCol).setScrollFactor(0).setDepth(2002);

    const nameLabel = `${isPlayer ? '★ ' : ''}${hero.name}${isPlayer ? ' (ВЫ)' : ''}`;
    const nameText = this.scene.add.text(cx - colW / 2 + 10, y, nameLabel, {
      fontSize: '10px',
      fontFamily: 'monospace',
      fontStyle: isPlayer ? 'bold' : 'normal',
      color: isPlayer ? '#fef08a' : '#ffffff'
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(2003);

    const lvlText = this.scene.add.text(cx - 40, y, `Lv.${hero.level}`, {
      fontSize: '10px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#38bdf8'
    }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(2003);

    const kdaStr = `${hero.kills} / ${hero.deaths} / ${hero.assists}`;
    const kdaText = this.scene.add.text(cx + 35, y, kdaStr, {
      fontSize: '11px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#22c55e'
    }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(2003);

    const goldText = this.scene.add.text(cx + 115, y, `🪙 ${hero.gold}`, {
      fontSize: '10px',
      fontFamily: 'monospace',
      color: '#facc15'
    }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(2003);

    const statusStr = hero.isDead ? `💀 ${hero.respawnSec ?? 5}с` : '✓ Жив';
    const statusColor = hero.isDead ? '#ef4444' : '#22c55e';
    const statusText = this.scene.add.text(cx + colW / 2 - 20, y, statusStr, {
      fontSize: '10px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: statusColor
    }).setOrigin(1.0, 0.5).setScrollFactor(0).setDepth(2003);

    this.scoreboardGroup.push(rowBg, nameText, lvlText, kdaText, goldText, statusText);
  }

  // --- FULL PLAYER DEATH SCREEN WITH LIVE COUNTDOWN ---
  public showDeathScreen(seconds: number) {
    this.domHud.showDeathScreen(seconds);
  }

  public updateDeathCountdown(seconds: number) {
    this.domHud.updateDeathCountdown(seconds);
  }

  public hideDeathScreen() {
    this.domHud.hideDeathScreen();
  }

  public updateMinimap(
    mapW: number,
    mapH: number,
    towers: MobaTower[],
    heroes: Array<{ x: number; y: number; team: MobaTeam; active: boolean }>,
    minions: MobaMinion[]
  ) {
    this.minimapGfx.clear();
    const mmX = this.minimapBg.x - this.minimapW / 2;
    const mmY = this.minimapBg.y - this.minimapH / 2;

    const scaleX = this.minimapW / mapW;
    const scaleY = this.minimapH / mapH;

    // 1. Draw Towers & Thrones
    towers.forEach(t => {
      if (t.isDestroyed) return;
      const tx = mmX + t.x * scaleX;
      const ty = mmY + t.y * scaleY;
      const color = t.team === 'blue' ? 0x38bdf8 : 0xef4444;

      if (t.isThrone) {
        this.minimapGfx.fillStyle(color, 1.0);
        this.minimapGfx.fillRect(tx - 4, ty - 4, 8, 8);
      } else {
        this.minimapGfx.fillStyle(color, 0.9);
        this.minimapGfx.fillCircle(tx, ty, 3);
      }
    });

    // 2. Draw Minions
    minions.forEach(m => {
      if (!m.active) return;
      const mx = mmX + m.x * scaleX;
      const my = mmY + m.y * scaleY;
      this.minimapGfx.fillStyle(m.team === 'blue' ? 0x60a5fa : 0xf87171, 0.75);
      this.minimapGfx.fillCircle(mx, my, 1.5);
    });

    // 3. Draw Heroes
    heroes.forEach(h => {
      if (!h.active) return;
      const hx = mmX + h.x * scaleX;
      const hy = mmY + h.y * scaleY;
      this.minimapGfx.fillStyle(h.team === 'blue' ? 0x22c55e : 0xe11d48, 1.0);
      this.minimapGfx.fillCircle(hx, hy, 4);
    });
  }

  public showMatchResult(winnerTeam: 'blue' | 'red') {
    this.domHud.showMatchResult(winnerTeam);
  }

  public destroy() {
    if (this.domHud) {
      this.domHud.destroy();
    }
  }
}
