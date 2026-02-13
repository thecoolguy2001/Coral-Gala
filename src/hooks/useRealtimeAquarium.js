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
          // PERSONALITY: How lazy is this fish? (0 = always active, 1 = very lazy)
          laziness: Math.random(),
          // PERSONALITY: How much does this fish like to explore? (0 = stays put, 1 = explorer)
          curiosity: Math.random(),
          // Preferred zone in tank (0 = left, 0.5 = center, 1 = right)
          preferredZoneX: 0.3 + Math.random() * 0.4, // Bias toward center
          preferredZoneZ: 0.3 + Math.random() * 0.4, // Bias toward center
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
        // Generate unique spawn position based on fish's random properties
        const fishRandoms = fishRandomsRef.current[f.id];
        const phase = fishRandoms ? fishRandoms.phaseOffset : Math.random() * Math.PI * 2;
        const yRange = BOUNDS.yMax - BOUNDS.yMin;
        const yMid = (BOUNDS.yMax + BOUNDS.yMin) / 2;

        // Spread fish across tank using their unique phase
        const xSpread = Math.cos(phase * 2.7) * BOUNDS.x * 0.6;
        const zSpread = Math.sin(phase * 1.9) * BOUNDS.z * 0.5;
        const yOffset = Math.sin(phase * 3.1) * yRange * 0.25;

        positionArray = [
          xSpread + (Math.random() - 0.5) * 3,
          yMid + yOffset + (fishRandoms?.verticalBias || 0) * 2,
          zSpread + (Math.random() - 0.5) * 2
        ];

        // Clamp to safe bounds
        positionArray[0] = Math.max(-BOUNDS.x + 2, Math.min(BOUNDS.x - 2, positionArray[0]));
        positionArray[1] = Math.max(BOUNDS.yMin + 2, Math.min(BOUNDS.yMax - 2, positionArray[1]));
        positionArray[2] = Math.max(-BOUNDS.z + 1, Math.min(BOUNDS.z - 1, positionArray[2]));

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
        // Use the fish's unique phase offset for initial direction
        const fishRandoms = fishRandomsRef.current[f.id];
        const angle = fishRandoms ? fishRandoms.phaseOffset * 3 : Math.random() * Math.PI * 2;
        const speed = 0.06 + Math.random() * 0.04;
        velocityArray = [
          Math.cos(angle) * speed,
          (Math.random() - 0.5) * 0.02,
          Math.sin(angle) * speed * 0.3,
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
    const time = now * 0.001; // Time in seconds
    const shouldUpdateFirebase = (now - lastUpdateTime.current >= 150);
    if (shouldUpdateFirebase) {
      lastUpdateTime.current = now;
    }

    // REALISTIC FISH BEHAVIOR with states: RESTING, CRUISING, ACTIVE
    // Based on research: fish move with purpose, rest periodically, and explore naturally

    boids.forEach(boid => {
      const randoms = boid.randoms || {
        speedMultiplier: 1.0,
        verticalBias: 0,
        wanderIntensity: 0.5,
        turnRate: 1.0,
        phaseOffset: 0,
        laziness: 0.5,
        curiosity: 0.5,
        preferredZoneX: 0.5,
        preferredZoneZ: 0.5,
      };

      // Initialize behavioral state
      if (!boid.behaviorState) {
        boid.behaviorState = Math.random() < randoms.laziness ? 'RESTING' : 'CRUISING';
        boid.stateChangeTime = time + 3 + Math.random() * 10;
        boid.restingSpot = null;
      }

      // STATE TRANSITIONS - fish change behavior over time
      if (time > boid.stateChangeTime) {
        const roll = Math.random();
        const lazinessThreshold = randoms.laziness * 0.4; // Lazy fish rest more
        const activeThreshold = lazinessThreshold + (1 - randoms.laziness) * 0.3;

        if (roll < lazinessThreshold) {
          boid.behaviorState = 'RESTING';
          boid.stateChangeTime = time + 5 + Math.random() * 15; // Rest for 5-20 seconds
          boid.restingSpot = boid.position.clone();
        } else if (roll < activeThreshold) {
          boid.behaviorState = 'ACTIVE';
          boid.stateChangeTime = time + 3 + Math.random() * 8; // Active for 3-11 seconds
        } else {
          boid.behaviorState = 'CRUISING';
          boid.stateChangeTime = time + 5 + Math.random() * 12; // Cruise for 5-17 seconds
        }
      }

      // PREFERRED ZONE - fish like to stay in their comfort area (center-biased)
      const preferredX = (randoms.preferredZoneX - 0.5) * BOUNDS.x * 0.6;
      const preferredZ = (randoms.preferredZoneZ - 0.5) * BOUNDS.z * 0.6;
      const preferredY = (BOUNDS.yMax + BOUNDS.yMin) / 2 + randoms.verticalBias * 4;

      // Speed based on state and personality
      let targetSpeed;
      let steerStrength;

      switch (boid.behaviorState) {
        case 'RESTING':
          // Fish hovers in place with minimal movement
          targetSpeed = 0.02 + Math.random() * 0.02;
          steerStrength = 0.001;
          // Gentle drift toward resting spot
          if (boid.restingSpot) {
            const toRest = new THREE.Vector3().subVectors(boid.restingSpot, boid.position);
            if (toRest.length() > 0.5) {
              toRest.normalize().multiplyScalar(0.001);
              boid.velocity.add(toRest);
            }
          }
          // Very slow, subtle fin movements
          const restWobble = Math.sin(time * 2 + randoms.phaseOffset) * 0.002;
          boid.velocity.x += restWobble;
          boid.velocity.y += Math.sin(time * 1.5 + randoms.phaseOffset) * 0.001;
          break;

        case 'CRUISING':
          // Relaxed, purposeful swimming
          targetSpeed = 0.15 * randoms.speedMultiplier;
          steerStrength = 0.003;

          // Gentle pull toward preferred zone
          const toPrefCruise = new THREE.Vector3(
            preferredX - boid.position.x,
            preferredY - boid.position.y,
            preferredZ - boid.position.z
          );
          toPrefCruise.multiplyScalar(0.0005);
          boid.velocity.add(toPrefCruise);

          // Smooth curves using sine waves
          const cruiseTime = time * 0.5 + randoms.phaseOffset * 5;
          boid.velocity.x += Math.sin(cruiseTime * 0.7) * 0.003 * randoms.wanderIntensity;
          boid.velocity.y += Math.sin(cruiseTime * 0.4) * 0.001;
          boid.velocity.z += Math.cos(cruiseTime * 0.5) * 0.002 * randoms.wanderIntensity;
          break;

        case 'ACTIVE':
          // Energetic exploration
          targetSpeed = 0.3 * randoms.speedMultiplier;
          steerStrength = 0.005;

          // Pick exploration targets based on curiosity
          if (!boid.exploreTarget || boid.position.distanceTo(boid.exploreTarget) < 3) {
            // Curious fish explore further, others stay closer to preferred zone
            const exploreRange = randoms.curiosity * 0.8 + 0.2;
            boid.exploreTarget = new THREE.Vector3(
              preferredX + (Math.random() - 0.5) * BOUNDS.x * exploreRange,
              preferredY + (Math.random() - 0.5) * 6,
              preferredZ + (Math.random() - 0.5) * BOUNDS.z * exploreRange
            );
            // Clamp to safe bounds
            boid.exploreTarget.x = Math.max(-BOUNDS.x + 3, Math.min(BOUNDS.x - 3, boid.exploreTarget.x));
            boid.exploreTarget.y = Math.max(BOUNDS.yMin + 2, Math.min(BOUNDS.yMax - 2, boid.exploreTarget.y));
            boid.exploreTarget.z = Math.max(-BOUNDS.z + 2, Math.min(BOUNDS.z - 2, boid.exploreTarget.z));
          }

          // Steer toward exploration target
          const toExplore = new THREE.Vector3().subVectors(boid.exploreTarget, boid.position);
          toExplore.normalize().multiplyScalar(steerStrength);
          boid.velocity.add(toExplore);

          // Quick, darting movements
          if (Math.random() < 0.01) {
            boid.velocity.x += (Math.random() - 0.5) * 0.08;
            boid.velocity.y += (Math.random() - 0.5) * 0.03;
          }
          break;
      }

      // COLLISION AVOIDANCE with other fish
      boids.forEach(other => {
        if (boid === other) return;
        const dist = boid.position.distanceTo(other.position);
        if (dist < 4.0 && dist > 0) {
          const away = new THREE.Vector3().subVectors(boid.position, other.position);
          away.normalize();
          const avoidStrength = (4.0 - dist) * 0.003;
          boid.velocity.add(away.multiplyScalar(avoidStrength));
        }
      });

      // Apply damping based on state
      const dampingFactor = boid.behaviorState === 'RESTING' ? 0.98 : 0.995;
      boid.velocity.multiplyScalar(dampingFactor);

      // STRONG BOUNDARY AVOIDANCE - fish naturally avoid walls
      const wallMargin = 6.0; // Start turning earlier
      const wallForce = 0.015; // Stronger turn

      // X boundaries
      if (boid.position.x > BOUNDS.x - wallMargin) {
        const proximity = (boid.position.x - (BOUNDS.x - wallMargin)) / wallMargin;
        boid.velocity.x -= wallForce * proximity * (1 + proximity);
        if (boid.velocity.x > 0) boid.velocity.x *= (1 - proximity * 0.5);
      } else if (boid.position.x < -BOUNDS.x + wallMargin) {
        const proximity = ((-BOUNDS.x + wallMargin) - boid.position.x) / wallMargin;
        boid.velocity.x += wallForce * proximity * (1 + proximity);
        if (boid.velocity.x < 0) boid.velocity.x *= (1 - proximity * 0.5);
      }

      // Y boundaries
      if (boid.position.y > BOUNDS.yMax - wallMargin) {
        const proximity = (boid.position.y - (BOUNDS.yMax - wallMargin)) / wallMargin;
        boid.velocity.y -= wallForce * proximity * (1 + proximity);
      } else if (boid.position.y < BOUNDS.yMin + wallMargin) {
        const proximity = ((BOUNDS.yMin + wallMargin) - boid.position.y) / wallMargin;
        boid.velocity.y += wallForce * 1.5 * proximity * (1 + proximity);
      }

      // Z boundaries
      if (boid.position.z > BOUNDS.z - wallMargin) {
        const proximity = (boid.position.z - (BOUNDS.z - wallMargin)) / wallMargin;
        boid.velocity.z -= wallForce * proximity * (1 + proximity);
      } else if (boid.position.z < -BOUNDS.z + wallMargin) {
        const proximity = ((-BOUNDS.z + wallMargin) - boid.position.z) / wallMargin;
        boid.velocity.z += wallForce * proximity * (1 + proximity);
      }

      // CENTER PULL - subtle force keeping fish away from walls
      const centerPull = 0.0003;
      if (Math.abs(boid.position.x) > BOUNDS.x * 0.5) {
        boid.velocity.x -= Math.sign(boid.position.x) * centerPull;
      }
      if (Math.abs(boid.position.z) > BOUNDS.z * 0.5) {
        boid.velocity.z -= Math.sign(boid.position.z) * centerPull;
      }

      // Speed limits based on state
      const speed = boid.velocity.length();
      const maxSpeed = boid.behaviorState === 'ACTIVE' ? 0.4 :
                       boid.behaviorState === 'CRUISING' ? 0.25 : 0.08;
      const minSpeed = boid.behaviorState === 'RESTING' ? 0.01 : 0.05;

      if (speed > maxSpeed) {
        boid.velocity.multiplyScalar(maxSpeed / speed);
      } else if (speed < minSpeed && boid.behaviorState !== 'RESTING') {
        boid.velocity.normalize().multiplyScalar(minSpeed);
      }

      // Update position
      boid.position.add(boid.velocity.clone().multiplyScalar(delta * 60));

      // Hard boundary clamp
      boid.position.x = Math.max(-BOUNDS.x + 0.5, Math.min(BOUNDS.x - 0.5, boid.position.x));
      boid.position.y = Math.max(BOUNDS.yMin + 0.5, Math.min(BOUNDS.yMax - 0.5, boid.position.y));
      boid.position.z = Math.max(-BOUNDS.z + 0.5, Math.min(BOUNDS.z - 0.5, boid.position.z));

      boid.ref.position.copy(boid.position);

      // SMOOTH ROTATION
      if (boid.velocity.length() > 0.01) {
        const targetQuat = new THREE.Quaternion();
        const lookDir = boid.velocity.clone().normalize();
        const lookMatrix = new THREE.Matrix4().lookAt(
          new THREE.Vector3(0, 0, 0),
          lookDir,
          new THREE.Vector3(0, 1, 0)
        );
        targetQuat.setFromRotationMatrix(lookMatrix);

        // Rotation speed based on state
        const rotSpeed = boid.behaviorState === 'RESTING' ? 0.02 : 0.06;
        boid.ref.quaternion.slerp(targetQuat, rotSpeed * randoms.turnRate);

        boid.bankAngle = -boid.velocity.x * 0.15;
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