import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { FISH_SPECIES } from '../models/fishModel.js';

const Fish = ({ boid, onFishClick }) => {
  const groupRef = useRef();
  const modelRef = useRef();
  const [isHovered, setIsHovered] = useState(false);
  const [swimPhase, setSwimPhase] = useState(0);

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
    
    // Set initial model orientation
    cloned.rotation.y = -Math.PI / 2;

    // Scale the model - reasonable size for visibility (was 3.0, too large)
    const modelSize = 0.8;
    cloned.scale.setScalar(modelSize);
    
    return cloned;
  }, [scene]);

  useFrame((state, delta) => {
    if (!groupRef.current || !boid || !boid.position || !boid.ref) return;

    // Apply the position and rotation calculated by the simulation
    groupRef.current.position.copy(boid.position);
    groupRef.current.quaternion.copy(boid.ref.quaternion);

    // Apply banking roll
    if (boid.bankAngle) {
      groupRef.current.rotateOnAxis(new THREE.Vector3(0, 0, 1), boid.bankAngle);
    }

    // Add hover effect
    const targetScale = isHovered ? 1.2 : 1.0;
    const baseScale = boid.size || 1.0;
    const currentScale = groupRef.current.scale.x / baseScale;
    const newScale = baseScale * THREE.MathUtils.lerp(currentScale, targetScale, 0.15);
    groupRef.current.scale.setScalar(newScale);

    // Gentle swimming animation speed based on actual velocity
    const speed = boid.velocity.length();
    // Animation speed scales with movement speed
    const swimSpeed = THREE.MathUtils.clamp(speed * 5.0, 2.0, 8.0);
    setSwimPhase((prev) => prev + swimSpeed * delta);

    if (modelRef.current) {
      const time = swimPhase;
      
      // 1. SWIMMING MOTION (Sine wave along body)
      // Wiggle amplitude scales with speed
      const amplitude = THREE.MathUtils.clamp(speed * 0.2, 0.05, 0.25);
      
      // Apply rotation to the whole group for "heading"
      // But apply the "wiggle" to the model inside the group
      
      // Main body wobble
      modelRef.current.rotation.y = Math.sin(time) * amplitude;
      
      // 2. BANKING (Tilting into turns)
      // Calculate turn rate (cross product of current vs desired dir roughly)
      // For now, use lateral velocity relative to forward
      // We can approximate banking by using the "side slip" of velocity or just Z rotation
      // A simple visual bank based on Y rotation delta would be good, but we don't have history here.
      // Let's use a subtle bank based on the "wiggle" to make it look like physics
      const bankAngle = Math.cos(time) * amplitude * 0.5; // Roll opposite to yaw
      modelRef.current.rotation.z = bankAngle;

      // 3. VERTICAL BOBBING (Breathing)
      modelRef.current.position.y = Math.sin(state.clock.elapsedTime * 1.5) * 0.05;

      // 4. PROGRESSIVE SPINE BENDING (Fake Bones)
      modelRef.current.traverse((child) => {
        if (child.isMesh) {
          // If the model has parts named 'Tail' or 'Fin', animate them extra
          // Otherwise, generic mesh animation
          
          // Animate back parts of fish more (likely tail) based on geometry position
          // This assumes the model is centered. 
          // If Z is length, animate based on Z.
          // Adjust rotation based on vertex position? No, expensive.
          // Just animate specific known parts if possible, or keep the simple body wag.
          
          const name = child.name.toLowerCase();
          if (name.includes('tail') || name.includes('fin') || name.includes('back')) {
             // Tail wags with a phase offset
             child.rotation.y = Math.sin(time - 1.5) * amplitude * 2.0;
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

  // Apply fish color to the model materials
  useEffect(() => {
    if (fishModel && boid.color) {
      const fishColor = new THREE.Color(boid.color);
      
      fishModel.traverse((child) => {
        if (child.isMesh && child.material) {
          // Enable shadows for realistic rendering
          child.castShadow = true;
          child.receiveShadow = true;

          // Clone the material to avoid affecting other instances
          const originalMaterial = child.material;

          if (Array.isArray(originalMaterial)) {
            child.material = originalMaterial.map(mat => {
              const newMat = mat.clone();
              if (newMat.color) {
                // Apply vibrant fish color for maximum visibility
                newMat.color.copy(fishColor);
                newMat.color.multiplyScalar(1.5); // Significantly brighten colors
              }

              // PROFESSIONAL FISH MATERIAL - Fully opaque for visibility
              newMat.transparent = false; // No transparency - fish are solid
              newMat.metalness = 0.25; // Enhanced metallic shimmer for scales
              newMat.roughness = 0.4; // Balanced for realistic wet appearance

              // Enhanced iridescence for fish scale shimmer
              if (newMat.iridescence !== undefined) {
                newMat.iridescence = 0.5;
                newMat.iridescenceIOR = 1.4;
              }

              // Increase vibrancy and light response
              newMat.envMapIntensity = 0.8;
              newMat.emissive = fishColor.clone().multiplyScalar(0.1); // Subtle glow
              newMat.emissiveIntensity = 0.15;

              return newMat;
            });
          } else {
            const newMat = originalMaterial.clone();
            if (newMat.color) {
              // Apply vibrant fish color for maximum visibility
              newMat.color.copy(fishColor);
              newMat.color.multiplyScalar(1.5); // Significantly brighten colors
            }

            // PROFESSIONAL FISH MATERIAL - Fully opaque for visibility
            newMat.transparent = false; // No transparency - fish are solid
            newMat.metalness = 0.25; // Enhanced metallic shimmer for scales
            newMat.roughness = 0.4; // Balanced for realistic wet appearance

            // Enhanced iridescence for fish scale shimmer
            if (newMat.iridescence !== undefined) {
              newMat.iridescence = 0.5;
              newMat.iridescenceIOR = 1.4;
            }

            // Increase vibrancy and light response
            newMat.envMapIntensity = 0.8;
            newMat.emissive = fishColor.clone().multiplyScalar(0.1); // Subtle glow
            newMat.emissiveIntensity = 0.15;

            child.material = newMat;
          }
        }
      });
    }
  }, [fishModel, boid.color]);

  if (!fishModel) return null;

  return (
    <group
      ref={groupRef}
      onClick={handleClick}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      castShadow
      receiveShadow
    >
      <primitive ref={modelRef} object={fishModel} />
    </group>
  );
};

// Preload all fish models
Object.values(FISH_SPECIES).forEach(species => {
  useGLTF.preload(species.modelPath);
});

export default Fish; 