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
  
  // Debug logging
  console.log('🎣 useRealtimeAquarium - received fishData:', fishData.length, fishData);
  
  const [boids, setBoids] = useState([]);

  useEffect(() => {
    if (!fishData) return;

    const newBoids = fishData.map((f, index) => {
      const realtimePosition = realtimePositions[f.id]?.position;
      const safePositions = [
        [-10, 3, 0],
        [10, -3, 0],
        [0, 5, 0],
        [0, -5, 0],
        [-5, 0, 0],
        [5, 0, 0],
      ];
      const safePosition = realtimePosition || f.position || safePositions[index % safePositions.length] || [0, 0, 0];

      const velocitySeeds = [
        [1.0, 0.3, 0.0],
        [-1.0, 0.5, 0.0],
        [0.5, -1.0, 0.0],
        [-0.5, 1.0, 0.0],
        [0.8, 0.0, 0.0],
        [-0.8, 0.0, 0.0],
      ];
      const velocitySeed = realtimePositions[f.id]?.velocity || f.velocity || velocitySeeds[index % velocitySeeds.length];

      return {
        ...f,
        position: new THREE.Vector3(...safePosition),
        velocity: new THREE.Vector3(...velocitySeed),
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
        console.log('🎯 Became simulation master!');
        setIsMaster(true);
        
        const initialPositions = {};
        boids.forEach(boid => {
          initialPositions[boid.id] = boid;
        });
        await updateAllFishPositions(initialPositions);
        console.log('📡 Initialized Firebase with complete fish data');
        
        heartbeatInterval.current = setInterval(() => {
          updateMasterHeartbeat();
        }, 5000);
      }
    };

    tryBecomeMaster();

    const unsubscribe = isSimulationMaster((masterDoc) => {
      if (masterDoc && masterDoc.sessionId === sessionId.current) {
        setIsMaster(true);
      } else if (masterDoc && masterDoc.sessionId !== sessionId.current) {
        setIsMaster(false);
        console.log('👥 Another browser is the simulation master');
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
      console.log('🔄 Subscribing to real-time fish positions...');
      const unsubscribe = subscribeToFishPositions((positions) => {
        // Only update if we actually received data
        if (positions && Object.keys(positions).length > 0) {
          setRealtimePositions(positions);
        }
      });
      return unsubscribe;
    }
  }, [isMaster]);

  // Run simulation and update Firebase (masters only)
  useFrame((state, delta) => {
    if (!isMaster) return;
  
    const now = Date.now();
    if (now - lastUpdateTime.current < 100) return;
    lastUpdateTime.current = now;
  
    const separationDistance = 4.0;
    const alignmentDistance = 6.0;
    const cohesionDistance = 5.0;
    const maxSpeed = 2.0;
    const maxForce = 0.08;
    const bounds = new THREE.Vector3(12, 8, 6);
  
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
  
      // Boundary bouncing
      if (Math.abs(boid.position.x) > bounds.x) {
        boid.velocity.x *= -1;
      }
      if (Math.abs(boid.position.y) > bounds.y) {
        boid.velocity.y *= -1;
      }
      if (Math.abs(boid.position.z) > bounds.z) {
        boid.velocity.z *= -1;
      }
  
      // Ensure fish always keep moving
      if (boid.velocity.length() < 0.1) {
        // Give fish a random direction if they get stuck
        boid.velocity.set(
          (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 3,
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