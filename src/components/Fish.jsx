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
    const swimSpeed = THREE.MathUtils.clamp(boid.velocity.length() * 3.0, 0.3, 1.2);
    setSwimPhase((prev) => prev + swimSpeed * delta);

    // Subtle, realistic fish swimming animation
    if (modelRef.current) {
      const time = swimPhase;
      const speed = boid.velocity.length(); // Use actual speed, no artificial minimum

      // Very subtle whole-body fish animation - minimal rocking
      const swimWave = Math.sin(time * 2.5) * 0.04 * speed;
      const tailWag = Math.sin(time * 3.0 + Math.PI * 0.5) * 0.08 * speed;

      // Apply very subtle swimming motion
      modelRef.current.rotation.z = swimWave;
      modelRef.current.rotation.y = tailWag * 0.3;

      // Minimal vertical bobbing
      const bobbing = Math.sin(time * 1.5) * 0.02;
      modelRef.current.position.y = bobbing;

      // Animate tail/fins only - keep body stable
      modelRef.current.traverse((child) => {
        if (child.isMesh) {
          // Animate back parts of fish more (likely tail)
          if (child.position && child.position.x < -0.5) {
            child.rotation.z = tailWag * 0.8;
          }

          // Find and animate by common fish part names
          const name = child.name ? child.name.toLowerCase() : '';
          if (name.includes('tail') || name.includes('fin') || name.includes('back')) {
            child.rotation.z = tailWag * 1.0;
            child.rotation.y = swimWave * 0.5;
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