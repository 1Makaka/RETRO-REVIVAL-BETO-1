/**
 * Frantic Battles - MOBA Core Types (MobaTypes.ts)
 */

export type MobaTeam = 'blue' | 'red';
export type MobaMode = 'solo' | 'duo' | 'trio' | '4v4';

export interface Waypoint {
  x: number;
  y: number;
}

export type LaneType = 'top' | 'mid' | 'bot';

export interface MobaPlayerSlot {
  id: string;
  name: string;
  heroKey: string;
  team: MobaTeam;
  isHost: boolean;
  isBot: boolean;
  isReady: boolean;
}

export interface MobaRoomConfig {
  roomCode: string;
  roomName: string;
  mode: MobaMode;
  playerLimit: number;
  isPrivate: boolean;
  password?: string;
  hostPlayerId: string;
  teamBlue: MobaPlayerSlot[];
  teamRed: MobaPlayerSlot[];
}

export interface MinionStats {
  type: 'melee' | 'ranged' | 'siege';
  maxHp: number;
  hp: number;
  damage: number;
  attackSpeed: number; // ms between attacks
  attackRange: number;
  speed: number;
  expReward: number;
  goldReward: number;
}

export interface MobaHeroProgression {
  level: number;
  exp: number;
  maxExp: number;
  unspentSkillPoints: number;
  skillRanks: [number, number, number]; // Skill 1, Skill 2, Ult (ranks 1..3)
  bonusHp: number;
  bonusAttackPct: number;
  kills: number;
  deaths: number;
  lastHits: number;
  gold: number;
}
