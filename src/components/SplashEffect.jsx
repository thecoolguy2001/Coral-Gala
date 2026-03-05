import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { WATER_LEVEL } from '../constants/tankDimensions';

const DROPLET_COUNT = 40;
const BUBBLE_COUNT = 30;
const TOTAL = DROPLET_COUNT + BUBBLE_COUNT;

/**
 * SplashEffect - water droplets spray up + bubbles rush down when a fish hits the water
 * Triggered by boids that have a spawnTime within the last few seconds.
 */
const SplashEffect = ({ boids }) => {
  const pointsRef = useRef();
  const activeSplashesRef = useRef(new Set());

  const { geometry, velocities, alphas, material } = useMemo(() => {
    // Support up to 5 concurrent splashes
    const maxSplashes = 5;
    const total = TOTAL * maxSplashes;

    const positions = new Float32Array(total * 3);
    const vels = new Float32Array(total * 3);
    const alp = new Float32Array(total);
    const sizes = new Float32Array(total);
    const colors = new Float32Array(total * 3);

    for (let s = 0; s < maxSplashes; s++) {
      for (let i = 0; i < TOTAL; i++) {
        const idx = s * TOTAL + i;
        positions[idx * 3] = 0;
        positions[idx * 3 + 1] = -200;
        positions[idx * 3 + 2] = 0;
        alp[idx] = 0;

        if (i < DROPLET_COUNT) {
          // Water droplets - bigger, white/light blue
          sizes[idx] = 0.3 + Math.random() * 0.4;
          colors[idx * 3] = 0.8 + Math.random() * 0.2;
          colors[idx * 3 + 1] = 0.9 + Math.random() * 0.1;
          colors[idx * 3 + 2] = 1.0;
        } else {
          // Underwater bubbles - smaller, white
          sizes[idx] = 0.15 + Math.random() * 0.25;
          colors[idx * 3] = 0.9;
          colors[idx * 3 + 1] = 0.95;
          colors[idx * 3 + 2] = 1.0;
        }
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(alp, 1));
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
          // Bright center highlight (like water droplet catching light)
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

    return { geometry: geo, velocities: vels, alphas: alp, material: mat };
  }, []);

  useFrame(({ clock }) => {
    if (!pointsRef.current || !boids || boids.length === 0) return;

    const positions = geometry.attributes.position.array;
    const alp = geometry.attributes.aAlpha.array;
    const time = clock.elapsedTime;
    const nowMs = Date.now();
    const maxSplashes = 5;

    // Check for new fish that need splashes
    let slotIndex = 0;
    boids.forEach(boid => {
      if (!boid.spawnTime) return;
      const ageMs = nowMs - boid.spawnTime;

      // Trigger splash ~2s after spawn (when fish hits water surface)
      // Only for fish spawned in the last 7 seconds
      if (ageMs < 1900 || ageMs > 7000) return;

      const splashKey = boid.id + '_' + boid.spawnTime;
      if (activeSplashesRef.current.has(splashKey)) {
        // Already spawned this splash - just animate it
        return;
      }
      if (slotIndex >= maxSplashes) return;

      // Spawn a new splash
      activeSplashesRef.current.add(splashKey);
      const base = slotIndex * TOTAL;
      const sx = boid.position ? boid.position.x : 0;
      const sz = boid.position ? boid.position.z : 0;

      for (let i = 0; i < TOTAL; i++) {
        const idx = base + i;

        if (i < DROPLET_COUNT) {
          // Water droplets - spray UPWARD from water surface
          positions[idx * 3] = sx + (Math.random() - 0.5) * 1.5;
          positions[idx * 3 + 1] = WATER_LEVEL + 0.2;
          positions[idx * 3 + 2] = sz + (Math.random() - 0.5) * 1.5;

          const angle = Math.random() * Math.PI * 2;
          const outSpeed = 0.08 + Math.random() * 0.12;
          velocities[idx * 3] = Math.cos(angle) * outSpeed;
          velocities[idx * 3 + 1] = 0.15 + Math.random() * 0.2; // strong upward
          velocities[idx * 3 + 2] = Math.sin(angle) * outSpeed;
        } else {
          // Bubbles - rush DOWNWARD under water
          positions[idx * 3] = sx + (Math.random() - 0.5) * 2;
          positions[idx * 3 + 1] = WATER_LEVEL - 0.5 - Math.random() * 1.5;
          positions[idx * 3 + 2] = sz + (Math.random() - 0.5) * 2;

          const angle = Math.random() * Math.PI * 2;
          const outSpeed = 0.02 + Math.random() * 0.04;
          velocities[idx * 3] = Math.cos(angle) * outSpeed;
          velocities[idx * 3 + 1] = -(0.05 + Math.random() * 0.1); // downward initially
          velocities[idx * 3 + 2] = Math.sin(angle) * outSpeed;
        }

        alp[idx] = 0.9;
      }

      slotIndex++;
    });

    // Animate all particles
    for (let s = 0; s < maxSplashes; s++) {
      for (let i = 0; i < TOTAL; i++) {
        const idx = s * TOTAL + i;
        if (alp[idx] <= 0.01) continue;

        // Apply velocity
        positions[idx * 3] += velocities[idx * 3];
        positions[idx * 3 + 1] += velocities[idx * 3 + 1];
        positions[idx * 3 + 2] += velocities[idx * 3 + 2];

        if (i < DROPLET_COUNT) {
          // Water droplets: gravity pulls them back down
          velocities[idx * 3 + 1] -= 0.008; // gravity

          // Once they fall back below water level, kill them
          if (velocities[idx * 3 + 1] < 0 && positions[idx * 3 + 1] < WATER_LEVEL) {
            alp[idx] = 0;
            continue;
          }

          // Fade over time
          alp[idx] *= 0.985;
        } else {
          // Bubbles: buoyancy brings them back up
          velocities[idx * 3 + 1] += 0.004; // buoyancy

          // Wobble
          positions[idx * 3] += Math.sin(time * 8 + idx) * 0.003;
          positions[idx * 3 + 2] += Math.cos(time * 6 + idx * 0.7) * 0.003;

          // Fade as they rise
          alp[idx] *= 0.975;

          // Kill when they reach the surface
          if (positions[idx * 3 + 1] > WATER_LEVEL) {
            alp[idx] = 0;
          }
        }

        // Slow down horizontally
        velocities[idx * 3] *= 0.97;
        velocities[idx * 3 + 2] *= 0.97;
      }
    }

    // Clean up old splashes
    activeSplashesRef.current.forEach(key => {
      const spawnTime = parseInt(key.split('_')[1]);
      if (nowMs - spawnTime > 7000) {
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
