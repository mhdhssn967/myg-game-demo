import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import Ground from './Ground';
import Character from './Character';

// ─── Constants ────────────────────────────────────────────────────────────────
const ORANGE = '#ff6b00';
const PURPLE = '#7b35e8';
const DEEP_BG = '#08061a';
const LAYER_WIDTH = 240;

// ─── Scrolling parallax wrapper ───────────────────────────────────────────────
const ParallaxLayer = ({ speed, z, children, width = LAYER_WIDTH }) => {
  const ref = useRef();
  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.position.x -= delta * speed;
    if (ref.current.position.x < -width) ref.current.position.x = 0;
  });
  return (
    <group ref={ref}>
      <group position={[0, 0, z]}>{children(0)}</group>
      <group position={[width, 0, z]}>{children(width)}</group>
    </group>
  );
};

// ─── Single clean skyscraper ──────────────────────────────────────────────────
const Skyscraper = ({ x, height, width, bodyColor, accentColor, windowRows, hasAntenna, logoTexture, showLogo }) => {
  // Deterministic windows — no Math.random() in render
  const windows = useMemo(() => {
    if (!windowRows) return [];
    const cols = Math.max(1, Math.floor(width / 1.6));
    const result = [];
    for (let r = 0; r < windowRows; r++) {
      for (let c = 0; c < cols; c++) {
        const lit = (r * cols + c * 7 + 3) % 5 !== 0; // pseudo-deterministic
        result.push({ r, c, cols, lit });
      }
    }
    return result;
  }, [windowRows, width]);

  return (
    <group position={[x, height / 2, 0]}>
      {/* Body */}
      <mesh>
        <boxGeometry args={[width, height, 1.2]} />
        <meshStandardMaterial color={bodyColor} roughness={0.9} metalness={0.1} />
      </mesh>

      {/* Top accent bar — strong neon stripe */}
      <mesh position={[0, height / 2 + 0.15, 0]}>
        <boxGeometry args={[width + 0.1, 0.3, 1.4]} />
        <meshStandardMaterial
          color={accentColor}
          emissive={accentColor}
          emissiveIntensity={3}
          toneMapped={false}
        />
      </mesh>

      {/* Side neon edges (left & right vertical lines) */}
      <mesh position={[-width / 2 - 0.05, 0, 0]}>
        <boxGeometry args={[0.08, height, 1.4]} />
        <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={1.5} toneMapped={false} />
      </mesh>
      <mesh position={[width / 2 + 0.05, 0, 0]}>
        <boxGeometry args={[0.08, height, 1.4]} />
        <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={1.5} toneMapped={false} />
      </mesh>

      {/* Windows */}
      {windows.map(({ r, c, cols, lit }, i) => (
        <mesh
          key={i}
          position={[
            -width / 2 + 0.9 + c * 1.6,
            height / 2 - 1.8 - r * 2.4,
            0.65,
          ]}
        >
          <boxGeometry args={[0.7, 1.1, 0.05]} />
          <meshStandardMaterial
            color={lit ? accentColor : '#0a0818'}
            emissive={lit ? accentColor : '#000000'}
            emissiveIntensity={lit ? 1.2 : 0}
            transparent
            opacity={lit ? 0.85 : 0.4}
            toneMapped={false}
          />
        </mesh>
      ))}

      {/* Logo on building face */}
      {showLogo && logoTexture && (
        <mesh position={[0, height * 0.2, 0.65]}>
          <planeGeometry args={[width * 0.55, width * 0.55]} />
          <meshStandardMaterial
            map={logoTexture}
            transparent
            emissive="#ffffff"
            emissiveIntensity={0.6}
            toneMapped={false}
          />
        </mesh>
      )}

      {/* Antenna */}
      {hasAntenna && (
        <>
          <mesh position={[width * 0.1, height / 2 + 1.8, 0]}>
            <cylinderGeometry args={[0.06, 0.1, 3.5, 6]} />
            <meshStandardMaterial color="#12102a" />
          </mesh>
          {/* Blinking tip */}
          <mesh position={[width * 0.1, height / 2 + 3.6, 0]}>
            <sphereGeometry args={[0.22, 8, 8]} />
            <meshStandardMaterial
              color={accentColor}
              emissive={accentColor}
              emissiveIntensity={4}
              toneMapped={false}
            />
          </mesh>
        </>
      )}
    </group>
  );
};

// ─── Building layer ───────────────────────────────────────────────────────────
const BuildingLayer = ({
  speed, z, yOffset,
  count, minH, maxH, minW, maxW,
  bodyColor, accentColor,
  showWindows, showLogos,
  width = LAYER_WIDTH,
  logoTexture,
}) => {
  const buildings = useMemo(() =>
    [...Array(count)].map((_, i) => {
      const seed = i * 137.508; // golden angle seeding — no Math.random()
      const frac = (seed % 100) / 100;
      const frac2 = ((seed * 1.618) % 100) / 100;
      const frac3 = ((seed * 2.718) % 100) / 100;
      return {
        x: (i - count / 2) * (width / count) + (frac - 0.5) * 2.5,
        height: minH + frac2 * (maxH - minH),
        w: minW + frac3 * (maxW - minW),
        hasAntenna: frac > 0.62,
        windowRows: showWindows ? Math.floor(2 + frac2 * 4) : 0,
        useAlt: frac > 0.55,
        showLogo: showLogos && frac > 0.72,
      };
    }),
  [count, minH, maxH, minW, maxW, showWindows, showLogos, width]);

  const renderSet = (offset) => (
    <group position={[offset, yOffset, 0]}>
      {buildings.map((b, i) => (
        <Skyscraper
          key={i}
          x={b.x}
          height={b.height}
          width={b.w}
          bodyColor={bodyColor}
          accentColor={b.useAlt ? ORANGE : accentColor}
          hasAntenna={b.hasAntenna}
          windowRows={b.windowRows}
          showLogo={b.showLogo}
          logoTexture={logoTexture}
        />
      ))}
    </group>
  );

  return (
    <ParallaxLayer speed={speed} z={z} width={width}>
      {(offset) => renderSet(offset)}
    </ParallaxLayer>
  );
};

// ─── Street lamp ──────────────────────────────────────────────────────────────
const StreetLight = ({ x }) => (
  <group position={[x, -3.2, 0]}>
    {/* Pole */}
    <mesh>
      <cylinderGeometry args={[0.1, 0.15, 6, 6]} />
      <meshStandardMaterial color="#0e0c22" metalness={0.6} roughness={0.4} />
    </mesh>
    {/* Arm */}
    <mesh position={[0.9, 2.6, 0]} rotation={[0, 0, -0.15]}>
      <boxGeometry args={[2.0, 0.12, 0.12]} />
      <meshStandardMaterial color="#0e0c22" metalness={0.6} />
    </mesh>
    {/* Lamp housing */}
    <mesh position={[1.85, 2.45, 0]}>
      <boxGeometry args={[0.55, 0.25, 0.3]} />
      <meshStandardMaterial color="#1a1830" />
    </mesh>
    {/* Lamp glow */}
    <mesh position={[1.85, 2.28, 0]}>
      <boxGeometry args={[0.45, 0.08, 0.28]} />
      <meshStandardMaterial color={ORANGE} emissive={ORANGE} emissiveIntensity={4} toneMapped={false} />
    </mesh>
    {/* Point light per lamp — small radius, efficient */}
    <pointLight position={[1.85, 2.1, 0.5]} intensity={1.8} color={ORANGE} distance={12} decay={2} />
  </group>
);

const StreetLightLayer = ({ speed, z, count, width = LAYER_WIDTH }) => {
  const lights = useMemo(
    () => [...Array(count)].map((_, i) => ({ x: (i - count / 2) * (width / count) })),
    [count, width]
  );
  const renderSet = (offset) => (
    <group position={[offset, 0, 0]}>
      {lights.map((l, i) => <StreetLight key={i} x={l.x} />)}
    </group>
  );
  return (
    <ParallaxLayer speed={speed} z={z} width={width}>
      {(offset) => renderSet(offset)}
    </ParallaxLayer>
  );
};

// ─── Floating embers / particles ──────────────────────────────────────────────
const EmberParticles = () => {
  const ref = useRef();
  const particles = useMemo(() =>
    [...Array(30)].map((_, i) => ({
      x: (i - 15) * 4.2,
      y: -2 + (i % 5) * 2.5,
      z: -6 + (i % 3) * -4,
      color: i % 3 === 0 ? ORANGE : PURPLE,
      size: 0.04 + (i % 5) * 0.025,
      speed: 0.3 + (i % 7) * 0.08,
      phase: i * 0.7,
    })),
  []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.children.forEach((child, i) => {
      const p = particles[i];
      child.position.y = p.y + Math.sin(clock.elapsedTime * p.speed + p.phase) * 0.6;
      child.position.x -= 0.008 * p.speed;
      if (child.position.x < -35) child.position.x = 35;
    });
  });

  return (
    <group ref={ref}>
      {particles.map((p, i) => (
        <mesh key={i} position={[p.x, p.y, p.z]}>
          <sphereGeometry args={[p.size, 5, 5]} />
          <meshBasicMaterial color={p.color} transparent opacity={0.65} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
};

// ─── Moon — large, clean, layered ────────────────────────────────────────────
const Moon = () => (
  <group position={[-18, 18, -90]}>
    {/* Outer atmospheric halo */}
    <mesh>
      <circleGeometry args={[7.5, 48]} />
      <meshBasicMaterial color="#7b35e8" transparent opacity={0.06} />
    </mesh>
    {/* Mid glow ring */}
    <mesh>
      <circleGeometry args={[5.5, 48]} />
      <meshBasicMaterial color="#c4a9f0" transparent opacity={0.12} />
    </mesh>
    {/* Moon disc */}
    <mesh>
      <circleGeometry args={[3.8, 48]} />
      <meshBasicMaterial color="#ede0ff" transparent opacity={0.88} />
    </mesh>
    {/* Surface craters — subtle */}
    <mesh position={[1.2, 0.8, 0.01]}>
      <circleGeometry args={[0.55, 16]} />
      <meshBasicMaterial color="#d4c4f0" transparent opacity={0.5} />
    </mesh>
    <mesh position={[-1.0, -0.9, 0.01]}>
      <circleGeometry args={[0.35, 16]} />
      <meshBasicMaterial color="#d4c4f0" transparent opacity={0.4} />
    </mesh>
    <mesh position={[0.3, -1.6, 0.01]}>
      <circleGeometry args={[0.22, 16]} />
      <meshBasicMaterial color="#d4c4f0" transparent opacity={0.35} />
    </mesh>
  </group>
);

// ─── Distant mountain silhouettes ─────────────────────────────────────────────
const Mountains = () => {
  const peaks = useMemo(() => [
    { x: -50, h: 22, w: 30 },
    { x: -20, h: 30, w: 22 },
    { x: 5,   h: 26, w: 28 },
    { x: 32,  h: 18, w: 24 },
    { x: 58,  h: 28, w: 26 },
  ], []);

  return (
    <group position={[0, -14, -110]}>
      {peaks.map((p, i) => (
        <mesh key={i} position={[p.x, p.h / 2, 0]}>
          <coneGeometry args={[p.w / 2, p.h, 4, 1]} />
          <meshBasicMaterial color="#0c0a20" />
        </mesh>
      ))}
      {/* Purple rim light on mountain tops */}
      {peaks.map((p, i) => (
        <mesh key={`rim-${i}`} position={[p.x, p.h - 1, 0.5]}>
          <coneGeometry args={[p.w * 0.25, 4, 4, 1]} />
          <meshBasicMaterial color={PURPLE} transparent opacity={0.18} />
        </mesh>
      ))}
    </group>
  );
};

// ─── Horizon glow strip ───────────────────────────────────────────────────────
const HorizonGlow = () => (
  <mesh position={[0, -8, -95]}>
    <planeGeometry args={[300, 6]} />
    <meshBasicMaterial color={PURPLE} transparent opacity={0.07} />
  </mesh>
);

// ─── Scene ────────────────────────────────────────────────────────────────────
const GameScene = ({ isRunning, jumpTrigger }) => {
  const logoTexture = useTexture('/images/myglogo.png');

  return (
    <>
      {/* ── Lighting — purposeful, not excessive ── */}
      <ambientLight intensity={0.25} color="#1a1040" />

      {/* Moon fill — cool violet from top-left */}
      <directionalLight position={[-15, 25, 10]} intensity={0.5} color="#b090ff" />

      {/* Orange neon key from street level right */}
      <pointLight position={[12, -2, 8]} intensity={3} color={ORANGE} distance={50} decay={2} />

      {/* Purple bounce from left-mid */}
      <pointLight position={[-18, 8, 6]} intensity={2} color={PURPLE} distance={70} decay={2} />

      {/* Warm ground bounce */}
      <pointLight position={[0, -8, 4]} intensity={1.2} color="#ff4400" distance={30} decay={2.5} />

      {/* ── World elements ── */}
      <Ground isRunning={isRunning} />
      <Character isRunning={isRunning} jumpTrigger={jumpTrigger} />

      <Moon />
      <Mountains />
      <HorizonGlow />
      <EmberParticles />

      {/* ── Building layers — 4 tiers, clear depth separation ── */}

      {/* Tier 1 — Far horizon silhouettes, almost black, glacial scroll */}
      <BuildingLayer
        speed={0.4} z={-80} yOffset={-4}
        count={10} minH={35} maxH={60} minW={5} maxW={11}
        bodyColor="#0b0920" accentColor="#3d1f6e"
        showWindows={false} showLogos={false}
        width={240}
      />

      {/* Tier 2 — Mid-far city, muted purple, subtle windows */}
      <BuildingLayer
        speed={1.0} z={-48} yOffset={-7}
        count={13} minH={20} maxH={42} minW={3} maxW={7}
        bodyColor="#0f0c26" accentColor={PURPLE}
        showWindows={true} showLogos={false}
        width={230}
      />

      {/* Tier 3 — Mid city, strong purple + orange mix, logo buildings */}
      <BuildingLayer
        speed={2.0} z={-26} yOffset={-8.5}
        count={15} minH={12} maxH={26} minW={2.5} maxW={6}
        bodyColor="#130e2e" accentColor={PURPLE}
        showWindows={true} showLogos={true}
        width={220}
        logoTexture={logoTexture}
      />

      {/* Tier 4 — Near foreground, vivid orange neon, short blocks */}
      <BuildingLayer
        speed={3.8} z={-12} yOffset={-9}
        count={14} minH={5} maxH={14} minW={2} maxW={4.5}
        bodyColor="#1c0e10" accentColor={ORANGE}
        showWindows={true} showLogos={false}
        width={200}
      />

      {/* Street lights — closest layer */}
      <StreetLightLayer speed={5} z={-4} count={7} width={200} />

      {/* ── Fog — lighter than before so buildings stay readable ── */}
      <fog attach="fog" args={['#07061a', 35, 160]} />
    </>
  );
};

export default GameScene;