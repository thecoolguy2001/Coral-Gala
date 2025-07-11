import React from 'react';

const FishInfoModal = ({ fish, onClose }) => {
  if (!fish) return null;

  const getHealthColor = (value) => {
    if (value >= 80) return '#4CAF50'; // Green
    if (value >= 60) return '#FF9800'; // Orange
    if (value >= 40) return '#FF5722'; // Red-orange
    return '#F44336'; // Red
  };

  const getStatusIcon = (fish) => {
    if (fish.states.isEating) return '🍽️';
    if (fish.states.isBeingPetted) return '💕';
    if (fish.states.isHungry) return '😋';
    if (fish.states.isSick) return '🤒';
    if (fish.states.isHappy) return '😊';
    return '🐟';
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Never';
    try {
      // Handle Firebase timestamp
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString();
    } catch (error) {
      return 'Recently';
    }
  };

  return (
    <div className="fish-info-modal-overlay" onClick={onClose}>
      <div className="fish-info-modal" onClick={(e) => e.stopPropagation()}>
        <div className="fish-header">
          <div className="fish-avatar" style={{ backgroundColor: fish.color }}>
            {getStatusIcon(fish)}
          </div>
          <div className="fish-title">
            <h2>{fish.name}</h2>
            <p className="fish-species">{fish.species}</p>
            {fish.display.nickname && (
              <p className="fish-nickname">"{fish.display.nickname}"</p>
            )}
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="fish-content">
          <div className="fish-section">
            <h3>🏥 Health Status</h3>
            <div className="health-stats">
              <div className="stat">
                <span className="stat-label">Hunger:</span>
                <div className="stat-bar">
                  <div 
                    className="stat-fill" 
                    style={{ 
                      width: `${fish.hunger}%`, 
                      backgroundColor: getHealthColor(fish.hunger) 
                    }}
                  />
                </div>
                <span className="stat-value">{fish.hunger}%</span>
              </div>
              <div className="stat">
                <span className="stat-label">Health:</span>
                <div className="stat-bar">
                  <div 
                    className="stat-fill" 
                    style={{ 
                      width: `${fish.health}%`, 
                      backgroundColor: getHealthColor(fish.health) 
                    }}
                  />
                </div>
                <span className="stat-value">{fish.health}%</span>
              </div>
              <div className="stat">
                <span className="stat-label">Mood:</span>
                <div className="stat-bar">
                  <div 
                    className="stat-fill" 
                    style={{ 
                      width: `${fish.mood}%`, 
                      backgroundColor: getHealthColor(fish.mood) 
                    }}
                  />
                </div>
                <span className="stat-value">{fish.mood}%</span>
              </div>
              <div className="stat">
                <span className="stat-label">Energy:</span>
                <div className="stat-bar">
                  <div 
                    className="stat-fill" 
                    style={{ 
                      width: `${fish.energy}%`, 
                      backgroundColor: getHealthColor(fish.energy) 
                    }}
                  />
                </div>
                <span className="stat-value">{fish.energy}%</span>
              </div>
            </div>
          </div>

          <div className="fish-section">
            <h3>🎭 Personality</h3>
            <div className="personality-traits">
              <div className="primary-trait">
                <strong>Primary:</strong> {fish.personality.primary}
              </div>
              <div className="all-traits">
                {fish.personality.traits.map((trait, index) => (
                  <span key={index} className="trait-badge">{trait}</span>
                ))}
              </div>
              <div className="personality-scores">
                <div>Friendliness: {fish.personality.friendliness}%</div>
                <div>Playfulness: {fish.personality.playfulness}%</div>
                <div>Shyness: {fish.personality.shyness}%</div>
              </div>
            </div>
          </div>

          <div className="fish-section">
            <h3>📊 Information</h3>
            <div className="fish-info-grid">
              <div className="info-item">
                <strong>Age:</strong> {fish.age} months
              </div>
              <div className="info-item">
                <strong>Size:</strong> {fish.size?.toFixed(1)} units
              </div>
              <div className="info-item">
                <strong>Favorite Food:</strong> {fish.preferences?.favoriteFood || 'Unknown'}
              </div>
              <div className="info-item">
                <strong>Preferred Depth:</strong> {fish.preferences?.depth || 'Middle'}
              </div>
            </div>
          </div>

          <div className="fish-section">
            <h3>📈 History</h3>
            <div className="fish-history">
              <div className="history-item">
                <strong>Times Fed:</strong> {fish.history.timesFed}
              </div>
              <div className="history-item">
                <strong>Times Petted:</strong> {fish.history.timesPetted}
              </div>
              <div className="history-item">
                <strong>Last Fed:</strong> {formatTimestamp(fish.history.lastFed)}
              </div>
              <div className="history-item">
                <strong>Last Petted:</strong> {formatTimestamp(fish.history.lastPetted)}
              </div>
            </div>
          </div>

          <div className="fish-section">
            <h3>🏆 Achievements</h3>
            <div className="achievements">
              {fish.display.achievements && fish.display.achievements.length > 0 ? (
                fish.display.achievements.map((achievement, index) => (
                  <span key={index} className="achievement-badge">{achievement}</span>
                ))
              ) : (
                <span className="no-achievements">No achievements yet</span>
              )}
            </div>
          </div>

          <div className="fish-section">
            <h3>💭 Bio</h3>
            <p className="fish-bio">{fish.display.bio}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FishInfoModal; 