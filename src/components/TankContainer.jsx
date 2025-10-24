import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TANK_WIDTH, TANK_HEIGHT, TANK_DEPTH, GLASS_THICKNESS, FRAME_THICKNESS } from '../constants/tankDimensions';

/**
 * TankContainer - Renders the physical aquarium tank structure
 * Inspired by Fish Center Live aesthetic - realistic home aquarium
 */
const TankContainer = ({ isOutsideView }) => {
  const tankRef = useRef();

  // Use shared tank dimensions
  const tankWidth = TANK_WIDTH;
  const tankHeight = TANK_HEIGHT;
  const tankDepth = TANK_DEPTH;
  const glassThickness = GLASS_THICKNESS;
  const frameThickness = FRAME_THICKNESS;

  return (
    <group ref={tankRef} visible={isOutsideView}>
      {/* Glass Walls - front, back, left, right, bottom */}
      {/* Front Glass */}
      <mesh position={[0, 0, tankDepth / 2]}>
        <boxGeometry args={[tankWidth, tankHeight, glassThickness]} />
        <meshPhysicalMaterial
          color="#ffffff"
          transparent
          opacity={0.15}
          roughness={0.05}
          metalness={0.0}
          transmission={0.95}
          thickness={glassThickness}
          envMapIntensity={1}
        />
      </mesh>

      {/* Back Glass (darker background like Fish Center) */}
      <mesh position={[0, 0, -tankDepth / 2]}>
        <boxGeometry args={[tankWidth, tankHeight, glassThickness]} />
        <meshPhysicalMaterial
          color="#0a1128"
          transparent
          opacity={0.3}
          roughness={0.1}
          metalness={0.0}
          transmission={0.7}
        />
      </mesh>

      {/* Left Glass */}
      <mesh position={[-tankWidth / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[tankDepth, tankHeight, glassThickness]} />
        <meshPhysicalMaterial
          color="#ffffff"
          transparent
          opacity={0.15}
          roughness={0.05}
          metalness={0.0}
          transmission={0.95}
          thickness={glassThickness}
        />
      </mesh>

      {/* Right Glass */}
      <mesh position={[tankWidth / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[tankDepth, tankHeight, glassThickness]} />
        <meshPhysicalMaterial
          color="#ffffff"
          transparent
          opacity={0.15}
          roughness={0.05}
          metalness={0.0}
          transmission={0.95}
          thickness={glassThickness}
        />
      </mesh>

      {/* Bottom Glass */}
      <mesh position={[0, -tankHeight / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <boxGeometry args={[tankWidth, tankDepth, glassThickness]} />
        <meshPhysicalMaterial
          color="#ffffff"
          transparent
          opacity={0.15}
          roughness={0.05}
          metalness={0.0}
          transmission={0.95}
        />
      </mesh>

      {/* Tank Frame - Top Rim (black plastic like real tanks) */}
      <mesh position={[0, tankHeight / 2 + frameThickness / 2, 0]}>
        <boxGeometry args={[tankWidth + frameThickness * 2, frameThickness, tankDepth + frameThickness * 2]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.6} metalness={0.1} />
      </mesh>

      {/* Bottom Frame */}
      <mesh position={[0, -tankHeight / 2 - frameThickness / 2, 0]}>
        <boxGeometry args={[tankWidth + frameThickness * 2, frameThickness, tankDepth + frameThickness * 2]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.6} metalness={0.1} />
      </mesh>

      {/* Vertical Corner Frames */}
      {[
        [-tankWidth / 2 - frameThickness / 2, 0, tankDepth / 2 + frameThickness / 2],
        [tankWidth / 2 + frameThickness / 2, 0, tankDepth / 2 + frameThickness / 2],
        [-tankWidth / 2 - frameThickness / 2, 0, -tankDepth / 2 - frameThickness / 2],
        [tankWidth / 2 + frameThickness / 2, 0, -tankDepth / 2 - frameThickness / 2],
      ].map((pos, i) => (
        <mesh key={`corner-${i}`} position={pos}>
          <boxGeometry args={[frameThickness, tankHeight + frameThickness * 2, frameThickness]} />
          <meshStandardMaterial color="#0a0a0a" roughness={0.6} metalness={0.1} />
        </mesh>
      ))}

      {/* Decorations - Fish Center Live style */}
      {/* Gravel/Substrate at bottom */}
      <mesh position={[0, -tankHeight / 2 + 0.5, 0]}>
        <boxGeometry args={[tankWidth - 1, 1, tankDepth - 1]} />
        <meshStandardMaterial color="#4a4a4a" roughness={0.9} />
      </mesh>

      {/* Rock decoration (left side) */}
      <mesh position={[-12, -tankHeight / 2 + 2, -5]}>
        <dodecahedronGeometry args={[2.5, 0]} />
        <meshStandardMaterial color="#5a5a5a" roughness={0.8} />
      </mesh>

      {/* Another rock (right side) */}
      <mesh position={[10, -tankHeight / 2 + 1.5, 3]}>
        <dodecahedronGeometry args={[2, 0]} />
        <meshStandardMaterial color="#6a6a6a" roughness={0.8} />
      </mesh>

      {/* Small rock cluster (center-back) */}
      <group position={[0, -tankHeight / 2 + 1, -7]}>
        <mesh position={[-1, 0, 0]}>
          <dodecahedronGeometry args={[1.2, 0]} />
          <meshStandardMaterial color="#5a5a5a" roughness={0.8} />
        </mesh>
        <mesh position={[1.2, 0.3, 0.5]}>
          <dodecahedronGeometry args={[0.9, 0]} />
          <meshStandardMaterial color="#6a6a6a" roughness={0.8} />
        </mesh>
      </group>

      {/* Simple plant decoration (back left) */}
      <group position={[-8, -tankHeight / 2 + 1, -6]}>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} position={[Math.sin(i) * 0.5, i * 1.5, Math.cos(i) * 0.5]}>
            <cylinderGeometry args={[0.3, 0.1, 2, 8]} />
            <meshStandardMaterial color="#2d5016" roughness={0.7} />
          </mesh>
        ))}
      </group>

      {/* Simple plant decoration (back right) */}
      <group position={[7, -tankHeight / 2 + 1, -4]}>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} position={[Math.sin(i + 1) * 0.4, i * 1.2, Math.cos(i + 1) * 0.4]}>
            <cylinderGeometry args={[0.25, 0.1, 1.5, 8]} />
            <meshStandardMaterial color="#3a6618" roughness={0.7} />
          </mesh>
        ))}
      </group>
    </group>
  );
};

export default TankContainer;
