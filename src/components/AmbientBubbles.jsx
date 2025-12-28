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

  // Create micro-speck particles
  const bubblesGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const count = 400; // High density for specks
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const velocities = new Float32Array(count * 3);

    const bottomY = BOUNDS.yMin;

    for (let i = 0; i < count; i++) {
      // Random positions throughout the whole tank
      positions[i * 3] = (Math.random() - 0.5) * (BOUNDS.x * 2.0);
      positions[i * 3 + 1] = bottomY + Math.random() * (WATER_LEVEL - bottomY); 
      positions[i * 3 + 2] = (Math.random() - 0.5) * (BOUNDS.z * 2.0);

      // TINY sizes for micro specks
      scales[i] = Math.random() * 0.1 + 0.02;

      // Slow drift velocities (Current-driven)
      velocities[i * 3] = (Math.random() - 0.5) * 0.005; // Lateral
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.002; // Vertical drift
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.005; // Depth
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

          // Gentle current-driven drift
          pos.x += sin(time * 0.5 + position.y * 0.2) * 0.5;
          pos.z += cos(time * 0.4 + position.x * 0.2) * 0.5;
          pos.y += sin(time * 0.3 + position.z * 0.3) * 0.2;

          // Fade out near surface and bottom
          float surfaceFade = 1.0 - smoothstep(${(WATER_LEVEL - 1.0).toFixed(1)}, ${(WATER_LEVEL).toFixed(1)}, pos.y);
          float bottomFade = smoothstep(${(BOUNDS.yMin).toFixed(1)}, ${(BOUNDS.yMin + 1.0).toFixed(1)}, pos.y);
          vAlpha = surfaceFade * bottomFade;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = scale * (500.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vAlpha;

        void main() {
          // Circular speck shape
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;

          // Low opacity for realism
          vec3 color = vec3(0.8, 0.9, 1.0);
          float alpha = (1.0 - smoothstep(0.2, 0.5, dist)) * vAlpha * 0.4;
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending, // Glowy specks
      depthWrite: false,
    });
  }, []);

  useFrame(({ clock }) => {
    if (bubblesRef.current) {
      bubbleMaterial.uniforms.time.value = clock.elapsedTime;

      const positions = bubblesRef.current.geometry.attributes.position.array;
      const velocities = bubblesRef.current.geometry.attributes.velocity.array;

      for (let i = 0; i < positions.length; i += 3) {
        // Apply tiny constant drift
        positions[i] += velocities[i];
        positions[i + 1] += velocities[i + 1];
        positions[i + 2] += velocities[i + 2];

        // Loop boundaries
        if (positions[i] > BOUNDS.x) positions[i] = -BOUNDS.x;
        if (positions[i] < -BOUNDS.x) positions[i] = BOUNDS.x;
        if (positions[i + 1] > WATER_LEVEL) positions[i + 1] = BOUNDS.yMin;
        if (positions[i + 1] < BOUNDS.yMin) positions[i + 1] = WATER_LEVEL;
        if (positions[i + 2] > BOUNDS.z) positions[i + 2] = -BOUNDS.z;
        if (positions[i + 2] < -BOUNDS.z) positions[i + 2] = BOUNDS.z;
      }

      bubblesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={bubblesRef} geometry={bubblesGeometry} material={bubbleMaterial} />
  );
};

export default AmbientBubbles;
