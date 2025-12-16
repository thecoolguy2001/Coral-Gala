import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BOUNDS, WATER_LEVEL, TANK_WIDTH, TANK_HEIGHT, TANK_DEPTH, INTERIOR_WIDTH, INTERIOR_DEPTH } from '../constants/tankDimensions';

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

        void main() {
          // Pure gradient based on height - No static noise patterns
          
          // Map Y position to 0-1 range (approximate tank height)
          // Tank is centered at 0, height is roughly 25
          float heightFactor = smoothstep(-12.5, 12.5, vPosition.y);

          // Colors
          vec3 deepColor = vec3(0.02, 0.1, 0.25); // Deep blue
          vec3 surfaceColor = vec3(0.1, 0.3, 0.5); // Matches surface look
          
          // Smooth blend
          vec3 finalColor = mix(deepColor, surfaceColor, heightFactor);

          // Uniform transparency that increases slightly at the top for blending
          float alpha = mix(0.3, 0.15, heightFactor); 

          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.NormalBlending, // Changed from Additive to Normal for better visibility
    });
  }, []);

  useFrame(({ clock }) => {
    if (waterVolumeRef.current) {
      waterVolumeMaterial.uniforms.time.value = clock.elapsedTime;
    }
  });

  // Interior water volume - fill from substrate to water surface
  const volumeWidth = INTERIOR_WIDTH + 0.1; // Tighter fit
  const waterHeight = WATER_LEVEL - (-TANK_HEIGHT / 2 + 0.6); 
  const volumeDepth = INTERIOR_DEPTH + 0.1; // Tighter fit
  const waterYPosition = (-TANK_HEIGHT / 2 + 0.6 + WATER_LEVEL) / 2;

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
