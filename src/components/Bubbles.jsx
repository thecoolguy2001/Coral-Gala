import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';

const Bubbles = () => {
  const bubblesRef = useRef();
  const bubbles = useMemo(() => {
    const bubbleCount = 50;
    const positions = new Float32Array(bubbleCount * 3);
    const sizes = new Float32Array(bubbleCount);
    
    for (let i = 0; i < bubbleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 30; // x
      positions[i * 3 + 1] = -15 + Math.random() * 5; // y (start from bottom)
      positions[i * 3 + 2] = (Math.random() - 0.5) * 30; // z
      
      sizes[i] = 0.02 + Math.random() * 0.08; // varying bubble sizes
    }
    
    return { positions, sizes };
  }, []);

  useFrame((state, delta) => {
    if (!bubblesRef.current) return;
    
    const positions = bubblesRef.current.geometry.attributes.position.array;
    const sizes = bubblesRef.current.geometry.attributes.size.array;
    
    for (let i = 0; i < positions.length; i += 3) {
      // Bubbles rise up
      positions[i + 1] += delta * 2;
      
      // Add slight horizontal drift
      positions[i] += Math.sin(state.clock.elapsedTime + i * 0.5) * delta * 0.5;
      positions[i + 2] += Math.cos(state.clock.elapsedTime + i * 0.3) * delta * 0.5;
      
      // Reset bubbles that reach the top
      if (positions[i + 1] > 15) {
        positions[i] = (Math.random() - 0.5) * 30;
        positions[i + 1] = -15 + Math.random() * 5;
        positions[i + 2] = (Math.random() - 0.5) * 30;
        sizes[i / 3] = 0.02 + Math.random() * 0.08;
      }
    }
    
    bubblesRef.current.geometry.attributes.position.needsUpdate = true;
    bubblesRef.current.geometry.attributes.size.needsUpdate = true;
  });

  return (
    <points ref={bubblesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={bubbles.positions.length / 3}
          array={bubbles.positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={bubbles.sizes.length}
          array={bubbles.sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={1}
        color="#ffffff"
        transparent
        opacity={0.6}
        sizeAttenuation
        vertexColors={false}
      />
    </points>
  );
};

export default Bubbles; 