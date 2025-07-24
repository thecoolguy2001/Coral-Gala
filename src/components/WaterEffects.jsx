import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
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
  const waterSurfaceRef = useRef();
  const { clock } = useThree();

  useFrame(() => {
    if (waterSurfaceRef.current) {
      waterSurfaceRef.current.material.uniforms.uTime.value = clock.elapsedTime;
    }
  });

  return (
    <group>
      {/* Realistic animated water surface only, no caustics or light rays */}
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
    </group>
  );
};

export default WaterEffects; 