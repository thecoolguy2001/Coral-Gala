import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

const Fish = ({ boid }) => {
  const mesh = useRef();

  useFrame(() => {
    if (!mesh.current || !boid) return;

    // Apply the position and rotation calculated by the simulation
    mesh.current.position.copy(boid.position);
    mesh.current.quaternion.copy(boid.ref.quaternion);
  });

  return (
    <mesh ref={mesh}>
      <coneGeometry args={[0.3, 1, 8]} rotation-x={Math.PI / 2} />
      <meshStandardMaterial color={'#ffdd88'} />
    </mesh>
  );
};

export default Fish; 