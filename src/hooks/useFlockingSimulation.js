// This file will contain the flocking simulation logic. 

import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const useFlockingSimulation = (fishData) => {
  const boids = useMemo(() => {
    // Initialize boids with position, velocity, and a Three.js object for calculations
    return fishData.map(f => ({
      ...f,
      position: new THREE.Vector3(...f.initialPosition),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ),
      ref: new THREE.Object3D(), // Used to calculate rotations
    }));
  }, [fishData]);

  useFrame((state, delta) => {
    const separationDistance = 3.0;
    const alignmentDistance = 5.0;
    const cohesionDistance = 5.0;
    const maxSpeed = 2.5;
    const maxForce = 0.05;
    const bounds = new THREE.Vector3(15, 10, 10);

    boids.forEach(boid => {
      const separation = new THREE.Vector3();
      const alignment = new THREE.Vector3();
      const cohesion = new THREE.Vector3();
      let separationCount = 0;
      let alignmentCount = 0;
      let cohesionCount = 0;

      boids.forEach(other => {
        if (boid === other) return;
        const dist = boid.position.distanceTo(other.position);

        // 1. Separation
        if (dist > 0 && dist < separationDistance) {
          const diff = new THREE.Vector3().subVectors(boid.position, other.position);
          diff.normalize();
          diff.divideScalar(dist);
          separation.add(diff);
          separationCount++;
        }

        // 2. Alignment
        if (dist > 0 && dist < alignmentDistance) {
          alignment.add(other.velocity);
          alignmentCount++;
        }

        // 3. Cohesion
        if (dist > 0 && dist < cohesionDistance) {
          cohesion.add(other.position);
          cohesionCount++;
        }
      });

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
      
      // Apply forces
      boid.velocity.add(separation);
      boid.velocity.add(alignment);
      boid.velocity.add(cohesion);

      // Steer towards center to stay within bounds
      if (boid.position.length() > bounds.length()) {
        const steerToCenter = new THREE.Vector3().subVectors(new THREE.Vector3(0,0,0), boid.position);
        steerToCenter.clampLength(0, maxForce * 2);
        boid.velocity.add(steerToCenter);
      }

      boid.velocity.clampLength(0, maxSpeed);
      boid.position.add(boid.velocity.clone().multiplyScalar(delta));

      // Update rotation
      boid.ref.position.copy(boid.position);
      boid.ref.lookAt(boid.position.clone().add(boid.velocity));
    });
  });

  return boids;
};

export default useFlockingSimulation; 