import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const Fish = ({ boid, onFishClick }) => {
  const mesh = useRef();
  const tailRef = useRef();
  const finRef = useRef();
  const [isHovered, setIsHovered] = useState(false);
  const [swimPhase, setSwimPhase] = useState(0);

  useFrame((state, delta) => {
    if (!mesh.current || !boid || !boid.position || !boid.ref) return;

    // Apply the position and rotation calculated by the simulation
    mesh.current.position.copy(boid.position);
    mesh.current.quaternion.copy(boid.ref.quaternion);
    // Remove extra undulation to prevent spinning
    // mesh.current.rotation.z = Math.sin(swimPhase * 1.5) * 0.1;

    // Add hover effect
    mesh.current.scale.setScalar(isHovered ? 1.2 : 1.0);

    // Swimming animation
    const swimSpeed = boid.velocity.length() * 2;
    setSwimPhase(prev => prev + swimSpeed * delta);

    // Tail wagging animation
    if (tailRef.current) {
      tailRef.current.rotation.z = Math.sin(swimPhase * 3) * 0.3;
    }

    // Fin flapping animation
    if (finRef.current) {
      finRef.current.rotation.z = Math.sin(swimPhase * 2) * 0.2;
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

  // Get fish color from boid data
  const fishColor = boid.color || '#ffdd88';
  const fishSize = boid.size || 1.0;

  return (
    <group>
      {/* Main fish body */}
      <mesh 
        ref={mesh} 
        rotation={[0, 0, Math.PI / 2]}
        onClick={handleClick}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        scale={[fishSize, fishSize, fishSize]}
      >
        {/* Fish body */}
        <cylinderGeometry args={[0.2, 0.3, 1.2, 8]} />
        <meshStandardMaterial 
          color={fishColor} 
          transparent={true}
          opacity={isHovered ? 0.8 : 1.0}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>
      {/* Fish tail */}
      <mesh 
        ref={tailRef}
        position={[0, -0.6, 0]}
        rotation={[0, 0, Math.PI / 2]}
        scale={[fishSize, fishSize, fishSize]}
      >
        <coneGeometry args={[0.1, 0.4, 4]} />
        <meshStandardMaterial 
          color={fishColor} 
          transparent={true}
          opacity={0.8}
        />
      </mesh>
      {/* Fish fins */}
      <mesh 
        ref={finRef}
        position={[0, 0.2, 0]}
        rotation={[0, 0, Math.PI / 2]}
        scale={[fishSize, fishSize, fishSize]}
      >
        <coneGeometry args={[0.05, 0.2, 4]} />
        <meshStandardMaterial 
          color={fishColor} 
          transparent={true}
          opacity={0.7}
        />
      </mesh>
      {/* Fish eye */}
      <mesh 
        position={[0.15, 0.1, 0]}
        rotation={[0, 0, Math.PI / 2]}
        scale={[fishSize, fishSize, fishSize]}
      >
        <sphereGeometry args={[0.05, 8, 6]} />
        <meshStandardMaterial 
          color="#000000" 
          roughness={0.1}
        />
      </mesh>
      {/* Fish eye highlight */}
      <mesh 
        position={[0.18, 0.12, 0]}
        rotation={[0, 0, Math.PI / 2]}
        scale={[fishSize, fishSize, fishSize]}
      >
        <sphereGeometry args={[0.02, 8, 6]} />
        <meshStandardMaterial 
          color="#ffffff" 
          roughness={0.1}
        />
      </mesh>
    </group>
  );
};

export default Fish; 