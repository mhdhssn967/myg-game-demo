import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import Ground from './Ground';
import Character from './Character';

// ─── Reusable scrolling layer ───────────────────────────────────────────────
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

// ─── Mountains ──────────────────────────────────────────────────────────────
const MountainLayer = ({ speed, z, color, snowColor, opacity, count, scale, yOffset }) => {
  const width = 200;
  const mountains = useMemo(
    () =>
      [...Array(count)].map((_, i) => ({
        x: (i - count / 2) * (width / count),
        height: 10 + Math.random() * 14,
        width: (width / count) * 0.85,
      })),
    [count]
  );

  const renderSet = (offset) => (
    <group position={[offset, yOffset, 0]}>
      {mountains.map((m, i) => (
        <group key={i} position={[m.x, m.height / 2, 0]}>
          {/* Mountain body */}
          <mesh scale={scale}>
            <coneGeometry args={[m.width / 2, m.height, 4]} />
            <meshStandardMaterial color={color} transparent opacity={opacity} flatShading />
          </mesh>
          {/* Snow cap */}
          {snowColor && (
            <mesh position={[0, m.height * 0.28, 0]} scale={scale * 0.35}>
              <coneGeometry args={[m.width / 2, m.height * 0.5, 4]} />
              <meshStandardMaterial color={snowColor} transparent opacity={opacity * 1.1} flatShading />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );

  return (
    <ParallaxLayer speed={speed} z={z} width={width}>
      {(offset) => renderSet(offset)}
    </ParallaxLayer>
  );
};

// ─── Pine Trees ─────────────────────────────────────────────────────────────
const PineTree = ({ x, y, scale = 1, color, trunkColor = '#5C3317' }) => (
  <group position={[x, y, 0]} scale={scale}>
    {/* Trunk */}
    <mesh position={[0, -1, 0]}>
      <cylinderGeometry args={[0.15, 0.2, 2, 6]} />
      <meshStandardMaterial color={trunkColor} />
    </mesh>
    {/* Lower canopy */}
    <mesh position={[0, 1.2, 0]}>
      <coneGeometry args={[1.6, 3.5, 7]} />
      <meshStandardMaterial color={color} flatShading />
    </mesh>
    {/* Mid canopy */}
    <mesh position={[0, 2.8, 0]}>
      <coneGeometry args={[1.1, 2.8, 7]} />
      <meshStandardMaterial color={color} flatShading />
    </mesh>
    {/* Upper canopy */}
    <mesh position={[0, 4.1, 0]}>
      <coneGeometry args={[0.6, 2.2, 7]} />
      <meshStandardMaterial color={color} flatShading />
    </mesh>
  </group>
);

const TreeLayer = ({ speed, z, yOffset, count, scale, darkColor, lightColor }) => {
  const width = 200;
  const trees = useMemo(
    () =>
      [...Array(count)].map((_, i) => ({
        x: (i - count / 2) * (width / count) + (Math.random() - 0.5) * 4,
        color: i % 2 === 0 ? darkColor : lightColor,
        scale: scale * (0.85 + Math.random() * 0.3),
      })),
    [count, darkColor, lightColor, scale]
  );

  const renderSet = (offset) => (
    <group position={[offset, yOffset, 0]}>
      {trees.map((t, i) => (
        <PineTree key={i} x={t.x} y={0} scale={t.scale} color={t.color} />
      ))}
    </group>
  );

  return (
    <ParallaxLayer speed={speed} z={z} width={width}>
      {(offset) => renderSet(offset)}
    </ParallaxLayer>
  );
};

// ─── Clouds ─────────────────────────────────────────────────────────────────
const CloudPuff = ({ x, y }) => (
  <group position={[x, y, 0]}>
    <mesh><sphereGeometry args={[1.8, 8, 6]} /><meshStandardMaterial color="#ffffff" transparent opacity={0.9} /></mesh>
    <mesh position={[1.8, -0.4, 0]}><sphereGeometry args={[1.4, 8, 6]} /><meshStandardMaterial color="#ffffff" transparent opacity={0.9} /></mesh>
    <mesh position={[-1.8, -0.4, 0]}><sphereGeometry args={[1.2, 8, 6]} /><meshStandardMaterial color="#ffffff" transparent opacity={0.9} /></mesh>
    <mesh position={[0, -0.6, 0]}><sphereGeometry args={[1.0, 8, 6]} /><meshStandardMaterial color="#f0f9ff" transparent opacity={0.85} /></mesh>
  </group>
);

const CloudLayer = ({ speed, z, yOffset, count }) => {
  const width = 200;
  const clouds = useMemo(
    () =>
      [...Array(count)].map((_, i) => ({
        x: (i - count / 2) * (width / count),
        y: (Math.random() - 0.5) * 4,
      })),
    [count]
  );
  const renderSet = (offset) => (
    <group position={[offset, yOffset, 0]}>
      {clouds.map((c, i) => <CloudPuff key={i} x={c.x} y={c.y} />)}
    </group>
  );
  return (
    <ParallaxLayer speed={speed} z={z} width={width}>
      {(offset) => renderSet(offset)}
    </ParallaxLayer>
  );
};

// ─── Birds ───────────────────────────────────────────────────────────────────
const BirdFlock = ({ x, y }) => (
  <group position={[x, y, 0]}>
    {[[-1, 0], [0, 0.3], [1, 0], [2, 0.5]].map(([bx, by], i) => (
      <group key={i} position={[bx * 1.5, by, 0]}>
        <mesh position={[-0.3, 0, 0]} rotation={[0, 0, 0.4]}>
          <boxGeometry args={[0.5, 0.06, 0.06]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
        <mesh position={[0.3, 0, 0]} rotation={[0, 0, -0.4]}>
          <boxGeometry args={[0.5, 0.06, 0.06]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
      </group>
    ))}
  </group>
);

const BirdLayer = ({ speed, z, yOffset, count }) => {
  const width = 200;
  const flocks = useMemo(
    () => [...Array(count)].map((_, i) => ({ x: (i - count / 2) * (width / count) })),
    [count]
  );
  const renderSet = (offset) => (
    <group position={[offset, yOffset, 0]}>
      {flocks.map((f, i) => <BirdFlock key={i} x={f.x} y={0} />)}
    </group>
  );
  return (
    <ParallaxLayer speed={speed} z={z} width={width}>
      {(offset) => renderSet(offset)}
    </ParallaxLayer>
  );
};

// ─── Sun ─────────────────────────────────────────────────────────────────────
const Sun = () => {
  const raysRef = useRef();
  useFrame((_, delta) => {
    if (raysRef.current) raysRef.current.rotation.z += delta * 0.08;
  });
  return (
    <group position={[25, 18, -65]}>
      {/* Outer halo */}
      <mesh>
        <circleGeometry args={[13, 32]} />
        <meshBasicMaterial color="#FEF08A" transparent opacity={0.12} />
      </mesh>
      {/* Mid halo */}
      <mesh>
        <circleGeometry args={[10, 32]} />
        <meshBasicMaterial color="#FDE047" transparent opacity={0.22} />
      </mesh>
      {/* Sun disc */}
      <mesh>
        <circleGeometry args={[7, 32]} />
        <meshBasicMaterial color="#FBBF24" />
      </mesh>
      {/* Rotating rays */}
      <group ref={raysRef}>
        {[...Array(8)].map((_, i) => (
          <mesh key={i} rotation={[0, 0, (i * Math.PI) / 4]} position={[0, 9.5, -0.1]}>
            <planeGeometry args={[0.5, 3]} />
            <meshBasicMaterial color="#FCD34D" transparent opacity={0.45} />
          </mesh>
        ))}
      </group>
    </group>
  );
};

// ─── Scene ───────────────────────────────────────────────────────────────────
const GameScene = ({ isRunning, jumpTrigger }) => (
  <>
    <ambientLight intensity={0.7} />
    <directionalLight position={[10, 20, 5]} intensity={1.2} color="#fff8e1" />

    <Ground isRunning={isRunning} />
    <Character isRunning={isRunning} jumpTrigger={jumpTrigger} />

    <Sun />

    {/* Clouds — very slow */}
    <CloudLayer speed={0.8} z={-20} yOffset={12} count={5} />

    {/* Birds — slow, high up */}
    <BirdLayer speed={1.2} z={-18} yOffset={10} count={3} />

    {/* Far mountains with snow — misty blue-green */}
    <MountainLayer speed={0.4} z={-55} color="#6DB8A0" snowColor="#e0f2fe" opacity={0.45} count={7} scale={2.2} yOffset={-14} />

    {/* Mid mountains — vivid green */}
    <MountainLayer speed={0.8} z={-35} color="#22c55e" snowColor="#dcfce7" opacity={0.7} count={9} scale={1.4} yOffset={-11} />

    {/* Near mountains — bright yellow-green, no snow */}
    <MountainLayer speed={1.4} z={-22} color="#4ade80" opacity={0.85} count={12} scale={0.9} yOffset={-9} />

    {/* Far trees — dark, small */}
    <TreeLayer speed={1.6} z={-16} yOffset={-8.5} count={18} scale={0.55} darkColor="#14532d" lightColor="#15803d" />

    {/* Near trees — bright, large */}
    <TreeLayer speed={3.0} z={-10} yOffset={-6.5} count={12} scale={0.9} darkColor="#16a34a" lightColor="#4ade80" />

    <fog attach="fog" args={['#7DD3FC', 25, 160]} />
  </>
);

export default GameScene;