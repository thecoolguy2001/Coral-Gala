import React, { useRef } from 'react';
import { MeshReflectorMaterial, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { TANK_WIDTH, TANK_HEIGHT, TANK_DEPTH, GLASS_THICKNESS, FRAME_THICKNESS } from '../constants/tankDimensions';
import SandDust from './SandDust';
import SandFloor from './SandFloor';

// Preload tank decoration models
useGLTF.preload('/low_poly_red_coral.glb');
useGLTF.preload('/blue_lowpoly_coral.glb');
useGLTF.preload('/lowpoly_coral.glb');
useGLTF.preload('/lambis_shell.glb');

/**
 * TankContainer - Renders the physical aquarium tank structure
 */
const TankContainer = () => {
  const tankRef = useRef();

  // Load decoration models
  const { scene: redCoral } = useGLTF('/low_poly_red_coral.glb');
  const { scene: blueCoral } = useGLTF('/blue_lowpoly_coral.glb');
  const { scene: coral } = useGLTF('/lowpoly_coral.glb');
  const { scene: shell } = useGLTF('/lambis_shell.glb');

  // Use shared tank dimensions
  const tankWidth = TANK_WIDTH - 0.4;
  const tankHeight = TANK_HEIGHT;
  const tankDepth = TANK_DEPTH - 0.4;
  const glassThickness = GLASS_THICKNESS;
  const frameThickness = FRAME_THICKNESS;

  return (
    <group ref={tankRef}>
      {/* Front Glass (Transparent) */}
      <mesh position={[0, 0, tankDepth / 2]} castShadow={false} receiveShadow={false}>
        <boxGeometry args={[tankWidth, tankHeight, glassThickness]} />
        <meshPhysicalMaterial
          color="#ffffff"
          transparent
          opacity={0.05}
          roughness={0.0}
          metalness={0.1}
          transmission={0.99}
          thickness={0.1}
          depthWrite={false} 
        />
      </mesh>

      {/* Back Glass - REFLECTIVE MIRROR */}
      <mesh position={[0, 0, -tankDepth / 2]} castShadow={false} receiveShadow={false}>
        <boxGeometry args={[tankWidth, tankHeight, glassThickness]} />
        <meshPhysicalMaterial
          color="#ffffff"
          transparent
          opacity={0.05}
          roughness={0.05}
          metalness={0.1}
          transmission={0.99}
          thickness={0.1}
          depthWrite={false}
        />
      </mesh>
      {/* Internal Reflection Plane - Back */}
      <mesh position={[0, 0, -tankDepth / 2 + 0.2]} rotation={[0, 0, 0]} castShadow={false} receiveShadow={false} side={THREE.DoubleSide}>
        <planeGeometry args={[tankWidth, tankHeight]} />
        <MeshReflectorMaterial
          blur={[0, 0]}
          resolution={1024}
          mixBlur={0}
          mixStrength={100}
          roughness={0}
          depthScale={1.2}
          minDepthThreshold={0}
          maxDepthThreshold={50}
          color="#ffffff"
          metalness={0}
          mirror={1}
          transparent={true}
          opacity={0.3}
          depthWrite={false}
        />
      </mesh>

      {/* Left Glass - REFLECTIVE */}
      <mesh position={[-tankWidth / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]} castShadow={false} receiveShadow={false}>
        <boxGeometry args={[tankDepth, tankHeight, glassThickness]} />
        <meshPhysicalMaterial
          color="#ffffff"
          transparent
          opacity={0.05}
          roughness={0.1}
          transmission={0.9}
        />
      </mesh>
      {/* Internal Reflection Plane - Left */}
      <mesh position={[-tankWidth / 2 + 0.2, 0, 0]} rotation={[0, Math.PI / 2, 0]} castShadow={false} receiveShadow={false} side={THREE.DoubleSide}>
        <planeGeometry args={[tankDepth, tankHeight]} />
        <MeshReflectorMaterial
          blur={[0, 0]}
          resolution={1024}
          mixBlur={0}
          mixStrength={100}
          roughness={0}
          depthScale={1.2}
          minDepthThreshold={0}
          maxDepthThreshold={50}
          color="#ffffff"
          metalness={0}
          mirror={1}
          transparent={true}
          opacity={0.3}
          depthWrite={false}
        />
      </mesh>

      {/* Right Glass - REFLECTIVE */}
      <mesh position={[tankWidth / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]} castShadow={false} receiveShadow={false}>
        <boxGeometry args={[tankDepth, tankHeight, glassThickness]} />
        <meshPhysicalMaterial
          color="#ffffff"
          transparent
          opacity={0.05}
          roughness={0.1}
          transmission={0.9}
        />
      </mesh>
      {/* Internal Reflection Plane - Right */}
      <mesh position={[tankWidth / 2 - 0.2, 0, 0]} rotation={[0, -Math.PI / 2, 0]} castShadow={false} receiveShadow={false} side={THREE.DoubleSide}>
        <planeGeometry args={[tankDepth, tankHeight]} />
        <MeshReflectorMaterial
          blur={[0, 0]}
          resolution={1024}
          mixBlur={0}
          mixStrength={100}
          roughness={0}
          depthScale={1.2}
          minDepthThreshold={0}
          maxDepthThreshold={50}
          color="#ffffff"
          metalness={0}
          mirror={1}
          transparent={true}
          opacity={0.3}
          depthWrite={false}
        />
      </mesh>

      {/* Bottom Glass */}
      <mesh position={[0, -tankHeight / 2, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow={false} receiveShadow={false}>
        <boxGeometry args={[tankWidth, tankDepth, glassThickness]} />
        <meshPhysicalMaterial
          color="#ffffff"
          transparent
          opacity={0.15}
          transmission={0.95}
        />
      </mesh>

      {/* Tank Frame (Unchanged) */}
      <mesh position={[0, tankHeight / 2 + frameThickness / 2, tankDepth / 2 + frameThickness / 2]} castShadow={false}>
        <boxGeometry args={[tankWidth + frameThickness * 2, frameThickness, frameThickness]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.4} metalness={0.2} />
      </mesh>
      <mesh position={[0, tankHeight / 2 + frameThickness / 2, -tankDepth / 2 - frameThickness / 2]} castShadow={false}>
        <boxGeometry args={[tankWidth + frameThickness * 2, frameThickness, frameThickness]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.4} metalness={0.2} />
      </mesh>
      <mesh position={[-tankWidth / 2 - frameThickness / 2, tankHeight / 2 + frameThickness / 2, 0]} castShadow={false}>
        <boxGeometry args={[frameThickness, frameThickness, tankDepth]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.4} metalness={0.2} />
      </mesh>
      <mesh position={[tankWidth / 2 + frameThickness / 2, tankHeight / 2 + frameThickness / 2, 0]} castShadow={false}>
        <boxGeometry args={[frameThickness, frameThickness, tankDepth]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.4} metalness={0.2} />
      </mesh>
      <mesh position={[0, -tankHeight / 2 - frameThickness / 2, 0]} castShadow={false}>
        <boxGeometry args={[tankWidth + frameThickness * 2, frameThickness, tankDepth + frameThickness * 2]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.6} metalness={0.1} />
      </mesh>
      {[
        [-tankWidth / 2 - frameThickness / 2, 0, tankDepth / 2 + frameThickness / 2],
        [tankWidth / 2 + frameThickness / 2, 0, tankDepth / 2 + frameThickness / 2],
        [-tankWidth / 2 - frameThickness / 2, 0, -tankDepth / 2 - frameThickness / 2],
        [tankWidth / 2 + frameThickness / 2, 0, -tankDepth / 2 - frameThickness / 2],
      ].map((pos, i) => (
        <mesh key={`corner-${i}`} position={pos} castShadow={false}>
          <boxGeometry args={[frameThickness, tankHeight + frameThickness * 2, frameThickness]} />
          <meshStandardMaterial color="#0a0a0a" roughness={0.6} metalness={0.1} />
        </mesh>
      ))}

      {/* Substrate - REPLACED with Realistic Sand Floor */}
      <group position={[0, -tankHeight / 2 + 0.4, 0]}>
        <SandFloor />
      </group>

      {/* Sand Dust Particles */}
      <SandDust />

      {/* RED CORAL - Left side */}
      <primitive
        object={redCoral.clone()}
        position={[-10, -tankHeight / 2 + 0.5, -3]}
        scale={[0.5, 0.5, 0.5]}
        rotation={[0, 0.5, 0]}
      />

      {/* BLUE CORAL - Right side */}
      <primitive
        object={blueCoral.clone()}
        position={[10, -tankHeight / 2 + 0.5, -2]}
        scale={[0.5, 0.5, 0.5]}
        rotation={[0, -0.3, 0]}
      />

      {/* CORAL - Center back */}
      <primitive
        object={coral.clone()}
        position={[0, -tankHeight / 2 + 0.5, -6]}
        scale={[0.5, 0.5, 0.5]}
        rotation={[0, 0, 0]}
      />

      {/* SHELL - Front right */}
      <primitive
        object={shell.clone()}
        position={[8, -tankHeight / 2 + 0.5, 4]}
        scale={[0.3, 0.3, 0.3]}
        rotation={[0, 1.2, 0]}
      />

      {/* Additional coral placement - Left back */}
      <primitive
        object={coral.clone()}
        position={[-8, -tankHeight / 2 + 0.5, -5]}
        scale={[0.4, 0.4, 0.4]}
        rotation={[0, 1.5, 0]}
      />

      {/* Additional shell - Left front */}
      <primitive
        object={shell.clone()}
        position={[-6, -tankHeight / 2 + 0.5, 3]}
        scale={[0.25, 0.25, 0.25]}
        rotation={[0, -0.8, 0]}
      />
    </group>
  );
};

export default TankContainer;
