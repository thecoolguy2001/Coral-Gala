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

  // Track entrance animation — random tumble values so each drop looks different
  const isEntering = useRef(!!boid.spawnTime);
  const entranceStartTime = useRef(0);
  const tumbleRandom = useRef(() => {
    // 6 distinct tumble types — every fish tumbles differently
    const tumbleType = Math.random();
    let xSpeed, ySpeed, zSpeed;

    if (tumbleType < 0.20) {
      // Gentle wobble — slow rotation on all axes
      xSpeed = 0.3 + Math.random() * 0.7;
      ySpeed = 0.2 + Math.random() * 0.5;
      zSpeed = 0.3 + Math.random() * 0.6;
    } else if (tumbleType < 0.40) {
      // Forward tumble — classic head-over-tail
      xSpeed = 2 + Math.random() * 4;
      ySpeed = Math.random() * 0.5;
      zSpeed = 0.5 + Math.random() * 1.5;
    } else if (tumbleType < 0.55) {
      // Side-over-side — primarily Y-axis rotation
      xSpeed = Math.random() * 1.0;
      ySpeed = 2 + Math.random() * 5;
      zSpeed = Math.random() * 1.0;
    } else if (tumbleType < 0.70) {
      // Cartwheel — primarily Z-axis rotation
      xSpeed = Math.random() * 0.8;
      ySpeed = Math.random() * 0.8;
      zSpeed = 2.5 + Math.random() * 4;
    } else if (tumbleType < 0.85) {
      // Corkscrew — X + Y combined
      xSpeed = 1.5 + Math.random() * 3;
      ySpeed = 1.5 + Math.random() * 3;
      zSpeed = Math.random() * 1.0;
    } else {
      // Chaotic — all 3 axes at high speed
      xSpeed = 1 + Math.random() * 5;
      ySpeed = 1 + Math.random() * 4;
      zSpeed = 1 + Math.random() * 4;
    }

    return {
      xSpeed,
      ySpeed,
      zSpeed,
      xDir: Math.random() > 0.5 ? 1 : -1,
      yDir: Math.random() > 0.5 ? 1 : -1,
      zDir: Math.random() > 0.5 ? 1 : -1,
      wobbleFreq: 4 + Math.random() * 10,
      wobbleAmp: 0.3 + Math.random() * 0.9,
      plungeDepth: 8 + Math.random() * 8,
      startAngleX: Math.random() * Math.PI * 2,
      startAngleY: Math.random() * Math.PI * 2,
      startAngleZ: Math.random() * Math.PI * 2,
    };
  });

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

        // Lazily generate tumble values on first use
        if (typeof tumbleRandom.current === 'function') {
          tumbleRandom.current = tumbleRandom.current();
        }
        const tr = tumbleRandom.current;

        if (elapsed < 2.0) {
          // Phase 1: Visible freefall through air
          const gravity = 12.5;
          const fallY = dropHeight - 0.5 * gravity * elapsed * elapsed;
          groupRef.current.position.y = Math.max(fallY, WATER_LEVEL + 0.1);
          groupRef.current.position.z = boid.position.z;

          // Fish tumbles uniquely across all three axes
          groupRef.current.rotation.x = tr.startAngleX + elapsed * tr.xSpeed * tr.xDir;
          groupRef.current.rotation.y = tr.startAngleY + elapsed * tr.ySpeed * tr.yDir;
          groupRef.current.rotation.z = tr.startAngleZ + elapsed * tr.zSpeed * tr.zDir;

          groupRef.current.scale.setScalar(baseScale);

        } else if (elapsed < 4.0) {
          // Phase 2: SPLASH — fish plunges deep into tank, then slowly rises
          const waterTime = elapsed - 2.0; // 0 to 2.0

          // Plunge depth varies per fish
          const plungeDepth = tr.plungeDepth * (1 - Math.exp(-waterTime * 2.0));
          const riseAmount = waterTime > 0.8 ? (waterTime - 0.8) * 2.0 : 0;
          groupRef.current.position.y = WATER_LEVEL - plungeDepth + riseAmount;

          // Wobble from impact — unique per fish
          const wobbleDecay = Math.exp(-waterTime * 1.2);
          groupRef.current.position.x += Math.sin(waterTime * tr.wobbleFreq) * tr.wobbleAmp * wobbleDecay * delta;
          groupRef.current.position.z += Math.cos(waterTime * tr.wobbleFreq * 0.8) * tr.wobbleAmp * 0.6 * wobbleDecay * delta;

          // Tumble dampens in water — all axes decay exponentially
          const rotDecay = Math.exp(-waterTime * 1.5);
          groupRef.current.rotation.x = (2.0 * tr.xSpeed * tr.xDir) * rotDecay + Math.sin(waterTime * tr.zSpeed) * 0.4 * rotDecay;
          groupRef.current.rotation.y = (2.0 * tr.ySpeed * tr.yDir) * rotDecay;
          groupRef.current.rotation.z = Math.sin(waterTime * tr.xSpeed * 0.7) * 0.3 * tr.zDir * rotDecay;

          // Scale pulse on water entry moment
          if (waterTime < 0.25) {
            const pulse = 1.0 + Math.sin(waterTime * Math.PI / 0.25) * 0.2;
            groupRef.current.scale.setScalar(baseScale * pulse);
          } else {
            groupRef.current.scale.setScalar(baseScale);
          }

          // Write visual position back so SplashEffect can track us for bubble trail
          if (boid.position) {
            boid.position.copy(groupRef.current.position);
          }

        } else if (elapsed < 5.0) {
          // Phase 3: Fish recovers — orients and swims toward its boid position
          const settleTime = elapsed - 4.0;
          const t = settleTime; // 0 to 1

          groupRef.current.position.lerp(boid.position, t * 0.15);

          // Rotation eases back to normal on all axes
          groupRef.current.rotation.x *= (1 - t * 0.3);
          groupRef.current.rotation.y *= (1 - t * 0.3);
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
        groupRef.current.rotation.y = 0;
        groupRef.current.rotation.z = 0;
      }
    }

    // PET REACTION - check if this fish is being petted
    if (petEvent && petEvent.id !== lastPetEventId.current && petEvent.targetFishId === boid.id) {
      lastPetEventId.current = petEvent.id;
      isPettedRef.current = true;
      petTimeRef.current = time;
    }

    // 1. SMOOTH PHYSICAL MOVEMENT
    if (isPettedRef.current) {
      const petElapsed = time - petTimeRef.current;

      if (petElapsed < 3.0) {
        // DRAMATIC pet reaction — fish freaks out, darts around, wiggles hard
        const intensity = 1.0 - petElapsed / 3.0;

        // Erratic darting — fish jolts in random-feeling directions
        const dartX = Math.sin(petElapsed * 18) * 0.4 * intensity;
        const dartY = Math.cos(petElapsed * 14) * 0.25 * intensity;
        const dartZ = Math.sin(petElapsed * 11 + 2) * 0.3 * intensity;
        const dartOffset = new THREE.Vector3(dartX, dartY, dartZ);

        groupRef.current.position.lerp(boid.position.clone().add(dartOffset), 0.4);

        // Wild body wiggle — rapid rotation on all axes
        const wiggleZ = Math.sin(petElapsed * 20) * 0.5 * intensity;
        const wiggleX = Math.cos(petElapsed * 16) * 0.2 * intensity;
        const wiggleY = Math.sin(petElapsed * 12) * 0.3 * intensity;

        groupRef.current.quaternion.slerp(boid.ref.quaternion, 0.1);
        const wiggleQuat = new THREE.Quaternion()
          .setFromEuler(new THREE.Euler(wiggleX, wiggleY, wiggleZ));
        groupRef.current.quaternion.multiply(wiggleQuat);

      } else {
        isPettedRef.current = false;
      }
    } else {
      // Normal smooth movement
      groupRef.current.position.lerp(boid.position, 0.3);

      // Smooth rotation
      groupRef.current.quaternion.slerp(boid.ref.quaternion, 0.15);

      // Banking roll
      if (boid.bankAngle) {
        const bankQuat = new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 0, 1),
          boid.bankAngle * 0.5
        );
        groupRef.current.quaternion.multiply(bankQuat);
      }
    }

    // 2. INTERACTIVE SCALE (+ pet reaction)
    let targetScale = isHovered ? 1.2 : 1.0;
    if (isPettedRef.current) {
      const petElapsed = time - petTimeRef.current;
      const intensity = 1.0 - petElapsed / 3.0;
      // Fish puffs up and pulses when petted
      targetScale *= 1.1 + Math.sin(petElapsed * 12) * 0.15 * intensity;
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