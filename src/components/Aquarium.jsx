import React, { Suspense, useMemo, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import Fish from './Fish';
import WaterParticles from './WaterParticles';
import Bubbles from './Bubbles';
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
      {/* Water particles for realistic water effect */}
      <WaterParticles />
      
      {/* Bubbles for underwater atmosphere */}
      <Bubbles />
      
      {/* Fish */}
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
      <ThreeErrorBoundary>
        <Canvas 
          camera={{ position: [0, 0, 30], fov: 75 }}
          style={{ 
            width: '100%', 
            height: '100%', 
            background: 'linear-gradient(to bottom, #1e3c72, #2a5298, #1e3c72)',
            position: 'relative'
          }}
        >
          {/* Enhanced lighting for underwater effect */}
          <ambientLight intensity={0.4} color="#4fc3f7" />
          <directionalLight 
            position={[10, 20, 10]} 
            intensity={0.6} 
            color="#ffffff"
            castShadow
          />
          <pointLight 
            position={[-10, 10, -10]} 
            intensity={0.3} 
            color="#4fc3f7"
          />
          
          {/* Fog for depth effect */}
          <fog attach="fog" args={['#1e3c72', 20, 100]} />
          
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