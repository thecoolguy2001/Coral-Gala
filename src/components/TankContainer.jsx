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
    <group ref={tankRef}>
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

      {/* Tank Frame - Top Rim (open top - only the rim edges, no top cover) */}
      {/* Front rim */}
      <mesh position={[0, tankHeight / 2 + frameThickness / 2, tankDepth / 2 + frameThickness / 2]}>
        <boxGeometry args={[tankWidth + frameThickness * 2, frameThickness, frameThickness]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.4} metalness={0.2} />
      </mesh>
      {/* Back rim */}
      <mesh position={[0, tankHeight / 2 + frameThickness / 2, -tankDepth / 2 - frameThickness / 2]}>
        <boxGeometry args={[tankWidth + frameThickness * 2, frameThickness, frameThickness]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.4} metalness={0.2} />
      </mesh>
      {/* Left rim */}
      <mesh position={[-tankWidth / 2 - frameThickness / 2, tankHeight / 2 + frameThickness / 2, 0]}>
        <boxGeometry args={[frameThickness, frameThickness, tankDepth]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.4} metalness={0.2} />
      </mesh>
      {/* Right rim */}
      <mesh position={[tankWidth / 2 + frameThickness / 2, tankHeight / 2 + frameThickness / 2, 0]}>
        <boxGeometry args={[frameThickness, frameThickness, tankDepth]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.4} metalness={0.2} />
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

      {/* Decorations - Ultra-realistic with light interaction */}
      {/* Gravel/Substrate at bottom - realistic texture */}
      <mesh position={[0, -tankHeight / 2 + 0.5, 0]} receiveShadow>
        <boxGeometry args={[tankWidth - 1, 1, tankDepth - 1]} />
        <meshStandardMaterial
          color="#3a3a3a"
          roughness={0.95}
          metalness={0.0}
        />
      </mesh>

      {/* Rock decorations with realistic materials that catch light */}
      {/* Large rock (left side) */}
      <mesh position={[-12, -tankHeight / 2 + 2, -5]} castShadow receiveShadow>
        <dodecahedronGeometry args={[2.5, 1]} />
        <meshStandardMaterial
          color="#6a5a52"
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>

      {/* Medium rock (right side) */}
      <mesh position={[10, -tankHeight / 2 + 1.5, 3]} castShadow receiveShadow>
        <dodecahedronGeometry args={[2, 1]} />
        <meshStandardMaterial
          color="#7a6a62"
          roughness={0.6}
          metalness={0.15}
        />
      </mesh>

      {/* Small rock cluster (center-back) - catches caustic light beautifully */}
      <group position={[0, -tankHeight / 2 + 1, -7]}>
        <mesh position={[-1, 0, 0]} castShadow receiveShadow>
          <dodecahedronGeometry args={[1.2, 1]} />
          <meshStandardMaterial
            color="#5a4a42"
            roughness={0.65}
            metalness={0.12}
          />
        </mesh>
        <mesh position={[1.2, 0.3, 0.5]} castShadow receiveShadow>
          <dodecahedronGeometry args={[0.9, 1]} />
          <meshStandardMaterial
            color="#6a5a52"
            roughness={0.7}
            metalness={0.1}
          />
        </mesh>
      </group>

      {/* Coral-like plant (back left) - realistic material */}
      <group position={[-8, -tankHeight / 2 + 1, -6]}>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} position={[Math.sin(i) * 0.5, i * 1.5, Math.cos(i) * 0.5]} castShadow receiveShadow>
            <cylinderGeometry args={[0.3, 0.1, 2, 8]} />
            <meshStandardMaterial
              color="#2d5016"
              roughness={0.5}
              metalness={0.0}
              emissive="#1a3010"
              emissiveIntensity={0.1}
            />
          </mesh>
        ))}
      </group>

      {/* Coral-like plant (back right) - catches light */}
      <group position={[7, -tankHeight / 2 + 1, -4]}>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} position={[Math.sin(i + 1) * 0.4, i * 1.2, Math.cos(i + 1) * 0.4]} castShadow receiveShadow>
            <cylinderGeometry args={[0.25, 0.1, 1.5, 8]} />
            <meshStandardMaterial
              color="#3a6618"
              roughness={0.45}
              metalness={0.05}
              emissive="#1a3010"
              emissiveIntensity={0.15}
            />
          </mesh>
        ))}
      </group>

      {/* Additional coral cluster (center) - reflects caustics */}
      <group position={[0, -tankHeight / 2 + 1.5, 0]}>
        {[0, 1, 2].map((i) => {
          const angle = (i / 3) * Math.PI * 2;
          return (
            <mesh
              key={i}
              position={[Math.cos(angle) * 1.5, i * 0.8, Math.sin(angle) * 1.5]}
              castShadow
              receiveShadow
            >
              <coneGeometry args={[0.4, 1.5, 6]} />
              <meshStandardMaterial
                color="#8a4a42"
                roughness={0.4}
                metalness={0.2}
                emissive="#4a2a22"
                emissiveIntensity={0.2}
              />
            </mesh>
          );
        })}
      </group>
    </group>
  );
};

export default TankContainer;
