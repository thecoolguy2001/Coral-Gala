import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TANK_WIDTH, TANK_HEIGHT, TANK_DEPTH, WATER_LEVEL } from '../constants/tankDimensions';

/**
 * SimpleWaterEffect - Minimal 2D water shader overlay for performance
 * Creates a simple animated water effect inside the tank
 */
const SimpleWaterEffect = () => {
  const waterRef = useRef();

  // Simple 2D water shader - very performant
  const waterMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        waterColor: { value: new THREE.Color(0.2, 0.45, 0.65) }, // Visible blue/aqua
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;

        void main() {
          vUv = uv;
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 waterColor;
        varying vec2 vUv;
        varying vec3 vPosition;

        // Simple wave pattern
        float wave(vec2 uv, float time) {
          return sin(uv.x * 3.0 + time * 0.5) *
                 cos(uv.y * 2.0 + time * 0.3) * 0.5 + 0.5;
        }

        void main() {
          // Animated water ripples
          float ripple1 = wave(vUv, time);
          float ripple2 = wave(vUv * 1.5 + 0.5, time * 1.2);
          float ripples = (ripple1 + ripple2) * 0.5;

          // Vertical gradient (darker at bottom, lighter at top)
          float depth = vUv.y;

          // Combine effects - make water VISIBLE
          vec3 finalColor = waterColor * (0.8 + depth * 0.4);
          finalColor += vec3(0.1, 0.2, 0.3) * ripples * 0.15;

          // VISIBLE water - not subtle!
          float alpha = 0.5 + ripples * 0.1;

          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  }, []);

  // Animate water
  useFrame(({ clock }) => {
    if (waterRef.current) {
      waterMaterial.uniforms.time.value = clock.elapsedTime;
    }
  });

  // Position the water plane inside the tank
  const waterWidth = TANK_WIDTH - 1.5;
  const waterDepth = TANK_DEPTH - 1.5;
  const waterHeight = WATER_LEVEL - (-TANK_HEIGHT / 2 + 0.6);

  return (
    <mesh
      ref={waterRef}
      position={[0, 0, 0]}
      rotation={[0, 0, 0]}
    >
      <boxGeometry args={[waterWidth, waterHeight, waterDepth]} />
      <primitive object={waterMaterial} />
    </mesh>
  );
};

export default SimpleWaterEffect;
