/**
 * Frantic Battles - Economy & Canonical Roster System (economy.ts)
 * Handles Currency persistence (rustySkulls, voidShards, upgradePoints, rankedPoints),
 * Roster levels & unlocks (Grim, Burn, Torf, Alarik, Kraul, Zaza, Omen),
 * Anti-Duplicate compensation, and Hero level-up stat calculations.
 */

export interface HeroRosterState {
  id: string;
  unlocked: boolean;
  level: number;
}

export interface EconomyState {
  rustySkulls: number;   // Ржавые черепа (Start: 500)
  voidShards: number;    // Осколки пустоты (Start: 0)
  upgradePoints: number; // Очки прокачки (Start: 100)
  rankedPoints: number;  // Суета / Рейтинг (Start: 0)
  tickets: number;       // Билеты подземелья / рейдов (Start: 5)
  bossesKilled?: number;
  dungeonsCleared?: number;
}

export interface HeroRosterConfig {
  id: string;
  name: string;
  rarity: 'ОБЫЧНЫЙ' | 'РЕДКИЙ' | 'ЭПИЧЕСКИЙ' | 'МИФИЧЕСКИЙ';
  costSkulls: number;
  costShards: number;
  colorHex: string;
}

export const CANONICAL_ROSTER: Record<string, HeroRosterConfig> = {
  char_grim: {
    id: 'char_grim',
    name: 'Грим (Grim)',
    rarity: 'ОБЫЧНЫЙ',
    costSkulls: 0,
    costShards: 0,
    colorHex: '#cbd5e1'
  },
  char_bjorn: {
    id: 'char_bjorn',
    name: 'Бёрн (Burn)',
    rarity: 'ОБЫЧНЫЙ',
    costSkulls: 0,
    costShards: 0,
    colorHex: '#cbd5e1'
  },
  char_torf: {
    id: 'char_torf',
    name: 'Торф (Torf)',
    rarity: 'РЕДКИЙ',
    costSkulls: 1500,
    costShards: 5,
    colorHex: '#60a5fa'
  },
  char_alrik: {
    id: 'char_alrik',
    name: 'Аларик (Alaric)',
    rarity: 'РЕДКИЙ',
    costSkulls: 1500,
    costShards: 5,
    colorHex: '#60a5fa'
  },
  char_kraul: {
    id: 'char_kraul',
    name: 'Крал (Kral)',
    rarity: 'ЭПИЧЕСКИЙ',
    costSkulls: 3000,
    costShards: 10,
    colorHex: '#c084fc'
  },
  char_zaza: {
    id: 'char_zaza',
    name: 'Заза (Zaza)',
    rarity: 'ЭПИЧЕСКИЙ',
    costSkulls: 3000,
    costShards: 10,
    colorHex: '#c084fc'
  },
  char_omen: {
    id: 'char_omen',
    name: 'Омен (Omen)',
    rarity: 'МИФИЧЕСКИЙ',
    costSkulls: 5000,
    costShards: 20,
    colorHex: '#ef4444'
  },
  char_nihil: {
    id: 'char_nihil',
    name: 'Нихил (Nihil)',
    rarity: 'МИФИЧЕСКИЙ',
    costSkulls: 0,
    costShards: 0,
    colorHex: '#d8b4fe'
  }
};

const ECONOMY_SAVE_KEY = 'fb_economy_save';
const ROSTER_SAVE_KEY = 'fb_roster_save';

// --- ECONOMY STATE API ---
export function loadEconomy(): EconomyState {
  try {
    const raw = localStorage.getItem(ECONOMY_SAVE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        rustySkulls: typeof parsed.rustySkulls === 'number' ? parsed.rustySkulls : 500,
        voidShards: typeof parsed.voidShards === 'number' ? parsed.voidShards : 0,
        upgradePoints: typeof parsed.upgradePoints === 'number' ? parsed.upgradePoints : 100,
        rankedPoints: typeof parsed.rankedPoints === 'number' ? parsed.rankedPoints : 0,
        tickets: typeof parsed.tickets === 'number' ? parsed.tickets : 5
      };
    }
  } catch (e) {
    console.error('Failed to load economy save:', e);
  }
  return {
    rustySkulls: 500,
    voidShards: 0,
    upgradePoints: 100,
    rankedPoints: 0,
    tickets: 5
  };
}

export function saveEconomy(state: EconomyState) {
  try {
    localStorage.setItem(ECONOMY_SAVE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent('economy_updated', { detail: state }));
  } catch (e) {
    console.error('Failed to save economy save:', e);
  }
}

export function addCurrencies(amounts: { skulls?: number; shards?: number; upgradePts?: number; ranked?: number; tickets?: number }) {
  const current = loadEconomy();
  if (amounts.skulls) current.rustySkulls = Math.max(0, current.rustySkulls + amounts.skulls);
  if (amounts.shards) current.voidShards = Math.max(0, current.voidShards + amounts.shards);
  if (amounts.upgradePts) current.upgradePoints = Math.max(0, current.upgradePoints + amounts.upgradePts);
  if (amounts.ranked) current.rankedPoints = Math.max(0, current.rankedPoints + amounts.ranked);
  if (amounts.tickets) current.tickets = Math.max(0, current.tickets + amounts.tickets);
  saveEconomy(current);
}

// --- ROSTER STATE API ---
export function loadRoster(): Record<string, HeroRosterState> {
  const defaultRoster: Record<string, HeroRosterState> = {
    char_grim: { id: 'char_grim', unlocked: true, level: 1 },
    char_bjorn: { id: 'char_bjorn', unlocked: true, level: 1 },
    char_torf: { id: 'char_torf', unlocked: false, level: 1 },
    char_alrik: { id: 'char_alrik', unlocked: false, level: 1 },
    char_kraul: { id: 'char_kraul', unlocked: false, level: 1 },
    char_zaza: { id: 'char_zaza', unlocked: false, level: 1 },
    char_omen: { id: 'char_omen', unlocked: false, level: 1 },
    char_nihil: { id: 'char_nihil', unlocked: true, level: 1 } // Free promo hero!
  };

  try {
    const raw = localStorage.getItem(ROSTER_SAVE_KEY);
    if (raw) {
      const parsed: Record<string, HeroRosterState> = JSON.parse(raw);
      Object.keys(defaultRoster).forEach(key => {
        if (parsed[key]) {
          defaultRoster[key] = {
            id: key,
            unlocked: !!parsed[key].unlocked,
            level: Math.max(1, Math.min(10, parsed[key].level || 1))
          };
        }
      });
    }
  } catch (e) {
    console.error('Failed to load roster save:', e);
  }

  // Nihil is currently free for all players
  if (defaultRoster.char_nihil) {
    defaultRoster.char_nihil.unlocked = true;
  }

  return defaultRoster;
}

export function saveRoster(roster: Record<string, HeroRosterState>) {
  try {
    localStorage.setItem(ROSTER_SAVE_KEY, JSON.stringify(roster));
    window.dispatchEvent(new CustomEvent('roster_updated', { detail: roster }));
  } catch (e) {
    console.error('Failed to save roster save:', e);
  }
}

// --- HERO UPGRADE CALCULATIONS ---
export function getHeroUpgradeCost(currentLevel: number): { upgradePts: number; skulls: number } {
  // Cost for Level N: (N * 50) upgrade points and (N * 500) skulls
  return {
    upgradePts: currentLevel * 50,
    skulls: currentLevel * 500
  };
}

export function getHeroStatMultipliers(level: number): { hpMult: number; dmgMult: number } {
  // +2% Max HP and +1% Base Damage per level
  const lvl = Math.max(1, Math.min(10, level));
  return {
    hpMult: 1 + (lvl - 1) * 0.02,
    dmgMult: 1 + (lvl - 1) * 0.01
  };
}

export function levelUpHero(heroId: string): { success: boolean; message: string } {
  const roster = loadRoster();
  const heroState = roster[heroId];
  if (!heroState || !heroState.unlocked) {
    return { success: false, message: 'Персонаж заблокирован!' };
  }
  if (heroState.level >= 10) {
    return { success: false, message: 'Максимальный уровень (10) достигнут!' };
  }

  const cost = getHeroUpgradeCost(heroState.level);
  const econ = loadEconomy();

  if (econ.upgradePoints < cost.upgradePts) {
    return { success: false, message: `Недостаточно очков прокачки! Нужно ${cost.upgradePts}` };
  }
  if (econ.rustySkulls < cost.skulls) {
    return { success: false, message: `Недостаточно черепов! Нужно ${cost.skulls}` };
  }

  // Deduct
  econ.upgradePoints -= cost.upgradePts;
  econ.rustySkulls -= cost.skulls;
  saveEconomy(econ);

  // Upgrade Level
  heroState.level += 1;
  saveRoster(roster);

  return {
    success: true,
    message: `Уровень ${heroState.level} достигнут! (+2% HP, +1% Урона)`
  };
}

// --- UNLOCK & ANTI-DUPLICATE COMPENSATION ---
export interface UnlockResult {
  isDuplicate: boolean;
  heroId: string;
  heroName: string;
  rarity: string;
  compensation?: { upgradePts: number; skulls: number };
  message: string;
}

export function unlockHeroWithAntiDuplicate(heroId: string): UnlockResult {
  const roster = loadRoster();
  const config = CANONICAL_ROSTER[heroId];
  const heroName = config ? config.name : heroId;
  const rarity = config ? config.rarity : 'ОБЫЧНЫЙ';

  const heroState = roster[heroId] || { id: heroId, unlocked: false, level: 1 };

  if (heroState.unlocked) {
    // ANTI-DUPLICATE COMPENSATION
    let pts = 150;
    let skulls = 500;
    if (rarity === 'ЭПИЧЕСКИЙ') {
      pts = 300;
      skulls = 1000;
    } else if (rarity === 'МИФИЧЕСКИЙ') {
      pts = 600;
      skulls = 2000;
    }

    addCurrencies({ skulls, upgradePts: pts });

    return {
      isDuplicate: true,
      heroId,
      heroName,
      rarity,
      compensation: { upgradePts: pts, skulls },
      message: 'Боец уже в ростере! Получена компенсация'
    };
  } else {
    // UNLOCK
    heroState.unlocked = true;
    roster[heroId] = heroState;
    saveRoster(roster);

    return {
      isDuplicate: false,
      heroId,
      heroName,
      rarity,
      message: `Новый боец разблокирован: ${heroName}!`
    };
  }
}

export function buyHeroFromShop(heroId: string, currency: 'skulls' | 'shards'): { success: boolean; message: string } {
  const config = CANONICAL_ROSTER[heroId];
  if (!config) return { success: false, message: 'Неизвестный боец' };

  const roster = loadRoster();
  if (roster[heroId]?.unlocked) {
    return { success: false, message: 'Боец уже разблокирован!' };
  }

  const econ = loadEconomy();
  if (currency === 'skulls') {
    if (econ.rustySkulls < config.costSkulls) {
      return { success: false, message: `Нужно ${config.costSkulls} черепов!` };
    }
    econ.rustySkulls -= config.costSkulls;
  } else {
    if (econ.voidShards < config.costShards) {
      return { success: false, message: `Нужно ${config.costShards} осколков!` };
    }
    econ.voidShards -= config.costShards;
  }

  saveEconomy(econ);
  unlockHeroWithAntiDuplicate(heroId);

  return { success: true, message: `${config.name} у вас в ростере!` };
}

export function exchangeShardsToSkulls(shardsCount: number = 1): { success: boolean; message: string } {
  const econ = loadEconomy();
  if (econ.voidShards < shardsCount) {
    return { success: false, message: 'Недостаточно осколков пустоты!' };
  }
  econ.voidShards -= shardsCount;
  econ.rustySkulls += shardsCount * 400;
  saveEconomy(econ);

  return { success: true, message: `Обменяно ${shardsCount} осколок на ${shardsCount * 400} черепов!` };
}
