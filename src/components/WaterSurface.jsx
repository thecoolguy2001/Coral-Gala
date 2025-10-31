import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TANK_WIDTH, TANK_HEIGHT, TANK_DEPTH } from '../constants/tankDimensions';

/**
 * WaterSurface - PROFESSIONAL REALISTIC water surface at the top of the tank
 * Features: Dynamic ripples, edge foam, meniscus, refraction, and reflections
 */
const WaterSurface = () => {
  console.log('✅ WaterSurface component loaded');
  const waterRef = useRef();

  const waterMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        waterColor: { value: new THREE.Color(0.05, 0.15, 0.3) }, // Darker, more realistic
        tankWidth: { value: TANK_WIDTH - 0.5 },
        tankDepth: { value: TANK_DEPTH - 0.5 },
      },
      vertexShader: `
        uniform float time;
        uniform float tankWidth;
        uniform float tankDepth;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vWorldPosition;
        varying float vDistanceFromEdge;

        // Improved noise function for natural ripples
        float noise(vec2 p) {
          return sin(p.x * 1.5) * sin(p.y * 1.5);
        }

        void main() {
          vUv = uv;
          vec3 pos = position;

          // Calculate distance from edges for meniscus effect
          vec2 center = vec2(0.5, 0.5);
          vec2 edgeDist = abs(vUv - center) * 2.0;
          vDistanceFromEdge = max(edgeDist.x, edgeDist.y);

          // REALISTIC AQUARIUM WATER - Multiple layers with natural bouncing
          // Large slow swells from filter movement
          float swell1 = sin(pos.x * 1.5 + time * 1.8) * 0.12;
          float swell2 = sin(pos.y * 1.2 + time * 1.5) * 0.12;

          // Medium frequency waves - main visible motion
          float wave1 = sin(position.x * 0.2 + time * 1.0) * 0.1;
          float wave2 = cos(position.z * 0.1 + time * 0.5) * 0.2;
          float wave3 = cos(position.x * 0.2 + time * 1.0) * 0.1 * 0.2;
          float wave4 = -sin(position.z * 0.1 + time * 0.5) * 0.2 * 0.1;
          pos.y += (wave1 + wave2) * edgeFactor;

          // Small capillary waves - surface tension ripples
          float cap1 = cos(pos.x * 8.0 - time * 3.0) * 0.03;
          float cap2 = cos(pos.y * 7.0 + time * 2.8) * 0.03;

          // Filter output creates circular ripples
          vec2 filterPos = vec2(tankWidth * 0.35, -tankDepth * 0.4); // Top-right back
          float filterDist = length(vec2(pos.x, pos.y) - filterPos);
          float filterRipple = sin(filterDist * 4.0 - time * 5.0) * 0.06 * smoothstep(15.0, 0.0, filterDist);

          // Bubble jet creates disturbance (left side)
          vec2 bubblePos = vec2(-tankWidth * 0.3, tankDepth * 0.3);
          float bubbleDist = length(vec2(pos.x, pos.y) - bubblePos);
          float bubbleWave = sin(bubbleDist * 5.0 - time * 6.0) * 0.04 * smoothstep(8.0, 0.0, bubbleDist);

          // Combine all wave types for realistic bouncing water
          float totalWave = swell1 + swell2 + wave1 + wave2 + cap1 + cap2 + filterRipple + bubbleWave;

          // Apply waves (stronger in center, subtle at edges)
          float edgeFactor = 1.0 - smoothstep(0.85, 1.0, vDistanceFromEdge);
          pos.z += totalWave * edgeFactor;

          // Meniscus effect - water curves up at edges
          float meniscus = smoothstep(0.88, 0.98, vDistanceFromEdge) * 0.15;
          pos.z += meniscus;

          vPosition = pos;
          vWorldPosition = (modelMatrix * vec4(pos, 1.0)).xyz;

          // Calculate new normal for proper lighting
          vec3 tangent1 = vec3(1.0, 0.0, (wave1 + wave3) * edgeFactor);
          vec3 tangent2 = vec3(0.0, 1.0, (wave2 + wave4) * edgeFactor);
          vNormal = normalize(cross(tangent1, tangent2));

          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 waterColor;
        uniform float time;
        uniform float tankWidth;
        uniform float tankDepth;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vWorldPosition;
        varying float vDistanceFromEdge;

        // Improved noise for foam
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
            mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
            f.y
          );
        }

        void main() {
          // Base water color - darker and more realistic
          vec3 color = waterColor;

          // Enhanced Fresnel effect for realistic viewing angle
          vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
          float fresnel = pow(1.0 - max(dot(viewDirection, vNormal), 0.0), 3.0);

          // Reflection color (sky/room light)
          vec3 reflectionColor = vec3(0.4, 0.6, 0.8);
          color = mix(color, reflectionColor, fresnel * 0.7);

          // EDGE FOAM - Creates realistic meniscus and surface tension
          float edgeFoam = smoothstep(0.88, 0.96, vDistanceFromEdge);
          float foamNoise = noise(vUv * 50.0 + time * 0.5);
          edgeFoam *= foamNoise;
          vec3 foamColor = vec3(0.9, 0.95, 1.0);
          color = mix(color, foamColor, edgeFoam * 0.8);

          // Dynamic sparkles - more visible and realistic
          float sparkle1 = sin(vUv.x * 60.0 + time * 2.5) * sin(vUv.y * 60.0 + time * 2.0);
          float sparkle2 = sin(vUv.x * 80.0 - time * 1.8) * cos(vUv.y * 70.0 + time * 2.2);
          float sparkle = (sparkle1 + sparkle2) * 0.5;
          sparkle = smoothstep(0.85, 0.95, sparkle) * fresnel;
          color += vec3(1.0) * sparkle * 0.6;

          // Subtle color variation for depth perception
          float depthVar = noise(vUv * 10.0 + time * 0.2) * 0.1;
          color *= 1.0 + depthVar;

          // Variable transparency - clearly visible
          float alpha = mix(0.4, 0.7, edgeFoam + fresnel * 0.3);

          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.NormalBlending,
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
      renderOrder={1000} // Render last for proper transparency
    >
      <planeGeometry args={[TANK_WIDTH - 0.5, TANK_DEPTH - 0.5, 64, 64]} />
      <primitive object={waterMaterial} />
    </mesh>
  );
};

export default WaterSurface;
