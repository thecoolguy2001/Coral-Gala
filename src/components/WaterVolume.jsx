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
          // 1. VERTICAL GRADIENT (Surface -> Deep)
          float heightPct = smoothstep(-12.5, 12.5, vPosition.y);
          
          vec3 colorDeep = vec3(0.02, 0.08, 0.15); // Dark but less blue-saturated
          vec3 colorMid  = vec3(0.05, 0.2, 0.35);  
          vec3 colorSurf = vec3(0.2, 0.5, 0.6);    
          
          vec3 baseColor = mix(colorDeep, colorMid, smoothstep(0.0, 0.5, heightPct));
          baseColor = mix(baseColor, colorSurf, smoothstep(0.5, 1.0, heightPct));

          // 2. GOD RAYS (Light Shafts)
          float rayFade = smoothstep(0.0, 1.0, heightPct); 
          float rayNoise = noise(vec3(vWorldPosition.x * 0.15, vWorldPosition.y * 0.05 + time * 0.2, vWorldPosition.z * 0.15));
          float rays = smoothstep(0.4, 0.6, rayNoise) * rayFade;
          
          baseColor += vec3(0.8, 0.9, 1.0) * rays * 0.15; 

          // 3. DEPTH FOG (Underwater Haze)
          float dist = distance(cameraPosition, vWorldPosition);
          float fogFactor = smoothstep(5.0, 60.0, dist);
          vec3 fogColor = vec3(0.01, 0.08, 0.15);
          
          vec3 finalColor = mix(baseColor, fogColor, fogFactor * 0.5);

          // 4. SUSPENDED PARTICULATES (Micro Specks)
          float speckNoise = hash(vWorldPosition * 20.0 + vec3(0.0, time * 0.1, 0.0));
          float specks = step(0.99, speckNoise); 
          finalColor += vec3(1.0) * specks * 0.1 * (1.0 - fogFactor); 

          // Transparency gradient (CLEARED at bottom to show sand)
          float alpha = mix(0.1, 0.25, heightPct); 

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
    >
      <boxGeometry args={[volumeWidth, waterHeight, volumeDepth]} />
      <primitive object={waterVolumeMaterial} />
    </mesh>
  );
};

export default WaterVolume;
