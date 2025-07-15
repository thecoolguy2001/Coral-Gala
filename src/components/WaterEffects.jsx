import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const WaterEffects = () => {
  const waterParticlesRef = useRef();
  const causticsRef = useRef();
  const lightRaysRef = useRef();
  
  // Water particles for realistic water effect
  const waterParticles = useMemo(() => {
    const particleCount = 300;
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const opacities = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 40; // x
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20; // y
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40; // z
      
      velocities[i * 3] = (Math.random() - 0.5) * 0.05; // vx
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.02; // vy
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.05; // vz
      
      opacities[i] = 0.1 + Math.random() * 0.2; // varying opacity
    }
    
    return { positions, velocities, opacities };
  }, []);

  // Caustics effect for underwater light patterns
  const caustics = useMemo(() => {
    const causticCount = 150;
    const positions = new Float32Array(causticCount * 3);
    const sizes = new Float32Array(causticCount);
    const opacities = new Float32Array(causticCount);
    
    for (let i = 0; i < causticCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 35; // x
      positions[i * 3 + 1] = (Math.random() - 0.5) * 15; // y
      positions[i * 3 + 2] = (Math.random() - 0.5) * 35; // z
      
      sizes[i] = 0.1 + Math.random() * 0.3; // varying sizes
      opacities[i] = 0.05 + Math.random() * 0.1; // subtle opacity
    }
    
    return { positions, sizes, opacities };
  }, []);

  // Light rays effect
  const lightRays = useMemo(() => {
    const rayCount = 20;
    const positions = new Float32Array(rayCount * 3);
    const lengths = new Float32Array(rayCount);
    const opacities = new Float32Array(rayCount);
    
    for (let i = 0; i < rayCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 30; // x
      positions[i * 3 + 1] = 8 + Math.random() * 4; // y (from top)
      positions[i * 3 + 2] = (Math.random() - 0.5) * 30; // z
      
      lengths[i] = 3 + Math.random() * 8; // varying ray lengths
      opacities[i] = 0.02 + Math.random() * 0.03; // very subtle
    }
    
    return { positions, lengths, opacities };
  }, []);

  useFrame((state, delta) => {
    // Update water particles
    if (waterParticlesRef.current) {
      const positions = waterParticlesRef.current.geometry.attributes.position.array;
      const velocities = waterParticles.velocities;
      
      for (let i = 0; i < positions.length; i += 3) {
        // Update positions based on velocities
        positions[i] += velocities[i] * delta * 15;
        positions[i + 1] += velocities[i + 1] * delta * 15;
        positions[i + 2] += velocities[i + 2] * delta * 15;
        
        // Add gentle wave motion
        positions[i + 1] += Math.sin(state.clock.elapsedTime + i * 0.1) * 0.005;
        
        // Add slight turbulence
        positions[i] += Math.sin(state.clock.elapsedTime * 0.5 + i * 0.2) * 0.002;
        positions[i + 2] += Math.cos(state.clock.elapsedTime * 0.3 + i * 0.15) * 0.002;
        
        // Wrap around boundaries
        if (positions[i] > 20) positions[i] = -20;
        if (positions[i] < -20) positions[i] = 20;
        if (positions[i + 1] > 10) positions[i + 1] = -10;
        if (positions[i + 1] < -10) positions[i + 1] = 10;
        if (positions[i + 2] > 20) positions[i + 2] = -20;
        if (positions[i + 2] < -20) positions[i + 2] = 20;
      }
      
      waterParticlesRef.current.geometry.attributes.position.needsUpdate = true;
    }

    // Update caustics
    if (causticsRef.current) {
      const positions = causticsRef.current.geometry.attributes.position.array;
      const opacities = causticsRef.current.geometry.attributes.opacity.array;
      
      for (let i = 0; i < positions.length; i += 3) {
        // Slow movement for caustics
        positions[i] += Math.sin(state.clock.elapsedTime * 0.2 + i * 0.1) * delta * 0.5;
        positions[i + 1] += Math.cos(state.clock.elapsedTime * 0.15 + i * 0.08) * delta * 0.3;
        positions[i + 2] += Math.sin(state.clock.elapsedTime * 0.25 + i * 0.12) * delta * 0.5;
        
        // Subtle opacity animation
        opacities[i / 3] = caustics.opacities[i / 3] * (0.8 + Math.sin(state.clock.elapsedTime + i * 0.5) * 0.2);
        
        // Wrap around boundaries
        if (positions[i] > 17.5) positions[i] = -17.5;
        if (positions[i] < -17.5) positions[i] = 17.5;
        if (positions[i + 1] > 7.5) positions[i + 1] = -7.5;
        if (positions[i + 1] < -7.5) positions[i + 1] = 7.5;
        if (positions[i + 2] > 17.5) positions[i + 2] = -17.5;
        if (positions[i + 2] < -17.5) positions[i + 2] = 17.5;
      }
      
      causticsRef.current.geometry.attributes.position.needsUpdate = true;
      causticsRef.current.geometry.attributes.opacity.needsUpdate = true;
    }

    // Update light rays
    if (lightRaysRef.current) {
      const positions = lightRaysRef.current.geometry.attributes.position.array;
      const opacities = lightRaysRef.current.geometry.attributes.opacity.array;
      
      for (let i = 0; i < positions.length; i += 3) {
        // Rays slowly move down
        positions[i + 1] -= delta * 0.5;
        
        // Subtle horizontal drift
        positions[i] += Math.sin(state.clock.elapsedTime * 0.1 + i * 0.3) * delta * 0.2;
        positions[i + 2] += Math.cos(state.clock.elapsedTime * 0.08 + i * 0.25) * delta * 0.2;
        
        // Fade opacity as rays move down
        const progress = (positions[i + 1] + 10) / 20; // 0 to 1
        opacities[i / 3] = lightRays.opacities[i / 3] * Math.max(0, progress);
        
        // Reset rays that reach the bottom
        if (positions[i + 1] < -10) {
          positions[i] = (Math.random() - 0.5) * 30;
          positions[i + 1] = 8 + Math.random() * 4;
          positions[i + 2] = (Math.random() - 0.5) * 30;
          opacities[i / 3] = lightRays.opacities[i / 3];
        }
      }
      
      lightRaysRef.current.geometry.attributes.position.needsUpdate = true;
      lightRaysRef.current.geometry.attributes.opacity.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* Water particles */}
      <points ref={waterParticlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={waterParticles.positions.length / 3}
            array={waterParticles.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-opacity"
            count={waterParticles.opacities.length}
            array={waterParticles.opacities}
            itemSize={1}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.03}
          color="#4fc3f7"
          transparent
          opacity={1}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Caustics effect */}
      <points ref={causticsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={caustics.positions.length / 3}
            array={caustics.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            count={caustics.sizes.length}
            array={caustics.sizes}
            itemSize={1}
          />
          <bufferAttribute
            attach="attributes-opacity"
            count={caustics.opacities.length}
            array={caustics.opacities}
            itemSize={1}
          />
        </bufferGeometry>
        <pointsMaterial
          size={1}
          color="#ffffff"
          transparent
          opacity={1}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Light rays */}
      <points ref={lightRaysRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={lightRays.positions.length / 3}
            array={lightRays.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            count={lightRays.lengths.length}
            array={lightRays.lengths}
            itemSize={1}
          />
          <bufferAttribute
            attach="attributes-opacity"
            count={lightRays.opacities.length}
            array={lightRays.opacities}
            itemSize={1}
          />
        </bufferGeometry>
        <pointsMaterial
          size={1}
          color="#ffffff"
          transparent
          opacity={1}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
};

export default WaterEffects; 