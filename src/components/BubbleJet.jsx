import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TANK_WIDTH, TANK_HEIGHT, TANK_DEPTH } from '../constants/tankDimensions';

/**
 * BubbleJet - Realistic bubble stream from filter/aerator
 * Positioned at top-left corner like a real aquarium filter
 */
const BubbleJet = () => {
  const bubblesRef = useRef();

  // Create bubble particles
  const bubblesGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const count = 100; // 100 bubbles in the jet stream
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const velocities = new Float32Array(count * 3);

    // Position at top-left corner
    const jetX = -TANK_WIDTH / 2 + 3; // 3 units from left edge
    const jetZ = TANK_DEPTH / 2 - 2; // 2 units from front

    for (let i = 0; i < count; i++) {
      // Start bubbles at the top, spread them vertically
      positions[i * 3] = jetX + (Math.random() - 0.5) * 1.5; // Small X spread
      positions[i * 3 + 1] = TANK_HEIGHT / 2 - Math.random() * TANK_HEIGHT; // Distributed throughout height
      positions[i * 3 + 2] = jetZ + (Math.random() - 0.5) * 1.5; // Small Z spread

      // Random bubble sizes
      scales[i] = Math.random() * 0.3 + 0.1;

      // Upward velocity with slight horizontal drift
      velocities[i * 3] = (Math.random() - 0.5) * 0.02; // Slight X drift
      velocities[i * 3 + 1] = Math.random() * 0.05 + 0.03; // Upward
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02; // Slight Z drift
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

          // Add wobble to bubble movement
          pos.x += sin(time * 3.0 + position.y * 0.2) * 0.2;
          pos.z += cos(time * 2.5 + position.x * 0.2) * 0.15;

          // Calculate alpha based on height (fade out at top)
          vAlpha = 1.0 - smoothstep(${TANK_HEIGHT / 2 - 2}.0, ${TANK_HEIGHT / 2}.0, pos.y);

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = scale * (400.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vAlpha;

        void main() {
          // Make bubbles circular
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;

          // Bubble with highlight (shiny effect)
          float highlight = 1.0 - smoothstep(0.0, 0.3, length(center - vec2(-0.15, -0.15)));
          vec3 bubbleColor = vec3(0.9, 0.95, 1.0);
          bubbleColor += vec3(1.0) * highlight * 0.5;

          float alpha = (1.0 - smoothstep(0.3, 0.5, dist)) * vAlpha * 0.7;
          gl_FragColor = vec4(bubbleColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, []);

  useFrame(({ clock }) => {
    if (bubblesRef.current) {
      bubbleMaterial.uniforms.time.value = clock.elapsedTime;

      const positions = bubblesRef.current.geometry.attributes.position.array;
      const velocities = bubblesRef.current.geometry.attributes.velocity.array;

      const jetX = -TANK_WIDTH / 2 + 3;
      const jetZ = TANK_DEPTH / 2 - 2;

      for (let i = 0; i < positions.length; i += 3) {
        // Move bubbles upward
        positions[i] += velocities[i];
        positions[i + 1] += velocities[i + 1];
        positions[i + 2] += velocities[i + 2];

        // Reset bubbles that reach the top
        if (positions[i + 1] > TANK_HEIGHT / 2) {
          positions[i] = jetX + (Math.random() - 0.5) * 1.5;
          positions[i + 1] = TANK_HEIGHT / 2 - TANK_HEIGHT; // Start at bottom
          positions[i + 2] = jetZ + (Math.random() - 0.5) * 1.5;
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
