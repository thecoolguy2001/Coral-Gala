import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// Procedural caustics shader (simple animated light ripples)
const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = `
  varying vec2 vUv;
  uniform float uTime;
  
  // Simple caustics pattern using layered sines
  float caustic(vec2 uv, float t) {
    float c = 0.0;
    c += sin((uv.x + t * 0.2) * 12.0 + sin(uv.y * 8.0 + t * 0.5) * 0.5) * 0.25;
    c += sin((uv.y - t * 0.15) * 14.0 + cos(uv.x * 7.0 - t * 0.3) * 0.5) * 0.25;
    c += sin((uv.x + uv.y + t * 0.1) * 10.0) * 0.15;
    c += sin((uv.x - uv.y - t * 0.18) * 8.0) * 0.15;
    return c;
  }

  void main() {
    vec2 uv = vUv;
    float t = uTime;
    float c = caustic(uv, t);
    float intensity = 0.5 + 0.5 * c;
    intensity = pow(intensity, 2.5); // Sharpen
    vec3 causticsColor = vec3(1.0, 1.0, 0.85) * intensity * 0.45; // Soft yellowish light
    gl_FragColor = vec4(causticsColor, intensity * 0.45);
  }
`;

const WaterEffects = () => {
  const meshRef = useRef();
  const { size, clock } = useThree();

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.material.uniforms.uTime.value = clock.elapsedTime;
    }
  });

  // Fullscreen quad covers the viewport
  return (
    <mesh
      ref={meshRef}
      position={[0, 0, 0]}
      scale={[size.width / size.height, 1, 1]}
      frustumCulled={false}
    >
      <planeGeometry args={[2, 2, 1, 1]} />
      <shaderMaterial
        attach="material"
        args={[{
          uniforms: {
            uTime: { value: 0 }
          },
          vertexShader,
          fragmentShader,
          transparent: true,
          depthWrite: false,
        }]}
      />
    </mesh>
  );
};

export default WaterEffects; 