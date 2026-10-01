/**
 * Frantic Battles - Mecha Dragon Boss "Valgart, Steel Overlord of the Void" (MechaDragonBoss.ts)
 * 
 * Features:
 * - 1:1 Pixel-art fidelity matching cybernetic dragon reference
 * - State Machine Animation Controller with procedural fallback (initAnimations)
 * - 3 Hardcore Boss Phases (6000 HP total)
 * - Overdrive Rush with fire/oil trail
 * - Tail Drill 360° Sweep with knockback
 * - Gear Barrage fan attack
 * - 450px Rotating Void Core Beam with Pillar Cover Mechanics
 * - Cluster Mines with cross hazard indicators
 * - Phase 3 Berserk Overheat Shockwave Pulses & Non-stop Combos
 * - Epic death slow-mo 0.3x, gear debris, Legendary Chest & Victory Portal
 */

import Phaser from 'phaser';
import { soundEngine } from '../audio';
import { loadEconomy, saveEconomy } from '../economy';

export class MechaDragonBoss {
  public scene: Phaser.Scene;
  public sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  public shadowGfx: Phaser.GameObjects.Ellipse;
  public coreGlowGfx: Phaser.GameObjects.Arc;
  
  public x: number;
  public y: number;
  public hp: number = 15000;
  public maxHp: number = 15000;
  public phase: 1 | 2 | 3 = 1;
  public isDown: boolean = false;
  public active: boolean = true;
  public mobType: string = 'mecha_dragon';
  public roomId: number;
  
  public speed: number = 175;
  public isStunned: boolean = false;
  public isSlowed: boolean = false;

  // State Machine & Animations
  public currentAnimKey: string = 'mecha_dragon_idle';
  private hoverTween?: Phaser.Tweens.Tween;
  private corePulseTween?: Phaser.Tweens.Tween;

  // Boss Attack Timers & Cooldowns
  public attackTimer: number = 1800;
  public isAttacking: boolean = false;
  public beamGfx: Phaser.GameObjects.Graphics;
  public telegraphGfx: Phaser.GameObjects.Graphics;

  // Phase 3 Overheat Pulse Timer
  private overheatPulseTimer: number = 5000;

  // Visual HP Bar & Name
  public hpBarBg: Phaser.GameObjects.Rectangle;
  public hpBarFill: Phaser.GameObjects.Rectangle;
  
  constructor(scene: Phaser.Scene, x: number, y: number, roomId: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.roomId = roomId;

    // 1. Shadow
    this.shadowGfx = scene.add.ellipse(x, y + 40, 90, 22, 0x000000, 0.45).setDepth(39);

    // 2. Core Glow Light (illuminates arena)
    this.coreGlowGfx = scene.add.circle(x, y, 90, 0xef4444, 0.25).setDepth(38);
    this.corePulseTween = scene.tweens.add({
      targets: this.coreGlowGfx,
      scale: 1.35,
      alpha: 0.4,
      duration: 600,
      yoyo: true,
      repeat: -1
    });

    // 3. Main Sprite (110x90 px hitbox size)
    this.sprite = scene.physics.add.sprite(x, y, 'mecha_dragon').setDepth(40).setScale(1.65);
    this.sprite.setCollideWorldBounds(true);
    // Ensure accurate physics body without offset misalignment
    if (this.sprite.body) {
      this.sprite.body.setSize(110, 90);
    }

    // Graphics helpers for lasers & telegraphs
    this.beamGfx = scene.add.graphics().setDepth(105);
    this.telegraphGfx = scene.add.graphics().setDepth(104);

    // Overhead HP Bar
    this.hpBarBg = scene.add.rectangle(x, y - 56, 80, 8, 0x000000).setDepth(41);
    this.hpBarFill = scene.add.rectangle(x - 38, y - 56, 76, 6, 0xef4444).setOrigin(0, 0.5).setDepth(42);

    this.initAnimations();
    this.playAnim('mecha_dragon_idle');
  }

  // --- 1. ANIMATION CONTROLLER (STATE MACHINE & SPRITESHEET PREPARATION) ---
  public initAnimations() {
    // Check if sprite animations exist in Phaser Animation Manager
    const anims = this.scene.anims;
    
    // Register Animation Clips if external spritesheet texture exists
    if (this.scene.textures.exists('mecha_dragon_spritesheet')) {
      if (!anims.exists('mecha_dragon_idle')) {
        anims.create({ key: 'mecha_dragon_idle', frames: anims.generateFrameNumbers('mecha_dragon_spritesheet', { start: 0, end: 3 }), frameRate: 8, repeat: -1 });
      }
      if (!anims.exists('mecha_dragon_charge')) {
        anims.create({ key: 'mecha_dragon_charge', frames: anims.generateFrameNumbers('mecha_dragon_spritesheet', { start: 4, end: 7 }), frameRate: 12, repeat: 0 });
      }
      if (!anims.exists('mecha_dragon_dash')) {
        anims.create({ key: 'mecha_dragon_dash', frames: anims.generateFrameNumbers('mecha_dragon_spritesheet', { start: 8, end: 11 }), frameRate: 14, repeat: -1 });
      }
      if (!anims.exists('mecha_dragon_tail_swipe')) {
        anims.create({ key: 'mecha_dragon_tail_swipe', frames: anims.generateFrameNumbers('mecha_dragon_spritesheet', { start: 12, end: 15 }), frameRate: 16, repeat: 0 });
      }
      if (!anims.exists('mecha_dragon_breath')) {
        anims.create({ key: 'mecha_dragon_breath', frames: anims.generateFrameNumbers('mecha_dragon_spritesheet', { start: 16, end: 19 }), frameRate: 10, repeat: -1 });
      }
      if (!anims.exists('mecha_dragon_death')) {
        anims.create({ key: 'mecha_dragon_death', frames: anims.generateFrameNumbers('mecha_dragon_spritesheet', { start: 20, end: 25 }), frameRate: 8, repeat: 0 });
      }
    }
  }

  public playAnim(key: string) {
    this.currentAnimKey = key;

    // 1. If external spritesheet animation exists, play directly!
    if (this.scene.anims.exists(key)) {
      this.sprite.play(key);
      return;
    }

    // 2. Procedural Fallback Animation Controller
    if (this.hoverTween) {
      this.hoverTween.stop();
      this.hoverTween = undefined;
    }

    if (key === 'mecha_dragon_idle') {
      this.sprite.setTint(0xffffff);
      this.hoverTween = this.scene.tweens.add({
        targets: this.sprite,
        y: this.y - 8,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    } else if (key === 'mecha_dragon_charge') {
      this.sprite.setTint(0xf87171);
      this.hoverTween = this.scene.tweens.add({
        targets: this.sprite,
        scaleX: 1.8,
        scaleY: 1.5,
        duration: 200,
        yoyo: true,
        repeat: -1
      });
    } else if (key === 'mecha_dragon_dash') {
      this.sprite.setTint(0xfacc15);
    } else if (key === 'mecha_dragon_tail_swipe') {
      this.scene.tweens.add({
        targets: this.sprite,
        angle: 360,
        duration: 400,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          this.sprite.setAngle(0);
        }
      });
    } else if (key === 'mecha_dragon_breath') {
      this.sprite.setTint(0xf43f5e);
    } else if (key === 'mecha_dragon_death') {
      this.sprite.setTint(0x64748b);
    }
  }

  // --- 2. UPDATE LOOP & HARDCORE AI PHASES ---
  public update(delta: number, playerX: number, playerY: number, playerHp: number, damagePlayerCb: (amt: number) => void, coverPillars: Phaser.GameObjects.Rectangle[]) {
    if (this.isDown || !this.sprite.active) {
      this.beamGfx.clear();
      this.telegraphGfx.clear();
      return;
    }

    this.x = Math.round(this.sprite.x);
    this.y = Math.round(this.sprite.y);

    // Sync attached shadow, glow, and HP bar
    this.shadowGfx.setPosition(this.x, this.y + 40);
    this.coreGlowGfx.setPosition(this.x, this.y);
    this.hpBarBg.setPosition(this.x, this.y - 56);
    this.hpBarFill.setPosition(this.x - 38, this.y - 56);

    const hpPct = Math.max(0, this.hp / this.maxHp);
    this.hpBarFill.setDisplaySize(Math.max(1, 76 * hpPct), 6);

    // Check Phase Transitions
    if (this.hp <= 5000 && this.phase < 3) {
      this.triggerPhase(3);
    } else if (this.hp <= 10000 && this.phase < 2) {
      this.triggerPhase(2);
    }

    // Phase 3 Overheat Pulse Ring
    if (this.phase === 3) {
      this.overheatPulseTimer -= delta;
      if (this.overheatPulseTimer <= 0) {
        this.overheatPulseTimer = 4200; // pulse every 4.2s in Phase 3
        this.executeOverheatPulse(playerX, playerY, damagePlayerCb);
      }
    }

    if (this.isStunned) {
      this.sprite.setVelocity(0, 0);
      return;
    }

    if (this.isAttacking) return;

    this.attackTimer -= delta * (this.phase === 3 ? 1.35 : 1.0);

    if (this.attackTimer <= 0) {
      this.attackTimer = this.phase === 3 ? 1100 : (this.phase === 2 ? 1400 : 1800);
      this.chooseAttack(playerX, playerY, damagePlayerCb, coverPillars);
    } else {
      // Normal Tracking Movement
      const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);
      if (dist > 70) {
        const angle = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
        const curSpeed = this.speed * (this.phase === 3 ? 1.3 : 1.0);
        this.sprite.setVelocity(Math.cos(angle) * curSpeed, Math.sin(angle) * curSpeed);
        this.sprite.setFlipX(playerX < this.x);
      } else {
        this.sprite.setVelocity(0, 0);
      }
    }
  }

  // --- 3. PHASE TRANSITIONS ---
  private triggerPhase(newPhase: 2 | 3) {
    this.phase = newPhase;
    soundEngine.playExplosion();

    if (newPhase === 2) {
      (this.scene as any).showFloatingNotice('⚡ ФАЗА 2: ПЕРЕГРУЗКА ПЛАЗМЕННОГО ЯДРА! ⚡', '#f59e0b');
      this.sprite.setTint(0xf59e0b);
      this.hpBarFill.setFillStyle(0xf59e0b);
    } else if (newPhase === 3) {
      soundEngine.playMonsterUlt();
      (this.scene as any).showFloatingNotice('☠ ФАЗА 3: АВАРИЙНЫЙ ПРОТОКОЛ - БЕРСЕРК! ☠', '#ef4444');
      this.sprite.setTint(0xef4444);
      this.hpBarFill.setFillStyle(0xef4444);
    }
  }

  // --- 4. HARDCORE ATTACK EXECUTION ---
  private chooseAttack(px: number, py: number, damagePlayerCb: (amt: number) => void, coverPillars: Phaser.GameObjects.Rectangle[]) {
    const dist = Phaser.Math.Distance.Between(this.x, this.y, px, py);
    const roll = Math.random();

    if (this.phase === 1) {
      if (dist < 140 && roll < 0.6) {
        this.executeTailDrillSweep(px, py, damagePlayerCb);
      } else if (roll < 0.5) {
        this.executeOverdriveRush(px, py, damagePlayerCb);
      } else {
        this.executeGearBarrage(px, py);
      }
    } else if (this.phase === 2) {
      if (roll < 0.5) {
        this.executeVoidCoreBeam(px, py, damagePlayerCb, coverPillars);
      } else {
        this.executeClusterMines(px, py, damagePlayerCb);
      }
    } else {
      // Phase 3 Berserk Combos!
      if (roll < 0.5) {
        // Combo: Rush immediately into Tail Sweep!
        this.executeOverdriveRush(px, py, damagePlayerCb, () => {
          this.executeTailDrillSweep(px, py, damagePlayerCb);
        });
      } else {
        this.executeVoidCoreBeam(px, py, damagePlayerCb, coverPillars);
      }
    }
  }

  // --- ATTACK 1: OVERDRIVE RUSH WITH BURNING TRAIL ---
  private executeOverdriveRush(px: number, py: number, damagePlayerCb: (amt: number) => void, onCompleteCb?: () => void) {
    this.isAttacking = true;
    this.sprite.setVelocity(0, 0);
    this.playAnim('mecha_dragon_charge');

    const startX = this.x;
    const startY = this.y;
    const targetX = px;
    const targetY = py;

    // Draw Bright Red Telegraph Line
    this.telegraphGfx.clear();
    this.telegraphGfx.lineStyle(14, 0xef4444, 0.6);
    this.telegraphGfx.lineBetween(startX, startY, targetX, targetY);
    soundEngine.playCast();

    this.scene.time.delayedCall(700, () => {
      this.telegraphGfx.clear();
      this.playAnim('mecha_dragon_dash');

      const angle = Phaser.Math.Angle.Between(startX, startY, targetX, targetY);
      const dashSpeed = 650;
      this.sprite.setVelocity(Math.cos(angle) * dashSpeed, Math.sin(angle) * dashSpeed);
      soundEngine.playExplosion();

      // Spawn Burning Oil / Fire Trail along path
      const trailCount = 8;
      for (let i = 1; i <= trailCount; i++) {
        const tx = startX + (targetX - startX) * (i / trailCount);
        const ty = startY + (targetY - startY) * (i / trailCount);
        const fire = this.scene.add.circle(tx, ty, 20, 0xef4444, 0.6).setDepth(20);
        this.scene.physics.add.existing(fire, true);

        // Burning trail harms player on step (-25 HP)
        this.scene.physics.add.overlap((this.scene as any).player, fire, () => {
          if (!fire.getData('cooldown')) {
            fire.setData('cooldown', true);
            damagePlayerCb(25);
            soundEngine.playHit();
            this.scene.time.delayedCall(800, () => fire.setData('cooldown', false));
          }
        });

        this.scene.tweens.add({
          targets: fire,
          alpha: 0,
          scale: 1.5,
          duration: 2500,
          onComplete: () => fire.destroy()
        });
      }

      this.scene.time.delayedCall(600, () => {
        this.sprite.setVelocity(0, 0);
        this.isAttacking = false;
        this.playAnim('mecha_dragon_idle');
        if (onCompleteCb) onCompleteCb();
      });
    });
  }

  // --- ATTACK 2: TAIL DRILL SWEEP (360 DEGREE) ---
  private executeTailDrillSweep(px: number, py: number, damagePlayerCb: (amt: number) => void) {
    this.isAttacking = true;
    this.sprite.setVelocity(0, 0);
    this.playAnim('mecha_dragon_tail_swipe');
    soundEngine.playSlash();

    const sweepGfx = this.scene.add.circle(this.x, this.y, 130, 0xf59e0b, 0.45).setDepth(45);
    this.scene.tweens.add({
      targets: sweepGfx,
      scale: 1.3,
      alpha: 0,
      duration: 350,
      onComplete: () => sweepGfx.destroy()
    });

    const dist = Phaser.Math.Distance.Between(this.x, this.y, px, py);
    if (dist <= 145) {
      damagePlayerCb(140);
      soundEngine.playHit();

      // Strong knockback toward arena walls
      const player = (this.scene as any).player;
      if (player && player.body) {
        const knockAngle = Phaser.Math.Angle.Between(this.x, this.y, px, py);
        player.setVelocity(Math.cos(knockAngle) * 600, Math.sin(knockAngle) * 600);
      }
    }

    this.scene.time.delayedCall(500, () => {
      this.isAttacking = false;
      this.playAnim('mecha_dragon_idle');
    });
  }

  // --- ATTACK 3: GEAR BARRAGE (FAN OF 7 SPINNING GEARS) ---
  private executeGearBarrage(px: number, py: number) {
    this.isAttacking = true;
    this.sprite.setVelocity(0, 0);
    this.playAnim('mecha_dragon_charge');
    soundEngine.playCast();

    this.scene.time.delayedCall(500, () => {
      const baseAngle = Phaser.Math.Angle.Between(this.x, this.y, px, py);
      const gearCount = 7;
      const spread = 0.85; // radians

      for (let i = 0; i < gearCount; i++) {
        const angle = baseAngle - spread / 2 + (spread / (gearCount - 1)) * i;
        const gear = this.scene.physics.add.sprite(this.x, this.y, 'gear_projectile').setDepth(50).setScale(1.2);
        
        const speed = 280;
        gear.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

        this.scene.tweens.add({
          targets: gear,
          angle: 720,
          duration: 2000,
          repeat: -1
        });

        this.scene.physics.add.overlap((this.scene as any).player, gear, () => {
          if (gear.active) {
            gear.destroy();
            soundEngine.playHit();
            (this.scene as any).damagePlayer(32);
          }
        });

        this.scene.time.delayedCall(3000, () => {
          if (gear.active) gear.destroy();
        });
      }

      this.isAttacking = false;
      this.playAnim('mecha_dragon_idle');
    });
  }

  // --- ATTACK 4: VOID CORE PLASMA BEAM (450px ROTATING BEAM WITH PILLAR COVER) ---
  private executeVoidCoreBeam(px: number, py: number, damagePlayerCb: (amt: number) => void, coverPillars: Phaser.GameObjects.Rectangle[]) {
    this.isAttacking = true;
    this.sprite.setVelocity(0, 0);
    this.playAnim('mecha_dragon_breath');
    soundEngine.playMonsterUlt();

    let startAngle = Phaser.Math.Angle.Between(this.x, this.y, px, py);
    let duration = 4000;
    let elapsed = 0;

    const beamTimer = this.scene.time.addEvent({
      delay: 30,
      loop: true,
      callback: () => {
        elapsed += 30;
        const currentAngle = startAngle + (elapsed / duration) * Math.PI * 2;
        const beamLen = 450;
        const endX = this.x + Math.cos(currentAngle) * beamLen;
        const endY = this.y + Math.sin(currentAngle) * beamLen;

        // Draw Thick Plasma Beam Gfx
        this.beamGfx.clear();
        this.beamGfx.lineStyle(18, 0xef4444, 0.45);
        this.beamGfx.lineBetween(this.x, this.y, endX, endY);
        this.beamGfx.lineStyle(8, 0x38bdf8, 0.85);
        this.beamGfx.lineBetween(this.x, this.y, endX, endY);
        this.beamGfx.lineStyle(3, 0xffffff, 0.98);
        this.beamGfx.lineBetween(this.x, this.y, endX, endY);

        // Check if player is caught in beam sector
        const dPlayer = Phaser.Math.Distance.Between(this.x, this.y, px, py);
        if (dPlayer <= beamLen) {
          const pAngle = Phaser.Math.Angle.Between(this.x, this.y, px, py);
          const diff = Math.abs(Phaser.Math.Angle.Wrap(pAngle - currentAngle));
          
          if (diff < 0.25) { // caught in beam
            // Check if hiding behind any cover pillar
            let isCovered = false;
            for (const pillar of coverPillars) {
              if (pillar && pillar.active) {
                const dPillar = Phaser.Math.Distance.Between(this.x, this.y, pillar.x, pillar.y);
                const pillarAngle = Phaser.Math.Angle.Between(this.x, this.y, pillar.x, pillar.y);
                const pDiff = Math.abs(Phaser.Math.Angle.Wrap(pAngle - pillarAngle));
                if (dPillar < dPlayer && pDiff < 0.22) {
                  isCovered = true;
                  break;
                }
              }
            }

            if (!isCovered) {
              damagePlayerCb(18); // tick damage
              if (elapsed % 300 < 30) soundEngine.playHit();
            }
          }
        }

        if (elapsed >= duration) {
          beamTimer.destroy();
          this.beamGfx.clear();
          this.isAttacking = false;
          this.playAnim('mecha_dragon_idle');
        }
      }
    });
  }

  // --- ATTACK 5: CLUSTER MINES (CROSS HAZARD ZONES) ---
  private executeClusterMines(px: number, py: number, damagePlayerCb: (amt: number) => void) {
    this.isAttacking = true;
    this.sprite.setVelocity(0, 0);
    this.playAnim('mecha_dragon_charge');
    soundEngine.playCast();

    const mineOffsets = [
      { x: -140, y: -100 },
      { x: 140, y: -100 },
      { x: -140, y: 100 },
      { x: 140, y: 100 }
    ];

    mineOffsets.forEach(off => {
      const mx = px + off.x;
      const my = py + off.y;

      const mine = this.scene.add.sprite(this.x, this.y, 'cluster_mine').setDepth(45).setScale(1.3);
      this.scene.tweens.add({
        targets: mine,
        x: mx,
        y: my,
        duration: 500,
        ease: 'Quad.easeOut',
        onComplete: () => {
          // Draw Cross Hazard Zone (+)
          const crossGfx = this.scene.add.graphics().setDepth(44);
          crossGfx.lineStyle(4, 0xef4444, 0.7);
          crossGfx.lineBetween(mx - 80, my, mx + 80, my);
          crossGfx.lineBetween(mx, my - 80, mx, my + 80);

          // Detonate after 1.5s
          this.scene.time.delayedCall(1500, () => {
            crossGfx.destroy();
            if (mine.active) mine.destroy();

            soundEngine.playExplosion();
            const expl = this.scene.add.circle(mx, my, 80, 0xef4444, 0.7).setDepth(55);
            this.scene.tweens.add({
              targets: expl,
              scale: 1.5,
              alpha: 0,
              duration: 250,
              onComplete: () => expl.destroy()
            });

            // Check hit
            const curP = (this.scene as any).player;
            if (curP) {
              const d = Phaser.Math.Distance.Between(mx, my, curP.x, curP.y);
              if (d <= 85 || Math.abs(curP.x - mx) < 25 || Math.abs(curP.y - my) < 25) {
                damagePlayerCb(120);
                soundEngine.playHit();
              }
            }
          });
        }
      });
    });

    this.scene.time.delayedCall(800, () => {
      this.isAttacking = false;
      this.playAnim('mecha_dragon_idle');
    });
  }

  // --- ATTACK 6: PHASE 3 OVERHEAT PULSE ---
  private executeOverheatPulse(px: number, py: number, damagePlayerCb: (amt: number) => void) {
    soundEngine.playExplosion();
    (this.scene as any).showFloatingNotice('⚠ ОВЕРХИТ ПУЛЬС: УДАРНАЯ ВОЛНА! ⚠', '#ef4444');

    const pulse = this.scene.add.circle(this.x, this.y, 40, 0xef4444, 0.6).setDepth(45);
    this.scene.tweens.add({
      targets: pulse,
      scale: 12,
      alpha: 0,
      duration: 800,
      onUpdate: () => {
        const radius = pulse.radius * pulse.scale;
        const d = Phaser.Math.Distance.Between(this.x, this.y, px, py);
        if (Math.abs(d - radius) < 25) {
          damagePlayerCb(60);
          soundEngine.playHit();
        }
      },
      onComplete: () => pulse.destroy()
    });
  }

  // --- 5. DAMAGE & DEFEAT LIFECYCLE ---
  public takeDamage(amount: number) {
    if (this.isDown || !this.active) return;

    this.hp = Math.max(0, this.hp - amount);

    // Hit Flash Tint
    this.sprite.setTint(0xffffff);
    this.scene.time.delayedCall(80, () => {
      if (this.sprite && this.sprite.active) {
        this.sprite.setTint(this.phase === 3 ? 0xef4444 : (this.phase === 2 ? 0xf59e0b : 0xffffff));
      }
    });

    if (this.hp <= 0) {
      this.die();
    }
  }

  private die() {
    this.isDown = true;
    this.active = false;
    this.sprite.setVelocity(0, 0);
    this.playAnim('mecha_dragon_death');

    // 1. Slow Motion 0.3x for 1.0 Second
    this.scene.time.timeScale = 0.3;
    soundEngine.playMonsterUlt();

    // 2. Micro-explosions across body
    for (let i = 0; i < 10; i++) {
      this.scene.time.delayedCall(i * 120, () => {
        const ox = (Math.random() - 0.5) * 100;
        const oy = (Math.random() - 0.5) * 80;
        soundEngine.playExplosion();

        const expl = this.scene.add.circle(this.x + ox, this.y + oy, 25, 0xf59e0b, 0.85).setDepth(110);
        this.scene.tweens.add({
          targets: expl,
          scale: 2.0,
          alpha: 0,
          duration: 300,
          onComplete: () => expl.destroy()
        });

        // Scatter Gear & Spark Particles
        const gear = this.scene.add.image(this.x + ox, this.y + oy, 'gear_projectile').setDepth(108).setScale(0.8);
        this.scene.tweens.add({
          targets: gear,
          x: this.x + ox + (Math.random() - 0.5) * 140,
          y: this.y + oy + (Math.random() - 0.5) * 140,
          angle: 360,
          alpha: 0,
          duration: 600,
          onComplete: () => gear.destroy()
        });
      });
    }

    // Restore normal game speed after 1 second
    this.scene.time.delayedCall(1000, () => {
      this.scene.time.timeScale = 1.0;

      // Clean up boss sprites
      this.sprite.destroy();
      this.shadowGfx.destroy();
      this.coreGlowGfx.destroy();
      this.hpBarBg.destroy();
      this.hpBarFill.destroy();
      this.beamGfx.destroy();
      this.telegraphGfx.destroy();

      // Trigger Victory Reward Events
      this.spawnLegendaryVictoryRewards();
    });
  }

  // --- 6. LEGENDARY VICTORY REWARDS & PROGRESSION ---
  private spawnLegendaryVictoryRewards() {
    // 1. Legendary Chest drop (+400 skulls, +3 void shards, +80 upgrade points)
    const chest = this.scene.physics.add.sprite(this.x, this.y, 'gold_chest').setDepth(16).setScale(1.8).setInteractive({ useHandCursor: true });
    this.scene.tweens.add({
      targets: chest,
      y: this.y - 8,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    const chestLabel = this.scene.add.text(this.x, this.y + 42, '★ ЛЕГЕНДАРНЫЙ СУНДУК ВАЛГАРТА ★', {
      fontSize: '12px', fontFamily: 'Consolas, monospace', fontStyle: 'bold', color: '#facc15'
    }).setOrigin(0.5).setDepth(16);

    const onOpen = () => {
      if (!chest.active) return;
      chest.destroy();
      chestLabel.destroy();
      soundEngine.playLevelUp();

      // Apply Progression
      const econ = loadEconomy();
      econ.rustySkulls += 400;
      econ.voidShards = (econ.voidShards || 0) + 3;
      econ.upgradePoints += 80;
      econ.bossesKilled = (econ.bossesKilled || 0) + 1;
      econ.dungeonsCleared = (econ.dungeonsCleared || 0) + 1;
      saveEconomy(econ);

      (this.scene as any).dungeonGold = econ.rustySkulls;
      (this.scene as any).updateHUD();

      (this.scene as any).showFloatingNotice('🏆 ТИТАНИЧЕСКАЯ ПОБЕДА: +400 МОНЕТ, +3 ОСКОЛКА ПУСТОТЫ, +80 ОЧКОВ!', '#4ade80');

      // Trigger Victory Portal
      this.spawnGoldenVictoryPortal();
    };

    chest.on('pointerdown', onOpen);
  }

  private spawnGoldenVictoryPortal() {
    const cx = this.x;
    const cy = this.y - 60;
    const portal = this.scene.add.image(cx, cy, 'dungeon_portal_active').setDepth(16).setScale(1.8).setInteractive({ useHandCursor: true });
    this.scene.tweens.add({ targets: portal, angle: 360, duration: 5000, repeat: -1 });

    const glow = this.scene.add.circle(cx, cy, 60, 0xfacc15, 0.45).setDepth(15);
    this.scene.tweens.add({ targets: glow, scale: 1.5, alpha: 0.15, duration: 800, yoyo: true, repeat: -1 });

    const portalLabel = this.scene.add.text(cx, cy + 48, '👑 ВОЙТИ В ЗОЛОТОЙ ПОРТАЛ ПОБЕДЫ', {
      fontSize: '13px', fontFamily: 'Consolas, monospace', fontStyle: 'bold', color: '#facc15'
    }).setOrigin(0.5).setDepth(16).setInteractive({ useHandCursor: true });

    const enterVictory = () => {
      soundEngine.playLevelUp();
      (this.scene as any).showVictoryScreen();
    };

    portal.on('pointerdown', enterVictory);
    portalLabel.on('pointerdown', enterVictory);
  }
}
