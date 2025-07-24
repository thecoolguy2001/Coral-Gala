import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// Use a high-quality, tileable caustics texture
const CAUSTICS_URL = 'https://threejs.org/examples/textures/caustics/caustics.jpg';

const WaterEffects = () => {
  const meshRef = useRef();
  const { size, clock } = useThree();
  const textureRef = useRef();

  // Load the caustics texture
  React.useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load(CAUSTICS_URL, (texture) => {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.minFilter = THREE.LinearFilter;
      textureRef.current = texture;
      if (meshRef.current) {
        meshRef.current.material.map = texture;
        meshRef.current.material.needsUpdate = true;
      }
    });
  }, []);

  useFrame(() => {
    if (meshRef.current && textureRef.current) {
      // Animate the caustics texture offset for movement
      const t = clock.elapsedTime;
      textureRef.current.offset.x = (t * 0.07) % 1;
      textureRef.current.offset.y = (t * 0.11) % 1;
    }
  });

  // Fullscreen quad overlay
  return (
    <mesh
      ref={meshRef}
      position={[0, 0, 0]}
      scale={[size.width / size.height, 1, 1]}
      frustumCulled={false}
    >
      <planeGeometry args={[2, 2, 1, 1]} />
      <meshBasicMaterial
        map={textureRef.current || null}
        transparent
        opacity={0.32}
        color={0xffffff}
        depthWrite={false}
      />
    </mesh>
  );
};

export default WaterEffects; 