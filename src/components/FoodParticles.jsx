import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { WATER_LEVEL } from '../constants/tankDimensions';

const PARTICLE_COUNT = 60;

// Each food flake as a simple instanced mesh
const FoodParticles = ({ feedEvent }) => {
  const meshRef = useRef();
  const dataRef = useRef([]);
  const activeRef = useRef(false);
  const spawnTimeRef = useRef(0);
  const lastEventId = useRef(null);
  const spawnPosRef = useRef([0, WATER_LEVEL, 0]);
  const dummyObj = useRef(new THREE.Object3D());
  const colorArray = useRef(new Float32Array(PARTICLE_COUNT * 3));

  const foodColors = [
    [0.72, 0.53, 0.04], // dark goldenrod
    [0.55, 0.41, 0.08], // golden brown
    [0.42, 0.56, 0.14], // olive green
    [0.82, 0.41, 0.12], // chocolate
    [0.85, 0.65, 0.13], // goldenrod
    [0.80, 0.52, 0.25], // peru
    [0.87, 0.72, 0.53], // burlywood
  ];

  // Init particle data
  useEffect(() => {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const c = foodColors[Math.floor(Math.random() * foodColors.length)];
      colorArray.current[i * 3] = c[0];
      colorArray.current[i * 3 + 1] = c[1];
      colorArray.current[i * 3 + 2] = c[2];

      dataRef.current[i] = {
        pos: new THREE.Vector3(0, -500, 0),
        vel: new THREE.Vector3(),
        alive: false,
        hitWater: false,
        spawnDelay: 0,
        spawned: false,
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleSpeed: 1 + Math.random() * 2,
        scale: 0.3 + Math.random() * 0.4,
      };
    }
  }, []);

  // Detect new feed event via useEffect (not just useFrame) to avoid stale closure
  useEffect(() => {
    if (!feedEvent) return;
    console.log('🍽️ FOOD EVENT DETECTED:', feedEvent);

    spawnTimeRef.current = performance.now() / 1000;
    activeRef.current = true;
    spawnPosRef.current = feedEvent.position || [0, WATER_LEVEL, 0];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = dataRef.current[i];
      p.spawned = false;
      p.alive = false;
      p.hitWater = false;
      p.spawnDelay = Math.random() * 1.0;
      p.pos.set(0, -500, 0);
    }
  }, [feedEvent?.id]);

  useFrame(({ clock }) => {
    if (!meshRef.current || !activeRef.current) return;

    const time = clock.elapsedTime;
    const elapsed = time - spawnTimeRef.current;
    const [sx, , sz] = spawnPosRef.current;
    const dropStartY = WATER_LEVEL + 8;
    let anyAlive = false;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = dataRef.current[i];

      // Staggered spawn
      if (!p.spawned && elapsed >= p.spawnDelay) {
        p.spawned = true;
        p.alive = true;
        p.hitWater = false;
        p.pos.set(
          sx + (Math.random() - 0.5) * 10,
          dropStartY + (Math.random() - 0.5) * 3,
          sz + (Math.random() - 0.5) * 6
        );
        p.vel.set(
          (Math.random() - 0.5) * 0.05,
          -(0.01 + Math.random() * 0.02),
          (Math.random() - 0.5) * 0.04
        );
      }

      if (!p.alive) {
        // Hide off screen
        dummyObj.current.position.set(0, -500, 0);
        dummyObj.current.scale.setScalar(0.001);
        dummyObj.current.updateMatrix();
        meshRef.current.setMatrixAt(i, dummyObj.current.matrix);
        continue;
      }

      anyAlive = true;

      // Air phase — gravity
      if (!p.hitWater && p.pos.y > WATER_LEVEL) {
        p.vel.y -= 0.005;
        p.pos.x += Math.sin(time * 3 + p.wobblePhase) * 0.003;
        p.pos.z += Math.cos(time * 2 + p.wobblePhase) * 0.003;
      }

      // Hit water
      if (!p.hitWater && p.pos.y <= WATER_LEVEL) {
        p.hitWater = true;
        p.vel.y *= 0.12;
        p.vel.x += (Math.random() - 0.5) * 0.01;
        p.vel.z += (Math.random() - 0.5) * 0.01;
      }

      // Underwater
      if (p.hitWater) {
        p.vel.y *= 0.995;
        p.vel.x *= 0.99;
        p.vel.z *= 0.99;
        if (p.vel.y > -0.004) p.vel.y = -0.004;
        p.pos.x += Math.sin(time * p.wobbleSpeed + p.wobblePhase) * 0.007;
        p.pos.z += Math.cos(time * p.wobbleSpeed * 0.7 + p.wobblePhase) * 0.007;
      }

      p.pos.add(p.vel);

      // Fade / kill
      const pAge = elapsed - p.spawnDelay;
      if (pAge > 10 || (p.hitWater && WATER_LEVEL - p.pos.y > 18)) {
        p.alive = false;
      }

      // Set instance transform
      dummyObj.current.position.copy(p.pos);
      dummyObj.current.rotation.set(
        time * p.wobbleSpeed * 0.5 + p.wobblePhase,
        0,
        time * p.wobbleSpeed * 0.3
      );
      dummyObj.current.scale.setScalar(p.scale);
      dummyObj.current.updateMatrix();
      meshRef.current.setMatrixAt(i, dummyObj.current.matrix);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;

    if (!anyAlive && elapsed > 2) {
      activeRef.current = false;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, PARTICLE_COUNT]} frustumCulled={false}>
      <sphereGeometry args={[0.5, 6, 4]} />
      <meshStandardMaterial
        color="#DAA520"
        roughness={0.8}
        metalness={0.1}
      />
    </instancedMesh>
  );
};

export default FoodParticles;
