import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';

const WaterParticles = () => {
  const particlesRef = useRef();
  const particles = useMemo(() => {
    const particleCount = 200;
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 40; // x
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20; // y
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40; // z
      
      velocities[i * 3] = (Math.random() - 0.5) * 0.1; // vx
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.05; // vy
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.1; // vz
    }
    
    return { positions, velocities };
  }, []);

  useFrame((state, delta) => {
    if (!particlesRef.current) return;
    
    const positions = particlesRef.current.geometry.attributes.position.array;
    const velocities = particles.velocities;
    
    for (let i = 0; i < positions.length; i += 3) {
      // Update positions based on velocities
      positions[i] += velocities[i] * delta * 10;
      positions[i + 1] += velocities[i + 1] * delta * 10;
      positions[i + 2] += velocities[i + 2] * delta * 10;
      
      // Add gentle wave motion
      positions[i + 1] += Math.sin(state.clock.elapsedTime + i * 0.1) * 0.01;
      
      // Wrap around boundaries
      if (positions[i] > 20) positions[i] = -20;
      if (positions[i] < -20) positions[i] = 20;
      if (positions[i + 1] > 10) positions[i + 1] = -10;
      if (positions[i + 1] < -10) positions[i + 1] = 10;
      if (positions[i + 2] > 20) positions[i + 2] = -20;
      if (positions[i + 2] < -20) positions[i + 2] = 20;
    }
    
    particlesRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particles.positions.length / 3}
          array={particles.positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color="#4fc3f7"
        transparent
        opacity={0.3}
        sizeAttenuation
      />
    </points>
  );
};

export default WaterParticles; 