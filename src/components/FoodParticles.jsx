import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { WATER_LEVEL } from '../constants/tankDimensions';

const PARTICLE_COUNT = 60;

const FoodParticles = ({ feedEvent }) => {
  const pointsRef = useRef();
  const spawnTimeRef = useRef(0);
  const activeRef = useRef(false);
  const positionRef = useRef([0, WATER_LEVEL, 0]);
  const lastEventId = useRef(null);

  const { geometry, velocitiesArray, alphasArray, material } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const velocities = new Float32Array(PARTICLE_COUNT * 3);
    const alphas = new Float32Array(PARTICLE_COUNT);
    const sizes = new Float32Array(PARTICLE_COUNT);
    const colors = new Float32Array(PARTICLE_COUNT * 3);

    const foodColors = [
      new THREE.Color('#B8860B'), // dark goldenrod
      new THREE.Color('#8B6914'), // golden brown
      new THREE.Color('#6B8E23'), // olive green
      new THREE.Color('#D2691E'), // chocolate
      new THREE.Color('#DAA520'), // goldenrod
      new THREE.Color('#CD853F'), // peru
      new THREE.Color('#A0522D'), // sienna
    ];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = -200;
      positions[i * 3 + 2] = 0;

      alphas[i] = 0;
      // Much bigger flakes so they're visible from camera distance
      sizes[i] = 0.4 + Math.random() * 0.5;

      const color = foodColors[Math.floor(Math.random() * foodColors.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
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
          gl_PointSize = aSize * (600.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        varying vec3 vColor;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          // Irregular flake shape
          float edge = 1.0 - smoothstep(0.25, 0.5, dist);
          // Add some texture to the flake
          float grain = fract(sin(dot(gl_PointCoord * 10.0, vec2(12.9898, 78.233))) * 43758.5453) * 0.3 + 0.7;
          gl_FragColor = vec4(vColor * grain, vAlpha * edge);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    return { geometry: geo, velocitiesArray: velocities, alphasArray: alphas, material: mat };
  }, []);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;

    const positions = geometry.attributes.position.array;
    const alphas = geometry.attributes.aAlpha.array;
    const time = clock.elapsedTime;

    // Check for new feed event
    if (feedEvent && feedEvent.id !== lastEventId.current) {
      lastEventId.current = feedEvent.id;
      spawnTimeRef.current = time;
      activeRef.current = true;
      positionRef.current = feedEvent.position || [0, WATER_LEVEL, 0];

      const [sx, sy, sz] = positionRef.current;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        // Spread across a wider area at the surface
        positions[i * 3] = sx + (Math.random() - 0.5) * 6;
        positions[i * 3 + 1] = sy - 0.2 - Math.random() * 0.5;
        positions[i * 3 + 2] = sz + (Math.random() - 0.5) * 6;

        // Store velocity in the velocities array
        velocitiesArray[i * 3] = (Math.random() - 0.5) * 0.03;
        velocitiesArray[i * 3 + 1] = -(0.015 + Math.random() * 0.03);
        velocitiesArray[i * 3 + 2] = (Math.random() - 0.5) * 0.03;

        alphas[i] = 0.9 + Math.random() * 0.1;
      }
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.aAlpha.needsUpdate = true;
    }

    if (!activeRef.current) return;

    const elapsed = time - spawnTimeRef.current;

    let allDead = true;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      if (alphas[i] <= 0.01) continue;
      allDead = false;

      // Apply velocity
      positions[i * 3] += velocitiesArray[i * 3];
      positions[i * 3 + 1] += velocitiesArray[i * 3 + 1];
      positions[i * 3 + 2] += velocitiesArray[i * 3 + 2];

      // Gentle wobble as they sink (like real food flakes tumbling)
      positions[i * 3] += Math.sin(time * 1.5 + i * 1.3) * 0.008;
      positions[i * 3 + 2] += Math.cos(time * 1.2 + i * 0.9) * 0.008;

      // Water resistance slows the sink
      velocitiesArray[i * 3 + 1] *= 0.997;
      // Horizontal drift slows too
      velocitiesArray[i * 3] *= 0.995;
      velocitiesArray[i * 3 + 2] *= 0.995;

      // Fade based on depth sunk and time
      const depth = positionRef.current[1] - positions[i * 3 + 1];
      const depthFade = Math.max(0, 1 - depth / 18);
      const timeFade = Math.max(0, 1 - elapsed / 8);
      alphas[i] = Math.min(depthFade, timeFade) * 0.95;
    }

    if (allDead || elapsed > 9) {
      activeRef.current = false;
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.aAlpha.needsUpdate = true;
    material.uniforms.time.value = time;
  });

  return (
    <points ref={pointsRef} geometry={geometry} material={material} />
  );
};

export default FoodParticles;
