import React, { Suspense, useMemo, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import Fish from './Fish';
import useFlockingSimulation from '../hooks/useFlockingSimulation';

const Aquarium = ({ fishData = [], events = [] }) => {
  // 1. Map Firestore data to the format our simulation expects
  const initialFish = useMemo(() => fishData.map(f => ({
      id: f.id,
      initialPosition: f.position || [0, 0, 0]
  })), [fishData]);

  // 2. Run the simulation
  const boids = useFlockingSimulation(initialFish);

  // 3. Process events
  useEffect(() => {
    if (events.length > 0) {
      console.log('New event received:', events[0]);
    }
  }, [events]);

  return (
    <Canvas camera={{ position: [0, 0, 30], fov: 75 }}>
      <ambientLight intensity={0.8} />
      <pointLight position={[10, 10, 10]} />
      <Suspense fallback={null}>
        {boids.map(boid => (
          <Fish key={boid.id} boid={boid} />
        ))}
      </Suspense>
    </Canvas>
  );
};

export default Aquarium; 