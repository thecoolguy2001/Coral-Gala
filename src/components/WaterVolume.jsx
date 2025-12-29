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
        waterColor: { value: new THREE.Color(0.0, 0.1, 0.5) }, // Deeper Blue
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

        // Gradient Noise for God Rays and Particulates
        float hash(vec3 p) {
          p  = fract( p*0.3183099+.1 );
          p *= 17.0;
          return fract( p.x*p.y*p.z*(p.x+p.y+p.z) );
        }

        float noise(vec3 x) {
          vec3 i = floor(x);
          vec3 f = fract(x);
          f = f*f*(3.0-2.0*f);
          return mix(mix(mix( hash(i+vec3(0,0,0)), 
                              hash(i+vec3(1,0,0)),f.x),
                         mix( hash(i+vec3(0,1,0)), 
                              hash(i+vec3(1,1,0)),f.x),f.y),
                     mix(mix( hash(i+vec3(0,0,1)), 
                              hash(i+vec3(1,0,1)),f.x),
                         mix( hash(i+vec3(0,1,1)), 
                              hash(i+vec3(1,1,1)),f.x),f.y),f.z);
        }

        void main() {
          // Calculate height percentage for gradient
          // Assuming tank bottom ~ -15 and top ~ 10 based on typical scale
          float heightPct = smoothstep(-15.0, 10.0, vPosition.y);

          // Colors - enhanced contrast but LESS TINT at depth
          vec3 colorDeep = vec3(0.01, 0.02, 0.05); // Very dark but desaturated
          vec3 colorMid  = vec3(0.02, 0.1, 0.2);   // Less saturated blue
          vec3 colorSurf = vec3(0.3, 0.7, 0.8);    // Bright surface
          
          // Shift gradient midpoint for better transition
          vec3 baseColor = mix(colorDeep, colorMid, smoothstep(0.0, 0.4, heightPct));
          baseColor = mix(baseColor, colorSurf, smoothstep(0.4, 1.0, heightPct));

          // Simple "God Ray" style noise effect
          float rayNoise = noise(vPosition * 0.2 + vec3(0.0, time * 0.5, 0.0));
          vec3 finalColor = baseColor + vec3(rayNoise * 0.05);

          // Transparency gradient (CLEARED significantly at bottom)
          float alpha = mix(0.02, 0.2, heightPct); // Bottom is nearly clear water

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

  // Interior water volume - fill from BOTTOM of tank to water surface
  const volumeWidth = INTERIOR_WIDTH + 0.1; // Tighter fit
  
  // Calculate exact height to reach just above WATER_LEVEL to close gap
  const topY = WATER_LEVEL + 0.1; 
  const bottomY = -TANK_HEIGHT / 2;
  
  const waterHeight = topY - bottomY; 
  const volumeDepth = INTERIOR_DEPTH + 0.1; // Tighter fit
  const waterYPosition = (topY + bottomY) / 2;

  return (
    <mesh
      ref={waterVolumeRef}
      position={[0, waterYPosition, 0]}
      castShadow={false}
      receiveShadow={false}
    >
      <boxGeometry args={[volumeWidth, waterHeight, volumeDepth]} />
      <primitive object={waterVolumeMaterial} />
    </mesh>
  );
};

export default WaterVolume;
