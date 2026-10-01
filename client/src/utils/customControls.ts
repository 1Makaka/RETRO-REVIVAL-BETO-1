/**
 * Frantic Battles - Custom Controls & UI Layout Manager
 * Allows players to reposition Joysticks, Skills, and Attack buttons,
 * and toggle attack range indicator.
 */

export interface ControlPos {
  x: number; // 0 to 1 (fraction of screen width)
  y: number; // 0 to 1 (fraction of screen height)
}

export interface CustomControlsLayout {
  joystick: ControlPos;
  attack: ControlPos;
  s1: ControlPos;
  s2: ControlPos;
  ult: ControlPos;
  cancel: ControlPos;
  scales?: Record<string, number>;
}

export const DEFAULT_CONTROLS_LAYOUT: CustomControlsLayout = {
  joystick: { x: 0.12, y: 0.82 },
  attack: { x: 0.88, y: 0.82 },
  s1: { x: 0.74, y: 0.86 },
  s2: { x: 0.75, y: 0.70 },
  ult: { x: 0.85, y: 0.58 },
  cancel: { x: 0.88, y: 0.38 } // Positioned comfortably on the right side above attack/skills
};

const STORAGE_KEY_LAYOUT = 'fb_custom_controls_layout_v3';
const STORAGE_KEY_SHOW_ATTACK_RANGE = 'fb_show_attack_range';
const STORAGE_KEY_SCALE = 'fb_controls_scale_v1';

export function getIndividualButtonScale(buttonId: string): number {
  try {
    const layout = getCustomControlsLayout();
    if (layout.scales && typeof layout.scales[buttonId] === 'number') {
      const val = layout.scales[buttonId];
      if (val >= 0.5 && val <= 2.2) return val;
    }
  } catch (e) {}
  return getCustomControlsScale();
}

export function getCustomControlsScale(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SCALE);
    if (raw) {
      const parsed = parseFloat(raw);
      if (!isNaN(parsed) && parsed >= 0.6 && parsed <= 1.8) {
        return parsed;
      }
    }
  } catch (e) {}
  return 1.0;
}

export function saveCustomControlsScale(scale: number): void {
  try {
    localStorage.setItem(STORAGE_KEY_SCALE, scale.toString());
    window.dispatchEvent(new CustomEvent('controls-scale-changed', { detail: scale }));
  } catch (e) {}
}

export function getCustomControlsLayout(): CustomControlsLayout {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LAYOUT);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.joystick && parsed.attack && parsed.s1 && parsed.s2 && parsed.ult) {
        return {
          joystick: { x: clampNormalized(parsed.joystick.x, 0.02, 0.98), y: clampNormalized(parsed.joystick.y, 0.02, 0.98) },
          attack: { x: clampNormalized(parsed.attack.x, 0.02, 0.98), y: clampNormalized(parsed.attack.y, 0.02, 0.98) },
          s1: { x: clampNormalized(parsed.s1.x, 0.02, 0.98), y: clampNormalized(parsed.s1.y, 0.02, 0.98) },
          s2: { x: clampNormalized(parsed.s2.x, 0.02, 0.98), y: clampNormalized(parsed.s2.y, 0.02, 0.98) },
          ult: { x: clampNormalized(parsed.ult.x, 0.02, 0.98), y: clampNormalized(parsed.ult.y, 0.02, 0.98) },
          cancel: parsed.cancel
            ? { x: clampNormalized(parsed.cancel.x, 0.02, 0.98), y: clampNormalized(parsed.cancel.y, 0.02, 0.98) }
            : { ...DEFAULT_CONTROLS_LAYOUT.cancel },
          scales: (parsed.scales && typeof parsed.scales === 'object') ? parsed.scales : {}
        };
      }
    }
  } catch (e) {
    console.warn('Failed to parse custom controls layout', e);
  }
  return { ...DEFAULT_CONTROLS_LAYOUT, scales: {} };
}

function clampNormalized(val: any, min: number, max: number): number {
  const num = typeof val === 'number' && !isNaN(val) ? val : 0.5;
  return Math.max(min, Math.min(max, num));
}

export function saveCustomControlsLayout(layout: CustomControlsLayout): void {
  try {
    localStorage.setItem(STORAGE_KEY_LAYOUT, JSON.stringify(layout));
    window.dispatchEvent(new CustomEvent('controls-layout-changed', { detail: layout }));
  } catch (e) {
    console.error('Failed to save custom controls layout', e);
  }
}

export function resetCustomControlsLayout(): CustomControlsLayout {
  try {
    localStorage.removeItem(STORAGE_KEY_LAYOUT);
    window.dispatchEvent(new CustomEvent('controls-layout-changed', { detail: DEFAULT_CONTROLS_LAYOUT }));
  } catch (e) {
    console.error('Failed to reset custom controls', e);
  }
  return { ...DEFAULT_CONTROLS_LAYOUT };
}

export function getShowAttackRange(): boolean {
  const item = localStorage.getItem(STORAGE_KEY_SHOW_ATTACK_RANGE);
  if (item === null) return true; // Enabled by default
  return item === 'true';
}

export function setShowAttackRange(show: boolean): void {
  localStorage.setItem(STORAGE_KEY_SHOW_ATTACK_RANGE, show ? 'true' : 'false');
  window.dispatchEvent(new CustomEvent('attack-range-visibility-changed', { detail: show }));
}

/**
 * Interactive full-screen Visual Control Editor
 * Lets user drag & drop buttons anywhere on the screen!
 */
export function showHTMLControlsCustomizer(onClose: () => void): void {
  const oldModal = document.getElementById('game-dom-controls-customizer');
  if (oldModal) oldModal.remove();

  let layout: CustomControlsLayout = getCustomControlsLayout();
  let showAttackRadius = getShowAttackRange();
  
  // Per-button scale map
  const buttonScales: Record<string, number> = {
    joystick: getIndividualButtonScale('joystick'),
    attack: getIndividualButtonScale('attack'),
    s1: getIndividualButtonScale('s1'),
    s2: getIndividualButtonScale('s2'),
    ult: getIndividualButtonScale('ult'),
    cancel: getIndividualButtonScale('cancel')
  };

  let selectedItemId: keyof CustomControlsLayout = 'joystick';

  const overlay = document.createElement('div');
  overlay.id = 'game-dom-controls-customizer';
  overlay.style.cssText = `
    position: fixed;
    top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(4, 7, 15, 0.92);
    backdrop-filter: blur(4px);
    z-index: 100050;
    font-family: monospace;
    color: white;
    user-select: none;
    touch-action: none;
    overflow: hidden;
  `;

  // Top header bar
  const topBar = document.createElement('div');
  topBar.style.cssText = `
    position: absolute;
    top: 0; left: 0; width: 100%;
    padding: 10px 16px;
    background: rgba(15, 23, 42, 0.96);
    border-bottom: 2px solid #38bdf8;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-sizing: border-box;
    z-index: 10;
  `;

  const titleBox = document.createElement('div');
  titleBox.innerHTML = `
    <div style="font-size: 15px; font-weight: bold; color: #38bdf8; letter-spacing: 1px;">
      🎮 НАСТРОЙКА РАСПОЛОЖЕНИЯ И РАЗМЕРА КНОПОК
    </div>
    <div style="font-size: 10.5px; color: #94a3b8; margin-top: 2px;">
      Нажмите на кнопку, чтобы выбрать и настроить её индивидуальный размер [➕/➖], или перетащите её!
    </div>
  `;

  const btnClose = document.createElement('button');
  btnClose.textContent = '✕ ЗАКРЫТЬ';
  btnClose.style.cssText = `
    background: #334155;
    border: 1px solid #64748b;
    color: #e2e8f0;
    font-family: monospace;
    font-size: 13px;
    font-weight: bold;
    padding: 7px 12px;
    border-radius: 4px;
    cursor: pointer;
  `;
  btnClose.onclick = () => {
    overlay.remove();
    onClose();
  };

  topBar.appendChild(titleBox);
  topBar.appendChild(btnClose);
  overlay.appendChild(topBar);

  // Bottom action bar
  const bottomBar = document.createElement('div');
  bottomBar.style.cssText = `
    position: absolute;
    bottom: 0; left: 0; width: 100%;
    padding: 10px 16px;
    background: rgba(15, 23, 42, 0.96);
    border-top: 2px solid #38bdf8;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-sizing: border-box;
    z-index: 10;
    flex-wrap: wrap;
    gap: 8px;
  `;

  // Selected Button Individual Scale Adjuster
  const scaleControlBox = document.createElement('div');
  scaleControlBox.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
    background: #1e293b;
    border: 2px solid #facc15;
    padding: 6px 12px;
    border-radius: 6px;
    box-shadow: 0 0 10px rgba(250, 204, 21, 0.2);
  `;

  const selectedLbl = document.createElement('span');
  selectedLbl.style.cssText = 'font-size: 11.5px; font-weight: bold; color: #fde047; text-transform: uppercase; white-space: nowrap;';

  const btnScaleDown = document.createElement('button');
  btnScaleDown.textContent = '➖';
  btnScaleDown.title = 'Уменьшить размер';
  btnScaleDown.style.cssText = 'background: #334155; border: 1px solid #64748b; color: white; border-radius: 4px; padding: 4px 9px; cursor: pointer; font-size: 13px; font-weight: bold;';

  const scaleSlider = document.createElement('input');
  scaleSlider.type = 'range';
  scaleSlider.min = '0.5';
  scaleSlider.max = '2.0';
  scaleSlider.step = '0.05';
  scaleSlider.style.cssText = 'width: 85px; cursor: pointer; accent-color: #facc15;';

  const scaleText = document.createElement('span');
  scaleText.style.cssText = 'font-size: 13px; font-weight: 900; color: #4ade80; min-width: 48px; text-align: center;';

  const btnScaleUp = document.createElement('button');
  btnScaleUp.textContent = '➕';
  btnScaleUp.title = 'Увеличить размер';
  btnScaleUp.style.cssText = 'background: #334155; border: 1px solid #64748b; color: white; border-radius: 4px; padding: 4px 9px; cursor: pointer; font-size: 13px; font-weight: bold;';

  const updateSelectionUI = () => {
    const curItem = items.find(it => it.id === selectedItemId) || items[0]!;
    const curScale = buttonScales[selectedItemId] || 1.0;

    selectedLbl.textContent = `🎯 ${curItem.label}:`;
    scaleSlider.value = curScale.toString();
    scaleText.textContent = `${Math.round(curScale * 100)}%`;

    items.forEach(it => {
      const s = buttonScales[it.id] || 1.0;
      if (it.id === selectedItemId) {
        it.el.style.outline = '4px solid #facc15';
        it.el.style.outlineOffset = '2px';
        it.el.style.boxShadow = '0 0 22px rgba(250, 204, 21, 0.95)';
      } else {
        it.el.style.outline = 'none';
        it.el.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.7)';
      }
      it.el.style.transform = `scale(${s})`;
      
      const badge = it.el.querySelector('.scale-badge');
      if (badge) {
        badge.textContent = `${Math.round(s * 100)}%`;
      }
    });
  };

  btnScaleDown.onclick = () => {
    const cur = buttonScales[selectedItemId] || 1.0;
    buttonScales[selectedItemId] = Math.max(0.5, Math.round((cur - 0.05) * 100) / 100);
    updateSelectionUI();
  };

  btnScaleUp.onclick = () => {
    const cur = buttonScales[selectedItemId] || 1.0;
    buttonScales[selectedItemId] = Math.min(2.0, Math.round((cur + 0.05) * 100) / 100);
    updateSelectionUI();
  };

  scaleSlider.oninput = () => {
    buttonScales[selectedItemId] = parseFloat(scaleSlider.value);
    updateSelectionUI();
  };

  scaleControlBox.appendChild(selectedLbl);
  scaleControlBox.appendChild(btnScaleDown);
  scaleControlBox.appendChild(scaleSlider);
  scaleControlBox.appendChild(scaleText);
  scaleControlBox.appendChild(btnScaleUp);

  // Attack range toggle inside editor bar
  const rangeToggleBtn = document.createElement('button');
  const updateRangeBtnUI = () => {
    rangeToggleBtn.innerHTML = showAttackRadius
      ? '🎯 РАДИУС: <span style="color:#4ade80">[ ВКЛ ]</span>'
      : '🎯 РАДИУС: <span style="color:#f87171">[ ВЫКЛ ]</span>';
  };
  updateRangeBtnUI();
  rangeToggleBtn.style.cssText = `
    background: #1e293b;
    border: 1px solid #38bdf8;
    color: #ffffff;
    font-family: monospace;
    font-size: 11.5px;
    font-weight: bold;
    padding: 7px 12px;
    border-radius: 4px;
    cursor: pointer;
  `;
  rangeToggleBtn.onclick = () => {
    showAttackRadius = !showAttackRadius;
    setShowAttackRange(showAttackRadius);
    updateRangeBtnUI();
  };

  const actionGroup = document.createElement('div');
  actionGroup.style.cssText = 'display: flex; gap: 8px; align-items: center;';

  const btnReset = document.createElement('button');
  btnReset.textContent = '↺ СБРОСИТЬ';
  btnReset.style.cssText = `
    background: #475569;
    border: 1px solid #94a3b8;
    color: #f1f5f9;
    font-family: monospace;
    font-size: 12px;
    font-weight: bold;
    padding: 7px 12px;
    border-radius: 4px;
    cursor: pointer;
  `;

  const btnSave = document.createElement('button');
  btnSave.textContent = '💾 СОХРАНИТЬ УПРАВЛЕНИЕ';
  btnSave.style.cssText = `
    background: #16a34a;
    border: 2px solid #4ade80;
    color: #ffffff;
    font-family: monospace;
    font-size: 13px;
    font-weight: bold;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    box-shadow: 0 0 10px rgba(74, 222, 128, 0.4);
  `;

  actionGroup.appendChild(btnReset);
  actionGroup.appendChild(btnSave);
  bottomBar.appendChild(scaleControlBox);
  bottomBar.appendChild(rangeToggleBtn);
  bottomBar.appendChild(actionGroup);
  overlay.appendChild(bottomBar);

  // Field preview area (center area)
  const previewArea = document.createElement('div');
  previewArea.style.cssText = `
    position: absolute;
    inset: 55px 0 60px 0;
    pointer-events: none;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  previewArea.innerHTML = `
    <div style="font-size: 12px; color: rgba(148, 163, 184, 0.35); text-align: center; border: 1px dashed rgba(56, 189, 248, 0.25); padding: 25px; border-radius: 12px;">
      ✦ ПОЛЕ БОЯ ✦<br/>
      <span style="font-size: 10.5px;">Кликните по кнопке для изменения размера [➕/➖] или перетащите в нужное место</span>
    </div>
  `;
  overlay.appendChild(previewArea);

  // Controls Elements Definitions
  interface DraggableItem {
    id: keyof CustomControlsLayout;
    label: string;
    sublabel: string;
    width: number;
    height: number;
    bg: string;
    border: string;
    textColor: string;
    isJoystick?: boolean;
    el: HTMLElement;
  }

  const items: DraggableItem[] = [
    {
      id: 'joystick',
      label: 'ДЖОЙСТИК',
      sublabel: 'ДВИЖЕНИЕ',
      width: 100,
      height: 100,
      bg: 'rgba(39, 39, 42, 0.88)',
      border: '3px solid #71717a',
      textColor: '#ffffff',
      isJoystick: true,
      el: document.createElement('div')
    },
    {
      id: 'attack',
      label: 'АТАКА',
      sublabel: 'ОСНОВНАЯ',
      width: 100,
      height: 100,
      bg: 'rgba(185, 28, 28, 0.88)',
      border: '3px solid #ef4444',
      textColor: '#fca5a5',
      el: document.createElement('div')
    },
    {
      id: 's1',
      label: 'НАВЫК 1',
      sublabel: '[ 1 ]',
      width: 68,
      height: 68,
      bg: 'rgba(22, 163, 74, 0.88)',
      border: '3px solid #4ade80',
      textColor: '#ffffff',
      el: document.createElement('div')
    },
    {
      id: 's2',
      label: 'НАВЫК 2',
      sublabel: '[ 2 ]',
      width: 68,
      height: 68,
      bg: 'rgba(37, 99, 235, 0.88)',
      border: '3px solid #60a5fa',
      textColor: '#ffffff',
      el: document.createElement('div')
    },
    {
      id: 'ult',
      label: 'СУПЕР',
      sublabel: '[ ★ УЛЬТА ]',
      width: 76,
      height: 76,
      bg: 'rgba(147, 51, 234, 0.92)',
      border: '3px solid #facc15',
      textColor: '#fef08a',
      el: document.createElement('div')
    },
    {
      id: 'cancel',
      label: 'ОТМЕНА',
      sublabel: '[ ✕ ]',
      width: 68,
      height: 68,
      bg: 'rgba(220, 38, 38, 0.88)',
      border: '3px solid #fca5a5',
      textColor: '#ffffff',
      el: document.createElement('div')
    }
  ];

  function positionElements() {
    const sw = window.innerWidth;
    const sh = window.innerHeight;

    items.forEach(item => {
      const pos = layout[item.id] || DEFAULT_CONTROLS_LAYOUT[item.id] || { x: 0.5, y: 0.5 };
      const px = pos.x * sw;
      const py = pos.y * sh;

      item.el.style.left = `${px - item.width / 2}px`;
      item.el.style.top = `${py - item.height / 2}px`;
    });
  }

  // Setup draggable and selectable handles
  items.forEach(item => {
    const el = item.el;
    el.style.cssText = `
      position: absolute;
      width: ${item.width}px;
      height: ${item.height}px;
      border-radius: 50%;
      background: ${item.bg};
      border: ${item.border};
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: grab;
      touch-action: none;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.7);
      transition: transform 0.12s ease;
      z-index: 5;
    `;

    const initScale = buttonScales[item.id] || 1.0;
    const badgeHTML = `<div class="scale-badge" style="font-size: 8px; font-weight: 900; color: #fde047; background: rgba(0,0,0,0.65); padding: 1px 4px; border-radius: 3px; margin-top: 1px;">${Math.round(initScale * 100)}%</div>`;

    if (item.isJoystick) {
      el.innerHTML = `
        <div style="width: 38px; height: 38px; border-radius: 50%; background: #52525b; border: 2px solid #a1a1aa; display: flex; align-items: center; justify-content: center; font-size: 14px;">
          🕹️
        </div>
        <div style="font-size: 9px; font-weight: bold; color: ${item.textColor}; margin-top: 2px;">${item.label}</div>
        ${badgeHTML}
      `;
    } else {
      el.innerHTML = `
        <div style="font-size: 13px; font-weight: bold; color: ${item.textColor};">${item.label}</div>
        <div style="font-size: 8px; font-weight: bold; color: rgba(255,255,255,0.7);">${item.sublabel}</div>
        ${badgeHTML}
      `;
    }

    let isDragging = false;
    let startPointerX = 0;
    let startPointerY = 0;
    let startElemX = 0;
    let startElemY = 0;

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Select this item for scaling!
      selectedItemId = item.id;
      updateSelectionUI();

      isDragging = true;
      el.style.cursor = 'grabbing';
      el.style.zIndex = '20';

      const pX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const pY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      startPointerX = pX;
      startPointerY = pY;

      const rect = el.getBoundingClientRect();
      startElemX = rect.left + item.width / 2;
      startElemY = rect.top + item.height / 2;

      const onPointerMove = (moveEv: MouseEvent | TouchEvent) => {
        if (!isDragging) return;
        const curX = 'touches' in moveEv ? moveEv.touches[0].clientX : moveEv.clientX;
        const curY = 'touches' in moveEv ? moveEv.touches[0].clientY : moveEv.clientY;

        const deltaX = curX - startPointerX;
        const deltaY = curY - startPointerY;

        let newCenterX = startElemX + deltaX;
        let newCenterY = startElemY + deltaY;

        const sw = window.innerWidth;
        const sh = window.innerHeight;

        newCenterX = Math.max(item.width / 4, Math.min(sw - item.width / 4, newCenterX));
        newCenterY = Math.max(item.height / 4, Math.min(sh - item.height / 4, newCenterY));

        layout[item.id] = {
          x: Math.max(0.01, Math.min(0.99, newCenterX / sw)),
          y: Math.max(0.01, Math.min(0.99, newCenterY / sh))
        };

        el.style.left = `${newCenterX - item.width / 2}px`;
        el.style.top = `${newCenterY - item.height / 2}px`;
      };

      const onPointerUp = () => {
        isDragging = false;
        el.style.cursor = 'grab';
        el.style.zIndex = '5';
        window.removeEventListener('mousemove', onPointerMove);
        window.removeEventListener('mouseup', onPointerUp);
        window.removeEventListener('touchmove', onPointerMove);
        window.removeEventListener('touchend', onPointerUp);
      };

      window.addEventListener('mousemove', onPointerMove);
      window.addEventListener('mouseup', onPointerUp);
      window.addEventListener('touchmove', onPointerMove);
      window.addEventListener('touchend', onPointerUp);
    };

    el.addEventListener('mousedown', onPointerDown);
    el.addEventListener('touchstart', onPointerDown, { passive: false });

    overlay.appendChild(el);
  });

  positionElements();
  updateSelectionUI();

  window.addEventListener('resize', positionElements);

  btnReset.onclick = () => {
    layout = { ...DEFAULT_CONTROLS_LAYOUT };
    items.forEach(it => {
      buttonScales[it.id] = 1.0;
    });
    positionElements();
    updateSelectionUI();
  };

  btnSave.onclick = () => {
    layout.scales = buttonScales;
    saveCustomControlsLayout(layout);
    saveCustomControlsScale(buttonScales['joystick'] || 1.0);
    setShowAttackRange(showAttackRadius);
    btnSave.textContent = '✓ СОХРАНЕНО!';
    btnSave.style.background = '#059669';
    setTimeout(() => {
      overlay.remove();
      onClose();
    }, 400);
  };

  document.body.appendChild(overlay);
}
