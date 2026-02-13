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

    // NATURAL INDIVIDUAL FISH MOVEMENT (not schooling/boid behavior)
    // Each fish swims independently with its own personality

    boids.forEach(boid => {
      // Get individual fish properties
      const randoms = boid.randoms || {
        speedMultiplier: 1.0,
        verticalBias: 0,
        wanderIntensity: 0.5,
        turnRate: 1.0,
        phaseOffset: 0,
      };

      // Individual speed based on fish personality
      const baseSpeed = 0.12 * randoms.speedMultiplier;
      const maxSpeed = 0.35 * randoms.speedMultiplier;

      // Initialize target position if not set (lazy swimming target)
      if (!boid.targetPosition || boid.targetReached) {
        // Pick a new random target within the tank
        const safeMargin = 3.0;
        boid.targetPosition = new THREE.Vector3(
          (Math.random() - 0.5) * (BOUNDS.x * 2 - safeMargin * 2),
          BOUNDS.yMin + safeMargin + Math.random() * (BOUNDS.yMax - BOUNDS.yMin - safeMargin * 2),
          (Math.random() - 0.5) * (BOUNDS.z * 2 - safeMargin * 2)
        );
        // Add vertical bias preference
        boid.targetPosition.y += randoms.verticalBias * 3;
        boid.targetPosition.y = Math.max(BOUNDS.yMin + 2, Math.min(BOUNDS.yMax - 2, boid.targetPosition.y));
        boid.targetReached = false;
        // Random pause duration before moving to next target
        boid.pauseUntil = time + Math.random() * 2;
      }

      // Calculate direction to target
      const toTarget = new THREE.Vector3().subVectors(boid.targetPosition, boid.position);
      const distanceToTarget = toTarget.length();

      // Check if reached target
      if (distanceToTarget < 2.0) {
        boid.targetReached = true;
      }

      // NATURAL SWIMMING with smooth curves (not straight lines)
      // Use sine waves with individual phase for organic curved paths
      const wanderTime = time + randoms.phaseOffset;

      // Primary direction toward target (gentle steering)
      const steerStrength = 0.002 * randoms.turnRate;
      if (distanceToTarget > 1.0 && time > (boid.pauseUntil || 0)) {
        toTarget.normalize();
        // Gradually steer toward target
        boid.velocity.x += (toTarget.x * baseSpeed - boid.velocity.x) * steerStrength;
        boid.velocity.y += (toTarget.y * baseSpeed * 0.5 - boid.velocity.y) * steerStrength * 0.5;
        boid.velocity.z += (toTarget.z * baseSpeed * 0.3 - boid.velocity.z) * steerStrength * 0.3;
      }

      // ORGANIC WANDERING - smooth curves using multiple sine waves
      // Each fish has unique frequencies based on phaseOffset
      const freq1 = 0.3 + randoms.phaseOffset * 0.1;
      const freq2 = 0.17 + randoms.phaseOffset * 0.05;
      const freq3 = 0.23 + randoms.phaseOffset * 0.08;

      const wanderX = Math.sin(wanderTime * freq1) * Math.cos(wanderTime * freq2 * 0.7);
      const wanderY = Math.sin(wanderTime * freq2) * 0.3;
      const wanderZ = Math.cos(wanderTime * freq3) * Math.sin(wanderTime * freq1 * 0.5);

      boid.velocity.x += wanderX * 0.003 * randoms.wanderIntensity;
      boid.velocity.y += wanderY * 0.001 * randoms.wanderIntensity;
      boid.velocity.z += wanderZ * 0.001 * randoms.wanderIntensity;

      // Occasional direction changes (fish randomly decide to turn)
      if (Math.random() < 0.002) {
        boid.velocity.x += (Math.random() - 0.5) * 0.05;
        boid.velocity.y += (Math.random() - 0.5) * 0.02;
      }

      // COLLISION AVOIDANCE with other fish (gentle, not boid-like)
      boids.forEach(other => {
        if (boid === other) return;
        const dist = boid.position.distanceTo(other.position);
        if (dist < 3.0 && dist > 0) {
          // Gently move away from nearby fish
          const away = new THREE.Vector3().subVectors(boid.position, other.position);
          away.normalize();
          const avoidStrength = (3.0 - dist) * 0.002;
          boid.velocity.add(away.multiplyScalar(avoidStrength));
        }
      });

      // Apply gentle damping (fish glide through water)
      boid.velocity.multiplyScalar(0.995);

      // SMOOTH BOUNDARY AVOIDANCE (gradual turns, not bouncing)
      const softMargin = 4.0;
      const turnForce = 0.008;

      // X boundaries - smooth turn
      if (boid.position.x > BOUNDS.x - softMargin) {
        const proximity = (boid.position.x - (BOUNDS.x - softMargin)) / softMargin;
        boid.velocity.x -= turnForce * proximity * proximity;
        if (boid.velocity.x > 0) boid.velocity.x *= (1 - proximity * 0.3);
      } else if (boid.position.x < -BOUNDS.x + softMargin) {
        const proximity = ((-BOUNDS.x + softMargin) - boid.position.x) / softMargin;
        boid.velocity.x += turnForce * proximity * proximity;
        if (boid.velocity.x < 0) boid.velocity.x *= (1 - proximity * 0.3);
      }

      // Y boundaries - stronger floor avoidance
      if (boid.position.y > BOUNDS.yMax - softMargin) {
        const proximity = (boid.position.y - (BOUNDS.yMax - softMargin)) / softMargin;
        boid.velocity.y -= turnForce * proximity * proximity;
        if (boid.velocity.y > 0) boid.velocity.y *= (1 - proximity * 0.5);
      } else if (boid.position.y < BOUNDS.yMin + softMargin + 2) {
        // Extra margin for floor
        const proximity = ((BOUNDS.yMin + softMargin + 2) - boid.position.y) / (softMargin + 2);
        boid.velocity.y += turnForce * 1.5 * proximity * proximity;
        if (boid.velocity.y < 0) boid.velocity.y *= (1 - proximity * 0.7);
      }

      // Z boundaries
      if (boid.position.z > BOUNDS.z - softMargin) {
        const proximity = (boid.position.z - (BOUNDS.z - softMargin)) / softMargin;
        boid.velocity.z -= turnForce * proximity * proximity;
        if (boid.velocity.z > 0) boid.velocity.z *= (1 - proximity * 0.3);
      } else if (boid.position.z < -BOUNDS.z + softMargin) {
        const proximity = ((-BOUNDS.z + softMargin) - boid.position.z) / softMargin;
        boid.velocity.z += turnForce * proximity * proximity;
        if (boid.velocity.z < 0) boid.velocity.z *= (1 - proximity * 0.3);
      }

      // Maintain minimum swimming speed (fish always moving slightly)
      const speed = boid.velocity.length();
      if (speed < baseSpeed * 0.5) {
        // Gently accelerate in current direction or pick new direction
        if (speed > 0.01) {
          boid.velocity.normalize().multiplyScalar(baseSpeed * 0.6);
        } else {
          // Pick a random direction
          boid.velocity.set(
            (Math.random() - 0.5) * baseSpeed,
            (Math.random() - 0.5) * baseSpeed * 0.3,
            (Math.random() - 0.5) * baseSpeed * 0.2
          );
        }
      } else if (speed > maxSpeed) {
        boid.velocity.multiplyScalar(maxSpeed / speed);
      }

      // Update position
      boid.position.add(boid.velocity.clone().multiplyScalar(delta * 60));

      // Hard boundary clamp (safety net)
      boid.position.x = Math.max(-BOUNDS.x + 0.5, Math.min(BOUNDS.x - 0.5, boid.position.x));
      boid.position.y = Math.max(BOUNDS.yMin + 0.5, Math.min(BOUNDS.yMax - 0.5, boid.position.y));
      boid.position.z = Math.max(-BOUNDS.z + 0.5, Math.min(BOUNDS.z - 0.5, boid.position.z));

      boid.ref.position.copy(boid.position);

      // SMOOTH ROTATION - fish turn gradually, not instantly
      if (boid.velocity.length() > 0.02) {
        const targetQuat = new THREE.Quaternion();
        const lookDir = boid.velocity.clone().normalize();
        const lookMatrix = new THREE.Matrix4().lookAt(
          new THREE.Vector3(0, 0, 0),
          lookDir,
          new THREE.Vector3(0, 1, 0)
        );
        targetQuat.setFromRotationMatrix(lookMatrix);

        // Slerp for smooth rotation (fish don't snap to new directions)
        boid.ref.quaternion.slerp(targetQuat, 0.05 * randoms.turnRate);

        // Subtle banking when turning
        const turnAmount = boid.velocity.x;
        boid.bankAngle = -turnAmount * 0.2;
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