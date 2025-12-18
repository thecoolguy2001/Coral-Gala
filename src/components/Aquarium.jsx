import React, { Suspense, useMemo, lazy } from 'react';
import { Canvas } from '@react-three/fiber';
import Fish from './Fish';
import TankContainer from './TankContainer';
import WaterSurface from './WaterSurface';
import WaterVolume from './WaterVolume';
import BubbleJet from './BubbleJet';
import AmbientBubbles from './AmbientBubbles';
import HOBFilter from './HOBFilter';
import RealisticCaustics from './RealisticCaustics';
import Environment from './Environment';
import useRealtimeAquarium from '../hooks/useRealtimeAquarium';
import { getDefaultFish } from '../models/fishModel';
import { TANK_DEPTH } from '../constants/tankDimensions';

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



// Scene component - realistic aquarium view
const Scene = ({ fishData, onFishClick }) => {
  const initialFish = useMemo(() => {
    // Pass complete fish data, only add initialPosition if position exists
    return fishData.map(f => ({
      ...f, // Keep all fish data (name, personality, etc.)
      // Only add initialPosition if fish actually has a position - no default fallback
      ...(f.position && { initialPosition: f.position })
    }));
  }, [fishData]);

  // Use realtime Firebase-synchronized aquarium simulation
  const { boids } = useRealtimeAquarium(initialFish);

  return (
    <>
      {/* PROFESSIONAL AQUARIUM LIGHTING SYSTEM */}

      {/* Ambient base illumination - Dark room setting */}
      <ambientLight intensity={0.2} color="#e8f4ff" />

      {/* Primary overhead light - Strong focus on tank */}
      <directionalLight
        position={[0, 35, 5]}
        intensity={2.5}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />

      {/* Front fill light - gentle illumination */}
      <directionalLight
        position={[5, 15, 35]}
        intensity={1.2}
        color="#f8f8ff"
      />

      {/* Subtle back rim light */}
      <pointLight
        position={[0, 15, -25]}
        intensity={0.8}
        color="#d0e8ff"
      />

      {/* Side accent lights - subtle */}
      <pointLight
        position={[-20, 8, 0]}
        intensity={0.5}
        color="#ffe8d0"
      />
      <pointLight
        position={[20, 8, 0]}
        intensity={0.5}
        color="#ffe8d0"
      />

      {/* Render in correct order for transparency */}

      {/* 0. Environment (room, table, walls) */}
      <Environment />

      {/* 1. Tank structure (opaque base) */}
      <TankContainer />

      {/* 2. Realistic light caustics - subtle */}
      <RealisticCaustics />

      {/* 3. Fish swimming in the tank */}
      {boids.map(boid => (
        <Fish key={boid.id} boid={boid} onFishClick={onFishClick} />
      ))}

      {/* 4. HOB (Hang-On-Back) filter equipment */}
      <HOBFilter />

      {/* 5. Bubble jet aerator (must render after fish) */}
      <BubbleJet />
      
      {/* 5b. Ambient scattered bubbles */}
      <AmbientBubbles />

      {/* 6. Volumetric water with refraction (subtle overlay) */}
      <WaterVolume />

      {/* 7. Water surface at top (render last for proper blending) */}
      <WaterSurface />
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

  // Camera positioned slightly above center, zoomed out, angled gently downward
  const cameraPosition = [0, 3, TANK_DEPTH / 2 + 20];
  const cameraLookAt = [0, -1, 0]; // Looking slightly downward for balanced view

  return (
    <>
      <ThreeErrorBoundary>
        <Canvas
          camera={{
            position: cameraPosition,
            fov: 65, // Slightly wider field of view
          }}
          shadows
          style={{
            width: '100%',
            height: '100%',
            background: 'linear-gradient(to bottom, #2c3e50, #34495e, #2c3e50)',
            position: 'relative'
          }}
          onCreated={({ camera }) => {
            // Point camera upward at angle
            camera.lookAt(...cameraLookAt);
          }}
        >
          <Scene fishData={activeFishData} onFishClick={handleFishClick} />
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