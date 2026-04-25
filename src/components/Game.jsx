import React, { useEffect, useRef } from 'react';
import runSprite from '../assets/run.png';

export default function Game() {
  const canvasRef = useRef(null);
  const spriteSheet = useRef(new Image());
  const spriteLoaded = useRef(false);
  
  const logoImg = useRef(new Image());
  const logoTransImg = useRef(new Image());
  const logoLoaded = useRef(false);
  const logoTransLoaded = useRef(false);

  const products = ['iphone', 'fridge', 'washing_machine', 'ac', 'laptop', 'microwave', 'tv', 'headphone', 'viccum_cleaner', 'watch', 'blender'];
  const productImages = useRef({});
  const productsLoaded = useRef(0);

  const bgAudio = useRef(new Audio('/sounds/bg.mp3'));
  const jumpAudio = useRef(new Audio('/sounds/jump.mp3'));
  const coinAudio = useRef(new Audio('/sounds/coin.mp3'));
  const bonusAudio = useRef(new Audio('/sounds/bonus.mp3'));
  const yayAudio = useRef(new Audio('/sounds/yay.mp3'));

  useEffect(() => {
    bgAudio.current.loop = true;
    bgAudio.current.volume = 0.6;
    jumpAudio.current.volume = 0.8;
    coinAudio.current.volume = 0.5;
    bonusAudio.current.volume = 0.7;
    yayAudio.current.volume = 0.8;

    spriteSheet.current.src = runSprite;
    spriteSheet.current.onload = () => { spriteLoaded.current = true; };

    logoImg.current.src = '/images/myglogo.png';
    logoImg.current.onload = () => { logoLoaded.current = true; };

    logoTransImg.current.src = '/images/mygtrans.png';
    logoTransImg.current.onload = () => { logoTransLoaded.current = true; };

    products.forEach(p => {
      const img = new Image();
      img.src = `/images/products/${p}.png`;
      img.onload = () => {
        productImages.current[p] = img;
        productsLoaded.current++;
      };
    });

    const unlockAudio = () => {
      bgAudio.current.play().then(() => {
        if (state === 'idle') bgAudio.current.pause();
      }).catch(() => {});
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
    window.addEventListener('click', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const CHAR_SIZE = 80;
    let W = canvas.width, H = canvas.height;
    let GROUND_Y = H ? H - 120 : 0;
    let charY = GROUND_Y - CHAR_SIZE / 2;

    const updateSize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      
      W = window.innerWidth;
      H = window.innerHeight;
      const oldGround = GROUND_Y;
      GROUND_Y = H - 180;
      if (oldGround > 0 && Math.abs(charY - (oldGround - CHAR_SIZE / 2)) < 2) {
        charY = GROUND_Y - CHAR_SIZE / 2;
      } else if (charY <= 0) {
        charY = GROUND_Y - CHAR_SIZE / 2;
      }
    };
    window.addEventListener('resize', updateSize);
    updateSize();

    // ── Cyberpunk Palette ─────────────────────────────────────────────────
    const SKY_TOP    = '#03010a';   // near-black deep space
    const SKY_MID    = '#0a0418';   // dark purple-navy
    const SKY_BOT    = '#120830';   // slightly lighter purple at horizon
    const GROUND_T   = '#1a0d00';   // dark burnt orange ground strip
    const GROUND_B   = '#0d0700';   // near-black ground fill
    const NEON_ORG   = '#ff6b00';   // myG orange
    const NEON_PRP   = '#9b30ff';   // cyberpunk purple
    const SCORE_BG   = 'rgba(10, 5, 20, 0.92)';

    // ── Layout CONSTANTS ──────────────────────────────────────────────────
    const CHAR_X = W * 0.25;
    const GRAVITY = 0.4;
    const JUMP_VEL = -11;
    const MAX_JUMPS = 2;

    const horizontalFrames = 4;
    const totalFrames = 21;
    const frameW = 768;
    const frameH = 448;

    // ── State ─────────────────────────────────────────────────────────────
    let state = 'idle';
    let score = 0, bestScore = 0, frameCount = 0;
    let speed = 6;
    let velY = 0, onGround = true, jumpCount = 0;
    let obstacles = [], nextObstacleIn = 90;
    let platforms = [], nextPlatformIn = 60;
    let groundSegments = [], nextGroundIn = 0;
    let coins = [], coinsCollected = 0;
    let lastMilestone = 0;
    let milestoneText = '', milestoneTimer = 0;
    let particles = [], floaters = [], jumpTrail = [];
    let scrollFar = 0, scrollMid = 0, scrollNear = 0, scrollFore = 0;
    let animId;

    // ── Generate buildings ────────────────────────────────────────────────
    function genBuildings(count, totalW, minH, maxH, minWid, maxWid) {
      return Array.from({ length: count }, (_, i) => ({
        x: (i / count) * totalW + Math.random() * (totalW / count),
        h: minH + Math.random() * (maxH - minH),
        w: minWid + Math.random() * (maxWid - minWid),
        glowColor: Math.random() > 0.5 ? NEON_ORG : NEON_PRP,
        hasAntenna: Math.random() > 0.55,
        windowCols: Math.floor(Math.random() * 3), // 0=none, 1=sparse, 2=medium
        windowOffset: Math.random(),
        showLogo: Math.random() > 0.7,
        logoType: Math.random() > 0.5 ? 'solid' : 'trans',
      }));
    }

    // ── 4 parallax building layers ────────────────────────────────────────
    const WORLD_W = 2400;
    // Layer 1 — farthest ghost silhouettes
    const bldGhost = genBuildings(18, WORLD_W * 3.5, H * 0.45, H * 0.75, 40, 90);
    // Layer 2 — far city
    const bldFar   = genBuildings(20, WORLD_W * 3,   H * 0.35, H * 0.60, 35, 75);
    // Layer 3 — mid city (windows)
    const bldMid   = genBuildings(22, WORLD_W * 2.5, H * 0.25, H * 0.50, 60, 120);
    // Layer 4 — near city (windows + detail)
    const bldNear  = genBuildings(16, WORLD_W * 2,   H * 0.15, H * 0.38, 80, 180);

    // Street lights
    const streetLights = Array.from({ length: 12 }, (_, i) => ({
      x: (i / 12) * WORLD_W * 2 + Math.random() * 30,
    }));

    // Neon particles (ambient floating dust)
    const neonDust = Array.from({ length: 60 }, () => ({
      x: Math.random() * WORLD_W * 2,
      y: Math.random() * (H * 0.8),
      r: 1 + Math.random() * 2.5,
      color: Math.random() > 0.5 ? NEON_ORG : NEON_PRP,
      speed: 0.2 + Math.random() * 0.6,
      phase: Math.random() * Math.PI * 2,
    }));

    // ── DRAW: Night Sky ───────────────────────────────────────────────────
    function drawSky() {
      const g = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
      g.addColorStop(0,   SKY_TOP);
      g.addColorStop(0.5, SKY_MID);
      g.addColorStop(1,   SKY_BOT);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, GROUND_Y);
    }

    // ── DRAW: Moon ────────────────────────────────────────────────────────
    function drawMoon() {
      const mx = W * 0.15, my = H * 0.12;
      ctx.save();
      // Outer halo
      const halo = ctx.createRadialGradient(mx, my, 10, mx, my, 80);
      halo.addColorStop(0, 'rgba(180,140,255,0.18)');
      halo.addColorStop(1, 'rgba(180,140,255,0)');
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(mx, my, 80, 0, Math.PI * 2); ctx.fill();
      // Moon disc
      ctx.fillStyle = '#c4a9f0';
      ctx.beginPath(); ctx.arc(mx, my, 28, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ddd0f5';
      ctx.beginPath(); ctx.arc(mx - 6, my - 5, 22, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // ── DRAW: Stars ───────────────────────────────────────────────────────
    // Pre-generate star positions once
    const stars = Array.from({ length: 80 }, () => ({
      x: Math.random() * 3000, y: Math.random() * (H * 0.55),
      r: 0.5 + Math.random() * 1.5,
      alpha: 0.4 + Math.random() * 0.6,
    }));
    function drawStars() {
      const tw = 3000;
      const s = (scrollFar * 0.05) % tw;
      ctx.save();
      stars.forEach(st => {
        const sx = ((st.x - s) % tw + tw) % tw;
        if (sx > W + 5) return;
        ctx.globalAlpha = st.alpha * (0.7 + 0.3 * Math.sin(frameCount * 0.04 + st.phase || 0));
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(sx, st.y, st.r, 0, Math.PI * 2); ctx.fill();
      });
      ctx.restore();
    }

    // ── DRAW: Neon ambient dust particles ─────────────────────────────────
    function drawNeonDust() {
      const tw = WORLD_W * 2;
      ctx.save();
      neonDust.forEach(p => {
        const px = ((p.x - scrollFar * 0.3) % tw + tw) % tw;
        const py = p.y + Math.sin(frameCount * 0.03 + p.phase) * 6;
        if (px > W + 5) return;
        ctx.globalAlpha = 0.35 + 0.2 * Math.sin(frameCount * 0.05 + p.phase);
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(px, py, p.r, 0, Math.PI * 2); ctx.fill();
      });
      ctx.restore();
    }

    // ── DRAW: Building layer ──────────────────────────────────────────────
    function drawBuildings(arr, scroll, totalW, bodyColor, opacity, showWindows, showNeon) {
      const s = (scroll % totalW + totalW) % totalW;
      ctx.save();
      ctx.globalAlpha = opacity;

      [-s - totalW, -s, totalW - s].forEach(offsetX => {
        arr.forEach(b => {
          const bx = offsetX + b.x;
          const by = GROUND_Y - b.h;
          if (bx > W + b.w || bx + b.w < -10) return;

          // ── Main body ──
          ctx.globalAlpha = opacity;
          ctx.fillStyle = bodyColor;
          ctx.fillRect(bx, by, b.w, b.h);

          // ── Neon top trim ──
          if (showNeon) {
            ctx.globalAlpha = opacity * 0.9;
            ctx.fillStyle = b.glowColor;
            ctx.fillRect(bx - 1, by, b.w + 2, 3);

            // Glow bloom on top edge
            ctx.globalAlpha = opacity * 0.25;
            const topGlow = ctx.createLinearGradient(bx, by - 12, bx, by + 6);
            topGlow.addColorStop(0, 'rgba(0,0,0,0)');
            topGlow.addColorStop(1, b.glowColor);
            ctx.fillStyle = topGlow;
            ctx.fillRect(bx - 2, by - 12, b.w + 4, 15);
          }

          // ── Antenna ──
          if (b.hasAntenna && showNeon) {
            ctx.globalAlpha = opacity * 0.8;
            ctx.fillStyle = bodyColor;
            const aH = 12 + b.w * 0.15;
            ctx.fillRect(bx + b.w / 2 - 1.5, by - aH, 3, aH);
            // Blinking tip
            const blink = Math.sin(frameCount * 0.08 + b.windowOffset * 10) > 0.3;
            if (blink) {
              ctx.globalAlpha = opacity * 0.95;
              ctx.fillStyle = b.glowColor;
              ctx.beginPath();
              ctx.arc(bx + b.w / 2, by - aH - 2, 2.5, 0, Math.PI * 2);
              ctx.fill();
            }
          }

          // ── Windows ──
          if (showWindows && b.windowCols > 0) {
            const winW = 4, winH = 6;
            const cols = Math.max(1, Math.floor(b.w / 12));
            const rows = Math.max(1, Math.floor(b.h / 14));
            for (let r = 0; r < rows; r++) {
              for (let c = 0; c < cols; c++) {
                // Deterministic pseudo-random using offset so it doesn't flicker every frame
                const lit = ((r * 7 + c * 13 + Math.floor(b.windowOffset * 30)) % 5) !== 0;
                if (!lit) continue;
                const wx = bx + 5 + c * 12;
                const wy = by + 8 + r * 14;
                // Alternate orange/purple windows
                const wColor = ((r + c) % 2 === 0) ? NEON_ORG : NEON_PRP;
                ctx.globalAlpha = opacity * (0.4 + 0.3 * Math.sin(frameCount * 0.03 + r + c));
                ctx.fillStyle = wColor;
                ctx.fillRect(wx, wy, winW, winH);
              }
            }
          }

          // ── Building Logo ──
          if (b.showLogo && showWindows) {
            const img = b.logoType === 'trans' ? logoTransImg.current : logoImg.current;
            const loaded = b.logoType === 'trans' ? logoTransLoaded.current : logoLoaded.current;
            
            if (loaded) {
              ctx.save();
              ctx.globalAlpha = opacity * 0.9;
              const logoSize = Math.min(b.w * 0.8, 120);
              // Neon glow for building logo
              ctx.shadowBlur = 15;
              ctx.shadowColor = NEON_ORG;
              ctx.drawImage(img, bx + b.w/2 - logoSize/2, by + b.h/4, logoSize, logoSize);
              ctx.restore();
            }
          }
        });
      });
      ctx.restore();
    }

    // ── DRAW: Street lights ───────────────────────────────────────────────
    function drawStreetLights() {
      const tw = WORLD_W * 2;
      const s = (scrollFore % tw + tw) % tw;
      ctx.save();
      [-s - tw, -s, tw - s].forEach(offsetX => {
        streetLights.forEach(l => {
          const lx = offsetX + l.x;
          if (lx > W + 10 || lx < -20) return;

          // Pole
          ctx.globalAlpha = 1;
          ctx.fillStyle = '#1a1a2e';
          ctx.fillRect(lx - 2, GROUND_Y - 60, 4, 60);
          // Arm
          ctx.fillRect(lx, GROUND_Y - 60, 18, 3);
          // Lamp glow bloom
          ctx.globalAlpha = 0.18;
          const lg = ctx.createRadialGradient(lx + 18, GROUND_Y - 58, 2, lx + 18, GROUND_Y - 58, 28);
          lg.addColorStop(0, NEON_ORG); lg.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = lg;
          ctx.beginPath(); ctx.arc(lx + 18, GROUND_Y - 58, 28, 0, Math.PI * 2); ctx.fill();
          // Lamp bulb
          ctx.globalAlpha = 0.95;
          ctx.fillStyle = NEON_ORG;
          ctx.beginPath(); ctx.arc(lx + 18, GROUND_Y - 58, 4, 0, Math.PI * 2); ctx.fill();
        });
      });
      ctx.restore();
    }

    // ── DRAW: Ground (cyberpunk) ──────────────────────────────────────────
    // ── DRAW: Ground (with Gaps) ──────────────────────────────────────────
    function drawGround() {
      groundSegments.forEach(g => {
        const gx = g.x;
        const gw = g.w;

        // Main dark ground strip
        ctx.fillStyle = '#110808';
        ctx.fillRect(gx, GROUND_Y, gw, 18);

        // Orange neon edge line on ground surface
        ctx.fillStyle = NEON_ORG;
        ctx.fillRect(gx, GROUND_Y, gw, 2);

        // Subtle orange glow bloom above ground
        const groundGlow = ctx.createLinearGradient(0, GROUND_Y - 20, 0, GROUND_Y);
        groundGlow.addColorStop(0, 'rgba(255,107,0,0)');
        groundGlow.addColorStop(1, 'rgba(255,107,0,0.12)');
        ctx.fillStyle = groundGlow;
        ctx.fillRect(gx, GROUND_Y - 20, gw, 20);

        // Ground fill
        ctx.fillStyle = GROUND_B;
        ctx.fillRect(gx, GROUND_Y + 18, gw, H - GROUND_Y);

        // Scrolling ground grid lines (perspective streaks)
        ctx.strokeStyle = 'rgba(255,107,0,0.12)';
        ctx.lineWidth = 1;
        const gridSpacing = 60;
        for (let i = 0; i < gw / gridSpacing + 2; i++) {
          const lx = gx + ((i * gridSpacing - scrollFore * 0.8) % gw + gw) % gw;
          ctx.beginPath();
          ctx.moveTo(lx, GROUND_Y + 18);
          ctx.lineTo(lx - 15, H);
          ctx.stroke();
        }

        // ── Ground Logos at intervals (Drawn on top of fill) ──
        if (logoTransLoaded.current) {
          ctx.save();
          const logoSize = 100;
          // One logo per segment if wide enough, or every 800px
          const count = Math.max(1, Math.floor(gw / 800));
          for (let j = 0; j < count; j++) {
            const lx = gx + (j + 0.5) * (gw / count);
            ctx.globalAlpha = 0.9;
            ctx.shadowBlur = 20;
            ctx.shadowColor = NEON_ORG;
            ctx.drawImage(logoTransImg.current, lx - logoSize / 2, GROUND_Y + 25, logoSize, logoSize);
          }
          ctx.restore();
        }
      });
    }

    // ── DRAW: Character (unchanged) ───────────────────────────────────────
    function drawCharacter() {
      if (!spriteLoaded.current) return;
      let frameIndex = 0;
      if (state === 'running') {
        if (onGround) {
          frameIndex = Math.floor(frameCount * 0.22) % totalFrames;
        } else {
          frameIndex = 5;
        }
      }
      const col = frameIndex % horizontalFrames;
      const row = Math.floor(frameIndex / horizontalFrames);
      const aspect = frameW / frameH;
      const drawW = CHAR_SIZE * aspect;
      const drawH = CHAR_SIZE;

      ctx.save();
      ctx.translate(CHAR_X, charY + 15);
      if (!onGround) ctx.rotate(velY * 0.025);
      ctx.drawImage(
        spriteSheet.current,
        col * frameW, row * frameH, frameW, frameH,
        -drawW / 2, -drawH / 2, drawW, drawH
      );
      ctx.restore();
    }

    // ── DRAW: Platforms (Floating) ───────────────────────────────────────
    function drawPlatforms() {
      platforms.forEach(p => {
        ctx.save();
        // Cyberpunk Platform
        ctx.fillStyle = '#110800'; 
        ctx.strokeStyle = NEON_ORG;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(p.x - p.w / 2, p.y, p.w, 15, 4);
        ctx.fill();
        ctx.stroke();

        // Neon Glow
        ctx.shadowBlur = 15;
        ctx.shadowColor = NEON_ORG;
        ctx.fillStyle = NEON_ORG;
        ctx.fillRect(p.x - p.w / 2, p.y, p.w, 2);
        ctx.restore();
      });
    }

    // ── DRAW: Obstacles (Electronic Products) ───────────────────────────
    function drawObstacles() {
      obstacles.forEach(o => {
        const img = productImages.current[o.productType];
        if (img) {
          ctx.save();
          // Glow effect for products
          ctx.shadowBlur = 15;
          ctx.shadowColor = NEON_ORG;
          
          // Maintain original aspect ratio
          const aspect = img.width / img.height;
          const drawW = o.h * aspect;
          const surfaceY = o.onPlatform ? o.platformY : GROUND_Y;
          ctx.drawImage(img, o.x - drawW / 2, surfaceY - o.h, drawW, o.h);
          ctx.restore();
        } else {
          // Fallback if image not loaded yet
          ctx.fillStyle = NEON_ORG;
          ctx.fillRect(o.x - o.w / 2, GROUND_Y - o.h, o.w, o.h);
        }
      });
    }

    // ── DRAW: Stars helper for coins ──────────────────────────────────────
    function drawStar(cx, cy, spikes, outerRadius, innerRadius, color) {
      let rot = Math.PI / 2 * 3;
      let x = cx, y = cy;
      const step = Math.PI / spikes;
      ctx.beginPath();
      ctx.moveTo(cx, cy - outerRadius);
      for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius; y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y); rot += step;
        x = cx + Math.cos(rot) * innerRadius; y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y); rot += step;
      }
      ctx.lineTo(cx, cy - outerRadius);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    }

    // ── DRAW: Coins (unchanged logic, kept as-is) ─────────────────────────
    function drawCoins() {
      coins.forEach(c => {
        if (c.collected) return;
        ctx.save();
        ctx.translate(c.x, c.y);
        const spin = Math.sin(frameCount * 0.08);
        const w = Math.abs(spin);
        if (c.special) {
          ctx.scale(w, 1);
          const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 30);
          glow.addColorStop(0, 'rgba(255,255,255,0.8)');
          glow.addColorStop(0.5, 'rgba(233,30,99,0.4)');
          glow.addColorStop(1, 'rgba(233,30,99,0)');
          ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.fill();
          drawStar(0, 0, 5, 18, 9, '#FF4081');
          drawStar(0, 0, 5, 12, 6, '#F8BBD0');
          drawStar(0, 0, 5, 6, 3, '#FFFFFF');
        } else {
          if (w < 0.8) {
            ctx.fillStyle = '#B8860B';
            ctx.beginPath(); ctx.ellipse(spin * 2, 0, 10 * w, 10, 0, 0, Math.PI * 2); ctx.fill();
          }
          const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 15);
          glow.addColorStop(0, '#FFF176'); glow.addColorStop(1, 'rgba(253,216,53,0)');
          ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill();
          ctx.scale(w, 1);
          ctx.fillStyle = '#FDD835'; ctx.strokeStyle = '#FBC02D'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#FFEE58'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      });
    }

    function drawParticles() {
      particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s);
        ctx.restore();
      });
    }

    function drawJumpTrail() {
      if (jumpTrail.length < 2) return;
      ctx.save();
      // Draw the neon glow first
      ctx.shadowBlur = 15;
      ctx.shadowColor = NEON_ORG;
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      for (let i = 1; i < jumpTrail.length; i++) {
        const p1 = jumpTrail[i - 1];
        const p2 = jumpTrail[i];
        ctx.beginPath();
        ctx.strokeStyle = NEON_ORG;
        ctx.globalAlpha = p2.alpha * 0.6;
        ctx.lineWidth = 8 * p2.alpha; // Tapering tail
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }

      // Draw a brighter core
      ctx.shadowBlur = 0;
      for (let i = 1; i < jumpTrail.length; i++) {
        const p1 = jumpTrail[i - 1];
        const p2 = jumpTrail[i];
        ctx.beginPath();
        ctx.strokeStyle = '#fff';
        ctx.globalAlpha = p2.alpha * 0.4;
        ctx.lineWidth = 3 * p2.alpha;
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawFloaters() {
      floaters.forEach(f => {
        ctx.save();
        ctx.globalAlpha = f.alpha;
        ctx.fillStyle = '#fff';
        ctx.font = '24px "Luckiest Guy"';
        ctx.textAlign = 'center';
        ctx.fillText(f.text, f.x, f.y);
        ctx.restore();
      });
    }

    function spawnParticles(x, y, color, count = 8, isSpecial = false) {
      for (let i = 0; i < count; i++) {
        const speedMult = isSpecial ? 1.5 : 1;
        particles.push({
          x, y,
          vx: (Math.random() - 0.5) * 8 * speedMult,
          vy: (Math.random() - 0.5) * 10 * speedMult - (isSpecial ? 5 : 2),
          s: isSpecial ? 6 + Math.random() * 8 : 3 + Math.random() * 5,
          alpha: 1,
          rot: Math.random() * Math.PI * 2,
          vrot: (Math.random() - 0.5) * 0.4,
          color: color || (['#ff6b00', '#9b30ff', '#fff', '#FFD700', '#ff3399'][Math.floor(Math.random() * 5)]),
          drag: isSpecial ? 0.96 : 0.98,
        });
      }
    }

    // ── DRAW: HUD (cyberpunk reskin) ──────────────────────────────────────
    function drawHUD() {
      // Score box — top left, dark with orange border
      ctx.save();
      const scoreW = 120, scoreH = 50;
      ctx.translate(20, 20);
      ctx.fillStyle = SCORE_BG;
      ctx.strokeStyle = NEON_ORG;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(0, 0, scoreW, scoreH, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = NEON_ORG; ctx.font = '10px "Luckiest Guy"'; ctx.textAlign = 'center';
      ctx.fillText('SCORE', scoreW / 2, 17);
      ctx.fillStyle = '#fff'; ctx.font = '22px "Luckiest Guy"';
      ctx.fillText(Math.floor(score), scoreW / 2, 40);
      ctx.restore();

      // Coin display — top right
      ctx.save();
      const coinTextW = ctx.measureText(coinsCollected).width;
      ctx.translate(canvas.width - 60 - coinTextW, 45);
      const spin = Math.sin(frameCount * 0.1);
      ctx.save();
      ctx.scale(Math.abs(spin), 1);
      ctx.fillStyle = '#FDD835'; ctx.strokeStyle = '#FBC02D'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = '#fff'; ctx.font = '28px "Luckiest Guy"'; ctx.textAlign = 'left';
      ctx.fillText(coinsCollected, 18, 10);
      ctx.restore();
    }

    function drawGameOver() {
      const bw = 260, bh = 230;
      const bx = W / 2 - bw / 2, by = H / 2 - bh / 2;
      ctx.save();
      ctx.fillStyle = 'rgba(3,1,10,0.95)';
      ctx.strokeStyle = NEON_ORG;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 16); ctx.fill(); ctx.stroke();
      // Purple inner accent line
      ctx.strokeStyle = NEON_PRP; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(bx + 6, by + 6, bw - 12, bh - 12, 12); ctx.stroke();

      ctx.fillStyle = NEON_ORG; ctx.font = '32px "Luckiest Guy"'; ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', W / 2, by + 52);
      ctx.fillStyle = '#fff'; ctx.font = '20px "Luckiest Guy"';
      ctx.fillText(`SCORE: ${Math.floor(score)}`, W / 2, by + 95);
      ctx.fillText(`COINS: ${coinsCollected}`, W / 2, by + 125);

      const btnW = 150, btnH = 46;
      const btnX = W / 2 - btnW / 2, btnY = by + 155;
      ctx.fillStyle = '#1a0800';
      ctx.strokeStyle = NEON_ORG; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(btnX, btnY, btnW, btnH, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = NEON_ORG; ctx.font = '18px "Luckiest Guy"';
      ctx.fillText('RETRY', W / 2, btnY + 29);
      ctx.restore();
      return { x: btnX, y: btnY, w: btnW, h: btnH };
    }

    function drawOverlay(lines) {
      const bh = lines.length * 50 + 20;
      ctx.fillStyle = 'rgba(3,1,15,0.75)';
      ctx.fillRect(0, H / 2 - bh / 2, W, bh);
      lines.forEach(({ text, size, color, y }) => {
        ctx.fillStyle = color; ctx.font = `${size}px "Luckiest Guy"`; ctx.textAlign = 'center';
        ctx.fillText(text, W / 2, H / 2 + y);
      });
    }

    function handleJump(clientX, clientY) {
      if (state === 'idle') {
        // Aggressive Fullscreen Request (Like an App)
        const docEl = document.documentElement;
        const requestFS = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.mozRequestFullScreen || docEl.msRequestFullscreen;
        
        if (requestFS) {
          requestFS.call(docEl).then(() => {
            // Attempt to lock orientation to landscape for mobile
            if (window.screen.orientation && window.screen.orientation.lock) {
              window.screen.orientation.lock('landscape').catch(() => {});
            }
          }).catch(err => {
            console.warn("Fullscreen request failed:", err);
          });
        }

        resetGame();
      }
      if (state === 'dead') {
        const btnW = 150, btnH = 46;
        const btnX = W / 2 - btnW / 2, btnY = (H / 2 - 230 / 2) + 155;
        if (clientX >= btnX && clientX <= btnX + btnW &&
            clientY >= btnY && clientY <= btnY + btnH) {
          resetGame();
        }
        return;
      }
      if (bgAudio.current.paused && state === 'running') {
        bgAudio.current.play().catch(() => {});
      }
      // Allow jump only if on ground OR if already jumping (double jump)
      // This prevents jumping after walking off an edge into a hole
      const canJump = onGround || (jumpCount > 0 && jumpCount < MAX_JUMPS);

      if (canJump) {
        velY = JUMP_VEL; onGround = false; jumpCount++;
        jumpAudio.current.currentTime = 0;
        jumpAudio.current.play().catch(() => {});
      }
    }

    const onClick = (e) => handleJump(e.clientX, e.clientY);
    const onTouch = (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (touch) handleJump(touch.clientX, touch.clientY);
    };
    const onKey = (e) => { if (e.code === 'Space' || e.code === 'ArrowUp') handleJump(); };
    canvas.addEventListener('click', onClick);
    canvas.addEventListener('touchstart', onTouch);
    document.addEventListener('keydown', onKey);

    function resetGame() {
      score = 0; frameCount = 0; speed = 6;
      charY = GROUND_Y - CHAR_SIZE; velY = 0; onGround = true; jumpCount = 0;
      obstacles = []; nextObstacleIn = 90; 
      platforms = []; nextPlatformIn = 60;
      groundSegments = [{ x: 0, w: W * 2 }];
      nextGroundIn = 0;
      coins = []; coinsCollected = 0;
      lastMilestone = 0; milestoneTimer = 0;
      particles = []; floaters = []; jumpTrail = []; state = 'running';
      bgAudio.current.currentTime = 0;
      bgAudio.current.play().catch(() => {});
    }

    function update(dtScale) {
      if (state !== 'running') return;
      frameCount += dtScale; score += 0.1 * dtScale;

      const move = speed * dtScale;
      scrollFar  += move * 0.15;
      scrollMid  += move * 0.35;
      scrollNear += move * 0.65;
      scrollFore += move;

      velY += GRAVITY * dtScale; charY += velY * dtScale;
      
      // Vertical Collision Handling
      let stood = false;
      if (velY >= 0) {
        const charBottom = charY + CHAR_SIZE / 2;
        const charFootX = CHAR_X;

        // Check ground segments
        groundSegments.forEach(g => {
          if (charFootX > g.x && charFootX < g.x + g.w) {
            if (charBottom >= GROUND_Y && charBottom <= GROUND_Y + 25) {
              charY = GROUND_Y - CHAR_SIZE / 2;
              velY = 0; onGround = true; jumpCount = 0; stood = true;
            }
          }
        });

        // Check floating platforms
        if (!stood) {
          platforms.forEach(p => {
            if (charFootX > p.x - p.w / 2 && charFootX < p.x + p.w / 2) {
              if (charBottom >= p.y && charBottom <= p.y + 25) {
                charY = p.y - CHAR_SIZE / 2;
                velY = 0; onGround = true; jumpCount = 0; stood = true;
              }
            }
          });
        }
      }

      if (!stood) onGround = false;

      // Death check (Falling off)
      if (charY > H + 100) {
        state = 'dead';
        bgAudio.current.pause();
        if (score > bestScore) bestScore = score;
      }

      /*
      nextObstacleIn -= dtScale;
      if (nextObstacleIn <= 0) {
        const productType = products[Math.floor(Math.random() * products.length)];
        const isTall = ['fridge', 'washing_machine', 'tv', 'ac', 'vacuum'].includes(productType);
        const h = isTall ? (140 + Math.random() * 60) : (80 + Math.random() * 40);
        const w = h * 0.8; // Maintain roughly square/rect aspect
        const ox = W + 100;
        obstacles.push({ x: ox, w, h, productType });
        const coinCount = isTall ? 5 : 3;
        for (let i = 0; i < coinCount; i++) {
          const angle = (i / (coinCount - 1)) * Math.PI;
          const cx = ox + Math.cos(angle + Math.PI) * 90;
          const cy = GROUND_Y - h - 70 - Math.sin(angle) * 70;
          coins.push({ x: cx, y: cy, collected: false });
        }
        nextObstacleIn = isTall ? (180 + Math.random() * 100) : (140 + Math.random() * 80);
      }
      */

      // Spawn Platforms
      nextPlatformIn -= dtScale;
      if (nextPlatformIn <= 0) {
        const layer = Math.floor(Math.random() * 2); // 0 = mid, 1 = high
        const py = GROUND_Y - 150 - layer * 140;
        const pw = 300 + Math.random() * 300; // Longer platforms
        const px = W + pw;
        platforms.push({ x: px, y: py, w: pw });
        
        // Spawn items on the platform
        if (Math.random() > 0.4) {
          const coinCount = 3 + Math.floor(Math.random() * 3);
          for (let i = 0; i < coinCount; i++) {
            coins.push({ 
              x: px - pw/2 + (i + 0.5) * (pw / coinCount), 
              y: py - 40, 
              collected: false 
            });
          }
        }
        
        // Occasionally spawn a product on a platform (Currently disabled as per your request, but logic is here)
        /*
        if (Math.random() > 0.7) {
          const productType = products[Math.floor(Math.random() * products.length)];
          const h = 80;
          const w = h * 0.8;
          obstacles.push({ x: px, w, h, productType, onPlatform: true, platformY: py });
        }
        */

        nextPlatformIn = 120 + Math.random() * 80;
      }

      // Spawn Ground Segments (Gaps)
      nextGroundIn -= dtScale;
      if (nextGroundIn <= 0) {
        const gw = 600 + Math.random() * 800;
        const gap = 120 + Math.random() * 220;
        const gx = W + gap;
        groundSegments.push({ x: gx, w: gw });
        
        // Spawn coins on ground
        if (Math.random() > 0.2) { // High frequency
          const coinCount = 4 + Math.floor(Math.random() * 6);
          for (let i = 0; i < coinCount; i++) {
            coins.push({ 
              x: gx + (i + 0.5) * (gw / coinCount), 
              y: GROUND_Y - 40, 
              collected: false 
            });
          }
        }
        
        nextGroundIn = (gw + gap) / speed;
      }

      groundSegments.forEach(g => g.x -= move);
      groundSegments = groundSegments.filter(g => g.x > -g.w);

      platforms.forEach(p => p.x -= move);
      platforms = platforms.filter(p => p.x > -p.w);
      
      // Update obstacles on platforms
      obstacles.forEach(o => {
        o.x -= move;
        if (o.onPlatform) {
          // Keep it synced with platform vertical height
          // (Though in this game they are static in Y, so no extra work needed)
        }
      });
      obstacles = obstacles.filter(o => o.x > -100);

      if (Math.random() < 0.008 * dtScale && nextObstacleIn > 120) {
        const count = 3 + Math.floor(Math.random() * 4);
        const startX = W + 300;
        const groundType = Math.random() > 0.5;
        const safe = !obstacles.some(o => Math.abs(o.x - startX) < 150);
        if (safe) {
          for (let i = 0; i < count; i++) {
            coins.push({ x: startX + i * 40, y: groundType ? GROUND_Y - 30 : GROUND_Y - 120, collected: false });
          }
        }
      }

      if (Math.random() < 0.002 * dtScale && !coins.some(c => c.special)) {
        coins.push({ x: W + 100, y: GROUND_Y - 200 - Math.random() * 100, special: true, collected: false });
      }

      coins.forEach(c => c.x -= move);
      coins = coins.filter(c => c.x > -100 && !c.collected);

      coins.forEach(c => {
        if (!c.collected) {
          const dx = Math.abs(CHAR_X - c.x);
          const dy = Math.abs((charY + 15) - c.y);
          const range = c.special ? 35 : 30;
          if (dx < range && dy < range) {
            c.collected = true;
            if (c.special) {
              coinsCollected += 10; score += 100;
              spawnParticles(c.x, c.y, null, 50, true);
              floaters.push({ x: c.x, y: c.y, text: '+10', alpha: 1 });
              bonusAudio.current.currentTime = 0;
              bonusAudio.current.play().catch(() => {});
            } else {
              coinsCollected++; score += 10;
              spawnParticles(c.x, c.y, '#FFEE58');
              coinAudio.current.currentTime = 0;
              coinAudio.current.play().catch(() => {});
            }
          }
        }
      });

      if (coinsCollected > 0 && Math.floor(coinsCollected / 100) > lastMilestone) {
        lastMilestone = Math.floor(coinsCollected / 100);
        milestoneText = `${lastMilestone * 100} COINS!`;
        milestoneTimer = 120;
        for (let i = 0; i < 3; i++) spawnParticles(W / 2 + (i - 1) * 50, H / 2, null, 40, true);
        yayAudio.current.currentTime = 0;
        yayAudio.current.play().catch(() => {});
      }
      if (milestoneTimer > 0) milestoneTimer -= dtScale;

      particles.forEach(p => {
        p.vx *= (p.drag || 1);
        p.x += p.vx * dtScale; p.y += p.vy * dtScale;
        p.vy += 0.25 * dtScale;
        p.alpha -= 0.02 * dtScale; p.rot += p.vrot * dtScale;
      });
      particles = particles.filter(p => p.alpha > 0);
      floaters.forEach(f => { f.y -= 1.5 * dtScale; f.alpha -= 0.02 * dtScale; });
      floaters = floaters.filter(f => f.alpha > 0);

      // ── Jump Trail logic ──
      if (!onGround) {
        jumpTrail.push({ x: CHAR_X, y: charY + 15, alpha: 1.0 });
      }
      jumpTrail.forEach(t => {
        t.x -= move; // Trail moves with world
        t.alpha -= 0.03 * dtScale;
      });
      jumpTrail = jumpTrail.filter(t => t.alpha > 0 && t.x > -50);
      if (jumpTrail.length > 25) jumpTrail.shift();

      obstacles.forEach(o => o.x -= move);
      obstacles = obstacles.filter(o => o.x > -100);

      /*
      if (obstacles.some(o => {
        const img = productImages.current[o.productType];
        const actualW = img ? (o.h * (img.width / img.height)) : o.w;
        const dx = Math.abs(CHAR_X - o.x);
        const surfaceY = o.onPlatform ? o.platformY : GROUND_Y;
        const dy = Math.abs(charY - (surfaceY - o.h / 2));
        // Use a tighter hitbox for better gameplay
        return dx < (CHAR_SIZE * 0.2 + actualW * 0.4) && dy < (CHAR_SIZE * 0.3 + o.h * 0.4);
      })) {
        state = 'dead';
        bgAudio.current.pause();
        if (score > bestScore) bestScore = score;
      }
      */
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);

      // ── Night sky ──
      drawSky();
      drawStars();
      drawMoon();
      drawNeonDust();

      // ── Parallax building layers: farthest → nearest ──
      // Ghost silhouettes — very dark, near-black
      drawBuildings(bldGhost, scrollFar * 0.15, WORLD_W * 3.5, '#07040f', 0.55, false, false);
      // Far city — dark purple, no windows
      drawBuildings(bldFar,   scrollFar * 0.3,  WORLD_W * 3,   '#0d0820', 0.70, false, true);
      // Mid city — slightly lighter, sparse windows
      drawBuildings(bldMid,   scrollMid * 0.6,  WORLD_W * 2.5, '#120d26', 0.85, true,  true);
      // Near city — visible detail, full windows
      drawBuildings(bldNear,  scrollNear,        WORLD_W * 2,   '#1a0d18', 0.95, true,  true);

      // ── Ground & street ──
      drawStreetLights();
      drawGround();

      // ── Game objects ──
      drawPlatforms();
      drawJumpTrail();
      drawObstacles();
      drawCoins();
      drawParticles();
      drawFloaters();
      drawCharacter();
      drawHUD();

      // ── Overlays ──
      if (state === 'idle') drawOverlay([
        { text: 'MYG RUNNER', size: 42, color: NEON_ORG, y: -24 },
        { text: 'Tap to start', size: 20, color: '#c084fc', y: 28 },
      ]);
      if (state === 'dead') drawGameOver();

      if (milestoneTimer > 0) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, milestoneTimer / 20);
        ctx.fillStyle = NEON_ORG; ctx.font = '50px "Luckiest Guy"';
        ctx.textAlign = 'center'; ctx.strokeStyle = '#000'; ctx.lineWidth = 6;
        ctx.strokeText(milestoneText, W / 2, H / 2 - 50);
        ctx.fillText(milestoneText, W / 2, H / 2 - 50);
        ctx.restore();
      }
    }

    let lastTime = 0;
    function loop(now) {
      const dt = lastTime ? (now - lastTime) / 16.67 : 1;
      lastTime = now;
      update(Math.min(2, dt));
      draw();
      animId = requestAnimationFrame(loop);
    }
    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      bgAudio.current.pause();
      canvas.removeEventListener('click', onClick);
      canvas.removeEventListener('touchstart', onTouch);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#03010a', overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  );
}