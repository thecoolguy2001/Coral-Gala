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

        // Noise for light rays
        float simpleNoise(vec3 p) {
          return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
        }

        void main() {
          // Pure gradient based on height
          float heightFactor = smoothstep(-12.5, 12.5, vPosition.y);

          // Colors
          vec3 deepColor = vec3(0.02, 0.1, 0.25); 
          vec3 surfaceColor = vec3(0.1, 0.3, 0.5); 
          
          vec3 finalColor = mix(deepColor, surfaceColor, heightFactor);

          // VOLUMETRIC LIGHT RAYS (God Rays) - Top only
          // Map Y to 0-1 for top section only
          float rayFade = smoothstep(5.0, 12.0, vPosition.y); // Only visible in top ~7 units
          
          if (rayFade > 0.01) {
            float rayNoise = simpleNoise(vec3(vWorldPosition.x * 0.2, vWorldPosition.y * 0.1 + time * 0.5, vWorldPosition.z * 0.2));
            float rayIntensity = smoothstep(0.4, 0.7, rayNoise) * rayFade;
            finalColor += vec3(0.8, 0.9, 1.0) * rayIntensity * 0.3; // Add light
          }

          // Uniform transparency that increases slightly at the top
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

  // Interior water volume - fill from BOTTOM of tank to just BELOW water surface
  const volumeWidth = INTERIOR_WIDTH + 0.1; // Tighter fit
  // Calculate exact height to stop 0.2 units below the surface to avoid z-fighting
  const topY = WATER_LEVEL - 0.2;
  const bottomY = -TANK_HEIGHT / 2;
  
  const waterHeight = topY - bottomY; 
  const volumeDepth = INTERIOR_DEPTH + 0.1; // Tighter fit
  const waterYPosition = (topY + bottomY) / 2;

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
