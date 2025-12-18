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
  const tankWidth = TANK_WIDTH - 0.4; // Slightly smaller to close gap with water
  const tankHeight = TANK_HEIGHT;
  const tankDepth = TANK_DEPTH - 0.4; // Slightly smaller to close gap with water
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
          depthWrite={false} // Prevent occlusion
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
          depthWrite={false} // Prevent occlusion
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
          depthWrite={false} // Prevent occlusion
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
          depthWrite={false} // Prevent occlusion
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
          depthWrite={false} // Prevent occlusion
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

      {/* MODERN AQUASCAPING - Professional Minimalist Design */}

      {/* Fine white sand substrate */}
      <mesh position={[0, -tankHeight / 2 + 0.3, 0]} receiveShadow>
        <boxGeometry args={[tankWidth - 0.1, 0.6, tankDepth - 0.1]} />
        <meshStandardMaterial
          color="#f0e8d8"
          roughness={0.85}
          metalness={0.0}
        />
      </mesh>

      {/* MINIMALIST DRIFTWOOD CENTERPIECE */}
      <group position={[-8, -tankHeight / 2 + 1.5, -2]}>
        {/* Main trunk */}
        <mesh rotation={[0, 0.4, -0.2]} castShadow receiveShadow>
          <cylinderGeometry args={[0.6, 0.9, 6, 8]} />
          <meshStandardMaterial
            color="#5a4538"
            roughness={0.8}
            metalness={0.0}
          />
        </mesh>
        {/* Single branch */}
        <mesh position={[1.5, 1.8, 0.3]} rotation={[0.4, 0.2, 0.6]} castShadow receiveShadow>
          <cylinderGeometry args={[0.3, 0.4, 3.5, 8]} />
          <meshStandardMaterial
            color="#4a3528"
            roughness={0.85}
            metalness={0.0}
          />
        </mesh>
      </group>

      {/* SIMPLE JAVA FERN CLUSTER */}
      <group position={[-8, -tankHeight / 2 + 2.5, -2]}>
        {[...Array(5)].map((_, i) => {
          const angle = (i / 5) * Math.PI * 0.6 - 0.3;
          const height = 2.5 + Math.random() * 0.8;
          return (
            <mesh
              key={i}
              position={[Math.sin(angle) * 0.8, height / 2, Math.cos(angle) * 0.4]}
              rotation={[0, angle, Math.PI / 6]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[0.08, height, 0.6]} />
              <meshStandardMaterial
                color="#2d5a3d"
                roughness={0.7}
                metalness={0.0}
                transparent={true}
                opacity={0.9}
              />
            </mesh>
          );
        })}
      </group>

      {/* ELEGANT ROCK FORMATION - center back */}
      <group position={[0, -tankHeight / 2 + 1.2, -7]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[4, 2.5, 2.5]} />
          <meshStandardMaterial
            color="#7a8a9a"
            roughness={0.75}
            metalness={0.08}
          />
        </mesh>
        <mesh position={[-1, 1.8, 0.3]} rotation={[0, 0.2, 0.05]} castShadow receiveShadow>
          <boxGeometry args={[2, 1.5, 1.8]} />
          <meshStandardMaterial
            color="#8a9aaa"
            roughness={0.7}
            metalness={0.1}
          />
        </mesh>
      </group>

      {/* SOFT CORAL ACCENT - right side */}
      <group position={[10, -tankHeight / 2 + 1, 3]}>
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[0.8, 12, 12]} />
          <meshStandardMaterial
            color="#ff8ab6"
            roughness={0.4}
            metalness={0.15}
            emissive="#ff6a96"
            emissiveIntensity={0.3}
          />
        </mesh>
        {/* Small polyps */}
        {[...Array(4)].map((_, i) => {
          const angle = (i / 4) * Math.PI * 2;
          return (
            <mesh
              key={i}
              position={[Math.cos(angle) * 0.6, 0.5, Math.sin(angle) * 0.6]}
              castShadow
              receiveShadow
            >
              <sphereGeometry args={[0.25, 8, 8]} />
              <meshStandardMaterial
                color="#ffaac6"
                roughness={0.3}
                metalness={0.2}
                emissive="#ff8ab6"
                emissiveIntensity={0.4}
              />
            </mesh>
          );
        })}
      </group>

      {/* BLUE CORAL ACCENT - left side */}
      <group position={[-12, -tankHeight / 2 + 1, -4]}>
        {[...Array(5)].map((_, i) => {
          const angle = (i / 5) * Math.PI * 2;
          const height = 2 + Math.random() * 0.8;
          return (
            <mesh
              key={i}
              position={[Math.cos(angle) * 0.5, height / 2, Math.sin(angle) * 0.5]}
              rotation={[0.2, angle, 0]}
              castShadow
              receiveShadow
            >
              <cylinderGeometry args={[0.06, 0.1, height, 6]} />
              <meshStandardMaterial
                color="#4d9fff"
                roughness={0.5}
                metalness={0.2}
                emissive="#2d7fdf"
                emissiveIntensity={0.4}
              />
            </mesh>
          );
        })}
      </group>
    </group>
  );
};

export default TankContainer;
