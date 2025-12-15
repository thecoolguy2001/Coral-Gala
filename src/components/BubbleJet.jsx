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
    const count = 300; // Increased count for 3 jets (100 per jet)
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const velocities = new Float32Array(count * 3);
    const sources = new Float32Array(count); // Store source index for each bubble

    // Define 3 jet positions
    const jetSources = [
      { x: -BOUNDS.x * 0.6, z: BOUNDS.z * 0.3 }, // Left-Front
      { x: BOUNDS.x * 0.6, z: -BOUNDS.z * 0.3 }, // Right-Back
      { x: 0, z: -BOUNDS.z * 0.8 }               // Center-Back
    ];
    
    const bottomY = BOUNDS.yMin + 0.5; // Just above substrate

    for (let i = 0; i < count; i++) {
      // Assign to one of the 3 sources
      const sourceIdx = i % 3;
      const source = jetSources[sourceIdx];
      
      // Store source index in a custom attribute if needed, 
      // but for simple logic we can just use the modulo in the update loop too.
      
      // Start bubbles at the bottom, spread them vertically
      positions[i * 3] = source.x + (Math.random() - 0.5) * 1.0; 
      positions[i * 3 + 1] = bottomY + Math.random() * (WATER_LEVEL - bottomY); 
      positions[i * 3 + 2] = source.z + (Math.random() - 0.5) * 1.0; 

      // Random bubble sizes
      scales[i] = Math.random() * 0.3 + 0.1;

      // Upward velocity with slight horizontal drift
      velocities[i * 3] = (Math.random() - 0.5) * 0.02; 
      velocities[i * 3 + 1] = Math.random() * 0.05 + 0.03; 
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02; 
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

          // Calculate alpha based on height (fade out near water surface)
          // Water level is at ${WATER_LEVEL.toFixed(1)}, fade starts 2 units below
          vAlpha = 1.0 - smoothstep(${(WATER_LEVEL - 2.0).toFixed(1)}, ${(WATER_LEVEL - 0.5).toFixed(1)}, pos.y);

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

          float alpha = (1.0 - smoothstep(0.3, 0.5, dist)) * vAlpha * 0.9;
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
      const bottomY = BOUNDS.yMin + 0.5;

      // Define 3 jet positions matching initialization
      const jetSources = [
        { x: -BOUNDS.x * 0.6, z: BOUNDS.z * 0.3 }, // Left-Front
        { x: BOUNDS.x * 0.6, z: -BOUNDS.z * 0.3 }, // Right-Back
        { x: 0, z: -BOUNDS.z * 0.8 }               // Center-Back
      ];

      for (let i = 0; i < positions.length; i += 3) {
        // Move bubbles upward
        positions[i] += velocities[i];
        positions[i + 1] += velocities[i + 1];
        positions[i + 2] += velocities[i + 2];

        // Reset bubbles that reach the water surface
        if (positions[i + 1] > WATER_LEVEL) {
          // Identify which source this bubble belongs to
          const bubbleIndex = i / 3;
          const sourceIdx = bubbleIndex % 3;
          const source = jetSources[sourceIdx];

          positions[i] = source.x + (Math.random() - 0.5) * 1.0;
          positions[i + 1] = bottomY; // Start at bottom
          positions[i + 2] = source.z + (Math.random() - 0.5) * 1.0;
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
