import './App.css';
import Aquarium from './components/Aquarium';
import InteractionUI from './components/InteractionUI';
import FallbackBanner from './components/FallbackBanner';
import useCollection from './hooks/useCollection';

function App() {
  const { documents: fishData, loading: fishLoading, error: fishError } = useCollection('fish');
  // --- TEMPORARILY DISABLED FOR DEBUGGING ---
  // const { documents: events, error: eventsError } = useCollection('events', 'timestamp', 'desc');
  const events = [];
  const eventsError = null;
  // -----------------------------------------

  // Any error from our hooks will be captured here
  const error = fishError || eventsError;

  // Show loading state
  if (fishLoading) {
    console.log('Loading fish data...');
  }

  // Log the current state for debugging
  console.log('App state:', {
    fishData: fishData.length,
    fishLoading,
    fishError,
    error
  });

  return (
    <div className="App">
      <FallbackBanner message={error ? `Firebase Error: ${error}` : null} />
      <InteractionUI disabled={!!error} events={events} />
      <Aquarium fishData={fishData} />
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
