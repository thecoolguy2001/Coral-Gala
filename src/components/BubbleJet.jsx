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

    // Calculate HOB Filter output spout position
    // These values are based on HOBFilter.jsx
    const filterX = TANK_WIDTH / 2 - 4 - 2; // Original HOB filter X
    const filterY = TANK_HEIGHT / 2 + 6 / 2 - 0.5; // Original HOB filter Y
    const filterZ = -TANK_DEPTH / 2; // Original HOB filter Z
    
    // Spout is at [-filterWidth / 2 + 0.8, filterHeight / 2 - 0.5, filterDepth / 2] relative to filter group
    // Absolute spout X, Y, Z
    const spoutX = filterX - 4 / 2 + 0.8;
    const spoutY = WATER_LEVEL - 0.5; // Slightly below water level
    const spoutZ = filterZ + 3 / 2;

    for (let i = 0; i < count; i++) {
      // Start bubbles near the spout
      positions[i * 3] = spoutX + (Math.random() - 0.5) * 0.5; // Small X spread around spout
      positions[i * 3 + 1] = spoutY + (Math.random() - 0.5) * 0.5; // Small Y spread around spout
      positions[i * 3 + 2] = spoutZ + (Math.random() - 0.5) * 0.5; // Small Z spread around spout

      // Random bubble sizes - mixed large and small for turbulence
      scales[i] = Math.random() * 0.35 + 0.1;

      // Initial velocity: slight downward/forward push from filter, then rise
      velocities[i * 3] = -(Math.random() - 0.5) * 0.02; // Small horizontal drift (away from filter)
      velocities[i * 3 + 1] = - (Math.random() * 0.01 + 0.01); // Initial downward push
      velocities[i * 3 + 2] = (Math.random() * 0.02 + 0.01); // Initial forward push
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
      
      const filterX = TANK_WIDTH / 2 - 4 - 2;
      const filterY = TANK_HEIGHT / 2 + 6 / 2 - 0.5;
      const filterZ = -TANK_DEPTH / 2;

      const spoutX = filterX - 4 / 2 + 0.8;
      const spoutY = WATER_LEVEL - 0.5; 
      const spoutZ = filterZ + 3 / 2;
      
      const gravity = new THREE.Vector3(0, -0.0005, 0); // Simulate buoyancy

      for (let i = 0; i < positions.length; i += 3) {
        // Apply initial "shot out" velocity and then buoyancy
        velocities[i] += gravity.x;
        velocities[i + 1] += gravity.y + 0.0005; // counteract gravity and add upward force
        velocities[i + 2] += gravity.z;

        positions[i] += velocities[i];
        positions[i + 1] += velocities[i + 1];
        positions[i + 2] += velocities[i + 2];
        
        // Ensure bubbles rise after initial push
        if (velocities[i + 1] < 0.03) { // If still sinking/moving slow, ensure upward push
          velocities[i + 1] += 0.0005; // Constant upward push
        }

        // Reset bubbles that reach the water surface (or go too deep from initial push)
        if (positions[i + 1] > WATER_LEVEL || positions[i + 1] < BOUNDS.yMin - 1.0) {
          positions[i] = spoutX + (Math.random() - 0.5) * 0.5;
          positions[i + 1] = spoutY + (Math.random() - 0.5) * 0.5;
          positions[i + 2] = spoutZ + (Math.random() - 0.5) * 0.5;
          
          // Reset initial velocities for new "shot out" effect
          velocities[i] = -(Math.random() - 0.5) * 0.02;
          velocities[i + 1] = - (Math.random() * 0.01 + 0.01);
          velocities[i + 2] = (Math.random() * 0.02 + 0.01);
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
