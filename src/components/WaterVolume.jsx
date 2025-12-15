import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TANK_WIDTH, TANK_HEIGHT, TANK_DEPTH, WATER_LEVEL } from '../constants/tankDimensions';

/**
 * WaterVolume - Volumetric water effects with realistic refraction
 * Simulates light passing through water from overhead light source
 */
const WaterVolume = () => {
  const waterVolumeRef = useRef();

  // OPTIMIZED: Lightweight shader for better performance
  const waterVolumeMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        waterColor: { value: new THREE.Color(0.05, 0.2, 0.35) },
      },
      vertexShader: `
        varying vec3 vPosition;
        varying vec3 vWorldPosition;

        void main() {
          vPosition = position;
          vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 waterColor;
        varying vec3 vPosition;
        varying vec3 vWorldPosition;

        // OPTIMIZED: Simple noise (no expensive loops)
        float simpleNoise(vec3 p) {
          return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
        }

        void main() {
          // Simple animated refraction pattern
          float refraction = sin(vWorldPosition.x * 0.3 + time * 0.5) *
                            cos(vWorldPosition.y * 0.2 + time * 0.4) * 0.5 + 0.5;

          // Light rays from above (simplified)
          float lightRay = (vPosition.y + 12.5) / 25.0; // Depth-based

          // Simple god ray effect
          float godRay = simpleNoise(vec3(vWorldPosition.x * 0.1, vWorldPosition.y * 0.2 + time * 0.3, vWorldPosition.z * 0.1));
          godRay = smoothstep(0.4, 0.6, godRay) * lightRay * 0.3;

          // Depth color variation - More pronounced
          vec3 deepColor = vec3(0.02, 0.15, 0.35); // Darker deep blue
          vec3 shallowColor = vec3(0.2, 0.5, 0.6); // Lighter teal/blue
          vec3 finalColor = mix(deepColor, shallowColor, lightRay);

          // Add subtle effects
          finalColor += vec3(0.3, 0.5, 0.7) * refraction * 0.15; // Stronger refraction highlight
          finalColor += vec3(0.6, 0.8, 1.0) * godRay * 0.5; // Brighter god rays

          // Subtle water presence - Increased alpha for better visibility
          float alpha = 0.25; // Increased from 0.15

          // Distance fade (fake fog)
          float dist = gl_FragCoord.z / gl_FragCoord.w;
          float fogFactor = smoothstep(10.0, 50.0, dist);
          finalColor = mix(finalColor, vec3(0.05, 0.1, 0.2), fogFactor * 0.3);

          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, []);

  useFrame(({ clock }) => {
    if (waterVolumeRef.current) {
      waterVolumeMaterial.uniforms.time.value = clock.elapsedTime;
    }
  });

  // Interior water volume - fill from substrate to water surface
  const volumeWidth = TANK_WIDTH - 1;
  const waterHeight = WATER_LEVEL - (-TANK_HEIGHT / 2 + 0.6); // From substrate top to water level
  const volumeDepth = TANK_DEPTH - 1;
  const waterYPosition = (-TANK_HEIGHT / 2 + 0.6 + WATER_LEVEL) / 2; // Center between substrate and surface

  return (
    <mesh
      ref={waterVolumeRef}
      position={[0, waterYPosition, 0]}
    >
      <boxGeometry args={[volumeWidth, waterHeight, volumeDepth]} />
      <primitive object={waterVolumeMaterial} />
    </mesh>
  );
};

export default WaterVolume;
