import React from 'react';

const FallbackBanner = ({ message }) => {
  if (!message) {
    return null;
  }

  return (
    <div className="fallback-banner">
      <p>{message}</p>
    </div>
  );
};

export default FallbackBanner; 