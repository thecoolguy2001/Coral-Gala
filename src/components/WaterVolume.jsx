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
        MeshPhysicalMaterial with Transmission 
        This is the "modern" way to render realistic water volumes in Three.js
      */}
      <meshPhysicalMaterial
        color="#e0f2fe" // Very subtle blue tint base
        transmission={0.9} // Allow seeing through, but catch some light
        opacity={1.0}
        metalness={0.1} // Slight reflectivity
        roughness={0.1} 
        ior={1.33} 
        thickness={20.0} // Matches tank depth
        attenuationColor="#0284c7" // Stronger, deeper blue
        attenuationDistance={8.0} // Color tint kicks in much faster (Denser water)
        transparent={false}
        depthWrite={false}
      />
    </mesh>
  );
};

export default WaterVolume;
