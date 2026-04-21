import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const Ground = ({ isRunning }) => {
    const meshRef = useRef();

    useFrame((state, delta) => {
        if (isRunning && meshRef.current) {
            meshRef.current.position.x -= delta * 12;
            if (meshRef.current.position.x < -100) meshRef.current.position.x = 100;
        }
    });

    return (
        <group position={[0, 0, 0]}>
            {/* Centered 2D Platform Strip */}
            <mesh ref={meshRef}>
                <boxGeometry args={[400, 1.5, 0.5]} />
                <meshStandardMaterial color="#8b4513" />
                
                {/* Grass/Top layer */}
                <mesh position={[0, 0.8, 0]}>
                    <boxGeometry args={[400, 0.2, 0.6]} />
                    <meshStandardMaterial color="#22c55e" />
                </mesh>
            </mesh>
            
            {/* Background Fill (Static) */}
            <mesh position={[0, -30, -5]}>
                <planeGeometry args={[1000, 60]} />
                <meshStandardMaterial color="#38BDF8" />
            </mesh>
        </group>
    );
};

export default Ground;
