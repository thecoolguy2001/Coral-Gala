import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';

const Fish = ({ boid, onFishClick }) => {
  const mesh = useRef();
  const [isHovered, setIsHovered] = useState(false);

  useFrame(() => {
    if (!mesh.current || !boid || !boid.position || !boid.ref) return;

    // Apply the position and rotation calculated by the simulation
    mesh.current.position.copy(boid.position);
    mesh.current.quaternion.copy(boid.ref.quaternion);
    
    // Add hover effect
    mesh.current.scale.setScalar(isHovered ? 1.2 : 1.0);
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

  // Get fish color from boid data
  const fishColor = boid.color || '#ffdd88';

  return (
    <mesh 
      ref={mesh} 
      rotation={[0, 0, Math.PI / 2]}
      onClick={handleClick}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      <coneGeometry args={[0.3, 1, 8]} />
      <meshStandardMaterial 
        color={fishColor} 
        transparent={true}
        opacity={isHovered ? 0.8 : 1.0}
      />
    </mesh>
  );
};

export default Fish; 