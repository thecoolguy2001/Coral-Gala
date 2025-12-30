import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TANK_WIDTH, TANK_HEIGHT, TANK_DEPTH } from '../constants/tankDimensions';

/**
 * RealisticCaustics - Advanced light refraction effects
 * Creates realistic underwater light patterns that project through the entire volume
 */
const RealisticCaustics = () => {
  const causticsRef = useRef();

  const causticsMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        intensity: { value: 0.25 }, // Balanced intensity for volume
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        varying vec3 vWorldPosition;

        void main() {
          vUv = uv;
          vPosition = position;
          vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float intensity;
        varying vec2 vUv;
        varying vec3 vPosition;
        varying vec3 vWorldPosition;

        // Simplified, robust caustic function
        float causticPattern(vec2 uv, float time) {
            float v = 0.0;
            // Simple sine wave interference
            v += sin(uv.x * 20.0 + time);
            v += sin(uv.y * 15.0 + time * 0.7);
            v += sin((uv.x + uv.y) * 10.0 + time * 0.5);
            // Sharpen the result to create "lines" of light
            return pow(0.5 + 0.5 * v / 3.0, 8.0);
        }

        void main() {
          vec3 pos = vWorldPosition;
          
          // Project from top (XZ plane)
          vec2 uv = pos.xz * 0.05;
          
          // Animate
          float c1 = causticPattern(uv, time * 2.0);
          float c2 = causticPattern(uv + vec2(0.3), time * 1.5 + 2.0);
          
          float caustics = (c1 * 0.6 + c2 * 0.4) * intensity;
          
          // Fade edges vertically
          float alpha = smoothstep(-12.0, 10.0, pos.y);
          
          vec3 color = vec3(0.7, 0.9, 1.0);
          
          gl_FragColor = vec4(color * caustics, caustics * 0.3);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  }, []);

  useFrame(({ clock }) => {
    if (causticsRef.current) {
      causticsMaterial.uniforms.time.value = clock.elapsedTime;
    }
  });

  // Box geometry fills the tank volume
  return (
    <mesh
      ref={causticsRef}
      position={[0, 0, 0]}
      material={causticsMaterial}
    >
      <boxGeometry args={[TANK_WIDTH - 1, TANK_HEIGHT - 1, TANK_DEPTH - 1]} />
    </mesh>
  );
};

export default RealisticCaustics;
