import React from 'react';
import { writeEvent } from '../firestore/events';
import { useStripe } from '@stripe/react-stripe-js';

const InteractionUI = ({ disabled }) => {
  const stripe = useStripe();

  const handleFeed = () => {
    // The payload could contain more data, like the user who fed the fish
    writeEvent('feed', { amount: 10 });
  };

  const handlePet = () => {
    // The payload could contain the specific fish ID that was petted
    writeEvent('pet', { fishId: 'some_fish_id' });
  };

  const handleBuyFish = async () => {
    if (!stripe) {
      console.error('Stripe.js has not loaded yet.');
      return;
    }
    
    // This is where you would typically call your backend to create a checkout session.
    // For this example, we'll assume a session ID is returned from your backend.
    const sessionId = 'cs_test_YOUR_SESSION_ID'; // Placeholder

    const { error } = await stripe.redirectToCheckout({
      sessionId,
    });

    if (error) {
      console.error('Stripe checkout error:', error.message);
    }
  };

  const disabledTitle = disabled ? 'Interactions are temporarily disabled due to a connection issue.' : '';

  return (
    <div className="interaction-ui">
      <button onClick={handleFeed} disabled={disabled} title={disabledTitle}>Feed Fish</button>
      <button onClick={handlePet} disabled={disabled} title={disabledTitle}>Pet Fish</button>
      <button
        onClick={handleBuyFish}
        disabled={!stripe || disabled}
        title={disabledTitle}
        style={{ backgroundColor: '#6772e5', color: 'white' }}
      >
        Buy New Fish
      </button>
    </div>
  );
};

export default InteractionUI; 