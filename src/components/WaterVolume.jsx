import React, { useRef } from 'react';
import * as THREE from 'three';
import { WATER_LEVEL, TANK_HEIGHT, INTERIOR_WIDTH, INTERIOR_DEPTH } from '../constants/tankDimensions';

/**
 * WaterVolume - Volumetric water effects using MeshPhysicalMaterial
 * Simulates real water physics (transmission, refraction, attenuation)
 */
const WaterVolume = () => {
  const waterVolumeRef = useRef();

  // Interior water volume - fill from BOTTOM of tank to water surface
  const volumeWidth = INTERIOR_WIDTH + 0.1;
  const topY = WATER_LEVEL + 0.1; 
  const bottomY = -TANK_HEIGHT / 2;
  const waterHeight = topY - bottomY; 
  const volumeDepth = INTERIOR_DEPTH + 0.1;
  const waterYPosition = (topY + bottomY) / 2;

  return (
    <mesh
      ref={waterVolumeRef}
      position={[0, waterYPosition, 0]}
      castShadow={false}
      receiveShadow={false}
    >
      <boxGeometry args={[volumeWidth, waterHeight, volumeDepth]} />
      {/* 
        Standard Material for reliable, clear transparency 
        Avoids opacity/artifact issues caused by nested transmission (Glass + Water)
      */}
      <meshStandardMaterial
        color="#a5f3fc" // Pale Cyan (Fresh/Clean)
        transparent={true}
        opacity={0.12} // Low opacity to ensure tank contents are perfectly visible
        roughness={0.1}
        metalness={0.1}
        side={THREE.DoubleSide} // Render inside and outside
        depthWrite={false} // Prevent z-fighting with glass
      />
    </mesh>
  );
};

export default WaterVolume;
