/**
 * Frantic Battles - Pixel Art Texture Generator
 * Builds high-fidelity, authentic 16-bit retro fantasy textures
 * for characters, skills, buildings, ranks, and music album covers.
 */

import Phaser from 'phaser';

export function generateAllTextures(scene: Phaser.Scene) {
  const addTex = (key: string, canvas: HTMLCanvasElement) => {
    if (!scene.textures.exists(key)) {
      const tex = scene.textures.addCanvas(key, canvas);
      if (tex && tex.setFilter) {
        tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    }
  };

  // --- Helper to draw a pixel rect ---
  const makeCanvas = (w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } => {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    let ctx = canvas.getContext('2d');
    if (!ctx) {
      // Safe Proxy fallback to prevent crashes if 2D context is temporarily throttled or unavailable
      ctx = new Proxy({} as any, {
        get: (target, prop) => {
          if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
            return () => ({
              addColorStop: () => {}
            });
          }
          return () => {};
        },
        set: () => true
      });
    } else {
      ctx.imageSmoothingEnabled = false;
    }
    return { canvas, ctx: ctx as CanvasRenderingContext2D };
  };

  // 1. ALBUM COVER: WIKLUND (Cat Adventurer, Sunset Castle, Music Badge)
  {
    const { canvas, ctx } = makeCanvas(160, 160);
    // Background gradient: Sunset sky
    const sky = ctx.createLinearGradient(0, 0, 0, 100);
    sky.addColorStop(0, '#2b1055');
    sky.addColorStop(0.4, '#591a75');
    sky.addColorStop(0.7, '#d35400');
    sky.addColorStop(1, '#f39c12');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 160, 160);

    // Sun
    ctx.fillStyle = '#fff9d2';
    ctx.fillRect(115, 45, 20, 20);

    // Mountains & Castle Silhouette in background
    ctx.fillStyle = '#371842';
    // Mountains
    ctx.beginPath();
    ctx.moveTo(70, 90); ctx.lineTo(110, 50); ctx.lineTo(150, 90); ctx.fill();
    // Castle towers
    ctx.fillRect(95, 45, 14, 45);
    ctx.fillRect(85, 55, 10, 35);
    ctx.fillRect(110, 52, 8, 38);
    // Castle spires
    ctx.fillStyle = '#512261';
    ctx.fillRect(96, 40, 12, 5);
    ctx.fillRect(100, 34, 4, 6);

    // Dragon silhouette in sky
    ctx.fillStyle = '#220b30';
    ctx.fillRect(130, 25, 14, 4);
    ctx.fillRect(128, 22, 6, 4);
    ctx.fillRect(138, 22, 6, 4);
    ctx.fillRect(133, 29, 6, 3);

    // Cliff and foreground trees
    ctx.fillStyle = '#1c1524';
    ctx.fillRect(0, 90, 90, 70);
    ctx.fillStyle = '#2a3b20';
    ctx.fillRect(10, 88, 70, 8); // Moss on rocks

    // Tree on the left with lantern
    ctx.fillStyle = '#1a1008';
    ctx.fillRect(4, 10, 16, 120);
    ctx.fillRect(16, 25, 25, 6); // Branch
    // Lantern
    ctx.fillStyle = '#443322';
    ctx.fillRect(34, 31, 8, 12);
    ctx.fillStyle = '#ffea66'; // Glowing light
    ctx.fillRect(36, 34, 4, 6);

    // Orange Cat Adventurer
    // Cloak
    ctx.fillStyle = '#2c1e19';
    ctx.fillRect(40, 75, 34, 30);
    ctx.fillRect(36, 85, 12, 20);
    // Cat fur (Orange ginger)
    ctx.fillStyle = '#e67e22';
    ctx.fillRect(46, 52, 24, 22); // Head
    ctx.fillRect(42, 44, 8, 10);  // Left ear
    ctx.fillRect(62, 44, 8, 10);  // Right ear
    ctx.fillRect(38, 96, 16, 8);  // Fluffy tail
    // White muzzle and chest
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(52, 63, 12, 10);
    // Inner ears pink
    ctx.fillStyle = '#f1948a';
    ctx.fillRect(44, 47, 4, 6);
    ctx.fillRect(64, 47, 4, 6);
    // Green eyes
    ctx.fillStyle = '#27ae60';
    ctx.fillRect(50, 57, 5, 5);
    ctx.fillRect(62, 57, 5, 5);
    ctx.fillStyle = '#0e4a26';
    ctx.fillRect(52, 58, 2, 4);
    ctx.fillRect(64, 58, 2, 4);
    // Cute smile & nose
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(57, 65, 3, 2);

    // Gold Brooch on cloak
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(56, 75, 5, 5);

    // Bottom Music Badge: "♫" with audio bars
    ctx.fillStyle = 'rgba(10, 8, 18, 0.85)';
    ctx.fillRect(10, 122, 140, 30);
    ctx.strokeStyle = '#f39c12';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 122, 140, 30);

    // Pixel Music Note
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(74, 130, 8, 3);
    ctx.fillRect(74, 133, 3, 10);
    ctx.fillRect(81, 133, 3, 8);
    ctx.fillRect(70, 140, 6, 4);
    ctx.fillRect(77, 138, 6, 4);

    // Audio frequency bars left and right
    const barHeights = [4, 8, 14, 10, 6];
    barHeights.forEach((bh, i) => {
      ctx.fillRect(35 + i * 6, 142 - bh, 3, bh);
      ctx.fillRect(98 + i * 6, 142 - bh, 3, bh);
    });

    // Decorative retro gold corner borders
    ctx.strokeStyle = '#d35400';
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, 156, 156);
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(2, 2, 8, 8);
    ctx.fillRect(150, 2, 8, 8);
    ctx.fillRect(2, 150, 8, 8);
    ctx.fillRect(150, 150, 8, 8);

    addTex('WiklundPic', canvas);
  }

  // 2. ALBUM COVER: NEOWAVE (Chubby Crown King, Purple Storm, Dark Castle)
  {
    const { canvas, ctx } = makeCanvas(160, 160);
    // Dark magical purple storm background
    const storm = ctx.createLinearGradient(0, 0, 0, 160);
    storm.addColorStop(0, '#10002b');
    storm.addColorStop(0.5, '#240046');
    storm.addColorStop(1, '#3c096c');
    ctx.fillStyle = storm;
    ctx.fillRect(0, 0, 160, 160);

    // Purple Lightning bolts
    ctx.strokeStyle = '#c77dff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(30, 0); ctx.lineTo(40, 35); ctx.lineTo(34, 45); ctx.lineTo(45, 80);
    ctx.moveTo(130, 0); ctx.lineTo(120, 25); ctx.lineTo(126, 40); ctx.lineTo(115, 65);
    ctx.stroke();

    // Dark gothic fortress in background
    ctx.fillStyle = '#18032c';
    ctx.fillRect(10, 40, 35, 60);
    ctx.fillRect(20, 25, 15, 30);
    ctx.fillRect(120, 45, 30, 55);

    // Floating rock platform
    ctx.fillStyle = '#150820';
    ctx.fillRect(25, 115, 110, 40);
    ctx.fillStyle = '#5a189a';
    ctx.fillRect(28, 114, 104, 4); // Glowing purple rim

    // Chubby Beige Royal King Creature
    // Royal Purple Velvet Cape
    ctx.fillStyle = '#3c096c';
    ctx.fillRect(45, 75, 60, 45);
    // White fur collar
    ctx.fillStyle = '#e0aaff';
    ctx.fillRect(46, 72, 58, 8);

    // Beige Chubby Body
    ctx.fillStyle = '#f5deb3';
    ctx.fillRect(52, 60, 46, 46);
    // Hands
    ctx.fillRect(46, 78, 8, 8);
    ctx.fillRect(96, 78, 8, 8);

    // King's Face
    // Big silly red grin & blue tongue
    ctx.fillStyle = '#e63946';
    ctx.fillRect(62, 80, 26, 8);
    ctx.fillStyle = '#48cae4';
    ctx.fillRect(72, 85, 6, 6); // Blue tongue!
    // Eyes (derpy green dots)
    ctx.fillStyle = '#2d6a4f';
    ctx.fillRect(60, 68, 6, 5);
    ctx.fillRect(84, 68, 6, 5);

    // Royal Jeweled Crown
    ctx.fillStyle = '#ffb703';
    ctx.fillRect(56, 44, 38, 12);
    ctx.fillRect(54, 38, 8, 8);
    ctx.fillRect(71, 34, 8, 12); // Center peak
    ctx.fillRect(88, 38, 8, 8);
    // Purple jewels in crown
    ctx.fillStyle = '#9d4edd';
    ctx.fillRect(58, 48, 4, 4);
    ctx.fillRect(73, 46, 4, 4);
    ctx.fillRect(88, 48, 4, 4);

    // Purple Gem Necklace
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(58, 74, 34, 4);
    ctx.fillStyle = '#7b2cbf';
    ctx.fillRect(72, 76, 6, 6);

    // Magical Crystal Scepter Staff (Right Hand)
    ctx.fillStyle = '#4a2810';
    ctx.fillRect(106, 55, 4, 60); // Staff pole
    ctx.fillStyle = '#240046';
    ctx.fillRect(102, 50, 12, 6);  // Scepter claws
    ctx.fillStyle = '#e0aaff';     // Glowing Crystal
    ctx.fillRect(104, 40, 8, 12);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(106, 43, 4, 4);   // Highlight

    // Five-Star Rank Banner at bottom
    ctx.fillStyle = '#10002b';
    ctx.fillRect(30, 138, 100, 16);
    ctx.strokeStyle = '#9d4edd';
    ctx.lineWidth = 1;
    ctx.strokeRect(30, 138, 100, 16);
    ctx.fillStyle = '#e0aaff';
    for (let s = 0; s < 5; s++) {
      ctx.fillRect(44 + s * 16, 142, 8, 8);
    }

    // Border
    ctx.strokeStyle = '#7b2cbf';
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, 156, 156);
    ctx.fillStyle = '#c77dff';
    ctx.fillRect(2, 2, 8, 8);
    ctx.fillRect(150, 2, 8, 8);
    ctx.fillRect(2, 150, 8, 8);
    ctx.fillRect(150, 150, 8, 8);

    addTex('NeowavePic', canvas);
  }

  // 2c. ALBUM COVER: VOID OVERLORD (Purple Void Titan with 3 White Horns, Floating Islands & 5-Star Crest)
  {
    const { canvas, ctx } = makeCanvas(160, 160);
    // Dark violet/purple nebula sky
    const bg = ctx.createLinearGradient(0, 0, 0, 160);
    bg.addColorStop(0, '#130424');
    bg.addColorStop(0.5, '#2e1065');
    bg.addColorStop(1, '#090214');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 160, 160);

    // Distant clouds & purple glow
    ctx.fillStyle = '#4c1d95';
    ctx.beginPath(); ctx.arc(130, 30, 25, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(30, 45, 20, 0, Math.PI * 2); ctx.fill();

    // Floating rock islands in background
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(15, 35, 24, 14);
    ctx.fillRect(120, 38, 28, 16);
    // Floating castle on right
    ctx.fillStyle = '#312e81';
    ctx.fillRect(124, 22, 20, 16);
    ctx.fillRect(128, 14, 12, 8);
    // Glowing moon behind castle
    ctx.fillStyle = '#a855f7';
    ctx.beginPath(); ctx.arc(134, 18, 8, 0, Math.PI * 2); ctx.fill();

    // Purple electrical energy arcs
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(10, 80); ctx.quadraticCurveTo(30, 60, 45, 90);
    ctx.moveTo(150, 80); ctx.quadraticCurveTo(130, 60, 115, 90);
    ctx.stroke();

    // Dark flowing robe of the Void Overlord
    ctx.fillStyle = '#0f051d';
    ctx.beginPath();
    ctx.moveTo(35, 140);
    ctx.lineTo(80, 55);
    ctx.lineTo(125, 140);
    ctx.closePath();
    ctx.fill();

    // 3 GIGANTIC SHARP WHITE / SILVER HORNS / CROWNS
    // Center horn
    ctx.fillStyle = '#f5f3ff';
    ctx.beginPath();
    ctx.moveTo(80, 24);
    ctx.lineTo(95, 62);
    ctx.lineTo(80, 54);
    ctx.lineTo(65, 62);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ddd6fe';
    ctx.beginPath();
    ctx.moveTo(80, 24); ctx.lineTo(95, 62); ctx.lineTo(80, 54); ctx.closePath(); ctx.fill();

    // Left horn
    ctx.fillStyle = '#f5f3ff';
    ctx.beginPath();
    ctx.moveTo(48, 32);
    ctx.lineTo(62, 66);
    ctx.lineTo(44, 60);
    ctx.lineTo(32, 52);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ddd6fe';
    ctx.beginPath();
    ctx.moveTo(48, 32); ctx.lineTo(62, 66); ctx.lineTo(44, 60); ctx.closePath(); ctx.fill();

    // Right horn
    ctx.fillStyle = '#f5f3ff';
    ctx.beginPath();
    ctx.moveTo(112, 32);
    ctx.lineTo(128, 52);
    ctx.lineTo(116, 60);
    ctx.lineTo(98, 66);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#c4b5fd';
    ctx.beginPath();
    ctx.moveTo(112, 32); ctx.lineTo(128, 52); ctx.lineTo(116, 60); ctx.closePath(); ctx.fill();

    // Swirling purple flame hands
    ctx.fillStyle = '#e879f9';
    ctx.beginPath(); ctx.arc(45, 110, 14, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(115, 110, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fdf4ff';
    ctx.beginPath(); ctx.arc(45, 110, 7, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(115, 110, 7, 0, Math.PI * 2); ctx.fill();

    // Top Crown Motif
    ctx.fillStyle = '#c084fc';
    ctx.fillRect(72, 8, 16, 4);
    ctx.fillRect(70, 5, 4, 3);
    ctx.fillRect(78, 4, 4, 4);
    ctx.fillRect(86, 5, 4, 3);

    // Bottom Crest with 5 Stars (★★★★★)
    ctx.fillStyle = '#1e1035';
    ctx.fillRect(40, 134, 80, 18);
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(40, 134, 80, 18);

    // 5 Stars
    ctx.fillStyle = '#f5f3ff';
    for (let s = 0; s < 5; s++) {
      const sx = 52 + s * 14;
      const sy = 143;
      ctx.fillRect(sx - 2, sy - 2, 4, 4);
      ctx.fillRect(sx - 3, sy, 6, 1);
      ctx.fillRect(sx, sy - 3, 1, 6);
    }

    // Outer Purple Ornate Frame
    ctx.strokeStyle = '#9333ea';
    ctx.lineWidth = 3;
    ctx.strokeRect(3, 3, 154, 154);
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 1;
    ctx.strokeRect(6, 6, 148, 148);

    // Corner Ornaments
    const corners = [[3, 3], [151, 3], [3, 151], [151, 151]];
    ctx.fillStyle = '#e879f9';
    corners.forEach(([cx, cy]) => {
      ctx.fillRect(cx, cy, 6, 6);
    });

    addTex('VoidOverlordPic', canvas);
  }

  // 2d. ALBUM COVER: SHADOW REALM (Golden Wanderer with Glowing Eyes, Castle, Sword & Moonlit River)
  {
    const { canvas, ctx } = makeCanvas(160, 160);
    // Dark amber / brown gothic night sky
    const bg = ctx.createLinearGradient(0, 0, 0, 160);
    bg.addColorStop(0, '#1c1307');
    bg.addColorStop(0.45, '#291d0d');
    bg.addColorStop(1, '#0c0702');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 160, 160);

    // Glowing Golden Moon with Crater Textures
    ctx.fillStyle = '#fef08a';
    ctx.beginPath(); ctx.arc(110, 26, 16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ca8a04';
    ctx.fillRect(106, 20, 6, 4);
    ctx.fillRect(114, 24, 5, 5);
    ctx.fillRect(108, 30, 7, 4);

    // Distant mountain ranges & small star dots
    ctx.fillStyle = '#fde047';
    ctx.fillRect(50, 15, 2, 2);
    ctx.fillRect(75, 28, 2, 2);
    ctx.fillRect(140, 32, 2, 2);

    ctx.fillStyle = '#1f160b';
    ctx.beginPath();
    ctx.moveTo(0, 70); ctx.lineTo(50, 45); ctx.lineTo(110, 75); ctx.lineTo(0, 100);
    ctx.closePath(); ctx.fill();

    // Right side: Soaring Gothic Castle with warm amber windows
    ctx.fillStyle = '#171109';
    ctx.fillRect(120, 40, 32, 60);
    ctx.fillRect(126, 24, 8, 16);
    ctx.fillRect(140, 28, 8, 12);
    // Glowing windows
    ctx.fillStyle = '#facc15';
    ctx.fillRect(128, 30, 3, 4);
    ctx.fillRect(128, 48, 3, 4);
    ctx.fillRect(138, 52, 3, 4);
    ctx.fillRect(144, 68, 3, 4);

    // Moonlit Golden River reflection
    ctx.fillStyle = '#ca8a04';
    ctx.beginPath();
    ctx.moveTo(108, 90); ctx.lineTo(125, 120); ctx.lineTo(95, 160); ctx.lineTo(80, 160);
    ctx.closePath(); ctx.fill();
    // Shimmer lines
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(102, 100, 12, 2);
    ctx.fillRect(108, 115, 16, 2);
    ctx.fillRect(92, 130, 20, 2);
    ctx.fillRect(86, 145, 18, 2);

    // Left Cliff with Ancient Broadsword
    ctx.fillStyle = '#261b0c';
    ctx.beginPath();
    ctx.moveTo(0, 80); ctx.lineTo(60, 110); ctx.lineTo(40, 160); ctx.lineTo(0, 160);
    ctx.closePath(); ctx.fill();

    // Broadsword thrust into stone
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(25, 90, 3, 30);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(22, 98, 9, 3); // Crossguard
    ctx.fillRect(25, 84, 3, 6);  // Hilt

    // Center Foreground: Hooded Wanderer in Trench-Coat seen from behind
    ctx.fillStyle = '#3d2b14';
    // Coat lower skirt
    ctx.beginPath();
    ctx.moveTo(68, 80); ctx.lineTo(60, 135); ctx.lineTo(100, 135); ctx.lineTo(92, 80);
    ctx.closePath(); ctx.fill();
    // Split in coat
    ctx.fillStyle = '#171109';
    ctx.fillRect(79, 95, 2, 40);

    // Torso & belt
    ctx.fillStyle = '#4a3519';
    ctx.fillRect(66, 55, 28, 26);
    ctx.fillStyle = '#ca8a04';
    ctx.fillRect(72, 78, 16, 4); // Golden Belt Buckle

    // Hood & Cloak
    ctx.fillStyle = '#33230d';
    ctx.beginPath();
    ctx.arc(80, 48, 14, 0, Math.PI * 2);
    ctx.fill();

    // Glowing Vertical Yellow Slit Eyes
    ctx.fillStyle = '#fde047';
    ctx.fillRect(75, 42, 3, 8);
    ctx.fillRect(82, 42, 3, 8);

    // Ornate Golden Border with Diamond Star Corners
    ctx.strokeStyle = '#854d0e';
    ctx.lineWidth = 3;
    ctx.strokeRect(3, 3, 154, 154);
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 1;
    ctx.strokeRect(6, 6, 148, 148);

    // Golden Diamond Star Ornaments
    ctx.fillStyle = '#facc15';
    ctx.fillRect(77, 2, 6, 6);
    ctx.fillRect(77, 152, 6, 6);
    ctx.fillRect(2, 77, 6, 6);
    ctx.fillRect(152, 77, 6, 6);

    addTex('ShadowRealmPic', canvas);
  }

  // 2e. ALBUM COVER: BLOOD MOON / BOSS FIGHT (Crimson Moon, Horned Gargoyle, Vampire Castle & Blood River)
  {
    const { canvas, ctx } = makeCanvas(160, 160);
    // Intense Blood Red / Night gradient
    const bg = ctx.createLinearGradient(0, 0, 0, 160);
    bg.addColorStop(0, '#1c0303');
    bg.addColorStop(0.45, '#450a0a');
    bg.addColorStop(1, '#090101');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 160, 160);

    // Glowing Crimson Blood Moon with Craters
    ctx.fillStyle = '#fca5a5';
    ctx.beginPath(); ctx.arc(105, 38, 24, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(96, 28, 8, 6);
    ctx.fillRect(112, 32, 9, 7);
    ctx.fillRect(100, 44, 12, 6);

    // Flying Bats
    ctx.fillStyle = '#0f0202';
    ctx.fillRect(135, 22, 5, 2); ctx.fillRect(133, 20, 2, 2); ctx.fillRect(139, 20, 2, 2);
    ctx.fillRect(80, 58, 4, 2);  ctx.fillRect(78, 56, 2, 2);  ctx.fillRect(83, 56, 2, 2);
    ctx.fillRect(95, 72, 4, 2);

    // Left Gnarled Tree & Torn Red Banner with Horned Demon Skull
    ctx.fillStyle = '#170404';
    ctx.fillRect(0, 0, 22, 160);
    ctx.beginPath();
    ctx.moveTo(10, 0); ctx.lineTo(36, 35); ctx.lineTo(15, 70); ctx.lineTo(0, 60);
    ctx.closePath(); ctx.fill();

    // Red War Banner with Skull
    ctx.fillStyle = '#7f1d1d';
    ctx.beginPath();
    ctx.moveTo(25, 45); ctx.lineTo(44, 48); ctx.lineTo(40, 85); ctx.lineTo(32, 75); ctx.lineTo(24, 82);
    ctx.closePath(); ctx.fill();
    // Demon Skull Icon on banner
    ctx.fillStyle = '#fca5a5';
    ctx.fillRect(29, 56, 8, 8);
    ctx.fillRect(27, 52, 3, 4); // Horn
    ctx.fillRect(36, 52, 3, 4); // Horn

    // Right Side: Gothic Vampire Castle with Blood Waterfall
    ctx.fillStyle = '#1a0505';
    ctx.fillRect(110, 55, 42, 65);
    ctx.fillRect(118, 38, 10, 18);
    ctx.fillRect(134, 42, 10, 14);
    // Glowing Blood-Orange Windows
    ctx.fillStyle = '#f97316';
    ctx.fillRect(122, 44, 3, 4);
    ctx.fillRect(122, 65, 3, 4);
    ctx.fillRect(136, 68, 3, 4);

    // Blood-Red Waterfall plunging into river
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(120, 85, 4, 35);
    // Blood River reflection
    ctx.fillStyle = '#991b1b';
    ctx.beginPath();
    ctx.moveTo(122, 120); ctx.lineTo(140, 160); ctx.lineTo(85, 160); ctx.lineTo(110, 120);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f87171';
    ctx.fillRect(112, 128, 18, 2);
    ctx.fillRect(100, 142, 24, 2);
    ctx.fillRect(92, 154, 28, 2);

    // Center-Left Foreground: Horned Owl / Stone Beast on Cliff
    ctx.fillStyle = '#240808';
    ctx.beginPath();
    ctx.moveTo(0, 115); ctx.lineTo(85, 125); ctx.lineTo(60, 160); ctx.lineTo(0, 160);
    ctx.closePath(); ctx.fill();

    // Horned Beast Body (Beige stone with blood markings)
    ctx.fillStyle = '#e2d9d2';
    ctx.beginPath();
    ctx.arc(52, 100, 18, 0, Math.PI * 2);
    ctx.fill();

    // Horns
    ctx.fillStyle = '#d6ccc2';
    ctx.beginPath(); ctx.moveTo(38, 86); ctx.lineTo(34, 74); ctx.lineTo(44, 82); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(66, 86); ctx.lineTo(70, 74); ctx.lineTo(60, 82); ctx.closePath(); ctx.fill();

    // Wings with Crimson Blood Markings
    ctx.fillStyle = '#991b1b';
    ctx.beginPath(); ctx.moveTo(35, 90); ctx.lineTo(30, 118); ctx.lineTo(40, 110); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(69, 90); ctx.lineTo(74, 118); ctx.lineTo(64, 110); ctx.closePath(); ctx.fill();

    // Glowing Red Eyes and Beak
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(42, 94, 5, 5);
    ctx.fillRect(57, 94, 5, 5);
    ctx.fillStyle = '#450a0a';
    ctx.beginPath(); ctx.moveTo(52, 98); ctx.lineTo(56, 108); ctx.lineTo(48, 108); ctx.closePath(); ctx.fill();

    // Talons on stone
    ctx.fillStyle = '#d97706';
    ctx.fillRect(42, 116, 5, 4);
    ctx.fillRect(57, 116, 5, 4);

    // Ornate Blood-Red Frame
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 3;
    ctx.strokeRect(3, 3, 154, 154);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1;
    ctx.strokeRect(6, 6, 148, 148);

    // Diamond Crests
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(77, 2, 6, 6);
    ctx.fillRect(77, 152, 6, 6);
    ctx.fillRect(2, 77, 6, 6);
    ctx.fillRect(152, 77, 6, 6);

    addTex('BloodMoonPic', canvas);
    // CrimsonEclipse alias
    addTex('CrimsonEclipsePic', canvas);
  }

  // --- ADDITIONAL COVERS FOR THE 9 THEMATIC BGM TRACKS ---
  // 2f. ALBUM COVER: RUNE WANDERERS (Wanderer & Horned Companion at Mossy Ancient Arch with Crimson Runes)
  {
    const { canvas, ctx } = makeCanvas(160, 160);
    // Bordeaux/purple and crimson sunset background
    const bg = ctx.createLinearGradient(0, 0, 0, 160);
    bg.addColorStop(0, '#1a051d');
    bg.addColorStop(0.5, '#450a0a');
    bg.addColorStop(1, '#110202');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 160, 160);

    // Stars/Rune Dust in sky
    ctx.fillStyle = '#f87171';
    ctx.fillRect(40, 20, 2, 2);
    ctx.fillRect(120, 15, 2, 2);
    ctx.fillRect(140, 45, 2, 2);

    // Stone Archway (Ancient & Mossy)
    ctx.fillStyle = '#1e1e24';
    ctx.fillRect(30, 40, 20, 120); // Left pillar
    ctx.fillRect(110, 40, 20, 120); // Right pillar
    ctx.fillRect(30, 25, 100, 20); // Arch lintel
    
    // Moss patches
    ctx.fillStyle = '#166534';
    ctx.fillRect(32, 50, 8, 12);
    ctx.fillRect(112, 70, 8, 16);
    ctx.fillRect(45, 27, 24, 6);

    // Glowing red runes on pillars and arch
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(38, 65, 4, 4);
    ctx.fillRect(38, 95, 4, 4);
    ctx.fillRect(118, 55, 4, 4);
    ctx.fillRect(118, 105, 4, 4);
    ctx.fillRect(78, 33, 4, 4);

    // Sunset hills
    ctx.fillStyle = '#0f0515';
    ctx.beginPath();
    ctx.moveTo(0, 120); ctx.lineTo(60, 105); ctx.lineTo(160, 125); ctx.lineTo(160, 160); ctx.lineTo(0, 160);
    ctx.closePath(); ctx.fill();

    // Wanderer in a wide-brim hat and dark red/brown cloak
    ctx.fillStyle = '#451a03'; // Cloak
    ctx.fillRect(55, 95, 24, 65);
    ctx.fillStyle = '#18181b'; // Hat
    ctx.fillRect(48, 86, 38, 4);
    ctx.fillRect(57, 78, 20, 8);

    // Horned Companion next to wanderer
    ctx.fillStyle = '#7c2d12'; // Body
    ctx.fillRect(84, 115, 16, 45);
    ctx.fillStyle = '#f5f5f5'; // Horns
    ctx.fillRect(82, 107, 4, 10);
    ctx.fillRect(98, 107, 4, 10);

    // Frame
    ctx.strokeStyle = '#450a0a';
    ctx.lineWidth = 3;
    ctx.strokeRect(3, 3, 154, 154);
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 1;
    ctx.strokeRect(6, 6, 148, 148);

    addTex('RuneWanderersPic', canvas);
  }

  // 2g. ALBUM COVER: SUNSET CITADEL (Wanderer & Horned Companion looking at Waterfall Castle)
  {
    const { canvas, ctx } = makeCanvas(160, 160);
    // Warm orange/yellow golden sky
    const bg = ctx.createLinearGradient(0, 0, 0, 160);
    bg.addColorStop(0, '#78350f');
    bg.addColorStop(0.5, '#d97706');
    bg.addColorStop(0.8, '#fbbf24');
    bg.addColorStop(1, '#fef08a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 160, 160);

    // Sun behind castle
    ctx.fillStyle = '#fffbeb';
    ctx.beginPath();
    ctx.arc(100, 60, 22, 0, Math.PI * 2);
    ctx.fill();

    // Waterfall Castle silhouette
    ctx.fillStyle = '#451a03';
    ctx.fillRect(80, 50, 40, 50);
    ctx.fillRect(72, 60, 8, 40);
    ctx.fillRect(120, 55, 10, 45);
    // Spires
    ctx.fillRect(84, 35, 6, 15);
    ctx.fillRect(108, 30, 8, 20);

    // Cliff on the left
    ctx.fillStyle = '#1e1b18';
    ctx.beginPath();
    ctx.moveTo(0, 80); ctx.lineTo(55, 95); ctx.lineTo(35, 160); ctx.lineTo(0, 160);
    ctx.closePath(); ctx.fill();

    // Beautiful cherry blossom/pink leafed tree on the cliff
    ctx.fillStyle = '#451a03'; // Trunk
    ctx.fillRect(15, 60, 5, 30);
    ctx.fillRect(15, 60, 15, 4); // Branch
    // Pink leaves
    ctx.fillStyle = '#f87171';
    ctx.beginPath();
    ctx.arc(16, 50, 14, 0, Math.PI * 2);
    ctx.arc(32, 54, 10, 0, Math.PI * 2);
    ctx.fill();

    // Waterfall splashing down
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(98, 100, 6, 60);

    // Little traveler with a staff & horned pet on clifftop
    ctx.fillStyle = '#0f172a'; // traveler body
    ctx.fillRect(38, 80, 8, 16);
    ctx.fillStyle = '#b45309'; // Staff
    ctx.fillRect(47, 70, 2, 26);
    // Horned companion
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(28, 86, 6, 10);

    // Frame
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 3;
    ctx.strokeRect(3, 3, 154, 154);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1;
    ctx.strokeRect(6, 6, 148, 148);

    addTex('SunsetCitadelPic', canvas);
  }

  // 2h. ALBUM COVER: MIDNIGHT WYRM ( traveler under giant dragon wing, mountain castle background)
  {
    const { canvas, ctx } = makeCanvas(160, 160);
    // Deep dark moonlit blue sky
    const bg = ctx.createLinearGradient(0, 0, 0, 160);
    bg.addColorStop(0, '#020617');
    bg.addColorStop(0.5, '#0f172a');
    bg.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 160, 160);

    // Bright moon
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(60, 50, 20, 0, Math.PI * 2);
    ctx.fill();

    // Giant Dragon Wing Silhouette forming arch over moon and castle
    ctx.fillStyle = '#090d16';
    ctx.beginPath();
    ctx.moveTo(10, 10);
    ctx.quadraticCurveTo(80, 30, 150, 120);
    ctx.lineTo(130, 140);
    ctx.quadraticCurveTo(70, 60, 20, 40);
    ctx.closePath();
    ctx.fill();
    // Claw peaks
    ctx.fillRect(50, 20, 4, 6);
    ctx.fillRect(90, 34, 4, 6);

    // Mountain castle
    ctx.fillStyle = '#05070a';
    ctx.fillRect(110, 90, 40, 70);
    ctx.fillRect(120, 70, 12, 20);

    // Tiny traveler silhouette
    ctx.fillStyle = '#f8fafc'; // glowing white outline for visibility
    ctx.fillRect(35, 120, 10, 18);
    ctx.fillStyle = '#020617';
    ctx.fillRect(36, 121, 8, 16);

    // Frame
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3;
    ctx.strokeRect(3, 3, 154, 154);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;
    ctx.strokeRect(6, 6, 148, 148);

    addTex('MidnightWyrmPic', canvas);
  }

  // 2i. ALBUM COVER: CRYPT BUTCHER (Horned Ogre-Executioner with bloody stone axe and skull under purple moon)
  {
    const { canvas, ctx } = makeCanvas(160, 160);
    // Toxic purple night sky
    const bg = ctx.createLinearGradient(0, 0, 0, 160);
    bg.addColorStop(0, '#0f051d');
    bg.addColorStop(0.5, '#3b0764');
    bg.addColorStop(1, '#020617');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 160, 160);

    // Glowing purple moon
    ctx.fillStyle = '#f0abfc';
    ctx.beginPath();
    ctx.arc(110, 40, 18, 0, Math.PI * 2);
    ctx.fill();

    // Massing of dungeon bricks
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(0, 100, 160, 60);
    ctx.fillStyle = '#2e1065';
    ctx.fillRect(10, 98, 40, 6);

    // Massive horned ogre executioner silhouette (Beige / dark grey)
    ctx.fillStyle = '#27272a'; // Body
    ctx.fillRect(40, 65, 55, 95);
    ctx.fillStyle = '#e4e4e7'; // Horns
    ctx.fillRect(34, 55, 6, 12);
    ctx.fillRect(94, 55, 6, 12);
    // Red glowing eyes
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(52, 72, 4, 4);
    ctx.fillRect(78, 72, 4, 4);

    // Bloody stone axe
    ctx.fillStyle = '#52525b'; // Shaft
    ctx.fillRect(28, 40, 4, 110);
    ctx.fillStyle = '#3f3f46'; // Axe blade
    ctx.fillRect(12, 45, 20, 24);
    ctx.fillStyle = '#ef4444'; // Blood on blade
    ctx.fillRect(12, 45, 6, 24);

    // Skull in other hand
    ctx.fillStyle = '#f4f4f5';
    ctx.fillRect(100, 110, 12, 12);
    ctx.fillStyle = '#090d16'; // Eye sockets
    ctx.fillRect(102, 113, 2, 3);
    ctx.fillRect(107, 113, 2, 3);

    // Frame
    ctx.strokeStyle = '#4c1d95';
    ctx.lineWidth = 3;
    ctx.strokeRect(3, 3, 154, 154);
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 1;
    ctx.strokeRect(6, 6, 148, 148);

    addTex('CryptButcherPic', canvas);
  }

  // --- COVERS ALIASES REGISTER ---
  {
    // Alias BraveCatPic -> WiklundPic
    const source = scene.textures.get('WiklundPic').getSourceImage() as HTMLCanvasElement;
    if (source) {
      const { canvas, ctx } = makeCanvas(160, 160);
      ctx.drawImage(source, 0, 0);
      addTex('BraveCatPic', canvas);
    }
    // Alias ChaosOverlordPic -> NeowavePic
    const source2 = scene.textures.get('NeowavePic').getSourceImage() as HTMLCanvasElement;
    if (source2) {
      const { canvas, ctx } = makeCanvas(160, 160);
      ctx.drawImage(source2, 0, 0);
      addTex('ChaosOverlordPic', canvas);
    }
    // Alias VoidSovereignPic -> VoidOverlordPic
    const source3 = scene.textures.get('VoidOverlordPic').getSourceImage() as HTMLCanvasElement;
    if (source3) {
      const { canvas, ctx } = makeCanvas(160, 160);
      ctx.drawImage(source3, 0, 0);
      addTex('VoidSovereignPic', canvas);
    }
    // Alias GildedSentinelPic -> ShadowRealmPic
    const source4 = scene.textures.get('ShadowRealmPic').getSourceImage() as HTMLCanvasElement;
    if (source4) {
      const { canvas, ctx } = makeCanvas(160, 160);
      ctx.drawImage(source4, 0, 0);
      addTex('GildedSentinelPic', canvas);
    }
  }

  // 3. MAP TILES & WORLD TEXTURES
  {
    // Floor
    const { canvas, ctx } = makeCanvas(64, 64);
    ctx.fillStyle = '#232926';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#2d3732';
    ctx.fillRect(4, 4, 26, 26);
    ctx.fillRect(34, 4, 26, 26);
    ctx.fillRect(4, 34, 26, 26);
    ctx.fillRect(34, 34, 26, 26);
    // Moss speckles
    ctx.fillStyle = '#1b4332';
    ctx.fillRect(8, 8, 4, 4);
    ctx.fillRect(48, 44, 4, 4);
    // Mortar
    ctx.strokeStyle = '#161d19';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, 64, 64);
    addTex('tile_floor', canvas);
  }

  {
    // Dungeon Wall
    const { canvas, ctx } = makeCanvas(64, 64);
    ctx.fillStyle = '#3f4a44';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#2c3530';
    ctx.fillRect(2, 2, 60, 28);
    ctx.fillRect(2, 34, 28, 28);
    ctx.fillRect(34, 34, 28, 28);
    ctx.strokeStyle = '#1b231f';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, 64, 64);
    ctx.beginPath();
    ctx.moveTo(0, 32); ctx.lineTo(64, 32); ctx.stroke();
    addTex('wall', canvas);
  }

  {
    // Stone Trodden Pathway
    const { canvas, ctx } = makeCanvas(64, 64);
    ctx.fillStyle = '#3a342c';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#4a4338';
    ctx.fillRect(6, 6, 22, 22);
    ctx.fillRect(36, 12, 20, 18);
    ctx.fillRect(10, 38, 24, 20);
    ctx.fillRect(38, 36, 20, 22);
    ctx.strokeStyle = '#28231c';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, 64, 64);
    addTex('path_tile', canvas);
  }

  // 4. BUILDINGS: MATCH GATES, HERO ALTAR, MERCHANT SHOP
  {
    // Gate of Matches
    const { canvas, ctx } = makeCanvas(320, 160);
    ctx.fillStyle = '#2c332e';
    ctx.fillRect(20, 20, 280, 140);
    // Columns
    ctx.fillStyle = '#1c221e';
    ctx.fillRect(30, 20, 40, 140);
    ctx.fillRect(250, 20, 40, 140);
    // Portcullis & Red Portal
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(90, 40, 140, 120);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(110, 60, 100, 100);
    // Runes
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(130, 80, 12, 12);
    ctx.fillRect(178, 80, 12, 12);
    ctx.fillRect(150, 110, 20, 20);
    // Top Arch
    ctx.fillStyle = '#404c44';
    ctx.fillRect(10, 10, 300, 25);
    addTex('build_gate', canvas);
  }

  {
    // Altar of Heroes (Magical platform)
    const { canvas, ctx } = makeCanvas(160, 160);
    ctx.fillStyle = '#1f2937';
    ctx.beginPath();
    ctx.arc(80, 80, 75, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#374151';
    ctx.beginPath();
    ctx.arc(80, 80, 60, 0, Math.PI * 2);
    ctx.fill();

    // Magic Circle
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(80, 80, 45, 0, Math.PI * 2);
    ctx.stroke();

    // Glowing runes
    ctx.fillStyle = '#67e8f9';
    ctx.fillRect(74, 74, 12, 12);
    ctx.fillRect(76, 40, 8, 8);
    ctx.fillRect(76, 112, 8, 8);
    ctx.fillRect(40, 76, 8, 8);
    ctx.fillRect(112, 76, 8, 8);
    addTex('build_altar', canvas);
  }

  {
    // Merchant Shop
    const { canvas, ctx } = makeCanvas(160, 160);
    // Wooden stall
    ctx.fillStyle = '#451a03';
    ctx.fillRect(20, 50, 120, 110);
    // Striped Awning (Purple & Gold)
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#7e22ce' : '#f59e0b';
      ctx.fillRect(15 + i * 22, 20, 22, 35);
    }
    // Counter
    ctx.fillStyle = '#78350f';
    ctx.fillRect(25, 90, 110, 25);
    // Potions on counter
    ctx.fillStyle = '#ef4444'; ctx.fillRect(40, 80, 10, 12);
    ctx.fillStyle = '#3b82f6'; ctx.fillRect(60, 78, 10, 14);
    ctx.fillStyle = '#10b981'; ctx.fillRect(80, 80, 10, 12);
    addTex('build_shop', canvas);
  }

  // 5. CHARACTERS: ZAZA, MONSTER ZAZA, GRIM, BJORN
  {
    // ZAZA - Normal Form (Exact 1:1 recreation of uploaded photo IMG_20260924_213926_443.jpg)
    // Chubby potato/dumpling body, flat warm peach flesh color with black contour,
    // green left eye, black right eye, wide red crescent smile,
    // thick dark indigo/purple drool dripping down past chin,
    // left floppy arm, right stub nub, small dark navel dot, and dark stubby legs.
    const { canvas, ctx } = makeCanvas(58, 66);

    // 1. Black outer contour of the chubby potato body
    ctx.fillStyle = '#18181b';
    ctx.beginPath();
    // Wide dome head
    ctx.ellipse(29, 21, 18, 14, 0, 0, Math.PI * 2);
    // Chubby belly
    ctx.ellipse(29, 36, 17, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Body skin fill: flat warm peachy cream flesh (#fed7aa / #fcd5a3)
    ctx.fillStyle = '#fed7aa';
    ctx.beginPath();
    ctx.ellipse(29, 21, 16, 12.5, 0, 0, Math.PI * 2);
    ctx.ellipse(29, 36, 15, 14.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Subtle skin tone nuance matching the drawing
    ctx.fillStyle = '#fce2be';
    ctx.beginPath();
    ctx.ellipse(28, 20, 13, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3. Left Arm (angling down & outwards to the left, rounded tip)
    ctx.fillStyle = '#18181b';
    ctx.beginPath();
    ctx.moveTo(14, 21);
    ctx.lineTo(8, 28);
    ctx.lineTo(8, 38);
    ctx.lineTo(13, 38);
    ctx.lineTo(15, 27);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#fed7aa';
    ctx.beginPath();
    ctx.moveTo(13, 23);
    ctx.lineTo(9.5, 29);
    ctx.lineTo(9.5, 36.5);
    ctx.lineTo(12, 36.5);
    ctx.lineTo(14, 27);
    ctx.closePath();
    ctx.fill();

    // 4. Right Arm (stubby little shoulder nub along right contour)
    ctx.fillStyle = '#18181b';
    ctx.beginPath();
    ctx.ellipse(45, 27, 4, 7, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fed7aa';
    ctx.beginPath();
    ctx.ellipse(44, 27, 3, 5.5, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // 5. Dark Charcoal/Brown Stubby Legs & Feet at the bottom
    ctx.fillStyle = '#3f332a';
    // Left leg
    ctx.beginPath();
    ctx.moveTo(18, 48);
    ctx.lineTo(16, 62);
    ctx.lineTo(23, 62);
    ctx.lineTo(24, 48);
    ctx.closePath();
    ctx.fill();

    // Right leg
    ctx.beginPath();
    ctx.moveTo(33, 48);
    ctx.lineTo(33, 62);
    ctx.lineTo(40, 62);
    ctx.lineTo(39, 48);
    ctx.closePath();
    ctx.fill();

    // 6. Left Eye: Large Green spot with thin dark border (as in photo)
    ctx.fillStyle = '#18181b';
    ctx.beginPath();
    ctx.arc(23, 14, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(23, 14, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.arc(23, 14, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(22, 13, 1.5, 1.5);

    // 7. Right Eye: Black circle/dot (as in photo)
    ctx.fillStyle = '#18181b';
    ctx.beginPath();
    ctx.arc(36, 15, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(35, 14, 1, 1);

    // 8. Wide Goofy Happy Red Smile
    ctx.fillStyle = '#18181b';
    ctx.beginPath();
    ctx.ellipse(29, 25, 10, 6, 0.05, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.ellipse(29, 25, 8.5, 4.8, 0.05, 0, Math.PI);
    ctx.fill();

    // 9. Signature Dark Indigo/Purple Drool Strand (drips straight down from right corner of mouth)
    ctx.fillStyle = '#18181b';
    ctx.fillRect(33, 26, 4.5, 14);
    ctx.fillRect(34, 38, 5, 4); // small bottom tip
    ctx.fillStyle = '#312e81';
    ctx.fillRect(34, 26, 3, 13);
    ctx.fillRect(35, 38, 3.5, 3);
    ctx.fillStyle = '#6366f1';
    ctx.fillRect(34, 28, 1.5, 7); // wet shine highlight

    // 10. Navel Dot (tiny dark brown dot on lower belly)
    ctx.fillStyle = '#3f2818';
    ctx.fillRect(29, 45, 2.5, 2.5);

    addTex('char_zaza', canvas);
  }

  // 5b. HIGH-DEFINITION PORTRAITS & PREVIEW CARDS FOR ALTAR
  {
    // PORTRAIT ZAZA (Detailed, expressive card preview for User Photo 1)
    const { canvas, ctx } = makeCanvas(140, 150);

    // Card Background: Dark mystical violet gradient
    const bg = ctx.createLinearGradient(0, 0, 0, 150);
    bg.addColorStop(0, '#1e1b4b');
    bg.addColorStop(0.5, '#0f172a');
    bg.addColorStop(1, '#05050a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 140, 150);

    // Subtle toxic magical aura behind Zaza
    const aura = ctx.createRadialGradient(70, 75, 10, 70, 75, 60);
    aura.addColorStop(0, 'rgba(168, 85, 247, 0.35)');
    aura.addColorStop(0.6, 'rgba(34, 197, 94, 0.15)');
    aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(70, 75, 60, 0, Math.PI * 2);
    ctx.fill();

    // Floating toxic bubble particles
    ctx.fillStyle = 'rgba(74, 222, 128, 0.6)';
    ctx.beginPath(); ctx.arc(25, 45, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(115, 35, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(120, 85, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(20, 95, 3.5, 0, Math.PI * 2); ctx.fill();

    // Zaza Body in Card Preview (Large, detailed, expressive)
    // Black outer contour
    ctx.fillStyle = '#18181b';
    ctx.beginPath();
    ctx.arc(70, 52, 28, 0, Math.PI * 2); // Head bulb
    ctx.arc(70, 78, 33, 0, Math.PI * 2); // Belly bulb
    ctx.fill();

    // Main Peach Fill
    ctx.fillStyle = '#fed7aa';
    ctx.beginPath();
    ctx.arc(70, 52, 25, 0, Math.PI * 2);
    ctx.arc(70, 78, 30, 0, Math.PI * 2);
    ctx.fill();

    // Rich Yellowish-Peach Tone
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(67, 50, 21, 0, Math.PI * 2);
    ctx.arc(67, 75, 26, 0, Math.PI * 2);
    ctx.fill();

    // Shading on lower right
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(78, 84, 18, 0, Math.PI * 2);
    ctx.fill();

    // Highlight on upper left
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(62, 42, 14, 0, Math.PI * 2);
    ctx.fill();

    // Left Arm
    ctx.fillStyle = '#18181b';
    ctx.fillRect(36, 52, 10, 28);
    ctx.fillRect(32, 66, 8, 12);
    ctx.fillStyle = '#fed7aa';
    ctx.fillRect(38, 54, 7, 24);
    ctx.fillRect(34, 68, 6, 9);

    // Right Arm
    ctx.fillStyle = '#18181b';
    ctx.fillRect(94, 56, 12, 18);
    ctx.fillStyle = '#fed7aa';
    ctx.fillRect(95, 58, 9, 14);

    // Feet
    ctx.fillStyle = '#27272a';
    ctx.fillRect(52, 100, 13, 18);
    ctx.fillRect(48, 114, 18, 6);
    ctx.fillRect(75, 100, 13, 18);
    ctx.fillRect(74, 114, 18, 6);

    // Left Eye: Bright Green Eye
    ctx.fillStyle = '#18181b';
    ctx.beginPath(); ctx.arc(58, 41, 7.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#22c55e';
    ctx.beginPath(); ctx.arc(58, 41, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#15803d';
    ctx.beginPath(); ctx.arc(58, 41, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(55, 38, 3, 3);

    // Right Eye: Beady Black Eye
    ctx.fillStyle = '#18181b';
    ctx.beginPath(); ctx.arc(79, 43, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(77, 41, 2, 2);

    // Big Goofy Open Red Smile
    ctx.fillStyle = '#18181b';
    ctx.beginPath(); ctx.ellipse(69, 58, 17, 10, 0.05, 0, Math.PI); ctx.fill();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath(); ctx.ellipse(69, 58, 14.5, 8, 0.05, 0, Math.PI); ctx.fill();
    ctx.fillStyle = '#991b1b';
    ctx.beginPath(); ctx.ellipse(69, 57.5, 11, 5, 0.05, 0, Math.PI); ctx.fill();

    // Purple Tongue / Drool Strand
    ctx.fillStyle = '#18181b';
    ctx.fillRect(78, 60, 7, 24);
    ctx.fillRect(80, 80, 8, 8);
    ctx.fillStyle = '#8b5cf6';
    ctx.fillRect(79, 60, 5, 23);
    ctx.fillRect(81, 80, 6, 6);
    ctx.fillStyle = '#d8b4fe';
    ctx.fillRect(80, 63, 2, 14);

    // Navel Dot
    ctx.fillStyle = '#3f2818';
    ctx.fillRect(68, 88, 4, 4);

    // Card Borders & Corner Accents
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(3, 3, 134, 144);
    ctx.fillStyle = '#c084fc';
    ctx.fillRect(2, 2, 7, 7);
    ctx.fillRect(131, 2, 7, 7);
    ctx.fillRect(2, 141, 7, 7);
    ctx.fillRect(131, 141, 7, 7);

    // Bottom Badge: "✦ ЭПИЧЕСКИЙ ✦"
    ctx.fillStyle = '#3b0764';
    ctx.fillRect(18, 126, 104, 18);
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 1;
    ctx.strokeRect(18, 126, 104, 18);

    ctx.fillStyle = '#f5d0fe';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('✦ ЭПИЧЕСКИЙ ✦', 70, 139);

    addTex('portrait_zaza', canvas);
  }

  {
    // PORTRAIT GRIM (Alchemist card preview)
    const { canvas, ctx } = makeCanvas(140, 150);
    const bg = ctx.createLinearGradient(0, 0, 0, 150);
    bg.addColorStop(0, '#042f2e');
    bg.addColorStop(0.6, '#0f172a');
    bg.addColorStop(1, '#020617');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 140, 150);

    // Glowing cyan mist
    const aura = ctx.createRadialGradient(70, 70, 10, 70, 70, 60);
    aura.addColorStop(0, 'rgba(6, 182, 212, 0.35)');
    aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath(); ctx.arc(70, 70, 60, 0, Math.PI * 2); ctx.fill();

    // Dark Hooded Robe
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(70, 52, 26, Math.PI, Math.PI * 2);
    ctx.lineTo(105, 115);
    ctx.lineTo(35, 115);
    ctx.closePath();
    ctx.fill();

    // Inner cloak
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(52, 60, 36, 52);

    // Gas Mask / Face Covering
    ctx.fillStyle = '#334155';
    ctx.fillRect(54, 46, 32, 22);

    // Glowing Cyan Goggles
    ctx.fillStyle = '#0891b2';
    ctx.beginPath(); ctx.arc(60, 48, 7, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(80, 48, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath(); ctx.arc(60, 48, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(80, 48, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(58, 46, 2, 2);
    ctx.fillRect(78, 46, 2, 2);

    // Glowing Alchemical Potion in hand
    ctx.fillStyle = '#a855f7';
    ctx.beginPath(); ctx.arc(70, 92, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e9d5ff';
    ctx.fillRect(68, 78, 4, 6); // Bottle neck
    ctx.fillStyle = '#c084fc';
    ctx.beginPath(); ctx.arc(68, 90, 3, 0, Math.PI * 2); ctx.fill(); // bubble

    // Card Borders
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(3, 3, 134, 144);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(2, 2, 7, 7);
    ctx.fillRect(131, 2, 7, 7);
    ctx.fillRect(2, 141, 7, 7);
    ctx.fillRect(131, 141, 7, 7);

    // Bottom Badge: "◆ ОБЫЧНЫЙ ◆"
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(18, 126, 104, 18);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;
    ctx.strokeRect(18, 126, 104, 18);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('◆ ОБЫЧНЫЙ ◆', 70, 139);

    addTex('portrait_grim', canvas);
  }

  {
    // PORTRAIT BJORN (Berserker card preview)
    const { canvas, ctx } = makeCanvas(140, 150);
    const bg = ctx.createLinearGradient(0, 0, 0, 150);
    bg.addColorStop(0, '#451a03');
    bg.addColorStop(0.6, '#18181b');
    bg.addColorStop(1, '#050508');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 140, 150);

    // Fiery orange rage aura
    const aura = ctx.createRadialGradient(70, 70, 10, 70, 70, 60);
    aura.addColorStop(0, 'rgba(249, 115, 22, 0.35)');
    aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath(); ctx.arc(70, 70, 60, 0, Math.PI * 2); ctx.fill();

    // Horned Viking Helmet
    ctx.fillStyle = '#64748b';
    ctx.fillRect(48, 30, 44, 28);
    // Horns
    ctx.fillStyle = '#fef08a';
    ctx.beginPath(); ctx.moveTo(48, 38); ctx.lineTo(34, 22); ctx.lineTo(44, 30); ctx.fill();
    ctx.beginPath(); ctx.moveTo(92, 38); ctx.lineTo(106, 22); ctx.lineTo(96, 30); ctx.fill();

    // Face & Eyes
    ctx.fillStyle = '#fed7aa';
    ctx.fillRect(52, 50, 36, 18);
    ctx.fillStyle = '#18181b';
    ctx.fillRect(58, 54, 6, 4);
    ctx.fillRect(76, 54, 6, 4);

    // Huge bushy orange beard
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.moveTo(48, 62);
    ctx.lineTo(92, 62);
    ctx.lineTo(84, 106);
    ctx.lineTo(70, 114);
    ctx.lineTo(56, 106);
    ctx.closePath();
    ctx.fill();

    // Fur and Leather armor
    ctx.fillStyle = '#78350f';
    ctx.fillRect(36, 92, 68, 30);
    ctx.fillStyle = '#92400e';
    ctx.fillRect(42, 88, 14, 10);
    ctx.fillRect(84, 88, 14, 10);

    // Card Borders
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(3, 3, 134, 144);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(2, 2, 7, 7);
    ctx.fillRect(131, 2, 7, 7);
    ctx.fillRect(2, 141, 7, 7);
    ctx.fillRect(131, 141, 7, 7);

    // Bottom Badge: "◆ ОБЫЧНЫЙ ◆"
    ctx.fillStyle = '#27272a';
    ctx.fillRect(18, 126, 104, 18);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1;
    ctx.strokeRect(18, 126, 104, 18);
    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('◆ ОБЫЧНЫЙ ◆', 70, 139);

    addTex('portrait_bjorn', canvas);
  }

  {
    // PORTRAIT TORF (Earthy Peat Bog Titan / Golem card preview for Altar)
    const { canvas, ctx } = makeCanvas(140, 150);
    // Background: Deep Mystical Royal Blue gradient (Rare tier)
    const bg = ctx.createLinearGradient(0, 0, 0, 150);
    bg.addColorStop(0, '#0f172a');
    bg.addColorStop(0.5, '#1e3a8a');
    bg.addColorStop(1, '#020617');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 140, 150);

    // Earth & Rock particles in aura
    const aura = ctx.createRadialGradient(70, 70, 10, 70, 70, 60);
    aura.addColorStop(0, 'rgba(59, 130, 246, 0.45)');
    aura.addColorStop(0.6, 'rgba(30, 58, 138, 0.2)');
    aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath(); ctx.arc(70, 70, 60, 0, Math.PI * 2); ctx.fill();

    // Floating peat rock fragments
    ctx.fillStyle = '#78716c';
    ctx.fillRect(20, 30, 8, 8);
    ctx.fillRect(112, 35, 10, 10);
    ctx.fillRect(18, 95, 7, 7);
    ctx.fillRect(115, 90, 8, 8);

    // Massive Peat Stone Titan Head & Shoulders
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(35, 28, 70, 84);

    // Granite shoulders & peat layers
    ctx.fillStyle = '#44403c';
    ctx.fillRect(20, 48, 100, 64);
    ctx.fillStyle = '#57534e';
    ctx.fillRect(24, 50, 34, 30);
    ctx.fillRect(82, 50, 34, 30);

    // Bog peat earth & mossy cracks
    ctx.fillStyle = '#292524';
    ctx.fillRect(46, 62, 48, 44);
    ctx.fillStyle = '#15803d'; // Moss green in cracks & shoulder moss
    ctx.fillRect(36, 56, 8, 22);
    ctx.fillRect(96, 58, 8, 20);
    ctx.fillRect(54, 84, 32, 5);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(38, 60, 4, 8);
    ctx.fillRect(98, 62, 4, 8);

    // Peat Head boulder & brow
    ctx.fillStyle = '#292524';
    ctx.fillRect(44, 24, 52, 46);
    ctx.fillStyle = '#44403c';
    ctx.fillRect(40, 20, 60, 16); // Heavy stone brow
    // Stone horn/crest spikes on head
    ctx.fillStyle = '#57534e';
    ctx.fillRect(42, 14, 10, 8);
    ctx.fillRect(88, 14, 10, 8);

    // Glowing Yellow/Gold Slit-Eyes
    ctx.fillStyle = '#facc15';
    ctx.fillRect(50, 36, 14, 5);
    ctx.fillRect(76, 36, 14, 5);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(53, 37, 8, 3);
    ctx.fillRect(79, 37, 8, 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(56, 38, 3, 2);
    ctx.fillRect(82, 38, 3, 2);

    // Massive Stone Fists at bottom corners
    ctx.fillStyle = '#78716c';
    ctx.fillRect(14, 82, 26, 32);
    ctx.fillRect(100, 82, 26, 32);
    ctx.fillStyle = '#a8a29e';
    ctx.fillRect(16, 86, 10, 12);
    ctx.fillRect(102, 86, 10, 12);
    ctx.fillStyle = '#38bdf8'; // Blue Earth Rune Glow on knuckles
    ctx.fillRect(22, 94, 6, 6);
    ctx.fillRect(108, 94, 6, 6);

    // Blue Rare Tier Frame Border
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(3, 3, 134, 144);
    ctx.fillStyle = '#60a5fa';
    ctx.fillRect(2, 2, 7, 7);
    ctx.fillRect(131, 2, 7, 7);
    ctx.fillRect(2, 141, 7, 7);
    ctx.fillRect(131, 141, 7, 7);

    // Bottom Badge: "✦ РЕДКИЙ ✦"
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(18, 126, 104, 18);
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 1;
    ctx.strokeRect(18, 126, 104, 18);
    ctx.fillStyle = '#93c5fd';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('✦ РЕДКИЙ ✦', 70, 139);

    addTex('portrait_torf', canvas);
  }

  {
    // TORF (Earth Golem / Peat Stone Titan)
    // Giant rocky monolithic shoulders, deep brown peat earth and granite blocks,
    // mossy cracks, massive stone fists, narrow glowing yellow slit-eyes.
    const { canvas, ctx } = makeCanvas(58, 64);
    // Outer shadow / dark outline
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(8, 6, 42, 52);

    // Stone shoulders & body
    ctx.fillStyle = '#44403c';
    ctx.fillRect(6, 10, 46, 40);
    // Upper granite plate
    ctx.fillStyle = '#57534e';
    ctx.fillRect(10, 8, 38, 22);
    // Head horns / stone crest
    ctx.fillRect(14, 2, 6, 8);
    ctx.fillRect(38, 2, 6, 8);

    // Peat earth & mossy cracks
    ctx.fillStyle = '#292524';
    ctx.fillRect(14, 26, 30, 24);
    ctx.fillStyle = '#15803d'; // Moss green in cracks
    ctx.fillRect(10, 18, 5, 14);
    ctx.fillRect(43, 20, 5, 12);
    ctx.fillRect(22, 34, 14, 4);

    // Giant Stone Fists / Gauntlets
    ctx.fillStyle = '#78716c';
    ctx.fillRect(2, 22, 12, 24); // Left fist
    ctx.fillRect(44, 22, 12, 24); // Right fist
    ctx.fillStyle = '#a8a29e'; // Highlight
    ctx.fillRect(3, 24, 5, 8);
    ctx.fillRect(45, 24, 5, 8);
    ctx.fillStyle = '#38bdf8'; // Rune glow
    ctx.fillRect(5, 32, 4, 4);
    ctx.fillRect(47, 32, 4, 4);

    // Stone Head & Brow
    ctx.fillStyle = '#292524';
    ctx.fillRect(16, 6, 26, 18);
    ctx.fillStyle = '#44403c';
    ctx.fillRect(14, 4, 30, 7); // Heavy stone brow

    // Narrow glowing yellow slit-eyes (distinct feature!)
    ctx.fillStyle = '#facc15';
    ctx.fillRect(18, 12, 8, 3);
    ctx.fillRect(32, 12, 8, 3);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(20, 12, 4, 2);
    ctx.fillRect(34, 12, 4, 2);

    // Heavy stone legs
    ctx.fillStyle = '#292524';
    ctx.fillRect(16, 48, 11, 14);
    ctx.fillRect(31, 48, 11, 14);
    ctx.fillStyle = '#44403c';
    ctx.fillRect(13, 58, 14, 5);
    ctx.fillRect(31, 58, 14, 5);

    addTex('char_torf', canvas);
  }

  {
    // ZAZA MONSTER - Mutation Form (Exact match to User Photo 2)
    // Huge upright peach body, black outline, small beady eyes at top,
    // gigantic gaping black mouth taking up head and body,
    // sharp dripping red bloody teeth/fangs on top rim, red blood puddle at bottom,
    // drooping arms, two distinct red bloody patches on lower belly!
    const { canvas, ctx } = makeCanvas(68, 76);

    // Black body outline
    ctx.fillStyle = '#18181b';
    ctx.beginPath();
    ctx.ellipse(34, 36, 25, 30, 0, 0, Math.PI * 2);
    ctx.fill();

    // Peach body skin
    ctx.fillStyle = '#fce7b8';
    ctx.beginPath();
    ctx.ellipse(34, 36, 23, 28, 0, 0, Math.PI * 2);
    ctx.fill();

    // Drooping side arms / ears
    ctx.fillStyle = '#18181b';
    ctx.fillRect(7, 22, 8, 28);
    ctx.fillRect(53, 22, 8, 28);
    ctx.fillStyle = '#fce7b8';
    ctx.fillRect(8, 23, 6, 26);
    ctx.fillRect(54, 23, 6, 26);

    // Small beady dark eyes at top
    ctx.fillStyle = '#18181b';
    ctx.fillRect(24, 10, 4, 4);
    ctx.fillRect(40, 10, 4, 4);

    // GIGANTIC GAPING BLACK MOUTH
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.ellipse(34, 29, 17, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Red Dripping Bloody Teeth / Fangs on top rim
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(20, 18); ctx.lineTo(23, 27); ctx.lineTo(26, 18);
    ctx.moveTo(26, 17); ctx.lineTo(29, 30); ctx.lineTo(33, 17);
    ctx.moveTo(33, 17); ctx.lineTo(37, 31); ctx.lineTo(41, 17);
    ctx.moveTo(41, 18); ctx.lineTo(44, 26); ctx.lineTo(47, 18);
    ctx.fill();

    // Red tongue / blood pool at bottom of gaping mouth
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.ellipse(34, 41, 12, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Two distinct Red Bloody Splatters / Patches on lower belly
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(21, 51, 8, 7);
    ctx.fillRect(20, 53, 10, 4);
    ctx.fillRect(41, 51, 8, 7);
    ctx.fillRect(39, 53, 10, 4);

    // Navel dot
    ctx.fillStyle = '#451a03';
    ctx.fillRect(34, 57, 2, 2);

    // Dark Stubby Feet at bottom
    ctx.fillStyle = '#27272a';
    ctx.fillRect(24, 63, 8, 10);
    ctx.fillRect(38, 63, 8, 10);

    addTex('char_zaza_monster', canvas);
  }

  {
    // GRIM (Shadow Alchemist)
    const { canvas, ctx } = makeCanvas(40, 52);
    // Dark robes
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(8, 16, 24, 32);
    // Purple inner mantle
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(12, 20, 16, 24);
    // Hood & Gas Mask / Glowing Cyan Goggles
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(10, 8, 20, 16);
    ctx.fillStyle = '#00f5d4';
    ctx.fillRect(14, 12, 4, 4);
    ctx.fillRect(22, 12, 4, 4);
    // Flask on belt
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(26, 32, 8, 10);
    addTex('char_grim', canvas);
  }

  {
    // BJORN (Viking Berserker - Unarmed Body with Fur Armor & Horned Helmet)
    const { canvas, ctx } = makeCanvas(48, 56);
    // Steel Horned Helmet
    ctx.fillStyle = '#64748b';
    ctx.fillRect(14, 8, 20, 16);
    // Horns
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(8, 4, 6, 8);
    ctx.fillRect(34, 4, 6, 8);
    // Golden Beard & Warrior face
    ctx.fillStyle = '#fed7aa';
    ctx.fillRect(16, 16, 16, 10);
    ctx.fillStyle = '#d97706';
    ctx.fillRect(14, 22, 20, 12); // Big Beard
    // Fur & Armor
    ctx.fillStyle = '#92400e';
    ctx.fillRect(12, 28, 24, 22);
    // Armored Gauntlets / Gloves
    ctx.fillStyle = '#78350f';
    ctx.fillRect(6, 32, 6, 12);
    ctx.fillRect(36, 32, 6, 12);
    addTex('char_bjorn', canvas);
  }

  // 6. SKILL ICONS (32x32)
  const drawIconBg = (ctx: CanvasRenderingContext2D, bg: string, border: string) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 32, 32);
    ctx.strokeStyle = border;
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, 32, 32);
  };

  // Zaza Skill 1: Toxic Spit
  {
    const { canvas, ctx } = makeCanvas(32, 32);
    drawIconBg(ctx, '#14532d', '#84cc16');
    ctx.fillStyle = '#a3e635';
    ctx.beginPath();
    ctx.arc(16, 18, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(16, 6); ctx.lineTo(10, 16); ctx.lineTo(22, 16); ctx.fill();
    // Bubbles
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(14, 16, 3, 3);
    addTex('skill_zaza_1', canvas);
  }

  // Zaza Skill 2: Propeller Club
  {
    const { canvas, ctx } = makeCanvas(32, 32);
    drawIconBg(ctx, '#3f2c1d', '#f59e0b');
    ctx.fillStyle = '#b45309';
    ctx.save();
    ctx.translate(16, 16);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-12, -3, 24, 6);
    ctx.restore();
    // Wind whirls
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(16, 16, 11, 0, Math.PI * 1.4);
    ctx.stroke();
    addTex('skill_zaza_2', canvas);
  }

  // Zaza Skill 3: Monster Mutation (Ult)
  {
    const { canvas, ctx } = makeCanvas(32, 32);
    drawIconBg(ctx, '#3b0764', '#c084fc');
    // Monster Skull
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(8, 8, 16, 16);
    ctx.fillStyle = '#dc2626'; // Glowing red eyes
    ctx.fillRect(10, 12, 4, 4);
    ctx.fillRect(18, 12, 4, 4);
    // Horns
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(6, 4, 4, 6);
    ctx.fillRect(22, 4, 4, 6);
    addTex('skill_zaza_3', canvas);
  }

  // Monster Skills
  {
    const { canvas, ctx } = makeCanvas(32, 32);
    drawIconBg(ctx, '#450a0a', '#ef4444');
    // Giant fangs bite
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(8, 8, 5, 8);
    ctx.fillRect(19, 8, 5, 8);
    ctx.fillRect(13, 16, 6, 8);
    addTex('skill_monster_1', canvas);
  }

  {
    const { canvas, ctx } = makeCanvas(32, 32);
    drawIconBg(ctx, '#450a0a', '#f97316');
    // Roar sonic waves
    ctx.strokeStyle = '#fdba74';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(8, 16, 6, -Math.PI / 3, Math.PI / 3);
    ctx.arc(8, 16, 14, -Math.PI / 3, Math.PI / 3);
    ctx.arc(8, 16, 22, -Math.PI / 3, Math.PI / 3);
    ctx.stroke();
    addTex('skill_monster_2', canvas);
  }

  // Grim Skill 1: Tar Bomb
  {
    const { canvas, ctx } = makeCanvas(32, 32);
    drawIconBg(ctx, '#1e1b4b', '#818cf8');
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(16, 18, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f43f5e'; // Lit fuse
    ctx.fillRect(15, 6, 3, 5);
    addTex('skill_grim_1', canvas);
  }

  // Grim Skill 2: Shadow Step
  {
    const { canvas, ctx } = makeCanvas(32, 32);
    drawIconBg(ctx, '#022c22', '#2dd4bf');
    // Shadow silhouette dash
    ctx.fillStyle = '#0d9488';
    ctx.fillRect(10, 8, 14, 16);
    ctx.fillStyle = '#5eead4';
    ctx.fillRect(6, 18, 20, 4);
    addTex('skill_grim_2', canvas);
  }

  // Grim Skill 3: Explosive Cauldron (Ult)
  {
    const { canvas, ctx } = makeCanvas(32, 32);
    drawIconBg(ctx, '#450a0a', '#fb7185');
    // Cauldron
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(8, 12, 16, 14);
    // Green bubbling brew
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(10, 10, 12, 4);
    // Fiery blast
    ctx.fillStyle = '#ea580c';
    ctx.fillRect(14, 4, 4, 6);
    addTex('skill_grim_3', canvas);
  }

  // Bjorn Skill 1: Earthquake
  {
    const { canvas, ctx } = makeCanvas(32, 32);
    drawIconBg(ctx, '#292524', '#a8a29e');
    // Stone spikes
    ctx.fillStyle = '#d6d3d1';
    ctx.beginPath();
    ctx.moveTo(8, 24); ctx.lineTo(12, 8); ctx.lineTo(16, 24); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(16, 24); ctx.lineTo(20, 12); ctx.lineTo(24, 24); ctx.fill();
    addTex('skill_bjorn_1', canvas);
  }

  // Bjorn Skill 2: Shield Ram
  {
    const { canvas, ctx } = makeCanvas(32, 32);
    drawIconBg(ctx, '#172554', '#60a5fa');
    // Iron Shield
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(10, 8, 12, 16);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(14, 12, 4, 8); // Golden crest
    addTex('skill_bjorn_2', canvas);
  }

  // Bjorn Skill 3: Axe Cyclone (Ult)
  {
    const { canvas, ctx } = makeCanvas(32, 32);
    drawIconBg(ctx, '#451a03', '#f59e0b');
    // Spinning Battleaxe blades
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(6, 14, 20, 4);
    ctx.fillRect(14, 6, 4, 20);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(4, 10, 6, 12);
    ctx.fillRect(22, 10, 6, 12);
    addTex('skill_bjorn_3', canvas);
  }

  // Torf Skill 1: Boulder Throw
  {
    const { canvas, ctx } = makeCanvas(32, 32);
    drawIconBg(ctx, '#1c1917', '#3b82f6');
    // Massive Boulder flying with trail
    ctx.fillStyle = '#78716c';
    ctx.beginPath(); ctx.arc(16, 16, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#a8a29e';
    ctx.fillRect(12, 11, 5, 5);
    ctx.fillStyle = '#44403c';
    ctx.fillRect(18, 18, 5, 5);
    // Stone shards / speed lines
    ctx.fillStyle = '#60a5fa';
    ctx.fillRect(4, 15, 6, 2);
    ctx.fillRect(26, 10, 3, 3);
    ctx.fillRect(25, 20, 3, 3);
    addTex('skill_torf_1', canvas);
  }

  // Torf Skill 2: Stone Skin (Shield / Defense)
  {
    const { canvas, ctx } = makeCanvas(32, 32);
    drawIconBg(ctx, '#0f172a', '#3b82f6');
    // Stone Shield / Hardened Crust
    ctx.fillStyle = '#44403c';
    ctx.fillRect(8, 6, 16, 20);
    ctx.fillStyle = '#78716c';
    ctx.fillRect(10, 8, 12, 16);
    // Glowing yellow slit eyes symbol inside shield
    ctx.fillStyle = '#facc15';
    ctx.fillRect(11, 14, 4, 2);
    ctx.fillRect(17, 14, 4, 2);
    // Blue defensive aura sparks
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 2;
    ctx.strokeRect(6, 4, 20, 24);
    addTex('skill_torf_2', canvas);
  }

  // Torf Skill 3: Underground Burrow / Eruption (Ult)
  {
    const { canvas, ctx } = makeCanvas(32, 32);
    drawIconBg(ctx, '#1c1917', '#facc15');
    // Subterranean ground crack & explosive stone eruption
    ctx.fillStyle = '#78350f';
    ctx.fillRect(4, 20, 24, 8); // Earth layer
    ctx.fillStyle = '#292524';
    ctx.fillRect(8, 22, 16, 4); // Fissure
    // Erupting stones & shockwave upward
    ctx.fillStyle = '#facc15';
    ctx.fillRect(14, 6, 4, 8);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(10, 10, 4, 4);
    ctx.fillRect(18, 10, 4, 4);
    ctx.fillRect(8, 14, 3, 3);
    ctx.fillRect(21, 14, 3, 3);
    addTex('skill_torf_3', canvas);
  }

  // Boulder Projectile Texture
  {
    const { canvas, ctx } = makeCanvas(32, 32);
    ctx.fillStyle = '#57534e';
    ctx.beginPath(); ctx.arc(16, 16, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#78716c';
    ctx.fillRect(10, 10, 8, 8);
    ctx.fillStyle = '#292524';
    ctx.fillRect(16, 16, 8, 8);
    ctx.fillStyle = '#15803d'; // Moss specks
    ctx.fillRect(12, 18, 3, 3);
    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = 2;
    ctx.stroke();
    addTex('proj_boulder', canvas);
  }

  // 7. RANK EMBLEMS
  const rankColors = [
    { key: 'rank_bronze', bg: '#78350f', border: '#b45309', fill: '#d97706' },
    { key: 'rank_silver', bg: '#334155', border: '#94a3b8', fill: '#e2e8f0' },
    { key: 'rank_gold',   bg: '#713f12', border: '#eab308', fill: '#fef08a' },
    { key: 'rank_plat',   bg: '#083344', border: '#06b6d4', fill: '#67e8f9' },
    { key: 'rank_diamond',bg: '#3b0764', border: '#c084fc', fill: '#f0abfc' },
  ];

  rankColors.forEach(r => {
    const { canvas, ctx } = makeCanvas(32, 32);
    ctx.fillStyle = r.bg;
    ctx.fillRect(0, 0, 32, 32);
    ctx.strokeStyle = r.border;
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, 28, 28);
    // Crest Star
    ctx.fillStyle = r.fill;
    ctx.beginPath();
    ctx.moveTo(16, 6); ctx.lineTo(20, 14); ctx.lineTo(28, 16);
    ctx.lineTo(22, 22); ctx.lineTo(24, 28); ctx.lineTo(16, 24);
    ctx.lineTo(8, 28); ctx.lineTo(10, 22); ctx.lineTo(4, 16);
    ctx.lineTo(12, 14); ctx.closePath();
    ctx.fill();
    addTex(r.key, canvas);
  });

  // 8. Firefly particle
  {
    const { canvas, ctx } = makeCanvas(6, 6);
    ctx.fillStyle = '#bef264';
    ctx.fillRect(1, 1, 4, 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(2, 2, 2, 2);
    addTex('firefly', canvas);
  }

  // 9. Menu Mouse Creature (Authentic Retro 16-Bit Pixel-Art Old-School Rat / Mouse)
  {
    const { canvas, ctx } = makeCanvas(32, 24);
    
    // Pixel block drawing helper
    const p = (x: number, y: number, w: number, h: number, col: string) => {
      ctx.fillStyle = col;
      ctx.fillRect(x, y, w, h);
    };

    // 1. Dark Retro Drop Shadow
    p(8, 22, 16, 2, 'rgba(0,0,0,0.5)');

    // 2. Stepped Pixel Tail (curling upwards)
    p(1, 14, 2, 3, '#94a3b8');
    p(3, 16, 2, 3, '#64748b');
    p(5, 18, 3, 2, '#475569');
    p(8, 19, 3, 2, '#334155');

    // 3. Vintage Rat Body (Blocky Charcoal & Weathered Slate Fur)
    // Dark Outline
    p(10, 10, 12, 11, '#1e293b');
    p(9, 12, 14, 8, '#1e293b');
    
    // Main Body Fur
    p(11, 11, 10, 9, '#475569');
    p(10, 13, 12, 6, '#475569');

    // Shading & Highlights (Old-school stepped gradient)
    p(12, 11, 6, 3, '#64748b');
    p(13, 12, 4, 2, '#94a3b8'); // back highlight
    p(10, 17, 12, 2, '#334155'); // bottom belly shadow

    // 4. Head & Snout (Retro pointy profile)
    p(20, 8, 8, 9, '#1e293b'); // outline
    p(21, 9, 6, 7, '#475569'); // head base
    p(23, 10, 3, 5, '#64748b'); // cheek

    // Pointed Snout
    p(27, 11, 3, 4, '#1e293b');
    p(27, 12, 2, 2, '#475569');
    p(29, 12, 2, 2, '#f43f5e'); // Pink pixel nose

    // 5. Classic Retro Large Ears
    // Back Ear
    p(18, 4, 4, 5, '#1e293b');
    p(19, 5, 2, 3, '#be185d');
    // Front Ear
    p(22, 3, 5, 6, '#1e293b');
    p(23, 4, 3, 4, '#fb7185');
    p(24, 5, 1, 2, '#ffffff'); // retro ear glint

    // 6. Retro Pixel Eye (Red/Dark glint)
    p(23, 8, 2, 2, '#0f172a');
    p(24, 8, 1, 1, '#f43f5e'); // ruby glint

    // 7. Old-School Whiskers
    p(27, 10, 3, 1, '#cbd5e1');
    p(28, 15, 3, 1, '#cbd5e1');

    // 8. Tiny Pixel Paws
    p(12, 20, 3, 2, '#fda4af');
    p(18, 20, 3, 2, '#fda4af');
    p(24, 17, 2, 2, '#fda4af'); // little front paw

    addTex('bg_mouse', canvas);
  }

  // 10. Dummy Enemy Target
  {
    const { canvas, ctx } = makeCanvas(40, 50);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(16, 35, 8, 15); // Stand
    ctx.fillStyle = '#b45309';
    ctx.fillRect(10, 15, 20, 24); // Straw body
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(12, 6, 16, 12);  // Head
    // Target bullseye
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(16, 22, 8, 8);
    addTex('target_dummy', canvas);
  }

  // 11. ARCO-style Ancient Monolith Temple & Back-view Warrior (Authentic Pixel Replica)
  {
    // Massive Ancient Stone Temple Monolith (360 x 280)
    const { canvas, ctx } = makeCanvas(360, 280);

    // 1. Dark background silhouette shadow
    ctx.fillStyle = '#111913';
    ctx.beginPath();
    ctx.arc(180, 160, 150, Math.PI, 0);
    ctx.lineTo(335, 260);
    ctx.lineTo(25, 260);
    ctx.closePath();
    ctx.fill();

    // 2. Main Stone Monolith Mass (Weathered olive-grey stone)
    ctx.fillStyle = '#3c4c3b';
    ctx.beginPath();
    ctx.arc(180, 160, 144, Math.PI, 0);
    ctx.lineTo(326, 256);
    ctx.lineTo(34, 256);
    ctx.closePath();
    ctx.fill();

    // Medium stone tint
    ctx.fillStyle = '#556952';
    ctx.beginPath();
    ctx.arc(180, 158, 136, Math.PI, 0);
    ctx.lineTo(316, 254);
    ctx.lineTo(44, 254);
    ctx.closePath();
    ctx.fill();

    // Light stone texture highlights (sun-facing stones)
    ctx.fillStyle = '#70886c';
    ctx.beginPath();
    ctx.arc(180, 154, 126, Math.PI * 1.05, Math.PI * 1.95);
    ctx.lineTo(306, 250);
    ctx.lineTo(54, 250);
    ctx.closePath();
    ctx.fill();

    // Overgrown Vibrant Moss on Upper Crown (Lush green lichen layers)
    ctx.fillStyle = '#3f6212';
    ctx.beginPath();
    ctx.arc(180, 152, 128, Math.PI * 1.15, Math.PI * 1.85);
    ctx.fill();

    ctx.fillStyle = '#65a30d';
    ctx.beginPath();
    ctx.arc(180, 144, 118, Math.PI * 1.2, Math.PI * 1.8);
    ctx.fill();

    ctx.fillStyle = '#a3e635';
    ctx.beginPath();
    ctx.arc(180, 136, 106, Math.PI * 1.25, Math.PI * 1.75);
    ctx.fill();

    // Stone cracks & fissures across the dome
    ctx.strokeStyle = '#223021';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(110, 60); ctx.lineTo(130, 85); ctx.lineTo(125, 110);
    ctx.moveTo(250, 65); ctx.lineTo(235, 95); ctx.lineTo(245, 120);
    ctx.moveTo(80, 130); ctx.lineTo(100, 150);
    ctx.moveTo(280, 130); ctx.lineTo(260, 155);
    ctx.stroke();

    // 3. Left & Right Deep Hollow Eye Sockets / Niches
    // Left Eye Alcove
    ctx.fillStyle = '#141d15';
    ctx.beginPath();
    ctx.ellipse(95, 125, 26, 16, -0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#080d09';
    ctx.beginPath();
    ctx.ellipse(95, 125, 20, 11, -0.15, 0, Math.PI * 2);
    ctx.fill();
    // Moss brow over left eye
    ctx.fillStyle = '#84cc16';
    ctx.fillRect(72, 112, 46, 5);
    ctx.fillRect(78, 117, 34, 4);

    // Right Eye Alcove
    ctx.fillStyle = '#141d15';
    ctx.beginPath();
    ctx.ellipse(265, 125, 26, 16, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#080d09';
    ctx.beginPath();
    ctx.ellipse(265, 125, 20, 11, 0.15, 0, Math.PI * 2);
    ctx.fill();
    // Moss brow over right eye
    ctx.fillStyle = '#84cc16';
    ctx.fillRect(242, 112, 46, 5);
    ctx.fillRect(248, 117, 34, 4);

    // 4. Central Vertical Relief Band with Ancient Carved Glyph Patterns
    ctx.fillStyle = '#222f23';
    ctx.fillRect(152, 48, 56, 125);

    ctx.fillStyle = '#7a9476';
    ctx.fillRect(156, 52, 48, 117);

    // Mesoamerican Stepped meanders & circular relief motifs
    ctx.fillStyle = '#222f23';
    for (let y = 56; y < 165; y += 18) {
      // Outer step brackets
      ctx.fillRect(160, y, 40, 14);
      ctx.fillStyle = '#8ea88a';
      ctx.fillRect(162, y + 2, 36, 10);

      // Carved square / circle glyphs
      ctx.fillStyle = '#1e291f';
      ctx.fillRect(166, y + 4, 10, 6);
      ctx.fillRect(184, y + 4, 10, 6);

      ctx.fillStyle = '#fef08a';
      ctx.fillRect(170, y + 6, 2, 2);
      ctx.fillRect(188, y + 6, 2, 2);

      ctx.fillStyle = '#222f23';
    }

    // Side decorative glyph carvings flanking the center
    ctx.fillStyle = '#273628';
    ctx.fillRect(132, 70, 14, 90);
    ctx.fillRect(214, 70, 14, 90);
    ctx.fillStyle = '#657e62';
    for (let y = 74; y < 155; y += 12) {
      ctx.fillRect(134, y, 10, 7);
      ctx.fillRect(216, y, 10, 7);
    }

    // 5. Massive Stone Archway Portal (Voussoirs & Blocks)
    ctx.fillStyle = '#1b261c';
    ctx.beginPath();
    ctx.arc(180, 205, 78, Math.PI, 0);
    ctx.lineTo(258, 260);
    ctx.lineTo(102, 260);
    ctx.closePath();
    ctx.fill();

    // Arch stones (outer ring)
    ctx.strokeStyle = '#5a7057';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(180, 205, 70, Math.PI, 0);
    ctx.stroke();

    // Keystone and stone block seams
    ctx.strokeStyle = '#1b261c';
    ctx.lineWidth = 3;
    for (let a = Math.PI; a <= Math.PI * 2; a += Math.PI / 8) {
      const x1 = 180 + Math.cos(a) * 62;
      const y1 = 205 + Math.sin(a) * 62;
      const x2 = 180 + Math.cos(a) * 78;
      const y2 = 205 + Math.sin(a) * 78;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // Arch Inner Wall
    ctx.fillStyle = '#2f4030';
    ctx.beginPath();
    ctx.arc(180, 205, 62, Math.PI, 0);
    ctx.lineTo(242, 260);
    ctx.lineTo(118, 260);
    ctx.closePath();
    ctx.fill();

    // 6. Deep Dark Mysterious Cavernous Void inside Arch
    ctx.fillStyle = '#050a06';
    ctx.beginPath();
    ctx.arc(180, 205, 52, Math.PI, 0);
    ctx.lineTo(232, 260);
    ctx.lineTo(128, 260);
    ctx.closePath();
    ctx.fill();

    // Cavern stone steps going deep inside
    ctx.fillStyle = '#172219';
    ctx.fillRect(138, 215, 84, 8);
    ctx.fillStyle = '#121a13';
    ctx.fillRect(144, 226, 72, 8);
    ctx.fillStyle = '#0b110c';
    ctx.fillRect(150, 237, 60, 8);

    // Hanging vines and moss tendrils dripping from the arch rim
    ctx.fillStyle = '#65a30d';
    ctx.fillRect(135, 150, 5, 28);
    ctx.fillRect(145, 145, 4, 18);
    ctx.fillRect(155, 142, 3, 22);
    ctx.fillRect(202, 142, 4, 24);
    ctx.fillRect(212, 146, 5, 16);
    ctx.fillRect(222, 150, 4, 30);

    ctx.fillStyle = '#bef264';
    ctx.fillRect(136, 174, 3, 6);
    ctx.fillRect(223, 176, 3, 6);

    // Stone threshold & steps at base
    ctx.fillStyle = '#475a45';
    ctx.fillRect(100, 252, 160, 10);
    ctx.fillStyle = '#2e3d2d';
    ctx.fillRect(80, 262, 200, 18);

    addTex('arco_ruins', canvas);
  }

  {
    // Back-view Wanderer/Explorer standing on sunlit path (36 x 52)
    const { canvas, ctx } = makeCanvas(36, 52);

    // Dark hair viewed from behind
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(18, 10, 8, 0, Math.PI * 2);
    ctx.fill();

    // Headband / bandana
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(11, 10, 14, 3);

    // Fur mantle / cloak across shoulders
    ctx.fillStyle = '#573318';
    ctx.fillRect(7, 16, 22, 16);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(9, 16, 18, 8);
    ctx.fillStyle = '#92400e';
    ctx.fillRect(11, 17, 14, 4);

    // Tanned skin on bare arms/neck
    ctx.fillStyle = '#b45309';
    ctx.fillRect(6, 22, 4, 10);
    ctx.fillRect(26, 22, 4, 10);

    // Dark tunic
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(10, 30, 16, 12);

    // Leather belt & pouch
    ctx.fillStyle = '#451a03';
    ctx.fillRect(10, 30, 16, 3);
    ctx.fillStyle = '#ca8a04';
    ctx.fillRect(21, 31, 4, 4);

    // Legs / Leather Boots
    ctx.fillStyle = '#0c0a09';
    ctx.fillRect(11, 42, 6, 10);
    ctx.fillRect(19, 42, 6, 10);

    addTex('arco_warrior', canvas);
  }

  // 11b. ARCO Forest Left Ancient Tree Trunk & Root system (180 x 360)
  {
    const { canvas, ctx } = makeCanvas(180, 360);
    // Dark silhouette base
    ctx.fillStyle = '#050c07';
    ctx.fillRect(0, 0, 180, 360);

    // Gnarled giant tree trunk on left
    ctx.fillStyle = '#09150b';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(90, 0);
    ctx.bezierCurveTo(110, 120, 80, 220, 140, 360);
    ctx.lineTo(0, 360);
    ctx.closePath();
    ctx.fill();

    // Trunk bark texture ridges
    ctx.fillStyle = '#142217';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(65, 0);
    ctx.bezierCurveTo(85, 120, 60, 220, 110, 360);
    ctx.lineTo(0, 360);
    ctx.closePath();
    ctx.fill();

    // Moss patches on bark
    ctx.fillStyle = '#2d4a1d';
    ctx.fillRect(40, 80, 24, 45);
    ctx.fillRect(55, 160, 28, 55);
    ctx.fillRect(75, 260, 35, 60);

    ctx.fillStyle = '#4d7c0f';
    ctx.fillRect(44, 90, 14, 25);
    ctx.fillRect(58, 175, 18, 30);
    ctx.fillRect(80, 275, 22, 35);

    // Overhanging leafy branches
    ctx.fillStyle = '#0f2912';
    ctx.beginPath();
    ctx.arc(80, 40, 55, 0, Math.PI * 2);
    ctx.arc(140, 60, 45, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1a3d1b';
    ctx.beginPath();
    ctx.arc(70, 35, 42, 0, Math.PI * 2);
    ctx.arc(130, 55, 32, 0, Math.PI * 2);
    ctx.fill();

    // Hanging creepers / lianas
    ctx.strokeStyle = '#365314';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(90, 60); ctx.bezierCurveTo(100, 120, 85, 180, 95, 230);
    ctx.moveTo(130, 80); ctx.bezierCurveTo(140, 130, 120, 190, 125, 250);
    ctx.stroke();

    addTex('arco_bg_tree_left', canvas);
  }

  // 11c. ARCO Forest Glade Foliage & Mossy Boulders (240 x 140)
  {
    const { canvas, ctx } = makeCanvas(240, 140);
    // Dark boulder silhouette
    ctx.fillStyle = '#121f14';
    ctx.beginPath();
    ctx.ellipse(60, 95, 55, 38, 0, 0, Math.PI * 2);
    ctx.ellipse(175, 100, 60, 36, 0, 0, Math.PI * 2);
    ctx.fill();

    // Medium stone
    ctx.fillStyle = '#223524';
    ctx.beginPath();
    ctx.ellipse(60, 90, 48, 30, 0, 0, Math.PI * 2);
    ctx.ellipse(175, 95, 52, 28, 0, 0, Math.PI * 2);
    ctx.fill();

    // Lush moss caps on boulders (chartreuse / yellow green)
    ctx.fillStyle = '#4d7c0f';
    ctx.beginPath();
    ctx.ellipse(55, 78, 42, 16, 0, 0, Math.PI * 2);
    ctx.ellipse(170, 82, 45, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#84cc16';
    ctx.beginPath();
    ctx.ellipse(55, 75, 32, 10, 0, 0, Math.PI * 2);
    ctx.ellipse(170, 79, 34, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#bef264';
    ctx.beginPath();
    ctx.ellipse(55, 73, 18, 5, 0, 0, Math.PI * 2);
    ctx.ellipse(170, 77, 20, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ferns and wild pixel grass blades
    ctx.fillStyle = '#65a30d';
    for (let x = 10; x < 230; x += 14) {
      ctx.fillRect(x, 115, 3, 18);
      ctx.fillRect(x + 2, 110, 3, 23);
      ctx.fillRect(x + 5, 118, 3, 15);
    }
    // Tiny glowing yellow blossoms
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(45, 114, 3, 3);
    ctx.fillRect(110, 116, 3, 3);
    ctx.fillRect(195, 112, 3, 3);

    addTex('arco_glade_bushes', canvas);
  }

  // 11d. ARCO Volumetric Sunbeam Shaft (180 x 300)
  {
    const { canvas, ctx } = makeCanvas(180, 300);
    const grad = ctx.createLinearGradient(0, 0, 120, 300);
    grad.addColorStop(0, 'rgba(254, 240, 138, 0.22)');
    grad.addColorStop(0.3, 'rgba(190, 242, 100, 0.16)');
    grad.addColorStop(0.7, 'rgba(132, 204, 22, 0.08)');
    grad.addColorStop(1, 'rgba(132, 204, 22, 0.0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(40, 0);
    ctx.lineTo(140, 0);
    ctx.lineTo(180, 300);
    ctx.lineTo(0, 300);
    ctx.closePath();
    ctx.fill();

    // Floating sunlit dust motes inside shaft
    ctx.fillStyle = '#fef9c3';
    const motes = [
      { x: 70, y: 40, r: 2 },
      { x: 110, y: 75, r: 1.5 },
      { x: 85, y: 130, r: 2 },
      { x: 130, y: 180, r: 2.5 },
      { x: 60, y: 220, r: 1.5 },
      { x: 100, y: 260, r: 2 }
    ];
    motes.forEach(m => {
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.fill();
    });

    addTex('arco_sunbeam_shaft', canvas);
  }

  // 12. DUNGEON ASSETS: MOBS, BOSS, CHESTS, DOORS, PICKUPS

  // 12. DUNGEON ASSETS: MOBS, BOSS, CHESTS, DOORS, PICKUPS
  {
    // Skeleton Warrior (32x42)
    const { canvas, ctx } = makeCanvas(32, 42);
    // Skull
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(10, 4, 12, 10);
    // Eye sockets
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(12, 7, 3, 3);
    ctx.fillRect(17, 7, 3, 3);
    // Ribcage & Spine
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(14, 14, 4, 14);
    ctx.fillRect(9, 16, 14, 2);
    ctx.fillRect(10, 20, 12, 2);
    ctx.fillRect(11, 24, 10, 2);
    // Tattered cloth
    ctx.fillStyle = '#78350f';
    ctx.fillRect(10, 27, 12, 6);
    // Bone legs
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(11, 33, 3, 9);
    ctx.fillRect(18, 33, 3, 9);
    // Rusty Iron Sword
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(24, 10, 3, 20);
    ctx.fillStyle = '#b45309';
    ctx.fillRect(22, 26, 7, 3);
    addTex('mob_skeleton', canvas);
  }

  {
    // Toxic Slime (36x30, Gelatinous Toxic Core with floating bubbles)
    const { canvas, ctx } = makeCanvas(36, 30);
    // Outer gelatinous dome
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.arc(18, 17, 16, Math.PI, 0);
    ctx.lineTo(34, 26);
    ctx.lineTo(2, 26);
    ctx.closePath();
    ctx.fill();

    // Translucent emerald jelly fill
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(18, 17, 14, Math.PI, 0);
    ctx.lineTo(32, 24);
    ctx.lineTo(4, 24);
    ctx.closePath();
    ctx.fill();

    // Glowing Lime Core
    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.arc(18, 15, 9, Math.PI, 0);
    ctx.fill();

    // Floating bubbles inside slime body
    ctx.fillStyle = '#bbf7d0';
    ctx.beginPath(); ctx.arc(11, 14, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(25, 13, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(18, 8, 3, 0, Math.PI * 2); ctx.fill();

    // Slime Eyes (glow red / amber slit eyes)
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(10, 13, 5, 4);
    ctx.fillRect(21, 13, 5, 4);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(12, 14, 2, 2);
    ctx.fillRect(23, 14, 2, 2);

    // Slimy base droplets
    ctx.fillStyle = '#166534';
    ctx.fillRect(4, 24, 28, 4);
    ctx.fillRect(1, 26, 4, 3);
    ctx.fillRect(31, 26, 4, 3);
    addTex('mob_slime', canvas);
  }

  {
    // 17b. JAW BEAST / CHOMPER (Серый Зубастик из фото IMG_20260926_135502_711.jpg, 40x54)
    const { canvas, ctx } = makeCanvas(40, 54);
    // Dark outer contour
    ctx.fillStyle = '#18181b';
    ctx.fillRect(8, 6, 24, 44);

    // Grey head and dome
    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.arc(22, 16, 12, Math.PI, 0);
    ctx.lineTo(34, 28);
    ctx.lineTo(12, 28);
    ctx.closePath();
    ctx.fill();

    // Giant gaping open mouth cavity (Dark void)
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.ellipse(24, 18, 10, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Sharp white jagged teeth (Upper and Lower rows)
    ctx.fillStyle = '#f8fafc';
    // Upper row teeth
    for (let t = 0; t < 5; t++) {
      ctx.beginPath();
      ctx.moveTo(15 + t * 4, 13);
      ctx.lineTo(17 + t * 4, 17);
      ctx.lineTo(19 + t * 4, 13);
      ctx.fill();
    }
    // Lower row teeth
    for (let t = 0; t < 5; t++) {
      ctx.beginPath();
      ctx.moveTo(15 + t * 4, 23);
      ctx.lineTo(17 + t * 4, 19);
      ctx.lineTo(19 + t * 4, 23);
      ctx.fill();
    }

    // Small glowing evil red eye
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(14, 10, 3, 3);

    // Slender grey neck & torso
    ctx.fillStyle = '#64748b';
    ctx.fillRect(16, 26, 8, 14);

    // Spiked dorsal plates along spine / tail (as in photo)
    ctx.fillStyle = '#334155';
    ctx.fillRect(10, 30, 6, 16);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(8, 32, 3, 3);
    ctx.fillRect(8, 37, 3, 3);
    ctx.fillRect(8, 42, 3, 3);

    // Grey bipedal legs
    ctx.fillStyle = '#475569';
    ctx.fillRect(18, 38, 6, 12);
    // White boots / bandages (matching drawing)
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(18, 48, 10, 4);
    ctx.fillRect(24, 46, 4, 6);

    // Forward claw arm
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(22, 28, 6, 3);
    ctx.fillRect(26, 29, 3, 6);

    addTex('mob_jaw_beast', canvas);
  }

  {
    // Toxic Slime Bubble Projectile (16x16, translucent emerald glow)
    const { canvas, ctx } = makeCanvas(16, 16);
    ctx.fillStyle = '#15803d';
    ctx.beginPath(); ctx.arc(8, 8, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4ade80';
    ctx.beginPath(); ctx.arc(8, 8, 5.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#bbf7d0';
    ctx.fillRect(5, 4, 3, 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(6, 5, 1.5, 1.5);
    addTex('proj_toxic_bubble', canvas);
  }

  {
    // Dark Mage (36x46)
    const { canvas, ctx } = makeCanvas(36, 46);
    // Robe
    ctx.fillStyle = '#3b0764';
    ctx.beginPath();
    ctx.moveTo(18, 14); ctx.lineTo(32, 44); ctx.lineTo(4, 44); ctx.closePath();
    ctx.fill();
    // Hood
    ctx.fillStyle = '#581c87';
    ctx.fillRect(10, 6, 16, 14);
    // Dark void face with glowing purple eyes
    ctx.fillStyle = '#0f051d';
    ctx.fillRect(12, 10, 12, 8);
    ctx.fillStyle = '#e879f9';
    ctx.fillRect(14, 12, 3, 3);
    ctx.fillRect(19, 12, 3, 3);
    // Magic Staff
    ctx.fillStyle = '#78350f';
    ctx.fillRect(28, 8, 3, 36);
    // Glowing Crystal Orb on Staff
    ctx.fillStyle = '#c084fc';
    ctx.beginPath();
    ctx.arc(29, 6, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(28, 4, 2, 2);
    addTex('mob_mage', canvas);
  }

  {
    // Ancient Golem Boss (80x80)
    const { canvas, ctx } = makeCanvas(80, 80);
    // Massive Stone Torso
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(40, 42, 32, 0, Math.PI * 2);
    ctx.fill();
    // Mossy cracks
    ctx.fillStyle = '#15803d';
    ctx.fillRect(26, 26, 8, 4);
    ctx.fillRect(48, 46, 10, 4);
    // Stone Shoulders & Fists
    ctx.fillStyle = '#475569';
    ctx.fillRect(6, 32, 16, 24); // Left fist
    ctx.fillRect(58, 32, 16, 24); // Right fist
    // Head / Faceplate
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(28, 14, 24, 20);
    // Glowing Rune Core (Center Chest)
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(40, 44, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fca5a5';
    ctx.fillRect(38, 42, 4, 4);
    // Glowing Red Eyes
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(32, 22, 5, 4);
    ctx.fillRect(43, 22, 5, 4);
    // Heavy Stone Legs
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(22, 60, 14, 18);
    ctx.fillRect(44, 60, 14, 18);
    // Gold Rune Trim
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.strokeRect(28, 14, 24, 20);
    addTex('boss_golem', canvas);
  }

  {
    // Dungeon Chest (Closed, 36x30)
    const { canvas, ctx } = makeCanvas(36, 30);
    // Wood chest body
    ctx.fillStyle = '#78350f';
    ctx.fillRect(3, 8, 30, 20);
    // Gold bands
    ctx.fillStyle = '#eab308';
    ctx.fillRect(3, 8, 4, 20);
    ctx.fillRect(29, 8, 4, 20);
    ctx.fillRect(3, 14, 30, 3);
    // Gold Keyhole Lock
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(16, 13, 5, 6);
    ctx.fillStyle = '#000000';
    ctx.fillRect(18, 15, 2, 2);
    addTex('dungeon_chest', canvas);
  }

  {
    // Dungeon Chest (Open, 36x34)
    const { canvas, ctx } = makeCanvas(36, 34);
    // Open lid flipped back
    ctx.fillStyle = '#92400e';
    ctx.fillRect(3, 2, 30, 10);
    // Inner chest with sparkling treasure & gems
    ctx.fillStyle = '#451a03';
    ctx.fillRect(3, 12, 30, 20);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(7, 14, 22, 8);
    // Gems
    ctx.fillStyle = '#ef4444'; ctx.fillRect(10, 15, 3, 3);
    ctx.fillStyle = '#38bdf8'; ctx.fillRect(18, 15, 4, 4);
    ctx.fillStyle = '#4ade80'; ctx.fillRect(24, 16, 3, 3);
    addTex('dungeon_chest_open', canvas);
  }

  {
    // Dungeon Gate Bars (Closed with red seal, 64x40)
    const { canvas, ctx } = makeCanvas(64, 40);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 64, 40);
    // Iron Portcullis Bars
    ctx.fillStyle = '#475569';
    for (let x = 6; x < 60; x += 8) {
      ctx.fillRect(x, 2, 4, 36);
    }
    // Red glowing sealing rune
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(26, 14, 12, 12);
    ctx.strokeStyle = '#f87171';
    ctx.strokeRect(24, 12, 16, 16);
    addTex('dungeon_door_closed', canvas);
  }

  {
    // Dungeon Gate (Open with green passage glow, 64x40)
    const { canvas, ctx } = makeCanvas(64, 40);
    ctx.fillStyle = '#052e16';
    ctx.fillRect(0, 0, 64, 40);
    // Green magical light portal
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(12, 6, 40, 28);
    ctx.fillStyle = '#86efac';
    ctx.fillRect(20, 12, 24, 16);
    addTex('dungeon_door_open', canvas);
  }

  {
    // Heart Health Pickup (16x16)
    const { canvas, ctx } = makeCanvas(16, 16);
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(8, 14);
    ctx.lineTo(2, 7);
    ctx.arc(5, 5, 3, Math.PI, 0);
    ctx.arc(11, 5, 3, Math.PI, 0);
    ctx.lineTo(14, 7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(4, 4, 2, 2);
    addTex('heart_pickup', canvas);
  }

  {
    // Coin Pickup (14x14)
    const { canvas, ctx } = makeCanvas(14, 14);
    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    ctx.arc(7, 7, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(5, 4, 4, 6);
    addTex('coin_pickup', canvas);
  }

  {
    // Ancient Shrine Altar (48x48)
    const { canvas, ctx } = makeCanvas(48, 48);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(6, 12, 36, 32);
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(24, 18, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e0f2fe';
    ctx.fillRect(22, 16, 4, 4);
    addTex('dungeon_shrine', canvas);
  }

  // --- NEW DUNGEON ASSETS: Cursed Knight, Weapons, Torches, Projectiles ---
  {
    // Boss: Cursed Knight (Проклятый Рыцарь, 64x64)
    const { canvas, ctx } = makeCanvas(64, 64);
    // Dark Crimson Cape
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(16, 22, 32, 36);
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(20, 26, 24, 32);

    // Heavy Dark Iron Armor Body
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(20, 20, 24, 26);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(23, 24, 18, 20);

    // Pauldrons (Spiked Shoulders)
    ctx.fillStyle = '#334155';
    ctx.fillRect(14, 20, 10, 10);
    ctx.fillRect(40, 20, 10, 10);
    ctx.fillStyle = '#dc2626'; // Red crest highlights
    ctx.fillRect(16, 18, 4, 3);
    ctx.fillRect(44, 18, 4, 3);

    // Horned Great Helm
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(22, 6, 20, 16);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(25, 8, 14, 12);
    // Horns
    ctx.fillStyle = '#64748b';
    ctx.fillRect(18, 4, 5, 8);
    ctx.fillRect(41, 4, 5, 8);
    ctx.fillRect(16, 2, 3, 4);
    ctx.fillRect(45, 2, 3, 4);

    // Glowing Red Visor / Slit Eyes (MENACING)
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(26, 13, 12, 3);
    ctx.fillStyle = '#fca5a5';
    ctx.fillRect(29, 13, 6, 2);

    // Legs and Sabatons
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(22, 46, 8, 16);
    ctx.fillRect(34, 46, 8, 16);
    ctx.fillStyle = '#334155';
    ctx.fillRect(20, 58, 11, 5);
    ctx.fillRect(33, 58, 11, 5);

    // Massive Dark Rune Greatsword
    ctx.fillStyle = '#475569';
    ctx.fillRect(48, 10, 4, 46); // Blade
    ctx.fillStyle = '#ef4444'; // Glowing red edge/fuller
    ctx.fillRect(49, 14, 2, 38);
    ctx.fillStyle = '#d97706'; // Gold hilt & crossguard
    ctx.fillRect(44, 42, 12, 4);
    ctx.fillRect(49, 46, 2, 8);

    addTex('boss_cursed_knight', canvas);
  }

  {
    // Weapon: Rusty Sword (Старый ржавый меч, 24x24)
    const { canvas, ctx } = makeCanvas(24, 24);
    ctx.save();
    ctx.translate(12, 12);
    ctx.rotate(-Math.PI / 4);
    // Blade
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-2, -10, 4, 14);
    ctx.fillStyle = '#b45309'; // Rust spots
    ctx.fillRect(-1, -7, 2, 4);
    ctx.fillRect(0, -2, 2, 3);
    // Guard
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-5, 4, 10, 2);
    // Handle & pommel
    ctx.fillStyle = '#451a03';
    ctx.fillRect(-1, 6, 2, 5);
    ctx.fillStyle = '#d97706';
    ctx.fillRect(-2, 10, 4, 2);
    ctx.restore();
    addTex('weapon_sword', canvas);
  }

  {
    // Weapon: Heavy Mace (Тяжелая булава, 24x24)
    const { canvas, ctx } = makeCanvas(24, 24);
    ctx.save();
    ctx.translate(12, 12);
    ctx.rotate(-Math.PI / 4);
    // Mace head (heavy spiked iron block)
    ctx.fillStyle = '#334155';
    ctx.fillRect(-5, -11, 10, 10);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(-3, -9, 6, 6);
    // Spikes
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-1, -13, 2, 3);
    ctx.fillRect(-7, -7, 3, 2);
    ctx.fillRect(4, -7, 3, 2);
    // Shaft
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-2, -1, 4, 12);
    ctx.restore();
    addTex('weapon_mace', canvas);
  }

  {
    // Weapon: Crossbow (Арбалет, 24x24)
    const { canvas, ctx } = makeCanvas(24, 24);
    // Bow wooden stock
    ctx.fillStyle = '#78350f';
    ctx.fillRect(10, 4, 4, 16);
    // Bow limb (horizontal arch)
    ctx.fillStyle = '#64748b';
    ctx.fillRect(3, 7, 18, 3);
    ctx.fillRect(2, 6, 3, 2);
    ctx.fillRect(19, 6, 3, 2);
    // String
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(3, 9, 8, 1);
    ctx.fillRect(13, 9, 8, 1);
    // Loaded Arrow / Bolt
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(11, 3, 2, 8);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(11, 2, 2, 2);
    addTex('weapon_crossbow', canvas);
  }

  {
    // Weapon: Wooden Club / Stick (Базовая палка Зазы, 24x24)
    const { canvas, ctx } = makeCanvas(24, 24);
    ctx.save();
    ctx.translate(12, 12);
    ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = '#854d0e';
    ctx.fillRect(-3, -10, 6, 12);
    ctx.fillStyle = '#a16207';
    ctx.fillRect(-2, -9, 4, 6);
    ctx.fillStyle = '#713f12';
    ctx.fillRect(-2, 2, 4, 9);
    ctx.restore();
    addTex('weapon_stick', canvas);
  }

  {
    // Gold Chest (Closed, 36x30)
    const { canvas, ctx } = makeCanvas(36, 30);
    ctx.fillStyle = '#d97706';
    ctx.fillRect(3, 8, 30, 20);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(3, 8, 5, 20);
    ctx.fillRect(28, 8, 5, 20);
    ctx.fillRect(3, 14, 30, 4);
    // Ruby Lock
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(15, 12, 6, 7);
    ctx.fillStyle = '#fecaca';
    ctx.fillRect(17, 13, 2, 2);
    addTex('gold_chest', canvas);
  }

  {
    // Gold Chest (Open, 36x34)
    const { canvas, ctx } = makeCanvas(36, 34);
    ctx.fillStyle = '#b45309';
    ctx.fillRect(3, 2, 30, 10);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(3, 12, 30, 20);
    // Radiant Legendary Glow
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(6, 14, 24, 10);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(9, 16, 18, 6);
    addTex('gold_chest_open', canvas);
  }

  {
    // Dungeon Wall Torch (16x24)
    const { canvas, ctx } = makeCanvas(16, 24);
    // Iron sconce
    ctx.fillStyle = '#334155';
    ctx.fillRect(6, 12, 4, 10);
    ctx.fillRect(4, 10, 8, 3);
    // Wood torch
    ctx.fillStyle = '#78350f';
    ctx.fillRect(6, 7, 4, 6);
    // Fiery Flame
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(4, 3, 8, 6);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(5, 2, 6, 5);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(6, 1, 4, 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(7, 2, 2, 2);
    addTex('dungeon_torch', canvas);
    addTex('dungeon_torch_1', canvas);
  }

  {
    // Dungeon Wall Torch Frame 2 (animated flickering flame, 16x24)
    const { canvas, ctx } = makeCanvas(16, 24);
    // Iron sconce
    ctx.fillStyle = '#334155';
    ctx.fillRect(6, 12, 4, 10);
    ctx.fillRect(4, 10, 8, 3);
    // Wood torch
    ctx.fillStyle = '#78350f';
    ctx.fillRect(6, 7, 4, 6);
    // Flickering Flame frame 2 (taller flame shifted slightly)
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(3, 2, 9, 7);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(4, 1, 7, 6);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(5, 0, 5, 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(6, 1, 3, 2);
    addTex('dungeon_torch_2', canvas);
  }

  {
    // Undead Cave Bat Mob (mob_bat, 24x20)
    const { canvas, ctx } = makeCanvas(24, 20);
    // Dark leathery wings
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath();
    ctx.moveTo(12, 10); ctx.lineTo(1, 3); ctx.lineTo(3, 16); ctx.lineTo(12, 12);
    ctx.lineTo(21, 16); ctx.lineTo(23, 3); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#311042';
    ctx.beginPath();
    ctx.moveTo(12, 10); ctx.lineTo(4, 6); ctx.lineTo(5, 14); ctx.lineTo(12, 11);
    ctx.lineTo(19, 14); ctx.lineTo(20, 6); ctx.closePath();
    ctx.fill();
    // Body & ears
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(9, 6, 6, 9);
    ctx.fillRect(8, 3, 3, 4);
    ctx.fillRect(13, 3, 3, 4);
    // Fiery red glowing eyes
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(10, 8, 2, 2);
    ctx.fillRect(13, 8, 2, 2);
    // Sharp fangs
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(10, 12, 1, 2);
    ctx.fillRect(13, 12, 1, 2);
    addTex('mob_bat', canvas);
  }

  {
    // Projectile: Arrow / Crossbow Bolt (16x6)
    const { canvas, ctx } = makeCanvas(16, 6);
    ctx.fillStyle = '#92400e';
    ctx.fillRect(2, 2, 11, 2);
    // Arrowhead
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(13, 1, 3, 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(14, 2, 2, 2);
    // Fletching (feathers)
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(0, 0, 3, 6);
    addTex('proj_arrow', canvas);
  }

  {
    // Projectile: Dark Fireball / Magic Orb (14x14)
    const { canvas, ctx } = makeCanvas(14, 14);
    ctx.fillStyle = '#581c87';
    ctx.beginPath();
    ctx.arc(7, 7, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#a855f7';
    ctx.beginPath();
    ctx.arc(7, 7, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f3e8ff';
    ctx.fillRect(5, 5, 4, 4);
    addTex('proj_dark_orb', canvas);
  }

  // --- SOUL KNIGHT STYLE DUNGEON TEXTURES: COMPANIONS, SHOP, PORTAL & CLASS WEAPONS ---
  {
    // Companion: Knight (Рыцарь-наемник, 28x32)
    const { canvas, ctx } = makeCanvas(28, 32);
    // Silver armor body
    ctx.fillStyle = '#64748b';
    ctx.fillRect(8, 10, 12, 14);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(10, 12, 8, 10);
    // Blue tabard
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(11, 14, 6, 10);
    // Helmet
    ctx.fillStyle = '#475569';
    ctx.fillRect(9, 2, 10, 9);
    ctx.fillStyle = '#facc15'; // Golden visor slit
    ctx.fillRect(11, 6, 6, 2);
    // Shield (Left)
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(2, 10, 6, 12);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(4, 13, 2, 6);
    // Sword (Right)
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(21, 6, 3, 16);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(20, 22, 5, 2);
    // Boots
    ctx.fillStyle = '#334155';
    ctx.fillRect(9, 24, 4, 7);
    ctx.fillRect(15, 24, 4, 7);
    addTex('companion_knight', canvas);
  }

  {
    // Companion: Dog Pet (Боевой пес, 24x20)
    const { canvas, ctx } = makeCanvas(24, 20);
    // Golden Brown Fur Body
    ctx.fillStyle = '#b45309';
    ctx.fillRect(6, 6, 14, 8);
    // Head
    ctx.fillStyle = '#d97706';
    ctx.fillRect(15, 2, 7, 7);
    // Snout
    ctx.fillStyle = '#fde68a';
    ctx.fillRect(19, 5, 4, 4);
    ctx.fillStyle = '#000000'; // Nose
    ctx.fillRect(22, 5, 2, 2);
    // Ears
    ctx.fillStyle = '#92400e';
    ctx.fillRect(15, 0, 3, 3);
    // Red Combat Collar with Gold Spikes
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(14, 6, 2, 6);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(13, 7, 2, 2);
    // Legs
    ctx.fillStyle = '#92400e';
    ctx.fillRect(7, 14, 3, 5);
    ctx.fillRect(16, 14, 3, 5);
    // Tail
    ctx.fillStyle = '#b45309';
    ctx.fillRect(2, 4, 4, 3);
    addTex('companion_dog', canvas);
  }

  {
    // Companion: Guardian Bear (Медведь-защитник, 34x30)
    const { canvas, ctx } = makeCanvas(34, 30);
    // Dark Grizzly Fur Body
    ctx.fillStyle = '#451a03';
    ctx.fillRect(6, 6, 22, 16);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(9, 8, 16, 12);
    // Massive Head
    ctx.fillStyle = '#78350f';
    ctx.fillRect(20, 2, 10, 10);
    ctx.fillStyle = '#b45309';
    ctx.fillRect(25, 6, 5, 5);
    ctx.fillStyle = '#000000';
    ctx.fillRect(28, 6, 2, 2);
    // Cute Round Ears
    ctx.fillStyle = '#451a03';
    ctx.fillRect(21, 0, 3, 3);
    ctx.fillRect(27, 0, 3, 3);
    // Heavy Paws
    ctx.fillStyle = '#451a03';
    ctx.fillRect(8, 22, 6, 7);
    ctx.fillRect(20, 22, 6, 7);
    // Iron armor plate on back
    ctx.fillStyle = '#64748b';
    ctx.fillRect(11, 4, 10, 4);
    ctx.fillStyle = '#38bdf8'; // Rune
    ctx.fillRect(15, 5, 2, 2);
    addTex('companion_bear', canvas);
  }

  {
    // Shopkeeper: Hooded Trader (Торговец, 30x34)
    const { canvas, ctx } = makeCanvas(30, 34);
    // Mystical Purple Hood & Cloak
    ctx.fillStyle = '#3b0764';
    ctx.fillRect(6, 6, 18, 24);
    ctx.fillStyle = '#581c87';
    ctx.fillRect(9, 8, 12, 20);
    // Hood Shadow & Glowing Yellow Eyes
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(9, 4, 12, 10);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(11, 8, 3, 3);
    ctx.fillRect(16, 8, 3, 3);
    // Gold Pendant
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(13, 16, 4, 5);
    // Wooden Wand in Hand
    ctx.fillStyle = '#78350f';
    ctx.fillRect(23, 10, 3, 18);
    ctx.fillStyle = '#38bdf8'; // Glowing crystal tip
    ctx.fillRect(22, 6, 5, 5);
    addTex('dungeon_shopkeeper', canvas);
  }

  {
    // Level Transition Portal / Cave Entrance (48x48)
    const { canvas, ctx } = makeCanvas(48, 48);
    // Stone Portal Arch
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(4, 4, 40, 40);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(8, 8, 32, 32);
    // Swirling Emerald Galaxy
    const grad = ctx.createRadialGradient(24, 24, 2, 24, 24, 18);
    grad.addColorStop(0, '#f0fdf4');
    grad.addColorStop(0.3, '#4ade80');
    grad.addColorStop(0.7, '#15803d');
    grad.addColorStop(1, '#052e16');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(24, 24, 16, 0, Math.PI * 2);
    ctx.fill();
    // Magical sparkle dots
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(18, 18, 3, 3);
    ctx.fillRect(28, 22, 2, 2);
    ctx.fillRect(22, 28, 3, 3);
    addTex('dungeon_portal_active', canvas);
  }

  // --- CLASS SPECIFIC WEAPONS ---
  {
    // Toxic Scythe (Чумная коса для Зазы, 24x24)
    const { canvas, ctx } = makeCanvas(24, 24);
    ctx.fillStyle = '#14532d';
    // Shaft
    ctx.fillRect(4, 20, 16, 2);
    // Curved glowing venom blade
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(18, 4, 4, 16);
    ctx.fillRect(10, 2, 10, 4);
    ctx.fillRect(4, 4, 8, 3);
    ctx.fillStyle = '#86efac';
    ctx.fillRect(6, 4, 6, 1);
    addTex('weapon_scythe', canvas);
  }

  {
    // Venom Claws (Когти мутанта, 24x24)
    const { canvas, ctx } = makeCanvas(24, 24);
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(6, 12, 12, 8);
    // 3 Sharp Claws
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(6, 4, 3, 8);
    ctx.fillRect(11, 2, 3, 10);
    ctx.fillRect(16, 4, 3, 8);
    addTex('weapon_claws', canvas);
  }

  {
    // Dual Pistols (Двойные пистоли для Грима, 24x24)
    const { canvas, ctx } = makeCanvas(24, 24);
    // Gun 1
    ctx.fillStyle = '#334155';
    ctx.fillRect(2, 4, 10, 4);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(2, 8, 4, 5);
    // Gun 2
    ctx.fillStyle = '#334155';
    ctx.fillRect(12, 10, 10, 4);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(12, 14, 4, 5);
    addTex('weapon_pistols', canvas);
  }

  {
    // Chemical Flask Launcher (Колбомет для Грима, 24x24)
    const { canvas, ctx } = makeCanvas(24, 24);
    // Heavy brass barrel
    ctx.fillStyle = '#d97706';
    ctx.fillRect(6, 8, 14, 7);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(2, 12, 6, 8);
    // Loaded glowing glass canister
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(14, 6, 6, 11);
    ctx.fillStyle = '#f3e8ff';
    ctx.fillRect(16, 8, 2, 4);
    addTex('weapon_flask_launcher', canvas);
  }

  {
    // Viking Battleaxe (Секира викинга для Бьорна, 24x24)
    const { canvas, ctx } = makeCanvas(24, 24);
    // Shaft
    ctx.fillStyle = '#78350f';
    ctx.fillRect(11, 2, 3, 20);
    // Double crescent steel blade
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(4, 4, 7, 10);
    ctx.fillRect(14, 4, 7, 10);
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(2, 5, 3, 8);
    ctx.fillRect(20, 5, 3, 8);
    addTex('weapon_battleaxe', canvas);
  }

  {
    // Thunder Hammer (Молот Тора для Бьорна, 24x24)
    const { canvas, ctx } = makeCanvas(24, 24);
    // Shaft
    ctx.fillStyle = '#78350f';
    ctx.fillRect(11, 10, 3, 12);
    // Massive Stone/Steel Mallet Head
    ctx.fillStyle = '#475569';
    ctx.fillRect(4, 2, 16, 10);
    ctx.fillStyle = '#38bdf8'; // Electric Runes
    ctx.fillRect(7, 5, 10, 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(10, 6, 4, 2);
    addTex('weapon_thunder_hammer', canvas);
  }

  {
    // Torf Hand-held Boulder Weapon (28x28, Transparent Background, Natural jagged Peat Titan Rock)
    const { canvas, ctx } = makeCanvas(28, 28);
    // Dark stone contour outline
    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.moveTo(9, 4);
    ctx.lineTo(20, 2);
    ctx.lineTo(26, 8);
    ctx.lineTo(26, 19);
    ctx.lineTo(19, 26);
    ctx.lineTo(7, 24);
    ctx.lineTo(2, 16);
    ctx.lineTo(3, 8);
    ctx.closePath();
    ctx.fill();

    // Earthy Granite & Peat Rock Fill
    ctx.fillStyle = '#57534e';
    ctx.beginPath();
    ctx.moveTo(10, 5);
    ctx.lineTo(19, 4);
    ctx.lineTo(24, 9);
    ctx.lineTo(24, 18);
    ctx.lineTo(18, 24);
    ctx.lineTo(8, 22);
    ctx.lineTo(4, 15);
    ctx.lineTo(5, 9);
    ctx.closePath();
    ctx.fill();

    // Darker peat stone facets
    ctx.fillStyle = '#292524';
    ctx.fillRect(8, 13, 11, 8);
    ctx.fillRect(15, 7, 8, 9);

    // Light rock highlight
    ctx.fillStyle = '#78716c';
    ctx.fillRect(10, 6, 7, 5);

    // Glowing ancient blue rune crack
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(11, 9, 3, 5);
    ctx.fillRect(13, 13, 4, 2);

    // Moss speckles
    ctx.fillStyle = '#15803d';
    ctx.fillRect(6, 9, 4, 3);
    ctx.fillRect(15, 18, 4, 3);

    addTex('weapon_boulder', canvas);
  }

  {
    // Potions & Relics for Shop
    // Potion HP (20x20)
    const { canvas: c1, ctx: ctx1 } = makeCanvas(20, 20);
    ctx1.fillStyle = '#78350f';
    ctx1.fillRect(8, 2, 4, 3); // Cork
    ctx1.fillStyle = '#ef4444';
    ctx1.fillRect(4, 6, 12, 12);
    ctx1.fillStyle = '#ffffff';
    ctx1.fillRect(6, 8, 3, 3);
    addTex('potion_hp', c1);

    // Potion Energy (20x20)
    const { canvas: c2, ctx: ctx2 } = makeCanvas(20, 20);
    ctx2.fillStyle = '#78350f';
    ctx2.fillRect(8, 2, 4, 3);
    ctx2.fillStyle = '#38bdf8';
    ctx2.fillRect(4, 6, 12, 12);
    ctx2.fillStyle = '#ffffff';
    ctx2.fillRect(6, 8, 3, 3);
    addTex('potion_energy', c2);

    // Relic Damage (20x20)
    const { canvas: c3, ctx: ctx3 } = makeCanvas(20, 20);
    ctx3.fillStyle = '#f59e0b';
    ctx3.fillRect(3, 3, 14, 14);
    ctx3.fillStyle = '#dc2626';
    ctx3.fillRect(6, 6, 8, 8);
    ctx3.fillStyle = '#fef08a';
    ctx3.fillRect(8, 8, 4, 4);
    addTex('relic_damage', c3);
  }

  // --- DUNGEON DECORATIONS & PROJECTILES ---
  {
    // 1. Wooden Barrel (24x28)
    const { canvas, ctx } = makeCanvas(24, 28);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(4, 2, 16, 24);
    ctx.fillStyle = '#92400e';
    ctx.fillRect(2, 6, 20, 16);
    // Steel Hoops
    ctx.fillStyle = '#64748b';
    ctx.fillRect(2, 6, 20, 3);
    ctx.fillRect(2, 19, 20, 3);
    // Wood Planks & shading
    ctx.fillStyle = '#451a03';
    ctx.fillRect(8, 2, 2, 24);
    ctx.fillRect(14, 2, 2, 24);
    ctx.fillStyle = '#fde68a';
    ctx.fillRect(5, 8, 2, 10);
    addTex('prop_barrel', canvas);
  }

  {
    // 2. Supply Crate (26x26)
    const { canvas, ctx } = makeCanvas(26, 26);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(2, 2, 22, 22);
    ctx.fillStyle = '#b45309';
    ctx.fillRect(4, 4, 18, 18);
    // X-brace
    ctx.fillStyle = '#451a03';
    ctx.fillRect(2, 2, 22, 3);
    ctx.fillRect(2, 21, 22, 3);
    ctx.fillRect(2, 2, 3, 22);
    ctx.fillRect(21, 2, 3, 22);
    ctx.beginPath();
    ctx.moveTo(4, 4); ctx.lineTo(22, 22);
    ctx.moveTo(22, 4); ctx.lineTo(4, 22);
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Iron corners
    ctx.fillStyle = '#64748b';
    ctx.fillRect(2, 2, 5, 5);
    ctx.fillRect(19, 2, 5, 5);
    ctx.fillRect(2, 19, 5, 5);
    ctx.fillRect(19, 19, 5, 5);
    addTex('prop_crate', canvas);
  }

  {
    // 3. Wall Torch (18x24)
    const { canvas, ctx } = makeCanvas(18, 24);
    // Iron sconce & bracket
    ctx.fillStyle = '#334155';
    ctx.fillRect(7, 10, 4, 12);
    ctx.fillRect(5, 14, 8, 3);
    // Wooden handle
    ctx.fillStyle = '#78350f';
    ctx.fillRect(7, 6, 4, 8);
    // Fiery Flame
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(5, 2, 8, 8);
    ctx.fillStyle = '#f97316';
    ctx.fillRect(6, 1, 6, 7);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(7, 3, 4, 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(8, 4, 2, 2);
    addTex('prop_torch', canvas);
  }

  {
    // 4. Treasure Chest (28x22)
    const { canvas, ctx } = makeCanvas(28, 22);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(2, 6, 24, 14);
    // Gold Trim & Bands
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(2, 4, 24, 4);
    ctx.fillRect(2, 18, 24, 3);
    ctx.fillRect(4, 4, 3, 16);
    ctx.fillRect(21, 4, 3, 16);
    // Keyhole lock
    ctx.fillStyle = '#facc15';
    ctx.fillRect(12, 10, 4, 5);
    ctx.fillStyle = '#000000';
    ctx.fillRect(13, 12, 2, 2);
    addTex('prop_chest', canvas);
  }

  {
    // 5. Bullet Projectile (12x6)
    const { canvas, ctx } = makeCanvas(12, 6);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(0, 1, 8, 4);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(8, 2, 3, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(2, 2, 4, 2);
    addTex('proj_bullet', canvas);
  }

  {
    // 6. Acid Flask Projectile (14x14)
    const { canvas, ctx } = makeCanvas(14, 14);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(5, 1, 4, 2); // Cork
    ctx.fillStyle = '#a7f3d0';
    ctx.fillRect(4, 3, 6, 2); // Neck
    ctx.fillStyle = '#10b981';
    ctx.fillRect(2, 5, 10, 8); // Body
    ctx.fillStyle = '#34d399';
    ctx.fillRect(4, 7, 4, 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(3, 6, 2, 2);
    addTex('proj_flask', canvas);
  }

  {
    // 7. Toxic Spit Projectile (16x16)
    const { canvas, ctx } = makeCanvas(16, 16);
    ctx.fillStyle = '#15803d';
    ctx.beginPath(); ctx.arc(8, 8, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#22c55e';
    ctx.beginPath(); ctx.arc(7, 7, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#86efac';
    ctx.beginPath(); ctx.arc(6, 6, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(5, 5, 2, 2);
    addTex('proj_toxic_spit', canvas);
  }

  {
    // 8. Tar Bomb Projectile (16x16)
    const { canvas, ctx } = makeCanvas(16, 16);
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath(); ctx.arc(8, 8, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#312e81';
    ctx.beginPath(); ctx.arc(7, 7, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#818cf8';
    ctx.fillRect(5, 5, 2, 2);
    // fuse/spark
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(7, 0, 3, 3);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(8, 1, 2, 2);
    addTex('proj_tar_bomb', canvas);
  }

  {
    // 9. Cauldron Prop/Object (26x24)
    const { canvas, ctx } = makeCanvas(26, 24);
    ctx.fillStyle = '#18181b';
    ctx.beginPath(); ctx.arc(13, 14, 10, 0, Math.PI * 2); ctx.fill();
    // Cauldron rim
    ctx.fillStyle = '#27272a';
    ctx.fillRect(3, 6, 20, 4);
    // Bubbling purple potion
    ctx.fillStyle = '#9333ea';
    ctx.fillRect(5, 7, 16, 3);
    ctx.fillStyle = '#c084fc';
    ctx.fillRect(7, 6, 4, 3);
    ctx.fillRect(15, 6, 3, 2);
    // Cauldron legs
    ctx.fillStyle = '#18181b';
    ctx.fillRect(4, 20, 4, 4);
    ctx.fillRect(18, 20, 4, 4);
    addTex('proj_cauldron', canvas);
  }

  {
    // 10. Lightning Bolt Projectile (20x10)
    const { canvas, ctx } = makeCanvas(20, 10);
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(0, 5); ctx.lineTo(7, 1); ctx.lineTo(6, 4);
    ctx.lineTo(14, 2); ctx.lineTo(12, 6); ctx.lineTo(20, 5);
    ctx.lineTo(13, 8); ctx.lineTo(14, 6); ctx.lineTo(7, 9);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(6, 4, 7, 2);
    addTex('proj_lightning_bolt', canvas);
  }

  {
    // 11. Rock Spike Prop/Attack (24x28)
    const { canvas, ctx } = makeCanvas(24, 28);
    ctx.fillStyle = '#44403c';
    ctx.beginPath();
    ctx.moveTo(12, 2); ctx.lineTo(22, 26); ctx.lineTo(2, 26); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#78716c';
    ctx.beginPath();
    ctx.moveTo(12, 4); ctx.lineTo(20, 24); ctx.lineTo(12, 24); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#a8a29e';
    ctx.fillRect(11, 8, 2, 8);
    addTex('proj_rock_spike', canvas);
  }

  {
    // 12. Skull Pile Prop (22x18)
    const { canvas, ctx } = makeCanvas(22, 18);
    ctx.fillStyle = '#18181b';
    ctx.beginPath(); ctx.arc(11, 9, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath(); ctx.arc(11, 8, 6.5, 0, Math.PI * 2); ctx.fill();
    // Eye sockets & nose
    ctx.fillStyle = '#18181b';
    ctx.fillRect(8, 7, 2, 3);
    ctx.fillRect(12, 7, 2, 3);
    ctx.fillRect(10, 11, 2, 2);
    // Teeth
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(8, 13, 6, 2);
    addTex('prop_skull_pile', canvas);
  }

  {
    // 13. Cobweb Prop (24x24)
    const { canvas, ctx } = makeCanvas(24, 24);
    ctx.strokeStyle = 'rgba(241, 245, 249, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(24, 24);
    ctx.moveTo(0, 0); ctx.lineTo(24, 8);
    ctx.moveTo(0, 0); ctx.lineTo(8, 24);
    ctx.arc(0, 0, 10, 0, Math.PI / 2);
    ctx.arc(0, 0, 18, 0, Math.PI / 2);
    ctx.stroke();
    addTex('prop_cobweb', canvas);
  }

  {
    // 14. Ancient Glowing Rune Stone (22x28)
    const { canvas, ctx } = makeCanvas(22, 28);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(2, 4, 18, 22);
    ctx.fillStyle = '#334155';
    ctx.fillRect(4, 6, 14, 18);
    // Glowing cyan rune symbol
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(11, 9); ctx.lineTo(11, 21);
    ctx.moveTo(7, 13); ctx.lineTo(15, 17);
    ctx.moveTo(15, 13); ctx.lineTo(7, 17);
    ctx.stroke();
    addTex('prop_rune_stone', canvas);
  }

  {
    // 15. Broken Pillar Prop (24x32)
    const { canvas, ctx } = makeCanvas(24, 32);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(2, 22, 20, 8);
    ctx.fillStyle = '#475569';
    ctx.fillRect(4, 8, 16, 16);
    // Broken jagged top
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(4, 8); ctx.lineTo(8, 2); ctx.lineTo(13, 8); ctx.lineTo(18, 4); ctx.lineTo(20, 8); ctx.closePath();
    ctx.fill();
    addTex('prop_pillar_broken', canvas);
  }

  {
    // 16. Explosive Red Barrel Prop (20x24)
    const { canvas, ctx } = makeCanvas(20, 24);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(2, 2, 16, 20);
    // Dark hoops
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(2, 5, 16, 3);
    ctx.fillRect(2, 16, 16, 3);
    // Yellow Danger mark
    ctx.fillStyle = '#facc15';
    ctx.fillRect(8, 9, 4, 6);
    ctx.fillStyle = '#000000';
    ctx.fillRect(9, 10, 2, 3);
    ctx.fillRect(9, 14, 2, 1);
    addTex('prop_explosive_barrel', canvas);
  }

  {
    // 17. Goblin Bomber Mob (24x26)
    const { canvas, ctx } = makeCanvas(24, 26);
    // Green skin body & big ears
    ctx.fillStyle = '#15803d';
    ctx.fillRect(4, 8, 16, 12);
    ctx.fillRect(1, 6, 6, 6); // Left ear
    ctx.fillRect(17, 6, 6, 6); // Right ear
    // Leather harness / rags
    ctx.fillStyle = '#78350f';
    ctx.fillRect(5, 14, 14, 8);
    // Evil yellow eyes
    ctx.fillStyle = '#facc15';
    ctx.fillRect(7, 9, 3, 3);
    ctx.fillRect(14, 9, 3, 3);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(8, 10, 1, 1);
    ctx.fillRect(15, 10, 1, 1);
    // Holding round fuse bomb
    ctx.fillStyle = '#18181b';
    ctx.beginPath(); ctx.arc(18, 18, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(18, 12, 2, 2); // Spark
    addTex('mob_goblin_bomber', canvas);
  }

  {
    // 18. Venom Spider Mob (26x20)
    const { canvas, ctx } = makeCanvas(26, 20);
    // Spider legs
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(2, 4, 3, 12); ctx.fillRect(21, 4, 3, 12);
    ctx.fillRect(0, 8, 4, 8); ctx.fillRect(22, 8, 4, 8);
    // Spider body
    ctx.fillStyle = '#0f172a';
    ctx.beginPath(); ctx.arc(13, 10, 8, 0, Math.PI * 2); ctx.fill();
    // Toxic green glowing pattern
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(11, 7, 4, 6);
    // Red glowing multi-eyes
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(9, 5, 2, 2); ctx.fillRect(15, 5, 2, 2);
    ctx.fillRect(11, 4, 2, 2); ctx.fillRect(13, 4, 2, 2);
    addTex('mob_spider', canvas);
  }

  {
    // 19. Dark Necromancer Mob (24x28)
    const { canvas, ctx } = makeCanvas(24, 28);
    // Dark purple hooded robe
    ctx.fillStyle = '#3b0764';
    ctx.fillRect(5, 4, 14, 22);
    ctx.fillRect(4, 12, 16, 14);
    // Hood Shadow
    ctx.fillStyle = '#18022e';
    ctx.fillRect(7, 6, 10, 8);
    // Glowing cyan skull eyes inside hood
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(8, 9, 2, 2); ctx.fillRect(14, 9, 2, 2);
    // Bone Staff with Skull topper
    ctx.fillStyle = '#78716c';
    ctx.fillRect(18, 2, 3, 24);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(17, 0, 5, 5);
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(18, 1, 3, 3); // Glow
    addTex('mob_necromancer', canvas);
  }

  {
    // 20. New Weapons (Zaza, Grim, Bjorn)
    // 20a. weapon_toxic_staff (24x24)
    const { canvas: c1, ctx: ctx1 } = makeCanvas(24, 24);
    ctx1.fillStyle = '#713f12'; ctx1.fillRect(4, 4, 4, 18);
    ctx1.fillStyle = '#22c55e'; ctx1.beginPath(); ctx1.arc(6, 4, 5, 0, Math.PI * 2); ctx1.fill();
    ctx1.fillStyle = '#a7f3d0'; ctx1.fillRect(5, 3, 3, 3);
    addTex('weapon_toxic_staff', c1);

    // 20b. weapon_mutant_blade (24x24)
    const { canvas: c2, ctx: ctx2 } = makeCanvas(24, 24);
    ctx2.fillStyle = '#4c1d95'; ctx2.fillRect(4, 18, 4, 4);
    ctx2.fillStyle = '#10b981'; ctx2.beginPath();
    ctx2.moveTo(8, 18); ctx2.lineTo(20, 2); ctx2.lineTo(22, 5); ctx2.lineTo(11, 21); ctx2.closePath(); ctx2.fill();
    addTex('weapon_mutant_blade', c2);

    // 20c. weapon_repeater_crossbow (24x24)
    const { canvas: c3, ctx: ctx3 } = makeCanvas(24, 24);
    ctx3.fillStyle = '#78350f'; ctx3.fillRect(4, 10, 16, 4);
    ctx3.fillStyle = '#475569'; ctx3.fillRect(8, 4, 4, 16);
    ctx3.fillStyle = '#38bdf8'; ctx3.fillRect(18, 9, 4, 6);
    addTex('weapon_repeater_crossbow', c3);

    // 20d. weapon_grenade_launcher (24x24)
    const { canvas: c4, ctx: ctx4 } = makeCanvas(24, 24);
    ctx4.fillStyle = '#1e293b'; ctx4.fillRect(3, 8, 18, 8);
    ctx4.fillStyle = '#f59e0b'; ctx4.fillRect(18, 7, 4, 10);
    ctx4.fillStyle = '#475569'; ctx4.fillRect(6, 16, 5, 6);
    addTex('weapon_grenade_launcher', c4);

    // 20e. weapon_frost_hammer (24x24)
    const { canvas: c5, ctx: ctx5 } = makeCanvas(24, 24);
    ctx5.fillStyle = '#78716c'; ctx5.fillRect(4, 4, 4, 18);
    ctx5.fillStyle = '#0284c7'; ctx5.fillRect(2, 2, 14, 8);
    ctx5.fillStyle = '#e0f2fe'; ctx5.fillRect(4, 4, 10, 4);
    addTex('weapon_frost_hammer', c5);

    // 20f. weapon_dual_daggers (24x24)
    const { canvas: c6, ctx: ctx6 } = makeCanvas(24, 24);
    ctx6.fillStyle = '#ef4444';
    ctx6.fillRect(3, 4, 8, 16); ctx6.fillRect(13, 4, 8, 16);
    ctx6.fillStyle = '#ffffff'; ctx6.fillRect(5, 2, 4, 14); ctx6.fillRect(15, 2, 4, 14);
    addTex('weapon_dual_daggers', c6);
  }

  {
    // 21. Additional Special Projectiles
    // 21a. proj_goblin_bomb (14x14)
    const { canvas: p1, ctx: cp1 } = makeCanvas(14, 14);
    cp1.fillStyle = '#18181b'; cp1.beginPath(); cp1.arc(7, 7, 6, 0, Math.PI * 2); cp1.fill();
    cp1.fillStyle = '#f59e0b'; cp1.fillRect(6, 0, 2, 3);
    cp1.fillStyle = '#ef4444'; cp1.fillRect(7, 0, 2, 2);
    addTex('proj_goblin_bomb', p1);

    // 21b. proj_web_shot (16x16)
    const { canvas: p2, ctx: cp2 } = makeCanvas(16, 16);
    cp2.strokeStyle = '#22c55e'; cp2.lineWidth = 1.5;
    cp2.beginPath();
    cp2.moveTo(2, 8); cp2.lineTo(14, 8); cp2.moveTo(8, 2); cp2.lineTo(8, 14);
    cp2.stroke();
    addTex('proj_web_shot', p2);

    // 21c. proj_skull_homing (16x16)
    const { canvas: p3, ctx: cp3 } = makeCanvas(16, 16);
    cp3.fillStyle = '#e2e8f0'; cp3.beginPath(); cp3.arc(8, 8, 6, 0, Math.PI * 2); cp3.fill();
    cp3.fillStyle = '#a855f7'; cp3.fillRect(6, 6, 2, 2); cp3.fillRect(10, 6, 2, 2);
    addTex('proj_skull_homing', p3);

    // 21d. proj_sonic_wave (20x20)
    const { canvas: p4, ctx: cp4 } = makeCanvas(20, 20);
    cp4.strokeStyle = '#38bdf8'; cp4.lineWidth = 2.5;
    cp4.beginPath(); cp4.arc(10, 10, 8, -Math.PI / 3, Math.PI / 3); cp4.stroke();
    addTex('proj_sonic_wave', p4);

    // 21e. proj_fire_slash (22x22)
    const { canvas: p5, ctx: cp5 } = makeCanvas(22, 22);
    cp5.fillStyle = '#f97316';
    cp5.beginPath();
    cp5.moveTo(2, 11); cp5.quadraticCurveTo(11, 2, 20, 11); cp5.quadraticCurveTo(11, 16, 2, 11);
    cp5.fill();
    cp5.fillStyle = '#fde047';
    cp5.beginPath();
    cp5.moveTo(5, 11); cp5.quadraticCurveTo(11, 6, 17, 11); cp5.quadraticCurveTo(11, 13, 5, 11);
    cp5.fill();
    addTex('proj_fire_slash', p5);

    // 21f. proj_ice_shard (16x16)
    const { canvas: p6, ctx: cp6 } = makeCanvas(16, 16);
    cp6.fillStyle = '#67e8f9';
    cp6.beginPath();
    cp6.moveTo(8, 1); cp6.lineTo(13, 8); cp6.lineTo(8, 15); cp6.lineTo(3, 8);
    cp6.closePath(); cp6.fill();
    cp6.fillStyle = '#ffffff'; cp6.fillRect(7, 4, 2, 8);
    addTex('proj_ice_shard', p6);
  }

  {
    // 22. 3 NEW UNIQUE MOBS
    // 22a. mob_gargoyle (Stone Gargoyle, 32x32)
    const { canvas: gC, ctx: gCtx } = makeCanvas(32, 32);
    // Stone wings
    gCtx.fillStyle = '#475569';
    gCtx.beginPath();
    gCtx.moveTo(4, 6); gCtx.lineTo(12, 16); gCtx.lineTo(2, 22); gCtx.closePath(); gCtx.fill();
    gCtx.beginPath();
    gCtx.moveTo(28, 6); gCtx.lineTo(20, 16); gCtx.lineTo(30, 22); gCtx.closePath(); gCtx.fill();
    // Gargoyle stone body
    gCtx.fillStyle = '#64748b'; gCtx.fillRect(10, 10, 12, 16);
    // Horns
    gCtx.fillStyle = '#334155';
    gCtx.fillRect(9, 4, 3, 6); gCtx.fillRect(20, 4, 3, 6);
    // Glowing Red Eyes
    gCtx.fillStyle = '#ef4444'; gCtx.fillRect(12, 12, 3, 3); gCtx.fillRect(17, 12, 3, 3);
    // Claws
    gCtx.fillStyle = '#1e293b'; gCtx.fillRect(10, 26, 4, 4); gCtx.fillRect(18, 26, 4, 4);
    addTex('mob_gargoyle', gC);

    // 22b. mob_necromancer (Dark Cult Necromancer, 32x32)
    const { canvas: nC, ctx: nCtx } = makeCanvas(32, 32);
    // Dark purple robe
    nCtx.fillStyle = '#3b0764'; nCtx.fillRect(8, 12, 16, 18);
    // Hood & Skull Face
    nCtx.fillStyle = '#581c87'; nCtx.fillRect(10, 4, 12, 10);
    nCtx.fillStyle = '#f8fafc'; nCtx.fillRect(12, 8, 8, 6);
    // Glowing Green / Cyan Eyes
    nCtx.fillStyle = '#10b981'; nCtx.fillRect(13, 9, 2, 2); nCtx.fillRect(17, 9, 2, 2);
    // Staff with skull
    nCtx.fillStyle = '#713f12'; nCtx.fillRect(24, 6, 2, 22);
    nCtx.fillStyle = '#a855f7'; nCtx.beginPath(); nCtx.arc(25, 6, 4, 0, Math.PI * 2); nCtx.fill();
    addTex('mob_necromancer', nC);

    // 22c. mob_golem (Ancient Rune Stone Golem, 36x36)
    const { canvas: gmC, ctx: gmCtx } = makeCanvas(36, 36);
    // Heavy boulder body
    gmCtx.fillStyle = '#334155'; gmCtx.fillRect(6, 8, 24, 22);
    gmCtx.fillStyle = '#475569'; gmCtx.fillRect(8, 10, 20, 18);
    // Glowing Blue/Gold Runes
    gmCtx.fillStyle = '#38bdf8';
    gmCtx.fillRect(12, 14, 12, 3);
    gmCtx.fillRect(17, 12, 2, 8);
    // Heavy Fists
    gmCtx.fillStyle = '#1e293b';
    gmCtx.fillRect(2, 14, 6, 12); gmCtx.fillRect(28, 14, 6, 12);
    // Golem glowing eye slit
    gmCtx.fillStyle = '#facc15'; gmCtx.fillRect(14, 10, 8, 3);
    addTex('mob_golem', gmC);
  }

  {
    // 23. Skill Cards Icons
    const cards = [
      { id: 'skill_card_zaza_1', col: '#15803d', iconCol: '#86efac' },
      { id: 'skill_card_zaza_2', col: '#166534', iconCol: '#4ade80' },
      { id: 'skill_card_grim_1', col: '#0284c7', iconCol: '#7dd3fc' },
      { id: 'skill_card_grim_2', col: '#475569', iconCol: '#cbd5e1' },
      { id: 'skill_card_bjorn_1', col: '#b91c1c', iconCol: '#fca5a5' },
      { id: 'skill_card_bjorn_2', col: '#c2410c', iconCol: '#fdba74' },
    ];
    cards.forEach(c => {
      const { canvas, ctx } = makeCanvas(32, 32);
      ctx.fillStyle = c.col; ctx.fillRect(2, 2, 28, 28);
      ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2; ctx.strokeRect(2, 2, 28, 28);
      ctx.fillStyle = c.iconCol; ctx.beginPath(); ctx.arc(16, 16, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(14, 10, 4, 12); ctx.fillRect(10, 14, 12, 4);
      addTex(c.id, canvas);
    });
  }

  // 24. SQUARE AVATAR PORTRAITS (8 Unique Hero Avatars 64x64)
  {
    // 1. Гром (Grom - Shadow Assassin)
    {
      const { canvas, ctx } = makeCanvas(64, 64);
      ctx.fillStyle = '#090d16'; ctx.fillRect(0, 0, 64, 64);
      ctx.lineWidth = 3; ctx.strokeStyle = '#facc15'; ctx.strokeRect(2, 2, 60, 60);
      ctx.fillStyle = '#1e293b'; ctx.fillRect(16, 12, 32, 40);
      ctx.fillStyle = '#0f172a'; ctx.fillRect(20, 24, 24, 20);
      ctx.fillStyle = '#ef4444'; ctx.fillRect(24, 28, 6, 5); ctx.fillRect(34, 28, 6, 5);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(26, 29, 2, 2); ctx.fillRect(36, 29, 2, 2);
      ctx.fillStyle = '#facc15'; ctx.fillRect(44, 44, 14, 14);
      ctx.fillStyle = '#000000'; ctx.font = '10px monospace'; ctx.fillText('1', 48, 55);
      addTex('avatar_sq_1', canvas);
    }

    // 2. Заза (Zaza - Green Goblin Alchemist)
    {
      const { canvas, ctx } = makeCanvas(64, 64);
      ctx.fillStyle = '#051f12'; ctx.fillRect(0, 0, 64, 64);
      ctx.lineWidth = 3; ctx.strokeStyle = '#22c55e'; ctx.strokeRect(2, 2, 60, 60);
      // Big Pointed Goblin Ears
      ctx.fillStyle = '#15803d';
      ctx.beginPath(); ctx.moveTo(14, 24); ctx.lineTo(2, 14); ctx.lineTo(16, 36); ctx.fill();
      ctx.beginPath(); ctx.moveTo(50, 24); ctx.lineTo(62, 14); ctx.lineTo(48, 36); ctx.fill();
      // Goblin Head
      ctx.fillStyle = '#16a34a'; ctx.fillRect(16, 12, 32, 38);
      // Toxic Green Eyes
      ctx.fillStyle = '#facc15'; ctx.fillRect(22, 22, 7, 6); ctx.fillRect(35, 22, 7, 6);
      ctx.fillStyle = '#000000'; ctx.fillRect(25, 24, 3, 3); ctx.fillRect(38, 24, 3, 3);
      // Sharp Fangs & Grin
      ctx.fillStyle = '#052e16'; ctx.fillRect(22, 36, 20, 8);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(24, 36, 3, 5); ctx.fillRect(37, 36, 3, 5);
      ctx.fillStyle = '#22c55e'; ctx.fillRect(44, 44, 14, 14);
      ctx.fillStyle = '#000000'; ctx.font = '10px monospace'; ctx.fillText('2', 48, 55);
      addTex('avatar_sq_2', canvas);
    }

    // 3. Бьёрн (Bjorn - Viking Berserker with Horned Helm & Beard)
    {
      const { canvas, ctx } = makeCanvas(64, 64);
      ctx.fillStyle = '#1c0a0a'; ctx.fillRect(0, 0, 64, 64);
      ctx.lineWidth = 3; ctx.strokeStyle = '#f97316'; ctx.strokeRect(2, 2, 60, 60);
      // Giant Horns
      ctx.fillStyle = '#fef08a';
      ctx.beginPath(); ctx.moveTo(14, 18); ctx.lineTo(4, 4); ctx.lineTo(20, 14); ctx.fill();
      ctx.beginPath(); ctx.moveTo(50, 18); ctx.lineTo(60, 4); ctx.lineTo(44, 14); ctx.fill();
      // Iron Helm
      ctx.fillStyle = '#475569'; ctx.fillRect(16, 12, 32, 20);
      ctx.fillStyle = '#94a3b8'; ctx.fillRect(16, 20, 32, 4);
      // Glowing Eyes Slit
      ctx.fillStyle = '#fde047'; ctx.fillRect(22, 24, 6, 4); ctx.fillRect(36, 24, 6, 4);
      // Braided Orange Beard
      ctx.fillStyle = '#ea580c'; ctx.fillRect(14, 30, 36, 26);
      ctx.fillStyle = '#c2410c'; ctx.fillRect(20, 42, 8, 12); ctx.fillRect(36, 42, 8, 12);
      ctx.fillStyle = '#f97316'; ctx.fillRect(44, 44, 14, 14);
      ctx.fillStyle = '#000000'; ctx.font = '10px monospace'; ctx.fillText('3', 48, 55);
      addTex('avatar_sq_3', canvas);
    }

    // 4. Рыцарь (Knight - Steel Paladin)
    {
      const { canvas, ctx } = makeCanvas(64, 64);
      ctx.fillStyle = '#081726'; ctx.fillRect(0, 0, 64, 64);
      ctx.lineWidth = 3; ctx.strokeStyle = '#38bdf8'; ctx.strokeRect(2, 2, 60, 60);
      // Blue Plume
      ctx.fillStyle = '#2563eb'; ctx.fillRect(28, 4, 8, 12);
      // Steel Helmet
      ctx.fillStyle = '#64748b'; ctx.fillRect(16, 14, 32, 38);
      ctx.fillStyle = '#94a3b8'; ctx.fillRect(18, 16, 28, 18);
      // Gold Visor T-slit
      ctx.fillStyle = '#facc15'; ctx.fillRect(20, 26, 24, 4); ctx.fillRect(30, 24, 4, 12);
      ctx.fillStyle = '#38bdf8'; ctx.fillRect(44, 44, 14, 14);
      ctx.fillStyle = '#000000'; ctx.font = '10px monospace'; ctx.fillText('4', 48, 55);
      addTex('avatar_sq_4', canvas);
    }

    // 5. Маг (Mage - Arcane Sorcerer)
    {
      const { canvas, ctx } = makeCanvas(64, 64);
      ctx.fillStyle = '#1c051d'; ctx.fillRect(0, 0, 64, 64);
      ctx.lineWidth = 3; ctx.strokeStyle = '#c084fc'; ctx.strokeRect(2, 2, 60, 60);
      // Pointed Wizard Hat
      ctx.fillStyle = '#6b21a8';
      ctx.beginPath(); ctx.moveTo(32, 2); ctx.lineTo(12, 24); ctx.lineTo(52, 24); ctx.fill();
      ctx.fillStyle = '#facc15'; ctx.fillRect(10, 22, 44, 4);
      // Dark Face Mask
      ctx.fillStyle = '#3b0764'; ctx.fillRect(18, 26, 28, 24);
      // Glowing Magenta Eyes
      ctx.fillStyle = '#f43f5e'; ctx.fillRect(22, 32, 6, 5); ctx.fillRect(36, 32, 6, 5);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(24, 33, 2, 2); ctx.fillRect(38, 33, 2, 2);
      ctx.fillStyle = '#c084fc'; ctx.fillRect(44, 44, 14, 14);
      ctx.fillStyle = '#000000'; ctx.font = '10px monospace'; ctx.fillText('5', 48, 55);
      addTex('avatar_sq_5', canvas);
    }

    // 6. Следопыт (Ranger - Elf Tracker)
    {
      const { canvas, ctx } = makeCanvas(64, 64);
      ctx.fillStyle = '#0e1e12'; ctx.fillRect(0, 0, 64, 64);
      ctx.lineWidth = 3; ctx.strokeStyle = '#a3e635'; ctx.strokeRect(2, 2, 60, 60);
      // Green Forest Hood
      ctx.fillStyle = '#15803d'; ctx.fillRect(14, 10, 36, 42);
      ctx.fillStyle = '#166534'; ctx.fillRect(18, 20, 28, 26);
      // Elf Eyes
      ctx.fillStyle = '#bef264'; ctx.fillRect(22, 26, 6, 4); ctx.fillRect(36, 26, 6, 4);
      // Leaf Brooch
      ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(32, 44, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#a3e635'; ctx.fillRect(44, 44, 14, 14);
      ctx.fillStyle = '#000000'; ctx.font = '10px monospace'; ctx.fillText('6', 48, 55);
      addTex('avatar_sq_6', canvas);
    }

    // 7. Проклятый (Cursed Knight - Fiery Skeleton Lord)
    {
      const { canvas, ctx } = makeCanvas(64, 64);
      ctx.fillStyle = '#180e0e'; ctx.fillRect(0, 0, 64, 64);
      ctx.lineWidth = 3; ctx.strokeStyle = '#e11d48'; ctx.strokeRect(2, 2, 60, 60);
      // Demon Horns
      ctx.fillStyle = '#be123c';
      ctx.fillRect(12, 6, 6, 18); ctx.fillRect(46, 6, 6, 18);
      // Skull Face
      ctx.fillStyle = '#f1f5f9'; ctx.fillRect(18, 16, 28, 32);
      // Fiery Socket Eyes
      ctx.fillStyle = '#dc2626'; ctx.fillRect(22, 24, 7, 7); ctx.fillRect(35, 24, 7, 7);
      ctx.fillStyle = '#fef08a'; ctx.fillRect(24, 26, 3, 3); ctx.fillRect(37, 26, 3, 3);
      // Skull Teeth
      ctx.fillStyle = '#000000'; ctx.fillRect(22, 38, 20, 6);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(24, 38, 3, 6); ctx.fillRect(30, 38, 3, 6); ctx.fillRect(36, 38, 3, 6);
      ctx.fillStyle = '#e11d48'; ctx.fillRect(44, 44, 14, 14);
      ctx.fillStyle = '#000000'; ctx.font = '10px monospace'; ctx.fillText('7', 48, 55);
      addTex('avatar_sq_7', canvas);
    }
  }

  // 25. Track 3 Cover Art: ВЛАСТЕЛИН (Void Overlord - Cosmic Dark Synth) (160x160)
  {
    const { canvas, ctx } = makeCanvas(160, 160);
    // Dark Cosmic Void Gradient
    const voidBg = ctx.createLinearGradient(0, 0, 0, 160);
    voidBg.addColorStop(0, '#0a0017');
    voidBg.addColorStop(0.4, '#1e053a');
    voidBg.addColorStop(0.8, '#3b0764');
    voidBg.addColorStop(1, '#581c87');
    ctx.fillStyle = voidBg;
    ctx.fillRect(0, 0, 160, 160);

    // Cosmic void nebula stars
    ctx.fillStyle = '#f0abfc';
    const stars = [
      { x: 20, y: 25 }, { x: 45, y: 18 }, { x: 135, y: 22 }, { x: 110, y: 38 },
      { x: 30, y: 75 }, { x: 140, y: 80 }, { x: 80, y: 15 }
    ];
    stars.forEach(s => {
      ctx.fillRect(s.x, s.y, 2, 2);
    });

    // Dark Spire Citadel in background
    ctx.fillStyle = '#140026';
    ctx.beginPath();
    ctx.moveTo(15, 110); ctx.lineTo(35, 45); ctx.lineTo(55, 110); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(105, 110); ctx.lineTo(125, 40); ctx.lineTo(145, 110); ctx.fill();
    ctx.fillRect(40, 70, 80, 50);

    // Purple Void Overlord Robed Entity
    // Horned Void Crown
    ctx.fillStyle = '#e879f9';
    ctx.beginPath();
    ctx.moveTo(56, 45); ctx.lineTo(65, 25); ctx.lineTo(73, 40); ctx.lineTo(80, 20);
    ctx.lineTo(87, 40); ctx.lineTo(95, 25); ctx.lineTo(104, 45);
    ctx.closePath(); ctx.fill();

    // Dark Obsidian Hood & Mantle
    ctx.fillStyle = '#0f051d';
    ctx.beginPath();
    ctx.arc(80, 55, 24, Math.PI, Math.PI * 2);
    ctx.lineTo(110, 115);
    ctx.lineTo(50, 115);
    ctx.closePath();
    ctx.fill();

    // Swirling Void Flames on sides
    ctx.fillStyle = '#c084fc';
    ctx.fillRect(44, 65, 10, 35);
    ctx.fillRect(106, 65, 10, 35);
    ctx.fillStyle = '#f5d0fe';
    ctx.fillRect(47, 72, 4, 18);
    ctx.fillRect(109, 72, 4, 18);

    // Glowing Eyes / Visor Slit
    ctx.fillStyle = '#fae8ff';
    ctx.fillRect(68, 52, 9, 5);
    ctx.fillRect(83, 52, 9, 5);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(71, 53, 3, 3);
    ctx.fillRect(86, 53, 3, 3);

    // Bottom Music Badge: "♫ ТРЕК 3 • ACTION SYNTH"
    ctx.fillStyle = 'rgba(10, 2, 22, 0.9)';
    ctx.fillRect(10, 122, 140, 30);
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 122, 140, 30);

    // Music note
    ctx.fillStyle = '#f0abfc';
    ctx.fillRect(74, 130, 8, 3);
    ctx.fillRect(74, 133, 3, 10);
    ctx.fillRect(81, 133, 3, 8);
    ctx.fillRect(70, 140, 6, 4);
    ctx.fillRect(77, 138, 6, 4);

    // Audio Frequency Bars
    const voidBars = [4, 9, 14, 10, 5];
    voidBars.forEach((bh, i) => {
      ctx.fillStyle = '#c084fc';
      ctx.fillRect(32 + i * 6, 143 - bh, 3, bh);
      ctx.fillRect(100 + i * 6, 143 - bh, 3, bh);
    });

    // Frame border
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, 156, 156);
    ctx.fillStyle = '#e879f9';
    ctx.fillRect(2, 2, 8, 8);
    ctx.fillRect(150, 2, 8, 8);
    ctx.fillRect(2, 150, 8, 8);
    ctx.fillRect(150, 150, 8, 8);

    addTex('VoidOverlordPic', canvas);
  }

  // 26. Track 4 Cover Art: ТЁМНЫЙ ОБИТЕЛЬ (Shadow Realm - Dark Dungeon Fantasy) (160x160)
  {
    const { canvas, ctx } = makeCanvas(160, 160);
    // Dark Dungeon Night Sky & Fog
    const dungeonSky = ctx.createLinearGradient(0, 0, 0, 160);
    dungeonSky.addColorStop(0, '#030712');
    dungeonSky.addColorStop(0.4, '#0f172a');
    dungeonSky.addColorStop(0.7, '#1e293b');
    dungeonSky.addColorStop(1, '#090d16');
    ctx.fillStyle = dungeonSky;
    ctx.fillRect(0, 0, 160, 160);

    // Big Ancient Blood Moon / Eclipse
    ctx.fillStyle = '#facc15';
    ctx.beginPath(); ctx.arc(115, 38, 22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ca8a04';
    ctx.beginPath(); ctx.arc(120, 36, 16, 0, Math.PI * 2); ctx.fill();

    // Gothic Dungeon Battlements & Spire Towers
    ctx.fillStyle = '#020617';
    ctx.fillRect(10, 48, 30, 70);
    ctx.fillRect(18, 32, 14, 20); // Spire peak
    ctx.fillRect(125, 52, 25, 65);
    ctx.fillRect(130, 38, 14, 18);
    // Center Great Dungeon Gate
    ctx.fillRect(40, 65, 80, 55);
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(65, 80, 30, 40); // Crimson portal glow
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(72, 88, 16, 32);

    // Warm Torches on Columns
    ctx.fillStyle = '#f97316';
    ctx.fillRect(52, 75, 4, 8); ctx.fillRect(104, 75, 4, 8);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(53, 76, 2, 4); ctx.fillRect(105, 76, 2, 4);

    // Rocky Ground with Moss
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(0, 110, 160, 50);
    ctx.fillStyle = '#15803d';
    ctx.fillRect(15, 110, 50, 4);
    ctx.fillRect(95, 110, 55, 4);

    // Wandering Hooded Knight Silhouette in Foreground
    ctx.fillStyle = '#09090b';
    ctx.fillRect(38, 88, 14, 24); // Body
    ctx.fillRect(40, 80, 10, 10); // Hood
    ctx.fillStyle = '#facc15'; // Glowing eyes
    ctx.fillRect(43, 84, 2, 2); ctx.fillRect(47, 84, 2, 2);
    // Greatsword on back
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(48, 74, 3, 26);
    ctx.fillRect(45, 82, 9, 2);

    // Bottom Music Badge: "♫ ТРЕК 4 • DARK FANTASY"
    ctx.fillStyle = 'rgba(3, 7, 18, 0.9)';
    ctx.fillRect(10, 122, 140, 30);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 122, 140, 30);

    // Music note
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(74, 130, 8, 3);
    ctx.fillRect(74, 133, 3, 10);
    ctx.fillRect(81, 133, 3, 8);
    ctx.fillRect(70, 140, 6, 4);
    ctx.fillRect(77, 138, 6, 4);

    // Audio frequency bars
    const shadowBars = [6, 11, 16, 12, 7];
    shadowBars.forEach((bh, i) => {
      ctx.fillStyle = '#facc15';
      ctx.fillRect(32 + i * 6, 143 - bh, 3, bh);
      ctx.fillRect(100 + i * 6, 143 - bh, 3, bh);
    });

    // Gold frame border
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, 156, 156);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(2, 2, 8, 8);
    ctx.fillRect(150, 2, 8, 8);
    ctx.fillRect(2, 150, 8, 8);
    ctx.fillRect(150, 150, 8, 8);

    addTex('ShadowRealmPic', canvas);
  }

  // 27. Avatar 8: Nightfall Wanderer (Uploaded Custom Artwork)
  {
    const { canvas, ctx } = makeCanvas(64, 64);
    // Dark Moonlit Sky & Mountains
    ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#1e293b'; ctx.fillRect(0, 24, 64, 20);

    // Full Golden Moon
    ctx.fillStyle = '#fef08a';
    ctx.beginPath(); ctx.arc(48, 14, 8, 0, Math.PI * 2); ctx.fill();

    // Dark Distant Castle Towers
    ctx.fillStyle = '#020617';
    ctx.fillRect(52, 18, 10, 28);
    ctx.fillRect(4, 22, 12, 24);

    // Golden Cliff Edge
    ctx.fillStyle = '#78350f'; ctx.fillRect(0, 42, 64, 22);
    ctx.fillStyle = '#451a03'; ctx.fillRect(0, 48, 64, 16);

    // Sword in the Stone
    ctx.fillStyle = '#94a3b8'; ctx.fillRect(12, 34, 3, 14); ctx.fillRect(10, 38, 7, 2);

    // Brown Hooded Pilgrim Back View
    ctx.fillStyle = '#92400e';
    ctx.fillRect(26, 18, 12, 12); // Hood
    ctx.fillStyle = '#78350f';
    ctx.fillRect(22, 28, 20, 26); // Robe Body
    ctx.fillStyle = '#451a03';
    ctx.fillRect(28, 38, 8, 2); // Belt

    // Two Glowing Yellow Eyes in Hood
    ctx.fillStyle = '#facc15';
    ctx.fillRect(29, 23, 2, 4); ctx.fillRect(33, 23, 2, 4);

    // Gold Frame Border
    ctx.lineWidth = 3; ctx.strokeStyle = '#facc15'; ctx.strokeRect(2, 2, 60, 60);
    ctx.fillStyle = '#facc15'; ctx.fillRect(44, 44, 14, 14);
    ctx.fillStyle = '#000000'; ctx.font = '10px monospace'; ctx.fillText('8', 48, 55);

    addTex('avatar_sq_8', canvas);
  }

  // 28. OMEN (Mythic Shadow Owl Character, Portrait, Skills, Projectile)
  {
    // PORTRAIT OMEN (Card preview - Mythic Tier)
    const { canvas, ctx } = makeCanvas(140, 150);
    const bg = ctx.createLinearGradient(0, 0, 0, 150);
    bg.addColorStop(0, '#2a0404');
    bg.addColorStop(0.5, '#450a0a');
    bg.addColorStop(1, '#090101');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 140, 150);

    // Fiery Ruby Void aura
    const aura = ctx.createRadialGradient(70, 65, 8, 70, 65, 58);
    aura.addColorStop(0, 'rgba(239, 68, 68, 0.55)');
    aura.addColorStop(0.5, 'rgba(153, 27, 27, 0.25)');
    aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath(); ctx.arc(70, 65, 58, 0, Math.PI * 2); ctx.fill();

    // Floating particles
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(22, 28, 6, 3); ctx.fillRect(115, 32, 7, 3);
    ctx.fillRect(16, 88, 5, 3); ctx.fillRect(118, 85, 6, 3);

    // Phantom Shadow Owl Body
    ctx.fillStyle = '#0f172a';
    ctx.beginPath(); ctx.arc(70, 52, 22, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(70, 78, 25, 0, Math.PI * 2); ctx.fill();

    // Feathered Horn Crests on head
    ctx.fillStyle = '#334155';
    ctx.beginPath(); ctx.moveTo(52, 40); ctx.lineTo(40, 20); ctx.lineTo(58, 32); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(88, 40); ctx.lineTo(100, 20); ctx.lineTo(82, 32); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath(); ctx.moveTo(42, 22); ctx.lineTo(40, 20); ctx.lineTo(48, 26); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(98, 22); ctx.lineTo(100, 20); ctx.lineTo(92, 26); ctx.closePath(); ctx.fill();

    // Wide Wings Spread out
    ctx.fillStyle = '#1e293b';
    ctx.beginPath(); ctx.moveTo(50, 62); ctx.lineTo(12, 48); ctx.lineTo(35, 92); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(90, 62); ctx.lineTo(128, 48); ctx.lineTo(105, 92); ctx.closePath(); ctx.fill();

    // Crimson Wing highlights
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(16, 52, 18, 4); ctx.fillRect(24, 62, 16, 4);
    ctx.fillRect(106, 52, 18, 4); ctx.fillRect(100, 62, 16, 4);

    // Tiny clawed feet
    ctx.fillStyle = '#d97706';
    ctx.fillRect(62, 104, 6, 8); ctx.fillRect(72, 104, 6, 8);

    // Glowing Ruby Eyes
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(56, 48, 10, 6); ctx.fillRect(74, 48, 10, 6);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(58, 49, 4, 3); ctx.fillRect(76, 49, 4, 3);

    // Hooked Beak
    ctx.fillStyle = '#0f172a';
    ctx.beginPath(); ctx.moveTo(67, 52); ctx.lineTo(73, 52); ctx.lineTo(70, 62); ctx.closePath(); ctx.fill();

    // Red Ruby Frame Border (Mythic tier)
    ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2.5;
    ctx.strokeRect(3, 3, 134, 144);
    ctx.fillStyle = '#f87171';
    ctx.fillRect(2, 2, 7, 7); ctx.fillRect(131, 2, 7, 7);
    ctx.fillRect(2, 141, 7, 7); ctx.fillRect(131, 141, 7, 7);

    // Bottom Badge: "★ МИФИЧЕСКИЙ ★"
    ctx.fillStyle = '#450a0a';
    ctx.fillRect(16, 126, 108, 18);
    ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 1;
    ctx.strokeRect(16, 126, 108, 18);
    ctx.fillStyle = '#fca5a5';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('★ МИФИЧЕСКИЙ ★', 70, 139);

    addTex('portrait_omen', canvas);
  }

  {
    // CHAR OMEN - Levitating Phantom Shadow Owl Sprite
    const { canvas, ctx } = makeCanvas(56, 60);
    ctx.fillStyle = '#090101'; ctx.fillRect(8, 8, 40, 44);
    ctx.fillStyle = '#0f172a'; ctx.fillRect(14, 12, 28, 32);

    // Feathered Crest
    ctx.fillStyle = '#334155';
    ctx.fillRect(10, 4, 6, 10); ctx.fillRect(40, 4, 6, 10);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(12, 2, 3, 4); ctx.fillRect(41, 2, 3, 4);

    // Wings
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(2, 18, 12, 22); ctx.fillRect(42, 18, 12, 22);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(0, 24, 4, 12); ctx.fillRect(52, 24, 4, 12);

    // Glowing Red Eyes
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(18, 16, 7, 4); ctx.fillRect(31, 16, 7, 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(20, 17, 2, 2); ctx.fillRect(33, 17, 2, 2);

    // Hooked Beak & Claws
    ctx.fillStyle = '#78350f'; ctx.fillRect(26, 20, 4, 5);
    ctx.fillStyle = '#d97706'; ctx.fillRect(21, 44, 4, 4); ctx.fillRect(31, 44, 4, 4);

    // Levitating Mist Effect
    ctx.fillStyle = 'rgba(239, 68, 68, 0.45)'; ctx.fillRect(12, 48, 32, 4);

    addTex('char_omen', canvas);
  }

  {
    // SKILL OMEN 1: Shadow Storm
    const { canvas, ctx } = makeCanvas(48, 48);
    ctx.fillStyle = '#180303'; ctx.fillRect(0, 0, 48, 48);
    ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2; ctx.strokeRect(1, 1, 46, 46);
    // 5 fan blades
    ctx.fillStyle = '#fca5a5';
    ctx.fillRect(20, 8, 8, 20); ctx.fillRect(10, 14, 8, 18); ctx.fillRect(30, 14, 8, 18);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(4, 22, 8, 14); ctx.fillRect(36, 22, 8, 14);
    addTex('skill_omen_1', canvas);
  }

  {
    // SKILL OMEN 2: Astral Dash
    const { canvas, ctx } = makeCanvas(48, 48);
    ctx.fillStyle = '#180303'; ctx.fillRect(0, 0, 48, 48);
    ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2; ctx.strokeRect(1, 1, 46, 46);
    // Phantom trail
    ctx.fillStyle = '#450a0a'; ctx.fillRect(8, 16, 16, 16);
    ctx.fillStyle = '#dc2626'; ctx.fillRect(18, 12, 18, 18);
    ctx.fillStyle = '#fca5a5'; ctx.fillRect(28, 8, 14, 28);
    addTex('skill_omen_2', canvas);
  }

  {
    // SKILL OMEN 3: Eye of the Abyss (Ult)
    const { canvas, ctx } = makeCanvas(48, 48);
    ctx.fillStyle = '#180303'; ctx.fillRect(0, 0, 48, 48);
    ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2; ctx.strokeRect(1, 1, 46, 46);
    // Black hole sphere with red ring
    ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(24, 24, 18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000000'; ctx.beginPath(); ctx.arc(24, 24, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fca5a5'; ctx.beginPath(); ctx.arc(24, 24, 4, 0, Math.PI * 2); ctx.fill();
    addTex('skill_omen_3', canvas);
  }

  {
    // PROJ SHADOW BLADE
    const { canvas, ctx } = makeCanvas(24, 24);
    ctx.fillStyle = '#ef4444';
    ctx.beginPath(); ctx.arc(12, 12, 10, -Math.PI / 2, Math.PI / 2); ctx.fill();
    ctx.fillStyle = '#450a0a';
    ctx.beginPath(); ctx.arc(10, 12, 8, -Math.PI / 2, Math.PI / 2); ctx.fill();
    addTex('proj_shadow_blade', canvas);
  }

  {
    // PORTRAIT NIHIL - Mythic Void Black Warlock (Golden / Neon-purple frame)
    const { canvas, ctx } = makeCanvas(140, 150);
    ctx.fillStyle = '#020004'; ctx.fillRect(0, 0, 140, 150);

    // Subtle Void Starfield Background
    ctx.fillStyle = 'rgba(168, 85, 247, 0.25)';
    ctx.fillRect(15, 15, 110, 100);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(35, 25, 2, 2); ctx.fillRect(100, 40, 2, 2); ctx.fillRect(50, 85, 2, 2); ctx.fillRect(85, 75, 2, 2);

    // Draw Levitating Crown (Three Purple Lavender blades-horns hovering)
    // 1. Center Blade (Pyramid pointing up)
    ctx.fillStyle = '#4c1d95'; // Dark border/shadow
    ctx.beginPath(); ctx.moveTo(70, 10); ctx.lineTo(55, 45); ctx.lineTo(85, 45); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c084fc'; // Purple fill
    ctx.beginPath(); ctx.moveTo(70, 14); ctx.lineTo(58, 43); ctx.lineTo(82, 43); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d8b4fe'; // Lavender highlight
    ctx.beginPath(); ctx.moveTo(70, 14); ctx.lineTo(66, 43); ctx.lineTo(74, 43); ctx.closePath(); ctx.fill();

    // 2. Left Horn (Curved sickle-blade pointing left and up)
    ctx.fillStyle = '#4c1d95';
    ctx.beginPath(); ctx.moveTo(42, 20); ctx.bezierCurveTo(28, 25, 34, 52, 48, 48); ctx.bezierCurveTo(40, 48, 38, 35, 42, 20); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c084fc';
    ctx.beginPath(); ctx.moveTo(41, 23); ctx.bezierCurveTo(31, 27, 36, 49, 46, 46); ctx.bezierCurveTo(39, 46, 38, 35, 41, 23); ctx.closePath(); ctx.fill();

    // 3. Right Horn (Curved sickle-blade pointing right and up)
    ctx.fillStyle = '#4c1d95';
    ctx.beginPath(); ctx.moveTo(98, 20); ctx.bezierCurveTo(112, 25, 106, 52, 92, 48); ctx.bezierCurveTo(100, 48, 102, 35, 98, 20); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c084fc';
    ctx.beginPath(); ctx.moveTo(99, 23); ctx.bezierCurveTo(109, 27, 104, 49, 94, 46); ctx.bezierCurveTo(101, 46, 102, 35, 99, 23); ctx.closePath(); ctx.fill();

    // Deep Shadow Black Warlock Cloaked Body (Ragged, split below)
    ctx.fillStyle = '#1e1035'; // Dark purple shadow background of cloak
    ctx.beginPath(); ctx.moveTo(70, 50); ctx.lineTo(35, 115); ctx.lineTo(105, 115); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#09090b'; // Jet black outer robe
    ctx.beginPath(); ctx.moveTo(70, 54); ctx.lineTo(40, 112); ctx.lineTo(55, 112); ctx.lineTo(70, 100); ctx.lineTo(85, 112); ctx.lineTo(100, 112); ctx.closePath(); ctx.fill();

    // Glowing Spectral purple-lavender flame hand-fists hovering
    ctx.fillStyle = '#a855f7';
    ctx.beginPath(); ctx.arc(28, 80, 10, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(112, 80, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e9d5ff';
    ctx.beginPath(); ctx.arc(28, 80, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(112, 80, 5, 0, Math.PI * 2); ctx.fill();

    // Golden / Neon-purple Frame (Mythic rating)
    ctx.strokeStyle = '#c084fc'; ctx.lineWidth = 3;
    ctx.strokeRect(3, 3, 134, 144);
    ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1; // Gold accent line
    ctx.strokeRect(6, 6, 128, 138);

    // Frame corner decorations
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(2, 2, 8, 8); ctx.fillRect(130, 2, 8, 8);
    ctx.fillRect(2, 140, 8, 8); ctx.fillRect(130, 140, 8, 8);

    // Bottom Badge: "★ МИФИЧЕСКИЙ ★"
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(16, 126, 108, 18);
    ctx.strokeStyle = '#c084fc'; ctx.lineWidth = 1;
    ctx.strokeRect(16, 126, 108, 18);
    ctx.fillStyle = '#e9d5ff';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('★ МИФИЧЕСКИЙ ★', 70, 139);

    addTex('portrait_nihil', canvas);
  }

  {
    // CHAR NIHIL - Levitating Void Warlock (Crisp 16-Bit Pixel Art, Zero Blur)
    const { canvas, ctx } = makeCanvas(56, 64);
    ctx.imageSmoothingEnabled = false;

    // Void Levitation shadow particles at base
    ctx.fillStyle = '#1e1035';
    ctx.fillRect(16, 56, 24, 4);
    ctx.fillRect(12, 58, 32, 2);
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(20, 57, 16, 2);

    // --- HEAD: 3 SHARP BLADE-HORNS (TOP OF SPRITE, Y: 2-22) ---
    // 1. Center Horn (Pyramid blade)
    ctx.fillStyle = '#4c1d95'; // Dark shadow outline
    ctx.fillRect(26, 2, 4, 14);
    ctx.fillRect(25, 6, 6, 10);
    ctx.fillStyle = '#c084fc'; // Purple body
    ctx.fillRect(26, 4, 4, 11);
    ctx.fillStyle = '#d8b4fe'; // Lavender highlight
    ctx.fillRect(27, 4, 2, 9);
    ctx.fillStyle = '#ffffff'; // Sharp glint tip
    ctx.fillRect(27, 2, 2, 3);

    // 2. Left Horn (Curved blade pointing left and up)
    ctx.fillStyle = '#4c1d95';
    ctx.fillRect(16, 4, 4, 12);
    ctx.fillRect(12, 7, 4, 9);
    ctx.fillRect(18, 12, 4, 6);
    ctx.fillStyle = '#c084fc';
    ctx.fillRect(15, 6, 3, 9);
    ctx.fillRect(13, 8, 3, 6);
    ctx.fillStyle = '#d8b4fe';
    ctx.fillRect(16, 5, 2, 8);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(16, 4, 2, 2);

    // 3. Right Horn (Curved blade pointing right and up)
    ctx.fillStyle = '#4c1d95';
    ctx.fillRect(36, 4, 4, 12);
    ctx.fillRect(40, 7, 4, 9);
    ctx.fillRect(34, 12, 4, 6);
    ctx.fillStyle = '#c084fc';
    ctx.fillRect(38, 6, 3, 9);
    ctx.fillRect(40, 8, 3, 6);
    ctx.fillStyle = '#d8b4fe';
    ctx.fillRect(38, 5, 2, 8);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(38, 4, 2, 2);

    // --- HEAD: HOOD & GLOWING VOID VISOR (Y: 14-26) ---
    ctx.fillStyle = '#09090b'; // Jet black warlock cowl
    ctx.fillRect(20, 14, 16, 12);
    ctx.fillRect(22, 12, 12, 2);
    ctx.fillRect(18, 16, 20, 8);

    // Glowing menacing void visor/eyes (Horizontal violet slits)
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(21, 18, 5, 3);
    ctx.fillRect(30, 18, 5, 3);
    ctx.fillStyle = '#e9d5ff';
    ctx.fillRect(22, 19, 3, 2);
    ctx.fillRect(31, 19, 3, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(23, 19, 1, 1);
    ctx.fillRect(32, 19, 1, 1);

    // --- BODY: FLOWING VOID ROBE (Y: 24-54) ---
    // Dark violet underlayer
    ctx.fillStyle = '#1e1035';
    ctx.fillRect(16, 24, 24, 26);
    ctx.fillRect(14, 28, 28, 20);
    ctx.fillRect(12, 34, 32, 12);

    // Outer Jet-black robe
    ctx.fillStyle = '#09090b';
    ctx.fillRect(18, 24, 20, 24);
    ctx.fillRect(16, 28, 24, 18);
    ctx.fillRect(14, 34, 28, 12);

    // Robe folds & details (Deep violet folds)
    ctx.fillStyle = '#2e1065';
    ctx.fillRect(27, 26, 2, 20);
    ctx.fillRect(23, 30, 2, 14);
    ctx.fillRect(31, 30, 2, 14);

    // Ragged tendrils / split bottom (Tail)
    ctx.fillStyle = '#09090b';
    ctx.fillRect(14, 46, 6, 6);
    ctx.fillRect(22, 46, 5, 8);
    ctx.fillRect(29, 46, 5, 8);
    ctx.fillRect(36, 46, 6, 6);
    ctx.fillStyle = '#581c87';
    ctx.fillRect(15, 50, 4, 3);
    ctx.fillRect(23, 52, 3, 3);
    ctx.fillRect(30, 52, 3, 3);
    ctx.fillRect(37, 50, 4, 3);

    // --- LEVITATING SPECTRAL FLAME HANDS (Y: 26-38) ---
    // Left Hand
    ctx.fillStyle = '#4c1d95';
    ctx.fillRect(4, 28, 8, 8);
    ctx.fillRect(6, 26, 4, 12);
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(5, 29, 6, 6);
    ctx.fillRect(7, 27, 2, 8);
    ctx.fillStyle = '#e9d5ff';
    ctx.fillRect(6, 30, 4, 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(7, 31, 2, 2);

    // Right Hand
    ctx.fillStyle = '#4c1d95';
    ctx.fillRect(44, 28, 8, 8);
    ctx.fillRect(46, 26, 4, 12);
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(45, 29, 6, 6);
    ctx.fillRect(47, 27, 2, 8);
    ctx.fillStyle = '#e9d5ff';
    ctx.fillRect(46, 30, 4, 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(47, 31, 2, 2);

    addTex('char_nihil', canvas);
  }

  {
    // SKILL NIHIL 1: Void Singularity (Сингулярность Пустоты)
    const { canvas, ctx } = makeCanvas(48, 48);
    ctx.fillStyle = '#090514'; ctx.fillRect(0, 0, 48, 48);
    ctx.strokeStyle = '#c084fc'; ctx.lineWidth = 2; ctx.strokeRect(1, 1, 46, 46);

    // Violet swirl graphics
    ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(24, 24, 14, 0, Math.PI, false); ctx.stroke();
    ctx.strokeStyle = '#d8b4fe'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(24, 24, 8, Math.PI, 0, false); ctx.stroke();

    // Glowing center star
    ctx.fillStyle = '#e9d5ff';
    ctx.fillRect(22, 22, 4, 4);
    ctx.fillRect(24, 18, 2, 12);
    ctx.fillRect(18, 24, 12, 2);

    addTex('skill_nihil_1', canvas);
  }

  {
    // SKILL NIHIL 2: Void Step (Шаг Пустоты)
    const { canvas, ctx } = makeCanvas(48, 48);
    ctx.fillStyle = '#090514'; ctx.fillRect(0, 0, 48, 48);
    ctx.strokeStyle = '#c084fc'; ctx.lineWidth = 2; ctx.strokeRect(1, 1, 46, 46);

    // Phantom dashes
    ctx.fillStyle = 'rgba(168, 85, 247, 0.4)';
    ctx.fillRect(8, 14, 10, 20);
    ctx.fillStyle = 'rgba(168, 85, 247, 0.7)';
    ctx.fillRect(20, 10, 10, 28);
    ctx.fillStyle = '#d8b4fe';
    ctx.fillRect(32, 6, 8, 36);

    addTex('skill_nihil_2', canvas);
  }

  {
    // SKILL NIHIL 3: Execution of Three Blades (Казнь Трех Клинков)
    const { canvas, ctx } = makeCanvas(48, 48);
    ctx.fillStyle = '#090514'; ctx.fillRect(0, 0, 48, 48);
    ctx.strokeStyle = '#c084fc'; ctx.lineWidth = 2; ctx.strokeRect(1, 1, 46, 46);

    // Draw three plunging lavender daggers
    ctx.fillStyle = '#4c1d95';
    // Center blade
    ctx.fillRect(22, 4, 4, 24); ctx.fillRect(20, 24, 8, 3);
    // Left blade (angled)
    ctx.fillRect(10, 10, 3, 20); ctx.fillRect(8, 26, 7, 3);
    // Right blade (angled)
    ctx.fillRect(35, 10, 3, 20); ctx.fillRect(33, 26, 7, 3);

    ctx.fillStyle = '#d8b4fe';
    ctx.fillRect(23, 6, 2, 20);
    ctx.fillRect(11, 12, 1, 16);
    ctx.fillRect(36, 12, 1, 16);

    // Splash/Impact shockwave lines at the bottom
    ctx.strokeStyle = '#c084fc'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(4, 40); ctx.lineTo(44, 40); ctx.stroke();

    addTex('skill_nihil_3', canvas);
  }

  {
    // PROJ NIHIL BULLET (Void Spit Projectile - Dark void core, glowing ethereal purple/cyan aura, 20x20)
    const { canvas, ctx } = makeCanvas(20, 20);
    // Outer ethereal glow ring
    ctx.fillStyle = '#a855f7';
    ctx.beginPath(); ctx.arc(10, 10, 9, 0, Math.PI * 2); ctx.fill();
    // Inner cyan energy border
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath(); ctx.arc(10, 10, 6, 0, Math.PI * 2); ctx.fill();
    // Dark void obsidian nucleus
    ctx.fillStyle = '#0f172a';
    ctx.beginPath(); ctx.arc(10, 10, 4, 0, Math.PI * 2); ctx.fill();
    // Center bright white spark
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(9, 9, 2, 2);
    // Small spit teeth sparks
    ctx.fillStyle = '#d8b4fe';
    ctx.fillRect(3, 9, 2, 2);
    ctx.fillRect(15, 9, 2, 2);
    ctx.fillRect(9, 3, 2, 2);
    ctx.fillRect(9, 15, 2, 2);
    addTex('proj_nihil_bullet', canvas);
    addTex('proj_nihil_sickle', canvas); // backward compatibility
  }

  {
    // PROJ TOXIC SPORE (Pulsing Purple-Green Bio Spore for Toxic Staff, 16x16)
    const { canvas, ctx } = makeCanvas(16, 16);
    ctx.fillStyle = '#22c55e'; // Bright green spore edge
    ctx.beginPath(); ctx.arc(8, 8, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7e22ce'; // Dark purple toxic core
    ctx.beginPath(); ctx.arc(8, 8, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fbbf24'; // Acid yellow micro sparks
    ctx.fillRect(5, 5, 2, 2); ctx.fillRect(9, 9, 2, 2);
    addTex('proj_toxic_spore', canvas);
  }

  {
    // PROJ HEAVY BOLT (Heavy Steel Crossbow Bolt with Red Fletching for Repeater Crossbow, 16x16)
    const { canvas, ctx } = makeCanvas(16, 16);
    ctx.save();
    ctx.translate(8, 8);
    // Steel shaft
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(4, 0); ctx.stroke();
    // Red fletching wings
    ctx.fillStyle = '#ef4444';
    ctx.beginPath(); ctx.moveTo(-7, -3); ctx.lineTo(-4, 0); ctx.lineTo(-7, 3); ctx.closePath(); ctx.fill();
    // Heavy steel arrowhead
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath(); ctx.moveTo(4, -3); ctx.lineTo(8, 0); ctx.lineTo(4, 3); ctx.closePath(); ctx.fill();
    ctx.restore();
    addTex('proj_heavy_bolt', canvas);
  }

  {
    // WEAPON FEATHER DARTS (Shadow Feather Blade for Omen, 24x24)
    const { canvas, ctx } = makeCanvas(24, 24);
    ctx.save();
    ctx.translate(12, 12);
    ctx.rotate(-Math.PI / 4);
    // Dark obsidian feather spine
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-2, -10, 4, 18);
    // Sharp crimson feather blade wings
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(8, -2);
    ctx.lineTo(2, 4);
    ctx.lineTo(0, 8);
    ctx.lineTo(-2, 4);
    ctx.lineTo(-8, -2);
    ctx.closePath();
    ctx.fill();
    // Inner ruby glow
    ctx.fillStyle = '#fca5a5';
    ctx.fillRect(-1, -7, 2, 8);
    // Gold hilt band
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-3, 5, 6, 3);
    ctx.restore();
    addTex('weapon_feather_darts', canvas);
  }

  // 29. SIR ALRIK (Rare Steel Phalanx Knight, Portrait, Skills, Weapon)
  {
    // PORTRAIT SIR ALRIK (Card Preview - Rare Tier)
    const { canvas, ctx } = makeCanvas(140, 150);
    const bg = ctx.createLinearGradient(0, 0, 0, 150);
    bg.addColorStop(0, '#0c1a30');
    bg.addColorStop(0.5, '#1e3a8a');
    bg.addColorStop(1, '#080d1a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 140, 150);

    // Blue Radiant Aura
    const aura = ctx.createRadialGradient(70, 65, 8, 70, 65, 58);
    aura.addColorStop(0, 'rgba(59, 130, 246, 0.55)');
    aura.addColorStop(0.5, 'rgba(30, 58, 138, 0.25)');
    aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath(); ctx.arc(70, 65, 58, 0, Math.PI * 2); ctx.fill();

    // Long Spear Shaft Behind Knight
    ctx.fillStyle = '#78350f';
    ctx.fillRect(24, 8, 6, 130);
    // Steel Spearhead
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath(); ctx.moveTo(27, 2); ctx.lineTo(34, 18); ctx.lineTo(20, 18); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(26, 4, 3, 12);

    // Knight Helmet with Fin & Visor Slits
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(45, 20, 50, 48); // Main Helm
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(48, 22, 44, 44);
    // Top Dragon Fin/Crest
    ctx.fillStyle = '#64748b';
    ctx.beginPath(); ctx.moveTo(60, 20); ctx.lineTo(40, 4); ctx.lineTo(75, 16); ctx.closePath(); ctx.fill();

    // Vertical Visor Slits
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(52, 34, 36, 18);
    ctx.fillStyle = '#000000';
    for (let x = 56; x <= 82; x += 6) {
      ctx.fillRect(x, 36, 3, 14);
    }

    // Heavy Pauldrons (Shoulders)
    ctx.fillStyle = '#64748b';
    ctx.fillRect(28, 65, 28, 26);
    ctx.fillRect(84, 65, 28, 26);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(32, 68, 20, 20);
    ctx.fillRect(88, 68, 20, 20);

    // Heavy Plate Breastplate Body
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(48, 68, 44, 40);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(68, 70, 4, 36); // Center seam

    // Blue Tunic Fringe
    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(44, 104, 52, 12);

    // Blue Frame Border (Rare Tier)
    ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2.5;
    ctx.strokeRect(3, 3, 134, 144);
    ctx.fillStyle = '#60a5fa';
    ctx.fillRect(2, 2, 7, 7); ctx.fillRect(131, 2, 7, 7);
    ctx.fillRect(2, 141, 7, 7); ctx.fillRect(131, 141, 7, 7);

    // Bottom Badge: "[ РЕДКИЙ ]"
    ctx.fillStyle = '#172554';
    ctx.fillRect(20, 126, 100, 18);
    ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 1;
    ctx.strokeRect(20, 126, 100, 18);
    ctx.fillStyle = '#93c5fd';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('[ РЕДКИЙ ]', 70, 139);

    addTex('portrait_alrik', canvas);
  }

  {
    // CHAR SIR ALRIK - Full Plate Knight Sprite (56x60)
    const { canvas, ctx } = makeCanvas(56, 60);

    // Long Spear Shaft diagonally on back
    ctx.fillStyle = '#78350f';
    ctx.beginPath(); ctx.moveTo(48, 2); ctx.lineTo(10, 56); ctx.lineWidth = 4; ctx.strokeStyle = '#78350f'; ctx.stroke();
    // Steel Spearhead
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath(); ctx.moveTo(48, 0); ctx.lineTo(54, 10); ctx.lineTo(42, 10); ctx.closePath(); ctx.fill();

    // Steel Fin Helm
    ctx.fillStyle = '#64748b';
    ctx.fillRect(18, 10, 20, 18);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(20, 12, 16, 14);
    // Helm Fin
    ctx.fillStyle = '#475569';
    ctx.beginPath(); ctx.moveTo(24, 10); ctx.lineTo(14, 2); ctx.lineTo(30, 8); ctx.closePath(); ctx.fill();

    // Dark Visor Slits
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(22, 18, 14, 6);
    ctx.fillStyle = '#000000';
    ctx.fillRect(24, 19, 2, 4); ctx.fillRect(28, 19, 2, 4); ctx.fillRect(32, 19, 2, 4);

    // Segmented Armor Shoulders & Chest
    ctx.fillStyle = '#475569';
    ctx.fillRect(12, 26, 10, 12); ctx.fillRect(34, 26, 10, 12);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(18, 26, 20, 20);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(20, 28, 16, 16);

    // Dark Blue Tunic Fringe
    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(18, 44, 20, 6);

    // Steel Gauntlets & Legs
    ctx.fillStyle = '#475569';
    ctx.fillRect(10, 36, 8, 10); ctx.fillRect(38, 36, 8, 10);
    ctx.fillRect(18, 48, 8, 12); ctx.fillRect(30, 48, 8, 12);

    addTex('char_alrik', canvas);
  }

  {
    // SKILL ALRIK 1: Battering Charge (Таранный рывок)
    const { canvas, ctx } = makeCanvas(48, 48);
    ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, 48, 48);
    ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2; ctx.strokeRect(1, 1, 46, 46);
    // Spear thrust motion
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath(); ctx.moveTo(44, 24); ctx.lineTo(24, 16); ctx.lineTo(24, 32); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#78350f'; ctx.fillRect(4, 22, 22, 4);
    // Speed lines
    ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(4, 10); ctx.lineTo(20, 10);
    ctx.moveTo(8, 38); ctx.lineTo(26, 38);
    ctx.stroke();
    addTex('skill_alrik_1', canvas);
  }

  {
    // SKILL ALRIK 2: Wide Sweep (Широкий взмах)
    const { canvas, ctx } = makeCanvas(48, 48);
    ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, 48, 48);
    ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2; ctx.strokeRect(1, 1, 46, 46);
    // Circular arc sweep ring
    ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(24, 24, 16, 0, Math.PI * 1.7); ctx.stroke();
    // Spear in center
    ctx.fillStyle = '#e2e8f0'; ctx.fillRect(22, 6, 4, 22);
    addTex('skill_alrik_2', canvas);
  }

  {
    // SKILL ALRIK 3: Steel Phalanx (Стальная Фаланга - Ult)
    const { canvas, ctx } = makeCanvas(48, 48);
    ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, 48, 48);
    ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2; ctx.strokeRect(1, 1, 46, 46);
    // Energy Tower Shield
    ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.fillRect(10, 8, 28, 32);
    ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 3;
    ctx.strokeRect(10, 8, 28, 32);
    // Spear through shield
    ctx.fillStyle = '#fef08a'; ctx.fillRect(22, 4, 4, 40);
    addTex('skill_alrik_3', canvas);
  }

  {
    // WEAPON SPEAR (Копье Стража, 44x44)
    const { canvas, ctx } = makeCanvas(44, 44);
    ctx.save();
    ctx.translate(22, 22);
    ctx.rotate(-Math.PI / 4);
    // Long wooden shaft
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-2, -18, 4, 36);
    // Steel Spearhead
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(8, -14); ctx.lineTo(-8, -14); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(-2, -19, 4, 6);
    // Gold crossguard details
    ctx.fillStyle = '#eab308'; ctx.fillRect(-5, -14, 10, 3);
    // Blue ribbon band
    ctx.fillStyle = '#2563eb'; ctx.fillRect(-3, -9, 6, 4);
    ctx.restore();
    addTex('weapon_spear', canvas);
  }

  {
    // WEAPON KRAUL WHIPS - Bare Shadow Claws / Whips Icon (24x24)
    const { canvas, ctx } = makeCanvas(24, 24);
    ctx.clearRect(0, 0, 24, 24);
    // Shadow purple aura
    ctx.fillStyle = 'rgba(168, 85, 247, 0.4)';
    ctx.beginPath(); ctx.arc(12, 12, 10, 0, Math.PI * 2); ctx.fill();
    // Long clawed fingers
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(6, 12, 3, 9);
    ctx.fillRect(10, 8, 3, 13);
    ctx.fillRect(14, 10, 3, 11);
    ctx.fillRect(18, 14, 3, 7);
    // Sharp yellow claw tips
    ctx.fillStyle = '#facc15';
    ctx.fillRect(6, 20, 3, 3);
    ctx.fillRect(10, 20, 3, 3);
    ctx.fillRect(14, 20, 3, 3);
    ctx.fillRect(18, 20, 3, 3);
    // Dark whip trails
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(4, 4, 3, 3);
    ctx.fillRect(8, 2, 3, 3);
    ctx.fillRect(16, 3, 3, 3);
    addTex('weapon_kraul_whips', canvas);
  }

  {
    // PORTRAIT KRAUL - Epic Glass Cannon Card (140x150)
    const { canvas, ctx } = makeCanvas(140, 150);
    // Dark ominous background
    ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, 140, 150);
    const grad = ctx.createRadialGradient(70, 75, 10, 70, 75, 80);
    grad.addColorStop(0, '#3b0764'); // deep purple glow
    grad.addColorStop(1, '#020617'); // dark background
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 140, 150);

    // Skinny head & long neck
    ctx.fillStyle = '#020617';
    ctx.fillRect(55, 60, 30, 80); // neck/body
    ctx.fillStyle = '#1e1b4b'; // dark purple-ish skin
    ctx.fillRect(58, 25, 24, 45); // narrow face

    // Vertical Yellow Eyes
    ctx.fillStyle = '#facc15';
    ctx.fillRect(63, 35, 4, 18); // Left eye
    ctx.fillRect(73, 35, 4, 18); // Right eye
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(64, 42, 2, 6);
    ctx.fillRect(74, 42, 2, 6);

    // Whip arms folded creeping up
    ctx.strokeStyle = '#312e81'; ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(40, 110); ctx.lineTo(35, 70); ctx.lineTo(55, 90);
    ctx.moveTo(100, 110); ctx.lineTo(105, 70); ctx.lineTo(85, 90);
    ctx.stroke();

    // Epic Purple Frame Border
    ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 2.5;
    ctx.strokeRect(3, 3, 134, 144);
    ctx.fillStyle = '#c084fc';
    ctx.fillRect(2, 2, 7, 7); ctx.fillRect(131, 2, 7, 7);
    ctx.fillRect(2, 141, 7, 7); ctx.fillRect(131, 141, 7, 7);

    // Bottom Badge: "[ ЭПИЧЕСКИЙ ]"
    ctx.fillStyle = '#3b0764';
    ctx.fillRect(16, 126, 108, 18);
    ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 1;
    ctx.strokeRect(16, 126, 108, 18);
    ctx.fillStyle = '#f3e8ff';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('[ ЭПИЧЕСКИЙ ]', 70, 139);

    addTex('portrait_kraul', canvas);
  }

  {
    // CHAR KRAUL - Creepy Skinny Whiplash Sprite (56x60)
    const { canvas, ctx } = makeCanvas(56, 60);
    
    // Shadow under feet
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(28, 54, 12, 4, 0, 0, Math.PI*2); ctx.fill();

    // Extremely skinny torso and neck
    ctx.fillStyle = '#020617';
    ctx.fillRect(25, 24, 6, 22); // center spine
    ctx.fillStyle = '#1e1b4b'; // dark skin
    ctx.fillRect(24, 26, 8, 16); // thin chest

    // Small, narrow head
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(23, 12, 10, 14);

    // Vertical yellow eyes
    ctx.fillStyle = '#facc15';
    ctx.fillRect(25, 16, 2, 6);
    ctx.fillRect(29, 16, 2, 6);

    // Extremely long whip-like arms hanging down and curved
    ctx.strokeStyle = '#312e81'; ctx.lineWidth = 2;
    ctx.beginPath();
    // Left arm: shoulder -> elbow -> claw
    ctx.moveTo(24, 26);
    ctx.bezierCurveTo(12, 32, 10, 48, 16, 52);
    // Right arm
    ctx.moveTo(32, 26);
    ctx.bezierCurveTo(44, 32, 46, 48, 40, 52);
    ctx.stroke();

    // Claw tips
    ctx.fillStyle = '#701a75';
    ctx.fillRect(15, 51, 3, 3);
    ctx.fillRect(38, 51, 3, 3);

    // Thin spindly legs
    ctx.fillStyle = '#020617';
    ctx.fillRect(22, 42, 3, 12);
    ctx.fillRect(31, 42, 3, 12);

    addTex('char_kraul', canvas);
  }

  {
    // SKILL KRAUL 1: Shadow Dash (Теневой рывок)
    const { canvas, ctx } = makeCanvas(48, 48);
    ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, 48, 48);
    ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 2; ctx.strokeRect(1, 1, 46, 46);
    
    // Speed dash phantom lines (purple and dark)
    ctx.fillStyle = '#c084fc';
    ctx.fillRect(8, 22, 32, 4);
    ctx.fillStyle = '#3b0764';
    ctx.fillRect(4, 16, 20, 3);
    ctx.fillRect(16, 29, 24, 3);
    // Slash effects
    ctx.strokeStyle = '#fae8ff'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(30, 10); ctx.lineTo(15, 38);
    ctx.moveTo(38, 12); ctx.lineTo(26, 36);
    ctx.stroke();

    addTex('skill_kraul_1', canvas);
  }

  {
    // SKILL KRAUL 2: Dead Grip (Мертвая хватка)
    const { canvas, ctx } = makeCanvas(48, 48);
    ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, 48, 48);
    ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 2; ctx.strokeRect(1, 1, 46, 46);

    // Extremely long arm extending forward
    ctx.strokeStyle = '#312e81'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(4, 24);
    ctx.lineTo(34, 24);
    ctx.stroke();

    // Large grasping claw in yellow-purple
    ctx.fillStyle = '#facc15';
    ctx.fillRect(34, 18, 10, 12);
    ctx.fillStyle = '#701a75';
    ctx.fillRect(36, 20, 6, 8);

    addTex('skill_kraul_2', canvas);
  }

  {
    // SKILL KRAUL 3: Eerie Meatgrinder (Жуткая мясорубка)
    const { canvas, ctx } = makeCanvas(48, 48);
    ctx.fillStyle = '#020617'; ctx.fillRect(0, 0, 48, 48);
    ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 2; ctx.strokeRect(1, 1, 46, 46);

    // Large vertical yellow flashing eyes in center
    ctx.fillStyle = '#facc15';
    ctx.fillRect(14, 12, 6, 24);
    ctx.fillRect(28, 12, 6, 24);
    // Red glowing pupils
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(16, 20, 2, 8);
    ctx.fillRect(30, 20, 2, 8);

    // Meatgrinder slashing effect around
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.6)'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(24, 24, 18, 0, Math.PI * 2);
    ctx.stroke();

    addTex('skill_kraul_3', canvas);
  }

  // --- PROCEDURAL ECONOMY ICONS & CHESTS ---
  {
    // ICON SKULL (Rusty Skull with dark eye sockets - 32x32)
    const { canvas, ctx } = makeCanvas(32, 32);
    // Outer glow / shadow
    ctx.fillStyle = '#1c100b'; ctx.fillRect(4, 4, 24, 24);
    // Skull cranium
    ctx.fillStyle = '#b45309'; ctx.fillRect(6, 4, 20, 18);
    ctx.fillStyle = '#d97706'; ctx.fillRect(8, 6, 16, 14);
    ctx.fillStyle = '#fef3c7'; ctx.fillRect(10, 8, 12, 10);
    // Jaw
    ctx.fillStyle = '#b45309'; ctx.fillRect(10, 22, 12, 6);
    ctx.fillStyle = '#fef3c7'; ctx.fillRect(11, 23, 10, 4);
    // Eye sockets
    ctx.fillStyle = '#0f172a'; ctx.fillRect(9, 11, 5, 6);
    ctx.fillStyle = '#0f172a'; ctx.fillRect(18, 11, 5, 6);
    // Nose cavity
    ctx.fillStyle = '#451a03'; ctx.fillRect(15, 17, 2, 3);
    // Teeth lines
    ctx.fillStyle = '#451a03';
    ctx.fillRect(13, 23, 1, 4);
    ctx.fillRect(16, 23, 1, 4);
    ctx.fillRect(19, 23, 1, 4);

    addTex('icon_skull', canvas);
  }

  {
    // ICON SHARD (Purple Faceted Crystal - 32x32)
    const { canvas, ctx } = makeCanvas(32, 32);
    // Neon purple glow
    ctx.fillStyle = 'rgba(168, 85, 247, 0.35)'; ctx.fillRect(2, 2, 28, 28);
    // Diamond faceted crystal shape
    ctx.fillStyle = '#581c87';
    ctx.beginPath();
    ctx.moveTo(16, 2); ctx.lineTo(28, 12); ctx.lineTo(16, 30); ctx.lineTo(4, 12); ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#a855f7';
    ctx.beginPath();
    ctx.moveTo(16, 4); ctx.lineTo(26, 12); ctx.lineTo(16, 28); ctx.lineTo(6, 12); ctx.closePath();
    ctx.fill();

    // Top Facets light
    ctx.fillStyle = '#e9d5ff';
    ctx.beginPath();
    ctx.moveTo(16, 4); ctx.lineTo(22, 12); ctx.lineTo(16, 16); ctx.lineTo(10, 12); ctx.closePath();
    ctx.fill();

    // Left facet shadow
    ctx.fillStyle = '#7e22ce';
    ctx.beginPath();
    ctx.moveTo(6, 12); ctx.lineTo(16, 16); ctx.lineTo(16, 28); ctx.closePath();
    ctx.fill();

    addTex('icon_shard', canvas);
  }

  {
    // ICON UPGRADE (Green Steel Gear - 32x32)
    const { canvas, ctx } = makeCanvas(32, 32);
    // Outer gear circle
    ctx.fillStyle = '#14532d'; ctx.fillRect(4, 4, 24, 24);
    // Gear teeth
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(13, 1, 6, 30);
    ctx.fillRect(1, 13, 30, 6);
    ctx.fillRect(5, 5, 22, 22);
    // Steel inner ring
    ctx.fillStyle = '#86efac';
    ctx.beginPath(); ctx.arc(16, 16, 8, 0, Math.PI * 2); ctx.fill();
    // Dark center hole
    ctx.fillStyle = '#052e16';
    ctx.beginPath(); ctx.arc(16, 16, 4, 0, Math.PI * 2); ctx.fill();

    addTex('icon_upgrade', canvas);
  }

  {
    // ICON RANKED (Flaming Golden Trophy - 32x32)
    const { canvas, ctx } = makeCanvas(32, 32);
    // Flame background
    ctx.fillStyle = '#ef4444'; ctx.fillRect(6, 2, 20, 28);
    ctx.fillStyle = '#f97316'; ctx.fillRect(8, 4, 16, 24);
    // Golden Cup Body
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(8, 6); ctx.lineTo(24, 6); ctx.lineTo(20, 18); ctx.lineTo(12, 18); ctx.closePath();
    ctx.fill();
    // Handles
    ctx.fillRect(5, 8, 3, 6);
    ctx.fillRect(24, 8, 3, 6);
    // Stem & Base
    ctx.fillStyle = '#eab308';
    ctx.fillRect(14, 18, 4, 6);
    ctx.fillRect(10, 24, 12, 4);
    // Diamond Star Shine
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(15, 9, 2, 6);
    ctx.fillRect(13, 11, 6, 2);

    addTex('icon_ranked', canvas);
  }

  {
    // CHEST: COFFIN (Ancient Wooden/Rusty Coffin Chest - 64x64)
    const { canvas, ctx } = makeCanvas(64, 64);
    ctx.fillStyle = '#1e100a'; ctx.fillRect(10, 8, 44, 48);
    // Wooden planks
    ctx.fillStyle = '#78350f'; ctx.fillRect(12, 10, 40, 44);
    ctx.fillStyle = '#b45309'; ctx.fillRect(14, 12, 36, 18);
    ctx.fillStyle = '#92400e'; ctx.fillRect(14, 32, 36, 20);
    // Iron/Rusty bands
    ctx.fillStyle = '#451a03';
    ctx.fillRect(10, 18, 44, 4);
    ctx.fillRect(10, 42, 44, 4);
    ctx.fillRect(20, 8, 4, 48);
    ctx.fillRect(40, 8, 4, 48);
    // Skull lock in center
    ctx.fillStyle = '#fef3c7'; ctx.fillRect(28, 26, 8, 10);
    ctx.fillStyle = '#0f172a'; ctx.fillRect(29, 29, 2, 2); ctx.fillRect(33, 29, 2, 2);

    addTex('chest_coffin', canvas);
  }

  {
    // CHEST: SARCOPHAGUS (Ornate Heroic Sarcophagus Chest - 64x64)
    const { canvas, ctx } = makeCanvas(64, 64);
    // Purple & Gold Glow
    ctx.fillStyle = '#3b0764'; ctx.fillRect(6, 4, 52, 56);
    ctx.fillStyle = '#581c87'; ctx.fillRect(8, 6, 48, 52);
    ctx.fillStyle = '#7e22ce'; ctx.fillRect(10, 8, 44, 48);
    // Gold trim
    ctx.fillStyle = '#facc15';
    ctx.strokeRect(10, 8, 44, 48);
    ctx.fillRect(8, 6, 48, 4);
    ctx.fillRect(8, 54, 48, 4);
    ctx.fillRect(8, 28, 48, 5);
    // Glowing Gem in center
    ctx.fillStyle = '#a855f7'; ctx.beginPath(); ctx.arc(32, 30, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f0abfc'; ctx.beginPath(); ctx.arc(32, 30, 4, 0, Math.PI * 2); ctx.fill();

    addTex('chest_sarcophagus', canvas);
  }

  // --- 6 REMASTERED HUBSENE BUILDINGS ---
  
  // 1. Dungeon Portal (120x140)
  {
    const { canvas, ctx } = makeCanvas(120, 140);
    // Draw Obsidian Portal Pillars
    ctx.fillStyle = '#111015'; // Dark obsidian outline
    ctx.fillRect(15, 10, 90, 130);
    ctx.fillStyle = '#1e1b26'; // Obsidian body
    ctx.fillRect(20, 15, 80, 125);

    // Inner arch cutout (the void area)
    ctx.fillStyle = '#05030a';
    ctx.beginPath();
    ctx.moveTo(35, 140);
    ctx.lineTo(35, 60);
    ctx.arc(60, 60, 25, Math.PI, 0, false);
    ctx.lineTo(85, 140);
    ctx.closePath();
    ctx.fill();

    // Stone block textures
    ctx.fillStyle = '#2c2538';
    ctx.fillRect(20, 30, 20, 10);
    ctx.fillRect(80, 45, 20, 10);
    ctx.fillRect(20, 75, 15, 12);
    ctx.fillRect(85, 95, 15, 12);
    ctx.fillRect(45, 15, 30, 10); // Keystone

    // Carved glowing purple/magenta runes
    ctx.fillStyle = '#d946ef';
    ctx.fillRect(24, 25, 4, 6);
    ctx.fillRect(26, 50, 5, 4);
    ctx.fillRect(22, 80, 6, 3);
    ctx.fillRect(25, 110, 4, 8);
    ctx.fillRect(92, 25, 4, 6);
    ctx.fillRect(90, 50, 5, 4);
    ctx.fillRect(92, 80, 6, 3);
    ctx.fillRect(91, 110, 4, 8);

    // Arch highlight
    ctx.fillStyle = '#a21caf';
    ctx.fillRect(33, 50, 4, 4);
    ctx.fillRect(83, 50, 4, 4);
    ctx.fillRect(45, 25, 5, 5);
    ctx.fillRect(70, 25, 5, 5);

    addTex('build_dungeon_portal', canvas);
  }

  // 2. PVP Battle Arena Gates (140x120)
  {
    const { canvas, ctx } = makeCanvas(140, 120);
    // Draw fortified wall / stone backing
    ctx.fillStyle = '#1c1917'; // outline
    ctx.fillRect(10, 20, 120, 100);
    ctx.fillStyle = '#292524'; // main stone
    ctx.fillRect(14, 24, 112, 96);

    // Battlement crenellations on top
    ctx.fillStyle = '#44403c';
    ctx.fillRect(14, 12, 20, 12);
    ctx.fillRect(44, 12, 16, 12);
    ctx.fillRect(80, 12, 16, 12);
    ctx.fillRect(106, 12, 20, 12);

    // Gateway Arch
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(38, 50, 64, 70);
    ctx.fillStyle = '#0c0a09'; // Dark void
    ctx.fillRect(44, 56, 52, 64);

    // Iron gate bars
    ctx.fillStyle = '#57534e';
    ctx.fillRect(48, 56, 4, 64);
    ctx.fillRect(60, 56, 4, 64);
    ctx.fillRect(76, 56, 4, 64);
    ctx.fillRect(88, 56, 4, 64);
    ctx.fillRect(44, 75, 52, 5);
    ctx.fillRect(44, 98, 52, 5);

    // Crest with crossed swords above gate
    ctx.fillStyle = '#78716c';
    ctx.fillRect(60, 32, 20, 20); // Shield
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(64, 36, 12, 12); // Red cross
    // Swords
    ctx.fillStyle = '#d6d3d1';
    ctx.fillRect(54, 30, 4, 24); // Sword 1
    ctx.fillRect(82, 30, 4, 24); // Sword 2
    ctx.fillStyle = '#a8a29e';
    ctx.fillRect(52, 48, 8, 3); // Guard 1
    ctx.fillRect(80, 48, 8, 3); // Guard 2

    // Two Braziers left and right
    // Left: blue flame
    ctx.fillStyle = '#44403c';
    ctx.fillRect(18, 70, 14, 25); // Stand
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(15, 65, 20, 6); // Bowl
    ctx.fillStyle = '#38bdf8'; // Blue flame
    ctx.fillRect(17, 50, 16, 15);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(21, 55, 8, 10);

    // Right: red/orange flame
    ctx.fillStyle = '#44403c';
    ctx.fillRect(108, 70, 14, 25); // Stand
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(105, 65, 20, 6); // Bowl
    ctx.fillStyle = '#f97316'; // Orange flame
    ctx.fillRect(107, 50, 16, 15);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(111, 55, 8, 10);

    addTex('build_pvp_arena', canvas);
  }

  // 3. Hero Altar Pedestal (110x110)
  {
    const { canvas, ctx } = makeCanvas(110, 110);
    // Base white marble pedestal (isometric circle/oval steps)
    ctx.fillStyle = '#475569';
    ctx.beginPath(); ctx.ellipse(55, 80, 50, 20, 0, 0, Math.PI*2); ctx.fill(); // Step 1 shadow
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath(); ctx.ellipse(55, 76, 48, 18, 0, 0, Math.PI*2); ctx.fill(); // Step 1

    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath(); ctx.ellipse(55, 68, 38, 14, 0, 0, Math.PI*2); ctx.fill(); // Step 2 shadow
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath(); ctx.ellipse(55, 64, 36, 12, 0, 0, Math.PI*2); ctx.fill(); // Step 2

    // Engraved magic circle on top
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(55, 64, 30, 9, 0, 0, Math.PI*2); ctx.stroke();
    // Star lines in magic circle
    ctx.beginPath();
    ctx.moveTo(35, 64); ctx.lineTo(75, 64);
    ctx.moveTo(45, 59); ctx.lineTo(65, 69);
    ctx.moveTo(45, 69); ctx.lineTo(65, 59);
    ctx.stroke();

    // Floating central magic crystal
    ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.beginPath(); ctx.ellipse(55, 30, 12, 25, 0, 0, Math.PI*2); ctx.fill(); // Glow
    ctx.fillStyle = '#0ea5e9';
    ctx.beginPath();
    ctx.moveTo(55, 12); ctx.lineTo(64, 30); ctx.lineTo(55, 48); ctx.lineTo(46, 30); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e0f2fe';
    ctx.beginPath();
    ctx.moveTo(55, 15); ctx.lineTo(61, 30); ctx.lineTo(55, 45); ctx.closePath();
    ctx.fill();

    // 4 candles around
    const candlePos = [
      { x: 22, y: 72 },
      { x: 88, y: 72 },
      { x: 55, y: 56 },
      { x: 55, y: 88 }
    ];
    candlePos.forEach(p => {
      ctx.fillStyle = '#f87171'; // Red wax
      ctx.fillRect(p.x - 2, p.y - 8, 4, 8);
      ctx.fillStyle = '#38bdf8'; // Blue flame
      ctx.fillRect(p.x - 1, p.y - 12, 2, 4);
    });

    addTex('build_hero_altar', canvas);
  }

  // 4. Tavern "Drunken Gryphon" (130x120)
  {
    const { canvas, ctx } = makeCanvas(130, 120);
    // Stone foundation
    ctx.fillStyle = '#334155';
    ctx.fillRect(10, 80, 110, 35);
    ctx.fillStyle = '#475569';
    ctx.fillRect(15, 82, 100, 33);

    // Main wood walls
    ctx.fillStyle = '#451a03';
    ctx.fillRect(15, 40, 100, 42);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(18, 42, 94, 38);

    // Vertical beams
    ctx.fillStyle = '#451a03';
    ctx.fillRect(18, 42, 6, 38);
    ctx.fillRect(50, 42, 6, 38);
    ctx.fillRect(74, 42, 6, 38);
    ctx.fillRect(106, 42, 6, 38);

    // Heavy Oak door
    ctx.fillStyle = '#451a03';
    ctx.fillRect(54, 52, 22, 28);
    ctx.fillStyle = '#9a3412';
    ctx.fillRect(56, 54, 18, 26);
    ctx.fillStyle = '#1e293b'; // hinges
    ctx.fillRect(54, 58, 4, 3);
    ctx.fillRect(54, 72, 4, 3);
    ctx.fillStyle = '#facc15'; // handle
    ctx.fillRect(71, 66, 2, 3);

    // Sloped tiled roof
    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.moveTo(10, 42);
    ctx.lineTo(65, 8);
    ctx.lineTo(120, 42);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#7c2d12'; // Red roof tiles
    ctx.beginPath();
    ctx.moveTo(15, 40);
    ctx.lineTo(65, 12);
    ctx.lineTo(115, 40);
    ctx.closePath();
    ctx.fill();

    // Tile stripes
    ctx.strokeStyle = '#9a3412';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(30, 32); ctx.lineTo(35, 40);
    ctx.moveTo(50, 20); ctx.lineTo(55, 40);
    ctx.moveTo(80, 20); ctx.lineTo(75, 40);
    ctx.moveTo(100, 32); ctx.lineTo(95, 40);
    ctx.stroke();

    // Chimney stack on roof
    ctx.fillStyle = '#27272a';
    ctx.fillRect(92, 14, 12, 18);
    ctx.fillStyle = '#52525b';
    ctx.fillRect(94, 12, 8, 4);

    // Cozy Glowing Windows
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(28, 52, 18, 18);
    ctx.fillRect(84, 52, 18, 18);
    ctx.fillStyle = '#facc15'; // glow
    ctx.fillRect(30, 54, 14, 14);
    ctx.fillRect(86, 54, 14, 14);
    ctx.fillStyle = '#451a03'; // window frame cross
    ctx.fillRect(36, 54, 2, 14);
    ctx.fillRect(30, 60, 14, 2);
    ctx.fillRect(92, 54, 2, 14);
    ctx.fillRect(86, 60, 14, 2);

    // Hanging sign "Frothy beer mug"
    ctx.fillStyle = '#1e293b'; // iron bracket
    ctx.fillRect(108, 46, 16, 3);
    ctx.fillRect(121, 49, 2, 12);
    // Wooden sign
    ctx.fillStyle = '#78350f';
    ctx.fillRect(114, 52, 12, 12);
    // Beer mug icon inside sign
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(117, 55, 5, 7);
    ctx.fillStyle = '#ffffff'; // foam
    ctx.fillRect(116, 54, 7, 2);

    addTex('build_tavern', canvas);
  }

  // 5. Merchant Stall / Shop (120x110)
  {
    const { canvas, ctx } = makeCanvas(120, 110);
    // Timber counter base
    ctx.fillStyle = '#451a03';
    ctx.fillRect(15, 60, 90, 45);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(18, 62, 84, 41);

    // Vertical supporting poles
    ctx.fillStyle = '#451a03';
    ctx.fillRect(18, 20, 6, 42);
    ctx.fillRect(96, 20, 6, 42);

    // Red and Gold striped fabric canopy
    ctx.fillStyle = '#b91c1c'; // Red
    ctx.fillRect(12, 12, 96, 16);
    // Gold stripes
    ctx.fillStyle = '#facc15';
    ctx.fillRect(24, 12, 12, 16);
    ctx.fillRect(48, 12, 12, 16);
    ctx.fillRect(72, 12, 12, 16);
    ctx.fillRect(90, 12, 6, 16);

    // Scalloped canopy edge
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(12, 28, 96, 4);
    for (let c = 12; c < 108; c += 12) {
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(c + 2, 30, 8, 4);
    }

    // Crates on side
    ctx.fillStyle = '#a16207';
    ctx.fillRect(4, 72, 16, 16); // small crate
    ctx.fillStyle = '#ca8a04';
    ctx.fillRect(5, 73, 14, 14);
    ctx.fillStyle = '#a16207';
    ctx.fillRect(5, 79, 14, 2);

    // Large barrel
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(104, 75, 14, 25);
    ctx.fillStyle = '#451a03';
    ctx.fillRect(105, 76, 12, 23);
    ctx.fillStyle = '#27272a'; // bands
    ctx.fillRect(104, 80, 14, 2);
    ctx.fillRect(104, 92, 14, 2);

    // Gold Sack overflowing
    ctx.fillStyle = '#facc15';
    ctx.beginPath(); ctx.ellipse(84, 88, 10, 12, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#eab308';
    ctx.fillRect(80, 80, 8, 4); // neck ties
    ctx.fillStyle = '#fef08a'; // gold pile spilling
    ctx.fillRect(78, 75, 12, 6);

    // Potion flask on counter
    ctx.fillStyle = '#ef4444'; // Red potion
    ctx.fillRect(36, 52, 8, 10);
    ctx.fillStyle = '#ffffff'; // cork
    ctx.fillRect(39, 50, 2, 2);

    ctx.fillStyle = '#3b82f6'; // Blue potion
    ctx.fillRect(50, 53, 8, 9);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(53, 51, 2, 2);

    // Light lantern hanging
    ctx.fillStyle = '#1e293b'; // pole
    ctx.fillRect(94, 25, 18, 2);
    ctx.fillStyle = '#facc15'; // glow lantern
    ctx.fillRect(105, 27, 8, 12);
    ctx.fillStyle = '#0f172a'; // cap
    ctx.fillRect(103, 26, 12, 3);

    addTex('build_merchant_stall', canvas);
  }

  // 6. Notice/News Board (80x80)
  {
    const { canvas, ctx } = makeCanvas(80, 80);
    // Two post logs
    ctx.fillStyle = '#451a03';
    ctx.fillRect(14, 24, 6, 56);
    ctx.fillRect(60, 24, 6, 56);

    // Bullet board backboard
    ctx.fillStyle = '#3f2f18';
    ctx.fillRect(10, 14, 60, 42);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(12, 16, 56, 38);

    // Rain canopy roof
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(6, 8, 68, 6);
    ctx.fillStyle = '#44403c';
    ctx.fillRect(8, 6, 64, 3);

    // Pinned papers / scrolls
    ctx.fillStyle = '#fef3c7'; // parchment 1
    ctx.fillRect(16, 20, 15, 20);
    ctx.fillStyle = '#f59e0b'; // seal
    ctx.fillRect(22, 36, 4, 3);

    ctx.fillStyle = '#fcf8e3'; // parchment 2
    ctx.fillRect(35, 18, 14, 24);
    ctx.fillStyle = '#ef4444'; // Red WANTED badge / seal
    ctx.fillRect(40, 20, 4, 4);

    ctx.fillStyle = '#ffffff'; // parchment 3 (crooked)
    ctx.fillRect(52, 22, 14, 16);
    ctx.fillStyle = '#475569'; // seal
    ctx.fillRect(58, 34, 3, 3);

    // WANTED Poster crude drawing face
    ctx.fillStyle = '#78350f';
    ctx.fillRect(38, 28, 8, 8); // head
    ctx.fillStyle = '#1e293b'; // eyes
    ctx.fillRect(39, 30, 2, 2);
    ctx.fillRect(43, 30, 2, 2);

    // Steel dagger pinning a note in the center
    ctx.fillStyle = '#94a3b8'; // blade
    ctx.fillRect(31, 26, 2, 14);
    ctx.fillStyle = '#dc2626'; // ruby hilt
    ctx.fillRect(29, 24, 6, 2);
    ctx.fillRect(31, 21, 2, 3); // grip

    addTex('build_notice_board', canvas);
  }

  // --- PROCEDURAL DUNGEON BIOME EXPANSION (Ancient Catacombs) ---
  {
    // 1. Cracked Dungeon Stone Floor (32x32)
    const { canvas, ctx } = makeCanvas(32, 32);
    ctx.fillStyle = '#1c221e';
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = '#26302a';
    ctx.fillRect(2, 2, 28, 28);
    // Dark fracture lines
    ctx.strokeStyle = '#0f1412';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(4, 8); ctx.lineTo(14, 15); ctx.lineTo(12, 22); ctx.lineTo(24, 28);
    ctx.moveTo(14, 15); ctx.lineTo(26, 12); ctx.lineTo(28, 6);
    ctx.stroke();
    // Chipped rock flecks
    ctx.fillStyle = '#141a16';
    ctx.fillRect(8, 24, 4, 3);
    ctx.fillRect(20, 18, 3, 3);
    addTex('tile_floor_cracked', canvas);
  }

  {
    // 2. Mossy Dungeon Stone Floor (32x32)
    const { canvas, ctx } = makeCanvas(32, 32);
    ctx.fillStyle = '#1c221e';
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = '#242e27';
    ctx.fillRect(2, 2, 28, 28);
    // Green moss patches in corners and seams
    ctx.fillStyle = '#166534';
    ctx.fillRect(2, 2, 10, 8);
    ctx.fillRect(18, 20, 12, 10);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(4, 4, 6, 4);
    ctx.fillRect(22, 22, 6, 6);
    ctx.fillStyle = '#86efac';
    ctx.fillRect(5, 5, 2, 2);
    ctx.fillRect(24, 24, 2, 2);
    addTex('tile_floor_mossy', canvas);
  }

  {
    // 3. Steam/Drainage Grate Floor (32x32)
    const { canvas, ctx } = makeCanvas(32, 32);
    ctx.fillStyle = '#0f1412';
    ctx.fillRect(0, 0, 32, 32);
    // Fiery orange/warm abyss under the grate
    ctx.fillStyle = '#7c2d12';
    ctx.fillRect(4, 4, 24, 24);
    ctx.fillStyle = '#ea580c';
    ctx.fillRect(8, 8, 16, 16);
    // Heavy iron grid bars
    ctx.fillStyle = '#334155';
    ctx.fillRect(2, 2, 28, 3);
    ctx.fillRect(2, 27, 28, 3);
    ctx.fillRect(2, 2, 3, 28);
    ctx.fillRect(27, 2, 3, 28);
    for (let x = 7; x <= 25; x += 5) {
      ctx.fillRect(x, 4, 2, 24);
    }
    for (let y = 7; y <= 25; y += 5) {
      ctx.fillRect(4, y, 24, 2);
    }
    ctx.fillStyle = '#64748b';
    ctx.fillRect(2, 2, 4, 4);
    ctx.fillRect(26, 2, 4, 4);
    ctx.fillRect(2, 26, 4, 4);
    ctx.fillRect(26, 26, 4, 4);
    addTex('tile_floor_grate', canvas);
  }

  {
    // 4. Recruitment Camp Bonfire (32x32)
    const { canvas, ctx } = makeCanvas(32, 32);
    // Stone ring around pit
    ctx.fillStyle = '#334155';
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
      const sx = 16 + Math.cos(angle) * 11;
      const sy = 20 + Math.sin(angle) * 8;
      ctx.fillRect(sx - 3, sy - 2, 6, 5);
    }
    // Charred ash pit
    ctx.fillStyle = '#18181b';
    ctx.beginPath(); ctx.ellipse(16, 20, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
    // Firewood logs crossed
    ctx.fillStyle = '#78350f';
    ctx.save();
    ctx.translate(16, 20);
    ctx.rotate(0.4); ctx.fillRect(-8, -2, 16, 4);
    ctx.rotate(-0.8); ctx.fillRect(-8, -2, 16, 4);
    ctx.restore();
    // Fiery flames
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(8, 20); ctx.lineTo(16, 4); ctx.lineTo(24, 20); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(11, 20); ctx.lineTo(16, 8); ctx.lineTo(21, 20); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.moveTo(13, 20); ctx.lineTo(16, 12); ctx.lineTo(19, 20); ctx.closePath();
    ctx.fill();
    addTex('prop_bonfire', canvas);
  }

  {
    // 5. Iron Cage Prop (36x40)
    const { canvas, ctx } = makeCanvas(36, 40);
    // Base & Roof stone plates
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(2, 34, 32, 6);
    ctx.fillRect(4, 2, 28, 5);
    // Vertical iron bars
    ctx.fillStyle = '#64748b';
    for (let bx = 6; bx <= 30; bx += 6) {
      ctx.fillRect(bx, 6, 3, 28);
    }
    // Horizontal crossbars
    ctx.fillStyle = '#475569';
    ctx.fillRect(4, 14, 28, 3);
    ctx.fillRect(4, 26, 28, 3);
    // Padlock
    ctx.fillStyle = '#facc15';
    ctx.fillRect(16, 19, 5, 6);
    ctx.fillStyle = '#000000';
    ctx.fillRect(17, 21, 2, 2);
    addTex('prop_cage', canvas);
  }

  {
    // 6. Flying Pet Bat (24x20)
    const { canvas, ctx } = makeCanvas(24, 20);
    // Wing membrane
    ctx.fillStyle = '#3b0764';
    ctx.beginPath();
    ctx.moveTo(12, 10); ctx.lineTo(2, 4); ctx.lineTo(4, 16); ctx.lineTo(12, 13);
    ctx.lineTo(20, 16); ctx.lineTo(22, 4); ctx.closePath();
    ctx.fill();
    // Inner wings
    ctx.fillStyle = '#581c87';
    ctx.beginPath();
    ctx.moveTo(12, 10); ctx.lineTo(5, 7); ctx.lineTo(6, 14); ctx.lineTo(12, 12);
    ctx.lineTo(18, 14); ctx.lineTo(19, 7); ctx.closePath();
    ctx.fill();
    // Body & ears
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(9, 7, 6, 8);
    ctx.fillRect(8, 4, 3, 4); // Left ear
    ctx.fillRect(13, 4, 3, 4); // Right ear
    // Glowing red eyes
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(10, 8, 2, 2);
    ctx.fillRect(13, 8, 2, 2);
    // Tiny fangs
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(10, 12, 1, 2);
    ctx.fillRect(13, 12, 1, 2);
    addTex('pet_bat', canvas);
  }

  {
    // 7. Mercenary Ally (32x40)
    const { canvas, ctx } = makeCanvas(32, 40);
    // Iron Helmet
    ctx.fillStyle = '#475569';
    ctx.fillRect(10, 4, 12, 10);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(9, 7, 14, 4);
    // Blue Plume
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(14, 1, 4, 4);
    // Face slit & glowing eyes
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(12, 8, 8, 3);
    ctx.fillStyle = '#60a5fa';
    ctx.fillRect(13, 9, 2, 1);
    ctx.fillRect(17, 9, 2, 1);
    // Chainmail Torso with Blue Tabard
    ctx.fillStyle = '#334155';
    ctx.fillRect(8, 14, 16, 14);
    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(11, 14, 10, 14);
    ctx.fillStyle = '#facc15'; // Golden Lion Crest
    ctx.fillRect(14, 17, 4, 5);
    // Steel Broadsword in hand
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(24, 8, 3, 20);
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(25, 6, 2, 3);
    ctx.fillStyle = '#eab308'; // Guard
    ctx.fillRect(22, 20, 7, 3);
    // Boots
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(9, 28, 5, 8);
    ctx.fillRect(18, 28, 5, 8);
    addTex('ally_mercenary', canvas);
  }

  {
    // 8. Blood Altar (48x48)
    const { canvas, ctx } = makeCanvas(48, 48);
    // Stepped obsidian base
    ctx.fillStyle = '#180202';
    ctx.fillRect(4, 38, 40, 8);
    ctx.fillStyle = '#2a0808';
    ctx.fillRect(8, 28, 32, 10);
    // Main sacrificial stone slab
    ctx.fillStyle = '#3b0a0a';
    ctx.fillRect(6, 14, 36, 14);
    // Blood channels & pools
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(10, 14, 28, 4);
    ctx.fillRect(14, 18, 4, 12);
    ctx.fillRect(30, 18, 4, 12);
    // Carved demon skull in center
    ctx.fillStyle = '#fca5a5';
    ctx.fillRect(20, 20, 8, 7);
    ctx.fillStyle = '#450a0a';
    ctx.fillRect(21, 22, 2, 2);
    ctx.fillRect(25, 22, 2, 2);
    // Crimson runes around base
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(10, 40, 4, 4);
    ctx.fillRect(22, 40, 4, 4);
    ctx.fillRect(34, 40, 4, 4);
    addTex('blood_altar', canvas);
  }

  {
    // 9. Purple Candle (14x22)
    const { canvas, ctx } = makeCanvas(14, 22);
    // Iron stand
    ctx.fillStyle = '#18181b';
    ctx.fillRect(2, 19, 10, 3);
    ctx.fillRect(5, 17, 4, 2);
    // Black candle body
    ctx.fillStyle = '#311042';
    ctx.fillRect(5, 7, 4, 10);
    // Violet dripping wax
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(4, 7, 2, 4);
    // Mystical purple flame
    ctx.fillStyle = '#c084fc';
    ctx.beginPath();
    ctx.moveTo(5, 7); ctx.lineTo(7, 1); ctx.lineTo(9, 7); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(6, 3, 2, 2);
    addTex('purple_candle', canvas);
  }

  {
    // 10. Mini-Boss: Executioner of Catacombs (Палач Катакомб, 68x68 - Epic Menacing Model)
    const { canvas, ctx } = makeCanvas(68, 68);
    // Ground Shadow
    ctx.fillStyle = '#09090b';
    ctx.beginPath(); ctx.ellipse(34, 62, 24, 5, 0, 0, Math.PI * 2); ctx.fill();

    // Dark Spiked Boots
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(18, 48, 12, 14);
    ctx.fillRect(36, 48, 12, 14);
    ctx.fillStyle = '#78716c';
    ctx.fillRect(20, 58, 8, 4);
    ctx.fillRect(38, 58, 8, 4);

    // Blood-stained butcher trousers & leather apron
    ctx.fillStyle = '#292524';
    ctx.fillRect(16, 34, 34, 18);
    ctx.fillStyle = '#7f1d1d'; // Crimson blood stains on apron
    ctx.fillRect(20, 36, 12, 14);
    ctx.fillRect(34, 38, 14, 10);
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(22, 40, 8, 8);

    // Muscular Torso & Spiked Iron Harness
    ctx.fillStyle = '#44403c';
    ctx.fillRect(14, 18, 38, 18);
    ctx.fillStyle = '#1c1917'; // Harness bands
    ctx.fillRect(16, 18, 5, 18);
    ctx.fillRect(45, 18, 5, 18);
    ctx.fillRect(14, 26, 38, 4);
    // Iron skull medallion in harness center
    ctx.fillStyle = '#d6d3d1';
    ctx.fillRect(31, 24, 6, 6);
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(32, 26, 2, 2); ctx.fillRect(35, 26, 2, 2);

    // Spiked Iron Pauldrons (Shoulders)
    ctx.fillStyle = '#57534e';
    ctx.fillRect(8, 16, 10, 10);
    ctx.fillRect(48, 16, 10, 10);
    ctx.fillStyle = '#dc2626'; // Red warning spikes
    ctx.fillRect(11, 12, 4, 5);
    ctx.fillRect(51, 12, 4, 5);

    // Thick arms & spiked gauntlets
    ctx.fillStyle = '#44403c';
    ctx.fillRect(8, 26, 8, 14);
    ctx.fillRect(50, 26, 8, 14);
    ctx.fillStyle = '#292524';
    ctx.fillRect(6, 38, 10, 8);
    ctx.fillRect(50, 38, 10, 8);

    // Executioner's Black Leather Hood
    ctx.fillStyle = '#0c0a09';
    ctx.fillRect(22, 4, 22, 18);
    ctx.fillRect(20, 14, 26, 8);
    // Horned crest on hood
    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.moveTo(22, 6); ctx.lineTo(16, 0); ctx.lineTo(24, 4); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(44, 6); ctx.lineTo(50, 0); ctx.lineTo(42, 4); ctx.closePath(); ctx.fill();

    // Piercing glowing fiery red/yellow slit eye holes
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(26, 11, 4, 3);
    ctx.fillRect(36, 11, 4, 3);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(27, 12, 2, 1);
    ctx.fillRect(37, 12, 2, 1);

    // GIANT EXECUTIONER GUILLOTINE GREATAXE (Massive 2-Handed weapon)
    ctx.fillStyle = '#78350f'; // Sturdy ironwood haft
    ctx.fillRect(56, 2, 5, 62);
    ctx.fillStyle = '#a8a29e'; // Steel haft rings
    ctx.fillRect(55, 12, 7, 3);
    ctx.fillRect(55, 30, 7, 3);
    ctx.fillRect(55, 52, 7, 3);
    // Massive curved steel cleaver blade (double-layered)
    ctx.fillStyle = '#475569';
    ctx.fillRect(40, 2, 20, 26);
    ctx.fillRect(34, 6, 24, 18);
    ctx.fillStyle = '#cbd5e1'; // Razor-sharp edge
    ctx.fillRect(32, 8, 4, 14);
    ctx.fillRect(36, 2, 8, 4);
    ctx.fillRect(36, 24, 8, 4);
    // Glowing demonic runic carve in blade
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(42, 8, 3, 12);
    ctx.fillRect(39, 12, 9, 3);
    // Dripping Fresh Blood on Axe Edge
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(32, 14, 4, 10);
    ctx.fillRect(30, 22, 3, 6);
    ctx.fillRect(31, 28, 2, 4);
    addTex('boss_executioner', canvas);
  }

  {
    // 10b. Mini-Boss: Crypt Butcher (Мясник из Катакомб, 64x64 - Colossal Fanged Demon-Ogre)
    const { canvas, ctx } = makeCanvas(64, 64);
    // Ground Shadow
    ctx.fillStyle = '#09090b';
    ctx.beginPath(); ctx.ellipse(32, 58, 24, 5, 0, 0, Math.PI * 2); ctx.fill();

    // Massive Thick Legs (Dark crimson skin)
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(16, 42, 10, 16);
    ctx.fillRect(36, 42, 10, 16);
    // Iron studded boots
    ctx.fillStyle = '#4b5563';
    ctx.fillRect(14, 52, 14, 8);
    ctx.fillRect(34, 52, 14, 8);

    // Fat Chubby Body & Bloody Leather Apron
    ctx.fillStyle = '#991b1b'; // Red muscular flesh
    ctx.fillRect(12, 18, 38, 26);
    ctx.fillStyle = '#78350f'; // Heavy Brown Leather Apron
    ctx.fillRect(16, 22, 30, 24);
    // Bloody stains on apron
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(20, 24, 6, 8);
    ctx.fillRect(32, 28, 8, 12);
    ctx.fillRect(18, 36, 4, 6);

    // Thick arms & studded wristbands
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(4, 20, 8, 14);
    ctx.fillRect(50, 20, 8, 14);
    ctx.fillStyle = '#374151'; // Studded wristbands
    ctx.fillRect(2, 32, 10, 4);
    ctx.fillRect(50, 32, 10, 4);

    // Giant Ugly Head with Horns & Fangs
    ctx.fillStyle = '#7f1d1d'; // Crimson head
    ctx.fillRect(22, 6, 18, 14);
    ctx.fillStyle = '#450a0a'; // Small horns
    ctx.fillRect(18, 0, 4, 8);
    ctx.fillRect(40, 0, 4, 8);
    // Glowing yellow eyes
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(26, 10, 3, 3);
    ctx.fillRect(33, 10, 3, 3);
    // Big fanged mouth
    ctx.fillStyle = '#000000';
    ctx.fillRect(25, 14, 12, 4);
    ctx.fillStyle = '#ffffff'; // Fangs
    ctx.fillRect(26, 14, 2, 2);
    ctx.fillRect(34, 14, 2, 2);

    // GIANT MEAT CLEAVER (Bloody iron blade)
    ctx.fillStyle = '#52525b'; // Shaft/hilt in right hand
    ctx.fillRect(52, 10, 4, 30);
    ctx.fillStyle = '#9ca3af'; // Cleaver blade
    ctx.fillRect(52, 8, 10, 16);
    ctx.fillRect(48, 12, 14, 10);
    // Blood splatters on cleaver
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(48, 12, 4, 8);
    ctx.fillRect(50, 20, 4, 3);

    addTex('boss_butcher', canvas);
  }

  {
    // 11. Mini-Boss: Bone Golem (Костяной Голем, 68x68 - Colossal Skeletal Titan)
    const { canvas, ctx } = makeCanvas(68, 68);
    // Ground Shadow
    ctx.fillStyle = '#09090b';
    ctx.beginPath(); ctx.ellipse(34, 62, 26, 5, 0, 0, Math.PI * 2); ctx.fill();

    // Massive Skeletal Legs & Spiked Knee Guards
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(18, 44, 10, 18);
    ctx.fillRect(38, 44, 10, 18);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(16, 48, 14, 4);
    ctx.fillRect(36, 48, 14, 4);
    // Spiked Bone Feet
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(14, 58, 16, 4);
    ctx.fillRect(36, 58, 16, 4);

    // Thick Pelvis & Ribcage Frame
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(16, 16, 34, 28);
    ctx.fillStyle = '#0f172a'; // Deep dark hollow cavity inside chest
    ctx.fillRect(20, 20, 26, 20);

    // Individual Bone Ribs wrapping around
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(16, 20, 7, 3); ctx.fillRect(43, 20, 7, 3);
    ctx.fillRect(16, 26, 8, 3); ctx.fillRect(42, 26, 8, 3);
    ctx.fillRect(17, 32, 9, 3); ctx.fillRect(40, 32, 9, 3);
    ctx.fillRect(18, 38, 10, 3); ctx.fillRect(38, 38, 10, 3);

    // Glowing Swirling Soul Core in Chest (Violet/Cyan Mystic Vortex)
    ctx.fillStyle = '#7e22ce';
    ctx.beginPath(); ctx.arc(33, 29, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c084fc';
    ctx.beginPath(); ctx.arc(33, 29, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fdf4ff';
    ctx.fillRect(31, 27, 4, 4);

    // Massive Spiked Bone Pauldrons & Arms
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(6, 14, 12, 12);
    ctx.fillRect(48, 14, 12, 12);
    ctx.fillStyle = '#64748b'; // Bone spikes on shoulders
    ctx.fillRect(8, 8, 4, 7);
    ctx.fillRect(54, 8, 4, 7);

    // Heavy Forearms & Giant Spiked Fists
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(4, 26, 14, 18);
    ctx.fillRect(48, 26, 14, 18);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(2, 42, 16, 12);
    ctx.fillRect(48, 42, 16, 12);
    // Knuckle Spikes
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(2, 53, 3, 4); ctx.fillRect(7, 53, 3, 4); ctx.fillRect(12, 53, 3, 4);
    ctx.fillRect(49, 53, 3, 4); ctx.fillRect(54, 53, 3, 4); ctx.fillRect(59, 53, 3, 4);

    // Horned Skull Head & Obsidian Crown
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(24, 4, 18, 16);
    // Curved demon bone horns
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(24, 6); ctx.lineTo(16, -2); ctx.lineTo(26, 2); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(42, 6); ctx.lineTo(50, -2); ctx.lineTo(40, 2); ctx.closePath(); ctx.fill();

    // Dark empty eye sockets with burning purple soul flames
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(27, 8, 5, 4);
    ctx.fillRect(34, 8, 5, 4);
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(28, 9, 3, 2);
    ctx.fillRect(35, 9, 3, 2);
    ctx.fillStyle = '#f0abfc';
    ctx.fillRect(29, 9, 1, 1);
    ctx.fillRect(36, 9, 1, 1);

    // Jagged bone jaw with sharp teeth
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(26, 15, 14, 4);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(28, 16, 2, 2); ctx.fillRect(32, 16, 2, 2); ctx.fillRect(36, 16, 2, 2);
    addTex('boss_bone_golem', canvas);
  }

  {
    // 12. Breakable Clay Urn (20x24)
    const { canvas, ctx } = makeCanvas(20, 24);
    // Terracotta clay jar
    ctx.fillStyle = '#9a3412';
    ctx.beginPath();
    ctx.ellipse(10, 14, 8, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    // Neck & rim
    ctx.fillStyle = '#7c2d12';
    ctx.fillRect(6, 4, 8, 4);
    ctx.fillStyle = '#c2410c';
    ctx.fillRect(5, 3, 10, 2);
    // Ancient geometric band
    ctx.fillStyle = '#facc15';
    ctx.fillRect(4, 12, 12, 3);
    ctx.fillStyle = '#7c2d12';
    ctx.fillRect(6, 13, 2, 1); ctx.fillRect(10, 13, 2, 1); ctx.fillRect(14, 13, 2, 1);
    addTex('prop_urn', canvas);
  }

  {
    // 13. Floor Spike Trap (32x32)
    const { canvas, ctx } = makeCanvas(32, 32);
    // Stone tile base with holes
    ctx.fillStyle = '#1c221e';
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = '#26302a';
    ctx.fillRect(2, 2, 28, 28);
    // Holes
    ctx.fillStyle = '#090d0b';
    const holes = [[8, 8], [20, 8], [14, 16], [8, 24], [20, 24]];
    holes.forEach(([hx, hy]) => {
      ctx.fillRect(hx, hy, 4, 4);
      // Sharp protruding iron spike
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.moveTo(hx + 2, hy - 4); ctx.lineTo(hx + 4, hy + 3); ctx.lineTo(hx, hy + 3);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(hx + 1, hy - 4, 2, 2);
      ctx.fillStyle = '#090d0b';
    });
    addTex('prop_spikes', canvas);
  }

  {
    // Spike Trap: Retracted Grille (36x36)
    const { canvas, ctx } = makeCanvas(36, 36);
    // Dark stone border
    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, 36, 36);
    ctx.fillStyle = '#27272a';
    ctx.fillRect(2, 2, 32, 32);
    // Dark floor cavity
    ctx.fillStyle = '#09090b';
    ctx.fillRect(4, 4, 28, 28);
    // Retracted iron grating bars
    ctx.fillStyle = '#52525b';
    for (let i = 8; i <= 28; i += 5) {
      ctx.fillRect(i, 5, 2, 26);
      ctx.fillRect(5, i, 26, 2);
    }
    ctx.fillStyle = '#71717a';
    for (let i = 8; i <= 28; i += 5) {
      ctx.fillRect(i, i, 2, 2);
    }
    addTex('spike_trap_retracted', canvas);
  }

  {
    // Spike Trap: Warning Glow (36x36)
    const { canvas, ctx } = makeCanvas(36, 36);
    // Warning fiery orange border
    ctx.fillStyle = '#7c2d12';
    ctx.fillRect(0, 0, 36, 36);
    ctx.fillStyle = '#9a3412';
    ctx.fillRect(2, 2, 32, 32);
    ctx.fillStyle = '#451a03';
    ctx.fillRect(4, 4, 28, 28);
    // Glowing warning coils / grating
    ctx.fillStyle = '#f97316';
    for (let i = 8; i <= 28; i += 5) {
      ctx.fillRect(i, 5, 2, 26);
      ctx.fillRect(5, i, 26, 2);
    }
    ctx.fillStyle = '#fef08a';
    for (let i = 8; i <= 28; i += 5) {
      ctx.fillRect(i, i, 2, 2);
    }
    addTex('spike_trap_warning', canvas);
  }

  {
    // Spike Trap: Extended Deadly Steel Spikes (36x36)
    const { canvas, ctx } = makeCanvas(36, 36);
    // Bloody steel frame
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(0, 0, 36, 36);
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(2, 2, 32, 32);
    ctx.fillStyle = '#0c0a09';
    ctx.fillRect(4, 4, 28, 28);
    // 9 Razor-sharp steel spikes protruding
    const spikeCoords = [
      [8, 8], [18, 8], [28, 8],
      [8, 18], [18, 18], [28, 18],
      [8, 28], [18, 28], [28, 28]
    ];
    spikeCoords.forEach(([sx, sy]) => {
      // Spike shadow/base
      ctx.fillStyle = '#334155';
      ctx.fillRect(sx - 3, sy - 1, 6, 4);
      // Steel pyramid spike
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.moveTo(sx, sy - 7); ctx.lineTo(sx + 4, sy + 3); ctx.lineTo(sx - 4, sy + 3);
      ctx.closePath(); ctx.fill();
      // Razor highlight
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(sx - 1, sy - 6, 2, 8);
      // Blood tip
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(sx - 1, sy - 7, 2, 3);
    });
    addTex('spike_trap_extended', canvas);
  }

  {
    // 14. Shrine of Power Monument (40x48)
    const { canvas, ctx } = makeCanvas(40, 48);
    // Plinth
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(4, 38, 32, 8);
    ctx.fillStyle = '#334155';
    ctx.fillRect(8, 34, 24, 5);
    // Obelisk pillar
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(12, 34); ctx.lineTo(15, 8); ctx.lineTo(25, 8); ctx.lineTo(28, 34);
    ctx.closePath(); ctx.fill();
    // Pyramid tip
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(20, 2); ctx.lineTo(26, 8); ctx.lineTo(14, 8); ctx.closePath();
    ctx.fill();
    // Glowing celestial runes
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(18, 12, 4, 4);
    ctx.fillRect(17, 20, 6, 3);
    ctx.fillRect(18, 26, 4, 5);
    addTex('shrine_power', canvas);
  }

  {
    // 15. mob_zombie (Plague Zombie / Чумной Зомби, 32x36)
    const { canvas, ctx } = makeCanvas(32, 36);
    // Shadow
    ctx.fillStyle = '#090d0b';
    ctx.beginPath(); ctx.ellipse(16, 33, 11, 3, 0, 0, Math.PI * 2); ctx.fill();
    // Decaying legs
    ctx.fillStyle = '#3f4238';
    ctx.fillRect(10, 22, 5, 11);
    ctx.fillRect(17, 22, 5, 11);
    // Torn ragged tunic
    ctx.fillStyle = '#4d5b43';
    ctx.fillRect(8, 12, 16, 12);
    // Toxic boils / plague sores
    ctx.fillStyle = '#84cc16';
    ctx.fillRect(10, 14, 3, 3);
    ctx.fillRect(18, 17, 4, 3);
    // Rotting sickly green zombie arms reaching out
    ctx.fillStyle = '#5a784d';
    ctx.fillRect(4, 14, 5, 12);
    ctx.fillRect(23, 14, 5, 12);
    // Head & sunken jaw
    ctx.fillStyle = '#658356';
    ctx.fillRect(10, 3, 12, 10);
    // Glowing toxic plague eyes
    ctx.fillStyle = '#a3e635';
    ctx.fillRect(12, 6, 2, 2);
    ctx.fillRect(18, 6, 2, 2);
    // Open jaw with drool
    ctx.fillStyle = '#1e291e';
    ctx.fillRect(13, 10, 6, 2);
    addTex('mob_zombie', canvas);
  }

  {
    // 16. mob_cultist (Shadow Cultist / Теневой Культист, 32x36)
    const { canvas, ctx } = makeCanvas(32, 36);
    // Shadow
    ctx.fillStyle = '#090d0b';
    ctx.beginPath(); ctx.ellipse(16, 33, 10, 3, 0, 0, Math.PI * 2); ctx.fill();

    // Deep purple robes with gold trims
    ctx.fillStyle = '#3b0764';
    ctx.beginPath();
    ctx.moveTo(8, 32); ctx.lineTo(12, 14); ctx.lineTo(20, 14); ctx.lineTo(24, 32);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#facc15'; // Gold trim at hem
    ctx.fillRect(8, 30, 16, 2);

    // Deep cowl hood
    ctx.fillStyle = '#2e1065';
    ctx.fillRect(10, 4, 12, 12);
    ctx.fillStyle = '#581c87';
    ctx.fillRect(9, 6, 14, 8);

    // Pale mask with weeping purple eyes
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(12, 7, 8, 7);
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(13, 9, 2, 2); ctx.fillRect(17, 9, 2, 2);
    ctx.fillStyle = '#6b21a8'; // Tear streaks
    ctx.fillRect(13, 11, 2, 2); ctx.fillRect(17, 11, 2, 2);

    // Cultist Bone Staff with Glowing Void Crystal
    ctx.fillStyle = '#78350f';
    ctx.fillRect(24, 2, 3, 30);
    // Bone skull / crescent head
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(23, 2, 5, 4);
    // Floating Void Crystal
    ctx.fillStyle = '#c084fc';
    ctx.fillRect(23, -2, 5, 5);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(24, -1, 2, 2);
    addTex('mob_cultist', canvas);
  }

  {
    // 17. mob_shield_knight (Shielded Skeleton Knight / Скелет-Щитоносец, 36x36)
    const { canvas, ctx } = makeCanvas(36, 36);
    // Shadow
    ctx.fillStyle = '#090d0b';
    ctx.beginPath(); ctx.ellipse(18, 33, 12, 3, 0, 0, Math.PI * 2); ctx.fill();

    // Armored bone legs & steel sabatons
    ctx.fillStyle = '#475569';
    ctx.fillRect(10, 22, 6, 11);
    ctx.fillRect(20, 22, 6, 11);

    // Steel breastplate over ribcage
    ctx.fillStyle = '#64748b';
    ctx.fillRect(12, 12, 14, 12);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(14, 14, 10, 8);

    // Iron Great-Helm with red crest
    ctx.fillStyle = '#475569';
    ctx.fillRect(12, 3, 12, 10);
    ctx.fillStyle = '#dc2626'; // Red plume
    ctx.fillRect(16, 0, 4, 4);
    // Dark visor slit with glowing red eye dots
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(13, 6, 10, 3);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(15, 7, 2, 1); ctx.fillRect(19, 7, 2, 1);

    // MASSIVE TOWER SHIELD (Left arm, 12x22)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(4, 10, 12, 22);
    ctx.fillStyle = '#475569'; // Shield rim
    ctx.strokeRect(4, 10, 12, 22);
    // Carved brass cross/skull boss
    ctx.fillStyle = '#facc15';
    ctx.fillRect(8, 16, 4, 10);
    ctx.fillRect(6, 19, 8, 4);

    // Spiked Iron Mace (Right hand)
    ctx.fillStyle = '#78350f';
    ctx.fillRect(27, 8, 3, 20);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(25, 6, 7, 7);
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(26, 4, 5, 2); ctx.fillRect(24, 7, 2, 5); ctx.fillRect(31, 7, 2, 5);
    addTex('mob_shield_knight', canvas);
  }

  {
    // 18. prop_healing_fountain (Священный источник здоровья, 48x48)
    const { canvas, ctx } = makeCanvas(48, 48);
    // Stone basin
    ctx.fillStyle = '#334155';
    ctx.beginPath(); ctx.ellipse(24, 34, 22, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1e293b';
    ctx.beginPath(); ctx.ellipse(24, 32, 18, 9, 0, 0, Math.PI * 2); ctx.fill();

    // Radiant Crystal Water Pool
    ctx.fillStyle = '#0284c7';
    ctx.beginPath(); ctx.ellipse(24, 32, 16, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath(); ctx.ellipse(24, 31, 12, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#bae6fd';
    ctx.fillRect(20, 29, 8, 2);

    // Angelic / Sacred Stone Pillar Fountain Center
    ctx.fillStyle = '#475569';
    ctx.fillRect(20, 14, 8, 18);
    ctx.fillStyle = '#64748b';
    ctx.beginPath(); ctx.arc(24, 14, 6, 0, Math.PI * 2); ctx.fill();
    // Spouting glowing water stream
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(23, 8, 2, 6);
    ctx.fillStyle = '#e0f2fe';
    ctx.fillRect(22, 6, 4, 3);
    addTex('prop_healing_fountain', canvas);
  }

  {
    // 19. prop_weapon_rack (Стойка с оружием лагеря, 36x36)
    const { canvas, ctx } = makeCanvas(36, 36);
    // Wooden frame
    ctx.fillStyle = '#78350f';
    ctx.fillRect(4, 8, 4, 24);
    ctx.fillRect(28, 8, 4, 24);
    ctx.fillRect(4, 14, 28, 4);
    ctx.fillRect(4, 26, 28, 4);

    // Resting Halberd
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(10, 4, 3, 26);
    ctx.fillRect(8, 2, 7, 5);

    // Resting Broadsword
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(18, 6, 3, 24);
    ctx.fillStyle = '#facc15'; // Hilt
    ctx.fillRect(16, 24, 7, 2);

    // Resting Steel Kite Shield
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.moveTo(22, 14); ctx.lineTo(32, 14); ctx.lineTo(27, 28); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#facc15';
    ctx.fillRect(26, 17, 2, 7);
    addTex('prop_weapon_rack', canvas);
  }

  {
    // 20. prop_tent (Палатка лагеря исследователей, 48x36)
    const { canvas, ctx } = makeCanvas(48, 36);
    // Shadow
    ctx.fillStyle = '#090d0b';
    ctx.beginPath(); ctx.ellipse(24, 32, 20, 4, 0, 0, Math.PI * 2); ctx.fill();

    // Canvas Tent Wedge
    ctx.fillStyle = '#1e3a8a'; // Dark blue adventurer canvas
    ctx.beginPath();
    ctx.moveTo(4, 32); ctx.lineTo(24, 6); ctx.lineTo(44, 32); ctx.closePath(); ctx.fill();

    // Front flap opening
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(14, 32); ctx.lineTo(24, 10); ctx.lineTo(34, 32); ctx.closePath(); ctx.fill();

    // Wooden Tent Poles
    ctx.fillStyle = '#b45309';
    ctx.fillRect(23, 4, 2, 28);
    // Cozy bedroll inside flap
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(18, 26, 12, 5);
    addTex('prop_tent', canvas);
  }

  // --- 21. MECHA DRAGON VALGART & SANCTUARY OF MECHANISMS TEXTURES ---
  {
    // Mecha Dragon Main Sprite (120x96 px)
    const { canvas, ctx } = makeCanvas(120, 96);
    // Shadow
    ctx.fillStyle = '#090d16';
    ctx.beginPath(); ctx.ellipse(60, 88, 48, 8, 0, 0, Math.PI * 2); ctx.fill();

    // 1. Wings (Mechanical Turbine Wings)
    ctx.fillStyle = '#1e293b'; // Dark steel base
    ctx.beginPath();
    ctx.moveTo(60, 42); ctx.lineTo(10, 10); ctx.lineTo(35, 48); ctx.lineTo(60, 48); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(60, 42); ctx.lineTo(110, 10); ctx.lineTo(85, 48); ctx.lineTo(60, 48); ctx.fill();

    // Wing Bronze Struts & Gold Thrusters
    ctx.strokeStyle = '#d97706'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(60, 42); ctx.lineTo(10, 10); ctx.lineTo(35, 48);
    ctx.moveTo(60, 42); ctx.lineTo(110, 10); ctx.lineTo(85, 48);
    ctx.stroke();

    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(18, 18, 8, 4);
    ctx.fillRect(94, 18, 8, 4);
    ctx.fillStyle = '#38bdf8'; // Cyan Thruster Glow
    ctx.fillRect(12, 12, 5, 5);
    ctx.fillRect(103, 12, 5, 5);

    // 2. Articulated Segmented Tail with Drill Tip
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(60, 60); ctx.quadraticCurveTo(80, 75, 95, 68); ctx.stroke();

    ctx.fillStyle = '#d97706'; // Tail Bronze Armor Rings
    ctx.fillRect(68, 62, 6, 8);
    ctx.fillRect(78, 67, 6, 8);
    ctx.fillRect(88, 68, 6, 8);

    // Silver Drill / Blade Tail Tip
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(95, 68); ctx.lineTo(115, 62); ctx.lineTo(110, 76); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(98, 68); ctx.lineTo(112, 69); ctx.stroke();

    // 3. Main Torso / Chassis
    ctx.fillStyle = '#0f172a'; // Deep Chassis
    ctx.fillRect(40, 36, 40, 32);
    ctx.fillStyle = '#334155'; // Dark Steel Armor
    ctx.fillRect(42, 38, 36, 28);

    // Bronze Chest Plates
    ctx.fillStyle = '#b45309';
    ctx.fillRect(44, 40, 14, 24);
    ctx.fillRect(62, 40, 14, 24);
    ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2;
    ctx.strokeRect(44, 40, 14, 24);
    ctx.strokeRect(62, 40, 14, 24);

    // 4. Glowing Red Plasma Core
    ctx.fillStyle = '#dc2626';
    ctx.beginPath(); ctx.arc(60, 52, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fef08a'; // Core Center Heat
    ctx.beginPath(); ctx.arc(60, 52, 4, 0, Math.PI * 2); ctx.fill();

    // 5. Head / Maw (Serpentine Cyber Dragon Jaw)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(34, 18, 32, 22);
    ctx.fillStyle = '#d97706'; // Bronze Crown Horns
    ctx.beginPath();
    ctx.moveTo(42, 18); ctx.lineTo(36, 4); ctx.lineTo(48, 16);
    ctx.moveTo(58, 18); ctx.lineTo(64, 4); ctx.lineTo(52, 16);
    ctx.fill();

    // Maw Interior Glowing Red
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(26, 26, 12, 12);
    // Jagged Metal Teeth
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(26, 25, 3, 4); ctx.fillRect(31, 25, 3, 4);
    ctx.fillRect(26, 34, 3, 4); ctx.fillRect(31, 34, 3, 4);

    // Glowing Red Eyes
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(40, 20, 5, 3);
    ctx.fillRect(55, 20, 5, 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(42, 21, 2, 1);
    ctx.fillRect(57, 21, 2, 1);

    addTex('mecha_dragon', canvas);
  }

  // Gear Projectile Texture (32x32)
  {
    const { canvas, ctx } = makeCanvas(32, 32);
    ctx.fillStyle = '#475569';
    ctx.beginPath(); ctx.arc(16, 16, 12, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2; ctx.stroke();

    // 8 Gear Teeth
    ctx.fillStyle = '#d97706';
    for (let i = 0; i < 8; i++) {
      const ang = (i * Math.PI * 2) / 8;
      ctx.fillRect(16 + Math.cos(ang) * 11 - 3, 16 + Math.sin(ang) * 11 - 3, 6, 6);
    }
    // Center hole
    ctx.fillStyle = '#0f172a';
    ctx.beginPath(); ctx.arc(16, 16, 5, 0, Math.PI * 2); ctx.fill();
    addTex('gear_projectile', canvas);
    addTex('gear_large', canvas);
  }

  // Cluster Mine Texture (28x28)
  {
    const { canvas, ctx } = makeCanvas(28, 28);
    ctx.fillStyle = '#1e293b';
    ctx.beginPath(); ctx.arc(14, 14, 10, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2; ctx.stroke();

    // Spikes
    ctx.fillStyle = '#f87171';
    ctx.fillRect(12, 1, 4, 5);
    ctx.fillRect(12, 22, 4, 5);
    ctx.fillRect(1, 12, 5, 4);
    ctx.fillRect(22, 12, 5, 4);

    // Flashing Core Center
    ctx.fillStyle = '#dc2626';
    ctx.beginPath(); ctx.arc(14, 14, 4, 0, Math.PI * 2); ctx.fill();
    addTex('cluster_mine', canvas);
  }

  // Energy Generator Texture (48x64)
  {
    const { canvas, ctx } = makeCanvas(48, 64);
    // Pedestal
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(8, 32, 32, 28);
    ctx.strokeStyle = '#d97706'; ctx.lineWidth = 2; ctx.strokeRect(8, 32, 32, 28);

    // Metallic Coils
    ctx.fillStyle = '#64748b';
    ctx.fillRect(12, 40, 24, 4);
    ctx.fillRect(12, 48, 24, 4);

    // Glowing Sphere Cap
    ctx.fillStyle = '#0284c7';
    ctx.beginPath(); ctx.arc(24, 20, 16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath(); ctx.arc(24, 20, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(20, 16, 4, 0, Math.PI * 2); ctx.fill();

    addTex('energy_generator', canvas);
  }

  // Friends Button Icon (64x64) - Ornate Golden Shield with Comrades Emblem
  {
    const { canvas, ctx } = makeCanvas(64, 64);
    // Outer golden bevel frame
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.roundRect(2, 2, 60, 60, 10);
    ctx.fill();

    // Metallic gold rim
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.roundRect(4, 4, 56, 56, 8);
    ctx.fill();

    // Dark obsidian inner panel
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(7, 7, 50, 50, 6);
    ctx.fill();

    // Subtle blue runic glow
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(10, 10, 44, 44);

    // Left Hero Silhouette (Paladin with Winged Helmet)
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath(); ctx.arc(22, 22, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(14, 31, 16, 18);
    // Gold visor
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(19, 19, 7, 3);

    // Right Hero Silhouette (Warrior Leader with Horned Crest)
    ctx.fillStyle = '#f97316';
    ctx.beginPath(); ctx.arc(42, 22, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c2410c';
    ctx.fillRect(34, 31, 16, 18);
    // Glowing eyes
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(38, 19, 7, 3);

    // Crossed Golden Blades / Fellowship Crest in center
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(32, 28); ctx.lineTo(37, 36); ctx.lineTo(32, 49); ctx.lineTo(27, 36);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(31, 34, 2, 8);

    addTex('btn_icon_friends', canvas);
  }

  // Mail/Notice Button Icon (64x64) - Royal Gilded Sealed Parchment Letter
  {
    const { canvas, ctx } = makeCanvas(64, 64);
    // Outer golden bevel frame
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.roundRect(2, 2, 60, 60, 10);
    ctx.fill();

    // Metallic gold rim
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.roundRect(4, 4, 56, 56, 8);
    ctx.fill();

    // Deep crimson velvet backing
    ctx.fillStyle = '#450a0a';
    ctx.beginPath();
    ctx.roundRect(7, 7, 50, 50, 6);
    ctx.fill();

    // Rich Antique Parchment Envelope
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(12, 16, 40, 32);
    ctx.strokeStyle = '#d97706'; ctx.lineWidth = 1.5;
    ctx.strokeRect(12, 16, 40, 32);

    // Golden Ribbon
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(29, 16, 6, 32);

    // Envelope Fold lines
    ctx.strokeStyle = '#b45309'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(12, 16); ctx.lineTo(32, 34); ctx.lineTo(52, 16);
    ctx.stroke();

    // 3D Red Wax Seal with Falcon/Crown imprint
    ctx.fillStyle = '#991b1b';
    ctx.beginPath(); ctx.arc(32, 34, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#dc2626';
    ctx.beginPath(); ctx.arc(32, 34, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fef08a';
    ctx.beginPath(); ctx.arc(32, 34, 4, 0, Math.PI * 2); ctx.fill();

    addTex('btn_icon_mail', canvas);
  }

  // 19. mob_toxic_hydra (36x36 Toxic Spitter Serpent)
  {
    const { canvas, ctx } = makeCanvas(36, 36);
    // Shadow
    ctx.fillStyle = '#06200a';
    ctx.beginPath(); ctx.ellipse(18, 33, 13, 3, 0, 0, Math.PI * 2); ctx.fill();

    // Coiled venomous body
    ctx.fillStyle = '#14532d';
    ctx.beginPath(); ctx.ellipse(18, 26, 12, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#166534';
    ctx.beginPath(); ctx.ellipse(18, 25, 10, 5, 0, 0, Math.PI * 2); ctx.fill();

    // Neck rising
    ctx.fillStyle = '#15803d';
    ctx.fillRect(15, 12, 6, 13);

    // Hydra Head with Acid Glands
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(12, 6, 12, 9);
    // Horned crests
    ctx.fillStyle = '#84cc16';
    ctx.fillRect(10, 4, 4, 4);
    ctx.fillRect(22, 4, 4, 4);
    // Glowing venom eyes
    ctx.fillStyle = '#facc15';
    ctx.fillRect(14, 8, 2, 2);
    ctx.fillRect(20, 8, 2, 2);
    // Venom drool mouth
    ctx.fillStyle = '#052e16';
    ctx.fillRect(15, 12, 6, 3);
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(17, 14, 2, 4);

    addTex('mob_toxic_hydra', canvas);
  }

  // 20. mob_shadow_stalker (32x36 Void Assassin with Dual Daggers)
  {
    const { canvas, ctx } = makeCanvas(32, 36);
    // Shadow
    ctx.fillStyle = '#090510';
    ctx.beginPath(); ctx.ellipse(16, 33, 10, 3, 0, 0, Math.PI * 2); ctx.fill();

    // Sleek shadow cloak & boots
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(10, 22, 5, 11);
    ctx.fillRect(17, 22, 5, 11);
    ctx.fillStyle = '#312e81';
    ctx.fillRect(9, 13, 14, 11);

    // Shadow Cowl Hood
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(10, 4, 12, 11);
    // Glowing purple slit eyes
    ctx.fillStyle = '#c084fc';
    ctx.fillRect(12, 9, 3, 2);
    ctx.fillRect(17, 9, 3, 2);

    // Dual Gleaming Assassin Daggers
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(4, 10, 3, 14);
    ctx.fillRect(25, 10, 3, 14);
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(3, 14, 5, 3);
    ctx.fillRect(24, 14, 5, 3);

    addTex('mob_shadow_stalker', canvas);
  }

  // --- MINIMAP PIXEL MICRO-ICONS (12x12 & 14x14) ---

  // 1. micro_icon_player (12x12 White Arrow with Golden Tip)
  {
    const { canvas, ctx } = makeCanvas(12, 12);
    // Dark outline
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(6, 0); ctx.lineTo(12, 12); ctx.lineTo(6, 9); ctx.lineTo(0, 12); ctx.closePath();
    ctx.fill();
    // Inner white arrow
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(6, 2); ctx.lineTo(10, 10); ctx.lineTo(6, 8); ctx.lineTo(2, 10); ctx.closePath();
    ctx.fill();
    // Golden tip
    ctx.fillStyle = '#facc15';
    ctx.fillRect(5, 2, 2, 3);
    addTex('micro_icon_player', canvas);
  }

  // 2. micro_icon_tavern (12x12 Ale Mug: Amber glass #d97706, White foam #f8fafc)
  {
    const { canvas, ctx } = makeCanvas(12, 12);
    // Mug handle
    ctx.fillStyle = '#92400e';
    ctx.fillRect(8, 4, 3, 5);
    ctx.fillStyle = '#080c14';
    ctx.fillRect(9, 5, 1, 3);
    // Glass body
    ctx.fillStyle = '#080c14';
    ctx.fillRect(1, 2, 8, 9);
    ctx.fillStyle = '#d97706';
    ctx.fillRect(2, 3, 6, 7);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(3, 4, 2, 5);
    // White foam
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(1, 2, 8, 3);
    ctx.fillRect(2, 1, 6, 2);
    addTex('micro_icon_tavern', canvas);
  }

  // 3. micro_icon_dungeon (12x12 Void Skull: #e2e8f0 with purple glowing eyes #c084fc)
  {
    const { canvas, ctx } = makeCanvas(12, 12);
    // Outline
    ctx.fillStyle = '#080c14';
    ctx.fillRect(1, 1, 10, 10);
    // Skull bone
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(2, 2, 8, 6);
    ctx.fillRect(3, 8, 6, 3);
    // Glowing purple eyes
    ctx.fillStyle = '#c084fc';
    ctx.fillRect(3, 4, 2, 2);
    ctx.fillRect(7, 4, 2, 2);
    // Nose & teeth
    ctx.fillStyle = '#475569';
    ctx.fillRect(5, 6, 2, 1);
    ctx.fillRect(4, 9, 1, 2);
    ctx.fillRect(6, 9, 1, 2);
    addTex('micro_icon_dungeon', canvas);
  }

  // 4. micro_icon_altar (12x12 Floating Mana Crystal #38bdf8)
  {
    const { canvas, ctx } = makeCanvas(12, 12);
    // Outline
    ctx.fillStyle = '#080c14';
    ctx.beginPath();
    ctx.moveTo(6, 0); ctx.lineTo(12, 6); ctx.lineTo(6, 12); ctx.lineTo(0, 6); ctx.closePath();
    ctx.fill();
    // Inner crystal
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.moveTo(6, 1); ctx.lineTo(10, 6); ctx.lineTo(6, 11); ctx.lineTo(2, 6); ctx.closePath();
    ctx.fill();
    // Highlight
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(6, 2); ctx.lineTo(9, 6); ctx.lineTo(6, 9); ctx.lineTo(4, 6); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e0f2fe';
    ctx.fillRect(5, 4, 2, 2);
    addTex('micro_icon_altar', canvas);
  }

  // 5. micro_icon_arena (12x12 Crossed Silver Blades #94a3b8 with Golden Hilts)
  {
    const { canvas, ctx } = makeCanvas(12, 12);
    // Dark background shadow
    ctx.fillStyle = '#080c14';
    ctx.fillRect(0, 0, 12, 12);
    // Blade 1 (\)
    ctx.fillStyle = '#e2e8f0';
    for (let i = 2; i < 9; i++) ctx.fillRect(i, i, 2, 2);
    // Blade 2 (/)
    ctx.fillStyle = '#94a3b8';
    for (let i = 2; i < 9; i++) ctx.fillRect(10 - i, i, 2, 2);
    // Gold crossguards
    ctx.fillStyle = '#facc15';
    ctx.fillRect(1, 8, 3, 2);
    ctx.fillRect(8, 8, 3, 2);
    ctx.fillStyle = '#b45309';
    ctx.fillRect(1, 10, 2, 2);
    ctx.fillRect(9, 10, 2, 2);
    addTex('micro_icon_arena', canvas);
  }

  // 6. micro_icon_workshop (12x12 Steel Anvil #475569 with Gold Spark)
  {
    const { canvas, ctx } = makeCanvas(12, 12);
    // Anvil base & top
    ctx.fillStyle = '#080c14';
    ctx.fillRect(1, 3, 10, 8);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(1, 4, 10, 3);
    ctx.fillRect(3, 7, 6, 2);
    ctx.fillRect(2, 9, 8, 2);
    // Steel highlight
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(3, 4, 6, 1);
    // Golden spark
    ctx.fillStyle = '#facc15';
    ctx.fillRect(6, 1, 2, 2);
    ctx.fillRect(5, 2, 4, 1);
    addTex('micro_icon_workshop', canvas);
  }

  // 7. micro_icon_skull (14x14 Currency Skull)
  {
    const { canvas, ctx } = makeCanvas(14, 14);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(3, 2, 8, 7);
    ctx.fillRect(4, 9, 6, 4);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(4, 5, 2, 3);
    ctx.fillRect(8, 5, 2, 3);
    ctx.fillRect(6, 7, 2, 2);
    ctx.fillRect(5, 11, 1, 2);
    ctx.fillRect(8, 11, 1, 2);
    addTex('micro_icon_skull', canvas);
  }

  // 8. micro_icon_shard (14x14 Currency Void Shard)
  {
    const { canvas, ctx } = makeCanvas(14, 14);
    ctx.fillStyle = '#c084fc';
    ctx.beginPath();
    ctx.moveTo(7, 1); ctx.lineTo(12, 6); ctx.lineTo(7, 13); ctx.lineTo(2, 6); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f3e8ff';
    ctx.fillRect(6, 4, 2, 4);
    addTex('micro_icon_shard', canvas);
  }

  // 9. micro_icon_upgrade (14x14 Currency Gear/Upgrade)
  {
    const { canvas, ctx } = makeCanvas(14, 14);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(4, 1, 6, 12);
    ctx.fillRect(1, 4, 12, 6);
    ctx.beginPath(); ctx.arc(7, 7, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#090d16';
    ctx.beginPath(); ctx.arc(7, 7, 2.5, 0, Math.PI * 2); ctx.fill();
    addTex('micro_icon_upgrade', canvas);
  }

  // 10. micro_icon_ranked (14x14 Currency Trophy/Cup)
  {
    const { canvas, ctx } = makeCanvas(14, 14);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(3, 2, 8, 6);
    ctx.fillRect(5, 8, 4, 3);
    ctx.fillRect(3, 11, 8, 2);
    ctx.fillRect(1, 3, 2, 4);
    ctx.fillRect(11, 3, 2, 4);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(5, 3, 4, 2);
    addTex('micro_icon_ranked', canvas);
  }
}


