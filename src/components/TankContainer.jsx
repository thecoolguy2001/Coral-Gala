import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshReflectorMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { TANK_WIDTH, TANK_HEIGHT, TANK_DEPTH, GLASS_THICKNESS, FRAME_THICKNESS } from '../constants/tankDimensions';
import SandDust from './SandDust';

/**
 * TankContainer - Renders the physical aquarium tank structure
 */
const TankContainer = () => {
  const tankRef = useRef();
  const fernRef = useRef();
  const coralRef1 = useRef();
  const coralRef2 = useRef();

  // Use shared tank dimensions
  const tankWidth = TANK_WIDTH - 0.4;
  const tankHeight = TANK_HEIGHT;
  const tankDepth = TANK_DEPTH - 0.4;
  const glassThickness = GLASS_THICKNESS;
  const frameThickness = FRAME_THICKNESS;

  // Animate plants and corals
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

  // Custom Sand Shader with Emissive Glow to resist blue tint
  const sandMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: "#ffffff",
      roughness: 0.8,
      emissive: "#fff0d5", // Warm glow to counter blue water
      emissiveIntensity: 0.05,
      onBeforeCompile: (shader) => {
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <common>',
          `
          #include <common>
          float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
          float noise(vec2 p) {
              vec2 i = floor(p);
              vec2 f = fract(p);
              f = f*f*(3.0-2.0*f);
              return mix(mix(hash(i + vec2(0.0,0.0)), hash(i + vec2(1.0,0.0)), f.x),
                         mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), f.x), f.y);
          }
          `
        );
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <normal_fragment_begin>',
          `
          #include <normal_fragment_begin>
          float h = noise(vUv * 800.0);
          vec3 grainNormal = normalize(vec3(dFdx(h), dFdy(h), 0.5));
          normal = normalize(normal + grainNormal * 0.3);
          `
        );
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <color_fragment>',
          `
          #include <color_fragment>
          float n = hash(vUv * 500.0);
          float dust = noise(vUv * 20.0);
          
          diffuseColor.rgb *= (0.9 + n * 0.2);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0, 0.98, 0.9), dust * 0.3);
          `
        );
      }
    });
  }, []);

  return (
    <group ref={tankRef}>
      {/* Front Glass (Transparent) */}
      <mesh position={[0, 0, tankDepth / 2]} castShadow={false} receiveShadow={false}>
        <boxGeometry args={[tankWidth, tankHeight, glassThickness]} />
        <meshPhysicalMaterial
          color="#ffffff"
          transparent
          opacity={0.1}
          roughness={0.05}
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
          opacity={0.1}
          roughness={0.05}
          metalness={0.1}
          transmission={0.99}
          thickness={0.1}
          depthWrite={false}
        />
      </mesh>
      {/* Internal Reflection Plane - Back */}
      <mesh position={[0, 0, -tankDepth / 2 + 0.1]} rotation={[0, 0, 0]} castShadow={false} receiveShadow={false}>
        <planeGeometry args={[tankWidth, tankHeight]} />
        <MeshReflectorMaterial
          blur={[0, 0]}
          resolution={512}
          mixBlur={0}
          mixStrength={4} // Subtle glass reflection
          roughness={0} // Sharp
          depthScale={1.2}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#ffffff" // Clear
          metalness={0}
          mirror={1}
          transparent={true}
          opacity={0.15}
          depthWrite={false}
        />
      </mesh>

      {/* Left Glass - REFLECTIVE */}
      <mesh position={[-tankWidth / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]} castShadow={false} receiveShadow={false}>
        <boxGeometry args={[tankDepth, tankHeight, glassThickness]} />
        <meshPhysicalMaterial
          color="#ffffff"
          transparent
          opacity={0.1}
          roughness={0.1}
          transmission={0.9}
        />
      </mesh>
      {/* Internal Reflection Plane - Left */}
      <mesh position={[-tankWidth / 2 + 0.1, 0, 0]} rotation={[0, Math.PI / 2, 0]} castShadow={false} receiveShadow={false}>
        <planeGeometry args={[tankDepth, tankHeight]} />
        <MeshReflectorMaterial
          blur={[0, 0]}
          resolution={256}
          mixBlur={0}
          mixStrength={4}
          roughness={0}
          depthScale={1.2}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#ffffff"
          metalness={0}
          mirror={1}
          transparent={true}
          opacity={0.15}
          depthWrite={false}
        />
      </mesh>

      {/* Right Glass - REFLECTIVE */}
      <mesh position={[tankWidth / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]} castShadow={false} receiveShadow={false}>
        <boxGeometry args={[tankDepth, tankHeight, glassThickness]} />
        <meshPhysicalMaterial
          color="#ffffff"
          transparent
          opacity={0.1}
          roughness={0.1}
          transmission={0.9}
        />
      </mesh>
      {/* Internal Reflection Plane - Right */}
      <mesh position={[tankWidth / 2 - 0.1, 0, 0]} rotation={[0, -Math.PI / 2, 0]} castShadow={false} receiveShadow={false}>
        <planeGeometry args={[tankDepth, tankHeight]} />
        <MeshReflectorMaterial
          blur={[0, 0]}
          resolution={256}
          mixBlur={0}
          mixStrength={4}
          roughness={0}
          depthScale={1.2}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#ffffff"
          metalness={0}
          mirror={1}
          transparent={true}
          opacity={0.15}
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

      {/* Substrate */}
      <mesh position={[0, -tankHeight / 2 + 0.3, 0]} receiveShadow material={sandMaterial}>
        <boxGeometry args={[tankWidth - 0.2, 0.6, tankDepth - 0.2]} />
      </mesh>

      {/* Sand Dust Particles */}
      <SandDust />

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

      {/* JAVA FERN CLUSTER */}
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

      {/* SOFT CORAL ACCENT */}
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

      {/* BLUE CORAL ACCENT */}
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
