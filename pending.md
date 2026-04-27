# MYG Platformer — Final Pending Optimization Instructions
### Remaining tasks that are NOT yet complete. Implement exactly as written.

---

## TASK 1 — OffscreenCanvas for Parallax Backgrounds
**File:** `Game.jsx`
**Status:** NEVER IMPLEMENTED — biggest remaining FPS gain
**Risk if skipped:** Choppy background scroll on mid-range Android even with all other fixes applied

### Exact implementation:

**Step 1 — Add this at the TOP of your component, outside all functions:**
```js
const bgCaches = useRef({});
const bgCacheReady = useRef(false);
```

**Step 2 — Add this function inside the component, called ONCE after canvas is ready:**
```js
function prebakeBackgroundLayers() {
  const layers = ['ghost', 'farCity', 'midCity', 'nearCity'];
  const W = canvasRef.current.width;
  const H = canvasRef.current.height;

  layers.forEach(layerKey => {
    const oc = new OffscreenCanvas(W * 2, H);
    const octx = oc.getContext('2d');
    drawLayerIntoContext(octx, layerKey, W, H); // your existing layer draw logic moved here
    bgCaches.current[layerKey] = oc;
  });

  bgCacheReady.current = true;
}
```

**Step 3 — In your main draw() loop, REPLACE all background layer draw calls with:**
```js
function drawBackgrounds(ctx, scrollX, canvasW) {
  if (!bgCacheReady.current) return;

  const layers = [
    { key: 'ghost',   speed: 0.15 },
    { key: 'farCity', speed: 0.30 },
    { key: 'midCity', speed: 0.65 },
    { key: 'nearCity',speed: 1.00 },
  ];

  layers.forEach(({ key, speed }) => {
    // Skip mid layers on low-end (Task 10 already handles isLowEnd flag)
    if (isLowEnd && (key === 'midCity' || key === 'farCity')) return;

    const cache = bgCaches.current[key];
    const offset = (scrollX * speed) % canvasW;
    ctx.drawImage(cache, -offset, 0, canvasW, cache.height);
    ctx.drawImage(cache, canvasW - offset, 0, canvasW, cache.height);
  });
}
```

**Step 4 — Call `prebakeBackgroundLayers()` inside your canvas init useEffect, after the canvas size is set:**
```js
useEffect(() => {
  // ... existing canvas setup ...
  prebakeBackgroundLayers(); // ADD THIS LINE
  startGameLoop();
}, []);
```

**What this achieves:** Zero path drawing, zero fill calls, zero stroke calls for all backgrounds every frame. Each frame costs only 4 `drawImage` calls for backgrounds instead of hundreds of rect/line/fill operations.

---

## TASK 2 — Verify img.decode() Covers ALL Assets
**File:** `Loader.jsx` (or wherever asset loading lives)
**Status:** Implemented but unverified — may be incomplete
**Risk if skipped:** First-draw stutter on Safari when a product image appears for the first time mid-game

### Exact implementation:

**Step 1 — Add a console log BEFORE the decode call to verify count:**
```js
const allImages = [
  charRunImg,
  charWaveImg,
  magnetImg,
  ...productImages,    // must be the full array — all 30+
  ...billboardImages,  // must be the full array
];

console.log(`[Loader] Decoding ${allImages.length} images`);
// This number MUST match your total asset count exactly.
// If it shows less than your full asset count, find what's missing.

await Promise.all(
  allImages
    .filter(img => img && img.complete === false) // skip already-decoded
    .map(img => img.decode().catch(() => {}))     // catch per-image — one failure must not block all
);

console.log('[Loader] All images decoded — safe to start');
```

**Step 2 — Confirm decode runs BEFORE StartScreen is shown:**
```js
// The sequence must be:
// 1. Load all assets
// 2. img.decode() all images   ← must happen here
// 3. Set progress to 100
// 4. Show StartScreen          ← only after decode completes
```

**Critical note:** Each `.decode()` call must be individually wrapped in `.catch(() => {})`. If even one image fails to decode (e.g. a missing WebP before fallback kicks in), it will block the entire `Promise.all` and the game will never start.

---

## TASK 3 — Fix Sprite Animation Timer (Task 5 Correctness Fix)
**File:** `Game.jsx` (`drawCharacter` or animation update logic)
**Status:** INCORRECTLY IMPLEMENTED — still frameCount-dependent
**Risk if skipped:** Character legs animate visually faster on 120Hz phones than 60Hz

### The problem with the current implementation:
```js
// CURRENT — WRONG. Still tied to frameCount which increments every rAF call.
// On 120Hz: frameCount reaches 120 in 1 second → animates at 2× speed
const frame = Math.floor((frameCount * 16.67 / 1000) * RUN_FPS) % totalFrames;
```

### Exact correct implementation:

**Step 1 — Declare these OUTSIDE the game loop (module or ref level):**
```js
const spriteState = useRef({
  runTimer: 0,
  runFrame: 0,
  waveTimer: 0,
  waveFrame: 0,
});
```

**Step 2 — In your update() function, use delta (not frameCount):**
```js
// dt is your clamped delta from the existing fixed-timestep loop
// dt = 1.0 at exactly 60fps, dt = 0.5 at 120fps, dt = 2.0 at 30fps

const RUN_INTERVAL  = 1000 / 12; // 12fps sprite animation
const WAVE_INTERVAL = 1000 / 8;  // 8fps wave animation

function updateSprite(dt) {
  const s = spriteState.current;
  const msElapsed = dt * 16.67; // convert normalized dt back to milliseconds

  // Run animation
  s.runTimer += msElapsed;
  if (s.runTimer >= RUN_INTERVAL) {
    s.runTimer = 0;
    s.runFrame = (s.runFrame + 1) % TOTAL_RUN_FRAMES;
  }

  // Wave animation (Start Screen)
  s.waveTimer += msElapsed;
  if (s.waveTimer >= WAVE_INTERVAL) {
    s.waveTimer = 0;
    s.waveFrame = (s.waveFrame + 1) % TOTAL_WAVE_FRAMES;
  }
}
```

**Step 3 — In drawCharacter(), use `spriteState.current.runFrame` instead of any frameCount-derived value:**
```js
const col = spriteState.current.runFrame % SPRITE_COLS;
const row = Math.floor(spriteState.current.runFrame / SPRITE_COLS);
ctx.drawImage(runSheet, col * FRAME_W, row * FRAME_H, FRAME_W, FRAME_H, charX, charY, drawW, drawH);
```

---

## TASK 4 — Audit Coin & Product Spawn for GC Allocations
**File:** `Game.jsx` (coin spawn, product spawn, magnetic attraction)
**Status:** Skipped — needs a 10-minute targeted audit
**Risk if skipped:** Irregular 50–100ms GC freeze mid-game after 60+ seconds of play on iOS

### Exactly what to look for and fix:

**Find this pattern anywhere in spawn or update logic:**
```js
// BAD — creates a new object every time a coin spawns or every frame
coins.push({ x: spawnX, y: spawnY, active: true, collected: false });
```

**Replace with a pool:**
```js
// Declare ONCE at component/module level — never inside the loop
const COIN_POOL = Array.from({ length: 25 }, () => ({
  active: false, x: 0, y: 0, collected: false, frame: 0
}));

function spawnCoin(x, y) {
  const coin = COIN_POOL.find(c => !c.active);
  if (!coin) return; // pool exhausted — skip silently, never allocate
  coin.active = true;
  coin.x = x;
  coin.y = y;
  coin.collected = false;
  coin.frame = 0;
}

function despawnCoin(coin) {
  coin.active = false; // return to pool — no splice, no new array
}

// In draw/update — iterate pool directly, skip inactive
COIN_POOL.forEach(coin => {
  if (!coin.active) return;
  // update and draw coin
});
```

**Also find and fix the magnetic attraction vector (if it exists as an object literal):**
```js
// Declare ONCE outside all loops
const _mv = { x: 0, y: 0 };

// Inside magnetic update loop — mutate in place
_mv.x = coin.x - char.x;
_mv.y = coin.y - char.y;
const dist = Math.sqrt(_mv.x * _mv.x + _mv.y * _mv.y);
const norm = dist > 0 ? 1 / dist : 0;
coin.x -= _mv.x * norm * MAGNET_SPEED * dt;
coin.y -= _mv.y * norm * MAGNET_SPEED * dt;
```

---

## TESTING PROTOCOL — Run After All 4 Tasks Are Done

### Device targets (test in this order):
1. **iPhone 12 / Safari** — audio, fullscreen fallback, no console errors, smooth scroll
2. **iPhone SE (2nd gen) / Safari** — smallest modern iPhone, stress test memory
3. **Snapdragon 665 Android / Chrome** — 4-core, 4GB RAM, mid-range baseline
4. **120Hz Android (any)** — confirm sprite speed matches 60Hz device visually

### What to check on each device:
- [ ] Audio plays on first coin collect (iOS audio unlock working)
- [ ] No JS errors in console (vibrate guard, fullscreen catch working)
- [ ] Background layers scroll without stutter after 30 seconds (OffscreenCanvas working)
- [ ] Character leg speed looks identical on 60Hz vs 120Hz (sprite timer working)
- [ ] No random freeze/hitch after 60+ seconds of play (GC / pool working)
- [ ] Loader completes and logs correct image count (decode coverage verified)
- [ ] Game on low-end device shows 2 layers, high-end shows 4 layers

### Quick FPS sanity check (add temporarily, remove before release):
```js
// Add to draw() — top right corner
ctx.fillStyle = 'rgba(0,0,0,0.5)';
ctx.fillRect(canvasW - 80, 8, 72, 22);
ctx.fillStyle = '#00ff88';
ctx.font = '14px monospace';
ctx.fillText(`${Math.round(1000 / rawDelta)} fps`, canvasW - 74, 24);
```

---

## SUMMARY

| Task | File | Effort | Blocking? |
|---|---|---|---|
| 1 — OffscreenCanvas backgrounds | Game.jsx | ~3–4 hrs | Yes — Android scroll stutter |
| 2 — Verify img.decode() coverage | Loader.jsx | ~30 min | Yes — Safari first-draw spike |
| 3 — Fix sprite timer (correctness) | Game.jsx | ~45 min | Yes — 120Hz visual bug |
| 4 — Coin pool + GC audit | Game.jsx | ~1–2 hrs | Yes — iOS mid-game freeze |

**All 4 tasks are blocking for a clean device test. Do not skip any.**
**Recommended order: 2 → 3 → 4 → 1**
*(Start fast, end with the largest change)*