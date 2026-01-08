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

// Caustic Projector - Generates real-time animated caustic texture for the spotlight
const CausticProjector = () => {
  // Create a render target to draw the dynamic caustic pattern into
  const renderTarget = useMemo(() => new THREE.WebGLRenderTarget(512, 512, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    wrapS: THREE.RepeatWrapping,
    wrapT: THREE.RepeatWrapping,
  }), []);

  // Off-screen scene setup
  const { scene, camera, material } = useMemo(() => {
    const s = new THREE.Scene();
    const c = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    // Shader that matches the internal RealisticCaustics logic
    const m = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        varying vec2 vUv;

        // Same caustic logic as RealisticCaustics.jsx
        float causticPattern(vec2 uv, float time) {
          vec2 p = mod(uv * 6.28318, 6.28318) - 250.0;
          vec2 i = vec2(p);
          float c = 1.0;
          float inten = 0.005;

          for (int n = 0; n < 4; n++) {
            float t = time * (1.0 - (3.5 / float(n + 1)));
            i = p + vec2(
              cos(t - i.x) + sin(t + i.y),
              sin(t - i.y) + cos(t + i.x)
            );
            vec2 lenVec = vec2(
              p.x / (sin(i.x + t) / inten + 0.001), 
              p.y / (cos(i.y + t) / inten + 0.001)
            );
            c += 1.0 / (length(lenVec) + 0.001);
          }
          c /= float(4);
          c = 1.17 - pow(c, 1.4);
          return pow(abs(c), 8.0);
        }

        void main() {
          vec2 uv = vUv * 2.0; // Scale pattern
          
          // Animate drift
          uv += vec2(sin(time * 0.2), cos(time * 0.25)) * 0.1;

          float c1 = causticPattern(uv * 3.0, time * 0.8);
          float c2 = causticPattern(uv * 2.5 + vec2(0.5), time * 0.7);
          
          float caustics = (c1 + c2 * 0.5);
          
          // Output black and white mask for light
          gl_FragColor = vec4(vec3(caustics), 1.0);
        }
      `,
    });

    const plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m);
    s.add(plane);
    
    return { scene: s, camera: c, material: m };
  }, []);

  useFrame(({ gl, clock }) => {
    // Update shader time
    material.uniforms.time.value = clock.elapsedTime;
    
    // Render the caustic pattern to the texture
    const currentRenderTarget = gl.getRenderTarget();
    gl.setRenderTarget(renderTarget);
    gl.render(scene, camera);
    gl.setRenderTarget(currentRenderTarget);
  });

  return (
    <spotLight
      position={[0, WATER_LEVEL + 0.5, 0]} // Positioned at water surface
      angle={1.4} // Wide angle to project onto table/floor
      penumbra={0.5}
      intensity={800} // Adjusted for closer distance
      map={renderTarget.texture}
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

      {/* 0. Ambient Fill - Reduced to fix "too bright" complaint */}
      <ambientLight intensity={0.4} color="#ffffff" />

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
      <CausticProjector />

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