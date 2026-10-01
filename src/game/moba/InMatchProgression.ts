/**
 * Frantic Battles - MOBA In-Match Progression (InMatchProgression.ts)
 * Handles in-match leveling (1–10), skill rank upgrades (up to Rank 3),
 * stat growth (+8% HP, +6% Attack per level), and experience distribution.
 */

import { MobaHeroProgression } from './MobaTypes';

export const LEVEL_EXP_TABLE: number[] = [
  0,     // Level 1 (start)
  120,   // Level 2
  200,   // Level 3
  320,   // Level 4
  460,   // Level 5
  620,   // Level 6 (~3:30 min)
  800,   // Level 7
  1000,  // Level 8
  1250,  // Level 9
  1550   // Level 10 (~6:30-7:00 min)
];

export class InMatchProgressionManager {
  public static createInitialProgression(): MobaHeroProgression {
    return {
      level: 1,
      exp: 0,
      maxExp: LEVEL_EXP_TABLE[1],
      unspentSkillPoints: 0,
      skillRanks: [1, 1, 1],  // All skills (S1, S2, Ult) are fully unlocked and usable from Level 1
      bonusHp: 0,
      bonusAttackPct: 0,
      kills: 0,
      deaths: 0,
      lastHits: 0,
      gold: 300
    };
  }

  /**
   * Add experience to hero. Returns true if hero leveled up.
   */
  public static addExp(
    prog: MobaHeroProgression,
    amount: number,
    baseMaxHp: number
  ): { leveledUp: boolean; newLevel: number; addedHp: number } {
    if (prog.level >= 10) {
      return { leveledUp: false, newLevel: 10, addedHp: 0 };
    }

    prog.exp += amount;
    let leveledUp = false;
    let totalAddedHp = 0;

    while (prog.level < 10 && prog.exp >= prog.maxExp) {
      prog.exp -= prog.maxExp;
      prog.level++;
      prog.unspentSkillPoints++;
      leveledUp = true;

      // Stat growth: +8% Max HP, +6% Attack damage
      const addedHp = Math.round(baseMaxHp * 0.08);
      prog.bonusHp += addedHp;
      totalAddedHp += addedHp;
      prog.bonusAttackPct += 0.06;

      if (prog.level < 10) {
        prog.maxExp = LEVEL_EXP_TABLE[prog.level];
      } else {
        prog.exp = 0;
        prog.maxExp = 0; // Max level reached
      }
    }

    return { leveledUp, newLevel: prog.level, addedHp: totalAddedHp };
  }

  /**
   * Upgrade a skill rank (0 = Skill 1, 1 = Skill 2, 2 = Ult).
   * Returns true if upgrade was successful.
   */
  public static upgradeSkill(prog: MobaHeroProgression, skillIndex: number): boolean {
    if (prog.unspentSkillPoints <= 0) return false;
    if (skillIndex < 0 || skillIndex > 2) return false;

    // Maximum 3 ranks per skill
    if (prog.skillRanks[skillIndex] >= 3) return false;

    // Ult requires Level 4+ for Rank 1, Level 7+ for Rank 2, Level 9+ for Rank 3
    if (skillIndex === 2) {
      const currentRank = prog.skillRanks[2];
      if (currentRank === 0 && prog.level < 4) return false;
      if (currentRank === 1 && prog.level < 7) return false;
      if (currentRank === 2 && prog.level < 9) return false;
    }

    prog.skillRanks[skillIndex]++;
    prog.unspentSkillPoints--;
    return true;
  }

  /**
   * Returns damage/power multiplier for a skill based on its rank.
   * Rank 1 = 1.0, Rank 2 = 1.25 (+25%), Rank 3 = 1.50 (+50%).
   */
  public static getSkillPowerMultiplier(prog: MobaHeroProgression, skillIndex: number): number {
    const rank = Math.max(1, prog.skillRanks[skillIndex]);
    return 1.0 + (rank - 1) * 0.25;
  }

  /**
   * Returns cooldown reduction multiplier for a skill based on its rank.
   * Rank 1 = 1.0, Rank 2 = 0.90 (-10%), Rank 3 = 0.80 (-20%).
   */
  public static getSkillCooldownMultiplier(prog: MobaHeroProgression, skillIndex: number): number {
    const rank = Math.max(1, prog.skillRanks[skillIndex]);
    return Math.max(0.7, 1.0 - (rank - 1) * 0.10);
  }
}
