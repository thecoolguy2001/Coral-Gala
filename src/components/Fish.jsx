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
    const cloned = scene.clone();
    
    // Set initial model orientation - most fish models face +X direction
    // We want them to face +Z (forward in our coordinate system)
    cloned.rotation.y = -Math.PI / 2;
    
    // Scale the model appropriately
    const modelSize = 0.5; // Adjust this based on your model size
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

    // Add subtle swimming animation to the model
    if (modelRef.current) {
      const swimWobble = Math.sin(swimPhase * 2) * 0.05;
      const tailWag = Math.sin(swimPhase * 3) * 0.1;
      
      // Apply subtle body movement
      modelRef.current.rotation.z = swimWobble;
      modelRef.current.rotation.x = tailWag * 0.5;
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
          // Clone the material to avoid affecting other instances
          const originalMaterial = child.material;
          
          if (Array.isArray(originalMaterial)) {
            child.material = originalMaterial.map(mat => {
              const newMat = mat.clone();
              if (newMat.color) {
                newMat.color.copy(fishColor);
              }
              // Make materials slightly transparent and glossy for underwater effect
              newMat.transparent = true;
              newMat.opacity = 0.9;
              newMat.metalness = 0.1;
              newMat.roughness = 0.3;
              return newMat;
            });
          } else {
            const newMat = originalMaterial.clone();
            if (newMat.color) {
              newMat.color.copy(fishColor);
            }
            // Make materials slightly transparent and glossy for underwater effect
            newMat.transparent = true;
            newMat.opacity = 0.9;
            newMat.metalness = 0.1;
            newMat.roughness = 0.3;
            child.material = newMat;
          }
        }
      });
    }
  }, [fishModel, boid.color]);

  return (
    <group
      ref={groupRef}
      onClick={handleClick}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
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