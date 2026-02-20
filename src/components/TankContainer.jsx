import React, { useRef } from 'react';
import { MeshReflectorMaterial, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { TANK_WIDTH, TANK_HEIGHT, TANK_DEPTH, GLASS_THICKNESS, FRAME_THICKNESS } from '../constants/tankDimensions';
import SandDust from './SandDust';
import SandFloor from './SandFloor';

// Preload tank decoration models
useGLTF.preload('/coral/low_poly_red_coral.glb');
useGLTF.preload('/coral/blue_lowpoly_coral.glb');
useGLTF.preload('/coral/lowpoly_coral.glb');
useGLTF.preload('/coral/lowpoly_coral (1).glb');
useGLTF.preload('/coral/lambis_shell.glb');
useGLTF.preload('/coral/chromaflare_reef_-_coral.glb');
useGLTF.preload('/coral/coral.glb');
useGLTF.preload('/coral/coral (1).glb');
useGLTF.preload('/coral/coral_siderastrea_pliocenica_remade.glb');

/**
 * TankContainer - Renders the physical aquarium tank structure
 */
const TankContainer = () => {
  const tankRef = useRef();

  // Load all decoration models
  const { scene: redCoral } = useGLTF('/coral/low_poly_red_coral.glb');
  const { scene: blueCoral } = useGLTF('/coral/blue_lowpoly_coral.glb');
  const { scene: lowpolyCoral } = useGLTF('/coral/lowpoly_coral.glb');
  const { scene: lowpolyCoral2 } = useGLTF('/coral/lowpoly_coral (1).glb');
  const { scene: shell } = useGLTF('/coral/lambis_shell.glb');
  const { scene: chromaCoral } = useGLTF('/coral/chromaflare_reef_-_coral.glb');
  const { scene: coral } = useGLTF('/coral/coral.glb');
  const { scene: coral2 } = useGLTF('/coral/coral (1).glb');
  const { scene: siderastreaCoral } = useGLTF('/coral/coral_siderastrea_pliocenica_remade.glb');

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

      {/* 1. RED CORAL - Left back */}
      <primitive
        object={redCoral.clone()}
        position={[-12, -tankHeight / 2 + 1, -5]}
        scale={[2, 2, 2]}
        rotation={[0, 0.5, 0]}
      />

      {/* 2. BLUE CORAL - Right back */}
      <primitive
        object={blueCoral.clone()}
        position={[12, -tankHeight / 2 + 1, -4]}
        scale={[2, 2, 2]}
        rotation={[0, -0.3, 0]}
      />

      {/* 3. LOWPOLY CORAL - Center back */}
      <primitive
        object={lowpolyCoral.clone()}
        position={[0, -tankHeight / 2 + 1, -7]}
        scale={[2, 2, 2]}
        rotation={[0, 0, 0]}
      />

      {/* 4. LOWPOLY CORAL 2 - Left center */}
      <primitive
        object={lowpolyCoral2.clone()}
        position={[-8, -tankHeight / 2 + 1, -2]}
        scale={[2, 2, 2]}
        rotation={[0, 1.0, 0]}
      />

      {/* 5. SHELL - Front center */}
      <primitive
        object={shell.clone()}
        position={[0, -tankHeight / 2 + 1, 3]}
        scale={[1.5, 1.5, 1.5]}
        rotation={[0, 0.5, 0]}
      />

      {/* 6. CHROMAFLARE REEF CORAL - Right center */}
      <primitive
        object={chromaCoral.clone()}
        position={[8, -tankHeight / 2 + 1, -1]}
        scale={[2, 2, 2]}
        rotation={[0, -0.8, 0]}
      />

      {/* 7. CORAL - Left front */}
      <primitive
        object={coral.clone()}
        position={[-10, -tankHeight / 2 + 1, 2]}
        scale={[2, 2, 2]}
        rotation={[0, 0.3, 0]}
      />

      {/* 8. CORAL 2 - Right front */}
      <primitive
        object={coral2.clone()}
        position={[10, -tankHeight / 2 + 1, 2]}
        scale={[2, 2, 2]}
        rotation={[0, -0.5, 0]}
      />

      {/* 9. SIDERASTREA CORAL - Center */}
      <primitive
        object={siderastreaCoral.clone()}
        position={[4, -tankHeight / 2 + 1, -3]}
        scale={[2, 2, 2]}
        rotation={[0, 1.2, 0]}
      />
    </group>
  );
};

export default TankContainer;
