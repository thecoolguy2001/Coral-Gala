import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BOUNDS, WATER_LEVEL, TANK_WIDTH, TANK_HEIGHT, TANK_DEPTH } from '../constants/tankDimensions';

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

    // Calculate HOB Filter output spout position
    // These values are based on HOBFilter.jsx
    const filterX = TANK_WIDTH / 2 - 4 - 2; // Original HOB filter X
    const filterY = TANK_HEIGHT / 2 + 6 / 2 - 0.5; // Original HOB filter Y
    const filterZ = -TANK_DEPTH / 2; // Original HOB filter Z
    
    // Spout is at [-filterWidth / 2 + 0.8, filterHeight / 2 - 0.5, filterDepth / 2] relative to filter group
    // Absolute spout X, Y, Z
    const spoutX = filterX - 4 / 2 + 0.8;
    const spoutY = WATER_LEVEL; // Start exactly at water surface
    const spoutZ = filterZ + 3 / 2 + 0.2; // Adjusted Z to match waterfall stream

    for (let i = 0; i < count; i++) {
      // Start bubbles near the spout impact point
      positions[i * 3] = spoutX + (Math.random() - 0.5) * 0.4; 
      positions[i * 3 + 1] = spoutY - Math.random() * 2.0; // Start slightly underwater too
      positions[i * 3 + 2] = spoutZ + (Math.random() - 0.5) * 0.4; 

      // Random bubble sizes
      scales[i] = Math.random() * 0.35 + 0.1;

      // Initial velocity: Strong downward push from waterfall
      velocities[i * 3] = -(Math.random() - 0.5) * 0.02; 
      velocities[i * 3 + 1] = - (Math.random() * 0.05 + 0.05); // Stronger downward push
      velocities[i * 3 + 2] = (Math.random() * 0.04 + 0.02); // Forward push
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
          pos.x += sin(time * 8.0 + position.y * 0.5) * 0.1;
          pos.z += cos(time * 6.0 + position.x * 0.5) * 0.1;

          // Alpha logic: Visible underwater, pop at surface
          // Fade out only when slightly ABOVE water level
          vAlpha = 1.0 - smoothstep(${(WATER_LEVEL).toFixed(1)}, ${(WATER_LEVEL + 0.5).toFixed(1)}, pos.y);

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
      
      const filterX = TANK_WIDTH / 2 - 4 - 2;
      const filterZ = -TANK_DEPTH / 2;

      const spoutX = filterX - 4 / 2 + 0.8;
      const spoutY = WATER_LEVEL; 
      const spoutZ = filterZ + 3 / 2 + 0.2;
      
      const gravity = new THREE.Vector3(0, -0.0005, 0); // Simulate buoyancy

      for (let i = 0; i < positions.length; i += 3) {
        // Apply physics
        velocities[i] += gravity.x;
        // Stronger buoyancy recovery
        velocities[i + 1] += 0.0015; 
        velocities[i + 2] += gravity.z;

        // Terminal upward velocity
        if (velocities[i + 1] > 0.05) velocities[i + 1] = 0.05;

        positions[i] += velocities[i];
        positions[i + 1] += velocities[i + 1];
        positions[i + 2] += velocities[i + 2];
        
        // Reset bubbles that reach the water surface (after being submerged)
        // Only reset if they are moving UP and are above surface
        if ((positions[i + 1] > WATER_LEVEL + 0.2 && velocities[i + 1] > 0) || positions[i + 1] < BOUNDS.yMin) {
          positions[i] = spoutX + (Math.random() - 0.5) * 0.4;
          positions[i + 1] = spoutY; // Reset to surface
          positions[i + 2] = spoutZ + (Math.random() - 0.5) * 0.4;
          
          // Reset initial "shot" velocities
          velocities[i] = -(Math.random() - 0.5) * 0.02;
          velocities[i + 1] = - (Math.random() * 0.05 + 0.05); // Downward
          velocities[i + 2] = (Math.random() * 0.04 + 0.02);
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
