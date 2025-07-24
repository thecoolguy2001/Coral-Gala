import React, { useRef, useMemo } from 'react';
import { useFrame, extend, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// Simple water surface shader material
const vertexShader = `
  varying vec2 vUv;
  uniform float uTime;
  void main() {
    vUv = uv;
    vec3 pos = position;
    float wave1 = sin(pos.x * 2.0 + uTime * 1.2) * 0.2;
    float wave2 = cos(pos.y * 3.0 + uTime * 0.7) * 0.15;
    float wave3 = sin(pos.x * 4.0 + pos.y * 2.0 + uTime * 0.9) * 0.1;
    pos.z += wave1 + wave2 + wave3;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = `
  varying vec2 vUv;
  void main() {
    vec3 waterColor = vec3(0.18, 0.45, 0.7);
    float fresnel = pow(1.0 - dot(normalize(vec3(0.0, 0.0, 1.0)), normalize(vec3(0.0, 0.0, 1.0))), 2.0);
    fresnel = clamp(fresnel, 0.0, 1.0);
    gl_FragColor = vec4(waterColor + fresnel * 0.2, 0.85);
  }
`;

const WaterEffects = () => {
  const causticsRef = useRef();
  const lightRaysRef = useRef();
  const waterSurfaceRef = useRef();
  const { clock } = useThree();

  // Caustics effect for underwater light patterns
  const caustics = useMemo(() => {
    const causticCount = 150;
    const positions = new Float32Array(causticCount * 3);
    const sizes = new Float32Array(causticCount);
    const opacities = new Float32Array(causticCount);
    for (let i = 0; i < causticCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 35;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 15;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 35;
      sizes[i] = 0.1 + Math.random() * 0.3;
      opacities[i] = 0.05 + Math.random() * 0.1;
    }
    return { positions, sizes, opacities };
  }, []);

  // Light rays effect
  const lightRays = useMemo(() => {
    const rayCount = 20;
    const positions = new Float32Array(rayCount * 3);
    const lengths = new Float32Array(rayCount);
    const opacities = new Float32Array(rayCount);
    for (let i = 0; i < rayCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = 8 + Math.random() * 4;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 30;
      lengths[i] = 3 + Math.random() * 8;
      opacities[i] = 0.02 + Math.random() * 0.03;
    }
    return { positions, lengths, opacities };
  }, []);

  useFrame(() => {
    // Animate caustics
    if (causticsRef.current) {
      const positions = causticsRef.current.geometry.attributes.position.array;
      const opacities = causticsRef.current.geometry.attributes.opacity.array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i] += Math.sin(clock.elapsedTime * 0.2 + i * 0.1) * 0.01;
        positions[i + 1] += Math.cos(clock.elapsedTime * 0.15 + i * 0.08) * 0.008;
        positions[i + 2] += Math.sin(clock.elapsedTime * 0.25 + i * 0.12) * 0.01;
        opacities[i / 3] = caustics.opacities[i / 3] * (0.8 + Math.sin(clock.elapsedTime + i * 0.5) * 0.2);
        if (positions[i] > 17.5) positions[i] = -17.5;
        if (positions[i] < -17.5) positions[i] = 17.5;
        if (positions[i + 1] > 7.5) positions[i + 1] = -7.5;
        if (positions[i + 1] < -7.5) positions[i + 1] = 7.5;
        if (positions[i + 2] > 17.5) positions[i + 2] = -17.5;
        if (positions[i + 2] < -17.5) positions[i + 2] = 17.5;
      }
      causticsRef.current.geometry.attributes.position.needsUpdate = true;
      causticsRef.current.geometry.attributes.opacity.needsUpdate = true;
    }
    // Animate light rays
    if (lightRaysRef.current) {
      const positions = lightRaysRef.current.geometry.attributes.position.array;
      const opacities = lightRaysRef.current.geometry.attributes.opacity.array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] -= 0.003;
        positions[i] += Math.sin(clock.elapsedTime * 0.1 + i * 0.3) * 0.002;
        positions[i + 2] += Math.cos(clock.elapsedTime * 0.08 + i * 0.25) * 0.002;
        const progress = (positions[i + 1] + 10) / 20;
        opacities[i / 3] = lightRays.opacities[i / 3] * Math.max(0, progress);
        if (positions[i + 1] < -10) {
          positions[i] = (Math.random() - 0.5) * 30;
          positions[i + 1] = 8 + Math.random() * 4;
          positions[i + 2] = (Math.random() - 0.5) * 30;
          opacities[i / 3] = lightRays.opacities[i / 3];
        }
      }
      lightRaysRef.current.geometry.attributes.position.needsUpdate = true;
      lightRaysRef.current.geometry.attributes.opacity.needsUpdate = true;
    }
    // Animate water surface
    if (waterSurfaceRef.current) {
      waterSurfaceRef.current.material.uniforms.uTime.value = clock.elapsedTime;
    }
  });

  return (
    <group>
      {/* Realistic animated water surface */}
      <mesh ref={waterSurfaceRef} position={[0, 0, -2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[40, 40, 128, 128]} />
        <shaderMaterial
          attach="material"
          args={[{
            uniforms: {
              uTime: { value: 0 }
            },
            vertexShader,
            fragmentShader,
            transparent: true,
            side: THREE.DoubleSide
          }]}
        />
      </mesh>
      {/* Caustics effect */}
      <points ref={causticsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={caustics.positions.length / 3}
            array={caustics.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            count={caustics.sizes.length}
            array={caustics.sizes}
            itemSize={1}
          />
          <bufferAttribute
            attach="attributes-opacity"
            count={caustics.opacities.length}
            array={caustics.opacities}
            itemSize={1}
          />
        </bufferGeometry>
        <pointsMaterial
          size={1}
          color="#ffffff"
          transparent
          opacity={1}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
        />
      </points>
      {/* Light rays */}
      <points ref={lightRaysRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={lightRays.positions.length / 3}
            array={lightRays.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            count={lightRays.lengths.length}
            array={lightRays.lengths}
            itemSize={1}
          />
          <bufferAttribute
            attach="attributes-opacity"
            count={lightRays.opacities.length}
            array={lightRays.opacities}
            itemSize={1}
          />
        </bufferGeometry>
        <pointsMaterial
          size={1}
          color="#ffffff"
          transparent
          opacity={1}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
};

export default WaterEffects; 