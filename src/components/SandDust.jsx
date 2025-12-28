import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TANK_WIDTH, TANK_DEPTH, TANK_HEIGHT } from '../constants/tankDimensions';

const SandDust = ({ count = 150 }) => {
  const meshRef = useRef();
  
  // Create random positions and speeds for dust particles
  const particles = useMemo(() => {
    const temp = [];
    const interiorWidth = TANK_WIDTH - 2;
    const interiorDepth = TANK_DEPTH - 2;
    
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * interiorWidth;
      const z = (Math.random() - 0.5) * interiorDepth;
      // Keep close to bottom (sand level is around -tankHeight/2)
      const y = -TANK_HEIGHT/2 + 0.5 + Math.random() * 5.0; 
      const speed = 0.2 + Math.random() * 0.5;
      const size = 0.5 + Math.random() * 1.5; // Varies in size
      const offset = Math.random() * 100;
      
      temp.push({ x, y, z, initialY: y, initialX: x, initialZ: z, speed, size, offset });
    }
    return temp;
  }, [count]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    if (!meshRef.current) return;

    const t = state.clock.elapsedTime;

    particles.forEach((particle, i) => {
      // Gentle floating motion
      // X/Z drift
      const xDrift = Math.sin(t * 0.2 + particle.offset) * 1.0;
      const zDrift = Math.cos(t * 0.15 + particle.offset) * 1.0;
      
      // Y bobbing (staying near bottom)
      const yBob = Math.sin(t * 0.5 + particle.offset) * 0.5;

      dummy.position.set(
        particle.initialX + xDrift,
        particle.initialY + yBob,
        particle.initialZ + zDrift
      );

      // Rotate slowly
      dummy.rotation.set(
        t * 0.1 + particle.offset,
        t * 0.2 + particle.offset,
        t * 0.1 + particle.offset
      );

      dummy.scale.setScalar(particle.size * 0.05); // Small dust motes
      dummy.updateMatrix();
      
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial
        color="#fff8e7" // Sand color
        transparent
        opacity={0.4}
        roughness={1}
        depthWrite={false}
      />
    </instancedMesh>
  );
};

export default SandDust;
