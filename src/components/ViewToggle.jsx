import React from 'react';
import '../styles/ViewToggle.css';

/**
 * ViewToggle - Apple-styled button to switch between inside/outside tank views
 * Positioned in top right corner
 */
const ViewToggle = ({ isOutsideView, onToggle }) => {
  return (
    <div className="view-toggle-container">
      <button
        className="view-toggle-button"
        onClick={onToggle}
        aria-label={isOutsideView ? "View from inside water" : "View from outside tank"}
      >
        <div className="view-toggle-content">
          <span className="view-toggle-icon">
            {isOutsideView ? '🏊' : '📺'}
          </span>
          <span className="view-toggle-text">
            {isOutsideView ? 'Dive In' : 'Zoom Out'}
          </span>
        </div>
      </button>
    </div>
  );
};

export default ViewToggle;
