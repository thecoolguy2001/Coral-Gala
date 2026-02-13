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

    // FLOWING FISH MOVEMENT - No targets, just continuous swimming
    // Each fish has a "heading" that slowly drifts using noise-like patterns

    boids.forEach((boid, index) => {
      const randoms = boid.randoms || {
        speedMultiplier: 1.0,
        verticalBias: 0,
        wanderIntensity: 0.5,
        turnRate: 1.0,
        phaseOffset: 0,
      };

      // Initialize heading angle if not set
      if (boid.headingAngle === undefined) {
        boid.headingAngle = randoms.phaseOffset * 2; // Start facing different directions
        boid.verticalAngle = randoms.verticalBias * 0.3;
        boid.currentSpeed = 0.08 + Math.random() * 0.04;
      }

      // Individual timing - each fish on completely different cycle
      const fishTime = time * (0.8 + randoms.speedMultiplier * 0.4) + randoms.phaseOffset * 10;

      // ORGANIC HEADING DRIFT - multiple layered sine waves create natural curves
      // Using prime-ish multipliers to avoid repetitive patterns
      const drift1 = Math.sin(fishTime * 0.13) * 0.015;
      const drift2 = Math.sin(fishTime * 0.09 + 2.1) * 0.01;
      const drift3 = Math.sin(fishTime * 0.21 + 4.3) * 0.008;
      const drift4 = Math.cos(fishTime * 0.07 + 1.7) * 0.012;

      // Combine drifts with individual intensity
      const headingDrift = (drift1 + drift2 + drift3 + drift4) * randoms.wanderIntensity;
      boid.headingAngle += headingDrift;

      // Vertical drift (more subtle)
      const vDrift1 = Math.sin(fishTime * 0.11 + 3.2) * 0.004;
      const vDrift2 = Math.cos(fishTime * 0.17 + 1.1) * 0.003;
      boid.verticalAngle += (vDrift1 + vDrift2) * randoms.wanderIntensity;

      // Keep vertical angle small (fish swim mostly horizontal)
      boid.verticalAngle *= 0.98;
      boid.verticalAngle = Math.max(-0.4, Math.min(0.4, boid.verticalAngle));

      // Speed variation - fish speed up and slow down naturally
      const speedVar = Math.sin(fishTime * 0.19 + randoms.phaseOffset) * 0.03;
      const targetSpeed = (0.06 + speedVar) * randoms.speedMultiplier;
      boid.currentSpeed += (targetSpeed - boid.currentSpeed) * 0.02;
      boid.currentSpeed = Math.max(0.03, Math.min(0.15, boid.currentSpeed));

      // Convert heading to velocity
      const cosH = Math.cos(boid.headingAngle);
      const sinH = Math.sin(boid.headingAngle);
      const cosV = Math.cos(boid.verticalAngle);
      const sinV = Math.sin(boid.verticalAngle);

      boid.velocity.x = cosH * cosV * boid.currentSpeed;
      boid.velocity.y = sinV * boid.currentSpeed * 0.5;
      boid.velocity.z = sinH * cosV * boid.currentSpeed * 0.4;

      // BOUNDARY AVOIDANCE - smoothly turn away from edges
      const margin = 5.0;
      const strongMargin = 2.0;

      // X boundaries
      if (boid.position.x > BOUNDS.x - margin) {
        const urgency = (boid.position.x - (BOUNDS.x - margin)) / margin;
        if (cosH > 0) boid.headingAngle += 0.03 * urgency * urgency;
      } else if (boid.position.x < -BOUNDS.x + margin) {
        const urgency = ((-BOUNDS.x + margin) - boid.position.x) / margin;
        if (cosH < 0) boid.headingAngle -= 0.03 * urgency * urgency;
      }

      // Hard turn if very close to wall
      if (boid.position.x > BOUNDS.x - strongMargin && cosH > 0) {
        boid.headingAngle += 0.08;
      } else if (boid.position.x < -BOUNDS.x + strongMargin && cosH < 0) {
        boid.headingAngle -= 0.08;
      }

      // Z boundaries
      if (boid.position.z > BOUNDS.z - margin) {
        const urgency = (boid.position.z - (BOUNDS.z - margin)) / margin;
        if (sinH > 0) boid.headingAngle -= 0.02 * urgency;
      } else if (boid.position.z < -BOUNDS.z + margin) {
        const urgency = ((-BOUNDS.z + margin) - boid.position.z) / margin;
        if (sinH < 0) boid.headingAngle += 0.02 * urgency;
      }

      // Y boundaries (floor and surface)
      if (boid.position.y > BOUNDS.yMax - margin) {
        boid.verticalAngle -= 0.02;
        if (boid.velocity.y > 0) boid.velocity.y *= 0.9;
      } else if (boid.position.y < BOUNDS.yMin + margin + 1) {
        boid.verticalAngle += 0.03;
        if (boid.velocity.y < 0) boid.velocity.y *= 0.8;
      }

      // Gentle vertical preference (some fish like top, some like bottom)
      const yCenter = (BOUNDS.yMax + BOUNDS.yMin) / 2;
      const preferredY = yCenter + randoms.verticalBias * 5;
      if (boid.position.y < preferredY - 2) {
        boid.verticalAngle += 0.002;
      } else if (boid.position.y > preferredY + 2) {
        boid.verticalAngle -= 0.002;
      }

      // FISH AVOIDANCE - gentle steering away from other fish
      boids.forEach((other, otherIndex) => {
        if (index === otherIndex) return;
        const dx = boid.position.x - other.position.x;
        const dy = boid.position.y - other.position.y;
        const dz = boid.position.z - other.position.z;
        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq < 16 && distSq > 0.1) { // Within 4 units
          const dist = Math.sqrt(distSq);
          const urgency = (4 - dist) / 4;

          // Turn away from the other fish
          const angleToOther = Math.atan2(dz, dx);
          const angleDiff = boid.headingAngle - angleToOther;

          // Steer in the direction that increases angle difference
          if (Math.abs(angleDiff) < Math.PI / 2) {
            boid.headingAngle += (angleDiff > 0 ? 0.02 : -0.02) * urgency;
          }
        }
      });

      // Update position
      boid.position.add(boid.velocity.clone().multiplyScalar(delta * 60));

      // Hard clamp (safety)
      boid.position.x = Math.max(-BOUNDS.x + 0.3, Math.min(BOUNDS.x - 0.3, boid.position.x));
      boid.position.y = Math.max(BOUNDS.yMin + 0.3, Math.min(BOUNDS.yMax - 0.3, boid.position.y));
      boid.position.z = Math.max(-BOUNDS.z + 0.3, Math.min(BOUNDS.z - 0.3, boid.position.z));

      boid.ref.position.copy(boid.position);

      // SMOOTH ROTATION toward swimming direction
      if (boid.velocity.length() > 0.01) {
        const targetQuat = new THREE.Quaternion();
        const lookDir = boid.velocity.clone().normalize();
        const up = new THREE.Vector3(0, 1, 0);
        const lookMatrix = new THREE.Matrix4().lookAt(
          new THREE.Vector3(0, 0, 0),
          lookDir,
          up
        );
        targetQuat.setFromRotationMatrix(lookMatrix);

        // Very smooth rotation
        boid.ref.quaternion.slerp(targetQuat, 0.08);

        // Subtle banking on turns
        const turnRate = headingDrift * 10;
        boid.bankAngle = -turnRate * 0.3;
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