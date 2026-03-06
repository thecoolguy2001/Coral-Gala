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

// Coral obstacle spheres for collision avoidance
// Positions match TankContainer.jsx coral placements (floorY ≈ -11.2)
// Y raised to approximate visual center of mass; radii slightly larger than visual
const CORAL_OBSTACLES = [
  { position: new THREE.Vector3(0, -10.5, -3), radius: 3.5 },      // Red coral (center)
  { position: new THREE.Vector3(-14, -9.5, -6), radius: 4.0 },     // Chromaflare (back left)
  { position: new THREE.Vector3(14, -9.5, -6), radius: 3.5 },      // Blue coral (back right)
  { position: new THREE.Vector3(-16, -10.0, 0), radius: 2.0 },     // Lowpoly coral (left)
  { position: new THREE.Vector3(16, -10.0, 0), radius: 1.8 },      // Lowpoly coral 2 (right)
  { position: new THREE.Vector3(-13, -10.5, 5), radius: 1.0 },     // Coral accent (front left)
  { position: new THREE.Vector3(13, -10.5, 5), radius: 1.8 },      // Coral 2 accent (front right)
];

const useRealtimeAquarium = (fishData) => {
  const [isMaster, setIsMaster] = useState(false);
  const [realtimePositions, setRealtimePositions] = useState({});
  const sessionId = useRef(Math.random().toString(36).substr(2, 9));
  const lastUpdateTime = useRef(Date.now());
  const heartbeatInterval = useRef(null);

  // Feed target position (ref to avoid re-renders)
  const feedTargetRef = useRef(null);
  const feedStartTimeRef = useRef(0);

  const setFeedTarget = (position) => {
    if (position) {
      feedTargetRef.current = new THREE.Vector3(...position);
      feedStartTimeRef.current = -1; // will be set to clock.elapsedTime on first boid update
    } else {
      feedTargetRef.current = null;
      feedStartTimeRef.current = 0;
    }
  };

  // Store persistent random values for each fish (for natural variation)
  const fishRandomsRef = useRef({});

  const [boids, setBoids] = useState([]);

  // Helper function to validate position is within bounds
  const isValidPosition = (pos) => {
    if (!Array.isArray(pos) || pos.length !== 3) return false;
    return Math.abs(pos[0]) <= BOUNDS.x &&
           pos[1] >= BOUNDS.yMin &&
           pos[1] <= BOUNDS.yMax &&
           Math.abs(pos[2]) <= BOUNDS.z;
  };

  // Create a single new boid from fish data
  const createBoid = (f) => {
    // Generate or retrieve persistent random values
    if (!fishRandomsRef.current[f.id]) {
      fishRandomsRef.current[f.id] = {
        phaseOffset: Math.random() * Math.PI * 2,
        speedMultiplier: 0.3 + Math.random() * 0.8,
        verticalBias: (Math.random() - 0.5) * 2,
        wanderIntensity: 0.3 + Math.random() * 0.7,
        turnRate: 0.8 + Math.random() * 0.4,
        wiggleAmount: 0.8 + Math.random() * 0.4,
        laziness: Math.random(),
        curiosity: Math.random(),
        preferredZoneX: Math.random(),
        preferredZoneZ: Math.random(),
      };
    }

    // Position
    let positionArray;
    if (f.position && isValidPosition(f.position)) {
      positionArray = f.position;
    } else {
      const fishRandoms = fishRandomsRef.current[f.id];
      const phase = fishRandoms ? fishRandoms.phaseOffset : Math.random() * Math.PI * 2;
      const yRange = BOUNDS.yMax - BOUNDS.yMin;
      const yMid = (BOUNDS.yMax + BOUNDS.yMin) / 2;

      const xSpread = Math.cos(phase * 2.7) * BOUNDS.x * 0.85;
      const zSpread = Math.sin(phase * 1.9) * BOUNDS.z * 0.85;
      const yOffset = Math.sin(phase * 3.1) * yRange * 0.45;

      positionArray = [
        xSpread + (Math.random() - 0.5) * 4,
        yMid + yOffset + (fishRandoms?.verticalBias || 0) * 4,
        zSpread + (Math.random() - 0.5) * 4
      ];

      positionArray[0] = Math.max(-BOUNDS.x + 2, Math.min(BOUNDS.x - 2, positionArray[0]));
      positionArray[1] = Math.max(BOUNDS.yMin + 2, Math.min(BOUNDS.yMax - 2, positionArray[1]));
      positionArray[2] = Math.max(-BOUNDS.z + 1, Math.min(BOUNDS.z - 1, positionArray[2]));
    }

    // Velocity
    let velocityArray;
    if (f.velocity && Array.isArray(f.velocity) && f.velocity.length === 3) {
      velocityArray = f.velocity;
    } else {
      const fishRandoms = fishRandomsRef.current[f.id];
      const angle = fishRandoms ? fishRandoms.phaseOffset * 3 : Math.random() * Math.PI * 2;
      const speed = 0.06 + Math.random() * 0.04;
      velocityArray = [
        Math.cos(angle) * speed,
        (Math.random() - 0.5) * 0.03,
        Math.sin(angle) * speed * 0.8,
      ];
    }

    return {
      ...f,
      position: new THREE.Vector3(...positionArray),
      velocity: new THREE.Vector3(...velocityArray),
      ref: new THREE.Object3D(),
      randoms: fishRandomsRef.current[f.id],
    };
  };

  useEffect(() => {
    if (!fishData || fishData.length === 0) return;

    setBoids(prevBoids => {
      // Build map of existing boids by ID — preserve their simulation state
      const existingMap = new Map();
      prevBoids.forEach(b => existingMap.set(b.id, b));

      let changed = false;
      const newBoids = fishData.map(f => {
        if (existingMap.has(f.id)) {
          // Existing fish — keep current boid (preserves position, velocity, state)
          const existing = existingMap.get(f.id);
          // Update display properties that may have changed
          existing.color = f.color;
          existing.name = f.name;
          existing.size = f.size;
          existing.species = f.species;
          return existing;
        }

        // New fish — create fresh boid
        changed = true;
        return createBoid(f);
      });

      // Check if fish were removed
      if (newBoids.length !== prevBoids.length) changed = true;

      return changed ? newBoids : prevBoids;
    });
  }, [fishData]);

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

    // POINTS OF INTEREST spread across full tank volume
    const pointsOfInterest = [
      { pos: new THREE.Vector3(-12, -9, -5), type: 'coral' },      // Back left bottom coral
      { pos: new THREE.Vector3(12, -9, -5), type: 'coral' },       // Back right bottom coral
      { pos: new THREE.Vector3(0, -9, 5), type: 'coral' },         // Front center bottom
      { pos: new THREE.Vector3(-14, -5, 4), type: 'driftwood' },   // Front left mid
      { pos: new THREE.Vector3(14, -5, -4), type: 'rocks' },       // Back right mid
      { pos: new THREE.Vector3(14, 5, -6), type: 'filter' },       // HOB filter area (high back)
      { pos: new THREE.Vector3(0, 7, 0), type: 'surface' },        // Near water surface center
      { pos: new THREE.Vector3(-10, 3, 5), type: 'surface' },      // Front left high
      { pos: new THREE.Vector3(10, -8, 6), type: 'coral' },        // Front right bottom
      { pos: new THREE.Vector3(0, -3, -6), type: 'center' },       // Back center mid
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
          mode: 'swimming', // swimming, investigating, resting, following, feeding
          modeStartTime: time,
          modeDuration: 8 + Math.random() * 12,
          currentInterest: null,
          swimDirection: Math.random() * Math.PI * 2,
          verticalPreference: (BOUNDS.yMax + BOUNDS.yMin) / 2 + randoms.verticalBias * 9,
          energy: 0.5 + Math.random() * 0.5,
          hunger: 30 + Math.random() * 40, // 0 = starving, 100 = full
          postFeedMode: null,
          postFeedEnd: 0,
          isEating: false,
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

        if (roll < 0.1 * (1 - energyFactor) + randoms.laziness * 0.25) {
          // Low energy or lazy fish rest more often and longer
          state.mode = 'resting';
          state.modeDuration = 8 + Math.random() * 20 + randoms.laziness * 15;
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

      // FEEDING BEHAVIOR - wait for food to sink into water before reacting
      // Sync feed start time to clock.elapsedTime on first frame after feed event
      if (feedTargetRef.current && feedStartTimeRef.current === -1) {
        feedStartTimeRef.current = time;
      }
      const feedAge = feedStartTimeRef.current > 0 ? time - feedStartTimeRef.current : 999;
      if (feedTargetRef.current && !state.postFeedMode && feedAge > 3.0) {
        const hunger = state.hunger !== undefined ? state.hunger : 50;
        const isGreedy = (randoms.curiosity > 0.7 || randoms.laziness < 0.2);

        const wantsToEat = hunger < 80 || isGreedy;

        if (wantsToEat && state.mode !== 'feeding') {
          // Stagger reaction — not all fish notice at the same time
          const noticeDelay = randoms.laziness * 2 + Math.random() * 1;
          if (feedAge > 3.0 + noticeDelay) {
            state.mode = 'feeding';
            state.modeStartTime = time;
          }
        }
      }

      // When feed target removed, disperse fish AWAY from food and resume swimming
      if (!feedTargetRef.current && state.mode === 'feeding') {
        state.mode = 'swimming';
        state.modeStartTime = time;

        // Compute swim direction pointing AWAY from where food was
        if (state._lastFoodPos) {
          const awayAngle = Math.atan2(
            boid.position.z - state._lastFoodPos.z,
            boid.position.x - state._lastFoodPos.x
          );
          // Add random spread so fish don't all swim in a line
          state.swimDirection = awayAngle + (Math.random() - 0.5) * (Math.PI / 1.5);
          state._lastFoodPos = null;
        } else {
          state.swimDirection = Math.random() * Math.PI * 2;
        }

        // Randomize vertical preference to spread them out
        state.verticalPreference = BOUNDS.yMin + 2 + Math.random() * (BOUNDS.yMax - BOUNDS.yMin - 4);

        // Brief zoomies for energetic fish, everyone else resumes normal immediately
        if (randoms.speedMultiplier > 1.1 || randoms.wanderIntensity > 0.7) {
          state.postFeedMode = 'zoomies';
          state.postFeedEnd = time + 1 + Math.random() * 1;
        } else {
          state.postFeedMode = null;
        }
      }

      // Clear post-feed mode when timer expires
      if (state.postFeedMode && time > state.postFeedEnd) {
        state.postFeedMode = null;
      }

      // Calculate desired velocity based on mode
      let desiredVelocity = new THREE.Vector3();
      // Base speed reduced, lazy fish are noticeably slower
      const lazyFactor = 1.0 - randoms.laziness * 0.6; // lazy fish get 40-100% speed
      let maxSpeed = 0.12 * randoms.speedMultiplier * state.energy * lazyFactor;

      switch (state.mode) {
        case 'swimming':
          // Smooth, curved swimming path
          // Direction gradually changes using sine waves
          const turnRate = 0.3 + randoms.wanderIntensity * 0.3;
          state.swimDirection += Math.sin(fishTime * turnRate) * 0.02;
          state.swimDirection += Math.cos(fishTime * turnRate * 0.7) * 0.015;

          // Horizontal movement — full speed on both X and Z axes
          desiredVelocity.x = Math.cos(state.swimDirection) * maxSpeed;
          desiredVelocity.z = Math.sin(state.swimDirection) * maxSpeed * 0.9;

          // Vertical: gently move toward preferred depth
          const yDiff = state.verticalPreference - boid.position.y;
          desiredVelocity.y = yDiff * 0.03;

          // Regularly change vertical preference — explore full depth
          if (Math.random() < 0.005) {
            state.verticalPreference = BOUNDS.yMin + 2 + Math.random() * (BOUNDS.yMax - BOUNDS.yMin - 4);
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
              desiredVelocity.z = Math.sin(circleAngle) * maxSpeed * 0.4;
              desiredVelocity.y = Math.sin(fishTime * 0.8) * maxSpeed * 0.3;
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

        case 'feeding':
          // Swim toward food based on hunger
          if (feedTargetRef.current) {
            // Track food position so we can swim AWAY when food clears
            state._lastFoodPos = { x: feedTargetRef.current.x, z: feedTargetRef.current.z };
            const toFood = new THREE.Vector3().subVectors(feedTargetRef.current, boid.position);
            const foodDist = toFood.length();
            const hunger = state.hunger !== undefined ? state.hunger : 50;

            // Speed based on hunger
            let feedSpeed;
            if (hunger < 40) {
              feedSpeed = maxSpeed * 1.5; // Hungry - rush
            } else {
              feedSpeed = maxSpeed * 1.2; // Normal approach
            }

            if (foodDist > 3) {
              // Steer toward food
              toFood.normalize();
              desiredVelocity.copy(toFood).multiplyScalar(feedSpeed);
            } else {
              // Circle/nibble around food
              const nibbleAngle = fishTime * 2 + randoms.phaseOffset;
              desiredVelocity.x = Math.cos(nibbleAngle) * feedSpeed * 0.3;
              desiredVelocity.z = Math.sin(nibbleAngle) * feedSpeed * 0.3;
              desiredVelocity.y = Math.sin(fishTime * 3) * 0.02;

              // "Eat" - increment hunger
              if (!state.lastAteTime || time - state.lastAteTime > 1.5) {
                state.hunger = Math.min(100, (state.hunger || 50) + 15 + Math.random() * 10);
                state.lastAteTime = time;
                state.isEating = true;
                setTimeout(() => { state.isEating = false; }, 500);
              }
            }
            maxSpeed = feedSpeed;
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

      // Post-feeding behavior modifiers
      if (state.postFeedMode === 'zoomies') {
        maxSpeed *= 1.5;
        desiredVelocity.x += Math.sin(fishTime * 5) * maxSpeed * 0.5;
        desiredVelocity.z += Math.cos(fishTime * 4.3) * maxSpeed * 0.4;
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

      // CORAL OBSTACLE AVOIDANCE
      for (let ci = 0; ci < CORAL_OBSTACLES.length; ci++) {
        const obstacle = CORAL_OBSTACLES[ci];
        const diff = new THREE.Vector3().subVectors(boid.position, obstacle.position);
        const dist = diff.length();
        const avoidRadius = obstacle.radius + 1.5;

        if (dist < avoidRadius && dist > 0) {
          diff.normalize();
          const penetration = (avoidRadius - dist) / avoidRadius;
          const coralAvoidForce = penetration * penetration * 0.015;
          boid.velocity.add(diff.multiplyScalar(coralAvoidForce));

          // Nudge swim direction away from coral
          if (state.mode === 'swimming') {
            const awayAngle = Math.atan2(diff.z, diff.x);
            const angleDiff = awayAngle - state.swimDirection;
            state.swimDirection += Math.sign(angleDiff) * 0.03 * penetration;
          }
        }
      }

      // INTELLIGENT BOUNDARY AVOIDANCE
      // Fish sense walls early and smoothly turn away
      const senseDistance = 4.0;
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
        boid.velocity.y += avoidStrength * t * t * 1.5; // Gentle floor avoidance — let fish explore the bottom
        state.verticalPreference = Math.max(state.verticalPreference, BOUNDS.yMin + 2);
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

      // Minimum speed — lazy fish can drift very slowly
      const minSpeed = state.mode === 'resting' ? 0.005 : 0.01 + (1 - randoms.laziness) * 0.015;
      if (speed < minSpeed && state.mode !== 'resting') {
        if (speed > 0.001) {
          boid.velocity.normalize().multiplyScalar(minSpeed);
        } else {
          boid.velocity.set(minSpeed, 0, 0);
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
    return { boids, isMaster: true, setFeedTarget };
  } else {
    return { boids, isMaster: false, setFeedTarget };
  }
};

export default useRealtimeAquarium; 