import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TANK_WIDTH, TANK_HEIGHT, TANK_DEPTH } from '../constants/tankDimensions';

/**
 * WaterSurface - Realistic water surface at the top of the tank
 * Creates ripples and reflections like a real aquarium
 */
const WaterSurface = () => {
  const waterRef = useRef();

  const waterMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        waterColor: { value: new THREE.Color(0.1, 0.3, 0.5) },
      },
      vertexShader: `
        uniform float time;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          vUv = uv;
          vNormal = normal;

          // Create subtle ripples on the surface
          vec3 pos = position;
          float wave1 = sin(pos.x * 2.0 + time * 1.5) * 0.05;
          float wave2 = sin(pos.y * 1.5 + time * 1.2) * 0.05;
          float wave3 = cos(pos.x * 3.0 - time * 0.8) * 0.03;

          pos.z += wave1 + wave2 + wave3;
          vPosition = pos;

          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 waterColor;
        uniform float time;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          // Water surface with subtle color variation
          vec3 color = waterColor;

          // Add fresnel effect for realistic water appearance
          vec3 viewDirection = normalize(cameraPosition - vPosition);
          float fresnel = pow(1.0 - dot(viewDirection, vNormal), 2.0);

          // Mix between water color and reflection color
          color = mix(waterColor, vec3(0.3, 0.5, 0.7), fresnel * 0.6);

          // Add subtle sparkle effect
          float sparkle = sin(vUv.x * 50.0 + time * 2.0) * sin(vUv.y * 50.0 + time * 1.5);
          sparkle = smoothstep(0.9, 1.0, sparkle);
          color += vec3(1.0) * sparkle * 0.3;

          gl_FragColor = vec4(color, 0.3);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
    });
  }, []);

  useFrame(({ clock }) => {
    if (waterRef.current) {
      waterMaterial.uniforms.time.value = clock.elapsedTime;
    }
  });

  return (
    <mesh
      ref={waterRef}
      position={[0, TANK_HEIGHT / 2, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <planeGeometry args={[TANK_WIDTH - 0.5, TANK_DEPTH - 0.5, 32, 32]} />
      <primitive object={waterMaterial} />
    </mesh>
  );
};

export default WaterSurface;
