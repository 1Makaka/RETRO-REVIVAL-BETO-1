/**
 * Frantic Battles - MOBA Tower & Throne Entity (Tower.ts)
 * Features Backdoor Protection (80% armor without minions + shield indicator),
 * Escalating Hero Damage (100% -> 140% -> 180% -> 230%),
 * Stepped stone pedestal with team crest, runic column, levitating pulsing crystal,
 * laser beam attacks, intelligent aggro logic, shadow ellipses, hit flash, and destruction effects.
 */

import Phaser from 'phaser';
import { MobaTeam, LaneType } from './MobaTypes';
import { soundEngine } from '../audio';

export interface TowerTarget {
  x: number;
  y: number;
  hp: number;
  isHero: boolean;
  team: MobaTeam;
  takeDamage: (amount: number, fromHero?: boolean) => void;
  active: boolean;
}

export class MobaTower {
  public scene: Phaser.Scene;
  public id: string;
  public team: MobaTeam;
  public lane: LaneType;
  public isThrone: boolean;
  public x: number;
  public y: number;
  public maxHp: number;
  public hp: number;
  public range: number = 270;
  public baseDamage: number = 140;
  public attackInterval: number = 1100; // ms
  public lastAttackTime: number = 0;
  public currentTarget: TowerTarget | null = null;
  public isDestroyed: boolean = false;
  public isHero: boolean = false;

  // Escalating Hero Damage (100% -> 140% -> 180% -> 230%)
  public consecutiveHeroHits: number = 0;
  public lastTargetHero: TowerTarget | null = null;

  // Backdoor Protection (80% armor when no enemy minions in range)
  public hasEnemyMinionsInRange: boolean = false;
  public isBackdoorShieldActive: boolean = true;
  private shieldIndicatorContainer!: Phaser.GameObjects.Container;
  private shieldDomeGfx!: Phaser.GameObjects.Arc;
  private backdoorScanTimer: number = 250;

  public get active(): boolean {
    return !this.isDestroyed;
  }

  // Visuals
  public shadowGfx!: Phaser.GameObjects.Ellipse;
  public pedestalGfx!: Phaser.GameObjects.Graphics;
  public crystalGfx!: Phaser.GameObjects.Arc;
  public crystalGlow!: Phaser.GameObjects.Arc;
  public coreRotator?: Phaser.GameObjects.Rectangle;
  public rangeGfx!: Phaser.GameObjects.Arc;
  public hpBarBg!: Phaser.GameObjects.Rectangle;
  public hpBarFill!: Phaser.GameObjects.Rectangle;
  public hpText!: Phaser.GameObjects.Text;
  public nameLabel!: Phaser.GameObjects.Text;
  public beamGfx!: Phaser.GameObjects.Graphics;
  private floatTween?: Phaser.Tweens.Tween;

  private onDestroyCallback?: (tower: MobaTower) => void;

  constructor(
    scene: Phaser.Scene,
    id: string,
    team: MobaTeam,
    lane: LaneType,
    isThrone: boolean,
    x: number,
    y: number,
    onDestroy?: (tower: MobaTower) => void
  ) {
    this.scene = scene;
    this.id = id;
    this.team = team;
    this.lane = lane;
    this.isThrone = isThrone;
    this.x = x;
    this.y = y;
    this.onDestroyCallback = onDestroy;

    this.maxHp = isThrone ? 9000 : 4200;
    this.hp = this.maxHp;
    this.baseDamage = isThrone ? 260 : 200;
    this.range = isThrone ? 340 : 280;

    this.beamGfx = scene.add.graphics().setDepth(45);
    this.buildVisuals();
  }

  private buildVisuals() {
    const isBlue = this.team === 'blue';
    const mainColor = isBlue ? 0x38bdf8 : 0xef4444;
    const accentColor = isBlue ? 0x60a5fa : 0xf87171;

    // 1. Shadow below structure
    const shadowRadiusX = this.isThrone ? 44 : 32;
    const shadowRadiusY = this.isThrone ? 20 : 14;
    this.shadowGfx = this.scene.add.ellipse(this.x, this.y + (this.isThrone ? 24 : 18), shadowRadiusX * 2, shadowRadiusY * 2, 0x000000, 0.38)
      .setDepth(18);

    // 2. Stepped Pedestal & Runic Column
    this.pedestalGfx = this.scene.add.graphics().setDepth(20);

    if (this.isThrone) {
      // Monolithic Altar with surrounding spires
      this.pedestalGfx.fillStyle(0x0f172a, 1.0);
      this.pedestalGfx.fillRoundedRect(this.x - 42, this.y - 30, 84, 60, 6);
      this.pedestalGfx.lineStyle(3, 0x334155, 1.0);
      this.pedestalGfx.strokeRoundedRect(this.x - 42, this.y - 30, 84, 60, 6);

      this.pedestalGfx.fillStyle(isBlue ? 0x1e3a8a : 0x7f1d1d, 0.9);
      this.pedestalGfx.fillRoundedRect(this.x - 30, this.y - 20, 60, 40, 4);
      this.pedestalGfx.lineStyle(2, mainColor, 0.9);
      this.pedestalGfx.strokeRoundedRect(this.x - 30, this.y - 20, 60, 40, 4);

      // 4 Spires in corners
      const spires = [
        { x: this.x - 32, y: this.y - 22 },
        { x: this.x + 32, y: this.y - 22 },
        { x: this.x - 32, y: this.y + 22 },
        { x: this.x + 32, y: this.y + 22 }
      ];
      spires.forEach(sp => {
        this.pedestalGfx.fillStyle(0x1e293b, 1.0);
        this.pedestalGfx.fillRect(sp.x - 5, sp.y - 5, 10, 10);
        this.pedestalGfx.lineStyle(1.5, mainColor, 0.8);
        this.pedestalGfx.strokeRect(sp.x - 5, sp.y - 5, 10, 10);
      });

      // Rotating protective shield core
      this.coreRotator = this.scene.add.rectangle(this.x, this.y, 28, 28)
        .setStrokeStyle(2, accentColor, 0.8).setDepth(22);
      this.scene.tweens.add({
        targets: this.coreRotator,
        angle: 360,
        duration: 3500,
        repeat: -1
      });

      // Levitating Master Crystal
      this.crystalGlow = this.scene.add.circle(this.x, this.y - 10, 26, mainColor, 0.35).setDepth(23);
      this.crystalGfx = this.scene.add.circle(this.x, this.y - 10, 15, 0xffffff, 0.95).setDepth(24);
      this.crystalGfx.setStrokeStyle(3, mainColor);

      this.nameLabel = this.scene.add.text(this.x, this.y - 56, isBlue ? '👑 ГЛАВНЫЙ ТРОН СИНИХ' : '👑 ГЛАВНЫЙ ТРОН КРАСНЫХ', {
        fontSize: '11px',
        fontFamily: 'monospace',
        fontStyle: 'bold',
        color: isBlue ? '#38bdf8' : '#f87171'
      }).setOrigin(0.5).setDepth(30);

    } else {
      // Regular Defense Tower
      this.pedestalGfx.fillStyle(0x1e293b, 1.0);
      this.pedestalGfx.fillRoundedRect(this.x - 26, this.y - 16, 52, 34, 4);
      this.pedestalGfx.lineStyle(2, 0x475569, 1.0);
      this.pedestalGfx.strokeRoundedRect(this.x - 26, this.y - 16, 52, 34, 4);

      this.pedestalGfx.fillStyle(isBlue ? 0x1e3a8a : 0x7f1d1d, 0.95);
      this.pedestalGfx.fillRect(this.x - 16, this.y - 28, 32, 28);
      this.pedestalGfx.lineStyle(2, mainColor, 0.95);
      this.pedestalGfx.strokeRect(this.x - 16, this.y - 28, 32, 28);

      // Runic neon glowing veins
      this.pedestalGfx.lineStyle(1.5, 0xffffff, 0.85);
      this.pedestalGfx.lineBetween(this.x, this.y - 26, this.x, this.y - 2);
      this.pedestalGfx.lineBetween(this.x - 8, this.y - 14, this.x + 8, this.y - 14);

      // Levitating Tower Crystal
      this.crystalGlow = this.scene.add.circle(this.x, this.y - 42, 18, mainColor, 0.4).setDepth(23);
      this.crystalGfx = this.scene.add.circle(this.x, this.y - 42, 10, 0xffffff, 0.95).setDepth(24);
      this.crystalGfx.setStrokeStyle(2, mainColor);

      const laneName = this.lane === 'top' ? 'ВЕРХ' : this.lane === 'mid' ? 'МИД' : 'НИЗ';
      this.nameLabel = this.scene.add.text(this.x, this.y - 58, `ВЫШКА (${laneName})`, {
        fontSize: '9px',
        fontFamily: 'monospace',
        fontStyle: 'bold',
        color: isBlue ? '#93c5fd' : '#fca5a5'
      }).setOrigin(0.5).setDepth(30);
    }

    // Sine Wave Levitating Tween on Crystal + Glow
    this.floatTween = this.scene.tweens.add({
      targets: [this.crystalGfx, this.crystalGlow],
      y: (this.isThrone ? this.y - 10 : this.y - 42) - 6,
      scaleX: 1.18,
      scaleY: 1.18,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Range outline circle
    this.rangeGfx = this.scene.add.circle(this.x, this.y, this.range)
      .setStrokeStyle(1.5, mainColor, 0.22).setDepth(15);

    // HP Bar: Fighting Game style banner
    const barW = this.isThrone ? 70 : 50;
    const barH = 6;
    const barY = this.y - (this.isThrone ? 44 : 46);

    this.hpBarBg = this.scene.add.rectangle(this.x, barY, barW, barH, 0x090d16)
      .setStrokeStyle(1, 0x64748b).setDepth(28);
    this.hpBarFill = this.scene.add.rectangle(this.x - barW / 2, barY, barW, barH - 2, mainColor)
      .setOrigin(0, 0.5).setDepth(29);
    this.hpText = this.scene.add.text(this.x, barY - 7, `${this.hp}/${this.maxHp}`, {
      fontSize: '7px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#e2e8f0'
    }).setOrigin(0.5).setDepth(30);

    // 3. Backdoor Protection Shield Dome & Indicator
    this.shieldDomeGfx = this.scene.add.circle(this.x, this.y, this.isThrone ? 50 : 38, 0x38bdf8, 0.22)
      .setStrokeStyle(2, 0x93c5fd, 0.7).setDepth(25);
    this.scene.tweens.add({
      targets: this.shieldDomeGfx,
      scale: 1.12,
      alpha: 0.12,
      duration: 800,
      yoyo: true,
      repeat: -1
    });

    this.shieldIndicatorContainer = this.scene.add.container(this.x, barY - 18).setDepth(32);
    const shieldBadgeBg = this.scene.add.rectangle(0, 0, 80, 14, 0x0f172a, 0.9)
      .setStrokeStyle(1, 0x38bdf8);
    const shieldText = this.scene.add.text(0, 0, '🛡 80% БРОНЯ', {
      fontSize: '8px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#38bdf8'
    }).setOrigin(0.5);
    this.shieldIndicatorContainer.add([shieldBadgeBg, shieldText]);
  }

  public notifyAlliedHeroDamaged(aggressor: TowerTarget) {
    if (this.isDestroyed || aggressor.team === this.team) return;
    if (!aggressor.active || aggressor.hp <= 0) return;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, aggressor.x, aggressor.y);
    if (dist <= this.range) {
      this.currentTarget = aggressor;
      this.consecutiveHeroHits = 0;
      this.lastTargetHero = aggressor;
    }
  }

  public update(time: number, possibleTargets: TowerTarget[]) {
    if (this.isDestroyed) {
      this.beamGfx.clear();
      return;
    }

    // 1. Backdoor Protection Scan (Throttled to run every 250ms)
    this.backdoorScanTimer += 16;
    if (this.backdoorScanTimer >= 250) {
      this.backdoorScanTimer = 0;
      let enemyMinionsInRange = false;
      for (let i = 0; i < possibleTargets.length; i++) {
        const t = possibleTargets[i];
        if (t && t.active && t.hp > 0 && t.team !== this.team && !t.isHero) {
          if (Phaser.Math.Distance.Between(this.x, this.y, t.x, t.y) <= this.range) {
            enemyMinionsInRange = true;
            break;
          }
        }
      }
      this.hasEnemyMinionsInRange = enemyMinionsInRange;
      this.isBackdoorShieldActive = !enemyMinionsInRange;

      this.shieldDomeGfx.setVisible(this.isBackdoorShieldActive);
      this.shieldIndicatorContainer.setVisible(this.isBackdoorShieldActive);
    }

    // 2. Validate current target
    if (this.currentTarget) {
      const d = Phaser.Math.Distance.Between(this.x, this.y, this.currentTarget.x, this.currentTarget.y);
      if (d > this.range || !this.currentTarget.active || this.currentTarget.hp <= 0) {
        this.currentTarget = null;
        this.consecutiveHeroHits = 0;
        this.lastTargetHero = null;
        this.beamGfx.clear();
      }
    }

    // 3. Acquire new target: Single-pass scan for nearest enemy minion & hero
    if (!this.currentTarget) {
      this.beamGfx.clear();
      let chosen: TowerTarget | null = null;
      let nearestHero: TowerTarget | null = null;
      let minHeroDist = this.range;
      let nearestMinion: TowerTarget | null = null;
      let minMinionDist = this.range;

      for (let i = 0; i < possibleTargets.length; i++) {
        const t = possibleTargets[i];
        if (t && t.active && t.hp > 0 && t.team !== this.team) {
          const d = Phaser.Math.Distance.Between(this.x, this.y, t.x, t.y);
          if (d <= this.range) {
            if (t.isHero) {
              if (d < minHeroDist) {
                minHeroDist = d;
                nearestHero = t;
              }
            } else {
              if (d < minMinionDist) {
                minMinionDist = d;
                nearestMinion = t;
              }
            }
          }
        }
      }

      if (nearestHero && (!nearestMinion || minHeroDist < 220)) {
        chosen = nearestHero;
      } else {
        chosen = nearestMinion;
      }

      this.currentTarget = chosen;
      if (chosen && chosen.isHero) {
        if (this.lastTargetHero !== chosen) {
          this.consecutiveHeroHits = 0;
          this.lastTargetHero = chosen;
        }
      } else {
        this.consecutiveHeroHits = 0;
        this.lastTargetHero = null;
      }
    }

    // 4. Attack cooldown tick
    if (this.currentTarget && time - this.lastAttackTime >= this.attackInterval) {
      this.lastAttackTime = time;
      this.fireAttack(this.currentTarget);
    }
  }

  private fireAttack(target: TowerTarget) {
    if (!target || !target.active || target.hp <= 0) {
      this.currentTarget = null;
      this.beamGfx.clear();
      return;
    }

    const dist = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
    if (dist > this.range) {
      this.currentTarget = null;
      this.beamGfx.clear();
      return;
    }

    const isBlue = this.team === 'blue';
    const beamColor = isBlue ? 0x38bdf8 : 0xef4444;

    soundEngine.playCast();

    let calculatedDamage = this.baseDamage;

    // Escalating Damage Multipliers on Heroes:
    // 1st hit: 100 dmg, 2nd hit: 200 dmg (2x), 3rd hit: 350 dmg (3.5x), 4th+ hit: 500 dmg (5x)
    if (target.isHero) {
      this.consecutiveHeroHits++;
      let mult = 0.5; // ~100 dmg base
      if (this.consecutiveHeroHits === 1) mult = 0.5; // 100 dmg
      else if (this.consecutiveHeroHits === 2) mult = 1.0; // 200 dmg (2x increase!)
      else if (this.consecutiveHeroHits === 3) mult = 1.75; // 350 dmg
      else mult = 2.5; // 500 dmg max

      // Extra 25% damage if diving tower without friendly minions (Backdoor penalty)
      if (this.isBackdoorShieldActive) {
        mult *= 1.25;
      }

      calculatedDamage = Math.round(this.baseDamage * mult);
    } else {
      this.consecutiveHeroHits = 0;
      calculatedDamage = Math.round(this.baseDamage * 0.45); // Balanced minion wave clearance
    }

    // Laser Beam VFX with particles trail
    this.beamGfx.clear();
    this.beamGfx.lineStyle(target.isHero ? 7 : 5, beamColor, 0.45);
    this.beamGfx.lineBetween(this.x, this.y - 20, target.x, target.y);
    this.beamGfx.lineStyle(2.5, 0xffffff, 0.95);
    this.beamGfx.lineBetween(this.x, this.y - 20, target.x, target.y);

    // Particle sparks at target impact
    for (let i = 0; i < (target.isHero ? 7 : 4); i++) {
      const spark = this.scene.add.circle(target.x, target.y, 3.5, beamColor, 0.9).setDepth(46);
      const angle = Math.random() * Math.PI * 2;
      const dist = 18 + Math.random() * 24;
      this.scene.tweens.add({
        targets: spark,
        x: target.x + Math.cos(angle) * dist,
        y: target.y + Math.sin(angle) * dist,
        scale: 0.2,
        alpha: 0,
        duration: 180,
        onComplete: () => spark.destroy()
      });
    }

    this.scene.time.delayedCall(120, () => {
      this.beamGfx.clear();
      if (target.active && target.hp > 0) {
        target.takeDamage(calculatedDamage, false);
      }
    });
  }

  public takeDamage(amount: number, fromHero: boolean = false) {
    if (this.isDestroyed) return;

    let finalDmg = amount;
    if (fromHero) {
      finalDmg = Math.round(amount * 2.0); // Heroes deal 2.0x base damage to towers (increased by ~25%)
      if (this.isBackdoorShieldActive) {
        finalDmg = Math.max(1, Math.round(finalDmg * 0.55)); // 45% reduction without minions
      }
    }

    this.hp = Math.max(0, this.hp - finalDmg);
    this.updateHpBar();

    // Hit Flash
    this.crystalGfx.setFillStyle(0xffffff, 1.0);
    this.scene.time.delayedCall(80, () => {
      if (!this.isDestroyed) {
        this.crystalGfx.setFillStyle(0xffffff, 0.95);
      }
    });

    // Floating Damage Numbers
    const dmgTxt = this.scene.add.text(
      this.x + (Math.random() - 0.5) * 20,
      this.y - 30,
      this.isBackdoorShieldActive && fromHero ? `-${finalDmg} (БРОНЯ 🛡)` : `-${finalDmg}`,
      {
        fontSize: '11px',
        fontFamily: 'monospace',
        fontStyle: 'bold',
        color: this.isBackdoorShieldActive && fromHero ? '#38bdf8' : '#fbbf24'
      }
    ).setOrigin(0.5).setDepth(100);

    this.scene.tweens.add({
      targets: dmgTxt,
      y: this.y - 55,
      alpha: 0,
      duration: 600,
      onComplete: () => dmgTxt.destroy()
    });

    if (this.hp <= 0) {
      this.destroyStructure();
    }
  }

  private updateHpBar() {
    const ratio = Math.max(0, this.hp / this.maxHp);
    const barW = this.isThrone ? 70 : 50;
    this.hpBarFill.setScale(ratio, 1);
    this.hpText.setText(`${this.hp}/${this.maxHp}`);
  }

  private destroyStructure() {
    this.isDestroyed = true;
    soundEngine.playExplosion();
    this.scene.cameras.main.shake(250, 0.018);

    if (this.floatTween) this.floatTween.stop();
    this.beamGfx.clear();
    this.rangeGfx.destroy();
    this.hpBarBg.destroy();
    this.hpBarFill.destroy();
    this.hpText.destroy();
    this.nameLabel.destroy();
    this.crystalGlow.destroy();
    this.shieldDomeGfx.destroy();
    this.shieldIndicatorContainer.destroy();
    if (this.coreRotator) this.coreRotator.destroy();

    // Shattered fragments
    this.crystalGfx.setFillStyle(0x475569);
    this.pedestalGfx.clear();
    this.pedestalGfx.fillStyle(0x1e293b, 0.8);
    this.pedestalGfx.fillRoundedRect(this.x - 24, this.y - 12, 48, 24, 4);

    if (this.onDestroyCallback) {
      this.onDestroyCallback(this);
    }
  }

  public destroy() {
    this.isDestroyed = true;
    if (this.floatTween) this.floatTween.stop();
    this.beamGfx.destroy();
    this.shadowGfx.destroy();
    this.pedestalGfx.destroy();
    this.crystalGfx.destroy();
    this.crystalGlow.destroy();
    this.rangeGfx.destroy();
    this.hpBarBg.destroy();
    this.hpBarFill.destroy();
    this.hpText.destroy();
    this.nameLabel.destroy();
    this.shieldDomeGfx.destroy();
    this.shieldIndicatorContainer.destroy();
    if (this.coreRotator) this.coreRotator.destroy();
  }
}
