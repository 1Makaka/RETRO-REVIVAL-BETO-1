/**
 * Frantic Battles - MOBA Game Mode Scene (MobaScene.ts)
 * Integrates BaseHero (1:1 identical to DungeonScene combat),
 * BattleControlsHUD, MobaMapSystem with Backdoor Protected & Escalating Damage Towers,
 * MinionWaveSystem, InMatchProgression, Full KDA Scoreboard (TAB / Header click),
 * and Mobile Legends style dynamic Death/Respawn system with Fountain Teleportation.
 */

import Phaser from 'phaser';
import { MobaMode, MobaTeam, MobaHeroProgression, MobaRoomConfig } from '../moba/MobaTypes';
import { MobaMapSystem, MobaMapData } from '../moba/MobaMapSystem';
import { MinionWaveSystem, MobaMinion, MinionCombatTarget } from '../moba/MinionSpawner';
import { TowerTarget } from '../moba/Tower';
import { InMatchProgressionManager } from '../moba/InMatchProgression';
import { MobaBattleHUD, HeroScoreboardRow } from '../moba/MobaBattleHUD';
import { BaseHero, CombatTarget } from '../entities/BaseHero';
import { BattleControlsHUD } from '../controls/BattleControlsHUD';
import { HEROES, HeroData } from '../players';
import { soundEngine } from '../audio';
import { addMatchToHistory } from '../firebase';
import { MatchHistoryManager } from '../MatchHistoryManager';

interface HeroInternalStats {
  hero: BaseHero;
  name: string;
  heroKey: string;
  team: MobaTeam;
  isPlayer: boolean;
  kills: number;
  deaths: number;
  assists: number;
  gold: number;
  minionsKilled: number;
}

export class MobaScene extends Phaser.Scene {
  private mode: MobaMode = 'solo';
  private playerTeam: MobaTeam = 'blue';
  private playerHeroKey: string = 'char_zaza';
  private heroData!: HeroData;
  private roomConfig?: MobaRoomConfig;

  // Map Data
  private mapData!: MobaMapData;
  private minionSystem!: MinionWaveSystem;
  private hud!: MobaBattleHUD;
  private progression!: MobaHeroProgression;

  // Player & Controls
  public playerHero!: BaseHero;
  public controlsHUD!: BattleControlsHUD;
  private playerRespawnTimer: number = 0;

  // Bots
  private botHeroes: BaseHero[] = [];
  private botRespawnTimers: Map<BaseHero, number> = new Map();

  // Match State & Hero Stats
  private matchStartTime: number = 0;
  private blueKills: number = 0;
  private redKills: number = 0;
  private isMatchOver: boolean = false;
  private heroStatsMap: Map<BaseHero, HeroInternalStats> = new Map();
  private recentDamageDealers: Map<BaseHero, Array<{ attacker: BaseHero; time: number }>> = new Map();
  private cachedCombatTargets: CombatTarget[] = [];
  private minimapTimer: number = 0;
  private botAITimer: number = 0;

  constructor() {
    super('MobaScene');
  }

  init(data: {
    mode?: MobaMode;
    playerTeam?: MobaTeam;
    heroKey?: string;
    roomConfig?: MobaRoomConfig;
  }) {
    this.mode = data.mode || 'solo';
    this.playerTeam = data.playerTeam || 'blue';
    this.playerHeroKey = data.heroKey || 'char_zaza';
    this.roomConfig = data.roomConfig;
    this.heroData = HEROES[this.playerHeroKey] || HEROES.char_zaza;
    this.progression = InMatchProgressionManager.createInitialProgression();

    this.isMatchOver = false;
    this.blueKills = 0;
    this.redKills = 0;
    this.playerRespawnTimer = 0;
    this.botRespawnTimers.clear();
    this.heroStatsMap.clear();
    this.recentDamageDealers.clear();
  }

  create() {
    this.matchStartTime = this.time.now;

    // 1. Build MOBA Map (Masonry Roads, River, Jungle, Towers, Thrones)
    this.mapData = MobaMapSystem.buildMap(
      this,
      this.mode,
      (destroyedTeam) => this.handleMatchEnd(destroyedTeam === 'blue' ? 'red' : 'blue'),
      (tower) => {
        soundEngine.playExplosion();
        this.showNotice(`ВЫШКА КОМАНДЫ ${tower.team === 'blue' ? 'СИНИХ' : 'КРАСНЫХ'} УНИЧТОЖЕНА!`, '#f59e0b');
      }
    );

    this.physics.world.setBounds(0, 0, this.mapData.width, this.mapData.height);

    // 2. Spawn Player via unified BaseHero
    const spawnPt = this.playerTeam === 'blue' ? this.mapData.blueSpawnPoint : this.mapData.redSpawnPoint;
    this.playerHero = new BaseHero(this, spawnPt.x, spawnPt.y, this.heroData, this.playerTeam, true);
    this.playerHero.onDeath = (hero) => this.handleHeroDeath(hero);

    // Register Player in Stats Map
    this.heroStatsMap.set(this.playerHero, {
      hero: this.playerHero,
      name: this.heroData.name,
      heroKey: this.playerHeroKey,
      team: this.playerTeam,
      isPlayer: true,
      kills: 0,
      deaths: 0,
      assists: 0,
      gold: 300,
      minionsKilled: 0
    });

    // Camera follow - Instant locking without floaty lerp lag
    this.cameras.main.setBounds(0, 0, this.mapData.width, this.mapData.height);
    this.cameras.main.startFollow(this.playerHero.sprite, true, 1, 1);
    this.cameras.main.setRoundPixels(true);

    // 3. Spawn Bot Heroes
    this.spawnBots();

    // 4. Connect Unified Battle Controls HUD
    this.controlsHUD = new BattleControlsHUD(this, this.heroData, {
      onAttack: (dirX, dirY) => {
        this.playerHero.executeCombatSkill('attack', dirX, dirY, this.getAllCombatTargets(), (target) => {
          this.onHeroDamagedTarget(this.playerHero, target);
        });
      },
      onSkill: (slot, dirX, dirY) => {
        this.playerHero.executeCombatSkill(slot, dirX, dirY, this.getAllCombatTargets(), (target) => {
          this.onHeroDamagedTarget(this.playerHero, target);
        });
      },
      getNearestTarget: () => this.getNearestEnemyToPlayer(),
      getAimOrigin: () => ({ x: this.playerHero.x, y: this.playerHero.y })
    });

    const onResize = (gameSize: Phaser.Structs.Size) => {
      this.cameras.main.setViewport(0, 0, gameSize.width, gameSize.height);
      if (this.controlsHUD) this.controlsHUD.reposition();
    };
    this.scale.on('resize', onResize);
    this.events.once('shutdown', () => {
      this.scale.off('resize', onResize);
    });

    // 5. Minion Wave System
    this.minionSystem = new MinionWaveSystem(
      this,
      this.mapData.activeLanes,
      this.mapData.blueWaypoints,
      this.mapData.redWaypoints,
      (minion, killerIsHero) => this.handleMinionKilled(minion, killerIsHero)
    );

    // 6. MOBA Battle HUD (Score, Level, Timer, Minimap, Scoreboard Modal [TAB], Skill Upgrades [+])
    this.hud = new MobaBattleHUD(this, {
      playerProgression: this.progression,
      playerTeam: this.playerTeam,
      onUpgradeSkill: (idx) => {
        const success = InMatchProgressionManager.upgradeSkill(this.progression, idx);
        if (success) {
          soundEngine.playLevelUp();
          this.hud.updateProgressionUI(this.progression);
          this.showNotice(`НАВЫК УЛУЧШЕН ДО РАНГА ${this.progression.skillRanks[idx]}!`, '#22c55e');
        }
      },
      onExitMatch: () => {
        soundEngine.playClick();
        this.scene.start('HubScene');
      },
      getScoreboardData: () => this.getScoreboardData()
    });

    // Reposition upgrade [+] buttons matching skill buttons
    const s1Pos = this.controlsHUD.skill1Btn.getPosition();
    const s2Pos = this.controlsHUD.skill2Btn.getPosition();
    const ultPos = this.controlsHUD.ultBtn.getPosition();
    this.hud.setSkillButtonPositions({ s1: s1Pos, s2: s2Pos, ult: ultPos });

    this.showNotice('⚔️ MOBA БОЙ НАЧАЛСЯ! УНИЧТОЖЬТЕ ТРОН ВРАГА! ⚔️', '#38bdf8');

    this.events.once('shutdown', () => this.cleanUp());
  }

  private spawnBots() {
    this.botHeroes = [];
    const totalSlots = this.mode === 'solo' ? 2 : this.mode === 'duo' ? 4 : this.mode === 'trio' ? 6 : 8;
    const teamSize = totalSlots / 2;
    const availableHeroes = ['char_grim', 'char_bjorn', 'char_torf', 'char_omen', 'char_alrik', 'char_kraul', 'char_zaza', 'char_nihil'];

    // Blue bots (if player is not filling all blue slots)
    const blueBotsCount = this.playerTeam === 'blue' ? teamSize - 1 : teamSize;
    for (let i = 0; i < blueBotsCount; i++) {
      const hKey = availableHeroes[(i + 1) % availableHeroes.length];
      const hData = HEROES[hKey] || HEROES.char_grim;
      const bot = new BaseHero(
        this,
        this.mapData.blueSpawnPoint.x + (Math.random() - 0.5) * 60,
        this.mapData.blueSpawnPoint.y + (Math.random() - 0.5) * 60,
        hData,
        'blue',
        false
      );
      bot.onDeath = (h) => this.handleHeroDeath(h);
      this.botHeroes.push(bot);

      this.heroStatsMap.set(bot, {
        hero: bot,
        name: `Бот ${hData.name}`,
        heroKey: hKey,
        team: 'blue',
        isPlayer: false,
        kills: 0,
        deaths: 0,
        assists: 0,
        gold: 300,
        minionsKilled: 0
      });
    }

    // Red bots (if player is not filling all red slots)
    const redBotsCount = this.playerTeam === 'red' ? teamSize - 1 : teamSize;
    for (let i = 0; i < redBotsCount; i++) {
      const hKey = availableHeroes[(i + 3) % availableHeroes.length];
      const hData = HEROES[hKey] || HEROES.char_omen;
      const bot = new BaseHero(
        this,
        this.mapData.redSpawnPoint.x + (Math.random() - 0.5) * 60,
        this.mapData.redSpawnPoint.y + (Math.random() - 0.5) * 60,
        hData,
        'red',
        false
      );
      bot.onDeath = (h) => this.handleHeroDeath(h);
      this.botHeroes.push(bot);

      this.heroStatsMap.set(bot, {
        hero: bot,
        name: `Бот ${hData.name}`,
        heroKey: hKey,
        team: 'red',
        isPlayer: false,
        kills: 0,
        deaths: 0,
        assists: 0,
        gold: 300,
        minionsKilled: 0
      });
    }
  }

  private calculateDeathTimerSeconds(heroLevel: number): number {
    const elapsedMinutes = (this.time.now - this.matchStartTime) / 60000;
    // Mobile Legends formula: Base (4s) + (MatchMinute * 2.5s) + (HeroLevel * 1.2s)
    const timer = 4 + elapsedMinutes * 2.5 + heroLevel * 1.2;
    return Math.max(5, Math.round(timer));
  }

  private onHeroDamagedTarget(attacker: BaseHero, target: CombatTarget) {
    // Check if target is a hero
    const targetHero = target.heroRef;
    if (targetHero && targetHero !== attacker) {
      // Record damage history for assist tracking
      let dealers = this.recentDamageDealers.get(targetHero);
      if (!dealers) {
        dealers = [];
        this.recentDamageDealers.set(targetHero, dealers);
      }
      dealers.push({ attacker, time: this.time.now });
      // Keep only last 10 seconds of damage
      const cutoff = this.time.now - 10000;
      this.recentDamageDealers.set(targetHero, dealers.filter(d => d.time >= cutoff));
    }

    // Check if target is an allied hero inside any tower range: alert Tower Aggro!
    if (target.isHero && target.team !== attacker.team) {
      this.mapData.towers.forEach(t => {
        if (t.team === target.team && !t.isDestroyed) {
          t.notifyAlliedHeroDamaged({
            get x() { return attacker.x; },
            get y() { return attacker.y; },
            get hp() { return (attacker.isDown || attacker.isDyingAnimation) ? 0 : attacker.hp; },
            get active() { return !attacker.isDown && !attacker.isDyingAnimation && attacker.hp > 0 && !attacker.isInvulnerable && attacker.sprite.active; },
            isHero: true,
            team: attacker.team,
            takeDamage: (amt) => attacker.takeDamage(amt)
          });
        }
      });
    }
  }

  private handleHeroDeath(victim: BaseHero) {
    const victimStats = this.heroStatsMap.get(victim);
    if (victimStats) {
      victimStats.deaths++;
    }

    // Find killer and assisters from recent damage dealers
    const dealers = this.recentDamageDealers.get(victim) || [];
    const validDealers = dealers.filter(d => d.attacker.team !== victim.team && !d.attacker.isDown);
    const killerRecord = validDealers.length > 0 ? validDealers[validDealers.length - 1] : null;
    const killer = killerRecord ? killerRecord.attacker : null;

    if (killer) {
      if (killer.team === 'blue') this.blueKills++;
      else this.redKills++;

      const killerStats = this.heroStatsMap.get(killer);
      if (killerStats) {
        killerStats.kills++;
        killerStats.gold += 120;
      }

      // Check assists: teammates of killer who damaged victim within 10s (excluding killer)
      const assisters = new Set<BaseHero>();
      validDealers.forEach(d => {
        if (d.attacker !== killer && d.attacker.team === killer.team) {
          assisters.add(d.attacker);
        }
      });

      assisters.forEach(assister => {
        const aStats = this.heroStatsMap.get(assister);
        if (aStats) {
          aStats.assists++;
          aStats.gold += 60;
        }
      });

      if (killer.isPlayerControlled) {
        const res = InMatchProgressionManager.addExp(this.progression, 140, this.playerHero.heroData.hp);
        this.progression.kills++;
        this.progression.gold += 120;
        if (res.leveledUp) {
          this.playerHero.level = this.progression.level;
          this.playerHero.setMaxHp(this.playerHero.heroData.hp + this.progression.bonusHp);
          this.playerHero.damageMultiplier = 1.0 + this.progression.bonusAttackPct;
          soundEngine.playLevelUp();
          this.showNotice(`★ УРОВЕНЬ ПОВЫШЕН ДО ${this.progression.level}! ДОСТУПНО ОЧКО НАВЫКА [+] ★`, '#facc15');
        }
        this.hud.updateProgressionUI(this.progression);
      }
    } else {
      // Executed by tower / minion
      if (victim.team === 'blue') this.redKills++;
      else this.blueKills++;
    }

    soundEngine.playLevelUp();
    const elapsedSec = Math.floor((this.time.now - this.matchStartTime) / 1000);
    this.hud.updateScoreAndTimer(this.blueKills, this.redKills, elapsedSec);

    // Clear damage history
    this.recentDamageDealers.delete(victim);

    // Death timers & banner
    const deathSeconds = this.calculateDeathTimerSeconds(victim.level);
    if (victim.isPlayerControlled) {
      this.progression.deaths++;
      this.playerRespawnTimer = this.time.now + deathSeconds * 1000;
      this.hud.showDeathScreen(deathSeconds);
    } else {
      this.botRespawnTimers.set(victim, this.time.now + deathSeconds * 1000);
    }
  }

  private handleMinionKilled(minion: MobaMinion, killerIsHero: boolean) {
    if (this.playerHero.isDown) return;

    // Proximity EXP reward
    const dPlayer = Phaser.Math.Distance.Between(this.playerHero.x, this.playerHero.y, minion.x, minion.y);
    if (dPlayer < 350) {
      const bonusExp = killerIsHero ? Math.round(minion.expReward * 1.5) : minion.expReward;
      const res = InMatchProgressionManager.addExp(this.progression, bonusExp, this.playerHero.heroData.hp);
      if (killerIsHero) {
        this.progression.lastHits++;
        this.progression.gold += minion.goldReward;
        const pStats = this.heroStatsMap.get(this.playerHero);
        if (pStats) {
          pStats.minionsKilled++;
          pStats.gold += minion.goldReward;
        }
      }
      if (res.leveledUp) {
        this.playerHero.level = this.progression.level;
        this.playerHero.setMaxHp(this.playerHero.heroData.hp + this.progression.bonusHp);
        this.playerHero.damageMultiplier = 1.0 + this.progression.bonusAttackPct;
        soundEngine.playLevelUp();
        this.showNotice(`★ УРОВЕНЬ ПОВЫШЕН ДО ${this.progression.level}! ДОСТУПНО ОЧКО НАВЫКА [+] ★`, '#facc15');
      }
      this.hud.updateProgressionUI(this.progression);
    }
  }

  private getScoreboardData(): HeroScoreboardRow[] {
    const rows: HeroScoreboardRow[] = [];

    // Player row
    const pStats = this.heroStatsMap.get(this.playerHero);
    const pRespawnSec = this.playerRespawnTimer > 0 ? Math.max(1, Math.ceil((this.playerRespawnTimer - this.time.now) / 1000)) : undefined;
    rows.push({
      id: 'player',
      name: this.heroData.name,
      heroKey: this.playerHeroKey,
      team: this.playerTeam,
      level: this.playerHero.level,
      kills: pStats ? pStats.kills : this.progression.kills,
      deaths: pStats ? pStats.deaths : this.progression.deaths,
      assists: pStats ? pStats.assists : 0,
      gold: pStats ? pStats.gold : this.progression.gold,
      isPlayer: true,
      isDead: this.playerHero.isDown,
      respawnSec: pRespawnSec
    });

    // Bot rows
    this.botHeroes.forEach((bot, idx) => {
      const bStats = this.heroStatsMap.get(bot);
      const bRespawnTimer = this.botRespawnTimers.get(bot) || 0;
      const bRespawnSec = bRespawnTimer > 0 ? Math.max(1, Math.ceil((bRespawnTimer - this.time.now) / 1000)) : undefined;
      rows.push({
        id: `bot_${idx}`,
        name: bStats ? bStats.name : `Бот ${bot.heroData.name}`,
        heroKey: bot.heroKey,
        team: bot.team,
        level: bot.level,
        kills: bStats ? bStats.kills : 0,
        deaths: bStats ? bStats.deaths : 0,
        assists: bStats ? bStats.assists : 0,
        gold: bStats ? bStats.gold : 300,
        isPlayer: false,
        isDead: bot.isDown,
        respawnSec: bRespawnSec
      });
    });

    return rows;
  }

  private getAllCombatTargets(): CombatTarget[] {
    this.cachedCombatTargets.length = 0;

    // Player Hero
    if (this.playerHero && this.playerHero.active) {
      this.cachedCombatTargets.push(this.playerHero);
    }

    // Bot Heroes
    for (let i = 0; i < this.botHeroes.length; i++) {
      const bot = this.botHeroes[i];
      if (bot && bot.active) {
        this.cachedCombatTargets.push(bot);
      }
    }

    // Minions
    if (this.minionSystem && this.minionSystem.minions) {
      for (let i = 0; i < this.minionSystem.minions.length; i++) {
        const m = this.minionSystem.minions[i];
        if (m && m.active) {
          this.cachedCombatTargets.push(m);
        }
      }
    }

    // Towers
    if (this.mapData && this.mapData.towers) {
      for (let i = 0; i < this.mapData.towers.length; i++) {
        const t = this.mapData.towers[i];
        if (t && t.active) {
          this.cachedCombatTargets.push(t);
        }
      }
    }

    return this.cachedCombatTargets;
  }

  private getNearestEnemyToPlayer(): { x: number; y: number } | null {
    if (!this.playerHero || this.playerHero.isDown) return null;
    let nearest: { x: number; y: number } | null = null;
    let minDist = 480;

    const targets = this.getAllCombatTargets();
    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      if (t && t.active && t.hp > 0 && t.team !== this.playerTeam) {
        const d = Phaser.Math.Distance.Between(this.playerHero.x, this.playerHero.y, t.x, t.y);
        if (d < minDist) {
          minDist = d;
          nearest = { x: t.x, y: t.y };
        }
      }
    }
    return nearest;
  }

  override update(time: number, rawDelta: number) {
    if (this.isMatchOver) return;

    // Clamp frame delta to prevent physics tunneling & huge lag spikes (cap at 33ms ~30fps max step)
    const delta = Math.min(rawDelta, 33);

    // 1. Compute unified combat targets ONCE per frame
    const allTargets = this.getAllCombatTargets();

    // 2. Update Match Timer in HUD
    const elapsedSec = Math.floor((time - this.matchStartTime) / 1000);
    this.hud.updateScoreAndTimer(this.blueKills, this.redKills, elapsedSec);

    // 3. Player Respawn Timer & Movement
    if (!this.playerHero.isDown) {
      const moveVec = this.controlsHUD.getMovementVector();
      this.playerHero.move(moveVec);
      this.controlsHUD.update(delta);
    } else if (this.playerRespawnTimer > 0) {
      const remainingSec = Math.max(1, Math.ceil((this.playerRespawnTimer - time) / 1000));
      this.hud.updateDeathCountdown(remainingSec);

      if (time >= this.playerRespawnTimer) {
        this.playerRespawnTimer = 0;
        this.hud.hideDeathScreen();

        const spawnPt = this.playerTeam === 'blue' ? this.mapData.blueSpawnPoint : this.mapData.redSpawnPoint;
        this.playerHero.respawn(spawnPt.x, spawnPt.y);
        this.showNotice('⚡ ВЫ ВОЗРОДИЛИСЬ! НЕУЯЗВИМОСТЬ И УСКОРЕНИЕ (2с)! ⚡', '#38bdf8');
      }
    }

    this.playerHero.update(delta);

    // Sync Cooldown Overlays on HUD
    this.controlsHUD.updateCooldowns(this.playerHero.cds, this.playerHero.cdMax);

    // 4. Update Bot AI & Bot Respawns passing cached allTargets
    this.updateBotAI(time, delta, allTargets);

    // 5. Update Minion Wave System & Towers
    this.minionSystem.update(time, delta, allTargets as MinionCombatTarget[]);

    for (let i = 0; i < this.mapData.towers.length; i++) {
      this.mapData.towers[i].update(time, allTargets as TowerTarget[]);
    }

    // 6. Update Minimap (throttled to 150ms intervals)
    this.minimapTimer += delta;
    if (this.minimapTimer >= 150) {
      this.minimapTimer = 0;
      const allHeroes = [
        { x: this.playerHero.x, y: this.playerHero.y, team: this.playerHero.team, active: !this.playerHero.isDown },
        ...this.botHeroes.map(b => ({ x: b.x, y: b.y, team: b.team, active: !b.isDown }))
      ];
      this.hud.updateMinimap(
        this.mapData.width,
        this.mapData.height,
        this.mapData.towers,
        allHeroes,
        this.minionSystem.minions
      );
    }
  }

  private botMoveDirections: Map<BaseHero, { vx: number; vy: number; isAttacking: boolean }> = new Map();

  private updateBotAI(time: number, delta: number, providedTargets?: CombatTarget[]) {
    this.botAITimer += delta;
    const shouldMakeDecisions = this.botAITimer >= 160;
    if (shouldMakeDecisions) {
      this.botAITimer = 0;
    }

    const targets = shouldMakeDecisions ? (providedTargets || this.getAllCombatTargets()) : null;

    this.botHeroes.forEach(bot => {
      if (bot.isDown) {
        const respawnTime = this.botRespawnTimers.get(bot) || 0;
        if (respawnTime > 0 && time >= respawnTime) {
          this.botRespawnTimers.delete(bot);
          const spawnPt = bot.team === 'blue' ? this.mapData.blueSpawnPoint : this.mapData.redSpawnPoint;
          bot.respawn(spawnPt.x, spawnPt.y);
          this.botMoveDirections.delete(bot);
        }
        return;
      }

      bot.update(delta);

      if (shouldMakeDecisions && targets) {
        let nearestEnemy: CombatTarget | null = null;
        let minDist = 450;

        for (const t of targets) {
          if (t.active && t.hp > 0 && t.team !== bot.team) {
            const d = Phaser.Math.Distance.Between(bot.x, bot.y, t.x, t.y);
            if (d < minDist) {
              minDist = d;
              nearestEnemy = t;
            }
          }
        }

        const effectiveRange = bot.getEffectiveAttackRange();
        const followStopDist = effectiveRange * 0.65;

        if (nearestEnemy) {
          const dist = Phaser.Math.Distance.Between(bot.x, bot.y, nearestEnemy.x, nearestEnemy.y);
          const angle = Phaser.Math.Angle.Between(bot.x, bot.y, nearestEnemy.x, nearestEnemy.y);

          if (dist > followStopDist) {
            bot.cancelAttackAnimation();
            this.botMoveDirections.set(bot, { vx: Math.cos(angle), vy: Math.sin(angle), isAttacking: false });
          } else {
            this.botMoveDirections.set(bot, { vx: 0, vy: 0, isAttacking: true });
          }

          if (dist <= effectiveRange * 1.8) {
            if (bot.cds.ult <= 0 && dist <= effectiveRange * 1.8) {
              bot.executeCombatSkill('ult', Math.cos(angle), Math.sin(angle), targets, (t) => {
                this.onHeroDamagedTarget(bot, t);
              });
            } else if (bot.cds.s2 <= 0 && dist <= effectiveRange * 1.5) {
              bot.executeCombatSkill('s2', Math.cos(angle), Math.sin(angle), targets, (t) => {
                this.onHeroDamagedTarget(bot, t);
              });
            } else if (bot.cds.s1 <= 0 && dist <= effectiveRange * 1.4) {
              bot.executeCombatSkill('s1', Math.cos(angle), Math.sin(angle), targets, (t) => {
                this.onHeroDamagedTarget(bot, t);
              });
            } else if (bot.cds.attack <= 0 && dist <= effectiveRange) {
              bot.executeCombatSkill('attack', Math.cos(angle), Math.sin(angle), targets, (t) => {
                this.onHeroDamagedTarget(bot, t);
              });
            }
          }
        } else {
          bot.cancelAttackAnimation();
          const enemyThrone = bot.team === 'blue' ? this.mapData.redThrone : this.mapData.blueThrone;
          const angle = Phaser.Math.Angle.Between(bot.x, bot.y, enemyThrone.x, enemyThrone.y);
          this.botMoveDirections.set(bot, { vx: Math.cos(angle) * 0.75, vy: Math.sin(angle) * 0.75, isAttacking: false });
        }
      }

      // Smooth frame-by-frame physics movement
      const dir = this.botMoveDirections.get(bot);
      if (dir) {
        bot.move(new Phaser.Math.Vector2(dir.vx, dir.vy));
      }
    });
  }

  private handleMatchEnd(winnerTeam: MobaTeam) {
    if (this.isMatchOver) return;
    this.isMatchOver = true;

    const isVictory = winnerTeam === this.playerTeam;
    addMatchToHistory(this.playerHeroKey, isVictory ? 'win' : 'loss', 'Арена');

    const curStats = MatchHistoryManager.loadLocalStats();
    const ratingDelta = isVictory ? 25 : -15;
    const newRating = Math.max(0, curStats.rating + ratingDelta);

    MatchHistoryManager.logPvPMatch({
      result: isVictory ? 'VICTORY' : 'DEFEAT',
      heroId: this.playerHeroKey,
      mode: this.mode === 'duo' ? 'pvp_2v2' : 'pvp_1v1',
      durationSeconds: Math.max(10, Math.round((Date.now() - (this.matchStartTime || (Date.now() - 150000))) / 1000)),
      ratingDelta,
      currentRating: newRating,
      opponentNick: 'Вражеский Боец',
      opponentHero: this.botHeroes[0]?.heroKey || 'char_grim',
      teammateNick: this.mode === 'duo' ? 'Союзник' : null
    });

    if (isVictory) soundEngine.playVictory();
    else soundEngine.playMonsterUlt();

    this.hud.showMatchResult(winnerTeam);
  }

  private showNotice(text: string, color: string = '#ffffff') {
    const w = this.cameras.main.width;
    const banner = this.add.text(w / 2, 72, text, {
      fontSize: '12px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color
    }).setOrigin(0.5).setScrollFactor(0).setDepth(450);

    this.tweens.add({
      targets: banner,
      y: 84,
      alpha: 0,
      duration: 2500,
      ease: 'Quad.easeOut',
      onComplete: () => banner.destroy()
    });
  }

  private cleanUp() {
    this.hud?.destroy();
    this.controlsHUD?.destroy();
    this.minionSystem?.destroy();
    this.mapData?.towers.forEach(t => t.destroy());
    this.playerHero?.destroy();
    this.botHeroes.forEach(b => b.destroy());
  }
}
