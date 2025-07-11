import React, { Suspense, useMemo, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import Fish from './Fish';
import useRealtimeAquarium from '../hooks/useRealtimeAquarium';
import { getDefaultFish } from '../models/fishModel';

// Error boundary for Three.js errors
class ThreeErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Three.js error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          position: 'absolute', 
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)',
          color: 'white',
          background: 'rgba(0,0,0,0.8)',
          padding: '20px',
          borderRadius: '10px'
        }}>
          <h3>3D Rendering Error</h3>
          <p>There was an issue with the 3D aquarium. Please refresh the page.</p>
        </div>
      );
    }

    return this.props.children;
  }
}

// Status indicator component
const SyncStatus = ({ isMaster }) => (
  <div style={{
    position: 'absolute',
    top: '70px',
    left: '20px',
    background: 'rgba(0,0,0,0.7)',
    color: 'white',
    padding: '8px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    zIndex: 20,
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  }}>
    <div style={{
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      backgroundColor: isMaster ? '#00ff00' : '#ffaa00'
    }} />
    {isMaster ? '🎯 Running Simulation' : '🔄 Syncing with Others'}
  </div>
);

// Simple test fish component
const SimpleFish = ({ position, id }) => {
  return (
    <mesh position={position}>
      <coneGeometry args={[0.3, 1, 8]} />
      <meshStandardMaterial color={'#ffdd88'} />
    </mesh>
  );
};

// This new Scene component will live inside the Canvas
const Scene = ({ fishData, events, onStatusChange }) => {
  const initialFish = useMemo(() => {
    return fishData.map(f => ({
    id: f.id,
    initialPosition: f.position || [0, 0, 0]
    }));
  }, [fishData]);

  // Use real-time aquarium instead of local simulation
  const { boids, isMaster } = useRealtimeAquarium(initialFish);

  // Pass status up to parent
  useEffect(() => {
    if (onStatusChange) {
      onStatusChange(isMaster);
    }
  }, [isMaster, onStatusChange]);

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
  const [isMaster, setIsMaster] = React.useState(false);
  
  // Use comprehensive fish data with full stats and personalities
  const defaultFish = useMemo(() => getDefaultFish(), []);
  
  const activeFishData = fishData.length > 0 ? fishData : defaultFish;

  return (
    <>
      <SyncStatus isMaster={isMaster} />
      <ThreeErrorBoundary>
        <Canvas 
          camera={{ position: [0, 0, 30], fov: 75 }}
          style={{ width: '100%', height: '100%', background: 'linear-gradient(to bottom, #87CEEB, #4682B4)' }}
        >
          <ambientLight intensity={0.8} />
          <pointLight position={[10, 10, 10]} />
          <Scene fishData={activeFishData} events={events} onStatusChange={setIsMaster} />
        </Canvas>
      </ThreeErrorBoundary>
    </>
  );
};

export default Aquarium; 