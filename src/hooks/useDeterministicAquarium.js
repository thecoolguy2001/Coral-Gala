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

const PERSONALITIES = [
  { name: 'timid', alignment: 0.2, cohesion: 0.2, wander: 0.7, dart: 0.1 },
  { name: 'bold', alignment: 0.4, cohesion: 0.3, wander: 0.4, dart: 0.3 },
  { name: 'wanderer', alignment: 0.1, cohesion: 0.1, wander: 0.9, dart: 0.2 },
  { name: 'social', alignment: 0.6, cohesion: 0.5, wander: 0.2, dart: 0.1 },
  { name: 'cruiser', alignment: 0.3, cohesion: 0.2, wander: 0.5, dart: 0.05 },
];

/**
 * Deterministic aquarium simulation - identical across all browsers
 */
const useDeterministicAquarium = (fishData) => {
  const startTime = useRef(Date.now());
  // Assign a random personality to each fish
  const boids = useMemo(() => {
    const rng = new SeededRandom(42);
    return fishData.map((fish, index) => {
      const basePosition = fish.position || [0, 0, 0];
      const position = new THREE.Vector3(
        basePosition[0] + rng.range(-0.5, 0.5),
        basePosition[1] + rng.range(-0.5, 0.5),
        basePosition[2] + rng.range(-0.5, 0.5)
      );
      const velocityScale = (fish.speed || 2.0) * 0.5;
      const velocity = new THREE.Vector3(
        rng.range(-velocityScale, velocityScale),
        rng.range(-velocityScale, velocityScale),
        rng.range(-velocityScale, velocityScale)
      );
      // Assign a personality
      const personality = PERSONALITIES[index % PERSONALITIES.length];
      return {
        ...fish,
        position,
        velocity,
        originalSpeed: fish.speed || 2.0,
        ref: new THREE.Object3D(),
        personality,
        idleTimer: 0,
        dartTimer: 0,
        isIdling: false,
        isDarting: false,
        waterResistance: 0.98,
        size: fish.size || 1.0,
      };
    });
  }, [fishData]);

  useFrame((state, delta) => {
    const currentTime = (Date.now() - startTime.current) / 1000;
    const bounds = new THREE.Vector3(12, 8, 12);
    const separationDistance = 2.0;
    const alignmentDistance = 3.0;
    const cohesionDistance = 3.0;
    const maxForce = 0.06;
    const waterResistance = 0.98;

    boids.forEach((boid, boidIndex) => {
      // Idle and darting logic
      if (boid.isIdling) {
        boid.idleTimer -= delta;
        if (boid.idleTimer <= 0) {
          boid.isIdling = false;
        } else {
          // Minimal movement while idling
          boid.velocity.multiplyScalar(0.95);
        }
      } else if (boid.isDarting) {
        boid.dartTimer -= delta;
        if (boid.dartTimer <= 0) {
          boid.isDarting = false;
        } else {
          // Dart in a random direction
          boid.velocity.add(new THREE.Vector3(
            (Math.random() - 0.5) * 0.5,
            (Math.random() - 0.5) * 0.5,
            (Math.random() - 0.5) * 0.5
          ));
        }
      } else {
        // Randomly decide to idle or dart
        if (Math.random() < 0.002 * delta * 60) {
          boid.isIdling = true;
          boid.idleTimer = 1 + Math.random() * 2;
        } else if (Math.random() < boid.personality.dart * 0.01 * delta * 60) {
          boid.isDarting = true;
          boid.dartTimer = 0.3 + Math.random() * 0.5;
        }
      }

      // Flocking forces (reduced alignment/cohesion, more independence)
      const separation = new THREE.Vector3();
      const alignment = new THREE.Vector3();
      const cohesion = new THREE.Vector3();
      let separationCount = 0;
      let alignmentCount = 0;
      let cohesionCount = 0;

      boids.forEach((other, otherIndex) => {
        if (boidIndex === otherIndex) return;
        const dist = boid.position.distanceTo(other.position);
        if (dist > 0 && dist < separationDistance) {
          const diff = new THREE.Vector3().subVectors(boid.position, other.position);
          diff.normalize();
          diff.divideScalar(dist);
          separation.add(diff);
          separationCount++;
        }
        if (dist > 0 && dist < alignmentDistance) {
          alignment.add(other.velocity);
          alignmentCount++;
        }
        if (dist > 0 && dist < cohesionDistance) {
          cohesion.add(other.position);
          cohesionCount++;
        }
      });

      // Apply flocking forces with personality scaling
      if (separationCount > 0) {
        separation.divideScalar(separationCount);
        separation.multiplyScalar(maxForce * 1.5);
      }
      if (alignmentCount > 0) {
        alignment.divideScalar(alignmentCount);
        alignment.sub(boid.velocity).clampLength(0, maxForce * boid.personality.alignment);
      }
      if (cohesionCount > 0) {
        cohesion.divideScalar(cohesionCount);
        cohesion.sub(boid.position);
        cohesion.sub(boid.velocity).clampLength(0, maxForce * boid.personality.cohesion);
      }

      // Add wandering (per-fish randomness)
      const wanderStrength = boid.personality.wander;
      const wanderForce = new THREE.Vector3(
        (Math.random() - 0.5) * wanderStrength,
        (Math.random() - 0.5) * wanderStrength * 0.7, // more vertical
        (Math.random() - 0.5) * wanderStrength
      );

      // Boundary force
      const boundaryForce = new THREE.Vector3();
      const margin = 1.0;
      if (boid.position.x > bounds.x - margin) boundaryForce.x = -maxForce * 2;
      else if (boid.position.x < -bounds.x + margin) boundaryForce.x = maxForce * 2;
      if (boid.position.y > bounds.y - margin) boundaryForce.y = -maxForce * 2;
      else if (boid.position.y < -bounds.y + margin) boundaryForce.y = maxForce * 2;
      if (boid.position.z > bounds.z - margin) boundaryForce.z = -maxForce * 2;
      else if (boid.position.z < -bounds.z + margin) boundaryForce.z = maxForce * 2;

      // Combine all forces
      boid.velocity.add(separation);
      boid.velocity.add(alignment);
      boid.velocity.add(cohesion);
      boid.velocity.add(wanderForce);
      boid.velocity.add(boundaryForce);

      // Water resistance
      boid.velocity.multiplyScalar(waterResistance);
      boid.velocity.multiplyScalar(boid.waterResistance);

      // Speed limits
      const maxSpeed = boid.originalSpeed * (0.7 + Math.random() * 0.6);
      boid.velocity.clampLength(0, maxSpeed);

      // Update position
      boid.position.add(boid.velocity.clone().multiplyScalar(delta));
      boid.position.x = Math.max(-bounds.x + 0.5, Math.min(bounds.x - 0.5, boid.position.x));
      boid.position.y = Math.max(-bounds.y + 0.5, Math.min(bounds.y - 0.5, boid.position.y));
      boid.position.z = Math.max(-bounds.z + 0.5, Math.min(bounds.z - 0.5, boid.position.z));

      // Update rotation
      boid.ref.position.copy(boid.position);
      if (boid.velocity.length() > 0.01) {
        boid.ref.lookAt(boid.position.clone().add(boid.velocity));
      }
    });
  });

  return { boids, isDeterministic: true };
};

export default useDeterministicAquarium; 