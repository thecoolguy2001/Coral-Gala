import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TANK_WIDTH, TANK_HEIGHT, TANK_DEPTH } from '../constants/tankDimensions';

/**
 * HOBFilter - Hang-On-Back filter equipment
 * Positioned at top-back corner, creates realistic water flow
 */
const HOBFilter = () => {
  console.log('✅ HOBFilter component loaded');
  const waterFlowRef = useRef();
  const filterRef = useRef();

  // Animate water flow - realistic HOB filter output
  useFrame(({ clock }) => {
    // waterFlowRef logic removed
  });

  // Filter box dimensions
  const filterWidth = 4;
  const filterHeight = 6;
  const filterDepth = 3;

  // Position at top-back, slightly right of center
  const filterX = TANK_WIDTH / 2 - filterWidth - 2;
  const filterY = TANK_HEIGHT / 2 + filterHeight / 2 - 0.5;
  const filterZ = -TANK_DEPTH / 2;

  return (
    <group ref={filterRef} position={[filterX, filterY, filterZ]}>
      {/* Main filter body - black plastic housing */}
      <mesh castShadow>
        <boxGeometry args={[filterWidth, filterHeight, filterDepth]} />
        <meshStandardMaterial
          color="#1a1a1a"
          roughness={0.6}
          metalness={0.1}
        />
      </mesh>

      {/* Filter front panel - slightly lighter */}
      <mesh position={[0, 0, filterDepth / 2 + 0.05]} castShadow>
        <boxGeometry args={[filterWidth - 0.5, filterHeight - 0.5, 0.1]} />
        <meshStandardMaterial
          color="#2a2a2a"
          roughness={0.5}
          metalness={0.15}
        />
      </mesh>

      {/* Filter media visible through slots (blue foam) */}
      <mesh position={[0, 0.5, filterDepth / 2 + 0.1]}>
        <boxGeometry args={[filterWidth - 1, filterHeight - 2, 0.1]} />
        <meshStandardMaterial
          color="#1a3a5a"
          roughness={0.8}
          metalness={0.0}
          transparent={true}
          opacity={0.7}
        />
      </mesh>

      {/* Intake tube (right side) */}
      <group position={[filterWidth / 2 - 0.5, -filterHeight / 2 + 1, 0]}>
        <mesh rotation={[0, 0, 0]} castShadow>
          <cylinderGeometry args={[0.3, 0.3, 4, 8]} />
          <meshStandardMaterial
            color="#2a2a2a"
            roughness={0.4}
            metalness={0.2}
            transparent={true}
            opacity={0.6}
          />
        </mesh>
      </group>

      {/* Output spout (left side) - where water flows back */}
      <group position={[-filterWidth / 2 + 0.8, filterHeight / 2 - 0.5, filterDepth / 2]}>
        <mesh castShadow>
          <boxGeometry args={[1.2, 0.8, 0.6]} />
          <meshStandardMaterial
            color="#1a1a1a"
            roughness={0.5}
            metalness={0.2}
          />
        </mesh>
      </group>

      {/* Power cord (cosmetic detail) */}
      <mesh position={[0, filterHeight / 2, -filterDepth / 2]} rotation={[Math.PI / 4, 0, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 2, 6]} />
        <meshStandardMaterial
          color="#0a0a0a"
          roughness={0.9}
        />
      </mesh>

      {/* Filter brand label (subtle detail) */}
      <mesh position={[0, filterHeight / 2 - 1, filterDepth / 2 + 0.12]}>
        <planeGeometry args={[2, 0.5]} />
        <meshStandardMaterial
          color="#3a5a7a"
          roughness={0.3}
          metalness={0.5}
        />
      </mesh>

      {/* LED indicator light (green = running) */}
      <mesh position={[filterWidth / 2 - 0.5, filterHeight / 2 - 0.5, filterDepth / 2 + 0.13]}>
        <circleGeometry args={[0.15, 16]} />
        <meshStandardMaterial
          color="#00ff00"
          emissive="#00ff00"
          emissiveIntensity={0.8}
          roughness={0.2}
          metalness={0.1}
        />
      </mesh>

      {/* Mounting bracket/clip at top */}
      <mesh position={[0, filterHeight / 2 + 0.3, -filterDepth / 2 - 0.5]} castShadow>
        <boxGeometry args={[filterWidth - 0.5, 0.3, 1]} />
        <meshStandardMaterial
          color="#0a0a0a"
          roughness={0.7}
          metalness={0.2}
        />
      </mesh>
    </group>
  );
};

export default HOBFilter;
