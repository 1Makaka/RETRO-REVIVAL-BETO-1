/**
 * Frantic Battles - High-Definition Vector DOM HUD for MOBA / PvP Mode (MobaDOMHUD.ts)
 * 100% Crisp HTML/CSS Overlays matching Pause & Settings:
 * - Top-Center: Glassmorphism Match Score & Timer Capsule + Scoreboard Trigger
 * - Top-Left: Minimalist Pause Button [ || ]
 * - Bottom-Center: Level Badge & Smooth Gradient EXP Gauge
 * - Match Scoreboard Modal: High-res table for Blue vs Red with KDA, Gold, and Status
 * - Death Screen: Frosted Glass Live Respawn Countdown
 * - Victory / Defeat Modal: High-impact End-of-Match Banner
 */

import { MobaHeroProgression, MobaTeam } from './MobaTypes';
import { HeroScoreboardRow } from './MobaBattleHUD';
import { soundEngine } from '../audio';
import { showHTMLPauseModal } from '../../utils/domInput';

export interface MobaDOMHUDConfig {
  playerProgression: MobaHeroProgression;
  playerTeam: MobaTeam;
  onUpgradeSkill: (idx: number) => void;
  onExitMatch: () => void;
  getScoreboardData?: () => HeroScoreboardRow[];
  onPause?: () => void;
}

export class MobaDOMHUD {
  private overlay: HTMLDivElement | null = null;
  private scoreEl: HTMLSpanElement | null = null;
  private timerEl: HTMLSpanElement | null = null;
  private levelEl: HTMLDivElement | null = null;
  private expFillEl: HTMLDivElement | null = null;
  private expTextEl: HTMLDivElement | null = null;
  private scoreboardOverlay: HTMLDivElement | null = null;
  private deathOverlay: HTMLDivElement | null = null;
  private deathTimerEl: HTMLDivElement | null = null;
  private matchResultOverlay: HTMLDivElement | null = null;

  private config: MobaDOMHUDConfig;

  constructor(config: MobaDOMHUDConfig) {
    this.config = config;
    this.buildHUD();
  }

  private buildHUD() {
    this.destroy();

    const overlay = document.createElement('div');
    overlay.id = 'moba-dom-hud-root';
    overlay.style.cssText = `
      position: fixed;
      top: 0; left: 0;
      width: 100vw; height: 100vh;
      pointer-events: none;
      z-index: 1000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      user-select: none;
      -webkit-user-select: none;
      overflow: hidden;
    `;

    // 1. TOP-LEFT: MINIMAL PAUSE BUTTON [ || ]
    const pauseBtn = document.createElement('button');
    pauseBtn.style.cssText = `
      position: absolute;
      top: 14px; left: 14px;
      width: 40px; height: 40px;
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98));
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 2px solid #64748b;
      border-radius: 10px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.65);
      pointer-events: auto;
      transition: all 0.12s ease;
      padding: 0;
    `;
    pauseBtn.innerHTML = `
      <div style="width: 4px; height: 16px; background: #ffffff; border-radius: 2px; box-shadow: 0 0 6px rgba(255,255,255,0.4);"></div>
      <div style="width: 4px; height: 16px; background: #ffffff; border-radius: 2px; box-shadow: 0 0 6px rgba(255,255,255,0.4);"></div>
    `;
    pauseBtn.onclick = () => {
      soundEngine.playClick();
      if (this.config.onPause) {
        this.config.onPause();
      } else {
        showHTMLPauseModal({
          sceneTitle: 'ПАУЗА БИТВЫ АРЕНЫ',
          onResume: () => soundEngine.playClick(),
          onExit: () => this.config.onExitMatch()
        });
      }
    };
    overlay.appendChild(pauseBtn);

    // 2. TOP-CENTER: SLEEK MATCH SCORE & TIMER CAPSULE
    const topCapsule = document.createElement('div');
    topCapsule.style.cssText = `
      position: absolute;
      top: 12px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 12px;
      background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.9));
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1.5px solid rgba(56, 189, 248, 0.35);
      border-radius: 24px;
      padding: 6px 18px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.65);
      pointer-events: auto;
      cursor: pointer;
    `;
    topCapsule.onclick = () => {
      soundEngine.playClick();
      this.toggleScoreboard();
    };

    const scoreEl = document.createElement('span');
    scoreEl.style.cssText = `
      font-size: 15px;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: 0.5px;
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    scoreEl.innerHTML = `<span style="color: #38bdf8;">🔵 0</span> <span style="opacity: 0.5;">:</span> <span style="color: #ef4444;">0 🔴</span>`;
    this.scoreEl = scoreEl;

    const divider = document.createElement('div');
    divider.style.cssText = `width: 1px; height: 18px; background: rgba(148, 163, 184, 0.3);`;

    const timerEl = document.createElement('span');
    timerEl.style.cssText = `
      font-size: 13px;
      font-weight: 700;
      color: #facc15;
      font-family: monospace;
    `;
    timerEl.textContent = '00:00';
    this.timerEl = timerEl;

    const statsBtn = document.createElement('span');
    statsBtn.style.cssText = `
      font-size: 10px;
      font-weight: 700;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.15);
      padding: 3px 8px;
      border-radius: 12px;
      border: 1px solid rgba(56, 189, 248, 0.4);
    `;
    statsBtn.textContent = '📊 СЧЁТ';

    topCapsule.appendChild(scoreEl);
    topCapsule.appendChild(divider);
    topCapsule.appendChild(timerEl);
    topCapsule.appendChild(statsBtn);
    overlay.appendChild(topCapsule);

    // 3. BOTTOM-CENTER: LEVEL BADGE & EXP BAR
    const bottomExpContainer = document.createElement('div');
    bottomExpContainer.style.cssText = `
      position: absolute;
      bottom: 8px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 8px;
      width: 90%;
      max-width: 320px;
      pointer-events: auto;
    `;

    const levelEl = document.createElement('div');
    levelEl.style.cssText = `
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: linear-gradient(135deg, #1e3a8a, #0284c7);
      border: 2px solid #38bdf8;
      color: #ffffff;
      font-weight: 800;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      flex-shrink: 0;
    `;
    levelEl.textContent = '1';
    this.levelEl = levelEl;

    const expTrack = document.createElement('div');
    expTrack.style.cssText = `
      position: relative;
      flex: 1;
      height: 12px;
      background: #090d16;
      border: 1px solid rgba(56, 189, 248, 0.4);
      border-radius: 6px;
      overflow: hidden;
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.8);
    `;

    const expFillEl = document.createElement('div');
    expFillEl.style.cssText = `
      position: absolute;
      top: 0; left: 0; height: 100%;
      width: 0%;
      background: linear-gradient(90deg, #0284c7, #38bdf8);
      border-radius: 5px;
      transition: width 0.2s ease-out;
      box-shadow: 0 0 8px rgba(56, 189, 248, 0.6);
    `;
    this.expFillEl = expFillEl;

    const expTextEl = document.createElement('div');
    expTextEl.style.cssText = `
      position: absolute;
      top: 0; left: 0; width: 100%; height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 8.5px;
      font-weight: 800;
      color: #ffffff;
      text-shadow: 0 1px 2px rgba(0,0,0,0.9);
      letter-spacing: 0.3px;
    `;
    expTextEl.textContent = '0 / 120 EXP';
    this.expTextEl = expTextEl;

    expTrack.appendChild(expFillEl);
    expTrack.appendChild(expTextEl);
    bottomExpContainer.appendChild(levelEl);
    bottomExpContainer.appendChild(expTrack);
    overlay.appendChild(bottomExpContainer);

    this.overlay = overlay;
    document.body.appendChild(overlay);
  }

  public updateScoreAndTimer(blueKills: number, redKills: number, elapsedSec: number) {
    if (this.scoreEl) {
      this.scoreEl.innerHTML = `<span style="color: #38bdf8;">🔵 ${blueKills}</span> <span style="opacity: 0.5;">:</span> <span style="color: #ef4444;">${redKills} 🔴</span>`;
    }
    if (this.timerEl) {
      const mins = Math.floor(elapsedSec / 60);
      const secs = elapsedSec % 60;
      this.timerEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  }

  public updateProgressionUI(prog: MobaHeroProgression) {
    if (this.levelEl) {
      this.levelEl.textContent = `${prog.level}`;
    }
    if (this.expFillEl && this.expTextEl) {
      const maxExp = prog.maxExp || 100;
      const pct = Math.min(100, Math.max(0, (prog.exp / maxExp) * 100));
      this.expFillEl.style.width = `${pct}%`;
      this.expTextEl.textContent = `${prog.exp} / ${maxExp} EXP`;
    }
  }

  public toggleScoreboard() {
    if (this.scoreboardOverlay) {
      this.closeScoreboard();
    } else {
      this.openScoreboard();
    }
  }

  private openScoreboard() {
    this.closeScoreboard();

    const data = this.config.getScoreboardData ? this.config.getScoreboardData() : [];
    const blueTeam = data.filter(d => d.team === 'blue');
    const redTeam = data.filter(d => d.team === 'red');

    const overlay = document.createElement('div');
    overlay.id = 'moba-scoreboard-modal';
    overlay.style.cssText = `
      position: fixed;
      top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      display: flex; align-items: center; justify-content: center;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
      color: white;
      padding: 16px;
      box-sizing: border-box;
    `;

    const box = document.createElement('div');
    box.style.cssText = `
      background: #0f172a;
      border: 3px solid #38bdf8;
      border-radius: 14px;
      padding: 18px 22px;
      width: 100%;
      max-width: 620px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 16px 40px rgba(0,0,0,0.8);
      display: flex;
      flex-direction: column;
      gap: 14px;
    `;

    // Header
    const headerRow = document.createElement('div');
    headerRow.style.cssText = 'display: flex; align-items: center; justify-content: space-between; border-b: 1px solid #334155; padding-bottom: 8px;';

    const titleEl = document.createElement('div');
    titleEl.style.cssText = 'font-size: 16px; font-weight: 800; color: #38bdf8; letter-spacing: 0.5px;';
    titleEl.textContent = '⚔️ ТАБЛИЦА МАТЧА / СТАТИСТИКА ⚔️';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = 'background: none; border: none; font-size: 20px; color: #ef4444; font-weight: 800; cursor: pointer;';
    closeBtn.onclick = () => {
      soundEngine.playClick();
      this.closeScoreboard();
    };

    headerRow.appendChild(titleEl);
    headerRow.appendChild(closeBtn);
    box.appendChild(headerRow);

    const renderTeam = (name: string, color: string, list: HeroScoreboardRow[]) => {
      const teamHeader = document.createElement('div');
      teamHeader.style.cssText = `font-size: 13px; font-weight: 800; color: ${color}; margin-top: 6px;`;
      teamHeader.textContent = name;
      box.appendChild(teamHeader);

      const table = document.createElement('div');
      table.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';

      list.forEach(hero => {
        const row = document.createElement('div');
        row.style.cssText = `
          display: flex; align-items: center; justify-content: space-between;
          padding: 8px 12px;
          border-radius: 6px;
          background: ${hero.isPlayer ? 'rgba(56, 189, 248, 0.18)' : '#1e293b'};
          border: 1px solid ${hero.isPlayer ? '#38bdf8' : '#334155'};
          font-size: 12px;
          font-weight: 600;
        `;
        row.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="color: ${hero.isPlayer ? '#fef08a' : '#ffffff'}; font-weight: 800;">${hero.isPlayer ? '★ ' : ''}${hero.name}${hero.isPlayer ? ' (ВЫ)' : ''}</span>
            <span style="color: #38bdf8; font-size: 11px;">Lv.${hero.level}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 16px;">
            <span style="color: #22c55e;">${hero.kills} / ${hero.deaths} / ${hero.assists}</span>
            <span style="color: #facc15;">🪙 ${hero.gold}</span>
            <span style="color: ${hero.isDead ? '#ef4444' : '#22c55e'}; min-width: 60px; text-align: right;">${hero.isDead ? `💀 ${hero.respawnSec ?? 5}с` : '✓ Жив'}</span>
          </div>
        `;
        table.appendChild(row);
      });
      box.appendChild(table);
    };

    renderTeam('🔵 СИНЯЯ КОМАНДА', '#38bdf8', blueTeam);
    renderTeam('🔴 КРАСНАЯ КОМАНДА', '#ef4444', redTeam);

    const bottomBtn = document.createElement('button');
    bottomBtn.textContent = 'ЗАКРЫТЬ ТАБЛИЦУ';
    bottomBtn.style.cssText = `
      background: #334155; border: 2px solid #64748b;
      color: white; font-weight: 800; font-size: 13px;
      padding: 10px; border-radius: 8px; cursor: pointer;
      margin-top: 6px;
    `;
    bottomBtn.onclick = () => {
      soundEngine.playClick();
      this.closeScoreboard();
    };
    box.appendChild(bottomBtn);

    overlay.appendChild(box);
    document.body.appendChild(overlay);
    this.scoreboardOverlay = overlay;
  }

  public closeScoreboard() {
    if (this.scoreboardOverlay) {
      this.scoreboardOverlay.remove();
      this.scoreboardOverlay = null;
    }
  }

  public showDeathScreen(deathSeconds: number) {
    if (this.deathOverlay) return;

    const overlay = document.createElement('div');
    overlay.id = 'moba-death-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 25%; left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, rgba(69, 10, 10, 0.95), rgba(20, 5, 5, 0.98));
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 2px solid #ef4444;
      border-radius: 14px;
      padding: 18px 28px;
      text-align: center;
      z-index: 9999;
      box-shadow: 0 10px 30px rgba(0,0,0,0.8), 0 0 20px rgba(239, 68, 68, 0.4);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
      color: white;
    `;

    overlay.innerHTML = `
      <div style="font-size: 20px; font-weight: 900; color: #ef4444; text-shadow: 0 0 10px rgba(239,68,68,0.7); letter-spacing: 1px;">
        💀 ВЫ ПОГИБЛИ 💀
      </div>
      <div id="moba-death-countdown-text" style="font-size: 14px; font-weight: 700; color: #fef08a; margin-top: 8px;">
        Возрождение на базе через: ${deathSeconds} сек...
      </div>
    `;

    document.body.appendChild(overlay);
    this.deathOverlay = overlay;
    this.deathTimerEl = overlay.querySelector('#moba-death-countdown-text');
  }

  public updateDeathCountdown(remainingSec: number) {
    if (this.deathTimerEl) {
      this.deathTimerEl.textContent = `Возрождение на базе через: ${remainingSec} сек...`;
    }
  }

  public hideDeathScreen() {
    if (this.deathOverlay) {
      this.deathOverlay.remove();
      this.deathOverlay = null;
      this.deathTimerEl = null;
    }
  }

  public showMatchResult(winnerTeam: MobaTeam) {
    if (this.matchResultOverlay) return;

    const isWin = winnerTeam === this.config.playerTeam;

    const overlay = document.createElement('div');
    overlay.id = 'moba-match-result-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(0, 0, 0, 0.88);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      display: flex; align-items: center; justify-content: center;
      z-index: 20000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
      color: white;
      padding: 16px;
      box-sizing: border-box;
    `;

    const box = document.createElement('div');
    box.style.cssText = `
      background: #0f172a;
      border: 3px solid ${isWin ? '#22c55e' : '#ef4444'};
      border-radius: 16px;
      padding: 28px 36px;
      text-align: center;
      max-width: 440px;
      width: 100%;
      box-shadow: 0 16px 40px rgba(0,0,0,0.8), 0 0 24px ${isWin ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'};
      display: flex; flex-direction: column; gap: 16px;
    `;

    box.innerHTML = `
      <div style="font-size: 28px; font-weight: 900; color: ${isWin ? '#22c55e' : '#ef4444'}; text-shadow: 0 0 14px ${isWin ? 'rgba(34,197,94,0.6)' : 'rgba(239,68,68,0.6)'};">
        ${isWin ? '🏆 ПОБЕДА! 🏆' : '💀 ПОРАЖЕНИЕ 💀'}
      </div>
      <div style="font-size: 14px; color: #cbd5e1;">
        ${isWin ? 'Главная база врага уничтожена!' : 'Ваш Трон пал в бою!'}
      </div>
      <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid #334155; border-radius: 8px; padding: 12px; font-size: 13px; color: #fef08a;">
        ${isWin ? '🪙 НАГРАДА: +250 ЗОЛОТА • +10 РЕЙТИНГА' : '🪙 НАГРАДА: +75 ЗОЛОТА'}
      </div>
      <button id="moba-result-exit-btn" style="
        background: linear-gradient(135deg, #1e3a8a, #0284c7);
        border: 2px solid #38bdf8;
        color: white; font-weight: 800; font-size: 15px;
        padding: 12px; border-radius: 10px; cursor: pointer;
        box-shadow: 0 6px 18px rgba(0,0,0,0.5);
        margin-top: 6px;
      ">
        В ХАБ ▶
      </button>
    `;

    overlay.appendChild(box);
    document.body.appendChild(overlay);
    this.matchResultOverlay = overlay;

    const exitBtn = box.querySelector('#moba-result-exit-btn') as HTMLButtonElement;
    if (exitBtn) {
      exitBtn.onclick = () => {
        soundEngine.playClick();
        this.destroy();
        this.config.onExitMatch();
      };
    }
  }

  public destroy() {
    this.closeScoreboard();
    this.hideDeathScreen();
    if (this.matchResultOverlay) {
      this.matchResultOverlay.remove();
      this.matchResultOverlay = null;
    }
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    const old = document.getElementById('moba-dom-hud-root');
    if (old) old.remove();
  }
}
