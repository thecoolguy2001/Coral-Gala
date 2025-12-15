import React from 'react';
import * as THREE from 'three';
import { TANK_WIDTH, TANK_HEIGHT, TANK_DEPTH, WATER_LEVEL } from '../constants/tankDimensions';

/**
 * BasicWater - SUPER SIMPLE visible water using basic materials
 * NO shaders, NO complexity - just a visible blue box of water
 */
const BasicWater = () => {
  // Water dimensions - fill the tank
  const waterWidth = TANK_WIDTH - 1;
  const waterDepth = TANK_DEPTH - 1;
  const waterHeight = WATER_LEVEL - (-TANK_HEIGHT / 2 + 0.6); // From substrate to water level
  const waterYPosition = (-TANK_HEIGHT / 2 + 0.6 + WATER_LEVEL) / 2; // Center between substrate and surface

  return (
    <group>
      {/* MAIN WATER BODY - Transparent but visible blue water */}
      <mesh position={[0, waterYPosition, 0]}>
        <boxGeometry args={[waterWidth, waterHeight, waterDepth]} />
        <meshStandardMaterial
          color="#3da8ff"
          transparent={true}
          opacity={0.5}
          roughness={0.05}
          metalness={0.1}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};

export default BasicWater;
