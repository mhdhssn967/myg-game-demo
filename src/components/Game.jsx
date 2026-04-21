import React, { useEffect, useRef } from 'react';

export default function Game() {
  const canvasRef = useRef(null);
  const spriteSheet = useRef(new Image());
  const spriteLoaded = useRef(false);
  
  // Audio refs moved to top-level to fix Hook error
  const bgAudio = useRef(new Audio('/sounds/bg.mp3'));
  const jumpAudio = useRef(new Audio('/sounds/jump.mp3'));
  const coinAudio = useRef(new Audio('/sounds/coin.mp3'));
  const bonusAudio = useRef(new Audio('/sounds/bonus.mp3'));

  useEffect(() => {
    bgAudio.current.loop = true;
    bgAudio.current.volume = 0.6;
    jumpAudio.current.volume = 0.8;
    coinAudio.current.volume = 0.5;
    bonusAudio.current.volume = 0.7;

    spriteSheet.current.src = '/src/assets/run.png';
    spriteSheet.current.onload = () => {
      spriteLoaded.current = true;
    };

    // Interaction Unlocker for mobile audio policies
    const unlockAudio = () => {
      bgAudio.current.play().then(() => {
        if (state === 'idle') bgAudio.current.pause(); // Just unlock, don't start yet if idle
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
      // ✅ Use window dimensions directly — not container
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      W = canvas.width;
      H = canvas.height;
      
      const oldGround = GROUND_Y;
      GROUND_Y = H - 120;
      if (oldGround > 0 && Math.abs(charY - (oldGround - CHAR_SIZE / 2)) < 2) {
        charY = GROUND_Y - CHAR_SIZE / 2;
      } else if (charY <= 0) {
        charY = GROUND_Y - CHAR_SIZE / 2;
      }
    };

    window.addEventListener('resize', updateSize);
    updateSize();

    // ── Palette ──────────────────────────────────────────────────────────
    const SKY_TOP = '#38BDF8', SKY_MID = '#7DD3FC', SKY_BOT = '#BAE6FD';
    const MTN_FAR = '#7DC8A8', MTN_MID = '#52B25A', MTN_NEAR = '#3DA84A';
    const TREE_DARK = '#1A6B2F', TREE_MID_C = '#228B38', TREE_LITE = '#2ECC50';
    const GROUND_T = '#22c55e', GROUND_B = '#8b4513';
    const SCORE_BG = 'rgba(93, 64, 55, 0.9)'; // Brown scoreboard

    // ── Layout CONSTANTS ──────────────────────────────────────────────────
    const CHAR_X = W * 0.25;
    const GRAVITY = 0.2; // Even slower, extremely floaty
    const JUMP_VEL = -9; // Adjusted so the max height stays exactly the same
    const MAX_JUMPS = 2;

    // Sprite Settings
    const horizontalFrames = 4;
    const verticalFrames = 6;
    const totalFrames = 21;
    const frameW = 768; 
    const frameH = 448;

    // ── State ─────────────────────────────────────────────────────────────
    let state = 'idle';
    let score = 0, bestScore = 0, frameCount = 0, speed = 2; // Very slow constant speed
    let velY = 0, onGround = true, jumpCount = 0;
    let obstacles = [], nextObstacleIn = 90;
    let coins = [], coinsCollected = 0;
    let particles = [], floaters = [];
    let scrollFar = 0, scrollMid = 0, scrollNear = 0, scrollTrees = 0;
    let animId;

    // ── Generate terrain ──────────────────────────────────────────────────
    function genMountains(count, totalW, maxH, minH) {
      return Array.from({ length: count }, (_, i) => ({
        x: (i / count) * totalW,
        h: minH + Math.random() * (maxH - minH),
        w: (totalW / count) * 1.5 + Math.random() * 50,
      }));
    }
    function genTrees(count, totalW, scale, spread) {
      return Array.from({ length: count }, (_, i) => ({
        x: (i / count) * totalW + Math.random() * spread - spread / 2,
        scale: scale * (0.8 + Math.random() * 0.4),
        variant: Math.floor(Math.random() * 3),
      }));
    }

    const clouds = [
      { x: 400, y: 100, r: 60 }, { x: 900, y: 150, r: 80 }, { x: 1500, y: 120, r: 70 },
      { x: 2200, y: 80, r: 90 }, { x: 3000, y: 140, r: 65 },
    ];
    // Create base terrain dimensions
    const WORLD_W = 2000;
    const mtnFar  = genMountains(8, WORLD_W * 4, 300, 200);
    const mtnMid  = genMountains(10, WORLD_W * 3, 200, 150);
    const mtnNear = genMountains(12, WORLD_W * 2, 120, 80);
    const treesFar  = genTrees(12, WORLD_W * 2.5,  1.2, 50);
    const treesNear = genTrees(8, WORLD_W * 1.8,  2.0, 30);

    // ── Draw functions ────────────────────────────────────────────────────
    function drawSky() {
      const g = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
      g.addColorStop(0, SKY_TOP); g.addColorStop(0.6, SKY_MID); g.addColorStop(1, SKY_BOT);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, GROUND_Y);
    }

    function drawSun() {
      ctx.save();
      const rg = ctx.createRadialGradient(W - 100, 100, 10, W - 100, 100, 100);
      rg.addColorStop(0, 'rgba(255,235,59,0.8)'); rg.addColorStop(1, 'rgba(255,235,59,0)');
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(W - 100, 100, 100, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FFEB3B'; ctx.beginPath(); ctx.arc(W - 100, 100, 40, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    function drawClouds() {
      const tw = 4000;
      const s = ((scrollFar * 0.2) % tw + tw) % tw;
      [ -s, tw - s ].forEach(offsetX => {
        clouds.forEach(c => {
          const cx = offsetX + c.x;
          if (cx > W + 200 || cx < -200) return;
          ctx.save(); ctx.globalAlpha = 0.7; ctx.fillStyle = '#fff';
          [[-c.r*0.6, 0, c.r*0.8], [0, -c.r*0.2, c.r], [c.r*0.6, 0, c.r*0.75]].forEach(([dx, dy, r]) => {
            ctx.beginPath(); ctx.arc(cx + dx, c.y + dy, r, 0, Math.PI * 2); ctx.fill();
          });
          ctx.restore();
        });
      });
    }

    function drawMountains(arr, scroll, totalW, color, snowColor, opacity, baseY) {
      ctx.save(); ctx.globalAlpha = opacity; ctx.fillStyle = color;
      const s = (scroll % totalW + totalW) % totalW;
      // Draw 3 layers for seamless wrapping
      [ -s - totalW, -s, totalW - s ].forEach(offsetX => {
        arr.forEach(m => {
          const mx = offsetX + m.x - m.w / 2;
          if (mx > W + m.w || mx < -m.w) return;
          ctx.beginPath(); ctx.moveTo(mx, baseY); ctx.lineTo(mx + m.w / 2, baseY - m.h); ctx.lineTo(mx + m.w, baseY); ctx.closePath(); ctx.fill();
          if (snowColor) {
            ctx.fillStyle = snowColor;
            ctx.beginPath(); ctx.moveTo(mx + m.w*0.4, baseY - m.h*0.8); ctx.lineTo(mx + m.w/2, baseY - m.h); ctx.lineTo(mx + m.w*0.6, baseY - m.h*0.8); ctx.closePath(); ctx.fill();
            ctx.fillStyle = color;
          }
        });
      });
      ctx.restore();
    }

    function drawTrees(arr, scroll, totalW, colors) {
      const s = (scroll % totalW + totalW) % totalW;
      [ -s - totalW, -s, totalW - s ].forEach(offsetX => {
        arr.forEach(t => {
          const tx = offsetX + t.x;
          if (tx > W + 100 || tx < -100) return;
          const ts = 40 * t.scale;
          ctx.fillStyle = '#5D4037'; ctx.fillRect(tx - ts * 0.1, GROUND_Y - ts * 0.4, ts * 0.2, ts * 0.4);
          ctx.fillStyle = colors[t.variant];
          [0, 0.3, 0.6].forEach((offset, i) => {
            const w = ts * (1 - i * 0.25), h = ts * 0.6, y = GROUND_Y - ts * (0.4 + i * 0.4);
            ctx.beginPath(); ctx.moveTo(tx - w / 2, y + h); ctx.lineTo(tx, y); ctx.lineTo(tx + w / 2, y + h); ctx.closePath(); ctx.fill();
          });
        });
      });
    }

    function drawGround() {
      ctx.fillStyle = GROUND_T; ctx.fillRect(0, GROUND_Y, W, 20);
      // Fills all the way to bottom of the screen (no blue strip underneath)
      ctx.fillStyle = GROUND_B; ctx.fillRect(0, GROUND_Y + 20, W, H - GROUND_Y);

      // Animated grass detail
      ctx.strokeStyle = 'rgba(0,0,0,0.1)'; ctx.lineWidth = 2;
      for (let i = 0; i < canvas.width / 40 + 2; i++) {
        const lx = ((i * 40 - scrollNear) % canvas.width + canvas.width) % canvas.width;
        ctx.beginPath(); ctx.moveTo(lx, GROUND_Y + 20); ctx.lineTo(lx - 10, GROUND_Y + 50); ctx.stroke();
      }
    }

    function drawCharacter() {
      if (!spriteLoaded.current) return;
      
      // Static pose while jumping (frame 5), animate only while running on ground
      let frameIndex = 0;
      if (state === 'running') {
        if (onGround) {
          frameIndex = Math.floor(frameCount * 0.12) % totalFrames;
        } else {
          frameIndex = 5; // Static jump pose
        }
      }
      
      const col = frameIndex % horizontalFrames;
      const row = Math.floor(frameIndex / horizontalFrames);
      
      const aspect = frameW / frameH;
      const drawW = CHAR_SIZE * aspect;
      const drawH = CHAR_SIZE;

      ctx.save();
      // Shifted downwards slightly so the character's feet touch properly
      ctx.translate(CHAR_X, charY + 15);

      // Add dynamic sway while jumping
      if (!onGround) {
        // Leans backward going up, forward coming down
        ctx.rotate(velY * 0.025);
      }
      
      ctx.drawImage(
        spriteSheet.current,
        col * frameW, row * frameH, frameW, frameH,
        -drawW / 2, -drawH / 2, drawW, drawH
      );
      ctx.restore();
    }

    function drawObstacles() {
      obstacles.forEach(o => {
        const isTall = o.h > 80;
        
        // Draw the main body
        ctx.fillStyle = '#8B5A2B'; 
        ctx.fillRect(o.x - o.w/2, GROUND_Y - o.h, o.w, o.h);
        
        if (isTall) {
          // Mid lid for stacked look
          ctx.fillStyle = '#7a4e25'; // slightly darker
          ctx.fillRect(o.x - o.w/2 - 2, GROUND_Y - o.h/2, o.w + 4, 8);
          
          // Extra planks for height
          ctx.fillStyle = '#5C3A21';
          ctx.fillRect(o.x - o.w/6, GROUND_Y - o.h + 12, 3, o.h - 12);
        }

        // Top lid/edge
        ctx.fillStyle = '#CD853F';
        ctx.fillRect(o.x - o.w/2 - 4, GROUND_Y - o.h, o.w + 8, 12);
        
        // Box vertical planks/stripes detail
        ctx.fillStyle = '#5C3A21';
        ctx.fillRect(o.x - o.w/4, GROUND_Y - o.h + 12, 4, o.h - 12);
        ctx.fillRect(o.x + o.w/4, GROUND_Y - o.h + 12, 4, o.h - 12);
        
        // Horizontal nail/line
        ctx.fillRect(o.x - o.w/2 + 2, GROUND_Y - (isTall ? o.h*0.75 : o.h/2), o.w - 4, 3);
        if (isTall) ctx.fillRect(o.x - o.w/2 + 2, GROUND_Y - o.h*0.25, o.w - 4, 3);
      });
    }

    function drawStar(cx, cy, spikes, outerRadius, innerRadius, color) {
      let rot = Math.PI / 2 * 3;
      let x = cx;
      let y = cy;
      let step = Math.PI / spikes;

      ctx.beginPath();
      ctx.moveTo(cx, cy - outerRadius)
      for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y)
        rot += step

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y)
        rot += step
      }
      ctx.lineTo(cx, cy - outerRadius);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    }

    function drawCoins() {
      coins.forEach(c => {
        if (c.collected) return;
        ctx.save();
        ctx.translate(c.x, c.y);
        
        // Slower 3D-ish Rotation
        const spin = Math.sin(frameCount * 0.08); // Slower spin
        const w = Math.abs(spin);

        const isSpecial = c.special;

        if (isSpecial) {
           // SPECIAL STAR VISUALS
           ctx.scale(w, 1);
           
           // Glow
           const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 30);
           glow.addColorStop(0, 'rgba(255, 255, 255, 0.8)'); glow.addColorStop(0.5, 'rgba(233, 30, 99, 0.4)'); glow.addColorStop(1, 'rgba(233, 30, 99, 0)');
           ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.fill();

           drawStar(0, 0, 5, 18, 9, '#FF4081'); // Outer
           drawStar(0, 0, 5, 12, 6, '#F8BBD0'); // Inner
           drawStar(0, 0, 5, 6, 3, '#FFFFFF');  // Core highlight
        } else {
           // NORMAL COIN VISUALS
           // 3D Shadow Edge
           if (w < 0.8) {
             ctx.fillStyle = '#B8860B'; // Dark gold edge
             ctx.beginPath(); ctx.ellipse(spin * 2, 0, 10 * w, 10, 0, 0, Math.PI * 2); ctx.fill();
           }

           // Outer Glow
           const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 15);
           glow.addColorStop(0, '#FFF176'); glow.addColorStop(1, 'rgba(253, 216, 53, 0)');
           ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill();

           // Main Coin Face
           ctx.scale(w, 1);
           ctx.fillStyle = '#FDD835'; ctx.strokeStyle = '#FBC02D'; ctx.lineWidth = 2;
           ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
           
           // Inner detail
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
        ctx.fillRect(-p.s/2, -p.s/2, p.s, p.s);
        ctx.restore();
      });
    }

    function drawFloaters() {
      floaters.forEach(f => {
        ctx.save();
        ctx.globalAlpha = f.alpha;
        ctx.fillStyle = '#fff'; ctx.font = '24px "Luckiest Guy"';
        ctx.textAlign = 'center';
        ctx.fillText(f.text, f.x, f.y);
        ctx.restore();
      });
    }

    function spawnParticles(x, y, color, count = 8) {
      for (let i = 0; i < count; i++) {
        particles.push({
          x, y, 
          vx: (Math.random() - 0.5) * 8,
          vy: (Math.random() - 0.5) * 8 - 3,
          s: 3 + Math.random() * 5,
          alpha: 1,
          rot: Math.random() * Math.PI * 2,
          vrot: (Math.random() - 0.5) * 0.3,
          color: color || (['#FF5252', '#FFEB3B', '#4ADE80', '#40C4FF', '#E040FB'][Math.floor(Math.random() * 5)])
        });
      }
    }

    function drawHUD() {
      // ── SCORE BOX (Top Left) ──
      ctx.save();
      const scoreW = 120, scoreH = 50;
      ctx.translate(20, 20); // Top Left
      
      ctx.fillStyle = SCORE_BG;
      ctx.strokeStyle = '#22C55E';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.roundRect(0, 0, scoreW, scoreH, 10); ctx.fill(); ctx.stroke();
      
      ctx.fillStyle = '#4ade80'; ctx.font = '10px "Luckiest Guy"'; ctx.textAlign = 'center';
      ctx.fillText('SCORE', scoreW / 2, 18);
      ctx.fillStyle = '#fff'; ctx.font = '22px "Luckiest Guy"';
      ctx.fillText(Math.floor(score), scoreW / 2, 40);
      ctx.restore();

      // ── COIN DISPLAY (Top Right) ──
      ctx.save();
      const coinTextW = ctx.measureText(coinsCollected).width;
      ctx.translate(canvas.width - 60 - coinTextW, 45); // Top Right
      
      // Mini Rotating Coin Icon
      const spin = Math.sin(frameCount * 0.1);
      ctx.save();
      ctx.scale(Math.abs(spin), 1);
      ctx.fillStyle = '#FDD835'; ctx.strokeStyle = '#FBC02D'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.restore();

      // Coin Count Text
      ctx.fillStyle = '#fff'; ctx.font = '28px "Luckiest Guy"'; ctx.textAlign = 'left';
      ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 4;
      ctx.fillText(coinsCollected, 18, 10);
      ctx.restore();
    }

    function drawGameOver() {
      const bw = 240, bh = 220;
      const bx = W/2 - bw/2, by = H/2 - bh/2;
      
      // The Board
      ctx.save();
      ctx.fillStyle = SCORE_BG;
      ctx.strokeStyle = '#22C55E';
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 20); ctx.fill(); ctx.stroke();
      
      // Title
      ctx.fillStyle = '#FF5252'; ctx.font = '32px "Luckiest Guy"'; ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', W/2, by + 50);
      
      // Score info
      ctx.fillStyle = '#fff'; ctx.font = '20px "Luckiest Guy"';
      ctx.fillText(`SCORE: ${Math.floor(score)}`, W/2, by + 95);
      ctx.fillText(`COINS: ${coinsCollected}`, W/2, by + 125);

      // RETRY BUTTON
      const btnW = 140, btnH = 45;
      const btnX = W/2 - btnW/2, btnY = by + 150;
      
      // Button Body
      ctx.fillStyle = '#4ADE80';
      ctx.strokeStyle = '#166534';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.roundRect(btnX, btnY, btnW, btnH, 10); ctx.fill(); ctx.stroke();
      
      // Button Text
      ctx.fillStyle = '#064e3b'; ctx.font = '18px "Luckiest Guy"';
      ctx.fillText('RETRY', W/2, btnY + 28);
      
      ctx.restore();
      
      // Store button rect for click checking
      return { x: btnX, y: btnY, w: btnW, h: btnH };
    }

    function drawOverlay(lines) {
      const bh = lines.length * 50 + 20;
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, H/2 - bh/2, canvas.width, bh);
      lines.forEach(({ text, size, color, y }) => {
        ctx.fillStyle = color; ctx.font = `${size}px "Luckiest Guy"`; ctx.textAlign = 'center';
        ctx.fillText(text, canvas.width / 2, H / 2 + y);
      });
    }

    function handleJump(clientX, clientY) {
      if (state === 'idle') { 
        state = 'running'; 
        bgAudio.current.currentTime = 0;
        bgAudio.current.play().catch(e => console.log('Audio play failed:', e));
        return; 
      }
      
      if (state === 'dead') {
        // Only reset if clicked the RETRY button
        const btnW = 140, btnH = 45;
        const btnX = W/2 - btnW/2, btnY = (H/2 - 220/2) + 150;
        
        if (clientX >= btnX && clientX <= btnX + btnW && 
            clientY >= btnY && clientY <= btnY + btnH) {
          resetGame();
        }
        return;
      }
      
      // Ensure music is playing if it was somehow stalled
      if (bgAudio.current.paused && state === 'running') {
        bgAudio.current.play().catch(() => {});
      }

      if (jumpCount < MAX_JUMPS) { 
        velY = JUMP_VEL; 
        onGround = false; 
        jumpCount++; 
        
        // Play jump sound
        jumpAudio.current.currentTime = 0;
        jumpAudio.current.play().catch(e => console.log('Jump sound failed:', e));
      }
    }

    // Input handlers
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
      score = 0; frameCount = 0; speed = 2; // Start at very slow constant
      charY = GROUND_Y - CHAR_SIZE; velY = 0; onGround = true; jumpCount = 0;
      obstacles = []; nextObstacleIn = 90; coins = []; coinsCollected = 0; particles = []; floaters = []; state = 'running';
      
      // Restart background music
      bgAudio.current.currentTime = 0;
      bgAudio.current.play().catch(e => console.log('Audio play failed:', e));
    }

    function update() {
      if (state !== 'running') return;
      frameCount++; score += 0.1;
      
      // Removed speed acceleration, kept at constant speed
      scrollFar += speed * 0.2; scrollMid += speed * 0.4;
      scrollNear += speed * 0.7; scrollTrees += speed;

      velY += GRAVITY; charY += velY;
      if (charY >= GROUND_Y - CHAR_SIZE/2) {
        charY = GROUND_Y - CHAR_SIZE/2; velY = 0; onGround = true; jumpCount = 0;
      } else {
        onGround = false;
      }

      nextObstacleIn--;
      if (nextObstacleIn <= 0) {
        const isTall = Math.random() > 0.7; // 30% chance for a tall obstacle
        const h = isTall ? (110 + Math.random() * 40) : (45 + Math.random() * 30);
        const w = isTall ? (40 + Math.random() * 20) : (30 + Math.random() * 20);
        const ox = W + 100;

        obstacles.push({ x: ox, w, h });
        
        // Spawn coins in an arc over the obstacle
        const coinCount = isTall ? 5 : 3;
        for (let i = 0; i < coinCount; i++) {
          const angle = (i / (coinCount - 1)) * Math.PI;
          const cx = ox + Math.cos(angle + Math.PI) * 90; // Wider arc
          // Guaranteed height clearance (starts 70px above the box)
          const cy = GROUND_Y - h - 70 - Math.sin(angle) * 70;
          coins.push({ x: cx, y: cy, collected: false });
        }

        // Wide gap for safety
        nextObstacleIn = isTall ? (180 + Math.random() * 100) : (140 + Math.random() * 80);
      }

      // Random ground coins or lines - ONLY if no obstacle is nearby
      if (frameCount % 120 === 0 && Math.random() > 0.5 && nextObstacleIn > 120) {
        const count = 3 + Math.floor(Math.random() * 4);
        const startX = W + 300;
        const groundType = Math.random() > 0.5;
        
        // Simple safety: only spawn if the startX is reasonably far from existing obstacles
        const safe = !obstacles.some(o => Math.abs(o.x - startX) < 150);
        
        if (safe) {
          for (let i = 0; i < count; i++) {
            coins.push({ 
              x: startX + i * 40, 
              y: groundType ? GROUND_Y - 30 : GROUND_Y - 120, 
              collected: false 
            });
          }
        }
      }

      // Rare Special Coin - only one at a time
      if (frameCount % 400 === 0 && !coins.some(c => c.special)) {
        coins.push({ 
          x: W + 100, 
          y: GROUND_Y - 200 - Math.random() * 100, 
          special: true, 
          collected: false 
        });
      }

      coins.forEach(c => c.x -= speed);
      coins = coins.filter(c => c.x > -100 && !c.collected);

      // Coin collection
      coins.forEach(c => {
        if (!c.collected) {
          const dx = Math.abs(CHAR_X - c.x);
          const dy = Math.abs((charY + 15) - c.y);
          const range = c.special ? 35 : 30;
          if (dx < range && dy < range) {
            c.collected = true;
            if (c.special) {
              coinsCollected += 10;
              score += 100;
              spawnParticles(c.x, c.y, null, 20); // Multi-color confetti
              floaters.push({ x: c.x, y: c.y, text: '+10', alpha: 1 });
              bonusAudio.current.currentTime = 0;
              bonusAudio.current.play().catch(e => {});
            } else {
              coinsCollected++;
              score += 10;
              spawnParticles(c.x, c.y, '#FFEE58');
              coinAudio.current.currentTime = 0;
              coinAudio.current.play().catch(e => {});
            }
          }
        }
      });

      // Update particles & floaters
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.15;
        p.alpha -= 0.02; p.rot += p.vrot;
      });
      particles = particles.filter(p => p.alpha > 0);

      floaters.forEach(f => {
        f.y -= 1.5;
        f.alpha -= 0.02;
      });
      floaters = floaters.filter(f => f.alpha > 0);
      obstacles.forEach(o => o.x -= speed);
      obstacles = obstacles.filter(o => o.x > -100);

      if (obstacles.some(o => {
        const dx = Math.abs(CHAR_X - o.x);
        const dy = Math.abs(charY - (GROUND_Y - o.h/2));
        // Generous collision tuning
        return dx < (CHAR_SIZE*0.25 + o.w/2) && dy < (CHAR_SIZE*0.35 + o.h/2);
      })) {
        state = 'dead';
        bgAudio.current.pause(); // Stop music when player dies
        if (score > bestScore) bestScore = score;
      }
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawSky(); drawSun(); drawClouds();
      drawMountains(mtnFar,  scrollFar,  WORLD_W * 4, MTN_FAR,  '#e0f2fe', 0.4,  GROUND_Y);
      drawMountains(mtnMid,  scrollMid,  WORLD_W * 3, MTN_MID,  '#dcfce7', 0.6,  GROUND_Y);
      drawMountains(mtnNear, scrollNear, WORLD_W * 2, MTN_NEAR, null,      0.9,  GROUND_Y);
      drawTrees(treesFar, scrollFar * 1.5, WORLD_W * 2.5, [TREE_DARK, TREE_MID_C, TREE_LITE]);
      drawTrees(treesNear, scrollTrees, WORLD_W * 1.8, [TREE_MID_C, TREE_LITE, TREE_DARK]);
      drawGround(); drawObstacles(); drawCoins(); drawParticles(); drawFloaters(); drawCharacter(); drawHUD();

      if (state === 'idle') drawOverlay([
        { text: 'MYG RUNNER', size: 40, color: '#fff', y: -20 },
        { text: 'Tap to start', size: 20, color: '#4ADE80', y: 30 }
      ]);
      if (state === 'dead') drawGameOver();
    }

    function loop() { update(); draw(); animId = requestAnimationFrame(loop); }
    loop();

    return () => {
      cancelAnimationFrame(animId);
      bgAudio.current.pause(); // Clean up audio on exit
      canvas.removeEventListener('click', onClick);
      canvas.removeEventListener('touchstart', onTouch);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  return (
    // ✅ position: fixed + inset: 0 guarantees true full-screen on mobile
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: '#030712',
      overflow: 'hidden',
    }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
    </div>
  );
}

