import React, { useState, useEffect } from 'react';
import { useAquariumEvents } from '../hooks/useAquariumEvents';
import { FISH_SPECIES, createFish } from '../models/fishModel.js';
import { WATER_LEVEL, BOUNDS } from '../constants/tankDimensions';

const createRandomTestFish = () => {
  const speciesKeys = Object.keys(FISH_SPECIES);
  const randomKey = speciesKeys[Math.floor(Math.random() * speciesKeys.length)];
  const species = FISH_SPECIES[randomKey];
  const names = ['Splash', 'Bubba', 'Finley', 'Coral', 'Shimmer', 'Drift', 'Zippy', 'Sparkle', 'Nori', 'Wave'];
  const name = names[Math.floor(Math.random() * names.length)] + '_' + Date.now().toString(36).slice(-4);

  return {
    ...createFish({
      name,
      species: species.name,
      color: species.colors[Math.floor(Math.random() * species.colors.length)],
      size: Math.max(0.6, species.averageSize * (0.8 + Math.random() * 0.4)),
      position: [0, WATER_LEVEL + 20, 0],
      acquiredAt: new Date(),
      createdAt: new Date(),
    }),
    spawnTime: Date.now(),
  };
};

const InteractionUI = ({ disabled, roomLightsOn, toggleRoomLights }) => {
  const { dispatch } = useAquariumEvents();
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [showHint, setShowHint] = useState(true);

  // Show hint animation for longer (15 seconds)
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowHint(false);
    }, 15000); // Hide hint after 15 seconds
    return () => clearTimeout(timer);
  }, []);

  const handleTriggerAreaMouseEnter = () => {
    setIsVisible(true);
    setShowHint(false); // Hide hint once user discovers the area
  };

  const handleTriggerAreaMouseLeave = () => {
    // Don't hide immediately when leaving trigger area
  };

  const handleUILeave = () => {
    setIsVisible(false); // Hide menu immediately when leaving UI area
  };

  const handleFeed = () => {
    if (disabled || isLoading) return;
    const randomX = (Math.random() - 0.5) * (BOUNDS.x.max - BOUNDS.x.min) * 0.6;
    const randomZ = (Math.random() - 0.5) * (BOUNDS.z.max - BOUNDS.z.min) * 0.6;
    dispatch({ type: 'FEED', payload: { position: [randomX, WATER_LEVEL, randomZ] } });
    if (navigator.vibrate) navigator.vibrate(50);
  };

  const handlePet = () => {
    if (disabled || isLoading) return;
    dispatch({ type: 'PET', payload: { fishId: null } });
    if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
  };

  const handleAddFish = () => {
    if (disabled || isLoading) return;
    const newFish = createRandomTestFish();
    dispatch({ type: 'ADD_FISH', payload: { fishData: newFish } });
    if (navigator.vibrate) navigator.vibrate(100);
  };

  const disabledTitle = disabled ? 'Interactions are temporarily disabled due to a connection issue.' : '';

  return (
    <div className="apple-interaction-ui">
      {/* Invisible trigger area */}
      <div 
        className="interaction-trigger-area"
        onMouseEnter={handleTriggerAreaMouseEnter}
        onMouseLeave={handleTriggerAreaMouseLeave}
      />
      
      {/* Hint animation */}
      {showHint && (
        <div className="interaction-hint">
          <div className="hint-icon">👆</div>
          <div className="hint-text">Interact</div>
        </div>
      )}
      
      {/* Main UI that appears on hover */}
      <div
        className={`interaction-container ${isVisible ? 'visible' : ''}`}
        onMouseLeave={handleUILeave}
      >
        <button 
          className={`apple-button feed-button ${disabled ? 'disabled' : ''} ${isLoading ? 'loading' : ''}`}
          onClick={handleFeed} 
          disabled={disabled || isLoading} 
          title={disabledTitle}
        >
          <div className="button-content">
            <div className="button-icon">🍽️</div>
            <span className="button-text">Feed Fish</span>
          </div>
          {isLoading && <div className="loading-spinner"></div>}
        </button>

        <button 
          className={`apple-button pet-button ${disabled ? 'disabled' : ''} ${isLoading ? 'loading' : ''}`}
          onClick={handlePet} 
          disabled={disabled || isLoading} 
          title={disabledTitle}
        >
          <div className="button-content">
            <div className="button-icon">🤗</div>
            <span className="button-text">Pet Fish</span>
          </div>
          {isLoading && <div className="loading-spinner"></div>}
        </button>

        <button
          className={`apple-button buy-button ${disabled ? 'disabled' : ''} ${isLoading ? 'loading' : ''}`}
          onClick={handleAddFish}
          disabled={disabled || isLoading}
          title={disabledTitle}
        >
          <div className="button-content">
            <div className="button-icon">🐠</div>
            <span className="button-text">Add Fish</span>
          </div>
          {isLoading && <div className="loading-spinner"></div>}
        </button>

        <button 
          className={`apple-button light-button`}
          onClick={toggleRoomLights} 
        >
          <div className="button-content">
            <div className="button-icon">{roomLightsOn ? '🌙' : '💡'}</div>
            <span className="button-text">{roomLightsOn ? 'Dark Mode' : 'Lights On'}</span>
          </div>
        </button>
      </div>
    </div>
  );
};

export default InteractionUI; 