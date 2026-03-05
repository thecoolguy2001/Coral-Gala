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

    // ENTRANCE ANIMATION - new fish drops from above
    if (isEntering.current) {
      if (entranceStartTime.current === 0) {
        entranceStartTime.current = time;
        // Start position above the frame
        groupRef.current.position.set(
          boid.position.x,
          WATER_LEVEL + 20,
          boid.position.z
        );
      }

      const elapsed = time - entranceStartTime.current;

      if (elapsed < 3.0) {
        const startY = WATER_LEVEL + 20;

        if (elapsed < 1.0) {
          // Phase 1: Freefall from above
          const gravity = 9.8;
          const fallY = startY - 0.5 * gravity * elapsed * elapsed;
          groupRef.current.position.y = Math.max(fallY, WATER_LEVEL - 2);
          groupRef.current.position.x = boid.position.x;
          groupRef.current.position.z = boid.position.z;
        } else if (elapsed < 2.0) {
          // Phase 2: Hit water, drag slows descent, wobble
          const waterPhase = elapsed - 1.0;
          const belowSurface = 2 + waterPhase * 3 * Math.exp(-waterPhase * 2);
          groupRef.current.position.y = WATER_LEVEL - belowSurface;
          groupRef.current.position.x = boid.position.x + Math.sin(elapsed * 8) * 0.3 * (1 - waterPhase);
          groupRef.current.position.z = boid.position.z + Math.cos(elapsed * 6) * 0.2 * (1 - waterPhase);
        } else {
          // Phase 3: Lerp to boid control
          const lerpFactor = (elapsed - 2.0) / 1.0;
          groupRef.current.position.lerp(boid.position, lerpFactor * 0.3);
        }

        // Scale pulse on water entry
        if (elapsed > 0.9 && elapsed < 1.3) {
          const splashPulse = 1.0 + Math.sin((elapsed - 0.9) * Math.PI / 0.4) * 0.15;
          const baseScale = boid.size || 1.0;
          groupRef.current.scale.setScalar(baseScale * splashPulse);
        }

        return; // Skip normal movement during entrance
      } else {
        isEntering.current = false;
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