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

    // Swimming animation speed based on velocity
    const swimSpeed = THREE.MathUtils.clamp(boid.velocity.length() * 2.2, 0.5, 4.0);
    setSwimPhase((prev) => prev + swimSpeed * delta);

    // Realistic fish swimming animation
    if (modelRef.current) {
      const time = swimPhase;
      const speed = Math.max(boid.velocity.length(), 0.5);
      
      // Simple but effective whole-body fish animation
      const swimWave = Math.sin(time * 5) * 0.15 * speed;
      const tailWag = Math.sin(time * 6 + Math.PI * 0.5) * 0.3 * speed;
      
      // Apply swimming motion to entire fish model
      modelRef.current.rotation.z = swimWave;
      modelRef.current.rotation.y = tailWag * 0.5;
      
      // Add subtle vertical bobbing
      const bobbing = Math.sin(time * 3) * 0.1;
      modelRef.current.position.y = bobbing;
      
      // Try to animate specific parts by mesh name or position
      modelRef.current.traverse((child) => {
        if (child.isMesh) {
          // Animate back parts of fish more (likely tail)
          if (child.position && child.position.x < -0.5) {
            child.rotation.z = tailWag;
          }
          
          // Find and animate by common fish part names
          const name = child.name ? child.name.toLowerCase() : '';
          if (name.includes('tail') || name.includes('fin') || name.includes('back')) {
            child.rotation.z = tailWag * 1.5;
            child.rotation.y = swimWave * 2;
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