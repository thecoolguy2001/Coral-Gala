import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * CameraController - Smoothly animates camera between inside and outside views
 * Inside: Immersed in the water, swimming with fish
 * Outside: Looking at the tank from the front (Fish Center Live style)
 */
const CameraController = ({ isOutsideView }) => {
  const { camera } = useThree();
  const targetPosition = useRef(new THREE.Vector3());
  const targetLookAt = useRef(new THREE.Vector3());

  // Define camera positions for each view
  const insidePosition = new THREE.Vector3(0, 0, 25);
  const insideLookAt = new THREE.Vector3(0, 0, 0);

  // Outside view: Front-facing, centered on tank (Fish Center Live perspective)
  const outsidePosition = new THREE.Vector3(0, 0, 55);
  const outsideLookAt = new THREE.Vector3(0, 0, 0);

  useEffect(() => {
    // Update target based on view mode
    if (isOutsideView) {
      targetPosition.current.copy(outsidePosition);
      targetLookAt.current.copy(outsideLookAt);
    } else {
      targetPosition.current.copy(insidePosition);
      targetLookAt.current.copy(insideLookAt);
    }
  }, [isOutsideView]);

  useFrame(() => {
    // Smooth camera position transition using lerp
    camera.position.lerp(targetPosition.current, 0.05);

    // Smooth look-at transition
    const currentLookAt = new THREE.Vector3(0, 0, -1)
      .applyQuaternion(camera.quaternion)
      .add(camera.position);

    currentLookAt.lerp(targetLookAt.current, 0.05);
    camera.lookAt(currentLookAt);

    camera.updateProjectionMatrix();
  });

  return null;
};

export default CameraController;
