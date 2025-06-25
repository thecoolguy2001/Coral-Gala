import React from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

// TODO: Replace with your actual publishable key
const stripePromise = loadStripe('pk_test_51RdkNIR6huqF5udsZ8u36LhVTMBUmbaNDel5wEDCYBNtsrTATZWJn5GmnBxTI0aOZJu0v3cCxKBnxASLaDLf7JzG00CMVY7uAQ');

const StripeProvider = ({ children }) => {
  return (
    <Elements stripe={stripePromise}>
      {children}
    </Elements>
  );
};

export default StripeProvider; 