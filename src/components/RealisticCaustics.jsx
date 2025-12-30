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

        // Improved caustic function
        float causticPattern(vec2 uv, float time) {
          vec2 p = mod(uv * 6.28318, 6.28318) - 250.0;
          vec2 i = vec2(p);
          float c = 1.0;
          float inten = 0.005;

          for (int n = 0; n < 4; n++) {
            float t = time * (1.0 - (3.5 / float(n + 1)));
            i = p + vec2(
              cos(t - i.x) + sin(t + i.y),
              sin(t - i.y) + cos(t + i.x)
            );
            // Add epsilon to avoid division by zero
            c += 1.0 / length(vec2(
              p.x / (sin(i.x + t) / inten + 0.001),
              p.y / (cos(i.y + t) / inten + 0.001)
            ));
          }

          c /= float(4);
          c = 1.17 - pow(c, 1.4);
          return pow(abs(c), 8.0);
        }

        void main() {
          // Calculate caustics based on XZ world position (projecting from top)
          // Scale UV by Y depth to create light shafts look
          float depthFactor = (vWorldPosition.y + 12.0) / 25.0; // Normalized depth
          vec2 uv = vWorldPosition.xz * 0.2; 
          
          // Animate drift - FASTER
          uv += vec2(sin(time * 0.2), cos(time * 0.25)) * 0.1;

          // Multi-layer caustics - FASTER
          float c1 = causticPattern(uv * 3.0, time * 0.8);
          float c2 = causticPattern(uv * 2.5 + vec2(0.5), time * 0.7);
          
          float caustics = (c1 + c2 * 0.5) * intensity;

          // Fade caustics with depth slightly
          caustics *= smoothstep(-15.0, 15.0, vWorldPosition.y + 5.0);

          vec3 finalColor = vec3(0.8, 0.9, 1.0) * caustics;
          
          // High alpha but transparent so it blends with EVERYTHING inside
          gl_FragColor = vec4(finalColor, caustics * 0.8); 
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
