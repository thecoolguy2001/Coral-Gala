import React, { Suspense, useMemo, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import Fish from './Fish';
import WaterEffects from './WaterEffects';
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
    // Pass complete fish data, only add initialPosition if position exists
    return fishData.map(f => ({
      ...f, // Keep all fish data (name, personality, etc.)
      // Only add initialPosition if fish actually has a position - no default fallback
      ...(f.position && { initialPosition: f.position })
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
      {/* Realistic water effects with caustics and light rays */}
      <WaterEffects />
      
      {/* Fish */}
      {boids.map(boid => (
        <Fish key={boid.id} boid={boid} onFishClick={onFishClick} />
      ))}
    </Suspense>
  );
};

const Aquarium = ({ fishData = [], events = [], loading = false }) => {
  const [selectedFish, setSelectedFish] = React.useState(null);
  
  // Use comprehensive fish data with full stats and personalities
  const defaultFish = useMemo(() => getDefaultFish(), []);
  
  // Filter out invalid fish data from Firebase and ensure minimum size
  const validFishData = useMemo(() => {
    console.log('🔍 fishData from Firebase:', fishData?.length || 0, 'fish');
    console.log('🔍 loading state:', loading);
    
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
      console.log('✅ Using Firebase fish data:', filtered.length, 'fish');
      return filtered;
    }
    
    // If loading, return empty array to prevent default fish from showing
    if (loading) {
      console.log('⏳ Still loading, showing no fish yet');
      return [];
    }
    
    // Only use default fish if no Firebase data exists at all and not loading
    console.log('🏠 Using default fish fallback');
    return defaultFish;
  }, [fishData, defaultFish, loading]);
  
  const activeFishData = validFishData;
  
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
          {/* Enhanced lighting for realistic underwater effect */}
          <ambientLight intensity={0.3} color="#4fc3f7" />
          <directionalLight 
            position={[0, 25, 0]} 
            intensity={0.8} 
            color="#ffffff"
            castShadow
          />
          <directionalLight 
            position={[15, 15, 15]} 
            intensity={0.4} 
            color="#87CEEB"
          />
          <pointLight 
            position={[-10, 10, -10]} 
            intensity={0.2} 
            color="#4fc3f7"
          />
          <pointLight 
            position={[10, 5, 10]} 
            intensity={0.3} 
            color="#E0F6FF"
          />
          
          {/* Fog for depth effect */}
          <fog attach="fog" args={['#1e3c72', 25, 80]} />
          
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