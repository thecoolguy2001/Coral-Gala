import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const PARTICLE_COUNT = 40;

const PetEffect = ({ petEvent, boids }) => {
  const pointsRef = useRef();
  const spawnTimeRef = useRef(0);
  const activeRef = useRef(false);
  const targetPosRef = useRef(new THREE.Vector3());
  const lastEventId = useRef(null);
  const targetFishIdRef = useRef(null);
  const velocitiesArray = useRef(new Float32Array(PARTICLE_COUNT * 3));

  const { geometry, material } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const alphas = new Float32Array(PARTICLE_COUNT);
    const sizes = new Float32Array(PARTICLE_COUNT);
    const colors = new Float32Array(PARTICLE_COUNT * 3);

    const sparkleColors = [
      new THREE.Color('#FFFFFF'),
      new THREE.Color('#FFD700'),
      new THREE.Color('#FFE44D'),
      new THREE.Color('#87CEEB'),
      new THREE.Color('#FFFACD'),
    ];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = -200;
      positions[i * 3 + 2] = 0;

      alphas[i] = 0;
      // Much bigger sparkles
      sizes[i] = 0.5 + Math.random() * 0.6;

      const color = sparkleColors[Math.floor(Math.random() * sparkleColors.length)];
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
          // Bright glowing star shape
          float glow = exp(-dist * 4.0);
          float core = smoothstep(0.15, 0.0, dist);
          // Cross/star rays
          vec2 uv = gl_PointCoord - vec2(0.5);
          float rays = exp(-abs(uv.x) * 8.0) + exp(-abs(uv.y) * 8.0);
          rays *= 0.3;
          float brightness = glow + core * 0.8 + rays;
          gl_FragColor = vec4(vColor * brightness, vAlpha * brightness);
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
    const alphas = geometry.attributes.aAlpha.array;
    const vels = velocitiesArray.current;
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

      // Spawn sparkles around target fish
      const pos = targetPosRef.current;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        positions[i * 3] = pos.x + (Math.random() - 0.5) * 3;
        positions[i * 3 + 1] = pos.y + (Math.random() - 0.5) * 3;
        positions[i * 3 + 2] = pos.z + (Math.random() - 0.5) * 3;

        // Float upward and outward
        const angle = Math.random() * Math.PI * 2;
        const outSpeed = 0.03 + Math.random() * 0.05;
        vels[i * 3] = Math.cos(angle) * outSpeed;
        vels[i * 3 + 1] = 0.03 + Math.random() * 0.05;
        vels[i * 3 + 2] = Math.sin(angle) * outSpeed;

        alphas[i] = 0;
      }

      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.aAlpha.needsUpdate = true;
    }

    if (!activeRef.current) return;

    const elapsed = time - spawnTimeRef.current;

    // Track the target fish for the first second so sparkles follow it
    if (elapsed < 1.5 && targetFishIdRef.current && boids) {
      const targetBoid = boids.find(b => b.id === targetFishIdRef.current);
      if (targetBoid) {
        targetPosRef.current.copy(targetBoid.position);
      }
    }

    let allDead = true;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Staggered fade in then out
      const stagger = (i / PARTICLE_COUNT) * 0.5;
      if (elapsed < 0.4 + stagger) {
        alphas[i] = Math.min(1.0, (elapsed - stagger * 0.5) / 0.3);
      } else {
        alphas[i] = Math.max(0, 1.0 - (elapsed - 0.4 - stagger) / 2.0);
      }

      if (alphas[i] <= 0.01) continue;
      allDead = false;

      // Apply velocity
      positions[i * 3] += vels[i * 3];
      positions[i * 3 + 1] += vels[i * 3 + 1];
      positions[i * 3 + 2] += vels[i * 3 + 2];

      // Slow down
      vels[i * 3] *= 0.97;
      vels[i * 3 + 1] *= 0.97;
      vels[i * 3 + 2] *= 0.97;

      // Twinkle
      const twinkle = Math.sin(time * 12 + i * 2.0) * 0.4 + 0.6;
      alphas[i] *= twinkle;
    }

    if (allDead || elapsed > 3.5) {
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
