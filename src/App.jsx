import './App.css';
import Aquarium from './components/Aquarium';
import InteractionUI from './components/InteractionUI';
import FallbackBanner from './components/FallbackBanner';
import useCollection from './hooks/useCollection';

function App() {
  const { documents: fishData, error: fishError } = useCollection('fish');
  const { documents: events, error: eventsError } = useCollection('events', 'timestamp', 'desc');

  // Any error from our hooks will be captured here
  const error = fishError || eventsError;

  return (
    <div className="App">
      <FallbackBanner message={error ? 'Live updates are currently paused. We are trying to reconnect...' : null} />
      <InteractionUI disabled={!!error} events={events} />
      <Aquarium fishData={fishData} />
      </div>
  );
}

export default App;
