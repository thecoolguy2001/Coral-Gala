import React from 'react';
import * as THREE from 'three';
import { TANK_WIDTH, TANK_HEIGHT, TANK_DEPTH, GLASS_THICKNESS, FRAME_THICKNESS } from '../constants/tankDimensions';

/**
 * TankContainer - OPTIMIZED for performance
 * Simple tank structure with minimal decorations
 */
const TankContainer = () => {
  const tankWidth = TANK_WIDTH;
  const tankHeight = TANK_HEIGHT;
  const tankDepth = TANK_DEPTH;
  const glassThickness = GLASS_THICKNESS;
  const frameThickness = FRAME_THICKNESS;

  return (
    <group>
      {/* GLASS WALLS - Simple transparent boxes */}
      {/* Front Glass */}
      <mesh position={[0, 0, tankDepth / 2]}>
        <boxGeometry args={[tankWidth, tankHeight, glassThickness]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Back Glass */}
      <mesh position={[0, 0, -tankDepth / 2]}>
        <boxGeometry args={[tankWidth, tankHeight, glassThickness]} />
        <meshBasicMaterial
          color="#0a1128"
          transparent
          opacity={0.3}
        />
      </mesh>

      {/* Left Glass */}
      <mesh position={[-tankWidth / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[tankDepth, tankHeight, glassThickness]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.1}
        />
      </mesh>

      {/* Right Glass */}
      <mesh position={[tankWidth / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[tankDepth, tankHeight, glassThickness]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.1}
        />
      </mesh>

      {/* Bottom Glass */}
      <mesh position={[0, -tankHeight / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <boxGeometry args={[tankWidth, tankDepth, glassThickness]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.1}
        />
      </mesh>

      {/* TANK FRAME - Simple black frame */}
      {/* Top rim */}
      <mesh position={[0, tankHeight / 2 + frameThickness / 2, 0]}>
        <boxGeometry args={[tankWidth + frameThickness * 2, frameThickness, tankDepth + frameThickness * 2]} />
        <meshStandardMaterial color="#0a0a0a" />
      </mesh>

      {/* Bottom frame */}
      <mesh position={[0, -tankHeight / 2 - frameThickness / 2, 0]}>
        <boxGeometry args={[tankWidth + frameThickness * 2, frameThickness, tankDepth + frameThickness * 2]} />
        <meshStandardMaterial color="#0a0a0a" />
      </mesh>

      {/* SUBSTRATE - Sand at bottom */}
      <mesh position={[0, -tankHeight / 2 + 0.3, 0]}>
        <boxGeometry args={[tankWidth - 1, 0.6, tankDepth - 1]} />
        <meshStandardMaterial color="#d4c8b8" />
      </mesh>

      {/* SIMPLE DECORATIONS - Just a few elements for visual interest */}

      {/* Rock formation - center */}
      <mesh position={[0, -tankHeight / 2 + 1.5, -7]}>
        <boxGeometry args={[6, 3, 4]} />
        <meshStandardMaterial color="#6a7a8a" />
      </mesh>

      {/* Purple coral - left */}
      <mesh position={[-10, -tankHeight / 2 + 1, -3]}>
        <coneGeometry args={[1.5, 3, 8]} />
        <meshStandardMaterial
          color="#8a6f9a"
          emissive="#5a3f6a"
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Orange coral - right */}
      <mesh position={[10, -tankHeight / 2 + 1, 2]}>
        <cylinderGeometry args={[0.8, 1.2, 2.5, 8]} />
        <meshStandardMaterial
          color="#ff6600"
          emissive="#ff4400"
          emissiveIntensity={0.4}
        />
      </mesh>

      {/* Green plant - back left */}
      <mesh position={[-8, -tankHeight / 2 + 2, -4]}>
        <coneGeometry args={[1, 4, 6]} />
        <meshStandardMaterial color="#2d5a3d" />
      </mesh>
    </group>
  );
};

export default TankContainer;
