import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { WATER_LEVEL } from '../constants/tankDimensions';

const PARTICLE_COUNT = 80;

const FoodParticles = ({ feedEvent }) => {
  const groupRef = useRef();
  const spawnTimeRef = useRef(0);
  const activeRef = useRef(false);
  const positionRef = useRef([0, WATER_LEVEL, 0]);
  const lastEventId = useRef(null);
  const particleData = useRef([]);
  const meshRefs = useRef([]);

  const foodColors = useMemo(() => [
    '#B8860B', '#8B6914', '#6B8E23', '#D2691E',
    '#DAA520', '#CD853F', '#A0522D', '#DEB887',
  ], []);

  // Initialize particle data
  useMemo(() => {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particleData.current[i] = {
        pos: new THREE.Vector3(0, -200, 0),
        vel: new THREE.Vector3(),
        alpha: 0,
        size: 0.12 + Math.random() * 0.18,
        color: foodColors[Math.floor(Math.random() * foodColors.length)],
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleSpeed: 1 + Math.random() * 2,
        spawnDelay: Math.random() * 1.2, // staggered sprinkle over ~1.2 seconds
        spawned: false,
        hitWater: false,
      };
    }
  }, []);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const time = clock.elapsedTime;

    // Check for new feed event
    if (feedEvent && feedEvent.id !== lastEventId.current) {
      lastEventId.current = feedEvent.id;
      spawnTimeRef.current = time;
      activeRef.current = true;
      positionRef.current = feedEvent.position || [0, WATER_LEVEL, 0];

      // Reset all particles
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const p = particleData.current[i];
        p.spawned = false;
        p.hitWater = false;
        p.alpha = 0;
        p.pos.set(0, -200, 0);
        p.spawnDelay = Math.random() * 1.2;
        if (meshRefs.current[i]) meshRefs.current[i].visible = false;
      }
    }

    if (!activeRef.current) return;

    const elapsed = time - spawnTimeRef.current;
    const [sx, , sz] = positionRef.current;
    const dropStartY = WATER_LEVEL + 15; // start above the tank, visible on camera
    let allDone = true;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = particleData.current[i];
      const mesh = meshRefs.current[i];
      if (!mesh) continue;

      // Staggered spawn — sprinkle effect, not all at once
      if (!p.spawned) {
        if (elapsed >= p.spawnDelay) {
          p.spawned = true;
          // Spawn above the tank spread out like being sprinkled from a hand
          p.pos.set(
            sx + (Math.random() - 0.5) * 10,
            dropStartY + (Math.random() - 0.5) * 3,
            sz + (Math.random() - 0.5) * 6
          );
          // Slight outward + downward velocity like being tossed
          p.vel.set(
            (Math.random() - 0.5) * 0.06,
            -(0.02 + Math.random() * 0.03),
            (Math.random() - 0.5) * 0.04
          );
          p.alpha = 1.0;
          p.hitWater = false;
        } else {
          continue;
        }
      }

      if (p.alpha <= 0.01) {
        mesh.visible = false;
        continue;
      }
      allDone = false;
      mesh.visible = true;

      // PHASE 1: Falling through air — gravity pulls them down fast
      if (!p.hitWater && p.pos.y > WATER_LEVEL) {
        p.vel.y -= 0.006; // gravity
        // Light air drift
        p.pos.x += Math.sin(time * 3 + p.wobblePhase) * 0.003;
        p.pos.z += Math.cos(time * 2.5 + p.wobblePhase) * 0.003;
      }

      // PHASE 2: Hit water — slow way down, start sinking gently
      if (!p.hitWater && p.pos.y <= WATER_LEVEL) {
        p.hitWater = true;
        // Kill most downward velocity — water drag impact
        p.vel.y *= 0.15;
        // Slight splash outward
        p.vel.x += (Math.random() - 0.5) * 0.01;
        p.vel.z += (Math.random() - 0.5) * 0.01;
      }

      if (p.hitWater) {
        // Gentle sinking through water
        p.vel.y *= 0.995;
        p.vel.x *= 0.99;
        p.vel.z *= 0.99;
        // Minimum sink
        if (p.vel.y > -0.005) p.vel.y = -0.005;
        // Wobble like a real flake in water
        p.pos.x += Math.sin(time * p.wobbleSpeed + p.wobblePhase) * 0.008;
        p.pos.z += Math.cos(time * p.wobbleSpeed * 0.7 + p.wobblePhase) * 0.008;
      }

      // Apply velocity
      p.pos.add(p.vel);

      // Fade based on depth below water and time
      const particleAge = elapsed - p.spawnDelay;
      if (p.hitWater) {
        const depth = WATER_LEVEL - p.pos.y;
        const depthFade = Math.max(0, 1 - depth / 18);
        const timeFade = Math.max(0, 1 - particleAge / 10);
        p.alpha = Math.min(depthFade, timeFade);
      } else {
        p.alpha = 1.0; // fully visible while falling through air
      }

      // Update mesh
      mesh.position.copy(p.pos);
      mesh.rotation.x = time * p.wobbleSpeed * 0.5 + p.wobblePhase;
      mesh.rotation.z = time * p.wobbleSpeed * 0.3 + p.wobblePhase * 0.5;
      mesh.material.opacity = p.alpha;
    }

    if (allDone || elapsed > 12) {
      activeRef.current = false;
    }
  });

  return (
    <group ref={groupRef} renderOrder={999}>
      {Array.from({ length: PARTICLE_COUNT }, (_, i) => {
        const p = particleData.current[i];
        return (
          <mesh
            key={i}
            ref={el => meshRefs.current[i] = el}
            visible={false}
          >
            <planeGeometry args={[p?.size || 0.15, p?.size || 0.15]} />
            <meshBasicMaterial
              color={p?.color || '#DAA520'}
              transparent
              opacity={0}
              side={THREE.DoubleSide}
              depthTest={false}
            />
          </mesh>
        );
      })}
    </group>
  );
};

export default FoodParticles;
