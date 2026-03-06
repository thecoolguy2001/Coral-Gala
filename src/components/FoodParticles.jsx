import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { WATER_LEVEL } from '../constants/tankDimensions';

const PARTICLE_COUNT = 100;
const FADE_DEPTH = 3; // fade over last 3 units before kill depth
const KILL_DEPTH = 8; // units below water surface

const FoodParticles = ({ feedEvent }) => {
  const meshRef = useRef();
  const dataRef = useRef([]);
  const activeRef = useRef(false);
  const spawnTimeRef = useRef(0);
  const spawnPosRef = useRef([0, WATER_LEVEL, 0]);
  const dummyObj = useRef(new THREE.Object3D());

  const foodColors = [
    [0.72, 0.53, 0.04],
    [0.55, 0.41, 0.08],
    [0.42, 0.56, 0.14],
    [0.82, 0.41, 0.12],
    [0.85, 0.65, 0.13],
    [0.80, 0.52, 0.25],
    [0.87, 0.72, 0.53],
  ];

  // Custom shader material that supports per-instance opacity via instance color alpha trick
  // We'll use the instance matrix scale to shrink particles as they fade,
  // combined with a transparent material
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uColors: { value: [] },
      },
      vertexShader: `
        attribute float aOpacity;
        attribute vec3 aColor;
        varying float vOpacity;
        varying vec3 vColor;
        varying vec3 vNormal;
        varying vec3 vViewPosition;

        void main() {
          vOpacity = aOpacity;
          vColor = aColor;
          vNormal = normalize(normalMatrix * normal);

          vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vOpacity;
        varying vec3 vColor;
        varying vec3 vNormal;
        varying vec3 vViewPosition;

        void main() {
          // Simple lit shading
          vec3 lightDir = normalize(vec3(0.5, 1.0, 0.3));
          float diffuse = max(dot(vNormal, lightDir), 0.0) * 0.6 + 0.4;
          vec3 color = vColor * diffuse;

          // Specular highlight
          vec3 viewDir = normalize(vViewPosition);
          vec3 halfDir = normalize(lightDir + viewDir);
          float spec = pow(max(dot(vNormal, halfDir), 0.0), 16.0) * 0.2;
          color += vec3(spec);

          gl_FragColor = vec4(color, vOpacity);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  }, []);

  // Init particle data + hide all instances off-screen
  useEffect(() => {
    const opacities = new Float32Array(PARTICLE_COUNT);
    const colors = new Float32Array(PARTICLE_COUNT * 3);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const c = foodColors[Math.floor(Math.random() * foodColors.length)];
      colors[i * 3] = c[0];
      colors[i * 3 + 1] = c[1];
      colors[i * 3 + 2] = c[2];
      opacities[i] = 0.0;

      dataRef.current[i] = {
        pos: new THREE.Vector3(0, -500, 0),
        vel: new THREE.Vector3(),
        alive: false,
        hitWater: false,
        spawnDelay: 0,
        spawned: false,
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleSpeed: 1 + Math.random() * 2,
        scale: 0.04 + Math.random() * 0.05,
        opacity: 0,
      };

      if (meshRef.current) {
        dummyObj.current.position.set(0, -500, 0);
        dummyObj.current.scale.setScalar(0.001);
        dummyObj.current.updateMatrix();
        meshRef.current.setMatrixAt(i, dummyObj.current.matrix);
      }
    }

    if (meshRef.current) {
      const geo = meshRef.current.geometry;
      geo.setAttribute('aOpacity', new THREE.InstancedBufferAttribute(opacities, 1));
      geo.setAttribute('aColor', new THREE.InstancedBufferAttribute(colors, 3));
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, []);

  // Detect new feed event
  useEffect(() => {
    if (!feedEvent) return;

    spawnTimeRef.current = performance.now() / 1000;
    activeRef.current = true;
    spawnPosRef.current = feedEvent.position || [0, WATER_LEVEL, 0];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = dataRef.current[i];
      p.spawned = false;
      p.alive = false;
      p.hitWater = false;
      p.opacity = 0;
      p.spawnDelay = Math.random() * 1.2;
      p.pos.set(0, -500, 0);
    }
  }, [feedEvent?.id]);

  const initializedRef = useRef(false);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;

    const geo = meshRef.current.geometry;

    // Hide all instances on first frame
    if (!initializedRef.current) {
      initializedRef.current = true;

      const opacities = new Float32Array(PARTICLE_COUNT);
      const colors = new Float32Array(PARTICLE_COUNT * 3);
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        opacities[i] = 0;
        const c = foodColors[Math.floor(Math.random() * foodColors.length)];
        colors[i * 3] = c[0];
        colors[i * 3 + 1] = c[1];
        colors[i * 3 + 2] = c[2];

        dummyObj.current.position.set(0, -500, 0);
        dummyObj.current.scale.setScalar(0.001);
        dummyObj.current.updateMatrix();
        meshRef.current.setMatrixAt(i, dummyObj.current.matrix);
      }
      geo.setAttribute('aOpacity', new THREE.InstancedBufferAttribute(opacities, 1));
      geo.setAttribute('aColor', new THREE.InstancedBufferAttribute(colors, 3));
      meshRef.current.instanceMatrix.needsUpdate = true;
    }

    if (!activeRef.current) return;

    const opacityAttr = geo.getAttribute('aOpacity');
    if (!opacityAttr) return;

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
        p.opacity = 1.0;
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
        dummyObj.current.position.set(0, -500, 0);
        dummyObj.current.scale.setScalar(0.001);
        dummyObj.current.updateMatrix();
        meshRef.current.setMatrixAt(i, dummyObj.current.matrix);
        opacityAttr.array[i] = 0;
        continue;
      }

      anyAlive = true;

      // Air phase — gravity
      if (!p.hitWater && p.pos.y > WATER_LEVEL) {
        p.vel.y -= 0.015;
        p.pos.x += Math.sin(time * 3 + p.wobblePhase) * 0.003;
        p.pos.z += Math.cos(time * 2 + p.wobblePhase) * 0.003;
      }

      // Hit water — sudden drag
      if (!p.hitWater && p.pos.y <= WATER_LEVEL) {
        p.hitWater = true;
        p.vel.y *= 0.1;
        p.vel.x += (Math.random() - 0.5) * 0.01;
        p.vel.z += (Math.random() - 0.5) * 0.01;
      }

      // Underwater — steady sink
      if (p.hitWater) {
        p.vel.x *= 0.99;
        p.vel.z *= 0.99;
        p.vel.y = -0.04 - Math.sin(time * p.wobbleSpeed + p.wobblePhase) * 0.005;
        p.pos.x += Math.sin(time * p.wobbleSpeed + p.wobblePhase) * 0.007;
        p.pos.z += Math.cos(time * p.wobbleSpeed * 0.7 + p.wobblePhase) * 0.007;
      }

      p.pos.add(p.vel);

      // Fade out as particle approaches kill depth
      const depthBelowWater = WATER_LEVEL - p.pos.y;
      if (p.hitWater && depthBelowWater > (KILL_DEPTH - FADE_DEPTH)) {
        // Fade from 1 → 0 over the last FADE_DEPTH units
        p.opacity = Math.max(0, 1.0 - (depthBelowWater - (KILL_DEPTH - FADE_DEPTH)) / FADE_DEPTH);
      }

      // Kill after fully faded
      if (p.hitWater && depthBelowWater > KILL_DEPTH) {
        p.alive = false;
        p.opacity = 0;
      }

      // Set instance transform — scale shrinks slightly as it fades for extra softness
      dummyObj.current.position.copy(p.pos);
      dummyObj.current.rotation.set(
        time * p.wobbleSpeed * 0.5 + p.wobblePhase,
        0,
        time * p.wobbleSpeed * 0.3
      );
      const fadeScale = 0.5 + p.opacity * 0.5; // shrinks to 50% size as it fades
      dummyObj.current.scale.setScalar(p.scale * fadeScale);
      dummyObj.current.updateMatrix();
      meshRef.current.setMatrixAt(i, dummyObj.current.matrix);
      opacityAttr.array[i] = p.opacity;
    }

    opacityAttr.needsUpdate = true;
    meshRef.current.instanceMatrix.needsUpdate = true;

    if (!anyAlive && elapsed > 2) {
      activeRef.current = false;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, PARTICLE_COUNT]} frustumCulled={false} material={material}>
      <sphereGeometry args={[1, 6, 4]} />
    </instancedMesh>
  );
};

export default FoodParticles;
