import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const PARTICLE_COUNT = 30;

const PetEffect = ({ petEvent, boids }) => {
  const pointsRef = useRef();
  const spawnTimeRef = useRef(0);
  const activeRef = useRef(false);
  const targetPosRef = useRef(new THREE.Vector3());
  const lastEventId = useRef(null);
  const targetFishIdRef = useRef(null);

  const { geometry, material } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const velocities = new Float32Array(PARTICLE_COUNT * 3);
    const alphas = new Float32Array(PARTICLE_COUNT);
    const sizes = new Float32Array(PARTICLE_COUNT);
    const colors = new Float32Array(PARTICLE_COUNT * 3);

    // Sparkle colors: white, gold, light blue
    const sparkleColors = [
      new THREE.Color('#FFFFFF'),
      new THREE.Color('#FFD700'),
      new THREE.Color('#87CEEB'),
      new THREE.Color('#FFFACD'),
      new THREE.Color('#E0E8FF'),
    ];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = -100;
      positions[i * 3 + 2] = 0;

      alphas[i] = 0;
      sizes[i] = 0.1 + Math.random() * 0.15;

      const color = sparkleColors[Math.floor(Math.random() * sparkleColors.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aVelocity', new THREE.BufferAttribute(new Float32Array(PARTICLE_COUNT * 3), 3));
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
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          // Star/sparkle shape with bright center
          float glow = exp(-dist * 6.0);
          float sparkle = glow + smoothstep(0.4, 0.0, dist) * 0.5;
          gl_FragColor = vec4(vColor * sparkle, vAlpha * sparkle);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return { geometry: geo, material: mat };
  }, []);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;

    const positions = geometry.attributes.position.array;
    const velocities = geometry.attributes.aVelocity.array;
    const alphas = geometry.attributes.aAlpha.array;
    const time = clock.elapsedTime;

    // Check for new pet event
    if (petEvent && petEvent.id !== lastEventId.current) {
      lastEventId.current = petEvent.id;
      spawnTimeRef.current = time;
      activeRef.current = true;

      // Pick a random fish to pet
      if (boids && boids.length > 0) {
        const targetIndex = Math.floor(Math.random() * boids.length);
        const targetBoid = boids[targetIndex];
        targetPosRef.current.copy(targetBoid.position);
        targetFishIdRef.current = targetBoid.id;
        // Tag the event so Fish.jsx knows which fish is petted
        petEvent.targetFishId = targetBoid.id;
      }

      // Spawn sparkles at target position
      const pos = targetPosRef.current;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        positions[i * 3] = pos.x + (Math.random() - 0.5) * 2;
        positions[i * 3 + 1] = pos.y + (Math.random() - 0.5) * 2;
        positions[i * 3 + 2] = pos.z + (Math.random() - 0.5) * 2;

        // Float upward and outward
        const angle = Math.random() * Math.PI * 2;
        const outSpeed = 0.02 + Math.random() * 0.03;
        velocities[i * 3] = Math.cos(angle) * outSpeed;
        velocities[i * 3 + 1] = 0.02 + Math.random() * 0.03; // upward
        velocities[i * 3 + 2] = Math.sin(angle) * outSpeed;

        alphas[i] = 0; // Start transparent, fade in
      }
    }

    if (!activeRef.current) return;

    const elapsed = time - spawnTimeRef.current;

    // Track the target fish position for the first second
    if (elapsed < 1.0 && targetFishIdRef.current && boids) {
      const targetBoid = boids.find(b => b.id === targetFishIdRef.current);
      if (targetBoid) {
        targetPosRef.current.copy(targetBoid.position);
      }
    }

    let allDead = true;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Fade in then out
      if (elapsed < 0.3) {
        alphas[i] = Math.min(1.0, elapsed / 0.3);
      } else {
        alphas[i] = Math.max(0, 1.0 - (elapsed - 0.3) / 2.2);
      }

      if (alphas[i] <= 0) continue;
      allDead = false;

      // Apply velocity
      positions[i * 3] += velocities[i * 3];
      positions[i * 3 + 1] += velocities[i * 3 + 1];
      positions[i * 3 + 2] += velocities[i * 3 + 2];

      // Slow down over time
      velocities[i * 3] *= 0.98;
      velocities[i * 3 + 1] *= 0.98;
      velocities[i * 3 + 2] *= 0.98;

      // Twinkle effect
      const twinkle = Math.sin(time * 15 + i * 2.3) * 0.3 + 0.7;
      alphas[i] *= twinkle;
    }

    if (allDead || elapsed > 3) {
      activeRef.current = false;
      targetFishIdRef.current = null;
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.aAlpha.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geometry} material={material} />
  );
};

export default PetEffect;
