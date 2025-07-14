import React, { Suspense, useMemo, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import Fish from './Fish';
import useDeterministicAquarium from '../hooks/useDeterministicAquarium';
import { getDefaultFish } from '../models/fishModel';
import FishInfoModal from './FishInfoModal';

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

// This new Scene component will live inside the Canvas
const Scene = ({ fishData, events, onFishClick }) => {
  const initialFish = useMemo(() => {
    // Pass complete fish data, just add initialPosition property
    return fishData.map(f => ({
      ...f, // Keep all fish data (name, personality, etc.)
      initialPosition: f.position || [0, 0, 0]
    }));
  }, [fishData]);
  
  // Use deterministic aquarium simulation (no user dependency!)
  const { boids, isDeterministic } = useDeterministicAquarium(initialFish);
  
  console.log('🎲 Deterministic aquarium active with', boids.length, 'fish');

  useEffect(() => {
    if (events.length > 0) {
      console.log('New event received:', events[0]);
    }
  }, [events]);

  return (
    <Suspense fallback={null}>
      {boids.map(boid => (
        <Fish key={boid.id} boid={boid} onFishClick={onFishClick} />
      ))}
    </Suspense>
  );
};

const Aquarium = ({ fishData = [], events = [] }) => {
  const [selectedFish, setSelectedFish] = React.useState(null);
  
  // Use comprehensive fish data with full stats and personalities
  const defaultFish = useMemo(() => getDefaultFish(), []);
  
  const activeFishData = fishData.length > 0 ? fishData : defaultFish;
  
  // Essential logging only
  console.log('🐠 Aquarium using', activeFishData.length, 'fish:', activeFishData.map(f => f.name).join(', '));

  const handleFishClick = (fish) => {
    console.log('🎣 Fish clicked:', fish.name);
    setSelectedFish(fish);
  };

  const handleCloseModal = () => {
    setSelectedFish(null);
  };

  return (
    <>
      <div style={{
        position: 'absolute',
        top: '20px',
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
          backgroundColor: '#00ff88'
        }} />
        🎲 Deterministic Simulation
      </div>
      
      <ThreeErrorBoundary>
        <Canvas 
          camera={{ position: [0, 0, 30], fov: 75 }}
          style={{ width: '100%', height: '100%', background: 'linear-gradient(to bottom, #87CEEB, #4682B4)' }}
        >
          <ambientLight intensity={0.8} />
          <pointLight position={[10, 10, 10]} />
          <Scene fishData={activeFishData} events={events} onFishClick={handleFishClick} />
        </Canvas>
      </ThreeErrorBoundary>
      
      {selectedFish && (
        <FishInfoModal 
          fish={selectedFish} 
          onClose={handleCloseModal} 
        />
      )}
    </>
  );
};

export default Aquarium; 