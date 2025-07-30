import React, { Suspense, useMemo, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import Fish from './Fish';
import WaterEffects from './WaterEffects';
import TankEnvironment from './TankEnvironment';
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
      {/* Tank environment with floor, walls, and decorations */}
      <TankEnvironment />
      
      {/* Realistic water effects with caustics and light rays */}
      <WaterEffects />
      
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
          shadows
          gl={{ 
            antialias: true, 
            alpha: true,
            powerPreference: "high-performance"
          }}
          style={{ 
            width: '100%', 
            height: '100%', 
            background: 'linear-gradient(to bottom, #0a1a2e, #16213e, #1e3c72, #2a5298)',
            position: 'relative'
          }}
        >
          {/* Enhanced underwater lighting with realistic water caustics */}
          <ambientLight intensity={0.2} color="#1e3c72" />
          
          {/* Main sunlight from above - creates realistic underwater lighting */}
          <directionalLight 
            position={[0, 30, 0]} 
            intensity={1.2} 
            color="#ffffff"
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-camera-near={0.1}
            shadow-camera-far={100}
            shadow-camera-left={-50}
            shadow-camera-right={50}
            shadow-camera-top={50}
            shadow-camera-bottom={-50}
          />
          
          {/* Angled light rays for depth */}
          <directionalLight 
            position={[20, 25, 10]} 
            intensity={0.6} 
            color="#87CEEB"
          />
          <directionalLight 
            position={[-15, 20, 5]} 
            intensity={0.4} 
            color="#4fc3f7"
          />
          
          {/* Underwater ambient lighting */}
          <pointLight 
            position={[0, 10, 0]} 
            intensity={0.3} 
            color="#87CEEB"
            distance={40}
            decay={2}
          />
          <pointLight 
            position={[25, 5, 15]} 
            intensity={0.2} 
            color="#E0F6FF"
            distance={30}
            decay={2}
          />
          <pointLight 
            position={[-20, 8, -10]} 
            intensity={0.25} 
            color="#4fc3f7"
            distance={35}
            decay={2}
          />
          
          {/* Subtle rim lighting for fish */}
          <spotLight
            position={[0, 15, 20]}
            angle={Math.PI / 4}
            penumbra={0.5}
            intensity={0.4}
            color="#ffffff"
            target-position={[0, 0, 0]}
          />
          
          {/* Enhanced fog with underwater blue tint */}
          <fog attach="fog" args={['#0d2f5c', 30, 90]} />
          
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