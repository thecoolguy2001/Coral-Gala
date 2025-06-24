import { db } from '../../src/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// This is a placeholder for the Stripe SDK, which you would need to install
// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method === 'POST') {
    // We would normally verify the Stripe signature here for security
    // const sig = req.headers['stripe-signature'];
    // let event;
    // try {
    //   event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    // } catch (err) {
    //   return res.status(400).send(`Webhook Error: ${err.message}`);
    // }

    // For now, we'll simulate a successful event
    const event = {
      type: 'checkout.session.completed',
      data: {
        object: {
          // In a real scenario, you might pass customer info or product ID
          client_reference_id: 'user_abc',
          metadata: {
            species: 'Clownfish',
          }
        }
      }
    };


    // Handle the event
    if (event.type === 'checkout.session.completed') {
      console.log('✅ Payment successful!');
      // This is where we create a new fish in the database
      try {
        const newFish = {
          species: event.data.object.metadata.species || 'DefaultFish',
          // Random position for the new fish
          position: [Math.random() * 10 - 5, Math.random() * 10 - 5, Math.random() * 10 - 5],
          createdAt: serverTimestamp(),
        };

        const docRef = await addDoc(collection(db, 'fish'), newFish);
        console.log('New fish spawned with ID:', docRef.id);

      } catch (error) {
        console.error('Error writing to Firestore:', error);
        return res.status(500).json({ error: 'Error writing to database' });
      }
    }

    res.status(200).json({ received: true });
  } else {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
  }
} 