import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { WATER_LEVEL } from '../constants/tankDimensions';

const PARTICLE_COUNT = 50;

const FoodParticles = ({ feedEvent }) => {
  const pointsRef = useRef();
  const spawnTimeRef = useRef(0);
  const activeRef = useRef(false);
  const positionRef = useRef([0, WATER_LEVEL, 0]);

  const { geometry, material } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const velocities = new Float32Array(PARTICLE_COUNT * 3);
    const alphas = new Float32Array(PARTICLE_COUNT);
    const sizes = new Float32Array(PARTICLE_COUNT);
    const colors = new Float32Array(PARTICLE_COUNT * 3);

    // Food flake colors: browns, greens, oranges
    const foodColors = [
      new THREE.Color('#8B6914'), // golden brown
      new THREE.Color('#6B8E23'), // olive green
      new THREE.Color('#D2691E'), // chocolate
      new THREE.Color('#DAA520'), // goldenrod
      new THREE.Color('#CD853F'), // peru
    ];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = -100; // hidden below
      positions[i * 3 + 2] = 0;

      velocities[i * 3] = 0;
      velocities[i * 3 + 1] = 0;
      velocities[i * 3 + 2] = 0;

      alphas[i] = 0;
      sizes[i] = 0.15 + Math.random() * 0.2;

      const color = foodColors[Math.floor(Math.random() * foodColors.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aVelocity', new THREE.BufferAttribute(velocities, 3));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
      },
      vertexShader: `
        attribute float aAlpha;
        attribute float aSize;
        attribute vec3 aColor;
        varying float vAlpha;
        varying vec3 vColor;

        void main() {
          vAlpha = aAlpha;
          vColor = aColor;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (200.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        varying vec3 vColor;

        void main() {
          // Soft circle shape
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float softEdge = 1.0 - smoothstep(0.3, 0.5, dist);
          gl_FragColor = vec4(vColor, vAlpha * softEdge);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    return { geometry: geo, material: mat };
  }, []);

  // Spawn particles when a new feed event arrives
  const lastEventId = useRef(null);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;

    const positions = geometry.attributes.position.array;
    const velocities = geometry.attributes.aVelocity.array;
    const alphas = geometry.attributes.aAlpha.array;
    const time = clock.elapsedTime;

    // Check for new feed event
    if (feedEvent && feedEvent.id !== lastEventId.current) {
      lastEventId.current = feedEvent.id;
      spawnTimeRef.current = time;
      activeRef.current = true;
      positionRef.current = feedEvent.position || [0, WATER_LEVEL, 0];

      // Reset all particles at spawn position
      const [sx, sy, sz] = positionRef.current;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        // Spread particles slightly around the spawn point
        positions[i * 3] = sx + (Math.random() - 0.5) * 3;
        positions[i * 3 + 1] = sy - 0.5; // Just below water surface
        positions[i * 3 + 2] = sz + (Math.random() - 0.5) * 3;

        // Random sink velocities
        velocities[i * 3] = (Math.random() - 0.5) * 0.02; // horizontal drift
        velocities[i * 3 + 1] = -(0.01 + Math.random() * 0.025); // sink speed
        velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;

        alphas[i] = 0.8 + Math.random() * 0.2;
      }
    }

    if (!activeRef.current) return;

    const elapsed = time - spawnTimeRef.current;

    // Animate particles
    let allDead = true;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      if (alphas[i] <= 0) continue;
      allDead = false;

      // Apply velocity
      positions[i * 3] += velocities[i * 3];
      positions[i * 3 + 1] += velocities[i * 3 + 1];
      positions[i * 3 + 2] += velocities[i * 3 + 2];

      // Horizontal wobble
      positions[i * 3] += Math.sin(time * 2 + i * 0.5) * 0.005;
      positions[i * 3 + 2] += Math.cos(time * 1.5 + i * 0.7) * 0.005;

      // Slow down sink over time (water resistance)
      velocities[i * 3 + 1] *= 0.998;

      // Fade out based on depth and time
      const depth = positionRef.current[1] - positions[i * 3 + 1];
      const depthFade = Math.max(0, 1 - depth / 15);
      const timeFade = Math.max(0, 1 - elapsed / 8);
      alphas[i] = Math.min(depthFade, timeFade);
    }

    if (allDead || elapsed > 8) {
      activeRef.current = false;
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.aAlpha.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geometry} material={material} />
  );
};

export default FoodParticles;
