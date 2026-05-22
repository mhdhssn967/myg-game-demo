import React, { useEffect, useRef, useState } from 'react';
import Loader from './Loader';
import StartScreen from './UI/StartScreen';
import { db, loginAnonymously } from '../firebase/config';
import { Heart } from 'lucide-react';
import { doc, setDoc, serverTimestamp, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import runSprite from '../assets/runnew.webp';
import waveSprite from '../assets/wave.webp';


export default function Game() {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [gameStatus, setGameStatus] = useState('idle');
  const [profile, setProfile] = useState(null);
  const [showProfilePrompt, setShowProfilePrompt] = useState(false);
  const [profileStep, setProfileStep] = useState('phone');
  const [tempPhone, setTempPhone] = useState('');
  const [tempName, setTempName] = useState('');
  const [tempAge, setTempAge] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [lastSubmitMsg, setLastSubmitMsg] = useState('');
  const startTriggerRef = useRef(null);
  const canvasRef = useRef(null);
  const spriteSheet = useRef(new Image());
  const spriteLoaded = useRef(false);
  const isLoadingRef = useRef(true);
  
  const [currentLevel, setCurrentLevel] = useState(1);
  const currentLevelRef = useRef(1);

  useEffect(() => {
    currentLevelRef.current = currentLevel;
  }, [currentLevel]);
  
  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);
  
  const profileRef = useRef(null);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);
  
  const logoImg = useRef(new Image());
  const logoTransImg = useRef(new Image());
  const magnetImg = useRef(new Image());
  const waveSheet = useRef(new Image());
  const logoLoaded = useRef(false);
  const logoTransLoaded = useRef(false);
  const waveLoaded = useRef(false);
  const magnetLoaded = useRef(false);
  const shipImg = useRef(new Image());
  const shipLoaded = useRef(false);
  const shipCanvas = useRef(null);

  const products = ['iphone', 'fridge', 'washing_machine', 'ac', 'laptop', 'microwave', 'tv', 'headphone', 'viccum_cleaner', 'watch', 'blender'];
  const productImages = useRef({});
  const billboardImages = useRef([]);
  const productsLoaded = useRef(0);

  const bgAudio = useRef(new Audio('/sounds/bg.mp3'));
  const jumpAudio = useRef(new Audio('/sounds/jump.mp3'));
  const coinAudio = useRef(new Audio('/sounds/coin.mp3'));
  const bonusAudio = useRef(new Audio('/sounds/bonus.mp3'));
  const yayAudio = useRef(new Audio('/sounds/yay.mp3'));
  const lightningAudio = useRef(new Audio('/sounds/lightning.mp3'));
  const shockAudio = useRef(new Audio('/sounds/shock.mp3'));
  const powerAudio = useRef(new Audio('/sounds/power.mp3'));
  const missileAudio = useRef(new Audio('/sounds/missile.mp3'));
  const explosionAudio = useRef(new Audio('/sounds/explosion.mp3'));

  // Auto-sync player profile from Firestore on startup
  useEffect(() => {
    const storedProfile = window.localStorage.getItem('myg_user_profile');
    if (storedProfile) {
      try {
        const parsed = JSON.parse(storedProfile);
        if (parsed?.phone) {
          (async () => {
            try {
              const userRef = doc(db, 'users', parsed.phone);
              const docSnap = await getDoc(userRef);
              if (docSnap.exists()) {
                const data = docSnap.data();
                let lives = data.livesLeft;
                if (lives === undefined) {
                  lives = 3;
                  await updateDoc(userRef, { livesLeft: 3 }).catch(e => console.warn(e));
                }
                const updatedProfile = {
                  phone: parsed.phone,
                  name: data.name || parsed.name || '',
                  age: data.age ? Number(data.age) : (parsed.age ? Number(parsed.age) : ''),
                  livesLeft: lives,
                };
                // Update local storage and React state
                window.localStorage.setItem('myg_user_profile', JSON.stringify(updatedProfile));
                setProfile(updatedProfile);
                console.log('Successfully synchronized profile from Firestore:', updatedProfile);
              }
            } catch (err) {
              console.warn('Failed to auto-sync profile from Firestore on mount:', err);
            }
          })();
        }
      } catch (err) {
        console.warn('Error parsing stored profile for sync:', err);
      }
    }
  }, []);

  useEffect(() => {
    const storedProfile = window.localStorage.getItem('myg_user_profile');
    if (storedProfile) {
      try {
        setProfile(JSON.parse(storedProfile));
      } catch (err) {
        console.warn('Unable to parse stored profile:', err);
      }
    }

    const productList = ['iphone', 'fridge', 'washing_machine', 'ac', 'laptop', 'microwave', 'tv', 'headphone', 'viccum_cleaner', 'watch', 'blender'];
    
    // Reset lists to avoid duplication on hot reload
    billboardImages.current = [];
    
    const imageAssets = [
      { ref: spriteSheet, src: runSprite, flag: spriteLoaded },
      { ref: waveSheet, src: waveSprite, flag: waveLoaded },
      { ref: logoImg, src: '/images/Glogo.png', flag: logoLoaded },
      { ref: logoTransImg, src: '/images/mygtrans.png', flag: logoTransLoaded },
      { ref: magnetImg, src: '/images/magnet.svg', flag: magnetLoaded },
      { ref: shipImg, src: '/images/assets/spaceship.svg', flag: shipLoaded },
    ];

    const audioAssetsList = [
      { ref: bgAudio, src: '/sounds/bg.mp3', loop: true, vol: 0.6 },
      { ref: jumpAudio, src: '/sounds/jump.mp3', vol: 0.8 },
      { ref: coinAudio, src: '/sounds/coin.mp3', vol: 0.5 },
      { ref: bonusAudio, src: '/sounds/bonus.mp3', vol: 0.7 },
      { ref: yayAudio, src: '/sounds/yay.mp3', vol: 0.8 },
      { ref: lightningAudio, src: '/sounds/lightning.mp3', vol: 0.6 },
      { ref: shockAudio, src: '/sounds/shock.mp3', vol: 0.9 },
      { ref: powerAudio, src: '/sounds/power.mp3', vol: 0.9 },
      { ref: missileAudio, src: '/sounds/missile.mp3', vol: 0.7 },
      { ref: explosionAudio, src: '/sounds/explosion.mp3', vol: 0.9 },
    ];

    const totalToLoad = imageAssets.length + productList.length + 5 + audioAssetsList.length;
    let loadedCount = 0;

    const incrementProgress = () => {
      loadedCount++;
      const progress = (loadedCount / totalToLoad) * 100;
      setLoadingProgress(progress);
      if (loadedCount >= totalToLoad) {
        // Section 2.3 - Pre-warm decodes to prevent first-draw stutter on Safari
        const allImgs = [
          ...imageAssets.map(a => a.ref.current),
          ...Object.values(productImages.current),
          ...billboardImages.current
        ];
        Promise.all(allImgs.filter(i => i && i.decode).map(i => i.decode().catch(() => {})))
          .then(() => {
            setTimeout(() => {
              setIsLoading(false);
              const stored = window.localStorage.getItem('myg_user_profile');
              let parsed = null;
              if (stored) {
                try {
                  parsed = JSON.parse(stored);
                } catch (e) {}
              }
              if (!parsed?.phone) {
                setShowProfilePrompt(true);
                setProfileStep('phone');
                setProfileError('');
              }
            }, 800); 
          });
      }
    };

    // Low-end device detection (Task 10)
    const isLowEnd = 
      (typeof navigator !== 'undefined') &&
      (navigator.hardwareConcurrency <= 4 ||
      (navigator.deviceMemory && navigator.deviceMemory < 3) ||
      /iPhone OS [89]_|iPhone OS 1[0-3]_/.test(navigator.userAgent));
    
    // Load products in batches (Task 6)
    const loadBatch = async (items, processItem, batchSize = 6) => {
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        await Promise.all(batch.map(processItem));
      }
    };

    // Load main images
    imageAssets.forEach(asset => {
      asset.ref.current.src = asset.src;
      asset.ref.current.onload = () => {
        asset.flag.current = true;
        
        // Pre-render spaceship SVG to an offscreen canvas to prevent first-draw GPU rasterization hang
        if (asset.ref === shipImg) {
          try {
            const canv = document.createElement('canvas');
            const sW = 120;
            const sH = sW * (shipImg.current.height / shipImg.current.width) || 60;
            canv.width = sW;
            canv.height = sH;
            const tctx = canv.getContext('2d');
            tctx.drawImage(shipImg.current, 0, 0, sW, sH);
            shipCanvas.current = canv;
          } catch (e) {
            console.warn('Failed to pre-render spaceship SVG:', e);
          }
        }
        
        incrementProgress();
      };
      asset.ref.current.onerror = incrementProgress;
    });

    loadBatch(productList, (p) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          productImages.current[p] = img;
          productsLoaded.current++;
          incrementProgress();
          resolve();
        };
        img.onerror = () => {
          if (img.src.endsWith('.webp')) {
            img.src = `/images/products/${p}.png`;
          } else {
            incrementProgress();
            resolve();
          }
        };
        img.src = `/images/products/${p}.webp`;
      });
    }, 6);

    // Load billboards in batches - Using optimized WebP files with automatic fallback to JPEG
    const bbIndices = Array.from({length: 5}, (_, i) => i + 1);
    loadBatch(bbIndices, (i) => {
      return new Promise((resolve) => {
        const img = new Image();
        billboardImages.current.push(img);
        img.onload = () => { incrementProgress(); resolve(); };
        img.onerror = () => {
          if (img.src.endsWith('.webp')) {
            img.src = `/images/billboards/board${i}.jpeg`;
          } else {
            console.error(`Failed to load billboard: /images/billboards/board${i}`);
            incrementProgress();
            resolve();
          }
        };
        img.src = `/images/billboards/board${i}.webp`;
      });
    }, 5);

    // Load audio
    audioAssetsList.forEach(asset => {
      asset.ref.current.src = asset.src;
      asset.ref.current.loop = asset.loop || false;
      asset.ref.current.volume = asset.vol || 1;
      // Do not block initial load progress on audio preloading. Mobile browsers block autoplay/preload
      // until first direct user touch, which makes waiting for them hang/freeze the game's loader.
      incrementProgress();
      
      // Load asynchronously in background
      asset.ref.current.load();
    });

    const unlockAudio = () => {
      audioAssetsList.forEach(asset => {
        const audio = asset.ref.current;
        audio.play().then(() => {
          if (state === 'idle') {
            audio.pause();
            audio.currentTime = 0;
          }
        }).catch(() => {});
      });
    };
    window.addEventListener('pointerdown', unlockAudio, { once: true });

    const vibrate = (pattern) => {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try { navigator.vibrate(pattern); } catch (e) {}
      }
    };

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const CHAR_SIZE = 140;
    let W = canvas.width, H = canvas.height;
    let GROUND_Y = H ? H - 120 : 0;
    let charY = GROUND_Y - CHAR_SIZE / 2;

    const updateSize = (skipBitmaps = false) => {
      // Cap DPR at 1 for low-end devices, 2 for other screens to prevent memory/GPU stutters (Section 5.2)
      const dpr = isLowEnd ? 1.0 : Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      
      W = window.innerWidth;
      H = window.innerHeight;
      CHAR_X = W * 0.12;
      const oldGround = GROUND_Y;
      GROUND_Y = H - 180;
      if (oldGround > 0 && Math.abs(charY - (oldGround - CHAR_SIZE / 2)) < 2) {
        charY = GROUND_Y - CHAR_SIZE / 2;
      } else if (charY <= 0) {
        charY = GROUND_Y - CHAR_SIZE / 2;
      }
      
      // Re-render cached backgrounds on resize (only if requested and ready)
      if (!skipBitmaps && typeof initBackgroundBitmaps === 'function') initBackgroundBitmaps();
    };
    window.addEventListener('resize', updateSize);

    // ── Cyberpunk Palette ─────────────────────────────────────────────────
    const SKY_TOP    = '#03010a';   // night deep space
    const SKY_MID    = '#0a0418';   // dark purple-navy
    const SKY_BOT    = '#120830';   // purple horizon
    
    const DAY_TOP    = '#1A2980';   // bright blue
    const DAY_MID    = '#26D0CE';   // cyan
    const DAY_BOT    = '#74ebd5';   // light teal horizon

    const NEON_ORG   = '#ff6b00';   // myG orange
    const NEON_PRP   = '#9b30ff';   // cyberpunk purple
    const SCORE_BG   = 'rgba(10, 5, 20, 0.92)';

    // ── Layout CONSTANTS ──────────────────────────────────────────────────
    let CHAR_X = W * 0.12;
    const GRAVITY = 0.4;
    const JUMP_VEL = -12.2;
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
    let introTimer = 0; // 0 to 30s
    let shockTimer = 0; // for the shocked animation
    let magnetTimer = 0; // magnet powerup duration
    let magnets = [];
    
    // ── Boss/Hazard: Spaceship ──
    let ship = { active: false, x: 0, y: 0, baseY: 0, state: 'idle', timer: 0, shootTimer: 0, shotsLeft: 0, cooldown: 0 };
    let rocket = { active: false, x: 0, y: 0, startX: 0, startY: 0, targetX: 0, targetY: 0, t: 0, rot: 0 };
    let lastShipTriggerScore = 0;
    let level2ShipSpawned = false;
    let gameTime = 0;

    // ── Task 3: Object Pooling ────────────────────────────────────────────
    const COIN_POOL_SIZE = 80;
    const coinPool = Array.from({ length: COIN_POOL_SIZE }, () => ({
      active: false, x: 0, y: 0, collected: false, special: false, w: 1
    }));
    
    const PARTICLE_POOL_SIZE = 150;
    const particlePool = Array.from({ length: PARTICLE_POOL_SIZE }, () => ({
      active: false, x: 0, y: 0, vx: 0, vy: 0, alpha: 0, color: '', s: 0, rot: 0, vrot: 0, drag: 1
    }));

    const OBSTACLE_POOL_SIZE = 15;
    const obstaclePool = Array.from({ length: OBSTACLE_POOL_SIZE }, () => ({
      active: false, x: 0, y: 0, w: 0, h: 0, productType: '', onPlatform: false, platformY: 0
    }));

    // Task 4: Reusable references for vector math
    const _vec = { x: 0, y: 0 };
    const _rect = { x: 0, y: 0, w: 0, h: 0 };

    function spawnCoin(x, y, special = false) {
      const c = coinPool.find(coin => !coin.active);
      if (c) {
        c.active = true; c.x = x; c.y = y; c.collected = false; c.special = special;
      }
    }

    function spawnParticle(x, y, color = null, size = null, isSpecial = false) {
      // Optimize: drop 60% of decorative particles on low-end mobile devices to avoid CPU spikes
      if (isLowEnd && !isSpecial && Math.random() > 0.4) return;

      const p = particlePool.find(part => !part.active);
      if (p) {
        p.active = true; p.x = x; p.y = y;
        p.vx = (Math.random() - 0.5) * (isSpecial ? 15 : 8);
        p.vy = (Math.random() - 0.5) * (isSpecial ? 15 : 8) - 2;
        p.alpha = 1.0;
        p.color = color || (Math.random() > 0.5 ? NEON_ORG : NEON_PRP);
        p.s = size || (2 + Math.random() * 5);
        p.rot = Math.random() * Math.PI * 2;
        p.vrot = (Math.random() - 0.5) * 0.2;
        p.drag = 0.95 + Math.random() * 0.04;
      }
    }

    function spawnExplosion(x, y) {
      const densityMultiplier = isLowEnd ? 0.4 : 1.0;
      // Fire
      for (let i = 0; i < 20 * densityMultiplier; i++) {
        spawnParticle(x, y, ['#ff3300', '#ff6b00', '#fff'][Math.floor(Math.random() * 3)], 8 + Math.random() * 12, true);
      }
      // Smoke
      for (let i = 0; i < 15 * densityMultiplier; i++) {
        const p = particlePool.find(part => !part.active);
        if (p) {
          p.active = true; p.x = x; p.y = y;
          p.vx = (Math.random() - 0.5) * 4;
          p.vy = (Math.random() - 0.5) * 4 - 2;
          p.alpha = 0.7;
          p.color = '#333';
          p.s = 15 + Math.random() * 20;
          p.rot = Math.random() * Math.PI * 2;
          p.vrot = (Math.random() - 0.5) * 0.05;
          p.drag = 0.98;
        }
      }
    }

    function spawnObstacle(x, y, w, h, type, onPlatform = false, platformY = 0) {
      const o = obstaclePool.find(obs => !obs.active);
      if (o) {
        o.active = true; o.x = x; o.y = y; o.w = w; o.h = h;
        o.productType = type; o.onPlatform = onPlatform; o.platformY = platformY;
      }
    }

    // ── Task 1: Offscreen Background Rendering ───────────────────────────
    const bgCanvases = {
      ghost: document.createElement('canvas'),
      far:   document.createElement('canvas'),
      mid:   document.createElement('canvas'),
      near:  document.createElement('canvas')
    };

    function preRenderBuildings(canvas, arr, totalW, bodyColor, opacity, showWindows, showNeon) {
      canvas.width = totalW;
      canvas.height = H;
      const tctx = canvas.getContext('2d');
      tctx.clearRect(0, 0, totalW, H);
      
      arr.forEach(b => {
        const bx = b.x;
        const by = GROUND_Y - b.h;
        tctx.globalAlpha = opacity;
        tctx.fillStyle = bodyColor;
        tctx.fillRect(bx, by, b.w, H - by);

        if (showNeon) {
          tctx.fillStyle = b.glowColor;
          tctx.fillRect(bx - 1, by, b.w + 2, 3);
        }

        if (showWindows && b.windowCols > 0) {
          const winW = 4, winH = 6;
          const cols = Math.max(1, Math.floor(b.w / 12));
          const rows = Math.max(1, Math.floor(b.h / 14));
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              const lit = ((r * 7 + c * 13 + Math.floor(b.windowOffset * 30)) % 5) !== 0;
              if (!lit) continue;
              const wx = bx + 5 + c * 12;
              const wy = by + 8 + r * 14;
              tctx.globalAlpha = opacity * 0.6;
              tctx.fillStyle = ((r + c) % 2 === 0) ? NEON_ORG : NEON_PRP;
              tctx.fillRect(wx, wy, winW, winH);
            }
          }
        }
      });
    }

    const initBackgroundBitmaps = () => {
      preRenderBuildings(bgCanvases.ghost, bldGhost, WORLD_W * 3.5, '#07040f', 0.55, false, false);
      preRenderBuildings(bgCanvases.far,   bldFar,   WORLD_W * 3,   '#0d0820', 0.70, false, true);
      preRenderBuildings(bgCanvases.mid,   bldMid,   WORLD_W * 2.5, '#120d26', 0.85, true,  true);
      preRenderBuildings(bgCanvases.near,  bldNear,  WORLD_W * 2,   '#1a0d18', 0.95, true,  true);
    };

    function drawCachedLayer(canvas, scroll, totalW) {
      const s = (scroll % totalW + totalW) % totalW;
      ctx.drawImage(canvas, -s, 0);
      ctx.drawImage(canvas, totalW - s, 0);
    }

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
        showLogo: Math.random() > 0.4,
        logoType: Math.random() > 0.5 ? 'solid' : 'trans',
      }));
    }

    function genBillboards(count, totalW, minY, maxY) {
      return Array.from({ length: count }, (_, i) => ({
        x: (i / count) * totalW + Math.random() * (totalW / count),
        y: minY + Math.random() * (maxY - minY),
        w: 180 + Math.random() * 260, // Clearer poster size
        h: 120 + Math.random() * 160,
        adIndex: Math.floor(Math.random() * 5),
        floatOff: Math.random() * Math.PI * 2,
        flicker: Math.random(),
        glowColor: Math.random() > 0.5 ? NEON_ORG : NEON_PRP
      }));
    }

    // Initial size setup to ensure correct W and H for generation
    updateSize(true);

    // ── 4 parallax building layers ────────────────────────────────────────
    const WORLD_W = 2400;
    // Layer 1 — farthest ghost silhouettes
    const bldGhost = genBuildings(8, WORLD_W * 3.5, H * 0.45, H * 0.75, 40, 90);
    // Layer 2 — far city
    const bldFar   = genBuildings(10, WORLD_W * 3,   H * 0.35, H * 0.60, 35, 75);
    // Layer 3 — mid city (windows)
    const bldMid   = genBuildings(12, WORLD_W * 2.5, H * 0.25, H * 0.50, 60, 120);
    // Layer 4 — near city (windows + detail)
    const bldNear  = genBuildings(8, WORLD_W * 2,   H * 0.15, H * 0.38, 80, 180);

    // Billboards
    // Adjusted another 15% up to sit in the upper mid-background
    const adsMid  = genBillboards(2, WORLD_W * 2.5, H * 0.45, H * 0.52);
    const adsNear = genBillboards(2, WORLD_W * 2,   H * 0.48, H * 0.58);

    // Initial background bitmap generation (uses bld lists)
    initBackgroundBitmaps();

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

    function lerpColor(a, b, t) {
      const ah = parseInt(a.slice(1), 16),
            bh = parseInt(b.slice(1), 16),
            ar = ah >> 16, ag = ah >> 8 & 0xff, ab = ah & 0xff,
            br = bh >> 16, bg = bh >> 8 & 0xff, bb = bh & 0xff,
            rr = ar + t * (br - ar),
            rg = ag + t * (bg - ag),
            rb = ab + t * (bb - ab);
      return '#' + ((1 << 24) + (Math.round(rr) << 16) + (Math.round(rg) << 8) + Math.round(rb)).toString(16).slice(1);
    }

    function getSkyColors(time) {
      // Colors
      const dayTop = '#1A2980', dayMid = '#26D0CE', dayBot = '#74ebd5'; // Day
      const eveTop = '#1d0c24', eveMid = '#e64a19', eveBot = '#ffcc80'; // Evening Orange Tinted
      const nightTop = '#03010a', nightMid = '#0a0418', nightBot = '#120830'; // Night

      if (time < 3000) {
        // Pure Day (0 to 50 seconds)
        return { top: dayTop, mid: dayMid, bot: dayBot, t: 1 };
      } else if (time < 3600) {
        // Transition Day -> Evening (50 to 60 seconds)
        const factor = (time - 3000) / 600;
        return {
          top: lerpColor(dayTop, eveTop, factor),
          mid: lerpColor(dayMid, eveMid, factor),
          bot: lerpColor(dayBot, eveBot, factor),
          t: 1 - factor * 0.5
        };
      } else if (time < 10200) {
        // Pure Evening (60 to 170 seconds)
        return { top: eveTop, mid: eveMid, bot: eveBot, t: 0.5 };
      } else if (time < 10800) {
        // Transition Evening -> Night (170 to 180 seconds)
        const factor = (time - 10200) / 600;
        return {
          top: lerpColor(eveTop, nightTop, factor),
          mid: lerpColor(eveMid, nightMid, factor),
          bot: lerpColor(eveBot, nightBot, factor),
          t: 0.5 * (1 - factor)
        };
      } else {
        // Pure Night (180+ seconds)
        return { top: nightTop, mid: nightMid, bot: nightBot, t: 0 };
      }
    }

    // ── DRAW: Sky Transition ─────────────────────────────────────────────
    function drawSky(t, top, mid, bot) {
      const g = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
      g.addColorStop(0,   top);
      g.addColorStop(0.5, mid);
      g.addColorStop(1,   bot);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, GROUND_Y);
    }

    // ── DRAW: Celestial (Moon/Sun) ────────────────────────────────────────
    function drawCelestial(t) {
      const mx = W * 0.15;
      const my = H * 0.12 + (1 - t) * 20;
      const sy = H * 0.12 + t * 20;

      ctx.save();
      
      // Draw Moon if t < 0.95
      if (t < 0.95) {
        ctx.save();
        ctx.globalAlpha = 1 - t;
        const halo = ctx.createRadialGradient(mx, my, 10, mx, my, 80);
        halo.addColorStop(0, 'rgba(180,140,255,0.2)'); halo.addColorStop(1, 'rgba(180,140,255,0)');
        ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(mx, my, 80, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#c4a9f0'; ctx.beginPath(); ctx.arc(mx, my, 28, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ddd0f5'; ctx.beginPath(); ctx.arc(mx - 6, my - 5, 22, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      // Draw Sun if t > 0.05
      if (t > 0.05) {
        ctx.save();
        ctx.globalAlpha = t;
        const sx = W * 0.85; // Opposite side for sun
        const halo = ctx.createRadialGradient(sx, sy, 10, sx, sy, 100);
        halo.addColorStop(0, 'rgba(255,107,0,0.4)'); halo.addColorStop(1, 'rgba(255,107,0,0)');
        ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(sx, sy, 100, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FFD700'; ctx.beginPath(); ctx.arc(sx, sy, 35, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FFF700'; ctx.beginPath(); ctx.arc(sx, sy, 25, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      
      ctx.restore();
    }

    // ── DRAW: Stars ───────────────────────────────────────────────────────
    // Pre-generate star positions once
    const stars = Array.from({ length: 80 }, () => ({
      x: Math.random() * 3000, y: Math.random() * (H * 0.55),
      r: 0.5 + Math.random() * 1.5,
      alpha: 0.4 + Math.random() * 0.6,
    }));
    function drawStars(t) {
      if (t >= 0.9 || isLowEnd) return; // Skip entirely on low-end to save 80+ draw calls per frame
      const tw = 3000;
      const s = (scrollFar * 0.05) % tw;
      ctx.save();
      stars.forEach(st => {
        const sx = ((st.x - s) % tw + tw) % tw;
        if (sx > W + 5) return;
        ctx.globalAlpha = (1 - t) * st.alpha * (0.7 + 0.3 * Math.sin(frameCount * 0.04 + st.phase || 0));
        ctx.fillStyle = '#fff';
        // Render stars as simple squares (fillRect) instead of expensive round paths (arc)
        ctx.fillRect(sx - st.r, st.y - st.r, st.r * 2, st.r * 2);
      });
      ctx.restore();
    }

    // ── DRAW: Neon ambient dust particles ─────────────────────────────────
    function drawNeonDust() {
      if (isLowEnd) return; // Skip completely on low-end to save another 60+ draw calls per frame
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
          
          if (!isLowEnd) {
            // Lamp glow bloom - costly radial gradients only drawn on high-end devices
            ctx.globalAlpha = 0.18;
            const lg = ctx.createRadialGradient(lx + 18, GROUND_Y - 58, 2, lx + 18, GROUND_Y - 58, 28);
            lg.addColorStop(0, NEON_ORG); lg.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = lg;
            ctx.beginPath(); ctx.arc(lx + 18, GROUND_Y - 58, 28, 0, Math.PI * 2); ctx.fill();
          }

          // Lamp bulb
          ctx.globalAlpha = 0.95;
          ctx.fillStyle = NEON_ORG;
          ctx.beginPath(); ctx.arc(lx + 18, GROUND_Y - 58, 4, 0, Math.PI * 2); ctx.fill();
        });
      });
      ctx.restore();
    }

    // ── DRAW: Ground (cyberpunk) ──────────────────────────────────────────
    // ── DRAW: Ground (with Gaps & Electric Traps) ─────────────────────────
    function drawGround() {
      groundSegments.forEach((g, idx) => {
        const gx = g.x;
        const gw = g.w;

        // Main dark ground strip
        ctx.fillStyle = '#0a0505';
        ctx.fillRect(gx, GROUND_Y, gw, 25);

        // Orange neon edge line on ground surface (Thicker for clarity)
        ctx.fillStyle = NEON_ORG;
        ctx.fillRect(gx, GROUND_Y, gw, 8);

        // Subtle orange glow bloom above ground
        const groundGlow = ctx.createLinearGradient(0, GROUND_Y - 20, 0, GROUND_Y);
        groundGlow.addColorStop(0, 'rgba(255,107,0,0)');
        groundGlow.addColorStop(1, 'rgba(255,107,0,0.12)');
        ctx.fillStyle = groundGlow;
        ctx.fillRect(gx, GROUND_Y - 20, gw, 20);

        // Ground fill (Opaque below the platform, gaps remain holes)
        ctx.fillStyle = '#0a0505';
        ctx.fillRect(gx, GROUND_Y + 25, gw, H - GROUND_Y);

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
            
            
            ctx.drawImage(logoTransImg.current, lx - logoSize / 2, GROUND_Y + 25, logoSize, logoSize);
          }
          ctx.restore();
        }

        // ── Gap Traps (Electric Fields) ──
        ctx.fillStyle = NEON_PRP;
        ctx.fillRect(gx, GROUND_Y, 2, 80); // Left containment wall
        ctx.fillRect(gx + gw - 2, GROUND_Y, 2, 80); // Right containment wall

        // If there's a gap after this segment, fill it with electricity
        if (idx < groundSegments.length - 1) {
          const gapX = gx + gw;
          const nextX = groundSegments[idx + 1].x;
          const gapW = nextX - gapX;
          drawGapElectricity(gapX, gapW);
        }
      });
    }

    function drawGapElectricity(x, w) {
      if (x + w < 0 || x > W) return;
      
      const beamCount = isLowEnd ? 1 : 3; // 1 beam for low-end, 3 for regular
      ctx.save();
      for (let i = 0; i < beamCount; i++) {
        if (Math.random() > 0.6) continue;
        
        ctx.beginPath();
        ctx.strokeStyle = i % 2 === 0 ? '#00f2ff' : NEON_PRP;
        ctx.lineWidth = 1.5 + Math.random() * 2;
        ctx.globalAlpha = 0.4 + Math.random() * 0.4;
        
        const y = GROUND_Y + 20 + i * 20;
        ctx.moveTo(x, y);
        
        // Jagged electricity steps (3 steps for low-end, 6 for regular)
        const steps = isLowEnd ? 3 : 6;
        for (let s = 1; s <= steps; s++) {
          const sx = x + (w / steps) * s;
          const sy = y + (Math.random() - 0.5) * 15;
          ctx.lineTo(sx, sy);
        }
        
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawBillboards(list, scroll, totalW, alpha = 1) {
      list.forEach(ad => {
        const margin = 1000;
        const x = ((ad.x - scroll + margin) % totalW + totalW) % totalW - margin;
        if (x < -800 || x > W + 800) return;

        const img = billboardImages.current[ad.adIndex];
        if (!img || !img.complete) return;

        const floatY = Math.sin(frameCount * 0.02 + ad.floatOff) * 12;
        const drawY = ad.y + floatY;
        
        // Maintain aspect ratio
        const aspect = img.width / img.height;
        const h = ad.h;
        const w = h * aspect;

        ctx.save();
        ctx.globalAlpha = alpha;
        
        // Flicker effect
        if (Math.random() > 0.985 && ad.flicker > 0.7) ctx.globalAlpha *= 0.2;

        // Glow
        
        

        // Frame
        ctx.fillStyle = '#0a0a1a';
        ctx.strokeStyle = ad.glowColor;
        ctx.lineWidth = 3;
        
        ctx.beginPath();
        ctx.roundRect(x - w/2, drawY - h/2, w, h, 6);
        ctx.fill();
        ctx.stroke();

        // Image
        ctx.drawImage(img, x - w/2 + 5, drawY - h/2 + 5, w - 10, h - 10);

        // Support poles (futuristic dual poles)
        
        ctx.strokeStyle = '#1a1a2e';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x - w/4, drawY + h/2);
        ctx.lineTo(x - w/4, H);
        ctx.moveTo(x + w/4, drawY + h/2);
        ctx.lineTo(x + w/4, H);
        ctx.stroke();

        ctx.restore();
      });
    }

    // ── DRAW: Electrifying Brand Intro ───────────────────────────────────
    function drawBrandIntro() {
      const elapsed = introTimer / 60; // seconds
      if (elapsed > 6) return;

      const alpha = elapsed > 4.5 ? (6 - elapsed) / 1.5 : 1;
      ctx.save();
      ctx.globalAlpha = alpha;

      const segmentDuration = 2;
      const segmentIndex = Math.floor(elapsed / segmentDuration);
      const segmentTime = elapsed % segmentDuration;
      
      // ── Lightning Bolts (Only at the start of each segment) ──
      if (segmentTime < 0.4 && Math.random() > 0.4) {
        // Play sound occasionally with the bolt
        if (Math.random() > 0.7) {
          lightningAudio.current.currentTime = 0;
          lightningAudio.current.play().catch(() => {});
        }

        ctx.strokeStyle = NEON_ORG;
        ctx.lineWidth = 2 + Math.random() * 3;
        
        
        ctx.beginPath();
        let lx = W/2 + (Math.random() - 0.5) * W * 0.8, ly = 0;
        ctx.moveTo(lx, ly);
        for (let i = 0; i < 8; i++) {
          lx += (Math.random() - 0.5) * 120;
          ly += Math.random() * (H / 8);
          ctx.lineTo(lx, ly);
        }
        ctx.stroke();
      }

      // ── Text Sequence ──
      const texts = [
        { t: 0, d: 2, txt: "WELCOME TO myG", sub: "Empowering lives since 2006", logo: true },
        { t: 2, d: 2, txt: "THE DIGITAL HUB", sub: "Kerala's No.1 tech destination" },
        { t: 4, d: 2, txt: "150+ SHOWROOMS", sub: "One vision, connecting millions" }
      ];

      const current = texts[segmentIndex];
      if (current && elapsed < 6) {
        ctx.textAlign = 'center';
        
        
        
        // Vertical position - moved upper (25% of height instead of 50%)
        const baseY = H * 0.35;
        
        // Fast flicker/lightning transition
        const jitterX = (Math.random() - 0.5) * 5 * (segmentTime < 0.2 ? 15 : 0);
        
        // Scale text for mobile
        const mainSize = Math.min(55, W * 0.09);
        const subSize = Math.min(22, W * 0.045);

        // Main Text
        ctx.fillStyle = NEON_ORG;
        ctx.font = `900 ${mainSize}px "Exo 2", sans-serif`;
        
        if (current.logo && logoTransLoaded.current) {
          const lSize = Math.min(220, W * 0.4);
          ctx.drawImage(logoTransImg.current, W/2 - lSize/2 + jitterX, baseY - lSize/2 - 40, lSize, lSize);
        } else {
          ctx.fillText(current.txt, W/2 + jitterX, baseY, W * 0.9);
        }

        // Subtext
        ctx.fillStyle = '#fff';
        ctx.font = `${subSize}px "Orbitron", sans-serif`;
        ctx.fillText(current.sub, W/2 - jitterX, baseY + mainSize * 0.8 + 10, W * 0.95);
      }

      ctx.restore();
    }

    // ── DRAW: Character (unchanged) ───────────────────────────────────────
    function drawCharacter() {
      const isIdle = (state === 'idle');
      const sheet = isIdle ? waveSheet.current : spriteSheet.current;
      const loaded = isIdle ? waveLoaded.current : spriteLoaded.current;
      
      if (!loaded) return;

      // Dynamic Frame Size detection
      const fw = isIdle ? 1024 : (sheet.width / 5);
      const fh = isIdle ? 1024 : (sheet.height / 5);

      const cols = isIdle ? (Math.floor(sheet.width / fw) || 1) : 5;
      const rows = isIdle ? (Math.floor(sheet.height / fh) || 1) : 5;
      // For the running animation (5x5), there are 25 frames
      const sheetTotalFrames = isIdle ? (cols * rows) : 25;
      
      let frameIndex = 0;
      const RUN_FPS = 10 + (speed * 2.0);
      const IDLE_FPS = 10;
      const seconds = (frameCount * 16.67) / 1000;
      
      if (isIdle) {
        frameIndex = Math.floor(seconds * IDLE_FPS) % sheetTotalFrames;
      } else if (state === 'running') {
        if (onGround) {
          frameIndex = Math.floor(seconds * RUN_FPS) % sheetTotalFrames;
        } else {
          // Frame 5 is usually the 'jump' frame in the 4-column layout
          frameIndex = Math.min(5, sheetTotalFrames - 1);
        }
      }
      
      const col = frameIndex % cols;
      const row = Math.floor(frameIndex / cols);
      const aspect = fw / fh;
      const drawW = CHAR_SIZE * aspect;
      const drawH = CHAR_SIZE;

      ctx.save();
      
      // Jitter for shock effect
      let jitterX = 0, jitterY = 0;
      if (state === 'shocked') {
        jitterX = (Math.random() - 0.5) * 12;
        jitterY = (Math.random() - 0.5) * 12;
        // Draw some lightning sparks around the character
        if (Math.random() > 0.4) {
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-20, -20); ctx.lineTo(20, 20); ctx.stroke();
        }
      }

      // Magnetic rings
      if (magnetTimer > 0) {
        ctx.save();
        ctx.translate(CHAR_X, charY + 42);
        for (let i = 1; i <= 3; i++) {
          ctx.beginPath();
          ctx.arc(0, 0, 40 + i * 15 + Math.sin(frameCount * 0.1) * 5, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 0, 0, ${0.4 / i})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        ctx.restore();
      }

      ctx.translate(CHAR_X + jitterX, charY + 42 + jitterY);
      if (state === 'running' && !onGround) ctx.rotate(velY * 0.065);
      
      // If shocked, we use a single frame of the running sheet
      const currentSheet = sheet;
      const currentCols = cols;
      const currentFrame = state === 'shocked' ? 0 : frameIndex;

      ctx.drawImage(
        currentSheet,
        (currentFrame % currentCols) * fw, Math.floor(currentFrame / currentCols) * fh, fw, fh,
        -drawW / 2, -drawH / 2, drawW, drawH
      );
      
      // Strobe effect for shock (Using canvas composite to limit flash to character pixels)
      if (state === 'shocked' && Math.floor(frameCount * 0.5) % 2 === 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'difference';
        ctx.fillStyle = 'white';
        ctx.fillRect(-drawW / 2, -drawH / 2, drawW, drawH);
        // Mask the inversion back to the character's shape
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(
          currentSheet,
          (currentFrame % currentCols) * fw, Math.floor(currentFrame / currentCols) * fh, fw, fh,
          -drawW / 2, -drawH / 2, drawW, drawH
        );
        ctx.restore();
      }

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

        // Neon Glow (Fake-glow Layered strokes)
        ctx.strokeStyle = 'rgba(255,107,0,0.2)';
        ctx.lineWidth = 8;
        ctx.strokeRect(p.x - p.w / 2, p.y, p.w, 15);
        ctx.strokeStyle = 'rgba(255,107,0,0.5)';
        ctx.lineWidth = 4;
        ctx.strokeRect(p.x - p.w / 2, p.y, p.w, 15);
        
        ctx.fillStyle = NEON_ORG;
        ctx.fillRect(p.x - p.w / 2, p.y, p.w, 2);
        ctx.restore();
      });
    }

    function drawObstacles() {
      obstaclePool.forEach(o => {
        if (!o.active) return;
        const img = productImages.current[o.productType];
        if (img) {
          ctx.save();
          const aspect = img.width / img.height;
          const drawW = o.h * aspect;
          const surfaceY = o.onPlatform ? o.platformY : GROUND_Y;
          ctx.drawImage(img, o.x - drawW / 2, surfaceY - o.h, drawW, o.h);
          ctx.restore();
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
      coinPool.forEach(c => {
        if (!c.active) return;
        ctx.save();
        ctx.translate(c.x, c.y);
        const isSpecial = !!c.special;
        const spin = Math.sin(frameCount * (isSpecial ? 0.25 : 0.16));
        const w = Math.abs(spin);
        const rad = isSpecial ? 20 : 14;
        const lSize = isSpecial ? 24 : 16;

        // Neon Glow
        const glowRad = isSpecial ? 35 : 20;
        const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, glowRad);
        glow.addColorStop(0, isSpecial ? 'rgba(255,107,0,0.8)' : 'rgba(255,107,0,0.6)');
        glow.addColorStop(1, 'rgba(255,107,0,0)');
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, glowRad, 0, Math.PI * 2); ctx.fill();

        ctx.scale(w, 1);
        ctx.fillStyle = NEON_ORG;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = isSpecial ? 4 : 3;
        ctx.beginPath(); ctx.arc(0, 0, rad, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

        if (logoLoaded.current) {
          ctx.drawImage(logoImg.current, -lSize / 2, -lSize / 2, lSize, lSize);
        }
        ctx.restore();

        // Collision check
        const dx = Math.abs(CHAR_X - c.x);
        const dy = Math.abs((charY + 42) - c.y);
        if (dx < 55 && dy < 55 && !c.collected) {
          c.collected = true;
          c.active = false;
          if (isSpecial) {
            coinsCollected += 10;
            score += 50;
            floaters.push({ x: c.x, y: c.y, text: '+10', alpha: 1.0 });
            yayAudio.current.currentTime = 0;
            yayAudio.current.play().catch(() => {});
          } else {
            coinsCollected++;
            score += 10;
            coinAudio.current.currentTime = 0;
            coinAudio.current.play().catch(() => {});
          }
          for (let i = 0; i < (isSpecial ? 25 : 5); i++) {
            spawnParticle(c.x, c.y, isSpecial ? '#fff' : NEON_ORG, isSpecial ? 4 + Math.random() * 6 : null, isSpecial);
          }
        }
      });
    }

    function drawParticles() {
      particlePool.forEach(p => {
        if (!p.active) return;
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

    function drawSpaceship() {
      if (!ship.active) return;
      ctx.save();
      ctx.translate(ship.x, ship.y);
      
      // Draw the pre-rendered offscreen canvas spaceship to completely eliminate first-draw SVG lags
      if (shipCanvas.current) {
        ctx.drawImage(shipCanvas.current, -shipCanvas.current.width / 2, -shipCanvas.current.height / 2);
        
        // Add a pulsing neon glow behind the ship
        const g = ctx.createRadialGradient(0, 0, 10, 0, 0, 80);
        g.addColorStop(0, 'rgba(0, 255, 255, 0.2)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, 0, 80, 0, Math.PI*2); ctx.fill();
      } else {
        // Comical Cyberpunk Saucer (Fallback)
        const w = 120, h = 40;
        ctx.fillStyle = '#1a1a2e';
        ctx.strokeStyle = NEON_PRP;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(0, 0, w/2, h/2, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      }

      // Aiming laser line if aiming
      if (ship.state === 'aiming' && ship.shootTimer < 60) {
        ctx.strokeStyle = 'rgba(255, 0, 0, ' + (0.4 + Math.sin(frameCount*0.6)*0.4) + ')';
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(CHAR_X - ship.x, charY - ship.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.restore();
    }

    function drawRocket() {
      if (!rocket.active) return;
      ctx.save();
      ctx.translate(rocket.x, rocket.y);
      
      // Better Missile Visuals: Comical wobble
      const wobble = Math.sin(frameCount * 0.3) * 0.15;
      ctx.rotate(rocket.rot + wobble);

      const rw = 45, rh = 18;
      
      // Improved Neon exhaust tail
      const tailGlow = ctx.createLinearGradient(0, 0, -rw * 1.5, 0);
      tailGlow.addColorStop(0, '#fff');
      tailGlow.addColorStop(0.2, NEON_ORG);
      tailGlow.addColorStop(1, 'rgba(255, 0, 255, 0)');
      
      ctx.fillStyle = tailGlow;
      ctx.beginPath();
      ctx.moveTo(-rw/2, -rh/2);
      ctx.lineTo(-rw * 1.8 - Math.random()*15, 0);
      ctx.lineTo(-rw/2, rh/2);
      ctx.fill();

      // Rocket Body with gradient
      const bodyGrd = ctx.createLinearGradient(0, -rh/2, 0, rh/2);
      bodyGrd.addColorStop(0, '#ff4d4d');
      bodyGrd.addColorStop(1, '#990000');
      ctx.fillStyle = bodyGrd;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      
      // Pointy nose
      ctx.beginPath();
      ctx.moveTo(rw/2 + 10, 0); 
      ctx.lineTo(rw/2, -rh/2);
      ctx.lineTo(-rw/2, -rh/2);
      ctx.lineTo(-rw/2, rh/2);
      ctx.lineTo(rw/2, rh/2);
      ctx.closePath();
      ctx.fill(); ctx.stroke();

      // Neon stripes
      ctx.strokeStyle = '#0ff';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-5, -rh/2); ctx.lineTo(-5, rh/2); ctx.stroke();

      // Fins
      ctx.fillStyle = '#1a1a2e';
      ctx.beginPath();
      ctx.moveTo(-rw/2, rh/2); ctx.lineTo(-rw/2-12, rh/2+10); ctx.lineTo(-rw/4, rh/2); ctx.fill();
      ctx.stroke();
      ctx.moveTo(-rw/2, -rh/2); ctx.lineTo(-rw/2-12, -rh/2-10); ctx.lineTo(-rw/4, -rh/2); ctx.fill();
      ctx.stroke();

      ctx.restore();
    }

    // ── DRAW: HUD (cyberpunk reskin) ──────────────────────────────────────
    function drawHUD() {
      if (state === 'idle') return;

      // Coin display — top right
      ctx.save();
      const coinY = 38;
      ctx.font = '24px "Luckiest Guy"';
      const coinText = coinsCollected.toString();
      const textW = ctx.measureText(coinText).width;
      
      // Spinning myG coin icon
      const coinX = W - 25 - textW - 25;
      ctx.save();
      ctx.translate(coinX, coinY);
      const spin = Math.sin(frameCount * 0.1);
      ctx.fillStyle = NEON_ORG; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
       
      ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

      // Inner rim
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.stroke();
      
      if (logoLoaded.current) {
        const lSize = 16;
        ctx.drawImage(logoImg.current, -lSize / 2, -lSize / 2, lSize, lSize);
      } else {
        ctx.fillStyle = '#fff';
        ctx.font = '900 12px "Exo 2"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('G', 0, 0);
      }
      ctx.restore();

      // Text
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
       
      ctx.fillText(coinText, W - 15, coinY + 2);
      ctx.restore();
    }

    function drawGameOver() {
      const bw = 260, bh = 290;
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
      // ctx.fillText(`SCORE: ${Math.floor(score)}`, W / 2, by + 95);
      ctx.fillText(`COINS: ${coinsCollected}`, W / 2, by + 125);

      // Check lives left to enable/disable retry button
      let currentProfile = profileRef.current;
      if (!currentProfile?.phone) {
        const stored = window.localStorage.getItem('myg_user_profile');
        if (stored) {
          try {
            currentProfile = JSON.parse(stored);
          } catch (e) {
            console.warn(e);
          }
        }
      }
      const livesLeftVal = currentProfile?.livesLeft !== undefined ? currentProfile.livesLeft : 3;
      const hasLives = livesLeftVal > 0;

      // RETRY Button
      const btnW = 150, btnH = 46;
      const btnX = W / 2 - btnW / 2, btnY = by + 155;
      if (hasLives) {
        ctx.fillStyle = '#1a0800';
        ctx.strokeStyle = NEON_ORG; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(btnX, btnY, btnW, btnH, 8); ctx.fill(); ctx.stroke();
        ctx.fillStyle = NEON_ORG; ctx.font = '18px "Luckiest Guy"';
        ctx.fillText('RETRY', W / 2, btnY + 29);
      } else {
        // Disabled style: grayed out, low opacity, no orange neon stroke
        ctx.fillStyle = '#111111';
        ctx.strokeStyle = '#333333'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(btnX, btnY, btnW, btnH, 8); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#555555'; ctx.font = '18px "Luckiest Guy"';
        ctx.fillText('RETRY', W / 2, btnY + 29);
      }

      // GO TO HOME Button
      const homeBtnX = W / 2 - btnW / 2, homeBtnY = by + 215;
      ctx.fillStyle = '#0f051d';
      ctx.strokeStyle = NEON_PRP; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(homeBtnX, homeBtnY, btnW, btnH, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = NEON_PRP; ctx.font = '18px "Luckiest Guy"';
      ctx.fillText('HOME', W / 2, homeBtnY + 29);

      ctx.restore();
      return {
        retry: { x: btnX, y: btnY, w: btnW, h: btnH },
        home: { x: homeBtnX, y: homeBtnY, w: btnW, h: btnH }
      };
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
        // Prevent launching the game if profile is missing
        let currentProfile = profileRef.current;
        if (!currentProfile?.phone) {
          const stored = window.localStorage.getItem('myg_user_profile');
          if (stored) {
            try {
              currentProfile = JSON.parse(stored);
            } catch (e) {
              console.warn(e);
            }
          }
        }

        if (!currentProfile?.phone) {
          // Trigger profile prompt UI and abort starting game!
          setShowProfilePrompt(true);
          setProfileStep('phone');
          setProfileError('');
          return;
        }

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
            console.warn("Document FS failed, trying Canvas:", err);
            // Fallback for some mobile browsers: try the canvas itself
            const reqCanvas = canvas.requestFullscreen || canvas.webkitRequestFullscreen;
            if (reqCanvas) reqCanvas.call(canvas).catch(() => {});
          });
        }
        
        // Final mobile trick: scroll to top to hide address bars
        window.scrollTo(0, 0);

        resetGame();
      }
      if (state === 'dead') {
        const bw = 260, bh = 290;
        const bx = W / 2 - bw / 2, by = H / 2 - bh / 2;
        const btnW = 150, btnH = 46;
        
        // Retry button click check
        const btnX = W / 2 - btnW / 2, btnY = by + 155;
        if (clientX >= btnX && clientX <= btnX + btnW &&
            clientY >= btnY && clientY <= btnY + btnH) {
          // Strictly disable retry button if no lives are left
          let currentProfile = profileRef.current;
          if (!currentProfile?.phone) {
            const stored = window.localStorage.getItem('myg_user_profile');
            if (stored) {
              try {
                currentProfile = JSON.parse(stored);
              } catch (e) {
                console.warn(e);
              }
            }
          }
          const livesLeftVal = currentProfile?.livesLeft !== undefined ? currentProfile.livesLeft : 3;
          if (livesLeftVal <= 0) {
            console.log('Retry button clicked but ignored: 0 lives remaining');
            return;
          }
          resetGame();
          return;
        }

        // Home button click check
        const homeBtnX = W / 2 - btnW / 2, homeBtnY = by + 215;
        if (clientX >= homeBtnX && clientX <= homeBtnX + btnW &&
            clientY >= homeBtnY && clientY <= homeBtnY + btnH) {
          state = 'idle';
          setGameStatus('idle');
          if (document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
          }
          return;
        }
        return;
      }
      if (bgAudio.current.paused && state === 'running') {
        bgAudio.current.play().catch(() => {});
      }
      // Allow jump if on ground OR if already jumped and have remaining jumps
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
      score = 0; frameCount = 0; speed = 4.0; // Start Level 1 speed at 4.0
      gameTime = 0;
      lastShipTriggerScore = 0;
      level2ShipSpawned = false;
      setCurrentLevel(1);
      charY = GROUND_Y - CHAR_SIZE; velY = 0; onGround = true; jumpCount = 0;
      obstacles = []; nextObstacleIn = 90; 
      platforms = []; nextPlatformIn = 60;
      groundSegments = [{ x: 0, w: W * 2 }];
      nextGroundIn = 0;
      coins = []; coinsCollected = 0;
      lastMilestone = 0; milestoneTimer = 0;
      magnets = []; magnetTimer = 0;
      particles = []; floaters = []; jumpTrail = []; state = 'running';
      setGameStatus('running');
      introTimer = 0; shockTimer = 0;
      ship.active = false; ship.cooldown = 0; ship.state = 'idle';
      rocket.active = false;
      bgAudio.current.currentTime = 0;
      bgAudio.current.play().catch(() => {});
    }
    startTriggerRef.current = resetGame;

    function update(dtScale) {
      frameCount += dtScale; // Always increment for animations (like wave)

      // ── Task 3/4: Update Visuals (Moved to top so they play even after death) ──
      particlePool.forEach(p => {
        if (!p.active) return;
        p.vx *= (p.drag || 1);
        p.x += p.vx * dtScale; p.y += p.vy * dtScale;
        p.vy += 0.25 * dtScale;
        p.alpha -= 0.02 * dtScale; p.rot += p.vrot * dtScale;
        if (p.alpha <= 0) p.active = false;
      });
      floaters.forEach(f => { f.y -= 1.5 * dtScale; f.alpha -= 0.02 * dtScale; });
      floaters = floaters.filter(f => f.alpha > 0);
      jumpTrail.forEach(t => {
        t.x -= (speed * dtScale); // Approximate move
        t.alpha -= 0.03 * dtScale;
      });
      jumpTrail = jumpTrail.filter(t => t.alpha > 0 && t.x > -50);
      
      if (state === 'shocked') {
        shockTimer -= dtScale;
        // Continuous pulsed vibration
        if (Math.floor(frameCount) % 10 === 0) {
          vibrate(60);
        }
        if (shockTimer <= 0) {
          state = 'dead';
          setGameStatus('dead');
          if (score > bestScore) bestScore = score;
          submitScore(coinsCollected);
        }
        return; // Stop everything else
      }

      if (state !== 'running') return;
      score += 0.1 * dtScale;
      introTimer += dtScale;
      gameTime += dtScale;

      // Sync calculated level with state
      const calculatedLevel = gameTime < 3600 ? 1 : (gameTime < 10800 ? 2 : 3);
      if (calculatedLevel !== currentLevelRef.current) {
        const prevLevel = currentLevelRef.current;
        currentLevelRef.current = calculatedLevel;
        setCurrentLevel(calculatedLevel);
        
        if (calculatedLevel > prevLevel) {
          milestoneText = `LEVEL ${calculatedLevel}!`;
          milestoneTimer = 180;
          for (let i = 0; i < 8; i++) {
            spawnParticle(W / 2 + (i - 3.5) * 50, H / 2, '#ff6b00', 35, true);
          }
          yayAudio.current.currentTime = 0;
          yayAudio.current.play().catch(() => {});
        }
      }

      // Level-dependent speed logic
      if (calculatedLevel === 1) {
        if (speed < 5.5) speed += 0.0008 * dtScale;
      } else if (calculatedLevel === 2) {
        if (speed < 6.0) speed = 6.0;
        if (speed < 7.5) speed += 0.001 * dtScale;
      } else {
        if (speed < 8.0) speed = 8.0;
        if (speed < 9.5) speed += 0.0012 * dtScale;
      }

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

      // Death check (Falling off or hitting electricity)
      // We check if the character is NOT over any solid ground segment
      const overGround = groundSegments.some(g => CHAR_X >= g.x && CHAR_X <= g.x + g.w);
      
      if (charY > GROUND_Y + 15 && !overGround && state === 'running') {
        state = 'shocked';
        setGameStatus('shocked');
        shockTimer = 80;
        bgAudio.current.pause();
        shockAudio.current.currentTime = 0;
        shockAudio.current.play().catch(() => {});
        // Haptic feedback
        vibrate([200, 100, 200]);
        // Stop vertical momentum to stay in the gap
        velY = 0;
      }
      
      if (charY > H + 200) {
        state = 'dead';
        setGameStatus('dead');
        bgAudio.current.pause();
        if (score > bestScore) bestScore = score;
        submitScore(coinsCollected);
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
        // Spawn items on the platform (EXCLUSIVE: Either coins OR rare magnet)
        if (Math.random() > 0.92) {
          // Spawn Magnet
          magnets.push({ x: px, y: py - 50 });
        } else if (Math.random() > 0.4) {
          // Spawn Coins in a neat line
          const coinCount = Math.floor(pw / 60) - 1;
          const pxStart = px - pw/2 + 30;
          const hasSpecial = Math.random() > 0.75 && coinCount > 0;
          const specialIndex = hasSpecial ? Math.floor(Math.random() * coinCount) : -1;
          for (let i = 0; i < coinCount; i++) {
            const isSpecial = (i === specialIndex);
            spawnCoin(pxStart + i * 60, py - 40, isSpecial);
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
        const isFreePlay = (introTimer / 60) <= 15;
        const gw = isFreePlay ? 1200 : (600 + Math.random() * 800);
        
        let gap = -10;
        if (!isFreePlay) {
          const currentLvl = gameTime < 7200 ? 1 : (gameTime < 14400 ? 2 : 3);
          if (currentLvl === 1) {
            gap = 80 + Math.random() * 80; // Easy short gaps for Level 1
          } else if (currentLvl === 2) {
            gap = 120 + Math.random() * 150; // Medium gaps for Level 2
          } else {
            gap = 140 + Math.random() * 200; // Harder/longer gaps for Level 3
          }
        }
        
        const gx = W + gap;
        groundSegments.push({ x: gx, w: gw });
        
        // Spawn coins on ground
        // Spawn items on ground (EXCLUSIVE: Either coins OR rare magnet)
        if (Math.random() > 0.94) {
          // Spawn Magnet
          magnets.push({ x: gx + 200, y: GROUND_Y - 50 });
        }
        
        nextGroundIn = (gw + gap) / speed;
      }

      groundSegments.forEach(g => g.x -= move);
      groundSegments = groundSegments.filter(g => g.x + g.w > -400);

      magnets.forEach(m => m.x -= move);
      magnets = magnets.filter(m => m.x > -100);

      platforms.forEach(p => p.x -= move);
      platforms = platforms.filter(p => p.x > -p.w);
      
      // Update obstacles (Task 3: Pooling)
      obstaclePool.forEach(o => {
        if (!o.active) return;
        o.x -= move;
        if (o.x < -200) {
          o.active = false;
        } else if (state === 'running') {
          const img = productImages.current[o.productType];
          const actualW = img ? (o.h * (img.width / img.height)) : o.w;
          const dx = Math.abs(CHAR_X - o.x);
          const surfaceY = o.onPlatform ? o.platformY : GROUND_Y;
          const dy = Math.abs(charY - (surfaceY - o.h / 2));
          if (dx < (CHAR_SIZE * 0.2 + actualW * 0.4) && dy < (CHAR_SIZE * 0.3 + o.h * 0.4)) {
            state = 'dead';
            setGameStatus('dead');
            bgAudio.current.pause();
            if (score > bestScore) bestScore = score;
            submitScore(coinsCollected);
          }
        }
      });



      // Update Coins (Task 3: Pooling)
      coinPool.forEach(c => {
        if (!c.active) return;
        c.x -= move;
        if (c.x < -100) c.active = false;
        
        if (magnetTimer > 0 && !c.collected) {
           if (c.x < W) {
             const dx = (CHAR_X - c.x);
             const dy = ((charY + 42) - c.y);
             const dist = Math.sqrt(dx*dx + dy*dy);
             if (dist < 350) {
               c.x += (dx / dist) * 12 * dtScale;
               c.y += (dy / dist) * 12 * dtScale;
             }
           }
        }
      });

      // Magnet collision
      magnets.forEach(m => {
        const dx = Math.abs(CHAR_X - m.x);
        const dy = Math.abs(charY - m.y);
        if (dx < 40 && dy < 40) {
          magnetTimer = 900; // 15 seconds at 60fps
          powerAudio.current.currentTime = 0;
          powerAudio.current.play().catch(() => {});
          m.collected = true;
          spawnParticle(m.x, m.y, '#ff0000', 20, true);
        }
      });
      magnets = magnets.filter(m => !m.collected);
      if (magnetTimer > 0) magnetTimer -= dtScale;

      // Milestones
      if (coinsCollected > 0 && Math.floor(coinsCollected / 100) > lastMilestone) {
        lastMilestone = Math.floor(coinsCollected / 100);
        milestoneText = `${lastMilestone * 100} COINS!`;
        milestoneTimer = 120;
        for (let i = 0; i < 3; i++) spawnParticle(W / 2 + (i - 1) * 50, H / 2, null, 40, true);
        yayAudio.current.currentTime = 0;
        yayAudio.current.play().catch(() => {});
      }
      if (milestoneTimer > 0) milestoneTimer -= dtScale;

      if (milestoneTimer > 0) milestoneTimer -= dtScale;

      // ── Boss Logic: Spaceship (Trigger: Level based intervals) ──
      const lvl = gameTime < 3600 ? 1 : (gameTime < 10800 ? 2 : 3);
      if (state === 'running' && !ship.active) {
        if (lvl === 2) {
          if (!level2ShipSpawned) {
            level2ShipSpawned = true;
            lastShipTriggerScore = score;
            ship.active = true;
            ship.state = 'entering';
            ship.x = W + 200;
            ship.baseY = H * 0.2 + Math.random() * (H * 0.5);
            ship.y = ship.baseY;
            ship.timer = 0;
            ship.shootTimer = 0;
            ship.shotsLeft = 3;
          } else if (score - lastShipTriggerScore >= 1000) {
            lastShipTriggerScore = score;
            ship.active = true;
            ship.state = 'entering';
            ship.x = W + 200;
            ship.baseY = H * 0.2 + Math.random() * (H * 0.5);
            ship.y = ship.baseY;
            ship.timer = 0;
            ship.shootTimer = 0;
            ship.shotsLeft = 3;
          }
        } else if (lvl === 3) {
          if (score - lastShipTriggerScore >= 500) {
            lastShipTriggerScore = score;
            ship.active = true;
            ship.state = 'entering';
            ship.x = W + 200;
            ship.baseY = H * 0.2 + Math.random() * (H * 0.5);
            ship.y = ship.baseY;
            ship.timer = 0;
            ship.shootTimer = 0;
            ship.shotsLeft = 3;
          }
        }
      }

      if (ship.active) {
        if (ship.state === 'entering') {
          ship.x -= 4 * dtScale;
          ship.y = ship.baseY + Math.sin(frameCount * 0.05) * 50;
          if (ship.x <= W * 0.95) {
            ship.state = 'aiming';
            ship.shootTimer = 180; // 3 seconds for first shot
          }
        } else if (ship.state === 'aiming') {
          ship.x = W * 0.95 + Math.sin(frameCount * 0.03) * 20;
          ship.y = ship.baseY + Math.cos(frameCount * 0.05) * 40;
          ship.shootTimer -= dtScale;
          if (ship.shootTimer <= 0) {
            ship.state = 'firing';
            ship.shotsLeft--;
            // Target character's CURRENT position
            rocket.active = true;
            rocket.startX = ship.x;
            rocket.startY = ship.y;
            rocket.x = ship.x;
            rocket.y = ship.y;
            rocket.targetX = CHAR_X;
            rocket.targetY = charY;
            rocket.t = 0;
            rocket.rot = Math.atan2(rocket.targetY - rocket.startY, rocket.targetX - rocket.startX);
            ship.timer = 60; // cooldown after firing
            
            missileAudio.current.currentTime = 0;
            missileAudio.current.play().catch(() => {});
          }
        } else if (ship.state === 'firing') {
          ship.timer -= dtScale;
          if (ship.timer <= 0) {
            if (ship.shotsLeft > 0) {
              ship.state = 'aiming';
              ship.shootTimer = 90; // Faster shots for 2nd and 3rd (1.5s)
            } else {
              ship.state = 'leaving';
            }
          }
        } else if (ship.state === 'leaving') {
          ship.x += 8 * dtScale;
          ship.y -= 2 * dtScale;
          if (ship.x > W + 300) {
            ship.active = false;
          }
        }
      }

      // Rocket Physics
      if (rocket.active) {
        // 2 seconds to reach target (120 frames at 60fps)
        rocket.t += (dtScale / 120);
        
        // Comical move: ease in-out or simple linear?
        // Let's use a slight curve or just direct lerp
        rocket.x = rocket.startX + (rocket.targetX - rocket.startX) * rocket.t;
        rocket.y = rocket.startY + (rocket.targetY - rocket.startY) * rocket.t;
        
        // Particles behind rocket
        if (Math.random() > 0.3) {
          spawnParticle(rocket.x - Math.cos(rocket.rot)*20, rocket.y - Math.sin(rocket.rot)*20, NEON_ORG, 3 + Math.random()*4);
        }

        if (rocket.t >= 1.0) {
          // Explode at target
          spawnExplosion(rocket.x, rocket.y);
          explosionAudio.current.currentTime = 0;
          explosionAudio.current.play().catch(() => {});
          
          rocket.active = false;
          // Haptic feedback for explosion nearby
          const distToChar = Math.sqrt((rocket.x - CHAR_X)**2 + (rocket.y - charY)**2);
          if (distToChar < 150) vibrate(100);
        }

        // Collision with character
        const dx = Math.abs(CHAR_X - rocket.x);
        const dy = Math.abs(charY - rocket.y);
        if (dx < 24 && dy < 24 && state === 'running') {
          state = 'shocked';
          setGameStatus('shocked');
          shockTimer = 80; // Show explosion for 1.3s
          bgAudio.current.pause();
          explosionAudio.current.play().catch(() => {});
          spawnExplosion(CHAR_X, charY);
          vibrate([300, 100, 300]);
        }
      }

      // Redundant floater filter removed (already done in main update block)

      // ── Jump Trail logic ──
      if (!onGround && state === 'running') {
        jumpTrail.push({ x: CHAR_X, y: charY + 42, alpha: 1.0 });
      }
      if (jumpTrail.length > 25) jumpTrail.shift();
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);

      const skyColors = getSkyColors(gameTime);
      drawSky(skyColors.t, skyColors.top, skyColors.mid, skyColors.bot);
      drawStars(skyColors.t);
      drawCelestial(skyColors.t);
      drawNeonDust();

      // ── Parallax building layers (Task 1) ──
      drawCachedLayer(bgCanvases.ghost, scrollFar * 0.15, WORLD_W * 3.5);
      drawCachedLayer(bgCanvases.far,   scrollFar * 0.3,  WORLD_W * 3);
      
      const isIntro = (introTimer / 60) <= 6;
      if (!isLowEnd) {
        drawCachedLayer(bgCanvases.mid, scrollMid * 0.6,  WORLD_W * 2.5);
        if (!isIntro) drawBillboards(adsMid, scrollMid * 0.6, WORLD_W * 2.5, 0.7);
        
        drawCachedLayer(bgCanvases.near, scrollNear,        WORLD_W * 2);
        if (!isIntro) drawBillboards(adsNear, scrollNear, WORLD_W * 2, 1.0);
      }

      if (state === 'running' && introTimer / 60 <= 6) drawBrandIntro();

      // ── Ground & street ──
      drawStreetLights();
      drawGround();

      // ── Game objects ──
      drawPlatforms();
      drawJumpTrail();
      drawObstacles();
      drawMagnets();
      drawCoins();
      drawParticles();
      drawFloaters();
      drawSpaceship();
      drawRocket();
      drawCharacter();
      drawHUD();

      // Magnet Timer HUD
      if (magnetTimer > 0) {
        ctx.save();
        const tx = W - 60, ty = 80;
        ctx.translate(tx, ty);
        
        // Progress ring
        ctx.beginPath();
        ctx.arc(0, 0, 25, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, 25, -Math.PI/2, -Math.PI/2 + (magnetTimer/900) * Math.PI * 2);
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Magnet Icon (SVG)
        if (magnetLoaded.current) {
          ctx.drawImage(magnetImg.current, -12, -12, 24, 24);
        } else {
          ctx.beginPath();
          ctx.lineWidth = 4;
          ctx.strokeStyle = '#ff0000';
          ctx.arc(0, 5, 10, 0, Math.PI);
          ctx.stroke();
        }
        
        ctx.restore();
      }

      // ── Overlays ──
      if (state === 'dead') drawGameOver();

      if (milestoneTimer > 0) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, milestoneTimer / 20);
        ctx.fillStyle = '#ffffff'; ctx.font = '50px "Luckiest Guy"';
        ctx.textAlign = 'center'; ctx.strokeStyle = '#000'; ctx.lineWidth = 6;
        ctx.strokeText(milestoneText, W / 2, H / 2 - 50);
        ctx.fillText(milestoneText, W / 2, H / 2 - 50);
        ctx.restore();
      }
    }

    function drawMagnets() {
      magnets.forEach(m => {
        ctx.save();
        ctx.translate(m.x, m.y);
        ctx.rotate(Math.sin(frameCount * 0.1) * 0.2);
        
        const size = 40;
        if (magnetLoaded.current) {
          ctx.drawImage(magnetImg.current, -size/2, -size/2, size, size);
        } else {
          // Fallback
          ctx.lineWidth = 6;
          ctx.strokeStyle = '#ff0000';
          ctx.beginPath();
          ctx.arc(0, 0, 15, 0, Math.PI);
          ctx.stroke();
        }
        
        // Glow
        
        
        if (!magnetLoaded.current) ctx.stroke();

        ctx.restore();
      });
    }

    let lastTime = 0;
    function loop(now) {
      if (isLoadingRef.current) {
        lastTime = now;
        animId = requestAnimationFrame(loop);
        return;
      }
      const rawDelta = lastTime ? (now - lastTime) : 16.67;
      lastTime = now;
      // Cap delta at 50ms to prevent spiral of death
      const dt = Math.min(rawDelta, 50) / 16.67;
      update(dt);
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

  const handleStartRequest = () => {
    let currentProfile = profile;
    if (!currentProfile?.phone) {
      const stored = window.localStorage.getItem('myg_user_profile');
      if (stored) {
        try {
          currentProfile = JSON.parse(stored);
          setProfile(currentProfile);
        } catch (e) {
          console.warn('Failed to parse profile from localStorage in handleStartRequest:', e);
        }
      }
    }

    if (!currentProfile?.phone) {
      setShowProfilePrompt(true);
      setProfileStep('phone');
      setProfileError('');
      return;
    }

    startTriggerRef.current?.();
  };

  const resetProfileDialog = () => {
    setProfileError('');
    setTempName('');
    setTempAge('');
    setProfileStep('phone');
  };

  const onPhoneSubmit = async () => {
    const phoneValue = tempPhone.trim();
    if (!phoneValue) {
      setProfileError('Please enter your phone number.');
      return;
    }
    if (!/^[0-9+ ]{6,20}$/.test(phoneValue)) {
      setProfileError('Phone number should contain digits, + and spaces only.');
      return;
    }

    setProfileSaving(true);
    setProfileError('');
    try {
      // Query Firestore to see if user is already registered
      const userRef = doc(db, 'users', phoneValue);
      const docSnap = await getDoc(userRef);

      if (docSnap.exists()) {
        // User already exists! Auto-fetch name and details
        const data = docSnap.data();
        let lives = data.livesLeft;
        if (lives === undefined) {
          lives = 3;
          await updateDoc(userRef, { livesLeft: 3 }).catch(e => console.warn(e));
        }
        const existingProfile = {
          phone: phoneValue,
          name: data.name || '',
          age: data.age ? Number(data.age) : '',
          livesLeft: lives,
        };

        // Persist locally
        window.localStorage.setItem('myg_user_profile', JSON.stringify(existingProfile));
        setProfile(existingProfile);

        // Ensure logged in anonymously
        await loginAnonymously().catch((e) => console.warn('Anonymous login inside onPhoneSubmit failed:', e));

        // Return to start screen
        setShowProfilePrompt(false);
        resetProfileDialog();
      } else {
        // User does not exist! Move to name and age entry step
        setProfileStep('details');
      }
    } catch (err) {
      console.error('Failed to verify user profile in Firestore:', err);
      setProfileError('Failed to verify profile. Please check your internet connection and try again.');
    } finally {
      setProfileSaving(false);
    }
  };

  const onProfileSubmit = async () => {
    const name = tempName.trim();
    const ageValue = tempAge.trim();
    if (!name) {
      setProfileError('Please enter your name.');
      return;
    }
    if (!ageValue || isNaN(Number(ageValue)) || Number(ageValue) <= 0) {
      setProfileError('Please enter a valid age.');
      return;
    }

    const phoneValue = tempPhone.trim();
    const profileData = {
      phone: phoneValue,
      phoneNumber: phoneValue, // support both fields for consistency
      name,
      age: Number(ageValue),
      createdAt: serverTimestamp(),
      totalScore: 0,
      highscore: 0,
      livesLeft: 3,
    };

    setProfileSaving(true);
    setProfileError('');
    try {
      await setDoc(doc(db, 'users', phoneValue), profileData, { merge: true });
      const savedProfile = { phone: phoneValue, name, age: Number(ageValue), livesLeft: 3 };
      window.localStorage.setItem('myg_user_profile', JSON.stringify(savedProfile));
      setProfile(savedProfile);

      // Ensure logged in anonymously
      await loginAnonymously().catch((e) => console.warn('Anonymous login inside onProfileSubmit failed:', e));

      setShowProfilePrompt(false);
      resetProfileDialog();
    } catch (err) {
      console.error('Failed to save profile:', err);
      setProfileError('Unable to save your profile right now. Please try again.');
    } finally {
      setProfileSaving(false);
    }
  };

  const submitScore = async (finalScore) => {
    // 1. Immediately (synchronously) decrement the lives count in local state & localStorage.
    // This provides an instantaneous "Optimistic UI Update" to block lightspeed retries before DB operations complete.
    let currentProfile = profileRef.current;
    if (!currentProfile?.phone) {
      const stored = window.localStorage.getItem('myg_user_profile');
      if (stored) {
        try {
          currentProfile = JSON.parse(stored);
        } catch (e) {}
      }
    }

    if (currentProfile) {
      const prevLives = currentProfile.livesLeft !== undefined ? Number(currentProfile.livesLeft) : 3;
      const newLives = Math.max(0, prevLives - 1);
      const updatedLocalProfile = {
        ...currentProfile,
        livesLeft: newLives
      };
      window.localStorage.setItem('myg_user_profile', JSON.stringify(updatedLocalProfile));
      setProfile(updatedLocalProfile);
      console.log('Optimistically decremented lives locally:', newLives);
    }

    try {
      if (!currentProfile?.phone) {
        console.warn('No profile phone available; skipping submitScore');
        return;
      }
      const phoneId = currentProfile.phone;

      // Prepare the new score object with exactly 'score' and 'played at' keys
      const newScoreEntry = {
        score: Number(finalScore),
        playedAt: new Date().toISOString() // double-entry to safeguard standard JS camelCase code
      };

      const userRef = doc(db, 'users', phoneId);

      // Read current totals and update totalScore and highscore
      const snap = await getDoc(userRef);
      const data = snap.exists() ? snap.data() : {};
      const prevTotal = Number(data.totalScore || 0);
      const prevHigh = Number(data.highscore || 0);
      const newTotal = prevTotal + Number(finalScore || 0);
      const newHigh = Number(finalScore) > prevHigh ? Number(finalScore) : prevHigh;

      const prevLives = data.livesLeft !== undefined ? Number(data.livesLeft) : 3;
      let newLives = Math.max(0, prevLives - 1);

      // Update the primary user document: append to standard scores array, update totals, record lastPlayedAt, and set livesLeft
      await updateDoc(userRef, {
        scores: arrayUnion(newScoreEntry),
        totalScore: newTotal,
        highscore: newHigh,
        lastPlayedAt: newScoreEntry.playedAt,
        livesLeft: newLives
      });

      // Keep in sync with the database verified values
      const updatedLocalProfile = {
        ...currentProfile,
        livesLeft: newLives
      };
      window.localStorage.setItem('myg_user_profile', JSON.stringify(updatedLocalProfile));
      setProfile(updatedLocalProfile);

      console.log('User totals and scores array updated', { newTotal, newHigh, newLives });
      setLastSubmitMsg(`Score saved: ${finalScore}`);
      setTimeout(() => setLastSubmitMsg(''), 4000);
    } catch (e) {
      console.error('Error submitting score:', e);
      setLastSubmitMsg('Score submit failed');
      setTimeout(() => setLastSubmitMsg(''), 4000);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#03010a', overflow: 'hidden' }}>
      {isLoading && <Loader progress={loadingProgress} />}
      {!isLoading && gameStatus === 'idle' && (
        <StartScreen onStart={handleStartRequest} profile={profile} />
      )}

      {/* Lucide React Heart Lives Overlay */}
      {!isLoading && gameStatus !== 'idle' && (
        <div style={{
          position: 'absolute',
          top: '15px',
          left: '15px',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          pointerEvents: 'none',
          fontFamily: '"Luckiest Guy", sans-serif',
          userSelect: 'none',
        }}>
          {/* Player Name Container */}
          <div style={{
            background: 'rgba(3, 1, 10, 0.85)',
            border: '2px solid #ff6b00',
            borderRadius: '6px',
            padding: '6px 15px',
            color: '#ffffff',
            fontSize: '14px',
            letterSpacing: '0.05em',
            boxShadow: '0 0 10px rgba(255, 107, 0, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '60px',
            textTransform: 'uppercase',
            boxSizing: 'border-box',
          }}>
            {profile?.name ? profile.name : 'GUEST'}
          </div>

          {/* Hearts Row */}
          <div style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {[0, 1, 2].map((i) => {
              const livesLeftVal = profile?.livesLeft !== undefined ? profile.livesLeft : 3;
              const isFull = i < livesLeftVal;
              return (
                <Heart
                  key={i}
                  size={20}
                  fill={isFull ? '#ff6b00' : 'none'}
                  stroke="#ff6b00"
                  strokeWidth={2.5}
                  style={{
                    filter: isFull ? 'drop-shadow(0 0 6px rgba(255, 107, 0, 0.8))' : 'none',
                    transition: 'all 0.3s ease',
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Level Indicator Overlay */}
      {!isLoading && gameStatus !== 'idle' && (
        <div style={{
          position: 'absolute',
          top: '15px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100,
          background: 'rgba(3, 1, 10, 0.85)',
          border: '2px solid #ff6b00',
          borderRadius: '6px',
          padding: '6px 20px',
          color: '#ffffff',
          fontFamily: '"Luckiest Guy", sans-serif',
          fontSize: '18px',
          letterSpacing: '0.08em',
          boxShadow: '0 0 10px rgba(255, 107, 0, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          userSelect: 'none',
          textTransform: 'uppercase',
        }}>
          Level {currentLevel}
        </div>
      )}

      {showProfilePrompt && (
        <div style={profileStyles.overlay}>
          <div style={profileStyles.box}>
            <h2 style={profileStyles.heading}>Just one more step!</h2>
            <p style={profileStyles.subtext}>
              We use your phone number to let you know about rewards, special offers and game updates.
            </p>

            {profileStep === 'phone' ? (
              <>
                <label style={profileStyles.label}>
                  Phone number
                  <input
                    autoFocus
                    type="tel"
                    value={tempPhone}
                    onChange={(e) => setTempPhone(e.target.value)}
                    style={profileStyles.input}
                    placeholder="e.g. +91 98765 43210"
                    disabled={profileSaving}
                  />
                </label>
                <button onClick={onPhoneSubmit} style={profileStyles.button} disabled={profileSaving}>
                  {profileSaving ? 'Checking...' : 'Continue'}
                </button>
              </>
            ) : (
              <>
                <p style={profileStyles.confirmText}>Phone: <strong>{tempPhone}</strong></p>
                <label style={profileStyles.label}>
                  Your name
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    style={profileStyles.input}
                    placeholder="Enter your name"
                    disabled={profileSaving}
                  />
                </label>
                <label style={profileStyles.label}>
                  Your age
                  <input
                    type="number"
                    min="1"
                    value={tempAge}
                    onChange={(e) => setTempAge(e.target.value)}
                    style={profileStyles.input}
                    placeholder="Enter your age"
                    disabled={profileSaving}
                  />
                </label>
                <button onClick={onProfileSubmit} style={profileStyles.button} disabled={profileSaving}>
                  {profileSaving ? 'Saving...' : 'Save Profile & Start'}
                </button>
              </>
            )}

            {profileError && <div style={profileStyles.error}>{profileError}</div>}
            {profile?.phone && (
              <button onClick={() => setShowProfilePrompt(false)} style={profileStyles.secondaryButton} disabled={profileSaving}>
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
      {lastSubmitMsg && (
        <div style={{position:'absolute',left:20,top:20,zIndex:3000,background:'#0b1220',color:'#fff',padding:'8px 12px',borderRadius:10,border:'1px solid rgba(255,255,255,0.06)'}}>
          {lastSubmitMsg}
        </div>
      )}
      <canvas ref={canvasRef} style={{ display: isLoading ? 'none' : 'block', width: '100%', height: '100%' }} />
    </div>
  );
}

const profileStyles = {
  overlay: {
    position: 'absolute',
    inset: 0,
    zIndex: 2000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0, 0, 0, 0.9)',
    padding: '20px',
  },
  box: {
    width: '100%',
    maxWidth: '420px',
    borderRadius: '24px',
    background: '#070a14',
    border: '2px solid #ff6b00',
    boxShadow: '0 0 40px rgba(255, 107, 0, 0.2)',
    padding: '28px',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  heading: {
    margin: 0,
    fontSize: '24px',
    textAlign: 'center',
    color: '#ffd06b',
  },
  subtext: {
    margin: 0,
    color: '#d1d5db',
    lineHeight: 1.5,
    textAlign: 'center',
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    fontSize: '14px',
    color: '#f8fafc',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '14px',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    background: '#111827',
    color: '#fff',
    fontSize: '16px',
    outline: 'none',
  },
  button: {
    width: '100%',
    padding: '14px 16px',
    borderRadius: '16px',
    border: 'none',
    background: '#ff6b00',
    color: '#000',
    fontWeight: 700,
    fontSize: '16px',
    cursor: 'pointer',
  },
  secondaryButton: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'transparent',
    color: '#fff',
    fontSize: '14px',
    cursor: 'pointer',
  },
  error: {
    color: '#ffb3b3',
    fontSize: '14px',
    textAlign: 'center',
  },
  confirmText: {
    margin: 0,
    color: '#f8fafc',
    fontSize: '14px',
  }
};