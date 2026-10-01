/**
 * Frantic Battles - DOM Input & Pause Overlay Helpers
 * Provides 100% reliable HTML Modals above Phaser Canvas for text inputs, pause menus, and full settings on mobile & web.
 */

import { soundEngine } from '../game/audio';
import { saveUserDataToCloud, CloudSyncManager, db } from '../game/firebase';
import { loadEconomy, saveEconomy } from '../game/economy';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { getShowAttackRange, setShowAttackRange, showHTMLControlsCustomizer, resetCustomControlsLayout, getCustomControlsScale, saveCustomControlsScale } from './customControls';

export function showHTMLInputModal(options: {
  title: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  onConfirm: (text: string) => void;
  onCancel?: () => void;
}) {
  const oldModal = document.getElementById('game-dom-input-modal');
  if (oldModal) oldModal.remove();

  const overlay = document.createElement('div');
  overlay.id = 'game-dom-input-modal';
  overlay.style.cssText = `
    position: fixed;
    top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(0, 0, 0, 0.85);
    display: flex; align-items: center; justify-content: center;
    z-index: 99999;
    font-family: monospace;
    color: white;
  `;

  const box = document.createElement('div');
  box.style.cssText = `
    background: #0f172a;
    border: 3px solid #38bdf8;
    border-radius: 12px;
    padding: 24px;
    width: 90%;
    max-width: 420px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.8);
    display: flex;
    flex-direction: column;
    gap: 16px;
    text-align: center;
  `;

  const titleEl = document.createElement('div');
  titleEl.style.cssText = 'font-size: 16px; font-weight: bold; color: #38bdf8;';
  titleEl.textContent = options.title;

  const inputEl = document.createElement('input');
  inputEl.type = 'text';
  inputEl.value = options.defaultValue || '';
  inputEl.placeholder = options.placeholder || 'Введите текст...';
  inputEl.style.cssText = `
    background: #1e293b;
    border: 2px solid #4ade80;
    border-radius: 6px;
    padding: 12px;
    font-size: 16px;
    font-family: monospace;
    color: white;
    outline: none;
    width: 100%;
    box-sizing: border-box;
  `;

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display: flex; gap: 12px; justify-content: center;';

  const confirmBtn = document.createElement('button');
  confirmBtn.textContent = options.confirmText || 'ОК';
  confirmBtn.style.cssText = `
    background: #16a34a;
    border: 2px solid #4ade80;
    color: white;
    font-weight: bold;
    font-family: monospace;
    font-size: 15px;
    padding: 10px 20px;
    border-radius: 6px;
    cursor: pointer;
    flex: 1;
  `;

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'ОТМЕНА';
  cancelBtn.style.cssText = `
    background: #334155;
    border: 2px solid #94a3b8;
    color: white;
    font-weight: bold;
    font-family: monospace;
    font-size: 15px;
    padding: 10px 20px;
    border-radius: 6px;
    cursor: pointer;
    flex: 1;
  `;

  const submitValue = () => {
    const val = inputEl.value.trim();
    overlay.remove();
    options.onConfirm(val);
  };

  confirmBtn.onclick = submitValue;
  cancelBtn.onclick = () => {
    overlay.remove();
    if (options.onCancel) options.onCancel();
  };

  inputEl.onkeydown = (e) => {
    if (e.key === 'Enter') submitValue();
  };

  btnRow.appendChild(confirmBtn);
  btnRow.appendChild(cancelBtn);
  box.appendChild(titleEl);
  box.appendChild(inputEl);
  box.appendChild(btnRow);
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  setTimeout(() => {
    inputEl.focus();
    inputEl.select();
  }, 50);
}

function drawTrackIconCanvas(canvas: HTMLCanvasElement, trackId: string) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  if (trackId === 'Wiklund') {
    // 8-Bit RPG - Forest green bg, gold sword & shield
    ctx.fillStyle = '#064e3b';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, w - 2, h - 2);

    ctx.fillStyle = '#1e3a8a';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#facc15';
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(10, h - 10);
    ctx.lineTo(w - 10, 10);
    ctx.stroke();
  } else if (trackId === 'Neowave') {
    // Synthwave - Purple bg, magenta sun & retro grid
    ctx.fillStyle = '#2e1065';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, w - 2, h - 2);

    const grad = ctx.createLinearGradient(0, 8, 0, 32);
    grad.addColorStop(0, '#facc15');
    grad.addColorStop(1, '#f43f5e');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(w / 2, 22, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#e0aaff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(4, 36); ctx.lineTo(w - 4, 36);
    ctx.moveTo(4, 42); ctx.lineTo(w - 4, 42);
    ctx.moveTo(4, 48); ctx.lineTo(w - 4, 48);
    ctx.stroke();
  } else if (trackId === 'VoidOverlord') {
    // Techno Cyber - Dark cyan bg, glowing skull
    ctx.fillStyle = '#083344';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, w - 2, h - 2);

    ctx.fillStyle = '#0891b2';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2 - 2, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#67e8f9';
    ctx.fillRect(w / 2 - 6, h / 2 - 5, 4, 4);
    ctx.fillRect(w / 2 + 2, h / 2 - 5, 4, 4);
  } else if (trackId === 'ShadowRealm') {
    // Gothic Dark - Midnight purple bg, crescent moon & gothic tower
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, w - 2, h - 2);

    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(16, 16, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(20, 14, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#334155';
    ctx.fillRect(w / 2 - 6, 22, 12, 24);
    ctx.beginPath();
    ctx.moveTo(w / 2 - 8, 22); ctx.lineTo(w / 2, 12); ctx.lineTo(w / 2 + 8, 22);
    ctx.fill();
  } else if (trackId === 'BloodMoon') {
    // Boss Blood Moon - Dark red bg, blood moon & slash
    ctx.fillStyle = '#450a0a';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, w - 2, h - 2);

    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 13, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(8, 8); ctx.lineTo(w - 8, h - 8);
    ctx.stroke();
  }
}

export function showHTMLTrackSelectionModal(onBack: () => void) {
  const oldModal = document.getElementById('game-dom-track-modal');
  if (oldModal) oldModal.remove();

  const overlay = document.createElement('div');
  overlay.id = 'game-dom-track-modal';
  overlay.style.cssText = `
    position: fixed;
    top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(0, 0, 0, 0.9);
    display: flex; align-items: center; justify-content: center;
    z-index: 100001;
    font-family: monospace;
    color: white;
  `;

  const box = document.createElement('div');
  box.style.cssText = `
    background: #0f172a;
    border: 3px solid #38bdf8;
    border-radius: 12px;
    padding: 20px;
    width: 92%;
    max-width: 500px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.8);
    display: flex;
    flex-direction: column;
    gap: 12px;
    text-align: center;
  `;

  const titleEl = document.createElement('div');
  titleEl.style.cssText = 'font-size: 18px; font-weight: bold; color: #38bdf8;';
  titleEl.textContent = '🎵 ВЫБОР САУНДТРЕКА (5 ТРЕКОВ)';

  const grid = document.createElement('div');
  grid.style.cssText = 'display: flex; flex-direction: column; gap: 10px; max-height: 320px; overflow-y: auto; padding-right: 4px;';

  const tracks = [
    { id: 'Wiklund' as const, name: 'WIKLUND', desc: 'Поход (RPG 8-Bit)', color: '#fef08a' },
    { id: 'Neowave' as const, name: 'NEOWAVE', desc: 'Замок (Synthwave)', color: '#e0aaff' },
    { id: 'VoidOverlord' as const, name: 'ВЛАСТЕЛИН', desc: 'Кибер (Techno)', color: '#c084fc' },
    { id: 'ShadowRealm' as const, name: 'ТЁМНАЯ ОБИТЕЛЬ', desc: 'Мрак (Gothic)', color: '#facc15' },
    { id: 'BloodMoon' as const, name: 'КРОВАВАЯ ЛУНА', desc: 'Босс (Boss Battle)', color: '#ef4444' }
  ];

  tracks.forEach(track => {
    const row = document.createElement('div');
    row.style.cssText = `
      background: #1e293b;
      border: 2px solid #475569;
      border-radius: 8px;
      padding: 10px 14px;
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
    `;

    // Canvas Album Preview Icon
    const canvas = document.createElement('canvas');
    canvas.width = 48;
    canvas.height = 48;
    canvas.style.cssText = 'border-radius: 6px; flex-shrink: 0; image-rendering: pixelated;';
    drawTrackIconCanvas(canvas, track.id);

    const info = document.createElement('div');
    info.style.cssText = 'text-align: left; flex: 1;';

    const nameEl = document.createElement('div');
    nameEl.style.cssText = `font-size: 14px; font-weight: bold; color: ${track.color};`;
    nameEl.textContent = track.name;

    const descEl = document.createElement('div');
    descEl.style.cssText = 'font-size: 11px; color: #94a3b8; margin-top: 2px;';
    descEl.textContent = track.desc;

    info.appendChild(nameEl);
    info.appendChild(descEl);

    const btn = document.createElement('button');
    btn.textContent = 'ВЫБРАТЬ ▶';
    btn.style.cssText = `
      background: #1e3a8a;
      border: 1px solid #60a5fa;
      color: white;
      font-weight: bold;
      font-family: monospace;
      font-size: 12px;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      flex-shrink: 0;
    `;

    const pick = () => {
      soundEngine.playClick();
      soundEngine.selectTrack(track.id);
      overlay.remove();
      onBack();
    };

    row.onclick = pick;
    row.appendChild(canvas);
    row.appendChild(info);
    row.appendChild(btn);
    grid.appendChild(row);
  });

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '◀ НАЗАД В НАСТРОЙКИ';
  closeBtn.style.cssText = `
    background: #334155;
    border: 2px solid #94a3b8;
    color: white;
    font-weight: bold;
    font-family: monospace;
    font-size: 14px;
    padding: 10px;
    border-radius: 6px;
    cursor: pointer;
    margin-top: 4px;
  `;

  closeBtn.onclick = () => {
    soundEngine.playClick();
    overlay.remove();
    onBack();
  };

  box.appendChild(titleEl);
  box.appendChild(grid);
  box.appendChild(closeBtn);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

export function showHTMLSettingsModal(onBack: () => void) {
  const oldModal = document.getElementById('game-dom-settings-modal');
  if (oldModal) oldModal.remove();

  let eqInterval: any = null;

  const overlay = document.createElement('div');
  overlay.id = 'game-dom-settings-modal';
  overlay.style.cssText = `
    position: fixed;
    top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(0, 0, 0, 0.88);
    display: flex; align-items: center; justify-content: center;
    z-index: 100000;
    font-family: monospace;
    color: white;
    image-rendering: pixelated;
    padding: 12px;
    box-sizing: border-box;
  `;

  // Authentic retro pixel dialog box with constrained max height & vertical flex layout
  const box = document.createElement('div');
  box.style.cssText = `
    background: #0f172a;
    border: 4px solid #f59e0b;
    outline: 3px solid #78350f;
    box-shadow: 0 0 0 4px #000, 0 12px 35px rgba(0,0,0,0.95);
    border-radius: 0px;
    padding: 16px 18px;
    width: 95%;
    max-width: 480px;
    max-height: 88vh;
    display: flex;
    flex-direction: column;
    text-align: center;
    position: relative;
    box-sizing: border-box;
    overflow: hidden;
  `;

  // Header row (sticky/fixed at top of modal box, close button inside box boundary)
  const headerRow = document.createElement('div');
  headerRow.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid #334155;
    padding-bottom: 8px;
    margin-bottom: 8px;
    flex-shrink: 0;
  `;

  const titleEl = document.createElement('div');
  titleEl.style.cssText = `
    font-size: 18px;
    font-weight: 900;
    color: #facc15;
    letter-spacing: 2px;
    text-shadow: 2px 2px 0px #000;
    text-transform: uppercase;
  `;
  titleEl.textContent = '⚙ НАСТРОЙКИ';

  const cornerClose = document.createElement('button');
  cornerClose.textContent = '✕ ЗАКРЫТЬ';
  cornerClose.style.cssText = `
    color: #ef4444;
    background: #1e1b4b;
    border: 2px solid #ef4444;
    font-size: 12px;
    font-weight: bold;
    font-family: monospace;
    padding: 4px 8px;
    cursor: pointer;
    box-shadow: 2px 2px 0px #000;
    border-radius: 4px;
    flex-shrink: 0;
  `;
  cornerClose.onclick = () => {
    soundEngine.playClick();
    if (eqInterval) clearInterval(eqInterval);
    overlay.remove();
    onBack();
  };

  headerRow.appendChild(titleEl);
  headerRow.appendChild(cornerClose);
  box.appendChild(headerRow);

  // --- TOP PIXEL TABS BAR (3 TABS: ЗВУКИ / УПРАВЛЕНИЕ / САУНДТРЕК) ---
  type TabType = 'sound' | 'controls' | 'bgm';
  let activeTab: TabType = 'sound';

  const tabBar = document.createElement('div');
  tabBar.style.cssText = `
    display: flex;
    gap: 4px;
    margin-bottom: 10px;
    flex-shrink: 0;
  `;

  const tabSoundBtn = document.createElement('button');
  const tabCtrlBtn = document.createElement('button');
  const tabBgmBtn = document.createElement('button');

  // Scrollable container for tab contents
  const scrollBody = document.createElement('div');
  scrollBody.style.cssText = `
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding-right: 4px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  `;

  const contentSound = document.createElement('div');
  contentSound.style.cssText = 'display: flex; flex-direction: column; gap: 10px; width: 100%;';

  const contentCtrl = document.createElement('div');
  contentCtrl.style.cssText = 'display: none; flex-direction: column; gap: 10px; width: 100%;';

  const contentBgm = document.createElement('div');
  contentBgm.style.cssText = 'display: none; flex-direction: column; gap: 10px; width: 100%; align-items: center;';

  const updateTabStyles = () => {
    const activeStyle = `
      flex: 1;
      background: #b45309;
      color: #fef08a;
      border: 3px solid #fde68a;
      font-weight: 900;
      font-family: monospace;
      font-size: 11px;
      padding: 9px 2px;
      cursor: pointer;
      text-transform: uppercase;
      box-shadow: inset -2px -2px 0px #78350f, inset 2px 2px 0px #fef3c7, 2px 2px 0px #000;
    `;
    const inactiveStyle = `
      flex: 1;
      background: #1e293b;
      color: #94a3b8;
      border: 2px solid #475569;
      font-weight: bold;
      font-family: monospace;
      font-size: 11px;
      padding: 8px 2px;
      cursor: pointer;
      text-transform: uppercase;
      box-shadow: inset -2px -2px 0px #000, 2px 2px 0px #000;
    `;

    tabSoundBtn.style.cssText = activeTab === 'sound' ? activeStyle : inactiveStyle;
    tabCtrlBtn.style.cssText = activeTab === 'controls' ? activeStyle : inactiveStyle;
    tabBgmBtn.style.cssText = activeTab === 'bgm' ? activeStyle : inactiveStyle;

    contentSound.style.display = activeTab === 'sound' ? 'flex' : 'none';
    contentCtrl.style.display = activeTab === 'controls' ? 'flex' : 'none';
    contentBgm.style.display = activeTab === 'bgm' ? 'flex' : 'none';
  };

  tabSoundBtn.textContent = '🔊 ЗВУКИ';
  tabCtrlBtn.textContent = '🎮 УПР.';
  tabBgmBtn.textContent = '🎵 ТЕМЫ';

  tabSoundBtn.onclick = () => {
    soundEngine.playClick();
    activeTab = 'sound';
    updateTabStyles();
  };
  tabCtrlBtn.onclick = () => {
    soundEngine.playClick();
    activeTab = 'controls';
    updateTabStyles();
  };
  tabBgmBtn.onclick = () => {
    soundEngine.playClick();
    activeTab = 'bgm';
    updateTabStyles();
  };

  tabBar.appendChild(tabSoundBtn);
  tabBar.appendChild(tabCtrlBtn);
  tabBar.appendChild(tabBgmBtn);
  box.appendChild(tabBar);

  // ================= TAB 3: САУНДТРЕК И ТЕМЫ =================
  interface BGMTrack {
    id: any;
    name: string;
    genre: string;
    coverTexture: string;
  }

  const bgmTracks: BGMTrack[] = [
    {
      id: 'bgm_rune_wanderers',
      name: 'Странники Древних Рун',
      genre: 'Темный фолк / акустика и шум ночного леса',
      coverTexture: 'RuneWanderersPic'
    },
    {
      id: 'bgm_sunset_citadel',
      name: 'Закат над Цитаделью',
      genre: 'Спокойный Lo-Fi / лютня и пианино',
      coverTexture: 'SunsetCitadelPic'
    },
    {
      id: 'bgm_midnight_wyrm',
      name: 'Крыло Полуночи',
      genre: 'Холодный мистический эмбиент / колокола',
      coverTexture: 'MidnightWyrmPic'
    },
    {
      id: 'bgm_crimson_eclipse',
      name: 'Кровавое Затмение',
      genre: 'Агрессивный 16-битный чиптюн / быстрые барабаны',
      coverTexture: 'CrimsonEclipsePic'
    },
    {
      id: 'bgm_gilded_sentinel',
      name: 'Золотой Дозор',
      genre: 'Эпическая тема рыцарства / маршевые струнные',
      coverTexture: 'GildedSentinelPic'
    },
    {
      id: 'bgm_void_sovereign',
      name: 'Владыка Бездны',
      genre: 'Тяжелый космический Dark Synthwave',
      coverTexture: 'VoidSovereignPic'
    },
    {
      id: 'bgm_crypt_butcher',
      name: 'Мясник из Катакомб',
      genre: 'Тяжелый дисторшн / боевой металл',
      coverTexture: 'CryptButcherPic'
    },
    {
      id: 'bgm_chaos_overlord',
      name: 'Король Хаоса',
      genre: 'Озорной быстрый аркадный босс-файт трек',
      coverTexture: 'ChaosOverlordPic'
    },
    {
      id: 'bgm_brave_cat',
      name: 'Сказка Менестреля',
      genre: 'Уютная мелодия таверны / флейта и каминный бит',
      coverTexture: 'BraveCatPic'
    }
  ];

  let bgmCurrentIndex = 0;
  const activeTrackId = soundEngine.getSelectedTrack();
  const foundIdx = bgmTracks.findIndex(t => t.id === activeTrackId);
  if (foundIdx >= 0) bgmCurrentIndex = foundIdx;

  // Carousel Layout Row
  const carouselRow = document.createElement('div');
  carouselRow.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    width: 100%;
    margin-top: 4px;
  `;

  const btnPrev = document.createElement('button');
  btnPrev.textContent = '◄';
  btnPrev.style.cssText = `
    background: #1e293b;
    border: 3px solid #facc15;
    color: #facc15;
    font-size: 16px;
    font-weight: bold;
    padding: 6px 12px;
    cursor: pointer;
    box-shadow: 2px 2px 0px #000;
  `;

  const btnNext = document.createElement('button');
  btnNext.textContent = '►';
  btnNext.style.cssText = `
    background: #1e293b;
    border: 3px solid #facc15;
    color: #facc15;
    font-size: 16px;
    font-weight: bold;
    padding: 6px 12px;
    cursor: pointer;
    box-shadow: 2px 2px 0px #000;
  `;

  const coverContainer = document.createElement('div');
  coverContainer.style.cssText = `
    position: relative;
    width: 140px;
    height: 140px;
    overflow: hidden;
    border: 4px solid #facc15;
    outline: 3px solid #78350f;
    box-shadow: 0 4px 10px rgba(0,0,0,0.6);
    background: #000;
    box-sizing: border-box;
  `;

  const coverCanvas = document.createElement('canvas');
  coverCanvas.width = 140;
  coverCanvas.height = 140;
  coverCanvas.style.cssText = `
    image-rendering: pixelated;
    width: 100%;
    height: 100%;
    transition: transform 0.2s ease-out, opacity 0.2s ease-out;
    opacity: 1;
    transform: translateX(0);
  `;
  coverContainer.appendChild(coverCanvas);

  carouselRow.appendChild(btnPrev);
  carouselRow.appendChild(coverContainer);
  carouselRow.appendChild(btnNext);
  contentBgm.appendChild(carouselRow);

  // Equalizer
  const eqContainer = document.createElement('div');
  eqContainer.style.cssText = `
    display: flex;
    gap: 5px;
    justify-content: center;
    align-items: flex-end;
    height: 20px;
    margin-top: 4px;
    margin-bottom: 4px;
  `;
  const eqBars: HTMLDivElement[] = [];
  for (let i = 0; i < 5; i++) {
    const bar = document.createElement('div');
    bar.style.cssText = `
      width: 5px;
      height: 3px;
      background: #fbbf24;
      transition: height 0.08s ease-out;
    `;
    eqContainer.appendChild(bar);
    eqBars.push(bar);
  }
  contentBgm.appendChild(eqContainer);

  // Info Card
  const trackInfoCard = document.createElement('div');
  trackInfoCard.style.cssText = `
    background: #111827;
    border: 2px solid #334155;
    padding: 8px;
    width: 100%;
    max-width: 320px;
    box-sizing: border-box;
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 4px;
    box-shadow: inset -2px -2px 0px #000, 2px 2px 0px #000;
  `;
  contentBgm.appendChild(trackInfoCard);

  // Control Buttons
  const bgmControlsContainer = document.createElement('div');
  bgmControlsContainer.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
    max-width: 320px;
    box-sizing: border-box;
    margin-top: 4px;
  `;
  contentBgm.appendChild(bgmControlsContainer);

  const btnPreview = document.createElement('button');
  btnPreview.style.cssText = `
    background: #1e293b;
    border: 2px solid #64748b;
    color: #ffffff;
    font-weight: bold;
    font-family: monospace;
    font-size: 13px;
    padding: 8px;
    cursor: pointer;
    box-shadow: inset -2px -2px 0px #000, 2px 2px 0px #000;
  `;

  const btnSelectMain = document.createElement('button');
  btnSelectMain.style.cssText = `
    background: #16a34a;
    border: 2px solid #4ade80;
    color: #ffffff;
    font-weight: 900;
    font-family: monospace;
    font-size: 13px;
    padding: 10px;
    cursor: pointer;
    box-shadow: inset -2px -2px 0px #14532d, 2px 2px 0px #000;
    text-transform: uppercase;
  `;
  bgmControlsContainer.appendChild(btnPreview);
  bgmControlsContainer.appendChild(btnSelectMain);

  const drawCoverOnCanvas = (canvas: HTMLCanvasElement, textureKey: string) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 140, 140);
    ctx.imageSmoothingEnabled = false;

    const game = (window as any).phaserGame;
    if (game) {
      const texture = game.textures.get(textureKey);
      if (texture && texture.key !== '__MISSING') {
        const source = texture.getSourceImage();
        if (source) {
          ctx.drawImage(source, 0, 0, 140, 140);
          return;
        }
      }
    }

    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, 140, 140);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, 132, 132);
    ctx.fillStyle = '#fbbf24';
    ctx.font = '10px monospace';
    ctx.fillText('LOADING COVER...', 20, 70);
  };

  const updateInfoAndButtons = () => {
    const track = bgmTracks[bgmCurrentIndex];
    const isMainTheme = soundEngine.getSelectedTrack() === track.id;
    const isPlayingCurrent = soundEngine.isMusicOn() && soundEngine.getSelectedTrack() === track.id;

    trackInfoCard.innerHTML = `
      <div style="font-size: 13px; font-weight: 900; color: #fbbf24; text-transform: uppercase; letter-spacing: 1px;">
        ${track.name}
      </div>
      <div style="font-size: 10px; color: #94a3b8; font-weight: bold; line-height: 1.3; min-height: 28px; display: flex; align-items: center; justify-content: center;">
        ${track.genre}
      </div>
      <div style="font-size: 11px; color: #38bdf8; font-weight: 900; letter-spacing: 1px; margin-top: 2px;">
        ТЕМА ${bgmCurrentIndex + 1} / 9
      </div>
    `;

    if (isPlayingCurrent) {
      btnPreview.innerHTML = '⏸ ПАУЗА';
      btnPreview.style.background = '#991b1b';
      btnPreview.style.borderColor = '#f87171';
    } else {
      btnPreview.innerHTML = '▶ СЛУШАТЬ ПРЕВЬЮ';
      btnPreview.style.background = '#1e293b';
      btnPreview.style.borderColor = '#64748b';
    }

    if (isMainTheme) {
      btnSelectMain.innerHTML = '✓ УСТАНОВЛЕНО';
      btnSelectMain.style.background = '#15803d';
      btnSelectMain.style.borderColor = '#4ade80';
      btnSelectMain.style.color = '#fff';
      btnSelectMain.disabled = true;
      btnSelectMain.style.cursor = 'default';
    } else {
      btnSelectMain.innerHTML = ' ВЫБРАТЬ КАК ГЛАВНУЮ ТЕМУ ';
      btnSelectMain.style.background = '#1e3a8a';
      btnSelectMain.style.borderColor = '#60a5fa';
      btnSelectMain.style.color = '#fff';
      btnSelectMain.disabled = false;
      btnSelectMain.style.cursor = 'pointer';
    }
  };

  const changeTrackWithAnimation = (dir: 'left' | 'right') => {
    soundEngine.playClick();
    const transitionOffset = dir === 'left' ? 20 : -20;
    
    coverCanvas.style.transition = 'transform 0.15s ease-in, opacity 0.15s ease-in';
    coverCanvas.style.transform = `translateX(${transitionOffset}px)`;
    coverCanvas.style.opacity = '0';

    setTimeout(() => {
      if (dir === 'left') {
        bgmCurrentIndex = (bgmCurrentIndex - 1 + bgmTracks.length) % bgmTracks.length;
      } else {
        bgmCurrentIndex = (bgmCurrentIndex + 1) % bgmTracks.length;
      }

      const track = bgmTracks[bgmCurrentIndex];
      drawCoverOnCanvas(coverCanvas, track.coverTexture);
      updateInfoAndButtons();

      coverCanvas.style.transition = 'none';
      coverCanvas.style.transform = `translateX(${-transitionOffset}px)`;
      
      coverCanvas.offsetHeight; // force reflow

      coverCanvas.style.transition = 'transform 0.15s ease-out, opacity 0.15s ease-out';
      coverCanvas.style.transform = 'translateX(0)';
      coverCanvas.style.opacity = '1';
    }, 150);
  };

  btnPrev.onclick = () => changeTrackWithAnimation('left');
  btnNext.onclick = () => changeTrackWithAnimation('right');

  btnPreview.onclick = () => {
    soundEngine.playClick();
    const track = bgmTracks[bgmCurrentIndex];
    const isPlayingCurrent = soundEngine.isMusicOn() && soundEngine.getSelectedTrack() === track.id;

    if (isPlayingCurrent) {
      soundEngine.stopMusic();
    } else {
      soundEngine.selectTrack(track.id);
    }
    updateInfoAndButtons();
  };

  btnSelectMain.onclick = async () => {
    soundEngine.playClick();
    const track = bgmTracks[bgmCurrentIndex];
    soundEngine.selectTrack(track.id);

    localStorage.setItem('selected_bgm', track.id);
    localStorage.setItem('fb_selected_track', track.id);

    saveUserDataToCloud().catch(err => console.error('[Firestore Sync Error]:', err));
    updateInfoAndButtons();
  };

  eqInterval = setInterval(() => {
    const track = bgmTracks[bgmCurrentIndex];
    const isPlayingCurrent = soundEngine.isMusicOn() && soundEngine.getSelectedTrack() === track.id;

    eqBars.forEach(bar => {
      if (isPlayingCurrent) {
        const height = Math.floor(Math.random() * 15) + 3;
        bar.style.height = `${height}px`;
      } else {
        bar.style.height = '3px';
      }
    });
  }, 100);

  setTimeout(() => {
    drawCoverOnCanvas(coverCanvas, bgmTracks[bgmCurrentIndex].coverTexture);
    updateInfoAndButtons();
  }, 50);

  // ================= TAB 1: ЗВУКИ =================
  const btnMusic = document.createElement('button');
  const updateMusicText = () => {
    const on = soundEngine.isMusicOn();
    btnMusic.innerHTML = on
      ? '🎵 МУЗЫКА: <span style="color:#4ade80">[ ВКЛЮЧЕНА ]</span>'
      : '🎵 МУЗЫКА: <span style="color:#f87171">[ ВЫКЛЮЧЕНА ]</span>';
  };
  updateMusicText();
  btnMusic.style.cssText = `
    background: #1e293b;
    border: 3px solid #64748b;
    color: #ffffff;
    font-weight: bold;
    font-family: monospace;
    font-size: 13.5px;
    padding: 10px;
    cursor: pointer;
    box-shadow: inset -2px -2px 0px #000, 2px 2px 0px #000;
  `;
  btnMusic.onclick = () => {
    soundEngine.toggleMusic();
    updateMusicText();
  };

  const btnSfx = document.createElement('button');
  const updateSfxText = () => {
    const on = soundEngine.isSfxOn();
    btnSfx.innerHTML = on
      ? '🔊 ЗВУКИ ЭФФЕКТОВ: <span style="color:#4ade80">[ ВКЛ ]</span>'
      : '🔊 ЗВУКИ ЭФФЕКТОВ: <span style="color:#f87171">[ ВЫКЛ ]</span>';
  };
  updateSfxText();
  btnSfx.style.cssText = `
    background: #1e293b;
    border: 3px solid #64748b;
    color: #ffffff;
    font-weight: bold;
    font-family: monospace;
    font-size: 13.5px;
    padding: 10px;
    cursor: pointer;
    box-shadow: inset -2px -2px 0px #000, 2px 2px 0px #000;
  `;
  btnSfx.onclick = () => {
    soundEngine.toggleSfx();
    updateSfxText();
  };

  const btnMuteAll = document.createElement('button');
  btnMuteAll.textContent = '🔇 [ ВЫКЛЮЧИТЬ ВСЕ ЗВУКИ ]';
  btnMuteAll.style.cssText = `
    background: transparent;
    border: 2px dashed #ef4444;
    color: #ef4444;
    font-weight: bold;
    font-family: monospace;
    font-size: 13px;
    padding: 8px;
    cursor: pointer;
    margin-top: 4px;
  `;
  btnMuteAll.onclick = () => {
    soundEngine.setMuteAll(true);
    updateMusicText();
    updateSfxText();
  };

  contentSound.appendChild(btnMusic);
  contentSound.appendChild(btnSfx);
  contentSound.appendChild(btnMuteAll);

  // ================= TAB 2: УПРАВЛЕНИЕ =================
  const isPC = localStorage.getItem('fb_is_pc') === 'true';
  const btnCtrl = document.createElement('button');
  let currentPC = isPC;
  const updateCtrlText = () => {
    btnCtrl.innerHTML = currentPC
      ? '🕹️ РЕЖИМ: <span style="color:#facc15">[ КЛАВИАТУРА ПК ]</span>'
      : '🕹️ РЕЖИМ: <span style="color:#38bdf8">[ ДЖОЙСТИК ТЕЛЕФОН ]</span>';
  };
  updateCtrlText();
  btnCtrl.style.cssText = `
    background: #1e293b;
    border: 3px solid #64748b;
    color: #ffffff;
    font-weight: bold;
    font-family: monospace;
    font-size: 13.5px;
    padding: 10px;
    cursor: pointer;
    box-shadow: inset -2px -2px 0px #000, 2px 2px 0px #000;
  `;
  btnCtrl.onclick = () => {
    soundEngine.playClick();
    currentPC = !currentPC;
    localStorage.setItem('fb_is_pc', currentPC ? 'true' : 'false');
    updateCtrlText();
  };

  // Custom Controls Editor Button
  const btnCustomizeControls = document.createElement('button');
  btnCustomizeControls.innerHTML = `
    <div style="font-size: 14px; font-weight: 900; color: #ffffff;">🎮 ИЗМЕНИТЬ КНОПКИ И ИХ РАЗМЕРЫ</div>
    <div style="font-size: 10.5px; color: #7dd3fc; margin-top: 2px;">Перетаскивайте и меняйте размер [➕/➖] каждой кнопки!</div>
  `;
  btnCustomizeControls.style.cssText = `
    background: #0284c7;
    border: 3px solid #38bdf8;
    color: #ffffff;
    font-family: monospace;
    padding: 11px;
    cursor: pointer;
    box-shadow: inset -2px -2px 0px #0369a1, 2px 2px 0px #000;
  `;
  btnCustomizeControls.onclick = () => {
    soundEngine.playClick();
    overlay.remove();
    showHTMLControlsCustomizer(() => {
      showHTMLSettingsModal(onBack);
    });
  };

  const btnAttackRadius = document.createElement('button');
  let showRadius = getShowAttackRange();
  const updateAttackRadiusText = () => {
    btnAttackRadius.innerHTML = showRadius
      ? '🎯 РАДИУС АТАКИ: <span style="color:#4ade80">[ ВКЛ ]</span>'
      : '🎯 РАДИУС АТАКИ: <span style="color:#f87171">[ ВЫКЛ ]</span>';
  };
  updateAttackRadiusText();
  btnAttackRadius.style.cssText = `
    background: #1e293b;
    border: 3px solid #64748b;
    color: #ffffff;
    font-weight: bold;
    font-family: monospace;
    font-size: 13px;
    padding: 9px;
    cursor: pointer;
    box-shadow: inset -2px -2px 0px #000, 2px 2px 0px #000;
  `;
  btnAttackRadius.onclick = () => {
    soundEngine.playClick();
    showRadius = !showRadius;
    setShowAttackRange(showRadius);
    updateAttackRadiusText();
  };

  const btnResetControls = document.createElement('button');
  btnResetControls.textContent = '🔄 СБРОСИТЬ ВСЕ ПОЗИЦИИ И РАЗМЕРЫ';
  btnResetControls.style.cssText = `
    background: #334155;
    border: 2px solid #94a3b8;
    color: #e2e8f0;
    font-weight: bold;
    font-family: monospace;
    font-size: 12.5px;
    padding: 9px;
    cursor: pointer;
    box-shadow: inset -2px -2px 0px #000, 2px 2px 0px #000;
  `;
  btnResetControls.onclick = () => {
    soundEngine.playClick();
    resetCustomControlsLayout();
    btnResetControls.textContent = '✅ ВСЕ НАСТРОЙКИ СБРОШЕНЫ!';
    setTimeout(() => {
      btnResetControls.textContent = '🔄 СБРОСИТЬ ВСЕ ПОЗИЦИИ И РАЗМЕРЫ';
    }, 1500);
  };

  contentCtrl.appendChild(btnCtrl);
  contentCtrl.appendChild(btnCustomizeControls);
  contentCtrl.appendChild(btnAttackRadius);
  contentCtrl.appendChild(btnResetControls);

  const infoCard = document.createElement('div');
  infoCard.style.cssText = `
    background: #1e293b;
    border: 2px solid #475569;
    padding: 10px;
    text-align: left;
    font-size: 11px;
    line-height: 1.4;
    color: #cbd5e1;
    display: flex;
    flex-direction: column;
    gap: 6px;
    box-shadow: inset -2px -2px 0px #000, 2px 2px 0px #000;
  `;
  infoCard.innerHTML = `
    <div><b style="color:#38bdf8;">ПК Управление:</b> WASD — бег, Пробел — атака, 1/2/3 или Q/E/R — навыки.</div>
    <div><b style="color:#4ade80;">На телефоне:</b> Нажмите «Изменить кнопки», чтобы перетаскивать их и менять размер каждой кнопки!</div>
  `;
  contentCtrl.appendChild(infoCard);

  scrollBody.appendChild(contentSound);
  scrollBody.appendChild(contentCtrl);
  scrollBody.appendChild(contentBgm);
  box.appendChild(scrollBody);

  updateTabStyles();

  // Footer close/back button
  const footerRow = document.createElement('div');
  footerRow.style.cssText = `
    border-top: 2px solid #334155;
    padding-top: 8px;
    margin-top: 8px;
    flex-shrink: 0;
  `;

  const bottomCloseBtn = document.createElement('button');
  bottomCloseBtn.textContent = '◀ НАЗАД В ИГРУ';
  bottomCloseBtn.style.cssText = `
    width: 100%;
    background: #334155;
    border: 2px solid #94a3b8;
    color: #ffffff;
    font-weight: bold;
    font-family: monospace;
    font-size: 14px;
    padding: 9px;
    cursor: pointer;
    box-shadow: inset -2px -2px 0px #000, 2px 2px 0px #000;
  `;
  bottomCloseBtn.onclick = () => {
    soundEngine.playClick();
    if (eqInterval) clearInterval(eqInterval);
    overlay.remove();
    onBack();
  };

  footerRow.appendChild(bottomCloseBtn);
  box.appendChild(footerRow);

  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

export function showHTMLPauseModal(options: {
  sceneTitle: string;
  onResume: () => void;
  onExit: () => void;
  exitText?: string;
}) {
  const oldModal = document.getElementById('game-dom-pause-modal');
  if (oldModal) oldModal.remove();

  const overlay = document.createElement('div');
  overlay.id = 'game-dom-pause-modal';
  overlay.style.cssText = `
    position: fixed;
    top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(0, 0, 0, 0.85);
    display: flex; align-items: center; justify-content: center;
    z-index: 99999;
    font-family: monospace;
    color: white;
  `;

  const box = document.createElement('div');
  box.style.cssText = `
    background: #18201a;
    border: 4px solid #4ade80;
    border-radius: 12px;
    padding: 24px;
    width: 85%;
    max-width: 360px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.8);
    display: flex;
    flex-direction: column;
    gap: 14px;
    text-align: center;
  `;

  const titleEl = document.createElement('div');
  titleEl.style.cssText = 'font-size: 20px; font-weight: bold; color: #4ade80; margin-bottom: 6px;';
  titleEl.textContent = `⏸ ${options.sceneTitle}`;

  const btnResume = document.createElement('button');
  btnResume.textContent = '▶ ПРОДОЛЖИТЬ';
  btnResume.style.cssText = `
    background: #16a34a;
    border: 2px solid #4ade80;
    color: white;
    font-weight: bold;
    font-family: monospace;
    font-size: 15px;
    padding: 12px;
    border-radius: 6px;
    cursor: pointer;
  `;

  const btnSettings = document.createElement('button');
  btnSettings.textContent = '⚙ НАСТРОЙКИ';
  btnSettings.style.cssText = `
    background: #334155;
    border: 2px solid #94a3b8;
    color: white;
    font-weight: bold;
    font-family: monospace;
    font-size: 15px;
    padding: 12px;
    border-radius: 6px;
    cursor: pointer;
  `;

  const btnExit = document.createElement('button');
  btnExit.textContent = options.exitText || '🚪 ВЫЙТИ В ХАБ';
  btnExit.style.cssText = `
    background: #991b1b;
    border: 2px solid #f87171;
    color: white;
    font-weight: bold;
    font-family: monospace;
    font-size: 15px;
    padding: 12px;
    border-radius: 6px;
    cursor: pointer;
  `;

  btnResume.onclick = () => {
    soundEngine.playClick();
    overlay.remove();
    options.onResume();
  };

  btnSettings.onclick = () => {
    soundEngine.playClick();
    overlay.remove();
    showHTMLSettingsModal(() => showHTMLPauseModal(options));
  };

  btnExit.onclick = () => {
    soundEngine.playClick();
    overlay.remove();
    options.onExit();
  };

  box.appendChild(titleEl);
  box.appendChild(btnResume);
  box.appendChild(btnSettings);
  box.appendChild(btnExit);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

export function showHTMLDungeonSelectionModal(
  onSelect: (dungeonType: 'standard' | 'butcher') => void,
  onCancel: () => void
) {
  const oldModal = document.getElementById('game-dom-dungeon-select-modal');
  if (oldModal) oldModal.remove();

  const overlay = document.createElement('div');
  overlay.id = 'game-dom-dungeon-select-modal';
  overlay.style.cssText = `
    position: fixed;
    top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(0, 0, 0, 0.88);
    display: flex; align-items: center; justify-content: center;
    z-index: 100000;
    font-family: monospace;
    color: white;
    image-rendering: pixelated;
    padding: 12px;
    box-sizing: border-box;
  `;

  const box = document.createElement('div');
  box.style.cssText = `
    background: #0f172a;
    border: 4px solid #facc15;
    outline: 3px solid #78350f;
    box-shadow: 0 0 0 4px #000, 0 12px 35px rgba(0,0,0,0.95);
    padding: 20px;
    width: 95%;
    max-width: 440px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    text-align: center;
    box-sizing: border-box;
  `;

  const titleEl = document.createElement('div');
  titleEl.style.cssText = `
    font-size: 18px;
    font-weight: 900;
    color: #facc15;
    letter-spacing: 1px;
    text-shadow: 2px 2px 0px #000;
    text-transform: uppercase;
    border-bottom: 2px solid #334155;
    padding-bottom: 8px;
  `;
  titleEl.textContent = '⚔️ ВЫБОР ПОДЗЕМЕЛЬЯ ⚔️';

  const descEl = document.createElement('div');
  descEl.style.cssText = 'font-size: 11px; color: #94a3b8; line-height: 1.4;';
  descEl.textContent = 'Выберите тип похода. Каждый поход генерирует случайную карту и имеет уникальные опасности.';

  // Standard Option
  const btnStandard = document.createElement('button');
  btnStandard.style.cssText = `
    background: #1e293b;
    border: 3px solid #38bdf8;
    color: white;
    padding: 14px;
    cursor: pointer;
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 4px;
    box-shadow: inset -2px -2px 0px #000, 2px 2px 0px #000;
  `;
  btnStandard.innerHTML = `
    <div style="font-size: 14px; font-weight: 900; color: #38bdf8;">🧱 ЗАБРОШЕННЫЕ ПОДЗЕМЕЛЬЯ</div>
    <div style="font-size: 10px; color: #fbbf24; font-weight: bold;">БИОМ I • ДРЕВНИЕ КАТАКОМБЫ</div>
    <div style="font-size: 10px; color: #94a3b8; line-height: 1.3; margin-top: 2px;">Канонический поход сквозь склепы. Финальные боссы: Проклятый Рыцарь и Владыка Бездны.</div>
  `;
  btnStandard.onclick = () => {
    overlay.remove();
    onSelect('standard');
  };

  // Butcher Option
  const btnButcher = document.createElement('button');
  btnButcher.style.cssText = `
    background: #270c12;
    border: 3px solid #ef4444;
    color: white;
    padding: 14px;
    cursor: pointer;
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 4px;
    box-shadow: inset -2px -2px 0px #000, 2px 2px 0px #000;
  `;
  btnButcher.innerHTML = `
    <div style="font-size: 14px; font-weight: 900; color: #ef4444;">🩸 ПОДЗЕМЕЛЬЕ МЯСНИКА</div>
    <div style="font-size: 10px; color: #f97316; font-weight: bold;">БИОМ I • ЛОГОВО МЯСНИКА</div>
    <div style="font-size: 10px; color: #cbd5e1; line-height: 1.3; margin-top: 2px;">Кровавые склепы, кишащие безумием. Встречайте Мясников повсюду. В конце вас ждет ЛЕГЕНДАРНЫЙ МЯСНИК!</div>
  `;
  btnButcher.onclick = () => {
    overlay.remove();
    onSelect('butcher');
  };

  const btnCancel = document.createElement('button');
  btnCancel.textContent = '✕ ОТМЕНА';
  btnCancel.style.cssText = `
    background: #1e1b4b;
    border: 2px solid #ef4444;
    color: #ef4444;
    font-size: 12px;
    font-weight: bold;
    font-family: monospace;
    padding: 10px;
    cursor: pointer;
    box-shadow: 2px 2px 0px #000;
  `;
  btnCancel.onclick = () => {
    overlay.remove();
    onCancel();
  };

  box.appendChild(titleEl);
  box.appendChild(descEl);
  box.appendChild(btnStandard);
  box.appendChild(btnButcher);
  box.appendChild(btnCancel);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

export function showHTMLDungeonLobbyModal(options: {
  onSolo: () => void;
  onCreateRoom: () => void;
  onBrowseServers: () => void;
  onClose: () => void;
}) {
  const oldModal = document.getElementById('game-dom-dungeon-lobby-modal');
  if (oldModal) oldModal.remove();

  const overlay = document.createElement('div');
  overlay.id = 'game-dom-dungeon-lobby-modal';
  overlay.style.cssText = `
    position: fixed;
    top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(0, 0, 0, 0.85);
    display: flex; align-items: center; justify-content: center;
    z-index: 100000;
    font-family: monospace;
    color: white;
    padding: 14px;
    box-sizing: border-box;
  `;

  const box = document.createElement('div');
  box.style.cssText = `
    background: #0f172a;
    border: 3px solid #f59e0b;
    border-radius: 12px;
    box-shadow: 0 12px 35px rgba(0,0,0,0.9), 0 0 20px rgba(245, 158, 11, 0.2);
    padding: 22px;
    width: 95%;
    max-width: 420px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    text-align: center;
    box-sizing: border-box;
  `;

  const titleEl = document.createElement('div');
  titleEl.style.cssText = `
    font-size: 19px;
    font-weight: 900;
    color: #fcd34d;
    letter-spacing: 1px;
    border-bottom: 2px solid #334155;
    padding-bottom: 8px;
  `;
  titleEl.textContent = '⚔️ ПОДЗЕМЕЛЬЕ • ВЫБОР РЕЖИМА';

  // Solo button
  const btnSolo = document.createElement('button');
  btnSolo.style.cssText = `
    background: linear-gradient(135deg, #1e293b, #0f172a);
    border: 2px solid #f59e0b;
    border-radius: 8px;
    padding: 14px;
    cursor: pointer;
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 4px;
    transition: transform 0.1s, border-color 0.1s;
  `;
  btnSolo.innerHTML = `
    <div style="font-size: 15px; font-weight: 900; color: #fcd34d;">🛡️ СОЛО ПОХОД</div>
    <div style="font-size: 11px; color: #94a3b8;">Одиночное испытание • Случайная генерация склепов • Все боссы</div>
  `;
  btnSolo.onclick = () => {
    soundEngine.playClick();
    overlay.remove();
    options.onSolo();
  };

  // Create Room button
  const btnCreate = document.createElement('button');
  btnCreate.style.cssText = `
    background: linear-gradient(135deg, #064e3b, #022c22);
    border: 2px solid #34d399;
    border-radius: 8px;
    padding: 14px;
    cursor: pointer;
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 4px;
    transition: transform 0.1s;
  `;
  btnCreate.innerHTML = `
    <div style="font-size: 15px; font-weight: 900; color: #6ee7b7;">➕ СОЗДАТЬ КОМНАТУ (ОНЛАЙН)</div>
    <div style="font-size: 11px; color: #a7f3d0;">Кооперативный поход • Пароли, приватные коды и воскрешение</div>
  `;
  btnCreate.onclick = () => {
    soundEngine.playClick();
    overlay.remove();
    options.onCreateRoom();
  };

  // Join Room button
  const btnJoin = document.createElement('button');
  btnJoin.style.cssText = `
    background: linear-gradient(135deg, #312e81, #1e1b4b);
    border: 2px solid #a855f7;
    border-radius: 8px;
    padding: 14px;
    cursor: pointer;
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 4px;
  `;
  btnJoin.innerHTML = `
    <div style="font-size: 15px; font-weight: 900; color: #c084fc;">🚪 ВОЙТИ В КОМНАТУ / СЕРВЕРЫ</div>
    <div style="font-size: 11px; color: #e9d5ff;">Список открытых комнат • Вход по коду • Быстрый подбор</div>
  `;
  btnJoin.onclick = () => {
    soundEngine.playClick();
    overlay.remove();
    options.onBrowseServers();
  };

  // Cancel button
  const btnCancel = document.createElement('button');
  btnCancel.textContent = '✕ ЗАКРЫТЬ';
  btnCancel.style.cssText = `
    background: #334155;
    border: 2px solid #64748b;
    border-radius: 6px;
    color: #cbd5e1;
    font-size: 13px;
    font-weight: bold;
    font-family: monospace;
    padding: 10px;
    cursor: pointer;
    margin-top: 4px;
  `;
  btnCancel.onclick = () => {
    soundEngine.playClick();
    overlay.remove();
    options.onClose();
  };

  box.appendChild(titleEl);
  box.appendChild(btnSolo);
  box.appendChild(btnCreate);
  box.appendChild(btnJoin);
  box.appendChild(btnCancel);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

export function showHTMLPvPLobbyModal(options: {
  onQuickMatch: () => void;
  onRanked: () => void;
  onCreateLobby: () => void;
  onBrowseRooms: () => void;
  onClose: () => void;
}) {
  const oldModal = document.getElementById('game-dom-pvp-lobby-modal');
  if (oldModal) oldModal.remove();

  const overlay = document.createElement('div');
  overlay.id = 'game-dom-pvp-lobby-modal';
  overlay.style.cssText = `
    position: fixed;
    top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(0, 0, 0, 0.85);
    display: flex; align-items: center; justify-content: center;
    z-index: 100000;
    font-family: monospace;
    color: white;
    padding: 14px;
    box-sizing: border-box;
  `;

  const box = document.createElement('div');
  box.style.cssText = `
    background: #0f172a;
    border: 3px solid #38bdf8;
    border-radius: 12px;
    box-shadow: 0 12px 35px rgba(0,0,0,0.9), 0 0 20px rgba(56, 189, 248, 0.2);
    padding: 22px;
    width: 95%;
    max-width: 420px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    text-align: center;
    box-sizing: border-box;
  `;

  const titleEl = document.createElement('div');
  titleEl.style.cssText = `
    font-size: 19px;
    font-weight: 900;
    color: #38bdf8;
    letter-spacing: 1px;
    border-bottom: 2px solid #334155;
    padding-bottom: 8px;
  `;
  titleEl.textContent = '⚔️ PVP АРЕНА • ВЫБОР РЕЖИМА';

  // Quick Match
  const btnQuick = document.createElement('button');
  btnQuick.style.cssText = `
    background: linear-gradient(135deg, #1e293b, #0f172a);
    border: 2px solid #38bdf8;
    border-radius: 8px;
    padding: 14px;
    cursor: pointer;
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 4px;
  `;
  btnQuick.innerHTML = `
    <div style="font-size: 15px; font-weight: 900; color: #38bdf8;">⚡ БЫСТРЫЙ БОЙ (MOBA)</div>
    <div style="font-size: 11px; color: #94a3b8;">1v1, 2v2, 3v3, 4v4 • Мгновенный бой против ботов и игроков</div>
  `;
  btnQuick.onclick = () => {
    soundEngine.playClick();
    overlay.remove();
    options.onQuickMatch();
  };

  // Ranked
  const btnRanked = document.createElement('button');
  btnRanked.style.cssText = `
    background: linear-gradient(135deg, #451a03, #271003);
    border: 2px solid #f59e0b;
    border-radius: 8px;
    padding: 14px;
    cursor: pointer;
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 4px;
  `;
  btnRanked.innerHTML = `
    <div style="font-size: 15px; font-weight: 900; color: #facc15;">🏆 РЕЙТИНГОВЫЙ МАТЧ</div>
    <div style="font-size: 11px; color: #fde68a;">Подбор по рангу • Защита и захват башен • Рейтинговые кубки</div>
  `;
  btnRanked.onclick = () => {
    soundEngine.playClick();
    overlay.remove();
    options.onRanked();
  };

  // Create Custom Room
  const btnCreate = document.createElement('button');
  btnCreate.style.cssText = `
    background: linear-gradient(135deg, #064e3b, #022c22);
    border: 2px solid #34d399;
    border-radius: 8px;
    padding: 14px;
    cursor: pointer;
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 4px;
  `;
  btnCreate.innerHTML = `
    <div style="font-size: 15px; font-weight: 900; color: #6ee7b7;">➕ СОЗДАТЬ ЛОББИ</div>
    <div style="font-size: 11px; color: #a7f3d0;">Настраиваемый матч с ботами и друзьями</div>
  `;
  btnCreate.onclick = () => {
    soundEngine.playClick();
    overlay.remove();
    options.onCreateLobby();
  };

  // Browse Rooms
  const btnBrowse = document.createElement('button');
  btnBrowse.style.cssText = `
    background: linear-gradient(135deg, #312e81, #1e1b4b);
    border: 2px solid #a855f7;
    border-radius: 8px;
    padding: 14px;
    cursor: pointer;
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 4px;
  `;
  btnBrowse.innerHTML = `
    <div style="font-size: 15px; font-weight: 900; color: #c084fc;">🚪 СПИСОК КОМНАТ</div>
    <div style="font-size: 11px; color: #e9d5ff;">Поиск активных открытых пользовательских матчей</div>
  `;
  btnBrowse.onclick = () => {
    soundEngine.playClick();
    overlay.remove();
    options.onBrowseRooms();
  };

  // Cancel
  const btnCancel = document.createElement('button');
  btnCancel.textContent = '✕ ЗАКРЫТЬ';
  btnCancel.style.cssText = `
    background: #334155;
    border: 2px solid #64748b;
    border-radius: 6px;
    color: #cbd5e1;
    font-size: 13px;
    font-weight: bold;
    font-family: monospace;
    padding: 10px;
    cursor: pointer;
    margin-top: 4px;
  `;
  btnCancel.onclick = () => {
    soundEngine.playClick();
    overlay.remove();
    options.onClose();
  };

  box.appendChild(titleEl);
  box.appendChild(btnQuick);
  box.appendChild(btnRanked);
  box.appendChild(btnCreate);
  box.appendChild(btnBrowse);
  box.appendChild(btnCancel);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

export function showHTMLNoticeBoardModal(options?: {
  initialTab?: 'contracts' | 'ladder' | 'news';
  onClose?: () => void;
}) {
  const oldModal = document.getElementById('game-dom-notice-board-modal');
  if (oldModal) oldModal.remove();

  let activeTab: 'contracts' | 'ladder' | 'news' = options?.initialTab || 'contracts';

  const overlay = document.createElement('div');
  overlay.id = 'game-dom-notice-board-modal';
  overlay.style.cssText = `
    position: fixed;
    top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(0, 0, 0, 0.88);
    display: flex; align-items: center; justify-content: center;
    z-index: 100000;
    font-family: Consolas, monospace;
    color: white;
    padding: 12px;
    box-sizing: border-box;
  `;

  const box = document.createElement('div');
  box.style.cssText = `
    background: #0f172a;
    border: 4px solid #f59e0b;
    outline: 3px solid #78350f;
    box-shadow: 0 0 0 4px #000, 0 12px 35px rgba(0,0,0,0.95);
    padding: 16px 18px;
    width: 95%;
    max-width: 840px;
    max-height: 88vh;
    display: flex;
    flex-direction: column;
    position: relative;
    box-sizing: border-box;
    overflow: hidden;
  `;

  // Header Row
  const headerRow = document.createElement('div');
  headerRow.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid #334155;
    padding-bottom: 8px;
    margin-bottom: 10px;
    flex-shrink: 0;
  `;

  const titleEl = document.createElement('div');
  titleEl.style.cssText = `
    font-size: 16px;
    font-weight: 900;
    color: #facc15;
    letter-spacing: 1.5px;
    text-shadow: 2px 2px 0px #000;
    text-transform: uppercase;
  `;
  titleEl.textContent = '📜 ДОСКА ОБЪЯВЛЕНИЙ КАТАКОМБ';

  const cornerClose = document.createElement('button');
  cornerClose.textContent = '✕ ЗАКРЫТЬ';
  cornerClose.style.cssText = `
    color: #ef4444;
    background: #1e1b4b;
    border: 2px solid #ef4444;
    font-size: 12px;
    font-weight: bold;
    font-family: Consolas, monospace;
    padding: 4px 10px;
    cursor: pointer;
    box-shadow: 2px 2px 0px #000;
    border-radius: 4px;
    flex-shrink: 0;
  `;
  cornerClose.onclick = () => {
    soundEngine.playClick();
    overlay.remove();
    if (options?.onClose) options.onClose();
  };

  headerRow.appendChild(titleEl);
  headerRow.appendChild(cornerClose);
  box.appendChild(headerRow);

  // Tabs Bar
  const tabBar = document.createElement('div');
  tabBar.style.cssText = `
    display: flex;
    gap: 6px;
    margin-bottom: 12px;
    flex-shrink: 0;
  `;

  const btnTabContracts = document.createElement('button');
  const btnTabLadder = document.createElement('button');
  const btnTabNews = document.createElement('button');

  btnTabContracts.textContent = '📜 КОНТРАКТЫ';
  btnTabLadder.textContent = '🏆 ДОСКА ПОЧЕТА';
  btnTabNews.textContent = '📰 НОВОСТИ';

  tabBar.appendChild(btnTabContracts);
  tabBar.appendChild(btnTabLadder);
  tabBar.appendChild(btnTabNews);
  box.appendChild(tabBar);

  // Scrollable Body
  const scrollBody = document.createElement('div');
  scrollBody.style.cssText = `
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding-right: 6px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  `;
  box.appendChild(scrollBody);

  const setTabStyles = () => {
    const getStyle = (tab: string) => `
      flex: 1;
      background: ${activeTab === tab ? '#b45309' : '#1e293b'};
      color: ${activeTab === tab ? '#fef08a' : '#94a3b8'};
      border: ${activeTab === tab ? '2px solid #fde68a' : '2px solid #334155'};
      font-weight: 900;
      font-family: Consolas, monospace;
      font-size: 12px;
      padding: 8px 4px;
      cursor: pointer;
      text-transform: uppercase;
      box-shadow: ${activeTab === tab ? 'inset 0 0 6px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.4)' : 'none'};
      transition: all 0.15s ease;
    `;

    btnTabContracts.style.cssText = getStyle('contracts');
    btnTabLadder.style.cssText = getStyle('ladder');
    btnTabNews.style.cssText = getStyle('news');
  };

  const renderContent = () => {
    setTabStyles();
    scrollBody.innerHTML = '';

    if (activeTab === 'contracts') {
      renderContracts();
    } else if (activeTab === 'ladder') {
      renderLadder();
    } else {
      renderNews();
    }
  };

  btnTabContracts.onclick = () => { soundEngine.playClick(); activeTab = 'contracts'; renderContent(); };
  btnTabLadder.onclick = () => { soundEngine.playClick(); activeTab = 'ladder'; renderContent(); };
  btnTabNews.onclick = () => { soundEngine.playClick(); activeTab = 'news'; renderContent(); };

  // TAB 1: Daily Contracts
  const renderContracts = () => {
    const today = new Date().toISOString().slice(0, 10);
    const saveKey = `retro_daily_contracts_${today}`;
    const rawSaved = localStorage.getItem(saveKey);

    const dungeonKills = parseInt(localStorage.getItem('stat_dungeon_kills') || '0', 10);
    const floorsCleared = parseInt(localStorage.getItem('stat_floors_cleared') || '0', 10);
    const pvpWins = parseInt(localStorage.getItem('stat_pvp_wins') || '0', 10);

    const contracts = [
      {
        id: 'contract_1',
        title: 'Истребитель нежити',
        description: 'Убить 25 монстров в подземелье',
        icon: '💀',
        target: 25,
        progress: Math.min(25, dungeonKills),
        rewardSkulls: 250,
        rewardPoints: 30,
        rewardShards: 0,
        claimed: false
      },
      {
        id: 'contract_2',
        title: 'Испытание глубин',
        description: 'Зачистить 3 этажа катакомб за один забег',
        icon: '🗝️',
        target: 3,
        progress: Math.min(3, floorsCleared),
        rewardSkulls: 350,
        rewardPoints: 0,
        rewardShards: 1,
        claimed: false
      },
      {
        id: 'contract_3',
        title: 'Арена чести',
        description: 'Победить в 1 матче PvP / Обычного боя',
        icon: '⚔️',
        target: 1,
        progress: Math.min(1, pvpWins),
        rewardSkulls: 200,
        rewardPoints: 50,
        rewardShards: 0,
        claimed: false
      }
    ];

    if (rawSaved) {
      try {
        const parsed = JSON.parse(rawSaved);
        contracts.forEach(c => {
          const found = parsed.find((p: any) => p.id === c.id);
          if (found) {
            c.claimed = found.claimed;
            c.progress = Math.max(c.progress, found.progress);
          }
        });
      } catch (e) {
        console.error(e);
      }
    }

    const saveContracts = () => {
      localStorage.setItem(saveKey, JSON.stringify(contracts));
    };

    const subText = document.createElement('div');
    subText.style.cssText = 'font-size: 11px; color: #94a3b8; text-align: center; margin-bottom: 6px;';
    subText.textContent = `Суточные контракты гильдии обновляются в полночь • Дата: ${today}`;
    scrollBody.appendChild(subText);

    contracts.forEach((c) => {
      const card = document.createElement('div');
      card.style.cssText = `
        background: #1e293b;
        border: 2px solid ${c.claimed ? '#334155' : '#38bdf8'};
        border-radius: 6px;
        padding: 12px;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      `;

      const leftCol = document.createElement('div');
      leftCol.style.cssText = 'display: flex; align-items: center; gap: 12px; flex: 1; min-width: 260px;';

      const iconDiv = document.createElement('div');
      iconDiv.style.cssText = 'font-size: 24px; background: #0f172a; border: 1.5px solid #f59e0b; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 4px; flex-shrink: 0;';
      iconDiv.textContent = c.icon;

      const detailsDiv = document.createElement('div');
      detailsDiv.style.cssText = 'display: flex; flex-direction: column; gap: 3px; flex: 1;';

      const title = document.createElement('div');
      title.style.cssText = 'font-size: 13px; font-weight: bold; color: #f8fafc;';
      title.textContent = `«${c.title}»`;

      const desc = document.createElement('div');
      desc.style.cssText = 'font-size: 11px; color: #cbd5e1;';
      desc.textContent = c.description;

      // Progress bar
      const pct = Math.min(1.0, c.progress / c.target);
      const progRow = document.createElement('div');
      progRow.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-top: 4px;';

      const barBg = document.createElement('div');
      barBg.style.cssText = 'background: #0f172a; border: 1px solid #475569; height: 10px; width: 140px; border-radius: 3px; overflow: hidden;';

      const barFill = document.createElement('div');
      barFill.style.cssText = `background: ${pct >= 1.0 ? '#22c55e' : '#38bdf8'}; height: 100%; width: ${pct * 100}%;`;
      barBg.appendChild(barFill);

      const progVal = document.createElement('div');
      progVal.style.cssText = `font-size: 11px; font-weight: bold; color: ${pct >= 1.0 ? '#4ade80' : '#38bdf8'};`;
      progVal.textContent = `${c.progress} / ${c.target}`;

      progRow.appendChild(barBg);
      progRow.appendChild(progVal);

      detailsDiv.appendChild(title);
      detailsDiv.appendChild(desc);
      detailsDiv.appendChild(progRow);

      leftCol.appendChild(iconDiv);
      leftCol.appendChild(detailsDiv);

      // Right col: rewards + button
      const rightCol = document.createElement('div');
      rightCol.style.cssText = 'display: flex; align-items: center; gap: 12px;';

      let rewardText = `🎁 ${c.rewardSkulls} 💀`;
      if (c.rewardPoints > 0) rewardText += ` +${c.rewardPoints} ⚡`;
      if (c.rewardShards > 0) rewardText += ` +${c.rewardShards} 💎`;

      const rewDiv = document.createElement('div');
      rewDiv.style.cssText = 'font-size: 11px; font-weight: bold; color: #facc15; white-space: nowrap;';
      rewDiv.textContent = rewardText;

      const btnAction = document.createElement('button');
      btnAction.style.cssText = `
        font-family: Consolas, monospace;
        font-size: 11px;
        font-weight: bold;
        padding: 8px 14px;
        border-radius: 4px;
        cursor: pointer;
        min-width: 110px;
      `;

      if (c.claimed) {
        btnAction.textContent = '✔ ПОЛУЧЕНО';
        btnAction.style.background = '#14532d';
        btnAction.style.color = '#4ade80';
        btnAction.style.border = '1.5px solid #22c55e';
        btnAction.disabled = true;
      } else if (c.progress >= c.target) {
        btnAction.textContent = '🎁 ЗАБРАТЬ';
        btnAction.style.background = '#16a34a';
        btnAction.style.color = '#ffffff';
        btnAction.style.border = '2px solid #4ade80';
        btnAction.onclick = () => {
          c.claimed = true;
          saveContracts();
          soundEngine.playLevelUp();
          const econ = loadEconomy();
          econ.rustySkulls += c.rewardSkulls;
          econ.voidShards = (econ.voidShards || 0) + c.rewardShards;
          econ.upgradePoints = (econ.upgradePoints || 0) + c.rewardPoints;
          saveEconomy(econ);
          CloudSyncManager.saveAllProgress();
          renderContent();
        };
      } else {
        btnAction.textContent = 'В ПРОЦЕССЕ';
        btnAction.style.background = '#334155';
        btnAction.style.color = '#94a3b8';
        btnAction.style.border = '1.5px solid #475569';
        btnAction.disabled = true;
      }

      rightCol.appendChild(rewDiv);
      rightCol.appendChild(btnAction);

      card.appendChild(leftCol);
      card.appendChild(rightCol);
      scrollBody.appendChild(card);
    });
  };

  // TAB 2: Ladder Leaderboard
  const renderLadder = async () => {
    const loadingDiv = document.createElement('div');
    loadingDiv.style.cssText = 'text-align: center; color: #facc15; font-size: 13px; padding: 20px;';
    loadingDiv.textContent = '⏳ Загрузка таблицы чемпионов...';
    scrollBody.appendChild(loadingDiv);

    let topPlayers: any[] = [];
    try {
      const q = query(collection(db, 'users'), orderBy('rankedPoints', 'desc'), limit(10));
      const snap = await getDocs(q);
      snap.forEach(doc => {
        const d = doc.data();
        topPlayers.push({
          uid: doc.id,
          displayName: d.displayName || d.username || 'Герой Катакомб',
          tag: d.tag || `#${doc.id.slice(0, 4)}`,
          rankedPoints: typeof d.rankedPoints === 'number' ? d.rankedPoints : 0,
          rankName: d.rankName || (d.rankedPoints >= 1000 ? 'Грандмастер' : d.rankedPoints >= 600 ? 'Мастер' : 'Алмаз'),
          hero: d.selectedHero || 'char_grim',
          dungeonsCleared: d.stats?.dungeonsCleared || 0,
          pvpWins: d.stats?.wins || 0
        });
      });
    } catch (e) {
      console.warn('Leaderboard fetch fallback:', e);
    }

    if (topPlayers.length === 0) {
      topPlayers = [
        { uid: 'top1', displayName: 'ShadowLord', tag: '#1337', rankedPoints: 2450, rankName: 'Грандмастер 🏆', hero: 'char_omen', dungeonsCleared: 120, pvpWins: 85 },
        { uid: 'top2', displayName: 'GrimReaper', tag: '#7777', rankedPoints: 2180, rankName: 'Мастер ⭐', hero: 'char_grim', dungeonsCleared: 95, pvpWins: 72 },
        { uid: 'top3', displayName: 'Vanguard_Alrik', tag: '#4040', rankedPoints: 1940, rankName: 'Мастер ⭐', hero: 'char_alrik', dungeonsCleared: 84, pvpWins: 65 },
        { uid: 'top4', displayName: 'NihilWarlock', tag: '#9999', rankedPoints: 1720, rankName: 'Алмаз 💎', hero: 'char_nihil', dungeonsCleared: 70, pvpWins: 55 },
        { uid: 'top5', displayName: 'BjornBerserk', tag: '#1122', rankedPoints: 1550, rankName: 'Алмаз 💎', hero: 'char_bjorn', dungeonsCleared: 64, pvpWins: 48 },
        { uid: 'top6', displayName: 'KraulNightstalker', tag: '#5555', rankedPoints: 1410, rankName: 'Платина ⚔️', hero: 'char_kraul', dungeonsCleared: 52, pvpWins: 40 },
        { uid: 'top7', displayName: 'TorfGargoyle', tag: '#8888', rankedPoints: 1290, rankName: 'Платина ⚔️', hero: 'char_torf', dungeonsCleared: 46, pvpWins: 35 },
        { uid: 'top8', displayName: 'ZazaVenom', tag: '#3333', rankedPoints: 1150, rankName: 'Золото 🥇', hero: 'char_zaza', dungeonsCleared: 38, pvpWins: 28 },
      ];
    }

    loadingDiv.remove();

    // Table Header
    const th = document.createElement('div');
    th.style.cssText = `
      display: grid;
      grid-template-columns: 70px 1fr 140px 100px;
      padding: 8px 12px;
      background: #0f172a;
      border: 1px solid #334155;
      font-size: 11px;
      font-weight: bold;
      color: #94a3b8;
    `;
    th.innerHTML = `
      <div>РАНГ</div>
      <div>НИКНЕЙМ И ТЕГ</div>
      <div style="text-align:center;">ДИВИЗИОН</div>
      <div style="text-align:right;">ОЧКИ (RP)</div>
    `;
    scrollBody.appendChild(th);

    topPlayers.forEach((player, idx) => {
      const row = document.createElement('div');
      let rowBg = idx % 2 === 0 ? '#1e293b' : '#0f172a';
      let borderCol = '#334155';
      let rankText = `${idx + 1}`;
      let rankCol = '#94a3b8';

      if (idx === 0) {
        rowBg = '#2e1a06';
        borderCol = '#f59e0b';
        rankText = '🥇 1';
        rankCol = '#f59e0b';
      } else if (idx === 1) {
        rowBg = '#1e293b';
        borderCol = '#94a3b8';
        rankText = '🥈 2';
        rankCol = '#e2e8f0';
      } else if (idx === 2) {
        rowBg = '#27170c';
        borderCol = '#d97706';
        rankText = '🥉 3';
        rankCol = '#fb923c';
      }

      row.style.cssText = `
        display: grid;
        grid-template-columns: 70px 1fr 140px 100px;
        align-items: center;
        padding: 8px 12px;
        background: ${rowBg};
        border: 1.5px solid ${borderCol};
        border-radius: 4px;
        font-size: 12px;
        cursor: pointer;
        transition: transform 0.1s ease;
      `;
      row.onmouseenter = () => { row.style.transform = 'scale(1.01)'; };
      row.onmouseleave = () => { row.style.transform = 'scale(1)'; };

      row.innerHTML = `
        <div style="font-weight:bold; color: ${rankCol};">${rankText}</div>
        <div style="font-weight:bold; color: ${idx < 3 ? '#ffffff' : '#e2e8f0'};">${player.displayName} <span style="font-size:10px; color:#94a3b8;">${player.tag}</span></div>
        <div style="text-align:center; color: #38bdf8; font-size: 11px;">${player.rankName}</div>
        <div style="text-align:right; font-weight:bold; color: #facc15;">${player.rankedPoints} RP</div>
      `;

      row.onclick = () => {
        soundEngine.playClick();
        window.dispatchEvent(new CustomEvent('open-public-profile', {
          detail: {
            uid: player.uid,
            displayName: player.displayName,
            tag: player.tag,
            rankedPoints: player.rankedPoints,
            rankName: player.rankName,
            avatar: player.hero,
            stats: {
              dungeonsCleared: player.dungeonsCleared || 0,
              bossesDefeated: 12,
              wins: player.pvpWins || 0
            }
          }
        }));
      };

      scrollBody.appendChild(row);
    });
  };

  // TAB 3: News Feed
  const renderNews = () => {
    const newsList = [
      {
        id: 'news_1',
        date: '29.09.2026',
        badge: '[ ОБНОВЛЕНИЕ ]',
        badgeColor: '#14532d',
        badgeTextColor: '#4ade80',
        title: 'ПАТЧ 1.4.0 • УНИФИКАЦИЯ БОЕВОЙ СИСТЕМЫ И ДОСКА ОБЪЯВЛЕНИЙ',
        content: 'Все способности и эффекты 8 героев теперь строго синхронизированы между Подземельем, Хабом и MOBA Ареной! Добавлена полноценная Доска объявлений с ежедневными контрактами гильдии, Доской почета лучших бойцов и лентой патчноутов.'
      },
      {
        id: 'news_2',
        date: '28.09.2026',
        badge: '[ БАЛАНС ]',
        badgeColor: '#0c4a6e',
        badgeTextColor: '#38bdf8',
        title: 'РЕБАЛАНС ЧЕРНОГО РЫНКА И ВОЛШЕБНЫХ КОТЛОВ В ПОДЗЕМЕЛЬЕ',
        content: 'Волшебные котлы стали строго одноразовыми с динамической стоимостью в зависимости от глубины этажа (60 + floor * 15). Кровавый алтарь Черного рынка получил исправленную зону кликабельности и строгую проверку запаса здоровья.'
      },
      {
        id: 'news_3',
        date: '27.09.2026',
        badge: '[ СОБЫТИЕ ]',
        badgeColor: '#713f12',
        badgeTextColor: '#facc15',
        title: 'СЕЗОН 2: ТЕНЕВЫЕ КАТАКОМБЫ • РЕЙТИНГОВАЯ ГОНКА ЛАДДЕРА',
        content: 'Вступайте в рейтинговые PvP дуэли и групповые битвы 3v3! Зарабатывайте рейтинговые очки RP и займите место на Доске почета. Топ-10 игроков получат уникальные реликвии и титулы в конце сезона.'
      },
      {
        id: 'news_4',
        date: '25.09.2026',
        badge: '[ ОБНОВЛЕНИЕ ]',
        badgeColor: '#14532d',
        badgeTextColor: '#4ade80',
        title: 'ПРОБУЖДЕНИЕ ЧЕРНОКНИЖНИКА НИХИЛА И МЯСНИКА КРАУЛА',
        content: 'Нихил манипулирует гравитационной сингулярностью и вызывает карающие клинки пустоты. Краул крушит врагов смертельной хваткой, нанося глубокое кровотечение и активируя режим жуткой мясорубки.'
      },
      {
        id: 'news_5',
        date: '22.09.2026',
        badge: '[ БАЛАНС ]',
        badgeColor: '#0c4a6e',
        badgeTextColor: '#38bdf8',
        title: 'УЛУЧШЕНИЕ МОБИЛЬНОГО УПРАВЛЕНИЯ И ОПТИМИЗАЦИЯ ДВИЖКА',
        content: 'Полностью переработаны красные джойстики атаки и круговые кнопки навыков. Добавлены интуитивные траектории прицеливания и быстрая зона отмены бросков.'
      }
    ];

    newsList.forEach(news => {
      const card = document.createElement('div');
      card.style.cssText = `
        background: #1e293b;
        border: 2px solid #334155;
        border-radius: 6px;
        padding: 12px 14px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      `;

      const metaRow = document.createElement('div');
      metaRow.style.cssText = 'display: flex; align-items: center; justify-content: space-between;';

      const dateEl = document.createElement('div');
      dateEl.style.cssText = 'font-size: 11px; color: #94a3b8;';
      dateEl.textContent = news.date;

      const badgeEl = document.createElement('div');
      badgeEl.style.cssText = `
        background: ${news.badgeColor};
        color: ${news.badgeTextColor};
        border: 1px solid #475569;
        font-size: 10px;
        font-weight: bold;
        padding: 2px 8px;
        border-radius: 4px;
      `;
      badgeEl.textContent = news.badge;

      metaRow.appendChild(dateEl);
      metaRow.appendChild(badgeEl);

      const titleEl = document.createElement('div');
      titleEl.style.cssText = 'font-size: 13px; font-weight: bold; color: #f8fafc; line-height: 1.3;';
      titleEl.textContent = news.title;

      const contentEl = document.createElement('div');
      contentEl.style.cssText = 'font-size: 11px; color: #cbd5e1; line-height: 1.4;';
      contentEl.textContent = news.content;

      card.appendChild(metaRow);
      card.appendChild(titleEl);
      card.appendChild(contentEl);
      scrollBody.appendChild(card);
    });
  };

  renderContent();
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

export function showHTMLFloorRewardModal(
  heroKey: string,
  appliedCardIds: string[],
  perkPool: any[],
  onSelectPerk: (perk: any) => void
) {
  const oldModal = document.getElementById('game-dom-floor-reward-modal');
  if (oldModal) oldModal.remove();

  const overlay = document.createElement('div');
  overlay.id = 'game-dom-floor-reward-modal';
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 10000;
    background: rgba(2, 6, 23, 0.92);
    backdrop-filter: blur(5px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    font-family: Consolas, "Courier New", monospace;
    user-select: none;
  `;

  overlay.onpointerdown = (e) => e.stopPropagation();
  overlay.ontouchstart = (e) => e.stopPropagation();

  const box = document.createElement('div');
  box.style.cssText = `
    width: 860px;
    max-width: 96vw;
    background: #0f172a;
    border: 3px solid #facc15;
    outline: 2px solid #78350f;
    outline-offset: -6px;
    padding: 24px 20px;
    box-shadow: 0 25px 60px rgba(0,0,0,0.95), 0 0 35px rgba(250, 204, 21, 0.25);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    border-radius: 4px;
  `;

  const header = document.createElement('div');
  header.style.cssText = `
    font-size: 24px;
    font-weight: bold;
    color: #facc15;
    text-align: center;
    letter-spacing: 2px;
    text-shadow: 0 2px 12px rgba(250, 204, 21, 0.6);
  `;
  header.textContent = 'ВЫБЕРИТЕ УСИЛЕНИЕ';

  const subHeader = document.createElement('div');
  subHeader.style.cssText = `
    font-size: 12px;
    color: #94a3b8;
    text-align: center;
    margin-top: -8px;
    font-weight: bold;
  `;
  subHeader.textContent = 'Выберите 1 из 3 перков для продолжения спуска в подземелье';

  const cardsRow = document.createElement('div');
  cardsRow.style.cssText = `
    display: flex;
    gap: 16px;
    width: 100%;
    justify-content: center;
    margin-top: 6px;
    flex-wrap: wrap;
  `;

  // Select 3 random perks matching heroKey or neutral
  const available = perkPool.filter(p => 
    (p.heroKey === heroKey || p.heroKey === 'neutral') && !appliedCardIds.includes(p.id)
  );

  // Fallback
  if (available.length < 3) {
    const neutrals = perkPool.filter(p => p.heroKey === 'neutral');
    available.push(...neutrals);
  }

  // Shuffle array
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }

  const selectedCards = available.slice(0, 3);

  selectedCards.forEach((perk) => {
    const card = document.createElement('div');
    const isHeroPerk = perk.heroKey !== 'neutral';
    const borderColor = isHeroPerk ? '#c084fc' : '#38bdf8';
    const badgeColor = isHeroPerk ? '#9333ea' : '#0284c7';

    card.style.cssText = `
      width: 245px;
      background: #1e293b;
      border: 3px solid ${borderColor};
      padding: 16px 14px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 10px;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      position: relative;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
      border-radius: 4px;
    `;

    // Type Badge
    const badge = document.createElement('div');
    badge.style.cssText = `
      background: ${badgeColor};
      color: #ffffff;
      font-size: 9px;
      font-weight: bold;
      padding: 2px 8px;
      border-radius: 2px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    `;
    badge.textContent = isHeroPerk ? '★ ПЕРК ГЕРОЯ' : '✦ НЕЙТРАЛЬНЫЙ';

    // Icon Container
    const iconBox = document.createElement('div');
    iconBox.style.cssText = `
      width: 64px;
      height: 64px;
      background: #0f172a;
      border: 2px solid ${borderColor};
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      border-radius: 50%;
      box-shadow: inset 0 0 10px rgba(0,0,0,0.8);
      margin-top: 4px;
    `;
    iconBox.textContent = perk.iconEmoji || '⚡';

    // Title
    const titleEl = document.createElement('div');
    titleEl.style.cssText = `
      font-size: 14px;
      font-weight: bold;
      color: ${isHeroPerk ? '#f3e8ff' : '#e0f2fe'};
      line-height: 1.2;
      min-height: 34px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    titleEl.textContent = perk.title;

    // Desc
    const descEl = document.createElement('div');
    descEl.style.cssText = `
      font-size: 11px;
      color: #cbd5e1;
      line-height: 1.4;
      min-height: 52px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    descEl.textContent = perk.desc;

    // Select Button
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.style.cssText = `
      width: 100%;
      padding: 8px;
      background: #16a34a;
      border: 2px solid #86efac;
      color: #ffffff;
      font-family: Consolas, "Courier New", monospace;
      font-size: 13px;
      font-weight: bold;
      cursor: pointer;
      transition: background 0.15s;
      margin-top: 4px;
    `;
    btn.textContent = '[ ВЫБРАТЬ ]';

    card.onmouseenter = () => {
      card.style.transform = 'translateY(-8px) scale(1.03)';
      card.style.borderColor = '#facc15';
      card.style.boxShadow = '0 15px 35px rgba(250, 204, 21, 0.35)';
      btn.style.background = '#22c55e';
    };

    card.onmouseleave = () => {
      card.style.transform = 'translateY(0) scale(1)';
      card.style.borderColor = borderColor;
      card.style.boxShadow = '0 10px 25px rgba(0,0,0,0.5)';
      btn.style.background = '#16a34a';
    };

    let picked = false;
    const handlePick = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      if (picked) return;
      picked = true;
      soundEngine.playLevelUp();
      card.style.transform = 'scale(1.08)';
      card.style.borderColor = '#fef08a';
      card.style.boxShadow = '0 0 40px #fef08a';

      setTimeout(() => {
        overlay.remove();
        onSelectPerk(perk);
      }, 180);
    };

    card.onpointerdown = handlePick;
    card.onclick = handlePick;
    btn.onpointerdown = handlePick;
    btn.onclick = handlePick;

    card.appendChild(badge);
    card.appendChild(iconBox);
    card.appendChild(titleEl);
    card.appendChild(descEl);
    card.appendChild(btn);
    cardsRow.appendChild(card);
  });

  box.appendChild(header);
  box.appendChild(subHeader);
  box.appendChild(cardsRow);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

export function showHTMLBlackMarketModal(options: {
  scene: any;
  onClose: () => void;
}) {
  const oldModal = document.getElementById('game-dom-black-market-modal');
  if (oldModal) oldModal.remove();

  const { scene, onClose } = options;

  const overlay = document.createElement('div');
  overlay.id = 'game-dom-black-market-modal';
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 100000;
    background: rgba(5, 0, 2, 0.94);
    backdrop-filter: blur(6px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    font-family: Consolas, "Courier New", monospace;
    user-select: none;
    box-sizing: border-box;
  `;

  overlay.onpointerdown = (e) => e.stopPropagation();
  overlay.ontouchstart = (e) => e.stopPropagation();

  const box = document.createElement('div');
  box.style.cssText = `
    width: 680px;
    max-width: 96vw;
    max-height: 92vh;
    overflow-y: auto;
    background: #0f0505;
    border: 3px solid #ef4444;
    outline: 2px solid #7f1d1d;
    outline-offset: -6px;
    padding: 22px 20px;
    box-shadow: 0 25px 60px rgba(0,0,0,0.98), 0 0 40px rgba(239, 68, 68, 0.35);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    border-radius: 4px;
    box-sizing: border-box;
  `;

  const header = document.createElement('div');
  header.style.cssText = `
    font-size: 22px;
    font-weight: bold;
    color: #ef4444;
    text-align: center;
    letter-spacing: 2px;
    text-shadow: 0 2px 14px rgba(239, 68, 68, 0.7);
  `;

  let purchasesCount = 0;
  const MAX_PURCHASES = 2;

  const updateHeader = () => {
    header.textContent = purchasesCount >= MAX_PURCHASES
      ? '🩸 ЧЁРНЫЙ РЫНОК • ЛИМИТ ИСЧЕРПАН (2/2) 🩸'
      : `🩸 ЧЁРНЫЙ РЫНОК • ПОКУПКИ: [${purchasesCount}/${MAX_PURCHASES}] 🩸`;
  };
  updateHeader();

  const subHeader = document.createElement('div');
  subHeader.style.cssText = `
    font-size: 11px;
    color: #cbd5e1;
    text-align: center;
    margin-top: -6px;
    line-height: 1.4;
  `;
  subHeader.textContent = 'Кровавый алтарь принимает не более 2 сделок за визит! Заключайте пакты за кровь и золото.';

  // Deals List Container
  const dealsContainer = document.createElement('div');
  dealsContainer.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
    margin-top: 4px;
  `;

  const dealButtons: HTMLButtonElement[] = [];

  const updateButtonsState = () => {
    if (purchasesCount >= MAX_PURCHASES) {
      dealButtons.forEach((b) => {
        b.disabled = true;
        b.textContent = '❌ ЛИМИТ (2/2)';
        b.style.background = '#27272a';
        b.style.borderColor = '#52525b';
        b.style.color = '#71717a';
        b.style.cursor = 'not-allowed';
      });
    }
  };

  const deals = [
    {
      id: 'cursed_blade',
      icon: '⚔️',
      title: 'ПРОКЛЯТЫЙ КЛИНОК',
      costDesc: 'Жертва: -100 MAX HP',
      rewardDesc: 'Усиление: +35% К УРОНУ (На весь забег)',
      btnText: 'ПРИНЯТЬ ПАКТ ⚔️',
      btnBg: '#991b1b',
      borderColor: '#ef4444',
      action: () => {
        if (purchasesCount >= MAX_PURCHASES) return false;
        if (scene.playerMaxHp <= 150) {
          soundEngine.playHit();
          scene.showFloatingNotice('СЛИШКОМ МАЛО HP ДЛЯ ЖЕРТВЫ! (НУЖНО > 150)', '#ef4444');
          return false;
        }
        scene.playerMaxHp -= 100;
        scene.playerHp = Math.min(scene.playerHp, scene.playerMaxHp);
        scene.damageMultiplier += 0.35;
        scene.updateHUD();
        soundEngine.playSlash();
        scene.showFloatingNotice('ЖЕРТВА ПРИНЯТА: -100 MAX HP, +35% УРОНА! ⚔️', '#4ade80');
        CloudSyncManager.saveAllProgress();
        return true;
      }
    },
    {
      id: 'blood_step',
      icon: '👟',
      title: 'КРОВАВЫЙ ШАГ',
      costDesc: 'Жертва: -80 MAX HP',
      rewardDesc: 'Усиление: +30% К СКОРОСТИ БЕГА',
      btnText: 'ПРИНЯТЬ ПАКТ 👟',
      btnBg: '#991b1b',
      borderColor: '#ef4444',
      action: () => {
        if (purchasesCount >= MAX_PURCHASES) return false;
        if (scene.playerMaxHp <= 130) {
          soundEngine.playHit();
          scene.showFloatingNotice('СЛИШКОМ МАЛО HP ДЛЯ ЖЕРТВЫ! (НУЖНО > 130)', '#ef4444');
          return false;
        }
        scene.playerMaxHp -= 80;
        scene.playerHp = Math.min(scene.playerHp, scene.playerMaxHp);
        scene.playerSpeed = Math.round(scene.playerSpeed * 1.3);
        scene.basePlayerSpeed = scene.playerSpeed;
        scene.updateHUD();
        soundEngine.playLevelUp();
        scene.showFloatingNotice('ЖЕРТВА ПРИНЯТА: -80 MAX HP, +30% СКОРОСТИ! 👟', '#4ade80');
        CloudSyncManager.saveAllProgress();
        return true;
      }
    },
    {
      id: 'vampirism',
      icon: '🩸',
      title: 'ЭССЕНЦИЯ ВАМПИРИЗМА',
      costDesc: 'Жертва: -100 MAX HP',
      rewardDesc: 'Усиление: ВОССТАНОВЛЕНИЕ ЗДОРОВЬЯ ПРИ УДАРАХ',
      btnText: 'ПРИНЯТЬ ПАКТ 🩸',
      btnBg: '#991b1b',
      borderColor: '#ef4444',
      action: () => {
        if (purchasesCount >= MAX_PURCHASES) return false;
        if (scene.playerMaxHp <= 150) {
          soundEngine.playHit();
          scene.showFloatingNotice('СЛИШКОМ МАЛО HP ДЛЯ ЖЕРТВЫ! (НУЖНО > 150)', '#ef4444');
          return false;
        }
        scene.playerMaxHp -= 100;
        scene.playerHp = Math.min(scene.playerHp, scene.playerMaxHp);
        scene.hasVampirism = true;
        scene.updateHUD();
        soundEngine.playLevelUp();
        scene.showFloatingNotice('ЖЕРТВА ПРИНЯТА: ВАМПИРИЗМ АКТИВИРОВАН! 🩸', '#4ade80');
        CloudSyncManager.saveAllProgress();
        return true;
      }
    },
    {
      id: 'shadow_armor',
      icon: '🛡️',
      title: 'ТЁМНЫЕ ДОСПЕХИ ТИТАНА',
      costDesc: 'Цена: 50 ЗОЛОТА 🪙',
      rewardDesc: 'Усиление: +300 MAX HP И ПОЛНОЕ ИСЦЕЛЕНИЕ',
      btnText: 'КУПИТЬ (50 🪙)',
      btnBg: '#1e3a8a',
      borderColor: '#3b82f6',
      action: () => {
        if (purchasesCount >= MAX_PURCHASES) return false;
        if ((scene.dungeonGold || 0) < 50) {
          soundEngine.playHit();
          scene.showFloatingNotice('НЕДОСТАТОЧНО ЗОЛОТА! (НУЖНО 50 🪙)', '#ef4444');
          return false;
        }
        scene.dungeonGold -= 50;
        scene.playerMaxHp += 300;
        scene.playerHp = scene.playerMaxHp;
        scene.updateHUD();
        soundEngine.playLevelUp();
        scene.showFloatingNotice('КУПЛЕНО: +300 MAX HP И ПОЛНОЕ HP! 🛡️', '#4ade80');
        CloudSyncManager.saveAllProgress();
        return true;
      }
    },
    {
      id: 'blood_haste',
      icon: '⏳',
      title: 'ТЁМНЫЙ ХРОНОМЕТР',
      costDesc: 'Цена: 45 ЗОЛОТА 🪙',
      rewardDesc: 'Усиление: -25% ПЕРЕЗАРЯДКИ СПОСОБНОСТЕЙ',
      btnText: 'КУПИТЬ (45 🪙)',
      btnBg: '#065f46',
      borderColor: '#10b981',
      action: () => {
        if (purchasesCount >= MAX_PURCHASES) return false;
        if ((scene.dungeonGold || 0) < 45) {
          soundEngine.playHit();
          scene.showFloatingNotice('НЕДОСТАТОЧНО ЗОЛОТА! (НУЖНО 45 🪙)', '#ef4444');
          return false;
        }
        scene.dungeonGold -= 45;
        if (scene.cdMax) {
          scene.cdMax.s1 = Math.round((scene.cdMax.s1 || 3000) * 0.75);
          scene.cdMax.s2 = Math.round((scene.cdMax.s2 || 4000) * 0.75);
          scene.cdMax.ult = Math.round((scene.cdMax.ult || 12000) * 0.75);
        }
        scene.updateHUD();
        soundEngine.playLevelUp();
        scene.showFloatingNotice('КУПЛЕНО: -25% ПЕРЕЗАРЯДКИ ВСЕХ НАВЫКОВ! ⏳', '#4ade80');
        CloudSyncManager.saveAllProgress();
        return true;
      }
    }
  ];

  deals.forEach((deal) => {
    const row = document.createElement('div');
    row.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 14px;
      background: #1c0a0a;
      border: 2px solid ${deal.borderColor};
      border-radius: 4px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.6);
      transition: transform 0.15s;
    `;

    const leftCol = document.createElement('div');
    leftCol.style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
    `;

    const iconBox = document.createElement('div');
    iconBox.style.cssText = `
      width: 44px;
      height: 44px;
      border-radius: 4px;
      background: #0f0505;
      border: 2px solid ${deal.borderColor};
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      flex-shrink: 0;
    `;
    iconBox.textContent = deal.icon;

    const infoBox = document.createElement('div');
    infoBox.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 2px;
      text-align: left;
    `;

    const titleEl = document.createElement('div');
    titleEl.style.cssText = `
      font-size: 13px;
      font-weight: bold;
      color: #ffffff;
      letter-spacing: 0.5px;
    `;
    titleEl.textContent = deal.title;

    const costEl = document.createElement('div');
    costEl.style.cssText = `
      font-size: 11px;
      font-weight: bold;
      color: #f87171;
    `;
    costEl.textContent = deal.costDesc;

    const rewardEl = document.createElement('div');
    rewardEl.style.cssText = `
      font-size: 11px;
      color: #a7f3d0;
    `;
    rewardEl.textContent = deal.rewardDesc;

    infoBox.appendChild(titleEl);
    infoBox.appendChild(costEl);
    infoBox.appendChild(rewardEl);

    leftCol.appendChild(iconBox);
    leftCol.appendChild(infoBox);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = deal.btnText;
    btn.style.cssText = `
      padding: 9px 14px;
      background: ${deal.btnBg};
      border: 2px solid ${deal.borderColor};
      color: #ffffff;
      font-family: Consolas, monospace;
      font-size: 12px;
      font-weight: bold;
      cursor: pointer;
      border-radius: 4px;
      white-space: nowrap;
      transition: all 0.15s;
    `;

    dealButtons.push(btn);

    let actionLocked = false;
    const triggerAction = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      if (actionLocked || purchasesCount >= MAX_PURCHASES) return;
      actionLocked = true;
      setTimeout(() => { actionLocked = false; }, 350);
      btn.style.transform = 'scale(0.95)';
      setTimeout(() => {
        btn.style.transform = 'scale(1)';
      }, 100);
      const success = deal.action();
      if (success) {
        purchasesCount++;
        btn.disabled = true;
        btn.textContent = '✔ ПРИНЯТО';
        btn.style.background = '#15803d';
        btn.style.borderColor = '#22c55e';
        updateHeader();
        updateButtonsState();
      }
    };

    btn.onpointerdown = triggerAction;
    btn.onclick = triggerAction;

    row.appendChild(leftCol);
    row.appendChild(btn);
    dealsContainer.appendChild(row);
  });

  const btnClose = document.createElement('button');
  btnClose.type = 'button';
  btnClose.textContent = '🚪 ЗАКРЫТЬ АЛТАРЬ';
  btnClose.style.cssText = `
    width: 100%;
    max-width: 260px;
    padding: 11px;
    background: #475569;
    border: 2px solid #94a3b8;
    color: #ffffff;
    font-family: Consolas, monospace;
    font-size: 13px;
    font-weight: bold;
    cursor: pointer;
    border-radius: 4px;
    margin-top: 6px;
    transition: background 0.15s;
  `;

  const closeHandler = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    soundEngine.playClick();
    overlay.remove();
    onClose();
  };

  btnClose.onpointerdown = closeHandler;
  btnClose.onclick = closeHandler;

  box.appendChild(header);
  box.appendChild(subHeader);
  box.appendChild(dealsContainer);
  box.appendChild(btnClose);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}


