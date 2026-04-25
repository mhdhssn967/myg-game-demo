import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import Ground from './Ground';
import Character from './Character';

// ─── Reusable scrolling layer ────────────────────────────────────────────────
const ParallaxLayer = ({ speed, z, children, width = 200 }) => {
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

// ─── Cyberpunk Skyscraper ────────────────────────────────────────────────────
const Skyscraper = ({ x, height, width, color, glowColor, hasAntenna, windowRows, logoTexture }) => {
  const showLogo = useMemo(() => Math.random() > 0.7, []);
  return (
    <group position={[x, height / 2, 0]}>
      {/* Main body */}
      <mesh>
        <boxGeometry args={[width, height, 1]} />
        <meshStandardMaterial color={color} />
      </mesh>
      
      {/* MYG Logo on Building */}
      {showLogo && logoTexture && (
        <mesh position={[0, height / 4, 0.51]}>
          <planeGeometry args={[width * 0.6, width * 0.6]} />
          <meshStandardMaterial 
            map={logoTexture} 
            transparent={true} 
            emissive="#ffffff" 
            emissiveIntensity={0.5}
          />
        </mesh>
      )}
    {/* Neon edge trim top */}
    <mesh position={[0, height / 2 + 0.1, 0.1]}>
      <boxGeometry args={[width + 0.2, 0.25, 0.2]} />
      <meshStandardMaterial color={glowColor} emissive={glowColor} emissiveIntensity={2} />
    </mesh>
    {/* Neon edge trim bottom */}
    <mesh position={[0, -height / 2 + 0.3, 0.1]}>
      <boxGeometry args={[width + 0.2, 0.2, 0.2]} />
      <meshStandardMaterial color={glowColor} emissive={glowColor} emissiveIntensity={1.5} />
    </mesh>
    {/* Window rows — small lit rectangles */}
    {windowRows && [...Array(windowRows)].map((_, row) =>
      [...Array(Math.floor(width / 1.4))].map((_, col) => (
        <mesh
          key={`${row}-${col}`}
          position={[
            -width / 2 + 0.9 + col * 1.4,
            height / 2 - 1.5 - row * 2.2,
            0.55,
          ]}
        >
          <boxGeometry args={[0.6, 1.0, 0.1]} />
          <meshStandardMaterial
            color={Math.random() > 0.3 ? glowColor : '#1a0a2e'}
            emissive={glowColor}
            emissiveIntensity={Math.random() > 0.3 ? 0.8 : 0}
            transparent
            opacity={Math.random() > 0.3 ? 0.9 : 0.15}
          />
        </mesh>
      ))
    )}
    {/* Antenna */}
    {hasAntenna && (
      <>
        <mesh position={[0, height / 2 + 1.5, 0]}>
          <cylinderGeometry args={[0.08, 0.12, 3, 5]} />
          <meshStandardMaterial color="#1a1a2e" />
        </mesh>
        <mesh position={[0, height / 2 + 3.2, 0]}>
          <sphereGeometry args={[0.25, 8, 8]} />
          <meshStandardMaterial color={glowColor} emissive={glowColor} emissiveIntensity={3} />
        </mesh>
      </>
    )}
  </group>
);

// ─── Building Layer ──────────────────────────────────────────────────────────
const BuildingLayer = ({ speed, z, yOffset, count, minH, maxH, minW, maxW, color, glowColor, showWindows, width = 200, logoTexture }) => {
  const buildings = useMemo(
    () =>
      [...Array(count)].map((_, i) => ({
        x: (i - count / 2) * (width / count) + (Math.random() - 0.5) * 3,
        height: minH + Math.random() * (maxH - minH),
        w: minW + Math.random() * (maxW - minW),
        hasAntenna: Math.random() > 0.6,
        windowRows: showWindows ? Math.floor(2 + Math.random() * 3) : 0,
        glowColor: Math.random() > 0.5 ? glowColor : (glowColor === '#ff6b00' ? '#9b30ff' : '#ff6b00'),
      })),
    [count, minH, maxH, minW, maxW, glowColor, showWindows, width]
  );

  const renderSet = (offset) => (
    <group position={[offset, yOffset, 0]}>
      {buildings.map((b, i) => (
        <Skyscraper
          key={i}
          x={b.x}
          height={b.height}
          width={b.w}
          color={color}
          glowColor={b.glowColor}
          hasAntenna={b.hasAntenna}
          windowRows={b.windowRows}
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

// ─── Neon Sign Billboards (scrolling) ────────────────────────────────────────
const Billboard = ({ x, y }) => (
  <group position={[x, y, 0]}>
    <mesh>
      <boxGeometry args={[5, 3, 0.3]} />
      <meshStandardMaterial color="#0d0d1a" />
    </mesh>
    {/* Orange neon border */}
    <mesh position={[0, 0, 0.2]}>
      <boxGeometry args={[5.3, 3.3, 0.1]} />
      <meshStandardMaterial color="#ff6b00" emissive="#ff6b00" emissiveIntensity={1.5} transparent opacity={0.6} />
    </mesh>
    {/* Screen glow */}
    <mesh position={[0, 0, 0.22]}>
      <boxGeometry args={[4.6, 2.6, 0.05]} />
      <meshStandardMaterial color="#1a0533" emissive="#9b30ff" emissiveIntensity={0.4} />
    </mesh>
  </group>
);

// ─── Ground-level neon street lights ─────────────────────────────────────────
const StreetLight = ({ x }) => (
  <group position={[x, -3.5, 0]}>
    <mesh>
      <cylinderGeometry args={[0.12, 0.18, 5, 5]} />
      <meshStandardMaterial color="#1a1a2e" />
    </mesh>
    <mesh position={[0.8, 2.2, 0]}>
      <boxGeometry args={[1.8, 0.15, 0.15]} />
      <meshStandardMaterial color="#1a1a2e" />
    </mesh>
    {/* Orange lamp */}
    <mesh position={[1.7, 2.1, 0]}>
      <sphereGeometry args={[0.35, 8, 8]} />
      <meshStandardMaterial color="#ff8c00" emissive="#ff6b00" emissiveIntensity={3} />
    </mesh>
  </group>
);

const StreetLightLayer = ({ speed, z, count, width = 200 }) => {
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

// ─── Floating Neon Particles ─────────────────────────────────────────────────
const NeonParticles = () => {
  const ref = useRef();
  const particles = useMemo(() => (
    [...Array(40)].map(() => ({
      x: (Math.random() - 0.5) * 60,
      y: Math.random() * 20 - 5,
      z: Math.random() * -30 - 5,
      color: Math.random() > 0.5 ? '#ff6b00' : '#9b30ff',
      size: 0.05 + Math.random() * 0.15,
    }))
  ), []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.children.forEach((child, i) => {
      child.position.y += Math.sin(clock.elapsedTime * 0.5 + i) * 0.005;
      child.position.x -= 0.01 * (0.5 + i * 0.02);
      if (child.position.x < -40) child.position.x = 40;
    });
  });

  return (
    <group ref={ref}>
      {particles.map((p, i) => (
        <mesh key={i} position={[p.x, p.y, p.z]}>
          <sphereGeometry args={[p.size, 4, 4]} />
          <meshBasicMaterial color={p.color} transparent opacity={0.7} />
        </mesh>
      ))}
    </group>
  );
};

// ─── Moon ────────────────────────────────────────────────────────────────────
const Moon = () => (
  <group position={[-20, 20, -80]}>
    <mesh>
      <circleGeometry args={[5, 32]} />
      <meshBasicMaterial color="#e8d5ff" transparent opacity={0.15} />
    </mesh>
    <mesh>
      <circleGeometry args={[3.5, 32]} />
      <meshBasicMaterial color="#c4a9f0" transparent opacity={0.25} />
    </mesh>
    <mesh>
      <circleGeometry args={[2.2, 32]} />
      <meshBasicMaterial color="#ddd0f5" />
    </mesh>
  </group>
);

// ─── Scene ───────────────────────────────────────────────────────────────────
const GameScene = ({ isRunning, jumpTrigger }) => {
  const logoTexture = useTexture('/images/myglogo.png');

  return (
    <>
    <ambientLight intensity={0.15} color="#1a0533" />
    <directionalLight position={[10, 20, 5]} intensity={0.3} color="#9b30ff" />
    {/* Orange neon key light from below-right */}
    <pointLight position={[15, -5, 5]} intensity={2.5} color="#ff6b00" distance={60} decay={2} />
    {/* Purple fill from left */}
    <pointLight position={[-20, 10, 5]} intensity={1.5} color="#7c3aed" distance={80} decay={2} />

    <Ground isRunning={isRunning} />
    <Character isRunning={isRunning} jumpTrigger={jumpTrigger} />

    <Moon />
    <NeonParticles />

    {/* ── Parallax building layers — farthest to nearest ── */}

    {/* Layer 1 — Distant ghost silhouettes, near-black, very slow */}
    <BuildingLayer
      speed={0.3} z={-70} yOffset={-6}
      count={12} minH={28} maxH={50} minW={4} maxW={9}
      color="#0a0a14" glowColor="#4a1a7a"
      showWindows={false}
      width={220}
    />

    {/* Layer 2 — Far city, dark purple tones */}
    <BuildingLayer
      speed={0.6} z={-50} yOffset={-8}
      count={14} minH={18} maxH={38} minW={3} maxW={7}
      color="#0f0a1e" glowColor="#7c3aed"
      showWindows={false}
      width={210}
    />

    {/* Layer 3 — Mid city, purple glow windows */}
    <BuildingLayer
      speed={1.2} z={-32} yOffset={-9}
      count={16} minH={12} maxH={28} minW={2.5} maxW={6}
      color="#130d26" glowColor="#9b30ff"
      showWindows={true}
      width={200}
      logoTexture={logoTexture}
    />

    {/* Layer 4 — Near city, orange + purple mixed neon */}
    <BuildingLayer
      speed={2.2} z={-18} yOffset={-9.5}
      count={18} minH={8} maxH={18} minW={2} maxW={5}
      color="#1a0d0d" glowColor="#ff6b00"
      showWindows={true}
      width={200}
      logoTexture={logoTexture}
    />

    {/* Street lights — foreground */}
    <StreetLightLayer speed={3.5} z={-8} count={8} />

    {/* Heavy dark fog for depth */}
    <fog attach="fog" args={['#060610', 20, 130]} />
  </>
  );
};

export default GameScene;