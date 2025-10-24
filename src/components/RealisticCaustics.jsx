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
        intensity: { value: 1.5 },
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

          for (int n = 0; n < 7; n++) {
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

          c /= float(7);
          c = 1.17 - pow(c, 1.4);
          return pow(abs(c), 8.0);
        }

        void main() {
          // Create layered caustics for depth
          vec2 uv = vUv * 2.0;

          float c1 = causticPattern(uv, time * 0.5);
          float c2 = causticPattern(uv * 0.8 + vec2(0.5), time * 0.4);
          float c3 = causticPattern(uv * 1.3 + vec2(0.2, 0.7), time * 0.6);

          float caustics = (c1 + c2 * 0.7 + c3 * 0.5) * intensity;

          // Realistic underwater light color (blue-green tint)
          vec3 lightColor = vec3(0.5, 0.85, 1.0); // Cyan-blue water light
          vec3 color = lightColor * caustics;

          // Add warm sun highlights
          color += vec3(1.0, 0.95, 0.7) * caustics * 0.4;

          // Fade based on depth (Y position)
          float depthFade = smoothstep(-${TANK_HEIGHT / 2}.0, ${TANK_HEIGHT / 2}.0, vPosition.y);
          color *= 0.5 + depthFade * 0.5;

          gl_FragColor = vec4(color, caustics * 0.8);
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
      {/* Back wall caustics */}
      <mesh
        ref={causticsRef}
        position={[0, 0, -TANK_DEPTH / 2 + 0.5]}
        material={causticsMaterial}
      >
        <planeGeometry args={[TANK_WIDTH - 1, TANK_HEIGHT - 1, 1, 1]} />
      </mesh>

      {/* Bottom caustics */}
      <mesh
        position={[0, -TANK_HEIGHT / 2 + 0.5, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={causticsMaterial}
      >
        <planeGeometry args={[TANK_WIDTH - 1, TANK_DEPTH - 1, 1, 1]} />
      </mesh>

      {/* Side walls caustics (subtle) */}
      <mesh
        position={[-TANK_WIDTH / 2 + 0.5, 0, 0]}
        rotation={[0, Math.PI / 2, 0]}
        material={causticsMaterial}
      >
        <planeGeometry args={[TANK_DEPTH - 1, TANK_HEIGHT - 1, 1, 1]} />
      </mesh>

      <mesh
        position={[TANK_WIDTH / 2 - 0.5, 0, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        material={causticsMaterial}
      >
        <planeGeometry args={[TANK_DEPTH - 1, TANK_HEIGHT - 1, 1, 1]} />
      </mesh>
    </group>
  );
};

export default RealisticCaustics;
