import './App.css';
import Aquarium from './components/Aquarium';
import InteractionUI from './components/InteractionUI';
import FallbackBanner from './components/FallbackBanner';
import ViewToggle from './components/ViewToggle';
import useCollection from './hooks/useCollection';
import { initializeFishCollection } from './firestore/fishInitializer';
import { useEffect, useState } from 'react';

function App() {
  const { documents: fishData, loading: fishLoading, error: fishError } = useCollection('fish');
  const { documents: events, error: eventsError } = useCollection('events', 'timestamp', 'desc');

  // View state: false = inside water, true = outside tank
  const [isOutsideView, setIsOutsideView] = useState(false);

  // Initialize fish collection with default fish when app loads
  useEffect(() => {
    initializeFishCollection();
  }, []);

  // Any error from our hooks will be captured here
  const error = fishError || eventsError;

  // Toggle between inside and outside views
  const handleViewToggle = () => {
    setIsOutsideView(prev => !prev);
  };

  return (
    <div className="App">
      <FallbackBanner message={error ? `Firebase Error: ${error}` : null} />
      <InteractionUI disabled={!!error} events={events} />
      <ViewToggle isOutsideView={isOutsideView} onToggle={handleViewToggle} />
      <Aquarium fishData={fishData} loading={fishLoading} isOutsideView={isOutsideView} />
      {fishLoading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '20px',
          borderRadius: '10px',
          zIndex: 100
        }}>
          Loading fish data from Firebase...
        </div>
      )}
    </div>
  );
}

export default App;
