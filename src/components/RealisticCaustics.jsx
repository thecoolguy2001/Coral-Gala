import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TANK_WIDTH, TANK_HEIGHT, TANK_DEPTH } from '../constants/tankDimensions';

/**
 * RealisticCaustics - Advanced light refraction effects
 * Creates realistic underwater light patterns that bounce off surfaces
 */
const RealisticCaustics = () => {
  const causticsRef = useRef();

  const causticsMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        intensity: { value: 0.4 }, // Lighter intensity
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        varying vec3 vNormal;

        void main() {
          vUv = uv;
          vPosition = position;
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float intensity;
        varying vec2 vUv;
        varying vec3 vPosition;
        varying vec3 vNormal;

        // Improved caustic function for realistic water light patterns
        float causticPattern(vec2 uv, float time) {
          vec2 p = mod(uv * 6.28318, 6.28318) - 250.0;
          vec2 i = vec2(p);
          float c = 1.0;
          float inten = 0.005;

          // OPTIMIZED: Reduced iterations from 7 to 4 for performance
          for (int n = 0; n < 4; n++) {
            float t = time * (1.0 - (3.5 / float(n + 1)));
            i = p + vec2(
              cos(t - i.x) + sin(t + i.y),
              sin(t - i.y) + cos(t + i.x)
            );
            c += 1.0 / length(vec2(
              p.x / (sin(i.x + t) / inten),
              p.y / (cos(i.y + t) / inten)
            ));
          }

          c /= float(4);
          c = 1.17 - pow(c, 1.4);
          return pow(abs(c), 8.0);
        }

        void main() {
          // Create layered caustics for depth
          vec2 uv = vUv * 0.8; // Large, soft, blobby patterns

          float c1 = causticPattern(uv, time * 0.2); // Slower motion
          float c2 = causticPattern(uv * 0.7 + vec2(0.3), time * 0.15);

          // Combined for softer effect
          float caustics = (c1 + c2 * 0.8) * intensity;

          // Light color - soft blue-white
          vec3 lightColor = vec3(0.85, 0.95, 1.0); 
          
          // Output with soft alpha for "light" look
          gl_FragColor = vec4(lightColor, caustics * 0.4); 
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

  // Create multiple caustic layers for depth
  return (
    <group>
      {/* Bottom caustics - ONLY on the floor */}
      <mesh
        position={[0, -TANK_HEIGHT / 2 + 0.5, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={causticsMaterial}
      >
        <planeGeometry args={[TANK_WIDTH - 1, TANK_DEPTH - 1, 1, 1]} />
      </mesh>
    </group>
  );
};

export default RealisticCaustics;
