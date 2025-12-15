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
        const valid = Math.abs(pos[0]) <= BOUNDS.x &&
               pos[1] >= BOUNDS.yMin &&
               pos[1] <= BOUNDS.yMax &&
               Math.abs(pos[2]) <= BOUNDS.z;
        if (!valid) {
          console.warn('⚠️ Invalid fish position detected:', pos, 'Bounds:', BOUNDS);
        }
        return valid;
      };

      // Ensure we have proper position data
      let positionArray;
      if (realtimePosition && isValidPosition(realtimePosition)) {
        positionArray = realtimePosition;
      } else if (f.position && isValidPosition(f.position)) {
        positionArray = f.position;
      } else {
        // Fallback positions spread across the tank interior (well within bounds)
        const yRange = BOUNDS.yMax - BOUNDS.yMin;
        const yMid = (BOUNDS.yMax + BOUNDS.yMin) / 2;
        const safePositions = [
          [-BOUNDS.x * 0.5, yMid + yRange * 0.2, 0],
          [BOUNDS.x * 0.5, yMid - yRange * 0.2, 0],
          [0, yMid + yRange * 0.3, BOUNDS.z * 0.3],
          [0, yMid, -BOUNDS.z * 0.3],
          [-BOUNDS.x * 0.4, yMid - yRange * 0.1, BOUNDS.z * 0.2],
          [BOUNDS.x * 0.4, yMid + yRange * 0.1, -BOUNDS.z * 0.2],
        ];
        positionArray = safePositions[index % safePositions.length];
        console.log(`🐠 Fish ${f.name} spawned at:`, positionArray);
      }

      // Ensure we have proper velocity data
      let velocityArray;
      const realtimeVelocity = realtimePositions[f.id]?.velocity;
      if (realtimeVelocity && Array.isArray(realtimeVelocity) && realtimeVelocity.length === 3) {
        velocityArray = realtimeVelocity;
      } else if (f.velocity && Array.isArray(f.velocity) && f.velocity.length === 3) {
        velocityArray = f.velocity;
      } else {
        // Smooth initial velocity seeds for realistic movement
        const velocitySeeds = [
          [0.3, 0.1, 0.0],
          [-0.3, 0.12, 0.0],
          [0.25, -0.15, 0.0],
          [-0.25, 0.18, 0.0],
          [0.28, 0.0, 0.08],
          [-0.28, 0.0, -0.08],
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
            realtimePos[1] >= BOUNDS.yMin &&
            realtimePos[1] <= BOUNDS.yMax &&
            Math.abs(realtimePos[2]) <= BOUNDS.z;

          if (!isValidTarget) {
            // Don't interpolate to invalid positions - clamp current position instead
            console.warn('⚠️ Rejecting invalid Firebase position for', boid.id, realtimePos);
            boid.position.x = Math.max(-BOUNDS.x, Math.min(BOUNDS.x, boid.position.x));
            boid.position.y = Math.max(BOUNDS.yMin, Math.min(BOUNDS.yMax, boid.position.y));
            boid.position.z = Math.max(-BOUNDS.z, Math.min(BOUNDS.z, boid.position.z));
            boid.ref.position.copy(boid.position);
            return;
          }

          const targetPos = new THREE.Vector3(...realtimePos);

          // Smooth interpolation with predictive movement
          const distance = boid.position.distanceTo(targetPos);

          // Use higher lerp factor for smoother following
          const lerpFactor = Math.min(0.1, delta * 3);
          boid.position.lerp(targetPos, lerpFactor);

          // Clamp position after interpolation to ensure it stays in bounds
          boid.position.x = Math.max(-BOUNDS.x, Math.min(BOUNDS.x, boid.position.x));
          boid.position.y = Math.max(BOUNDS.yMin, Math.min(BOUNDS.yMax, boid.position.y));
          boid.position.z = Math.max(-BOUNDS.z, Math.min(BOUNDS.z, boid.position.z));

          boid.ref.position.copy(boid.position);

          // Update rotation to face movement direction
          const realtimeVel = realtimePositions[boid.id]?.velocity;
          if (realtimeVel && Array.isArray(realtimeVel) && realtimeVel.length === 3) {
            const velocity = new THREE.Vector3(...realtimeVel);
            if (velocity.length() > 0.05) {
              const lookTarget = boid.position.clone().add(velocity.normalize());
              boid.ref.lookAt(lookTarget);
            }
          }
        }
      });
      return;
    }

    // Master browser: run simulation EVERY FRAME for smooth movement
    const now = Date.now();
    const shouldUpdateFirebase = (now - lastUpdateTime.current >= 150); // Update Firebase every 150ms
    if (shouldUpdateFirebase) {
      lastUpdateTime.current = now;
    }
  
    // SMOOTH, REALISTIC FISH MOVEMENT
    const separationDistance = 4.0;
    const alignmentDistance = 10.0;
    const cohesionDistance = 10.0; // Increased to keep schools together
    const maxSpeed = 0.5; // Slightly slower for scale
    const minSpeed = 0.2;
    const maxForce = 0.015; // Very low force for smooth, graceful turns
    const damping = 0.98; // Less drag
  
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
  
        // Only perceive local neighbors
        if (dist > 15.0) return;

        if (dist > 0 && dist < separationDistance) {
          const diff = new THREE.Vector3().subVectors(boid.position, other.position);
          diff.normalize();
          diff.divideScalar(dist); // Weight by distance
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
  
      // Apply boid forces
      if (separationCount > 0) {
        separation.divideScalar(separationCount);
        separation.normalize();
        separation.multiplyScalar(maxForce * 1.5); // Stronger separation to avoid clipping
      }
      if (alignmentCount > 0) {
        alignment.divideScalar(alignmentCount);
        alignment.normalize();
        alignment.sub(boid.velocity.clone().normalize());
        alignment.multiplyScalar(maxForce * 0.8);
      }
      if (cohesionCount > 0) {
        cohesion.divideScalar(cohesionCount);
        cohesion.sub(boid.position);
        cohesion.normalize();
        cohesion.multiplyScalar(maxForce * 0.4);
      }

      // Apply forces
      boid.velocity.add(separation);
      boid.velocity.add(alignment);
      boid.velocity.add(cohesion);

      // Apply damping
      boid.velocity.multiplyScalar(damping);

      // Constrain Z movement to keep fish swimming more horizontally (pseudo-2D preferance)
      boid.velocity.z *= 0.3;
  
      // SOFT BOUNDARY CONTAINMENT
      // Use a "soft wall" force that increases exponentially as they approach the edge
      const margin = 5.0; 
      const turnStrength = 0.002; // Base turn strength

      // X bounds
      if (boid.position.x > BOUNDS.x - margin) {
        boid.velocity.x -= turnStrength * Math.pow(boid.position.x - (BOUNDS.x - margin), 2);
      } else if (boid.position.x < -BOUNDS.x + margin) {
        boid.velocity.x += turnStrength * Math.pow((-BOUNDS.x + margin) - boid.position.x, 2);
      }

      // Y bounds
      if (boid.position.y > BOUNDS.yMax - margin) {
        boid.velocity.y -= turnStrength * Math.pow(boid.position.y - (BOUNDS.yMax - margin), 2);
      } else if (boid.position.y < BOUNDS.yMin + margin) {
        boid.velocity.y += turnStrength * Math.pow((BOUNDS.yMin + margin) - boid.position.y, 2);
      }

      // Z bounds
      if (boid.position.z > BOUNDS.z - margin) {
        boid.velocity.z -= turnStrength * Math.pow(boid.position.z - (BOUNDS.z - margin), 2);
      } else if (boid.position.z < -BOUNDS.z + margin) {
        boid.velocity.z += turnStrength * Math.pow((-BOUNDS.z + margin) - boid.position.z, 2);
      }

      // Hard clamp as safety (fish should NEVER escape these bounds)
      const prevY = boid.position.y;
      boid.position.x = Math.max(-BOUNDS.x, Math.min(BOUNDS.x, boid.position.x));
      boid.position.y = Math.max(BOUNDS.yMin, Math.min(BOUNDS.yMax, boid.position.y));
      boid.position.z = Math.max(-BOUNDS.z, Math.min(BOUNDS.z, boid.position.z));
  
      // Random wandering if moving too slow (prevents getting stuck)
      if (boid.velocity.length() < 0.05) {
        boid.velocity.add(new THREE.Vector3(
          (Math.random() - 0.5) * 0.05,
          (Math.random() - 0.5) * 0.05,
          (Math.random() - 0.5) * 0.05
        ));
      }

      // Clamp speed
      const speed = boid.velocity.length();
      if (speed > maxSpeed) {
        boid.velocity.multiplyScalar(maxSpeed / speed);
      } else if (speed < minSpeed) {
        boid.velocity.normalize().multiplyScalar(minSpeed);
      }

      // Update position
      boid.position.add(boid.velocity.clone().multiplyScalar(delta * 60)); // Normalize to 60fps
  
      boid.ref.position.copy(boid.position);
      
      // Smooth rotation
      if (boid.velocity.length() > 0.1) {
        const lookTarget = boid.position.clone().add(boid.velocity.clone().normalize());
        // Slerp rotation for smoothness could be done here, but lookAt is usually okay for small steps
        boid.ref.lookAt(lookTarget);
        
        // Add banking (roll) based on turn
        // Calculate angular velocity or centripetal force approximation
        // Simple visual banking:
        // boid.bankAngle = -boid.velocity.x * 0.5; // Example
      }
    });

    // Update Firebase only at intervals (not every frame) to reduce writes
    if (shouldUpdateFirebase) {
      const positions = {};
      boids.forEach(boid => {
        positions[boid.id] = boid; // Pass the entire boid object, not just position/velocity
      });

      updateAllFishPositions(positions);
    }
  });

  // Return appropriate data based on role
  if (isMaster) {
    return { boids, isMaster: true };
  } else {
    return { boids, isMaster: false };
  }
};

export default useRealtimeAquarium; 