import { useState, useEffect, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
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
  
  // Initialize boids for simulation (if this becomes master)
  const boids = useMemo(() => {
    return fishData.map((f, index) => {
      const safePosition = f.initialPosition && Array.isArray(f.initialPosition) && f.initialPosition.length >= 3 
        ? f.initialPosition 
        : [0, 0, 0];
      
      const velocitySeeds = [
        [0.5, 0.2, -0.3],
        [-0.4, 0.6, 0.1],
        [0.3, -0.5, 0.4],
        [-0.2, 0.1, -0.6],
        [0.6, -0.3, 0.2]
      ];
      const velocitySeed = velocitySeeds[index % velocitySeeds.length];
      
      return {
        ...f,
        position: new THREE.Vector3(...safePosition),
        velocity: new THREE.Vector3(...velocitySeed),
        ref: new THREE.Object3D(),
      };
    });
  }, [fishData]);

  // Try to become master on mount
  useEffect(() => {
    const tryBecomeMaster = async () => {
      const success = await claimSimulationMaster(sessionId.current);
      if (success) {
        console.log('🎯 Became simulation master!');
        setIsMaster(true);
        
        // Initialize Firebase with complete fish data when becoming master
        const initialPositions = {};
        boids.forEach(boid => {
          initialPositions[boid.id] = boid;
        });
        await updateAllFishPositions(initialPositions);
        console.log('📡 Initialized Firebase with complete fish data');
        
        // Start heartbeat
        heartbeatInterval.current = setInterval(() => {
          updateMasterHeartbeat();
        }, 5000);
      }
    };

    tryBecomeMaster();

    // Listen for master changes
    const unsubscribe = isSimulationMaster((masterDoc) => {
      if (masterDoc && masterDoc.sessionId === sessionId.current) {
        setIsMaster(true);
      } else if (masterDoc && masterDoc.sessionId !== sessionId.current) {
        setIsMaster(false);
        console.log('👥 Another browser is the simulation master');
      } else {
        // No master exists, try to claim it
        tryBecomeMaster();
      }
    });

    return () => {
      unsubscribe();
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }
    };
  }, [boids]); // Add boids as dependency

  // Subscribe to real-time positions (for non-masters)
  useEffect(() => {
    if (!isMaster) {
      console.log('🔄 Subscribing to real-time fish positions...');
      const unsubscribe = subscribeToFishPositions((positions) => {
        setRealtimePositions(positions);
      });
      return unsubscribe;
    }
  }, [isMaster]);

  // Run simulation and update Firebase (masters only)
  useFrame((state, delta) => {
    if (!isMaster) return;

    // Throttle Firebase updates to ~10 FPS
    const now = Date.now();
    if (now - lastUpdateTime.current < 100) return;
    lastUpdateTime.current = now;

    // Run flocking simulation
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
      
      boid.velocity.add(separation);
      boid.velocity.add(alignment);
      boid.velocity.add(cohesion);

      if (boid.position.length() > bounds.length()) {
        const steerToCenter = new THREE.Vector3().subVectors(new THREE.Vector3(0,0,0), boid.position);
        steerToCenter.clampLength(0, maxForce * 2);
        boid.velocity.add(steerToCenter);
      }

      boid.velocity.clampLength(0, maxSpeed);
      boid.position.add(boid.velocity.clone().multiplyScalar(delta));

      boid.ref.position.copy(boid.position);
      boid.ref.lookAt(boid.position.clone().add(boid.velocity));
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
    // Convert Firebase data back to boid format for rendering
    // Merge real-time position data with original comprehensive fish data
    const remoteBoids = fishData.map(originalFish => {
      const firebaseData = realtimePositions[originalFish.id];
      
      if (firebaseData) {
        // Merge original comprehensive data with real-time position/velocity
        const boid = {
          ...originalFish, // Start with comprehensive fish data
          ...firebaseData, // Overlay with Firebase data (which should also be comprehensive)
          id: originalFish.id,
          position: new THREE.Vector3(...(firebaseData.position || originalFish.initialPosition || [0, 0, 0])),
          velocity: new THREE.Vector3(...(firebaseData.velocity || [0, 0, 0])),
          ref: new THREE.Object3D(),
        };
        
        // Update ref orientation for rendering
        boid.ref.position.copy(boid.position);
        boid.ref.lookAt(boid.position.clone().add(boid.velocity));
        
        return boid;
      } else {
        // No Firebase data yet, use original comprehensive fish data
        const boid = {
          ...originalFish,
          position: new THREE.Vector3(...(originalFish.initialPosition || [0, 0, 0])),
          velocity: new THREE.Vector3(0, 0, 0),
          ref: new THREE.Object3D(),
        };
        
        boid.ref.position.copy(boid.position);
        boid.ref.lookAt(boid.position.clone().add(boid.velocity));
        
        return boid;
      }
    });
    
    return { boids: remoteBoids, isMaster: false };
  }
};

export default useRealtimeAquarium; 