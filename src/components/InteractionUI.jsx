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
    
    try {
      // Call your backend to create a checkout session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          species: 'Clownfish', // You could make this dynamic
          price: 500, // $5.00 in cents
        }),
      });

      const { sessionId, error } = await response.json();
      
      if (error) {
        console.error('Failed to create checkout session:', error);
        return;
      }

      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId,
      });

      if (stripeError) {
        console.error('Stripe checkout error:', stripeError.message);
      }
    } catch (error) {
      console.error('Error during checkout:', error);
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