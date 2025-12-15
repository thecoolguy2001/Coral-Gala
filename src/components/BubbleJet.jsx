import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BOUNDS, WATER_LEVEL } from '../constants/tankDimensions';

/**
 * BubbleJet - Realistic bubble stream from filter/aerator
 * Positioned at top-left corner like a real aquarium filter
 */
const BubbleJet = () => {
  console.log('✅ BubbleJet component loaded');
  const bubblesRef = useRef();

  // Create bubble particles
  const bubblesGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const count = 100; // Single strong jet stream
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const velocities = new Float32Array(count * 3);

    // Position bubbles aligned with the HOB Filter output (Top-Left Back)
    // Filter is at left side, so jet should be below its output
    const jetX = -BOUNDS.x + 3.5; // Left side, aligned with filter spout
    const jetZ = -BOUNDS.z + 1.5; // Back wall, slightly forward
    const bottomY = BOUNDS.yMin + 0.5; // Just above substrate

    for (let i = 0; i < count; i++) {
      // Start bubbles at the bottom, spread them vertically for initial fill
      positions[i * 3] = jetX + (Math.random() - 0.5) * 0.8; // Tighter X spread
      positions[i * 3 + 1] = bottomY + Math.random() * (WATER_LEVEL - bottomY); 
      positions[i * 3 + 2] = jetZ + (Math.random() - 0.5) * 0.8; // Tighter Z spread

      // Random bubble sizes - mixed large and small for turbulence
      scales[i] = Math.random() * 0.35 + 0.1;

      // Upward velocity with forward drift (pushed by filter flow)
      velocities[i * 3] = (Math.random() + 0.2) * 0.03; // Drift right (away from wall)
      velocities[i * 3 + 1] = Math.random() * 0.06 + 0.04; // Strong upward flow
      velocities[i * 3 + 2] = (Math.random() + 0.1) * 0.03; // Drift forward
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));

    return geometry;
  }, []);

  const bubbleMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
      },
      vertexShader: `
        attribute float scale;
        attribute vec3 velocity;
        uniform float time;
        varying float vAlpha;

        void main() {
          vec3 pos = position;

          // Turbulent wobble for filter stream
          pos.x += sin(time * 5.0 + position.y * 0.5) * 0.15;
          pos.z += cos(time * 4.0 + position.x * 0.5) * 0.1;

          // Fade out near water surface
          vAlpha = 1.0 - smoothstep(${(WATER_LEVEL - 2.0).toFixed(1)}, ${(WATER_LEVEL - 0.5).toFixed(1)}, pos.y);

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = scale * (400.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vAlpha;

        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;

          // Sharp highlight
          float highlight = 1.0 - smoothstep(0.0, 0.25, length(center - vec2(-0.15, -0.15)));
          vec3 bubbleColor = vec3(0.95, 1.0, 1.0); // Very white/bright
          bubbleColor += vec3(1.0) * highlight * 0.8;

          float alpha = (1.0 - smoothstep(0.3, 0.5, dist)) * vAlpha * 0.95;
          gl_FragColor = vec4(bubbleColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false,
    });
  }, []);

  useFrame(({ clock }) => {
    if (bubblesRef.current) {
      bubbleMaterial.uniforms.time.value = clock.elapsedTime;

      const positions = bubblesRef.current.geometry.attributes.position.array;
      const velocities = bubblesRef.current.geometry.attributes.velocity.array;
      
      const jetX = -BOUNDS.x + 3.5;
      const jetZ = -BOUNDS.z + 1.5;
      const bottomY = BOUNDS.yMin + 0.5;

      for (let i = 0; i < positions.length; i += 3) {
        // Move bubbles
        positions[i] += velocities[i];
        positions[i + 1] += velocities[i + 1];
        positions[i + 2] += velocities[i + 2];

        // Reset bubbles that reach the water surface
        if (positions[i + 1] > WATER_LEVEL) {
          positions[i] = jetX + (Math.random() - 0.5) * 0.8;
          positions[i + 1] = bottomY; 
          positions[i + 2] = jetZ + (Math.random() - 0.5) * 0.8;
        }
      }

      bubblesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={bubblesRef} geometry={bubblesGeometry} material={bubbleMaterial} />
  );
};

export default BubbleJet;
