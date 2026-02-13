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

  // Store persistent random values for each fish (for natural variation)
  const fishRandomsRef = useRef({});

  const [boids, setBoids] = useState([]);

  useEffect(() => {
    if (!fishData || fishData.length === 0) return;

    const newBoids = fishData.map((f, index) => {
      const realtimePosition = realtimePositions[f.id]?.position;

      // Generate or retrieve persistent random values for this fish
      if (!fishRandomsRef.current[f.id]) {
        fishRandomsRef.current[f.id] = {
          // Phase offset for swimming animation (0 to 2*PI)
          phaseOffset: Math.random() * Math.PI * 2,
          // Speed multiplier (0.7 to 1.3 - some fish swim faster/slower)
          speedMultiplier: 0.7 + Math.random() * 0.6,
          // Vertical preference (-1 to 1, affects preferred swimming depth)
          verticalBias: (Math.random() - 0.5) * 2,
          // Wandering intensity (how much random movement)
          wanderIntensity: 0.3 + Math.random() * 0.7,
          // Turn rate (how quickly fish changes direction)
          turnRate: 0.8 + Math.random() * 0.4,
          // Individual wiggle amplitude
          wiggleAmount: 0.8 + Math.random() * 0.4,
        };
      }

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
        // Add randomness to spawn positions
        const randomOffset = () => (Math.random() - 0.5) * 2;
        const safePositions = [
          [-BOUNDS.x * 0.5 + randomOffset(), yMid + yRange * 0.2 + randomOffset(), randomOffset()],
          [BOUNDS.x * 0.5 + randomOffset(), yMid - yRange * 0.1 + randomOffset(), randomOffset()],
          [randomOffset() * 3, yMid + yRange * 0.25 + randomOffset(), BOUNDS.z * 0.3 + randomOffset()],
          [randomOffset() * 3, yMid + randomOffset(), -BOUNDS.z * 0.3 + randomOffset()],
          [-BOUNDS.x * 0.4 + randomOffset(), yMid + randomOffset(), BOUNDS.z * 0.2 + randomOffset()],
          [BOUNDS.x * 0.4 + randomOffset(), yMid + yRange * 0.1 + randomOffset(), -BOUNDS.z * 0.2 + randomOffset()],
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
        // Random initial velocity with random direction
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.2 + Math.random() * 0.2;
        velocityArray = [
          Math.cos(angle) * speed,
          (Math.random() - 0.5) * 0.1,
          Math.sin(angle) * speed * 0.3, // Less Z movement
        ];
      }

      return {
        ...f,
        position: new THREE.Vector3(...positionArray),
        velocity: new THREE.Vector3(...velocityArray),
        ref: new THREE.Object3D(),
        // Attach individual random properties
        randoms: fishRandomsRef.current[f.id],
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
    const time = now * 0.001; // Time in seconds for wandering
    const shouldUpdateFirebase = (now - lastUpdateTime.current >= 150); // Update Firebase every 150ms
    if (shouldUpdateFirebase) {
      lastUpdateTime.current = now;
    }

    // SMOOTH, REALISTIC FISH MOVEMENT
    const separationDistance = 4.0;
    const alignmentDistance = 10.0;
    const cohesionDistance = 10.0;
    const baseMaxSpeed = 0.5;
    const baseMinSpeed = 0.15;
    const maxForce = 0.015;
    const damping = 0.98;

    boids.forEach(boid => {
      // Get individual fish properties
      const randoms = boid.randoms || {
        speedMultiplier: 1.0,
        verticalBias: 0,
        wanderIntensity: 0.5,
        turnRate: 1.0,
        phaseOffset: 0,
      };

      // Individual speed limits based on fish personality
      const maxSpeed = baseMaxSpeed * randoms.speedMultiplier;
      const minSpeed = baseMinSpeed * randoms.speedMultiplier;

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

      // Apply boid forces
      if (separationCount > 0) {
        separation.divideScalar(separationCount);
        separation.normalize();
        separation.multiplyScalar(maxForce * 1.5);
      }
      if (alignmentCount > 0) {
        alignment.divideScalar(alignmentCount);
        alignment.normalize();
        alignment.sub(boid.velocity.clone().normalize());
        alignment.multiplyScalar(maxForce * 0.8 * randoms.turnRate);
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

      // INDIVIDUAL WANDERING - makes each fish unique
      // Use phase offset so each fish wanders at different times
      const wanderPhase = time * 0.5 + randoms.phaseOffset;
      const wanderForce = new THREE.Vector3(
        Math.sin(wanderPhase * 1.3) * 0.008 * randoms.wanderIntensity,
        Math.sin(wanderPhase * 0.7 + randoms.verticalBias) * 0.004 * randoms.wanderIntensity,
        Math.cos(wanderPhase * 0.9) * 0.003 * randoms.wanderIntensity
      );
      boid.velocity.add(wanderForce);

      // Vertical preference bias - some fish prefer top, some prefer bottom
      const yCenter = (BOUNDS.yMax + BOUNDS.yMin) / 2;
      const preferredY = yCenter + randoms.verticalBias * (BOUNDS.yMax - BOUNDS.yMin) * 0.25;
      const yDiff = preferredY - boid.position.y;
      boid.velocity.y += yDiff * 0.001;

      // Apply damping
      boid.velocity.multiplyScalar(damping);

      // Constrain Z movement to keep fish swimming more horizontally
      boid.velocity.z *= 0.4;

      // SOFT BOUNDARY CONTAINMENT with stronger floor avoidance
      const margin = 5.0;
      const floorMargin = 6.0; // Larger margin for floor to prevent going into sand
      const turnStrength = 0.003;
      const floorTurnStrength = 0.006; // Stronger turn away from floor

      // X bounds
      if (boid.position.x > BOUNDS.x - margin) {
        const dist = boid.position.x - (BOUNDS.x - margin);
        boid.velocity.x -= turnStrength * dist * dist;
      } else if (boid.position.x < -BOUNDS.x + margin) {
        const dist = (-BOUNDS.x + margin) - boid.position.x;
        boid.velocity.x += turnStrength * dist * dist;
      }

      // Y bounds - STRONGER floor avoidance
      if (boid.position.y > BOUNDS.yMax - margin) {
        const dist = boid.position.y - (BOUNDS.yMax - margin);
        boid.velocity.y -= turnStrength * dist * dist;
      } else if (boid.position.y < BOUNDS.yMin + floorMargin) {
        // Much stronger upward force near the floor
        const dist = (BOUNDS.yMin + floorMargin) - boid.position.y;
        boid.velocity.y += floorTurnStrength * dist * dist;
        // Also reduce downward velocity when near floor
        if (boid.velocity.y < 0) {
          boid.velocity.y *= 0.5;
        }
      }

      // Z bounds
      if (boid.position.z > BOUNDS.z - margin) {
        const dist = boid.position.z - (BOUNDS.z - margin);
        boid.velocity.z -= turnStrength * dist * dist;
      } else if (boid.position.z < -BOUNDS.z + margin) {
        const dist = (-BOUNDS.z + margin) - boid.position.z;
        boid.velocity.z += turnStrength * dist * dist;
      }

      // Random wandering if moving too slow (prevents getting stuck)
      if (boid.velocity.length() < 0.05) {
        boid.velocity.add(new THREE.Vector3(
          (Math.random() - 0.5) * 0.08,
          (Math.random() - 0.5) * 0.04,
          (Math.random() - 0.5) * 0.03
        ));
      }

      // Clamp speed with individual variation
      const speed = boid.velocity.length();
      if (speed > maxSpeed) {
        boid.velocity.multiplyScalar(maxSpeed / speed);
      } else if (speed < minSpeed) {
        boid.velocity.normalize().multiplyScalar(minSpeed);
      }

      // Update position FIRST
      boid.position.add(boid.velocity.clone().multiplyScalar(delta * 60));

      // THEN hard clamp as safety (fish should NEVER escape these bounds)
      // This ensures fish can never go below sand or outside tank
      boid.position.x = Math.max(-BOUNDS.x, Math.min(BOUNDS.x, boid.position.x));
      boid.position.y = Math.max(BOUNDS.yMin, Math.min(BOUNDS.yMax, boid.position.y));
      boid.position.z = Math.max(-BOUNDS.z, Math.min(BOUNDS.z, boid.position.z));

      boid.ref.position.copy(boid.position);

      // Smooth rotation with individual turn rate
      if (boid.velocity.length() > 0.1) {
        const lookTarget = boid.position.clone().add(boid.velocity.clone().normalize());
        boid.ref.lookAt(lookTarget);

        // Calculate banking angle based on horizontal turn rate
        const turnAmount = boid.velocity.x * randoms.turnRate;
        boid.bankAngle = -turnAmount * 0.3; // Subtle banking
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