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
               pos[1] >= BOUNDS.yMin &&
               pos[1] <= BOUNDS.yMax &&
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
            realtimePos[1] >= BOUNDS.yMin &&
            realtimePos[1] <= BOUNDS.yMax &&
            Math.abs(realtimePos[2]) <= BOUNDS.z;

          if (!isValidTarget) {
            // Don't interpolate to invalid positions - clamp current position instead
            boid.position.x = Math.max(-BOUNDS.x, Math.min(BOUNDS.x, boid.position.x));
            boid.position.y = Math.max(BOUNDS.yMin, Math.min(BOUNDS.yMax, boid.position.y));
            boid.position.z = Math.max(-BOUNDS.z, Math.min(BOUNDS.z, boid.position.z));
            boid.ref.position.copy(boid.position);
            return;
          }

          const targetPos = new THREE.Vector3(...realtimePos);

          // Smooth interpolation - not too fast to avoid jerky movement
          const distance = boid.position.distanceTo(targetPos);
          if (distance > 0.05) {
            // Very smooth interpolation
            const lerpFactor = Math.min(0.08, delta * 3);
            boid.position.lerp(targetPos, lerpFactor);
          }

          // Clamp position after interpolation to ensure it stays in bounds
          boid.position.x = Math.max(-BOUNDS.x, Math.min(BOUNDS.x, boid.position.x));
          boid.position.y = Math.max(BOUNDS.yMin, Math.min(BOUNDS.yMax, boid.position.y));
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

    // Master browser: SIMPLE smooth swimming simulation
    const now = Date.now();
    const shouldSyncToFirebase = now - lastUpdateTime.current >= 5000;
    if (shouldSyncToFirebase) {
      lastUpdateTime.current = now;
    }

    // SMOOTH fish swimming - gentle wandering with very gradual boundary avoidance
    const swimSpeed = 1.0;
    const turnStrength = 0.015;
    const margin = 8.0; // Large margin - start turning VERY early

    boids.forEach((boid, index) => {
      // Simple avoidance - only from very close fish
      boids.forEach(other => {
        if (boid === other) return;
        const dist = boid.position.distanceTo(other.position);
        if (dist < 2.5 && dist > 0) {
          const away = new THREE.Vector3().subVectors(boid.position, other.position);
          away.normalize().multiplyScalar(0.08);
          boid.velocity.add(away);
        }
      });

      // Gentle random wandering for natural movement
      boid.velocity.x += (Math.random() - 0.5) * turnStrength;
      boid.velocity.y += (Math.random() - 0.5) * turnStrength * 0.4;
      boid.velocity.z += (Math.random() - 0.5) * turnStrength * 0.2;

      // VERY GENTLE boundary forces - just nudge the direction slightly
      // Calculate distance from boundaries
      const distFromLeftWall = boid.position.x - (-BOUNDS.x);
      const distFromRightWall = BOUNDS.x - boid.position.x;
      const distFromBottom = boid.position.y - BOUNDS.yMin;
      const distFromTop = BOUNDS.yMax - boid.position.y;
      const distFromBackWall = boid.position.z - (-BOUNDS.z);
      const distFromFrontWall = BOUNDS.z - boid.position.z;

      // Only apply forces within margin, and make them VERY gentle
      if (distFromLeftWall < margin) {
        const force = (1.0 - distFromLeftWall / margin) * 0.01; // Very weak force
        boid.velocity.x += force;
      }
      if (distFromRightWall < margin) {
        const force = (1.0 - distFromRightWall / margin) * 0.01;
        boid.velocity.x -= force;
      }
      if (distFromBottom < margin) {
        const force = (1.0 - distFromBottom / margin) * 0.01;
        boid.velocity.y += force;
      }
      if (distFromTop < margin) {
        const force = (1.0 - distFromTop / margin) * 0.01;
        boid.velocity.y -= force;
      }
      if (distFromBackWall < margin) {
        const force = (1.0 - distFromBackWall / margin) * 0.01;
        boid.velocity.z += force;
      }
      if (distFromFrontWall < margin) {
        const force = (1.0 - distFromFrontWall / margin) * 0.01;
        boid.velocity.z -= force;
      }

      // Maintain constant speed (normalize then scale)
      const currentSpeed = boid.velocity.length();
      if (currentSpeed > 0.01) {
        boid.velocity.normalize().multiplyScalar(swimSpeed);
      }

      // Update position smoothly
      boid.position.add(boid.velocity.clone().multiplyScalar(delta));

      // Gentle clamp as last resort (should rarely trigger now)
      boid.position.x = Math.max(-BOUNDS.x, Math.min(BOUNDS.x, boid.position.x));
      boid.position.y = Math.max(BOUNDS.yMin, Math.min(BOUNDS.yMax, boid.position.y));
      boid.position.z = Math.max(-BOUNDS.z, Math.min(BOUNDS.z, boid.position.z));

      boid.ref.position.copy(boid.position);

      // Smooth rotation toward swimming direction
      if (boid.velocity.length() > 0.01) {
        const lookTarget = boid.position.clone().add(boid.velocity.normalize());
        boid.ref.lookAt(lookTarget);
      }
    });

    // Only update Firebase periodically, not every frame
    if (shouldSyncToFirebase) {
      const positions = {};
      boids.forEach(boid => {
        positions[boid.id] = boid;
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