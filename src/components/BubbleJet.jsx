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
    const count = 300; // Significantly more bubbles for aggression
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const velocities = new Float32Array(count * 3);

    // Calculate filter position (needed for spout)
    const filterX = TANK_WIDTH / 2 - 4 - 2;
    const filterZ = -TANK_DEPTH / 2;

    // Absolute positions
    const spoutX = filterX + (4 / 2 - 0.5); // Right side of filter
    const spoutY = WATER_LEVEL - 1.0; 
    const spoutZ = filterZ; 

    for (let i = 0; i < count; i++) {
      // Start bubbles near the tube bottom
      positions[i * 3] = spoutX + (Math.random() - 0.5) * 0.4; 
      positions[i * 3 + 1] = spoutY + (Math.random() - 0.5) * 0.5; 
      positions[i * 3 + 2] = spoutZ + (Math.random() - 0.5) * 0.4; 

      // Larger, more varied bubble sizes
      scales[i] = Math.random() * 0.45 + 0.15;

      // Initial velocity: VERY STRONG Downward push
      velocities[i * 3] = (Math.random() - 0.5) * 0.03; // More spread
      velocities[i * 3 + 1] = - (Math.random() * 0.2 + 0.4); // Very aggressive downward (0.4 to 0.6)
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.03; 
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

          // Aggressive Turbulent wobble
          pos.x += sin(time * 20.0 + position.y * 0.8) * 0.08;
          pos.z += cos(time * 15.0 + position.x * 0.8) * 0.08;

          // Alpha logic
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
          vec3 bubbleColor = vec3(0.95, 1.0, 1.0); 
          bubbleColor += vec3(1.0) * highlight * 0.9;

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

      const spoutX = filterX + (4 / 2 - 0.5);
      const spoutY = WATER_LEVEL - 1.0; 
      const spoutZ = filterZ;
      
      const gravity = new THREE.Vector3(0, -0.0005, 0); 

      for (let i = 0; i < positions.length; i += 3) {
        // Apply physics
        // Strong drag/buoyancy needed to counter aggressive speed
        velocities[i + 1] += 0.008; // Stronger upward acceleration

        // Terminal upward velocity
        if (velocities[i + 1] > 0.05) velocities[i + 1] = 0.05;

        positions[i] += velocities[i];
        positions[i + 1] += velocities[i + 1];
        positions[i + 2] += velocities[i + 2];
        
        // Reset logic
        if ((positions[i + 1] > WATER_LEVEL + 0.2 && velocities[i + 1] > 0) || positions[i + 1] < BOUNDS.yMin - 3.0) {
          positions[i] = spoutX + (Math.random() - 0.5) * 0.4;
          positions[i + 1] = spoutY + (Math.random() - 0.5) * 0.5;
          positions[i + 2] = spoutZ + (Math.random() - 0.5) * 0.4;
          
          // Reset to aggressive downward velocity
          velocities[i] = (Math.random() - 0.5) * 0.02;
          velocities[i + 1] = - (Math.random() * 0.2 + 0.4); 
          velocities[i + 2] = (Math.random() - 0.5) * 0.02;
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
