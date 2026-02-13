import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { WATER_LEVEL, TANK_HEIGHT, INTERIOR_WIDTH, INTERIOR_DEPTH } from '../constants/tankDimensions';

/**
 * WaterVolume - Clean Gradient Shader
 * Renders a smooth, realistic blue gradient to simulate water depth and volume.
 * No particles, no noise, just a pure liquid look.
 */
const WaterVolume = () => {
  const waterVolumeRef = useRef();

  const volumeMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        // Bright Sunlit Aquarium Water - Light shining through
        colorShallow: { value: new THREE.Color("#40E0D0") }, // Turquoise/Bright Cyan
        colorDeep: { value: new THREE.Color("#0099CC") },    // Bright Ocean Blue
        opacityShallow: { value: 0.08 }, // Very clear at top (light shining through)
        opacityDeep: { value: 0.25 },    // Slightly denser at bottom
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
        uniform vec3 colorShallow;
        uniform vec3 colorDeep;
        uniform float opacityShallow;
        uniform float opacityDeep;
        
        varying vec3 vPosition;

        void main() {
          // Map Y position to 0.0 (bottom) - 1.0 (top)
          // Adjust smoothstep range to match tank dimensions
          float heightPct = smoothstep(-15.0, 10.0, vPosition.y);
          
          // Color Gradient: Dark Blue (Bottom) -> Light Blue (Top)
          vec3 waterColor = mix(colorDeep, colorShallow, heightPct);
          
          // Opacity Gradient: Denser (Bottom) -> Clearer (Top)
          float alpha = mix(opacityDeep, opacityShallow, heightPct);

          gl_FragColor = vec4(waterColor, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide, // Render from inside for volume effect
      depthWrite: false,
    });
  }, []);

  // Interior water volume dimensions
  const volumeWidth = INTERIOR_WIDTH + 0.1;
  const topY = WATER_LEVEL + 0.1; 
  const bottomY = -TANK_HEIGHT / 2;
  const waterHeight = topY - bottomY; 
  const volumeDepth = INTERIOR_DEPTH + 0.1;
  const waterYPosition = (topY + bottomY) / 2;

  return (
    <mesh
      ref={waterVolumeRef}
      position={[0, waterYPosition, 0]}
      castShadow={false}
      receiveShadow={false}
    >
      <boxGeometry args={[volumeWidth, waterHeight, volumeDepth]} />
      <primitive object={volumeMaterial} />
    </mesh>
  );
};

export default WaterVolume;
