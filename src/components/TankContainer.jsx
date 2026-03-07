import React, { useRef, Suspense } from 'react';
import { MeshReflectorMaterial, useGLTF, Clone } from '@react-three/drei';
import * as THREE from 'three';
import { TANK_WIDTH, TANK_HEIGHT, TANK_DEPTH, GLASS_THICKNESS, FRAME_THICKNESS } from '../constants/tankDimensions';
import SandDust from './SandDust';
import SandFloor from './SandFloor';

/**
 * TankContainer - Renders the physical aquarium tank structure
 */
const TankContainer = () => {
  const tankRef = useRef();

  // Load all decoration models
  const { scene: redCoral } = useGLTF('/coral/low_poly_red_coral.glb');
  const { scene: blueCoral } = useGLTF('/coral/blue_lowpoly_coral.glb');
  const { scene: lowpolyCoral } = useGLTF('/coral/lowpoly_coral.glb');
  const { scene: lowpolyCoral2 } = useGLTF('/coral/lowpoly_coral2.glb');
  // shell removed - model not rendering
  const { scene: chromaCoral } = useGLTF('/coral/chromaflare_reef_-_coral.glb');
  const { scene: coral } = useGLTF('/coral/coral.glb');
  const { scene: coral2 } = useGLTF('/coral/coral2.glb');
  // siderastrea removed - model not rendering

  // Use shared tank dimensions
  const tankWidth = TANK_WIDTH - 0.4;
  const tankHeight = TANK_HEIGHT;
  const tankDepth = TANK_DEPTH - 0.4;
  const glassThickness = GLASS_THICKNESS;
  const frameThickness = FRAME_THICKNESS;

  // Sand bed is 0.8 units thick + dune displacement on top
  // Decorations sit on top of the sand surface
  const sandThickness = 0.8;
  const floorY = -tankHeight / 2 + sandThickness + 0.5;

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
          blur={[200, 200]}
          resolution={512}
          mixBlur={0.8}
          mixStrength={40}
          roughness={0.15}
          depthScale={1.2}
          minDepthThreshold={0}
          maxDepthThreshold={50}
          color="#ffffff"
          metalness={0}
          mirror={0.7}
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
          blur={[200, 200]}
          resolution={512}
          mixBlur={0.8}
          mixStrength={40}
          roughness={0.15}
          depthScale={1.2}
          minDepthThreshold={0}
          maxDepthThreshold={50}
          color="#ffffff"
          metalness={0}
          mirror={0.7}
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
          blur={[200, 200]}
          resolution={512}
          mixBlur={0.8}
          mixStrength={40}
          roughness={0.15}
          depthScale={1.2}
          minDepthThreshold={0}
          maxDepthThreshold={50}
          color="#ffffff"
          metalness={0}
          mirror={0.7}
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

      {/* Tank Frame - slightly offset outward from glass */}
      {/* Top front bar */}
      <mesh position={[0, tankHeight / 2 + frameThickness / 2, tankDepth / 2 + frameThickness / 3]} castShadow={false}>
        <boxGeometry args={[tankWidth + frameThickness * 1.5, frameThickness, frameThickness]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.4} metalness={0.2} />
      </mesh>
      {/* Top back bar */}
      <mesh position={[0, tankHeight / 2 + frameThickness / 2, -tankDepth / 2 - frameThickness / 3]} castShadow={false}>
        <boxGeometry args={[tankWidth + frameThickness * 1.5, frameThickness, frameThickness]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.4} metalness={0.2} />
      </mesh>
      {/* Top left bar */}
      <mesh position={[-tankWidth / 2 - frameThickness / 3, tankHeight / 2 + frameThickness / 2, 0]} castShadow={false}>
        <boxGeometry args={[frameThickness, frameThickness, tankDepth]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.4} metalness={0.2} />
      </mesh>
      {/* Top right bar */}
      <mesh position={[tankWidth / 2 + frameThickness / 3, tankHeight / 2 + frameThickness / 2, 0]} castShadow={false}>
        <boxGeometry args={[frameThickness, frameThickness, tankDepth]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.4} metalness={0.2} />
      </mesh>
      {/* Bottom bar */}
      <mesh position={[0, -tankHeight / 2 - frameThickness / 2, 0]} castShadow={false}>
        <boxGeometry args={[tankWidth + frameThickness * 1.5, frameThickness, tankDepth + frameThickness * 1.5]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.6} metalness={0.1} />
      </mesh>
      {/* Corner posts */}
      {[
        [-tankWidth / 2 - frameThickness / 3, 0, tankDepth / 2 + frameThickness / 3],
        [tankWidth / 2 + frameThickness / 3, 0, tankDepth / 2 + frameThickness / 3],
        [-tankWidth / 2 - frameThickness / 3, 0, -tankDepth / 2 - frameThickness / 3],
        [tankWidth / 2 + frameThickness / 3, 0, -tankDepth / 2 - frameThickness / 3],
      ].map((pos, i) => (
        <mesh key={`corner-${i}`} position={pos} castShadow={false}>
          <boxGeometry args={[frameThickness, tankHeight + frameThickness * 2, frameThickness]} />
          <meshStandardMaterial color="#0a0a0a" roughness={0.6} metalness={0.1} />
        </mesh>
      ))}

      {/* Substrate - REPLACED with Realistic Sand Floor */}
      {/* Sand bed sits at the very bottom of the tank */}
      <group position={[0, -tankHeight / 2, 0]}>
        <SandFloor />
      </group>

      {/* Sand Dust Particles */}
      <SandDust />

      {/* CORAL DECORATIONS - Lazy loaded for performance */}
      <Suspense fallback={null}>
      <group>
        {/* RED CORAL - Hero centerpiece, back middle */}
        <Clone
          object={redCoral}
          position={[0, floorY - 2.0, -3]}
          scale={1.8}
          rotation={[0, 0.2, 0]}
          castShadow
          receiveShadow
        />

        {/* CHROMAFLARE - Back left, tall piece */}
        <Clone
          object={chromaCoral}
          position={[-14, floorY, -6]}
          scale={2.0}
          rotation={[0, 0.5, 0]}
          castShadow
          receiveShadow
        />

        {/* BLUE CORAL - Back right, tall piece */}
        <Clone
          object={blueCoral}
          position={[14, floorY, -6]}
          scale={1.8}
          rotation={[0, -0.3, 0]}
          castShadow
          receiveShadow
        />

        {/* LOWPOLY CORAL - Left side, mid-ground */}
        <Clone
          object={lowpolyCoral}
          position={[-16, floorY, 0]}
          scale={0.6}
          rotation={[0, 0.8, 0]}
          castShadow
          receiveShadow
        />

        {/* LOWPOLY CORAL 2 - Right side, mid-ground */}
        <Clone
          object={lowpolyCoral2}
          position={[16, floorY, 0]}
          scale={0.5}
          rotation={[0, -0.6, 0]}
          castShadow
          receiveShadow
        />

        {/* CORAL - Front left accent */}
        <Clone
          object={coral}
          position={[-13, floorY, 5]}
          scale={0.15}
          rotation={[0, 1.0, 0]}
          castShadow
          receiveShadow
        />

        {/* CORAL 2 - Front right accent */}
        <Clone
          object={coral2}
          position={[13, floorY, 5]}
          scale={0.5}
          rotation={[0, -0.5, 0]}
          castShadow
          receiveShadow
        />

      </group>
      </Suspense>
    </group>
  );
};

export default TankContainer;

