/**
 * Frantic Battles - High-Resolution Minimalist Dungeon HUD (DungeonHUD.ts)
 * 
 * Layout:
 * - Top-Left: Minimal Pause Button [ || ] + Crisp HP & Mana Gauges
 * - Top-Right (Left of Minimap): Fortress Floor [ 🏰 ЭТАЖ 1/7 ] & Gold Coins [ 🪙 500 МОНЕТ ]
 * - Top-Center: Demonic Boss Health Gauge during boss fights
 * - Bottom-Center: Clean action interaction prompt
 */

export interface DungeonHUDConfig {
  playerHp: number;
  playerMaxHp: number;
  playerEnergy: number;
  playerMaxEnergy: number;
  currentFloor: number;
  maxFloors: number;
  skulls: number;
  onPause: () => void;
  onInteract: () => void;
}

export class DungeonDOMHUD {
  private container: HTMLDivElement | null = null;
  private hpFill: HTMLDivElement | null = null;
  private hpLagFill: HTMLDivElement | null = null;
  private hpText: HTMLDivElement | null = null;
  private energyFill: HTMLDivElement | null = null;
  private energyText: HTMLDivElement | null = null;
  private floorText: HTMLDivElement | null = null;
  private skullsText: HTMLDivElement | null = null;
  private bossContainer: HTMLDivElement | null = null;
  private bossFill: HTMLDivElement | null = null;
  private bossText: HTMLDivElement | null = null;
  private promptBtn: HTMLButtonElement | null = null;

  private currentHp: number = 1000;
  private maxHp: number = 1000;
  private currentEnergy: number = 100;
  private maxEnergy: number = 100;

  constructor(config: DungeonHUDConfig) {
    this.currentHp = config.playerHp;
    this.maxHp = config.playerMaxHp;
    this.currentEnergy = config.playerEnergy;
    this.maxEnergy = config.playerMaxEnergy;
    this.buildHUD(config);
  }

  private buildHUD(config: DungeonHUDConfig) {
    this.destroy();

    const overlay = document.createElement('div');
    overlay.id = 'dungeon-dom-hud-root';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 1000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      user-select: none;
      -webkit-user-select: none;
      overflow: hidden;
    `;

    // 1. TOP-LEFT: MINIMAL PAUSE BUTTON [ || ] + HP & MANA GAUGES
    const topLeftGroup = document.createElement('div');
    topLeftGroup.style.cssText = `
      position: absolute;
      top: 12px;
      left: 12px;
      display: flex;
      align-items: center;
      gap: 10px;
      pointer-events: auto;
    `;

    // Minimalist Two-Bar Pause Button in TOP-LEFT
    const pauseBtn = document.createElement('button');
    pauseBtn.style.cssText = `
      width: 42px;
      height: 42px;
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
      transition: all 0.12s ease;
      padding: 0;
      flex-shrink: 0;
    `;
    pauseBtn.innerHTML = `
      <div style="width: 4px; height: 16px; background: #ffffff; border-radius: 2px; box-shadow: 0 0 6px rgba(255,255,255,0.4);"></div>
      <div style="width: 4px; height: 16px; background: #ffffff; border-radius: 2px; box-shadow: 0 0 6px rgba(255,255,255,0.4);"></div>
    `;
    pauseBtn.onmouseenter = () => {
      pauseBtn.style.borderColor = '#38bdf8';
      pauseBtn.style.transform = 'scale(1.08)';
      pauseBtn.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.75), 0 0 12px rgba(56, 189, 248, 0.4)';
    };
    pauseBtn.onmouseleave = () => {
      pauseBtn.style.borderColor = '#64748b';
      pauseBtn.style.transform = 'scale(1)';
      pauseBtn.style.boxShadow = '0 6px 18px rgba(0, 0, 0, 0.65)';
    };
    pauseBtn.onclick = () => config.onPause();
    topLeftGroup.appendChild(pauseBtn);

    // HP & Mana Status Card
    const statusCard = document.createElement('div');
    statusCard.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 5px;
      min-width: 175px;
      background: linear-gradient(135deg, rgba(15, 23, 42, 0.94), rgba(30, 41, 59, 0.9));
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1.5px solid rgba(56, 189, 248, 0.35);
      border-radius: 10px;
      padding: 6px 10px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.65);
    `;

    // HP Bar Track
    const hpTrack = document.createElement('div');
    hpTrack.style.cssText = `
      position: relative;
      width: 100%;
      height: 15px;
      background: #090d16;
      border: 1px solid rgba(239, 68, 68, 0.5);
      border-radius: 5px;
      overflow: hidden;
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.8);
    `;

    const hpLagFill = document.createElement('div');
    hpLagFill.style.cssText = `
      position: absolute;
      top: 0; left: 0; height: 100%;
      width: 100%;
      background: #f59e0b;
      transition: width 0.45s cubic-bezier(0.4, 0, 0.2, 1);
    `;
    this.hpLagFill = hpLagFill;

    const hpFill = document.createElement('div');
    hpFill.style.cssText = `
      position: absolute;
      top: 0; left: 0; height: 100%;
      width: 100%;
      background: linear-gradient(90deg, #dc2626, #ef4444, #f87171);
      border-radius: 4px;
      transition: width 0.15s ease-out;
      box-shadow: 0 0 10px rgba(239, 68, 68, 0.6);
    `;
    this.hpFill = hpFill;

    const hpText = document.createElement('div');
    hpText.style.cssText = `
      position: absolute;
      top: 0; left: 0; width: 100%; height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9.5px;
      font-weight: 800;
      color: #ffffff;
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
      letter-spacing: 0.4px;
    `;
    hpText.textContent = `${this.currentHp} / ${this.maxHp} HP`;
    this.hpText = hpText;

    hpTrack.appendChild(hpLagFill);
    hpTrack.appendChild(hpFill);
    hpTrack.appendChild(hpText);

    // Mana / Energy Bar Track
    const energyTrack = document.createElement('div');
    energyTrack.style.cssText = `
      position: relative;
      width: 100%;
      height: 12px;
      background: #090d16;
      border: 1px solid rgba(56, 189, 248, 0.5);
      border-radius: 4px;
      overflow: hidden;
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.8);
    `;

    const energyFill = document.createElement('div');
    energyFill.style.cssText = `
      position: absolute;
      top: 0; left: 0; height: 100%;
      width: 100%;
      background: linear-gradient(90deg, #0284c7, #38bdf8, #7dd3fc);
      border-radius: 3px;
      transition: width 0.1s ease-out;
      box-shadow: 0 0 8px rgba(56, 189, 248, 0.5);
    `;
    this.energyFill = energyFill;

    const energyText = document.createElement('div');
    energyText.style.cssText = `
      position: absolute;
      top: 0; left: 0; width: 100%; height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 8.5px;
      font-weight: 800;
      color: #ffffff;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.95);
      letter-spacing: 0.3px;
    `;
    energyText.textContent = `МАНА ${this.currentEnergy} / ${this.maxEnergy}`;
    this.energyText = energyText;

    energyTrack.appendChild(energyFill);
    energyTrack.appendChild(energyText);

    statusCard.appendChild(hpTrack);
    statusCard.appendChild(energyTrack);
    topLeftGroup.appendChild(statusCard);
    overlay.appendChild(topLeftGroup);

    // 2. TOP-RIGHT: DEDICATED PANEL TO THE LEFT OF MINIMAP (Floor & Coins)
    const rightSidePanel = document.createElement('div');
    rightSidePanel.style.cssText = `
      position: absolute;
      top: 14px;
      right: 175px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      pointer-events: auto;
    `;

    // Castle SVG
    const castleSvg = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0;">
        <path d="M3 21H21V11L18 8V4H15V7L12 4L9 7V4H6V8L3 11V21Z" fill="#38bdf8" fill-opacity="0.25" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M10 21V15H14V21" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M6 11V12M18 11V12" stroke="#38bdf8" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `;

    // Floor Badge Pill
    const floorPill = document.createElement('div');
    floorPill.style.cssText = `
      background: linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.92));
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1.5px solid #38bdf8;
      border-radius: 10px;
      padding: 5px 10px;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 800;
      color: #38bdf8;
      letter-spacing: 0.5px;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.65), 0 0 10px rgba(56, 189, 248, 0.15);
      text-transform: uppercase;
      white-space: nowrap;
    `;
    floorPill.innerHTML = `${castleSvg}<span id="dungeon-hud-floor-txt">ЭТАЖ ${config.currentFloor} / ${config.maxFloors}</span>`;
    this.floorText = floorPill.querySelector('#dungeon-hud-floor-txt');

    // Gold Coin Icon SVG
    const coinSvg = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0;">
        <circle cx="12" cy="12" r="9" fill="#facc15" fill-opacity="0.3" stroke="#facc15" stroke-width="2"/>
        <circle cx="12" cy="12" r="6" stroke="#fef08a" stroke-width="1.5" stroke-dasharray="2 2"/>
        <path d="M12 8V16M9.5 10H13.5C14.3 10 15 10.7 15 11.5C15 12.3 14.3 13 13.5 13H10.5C9.7 13 9 13.7 9 14.5C9 15.3 9.7 16 10.5 16H14.5" stroke="#facc15" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    `;

    // Coins Treasury Badge
    const skullsPill = document.createElement('div');
    skullsPill.style.cssText = `
      background: linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.92));
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1.5px solid #facc15;
      border-radius: 10px;
      padding: 5px 10px;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 800;
      color: #facc15;
      letter-spacing: 0.5px;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.65), 0 0 10px rgba(250, 204, 21, 0.15);
      white-space: nowrap;
    `;
    skullsPill.innerHTML = `${coinSvg}<span id="dungeon-hud-skulls-txt">${config.skulls}</span><span style="font-size:9px;color:#fef08a;margin-left:2px;">МОНЕТ</span>`;
    this.skullsText = skullsPill.querySelector('#dungeon-hud-skulls-txt');

    rightSidePanel.appendChild(floorPill);
    overlay.appendChild(rightSidePanel);

    // 3. TOP-CENTER: BOSS HEALTH GAUGE
    const bossContainer = document.createElement('div');
    bossContainer.style.cssText = `
      position: absolute;
      top: 60px;
      left: 50%;
      transform: translateX(-50%);
      width: 90%;
      max-width: 440px;
      background: linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.92));
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 2px solid #ef4444;
      border-radius: 10px;
      padding: 6px 12px;
      box-shadow: 0 8px 24px rgba(239, 68, 68, 0.35);
      display: none;
      flex-direction: column;
      gap: 4px;
      pointer-events: auto;
    `;
    this.bossContainer = bossContainer;

    const bossText = document.createElement('div');
    bossText.style.cssText = `
      font-size: 11px;
      font-weight: 800;
      color: #fca5a5;
      text-align: center;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    `;
    bossText.textContent = '👑 БОСС: ПРОКЛЯТЫЙ РЫЦАРЬ [ 7500 / 7500 ]';
    this.bossText = bossText;

    const bossTrack = document.createElement('div');
    bossTrack.style.cssText = `
      position: relative;
      width: 100%;
      height: 14px;
      background: #090d16;
      border: 1px solid rgba(239, 68, 68, 0.5);
      border-radius: 6px;
      overflow: hidden;
    `;

    const bossFill = document.createElement('div');
    bossFill.style.cssText = `
      position: absolute;
      top: 0; left: 0; height: 100%;
      width: 100%;
      background: linear-gradient(90deg, #b91c1c, #dc2626, #f87171);
      border-radius: 4px;
      box-shadow: 0 0 12px rgba(239, 68, 68, 0.7);
      transition: width 0.15s ease-out;
    `;
    this.bossFill = bossFill;

    bossTrack.appendChild(bossFill);
    bossContainer.appendChild(bossText);
    bossContainer.appendChild(bossTrack);
    overlay.appendChild(bossContainer);

    // 4. BOTTOM-CENTER: INTERACTION BUTTON
    const promptBtn = document.createElement('button');
    promptBtn.style.cssText = `
      position: absolute;
      bottom: 64px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #052e16, #14532d);
      border: 2px solid #22c55e;
      border-radius: 12px;
      color: #fef08a;
      font-size: 13.5px;
      font-weight: 800;
      letter-spacing: 0.5px;
      padding: 12px 24px;
      box-shadow: 0 10px 28px rgba(0, 0, 0, 0.75), 0 0 16px rgba(34, 197, 94, 0.35);
      cursor: pointer;
      display: none;
      align-items: center;
      gap: 8px;
      pointer-events: auto;
      transition: all 0.15s ease;
      white-space: nowrap;
    `;
    promptBtn.onclick = () => config.onInteract();
    promptBtn.onmouseenter = () => {
      promptBtn.style.transform = 'translateX(-50%) scale(1.05)';
      promptBtn.style.boxShadow = '0 12px 32px rgba(0,0,0,0.85), 0 0 22px rgba(34, 197, 94, 0.6)';
    };
    promptBtn.onmouseleave = () => {
      promptBtn.style.transform = 'translateX(-50%) scale(1)';
      promptBtn.style.boxShadow = '0 10px 28px rgba(0,0,0,0.75), 0 0 16px rgba(34, 197, 94, 0.35)';
    };
    this.promptBtn = promptBtn;
    overlay.appendChild(promptBtn);

    document.body.appendChild(overlay);
    this.container = overlay;
  }

  public updateHp(hp: number, maxHp: number) {
    this.currentHp = Math.max(0, Math.round(hp));
    this.maxHp = Math.max(1, Math.round(maxHp));
    const pct = Math.max(0, Math.min(1, this.currentHp / this.maxHp));

    if (this.hpFill) {
      this.hpFill.style.width = `${pct * 100}%`;
    }
    if (this.hpLagFill) {
      this.hpLagFill.style.width = `${pct * 100}%`;
    }
    if (this.hpText) {
      this.hpText.textContent = `${this.currentHp} / ${this.maxHp} HP`;
    }
  }

  public updateEnergy(energy: number, maxEnergy: number) {
    this.currentEnergy = Math.max(0, Math.round(energy));
    this.maxEnergy = Math.max(1, Math.round(maxEnergy));
    const pct = Math.max(0, Math.min(1, this.currentEnergy / this.maxEnergy));

    if (this.energyFill) {
      this.energyFill.style.width = `${pct * 100}%`;
    }
    if (this.energyText) {
      this.energyText.textContent = `МАНА ${this.currentEnergy} / ${this.maxEnergy}`;
    }
  }

  public updateSkulls(skulls: number) {
    if (this.skullsText) {
      this.skullsText.textContent = `${Math.round(skulls)}`;
    }
  }

  public updateFloor(floor: number, maxFloors: number) {
    if (this.floorText) {
      this.floorText.textContent = `ЭТАЖ ${floor} / ${maxFloors}`;
    }
  }

  public showBossBar(show: boolean, name?: string, hp?: number, maxHp?: number) {
    if (!this.bossContainer) return;
    this.bossContainer.style.display = show ? 'flex' : 'none';
    if (show && name && hp !== undefined && maxHp !== undefined) {
      this.updateBossHp(hp, maxHp, name);
    }
  }

  public updateBossHp(hp: number, maxHp: number, name?: string) {
    const safeHp = Math.max(0, Math.round(hp));
    const safeMax = Math.max(1, Math.round(maxHp));
    const pct = Math.max(0, Math.min(1, safeHp / safeMax));

    if (this.bossFill) {
      this.bossFill.style.width = `${pct * 100}%`;
    }
    if (this.bossText) {
      const bossTitle = name || 'БОСС';
      this.bossText.textContent = `👑 ${bossTitle} [ ${safeHp} / ${safeMax} ]`;
    }
  }

  public setPrompt(promptText: string | null) {
    if (!this.promptBtn) return;
    if (!promptText) {
      this.promptBtn.style.display = 'none';
      return;
    }
    this.promptBtn.innerHTML = `<span>🔘</span><span>${promptText}</span>`;
    this.promptBtn.style.display = 'flex';
  }

  public destroy() {
    const existing = document.getElementById('dungeon-dom-hud-root');
    if (existing) {
      existing.remove();
    }
    this.container = null;
    this.hpFill = null;
    this.hpLagFill = null;
    this.hpText = null;
    this.energyFill = null;
    this.energyText = null;
    this.floorText = null;
    this.skullsText = null;
    this.bossContainer = null;
    this.bossFill = null;
    this.bossText = null;
    this.promptBtn = null;
  }
}
