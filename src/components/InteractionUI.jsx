import React, { useState, useEffect } from 'react';
import { writeEvent } from '../firestore/events';
import { useStripe } from '@stripe/react-stripe-js';

const InteractionUI = ({ disabled }) => {
  const stripe = useStripe();
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  // Auto-hide after 3 seconds of inactivity
  useEffect(() => {
    let timeout;
    if (isVisible && !isHovering) {
      timeout = setTimeout(() => {
        setIsVisible(false);
      }, 3000);
    }
    return () => clearTimeout(timeout);
  }, [isVisible, isHovering]);

  const handleTriggerAreaMouseEnter = () => {
    setIsVisible(true);
    setIsHovering(true);
  };

  const handleTriggerAreaMouseLeave = () => {
    setIsHovering(false);
  };

  const handleUILeave = () => {
    setIsHovering(false);
  };

  const handleFeed = async () => {
    if (disabled || isLoading) return;
    
    setIsLoading(true);
    try {
      await writeEvent('feed', { amount: 10 });
      // Add haptic feedback simulation
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    } catch (error) {
      console.error('Feed error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePet = async () => {
    if (disabled || isLoading) return;
    
    setIsLoading(true);
    try {
      await writeEvent('pet', { fishId: 'some_fish_id' });
      // Add haptic feedback simulation
      if (navigator.vibrate) {
        navigator.vibrate([50, 30, 50]);
      }
    } catch (error) {
      console.error('Pet error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBuyFish = async () => {
    if (!stripe || disabled || isLoading) {
      console.error('Stripe.js has not loaded yet.');
      return;
    }
    
    setIsLoading(true);
    try {
      // This is where you would typically call your backend to create a checkout session.
      // For this example, we'll assume a session ID is returned from your backend.
      const sessionId = 'cs_test_YOUR_SESSION_ID'; // Placeholder

      const { error } = await stripe.redirectToCheckout({
        sessionId,
      });

      if (error) {
        console.error('Stripe checkout error:', error.message);
      }
    } catch (error) {
      console.error('Buy fish error:', error);
    } finally {
      setIsLoading(false);
    }
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
      
      {/* Main UI that appears on hover */}
      <div 
        className={`interaction-container ${isVisible ? 'visible' : ''}`}
        onMouseEnter={() => setIsHovering(true)}
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
          className={`apple-button buy-button ${disabled ? 'disabled' : ''} ${isLoading ? 'loading' : ''} ${!stripe ? 'no-stripe' : ''}`}
          onClick={handleBuyFish}
          disabled={!stripe || disabled || isLoading}
          title={disabledTitle}
        >
          <div className="button-content">
            <div className="button-icon">🛒</div>
            <span className="button-text">Buy New Fish</span>
          </div>
          {isLoading && <div className="loading-spinner"></div>}
        </button>
      </div>
    </div>
  );
};

export default InteractionUI; 