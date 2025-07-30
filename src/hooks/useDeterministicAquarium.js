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
      // Initialize lastLookDirection to forward
      const lastLookDirection = new THREE.Vector3(0, 0, 1);
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
        lastLookDirection,
      };
    });
  }, [fishData]);

  useFrame((state, delta) => {
    const currentTime = (Date.now() - startTime.current) / 1000;
    
    // Calculate bounds based on camera and viewport
    const camera = state.camera;
    const viewport = state.viewport;
    
    // Get the visible area at the fish swimming depth (z=0)
    const distance = camera.position.z; // Distance from camera to fish plane
    const vFOV = (camera.fov * Math.PI) / 180; // Convert vertical fov to radians
    const visibleHeight = 2 * Math.tan(vFOV / 2) * distance;
    const visibleWidth = visibleHeight * camera.aspect;
    
    // Use 80% of visible area to keep fish comfortably on screen
    const bounds = new THREE.Vector3(
      visibleWidth * 0.4,  // Half width * 0.8
      visibleHeight * 0.4, // Half height * 0.8
      25 // Depth doesn't change based on screen size
    );
    const separationDistance = 3.0;
    const alignmentDistance = 5.0;
    const cohesionDistance = 8.0;
    const maxForce = 0.08;
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

      // Add wandering (per-fish randomness) with more natural movement
      const wanderStrength = boid.personality.wander * 0.03;
      const wanderForce = new THREE.Vector3(
        Math.sin(currentTime * 0.5 + boidIndex) * wanderStrength,
        Math.sin(currentTime * 0.3 + boidIndex * 2) * wanderStrength * 0.5, // Less vertical randomness
        Math.cos(currentTime * 0.4 + boidIndex * 1.5) * wanderStrength
      );
      
      // Add depth preference based on fish personality
      const depthPreference = new THREE.Vector3();
      if (boid.personality.name === 'shy') {
        // Shy fish prefer to stay near the bottom or edges
        if (boid.position.y > -10) depthPreference.y = -0.02;
        if (Math.abs(boid.position.x) < 20) {
          depthPreference.x = boid.position.x > 0 ? 0.01 : -0.01;
        }
      } else if (boid.personality.name === 'bold') {
        // Bold fish explore all areas
        depthPreference.multiplyScalar(0);
      } else if (boid.personality.name === 'social') {
        // Social fish prefer middle areas where they can interact
        if (Math.abs(boid.position.y) > 5) {
          depthPreference.y = boid.position.y > 0 ? -0.01 : 0.01;
        }
      }
      
      // Add schooling behavior - fish of same species attract more
      const schoolingForce = new THREE.Vector3();
      let schoolCount = 0;
      boids.forEach((other, otherIndex) => {
        if (boidIndex === otherIndex || !other.species) return;
        if (boid.species === other.species) {
          const dist = boid.position.distanceTo(other.position);
          if (dist > 0 && dist < 10) {
            const attraction = new THREE.Vector3().subVectors(other.position, boid.position);
            attraction.normalize();
            attraction.multiplyScalar(0.005 / dist);
            schoolingForce.add(attraction);
            schoolCount++;
          }
        }
      });
      if (schoolCount > 0) {
        schoolingForce.divideScalar(schoolCount);
      }

      // Gentle boundary force - fish naturally avoid edges
      const boundaryForce = new THREE.Vector3();
      const margin = 3.0; // Larger margin for gentler avoidance
      const edgeAvoidance = 0.1;
      
      // X boundaries
      if (boid.position.x > bounds.x - margin) {
        const strength = (boid.position.x - (bounds.x - margin)) / margin;
        boundaryForce.x = -edgeAvoidance * strength * strength;
      } else if (boid.position.x < -bounds.x + margin) {
        const strength = ((-bounds.x + margin) - boid.position.x) / margin;
        boundaryForce.x = edgeAvoidance * strength * strength;
      }
      
      // Y boundaries
      if (boid.position.y > bounds.y - margin) {
        const strength = (boid.position.y - (bounds.y - margin)) / margin;
        boundaryForce.y = -edgeAvoidance * strength * strength;
      } else if (boid.position.y < -bounds.y + margin) {
        const strength = ((-bounds.y + margin) - boid.position.y) / margin;
        boundaryForce.y = edgeAvoidance * strength * strength;
      }
      
      // Z boundaries
      if (boid.position.z > bounds.z - margin) {
        const strength = (boid.position.z - (bounds.z - margin)) / margin;
        boundaryForce.z = -edgeAvoidance * strength * strength;
      } else if (boid.position.z < -bounds.z + margin) {
        const strength = ((-bounds.z + margin) - boid.position.z) / margin;
        boundaryForce.z = edgeAvoidance * strength * strength;
      }

      // Combine all forces
      boid.velocity.add(separation);
      boid.velocity.add(alignment);
      boid.velocity.add(cohesion);
      boid.velocity.add(wanderForce);
      boid.velocity.add(depthPreference);
      boid.velocity.add(schoolingForce);
      boid.velocity.add(boundaryForce);

      // Water resistance
      boid.velocity.multiplyScalar(waterResistance);
      boid.velocity.multiplyScalar(boid.waterResistance);

      // Dynamic speed limits based on behavior
      let speedMultiplier = 1.0;
      if (boid.isDarting) speedMultiplier = 2.5;
      else if (boid.isIdling) speedMultiplier = 0.3;
      else if (boid.personality.name === 'energetic') speedMultiplier = 1.3;
      else if (boid.personality.name === 'lazy') speedMultiplier = 0.7;
      
      const maxSpeed = boid.originalSpeed * speedMultiplier * (0.8 + Math.sin(currentTime * 0.7 + boidIndex) * 0.2);
      boid.velocity.clampLength(0, maxSpeed);

      // Update position
      boid.position.add(boid.velocity.clone().multiplyScalar(delta));
      
      // Hard boundary clamping - never let fish leave visible area
      boid.position.x = Math.max(-bounds.x, Math.min(bounds.x, boid.position.x));
      boid.position.y = Math.max(-bounds.y, Math.min(bounds.y, boid.position.y));
      boid.position.z = Math.max(-bounds.z, Math.min(bounds.z, boid.position.z));

      // Update rotation (smoothed look direction)
      boid.ref.position.copy(boid.position);
      if (boid.velocity.length() > 0.01) {
        // Smooth the look direction to prevent jitter
        const newDir = boid.velocity.clone().normalize();
        boid.lastLookDirection.lerp(newDir, 0.15); // 0.15 = smoothing factor
        const lookTarget = boid.position.clone().add(boid.lastLookDirection);
        boid.ref.lookAt(lookTarget);
      }
    });
  });

  return { boids, isDeterministic: true };
};

export default useDeterministicAquarium; 