import React, { useMemo } from 'react';
import * as THREE from 'three';
import { TANK_WIDTH, TANK_HEIGHT, TANK_DEPTH, WATER_LEVEL } from '../constants/tankDimensions';

/**
 * WaterVolume - Realistic visible water filling the tank
 * Uses physical material for realistic underwater appearance
 */
const WaterVolume = () => {
  // REALISTIC WATER MATERIAL - HIGHLY VISIBLE
  const waterVolumeMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: '#1a5f7a',              // Ocean blue
      transparent: true,
      opacity: 0.6,                   // Much more visible
      roughness: 0.1,
      metalness: 0.0,
      transmission: 0.4,              // Light passes through
      thickness: 2,
      envMapIntensity: 1.0,
      clearcoat: 0.5,                 // Wet look
      clearcoatRoughness: 0.1,
      side: THREE.DoubleSide,
    });
  }, []);

  // Interior water volume - fill from substrate to water surface
  const volumeWidth = TANK_WIDTH - 1;
  const waterHeight = WATER_LEVEL - (-TANK_HEIGHT / 2 + 0.6); // From substrate top to water level
  const volumeDepth = TANK_DEPTH - 1;
  const waterYPosition = (-TANK_HEIGHT / 2 + 0.6 + WATER_LEVEL) / 2; // Center between substrate and surface

  return (
    <mesh
      position={[0, waterYPosition, 0]}
      material={waterVolumeMaterial}
    >
      <boxGeometry args={[volumeWidth, waterHeight, volumeDepth]} />
    </mesh>
  );
};

export default WaterVolume;
