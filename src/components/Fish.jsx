import React, { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { FISH_SPECIES } from '../models/fishModel.js';

const Fish = ({ boid, onFishClick }) => {
  const groupRef = useRef();
  const [isHovered, setIsHovered] = useState(false);
  const [swimPhase, setSwimPhase] = useState(0);

  // Get the model path based on fish species
  const getModelPath = (species) => {
    const speciesObj = Object.values(FISH_SPECIES).find(s => s.name === species);
    return speciesObj?.modelPath || '/fish.glb'; // fallback to default fish model
  };

  const modelPath = getModelPath(boid.species);
  const { scene } = useGLTF(modelPath);

  // Clone the scene to avoid sharing between instances
  const fishModel = useMemo(() => scene.clone(), [scene]);

  useFrame((state, delta) => {
    if (!groupRef.current || !boid || !boid.position || !boid.ref) return;

    // Apply the position and rotation calculated by the simulation
    groupRef.current.position.copy(boid.position);
    groupRef.current.quaternion.copy(boid.ref.quaternion);

    // Apply banking roll
    if (boid.bankAngle) {
      groupRef.current.rotateOnAxis(new THREE.Vector3(0, 1, 0), boid.bankAngle * 0.02);
    }

    // Add hover effect
    const targetScale = isHovered ? 1.2 : 1.0;
    const baseScale = boid.size || 1.0;
    groupRef.current.scale.setScalar(baseScale * THREE.MathUtils.lerp(groupRef.current.scale.x / baseScale, targetScale, 0.15));

    // Swimming animation speed based on velocity
    const swimSpeed = THREE.MathUtils.clamp(boid.velocity.length() * 2.2, 0.5, 4.0);
    setSwimPhase((prev) => prev + swimSpeed * delta);

    // Add subtle swimming animation to the model
    if (fishModel) {
      const swimWobble = Math.sin(swimPhase * 2) * 0.05;
      fishModel.rotation.y = swimWobble;
      fishModel.rotation.z = Math.sin(swimPhase * 1.5) * 0.03;
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
  React.useEffect(() => {
    if (fishModel && boid.color) {
      const fishColor = new THREE.Color(boid.color);
      fishModel.traverse((child) => {
        if (child.isMesh && child.material) {
          if (child.material.color) {
            child.material.color.copy(fishColor);
          }
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => {
              if (mat.color) {
                mat.color.copy(fishColor);
              }
            });
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
      <primitive object={fishModel} />
    </group>
  );
};

// Preload all fish models
Object.values(FISH_SPECIES).forEach(species => {
  useGLTF.preload(species.modelPath);
});

export default Fish; 