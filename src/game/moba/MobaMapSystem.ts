/**
 * Frantic Battles - MOBA Map System (MobaMapSystem.ts)
 * Builds rich procedural arcade terrain: stone masonry roads with bevels & cracks,
 * mystical jungle moss, glowing runic stones, neon mushrooms, cliff borders,
 * pulsating torches, and base platforms with ancient thrones & towers.
 */

import Phaser from 'phaser';
import { MobaMode, LaneType, Waypoint } from './MobaTypes';
import { MobaTower } from './Tower';

export interface MobaMapData {
  width: number;
  height: number;
  activeLanes: LaneType[];
  blueThrone: MobaTower;
  redThrone: MobaTower;
  towers: MobaTower[];
  blueWaypoints: Record<LaneType, Waypoint[]>;
  redWaypoints: Record<LaneType, Waypoint[]>;
  blueSpawnPoint: Waypoint;
  redSpawnPoint: Waypoint;
}

export class MobaMapSystem {
  public static buildMap(
    scene: Phaser.Scene,
    mode: MobaMode,
    onThroneDestroyed: (destroyedTeam: 'blue' | 'red') => void,
    onTowerDestroyed?: (tower: MobaTower) => void
  ): MobaMapData {
    let mapW = 4400;
    let mapH = 1100;
    let activeLanes: LaneType[] = ['mid'];

    if (mode === 'solo') {
      mapW = 4400;
      mapH = 1100;
      activeLanes = ['mid'];
    } else if (mode === 'duo') {
      mapW = 5000;
      mapH = 1350;
      activeLanes = ['top', 'bot'];
    } else {
      // Trio / 4v4
      mapW = 5600;
      mapH = 1600;
      activeLanes = ['top', 'mid', 'bot'];
    }

    const midY = mapH / 2;
    const blueBaseX = 280;
    const redBaseX = mapW - 280;

    // 1. Procedural Terrain & Decorated Ground
    this.renderProceduralTerrain(scene, mapW, mapH, activeLanes, blueBaseX, redBaseX, midY);

    // 2. Thrones & Towers
    const towers: MobaTower[] = [];

    const blueThrone = new MobaTower(scene, 'throne_blue', 'blue', 'mid', true, blueBaseX, midY, () => {
      onThroneDestroyed('blue');
    });

    const redThrone = new MobaTower(scene, 'throne_red', 'red', 'mid', true, redBaseX, midY, () => {
      onThroneDestroyed('red');
    });

    towers.push(blueThrone, redThrone);

    // Lane Towers (Doubled distance from bases to ensure spacious battlefield)
    const blueTowerX = Math.round(mapW * 0.35);
    const redTowerX = Math.round(mapW * 0.65);

    activeLanes.forEach(lane => {
      let laneY = midY;
      if (lane === 'top') laneY = mapH * 0.22;
      else if (lane === 'bot') laneY = mapH * 0.78;

      const bTower = new MobaTower(
        scene,
        `tower_blue_${lane}`,
        'blue',
        lane,
        false,
        blueTowerX,
        laneY,
        onTowerDestroyed
      );
      const rTower = new MobaTower(
        scene,
        `tower_red_${lane}`,
        'red',
        lane,
        false,
        redTowerX,
        laneY,
        onTowerDestroyed
      );

      towers.push(bTower, rTower);
    });

    // 3. Waypoint Paths Generation
    const blueWaypoints: Record<LaneType, Waypoint[]> = {
      top: [],
      mid: [],
      bot: []
    };
    const redWaypoints: Record<LaneType, Waypoint[]> = {
      top: [],
      mid: [],
      bot: []
    };

    activeLanes.forEach(lane => {
      let laneY = midY;
      if (lane === 'top') laneY = mapH * 0.22;
      else if (lane === 'bot') laneY = mapH * 0.78;

      const pathPoints: Waypoint[] = [
        { x: blueBaseX + 60, y: midY },
        { x: blueBaseX + 260, y: laneY },
        { x: blueTowerX, y: laneY },
        { x: mapW / 2, y: laneY },
        { x: redTowerX, y: laneY },
        { x: redBaseX - 260, y: laneY },
        { x: redBaseX - 60, y: midY }
      ];

      blueWaypoints[lane] = [...pathPoints];
      redWaypoints[lane] = [...pathPoints].reverse();
    });

    return {
      width: mapW,
      height: mapH,
      activeLanes,
      blueThrone,
      redThrone,
      towers,
      blueWaypoints,
      redWaypoints,
      blueSpawnPoint: { x: blueBaseX, y: midY },
      redSpawnPoint: { x: redBaseX, y: midY }
    };
  }

  private static renderProceduralTerrain(
    scene: Phaser.Scene,
    w: number,
    h: number,
    activeLanes: LaneType[],
    blueBaseX: number,
    redBaseX: number,
    midY: number
  ) {
    // 1. Deep Mystical Jungle Background Base
    scene.add.rectangle(w / 2, h / 2, w, h, 0x091710).setDepth(0);

    // Decorative Jungle Moss & Earth Patches
    const jungleGfx = scene.add.graphics().setDepth(1);
    jungleGfx.fillStyle(0x0f241a, 0.75);
    for (let x = 60; x < w - 60; x += 140) {
      for (let y = 60; y < h - 60; y += 120) {
        const patchW = 80 + Math.sin(x * y) * 35;
        const patchH = 65 + Math.cos(x + y) * 25;
        jungleGfx.fillRoundedRect(x, y, patchW, patchH, 12);
      }
    }

    // 2. Central River (Shimmering blue stream dividing the battlefield)
    const riverX = w / 2;
    const riverW = 110;
    const river = scene.add.rectangle(riverX, h / 2, riverW, h, 0x0369a1, 0.45).setDepth(2);
    const riverEdgeL = scene.add.rectangle(riverX - riverW / 2, h / 2, 4, h, 0x38bdf8, 0.5).setDepth(3);
    const riverEdgeR = scene.add.rectangle(riverX + riverW / 2, h / 2, 4, h, 0x38bdf8, 0.5).setDepth(3);

    // Subtle river flow tween
    scene.tweens.add({
      targets: [river, riverEdgeL, riverEdgeR],
      alpha: 0.65,
      duration: 1800,
      yoyo: true,
      repeat: -1
    });

    // 3. Stone Road Masonry (Lanes)
    const roadBaseGfx = scene.add.graphics().setDepth(4);
    const roadTilesGfx = scene.add.graphics().setDepth(5);
    const roadBorderGfx = scene.add.graphics().setDepth(6);

    const roadWidth = 110;

    activeLanes.forEach(lane => {
      let laneY = midY;
      if (lane === 'top') laneY = h * 0.22;
      else if (lane === 'bot') laneY = h * 0.78;

      // Base stone substrate (#334155)
      roadBaseGfx.lineStyle(roadWidth, 0x334155, 1.0);
      roadBaseGfx.beginPath();
      roadBaseGfx.moveTo(blueBaseX, midY);
      roadBaseGfx.lineTo(blueBaseX + 180, laneY);
      roadBaseGfx.lineTo(redBaseX - 180, laneY);
      roadBaseGfx.lineTo(redBaseX, midY);
      roadBaseGfx.strokePath();

      // Top stone plates with bevels (#475569)
      roadTilesGfx.lineStyle(roadWidth - 14, 0x475569, 0.95);
      roadTilesGfx.beginPath();
      roadTilesGfx.moveTo(blueBaseX, midY);
      roadTilesGfx.lineTo(blueBaseX + 180, laneY);
      roadTilesGfx.lineTo(redBaseX - 180, laneY);
      roadTilesGfx.lineTo(redBaseX, midY);
      roadTilesGfx.strokePath();

      // Stone slab seams & cracks (#1e293b)
      roadTilesGfx.lineStyle(2, 0x1e293b, 0.85);
      for (let sx = blueBaseX + 200; sx <= redBaseX - 200; sx += 55) {
        roadTilesGfx.lineBetween(sx, laneY - roadWidth / 2 + 8, sx + (Math.sin(sx) * 6), laneY + roadWidth / 2 - 8);
      }

      // Outer curbstones & borders (#64748b with light highlight)
      roadBorderGfx.lineStyle(3, 0x64748b, 0.9);
      // North Edge
      roadBorderGfx.beginPath();
      roadBorderGfx.moveTo(blueBaseX, midY - roadWidth / 2);
      roadBorderGfx.lineTo(blueBaseX + 180, laneY - roadWidth / 2);
      roadBorderGfx.lineTo(redBaseX - 180, laneY - roadWidth / 2);
      roadBorderGfx.lineTo(redBaseX, midY - roadWidth / 2);
      roadBorderGfx.strokePath();

      // South Edge
      roadBorderGfx.beginPath();
      roadBorderGfx.moveTo(blueBaseX, midY + roadWidth / 2);
      roadBorderGfx.lineTo(blueBaseX + 180, laneY + roadWidth / 2);
      roadBorderGfx.lineTo(redBaseX - 180, laneY + roadWidth / 2);
      roadBorderGfx.lineTo(redBaseX, midY + roadWidth / 2);
      roadBorderGfx.strokePath();

      // 4. Torches along roads with flickering warm light radii
      const torchSpacing = 320;
      for (let tx = blueBaseX + 240; tx <= redBaseX - 240; tx += torchSpacing) {
        const torchY = laneY - roadWidth / 2 - 14;
        this.renderTorch(scene, tx, torchY);
        const torchYBot = laneY + roadWidth / 2 + 14;
        this.renderTorch(scene, tx + 160, torchYBot);
      }
    });

    // 5. Mystical Jungle Props: Glowing Runic Stones, Neon Mushrooms & Skulls
    const propGfx = scene.add.graphics().setDepth(7);
    const propPositions = [
      { x: w * 0.28, y: h * 0.48, type: 'rune_cyan' },
      { x: w * 0.72, y: h * 0.48, type: 'rune_red' },
      { x: w * 0.42, y: h * 0.28, type: 'shroom_purple' },
      { x: w * 0.58, y: h * 0.72, type: 'shroom_cyan' },
      { x: w * 0.22, y: h * 0.75, type: 'skulls' },
      { x: w * 0.78, y: h * 0.25, type: 'skulls' },
      { x: w * 0.50, y: h * 0.14, type: 'rune_cyan' },
      { x: w * 0.50, y: h * 0.86, type: 'rune_red' }
    ];

    propPositions.forEach(p => {
      if (p.type === 'rune_cyan' || p.type === 'rune_red') {
        const col = p.type === 'rune_cyan' ? 0x38bdf8 : 0xef4444;
        // Stone monolith
        propGfx.fillStyle(0x1e293b, 1.0);
        propGfx.fillRoundedRect(p.x - 14, p.y - 18, 28, 36, 4);
        propGfx.lineStyle(2, 0x475569, 1.0);
        propGfx.strokeRoundedRect(p.x - 14, p.y - 18, 28, 36, 4);

        // Glowing Rune
        propGfx.lineStyle(2, col, 0.95);
        propGfx.lineBetween(p.x, p.y - 10, p.x, p.y + 10);
        propGfx.lineBetween(p.x - 6, p.y - 2, p.x + 6, p.y - 2);

        const runeGlow = scene.add.circle(p.x, p.y, 16, col, 0.3).setDepth(8);
        scene.tweens.add({ targets: runeGlow, scale: 1.4, alpha: 0.15, duration: 1200, yoyo: true, repeat: -1 });
      } else if (p.type === 'shroom_purple' || p.type === 'shroom_cyan') {
        const col = p.type === 'shroom_purple' ? 0xa855f7 : 0x06b6d4;
        // Neon mushroom cap
        propGfx.fillStyle(col, 0.9);
        propGfx.fillCircle(p.x, p.y - 4, 8);
        propGfx.fillStyle(0xf8fafc, 1.0);
        propGfx.fillCircle(p.x - 3, p.y - 5, 2);
        // Stem
        propGfx.fillStyle(0xe2e8f0, 0.8);
        propGfx.fillRect(p.x - 2, p.y, 4, 6);

        const shroomLight = scene.add.circle(p.x, p.y - 4, 14, col, 0.25).setDepth(8);
        scene.tweens.add({ targets: shroomLight, alpha: 0.45, duration: 800, yoyo: true, repeat: -1 });
      } else {
        // Skulls
        propGfx.fillStyle(0xe2e8f0, 0.9);
        propGfx.fillCircle(p.x, p.y, 5);
        propGfx.fillStyle(0x0f172a, 1.0);
        propGfx.fillRect(p.x - 2, p.y - 1, 2, 2);
        propGfx.fillRect(p.x + 1, p.y - 1, 2, 2);
      }
    });

    // 6. Base Platforms: Grand Runed Circles
    // Blue Team Base
    const bluePlatform = scene.add.circle(blueBaseX, midY, 150, 0x1e3a8a, 0.55).setDepth(8);
    const blueBorder = scene.add.circle(blueBaseX, midY, 150).setStrokeStyle(4, 0x38bdf8, 0.85).setDepth(9);
    const blueInner = scene.add.circle(blueBaseX, midY, 100).setStrokeStyle(2, 0x60a5fa, 0.6).setDepth(9);

    scene.add.text(blueBaseX, midY + 110, '✦ СИНЯЯ СТОРОНА ✦', {
      fontSize: '12px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#38bdf8'
    }).setOrigin(0.5).setDepth(10);

    // Red Team Base
    const redPlatform = scene.add.circle(redBaseX, midY, 150, 0x7f1d1d, 0.55).setDepth(8);
    const redBorder = scene.add.circle(redBaseX, midY, 150).setStrokeStyle(4, 0xef4444, 0.85).setDepth(9);
    const redInner = scene.add.circle(redBaseX, midY, 100).setStrokeStyle(2, 0xf87171, 0.6).setDepth(9);

    scene.add.text(redBaseX, midY + 110, '✦ КРАСНАЯ СТОРОНА ✦', {
      fontSize: '12px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#ef4444'
    }).setOrigin(0.5).setDepth(10);

    // 7. Layered Cliff Boundaries with Shadow & Top Highlight
    const cliffGfx = scene.add.graphics().setDepth(12);
    // Outer shadow
    cliffGfx.lineStyle(24, 0x020617, 1.0);
    cliffGfx.strokeRect(12, 12, w - 24, h - 24);
    // Rocky Cliff body
    cliffGfx.lineStyle(16, 0x1e293b, 1.0);
    cliffGfx.strokeRect(16, 16, w - 32, h - 32);
    // Top ridge highlight
    cliffGfx.lineStyle(3, 0x64748b, 0.95);
    cliffGfx.strokeRect(22, 22, w - 44, h - 44);
  }

  private static renderTorch(scene: Phaser.Scene, x: number, y: number) {
    const torchGfx = scene.add.graphics().setDepth(9);

    // Torch post
    torchGfx.fillStyle(0x78350f, 1.0);
    torchGfx.fillRect(x - 3, y, 6, 16);
    // Iron brazier
    torchGfx.fillStyle(0x334155, 1.0);
    torchGfx.fillRect(x - 5, y - 4, 10, 5);

    // Flame Core
    const flame = scene.add.circle(x, y - 6, 4, 0xf97316).setDepth(10);
    const flameCore = scene.add.circle(x, y - 7, 2, 0xfef08a).setDepth(11);

    // Radial warm light glow
    const glow = scene.add.circle(x, y - 6, 28, 0xf59e0b, 0.22).setDepth(8);

    // Pulsating flame tween
    scene.tweens.add({
      targets: [glow, flame],
      scaleX: 1.25,
      scaleY: 1.25,
      alpha: 0.35,
      duration: 160 + Math.random() * 120,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }
}
