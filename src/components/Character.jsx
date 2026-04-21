import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import runSprite from '../assets/run.png';

const Character = ({ isRunning, jumpTrigger }) => {
  const meshRef = useRef();
  const texture = useLoader(THREE.TextureLoader, runSprite);
  
  const velocity = useRef(0);
  const positionY = useRef(0);
  const isJumping = useRef(false);

  // Sprite animation settings (Assuming 4x6 grid as previously defined)
  const horizontalFrames = 4;
  const verticalFrames = 6;
  const totalFrames = 21;
  const frameInterval = 0.04; // Faster animation
  const accumulator = useRef(0);
  const frameRef = useRef(0);

  const uniforms = useMemo(() => ({
    uTexture: { value: texture },
    uOffset: { value: new THREE.Vector2(0, 0) },
    uRepeat: { value: new THREE.Vector2(1 / horizontalFrames, 1 / verticalFrames) }
  }), [texture]);

  useEffect(() => {
    if (texture) {
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.LinearFilter;
      texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
    }
  }, [texture]);

  useEffect(() => {
    if (jumpTrigger > 0 && !isJumping.current) {
      isJumping.current = true;
      velocity.current = 0.22; // Snappier jump
    }
  }, [jumpTrigger]);

  useFrame((state, delta) => {
    // Physics - Smooth delta-based gravity
    if (isJumping.current) {
      positionY.current += velocity.current;
      velocity.current -= 0.012; // Higher gravity for snappier feel
      
      if (positionY.current <= 0) {
        positionY.current = 0;
        velocity.current = 0;
        isJumping.current = false;
      }
    }

    // Animation Loop
    if (isRunning || isJumping.current) {
      accumulator.current += delta;
      if (accumulator.current >= frameInterval) {
        frameRef.current = (frameRef.current + 1) % totalFrames;
        accumulator.current = 0;
      }
    }

    // Update Shader Uniforms
    const col = frameRef.current % horizontalFrames;
    const row = Math.floor(frameRef.current / horizontalFrames);
    
    uniforms.uOffset.value.set(
        col / horizontalFrames,
        1.0 - (row + 1) / verticalFrames
    );

    if (meshRef.current) {
      // Smoothed vertical transition
      meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, positionY.current + 1.5, 0.4); 
    }
  });

  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: `
        varying vec2 vUv;
        uniform vec2 uOffset;
        uniform vec2 uRepeat;
        void main() {
          vUv = uv * uRepeat + uOffset;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uTexture;
        varying vec2 vUv;
        void main() {
          vec4 texColor = texture2D(uTexture, vUv);
          if (texColor.a < 0.1) discard;
          gl_FragColor = texColor;
        }
      `,
      transparent: true,
      depthWrite: false, 
      side: THREE.DoubleSide
    });
  }, [uniforms]);

  // Image aspect ratio adjustment
  const frameWidth = 2.8;
  const frameHeight = frameWidth * (448 / 768); 

  return (
    <group position={[-2.5, 0, 1]}> {/* Moved to center-left for Portrait mode */}
      <mesh ref={meshRef} scale={[frameWidth, frameHeight, 1]}> 
        <planeGeometry args={[1, 1]} />
        <primitive object={shaderMaterial} attach="material" />
      </mesh>
    </group>
  );
};



export default Character;

