import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TANK_WIDTH, TANK_DEPTH, WATER_LEVEL, INTERIOR_WIDTH, INTERIOR_DEPTH } from '../constants/tankDimensions';

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
        waterColor: { value: new THREE.Color(0.1, 0.3, 0.5) }, // Matched to Volume top
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

          // Apply waves (stronger in center, subtle at edges)
          float edgeFactor = 1.0 - smoothstep(0.85, 1.0, vDistanceFromEdge);

          // SMOOTHER, GENTLE WAVES (Reverted to original style)
          // Large slow swells
          float swell1 = sin(pos.x * 1.5 + time * 1.0) * 0.1;
          float swell2 = sin(pos.y * 1.2 + time * 0.8) * 0.1;

          // Medium frequency waves - Gentle motion
          float wave1 = sin(pos.x * 0.2 + time * 0.5) * 0.1;
          float wave2 = cos(pos.z * 0.1 + time * 0.3) * 0.15;
          
          // Small capillary waves - surface tension ripples (Very subtle)
          float cap1 = cos(pos.x * 8.0 - time * 2.0) * 0.02;
          float cap2 = cos(pos.y * 7.0 + time * 1.8) * 0.02;

          // Filter output creates circular ripples (Softened)
          vec2 filterPos = vec2(tankWidth * 0.35, -tankDepth * 0.4); 
          float filterDist = length(vec2(pos.x, pos.y) - filterPos);
          float filterRipple = sin(filterDist * 5.0 - time * 4.0) * 0.05 * smoothstep(15.0, 0.0, filterDist);

          // Combine all wave types
          float totalWave = swell1 + swell2 + wave1 + wave2 + cap1 + cap2 + filterRipple;

          // Apply waves
          pos.z += totalWave * edgeFactor;

          // Meniscus effect - water curves up at edges
          float meniscus = smoothstep(0.88, 0.98, vDistanceFromEdge) * 0.15;
          pos.z += meniscus;

          vPosition = pos;
          vWorldPosition = (modelMatrix * vec4(pos, 1.0)).xyz;

          // Calculate new normal for proper lighting
          // Simplified tangent calculation for smoothness
          float delta = 0.1;
          vec3 tangent1 = vec3(1.0, 0.0, (totalWave) * 0.5 * edgeFactor); 
          vec3 tangent2 = vec3(0.0, 1.0, (totalWave) * 0.5 * edgeFactor);
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

        // Caustic pattern function for realistic refractions
        float causticPattern(vec2 uv, float time) {
          vec2 p = mod(uv * 6.28318, 6.28318) - 250.0;
          vec2 i = vec2(p);
          float c = 1.0;
          float inten = 0.005;

          for (int n = 0; n < 5; n++) {
            float t = time * (1.0 - (3.5 / float(n + 1)));
            i = p + vec2(
              cos(t - i.x) + sin(t + i.y),
              sin(t - i.y) + cos(t + i.x)
            );
            c += 1.0 / length(vec2(
              p.x / (sin(i.x + t) / inten),
              p.y / (cos(i.y + t) / inten)
            ));
          }

          c /= float(5);
          c = 1.17 - pow(c, 1.4);
          return pow(abs(c), 8.0);
        }

        void main() {
          // Base water color
          vec3 color = waterColor;

          // Enhanced Fresnel effect
          vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
          float fresnel = pow(1.0 - max(dot(viewDirection, vNormal), 0.0), 3.0);

          // Reflection color
          vec3 reflectionColor = vec3(0.4, 0.6, 0.8);
          color = mix(color, reflectionColor, fresnel * 0.7);

          // EDGE FOAM
          float edgeFoam = smoothstep(0.88, 0.96, vDistanceFromEdge);
          float foamNoise = noise(vUv * 50.0 + time * 0.5);
          edgeFoam *= foamNoise;
          vec3 foamColor = vec3(0.2, 0.4, 0.6); 
          color = mix(color, foamColor, edgeFoam * 0.8);

          // REALISTIC TOP REFRACTIONS (Caustics on surface)
          vec2 causticUv = vUv * 4.0;
          float c1 = causticPattern(causticUv, time * 0.5);
          float c2 = causticPattern(causticUv * 0.8 + vec2(0.5), time * 0.4);
          float surfaceCaustics = (c1 + c2 * 0.7) * 2.0;
          
          // Add sharp specular refraction highlights
          vec3 refractionColor = vec3(0.9, 0.95, 1.0);
          color += refractionColor * surfaceCaustics * (0.5 + fresnel * 0.5);

          // Subtle color variation
          float depthVar = noise(vUv * 10.0 + time * 0.2) * 0.1;
          color *= 1.0 + depthVar;

          // Variable transparency
          float alpha = mix(0.4, 0.7, edgeFoam + fresnel * 0.5);

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
      position={[0, WATER_LEVEL, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={1000} // Render last for proper transparency
    >
      <planeGeometry args={[INTERIOR_WIDTH + 0.1, INTERIOR_DEPTH + 0.1, 256, 256]} />
      <primitive object={waterMaterial} />
    </mesh>
  );
};

export default WaterSurface;
