import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Seeded random number generator for deterministic behavior
 */
class SeededRandom {
  constructor(seed = 12345) {
    this.seed = seed % 2147483647;
    if (this.seed <= 0) this.seed += 2147483646;
  }

  next() {
    return this.seed = this.seed * 16807 % 2147483647;
  }

  random() {
    return (this.next() - 1) / 2147483646;
  }

  range(min, max) {
    return min + this.random() * (max - min);
  }
}

/**
 * Deterministic aquarium simulation - identical across all browsers
 */
const useDeterministicAquarium = (fishData) => {
  const startTime = useRef(Date.now());
  
  // Create deterministic initial state
  const boids = useMemo(() => {
    console.log('🎲 Creating deterministic boids for fish:', fishData);
    
    // Use a fixed seed for deterministic behavior
    const rng = new SeededRandom(42); // Same seed = same behavior everywhere
    
    return fishData.map((fish, index) => {
      // Use fish position as starting point, with slight deterministic variation
      const basePosition = fish.position || [0, 0, 0];
      const position = new THREE.Vector3(
        basePosition[0] + rng.range(-0.5, 0.5),
        basePosition[1] + rng.range(-0.5, 0.5),
        basePosition[2] + rng.range(-0.5, 0.5)
      );

      // Deterministic initial velocities based on fish properties
      const velocityScale = (fish.speed || 2.0) * 0.5;
      const velocity = new THREE.Vector3(
        rng.range(-velocityScale, velocityScale),
        rng.range(-velocityScale, velocityScale),
        rng.range(-velocityScale, velocityScale)
      );

      const boid = {
        ...fish,
        position,
        velocity,
        originalSpeed: fish.speed || 2.0,
        ref: new THREE.Object3D(),
        // Add deterministic personality-based behavior
        personalityFactor: (fish.personality?.playfulness || 50) / 100,
        energyFactor: (fish.energy || 70) / 100,
      };

      console.log(`🐟 Created deterministic boid for ${fish.name}:`, {
        id: fish.id,
        position: position.toArray(),
        velocity: velocity.toArray(),
        personalityFactor: boid.personalityFactor,
      });

      return boid;
    });
  }, [fishData]);

  // Deterministic simulation loop
  useFrame((state, delta) => {
    // Use deterministic time progression
    const currentTime = (Date.now() - startTime.current) / 1000; // seconds since start
    
    // Flocking simulation parameters
    const separationDistance = 3.0;
    const alignmentDistance = 5.0;
    const cohesionDistance = 5.0;
    const maxForce = 0.05;
    const bounds = new THREE.Vector3(15, 10, 10);

    boids.forEach((boid, boidIndex) => {
      const separation = new THREE.Vector3();
      const alignment = new THREE.Vector3();
      const cohesion = new THREE.Vector3();
      let separationCount = 0;
      let alignmentCount = 0;
      let cohesionCount = 0;

      // Calculate flocking forces
      boids.forEach((other, otherIndex) => {
        if (boidIndex === otherIndex) return;
        
        const dist = boid.position.distanceTo(other.position);

        // Separation
        if (dist > 0 && dist < separationDistance) {
          const diff = new THREE.Vector3().subVectors(boid.position, other.position);
          diff.normalize();
          diff.divideScalar(dist);
          separation.add(diff);
          separationCount++;
        }

        // Alignment
        if (dist > 0 && dist < alignmentDistance) {
          alignment.add(other.velocity);
          alignmentCount++;
        }

        // Cohesion
        if (dist > 0 && dist < cohesionDistance) {
          cohesion.add(other.position);
          cohesionCount++;
        }
      });

      // Apply flocking forces
      if (separationCount > 0) {
        separation.divideScalar(separationCount);
      }
      if (alignmentCount > 0) {
        alignment.divideScalar(alignmentCount);
        alignment.sub(boid.velocity).clampLength(0, maxForce);
      }
      if (cohesionCount > 0) {
        cohesion.divideScalar(cohesionCount);
        cohesion.sub(boid.position);
        cohesion.sub(boid.velocity).clampLength(0, maxForce);
      }

      // Apply personality-based variations
      const personalityScale = 0.8 + (boid.personalityFactor * 0.4); // 0.8 to 1.2
      separation.multiplyScalar(personalityScale);
      
      // Add some deterministic wandering based on time and fish personality
      const wanderForce = new THREE.Vector3(
        Math.sin(currentTime * 0.5 + boidIndex * 2.1) * 0.02,
        Math.cos(currentTime * 0.3 + boidIndex * 1.7) * 0.02,
        Math.sin(currentTime * 0.7 + boidIndex * 2.3) * 0.02
      );
      wanderForce.multiplyScalar(boid.personalityFactor);

      // Combine all forces
      boid.velocity.add(separation);
      boid.velocity.add(alignment);
      boid.velocity.add(cohesion);
      boid.velocity.add(wanderForce);

      // Stay within bounds
      if (boid.position.length() > bounds.length()) {
        const steerToCenter = new THREE.Vector3().subVectors(new THREE.Vector3(0, 0, 0), boid.position);
        steerToCenter.clampLength(0, maxForce * 2);
        boid.velocity.add(steerToCenter);
      }

      // Apply speed limits based on fish characteristics
      const maxSpeed = boid.originalSpeed * boid.energyFactor;
      boid.velocity.clampLength(0, maxSpeed);

      // Update position
      boid.position.add(boid.velocity.clone().multiplyScalar(delta));

      // Update rotation for rendering
      boid.ref.position.copy(boid.position);
      if (boid.velocity.length() > 0.01) {
        boid.ref.lookAt(boid.position.clone().add(boid.velocity));
      }
    });
  });

  return { boids, isDeterministic: true };
};

export default useDeterministicAquarium; 