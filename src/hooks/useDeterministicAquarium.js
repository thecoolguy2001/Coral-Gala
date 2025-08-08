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
    return (this.seed = (this.seed * 16807) % 2147483647);
  }

  random() {
    return (this.next() - 1) / 2147483646;
  }

  range(min, max) {
    return min + this.random() * (max - min);
  }
}

// Simple deterministic noise based on time and index
const hashNoise = (index, t, freq = 1) => {
  const x = Math.sin((index + 1) * 12.9898 + t * 78.233 * freq) * 43758.5453;
  return x - Math.floor(x);
};

const PERSONALITIES = [
  { name: 'timid', alignment: 0.25, cohesion: 0.25, wander: 0.7, dart: 0.08 },
  { name: 'bold', alignment: 0.45, cohesion: 0.35, wander: 0.4, dart: 0.25 },
  { name: 'wanderer', alignment: 0.15, cohesion: 0.15, wander: 0.9, dart: 0.15 },
  { name: 'social', alignment: 0.6, cohesion: 0.5, wander: 0.25, dart: 0.08 },
  { name: 'cruiser', alignment: 0.35, cohesion: 0.25, wander: 0.55, dart: 0.05 },
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
        rng.range(-velocityScale, velocityScale) * 0.5, // reduce initial vertical speed
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
        acceleration: new THREE.Vector3(),
        originalSpeed: fish.speed || 2.0,
        ref: new THREE.Object3D(),
        personality,
        idleTimer: 0,
        dartTimer: 0,
        isIdling: false,
        isDarting: false,
        waterResistance: 0.985,
        size: fish.size || 1.0,
        lastLookDirection,
        bankAngle: 0,
      };
    });
  }, [fishData]);

  useFrame((state, delta) => {
    const currentTime = (Date.now() - startTime.current) / 1000;

    // Calculate bounds based on camera and viewport
    const camera = state.camera;
    // Get the visible area at the fish swimming depth (z=0)
    const distance = camera.position.z; // Distance from camera to fish plane
    const vFOV = (camera.fov * Math.PI) / 180; // Convert vertical fov to radians
    const visibleHeight = 2 * Math.tan(vFOV / 2) * distance;
    const visibleWidth = visibleHeight * camera.aspect;

    // Use 80% of visible area to keep fish comfortably on screen
    const bounds = new THREE.Vector3(
      visibleWidth * 0.4, // Half width * 0.8
      visibleHeight * 0.4, // Half height * 0.8
      25 // Depth doesn't change based on screen size
    );

    // Tunable parameters
    const separationDistance = 2.5;
    const alignmentDistance = 6.0;
    const cohesionDistance = 9.0;
    const maxForce = 0.06; // max steering force
    const maxAccel = 0.08; // cap on acceleration magnitude
    const maxTurnRate = Math.PI * 0.8; // radians/sec
    const minSpeed = 0.2;
    const waterResistance = 0.985;

    boids.forEach((boid, boidIndex) => {
      // Reset per-frame acceleration
      boid.acceleration.set(0, 0, 0);

      // Idle and darting logic using deterministic noise
      if (boid.isIdling) {
        boid.idleTimer -= delta;
        if (boid.idleTimer <= 0) {
          boid.isIdling = false;
        } else {
          // Minimal movement while idling
          boid.velocity.multiplyScalar(0.98);
        }
      } else if (boid.isDarting) {
        boid.dartTimer -= delta;
        if (boid.dartTimer <= 0) {
          boid.isDarting = false;
        } else {
          // Dart in a smooth deterministic direction
          const n1 = hashNoise(boidIndex * 3 + 1, currentTime, 0.7) - 0.5;
          const n2 = hashNoise(boidIndex * 3 + 2, currentTime, 0.9) - 0.5;
          const n3 = hashNoise(boidIndex * 3 + 3, currentTime, 1.1) - 0.5;
          boid.acceleration.add(new THREE.Vector3(n1, n2 * 0.5, n3).multiplyScalar(0.4));
        }
      } else {
        // Randomly decide to idle or dart in a deterministic way
        const idleChance = hashNoise(boidIndex + 100, currentTime, 0.1);
        const dartChance = hashNoise(boidIndex + 200, currentTime, 0.2);
        if (idleChance < 0.001 * delta * 60) {
          boid.isIdling = true;
          boid.idleTimer = 1 + (hashNoise(boidIndex + 300, currentTime, 1.0) * 2);
        } else if (dartChance < boid.personality.dart * 0.02 * delta * 60) {
          boid.isDarting = true;
          boid.dartTimer = 0.25 + hashNoise(boidIndex + 400, currentTime, 1.0) * 0.6;
        }
      }

      // Flocking forces with distance weighting
      const separation = new THREE.Vector3();
      const alignment = new THREE.Vector3();
      const cohesion = new THREE.Vector3();
      let separationWeight = 0;
      let alignmentWeight = 0;
      let cohesionWeight = 0;

      boids.forEach((other, otherIndex) => {
        if (boidIndex === otherIndex) return;
        const dist = boid.position.distanceTo(other.position);
        if (dist <= 0) return;

        if (dist < separationDistance) {
          const weight = 1 / (dist * dist + 0.0001);
          const diff = new THREE.Vector3().subVectors(boid.position, other.position).normalize().multiplyScalar(weight);
          separation.add(diff);
          separationWeight += weight;
        }

        if (dist < alignmentDistance) {
          const weight = 1 / (dist + 0.0001);
          alignment.add(other.velocity.clone().multiplyScalar(weight));
          alignmentWeight += weight;
        }

        if (dist < cohesionDistance) {
          const weight = 1 / (dist + 0.0001);
          cohesion.add(other.position.clone().multiplyScalar(weight));
          cohesionWeight += weight;
        }
      });

      if (separationWeight > 0) {
        separation.divideScalar(separationWeight);
        separation.multiplyScalar(maxForce * 1.8);
        boid.acceleration.add(separation);
      }

      if (alignmentWeight > 0) {
        alignment.divideScalar(alignmentWeight);
        const desired = alignment.normalize().multiplyScalar(boid.originalSpeed);
        const steer = desired.sub(boid.velocity).clampLength(0, maxForce * boid.personality.alignment);
        boid.acceleration.add(steer);
      }

      if (cohesionWeight > 0) {
        cohesion.divideScalar(cohesionWeight);
        const desired = cohesion.sub(boid.position).normalize().multiplyScalar(boid.originalSpeed * 0.6);
        const steer = desired.sub(boid.velocity).clampLength(0, maxForce * boid.personality.cohesion);
        boid.acceleration.add(steer);
      }

      // Species/depth preferences (uses fish.preferences.depth when available)
      const depthPreference = new THREE.Vector3();
      const preferredDepth = boid.preferences?.depth || 'middle';
      if (preferredDepth === 'surface') {
        if (boid.position.y < bounds.y * 0.2) depthPreference.y = 0.02;
      } else if (preferredDepth === 'bottom') {
        if (boid.position.y > -bounds.y * 0.2) depthPreference.y = -0.02;
      } else {
        // middle - softly pull toward y=0
        depthPreference.y = THREE.MathUtils.clamp(-boid.position.y * 0.01, -0.02, 0.02);
      }
      boid.acceleration.add(depthPreference);

      // Gentle schooling by species
      const schoolingForce = new THREE.Vector3();
      let schoolCount = 0;
      boids.forEach((other, otherIndex) => {
        if (boidIndex === otherIndex || !other.species) return;
        if (boid.species === other.species) {
          const dist = boid.position.distanceTo(other.position);
          if (dist > 0 && dist < 10) {
            const attraction = new THREE.Vector3().subVectors(other.position, boid.position);
            attraction.normalize();
            attraction.multiplyScalar(0.004 / dist);
            schoolingForce.add(attraction);
            schoolCount++;
          }
        }
      });
      if (schoolCount > 0) schoolingForce.divideScalar(schoolCount);
      boid.acceleration.add(schoolingForce);

      // Gentle boundary avoidance with quadratic falloff
      const boundaryForce = new THREE.Vector3();
      const margin = 3.5;
      const edgeAvoidance = 0.1;

      if (boid.position.x > bounds.x - margin) {
        const s = (boid.position.x - (bounds.x - margin)) / margin;
        boundaryForce.x = -edgeAvoidance * s * s;
      } else if (boid.position.x < -bounds.x + margin) {
        const s = ((-bounds.x + margin) - boid.position.x) / margin;
        boundaryForce.x = edgeAvoidance * s * s;
      }

      if (boid.position.y > bounds.y - margin) {
        const s = (boid.position.y - (bounds.y - margin)) / margin;
        boundaryForce.y = -edgeAvoidance * s * s;
      } else if (boid.position.y < -bounds.y + margin) {
        const s = ((-bounds.y + margin) - boid.position.y) / margin;
        boundaryForce.y = edgeAvoidance * s * s;
      }

      if (boid.position.z > bounds.z - margin) {
        const s = (boid.position.z - (bounds.z - margin)) / margin;
        boundaryForce.z = -edgeAvoidance * s * s;
      } else if (boid.position.z < -bounds.z + margin) {
        const s = ((-bounds.z + margin) - boid.position.z) / margin;
        boundaryForce.z = edgeAvoidance * s * s;
      }
      boid.acceleration.add(boundaryForce);

      // Smooth wandering via low-frequency deterministic noise
      const wanderStrength = boid.personality.wander * 0.025;
      const wander = new THREE.Vector3(
        (hashNoise(boidIndex * 11 + 1, currentTime, 0.35) - 0.5) * 2,
        (hashNoise(boidIndex * 11 + 2, currentTime, 0.25) - 0.5) * 1.2, // reduced vertical
        (hashNoise(boidIndex * 11 + 3, currentTime, 0.3) - 0.5) * 2
      ).multiplyScalar(wanderStrength);
      boid.acceleration.add(wander);

      // Global gentle current to create large-scale coherence
      const current = new THREE.Vector3(
        Math.sin(currentTime * 0.05) * 0.01,
        Math.sin(currentTime * 0.07 + boidIndex) * 0.004,
        Math.cos(currentTime * 0.045) * 0.008
      );
      boid.acceleration.add(current);

      // Cap acceleration
      boid.acceleration.clampLength(0, maxAccel);

      // Apply water resistance then acceleration
      boid.velocity.multiplyScalar(waterResistance * boid.waterResistance);

      // Limit instantaneous turn rate: steer velocity direction toward desired
      const desiredVelocity = boid.velocity.clone().add(boid.acceleration);
      const desiredDir = desiredVelocity.lengthSq() > 1e-6 ? desiredVelocity.clone().normalize() : boid.lastLookDirection.clone();
      const currentDir = boid.velocity.lengthSq() > 1e-6 ? boid.velocity.clone().normalize() : boid.lastLookDirection.clone();
      const angleBetween = Math.acos(THREE.MathUtils.clamp(currentDir.dot(desiredDir), -1, 1));
      const maxTurnThisFrame = maxTurnRate * delta;
      let newDir;
      if (angleBetween > maxTurnThisFrame) {
        // Rotate currentDir toward desiredDir by maxTurnThisFrame
        const axis = new THREE.Vector3().crossVectors(currentDir, desiredDir).normalize();
        const q = new THREE.Quaternion().setFromAxisAngle(axis, maxTurnThisFrame);
        newDir = currentDir.clone().applyQuaternion(q);
      } else {
        newDir = desiredDir;
      }

      // Update speed with gentle changes
      const targetSpeed = THREE.MathUtils.clamp(desiredVelocity.length(), minSpeed, boid.originalSpeed * (boid.isDarting ? 2.5 : 1.2));
      const currentSpeed = boid.velocity.length();
      const newSpeed = THREE.MathUtils.lerp(currentSpeed, targetSpeed, 0.1);
      boid.velocity.copy(newDir.multiplyScalar(newSpeed));

      // Update position
      boid.position.add(boid.velocity.clone().multiplyScalar(delta));

      // Hard boundary clamping - never let fish leave visible area
      boid.position.x = Math.max(-bounds.x, Math.min(bounds.x, boid.position.x));
      boid.position.y = Math.max(-bounds.y, Math.min(bounds.y, boid.position.y));
      boid.position.z = Math.max(-bounds.z, Math.min(bounds.z, boid.position.z));

      // Update rotation (smoothed look direction) and compute banking based on turn
      boid.ref.position.copy(boid.position);
      if (boid.velocity.length() > 0.01) {
        const newLook = boid.velocity.clone().normalize();
        boid.lastLookDirection.lerp(newLook, 0.2); // smoothing factor
        const lookTarget = boid.position.clone().add(boid.lastLookDirection);
        boid.ref.lookAt(lookTarget);

        // Banking: tilt into the turn proportional to change in direction
        const turnAxis = new THREE.Vector3().crossVectors(currentDir, newLook);
        const turnMagnitude = THREE.MathUtils.clamp(turnAxis.length(), 0, 1);
        const turnSign = Math.sign(turnAxis.y || 0); // use Y-up to determine left/right
        const targetBank = THREE.MathUtils.clamp(-turnSign * turnMagnitude * 0.6, -0.5, 0.5);
        boid.bankAngle = THREE.MathUtils.lerp(boid.bankAngle, targetBank, 0.15);
      } else {
        boid.bankAngle = THREE.MathUtils.lerp(boid.bankAngle, 0, 0.1);
      }
    });
  });

  return { boids, isDeterministic: true };
};

export default useDeterministicAquarium; 