import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TANK_WIDTH, TANK_HEIGHT, TANK_DEPTH, GLASS_THICKNESS, FRAME_THICKNESS, INTERIOR_WIDTH, INTERIOR_DEPTH, WATER_LEVEL } from '../constants/tankDimensions';

/**
 * TankContainer - Renders the physical aquarium tank structure
 */
const TankContainer = () => {
  const tankRef = useRef();
  const fernRef = useRef();
  const coralRef1 = useRef();
  const coralRef2 = useRef();

  // Use shared tank dimensions
  const tankWidth = TANK_WIDTH - 0.4; // Slightly smaller to close gap with water
  const tankHeight = TANK_HEIGHT;
  const tankDepth = TANK_DEPTH - 0.4;
  const glassThickness = GLASS_THICKNESS;
  const frameThickness = FRAME_THICKNESS;

  // Animate plants and corals swaying in the current
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    
    if (fernRef.current) {
      fernRef.current.children.forEach((leaf, i) => {
        leaf.rotation.z = (Math.PI / 6) + Math.sin(t * 0.8 + i) * 0.05;
        leaf.rotation.x = Math.cos(t * 0.5 + i) * 0.02;
      });
    }
    
    if (coralRef1.current) {
      coralRef1.current.rotation.y = Math.sin(t * 0.5) * 0.05;
      coralRef1.current.scale.setScalar(1 + Math.sin(t * 1.2) * 0.02);
    }

    if (coralRef2.current) {
      coralRef2.current.rotation.x = Math.sin(t * 0.4) * 0.03;
      coralRef2.current.children.forEach((poly, i) => {
        poly.position.y = (poly.position.y || 0.5) + Math.sin(t * 2.0 + i) * 0.005;
      });
    }
  });

  // Custom Sand Shader
  const sandMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: "#f0e8d8",
      roughness: 0.9,
      onBeforeCompile: (shader) => {
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <common>',
          `
          #include <common>
          float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
          `
        );
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <color_fragment>',
          `
          #include <color_fragment>
          float n = hash(vUv * 500.0);
          float n2 = hash(vUv * 10.0);
          diffuseColor.rgb *= (0.95 + n * 0.1); // Grainy texture
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.9, n2 * 0.2); // Color patches
          `
        );
      }
    });
  }, []);

  return (
    <group ref={tankRef}>
      {/* Glass Walls */}
      <mesh position={[0, 0, tankDepth / 2]}>
        <boxGeometry args={[tankWidth, tankHeight, glassThickness]} />
        <meshPhysicalMaterial
          color="#ffffff"
          transparent
          opacity={0.2}
          roughness={0.02}
          metalness={0.1}
          transmission={0.98}
          thickness={1.5}
          attenuationColor="#c0ebd7"
          attenuationDistance={10}
          envMapIntensity={1}
          depthWrite={false} 
        />
      </mesh>

      <mesh position={[0, 0, -tankDepth / 2]}>
        <boxGeometry args={[tankWidth, tankHeight, glassThickness]} />
        <meshPhysicalMaterial
          color="#050a15"
          transparent
          opacity={0.95}
          roughness={0.2}
          metalness={0.1}
          transmission={0.1}
          depthWrite={false} 
        />
      </mesh>

      <mesh position={[-tankWidth / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[tankDepth, tankHeight, glassThickness]} />
        <meshPhysicalMaterial
          color="#ffffff"
          transparent
          opacity={0.2}
          roughness={0.02}
          metalness={0.1}
          transmission={0.98}
          thickness={1.5}
          attenuationColor="#c0ebd7"
          attenuationDistance={10}
          depthWrite={false} 
        />
      </mesh>

      <mesh position={[tankWidth / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[tankDepth, tankHeight, glassThickness]} />
        <meshPhysicalMaterial
          color="#ffffff"
          transparent
          opacity={0.2}
          roughness={0.02}
          metalness={0.1}
          transmission={0.98}
          thickness={1.5}
          attenuationColor="#c0ebd7"
          attenuationDistance={10}
          depthWrite={false} 
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
          depthWrite={false} 
        />
      </mesh>

      {/* Tank Frame */}
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

      {/* Substrate */}
      <mesh position={[0, -tankHeight / 2 + 0.3, 0]} receiveShadow material={sandMaterial}>
        <boxGeometry args={[tankWidth - 0.2, 0.6, tankDepth - 0.2]} />
      </mesh>

      {/* DRIFTWOOD CENTERPIECE */}
      <group position={[-8, -tankHeight / 2 + 1.5, -2]}>
        <mesh rotation={[0, 0.4, -0.2]} castShadow receiveShadow>
          <cylinderGeometry args={[0.6, 0.9, 6, 8]} />
          <meshStandardMaterial color="#5a4538" roughness={0.8} />
        </mesh>
        <mesh position={[1.5, 1.8, 0.3]} rotation={[0.4, 0.2, 0.6]} castShadow receiveShadow>
          <cylinderGeometry args={[0.3, 0.4, 3.5, 8]} />
          <meshStandardMaterial color="#4a3528" roughness={0.85} />
        </mesh>
      </group>

      {/* JAVA FERN CLUSTER (Animated Sway) */}
      <group ref={fernRef} position={[-8, -tankHeight / 2 + 2.5, -2]}>
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
              <meshStandardMaterial color="#2d5a3d" roughness={0.7} transparent opacity={0.9} />
            </mesh>
          );
        })}
      </group>

      {/* ROCK FORMATION */}
      <group position={[0, -tankHeight / 2 + 1.2, -7]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[4, 2.5, 2.5]} />
          <meshStandardMaterial color="#7a8a9a" roughness={0.75} />
        </mesh>
        <mesh position={[-1, 1.8, 0.3]} rotation={[0, 0.2, 0.05]} castShadow receiveShadow>
          <boxGeometry args={[2, 1.5, 1.8]} />
          <meshStandardMaterial color="#8a9aaa" roughness={0.7} />
        </mesh>
      </group>

      {/* SOFT CORAL ACCENT (Animated Sway) */}
      <group ref={coralRef2} position={[10, -tankHeight / 2 + 1, 3]}>
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[0.8, 12, 12]} />
          <meshStandardMaterial color="#ff8ab6" roughness={0.4} emissive="#ff6a96" emissiveIntensity={0.3} />
        </mesh>
        {[...Array(4)].map((_, i) => {
          const angle = (i / 4) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(angle) * 0.6, 0.5, Math.sin(angle) * 0.6]} castShadow receiveShadow>
              <sphereGeometry args={[0.25, 8, 8]} />
              <meshStandardMaterial color="#ffaac6" roughness={0.3} emissive="#ff8ab6" emissiveIntensity={0.4} />
            </mesh>
          );
        })}
      </group>

      {/* BLUE CORAL ACCENT (Animated Sway) */}
      <group ref={coralRef1} position={[-12, -tankHeight / 2 + 1, -4]}>
        {[...Array(5)].map((_, i) => {
          const angle = (i / 5) * Math.PI * 2;
          const height = 2 + Math.random() * 0.8;
          return (
            <mesh key={i} position={[Math.cos(angle) * 0.5, height / 2, Math.sin(angle) * 0.5]} rotation={[0.2, angle, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[0.06, 0.1, height, 6]} />
              <meshStandardMaterial color="#4d9fff" roughness={0.5} emissive="#2d7fdf" emissiveIntensity={0.4} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
};

export default TankContainer;
