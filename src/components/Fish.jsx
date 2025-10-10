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
    
    // Scale the model - make fish bigger and more visible
    const modelSize = 3.0;
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
      const speed = boid.velocity.length();
      
      // Body undulation - wave motion from head to tail
      const bodyWave = Math.sin(time * 4) * 0.08 * (speed / 3.0);
      const tailWave = Math.sin(time * 4 + Math.PI * 0.8) * 0.25 * (speed / 3.0);
      
      // Tail fin powerful side-to-side motion
      const tailBeat = Math.sin(time * 6) * 0.4 * Math.min(speed / 2.0, 1.0);
      
      // Pectoral fin movement for steering
      const pectoralFin = Math.sin(time * 3 + Math.PI * 0.5) * 0.15;
      
      // Vertical undulation for realistic swimming
      const verticalUndulation = Math.sin(time * 2.5) * 0.03 * speed;
      
      // Apply body undulation
      modelRef.current.rotation.z = bodyWave;
      modelRef.current.rotation.y = tailBeat * 0.3;
      
      // Apply tail movement
      modelRef.current.rotation.x = tailWave + verticalUndulation;
      
      // Add subtle side-to-side body sway
      const bodySway = Math.sin(time * 1.8) * 0.02 * speed;
      modelRef.current.position.y = bodySway;
      
      // Animate individual parts if the model has them
      modelRef.current.traverse((child) => {
        if (child.name && child.name.toLowerCase().includes('tail')) {
          child.rotation.z = tailBeat;
          child.rotation.y = tailWave * 1.5;
        }
        if (child.name && child.name.toLowerCase().includes('fin')) {
          child.rotation.x = pectoralFin;
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
          // Clone the material to avoid affecting other instances
          const originalMaterial = child.material;
          
          if (Array.isArray(originalMaterial)) {
            child.material = originalMaterial.map(mat => {
              const newMat = mat.clone();
              if (newMat.color) {
                // Mix the original color with fish color for more realistic look
                newMat.color.copy(fishColor);
                newMat.color.multiplyScalar(1.2); // Brighten the colors
              }
              
              // Enhanced underwater fish materials
              newMat.transparent = true;
              newMat.opacity = 0.95;
              newMat.metalness = 0.15; // Slightly more metallic for fish scales
              newMat.roughness = 0.25; // Smoother for wet fish look
              
              // Add iridescence for fish scales effect
              if (newMat.iridescence !== undefined) {
                newMat.iridescence = 0.3;
                newMat.iridescenceIOR = 1.3;
              }
              
              // Make fish appear more vibrant underwater
              newMat.envMapIntensity = 0.5;
              
              return newMat;
            });
          } else {
            const newMat = originalMaterial.clone();
            if (newMat.color) {
              // Mix the original color with fish color for more realistic look
              newMat.color.copy(fishColor);
              newMat.color.multiplyScalar(1.2); // Brighten the colors
            }
            
            // Enhanced underwater fish materials
            newMat.transparent = true;
            newMat.opacity = 0.95;
            newMat.metalness = 0.15; // Slightly more metallic for fish scales
            newMat.roughness = 0.25; // Smoother for wet fish look
            
            // Add iridescence for fish scales effect
            if (newMat.iridescence !== undefined) {
              newMat.iridescence = 0.3;
              newMat.iridescenceIOR = 1.3;
            }
            
            // Make fish appear more vibrant underwater
            newMat.envMapIntensity = 0.5;
            
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