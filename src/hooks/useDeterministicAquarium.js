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
        // Add water resistance factor
        waterResistance: 0.98, // Fish lose momentum in water
        size: fish.size || 1.0,
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
    
    // Enhanced aquarium bounds - keep fish within visible area
    const bounds = new THREE.Vector3(12, 8, 12); // Smaller bounds for better visibility
    
    // Flocking simulation parameters
    const separationDistance = 2.5;
    const alignmentDistance = 4.0;
    const cohesionDistance = 4.0;
    const maxForce = 0.08;
    const waterResistance = 0.98; // Global water resistance

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

        // Separation - stronger for closer fish
        if (dist > 0 && dist < separationDistance) {
          const diff = new THREE.Vector3().subVectors(boid.position, other.position);
          diff.normalize();
          diff.divideScalar(dist);
          separation.add(diff);
          separationCount++;
        }

        // Alignment - fish try to swim in same direction
        if (dist > 0 && dist < alignmentDistance) {
          alignment.add(other.velocity);
          alignmentCount++;
        }

        // Cohesion - fish try to stay together
        if (dist > 0 && dist < cohesionDistance) {
          cohesion.add(other.position);
          cohesionCount++;
        }
      });

      // Apply flocking forces
      if (separationCount > 0) {
        separation.divideScalar(separationCount);
        separation.multiplyScalar(maxForce * 1.5); // Stronger separation
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
        Math.sin(currentTime * 0.5 + boidIndex * 2.1) * 0.03,
        Math.cos(currentTime * 0.3 + boidIndex * 1.7) * 0.03,
        Math.sin(currentTime * 0.7 + boidIndex * 2.3) * 0.03
      );
      wanderForce.multiplyScalar(boid.personalityFactor);

      // Enhanced boundary constraints - keep fish within screen bounds
      const boundaryForce = new THREE.Vector3();
      const margin = 1.0; // Keep fish away from edges
      
      // X-axis bounds
      if (boid.position.x > bounds.x - margin) {
        boundaryForce.x = -maxForce * 2;
      } else if (boid.position.x < -bounds.x + margin) {
        boundaryForce.x = maxForce * 2;
      }
      
      // Y-axis bounds
      if (boid.position.y > bounds.y - margin) {
        boundaryForce.y = -maxForce * 2;
      } else if (boid.position.y < -bounds.y + margin) {
        boundaryForce.y = maxForce * 2;
      }
      
      // Z-axis bounds
      if (boid.position.z > bounds.z - margin) {
        boundaryForce.z = -maxForce * 2;
      } else if (boid.position.z < -bounds.z + margin) {
        boundaryForce.z = maxForce * 2;
      }

      // Combine all forces
      boid.velocity.add(separation);
      boid.velocity.add(alignment);
      boid.velocity.add(cohesion);
      boid.velocity.add(wanderForce);
      boid.velocity.add(boundaryForce);

      // Apply water resistance (fish lose momentum in water)
      boid.velocity.multiplyScalar(waterResistance);
      boid.velocity.multiplyScalar(boid.waterResistance);

      // Apply speed limits based on fish characteristics
      const maxSpeed = boid.originalSpeed * boid.energyFactor;
      boid.velocity.clampLength(0, maxSpeed);

      // Update position
      boid.position.add(boid.velocity.clone().multiplyScalar(delta));

      // Ensure fish stay within bounds (hard constraint)
      boid.position.x = Math.max(-bounds.x + 0.5, Math.min(bounds.x - 0.5, boid.position.x));
      boid.position.y = Math.max(-bounds.y + 0.5, Math.min(bounds.y - 0.5, boid.position.y));
      boid.position.z = Math.max(-bounds.z + 0.5, Math.min(bounds.z - 0.5, boid.position.z));

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