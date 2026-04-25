import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

const Ground = ({ isRunning }) => {
    const meshRef = useRef();
    const logoTexture = useTexture('/images/mygtrans.png');

    const logos = useMemo(() => {
        const items = [];
        // Much longer interval (spacing 150 instead of 50)
        for (let i = -180; i <= 180; i += 150) {
            items.push(i);
        }
        return items;
    }, []);

    useFrame((state, delta) => {
        if (isRunning && meshRef.current) {
            meshRef.current.position.x -= delta * 12;
            if (meshRef.current.position.x < -100) meshRef.current.position.x = 100;
        }
    });

    return (
        <group position={[0, 0, 0]}>
            {/* Centered 2D Platform Strip */}
            <group ref={meshRef}>
                <mesh>
                    <boxGeometry args={[400, 1.5, 0.5]} />
                    <meshStandardMaterial color="#8b4513" />
                </mesh>
                
                {/* Grass/Top layer */}
                <mesh position={[0, 0.8, 0]}>
                    <boxGeometry args={[400, 0.2, 0.6]} />
                    <meshStandardMaterial color="#22c55e" />
                </mesh>

                {/* Much bigger logos */}
                {logos.map((x, i) => (
                    <mesh key={i} position={[x, 0, 0.6]} rotation={[-Math.PI / 2, 0, 0]}>
                        <planeGeometry args={[8, 8]} />
                        <meshStandardMaterial 
                            map={logoTexture} 
                            transparent={true} 
                            emissive="#ff6b00" 
                            emissiveIntensity={3}
                        />
                    </mesh>
                ))}
            </group>
            
            {/* Background Fill (Static) */}
            <mesh position={[0, -30, -5]}>
                <planeGeometry args={[1000, 60]} />
                <meshStandardMaterial color="#38BDF8" />
            </mesh>
        </group>
    );
};

export default Ground;
