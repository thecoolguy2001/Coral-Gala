import React, { Suspense, useMemo, lazy, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import Fish from './Fish';
import TankContainer from './TankContainer';
import WaterSurface from './WaterSurface';
import WaterVolume from './WaterVolume';
import BubbleJet from './BubbleJet';
import AmbientBubbles from './AmbientBubbles';
import HOBFilter from './HOBFilter';
import Environment from './Environment';
import RealisticCaustics from './RealisticCaustics'; // Restored
import useRealtimeAquarium from '../hooks/useRealtimeAquarium';
import { getDefaultFish } from '../models/fishModel';
import { TANK_DEPTH, WATER_LEVEL } from '../constants/tankDimensions';
import * as THREE from 'three';

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

// Caustic Light Component
const CausticLight = () => {
  // Generate noise texture once
  const causticTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // Simple noise generation
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, 512, 512);
    
    // Draw random white/grey patterns for caustics (original dot style)
    for (let i = 0; i < 500; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const r = Math.random() * 30 + 10;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.5 + 0.1})`; // Brighter
        ctx.fill();
        
        // Connect some nodes
        if (i % 2 === 0) {
           ctx.beginPath();
           ctx.moveTo(x, y);
           ctx.lineTo(x + Math.random() * 100 - 50, y + Math.random() * 100 - 50);
           ctx.strokeStyle = `rgba(255, 255, 255, ${Math.random() * 0.3})`;
           ctx.lineWidth = Math.random() * 2 + 1;
           ctx.stroke();
        }
    }
    
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    // Rotate texture slightly to align with look
    tex.rotation = Math.PI / 4;
    return tex;
  }, []);

  useFrame((state) => {
    if (causticTexture) {
      // Linear flow for more consistent movement (retained animation fix)
      const t = state.clock.elapsedTime;
      causticTexture.offset.x = t * 0.05;
      causticTexture.offset.y = t * 0.03;
    }
  });

  return (
    <spotLight
      position={[0, 60, 0]}
      angle={0.9}
      penumbra={0.3}
      intensity={2500} // Restored intensity
      map={causticTexture}
      castShadow={false}
      distance={200}
      decay={1}
      color="#e0f0ff"
    />
  );
};

// Scene component - realistic aquarium view
const Scene = ({ fishData, onFishClick, roomLightsOn }) => {
  const initialFish = useMemo(() => {
    // Pass complete fish data, only add initialPosition if position exists
    return fishData.map(f => ({
      ...f, 
      ...(f.position && { initialPosition: f.position })
    }));
  }, [fishData]);

  const { boids } = useRealtimeAquarium(initialFish);

  return (
    <>
      {/* PROFESSIONAL 3-LIGHT SYSTEM */}

      {/* 0. Ambient Fill - Lifts all shadows immediately */}
      <ambientLight intensity={0.6} color="#ffffff" />

      {/* --- LIGHT 3: ROOM FILL (Controlled by Switch) --- */}
      <hemisphereLight
        skyColor="#d6e6ff" 
        groundColor="#5c4033" 
        intensity={roomLightsOn ? 0.5 : 0.0}
      />
      
      {/* 2. "Window" Sunlight */}
      <directionalLight
        position={[-50, 30, 20]} 
        intensity={roomLightsOn ? 3.0 : 0.0} 
        color="#fff0dd" 
        castShadow
        shadow-mapSize-width={2048} 
        shadow-mapSize-height={2048} 
        shadow-bias={-0.0001}
      />

      {/* 3. Soft Ceiling Fill */}
      <pointLight 
        position={[0, 80, 0]} 
        intensity={roomLightsOn ? 0.8 : 0.0} 
        color="#ffffff" 
        decay={2}
        distance={200}
      />

      {/* --- LIGHT 2: OVERHEAD CAST --- */}
      <spotLight
        position={[0, 100, 0]} 
        angle={0.6} 
        penumbra={0.5} 
        intensity={1500.0} // Boosted
        distance={500} 
        decay={1} 
        castShadow
        shadow-mapSize-width={2048} 
        shadow-mapSize-height={2048} 
        shadow-bias={-0.0001} 
        shadow-normalBias={0.04}
        shadow-radius={1} 
        target-position={[0, -100, 0]} 
      />

      {/* --- LIGHT 1: TANK INTERNAL --- */}
      <spotLight
        position={[0, 30, 0]} 
        angle={1.2} 
        penumbra={0.5}
        intensity={1000.0} // Boosted
        distance={60} 
        decay={1} 
        color="#ffffff"
        castShadow 
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0001}
        shadow-normalBias={0.04}
        shadow-radius={1} 
        target-position={[0, 0, 0]}
      />
      
      {/* 4. CAUSTIC LIGHT PROJECTOR */}
      <CausticLight />

      {/* Render in correct order for transparency */}

      {/* 0. Environment */}
      <Environment />

      {/* 1. Tank structure */}
      <TankContainer />

      {/* 2. Realistic light caustics - RESTORED */}
      <RealisticCaustics />
      
      {/* 3. Fish swimming in the tank */}
      {boids.map(boid => (
        <Fish key={boid.id} boid={boid} onFishClick={onFishClick} />
      ))}

      {/* 4. HOB Filter */}
      <HOBFilter />

      {/* 5. Bubble jet */}
      <BubbleJet />
      
      {/* 5b. Ambient bubbles */}
      <AmbientBubbles />

      {/* 6. Volumetric water */}
      <WaterVolume />

      {/* 7. Water surface */}
      <WaterSurface />
    </>
  );
};

const Aquarium = ({ fishData = [], events = [], loading = false, roomLightsOn }) => {
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
          dpr={[1, 1.5]} // Cap pixel ratio for performance on high-DPI screens
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
          <Scene fishData={activeFishData} onFishClick={handleFishClick} roomLightsOn={roomLightsOn} />
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