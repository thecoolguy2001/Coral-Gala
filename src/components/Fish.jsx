import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { FISH_SPECIES } from '../models/fishModel.js';

const Fish = ({ boid, onFishClick }) => {
  const groupRef = useRef();
  const [isHovered, setIsHovered] = useState(false);

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
  const patchMaterial = (material, color) => {
    const fishColor = new THREE.Color(color);
    
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 };
      shader.uniforms.uSwimSpeed = { value: 5.0 };
      shader.uniforms.uWiggleAmplitude = { value: 0.25 };
      
      // Inject vertex shader logic for body bending
      shader.vertexShader = `
        uniform float uTime;
        uniform float uSwimSpeed;
        uniform float uWiggleAmplitude;
      ` + shader.vertexShader;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        
        // Determine the body coordinate from head to tail
        // Assuming the model's local Z axis is its length
        // We need to find the bounding box or assume standard orientation
        // For these models, Z is longitudinal after our group rotation
        
        float bodyCoord = position.z; 
        
        // Head is at positive Z, Tail at negative Z
        // Factor: 0 at head (stable), 1 at tail (max wiggle)
        float tailFactor = smoothstep(0.2, -0.5, bodyCoord);
        
        // S-curve wave propagation
        float wave = sin(bodyCoord * 4.0 + uTime * uSwimSpeed);
        float wiggle = wave * uWiggleAmplitude * tailFactor;
        
        // Apply horizontal bend
        transformed.x += wiggle;
        
        // Add a secondary vertical "tail flip"
        transformed.y += cos(bodyCoord * 2.0 + uTime * uSwimSpeed * 0.8) * 0.05 * tailFactor;
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
              patchMaterial(newMat, boid.color);
              return newMat;
            });
          } else {
            const newMat = child.material.clone();
            patchMaterial(newMat, boid.color);
            child.material = newMat;
          }
        }
      });
    }
  }, [fishModel, boid.color]);

  useFrame((state, delta) => {
    if (!groupRef.current || !boid || !boid.position || !boid.ref) return;

    // 1. PHYSICAL MOVEMENT
    groupRef.current.position.copy(boid.position);
    groupRef.current.quaternion.copy(boid.ref.quaternion);

    // Apply banking roll from simulation
    if (boid.bankAngle) {
      groupRef.current.rotateOnAxis(new THREE.Vector3(0, 0, 1), boid.bankAngle);
    }

    // 2. INTERACTIVE SCALE
    const targetScale = isHovered ? 1.2 : 1.0;
    const baseScale = boid.size || 1.0;
    const currentScale = groupRef.current.scale.x / baseScale;
    const newScale = baseScale * THREE.MathUtils.lerp(currentScale, targetScale, 0.15);
    groupRef.current.scale.setScalar(newScale);

    // 3. ANIMATION UNIFORMS
    const speed = boid.velocity ? boid.velocity.length() : 1.0;
    const swimSpeed = THREE.MathUtils.clamp(speed * 4.0, 2.0, 8.0);
    
    if (fishModel) {
      fishModel.traverse((child) => {
        if (child.isMesh && child.material) {
          const updateMat = (mat) => {
            if (mat.userData.shader) {
              mat.userData.shader.uniforms.uTime.value = state.clock.elapsedTime;
              mat.userData.shader.uniforms.uSwimSpeed.value = swimSpeed;
              // Make wiggle wider when moving faster
              mat.userData.shader.uniforms.uWiggleAmplitude.value = 0.1 + (speed * 0.05);
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