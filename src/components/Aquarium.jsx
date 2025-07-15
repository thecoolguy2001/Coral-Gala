import React, { Suspense, useMemo, useEffect, useRef } from 'react';
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

  // Water particles component for realistic water effect
  const WaterParticles = () => {
    const particlesRef = useRef();
    const particles = useMemo(() => {
      const particleCount = 200;
      const positions = new Float32Array(particleCount * 3);
      const velocities = new Float32Array(particleCount * 3);
      
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 40; // x
        positions[i * 3 + 1] = (Math.random() - 0.5) * 20; // y
        positions[i * 3 + 2] = (Math.random() - 0.5) * 40; // z
        
        velocities[i * 3] = (Math.random() - 0.5) * 0.1; // vx
        velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.05; // vy
        velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.1; // vz
      }
      
      return { positions, velocities };
    }, []);

    useFrame((state, delta) => {
      if (!particlesRef.current) return;
      
      const positions = particlesRef.current.geometry.attributes.position.array;
      const velocities = particles.velocities;
      
      for (let i = 0; i < positions.length; i += 3) {
        // Update positions based on velocities
        positions[i] += velocities[i] * delta * 10;
        positions[i + 1] += velocities[i + 1] * delta * 10;
        positions[i + 2] += velocities[i + 2] * delta * 10;
        
        // Add gentle wave motion
        positions[i + 1] += Math.sin(state.clock.elapsedTime + i * 0.1) * 0.01;
        
        // Wrap around boundaries
        if (positions[i] > 20) positions[i] = -20;
        if (positions[i] < -20) positions[i] = 20;
        if (positions[i + 1] > 10) positions[i + 1] = -10;
        if (positions[i + 1] < -10) positions[i + 1] = 10;
        if (positions[i + 2] > 20) positions[i + 2] = -20;
        if (positions[i + 2] < -20) positions[i + 2] = 20;
      }
      
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    });

    return (
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particles.positions.length / 3}
            array={particles.positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.05}
          color="#4fc3f7"
          transparent
          opacity={0.3}
          sizeAttenuation
        />
      </points>
    );
  };

  // Bubbles component for underwater effect
  const Bubbles = () => {
    const bubblesRef = useRef();
    const bubbles = useMemo(() => {
      const bubbleCount = 50;
      const positions = new Float32Array(bubbleCount * 3);
      const sizes = new Float32Array(bubbleCount);
      
      for (let i = 0; i < bubbleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 30; // x
        positions[i * 3 + 1] = -15 + Math.random() * 5; // y (start from bottom)
        positions[i * 3 + 2] = (Math.random() - 0.5) * 30; // z
        
        sizes[i] = 0.02 + Math.random() * 0.08; // varying bubble sizes
      }
      
      return { positions, sizes };
    }, []);

    useFrame((state, delta) => {
      if (!bubblesRef.current) return;
      
      const positions = bubblesRef.current.geometry.attributes.position.array;
      const sizes = bubblesRef.current.geometry.attributes.size.array;
      
      for (let i = 0; i < positions.length; i += 3) {
        // Bubbles rise up
        positions[i + 1] += delta * 2;
        
        // Add slight horizontal drift
        positions[i] += Math.sin(state.clock.elapsedTime + i * 0.5) * delta * 0.5;
        positions[i + 2] += Math.cos(state.clock.elapsedTime + i * 0.3) * delta * 0.5;
        
        // Reset bubbles that reach the top
        if (positions[i + 1] > 15) {
          positions[i] = (Math.random() - 0.5) * 30;
          positions[i + 1] = -15 + Math.random() * 5;
          positions[i + 2] = (Math.random() - 0.5) * 30;
          sizes[i / 3] = 0.02 + Math.random() * 0.08;
        }
      }
      
      bubblesRef.current.geometry.attributes.position.needsUpdate = true;
      bubblesRef.current.geometry.attributes.size.needsUpdate = true;
    });

    return (
      <points ref={bubblesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={bubbles.positions.length / 3}
            array={bubbles.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            count={bubbles.sizes.length}
            array={bubbles.sizes}
            itemSize={1}
          />
        </bufferGeometry>
        <pointsMaterial
          size={1}
          color="#ffffff"
          transparent
          opacity={0.6}
          sizeAttenuation
          vertexColors={false}
        />
      </points>
    );
  };

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