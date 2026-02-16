import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TANK_WIDTH, TANK_HEIGHT, TANK_DEPTH, WATER_LEVEL } from '../constants/tankDimensions';

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
        intensity: { value: 0.5 }, // Stronger caustics for visibility
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

        // Advanced caustic function with safety checks
        float causticPattern(vec2 uv, float time) {
          vec2 p = mod(uv * 6.28318, 6.28318) - 250.0;
          vec2 i = vec2(p);
          float c = 1.0;
          float inten = 0.005;

          // Iterative layering for "ray" look - Original 4 iterations
          for (int n = 0; n < 4; n++) {
            float t = time * (1.0 - (3.5 / float(n + 1)));
            i = p + vec2(
              cos(t - i.x) + sin(t + i.y),
              sin(t - i.y) + cos(t + i.x)
            );
            
            // SAFE calculation: add 0.001 to denominators to prevent Div/0 crash
            vec2 lenVec = vec2(
              p.x / (sin(i.x + t) / inten + 0.001), // Safety epsilon
              p.y / (cos(i.y + t) / inten + 0.001)  // Safety epsilon
            );
            
            c += 1.0 / (length(lenVec) + 0.001); // Safety epsilon
          }

          c /= float(3);
          c = 1.17 - pow(c, 1.4);
          return pow(abs(c), 8.0); // High contrast for sharp rays
        }

        void main() {
          vec3 pos = vWorldPosition;
          
          // Original UV scaling
          vec2 uv = pos.xz * 0.15; 
          
          // Animate drift - Faster than original but subtle
          uv += vec2(sin(time * 0.2), cos(time * 0.25)) * 0.1;

          // Multi-layer caustics with CHROMATIC ABERRATION (RGB Split)
          // Red Channel (Offset Left)
          float c1_r = causticPattern((uv + vec2(0.005, 0.0)) * 3.0, time * 0.8);
          float c2_r = causticPattern((uv + vec2(0.005, 0.0)) * 2.5 + vec2(0.5), time * 0.7);
          float r = (c1_r + c2_r * 0.5) * intensity;

          // Green Channel (Center)
          float c1_g = causticPattern(uv * 3.0, time * 0.8);
          float c2_g = causticPattern(uv * 2.5 + vec2(0.5), time * 0.7);
          float g = (c1_g + c2_g * 0.5) * intensity;

          // Blue Channel (Offset Right)
          float c1_b = causticPattern((uv - vec2(0.005, 0.0)) * 3.0, time * 0.8);
          float c2_b = causticPattern((uv - vec2(0.005, 0.0)) * 2.5 + vec2(0.5), time * 0.7);
          float b = (c1_b + c2_b * 0.5) * intensity;
          
          // Fade vertically
          float verticalFade = smoothstep(-15.0, 15.0, pos.y + 5.0);
          
          vec3 causticsColor = vec3(r, g, b) * verticalFade;
          
          // Original Color Composition (Additive Light)
          // Tint slightly blueish white but keep RGB separation
          vec3 finalColor = vec3(0.8, 0.9, 1.0) * causticsColor;
          
          // High alpha but transparent so it blends with EVERYTHING inside
          // Use Green channel for alpha approximation as it's the center
          gl_FragColor = vec4(finalColor, g * verticalFade * 0.8); 
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

  // Calculate correct size and position to stay BELOW water level
  const topY = WATER_LEVEL - 0.2; // Stay slightly below surface
  const bottomY = -TANK_HEIGHT / 2 + 1.0; // Stay slightly above substrate
  const waterHeight = topY - bottomY;
  const yPos = (topY + bottomY) / 2;

  // Box geometry fills the tank volume
  return (
    <mesh
      ref={causticsRef}
      position={[0, yPos, 0]}
      material={causticsMaterial}
    >
      <boxGeometry args={[TANK_WIDTH - 2, waterHeight, TANK_DEPTH - 2]} />
    </mesh>
  );
};

export default RealisticCaustics;
