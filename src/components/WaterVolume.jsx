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
        color="#ffffff" // Base color should be white for transmission
        transmission={0.9} // Glass-like transparency
        opacity={1.0} // Must be 1.0 for transmission to work correctly
        metalness={0.0}
        roughness={0.1} // Slight internal scatter/blur
        ior={1.33} // Index of Refraction for Water
        thickness={25.0} // Volume thickness for refraction
        attenuationColor="#2a9d8f" // Deep Teal/Blue tint for volume body
        attenuationDistance={30.0} // Distance at which light is fully tinted (Density)
        transparent={false} // Optimization: allow transmission pass to handle transparency
        depthWrite={false}
      />
    </mesh>
  );
};

export default WaterVolume;
