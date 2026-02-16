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
        // Matching water surface color (#00BFFF)
        waterColor: { value: new THREE.Color("#00BFFF") },
        opacity: { value: 0.15 },
      },
      vertexShader: `
        void main() {
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 waterColor;
        uniform float opacity;

        void main() {
          gl_FragColor = vec4(waterColor, opacity);
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
