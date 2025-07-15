import React from 'react';

const FishInfoModal = ({ fish, onClose }) => {
  if (!fish) return null;

  const getHealthColor = (value) => {
    if (value >= 80) return '#34C759'; // Apple Green
    if (value >= 60) return '#FF9500'; // Apple Orange
    if (value >= 40) return '#FF3B30'; // Apple Red
    return '#FF2D92'; // Apple Pink
  };

  const getStatusIcon = (fish) => {
    if (!fish.states) return '🐟';
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
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString();
    } catch (error) {
      return 'Recently';
    }
  };

  const getPersonalityEmoji = (primary) => {
    const emojiMap = {
      'friendly': '🤝',
      'shy': '😊',
      'playful': '🎈',
      'curious': '🔍',
      'calm': '😌',
      'energetic': '⚡',
      'social': '👥',
      'independent': '🦅'
    };
    return emojiMap[primary?.toLowerCase()] || '🐟';
  };

  return (
    <div className="fish-modal-overlay" onClick={onClose}>
      <div className="fish-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header Section */}
        <div className="fish-modal-header">
          <div className="fish-avatar-container">
            <div className="fish-avatar" style={{ backgroundColor: fish.color }}>
              {getStatusIcon(fish)}
            </div>
            <div className="fish-status-indicator"></div>
          </div>
          
          <div className="fish-header-content">
            <h1 className="fish-name">{fish.name || 'Unnamed Fish'}</h1>
            <p className="fish-species">{fish.species || 'Unknown Species'}</p>
            {fish.display?.nickname && (
              <p className="fish-nickname">"{fish.display.nickname}"</p>
            )}
          </div>
          
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="fish-modal-content">
          {/* Health Stats Section */}
          <div className="modal-section">
            <div className="section-header">
              <div className="section-icon">🏥</div>
              <h2>Health Status</h2>
            </div>
            <div className="health-stats-grid">
              {[
                { label: 'Hunger', value: fish.hunger || 50, icon: '🍽️' },
                { label: 'Health', value: fish.health || 75, icon: '❤️' },
                { label: 'Mood', value: fish.mood || 60, icon: '😊' },
                { label: 'Energy', value: fish.energy || 70, icon: '⚡' }
              ].map((stat, index) => (
                <div key={index} className="health-stat-card">
                  <div className="stat-header">
                    <span className="stat-icon">{stat.icon}</span>
                    <span className="stat-label">{stat.label}</span>
                    <span className="stat-value">{stat.value}%</span>
                  </div>
                  <div className="stat-progress">
                    <div 
                      className="stat-progress-fill" 
                      style={{ 
                        width: `${stat.value}%`, 
                        backgroundColor: getHealthColor(stat.value) 
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Personality Section */}
          <div className="modal-section">
            <div className="section-header">
              <div className="section-icon">{getPersonalityEmoji(fish.personality?.primary)}</div>
              <h2>Personality</h2>
            </div>
            <div className="personality-content">
              <div className="primary-personality">
                <span className="personality-label">Primary Trait</span>
                <span className="personality-value">{fish.personality?.primary || 'Unknown'}</span>
              </div>
              
              <div className="personality-traits">
                <span className="traits-label">Traits</span>
                <div className="traits-grid">
                  {(fish.personality?.traits || ['friendly']).map((trait, index) => (
                    <span key={index} className="trait-pill">{trait}</span>
                  ))}
                </div>
              </div>
              
              <div className="personality-metrics">
                {[
                  { label: 'Friendliness', value: fish.personality?.friendliness || 50 },
                  { label: 'Playfulness', value: fish.personality?.playfulness || 50 },
                  { label: 'Shyness', value: fish.personality?.shyness || 50 }
                ].map((metric, index) => (
                  <div key={index} className="personality-metric">
                    <span className="metric-label">{metric.label}</span>
                    <div className="metric-bar">
                      <div 
                        className="metric-fill" 
                        style={{ width: `${metric.value}%` }}
                      />
                    </div>
                    <span className="metric-value">{metric.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Information Section */}
          <div className="modal-section">
            <div className="section-header">
              <div className="section-icon">📊</div>
              <h2>Information</h2>
            </div>
            <div className="info-grid">
              <div className="info-card">
                <span className="info-label">Age</span>
                <span className="info-value">{fish.age || 6} months</span>
              </div>
              <div className="info-card">
                <span className="info-label">Size</span>
                <span className="info-value">{fish.size?.toFixed(1) || '0.5'} units</span>
              </div>
              <div className="info-card">
                <span className="info-label">Favorite Food</span>
                <span className="info-value">{fish.preferences?.favoriteFood || 'Fish flakes'}</span>
              </div>
              <div className="info-card">
                <span className="info-label">Preferred Depth</span>
                <span className="info-value">{fish.preferences?.depth || 'Middle'}</span>
              </div>
            </div>
          </div>

          {/* History Section */}
          <div className="modal-section">
            <div className="section-header">
              <div className="section-icon">📈</div>
              <h2>History</h2>
            </div>
            <div className="history-grid">
              <div className="history-card">
                <span className="history-label">Times Fed</span>
                <span className="history-value">{fish.history?.timesFed || 0}</span>
              </div>
              <div className="history-card">
                <span className="history-label">Times Petted</span>
                <span className="history-value">{fish.history?.timesPetted || 0}</span>
              </div>
              <div className="history-card">
                <span className="history-label">Last Fed</span>
                <span className="history-value">{formatTimestamp(fish.history?.lastFed)}</span>
              </div>
              <div className="history-card">
                <span className="history-label">Last Petted</span>
                <span className="history-value">{formatTimestamp(fish.history?.lastPetted)}</span>
              </div>
            </div>
          </div>

          {/* Achievements Section */}
          <div className="modal-section">
            <div className="section-header">
              <div className="section-icon">🏆</div>
              <h2>Achievements</h2>
            </div>
            <div className="achievements-container">
              {fish.display?.achievements && fish.display.achievements.length > 0 ? (
                <div className="achievements-grid">
                  {fish.display.achievements.map((achievement, index) => (
                    <span key={index} className="achievement-badge">{achievement}</span>
                  ))}
                </div>
              ) : (
                <div className="no-achievements">
                  <span className="no-achievements-icon">🎯</span>
                  <span className="no-achievements-text">No achievements yet</span>
                </div>
              )}
            </div>
          </div>

          {/* Bio Section */}
          <div className="modal-section">
            <div className="section-header">
              <div className="section-icon">💭</div>
              <h2>Bio</h2>
            </div>
            <div className="bio-content">
              <p className="fish-bio">{fish.display?.bio || "A mysterious fish with a story yet to be discovered."}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FishInfoModal; 