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

      {/* MODERN AQUASCAPING - Professional Contemporary Design */}

      {/* Fine sand substrate with natural variation */}
      <mesh position={[0, -tankHeight / 2 + 0.3, 0]} receiveShadow>
        <boxGeometry args={[tankWidth - 1, 0.6, tankDepth - 1]} />
        <meshStandardMaterial
          color="#d4c8b8"
          roughness={0.9}
          metalness={0.0}
        />
      </mesh>

      {/* MODERN DRIFTWOOD PIECE - Natural organic form (left side) */}
      <group position={[-10, -tankHeight / 2 + 1, -3]}>
        {/* Main trunk - horizontal piece */}
        <mesh rotation={[0, 0, -0.3]} castShadow receiveShadow>
          <cylinderGeometry args={[0.8, 1.2, 8, 8]} />
          <meshStandardMaterial
            color="#5a4538"
            roughness={0.8}
            metalness={0.0}
          />
        </mesh>
        {/* Branch 1 */}
        <mesh position={[2, 2, 0.5]} rotation={[0.5, 0.3, 0.8]} castShadow receiveShadow>
          <cylinderGeometry args={[0.4, 0.6, 4, 8]} />
          <meshStandardMaterial
            color="#4a3528"
            roughness={0.85}
            metalness={0.0}
          />
        </mesh>
        {/* Branch 2 */}
        <mesh position={[-1, 1.5, -0.5]} rotation={[-0.4, -0.2, -0.6]} castShadow receiveShadow>
          <cylinderGeometry args={[0.3, 0.5, 3, 8]} />
          <meshStandardMaterial
            color="#4a3528"
            roughness={0.85}
            metalness={0.0}
          />
        </mesh>
      </group>

      {/* MODERN JAVA FERN - Realistic leaf structure (attached to driftwood) */}
      <group position={[-10, -tankHeight / 2 + 2, -3]}>
        {[...Array(8)].map((_, i) => {
          const angle = (i / 8) * Math.PI * 0.8 - 0.4;
          const height = 3 + Math.random() * 1.5;
          return (
            <mesh
              key={i}
              position={[Math.sin(angle) * 1, height / 2, Math.cos(angle) * 0.5]}
              rotation={[0, angle, Math.PI / 6]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[0.1, height, 0.8]} />
              <meshStandardMaterial
                color="#1a4d2e"
                roughness={0.7}
                metalness={0.0}
                transparent={true}
                opacity={0.85}
              />
            </mesh>
          );
        })}
      </group>

      {/* OPTIMIZED: Branching coral - reduced branches */}
      <group position={[8, -tankHeight / 2 + 1, -5]}>
        {/* Base */}
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[1, 1.5, 1.5, 8]} />
          <meshStandardMaterial
            color="#7a5f8a"
            roughness={0.6}
            metalness={0.1}
            emissive="#4a2f5a"
            emissiveIntensity={0.3}
          />
        </mesh>
        {/* Branches - reduced from 12 to 6 */}
        {[...Array(6)].map((_, i) => {
          const angle = (i / 6) * Math.PI * 2;
          const radius = 1.2;
          const branchHeight = 2.5;
          return (
            <mesh
              key={i}
              position={[
                Math.cos(angle) * radius,
                branchHeight / 2,
                Math.sin(angle) * radius
              ]}
              rotation={[0.3, angle, 0]}
              castShadow
              receiveShadow
            >
              <cylinderGeometry args={[0.08, 0.15, branchHeight, 6]} />
              <meshStandardMaterial
                color="#8a6f9a"
                roughness={0.5}
                metalness={0.15}
                emissive="#5a3f6a"
                emissiveIntensity={0.4}
              />
            </mesh>
          );
        })}
      </group>

      {/* MODERN ANUBIAS PLANT - Broad leaves (right foreground) */}
      <group position={[11, -tankHeight / 2 + 0.8, 2]}>
        {/* Leaves - modern broad design */}
        {[...Array(6)].map((_, i) => {
          const angle = (i / 6) * Math.PI * 2;
          return (
            <group
              key={i}
              position={[Math.cos(angle) * 0.8, 1.2, Math.sin(angle) * 0.8]}
              rotation={[Math.PI / 3, angle, 0]}
            >
              {/* Leaf blade */}
              <mesh castShadow receiveShadow>
                <sphereGeometry args={[1.2, 16, 16]} />
                <meshStandardMaterial
                  color="#2d5a3d"
                  roughness={0.6}
                  metalness={0.05}
                  side={THREE.DoubleSide}
                />
              </mesh>
              {/* Leaf stem */}
              <mesh position={[0, -0.8, 0]} rotation={[0.5, 0, 0]}>
                <cylinderGeometry args={[0.08, 0.12, 1.5, 8]} />
                <meshStandardMaterial
                  color="#3a6a4d"
                  roughness={0.7}
                  metalness={0.0}
                />
              </mesh>
            </group>
          );
        })}
      </group>

      {/* MODERN ROCK FORMATION - Natural layered stone (center-back) */}
      <group position={[0, -tankHeight / 2 + 1, -7]}>
        {/* Large base stone */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[5, 2, 3]} />
          <meshStandardMaterial
            color="#6a7a8a"
            roughness={0.75}
            metalness={0.1}
          />
        </mesh>
        {/* Stacked stone 1 */}
        <mesh position={[-1.2, 1.5, 0.5]} rotation={[0, 0.3, 0.1]} castShadow receiveShadow>
          <boxGeometry args={[2.5, 1.5, 2]} />
          <meshStandardMaterial
            color="#7a8a9a"
            roughness={0.7}
            metalness={0.12}
          />
        </mesh>
        {/* Stacked stone 2 */}
        <mesh position={[1.5, 1.2, -0.3]} rotation={[0, -0.4, -0.05]} castShadow receiveShadow>
          <boxGeometry args={[2, 1.2, 2.5]} />
          <meshStandardMaterial
            color="#5a6a7a"
            roughness={0.78}
            metalness={0.08}
          />
        </mesh>
      </group>

      {/* OPTIMIZED: Bubble coral - reduced spheres */}
      <group position={[-13, -tankHeight / 2 + 0.8, 4]}>
        {[...Array(8)].map((_, i) => {
          const angle = (i / 8) * Math.PI * 2;
          const radius = 0.6;
          const size = 0.35;
          return (
            <mesh
              key={i}
              position={[
                Math.cos(angle) * radius,
                0.4,
                Math.sin(angle) * radius
              ]}
              castShadow
              receiveShadow
            >
              <sphereGeometry args={[size, 8, 8]} />
              <meshStandardMaterial
                color="#ff6b9d"
                roughness={0.3}
                metalness={0.2}
                emissive="#ff4d7d"
                emissiveIntensity={0.5}
                transparent={true}
                opacity={0.9}
              />
            </mesh>
          );
        })}
      </group>

      {/* OPTIMIZED: Sea anemone - reduced tentacles */}
      <group position={[5, -tankHeight / 2 + 0.8, 1]}>
        {/* Anemone base */}
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.8, 1, 0.8, 12]} />
          <meshStandardMaterial
            color="#8a4a6a"
            roughness={0.5}
            metalness={0.15}
          />
        </mesh>
        {/* Tentacles - reduced from 24 to 12 */}
        {[...Array(12)].map((_, i) => {
          const angle = (i / 12) * Math.PI * 2;
          const radius = 0.6;
          const tentacleLength = 1.8;
          return (
            <mesh
              key={i}
              position={[
                Math.cos(angle) * radius,
                tentacleLength / 2 + 0.3,
                Math.sin(angle) * radius
              ]}
              rotation={[0.6, angle, 0]}
              castShadow
              receiveShadow
            >
              <cylinderGeometry args={[0.05, 0.12, tentacleLength, 6]} />
              <meshStandardMaterial
                color="#fa8ab6"
                roughness={0.4}
                metalness={0.2}
                emissive="#fa6a96"
                emissiveIntensity={0.6}
                transparent={true}
                opacity={0.85}
              />
            </mesh>
          );
        })}
      </group>

      {/* BRIGHT ORANGE TUBE CORAL - front right */}
      <group position={[14, -tankHeight / 2 + 0.8, 6]}>
        {[...Array(8)].map((_, i) => {
          const xOffset = (Math.random() - 0.5) * 1.5;
          const zOffset = (Math.random() - 0.5) * 1.5;
          const height = 2.5 + Math.random() * 1.5;
          return (
            <mesh
              key={i}
              position={[xOffset, height / 2, zOffset]}
              castShadow
              receiveShadow
            >
              <cylinderGeometry args={[0.15, 0.2, height, 8]} />
              <meshStandardMaterial
                color="#ff6600"
                roughness={0.4}
                metalness={0.3}
                emissive="#ff4400"
                emissiveIntensity={0.7}
              />
            </mesh>
          );
        })}
      </group>

      {/* BLUE STAGHORN CORAL - mid-left */}
      <group position={[-8, -tankHeight / 2 + 1.5, -2]}>
        {[...Array(10)].map((_, i) => {
          const angle = (i / 10) * Math.PI * 2;
          const radius = 0.8 + Math.random() * 0.4;
          const height = 2.5 + Math.random() * 1.0;
          return (
            <mesh
              key={i}
              position={[
                Math.cos(angle) * radius,
                height / 2,
                Math.sin(angle) * radius
              ]}
              rotation={[0.2, angle, 0]}
              castShadow
              receiveShadow
            >
              <cylinderGeometry args={[0.08, 0.12, height, 6]} />
              <meshStandardMaterial
                color="#0099ff"
                roughness={0.5}
                metalness={0.2}
                emissive="#0066cc"
                emissiveIntensity={0.5}
              />
            </mesh>
          );
        })}
      </group>

      {/* YELLOW BRAIN CORAL - center front */}
      <group position={[3, -tankHeight / 2 + 0.8, 7]}>
        {[...Array(15)].map((_, i) => {
          const angle = (i / 15) * Math.PI * 2;
          const layer = Math.floor(i / 5);
          const radius = 0.8 - layer * 0.25;
          return (
            <mesh
              key={i}
              position={[
                Math.cos(angle) * radius,
                0.3 + layer * 0.2,
                Math.sin(angle) * radius
              ]}
              castShadow
              receiveShadow
            >
              <sphereGeometry args={[0.25, 8, 8]} />
              <meshStandardMaterial
                color="#ffdd00"
                roughness={0.6}
                metalness={0.1}
                emissive="#ddaa00"
                emissiveIntensity={0.4}
              />
            </mesh>
          );
        })}
      </group>

      {/* PURPLE FAN CORAL - back left */}
      <group position={[-10, -tankHeight / 2 + 2, -8]}>
        {[...Array(5)].map((_, i) => {
          const xSpread = (i - 2) * 0.8;
          return (
            <mesh
              key={i}
              position={[xSpread, 1.5, 0]}
              rotation={[0, 0, Math.PI / 2]}
              castShadow
              receiveShadow
            >
              <cylinderGeometry args={[0.02, 0.05, 3, 8]} />
              <meshStandardMaterial
                color="#aa00ff"
                roughness={0.4}
                metalness={0.2}
                emissive="#7700bb"
                emissiveIntensity={0.6}
              />
            </mesh>
          );
        })}
        {/* Fan blades */}
        <mesh position={[0, 1.5, 0]} rotation={[0, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[4, 3, 0.1]} />
          <meshStandardMaterial
            color="#cc55ff"
            roughness={0.3}
            metalness={0.1}
            emissive="#9933cc"
            emissiveIntensity={0.5}
            transparent={true}
            opacity={0.8}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* NEON GREEN MUSHROOM CORAL - mid-right */}
      <group position={[10, -tankHeight / 2 + 0.8, -1]}>
        {[...Array(6)].map((_, i) => {
          const angle = (i / 6) * Math.PI * 2;
          const radius = 0.6;
          return (
            <mesh
              key={i}
              position={[
                Math.cos(angle) * radius,
                0.3,
                Math.sin(angle) * radius
              ]}
              rotation={[0, 0, 0]}
              castShadow
              receiveShadow
            >
              <cylinderGeometry args={[0.5, 0.2, 0.5, 16]} />
              <meshStandardMaterial
                color="#00ff88"
                roughness={0.4}
                metalness={0.2}
                emissive="#00cc66"
                emissiveIntensity={0.8}
              />
            </mesh>
          );
        })}
      </group>
    </group>
  );
};

export default TankContainer;
