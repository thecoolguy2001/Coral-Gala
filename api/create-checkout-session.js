import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      // Create Checkout Sessions from body params.
      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            // Provide the exact Price ID (for example, pr_1234) of the product you want to sell
            // For now, we'll use a dynamic price for a generic "Fish"
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Virtual Fish',
                description: 'A new fish for the Coral Gala aquarium',
                images: ['https://coralgala.live/images/fish-icon.png'], // Replace with actual image
              },
              unit_amount: 100, // $1.00
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${req.headers.origin}/?success=true`,
        cancel_url: `${req.headers.origin}/?canceled=true`,
        metadata: {
            species: 'Random', // We can allow users to choose species later
        }
      });

      res.status(200).json({ sessionId: session.id });
    } catch (err) {
      console.error('Stripe Checkout Error:', err);
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  } else {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
  }
}
