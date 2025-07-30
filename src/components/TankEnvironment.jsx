import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const TankEnvironment = () => {
  const floorRef = useRef();
  const wallsRef = useRef();
  
  // Tank floor with subtle reflections
  const floorMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: 0x2a4a6b,
      roughness: 0.1,
      metalness: 0.3,
      transparent: true,
      opacity: 0.9
    });
  }, []);
  
  // Tank walls (invisible but provide depth)
  const wallMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: 0x1e3c72,
      transparent: true,
      opacity: 0.05,
      roughness: 0.0,
      metalness: 0.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.0,
      ior: 1.33, // Water IOR
      transmission: 0.95,
      thickness: 2
    });
  }, []);

  // Create sand particles for the bottom
  const sandGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(500 * 3);
    
    for (let i = 0; i < 500; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 1] = -19.8 + Math.random() * 0.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geometry;
  }, []);

  const sandMaterial = useMemo(() => {
    return new THREE.PointsMaterial({
      color: 0xc2b280,
      size: 0.3,
      transparent: true,
      opacity: 0.8
    });
  }, []);

  return (
    <group>
      {/* Tank floor */}
      <mesh 
        ref={floorRef}
        position={[0, -20, 0]} 
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[60, 50]} />
        <primitive object={floorMaterial} />
      </mesh>
      
      {/* Sand particles */}
      <points geometry={sandGeometry} material={sandMaterial} />
      
      {/* Tank walls - back */}
      <mesh position={[0, 0, -25]} receiveShadow>
        <planeGeometry args={[60, 40]} />
        <primitive object={wallMaterial} />
      </mesh>
      
      {/* Tank walls - left */}
      <mesh position={[-30, 0, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[50, 40]} />
        <primitive object={wallMaterial} />
      </mesh>
      
      {/* Tank walls - right */}
      <mesh position={[30, 0, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[50, 40]} />
        <primitive object={wallMaterial} />
      </mesh>
      
      {/* Subtle coral/plant decorations */}
      <group position={[-20, -15, -20]}>
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.5, 1, 8, 8]} />
          <meshStandardMaterial color={0x2d5016} roughness={0.8} />
        </mesh>
        <mesh position={[0, 4, 0]}>
          <sphereGeometry args={[2, 8, 6]} />
          <meshStandardMaterial color={0x4a7c59} transparent opacity={0.7} />
        </mesh>
      </group>
      
      <group position={[18, -12, -18]}>
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.3, 0.8, 6, 6]} />
          <meshStandardMaterial color={0x8b4513} roughness={0.9} />
        </mesh>
        <mesh position={[0, 3, 0]}>
          <coneGeometry args={[1.5, 5, 8]} />
          <meshStandardMaterial color={0xff6b6b} roughness={0.6} />
        </mesh>
      </group>
      
      <group position={[8, -16, 15]}>
        <mesh>
          <sphereGeometry args={[3, 12, 8]} />
          <meshStandardMaterial color={0x7b68ee} transparent opacity={0.6} />
        </mesh>
      </group>
    </group>
  );
};

export default TankEnvironment;