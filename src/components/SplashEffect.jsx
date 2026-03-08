import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { WATER_LEVEL } from '../constants/tankDimensions';

const DROPLET_COUNT = 50;
const BUBBLE_COUNT = 40;
const TRAIL_BUBBLE_COUNT = 60;
const TOTAL = DROPLET_COUNT + BUBBLE_COUNT + TRAIL_BUBBLE_COUNT;
const MAX_SPLASHES = 5;

/**
 * SplashEffect - water droplets spray up + bubbles rush down + bubble trail
 * follows the fish as it plunges into the tank.
 */
const SplashEffect = ({ boids }) => {
  const pointsRef = useRef();
  const activeSplashesRef = useRef(new Map());
  const usedSlotsRef = useRef(new Set());

  const { geometry, velocities, material } = useMemo(() => {
    const total = TOTAL * MAX_SPLASHES;

    const positions = new Float32Array(total * 3);
    const vels = new Float32Array(total * 3);
    const alphas = new Float32Array(total);
    const sizes = new Float32Array(total);
    const colors = new Float32Array(total * 3);

    for (let s = 0; s < MAX_SPLASHES; s++) {
      for (let i = 0; i < TOTAL; i++) {
        const idx = s * TOTAL + i;
        positions[idx * 3] = 0;
        positions[idx * 3 + 1] = -200;
        positions[idx * 3 + 2] = 0;
        alphas[idx] = 0;

        if (i < DROPLET_COUNT) {
          sizes[idx] = 0.3 + Math.random() * 0.5;
          colors[idx * 3] = 0.8 + Math.random() * 0.2;
          colors[idx * 3 + 1] = 0.9 + Math.random() * 0.1;
          colors[idx * 3 + 2] = 1.0;
        } else if (i < DROPLET_COUNT + BUBBLE_COUNT) {
          sizes[idx] = 0.15 + Math.random() * 0.25;
          colors[idx * 3] = 0.9;
          colors[idx * 3 + 1] = 0.95;
          colors[idx * 3 + 2] = 1.0;
        } else {
          sizes[idx] = 0.08 + Math.random() * 0.2;
          colors[idx * 3] = 0.85 + Math.random() * 0.15;
          colors[idx * 3 + 1] = 0.9 + Math.random() * 0.1;
          colors[idx * 3 + 2] = 1.0;
        }
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.ShaderMaterial({
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
          gl_PointSize = aSize * (500.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        varying vec3 vColor;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float highlight = exp(-dist * 5.0);
          float edge = 1.0 - smoothstep(0.3, 0.5, dist);
          vec3 color = vColor + vec3(highlight * 0.4);
          gl_FragColor = vec4(color, vAlpha * edge);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return { geometry: geo, velocities: vels, material: mat };
  }, []);

  // Find next available slot
  const getNextSlot = () => {
    for (let s = 0; s < MAX_SPLASHES; s++) {
      if (!usedSlotsRef.current.has(s)) return s;
    }
    return -1;
  };

  useFrame(({ clock }) => {
    if (!pointsRef.current || !boids || boids.length === 0) return;

    const positions = geometry.attributes.position.array;
    const alphas = geometry.attributes.aAlpha.array;
    const time = clock.elapsedTime;
    const nowMs = Date.now();

    boids.forEach(boid => {
      if (!boid.spawnTime) return;
      const ageMs = nowMs - boid.spawnTime;

      if (ageMs > 8000) return;

      const splashKey = boid.id + '_' + boid.spawnTime;

      if (ageMs >= 1900 && ageMs <= 7000) {
        let splash = activeSplashesRef.current.get(splashKey);
        if (!splash) {
          const slot = getNextSlot();
          if (slot === -1) return;

          splash = { slot, trailCount: 0, splashed: false };
          activeSplashesRef.current.set(splashKey, splash);
          usedSlotsRef.current.add(slot);
        }

        const base = splash.slot * TOTAL;

        // Spawn surface splash once
        if (!splash.splashed) {
          splash.splashed = true;

          // Use boid's current position for X/Z (the boid system places them in the tank)
          const sx = boid.position ? boid.position.x : 0;
          const sz = boid.position ? boid.position.z : 0;

          // Droplets — spray upward from water surface
          for (let i = 0; i < DROPLET_COUNT; i++) {
            const idx = base + i;
            positions[idx * 3] = sx + (Math.random() - 0.5) * 2;
            positions[idx * 3 + 1] = WATER_LEVEL + 0.2;
            positions[idx * 3 + 2] = sz + (Math.random() - 0.5) * 2;

            const angle = Math.random() * Math.PI * 2;
            const outSpeed = 0.08 + Math.random() * 0.15;
            velocities[idx * 3] = Math.cos(angle) * outSpeed;
            velocities[idx * 3 + 1] = 0.15 + Math.random() * 0.25;
            velocities[idx * 3 + 2] = Math.sin(angle) * outSpeed;

            alphas[idx] = 0.9 + Math.random() * 0.1;
          }

          // Impact bubbles — burst downward from surface
          for (let i = DROPLET_COUNT; i < DROPLET_COUNT + BUBBLE_COUNT; i++) {
            const idx = base + i;
            positions[idx * 3] = sx + (Math.random() - 0.5) * 2.5;
            positions[idx * 3 + 1] = WATER_LEVEL - 0.5 - Math.random() * 2;
            positions[idx * 3 + 2] = sz + (Math.random() - 0.5) * 2.5;

            const angle = Math.random() * Math.PI * 2;
            const outSpeed = 0.02 + Math.random() * 0.05;
            velocities[idx * 3] = Math.cos(angle) * outSpeed;
            velocities[idx * 3 + 1] = -(0.06 + Math.random() * 0.12);
            velocities[idx * 3 + 2] = Math.sin(angle) * outSpeed;

            alphas[idx] = 0.8 + Math.random() * 0.2;
          }
        }

        // Trail bubbles — spawn near fish during plunge phase
        if (ageMs >= 2000 && ageMs <= 4500 && boid.position) {
          const trailBase = base + DROPLET_COUNT + BUBBLE_COUNT;
          const bubblesPerFrame = 3;
          for (let b = 0; b < bubblesPerFrame; b++) {
            const ti = splash.trailCount % TRAIL_BUBBLE_COUNT;
            const idx = trailBase + ti;

            positions[idx * 3] = boid.position.x + (Math.random() - 0.5) * 1.5;
            positions[idx * 3 + 1] = boid.position.y + (Math.random() - 0.5) * 1.0 + 0.5;
            positions[idx * 3 + 2] = boid.position.z + (Math.random() - 0.5) * 1.5;

            const angle = Math.random() * Math.PI * 2;
            const outSpeed = 0.01 + Math.random() * 0.03;
            velocities[idx * 3] = Math.cos(angle) * outSpeed;
            velocities[idx * 3 + 1] = 0.02 + Math.random() * 0.06;
            velocities[idx * 3 + 2] = Math.sin(angle) * outSpeed;

            alphas[idx] = 0.6 + Math.random() * 0.4;

            splash.trailCount++;
          }
        }
      }
    });

    // Animate all particles
    for (let s = 0; s < MAX_SPLASHES; s++) {
      for (let i = 0; i < TOTAL; i++) {
        const idx = s * TOTAL + i;
        if (alphas[idx] <= 0.01) continue;

        positions[idx * 3] += velocities[idx * 3];
        positions[idx * 3 + 1] += velocities[idx * 3 + 1];
        positions[idx * 3 + 2] += velocities[idx * 3 + 2];

        if (i < DROPLET_COUNT) {
          velocities[idx * 3 + 1] -= 0.008;
          if (velocities[idx * 3 + 1] < 0 && positions[idx * 3 + 1] < WATER_LEVEL) {
            alphas[idx] = 0;
            continue;
          }
          alphas[idx] *= 0.985;
        } else {
          velocities[idx * 3 + 1] += 0.003;
          positions[idx * 3] += Math.sin(time * 8 + idx) * 0.004;
          positions[idx * 3 + 2] += Math.cos(time * 6 + idx * 0.7) * 0.004;
          alphas[idx] *= 0.97;
          if (positions[idx * 3 + 1] > WATER_LEVEL) {
            alphas[idx] = 0;
          }
        }

        velocities[idx * 3] *= 0.97;
        velocities[idx * 3 + 2] *= 0.97;
      }
    }

    // Clean up old splashes and free their slots
    activeSplashesRef.current.forEach((val, key) => {
      const spawnTime = parseInt(key.split('_')[1]);
      if (nowMs - spawnTime > 8000) {
        usedSlotsRef.current.delete(val.slot);
        activeSplashesRef.current.delete(key);
      }
    });

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.aAlpha.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geometry} material={material} />
  );
};

export default SplashEffect;
