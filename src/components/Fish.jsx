import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { FISH_SPECIES } from '../models/fishModel.js';
import ProceduralFish from './ProceduralFish';

const Fish = ({ boid, onFishClick }) => {
  const groupRef = useRef();
  const [isHovered, setIsHovered] = useState(false);

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

  return (
    <group
      ref={groupRef}
      onClick={handleClick}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      <ProceduralFish 
        color={boid.color} 
        size={boid.size} 
        speed={boid.velocity ? boid.velocity.length() : 1.0} 
        species={boid.species}
      />
    </group>
  );
};


export default Fish; 