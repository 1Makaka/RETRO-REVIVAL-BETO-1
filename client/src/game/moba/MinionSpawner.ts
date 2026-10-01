/**
 * Frantic Battles - MOBA Minion & Wave System (MinionSpawner.ts)
 * Features distinct procedural visual skins (Swordsman, Caster/Archer, Siege Golem),
 * walking bob animations, shadow ellipses, hit flash & sparks,
 * waypoint navigation, and last-hit bonus rewards.
 */

import Phaser from 'phaser';
import { MobaTeam, LaneType, Waypoint } from './MobaTypes';
import { TowerTarget } from './Tower';
import { soundEngine } from '../audio';

export interface MinionCombatTarget {
  x: number;
  y: number;
  hp: number;
  isHero: boolean;
  team: MobaTeam;
  takeDamage: (amount: number, fromHero?: boolean) => void;
  active: boolean;
}

export class MobaMinion implements TowerTarget {
  public scene: Phaser.Scene;
  public id: string;
  public team: MobaTeam;
  public lane: LaneType;
  public type: 'melee' | 'ranged' | 'siege';
  public x: number;
  public y: number;
  public maxHp: number;
  public hp: number;
  public damage: number;
  public attackRange: number;
  public attackSpeed: number; // ms
  public speed: number;
  public expReward: number;
  public goldReward: number;
  public isHero: boolean = false;
  public active: boolean = true;

  public waypoints: Waypoint[];
  public currentWaypointIndex: number = 0;
  public lastAttackTime: number = 0;
  public target: MinionCombatTarget | null = null;
  private targetSearchTimer: number = 0;

  // Visuals
  public shadowGfx!: Phaser.GameObjects.Ellipse;
  public container!: Phaser.GameObjects.Container;
  public minionGfx!: Phaser.GameObjects.Graphics;
  public hpBarBg!: Phaser.GameObjects.Rectangle;
  public hpBarFill!: Phaser.GameObjects.Rectangle;
  private walkTween?: Phaser.Tweens.Tween;

  private onDeathCallback: (minion: MobaMinion, killerIsHero: boolean) => void;

  constructor(
    scene: Phaser.Scene,
    id: string,
    team: MobaTeam,
    lane: LaneType,
    type: 'melee' | 'ranged' | 'siege',
    waypoints: Waypoint[],
    onDeath: (minion: MobaMinion, killerIsHero: boolean) => void
  ) {
    this.scene = scene;
    this.id = id;
    this.team = team;
    this.lane = lane;
    this.type = type;
    this.waypoints = waypoints;
    this.onDeathCallback = onDeath;

    const startPos = waypoints[0] || { x: 100, y: 100 };
    this.x = startPos.x;
    this.y = startPos.y;

    if (type === 'melee') {
      this.maxHp = 400;
      this.damage = 14;
      this.attackRange = 42;
      this.attackSpeed = 900;
      this.speed = 80;
      this.expReward = 35;
      this.goldReward = 15;
    } else if (type === 'ranged') {
      this.maxHp = 250;
      this.damage = 18;
      this.attackRange = 150;
      this.attackSpeed = 1250;
      this.speed = 70;
      this.expReward = 40;
      this.goldReward = 20;
    } else {
      // Siege Golem / Catapult
      this.maxHp = 750;
      this.damage = 34;
      this.attackRange = 110;
      this.attackSpeed = 1500;
      this.speed = 55;
      this.expReward = 80;
      this.goldReward = 45;
    }

    this.hp = this.maxHp;
    this.buildVisuals();
  }

  private buildVisuals() {
    const isBlue = this.team === 'blue';
    const mainColor = isBlue ? 0x38bdf8 : 0xef4444;
    const bodyColor = isBlue ? 0x1e3a8a : 0x7f1d1d;

    // 1. Shadow below feet
    const sRadX = this.type === 'siege' ? 16 : 10;
    const sRadY = this.type === 'siege' ? 7 : 4;
    this.shadowGfx = this.scene.add.ellipse(this.x, this.y + (this.type === 'siege' ? 12 : 8), sRadX * 2, sRadY * 2, 0x000000, 0.35)
      .setDepth(16);

    // 2. Container (Slightly enlarged minion size)
    this.container = this.scene.add.container(this.x, this.y).setDepth(22).setScale(1.22);
    this.minionGfx = this.scene.add.graphics();
    this.container.add(this.minionGfx);

    this.renderSkin(bodyColor, mainColor);

    // 3. Mini HP Bar
    const barW = this.type === 'siege' ? 26 : 18;
    const barH = 3;
    const barY = this.type === 'siege' ? -18 : -14;

    this.hpBarBg = this.scene.add.rectangle(0, barY, barW, barH, 0x090d16)
      .setStrokeStyle(1, 0x334155);
    this.hpBarFill = this.scene.add.rectangle(-barW / 2, barY, barW, barH - 1, mainColor)
      .setOrigin(0, 0.5);

    this.container.add([this.hpBarBg, this.hpBarFill]);

    // 4. Walking bobbing animation
    this.walkTween = this.scene.tweens.add({
      targets: this.minionGfx,
      y: -2,
      angle: isBlue ? 3 : -3,
      duration: 220,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private renderSkin(bodyColor: number, mainColor: number) {
    this.minionGfx.clear();

    if (this.type === 'melee') {
      // Swordsman (Пехотинец): Round silhouette, horned helmet, round shield with rim, sword
      // Body
      this.minionGfx.fillStyle(bodyColor, 1.0);
      this.minionGfx.fillCircle(0, 0, 9);
      this.minionGfx.lineStyle(1.5, mainColor, 1.0);
      this.minionGfx.strokeCircle(0, 0, 9);

      // Horned Helmet
      this.minionGfx.fillStyle(0x475569, 1.0);
      this.minionGfx.fillRect(-6, -8, 12, 5);
      this.minionGfx.lineStyle(1, 0xfacc15, 1.0);
      this.minionGfx.lineBetween(-7, -8, -9, -12); // left horn
      this.minionGfx.lineBetween(7, -8, 9, -12);   // right horn

      // Shield
      this.minionGfx.fillStyle(0x0f172a, 1.0);
      this.minionGfx.fillCircle(-7, 2, 4);
      this.minionGfx.lineStyle(1, mainColor, 1.0);
      this.minionGfx.strokeCircle(-7, 2, 4);

      // Sword
      this.minionGfx.lineStyle(2, 0xe2e8f0, 1.0);
      this.minionGfx.lineBetween(5, 2, 9, -5);
    } else if (this.type === 'ranged') {
      // Caster/Archer: Hooded cloak, glowing pinpoint eyes, wooden staff with crystal tip
      // Hood Cloak
      this.minionGfx.fillStyle(bodyColor, 1.0);
      this.minionGfx.fillRoundedRect(-7, -7, 14, 14, 3);
      this.minionGfx.lineStyle(1.5, 0x94a3b8, 1.0);
      this.minionGfx.strokeRoundedRect(-7, -7, 14, 14, 3);

      // Glowing eyes
      this.minionGfx.fillStyle(0xfde047, 1.0);
      this.minionGfx.fillRect(-3, -2, 2, 2);
      this.minionGfx.fillRect(1, -2, 2, 2);

      // Wooden Staff with glowing crystal
      this.minionGfx.lineStyle(2, 0x78350f, 1.0);
      this.minionGfx.lineBetween(6, 6, 8, -8);
      this.minionGfx.fillStyle(mainColor, 1.0);
      this.minionGfx.fillCircle(8, -9, 3);
    } else {
      // Siege Golem: Massive stone monster, iron pauldrons, glowing fissure on chest
      // Heavy Stone Body
      this.minionGfx.fillStyle(0x1e293b, 1.0);
      this.minionGfx.fillRoundedRect(-12, -12, 24, 24, 4);
      this.minionGfx.lineStyle(2, 0x475569, 1.0);
      this.minionGfx.strokeRoundedRect(-12, -12, 24, 24, 4);

      // Iron Pauldrons
      this.minionGfx.fillStyle(0x0f172a, 1.0);
      this.minionGfx.fillRect(-14, -10, 4, 8);
      this.minionGfx.fillRect(10, -10, 4, 8);

      // Blazing chest fissure
      this.minionGfx.lineStyle(2, 0xf97316, 1.0);
      this.minionGfx.lineBetween(-4, -4, 0, 2);
      this.minionGfx.lineBetween(0, 2, 4, -2);
      this.minionGfx.lineBetween(0, 2, 0, 6);
    }
  }

  public update(time: number, delta: number, enemies: MinionCombatTarget[]) {
    if (!this.active || this.hp <= 0) return;

    // 1. Validate current target on every frame (instant aggro drop if dead, inactive or out of range)
    if (this.target) {
      const currentDist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
      const maxChaseDist = this.type === 'ranged' ? 210 : 160;
      if (!this.target.active || this.target.hp <= 0 || currentDist > maxChaseDist) {
        this.target = null; // Drop aggro immediately!
      }
    }

    // 2. Search for new target if none
    this.targetSearchTimer += delta;
    if (!this.target && this.targetSearchTimer >= 150) {
      this.targetSearchTimer = 0;
      this.target = this.findNearestEnemy(enemies);
    }

    // 3. If target exists, engage or approach
    if (this.target && this.target.active && this.target.hp > 0) {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);

      if (dist <= this.attackRange) {
        // In attack range
        if (time - this.lastAttackTime >= this.attackSpeed) {
          this.lastAttackTime = time;
          this.performAttack(this.target);
        }
      } else {
        // Move towards target
        const angle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
        const moveDist = (this.speed * delta) / 1000;
        this.x += Math.cos(angle) * moveDist;
        this.y += Math.sin(angle) * moveDist;
      }
    } else {
      // 4. Move along waypoints
      this.moveAlongWaypoints(delta);
    }

    this.container.setPosition(this.x, this.y);
    this.shadowGfx.setPosition(this.x, this.y + (this.type === 'siege' ? 12 : 8));
  }

  private moveAlongWaypoints(delta: number) {
    if (this.currentWaypointIndex >= this.waypoints.length) return;

    const wp = this.waypoints[this.currentWaypointIndex];
    const dist = Phaser.Math.Distance.Between(this.x, this.y, wp.x, wp.y);

    if (dist < 20) {
      this.currentWaypointIndex++;
      if (this.currentWaypointIndex >= this.waypoints.length) return;
    }

    const nextWp = this.waypoints[this.currentWaypointIndex];
    const angle = Phaser.Math.Angle.Between(this.x, this.y, nextWp.x, nextWp.y);
    const moveDist = (this.speed * delta) / 1000;

    this.x += Math.cos(angle) * moveDist;
    this.y += Math.sin(angle) * moveDist;
  }

  private findNearestEnemy(enemies: MinionCombatTarget[]): MinionCombatTarget | null {
    let nearest: MinionCombatTarget | null = null;
    let minDist = this.type === 'ranged' ? 190 : 150; // Search radius strictly aligned with chase distance

    for (const enemy of enemies) {
      if (enemy && enemy.active && enemy.hp > 0 && enemy.team !== this.team) {
        const d = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
        if (d < minDist) {
          minDist = d;
          nearest = enemy;
        }
      }
    }
    return nearest;
  }

  private performAttack(target: MinionCombatTarget) {
    const isBlue = this.team === 'blue';
    const mainColor = isBlue ? 0x38bdf8 : 0xef4444;

    // HERO DAMAGE MITIGATION: Minions deal 68% less damage against heroes so heroes aren't shredded
    const effectiveDamage = target.isHero 
      ? Math.max(3, Math.round(this.damage * 0.32))
      : this.damage;

    // Check proximity to player hero/camera to avoid audio overload and unnecessary off-screen game object creation
    const playerHero = (this.scene as any).playerHero;
    const isNearPlayer = playerHero && playerHero.sprite && playerHero.sprite.active
      ? Phaser.Math.Distance.Between(this.x, this.y, playerHero.x, playerHero.y) < 360
      : true;

    if (this.type === 'melee') {
      if (isNearPlayer) soundEngine.playAttack();
      if (!isNearPlayer) {
        // Fast off-screen instant damage calculation without creating tweens/particles
        if (this.active && this.hp > 0 && target.active && target.hp > 0) {
          target.takeDamage(effectiveDamage, false);
        }
        return;
      }
      // Melee swing animation with wind-up for visible minions
      const targetX = target.x;
      const targetY = target.y;
      const slash = this.scene.add.circle(this.x + (targetX - this.x) * 0.45, this.y + (targetY - this.y) * 0.45, 9, mainColor, 0.85).setDepth(25);
      this.scene.tweens.add({
        targets: slash,
        scale: 1.4,
        alpha: 0,
        duration: 130,
        onComplete: () => {
          slash.destroy();
          if (this.active && this.hp > 0 && target.active && target.hp > 0) {
            const currentDist = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
            if (currentDist <= this.attackRange + 25) {
              target.takeDamage(effectiveDamage, false);
            }
          }
        }
      });
    } else {
      if (isNearPlayer) soundEngine.playCrossbowShoot();
      if (!isNearPlayer) {
        // Fast off-screen instant damage calculation without creating projectile game objects
        if (this.active && this.hp > 0 && target.active && target.hp > 0) {
          target.takeDamage(effectiveDamage, false);
        }
        return;
      }
      // Ranged bullet projectile for visible minions
      const projSize = this.type === 'siege' ? 6 : 4;
      const proj = this.scene.add.circle(this.x, this.y, projSize, mainColor, 0.95).setDepth(28);
      const startX = this.x;
      const startY = this.y;
      const targetX = target.x;
      const targetY = target.y;

      const flightDist = Phaser.Math.Distance.Between(startX, startY, targetX, targetY);
      const flightDuration = Math.max(120, Math.min(350, (flightDist / 420) * 1000));

      let hasHit = false;
      this.scene.tweens.add({
        targets: proj,
        x: targetX,
        y: targetY,
        duration: flightDuration,
        ease: 'Linear',
        onUpdate: () => {
          if (hasHit || !proj.active) return;
          if (target.active && target.hp > 0) {
            const d = Phaser.Math.Distance.Between(proj.x, proj.y, target.x, target.y);
            if (d < 16) {
              hasHit = true;
              proj.destroy();
              target.takeDamage(effectiveDamage, false);
              // Small impact spark
              const spark = this.scene.add.circle(target.x, target.y, 3, 0xfef08a, 0.9).setDepth(29);
              this.scene.tweens.add({ targets: spark, scale: 1.8, alpha: 0, duration: 100, onComplete: () => spark.destroy() });
            }
          }
        },
        onComplete: () => {
          if (proj.active) {
            proj.destroy();
            if (!hasHit && target && target.active && target.hp > 0) {
              const currentDist = Phaser.Math.Distance.Between(proj.x, proj.y, target.x, target.y);
              if (currentDist <= 28) {
                target.takeDamage(effectiveDamage, false);
              }
            }
          }
        }
      });
    }
  }

  public takeDamage(amount: number, fromHero: boolean = false) {
    if (!this.active || this.hp <= 0) return;

    this.hp = Math.max(0, this.hp - amount);

    // Hit Flash (0.08s white tint)
    this.minionGfx.setAlpha(0.3);
    this.scene.time.delayedCall(80, () => {
      if (this.active && this.minionGfx) {
        this.minionGfx.setAlpha(1.0);
      }
    });

    // Show visual FX & floating text only if hit by hero or near player camera
    const isNearPlayer = (this.scene as any).playerHero 
      ? Phaser.Math.Distance.Between(this.x, this.y, (this.scene as any).playerHero.x, (this.scene as any).playerHero.y) < 380 
      : true;

    if (fromHero || isNearPlayer) {
      // Sparks
      const spark = this.scene.add.circle(this.x, this.y, 3, 0xfca5a5, 0.9).setDepth(26);
      this.scene.tweens.add({ targets: spark, y: this.y - 12, alpha: 0, duration: 150, onComplete: () => spark.destroy() });

      // Floating Damage Number
      const dmgTxt = this.scene.add.text(this.x + (Math.random() - 0.5) * 12, this.y - 12, `-${amount}`, {
        fontSize: '10px',
        fontFamily: 'monospace',
        fontStyle: 'bold',
        color: fromHero ? '#facc15' : '#ffffff'
      }).setOrigin(0.5).setDepth(100);

      this.scene.tweens.add({
        targets: dmgTxt,
        y: this.y - 28,
        alpha: 0,
        duration: 450,
        onComplete: () => dmgTxt.destroy()
      });
    }

    const ratio = Math.max(0, this.hp / this.maxHp);
    const barW = this.type === 'siege' ? 26 : 18;
    this.hpBarFill.setScale(ratio, 1);

    if (this.hp <= 0) {
      this.die(fromHero);
    }
  }

  private die(killerIsHero: boolean) {
    this.active = false;
    if (this.walkTween) this.walkTween.stop();

    // Death burst
    const burst = this.scene.add.circle(this.x, this.y, 14, this.team === 'blue' ? 0x38bdf8 : 0xef4444, 0.8).setDepth(24);
    this.scene.tweens.add({
      targets: burst,
      scale: 1.8,
      alpha: 0,
      duration: 200,
      onComplete: () => burst.destroy()
    });

    this.destroy();
    this.onDeathCallback(this, killerIsHero);
  }

  public destroy() {
    this.active = false;
    if (this.walkTween) this.walkTween.stop();
    this.shadowGfx.destroy();
    this.container.destroy();
  }
}

export class MinionWaveSystem {
  private scene: Phaser.Scene;
  private waveInterval: number = 25000; // 25s
  private lastWaveTime: number = 0;
  private waveCount: number = 0;
  public minions: MobaMinion[] = [];

  private blueWaypoints: Record<LaneType, Waypoint[]>;
  private redWaypoints: Record<LaneType, Waypoint[]>;
  private activeLanes: LaneType[];
  private onMinionDeathCallback: (minion: MobaMinion, killerIsHero: boolean) => void;

  constructor(
    scene: Phaser.Scene,
    activeLanes: LaneType[],
    blueWaypoints: Record<LaneType, Waypoint[]>,
    redWaypoints: Record<LaneType, Waypoint[]>,
    onMinionDeath: (minion: MobaMinion, killerIsHero: boolean) => void
  ) {
    this.scene = scene;
    this.activeLanes = activeLanes;
    this.blueWaypoints = blueWaypoints;
    this.redWaypoints = redWaypoints;
    this.onMinionDeathCallback = onMinionDeath;

    // Spawn initial wave at 4 seconds
    this.lastWaveTime = scene.time.now - this.waveInterval + 4000;
  }

  public update(time: number, delta: number, allCombatTargets: MinionCombatTarget[]) {
    // Wave spawn check
    if (time - this.lastWaveTime >= this.waveInterval) {
      this.lastWaveTime = time;
      this.spawnWave(time);
    }

    // Update existing minions and clean up inactive ones in-place
    for (let i = this.minions.length - 1; i >= 0; i--) {
      const m = this.minions[i];
      if (m && m.active) {
        m.update(time, delta, allCombatTargets);
      }
      if (!m || !m.active) {
        this.minions.splice(i, 1);
      }
    }
  }

  private spawnWave(time: number) {
    this.waveCount++;
    const isMinute5 = time >= 300000; // 5 min into match
    const hasSiege = this.waveCount % 3 === 0 || isMinute5;

    this.activeLanes.forEach(lane => {
      const bWps = this.blueWaypoints[lane];
      const rWps = this.redWaypoints[lane];

      if (!bWps || !rWps || bWps.length === 0) return;

      // 1. Melee minions x 2
      for (let i = 0; i < 2; i++) {
        this.scene.time.delayedCall(i * 600, () => {
          const bMinion = new MobaMinion(
            this.scene,
            `blue_${lane}_m_${this.waveCount}_${i}`,
            'blue',
            lane,
            'melee',
            bWps,
            this.onMinionDeathCallback
          );
          const rMinion = new MobaMinion(
            this.scene,
            `red_${lane}_m_${this.waveCount}_${i}`,
            'red',
            lane,
            'melee',
            rWps,
            this.onMinionDeathCallback
          );
          this.minions.push(bMinion, rMinion);
        });
      }

      // 2. Ranged minion x 1
      this.scene.time.delayedCall(1200, () => {
        const bRanged = new MobaMinion(
          this.scene,
          `blue_${lane}_r_${this.waveCount}`,
          'blue',
          lane,
          'ranged',
          bWps,
          this.onMinionDeathCallback
        );
        const rRanged = new MobaMinion(
          this.scene,
          `red_${lane}_r_${this.waveCount}`,
          'red',
          lane,
          'ranged',
          rWps,
          this.onMinionDeathCallback
        );
        this.minions.push(bRanged, rRanged);
      });

      // 3. Siege Golem / Catapult (if wave is multiple of 3 or after 5 mins)
      if (hasSiege) {
        this.scene.time.delayedCall(1800, () => {
          const bSiege = new MobaMinion(
            this.scene,
            `blue_${lane}_s_${this.waveCount}`,
            'blue',
            lane,
            'siege',
            bWps,
            this.onMinionDeathCallback
          );
          const rSiege = new MobaMinion(
            this.scene,
            `red_${lane}_s_${this.waveCount}`,
            'red',
            lane,
            'siege',
            rWps,
            this.onMinionDeathCallback
          );
          this.minions.push(bSiege, rSiege);
        });
      }
    });
  }

  public destroy() {
    this.minions.forEach(m => m.destroy());
    this.minions = [];
  }
}
