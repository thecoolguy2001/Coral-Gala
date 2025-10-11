import React, { Suspense, useMemo, useEffect, lazy } from 'react';
import { Canvas } from '@react-three/fiber';
import Fish from './Fish';
import WaterEffects from './WaterEffects';
import useRealtimeAquarium from '../hooks/useRealtimeAquarium';
import { getDefaultFish } from '../models/fishModel';

// Lazy load modal since it's only shown when user clicks a fish
const FishInfoModal = lazy(() => import('./FishInfoModal'));

// Error boundary for Three.js errors
class ThreeErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
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
    // Pass complete fish data, only add initialPosition if position exists
    return fishData.map(f => ({
      ...f, // Keep all fish data (name, personality, etc.)
      // Only add initialPosition if fish actually has a position - no default fallback
      ...(f.position && { initialPosition: f.position })
    }));
  }, [fishData]);
  
  // Use realtime Firebase-synchronized aquarium simulation
  const { boids, isMaster } = useRealtimeAquarium(initialFish);

  return (
    <>
      <WaterEffects />
      {boids.map(boid => (
        <Fish key={boid.id} boid={boid} onFishClick={onFishClick} />
      ))}
    </>
  );
};

const Aquarium = ({ fishData = [], events = [], loading = false }) => {
  const [selectedFish, setSelectedFish] = React.useState(null);
  
  // Use comprehensive fish data with full stats and personalities
  const defaultFish = useMemo(() => getDefaultFish(), []);
  
  // Filter out invalid fish data from Firebase and ensure minimum size
  const validFishData = useMemo(() => {
    // If we have fishData from Firebase, use it (even if empty to avoid duplicates)
    if (fishData && fishData.length > 0) {
      const filtered = fishData.filter(fish => {
        // Must have valid name, size, and color
        return fish && 
               fish.name && 
               fish.size && 
               fish.size >= 0.5 && // Minimum size requirement
               fish.color && 
               fish.id;
      }).map(fish => ({
        ...defaultFish[0], // Start with default fish structure
        ...fish, // Override with Firebase data
        size: Math.max(0.6, fish.size || 0.6), // Ensure minimum size
        color: fish.color || '#FF6B35', // Ensure color exists
        // Ensure required nested objects exist
        personality: fish.personality || defaultFish[0].personality,
        preferences: fish.preferences || defaultFish[0].preferences,
        history: fish.history || defaultFish[0].history,
        states: fish.states || defaultFish[0].states,
        display: fish.display || defaultFish[0].display
      }));
      return filtered;
    }

    // If loading, return empty array to prevent default fish from showing
    if (loading) {
      return [];
    }

    // Only use default fish if no Firebase data exists at all and not loading
    return defaultFish;
  }, [fishData, defaultFish, loading]);
  
  const activeFishData = validFishData;
  

  const handleFishClick = (fish) => {
    setSelectedFish(fish);
  };

  const handleCloseModal = () => {
    setSelectedFish(null);
  };

  return (
    <>
      <ThreeErrorBoundary>
        <Canvas
          camera={{ position: [0, 0, 25], fov: 75 }}
          style={{
            width: '100%',
            height: '100%',
            background: 'linear-gradient(to bottom, #1e3c72, #2a5298, #1e3c72)',
            position: 'relative'
          }}
        >
          {/* Enhanced lighting for realistic underwater effect */}
          <ambientLight intensity={0.6} color="#ffffff" />
          <directionalLight 
            position={[0, 25, 0]} 
            intensity={1.2} 
            color="#ffffff"
            castShadow
          />
          <directionalLight 
            position={[15, 15, 15]} 
            intensity={0.8} 
            color="#ffffff"
          />
          <pointLight 
            position={[-10, 10, -10]} 
            intensity={0.6} 
            color="#ffffff"
          />
          <pointLight 
            position={[10, 5, 10]} 
            intensity={0.6} 
            color="#ffffff"
          />
          
          {/* Fog for depth effect */}
          <fog attach="fog" args={['#1e3c72', 25, 80]} />
          
          <Scene fishData={activeFishData} events={events} onFishClick={handleFishClick} />
        </Canvas>
      </ThreeErrorBoundary>

      {selectedFish && (
        <Suspense fallback={null}>
          <FishInfoModal
            fish={selectedFish}
            onClose={handleCloseModal}
          />
        </Suspense>
      )}
    </>
  );
};

export default Aquarium; 