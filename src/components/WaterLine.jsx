import React from 'react';
import * as THREE from 'three';
import { TANK_WIDTH, TANK_DEPTH, WATER_LEVEL } from '../constants/tankDimensions';

/**
 * WaterLine - Creates the visible waterline at the top of the tank
 * This is the bright horizontal line you see in real aquariums where water meets air
 */
const WaterLine = () => {
  // Create a thin rectangle around the perimeter at water level
  const waterlineThickness = 0.08;
  const waterlineHeight = 0.02;

  return (
    <group position={[0, WATER_LEVEL, 0]}>
      {/* Front waterline - HIGHLY VISIBLE */}
      <mesh position={[0, 0, (TANK_DEPTH - 0.5) / 2]}>
        <boxGeometry args={[TANK_WIDTH - 0.5, 0.15, 0.15]} />
        <meshBasicMaterial
          color="#4dd4ff"
          transparent={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Back waterline - HIGHLY VISIBLE */}
      <mesh position={[0, 0, -(TANK_DEPTH - 0.5) / 2]}>
        <boxGeometry args={[TANK_WIDTH - 0.5, 0.15, 0.15]} />
        <meshBasicMaterial
          color="#4dd4ff"
          transparent={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Left waterline - HIGHLY VISIBLE */}
      <mesh position={[-(TANK_WIDTH - 0.5) / 2, 0, 0]}>
        <boxGeometry args={[0.15, 0.15, TANK_DEPTH - 0.5]} />
        <meshBasicMaterial
          color="#4dd4ff"
          transparent={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Right waterline - HIGHLY VISIBLE */}
      <mesh position={[(TANK_WIDTH - 0.5) / 2, 0, 0]}>
        <boxGeometry args={[0.15, 0.15, TANK_DEPTH - 0.5]} />
        <meshBasicMaterial
          color="#4dd4ff"
          transparent={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Meniscus highlight - bright edge where water curves up to glass */}
      {/* Front edge highlight */}
      <mesh position={[0, waterlineHeight * 1.5, (TANK_DEPTH - 0.5) / 2]}>
        <boxGeometry args={[TANK_WIDTH - 0.5, waterlineHeight * 0.5, waterlineThickness * 0.3]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Back edge highlight */}
      <mesh position={[0, waterlineHeight * 1.5, -(TANK_DEPTH - 0.5) / 2]}>
        <boxGeometry args={[TANK_WIDTH - 0.5, waterlineHeight * 0.5, waterlineThickness * 0.3]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Left edge highlight */}
      <mesh position={[-(TANK_WIDTH - 0.5) / 2, waterlineHeight * 1.5, 0]}>
        <boxGeometry args={[waterlineThickness * 0.3, waterlineHeight * 0.5, TANK_DEPTH - 0.5]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Right edge highlight */}
      <mesh position={[(TANK_WIDTH - 0.5) / 2, waterlineHeight * 1.5, 0]}>
        <boxGeometry args={[waterlineThickness * 0.3, waterlineHeight * 0.5, TANK_DEPTH - 0.5]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};

export default WaterLine;
