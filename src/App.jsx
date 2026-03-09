import './App.css';
import Aquarium from './components/Aquarium';
import InteractionUI from './components/InteractionUI';
import FallbackBanner from './components/FallbackBanner';
import useCollection from './hooks/useCollection';
import { initializeFishCollection } from './firestore/fishInitializer';
import { AquariumEventProvider } from './hooks/useAquariumEvents.jsx';
import { useEffect, useState } from 'react';

function App() {
  const { documents: fishData, loading: fishLoading, error: fishError } = useCollection('fish');
  const { documents: events, error: eventsError } = useCollection('events', 'timestamp', 'desc');
  const [sceneReady, setSceneReady] = useState(false);
  const [roomLightsOn, setRoomLightsOn] = useState(false);

  // Initialize fish collection with default fish when app loads
  useEffect(() => {
    initializeFishCollection();
  }, []);

  const error = fishError || eventsError;
  const showLoading = !sceneReady || fishLoading;

  return (
    <AquariumEventProvider>
      <div className="App">
        {/* Loading overlay - sits on top of the canvas while models load */}
        {showLoading && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(to bottom, #2c3e50, #34495e, #2c3e50)',
            color: 'white',
            fontFamily: 'Arial, sans-serif',
            zIndex: 9999,
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '20px',
              animation: 'pulse 2s ease-in-out infinite'
            }}>
              🐠
            </div>
            <h2 style={{ marginBottom: '10px', fontSize: '24px' }}>Coral Gala Aquarium</h2>
            <p style={{ color: '#aabbcc', fontSize: '14px' }}>
              {fishLoading ? 'Preparing your aquarium...' : 'Loading models...'}
            </p>
            <style>{`
              @keyframes pulse {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.1); opacity: 0.8; }
              }
            `}</style>
          </div>
        )}

        <FallbackBanner message={error ? `Firebase Error: ${error}` : null} />
        {!showLoading && (
          <InteractionUI
            disabled={!!error}
            events={events}
            roomLightsOn={roomLightsOn}
            toggleRoomLights={() => setRoomLightsOn(prev => !prev)}
          />
        )}
        <Aquarium
          fishData={fishData}
          loading={fishLoading}
          roomLightsOn={roomLightsOn}
          onReady={() => setSceneReady(true)}
        />
        <div className="cinematic-overlay"></div>
      </div>
    </AquariumEventProvider>
  );
}

export default App;
