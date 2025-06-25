import React, { Suspense, useMemo, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import Fish from './Fish';
import useFlockingSimulation from '../hooks/useFlockingSimulation';

// This new Scene component will live inside the Canvas
const Scene = ({ fishData, events }) => {
  const initialFish = useMemo(() => fishData.map(f => ({
    id: f.id,
    initialPosition: f.position || [0, 0, 0]
  })), [fishData]);

  // Now this hook is called within a child of Canvas, which is correct
  const boids = useFlockingSimulation(initialFish);

  useEffect(() => {
    if (events.length > 0) {
      console.log('New event received:', events[0]);
    }
  }, [events]);

  return (
    <Suspense fallback={null}>
      {boids.map(boid => (
        <Fish key={boid.id} boid={boid} />
      ))}
    </Suspense>
  );
};

const Aquarium = ({ fishData = [], events = [] }) => {
  return (
    <Canvas camera={{ position: [0, 0, 30], fov: 75 }}>
      <ambientLight intensity={0.8} />
      <pointLight position={[10, 10, 10]} />
      <Scene fishData={fishData} events={events} />
    </Canvas>
  );
};

export default Aquarium; 