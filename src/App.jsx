import './App.css';
import Aquarium from './components/Aquarium';
import InteractionUI from './components/InteractionUI';
import FallbackBanner from './components/FallbackBanner';
import useCollection from './hooks/useCollection';
import { initializeFishCollection } from './firestore/fishInitializer';
import { useEffect, useState } from 'react';

function App() {
  const { documents: fishData, loading: fishLoading, error: fishError } = useCollection('fish');
  const { documents: events, error: eventsError } = useCollection('events', 'timestamp', 'desc');
  const [showAquarium, setShowAquarium] = useState(false);

  // Initialize fish collection with default fish when app loads
  useEffect(() => {
    initializeFishCollection();
  }, []);

  // Show aquarium after a brief delay once fish are loaded
  useEffect(() => {
    if (!fishLoading && fishData && fishData.length > 0) {
      // Give a brief moment for everything to initialize properly
      const timer = setTimeout(() => {
        setShowAquarium(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [fishLoading, fishData]);

  // Any error from our hooks will be captured here
  const error = fishError || eventsError;

  // Show loading screen until ready
  if (!showAquarium || fishLoading) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(to bottom, #0a0a0a, #1a1a2a, #0a0a0a)',
        color: 'white',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div style={{
          fontSize: '48px',
          marginBottom: '20px',
          animation: 'pulse 2s ease-in-out infinite'
        }}>
          🐠
        </div>
        <h2 style={{ marginBottom: '10px', fontSize: '24px' }}>Coral Gala Aquarium</h2>
        <p style={{ color: '#888', fontSize: '14px' }}>
          {fishLoading ? 'Preparing your aquarium...' : 'Initializing...'}
        </p>
        <style>{`
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.8; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="App">
      <FallbackBanner message={error ? `Firebase Error: ${error}` : null} />
      <InteractionUI disabled={!!error} events={events} />
      <Aquarium fishData={fishData} loading={fishLoading} />
    </div>
  );
}

export default App;
