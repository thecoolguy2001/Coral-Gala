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
  // Add some default fish if no data is available
  const defaultFish = [
    { id: 'fish1', position: [-5, 2, 0] },
    { id: 'fish2', position: [5, -2, 5] },
    { id: 'fish3', position: [0, 3, -3] },
    { id: 'fish4', position: [-3, -1, 2] },
    { id: 'fish5', position: [4, 0, -1] }
  ];
  
  const activeFishData = fishData.length > 0 ? fishData : defaultFish;

  return (
    <Canvas 
      camera={{ position: [0, 0, 30], fov: 75 }}
      style={{ width: '100%', height: '100%', background: 'linear-gradient(to bottom, #87CEEB, #4682B4)' }}
    >
      <ambientLight intensity={0.8} />
      <pointLight position={[10, 10, 10]} />
      <Scene fishData={activeFishData} events={events} />
    </Canvas>
  );
};

export default Aquarium; 