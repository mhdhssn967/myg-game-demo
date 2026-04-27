# MYG Platformer — Pending Optimization Tasks
### Status: Post Critical & High Priority Fixes
### Remaining work to fully bulletproof cross-device performance

---

## 🟠 HIGH PRIORITY (Still Pending)

---

### TASK 1 — OffscreenCanvas for Parallax Background Layers
**File:** `Game.jsx` (background draw calls in the main loop)
**Why it matters:** All 4 parallax city layers are redrawn from scratch every frame. On mid-range Android (Snapdragon 665-class, 4GB RAM) this alone consumes 40–60% of the 16ms frame budget. Delta-time won't help if you're already over budget.

**What to do:**
- At game init, create one `OffscreenCanvas` per parallax layer
- Draw each layer's full content into its offscreen canvas ONCE
- In the main loop, replace all background draw calls with a single `ctx.drawImage(offscreenLayer, -scrollX, 0)` + `ctx.drawImage(offscreenLayer, width - scrollX, 0)`
- Do this for all 4 layers: ghost silhouettes, far city, mid city (billboards), foreground street

```js
// Init once
const bgLayer = new OffscreenCanvas(canvas.width * 2, canvas.height);
drawCityLayer(bgLayer.getContext('2d'));

// Each frame — zero path/fill cost
ctx.drawImage(bgLayer, -scrollX, 0);
ctx.drawImage(bgLayer, canvas.width - scrollX, 0);
```

**Expected gain:** 8–12ms saved per frame on mid/low-end devices.

---

### TASK 2 — Verify img.decode() Covers ALL 30+ Product Images
**File:** `Loader.jsx`
**Why it matters:** If `img.decode()` is only running on character sprites and not on every product image and billboard, those images will still be decoded mid-game on first draw — causing a visible frame spike on Safari.

**What to do:**
- Confirm the `Promise.all(images.map(img => img.decode()))` call runs on the COMPLETE image array — every product, every billboard, the magnet SVG rasterization, and all character sheets
- Log the array length before the decode call to verify count matches total asset count
- The decode must complete before the Start Screen is shown — not just before the game loop starts

```js
console.log('Decoding', allImages.length, 'images'); // Should match your total asset count
await Promise.all(allImages.map(img => img.decode()));
```

---

## 🟡 MEDIUM PRIORITY

---

### TASK 3 — Object Pooling for Coins & Product Images
**File:** `Game.jsx` (coin spawn / product spawn logic)
**Why it matters:** Creating new objects mid-game triggers JavaScript garbage collection. On iOS, GC pauses cause irregular 50–100ms freezes — hitches that survive all GPU-side fixes and feel like random stutters even when average FPS is fine.

**What to do:**
- Create a fixed-size pool of coin objects at game start (size 20 is enough)
- Create a fixed-size pool of product/collectible objects at game start (size 10)
- On spawn: find an inactive pool object and reuse it — never use `new` inside the game loop
- On collect/despawn: mark `active = false` to return to pool

```js
const COIN_POOL_SIZE = 20;
const coinPool = Array.from({ length: COIN_POOL_SIZE }, () => ({
  active: false, x: 0, y: 0, collected: false, imgIndex: 0
}));

function spawnCoin(x, y) {
  const coin = coinPool.find(c => !c.active);
  if (!coin) return; // Pool full — skip, never allocate
  coin.active = true;
  coin.x = x;
  coin.y = y;
  coin.collected = false;
}
```

- Apply the same pattern to: trap/gap objects, particles, floating score text popups

---

### TASK 4 — Fix Object Allocations Inside the Game Loop
**File:** `Game.jsx` (magnetic attraction logic, collision checks)
**Why it matters:** Any `{ x, y }` object literal created inside the loop generates GC pressure every frame at 60fps = 3,600 new objects per minute.

**What to do:**
- Find all `const vec = { x: ..., y: ... }` patterns inside `update()` or `draw()`
- Move them outside the loop as reusable references, mutate in place each frame

```js
// Declare ONCE outside the loop
const _magnetVec = { x: 0, y: 0 };
const _collisionRect = { x: 0, y: 0, w: 0, h: 0 };

// Inside loop — mutate, never recreate
_magnetVec.x = coin.x - char.x;
_magnetVec.y = coin.y - char.y;
```

- Check: magnetic attraction vector, collision bounding boxes, particle velocity vectors

---

### TASK 5 — Frame-Rate Independent Sprite Animation
**File:** `Game.jsx` (character animation frame stepping)
**Why it matters:** If `currentFrame` increments every rAF call, on a 120Hz phone the character's legs animate at 120fps — visually too fast and inconsistent vs 60Hz devices.

**What to do:**
- Replace frame-count-based stepping with a timer-based approach
- Target 12fps for run animation (adjust to taste)
- Use the existing delta value from the fixed-timestep loop

```js
let spriteTimer = 0;
const SPRITE_FPS = 12;
const SPRITE_INTERVAL = 1000 / SPRITE_FPS;

function updateSprite(dt) {
  spriteTimer += dt * 16.67; // dt is normalized, convert back to ms
  if (spriteTimer >= SPRITE_INTERVAL) {
    spriteTimer = 0;
    currentFrame = (currentFrame + 1) % totalRunFrames;
  }
}
```

- Apply separate timers for: run frames, wave animation (Start Screen), any idle frames

---

### TASK 6 — Parallel Batch Loader (Concurrency Limit)
**File:** `Loader.jsx`
**Why it matters:** Loading all 30+ assets simultaneously saturates the network on slow connections and can crash low-RAM devices during the loader phase — before gameplay even starts.

**What to do:**
- Replace `Promise.all(allAssets.map(load))` with a batched loader capped at 6 concurrent requests
- Update the progress bar incrementally per batch (already works with existing progress UI)

```js
async function loadInBatches(assets, batchSize = 6, onProgress) {
  const results = [];
  for (let i = 0; i < assets.length; i += batchSize) {
    const batch = assets.slice(i, i + batchSize);
    const loaded = await Promise.all(batch.map(loadAsset));
    results.push(...loaded);
    onProgress(results.length / assets.length * 100);
  }
  return results;
}
```

---

## 🟢 LOW PRIORITY

---

### TASK 7 — iOS Audio Context Unlock on First Touch
**File:** `Game.jsx` or `StartScreen.jsx` (audio init)
**Why it matters:** iOS Safari blocks all audio until a user gesture. Without this guard, ~100% of iPhone users get silent gameplay. This is a guaranteed support issue.

**What to do:**
- Add a one-time `pointerdown` listener that plays a silent audio buffer to unlock the AudioContext
- Must fire on the very first user interaction — the Start button tap counts

```js
let audioUnlocked = false;

function unlockAudio(audioCtx) {
  if (audioUnlocked) return;
  const buffer = audioCtx.createBuffer(1, 1, 22050);
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(audioCtx.destination);
  source.start(0);
  audioUnlocked = true;
}

canvas.addEventListener('pointerdown', () => unlockAudio(audioCtx), { once: true });
```

---

### TASK 8 — Guard navigator.vibrate for iOS
**File:** `Game.jsx` (shock/death sequence)
**Why it matters:** `navigator.vibrate` does not exist on iOS and is undefined on some older Androids. If called without a guard it throws a JS error that can destabilize the entire game thread.

**What to do:**
- Wrap every `navigator.vibrate()` call in a single safe utility function

```js
function vibrate(pattern) {
  if ('vibrate' in navigator) {
    try { navigator.vibrate(pattern); } catch (e) {}
  }
}
// Replace all navigator.vibrate(...) calls with vibrate(...)
```

---

### TASK 9 — Fullscreen API Fallback for iOS Safari
**File:** `StartScreen.jsx` (fullscreen request on game start)
**Why it matters:** `requestFullscreen()` is not supported on iOS Safari. Without a fallback, the promise rejects, may throw an uncaught error, and the orientation lock also silently fails — leaving the game in a letterboxed state on iPhone.

**What to do:**
- Wrap fullscreen in try/catch with a CSS viewport fallback
- Add `webkitRequestFullscreen` vendor prefix attempt

```js
async function enterFullscreen(el) {
  try {
    if (el.requestFullscreen) await el.requestFullscreen();
    else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
  } catch {
    // iOS fallback — lock the viewport with CSS
    document.body.style.cssText = 'position:fixed;inset:0;overflow:hidden;touch-action:none;';
  }
}
```

---

### TASK 10 — Low-End Device Layer Reduction
**File:** `Game.jsx` (parallax layer init)
**Why it matters:** A safety net for very old iPhones (iPhone 8, iOS 13) and budget Androids with 2GB RAM. Even with OffscreenCanvas, 4 layers may be too much.

**What to do:**
- Detect low-end at startup using hardware signals
- On low-end: render only 2 layers (far silhouette + near foreground). Skip mid-city layers.
- This should only trigger on genuinely old hardware — modern iPhones and mid-range Androids should always get 4 layers

```js
const isLowEnd =
  navigator.hardwareConcurrency <= 4 ||
  (navigator.deviceMemory && navigator.deviceMemory < 3) ||
  /iPhone OS [89]_|iPhone OS 1[0-3]_/.test(navigator.userAgent);

const ACTIVE_LAYERS = isLowEnd ? ['far', 'near'] : ['far', 'midFar', 'midNear', 'near'];
```

---

## TESTING CHECKLIST
Run through this after completing the above tasks:

- [ ] Test on iPhone 12 or older (Safari) — check FPS, audio, fullscreen, vibration
- [ ] Test on budget Android (Snapdragon 665 / 4GB RAM) — check background scroll smoothness
- [ ] Test on 120Hz Android — confirm physics speed is identical to 60Hz
- [ ] Simulate slow 3G in DevTools — confirm loader doesn't crash or hang
- [ ] Check JS console for any uncaught errors on iOS (vibrate, fullscreen, audio)
- [ ] Confirm coin collection has no mid-game hitch after 60+ seconds of play (GC test)
- [ ] Verify sprite animation speed looks the same on 60Hz vs 120Hz device

---

## SUMMARY TABLE

| # | Task | File | Priority | Effort |
|---|---|---|---|---|
| 1 | OffscreenCanvas for backgrounds | Game.jsx | 🟠 High | ~3–4 hrs |
| 2 | Verify img.decode() covers all assets | Loader.jsx | 🟠 High | ~30 min |
| 3 | Object pooling — coins & products | Game.jsx | 🟡 Medium | ~2–3 hrs |
| 4 | Remove in-loop object allocations | Game.jsx | 🟡 Medium | ~1–2 hrs |
| 5 | Frame-rate independent sprite animation | Game.jsx | 🟡 Medium | ~1 hr |
| 6 | Batch asset loader | Loader.jsx | 🟡 Medium | ~1 hr |
| 7 | iOS audio unlock on first touch | Game.jsx / StartScreen.jsx | 🟢 Low | ~30 min |
| 8 | navigator.vibrate guard | Game.jsx | 🟢 Low | ~15 min |
| 9 | Fullscreen API iOS fallback | StartScreen.jsx | 🟢 Low | ~30 min |
| 10 | Low-end device layer reduction | Game.jsx | 🟢 Low | ~1 hr |

**Total estimated effort: ~12–15 hours**
**Recommended order: 2 → 8 → 9 → 7 → 1 → 5 → 3 → 4 → 6 → 10**
*(Start with the quick wins to unblock iPhone testing, then tackle the heavier canvas work)*