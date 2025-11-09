import { useState, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BOUNDS } from '../constants/tankDimensions';
import {
  claimSimulationMaster,
  isSimulationMaster,
  updateAllFishPositions,
  subscribeToFishPositions,
  updateMasterHeartbeat
} from '../firestore/realtimeAquarium';

const useRealtimeAquarium = (fishData) => {
  const [isMaster, setIsMaster] = useState(false);
  const [realtimePositions, setRealtimePositions] = useState({});
  const sessionId = useRef(Math.random().toString(36).substr(2, 9));
  const lastUpdateTime = useRef(Date.now());
  const heartbeatInterval = useRef(null);
  
  const [boids, setBoids] = useState([]);

  useEffect(() => {
    if (!fishData || fishData.length === 0) return;

    const newBoids = fishData.map((f, index) => {
      const realtimePosition = realtimePositions[f.id]?.position;

      // Helper function to validate position is within bounds
      const isValidPosition = (pos) => {
        if (!Array.isArray(pos) || pos.length !== 3) return false;
        return Math.abs(pos[0]) <= BOUNDS.x &&
               pos[1] >= BOUNDS.y.min &&
               pos[1] <= BOUNDS.y.max &&
               Math.abs(pos[2]) <= BOUNDS.z;
      };

      // Ensure we have proper position data
      let positionArray;
      if (realtimePosition && isValidPosition(realtimePosition)) {
        positionArray = realtimePosition;
      } else if (f.position && isValidPosition(f.position)) {
        positionArray = f.position;
      } else {
        // Fallback positions spread across the tank interior (well within bounds)
        const yRange = BOUNDS.y.max - BOUNDS.y.min;
        const yMid = (BOUNDS.y.max + BOUNDS.y.min) / 2;
        const safePositions = [
          [-BOUNDS.x * 0.4, yMid + yRange * 0.2, 0],
          [BOUNDS.x * 0.4, yMid - yRange * 0.2, 0],
          [0, yMid + yRange * 0.3, BOUNDS.z * 0.3],
          [0, yMid, -BOUNDS.z * 0.3],
          [-BOUNDS.x * 0.3, yMid - yRange * 0.1, BOUNDS.z * 0.2],
          [BOUNDS.x * 0.3, yMid + yRange * 0.1, -BOUNDS.z * 0.2],
        ];
        positionArray = safePositions[index % safePositions.length];
      }

      // Ensure we have proper velocity data
      let velocityArray;
      const realtimeVelocity = realtimePositions[f.id]?.velocity;
      if (realtimeVelocity && Array.isArray(realtimeVelocity) && realtimeVelocity.length === 3) {
        velocityArray = realtimeVelocity;
      } else if (f.velocity && Array.isArray(f.velocity) && f.velocity.length === 3) {
        velocityArray = f.velocity;
      } else {
        // Initial velocity seeds to ensure fish move from the start
        const velocitySeeds = [
          [1.0, 0.3, 0.0],
          [-1.0, 0.5, 0.0],
          [0.5, -1.0, 0.0],
          [-0.5, 1.0, 0.0],
          [0.8, 0.0, 0.0],
          [-0.8, 0.0, 0.0],
        ];
        velocityArray = velocitySeeds[index % velocitySeeds.length];
      }

      return {
        ...f,
        position: new THREE.Vector3(...positionArray),
        velocity: new THREE.Vector3(...velocityArray),
        ref: new THREE.Object3D(),
      };
    });

    setBoids(newBoids);
  }, [fishData, realtimePositions]);

  useEffect(() => {
    if (boids.length === 0) return;

    const tryBecomeMaster = async () => {
      const success = await claimSimulationMaster(sessionId.current);
      if (success) {
        setIsMaster(true);
        console.log('🎯 This browser is now the simulation master');

        // Don't write initial positions - let the simulation loop handle it
        // This prevents a burst of writes when claiming master

        // Send heartbeat every 30 seconds to reduce Firebase writes
        heartbeatInterval.current = setInterval(() => {
          updateMasterHeartbeat();
        }, 30000);
      }
    };

    tryBecomeMaster();

    const unsubscribe = isSimulationMaster((masterDoc) => {
      if (masterDoc && masterDoc.sessionId === sessionId.current) {
        setIsMaster(true);
      } else if (masterDoc && masterDoc.sessionId !== sessionId.current) {
        setIsMaster(false);
      } else {
        tryBecomeMaster();
      }
    });

    return () => {
      unsubscribe();
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }
    };
  }, [boids]);

  // Subscribe to real-time positions (for non-masters)
  useEffect(() => {
    if (!isMaster) {
      const unsubscribe = subscribeToFishPositions((positions) => {
        if (positions && Object.keys(positions).length > 0) {
          setRealtimePositions(positions);
        }
      });
      return unsubscribe;
    }
  }, [isMaster]);

  // Non-master browsers: smooth interpolation of positions from Firebase
  useFrame((state, delta) => {
    if (!isMaster) {
      // Smoothly interpolate towards Firebase positions for non-masters
      boids.forEach(boid => {
        const realtimePos = realtimePositions[boid.id]?.position;
        if (realtimePos && Array.isArray(realtimePos) && realtimePos.length === 3) {
          // Validate target position is within bounds before interpolating
          const isValidTarget =
            Math.abs(realtimePos[0]) <= BOUNDS.x &&
            realtimePos[1] >= BOUNDS.y.min &&
            realtimePos[1] <= BOUNDS.y.max &&
            Math.abs(realtimePos[2]) <= BOUNDS.z;

          if (!isValidTarget) {
            // Don't interpolate to invalid positions - clamp current position instead
            boid.position.x = Math.max(-BOUNDS.x, Math.min(BOUNDS.x, boid.position.x));
            boid.position.y = Math.max(BOUNDS.y.min, Math.min(BOUNDS.y.max, boid.position.y));
            boid.position.z = Math.max(-BOUNDS.z, Math.min(BOUNDS.z, boid.position.z));
            boid.ref.position.copy(boid.position);
            return;
          }

          const targetPos = new THREE.Vector3(...realtimePos);

          // Only interpolate if there's a meaningful difference (> 0.1 units)
          const distance = boid.position.distanceTo(targetPos);
          if (distance > 0.1) {
            // Faster interpolation to reduce perceived lag/jumping
            const lerpFactor = Math.min(0.15, delta * 5); // Adaptive based on delta
            boid.position.lerp(targetPos, lerpFactor);
          }

          // Clamp position after interpolation to ensure it stays in bounds
          boid.position.x = Math.max(-BOUNDS.x, Math.min(BOUNDS.x, boid.position.x));
          boid.position.y = Math.max(BOUNDS.y.min, Math.min(BOUNDS.y.max, boid.position.y));
          boid.position.z = Math.max(-BOUNDS.z, Math.min(BOUNDS.z, boid.position.z));

          boid.ref.position.copy(boid.position);

          // Update rotation to face movement direction
          const realtimeVel = realtimePositions[boid.id]?.velocity;
          if (realtimeVel && Array.isArray(realtimeVel) && realtimeVel.length === 3) {
            const velocity = new THREE.Vector3(...realtimeVel);
            if (velocity.length() > 0.1) {
              const lookTarget = boid.position.clone().add(velocity.normalize());
              boid.ref.lookAt(lookTarget);
            }
          }
        }
      });
      return;
    }

    // Master browser: run simulation and update Firebase
    const now = Date.now();
    // Optimized Firebase write frequency to balance responsiveness and quota
    // Update every 2 seconds for smooth synchronized movement
    if (now - lastUpdateTime.current < 2000) return;
    lastUpdateTime.current = now;
  
    const separationDistance = 4.0;
    const alignmentDistance = 6.0;
    const cohesionDistance = 5.0;
    const maxSpeed = 2.0;
    const maxForce = 0.08;
  
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
      
      boid.velocity.add(separation.multiplyScalar(1.5));
      boid.velocity.add(alignment.multiplyScalar(1.0));
      boid.velocity.add(cohesion.multiplyScalar(1.0));
      
      // Constrain Z movement to keep fish more 2D
      boid.velocity.z *= 0.3;
  
      // Smooth boundary containment - stronger steering to keep fish visible and centered
      const margin = 3.0; // Margin for gradual turning

      // X bounds (symmetric)
      if (Math.abs(boid.position.x) > BOUNDS.x - margin) {
        const force = (Math.abs(boid.position.x) - (BOUNDS.x - margin)) / margin;
        boid.velocity.x -= Math.sign(boid.position.x) * force * 0.8;
      }

      // Y bounds (asymmetric - different top and bottom)
      if (boid.position.y < BOUNDS.y.min + margin) {
        const force = (BOUNDS.y.min + margin - boid.position.y) / margin;
        boid.velocity.y += force * 0.8; // Push upward
      }
      if (boid.position.y > BOUNDS.y.max - margin) {
        const force = (boid.position.y - (BOUNDS.y.max - margin)) / margin;
        boid.velocity.y -= force * 0.8; // Push downward
      }

      // Z bounds (symmetric)
      if (Math.abs(boid.position.z) > BOUNDS.z - margin) {
        const force = (Math.abs(boid.position.z) - (BOUNDS.z - margin)) / margin;
        boid.velocity.z -= Math.sign(boid.position.z) * force * 0.8;
      }

      // Hard clamp as safety (fish should NEVER escape these bounds)
      boid.position.x = Math.max(-BOUNDS.x, Math.min(BOUNDS.x, boid.position.x));
      boid.position.y = Math.max(BOUNDS.y.min, Math.min(BOUNDS.y.max, boid.position.y));
      boid.position.z = Math.max(-BOUNDS.z, Math.min(BOUNDS.z, boid.position.z));
  
      // Ensure fish always keep moving
      if (boid.velocity.length() < 0.1) {
        // Give fish a random direction if they get stuck
        // Prefer horizontal movement over vertical to keep fish visible
        boid.velocity.set(
          (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 0.5
        ).normalize().multiplyScalar(1.2);
      }
      
      if (boid.velocity.length() < 1.0) {
        boid.velocity.normalize().multiplyScalar(1.2);
      }
      boid.velocity.clampLength(1.0, maxSpeed);
      boid.position.add(boid.velocity.clone().multiplyScalar(delta));
  
      boid.ref.position.copy(boid.position);
      if (boid.velocity.length() > 0.1) {
        const lookTarget = boid.position.clone().add(boid.velocity.clone().normalize());
        boid.ref.lookAt(lookTarget);
      }
    });

    // Update Firebase with new positions
    const positions = {};
    boids.forEach(boid => {
      positions[boid.id] = boid; // Pass the entire boid object, not just position/velocity
    });
    
    updateAllFishPositions(positions);
  });

  // Return appropriate data based on role
  if (isMaster) {
    return { boids, isMaster: true };
  } else {
    return { boids, isMaster: false };
  }
};

export default useRealtimeAquarium; 