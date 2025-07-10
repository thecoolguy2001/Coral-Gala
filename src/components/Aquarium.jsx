import React, { Suspense, useMemo, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import Fish from './Fish';
import useFlockingSimulation from '../hooks/useFlockingSimulation';

// Simple test fish component
const SimpleFish = ({ position, id }) => {
  return (
    <mesh position={position}>
      <coneGeometry args={[0.3, 1, 8]} rotation-x={Math.PI / 2} />
      <meshStandardMaterial color={'#ffdd88'} />
    </mesh>
  );
};

// This new Scene component will live inside the Canvas
const Scene = ({ fishData, events }) => {
  const initialFish = useMemo(() => {
    console.log('Scene - fishData:', fishData);
    const mapped = fishData.map(f => {
      console.log('Scene - mapping fish:', f);
      return {
        id: f.id,
        initialPosition: f.position || [0, 0, 0]
      };
    });
    console.log('Scene - initialFish:', mapped);
    return mapped;
  }, [fishData]);

  // TEMPORARILY DISABLED - using simple fish instead
  // const boids = useFlockingSimulation(initialFish);
  // console.log('Scene - boids:', boids);

  useEffect(() => {
    if (events.length > 0) {
      console.log('New event received:', events[0]);
    }
  }, [events]);

  return (
    <Suspense fallback={null}>
      {initialFish.map(fish => (
        <SimpleFish key={fish.id} position={fish.initialPosition} id={fish.id} />
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
  
  // Debug logging
  console.log('Aquarium - fishData:', fishData);
  console.log('Aquarium - activeFishData:', activeFishData);

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