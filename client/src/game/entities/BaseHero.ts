/**
 * Frantic Battles - Unified Base Hero (BaseHero.ts)
 * 100% Faithful Port of DungeonScene combat mechanics, visual animations,
 * particles, skill trajectories, and Mobile Legends style death/respawn lifecycle.
 */

import Phaser from 'phaser';
import { HeroData } from '../players';
import { soundEngine } from '../audio';

export interface CombatTarget {
  x: number;
  y: number;
  hp: number;
  team?: 'blue' | 'red';
  isHero?: boolean;
  takeDamage: (amount: number, fromHero?: boolean) => void;
  active: boolean;
  isStunned?: boolean;
  isSlowed?: boolean;
  heroRef?: BaseHero;
  isPlayerControlled?: boolean;
}

export class BaseHero {
  public scene: Phaser.Scene;
  public heroKey: string;
  public heroData: HeroData;
  public team: 'blue' | 'red';
  public isPlayerControlled: boolean;
  public onDeath?: (hero: BaseHero) => void;

  // Visuals & Physics
  public sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  public weaponVisual: Phaser.GameObjects.Image;
  public shadowGfx: Phaser.GameObjects.Ellipse;
  public hpBarBg: Phaser.GameObjects.Rectangle;
  public hpBarFill: Phaser.GameObjects.Rectangle;
  public nameLabel: Phaser.GameObjects.Text;

  // Stats
  public hp: number;
  public maxHp: number;
  public baseSpeed: number;
  public speed: number;
  public damageMultiplier: number = 1.0;
  public defenseMultiplier: number = 1.0;

  // Hero Progression Level
  public level: number = 1;

  // Combat States
  public isDown: boolean = false;
  public isStunned: boolean = false;
  public isSlowed: boolean = false;
  public isInvulnerable: boolean = false;
  public isUltChanneling: boolean = false;
  public isMonster: boolean = false;

  // Specific hero states
  public torfStoneSkin: boolean = false;
  public torfShieldAura: Phaser.GameObjects.Arc | null = null;
  public torfShieldBorder: Phaser.GameObjects.Arc | null = null;
  public torfShieldTween: Phaser.Tweens.Tween | null = null;
  public kraulUltActive: boolean = false;
  public alrikShieldActive: boolean = false;
  public alrikShieldGfx: Phaser.GameObjects.Rectangle | null = null;
  public bjornActiveAxe: Phaser.GameObjects.Rectangle | null = null;
  public isUltAirborne: boolean = false;
  public omenLandCallback?: () => void;

  public weaponAttackAngle: number = 0;
  public weaponSwingAngle: number = 0;
  public weaponThrustDist: number = 0;
  public attackFacingTimer: number = 0;
  public aimVector: Phaser.Math.Vector2 = new Phaser.Math.Vector2(1, 0);

  // Cooldowns (ms)
  public cds = { s1: 0, s2: 0, ult: 0, attack: 0 };
  public cdMax = { s1: 3000, s2: 4500, ult: 14000, attack: 340 };

  // Combat & Out-of-Combat Regen Tracking
  public lastCombatTime: number = 0;
  private regenSparkTimer: number = 0;

  // Death / Respawn state
  public isDyingAnimation: boolean = false;
  public respawnTimestamp: number = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    heroData: HeroData,
    team: 'blue' | 'red' = 'blue',
    isPlayer: boolean = true
  ) {
    this.scene = scene;
    this.heroData = heroData;
    this.heroKey = heroData.id;
    this.team = team;
    this.isPlayerControlled = isPlayer;

    this.maxHp = heroData.hp;
    this.hp = heroData.hp;
    this.baseSpeed = Math.round(heroData.speed * 0.88);
    this.speed = this.baseSpeed;
    this.lastCombatTime = 0;

    this.cdMax = {
      s1: (heroData.skills[0]?.cooldown || 3.0) * 1000,
      s2: (heroData.skills[1]?.cooldown || 4.5) * 1000,
      ult: (heroData.skills[2]?.cooldown || 14.0) * 1000,
      attack: 340
    };

    // 1. Shadow below feet
    this.shadowGfx = scene.add.ellipse(x, y + 16, 28, 12, 0x000000, 0.38)
      .setDepth(40);

    // 2. Main Sprite
    this.sprite = scene.physics.add.sprite(x, y, heroData.id)
      .setScale(1.2)
      .setDepth(50);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setCircle(14, 2, 2);

    // 3. Dynamic Weapon Rendering
    const weaponTex = this.getDefaultWeaponTexture(this.heroKey);
    this.weaponVisual = scene.add.image(x + 16, y + 4, weaponTex)
      .setScale(1.1)
      .setDepth(51);

    if (this.heroKey === 'char_kraul') {
      this.weaponVisual.setVisible(false);
    }

    // 4. Overhead HP Bar & Name
    this.hpBarBg = scene.add.rectangle(x, y - 28, 42, 6, 0x0f172a, 0.85)
      .setStrokeStyle(1, 0x000000).setDepth(60);
    this.hpBarFill = scene.add.rectangle(x - 20, y - 28, 40, 4, team === 'blue' ? 0x38bdf8 : 0xef4444)
      .setOrigin(0, 0.5).setDepth(61);
    this.nameLabel = scene.add.text(x, y - 38, heroData.name, {
      fontSize: '9px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: team === 'blue' ? '#38bdf8' : '#ef4444'
    }).setOrigin(0.5).setDepth(62);
  }

  public isHero: boolean = true;
  public get active(): boolean {
    return !this.isDown && !this.isDyingAnimation && this.hp > 0 && !this.isInvulnerable && !!this.sprite && this.sprite.active;
  }
  public get heroRef(): BaseHero {
    return this;
  }
  public get x(): number { return this.sprite ? this.sprite.x : 0; }
  public get y(): number { return this.sprite ? this.sprite.y : 0; }

  public setPosition(x: number, y: number) {
    this.sprite.setPosition(x, y);
    this.updateAttachedPositions();
  }

  public update(delta: number) {
    if (this.isDown || !this.sprite.active) return;

    // Cooldown ticks
    this.cds.s1 = Math.max(0, this.cds.s1 - delta);
    this.cds.s2 = Math.max(0, this.cds.s2 - delta);
    this.cds.ult = Math.max(0, this.cds.ult - delta);
    this.cds.attack = Math.max(0, this.cds.attack - delta);

    if (this.attackFacingTimer > 0) {
      this.attackFacingTimer -= delta;
    }

    // Out-of-combat HP Regeneration (starts 4 seconds after taking or dealing damage)
    if (!this.isDown && !this.isDyingAnimation && this.hp > 0 && this.hp < this.maxHp) {
      const now = this.scene.time.now;
      const timeSinceCombat = now - this.lastCombatTime;
      if (timeSinceCombat >= 4000) {
        const regenPerSec = Math.max(15, Math.round(this.maxHp * 0.045)); // 4.5% max HP / sec (~45 HP/s)
        const hpGained = (regenPerSec * delta) / 1000;
        this.hp = Math.min(this.maxHp, this.hp + hpGained);
        this.updateHpBar();

        // Green healing sparkles
        this.regenSparkTimer += delta;
        if (this.regenSparkTimer >= 500) {
          this.regenSparkTimer = 0;
          const healSpark = this.scene.add.circle(
            this.x + (Math.random() - 0.5) * 22,
            this.y + (Math.random() - 0.5) * 18,
            3.5,
            0x4ade80,
            0.9
          ).setDepth(62);
          this.scene.tweens.add({
            targets: healSpark,
            y: healSpark.y - 28,
            alpha: 0,
            scale: 0.2,
            duration: 450,
            onComplete: () => healSpark.destroy()
          });
        }
      }
    }

    this.updateAttachedPositions();
  }

  public cancelAttackAnimation() {
    this.attackFacingTimer = 0;
    this.weaponSwingAngle = 0;
    this.weaponThrustDist = 0;
    if (this.weaponVisual && !this.scene?.tweens?.isTweening(this.weaponVisual)) {
      this.weaponVisual.setRotation(0);
    }
  }

  public getEffectiveAttackRange(): number {
    if (this.heroKey === 'char_grim' || this.heroKey === 'char_omen') return 240;
    if (this.heroKey === 'char_kraul' || this.heroKey === 'char_alrik') return 110;
    return 80;
  }

  public move(vec: Phaser.Math.Vector2) {
    if (this.isDown || this.isStunned || this.torfStoneSkin) {
      this.sprite.setVelocity(0, 0);
      return;
    }

    if (vec.lengthSq() > 0.02) {
      const currentSpeed = this.isSlowed ? this.speed * 0.6 : this.speed;
      this.sprite.setVelocity(vec.x * currentSpeed, vec.y * currentSpeed);

      if (this.attackFacingTimer <= 0) {
        if (this.heroKey === 'char_nihil') {
          this.sprite.setRotation(Math.atan2(vec.y, vec.x) + Math.PI / 2);
          this.sprite.setFlipX(false);
        } else if (vec.x !== 0) {
          this.sprite.setFlipX(vec.x < 0);
        }
      } else {
        // While attacking or aiming, stay facing the shooting/aim direction!
        if (this.heroKey === 'char_nihil') {
          this.sprite.setRotation(Math.atan2(this.aimVector.y, this.aimVector.x) + Math.PI / 2);
          this.sprite.setFlipX(false);
        } else if (this.aimVector.x !== 0) {
          this.sprite.setFlipX(this.aimVector.x < 0);
        }
      }
    } else {
      this.sprite.setVelocity(0, 0);
    }
  }

  // --- UNIFIED COMBAT SKILL EXECUTION ---
  public useSkill(
    skillIndex: number | 'attack' | 's1' | 's2' | 'ult',
    pointerOrDir?: Phaser.Input.Pointer | { x: number; y: number } | null,
    customTargets?: CombatTarget[]
  ) {
    let slot: 'attack' | 's1' | 's2' | 'ult' = 'attack';
    if (typeof skillIndex === 'number') {
      slot = skillIndex === 0 ? 'attack' : (skillIndex === 1 ? 's1' : (skillIndex === 2 ? 's2' : 'ult'));
    } else {
      slot = skillIndex;
    }

    let dirX = this.sprite.flipX ? -1 : 1;
    let dirY = 0;

    if (pointerOrDir) {
      if ('x' in pointerOrDir && 'y' in pointerOrDir) {
        if (Math.abs(pointerOrDir.x) <= 1 && Math.abs(pointerOrDir.y) <= 1 && (pointerOrDir.x !== 0 || pointerOrDir.y !== 0)) {
          dirX = pointerOrDir.x;
          dirY = pointerOrDir.y;
        } else {
          const angle = Phaser.Math.Angle.Between(this.x, this.y, pointerOrDir.x, pointerOrDir.y);
          dirX = Math.cos(angle);
          dirY = Math.sin(angle);
        }
      }
    }

    const sceneAny = this.scene as unknown as { getAllCombatTargets?: () => CombatTarget[] };
    const targets = customTargets || (sceneAny.getAllCombatTargets ? sceneAny.getAllCombatTargets() : []);

    this.executeCombatSkill(slot, dirX, dirY, targets);
  }

  public executeCombatSkill(
    slot: 'attack' | 's1' | 's2' | 'ult',
    dirX: number,
    dirY: number,
    targets: CombatTarget[],
    onHitNotify?: (target: CombatTarget, dmg: number) => void
  ) {
    if (this.isDown || this.isStunned) return;

    // Torf S2 toggle cancellation
    if (this.heroKey === 'char_torf' && slot === 's2' && this.torfStoneSkin) {
      this.cancelTorfStoneSkin();
      return;
    }
    if (this.heroKey === 'char_torf' && slot === 'ult' && this.torfStoneSkin) {
      this.cancelTorfStoneSkin();
    }

    // Omen Ult re-cast early dive slam
    if (this.heroKey === 'char_omen' && slot === 'ult' && this.isUltAirborne) {
      if (this.omenLandCallback) {
        this.omenLandCallback();
      }
      return;
    }

    if (this.isUltChanneling && this.heroKey !== 'char_bjorn' && !(this.heroKey === 'char_torf' && slot === 'ult') && !(this.heroKey === 'char_omen' && slot === 'ult')) return;
    if (this.cds[slot] > 0) return;

    this.cds[slot] = this.cdMax[slot];
    this.lastCombatTime = this.scene.time.now;

    const len = Math.hypot(dirX, dirY);
    let nx = len > 0 ? dirX / len : (this.sprite.flipX ? -1 : 1);
    let ny = len > 0 ? dirY / len : 0;

    this.aimVector.set(nx, ny);
    if (this.heroKey === 'char_nihil') {
      this.sprite.setRotation(Math.atan2(ny, nx) + Math.PI / 2);
      this.sprite.setFlipX(false);
    } else {
      this.sprite.setFlipX(nx < 0);
    }
    this.attackFacingTimer = 450;

    const facingAngle = Math.atan2(ny, nx);
    this.weaponAttackAngle = facingAngle;

    // Weapon swing / thrust animation
    if (this.weaponVisual && this.heroKey !== 'char_kraul' && !this.isMonster && !this.isInvulnerable) {
      if (this.heroKey === 'char_alrik') {
        this.weaponThrustDist = 0;
        this.scene.tweens.add({
          targets: this,
          weaponThrustDist: 40,
          duration: 85,
          yoyo: true,
          ease: 'Cubic.easeOut',
          onComplete: () => { this.weaponThrustDist = 0; }
        });
      } else {
        const facingRight = nx >= 0;
        this.weaponSwingAngle = facingRight ? -0.4 : 0.4;
        this.scene.tweens.add({
          targets: this,
          weaponSwingAngle: facingAngle + (facingRight ? 0.6 : -0.6),
          duration: 95,
          yoyo: true,
          ease: 'Quad.easeOut',
          onComplete: () => { this.weaponSwingAngle = 0; }
        });
      }
    }

    if (slot === 'attack') this.executeAttack(nx, ny, targets, onHitNotify);
    else if (slot === 's1') this.executeSkill1(nx, ny, targets, onHitNotify);
    else if (slot === 's2') this.executeSkill2(nx, ny, targets, onHitNotify);
    else if (slot === 'ult') this.executeUlt(nx, ny, targets, onHitNotify);
  }

  private launchProjectile(
    startX: number,
    startY: number,
    dirX: number,
    dirY: number,
    texture: string,
    speed: number,
    maxDistance: number,
    damage: number,
    targets: CombatTarget[],
    onHit?: (target: CombatTarget, dmg: number) => void,
    onImpactExtra?: (hitX: number, hitY: number) => void
  ) {
    const angle = Math.atan2(dirY, dirX);
    const proj = this.scene.physics.add.sprite(startX, startY, texture).setDepth(52).setScale(1.4);
    proj.setVelocity(dirX * speed, dirY * speed);
    proj.setRotation(angle);

    if (this.heroKey === 'char_omen') {
      proj.setScale(1.5).setTint(0xff3333);
    }

    let traveled = 0;
    let hasHit = false;

    const checkTimer = this.scene.time.addEvent({
      delay: 16,
      repeat: Math.ceil((maxDistance / (speed * 0.016)) + 5),
      callback: () => {
        if (!proj.active || hasHit) {
          checkTimer.destroy();
          return;
        }

        traveled += speed * 0.016;

        const sceneAny = this.scene as unknown as { getAllCombatTargets?: () => CombatTarget[] };
        const activeTargets = sceneAny.getAllCombatTargets ? sceneAny.getAllCombatTargets() : targets;

        // Check collision against all valid targets dynamically
        for (const t of activeTargets) {
          if (t && t.active && t.hp > 0 && t.team !== this.team) {
            const dist = Phaser.Math.Distance.Between(proj.x, proj.y, t.x, t.y);
            if (dist <= 44) { // Direct hit!
              hasHit = true;
              t.takeDamage(damage, true);
              if (onHit) onHit(t, damage);

              // Small hit spark
              const spark = this.scene.add.circle(proj.x, proj.y, 10, this.team === 'blue' ? 0x38bdf8 : 0xef4444, 0.9).setDepth(60);
              this.scene.tweens.add({ targets: spark, scale: 1.6, alpha: 0, duration: 120, onComplete: () => spark.destroy() });

              if (onImpactExtra) onImpactExtra(proj.x, proj.y);

              proj.destroy();
              checkTimer.destroy();
              return;
            }
          }
        }

        // Reached max distance without hitting anything: disappear quietly!
        if (traveled >= maxDistance) {
          if (proj.active) proj.destroy();
          checkTimer.destroy();
        }
      }
    });
  }

  private executeAttack(nx: number, ny: number, targets: CombatTarget[], onHit?: (t: CombatTarget, dmg: number) => void) {
    const hitX = this.x + nx * 55;
    const hitY = this.y + ny * 55;
    const baseDamage = Math.round(90 * this.damageMultiplier);
    const facingAngle = Math.atan2(ny, nx);

    // 1. Zaza Monster Form Attack
    if (this.isMonster) {
      soundEngine.playAttack();
      const bite = this.scene.add.circle(hitX, hitY, 36, 0xef4444, 0.85).setDepth(100);
      this.scene.tweens.add({ targets: bite, scale: 1.5, alpha: 0, duration: 150, onComplete: () => bite.destroy() });
      targets.forEach(t => {
        if (t.active && t.hp > 0 && t.team !== this.team && Phaser.Math.Distance.Between(hitX, hitY, t.x, t.y) < 85) {
          t.takeDamage(140, true);
          if (onHit) onHit(t, 140);
        }
      });
      return;
    }

    // 2. Ranged Projectile Attackers (Grim, Omen, Nihil)
    if (this.heroKey === 'char_nihil') {
      soundEngine.playMagicArcaneShoot();
      const startX = this.x + nx * 22;
      const startY = this.y + ny * 22;
      const muzzle = this.scene.add.circle(startX, startY, 9, 0xd8b4fe, 0.9).setDepth(60);
      this.scene.tweens.add({ targets: muzzle, scale: 0.2, alpha: 0, duration: 140, onComplete: () => muzzle.destroy() });
      this.launchProjectile(startX, startY, nx, ny, 'proj_nihil_bullet', 950, 360, baseDamage, targets, onHit);
      return;
    }

    if (this.heroKey === 'char_grim' || this.heroKey === 'char_omen') {
      const isOmen = this.heroKey === 'char_omen';
      if (isOmen) soundEngine.playMagicArcaneShoot();
      else soundEngine.playFlaskLaunch();

      const projTex = isOmen ? 'proj_shadow_blade' : 'proj_flask';
      const speed = isOmen ? 800 : 850;
      this.launchProjectile(this.x, this.y, nx, ny, projTex, speed, 280, baseDamage, targets, onHit);
      return;
    }

    // 3. Torf Heavy Fists Attack
    if (this.heroKey === 'char_torf') {
      if (this.torfStoneSkin) {
        this.cds.attack = 200;
        return;
      }
      soundEngine.playStoneFistAttack();
      this.scene.cameras.main.shake(120, 0.008);

      const fist1 = this.scene.add.circle(hitX - ny * 22, hitY + nx * 22, 22, 0x473d3a).setDepth(52);
      const fist2 = this.scene.add.circle(hitX + ny * 22, hitY - nx * 22, 22, 0x57534e).setDepth(52);
      const shockArc = this.scene.add.arc(hitX, hitY, 44, Phaser.Math.RadToDeg(facingAngle - 1.25), Phaser.Math.RadToDeg(facingAngle + 1.25), false, 0x60a5fa, 0.65).setDepth(50);
      this.scene.tweens.add({
        targets: [fist1, fist2, shockArc], scale: 1.5, alpha: 0, duration: 180,
        onComplete: () => { fist1.destroy(); fist2.destroy(); shockArc.destroy(); }
      });

      targets.forEach(t => {
        if (t.active && t.hp > 0 && t.team !== this.team && Phaser.Math.Distance.Between(hitX, hitY, t.x, t.y) < 85) {
          t.takeDamage(baseDamage, true);
          if (onHit) onHit(t, baseDamage);
        }
      });
      return;
    }

    // 4. Kraul Whips Attack
    if (this.heroKey === 'char_kraul') {
      soundEngine.playKraulWhipAttack();
      const whip1 = this.scene.add.rectangle(hitX - ny * 8, hitY + nx * 8, 88, 3, 0x312e81).setDepth(45);
      const whip2 = this.scene.add.rectangle(hitX + ny * 8, hitY - nx * 8, 88, 2, 0xa855f7).setDepth(46);
      whip1.setRotation(facingAngle + 0.1);
      whip2.setRotation(facingAngle - 0.1);
      this.scene.tweens.add({
        targets: [whip1, whip2], scaleX: 1.3, alpha: 0, duration: 150,
        onComplete: () => { whip1.destroy(); whip2.destroy(); }
      });

      targets.forEach(t => {
        if (t.active && t.hp > 0 && t.team !== this.team) {
          const d = Phaser.Math.Distance.Between(this.x, this.y, t.x, t.y);
          if (d <= 125) {
            const mobAngle = Phaser.Math.Angle.Between(this.x, this.y, t.x, t.y);
            const diff = Phaser.Math.Angle.Wrap(mobAngle - facingAngle);
            if (Math.abs(diff) <= 0.55) {
              t.takeDamage(baseDamage, true);
              if (onHit) onHit(t, baseDamage);
              if (this.kraulUltActive) {
                this.heal(Math.round(baseDamage * 0.15));
              }
            }
          }
        }
      });
      return;
    }

    // 5. Alrik Spear Thrust
    if (this.heroKey === 'char_alrik') {
      soundEngine.playSpearThrust();
      const thrustOuter = this.scene.add.rectangle(hitX, hitY, 80, 12, 0x0ea5e9, 0.8).setDepth(45);
      const thrustInner = this.scene.add.rectangle(hitX, hitY, 80, 4, 0xffffff).setDepth(46);
      thrustOuter.setRotation(facingAngle);
      thrustInner.setRotation(facingAngle);
      this.scene.tweens.add({
        targets: [thrustOuter, thrustInner], scaleX: 1.4, alpha: 0, duration: 160,
        onComplete: () => { thrustOuter.destroy(); thrustInner.destroy(); }
      });

      targets.forEach(t => {
        if (t.active && t.hp > 0 && t.team !== this.team) {
          const d = Phaser.Math.Distance.Between(this.x, this.y, t.x, t.y);
          if (d <= 120) {
            const mobAngle = Phaser.Math.Angle.Between(this.x, this.y, t.x, t.y);
            const diff = Phaser.Math.Angle.Wrap(mobAngle - facingAngle);
            if (Math.abs(diff) <= 0.55) {
              t.takeDamage(baseDamage, true);
              if (onHit) onHit(t, baseDamage);
            }
          }
        }
      });
      return;
    }

    // 6. Zaza Staff Whack / Standard Blade Slash
    soundEngine.playSwordSlash();
    const slash = this.scene.add.rectangle(hitX, hitY, 50, 14, 0xe2e8f0).setDepth(45);
    slash.setRotation(facingAngle);
    this.scene.tweens.add({ targets: slash, scaleX: 1.4, alpha: 0, duration: 140, onComplete: () => slash.destroy() });

    targets.forEach(t => {
      if (t.active && t.hp > 0 && t.team !== this.team && Phaser.Math.Distance.Between(hitX, hitY, t.x, t.y) < 85) {
        t.takeDamage(baseDamage, true);
        if (onHit) onHit(t, baseDamage);
      }
    });
  }

  private executeSkill1(nx: number, ny: number, targets: CombatTarget[], onHit?: (t: CombatTarget, dmg: number) => void) {
    soundEngine.playCast();
    const dmg = Math.round(110 * this.damageMultiplier);

    if (this.heroKey === 'char_zaza') {
      // Toxic Spit Glob with lingering poison puddle
      soundEngine.playPoison();
      this.launchProjectile(this.x, this.y, nx, ny, 'proj_toxic_spit', 680, 260, 45, targets, onHit, (gx, gy) => {
        const puddle = this.scene.add.ellipse(gx, gy, 14, 8, 0x84cc16, 0.75).setDepth(20);
        this.scene.tweens.add({
          targets: puddle, scaleX: 5, scaleY: 5, alpha: 0.45, duration: 250,
          onComplete: () => {
            this.scene.time.addEvent({
              delay: 350, repeat: 4, callback: () => {
                if (puddle.active) {
                  targets.forEach(t => {
                    if (t.active && t.hp > 0 && t.team !== this.team && Phaser.Math.Distance.Between(gx, gy, t.x, t.y) < 65) {
                      t.takeDamage(35, true);
                      if (onHit) onHit(t, 35);
                    }
                  });
                }
              }
            });
            this.scene.time.delayedCall(1800, () => puddle.destroy());
          }
        });
      });
    } else if (this.heroKey === 'char_grim') {
      // Tar Bomb with slow puddle
      this.launchProjectile(this.x, this.y, nx, ny, 'proj_tar_bomb', 700, 260, 65, targets, (t, dmg) => {
        t.isSlowed = true;
        if (onHit) onHit(t, dmg);
        this.scene.time.delayedCall(2000, () => { if (t && t.active) t.isSlowed = false; });
      }, (bx, by) => {
        soundEngine.playExplosion();
        const slowPuddle = this.scene.add.circle(bx, by, 45, 0x1e1b4b, 0.7).setDepth(20);
        this.scene.time.delayedCall(2000, () => slowPuddle.destroy());
      });
    } else if (this.heroKey === 'char_torf') {
      // Boulder Throw with shattering rock shards
      soundEngine.playBoulderThrow();
      const boulder = this.scene.physics.add.sprite(this.x, this.y, 'proj_boulder').setDepth(52).setScale(1.4);
      boulder.setVelocity(nx * 480, ny * 480);

      this.scene.time.delayedCall(400, () => {
        if (!boulder.active) return;
        const bx = boulder.x;
        const by = boulder.y;
        boulder.destroy();

        soundEngine.playExplosion();
        this.scene.cameras.main.shake(180, 0.012);

        const ring = this.scene.add.circle(bx, by, 75, 0x3b82f6, 0.7).setDepth(46);
        this.scene.tweens.add({ targets: ring, scale: 1.5, alpha: 0, duration: 250, onComplete: () => ring.destroy() });

        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3;
          const shard = this.scene.add.circle(bx, by, 6, 0x78716c).setDepth(47);
          this.scene.tweens.add({
            targets: shard, x: bx + Math.cos(angle) * 55, y: by + Math.sin(angle) * 55,
            alpha: 0, scale: 0.3, duration: 260, onComplete: () => shard.destroy()
          });
        }

        targets.forEach(t => {
          if (t.active && t.hp > 0 && t.team !== this.team && Phaser.Math.Distance.Between(bx, by, t.x, t.y) < 95) {
            t.takeDamage(170, true);
            if (onHit) onHit(t, 170);
          }
        });
      });
    } else if (this.heroKey === 'char_omen') {
      // Shadow Fan: 5 blades
      soundEngine.playSlash();
      const baseAngle = Math.atan2(ny, nx);
      const angles = [-0.35, -0.18, 0, 0.18, 0.35];
      angles.forEach(offset => {
        const angle = baseAngle + offset;
        const bDirX = Math.cos(angle);
        const bDirY = Math.sin(angle);
        this.launchProjectile(this.x, this.y, bDirX, bDirY, 'proj_shadow_blade', 780, 300, 75, targets, (t, dmg) => {
          t.isSlowed = true;
          if (onHit) onHit(t, dmg);
          this.scene.time.delayedCall(1800, () => { if (t && t.active) t.isSlowed = false; });
        });
      });
    } else if (this.heroKey === 'char_alrik') {
      // Charge Thrust
      soundEngine.playWhirlwind();
      const finalX = this.x + nx * 140;
      const finalY = this.y + ny * 140;
      this.scene.tweens.add({ targets: this.sprite, x: finalX, y: finalY, duration: 180, ease: 'Power2' });
      const spearAura = this.scene.add.circle(finalX, finalY, 50, 0x38bdf8, 0.6).setDepth(48);
      this.scene.tweens.add({ targets: spearAura, scale: 1.5, alpha: 0, duration: 250, onComplete: () => spearAura.destroy() });

      this.scene.time.delayedCall(180, () => {
        targets.forEach(t => {
          if (t.active && t.hp > 0 && t.team !== this.team && Phaser.Math.Distance.Between(finalX, finalY, t.x, t.y) < 85) {
            t.takeDamage(dmg, true);
            if (onHit) onHit(t, dmg);
          }
        });
      });
    } else if (this.heroKey === 'char_kraul') {
      // Shadow Dash with Bleed
      soundEngine.playWhirlwind();
      const startX = this.x;
      const startY = this.y;
      const finalX = startX + nx * 160;
      const finalY = startY + ny * 160;

      const shadowGhost = this.scene.add.image(startX, startY, 'char_kraul').setDepth(48).setAlpha(0.6).setTint(0x701a75);
      this.scene.tweens.add({ targets: shadowGhost, x: finalX, y: finalY, alpha: 0, duration: 150, onComplete: () => shadowGhost.destroy() });
      this.sprite.setPosition(finalX, finalY);

      targets.forEach(t => {
        if (t.active && t.hp > 0 && t.team !== this.team) {
          const d = Phaser.Math.Distance.Between(finalX, finalY, t.x, t.y);
          if (d < 75) {
            t.takeDamage(60, true);
            if (onHit) onHit(t, 60);
            // 3 bleed ticks
            const bleed = (target: CombatTarget, ticks: number) => {
              if (!target.active || target.hp <= 0) return;
              target.takeDamage(35, true);
              if (ticks > 1) this.scene.time.delayedCall(1000, () => bleed(target, ticks - 1));
            };
            this.scene.time.delayedCall(1000, () => bleed(t, 3));
          }
        }
      });
    } else if (this.heroKey === 'char_nihil') {
      // Singularity (Identical to DungeonScene: dark sphere + inner orb + 5 gravity pulses + sparks)
      soundEngine.playCast();
      const targetX = this.x + nx * 160;
      const targetY = this.y + ny * 160;

      const singularityBg = this.scene.add.circle(targetX, targetY, 110, 0x1e1035, 0.45).setDepth(15);
      const singularityInner = this.scene.add.circle(targetX, targetY, 15, 0xd8b4fe, 0.8).setDepth(16);

      this.scene.tweens.add({
        targets: singularityBg,
        scaleX: 1.1,
        scaleY: 1.1,
        alpha: 0.25,
        duration: 350,
        yoyo: true,
        repeat: 6
      });

      let tickCount = 0;
      this.scene.time.addEvent({
        delay: 500,
        repeat: 4,
        callback: () => {
          tickCount++;
          soundEngine.playPoison();

          targets.forEach(t => {
            if (t.active && t.hp > 0 && t.team !== this.team) {
              const dist = Phaser.Math.Distance.Between(targetX, targetY, t.x, t.y);
              if (dist < 110) {
                const pullAngle = Phaser.Math.Angle.Between(t.x, t.y, targetX, targetY);
                const pullForce = 16;
                const nextX = t.x + Math.cos(pullAngle) * pullForce;
                const nextY = t.y + Math.sin(pullAngle) * pullForce;
                if (typeof (t as { setPosition?: (x: number, y: number) => void }).setPosition === 'function') {
                  (t as { setPosition?: (x: number, y: number) => void }).setPosition!(nextX, nextY);
                }
                t.takeDamage(40, true);
                if (onHit) onHit(t, 40);
              }
            }
          });

          for (let i = 0; i < 8; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = 85;
            const px = targetX + Math.cos(angle) * r;
            const py = targetY + Math.sin(angle) * r;
            const spark = this.scene.add.circle(px, py, 4, 0xc084fc, 0.9).setDepth(20);
            this.scene.tweens.add({
              targets: spark,
              x: targetX,
              y: targetY,
              scale: 0.2,
              alpha: 0,
              duration: 380,
              onComplete: () => spark.destroy()
            });
          }

          if (tickCount >= 5) {
            if (singularityBg.active) singularityBg.destroy();
            if (singularityInner.active) singularityInner.destroy();
          }
        }
      });
    } else {
      // Bjorn: Earthquake fissure spikes
      soundEngine.playExplosion();
      for (let step = 1; step <= 5; step++) {
        this.scene.time.delayedCall(step * 70, () => {
          const spikeX = this.x + nx * step * 44;
          const spikeY = this.y + ny * step * 44;
          const spike = this.scene.add.image(spikeX, spikeY, 'proj_rock_spike').setDepth(45).setScale(1.2);
          this.scene.tweens.add({ targets: spike, alpha: 0, y: spikeY - 12, duration: 400, onComplete: () => spike.destroy() });
          targets.forEach(t => {
            if (t.active && t.hp > 0 && t.team !== this.team && Phaser.Math.Distance.Between(spikeX, spikeY, t.x, t.y) < 55) {
              t.takeDamage(60, true);
              if (onHit) onHit(t, 60);
            }
          });
        });
      }
    }
  }

  private executeSkill2(nx: number, ny: number, targets: CombatTarget[], onHit?: (t: CombatTarget, dmg: number) => void) {
    if (this.heroKey === 'char_zaza') {
      // Whirlwind toxic aura
      soundEngine.playWhirlwind();
      const spinAura = this.scene.add.circle(this.x, this.y, 45, 0x84cc16, 0.35).setDepth(45);
      this.scene.tweens.add({
        targets: spinAura, scale: 1.6, alpha: 0, duration: 600,
        onUpdate: () => spinAura.setPosition(this.x, this.y),
        onComplete: () => spinAura.destroy()
      });

      this.scene.time.addEvent({
        delay: 190, repeat: 3, callback: () => {
          targets.forEach(t => {
            if (t.active && t.hp > 0 && t.team !== this.team && Phaser.Math.Distance.Between(this.x, this.y, t.x, t.y) < 90) {
              t.takeDamage(55, true);
              if (onHit) onHit(t, 55);
            }
          });
        }
      });
    } else if (this.heroKey === 'char_grim') {
      // Ghost Dash Blink
      soundEngine.playCast();
      this.sprite.setPosition(this.x + nx * 160, this.y + ny * 160);
      this.sprite.setAlpha(0.25);
      this.scene.time.delayedCall(1200, () => { if (this.sprite.active) this.sprite.setAlpha(1.0); });
    } else if (this.heroKey === 'char_bjorn') {
      // Charge Tackle
      soundEngine.playAttack();
      const tx = this.x + nx * 140;
      const ty = this.y + ny * 140;
      this.scene.tweens.add({ targets: this.sprite, x: tx, y: ty, duration: 180 });
      this.scene.time.delayedCall(90, () => {
        targets.forEach(t => {
          if (t.active && t.hp > 0 && t.team !== this.team && Phaser.Math.Distance.Between(this.x, this.y, t.x, t.y) < 85) {
            t.takeDamage(95, true);
            if (onHit) onHit(t, 95);
          }
        });
      });
    } else if (this.heroKey === 'char_torf') {
      // Stone Skin (-50% damage reduction)
      soundEngine.playStoneSkin();
      this.torfStoneSkin = true;
      this.defenseMultiplier = 2.0;

      this.torfShieldAura = this.scene.add.circle(this.x, this.y, 42, 0x38bdf8, 0.45).setDepth(49);
      this.torfShieldBorder = this.scene.add.circle(this.x, this.y, 42).setStrokeStyle(3, 0xfacc15).setDepth(50);
      this.torfShieldTween = this.scene.tweens.add({
        targets: [this.torfShieldAura, this.torfShieldBorder], scale: 1.15, duration: 400, yoyo: true, repeat: 7,
        onUpdate: () => {
          if (this.torfShieldAura?.active) {
            this.torfShieldAura.setPosition(this.x, this.y);
            this.torfShieldBorder?.setPosition(this.x, this.y);
          }
        },
        onComplete: () => this.cancelTorfStoneSkin()
      });
    } else if (this.heroKey === 'char_omen') {
      // Astral Decoy Explosion
      soundEngine.playCast();
      const startX = this.x;
      const startY = this.y;
      this.sprite.setPosition(startX + nx * 160, startY + ny * 160);

      const decoy = this.scene.add.image(startX, startY, 'char_omen').setDepth(48).setAlpha(0.75).setTint(0xef4444);
      this.scene.time.delayedCall(450, () => {
        if (!decoy.active) return;
        decoy.destroy();
        soundEngine.playExplosion();

        const blast = this.scene.add.circle(startX, startY, 70, 0x581c87, 0.9).setDepth(49);
        this.scene.tweens.add({ targets: blast, scale: 1.8, alpha: 0, duration: 300, onComplete: () => blast.destroy() });

        targets.forEach(t => {
          if (t.active && t.hp > 0 && t.team !== this.team && Phaser.Math.Distance.Between(startX, startY, t.x, t.y) < 90) {
            t.takeDamage(110, true);
            t.isSlowed = true;
            if (onHit) onHit(t, 110);
            this.scene.time.delayedCall(1800, () => { if (t && t.active) t.isSlowed = false; });
          }
        });
      });
    } else if (this.heroKey === 'char_alrik') {
      // Wide Spear Sweep
      soundEngine.playWhirlwind();
      const sweep = this.scene.add.circle(this.x, this.y, 100, 0x60a5fa, 0.35).setStrokeStyle(3, 0x38bdf8).setDepth(48);
      this.scene.tweens.add({
        targets: sweep, scale: 1.4, alpha: 0, duration: 300,
        onUpdate: () => sweep.setPosition(this.x, this.y),
        onComplete: () => sweep.destroy()
      });

      targets.forEach(t => {
        if (t.active && t.hp > 0 && t.team !== this.team && Phaser.Math.Distance.Between(this.x, this.y, t.x, t.y) < 110) {
          t.takeDamage(80, true);
          if (onHit) onHit(t, 80);
        }
      });
    } else if (this.heroKey === 'char_kraul') {
      // Dead Grip: Stun & Pull
      soundEngine.playCast();
      const range = 360;
      let targetMob: CombatTarget | null = null;
      let minD = range;

      targets.forEach(t => {
        if (t.active && t.hp > 0 && t.team !== this.team) {
          const d = Phaser.Math.Distance.Between(this.x, this.y, t.x, t.y);
          if (d <= minD) {
            minD = d;
            targetMob = t;
          }
        }
      });

      if (targetMob) {
        const tx = (targetMob as CombatTarget).x;
        const ty = (targetMob as CombatTarget).y;
        const arm = this.scene.add.graphics().setDepth(52);
        arm.lineStyle(5, 0x312e81, 1.0);
        arm.beginPath();
        arm.moveTo(this.x, this.y);
        arm.lineTo(tx, ty);
        arm.strokePath();

        this.scene.time.delayedCall(120, () => {
          arm.destroy();
          if (targetMob && targetMob.active) {
            targetMob.takeDamage(125, true);
            targetMob.isStunned = true;
            if (onHit) onHit(targetMob, 125);
            this.scene.time.delayedCall(1000, () => { if (targetMob && targetMob.active) targetMob.isStunned = false; });
            this.scene.tweens.add({ targets: this.sprite, x: tx - nx * 45, y: ty - ny * 45, duration: 160 });
          }
        });
      }
    } else if (this.heroKey === 'char_nihil') {
      // Void Step (Шаг Пустоты: Phantom shadow + blink warp + speed boost)
      soundEngine.playCast();
      const startX = this.x;
      const startY = this.y;
      const finalX = startX + nx * 180;
      const finalY = startY + ny * 180;

      const shadow = this.scene.add.image(startX, startY, 'char_nihil').setDepth(48).setAlpha(0.65).setTint(0xc084fc);
      this.scene.tweens.add({
        targets: shadow,
        alpha: 0,
        scale: 0.8,
        duration: 300,
        onComplete: () => shadow.destroy()
      });

      this.sprite.setPosition(finalX, finalY);

      const originalSpeed = this.speed;
      this.speed = originalSpeed * 1.30;
      this.scene.time.delayedCall(2000, () => {
        this.speed = originalSpeed;
      });
    }
  }

  private executeUlt(nx: number, ny: number, targets: CombatTarget[], onHit?: (t: CombatTarget, dmg: number) => void) {
    soundEngine.playMonsterUlt();

    if (this.heroKey === 'char_zaza') {
      // Monster Transformation (10 seconds)
      this.isMonster = true;
      if (this.weaponVisual) this.weaponVisual.setVisible(false);
      this.sprite.setTexture('char_zaza_monster');
      this.sprite.setScale(1.8);
      this.damageMultiplier = 1.6;

      const shock = this.scene.add.circle(this.x, this.y, 14, 0xa855f7, 0.85).setDepth(100);
      this.scene.tweens.add({ targets: shock, scale: 16, alpha: 0, duration: 550, onComplete: () => shock.destroy() });

      this.scene.time.delayedCall(10000, () => {
        this.isMonster = false;
        if (this.sprite.active) {
          this.sprite.setTexture('char_zaza');
          this.sprite.setScale(1.2);
          if (this.weaponVisual) this.weaponVisual.setVisible(true);
        }
        this.damageMultiplier = 1.0;
      });
    } else if (this.heroKey === 'char_grim') {
      // Cauldron Cataclysm
      const potX = this.x + nx * 220;
      const potY = this.y + ny * 220;
      const pot = this.scene.add.image(potX, potY, 'proj_cauldron').setDepth(45).setScale(1.4);

      this.scene.time.delayedCall(1400, () => {
        if (pot.active) pot.destroy();
        soundEngine.playExplosion();
        const expRing = this.scene.add.circle(potX, potY, 120, 0xef4444, 0.85).setDepth(46);
        this.scene.tweens.add({ targets: expRing, scale: 1.5, alpha: 0, duration: 350, onComplete: () => expRing.destroy() });

        targets.forEach(t => {
          if (t.active && t.hp > 0 && t.team !== this.team && Phaser.Math.Distance.Between(potX, potY, t.x, t.y) < 140) {
            t.takeDamage(220, true);
            if (onHit) onHit(t, 220);
          }
        });
      });
    } else if (this.heroKey === 'char_bjorn') {
      // Whirlwind Spin Channeling
      soundEngine.playWhirlwind();
      this.isUltChanneling = true;
      this.bjornActiveAxe = this.scene.add.rectangle(this.x, this.y, 95, 16, 0xe2e8f0).setDepth(100);

      this.scene.tweens.add({
        targets: [this.bjornActiveAxe, this.sprite], angle: 1440, duration: 1800,
        onUpdate: () => { if (this.bjornActiveAxe?.active) this.bjornActiveAxe.setPosition(this.x, this.y); },
        onComplete: () => {
          this.isUltChanneling = false;
          this.sprite.angle = 0;
          if (this.bjornActiveAxe?.active) this.bjornActiveAxe.destroy();
        }
      });

      this.scene.time.addEvent({
        delay: 220, repeat: 7, callback: () => {
          targets.forEach(t => {
            if (t.active && t.hp > 0 && t.team !== this.team && Phaser.Math.Distance.Between(this.x, this.y, t.x, t.y) < 110) {
              t.takeDamage(75, true);
              if (onHit) onHit(t, 75);
            }
          });
        }
      });
    } else if (this.heroKey === 'char_torf') {
      // Underground Breach
      soundEngine.playBurrow();
      this.isInvulnerable = true;
      this.sprite.setVisible(false);
      if (this.weaponVisual) this.weaponVisual.setVisible(false);

      const shadow = this.scene.add.ellipse(this.x, this.y, 36, 18, 0x1c1917, 0.8).setDepth(45);
      const ev = this.scene.time.addEvent({
        delay: 130, repeat: 14, callback: () => {
          shadow.setPosition(this.x, this.y);
        }
      });

      this.scene.time.delayedCall(2000, () => {
        ev.destroy();
        shadow.destroy();
        this.sprite.setVisible(true);
        if (this.weaponVisual) this.weaponVisual.setVisible(true);
        this.isInvulnerable = false;

        soundEngine.playErupt();
        this.scene.cameras.main.shake(350, 0.022);
        const ring = this.scene.add.circle(this.x, this.y, 110, 0x3b82f6, 0.75).setDepth(52);
        this.scene.tweens.add({ targets: ring, scale: 1.8, alpha: 0, duration: 380, onComplete: () => ring.destroy() });

        targets.forEach(t => {
          if (t.active && t.hp > 0 && t.team !== this.team && Phaser.Math.Distance.Between(this.x, this.y, t.x, t.y) < 145) {
            t.takeDamage(480, true);
            if (onHit) onHit(t, 480);
          }
        });
      });
    } else if (this.heroKey === 'char_omen') {
      // Airborne Shadow Flight & Dark Slam (Match Dungeon Scene Flight & Free Movement)
      soundEngine.playCast();
      this.isInvulnerable = true;
      this.isUltAirborne = true;
      this.isUltChanneling = true;
      this.speed = Math.round(this.baseSpeed * 1.45);

      // Scale sprite up & tint purple for airborne levitation
      this.sprite.setScale(1.5).setTint(0xc084fc);

      // Trajectory Gfx & Ground Reticles
      const trajectoryGfx = this.scene.add.graphics().setDepth(43);
      const landingCircle = this.scene.add.circle(this.x, this.y, 80, 0x7e22ce, 0.45)
        .setStrokeStyle(3, 0xef4444, 0.95).setDepth(45);
      const innerCross = this.scene.add.circle(this.x, this.y, 14, 0xef4444, 0.85).setDepth(46);
      const pulseRing = this.scene.add.circle(this.x, this.y, 80).setStrokeStyle(2, 0xc084fc, 0.8).setDepth(45);
      const groundShadow = this.scene.add.ellipse(this.x, this.y, 52, 24, 0x1e1b4b, 0.85).setDepth(44);

      this.scene.tweens.add({
        targets: [landingCircle, innerCross, pulseRing],
        scale: 1.25,
        alpha: 0.9,
        duration: 220,
        yoyo: true,
        repeat: -1
      });

      // Flapping Wing Bobbing
      const bobTween = this.scene.tweens.add({
        targets: this.sprite,
        y: '-=12',
        duration: 180,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      let flightTicks = 0;
      const flightTimer = this.scene.time.addEvent({
        delay: 16,
        repeat: 160, // ~2.5 seconds
        callback: () => {
          flightTicks++;
          const curX = this.x;
          const curY = this.y;

          if (landingCircle.active) {
            landingCircle.setPosition(curX, curY);
            innerCross.setPosition(curX, curY);
            pulseRing.setPosition(curX, curY);
            groundShadow.setPosition(curX, curY);

            // Visual Trajectory Line in direction of motion / facing
            trajectoryGfx.clear();
            const bodyVel = this.sprite.body ? this.sprite.body.velocity : { x: 0, y: 0 };
            const speedSq = bodyVel.x * bodyVel.x + bodyVel.y * bodyVel.y;
            let dirAngle = this.weaponAttackAngle;
            if (speedSq > 100) {
              dirAngle = Math.atan2(bodyVel.y, bodyVel.x);
            }
            const aimDist = 140;
            const endX = curX + Math.cos(dirAngle) * aimDist;
            const endY = curY + Math.sin(dirAngle) * aimDist;

            trajectoryGfx.lineStyle(3, 0xa855f7, 0.7);
            trajectoryGfx.lineBetween(curX, curY, endX, endY);
            trajectoryGfx.lineStyle(1.5, 0xef4444, 0.9);
            trajectoryGfx.lineBetween(curX, curY, endX, endY);
          }

          // Trailing feather particles
          if (flightTicks % 5 === 0) {
            const f = this.scene.add.circle(curX + (Math.random() - 0.5) * 24, curY + (Math.random() - 0.5) * 24, 6, 0xc084fc, 0.95).setDepth(51);
            this.scene.tweens.add({ targets: f, scale: 0.1, alpha: 0, duration: 320, onComplete: () => f.destroy() });
          }
        }
      });

      // Function to trigger Dive Slam
      this.omenLandCallback = () => {
        if (!this.isUltAirborne) return;
        this.isUltAirborne = false;
        this.isUltChanneling = false;
        this.omenLandCallback = undefined;

        flightTimer.destroy();
        bobTween.stop();
        if (trajectoryGfx.active) trajectoryGfx.destroy();
        if (landingCircle.active) landingCircle.destroy();
        if (innerCross.active) innerCross.destroy();
        if (pulseRing.active) pulseRing.destroy();
        if (groundShadow.active) groundShadow.destroy();

        if (this.sprite.active) {
          this.sprite.setScale(1.2).clearTint();
        }
        this.isInvulnerable = false;
        this.speed = this.baseSpeed;

        const landX = this.x;
        const landY = this.y;

        soundEngine.playErupt();
        this.scene.cameras.main.shake(380, 0.032);

        // Dark Slam Explosion Ring & Vortex
        const vortex = this.scene.add.circle(landX, landY, 135, 0x7e22ce, 0.85).setDepth(149);
        const outerRing = this.scene.add.circle(landX, landY, 135, 0xef4444, 0.95).setStrokeStyle(5, 0xfca5a5).setDepth(150);
        this.scene.tweens.add({ targets: [vortex, outerRing], scale: 1.85, alpha: 0, duration: 450, onComplete: () => { vortex.destroy(); outerRing.destroy(); } });

        // Feather burst particles at impact point
        for (let i = 0; i < 12; i++) {
          const pAngle = (i * Math.PI * 2) / 12;
          const pDist = 40 + Math.random() * 80;
          const pFeather = this.scene.add.circle(landX, landY, 7, 0xc084fc, 0.9).setDepth(151);
          this.scene.tweens.add({
            targets: pFeather,
            x: landX + Math.cos(pAngle) * pDist,
            y: landY + Math.sin(pAngle) * pDist,
            scale: 0.1,
            alpha: 0,
            duration: 350,
            onComplete: () => pFeather.destroy()
          });
        }

        const sceneAny = this.scene as unknown as { getAllCombatTargets?: () => CombatTarget[] };
        const liveTargets = sceneAny.getAllCombatTargets ? sceneAny.getAllCombatTargets() : targets;

        liveTargets.forEach(t => {
          if (t.active && t.hp > 0 && t.team !== this.team && Phaser.Math.Distance.Between(landX, landY, t.x, t.y) <= 170) {
            t.takeDamage(480, true);
            t.isSlowed = true;
            if (onHit) onHit(t, 480);
            this.scene.time.delayedCall(2200, () => { if (t && t.active) t.isSlowed = false; });
          }
        });
      };

      // Auto-land after 2.5s if not re-cast
      this.scene.time.delayedCall(2500, () => {
        if (this.isUltAirborne && this.omenLandCallback) {
          this.omenLandCallback();
        }
      });
    } else if (this.heroKey === 'char_alrik') {
      // Steel Phalanx Shield Wall
      soundEngine.playStoneSkin();
      this.alrikShieldActive = true;
      this.defenseMultiplier = 3.0; // 66% damage reduction
      this.alrikShieldGfx = this.scene.add.rectangle(this.x, this.y, 80, 16, 0x38bdf8, 0.45).setStrokeStyle(3, 0x60a5fa).setDepth(52);

      this.scene.time.delayedCall(3000, () => {
        this.alrikShieldActive = false;
        this.defenseMultiplier = 1.0;
        if (this.alrikShieldGfx?.active) this.alrikShieldGfx.destroy();
      });
    } else if (this.heroKey === 'char_kraul') {
      // Eerie Meatgrinder (Speed boost + Lifesteal)
      soundEngine.playCast();
      this.kraulUltActive = true;
      this.speed = this.baseSpeed * 1.5;

      const ultAura = this.scene.add.circle(this.x, this.y, 45, 0x701a75, 0.35).setDepth(49);
      this.scene.tweens.add({
        targets: ultAura, scale: 1.25, alpha: 0.15, duration: 250, yoyo: true, repeat: -1,
        onUpdate: () => { if (ultAura.active) ultAura.setPosition(this.x, this.y); }
      });

      this.scene.time.delayedCall(4000, () => {
        this.kraulUltActive = false;
        this.speed = this.baseSpeed;
        if (ultAura.active) ultAura.destroy();
      });
    } else if (this.heroKey === 'char_nihil') {
      // Three Blades Execution
      soundEngine.playCast();
      this.scene.cameras.main.shake(350, 0.02);
      const sx = this.x;
      const sy = this.y;
      const angles = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];
      const radius = 95;

      angles.forEach((angle, idx) => {
        const fallX = sx + Math.cos(angle) * radius;
        const fallY = sy + Math.sin(angle) * radius;

        const dagger = this.scene.add.image(fallX, fallY - 200, 'skill_nihil_3').setDepth(160).setScale(3.5).setAlpha(0);
        this.scene.tweens.add({
          targets: dagger,
          y: fallY,
          alpha: 1,
          duration: 380 + idx * 80,
          ease: 'Bounce.easeOut',
          onComplete: () => {
            soundEngine.playExplosion();
            this.scene.cameras.main.shake(150, 0.015);
            const impact = this.scene.add.circle(fallX, fallY, 40, 0xc084fc, 0.6).setDepth(45);
            this.scene.tweens.add({ targets: impact, scale: 2.0, alpha: 0, duration: 250, onComplete: () => impact.destroy() });
            targets.forEach(t => {
              if (t.active && t.hp > 0 && t.team !== this.team && Phaser.Math.Distance.Between(fallX, fallY, t.x, t.y) < 70) {
                t.takeDamage(160, true);
                if (onHit) onHit(t, 160);
              }
            });
            this.scene.time.delayedCall(1200, () => {
              if (dagger.active) {
                this.scene.tweens.add({ targets: dagger, alpha: 0, scale: 0.2, duration: 300, onComplete: () => dagger.destroy() });
              }
            });
          }
        });
      });
    }
  }

  public cancelTorfStoneSkin() {
    if (this.torfStoneSkin) {
      this.torfStoneSkin = false;
      this.defenseMultiplier = 1.0;
      soundEngine.playRockShatter();
      if (this.torfShieldAura?.active) this.torfShieldAura.destroy();
      if (this.torfShieldBorder?.active) this.torfShieldBorder.destroy();
      if (this.torfShieldTween) this.torfShieldTween.stop();
      this.torfShieldAura = null;
      this.torfShieldBorder = null;
      this.torfShieldTween = null;
    }
  }

  public takeDamage(amount: number) {
    if (this.isDown || this.isInvulnerable || this.isDyingAnimation) return;

    this.lastCombatTime = this.scene.time.now;

    let finalDmg = amount / this.defenseMultiplier;
    finalDmg = Math.max(1, Math.round(finalDmg));

    this.hp = Math.max(0, this.hp - finalDmg);
    this.updateHpBar();

    // Hit Flash
    this.sprite.setTint(0xffffff);
    this.scene.time.delayedCall(80, () => {
      if (this.sprite.active && !this.isDown) {
        this.sprite.clearTint();
      }
    });

    // Sparks
    for (let i = 0; i < 4; i++) {
      const spark = this.scene.add.circle(this.x, this.y, 3, 0xfca5a5, 0.9).setDepth(65);
      const angle = Math.random() * Math.PI * 2;
      const dist = 15 + Math.random() * 20;
      this.scene.tweens.add({
        targets: spark, x: this.x + Math.cos(angle) * dist, y: this.y + Math.sin(angle) * dist,
        alpha: 0, scale: 0.2, duration: 180, onComplete: () => spark.destroy()
      });
    }

    // Floating damage text
    const txt = this.scene.add.text(this.x + (Math.random() - 0.5) * 16, this.y - 20, `-${finalDmg}`, {
      fontSize: '12px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ef4444'
    }).setOrigin(0.5).setDepth(150);

    this.scene.tweens.add({
      targets: txt, y: this.y - 45, alpha: 0, duration: 600, ease: 'Cubic.easeOut', onComplete: () => txt.destroy()
    });

    if (this.hp <= 0) {
      this.startDeathSequence();
    }
  }

  public heal(amount: number) {
    if (this.isDown) return;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    this.updateHpBar();
  }

  public setMaxHp(newMax: number) {
    this.maxHp = newMax;
    this.hp = Math.min(this.maxHp, this.hp);
    this.updateHpBar();
  }

  public updateHpBar() {
    const ratio = Math.max(0, this.hp / this.maxHp);
    this.hpBarFill.setScale(ratio, 1);
  }

  private updateAttachedPositions() {
    const x = this.sprite.x;
    const y = this.sprite.y;

    this.shadowGfx.setPosition(x, y + 16);
    this.hpBarBg.setPosition(x, y - 28);
    this.hpBarFill.setPosition(x - 20, y - 28);
    this.nameLabel.setPosition(x, y - 38);

    if (!this.weaponVisual || this.heroKey === 'char_kraul' || this.heroKey === 'char_nihil' || this.isMonster || this.isInvulnerable) {
      if (this.weaponVisual) this.weaponVisual.setVisible(false);
      return;
    }

    this.weaponVisual.setVisible(true);
    const facingRight = !this.sprite.flipX;
    let baseOffsetX = facingRight ? 16 : -16;
    let baseOffsetY = 4;

    if (this.heroKey === 'char_alrik') {
      baseOffsetX = facingRight ? 6 : -6;
      baseOffsetY = -3;
    }

    if (this.weaponThrustDist !== 0) {
      baseOffsetX += Math.cos(this.weaponAttackAngle) * this.weaponThrustDist;
      baseOffsetY += Math.sin(this.weaponAttackAngle) * this.weaponThrustDist;
    }

    this.weaponVisual.setPosition(x + baseOffsetX, y + baseOffsetY);
    this.weaponVisual.setFlipX(!facingRight);

    if (this.weaponSwingAngle !== 0) {
      this.weaponVisual.setRotation(this.weaponSwingAngle);
    } else {
      this.weaponVisual.setRotation(0);
    }
  }

  private getDefaultWeaponTexture(heroKey: string): string {
    switch (heroKey) {
      case 'char_grim': return 'weapon_flask_launcher';
      case 'char_bjorn': return 'weapon_battleaxe';
      case 'char_torf': return 'weapon_stone_fists';
      case 'char_omen': return 'weapon_feather_darts';
      case 'char_alrik': return 'weapon_spear';
      default: return 'weapon_stick';
    }
  }

  // --- MOBILE LEGENDS STYLE DEATH & RESPAWN LIFECYCLE ---
  public startDeathSequence() {
    if (this.isDown || this.isDyingAnimation) return;
    this.isDyingAnimation = true;
    this.isDown = true;

    if (this.isUltAirborne && this.omenLandCallback) {
      this.omenLandCallback();
    }

    if (this.onDeath) {
      this.onDeath(this);
    }

    // 1. Immediately zero velocity and disable body hitbox
    this.sprite.setVelocity(0, 0);
    if (this.sprite.body) {
      this.sprite.body.enable = false;
    }

    soundEngine.playMonsterUlt();

    // 2. Play 1-second death burst animation
    const deathBurst = this.scene.add.circle(this.x, this.y, 20, this.team === 'blue' ? 0x38bdf8 : 0xef4444, 0.85).setDepth(60);
    this.scene.tweens.add({
      targets: deathBurst,
      scale: 2.2,
      alpha: 0,
      duration: 800,
      onComplete: () => deathBurst.destroy()
    });

    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      scale: 0.4,
      duration: 900,
      onComplete: () => {
        // 3. Completely hide from battlefield
        this.sprite.setVisible(false);
        this.weaponVisual.setVisible(false);
        this.shadowGfx.setVisible(false);
        this.hpBarBg.setVisible(false);
        this.hpBarFill.setVisible(false);
        this.nameLabel.setVisible(false);
        this.isDyingAnimation = false;
      }
    });
  }

  public respawn(spawnX: number, spawnY: number) {
    this.isDown = false;
    this.isDyingAnimation = false;
    this.hp = this.maxHp;

    // 1. Teleport to base fountain
    this.sprite.setPosition(spawnX, spawnY);
    this.sprite.setScale(1.2);
    this.sprite.setAlpha(1.0);
    this.sprite.clearTint();
    this.sprite.setVisible(true);

    // Re-enable physics body & hitboxes
    if (this.sprite.body) {
      this.sprite.body.enable = true;
    }

    this.shadowGfx.setVisible(true);
    this.hpBarBg.setVisible(true);
    this.hpBarFill.setVisible(true);
    this.nameLabel.setVisible(true);
    this.weaponVisual.setVisible(this.heroKey !== 'char_kraul' && this.heroKey !== 'char_nihil');

    this.updateHpBar();
    this.updateAttachedPositions();

    // 2. Apply 2-second invulnerability + 40% speed boost (Fountain Speed Aura)
    this.isInvulnerable = true;
    this.speed = this.baseSpeed * 1.4;

    const respawnAura = this.scene.add.circle(spawnX, spawnY, 38, 0x38bdf8, 0.45).setDepth(52);
    this.scene.tweens.add({
      targets: respawnAura,
      scale: 1.4,
      alpha: 0.1,
      duration: 300,
      yoyo: true,
      repeat: 6,
      onUpdate: () => respawnAura.setPosition(this.x, this.y),
      onComplete: () => {
        respawnAura.destroy();
        this.isInvulnerable = false;
        this.speed = this.baseSpeed;
      }
    });

    soundEngine.playLevelUp();
  }

  public destroy() {
    this.sprite.destroy();
    this.weaponVisual.destroy();
    this.shadowGfx.destroy();
    this.hpBarBg.destroy();
    this.hpBarFill.destroy();
    this.nameLabel.destroy();
    if (this.torfShieldAura) this.torfShieldAura.destroy();
    if (this.torfShieldBorder) this.torfShieldBorder.destroy();
    if (this.alrikShieldGfx) this.alrikShieldGfx.destroy();
    if (this.bjornActiveAxe) this.bjornActiveAxe.destroy();
  }
}
