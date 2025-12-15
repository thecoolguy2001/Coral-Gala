import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BOUNDS, WATER_LEVEL } from '../constants/tankDimensions';

/**
 * AmbientBubbles - Scattered bubbles rising from random locations
 * Adds life and movement to the entire tank
 */
const AmbientBubbles = () => {
  const bubblesRef = useRef();

  // Create bubble particles
  const bubblesGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const count = 150; // Increased count for better fill
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const velocities = new Float32Array(count * 3);

    const bottomY = BOUNDS.yMin + 0.5;

    for (let i = 0; i < count; i++) {
      // Random positions throughout the tank
      positions[i * 3] = (Math.random() - 0.5) * (BOUNDS.x * 1.8); // Wide X spread
      positions[i * 3 + 1] = bottomY + Math.random() * (WATER_LEVEL - bottomY); // Distributed height
      positions[i * 3 + 2] = (Math.random() - 0.5) * (BOUNDS.z * 1.8); // Wide Z spread

      // Random sizes - slightly larger for visibility
      scales[i] = Math.random() * 0.25 + 0.08;

      // Slower upward velocity for ambient bubbles
      velocities[i * 3] = (Math.random() - 0.5) * 0.01; // Tiny X drift
      velocities[i * 3 + 1] = Math.random() * 0.02 + 0.01; // Slow upward
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.01; // Tiny Z drift
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

          // Gentle ambient wobble
          pos.x += sin(time * 2.0 + position.y * 0.5) * 0.1;
          pos.z += cos(time * 1.5 + position.x * 0.5) * 0.1;

          // Fade out near surface
          vAlpha = 1.0 - smoothstep(${(WATER_LEVEL - 1.0).toFixed(1)}, ${(WATER_LEVEL - 0.2).toFixed(1)}, pos.y);

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = scale * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vAlpha;

        void main() {
          // Circular bubble shape
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;

          // Subtle highlight
          float highlight = 1.0 - smoothstep(0.0, 0.3, length(center - vec2(-0.15, -0.15)));
          
          // More transparent for ambient bubbles
          vec3 bubbleColor = vec3(0.8, 0.9, 1.0);
          bubbleColor += vec3(1.0) * highlight * 0.4;

          float alpha = (1.0 - smoothstep(0.3, 0.5, dist)) * vAlpha * 0.8; // Increased visibility
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

      for (let i = 0; i < positions.length; i += 3) {
        // Move bubbles upward
        positions[i] += velocities[i];
        positions[i + 1] += velocities[i + 1];
        positions[i + 2] += velocities[i + 2];

        // Reset bubbles that reach the water surface
        if (positions[i + 1] > WATER_LEVEL) {
          // Respawn at random location at bottom
          positions[i] = (Math.random() - 0.5) * (BOUNDS.x * 1.8);
          positions[i + 1] = bottomY;
          positions[i + 2] = (Math.random() - 0.5) * (BOUNDS.z * 1.8);
        }
      }

      bubblesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={bubblesRef} geometry={bubblesGeometry} material={bubbleMaterial} />
  );
};

export default AmbientBubbles;
