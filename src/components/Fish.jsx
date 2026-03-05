import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { FISH_SPECIES } from '../models/fishModel.js';
import { WATER_LEVEL } from '../constants/tankDimensions';

const Fish = ({ boid, onFishClick, petEvent }) => {
  const groupRef = useRef();
  const [isHovered, setIsHovered] = useState(false);

  // Generate stable random phase offset for this fish (based on id hash)
  const phaseOffset = useMemo(() => {
    if (boid.randoms?.phaseOffset !== undefined) {
      return boid.randoms.phaseOffset;
    }
    // Fallback: generate from fish id
    let hash = 0;
    const id = boid.id || boid.name || 'fish';
    for (let i = 0; i < id.length; i++) {
      hash = ((hash << 5) - hash) + id.charCodeAt(i);
      hash |= 0;
    }
    return (Math.abs(hash) % 1000) / 1000 * Math.PI * 2;
  }, [boid.id, boid.name, boid.randoms?.phaseOffset]);

  // Individual wiggle intensity
  const wiggleAmount = useMemo(() => {
    return boid.randoms?.wiggleAmount || (0.8 + (Math.abs(phaseOffset) % 0.4));
  }, [boid.randoms?.wiggleAmount, phaseOffset]);

  // Get the model path based on fish species
  const getModelPath = (species) => {
    const speciesObj = Object.values(FISH_SPECIES).find(s => s.name === species);
    return speciesObj?.modelPath || '/fish.glb';
  };

  const modelPath = getModelPath(boid.species);
  const { scene } = useGLTF(modelPath);

  // Clone the scene to avoid sharing between instances
  const fishModel = useMemo(() => {
    if (!scene) return null;
    const cloned = scene.clone();
    
    // Set initial model orientation (standard GLTF models usually face -Z or +X)
    // Most fish models in this project seem to need -PI/2 to face forward
    cloned.rotation.y = -Math.PI / 2;

    // Scale the model
    const modelSize = 0.8;
    cloned.scale.setScalar(modelSize);
    
    return cloned;
  }, [scene]);

  // CUSTOM SHADER for realistic S-curve swimming
  // We apply this to the GLTF materials
  const patchMaterial = (material, color, fishPhaseOffset, fishWiggleAmount) => {
    const fishColor = new THREE.Color(color);

    material.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 };
      shader.uniforms.uSwimSpeed = { value: 5.0 };
      shader.uniforms.uWiggleAmplitude = { value: 0.25 };
      shader.uniforms.uPhaseOffset = { value: fishPhaseOffset };

      // Inject vertex shader logic for body bending
      shader.vertexShader = `
        uniform float uTime;
        uniform float uSwimSpeed;
        uniform float uWiggleAmplitude;
        uniform float uPhaseOffset;
      ` + shader.vertexShader;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>

        // Determine the body coordinate from head to tail
        // Assuming the model's local Z axis is its length
        // For these models, Z is longitudinal after our group rotation

        float bodyCoord = position.z;

        // Head is at positive Z, Tail at negative Z
        // Factor: 0 at head (stable), 1 at tail (max wiggle)
        float tailFactor = smoothstep(0.2, -0.5, bodyCoord);

        // S-curve wave propagation with individual phase offset
        // Each fish wiggles at a different phase, preventing synchronized movement
        float wave = sin(bodyCoord * 4.0 + (uTime + uPhaseOffset) * uSwimSpeed);
        float wiggle = wave * uWiggleAmplitude * tailFactor;

        // Apply horizontal bend
        transformed.x += wiggle;

        // Add a secondary vertical "tail flip" with phase offset
        transformed.y += cos(bodyCoord * 2.0 + (uTime + uPhaseOffset * 0.7) * uSwimSpeed * 0.8) * 0.05 * tailFactor;
        `
      );

      // Store a reference to uniforms to update them in useFrame
      material.userData.shader = shader;
    };

    // Set basic properties
    material.color.copy(fishColor).multiplyScalar(1.2);
    material.transparent = false;
    material.metalness = 0.3;
    material.roughness = 0.4;
  };

  useEffect(() => {
    if (fishModel && boid.color) {
      fishModel.traverse((child) => {
        if (child.isMesh && child.material) {
          child.castShadow = true;
          child.receiveShadow = true;

          if (Array.isArray(child.material)) {
            child.material = child.material.map(m => {
              const newMat = m.clone();
              patchMaterial(newMat, boid.color, phaseOffset, wiggleAmount);
              return newMat;
            });
          } else {
            const newMat = child.material.clone();
            patchMaterial(newMat, boid.color, phaseOffset, wiggleAmount);
            child.material = newMat;
          }
        }
      });
    }
  }, [fishModel, boid.color, phaseOffset, wiggleAmount]);

  // Track pet wiggle state
  const isPettedRef = useRef(false);
  const petTimeRef = useRef(0);
  const lastPetEventId = useRef(null);

  // Track entrance animation
  const isEntering = useRef(!!boid.spawnTime);
  const entranceStartTime = useRef(0);

  useFrame((state, delta) => {
    if (!groupRef.current || !boid || !boid.position || !boid.ref) return;

    const time = state.clock.elapsedTime;

    // ENTRANCE ANIMATION - fish visibly falls from above water into the tank
    if (isEntering.current) {
      if (entranceStartTime.current === 0) {
        entranceStartTime.current = time;
        groupRef.current.position.set(
          boid.position.x + (Math.random() - 0.5) * 4,
          WATER_LEVEL + 25,
          boid.position.z
        );
      }

      const elapsed = time - entranceStartTime.current;
      const baseScale = boid.size || 1.0;
      const dropHeight = WATER_LEVEL + 25;

      if (elapsed < 6.0) {

        if (elapsed < 2.0) {
          // Phase 1: Visible freefall through air — slow enough to watch
          const gravity = 12.5; // 25 units in 2 seconds
          const fallY = dropHeight - 0.5 * gravity * elapsed * elapsed;
          groupRef.current.position.y = Math.max(fallY, WATER_LEVEL + 0.1);
          groupRef.current.position.z = boid.position.z;

          // Fish flips/tumbles gently as it falls
          groupRef.current.rotation.x = elapsed * 3;
          groupRef.current.rotation.z = Math.sin(elapsed * 5) * 0.4;

          groupRef.current.scale.setScalar(baseScale);

        } else if (elapsed < 4.0) {
          // Phase 2: SPLASH — fish plunges deep into tank, then slowly rises
          const waterTime = elapsed - 2.0; // 0 to 2.0

          // Plunge deep: fast entry that decelerates with water drag
          // Max depth ~12 units below surface (halfway down the tank)
          const maxPlunge = 12;
          const plungeDepth = maxPlunge * (1 - Math.exp(-waterTime * 2.0));
          // After peak plunge (~1s), start floating back up slowly
          const riseAmount = waterTime > 0.8 ? (waterTime - 0.8) * 2.0 : 0;
          groupRef.current.position.y = WATER_LEVEL - plungeDepth + riseAmount;

          // Wobble from impact force
          const wobbleDecay = Math.exp(-waterTime * 1.2);
          groupRef.current.position.x += Math.sin(waterTime * 10) * 0.8 * wobbleDecay * delta;
          groupRef.current.position.z += Math.cos(waterTime * 8) * 0.5 * wobbleDecay * delta;

          // Tumble dampens in water
          const rotDecay = Math.exp(-waterTime * 1.5);
          groupRef.current.rotation.x = (2.0 * 3) * rotDecay + Math.sin(waterTime * 5) * 0.4 * rotDecay;
          groupRef.current.rotation.z = Math.sin(waterTime * 4) * 0.3 * rotDecay;

          // Scale pulse on water entry moment
          if (waterTime < 0.25) {
            const pulse = 1.0 + Math.sin(waterTime * Math.PI / 0.25) * 0.2;
            groupRef.current.scale.setScalar(baseScale * pulse);
          } else {
            groupRef.current.scale.setScalar(baseScale);
          }

        } else if (elapsed < 5.0) {
          // Phase 3: Fish recovers — orients and swims toward its boid position
          const settleTime = elapsed - 4.0;
          const t = settleTime; // 0 to 1

          groupRef.current.position.lerp(boid.position, t * 0.15);

          // Rotation eases back to normal
          groupRef.current.rotation.x *= (1 - t * 0.3);
          groupRef.current.rotation.z *= (1 - t * 0.3);

          // Gentle sway as fish finds its bearing
          groupRef.current.position.x += Math.sin(time * 3) * 0.08 * (1 - t);

          groupRef.current.scale.setScalar(baseScale);

        } else {
          // Phase 4: Smooth handoff to boid system
          const t = (elapsed - 5.0);
          groupRef.current.position.lerp(boid.position, t * 0.5);
          groupRef.current.rotation.x *= 0.8;
          groupRef.current.rotation.z *= 0.8;
          groupRef.current.quaternion.slerp(boid.ref.quaternion, t * 0.3);
          groupRef.current.scale.setScalar(baseScale);
        }

        return; // Skip normal movement during entrance
      } else {
        isEntering.current = false;
        groupRef.current.rotation.x = 0;
        groupRef.current.rotation.z = 0;
      }
    }

    // PET WIGGLE - check if this fish is being petted
    if (petEvent && petEvent.id !== lastPetEventId.current && petEvent.targetFishId === boid.id) {
      lastPetEventId.current = petEvent.id;
      isPettedRef.current = true;
      petTimeRef.current = time;
    }

    // 1. SMOOTH PHYSICAL MOVEMENT - interpolate for extra smoothness
    groupRef.current.position.lerp(boid.position, 0.3);

    // Smooth rotation - slerp toward target quaternion
    groupRef.current.quaternion.slerp(boid.ref.quaternion, 0.15);

    // Apply subtle banking roll from simulation
    if (boid.bankAngle) {
      const bankQuat = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 0, 1),
        boid.bankAngle * 0.5
      );
      groupRef.current.quaternion.multiply(bankQuat);
    }

    // Pet wiggle effect
    if (isPettedRef.current) {
      const petElapsed = time - petTimeRef.current;
      if (petElapsed < 2.5) {
        // Rapid Z-axis wiggle
        const wiggle = Math.sin(petElapsed * 15) * 0.3 * (1 - petElapsed / 2.5);
        const wiggleQuat = new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 0, 1),
          wiggle
        );
        groupRef.current.quaternion.multiply(wiggleQuat);
      } else {
        isPettedRef.current = false;
      }
    }

    // 2. INTERACTIVE SCALE (+ pet pulse)
    let targetScale = isHovered ? 1.2 : 1.0;
    if (isPettedRef.current) {
      const petElapsed = time - petTimeRef.current;
      targetScale *= 1.0 + Math.sin(petElapsed * 10) * 0.05;
    }
    const baseScale = boid.size || 1.0;
    const currentScale = groupRef.current.scale.x / baseScale;
    const newScale = baseScale * THREE.MathUtils.lerp(currentScale, targetScale, 0.15);
    groupRef.current.scale.setScalar(newScale);

    // 3. ANIMATION UNIFORMS
    const speed = boid.velocity ? boid.velocity.length() : 1.0;
    // Individual speed variation for swim animation
    const speedMult = boid.randoms?.speedMultiplier || 1.0;
    const swimSpeed = THREE.MathUtils.clamp(speed * 4.0 * speedMult, 2.0, 8.0);

    if (fishModel) {
      fishModel.traverse((child) => {
        if (child.isMesh && child.material) {
          const updateMat = (mat) => {
            if (mat.userData.shader) {
              mat.userData.shader.uniforms.uTime.value = state.clock.elapsedTime;
              mat.userData.shader.uniforms.uSwimSpeed.value = swimSpeed;
              // Make wiggle wider when moving faster, with individual variation
              mat.userData.shader.uniforms.uWiggleAmplitude.value = (0.1 + (speed * 0.05)) * wiggleAmount;
            }
          };

          if (Array.isArray(child.material)) {
            child.material.forEach(updateMat);
          } else {
            updateMat(child.material);
          }
        }
      });
    }
  });

  const handleClick = (e) => {
    e.stopPropagation();
    if (onFishClick) {
      onFishClick(boid);
    }
  };

  const handlePointerEnter = () => {
    setIsHovered(true);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerLeave = () => {
    setIsHovered(false);
    document.body.style.cursor = 'default';
  };

  if (!fishModel) return null;

  return (
    <group
      ref={groupRef}
      onClick={handleClick}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      <primitive object={fishModel} />
    </group>
  );
};

// Preload all fish models
Object.values(FISH_SPECIES).forEach(species => {
  useGLTF.preload(species.modelPath);
});

export default Fish;