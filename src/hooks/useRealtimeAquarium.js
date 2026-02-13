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
    const time = now * 0.001;
    const shouldUpdateFirebase = (now - lastUpdateTime.current >= 150);
    if (shouldUpdateFirebase) {
      lastUpdateTime.current = now;
    }

    // POINTS OF INTEREST in the tank - fish are aware of their environment
    const pointsOfInterest = [
      { pos: new THREE.Vector3(-8, -8, -2), type: 'driftwood' },   // Driftwood
      { pos: new THREE.Vector3(0, -8, -7), type: 'rocks' },        // Rock formation
      { pos: new THREE.Vector3(10, -8, 3), type: 'coral' },        // Pink coral
      { pos: new THREE.Vector3(-12, -8, -4), type: 'coral' },      // Blue coral
      { pos: new THREE.Vector3(14, 5, -8), type: 'filter' },       // HOB filter area
      { pos: new THREE.Vector3(0, 0, 0), type: 'center' },         // Tank center
    ];

    // INTELLIGENT FISH MOVEMENT
    boids.forEach((boid, index) => {
      const randoms = boid.randoms || {
        speedMultiplier: 1.0,
        verticalBias: 0,
        wanderIntensity: 0.5,
        turnRate: 1.0,
        phaseOffset: 0,
        laziness: 0.5,
        curiosity: 0.5,
      };

      // Fish-specific time offset for varied behavior
      const fishTime = time + randoms.phaseOffset * 100;

      // Initialize fish state
      if (!boid.state) {
        boid.state = {
          mode: 'swimming', // swimming, investigating, resting, following
          modeStartTime: time,
          modeDuration: 8 + Math.random() * 12,
          currentInterest: null,
          swimDirection: Math.random() * Math.PI * 2,
          verticalPreference: (BOUNDS.yMax + BOUNDS.yMin) / 2 + randoms.verticalBias * 5,
          energy: 0.5 + Math.random() * 0.5, // Energy level affects behavior
        };
      }

      const state = boid.state;

      // Energy fluctuates over time - affects activity level
      state.energy += (Math.sin(fishTime * 0.05) * 0.001);
      state.energy = Math.max(0.2, Math.min(1.0, state.energy));

      // MODE TRANSITIONS based on time and random chance
      if (time > state.modeStartTime + state.modeDuration) {
        const energyFactor = state.energy;
        const roll = Math.random();

        if (roll < 0.1 * (1 - energyFactor)) {
          // Low energy = more likely to rest
          state.mode = 'resting';
          state.modeDuration = 8 + Math.random() * 20;
        } else if (roll < 0.3 && randoms.curiosity > 0.4) {
          // Curious fish investigate points of interest
          state.mode = 'investigating';
          state.currentInterest = pointsOfInterest[Math.floor(Math.random() * pointsOfInterest.length)];
          state.modeDuration = 5 + Math.random() * 10;
        } else if (roll < 0.4 && boids.length > 1) {
          // Sometimes follow another fish briefly
          state.mode = 'following';
          state.followTarget = boids[(index + 1 + Math.floor(Math.random() * (boids.length - 1))) % boids.length];
          state.modeDuration = 3 + Math.random() * 6;
        } else {
          // Default: free swimming
          state.mode = 'swimming';
          state.swimDirection = Math.random() * Math.PI * 2;
          state.modeDuration = 10 + Math.random() * 15;
        }
        state.modeStartTime = time;
      }

      // Calculate desired velocity based on mode
      let desiredVelocity = new THREE.Vector3();
      let maxSpeed = 0.2 * randoms.speedMultiplier * state.energy;

      switch (state.mode) {
        case 'swimming':
          // Smooth, curved swimming path
          // Direction gradually changes using sine waves
          const turnRate = 0.3 + randoms.wanderIntensity * 0.3;
          state.swimDirection += Math.sin(fishTime * turnRate) * 0.02;
          state.swimDirection += Math.cos(fishTime * turnRate * 0.7) * 0.015;

          // Horizontal movement
          desiredVelocity.x = Math.cos(state.swimDirection) * maxSpeed;
          desiredVelocity.z = Math.sin(state.swimDirection) * maxSpeed * 0.5;

          // Vertical: gently move toward preferred depth
          const yDiff = state.verticalPreference - boid.position.y;
          desiredVelocity.y = yDiff * 0.02;

          // Occasionally change vertical preference
          if (Math.random() < 0.002) {
            state.verticalPreference = (BOUNDS.yMax + BOUNDS.yMin) / 2 +
              randoms.verticalBias * 5 + (Math.random() - 0.5) * 6;
            state.verticalPreference = Math.max(BOUNDS.yMin + 3, Math.min(BOUNDS.yMax - 2, state.verticalPreference));
          }
          break;

        case 'investigating':
          // Swim toward point of interest
          if (state.currentInterest) {
            const toInterest = new THREE.Vector3().subVectors(state.currentInterest.pos, boid.position);
            const dist = toInterest.length();

            if (dist > 2) {
              // Approach smoothly
              toInterest.normalize();
              desiredVelocity.copy(toInterest).multiplyScalar(maxSpeed * 0.8);
            } else {
              // Circle around the point of interest
              const circleAngle = fishTime * 0.5;
              desiredVelocity.x = Math.cos(circleAngle) * maxSpeed * 0.4;
              desiredVelocity.z = Math.sin(circleAngle) * maxSpeed * 0.3;
              desiredVelocity.y = Math.sin(fishTime * 0.8) * maxSpeed * 0.2;
            }
          }
          break;

        case 'following':
          // Follow another fish at a distance
          if (state.followTarget && state.followTarget.position) {
            const toTarget = new THREE.Vector3().subVectors(state.followTarget.position, boid.position);
            const dist = toTarget.length();

            if (dist > 5) {
              // Catch up
              toTarget.normalize();
              desiredVelocity.copy(toTarget).multiplyScalar(maxSpeed * 1.1);
            } else if (dist > 2) {
              // Maintain distance, swim alongside
              const perpendicular = new THREE.Vector3(-toTarget.z, 0, toTarget.x).normalize();
              desiredVelocity.copy(perpendicular).multiplyScalar(maxSpeed * 0.5);
              desiredVelocity.add(toTarget.normalize().multiplyScalar(maxSpeed * 0.3));
            } else {
              // Too close, drift away slightly
              toTarget.normalize();
              desiredVelocity.copy(toTarget).multiplyScalar(-maxSpeed * 0.3);
            }
          } else {
            state.mode = 'swimming';
          }
          break;

        case 'resting':
          // Minimal movement, gentle hovering
          maxSpeed = 0.03;
          desiredVelocity.x = Math.sin(fishTime * 1.5) * 0.01;
          desiredVelocity.y = Math.sin(fishTime * 1.2) * 0.008;
          desiredVelocity.z = Math.cos(fishTime * 1.3) * 0.005;

          // Slowly regain energy while resting
          state.energy += 0.0005;
          break;
      }

      // SMOOTH STEERING - gradually adjust velocity toward desired
      const steerForce = state.mode === 'resting' ? 0.02 : 0.04;
      boid.velocity.lerp(desiredVelocity, steerForce);

      // COLLISION AVOIDANCE with other fish
      boids.forEach((other, otherIndex) => {
        if (index === otherIndex) return;
        const diff = new THREE.Vector3().subVectors(boid.position, other.position);
        const dist = diff.length();

        if (dist < 3.5 && dist > 0) {
          diff.normalize();
          const avoidForce = (3.5 - dist) / 3.5 * 0.008;
          boid.velocity.add(diff.multiplyScalar(avoidForce));
        }
      });

      // INTELLIGENT BOUNDARY AVOIDANCE
      // Fish sense walls early and smoothly turn away
      const senseDistance = 8.0;
      const avoidStrength = 0.012;

      // X walls
      if (boid.position.x > BOUNDS.x - senseDistance) {
        const t = (boid.position.x - (BOUNDS.x - senseDistance)) / senseDistance;
        boid.velocity.x -= avoidStrength * t * t * 2;
        // Also turn the swim direction away from wall
        if (state.mode === 'swimming' && Math.cos(state.swimDirection) > 0) {
          state.swimDirection += 0.05 * t;
        }
      } else if (boid.position.x < -BOUNDS.x + senseDistance) {
        const t = ((-BOUNDS.x + senseDistance) - boid.position.x) / senseDistance;
        boid.velocity.x += avoidStrength * t * t * 2;
        if (state.mode === 'swimming' && Math.cos(state.swimDirection) < 0) {
          state.swimDirection -= 0.05 * t;
        }
      }

      // Y boundaries (floor and surface)
      if (boid.position.y > BOUNDS.yMax - senseDistance * 0.7) {
        const t = (boid.position.y - (BOUNDS.yMax - senseDistance * 0.7)) / (senseDistance * 0.7);
        boid.velocity.y -= avoidStrength * t * t * 2;
        state.verticalPreference = Math.min(state.verticalPreference, BOUNDS.yMax - 4);
      } else if (boid.position.y < BOUNDS.yMin + senseDistance) {
        const t = ((BOUNDS.yMin + senseDistance) - boid.position.y) / senseDistance;
        boid.velocity.y += avoidStrength * t * t * 3; // Stronger floor avoidance
        state.verticalPreference = Math.max(state.verticalPreference, BOUNDS.yMin + 4);
      }

      // Z walls
      if (boid.position.z > BOUNDS.z - senseDistance) {
        const t = (boid.position.z - (BOUNDS.z - senseDistance)) / senseDistance;
        boid.velocity.z -= avoidStrength * t * t * 1.5;
      } else if (boid.position.z < -BOUNDS.z + senseDistance) {
        const t = ((-BOUNDS.z + senseDistance) - boid.position.z) / senseDistance;
        boid.velocity.z += avoidStrength * t * t * 1.5;
      }

      // Apply gentle damping
      boid.velocity.multiplyScalar(0.98);

      // Clamp speed
      const speed = boid.velocity.length();
      const actualMaxSpeed = state.mode === 'resting' ? 0.05 : maxSpeed * 1.2;
      if (speed > actualMaxSpeed) {
        boid.velocity.multiplyScalar(actualMaxSpeed / speed);
      }

      // Minimum speed (except resting)
      if (state.mode !== 'resting' && speed < 0.03) {
        if (speed > 0.001) {
          boid.velocity.normalize().multiplyScalar(0.03);
        } else {
          boid.velocity.set(0.03, 0, 0);
        }
      }

      // Update position
      boid.position.add(boid.velocity.clone().multiplyScalar(delta * 60));

      // Hard clamp
      boid.position.x = Math.max(-BOUNDS.x + 0.5, Math.min(BOUNDS.x - 0.5, boid.position.x));
      boid.position.y = Math.max(BOUNDS.yMin + 0.5, Math.min(BOUNDS.yMax - 0.5, boid.position.y));
      boid.position.z = Math.max(-BOUNDS.z + 0.5, Math.min(BOUNDS.z - 0.5, boid.position.z));

      boid.ref.position.copy(boid.position);

      // SMOOTH ROTATION toward movement direction
      if (speed > 0.01) {
        const targetQuat = new THREE.Quaternion();
        const lookDir = boid.velocity.clone().normalize();
        const lookMatrix = new THREE.Matrix4().lookAt(
          new THREE.Vector3(0, 0, 0),
          lookDir,
          new THREE.Vector3(0, 1, 0)
        );
        targetQuat.setFromRotationMatrix(lookMatrix);

        const rotSpeed = state.mode === 'resting' ? 0.03 : 0.07;
        boid.ref.quaternion.slerp(targetQuat, rotSpeed);

        boid.bankAngle = -boid.velocity.x * 0.12;
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